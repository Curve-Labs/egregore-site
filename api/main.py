"""
Egregore API Gateway

Sits between egregore instances and shared infrastructure (Neo4j, Telegram).
Each org gets an API key. Secrets stay server-side.

Deploy to Railway alongside telegram-bot.
"""

import os
import json
import logging

from dotenv import load_dotenv
load_dotenv(override=False)

from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware

from .auth import (
    validate_api_key, generate_api_key, reload_configs, ORG_CONFIGS,
    load_orgs_from_neo4j, exchange_github_code, GITHUB_CLIENT_ID,
)
from .models import (
    GraphQuery, NotifySend, NotifyGroup, OrgRegister,
    OrgSetup, OrgJoin, OrgTelegram, GitHubCallback, SetupOrgsResponse,
)
from .services.graph import execute_query, get_schema, test_connection
from .services.notify import send_message, send_group, test_notify, generate_bot_invite_link
from .services import github as gh
from .services.tokens import create_token, claim_token

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Egregore API",
    description="API gateway for Egregore shared infrastructure",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    """Load org configs from Neo4j on startup."""
    await load_orgs_from_neo4j()


# =============================================================================
# GRAPH ENDPOINTS
# =============================================================================


@app.post("/api/graph/query")
async def graph_query(body: GraphQuery, org: dict = Depends(validate_api_key)):
    """Execute a Cypher query scoped to the org."""
    result = await execute_query(org, body.statement, body.parameters)
    if isinstance(result, dict) and result.get("error"):
        raise HTTPException(status_code=400, detail=result["error"])
    return result


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

    # Check each org for egregore-core fork
    org_results = []
    for org in orgs:
        has_egregore = await gh.repo_exists(token, org["login"], "egregore-core")
        role = await gh.get_org_membership(token, org["login"])
        org_results.append({
            "login": org["login"],
            "name": org["name"],
            "has_egregore": has_egregore,
            "role": role or "member",
            "avatar_url": org.get("avatar_url", ""),
        })

    personal_has = await gh.repo_exists(token, user["login"], "egregore-core")

    return {
        "user": user,
        "orgs": org_results,
        "personal": {"login": user["login"], "has_egregore": personal_has},
    }


@app.post("/api/org/setup")
async def org_setup(body: OrgSetup, authorization: str = Header(...)):
    """Founder: full org setup. Forks, creates memory, bootstraps Neo4j, returns setup token."""
    token = authorization.replace("Bearer ", "").strip()

    try:
        user = await gh.get_user(token)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid GitHub token")

    target_org = None if body.is_personal else body.github_org
    owner = user["login"] if body.is_personal else body.github_org
    slug = owner.lower().replace("-", "").replace(" ", "")
    memory_repo_name = f"{owner}-memory"

    # Check if already set up
    if await gh.repo_exists(token, owner, "egregore-core"):
        raise HTTPException(status_code=409, detail=f"Egregore already set up for {owner}")

    # 1. Fork egregore-core
    logger.info(f"Forking egregore-core to {owner}")
    await gh.fork_repo(token, target_org)

    # 2. Wait for fork to be ready
    if not await gh.wait_for_fork(token, owner):
        raise HTTPException(status_code=504, detail="Fork timed out — try again")

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

    # 6. Update egregore.json in the fork
    memory_url = f"https://github.com/{owner}/{memory_repo_name}.git"
    try:
        await gh.update_egregore_json(
            token, owner, "egregore-core",
            body.org_name, owner, memory_repo_name,
            api_url, api_key,
        )
    except ValueError as e:
        logger.warning(f"Failed to update egregore.json in fork: {e}")

    # 7. Bootstrap Neo4j — Org, founder Person, Project
    try:
        await execute_query(new_org, """
            MERGE (o:Org {id: $_org})
            SET o.name = $name, o.github_org = $github_org, o.api_key = $api_key
        """, {"name": body.org_name, "github_org": owner, "api_key": api_key})

        await execute_query(new_org, """
            MERGE (p:Person {name: $name})
            WITH p
            MATCH (o:Org {id: $_org})
            MERGE (p)-[:MEMBER_OF]->(o)
        """, {"name": user["login"]})

        await execute_query(new_org, """
            MERGE (pr:Project {name: "Egregore"})
            WITH pr
            MATCH (o:Org {id: $_org})
            MERGE (pr)-[:PART_OF]->(o)
        """, {})
    except Exception as e:
        logger.warning(f"Neo4j bootstrap partial failure: {e}")

    # 8. Telegram invite link
    telegram_invite = generate_bot_invite_link(slug)

    # 9. Generate setup token
    fork_url = f"https://github.com/{owner}/egregore-core.git"
    setup_token = create_token({
        "fork_url": fork_url,
        "memory_url": memory_url,
        "api_key": api_key,
        "api_url": api_url,
        "org_name": body.org_name,
        "github_org": owner,
        "github_token": token,
        "slug": slug,
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

    # Verify fork exists
    if not await gh.repo_exists(token, owner, "egregore-core"):
        raise HTTPException(status_code=404, detail=f"No Egregore setup found for {owner}")

    # Read egregore.json from fork to get config
    config_raw = await gh.get_file_content(token, owner, "egregore-core", "egregore.json")
    if not config_raw:
        raise HTTPException(status_code=404, detail="egregore.json not found in fork")

    config = json.loads(config_raw)
    memory_repo = config.get("memory_repo", f"{owner}-memory")

    # Determine memory URL
    if memory_repo.startswith("http"):
        memory_url = memory_repo
    else:
        memory_url = f"https://github.com/{owner}/{memory_repo}.git"

    # Verify user has access to memory repo
    memory_repo_name = memory_repo.split("/")[-1].replace(".git", "") if "/" in memory_repo else memory_repo
    if not await gh.repo_exists(token, owner, memory_repo_name):
        raise HTTPException(
            status_code=403,
            detail=f"You don't have access to {owner}/{memory_repo_name}. Ask your team to add you.",
        )

    fork_url = f"https://github.com/{owner}/egregore-core.git"
    api_url = config.get("api_url", "")
    api_key = config.get("api_key", "")

    # Add person to Neo4j if we have a matching org config
    slug = owner.lower().replace("-", "").replace(" ", "")
    org_config = ORG_CONFIGS.get(slug)
    if org_config:
        try:
            await execute_query(org_config, """
                MERGE (p:Person {name: $name})
                WITH p
                MATCH (o:Org {id: $_org})
                MERGE (p)-[:MEMBER_OF]->(o)
            """, {"name": user["login"]})
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
    })

    return {
        "setup_token": setup_token,
        "fork_url": fork_url,
        "memory_url": memory_url,
        "org_slug": slug,
    }


@app.get("/api/org/claim/{token}")
async def org_claim(token: str):
    """Redeem a one-time setup token. Returns everything npx needs."""
    data = claim_token(token)
    if not data:
        raise HTTPException(status_code=404, detail="Token expired or already used")
    return data


@app.post("/api/org/telegram")
async def org_telegram(body: OrgTelegram, authorization: str = Header(None)):
    """Bot reports its chat_id after being added to a group."""
    # Authenticate with bot secret or API key
    bot_secret = os.environ.get("TELEGRAM_BOT_SECRET", "")
    if authorization:
        auth_value = authorization.replace("Bearer ", "").strip()
        if bot_secret and auth_value != bot_secret:
            raise HTTPException(status_code=401, detail="Invalid bot secret")
    elif bot_secret:
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

    return {"status": "connected", "org_slug": slug}


@app.get("/api/org/telegram/status/{slug}")
async def org_telegram_status(slug: str):
    """Check if Telegram is connected for an org (for polling from website)."""
    org = ORG_CONFIGS.get(slug)
    if not org:
        raise HTTPException(status_code=404, detail=f"Unknown org: {slug}")

    connected = bool(org.get("telegram_chat_id"))
    return {"connected": connected, "org_slug": slug}


@app.get("/api/auth/github/client-id")
async def github_client_id():
    """Return the GitHub OAuth client ID for the web flow."""
    return {"client_id": GITHUB_CLIENT_ID}


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
