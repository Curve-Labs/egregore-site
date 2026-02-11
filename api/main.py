"""
Egregore API Gateway

Sits between egregore instances and shared infrastructure (Neo4j, Telegram).
Each org gets an API key. Secrets stay server-side.

Deploy to Railway alongside telegram-bot.
"""

import os
import json
import logging
import secrets

from dotenv import load_dotenv
load_dotenv(override=False)

from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware

from .auth import (
    validate_api_key, generate_api_key, reload_configs, ORG_CONFIGS,
    load_orgs_from_neo4j, exchange_github_code, GITHUB_CLIENT_ID,
)
from .models import (
    GraphQuery, GraphBatch, NotifySend, NotifyGroup, OrgRegister,
    OrgSetup, OrgJoin, OrgTelegram, GitHubCallback, SetupOrgsResponse,
    OrgInvite, OrgAcceptInvite, UserProfileUpdate,
)
from .services.graph import execute_query, execute_batch, get_schema, test_connection
from .services.notify import send_message, send_group, test_notify, generate_bot_invite_link, create_group_invite_link
from .services import github as gh
from .services.tokens import create_token, claim_token, create_invite_token, peek_token

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Egregore API",
    description="API gateway for Egregore shared infrastructure",
    version="1.0.0",
)

# CORS: Only allow browser requests from known origins.
# CLI tools (bin/graph.sh, bin/notify.sh, create-egregore) use curl, not browsers.
_cors_origins = os.environ.get("CORS_ORIGINS", "https://egregore-core.netlify.app").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.on_event("startup")
async def startup():
    """Load org configs from Neo4j on startup."""
    await load_orgs_from_neo4j()


@app.post("/api/admin/reload")
async def admin_reload(authorization: str = Header(...)):
    """Reload ORG_CONFIGS from Neo4j. Requires any valid API key."""
    key = authorization.replace("Bearer ", "").strip()
    if not any(org.get("api_key") == key for org in ORG_CONFIGS.values()):
        raise HTTPException(status_code=401, detail="Invalid API key")
    await load_orgs_from_neo4j()
    return {"status": "ok", "orgs_loaded": len(ORG_CONFIGS)}


# =============================================================================
# GRAPH ENDPOINTS
# =============================================================================


@app.post("/api/graph/query")
async def graph_query(body: GraphQuery, org: dict = Depends(validate_api_key)):
    """Execute a Cypher query scoped to the org."""
    result = await execute_query(org, body.statement, body.parameters)
    if isinstance(result, dict) and result.get("error"):
        status = 429 if result.get("rate_limited") else 400
        raise HTTPException(status_code=status, detail=result["error"])
    return result


@app.post("/api/graph/batch")
async def graph_batch(body: GraphBatch, org: dict = Depends(validate_api_key)):
    """Execute multiple Cypher queries concurrently, scoped to the org."""
    queries = [{"statement": q.statement, "parameters": q.parameters} for q in body.queries]
    results = await execute_batch(org, queries)
    # If the first result has a batch-level error, raise it
    if len(results) == 1 and isinstance(results[0], dict) and results[0].get("error"):
        r = results[0]
        status = 429 if r.get("rate_limited") else 400
        raise HTTPException(status_code=status, detail=r["error"])
    return {"results": results}


@app.get("/api/graph/schema")
async def graph_schema(org: dict = Depends(validate_api_key)):
    """Get the Neo4j schema."""
    return await get_schema(org)


@app.get("/api/graph/test")
async def graph_test(org: dict = Depends(validate_api_key)):
    """Test Neo4j connectivity."""
    result = await test_connection(org)
    if result["status"] != "ok":
        raise HTTPException(status_code=503, detail=result.get("detail", "Connection failed"))
    return result


# =============================================================================
# NOTIFY ENDPOINTS
# =============================================================================


@app.post("/api/notify/send")
async def notify_send(body: NotifySend, org: dict = Depends(validate_api_key)):
    """Send a message to a person (DM if possible, group fallback)."""
    result = await send_message(org, body.to, body.message)
    if result["status"] == "error":
        raise HTTPException(status_code=400, detail=result.get("detail"))
    return result


@app.post("/api/notify/group")
async def notify_group(body: NotifyGroup, org: dict = Depends(validate_api_key)):
    """Send a message to the org's group chat."""
    result = await send_group(org, body.message)
    if result["status"] == "error":
        raise HTTPException(status_code=400, detail=result.get("detail"))
    return result


@app.get("/api/notify/test")
async def notify_test(org: dict = Depends(validate_api_key)):
    """Test Telegram connectivity."""
    result = await test_notify(org)
    if result["status"] != "ok":
        raise HTTPException(status_code=503, detail=result.get("detail"))
    return result


# =============================================================================
# KEY RETRIEVAL (for existing users after updates)
# =============================================================================


@app.get("/api/org/{slug}/key")
async def org_get_key(slug: str, authorization: str = Header(...)):
    """Return the org's API key if the caller is a verified member.

    Used by session-start.sh to auto-provision EGREGORE_API_KEY for existing
    users who pull an update but don't have the key in .env yet.
    Auth: GitHub token (not API key — they don't have one yet).
    """
    import httpx

    github_token = authorization.replace("Bearer ", "").strip()
    if not github_token:
        raise HTTPException(status_code=401, detail="Missing GitHub token")

    org = ORG_CONFIGS.get(slug)
    if not org:
        raise HTTPException(status_code=404, detail="Org not found")

    github_org = org.get("github_org", "")
    if not github_org:
        raise HTTPException(status_code=500, detail="Org has no github_org configured")

    # Verify caller is a member of the GitHub org (or owner of personal account)
    async with httpx.AsyncClient() as client:
        # Check org membership
        resp = await client.get(
            f"https://api.github.com/orgs/{github_org}/members",
            headers={"Authorization": f"token {github_token}"},
            timeout=10.0,
        )

        if resp.status_code == 200:
            # Get the caller's username
            user_resp = await client.get(
                "https://api.github.com/user",
                headers={"Authorization": f"token {github_token}"},
                timeout=10.0,
            )
            if user_resp.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid GitHub token")

            username = user_resp.json().get("login", "")
            members = [m["login"] for m in resp.json()]
            if username not in members:
                raise HTTPException(status_code=403, detail="Not a member of this org")
        elif resp.status_code == 404:
            # Might be a personal account — check if they own the repo
            user_resp = await client.get(
                "https://api.github.com/user",
                headers={"Authorization": f"token {github_token}"},
                timeout=10.0,
            )
            if user_resp.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid GitHub token")

            username = user_resp.json().get("login", "")
            if username.lower() != github_org.lower():
                raise HTTPException(status_code=403, detail="Not authorized for this org")
        else:
            raise HTTPException(status_code=401, detail="Could not verify org membership")

    return {"api_key": org["api_key"], "org_slug": slug}


# =============================================================================
# ORG MANAGEMENT (legacy)
# =============================================================================


@app.post("/api/org/register")
async def org_register(body: OrgRegister, authorization: str = Header(...)):
    """Register a new org. Requires a valid GitHub token for verification."""
    import httpx

    # Verify the GitHub token is valid
    github_token = authorization.replace("Bearer ", "").strip()

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://api.github.com/user",
            headers={"Authorization": f"token {github_token}"},
            timeout=10.0,
        )

    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid GitHub token")

    github_user = resp.json()

    # Generate org slug from github_org (lowercase, alphanumeric + hyphens)
    slug = body.github_org.lower().replace(" ", "-")

    # Check if org already exists
    if slug in ORG_CONFIGS:
        return {
            "api_key": ORG_CONFIGS[slug]["api_key"],
            "org_slug": slug,
            "status": "existing",
        }

    # Generate API key
    api_key = generate_api_key(slug)

    # New orgs go to the shared egregore-core Neo4j instance (not CL's private one)
    default_neo4j_host = os.environ.get("EGREGORE_NEO4J_HOST", "")
    default_neo4j_user = os.environ.get("EGREGORE_NEO4J_USER", "neo4j")
    default_neo4j_password = os.environ.get("EGREGORE_NEO4J_PASSWORD", "")
    default_bot_token = os.environ.get("TELEGRAM_BOT_TOKEN", "")

    new_org = {
        "api_key": api_key,
        "org_name": body.org_name,
        "github_org": body.github_org,
        "neo4j_host": default_neo4j_host,
        "neo4j_user": default_neo4j_user,
        "neo4j_password": default_neo4j_password,
        "telegram_bot_token": default_bot_token,
        "telegram_chat_id": body.telegram_chat_id or "",
        "registered_by": github_user.get("login", ""),
    }

    # Store in configs (in-memory for now; persistent storage is a later step)
    ORG_CONFIGS[slug] = new_org

    # Create Org node in Neo4j
    await execute_query(new_org, """
        MERGE (o:Org {id: $_org})
        SET o.name = $name, o.github_org = $github_org
        RETURN o.id
    """, {"name": body.org_name, "github_org": body.github_org})

    logger.info(f"Registered new org: {slug} by {github_user.get('login')}")

    return {
        "api_key": api_key,
        "org_slug": slug,
        "status": "created",
    }


@app.get("/api/org/status")
async def org_status(org: dict = Depends(validate_api_key)):
    """Get org config (non-sensitive fields)."""
    return {
        "org_name": org.get("org_name", ""),
        "github_org": org.get("github_org", ""),
        "slug": org.get("slug", ""),
        "has_telegram": bool(org.get("telegram_bot_token")),
        "has_neo4j": bool(org.get("neo4j_host")),
    }


# =============================================================================
# SETUP FLOW — Frictionless installation
# =============================================================================


@app.post("/api/auth/github/callback")
async def github_callback(body: GitHubCallback):
    """Exchange GitHub OAuth code for access token."""
    token = await exchange_github_code(body.code)
    user = await gh.get_user(token)
    return {"github_token": token, "user": user}


@app.get("/api/org/setup/orgs")
async def setup_orgs(authorization: str = Header(...)):
    """Detect user's orgs and their Egregore status."""
    token = authorization.replace("Bearer ", "").strip()

    try:
        user = await gh.get_user(token)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid GitHub token")

    orgs = await gh.list_orgs(token)

    # Check each org for egregore instances + membership status
    org_results = []
    for org in orgs:
        instances = await gh.list_egregore_instances(token, org["login"])
        has_egregore = len(instances) > 0
        role = await gh.get_org_membership(token, org["login"])
        is_member = False
        if has_egregore:
            is_member = await gh.repo_exists(token, org["login"], f"{org['login']}-memory")
        org_results.append({
            "login": org["login"],
            "name": org["name"],
            "has_egregore": has_egregore,
            "is_member": is_member,
            "can_setup": True,
            "role": role or "member",
            "avatar_url": org.get("avatar_url", ""),
            "instances": instances,
        })

    personal_instances = await gh.list_egregore_instances(token, user["login"])
    personal_has = len(personal_instances) > 0
    personal_member = False
    if personal_has:
        personal_member = await gh.repo_exists(token, user["login"], f"{user['login']}-memory")

    return {
        "user": user,
        "orgs": org_results,
        "personal": {
            "login": user["login"],
            "has_egregore": personal_has,
            "is_member": personal_member,
            "can_setup": True,
            "instances": personal_instances,
        },
    }


@app.get("/api/org/setup/repos")
async def setup_repos(org: str, authorization: str = Header(...)):
    """List repos for an org, for the repo picker during setup."""
    token = authorization.replace("Bearer ", "").strip()
    try:
        await gh.get_user(token)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid GitHub token")
    repos = await gh.list_org_repos(token, org)
    return {"repos": repos}


@app.post("/api/org/setup")
async def org_setup(body: OrgSetup, authorization: str = Header(...)):
    """Founder: full org setup. Generates from template, creates memory, bootstraps Neo4j, returns setup token."""
    token = authorization.replace("Bearer ", "").strip()

    try:
        user = await gh.get_user(token)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid GitHub token")

    target_org = None if body.is_personal else body.github_org
    owner = user["login"] if body.is_personal else body.github_org
    base_slug = owner.lower().replace("-", "").replace(" ", "")

    # Compute instance slug and repo name
    if body.instance_name:
        instance_suffix = body.instance_name.lower().replace(" ", "-")
        slug = f"{base_slug}-{instance_suffix}"
        repo_name = f"egregore-{instance_suffix}"
    else:
        slug = base_slug
        repo_name = "egregore-core"

    # Memory repo: use slug prefix for additional instances, owner prefix for first (backwards compat)
    if body.instance_name:
        memory_repo_name = f"{slug}-memory"
    else:
        memory_repo_name = f"{owner}-memory"

    # 1. Generate repo from template (skip if already exists — makes setup idempotent)
    repo_already_exists = await gh.repo_exists(token, owner, repo_name)
    if repo_already_exists:
        logger.info(f"{repo_name} already exists for {owner} — continuing setup")
    else:
        logger.info(f"Generating {repo_name} from template for {owner}")
        await gh.generate_from_template(token, owner, repo_name)

        # 2. Wait for repo to be ready
        if not await gh.wait_for_repo(token, owner, repo_name):
            raise HTTPException(status_code=504, detail="Repo generation timed out — try again")

    # 3. Create memory repo
    logger.info(f"Creating {memory_repo_name} for {owner}")
    try:
        await gh.create_repo(token, memory_repo_name, target_org)
    except ValueError as e:
        if "422" not in str(e):
            raise
        # 422 = repo already exists, that's fine

    # 4. Init memory structure
    await gh.init_memory_structure(token, owner, memory_repo_name)

    # 5. Generate API key + store org
    api_key = generate_api_key(slug)
    api_url = os.environ.get("EGREGORE_API_URL", "https://egregore-production-55f2.up.railway.app")

    default_neo4j_host = os.environ.get("EGREGORE_NEO4J_HOST", os.environ.get("NEO4J_HOST", ""))
    default_neo4j_user = os.environ.get("EGREGORE_NEO4J_USER", os.environ.get("NEO4J_USER", "neo4j"))
    default_neo4j_password = os.environ.get("EGREGORE_NEO4J_PASSWORD", os.environ.get("NEO4J_PASSWORD", ""))
    default_bot_token = os.environ.get("TELEGRAM_BOT_TOKEN", "")

    new_org = {
        "api_key": api_key,
        "org_name": body.org_name,
        "github_org": owner,
        "neo4j_host": default_neo4j_host,
        "neo4j_user": default_neo4j_user,
        "neo4j_password": default_neo4j_password,
        "telegram_bot_token": default_bot_token,
        "telegram_chat_id": body.telegram_chat_id or "",
        "slug": slug,
    }
    ORG_CONFIGS[slug] = new_org

    # 6. Update egregore.json in the generated repo
    memory_url = f"https://github.com/{owner}/{memory_repo_name}.git"
    try:
        await gh.update_egregore_json(
            token, owner, repo_name,
            body.org_name, owner, memory_repo_name,
            api_url,
            slug=slug,
            repos=body.repos,
        )
    except ValueError as e:
        logger.warning(f"Failed to update egregore.json: {e}")

    # 7. Bootstrap Org node in Neo4j (required for ORG_CONFIGS on API restart + Telegram bot)
    # Person and Project nodes deferred to first session start (avoids orphans)
    try:
        await execute_query(new_org, """
            MERGE (o:Org {id: $_org})
            SET o.name = $name, o.github_org = $github_org, o.api_key = $api_key
        """, {"name": body.org_name, "github_org": owner, "api_key": api_key})
    except Exception as e:
        logger.warning(f"Neo4j Org bootstrap failed: {e}")

    # 8. Telegram invite link
    telegram_invite = generate_bot_invite_link(slug)

    # 9. Generate setup token
    fork_url = f"https://github.com/{owner}/{repo_name}.git"
    setup_token = create_token({
        "fork_url": fork_url,
        "memory_url": memory_url,
        "api_key": api_key,
        "api_url": api_url,
        "org_name": body.org_name,
        "github_org": owner,
        "github_token": token,
        "slug": slug,
        "repos": body.repos,
        "repo_name": repo_name,
    })

    logger.info(f"Org setup complete: {slug} by {user['login']}")

    return {
        "setup_token": setup_token,
        "fork_url": fork_url,
        "memory_url": memory_url,
        "org_slug": slug,
        "telegram_invite_link": telegram_invite,
    }


@app.post("/api/org/join")
async def org_join(body: OrgJoin, authorization: str = Header(...)):
    """Joiner: join an existing org. Verifies access, returns setup token."""
    token = authorization.replace("Bearer ", "").strip()

    try:
        user = await gh.get_user(token)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid GitHub token")

    owner = body.github_org

    # Verify repo exists
    if not await gh.repo_exists(token, owner, body.repo_name):
        raise HTTPException(status_code=404, detail=f"No Egregore setup found for {owner} ({body.repo_name})")

    # Read egregore.json from repo to get config
    config_raw = await gh.get_file_content(token, owner, body.repo_name, "egregore.json")
    if not config_raw:
        raise HTTPException(status_code=404, detail="egregore.json not found in repo")

    config = json.loads(config_raw)
    memory_repo = config.get("memory_repo", f"{owner}-memory")

    # Determine memory URL
    if memory_repo.startswith("http"):
        memory_url = memory_repo
    else:
        memory_url = f"https://github.com/{owner}/{memory_repo}.git"

    # Verify user has access to memory repo — create if missing and user is owner/admin
    memory_repo_name = memory_repo.split("/")[-1].replace(".git", "") if "/" in memory_repo else memory_repo
    if not await gh.repo_exists(token, owner, memory_repo_name):
        # Check if user can create it (personal account owner or org admin)
        can_create = (owner == user["login"]) or (await gh.get_org_membership(token, owner) == "admin")
        if can_create:
            logger.info(f"Memory repo {owner}/{memory_repo_name} missing — creating for incomplete setup")
            try:
                target_org = None if owner == user["login"] else owner
                await gh.create_repo(token, memory_repo_name, target_org)
                await gh.init_memory_structure(token, owner, memory_repo_name)
            except Exception as e:
                logger.error(f"Failed to create memory repo: {e}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Memory repo {owner}/{memory_repo_name} doesn't exist and couldn't be created: {e}",
                )
        else:
            raise HTTPException(
                status_code=403,
                detail=f"You don't have access to {owner}/{memory_repo_name}. Ask your team to add you.",
            )

    fork_url = f"https://github.com/{owner}/{body.repo_name}.git"
    api_url = config.get("api_url", "")

    # Look up org's API key — prefer slug from config, fall back to computing from owner
    slug = config.get("slug", owner.lower().replace("-", "").replace(" ", ""))
    repos = config.get("repos", [])
    # Person node creation deferred to first session start (avoids orphaned nodes)
    org_config = ORG_CONFIGS.get(slug)
    api_key = org_config.get("api_key", "") if org_config else ""

    # Generate Telegram group invite if configured
    telegram_group_link = None
    if org_config:
        try:
            telegram_group_link = await create_group_invite_link(org_config)
        except Exception:
            pass

    setup_token = create_token({
        "fork_url": fork_url,
        "memory_url": memory_url,
        "api_key": api_key,
        "api_url": api_url,
        "org_name": config.get("org_name", owner),
        "github_org": owner,
        "github_token": token,
        "slug": slug,
        "repos": repos,
        "repo_name": body.repo_name,
        "telegram_group_link": telegram_group_link,
    })

    return {
        "setup_token": setup_token,
        "fork_url": fork_url,
        "memory_url": memory_url,
        "org_slug": slug,
        "telegram_group_link": telegram_group_link,
    }


@app.get("/api/org/claim/{token}")
async def org_claim(token: str):
    """Redeem a one-time setup token. Returns everything npx needs."""
    data = claim_token(token)
    if not data:
        raise HTTPException(status_code=404, detail="Token expired or already used")
    return data


@app.get("/api/org/install/{token}")
async def org_install_script(token: str):
    """Return a bash install script for users without Node.js.

    Usage: curl -fsSL https://egregore-core.netlify.app/api/org/install/st_xxx | bash
    """
    from fastapi.responses import PlainTextResponse

    # Peek to validate token exists (don't consume — the script will claim it)
    data = peek_token(token)
    if not data:
        return PlainTextResponse("echo 'Error: Token expired or invalid.'; exit 1", status_code=404)

    api_url = os.environ.get("EGREGORE_API_URL", "https://egregore-production-55f2.up.railway.app")

    script = f"""#!/bin/bash
set -euo pipefail

echo ""
echo "  Installing Egregore..."
echo ""

# Check for git
if ! command -v git &>/dev/null; then
  echo "  Error: git is required. Install it first."
  exit 1
fi

# Check for curl or wget
if ! command -v curl &>/dev/null; then
  echo "  Error: curl is required."
  exit 1
fi

# Check for jq (optional but helpful)
HAS_JQ=false
if command -v jq &>/dev/null; then
  HAS_JQ=true
fi

# Claim the setup token
echo "  [1/5] Claiming setup token..."
RESPONSE=$(curl -fsSL "{api_url}/api/org/claim/{token}")

if [ -z "$RESPONSE" ]; then
  echo "  Error: Token expired or already used."
  exit 1
fi

# Parse JSON response (with or without jq)
if $HAS_JQ; then
  FORK_URL=$(echo "$RESPONSE" | jq -r '.fork_url')
  MEMORY_URL=$(echo "$RESPONSE" | jq -r '.memory_url')
  GITHUB_TOKEN=$(echo "$RESPONSE" | jq -r '.github_token')
  ORG_NAME=$(echo "$RESPONSE" | jq -r '.org_name')
  GITHUB_ORG=$(echo "$RESPONSE" | jq -r '.github_org')
  API_KEY=$(echo "$RESPONSE" | jq -r '.api_key')
  API_URL=$(echo "$RESPONSE" | jq -r '.api_url')
  SLUG=$(echo "$RESPONSE" | jq -r '.slug')
  TELEGRAM_LINK=$(echo "$RESPONSE" | jq -r '.telegram_group_link // empty')
else
  # Fallback: extract with grep/sed (works for simple JSON)
  extract() {{ echo "$RESPONSE" | grep -o "\\"$1\\":\\"[^\\"]*\\"" | head -1 | sed 's/.*:"//;s/"$//'; }}
  FORK_URL=$(extract fork_url)
  MEMORY_URL=$(extract memory_url)
  GITHUB_TOKEN=$(extract github_token)
  ORG_NAME=$(extract org_name)
  GITHUB_ORG=$(extract github_org)
  API_KEY=$(extract api_key)
  API_URL=$(extract api_url)
  SLUG=$(extract slug)
  TELEGRAM_LINK=$(extract telegram_group_link)
fi

DIR_SLUG=$(echo "$GITHUB_ORG" | tr '[:upper:]' '[:lower:]')
EGREGORE_DIR="./egregore-$DIR_SLUG"
MEMORY_DIR_NAME=$(basename "$MEMORY_URL" .git)
MEMORY_DIR="./$MEMORY_DIR_NAME"

# Configure git credentials for HTTPS cloning
git config credential.helper store 2>/dev/null || true
printf 'protocol=https\\nhost=github.com\\nusername=x-access-token\\npassword=%s\\n' "$GITHUB_TOKEN" | git credential-store store 2>/dev/null || true

# Embed token in URLs for private repos (credential helper may not work)
AUTHED_FORK=$(echo "$FORK_URL" | sed "s|https://github.com/|https://x-access-token:$GITHUB_TOKEN@github.com/|")
AUTHED_MEMORY=$(echo "$MEMORY_URL" | sed "s|https://github.com/|https://x-access-token:$GITHUB_TOKEN@github.com/|")

# Clone fork
echo "  [2/5] Cloning egregore..."
if [ -d "$EGREGORE_DIR" ]; then
  echo "         Already exists — pulling latest"
  git -C "$EGREGORE_DIR" pull -q
else
  git clone -q "$AUTHED_FORK" "$EGREGORE_DIR"
  git -C "$EGREGORE_DIR" remote set-url origin "$FORK_URL" 2>/dev/null || true
fi

# Clone memory
echo "  [3/5] Cloning shared memory..."
if [ -d "$MEMORY_DIR" ]; then
  echo "         Already exists — pulling latest"
  git -C "$MEMORY_DIR" pull -q
else
  git clone -q "$AUTHED_MEMORY" "$MEMORY_DIR"
  git -C "$MEMORY_DIR" remote set-url origin "$MEMORY_URL" 2>/dev/null || true
fi

# Symlink
echo "  [4/5] Linking memory..."
if [ ! -L "$EGREGORE_DIR/memory" ]; then
  ln -s "../$MEMORY_DIR_NAME" "$EGREGORE_DIR/memory"
fi

# Write .env (secrets only — never committed to git)
echo "  [5/5] Writing credentials..."
cat > "$EGREGORE_DIR/.env" << ENVEOF
GITHUB_TOKEN=$GITHUB_TOKEN
EGREGORE_API_KEY=$API_KEY
ENVEOF
chmod 600 "$EGREGORE_DIR/.env"

# Clone managed repos (if any)
REPO_LIST=""
if $HAS_JQ; then
  REPO_LIST=$(echo "$RESPONSE" | jq -r '.repos[]? // empty' 2>/dev/null)
fi
STEP=6
REPO_DIRS=""
for REPO in $REPO_LIST; do
  echo "  [$STEP] Cloning $REPO..."
  REPO_DIR="./$REPO"
  if [ -d "$REPO_DIR" ]; then
    echo "         Already exists — pulling latest"
    git -C "$REPO_DIR" pull -q
  else
    git clone -q "https://github.com/$GITHUB_ORG/$REPO.git" "$REPO_DIR"
  fi
  REPO_DIRS="$REPO_DIRS $REPO_DIR"
  STEP=$((STEP + 1))
done

# Register instance
mkdir -p "$HOME/.egregore"
REGISTRY="$HOME/.egregore/instances.json"
if [ ! -f "$REGISTRY" ]; then
  echo "[]" > "$REGISTRY"
fi
if $HAS_JQ; then
  ENTRY=$(jq -n --arg s "$SLUG" --arg n "$ORG_NAME" --arg p "$(cd "$EGREGORE_DIR" && pwd)" \\
    '{{slug: $s, name: $n, path: $p}}')
  jq --argjson e "$ENTRY" '(map(select(.path != ($e.path)))) + [$e]' "$REGISTRY" > "$REGISTRY.tmp" \\
    && mv "$REGISTRY.tmp" "$REGISTRY"
fi

# Install egregore alias (uses script from cloned repo)
ALIAS_NAME=$(bash "$EGREGORE_DIR/bin/ensure-shell-function.sh" 2>/dev/null | cut -d: -f1 || echo "egregore")

echo ""
echo "  Egregore is ready for $ORG_NAME"
echo ""
echo "  Your workspace:"
echo "    $EGREGORE_DIR/   — Your Egregore instance"
echo "    $MEMORY_DIR/     — Shared knowledge"
for REPO_DIR in $REPO_DIRS; do
  echo "    $REPO_DIR/       — Managed repo"
done
if [ -n "$TELEGRAM_LINK" ]; then
  echo ""
  echo "  Join the Telegram group for notifications:"
  echo "    $TELEGRAM_LINK"
fi
echo ""
echo "  Next: open a new terminal and type $ALIAS_NAME to start."
echo ""
"""
    return PlainTextResponse(script, media_type="text/plain")


@app.post("/api/org/telegram")
async def org_telegram(body: OrgTelegram, authorization: str = Header(None)):
    """Bot reports its chat_id after being added to a group."""
    # Authenticate: accept bot token or dedicated bot secret
    bot_token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
    bot_secret = os.environ.get("TELEGRAM_BOT_SECRET", "")
    if authorization:
        auth_value = authorization.replace("Bearer ", "").strip()
        valid = (
            (bot_secret and secrets.compare_digest(auth_value, bot_secret))
            or (bot_token and secrets.compare_digest(auth_value, bot_token))
        )
        if not valid:
            raise HTTPException(status_code=401, detail="Invalid authorization")
    elif bot_secret or bot_token:
        raise HTTPException(status_code=401, detail="Missing authorization")

    slug = body.org_slug
    org = ORG_CONFIGS.get(slug)
    if not org:
        raise HTTPException(status_code=404, detail=f"Unknown org: {slug}")

    # Store chat_id
    ORG_CONFIGS[slug]["telegram_chat_id"] = body.chat_id

    # Persist to Neo4j
    try:
        await execute_query(org, """
            MATCH (o:Org {id: $_org})
            SET o.telegram_chat_id = $chat_id
        """, {"chat_id": body.chat_id})
    except Exception as e:
        logger.warning(f"Failed to persist telegram_chat_id: {e}")

    return {"status": "connected", "org_slug": slug, "org_name": org.get("org_name", slug)}


@app.get("/api/org/telegram/status/{slug}")
async def org_telegram_status(slug: str):
    """Check if Telegram is connected for an org (for polling from website)."""
    org = ORG_CONFIGS.get(slug)
    if not org:
        raise HTTPException(status_code=404, detail=f"Unknown org: {slug}")

    connected = bool(org.get("telegram_chat_id"))
    return {"connected": connected, "org_slug": slug}


@app.post("/api/org/telegram/invite-link")
async def org_telegram_invite_link(org: dict = Depends(validate_api_key)):
    """Generate a one-time Telegram group invite link for the org."""
    link = await create_group_invite_link(org)
    if not link:
        raise HTTPException(status_code=400, detail="Telegram not configured or bot lacks permission")
    return {"invite_link": link}


@app.get("/api/org/{slug}/telegram/membership")
async def org_telegram_membership(slug: str, authorization: str = Header(...)):
    """Check if a user is in the org's Telegram group.

    Auth: GitHub token (from setup flow OAuth).
    Looks up Person by GitHub username → gets telegramId → checks TelegramUser IN_GROUP.
    """
    import httpx

    github_token = authorization.replace("Bearer ", "").strip()
    if not github_token:
        raise HTTPException(status_code=401, detail="Missing GitHub token")

    org_config = ORG_CONFIGS.get(slug)
    if not org_config:
        raise HTTPException(status_code=404, detail="Org not found")
    org = {**org_config, "slug": slug}

    # Get GitHub username
    async with httpx.AsyncClient() as client:
        user_resp = await client.get(
            "https://api.github.com/user",
            headers={"Authorization": f"token {github_token}"},
            timeout=10.0,
        )
    if user_resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid GitHub token")

    username = user_resp.json().get("login", "")

    # Check if Telegram is configured for this org
    if not org.get("telegram_chat_id"):
        return {"status": "not_configured", "in_group": False, "group_name": None}

    # Get actual Telegram group title from Telegram API
    bot_token = org.get("telegram_bot_token", "")
    chat_id = org.get("telegram_chat_id", "")
    group_name = slug  # fallback
    async with httpx.AsyncClient() as client:
        try:
            chat_resp = await client.get(
                f"https://api.telegram.org/bot{bot_token}/getChat",
                params={"chat_id": chat_id},
                timeout=10.0,
            )
            chat_data = chat_resp.json()
            if chat_data.get("ok"):
                group_name = chat_data["result"].get("title", slug)
        except Exception:
            pass

    # Cross-org query: TelegramUser (system label, not org-scoped) → Person via IDENTIFIES
    # We start from TelegramUser to avoid org scoping on Person which would restrict to current org only
    membership_result = await execute_query(org, """
        MATCH (tu:TelegramUser)-[:IDENTIFIES]->(p)
        WHERE p.github = $username OR p.name = $username OR p.name = $usernameLower
        WITH DISTINCT tu
        OPTIONAL MATCH (tu)-[r:IN_GROUP {status: 'active'}]->(o:Org {id: $orgId})
        RETURN count(r) AS cnt, tu.username AS telegramUsername
    """, {"username": username, "usernameLower": username.lower(), "orgId": slug})

    membership_values = membership_result.get("values", [])
    in_group = bool(membership_values and membership_values[0] and membership_values[0][0] > 0)
    telegram_username = membership_values[0][1] if membership_values and len(membership_values[0]) > 1 else None

    # Generate invite link so frontend can link to the group
    telegram_group_link = None
    try:
        telegram_group_link = await create_group_invite_link(org)
    except Exception:
        pass

    return {
        "status": "configured",
        "in_group": in_group,
        "group_name": group_name,
        "telegram_group_link": telegram_group_link,
        "telegram_username": telegram_username,
    }


@app.get("/api/auth/github/client-id")
async def github_client_id():
    """Return the GitHub OAuth client ID for the web flow."""
    return {"client_id": GITHUB_CLIENT_ID}


# =============================================================================
# USER PROFILE
# =============================================================================


def _get_seed_org() -> dict | None:
    """Get a seed org config with Neo4j access for cross-org queries."""
    for slug, org in ORG_CONFIGS.items():
        if org.get("neo4j_host"):
            return {**org, "slug": slug}
    return None


@app.get("/api/user/profile")
async def user_profile_get(authorization: str = Header(...)):
    """Get user profile: Telegram handle + org memberships.

    Auth: GitHub token. Cross-org lookup (not scoped to a single org).
    """
    import httpx

    github_token = authorization.replace("Bearer ", "").strip()
    if not github_token:
        raise HTTPException(status_code=401, detail="Missing GitHub token")

    # Get GitHub user info
    async with httpx.AsyncClient() as client:
        user_resp = await client.get(
            "https://api.github.com/user",
            headers={"Authorization": f"token {github_token}"},
            timeout=10.0,
        )
    if user_resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid GitHub token")

    github_user = user_resp.json()
    username = github_user.get("login", "")
    name = github_user.get("name", "") or username

    seed_org = _get_seed_org()
    if not seed_org:
        return {
            "github_username": username,
            "name": name,
            "telegram_username": None,
            "memberships": [],
        }

    # Query 1: Find TelegramUser linked to any Person with this github
    tu_result = await execute_query(seed_org, """
        MATCH (tu:TelegramUser)-[:IDENTIFIES]->(p)
        WHERE p.github = $username
        RETURN tu.username AS tuUser, COLLECT(DISTINCT p.org) AS orgs
    """, {"username": username})

    tu_username = None
    org_ids = set()

    tu_values = tu_result.get("values", [])
    if tu_values and tu_values[0]:
        tu_username = tu_values[0][0]
        org_ids.update(o for o in (tu_values[0][1] or []) if o)

    # Query 2 (fallback): Find unlinked Person nodes
    p_result = await execute_query(seed_org, """
        MATCH (p) WHERE p.github = $username AND p.org IS NOT NULL
        RETURN COLLECT(DISTINCT p.org) AS orgs
    """, {"username": username})

    p_values = p_result.get("values", [])
    if p_values and p_values[0]:
        org_ids.update(o for o in (p_values[0][0] or []) if o)

    # Query 3: For each org, get Org name + IN_GROUP status
    memberships = []
    if org_ids:
        org_result = await execute_query(seed_org, """
            MATCH (o:Org) WHERE o.id IN $orgIds
            OPTIONAL MATCH (tu:TelegramUser {username: $tuUser})-[r:IN_GROUP {status: 'active'}]->(o)
            RETURN o.id AS slug, o.name AS name, count(r) > 0 AS inGroup
        """, {"orgIds": list(org_ids), "tuUser": tu_username or ""})

        for row in org_result.get("values", []):
            if row and len(row) >= 3:
                memberships.append({
                    "org_slug": row[0],
                    "org_name": row[1] or row[0],
                    "in_telegram_group": bool(row[2]),
                })

    return {
        "github_username": username,
        "name": name,
        "telegram_username": tu_username,
        "memberships": memberships,
    }


@app.post("/api/user/profile")
async def user_profile_update(body: UserProfileUpdate, authorization: str = Header(...)):
    """Update user profile: set Telegram handle on all Person nodes + TelegramUser.

    Auth: GitHub token. Cross-org update.
    """
    import httpx

    github_token = authorization.replace("Bearer ", "").strip()
    if not github_token:
        raise HTTPException(status_code=401, detail="Missing GitHub token")

    async with httpx.AsyncClient() as client:
        user_resp = await client.get(
            "https://api.github.com/user",
            headers={"Authorization": f"token {github_token}"},
            timeout=10.0,
        )
    if user_resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid GitHub token")

    github_user = user_resp.json()
    username = github_user.get("login", "")
    name = github_user.get("name", "") or username

    # Strip leading @ and trim
    tg_handle = body.telegram_username.lstrip("@").strip()
    if not tg_handle:
        raise HTTPException(status_code=400, detail="Telegram username cannot be empty")

    seed_org = _get_seed_org()
    if not seed_org:
        raise HTTPException(status_code=503, detail="No Neo4j connection available")

    # Set telegramUsername on all Person nodes with matching github
    await execute_query(seed_org, """
        MATCH (p) WHERE p.github = $username
        SET p.telegramUsername = $tgHandle
    """, {"username": username, "tgHandle": tg_handle})

    # MERGE TelegramUser and IDENTIFIES relationships
    await execute_query(seed_org, """
        MERGE (tu:TelegramUser {username: $tgHandle})
        WITH tu
        MATCH (p) WHERE p.github = $username
        MERGE (tu)-[:IDENTIFIES]->(p)
    """, {"username": username, "tgHandle": tg_handle})

    # Return updated profile (same shape as GET)
    # Re-gather memberships
    org_result = await execute_query(seed_org, """
        MATCH (p) WHERE p.github = $username AND p.org IS NOT NULL
        WITH COLLECT(DISTINCT p.org) AS orgIds
        UNWIND orgIds AS oid
        MATCH (o:Org {id: oid})
        OPTIONAL MATCH (tu:TelegramUser {username: $tgHandle})-[r:IN_GROUP {status: 'active'}]->(o)
        RETURN o.id AS slug, o.name AS name, count(r) > 0 AS inGroup
    """, {"username": username, "tgHandle": tg_handle})

    memberships = []
    for row in org_result.get("values", []):
        if row and len(row) >= 3:
            memberships.append({
                "org_slug": row[0],
                "org_name": row[1] or row[0],
                "in_telegram_group": bool(row[2]),
            })

    return {
        "github_username": username,
        "name": name,
        "telegram_username": tg_handle,
        "memberships": memberships,
    }


# =============================================================================
# INVITE FLOW
# =============================================================================


@app.post("/api/org/invite")
async def org_invite(body: OrgInvite, authorization: str = Header(...)):
    """Invite a GitHub user to an org's Egregore.

    The inviter must be an admin of the GitHub org.
    Sends a GitHub org invitation + creates an Egregore invite link.
    """
    token = authorization.replace("Bearer ", "").strip()

    try:
        inviter = await gh.get_user(token)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid GitHub token")

    owner = body.github_org

    # Verify the repo exists (org has Egregore)
    if not await gh.repo_exists(token, owner, body.repo_name):
        raise HTTPException(status_code=404, detail=f"No Egregore setup found for {owner} ({body.repo_name})")

    # Detect personal vs org account
    is_personal = not await gh.is_org(token, owner)

    if is_personal:
        # Personal account: inviter must be the repo owner
        if inviter["login"].lower() != owner.lower():
            raise HTTPException(status_code=403, detail="Only the account owner can invite.")
        # Add as collaborator on egregore repo
        await gh.add_repo_collaborator(token, owner, body.repo_name, body.github_username)
        github_result = {"status": "collaborator_invited"}
    else:
        # Org account: inviter must be admin
        role = await gh.get_org_membership(token, owner)
        if role not in ("admin",):
            raise HTTPException(
                status_code=403,
                detail="Only org admins can invite. Ask an admin to send the invite.",
            )
        github_result = await gh.invite_to_org(token, owner, body.github_username)

    # Read org config for the invite token
    config_raw = await gh.get_file_content(token, owner, body.repo_name, "egregore.json")
    org_name = owner
    slug = owner.lower().replace("-", "").replace(" ", "")
    repos = []
    if config_raw:
        config = json.loads(config_raw)
        org_name = config.get("org_name", owner)
        slug = config.get("slug", slug)
        repos = config.get("repos", [])

        # Add as collaborator on the memory repo
        memory_repo = config.get("memory_repo", f"{owner}-memory")
        if "/" in memory_repo:
            memory_repo_name = memory_repo.split("/")[-1].replace(".git", "")
        else:
            memory_repo_name = memory_repo
        await gh.add_repo_collaborator(token, owner, memory_repo_name, body.github_username)

    # Create invite token (7-day TTL)
    site_url = os.environ.get("EGREGORE_SITE_URL", "https://egregore-core.netlify.app")
    invite_token = create_invite_token({
        "github_org": owner,
        "org_name": org_name,
        "invited_username": body.github_username,
        "invited_by": inviter["login"],
        "slug": slug,
        "repos": repos,
        "repo_name": body.repo_name,
        "is_personal": is_personal,
    })

    invite_url = f"{site_url}/join?invite={invite_token}"

    logger.info(f"Invite created: {inviter['login']} invited {body.github_username} to {owner}")

    return {
        "invite_url": invite_url,
        "invite_token": invite_token,
        "github_invite": github_result,
        "org_name": org_name,
        "invited_username": body.github_username,
    }


@app.get("/api/org/invite/{token}")
async def org_invite_info(token: str):
    """Get invite details without consuming the token. For the website to show invite info."""
    data = peek_token(token)
    if not data:
        raise HTTPException(status_code=404, detail="Invite expired or invalid")
    return {
        "org_name": data.get("org_name", ""),
        "github_org": data.get("github_org", ""),
        "invited_by": data.get("invited_by", ""),
        "invited_username": data.get("invited_username", ""),
    }


@app.post("/api/org/invite/{invite_token}/accept")
async def org_invite_accept(invite_token: str, authorization: str = Header(...)):
    """Accept an invite. Invitee authenticates, we verify org membership and set them up."""
    token = authorization.replace("Bearer ", "").strip()

    # Validate invite token (peek, don't consume yet)
    invite_data = peek_token(invite_token)
    if not invite_data:
        raise HTTPException(status_code=404, detail="Invite expired or invalid")

    try:
        user = await gh.get_user(token)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid GitHub token")

    owner = invite_data["github_org"]
    slug = invite_data.get("slug", owner.lower().replace("-", "").replace(" ", ""))
    is_personal = invite_data.get("is_personal", False)

    if is_personal:
        is_owner = user["login"].lower() == owner.lower()

        if not is_owner:
            # Invitee (not the repo owner): accept pending repo collaboration invitations
            accepted = await gh.accept_repo_invitations(token, owner)

            # Verify access to the egregore repo
            repo_name = invite_data.get("repo_name", "egregore-core")
            has_egregore_access = await gh.repo_exists(token, owner, repo_name)

            if not has_egregore_access:
                return {
                    "status": "pending_github",
                    "message": f"Waiting for access to: {repo_name}. Retrying automatically...",
                    "github_org": owner,
                }

            # Verify access to memory repo
            memory_repo_name = f"{owner}-memory"
            try:
                config_raw = await gh.get_file_content(token, owner, repo_name, "egregore.json")
                if config_raw:
                    _cfg = json.loads(config_raw)
                    _mem = _cfg.get("memory_repo", memory_repo_name)
                    if "/" in _mem:
                        memory_repo_name = _mem.split("/")[-1].replace(".git", "")
                    else:
                        memory_repo_name = _mem
            except Exception:
                pass

            has_memory_access = await gh.repo_exists(token, owner, memory_repo_name)
            if not has_memory_access:
                return {
                    "status": "pending_github",
                    "message": f"Waiting for access to: {memory_repo_name}. Retrying automatically...",
                    "github_org": owner,
                }
    else:
        # Org account: check org membership — auto-accept if pending
        membership = await gh.check_org_membership(token, owner, user["login"])

        if membership == "pending":
            accepted = await gh.accept_org_invitation(token, owner)
            if accepted:
                membership = "active"
            else:
                return {
                    "status": "error",
                    "message": "Could not accept the org invitation. Try again or accept it manually on GitHub.",
                    "github_org": owner,
                }

        if membership == "none":
            return {
                "status": "pending_github",
                "message": "The org invitation hasn't arrived yet. Try again in a moment.",
                "github_org": owner,
            }

    # Access verified — proceed with Egregore join
    # Read egregore.json from repo (use repo_name from invite data, default to egregore-core)
    invite_repo_name = invite_data.get("repo_name", "egregore-core")
    config_raw = await gh.get_file_content(token, owner, invite_repo_name, "egregore.json")
    if not config_raw:
        raise HTTPException(status_code=404, detail="egregore.json not found in repo")

    config = json.loads(config_raw)
    memory_repo = config.get("memory_repo", f"{owner}-memory")
    if memory_repo.startswith("http"):
        memory_url = memory_repo
    else:
        memory_url = f"https://github.com/{owner}/{memory_repo}.git"

    fork_url = f"https://github.com/{owner}/{invite_repo_name}.git"
    api_url = config.get("api_url", "")
    repos = config.get("repos", [])

    # Person node creation deferred to first session start
    org_config = ORG_CONFIGS.get(slug)

    # Consume the invite token now
    claim_token(invite_token)

    # Get API key from server config (not from egregore.json — secrets don't go in git)
    api_key = org_config.get("api_key", "") if org_config else ""

    # Generate setup token for npx installer
    setup_token = create_token({
        "fork_url": fork_url,
        "memory_url": memory_url,
        "api_key": api_key,
        "api_url": api_url,
        "org_name": config.get("org_name", owner),
        "github_org": owner,
        "github_token": token,
        "slug": slug,
        "repos": repos,
        "repo_name": invite_repo_name,
    })

    # Generate Telegram group invite link for the new member
    telegram_group_link = None
    if org_config:
        telegram_group_link = await create_group_invite_link(org_config)

    return {
        "status": "accepted",
        "setup_token": setup_token,
        "fork_url": fork_url,
        "memory_url": memory_url,
        "org_slug": slug,
        "org_name": config.get("org_name", owner),
        "telegram_group_link": telegram_group_link,
    }


# =============================================================================
# HEALTH
# =============================================================================


@app.get("/health")
async def health():
    return {"status": "ok", "service": "egregore-api"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("api.main:app", host="0.0.0.0", port=port, reload=True)
