import os
import json
import secrets

from fastapi import HTTPException, Header


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
        for org in json.loads(orgs_raw):
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

    if not org or org.get("api_key") != key:
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
