import os
import json
import logging
import secrets

import httpx
from fastapi import HTTPException, Header


logger = logging.getLogger(__name__)

# GitHub OAuth App
GITHUB_CLIENT_ID = "Ov23lizB4nYEeIRsHTdb"
GITHUB_CLIENT_SECRET = os.environ.get("GITHUB_CLIENT_SECRET", "")


# Org configs loaded from ORG_CONFIGS env var (JSON) or individual env vars.
# Format: {"curvelabs": {"api_key": "ek_curvelabs_xxx", "neo4j_host": "...", ...}}
def load_org_configs() -> dict:
    raw = os.environ.get("ORG_CONFIGS")
    if raw:
        return json.loads(raw)

    # Fallback: build from individual env vars (backwards compat with telegram-bot)
    configs = {}

    # Curve Labs (always present)
    cl_key = os.environ.get("CURVELABS_API_KEY", "")
    if cl_key:
        configs["curvelabs"] = {
            "api_key": cl_key,
            "org_name": "Curve Labs",
            "github_org": "Curve-Labs",
            "neo4j_host": os.environ.get("NEO4J_HOST", ""),
            "neo4j_user": os.environ.get("NEO4J_USER", "neo4j"),
            "neo4j_password": os.environ.get("NEO4J_PASSWORD", ""),
            "telegram_bot_token": os.environ.get("TELEGRAM_BOT_TOKEN", ""),
            "telegram_chat_id": os.environ.get("TELEGRAM_CHAT_ID", ""),
        }

    # Dynamic orgs from EGREGORE_ORGS env var (JSON list)
    orgs_raw = os.environ.get("EGREGORE_ORGS")
    if orgs_raw:
        default_bot_token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
        for org in json.loads(orgs_raw):
            if not org.get("telegram_bot_token") and default_bot_token:
                org["telegram_bot_token"] = default_bot_token
            configs[org["slug"]] = org

    return configs


ORG_CONFIGS = load_org_configs()


def get_org_slug(api_key: str) -> str:
    """Extract org slug from API key: ek_<slug>_<secret>"""
    parts = api_key.split("_")
    if len(parts) < 3 or parts[0] != "ek":
        raise HTTPException(status_code=401, detail="Invalid API key format")
    return parts[1]


async def validate_api_key(authorization: str = Header(...)) -> dict:
    """Validate API key and return org config."""
    key = authorization.replace("Bearer ", "").strip()

    if not key.startswith("ek_"):
        raise HTTPException(status_code=401, detail="Invalid API key")

    slug = get_org_slug(key)
    org = ORG_CONFIGS.get(slug)

    if not org or not secrets.compare_digest(org.get("api_key", ""), key):
        raise HTTPException(status_code=401, detail="Invalid API key")

    return {**org, "slug": slug}


def generate_api_key(org_slug: str) -> str:
    """Generate a new API key for an org."""
    random_part = secrets.token_hex(16)
    return f"ek_{org_slug}_{random_part}"


def reload_configs():
    """Reload org configs from environment. Call after adding a new org."""
    global ORG_CONFIGS
    ORG_CONFIGS = load_org_configs()


async def load_orgs_from_neo4j():
    """Load org configs from Neo4j on startup. New orgs survive API restarts.

    Prefers EGREGORE_NEO4J_HOST (the shared customer database) over ORG_CONFIGS
    seed. CL's private instance (NEO4J_HOST) is only for the curvelabs org.
    """
    # Prefer EGREGORE_NEO4J_HOST — that's the shared customer database
    host = os.environ.get("EGREGORE_NEO4J_HOST", "")
    if host:
        seed_org = {
            "neo4j_host": host,
            "neo4j_user": os.environ.get("EGREGORE_NEO4J_USER", "neo4j"),
            "neo4j_password": os.environ.get("EGREGORE_NEO4J_PASSWORD", ""),
            "slug": "__system__",
        }
    else:
        # Fallback: use any org with neo4j_host (e.g. curvelabs)
        seed_org = None
        for slug, org in ORG_CONFIGS.items():
            if org.get("neo4j_host"):
                seed_org = {**org, "slug": slug}
                break
        if not seed_org:
            logger.info("No Neo4j connection available — skipping org reload")
            return

    try:
        from .services.graph import execute_system_query
        result = await execute_system_query(
            seed_org,
            "MATCH (o:Org) RETURN o.id AS slug, o.name AS name, o.github_org AS github_org, "
            "o.api_key AS api_key, o.telegram_chat_id AS telegram_chat_id",
            {},
        )

        values = result.get("values", [])
        if not values:
            return

        default_neo4j_host = seed_org["neo4j_host"]
        default_neo4j_user = seed_org.get("neo4j_user", "neo4j")
        default_neo4j_password = seed_org.get("neo4j_password", "")
        default_bot_token = os.environ.get("TELEGRAM_BOT_TOKEN", "")

        for row in values:
            slug, name, github_org, api_key, telegram_chat_id = row
            if not slug or not api_key:
                continue
            if slug in ORG_CONFIGS:
                # Update telegram fields if stored in Neo4j
                if telegram_chat_id:
                    ORG_CONFIGS[slug]["telegram_chat_id"] = telegram_chat_id
                if not ORG_CONFIGS[slug].get("telegram_bot_token"):
                    ORG_CONFIGS[slug]["telegram_bot_token"] = default_bot_token
                continue

            ORG_CONFIGS[slug] = {
                "api_key": api_key,
                "org_name": name or slug,
                "github_org": github_org or slug,
                "neo4j_host": default_neo4j_host,
                "neo4j_user": default_neo4j_user,
                "neo4j_password": default_neo4j_password,
                "telegram_bot_token": default_bot_token,
                "telegram_chat_id": telegram_chat_id or "",
            }
            logger.info(f"Loaded org from Neo4j: {slug}")

        # Backfill org property on existing Org nodes that predate scoping change
        await execute_system_query(
            seed_org,
            "MATCH (o:Org) WHERE o.org IS NULL SET o.org = o.id",
            {},
        )

    except Exception as e:
        logger.warning(f"Failed to load orgs from Neo4j: {e}")


async def exchange_github_code(code: str) -> str:
    """Exchange OAuth authorization code for access token."""
    if not GITHUB_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="GitHub OAuth not configured (missing client secret)")

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://github.com/login/oauth/access_token",
            headers={"Accept": "application/json"},
            data={
                "client_id": GITHUB_CLIENT_ID,
                "client_secret": GITHUB_CLIENT_SECRET,
                "code": code,
            },
            timeout=10.0,
        )

    if resp.status_code >= 500:
        raise HTTPException(status_code=502, detail=f"GitHub is temporarily unavailable ({resp.status_code}). Try again in a moment.")

    try:
        data = resp.json()
    except Exception:
        raise HTTPException(status_code=502, detail="GitHub returned an invalid response. Try again in a moment.")

    token = data.get("access_token")
    if not token:
        error = data.get("error_description", data.get("error", "Unknown error"))
        raise HTTPException(status_code=400, detail=f"GitHub OAuth failed: {error}")
    return token
