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

from .auth import validate_api_key, generate_api_key, reload_configs, ORG_CONFIGS
from .models import GraphQuery, NotifySend, NotifyGroup, OrgRegister
from .services.graph import execute_query, get_schema, test_connection
from .services.notify import send_message, send_group, test_notify

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
# ORG MANAGEMENT
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
    from .services.graph import execute_query
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
# HEALTH
# =============================================================================


@app.get("/health")
async def health():
    return {"status": "ok", "service": "egregore-api"}


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("api.main:app", host="0.0.0.0", port=port, reload=True)
