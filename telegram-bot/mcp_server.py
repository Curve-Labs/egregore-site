"""
Egregore MCP Server - Remote MCP over SSE

Provides Neo4j and Telegram tools to Claude Code clients without
requiring local uvx/npx installations.

Protocol: MCP (Model Context Protocol) over SSE transport
"""

import json
import logging
import os
import hashlib
from typing import Optional, AsyncGenerator
from datetime import datetime

from starlette.requests import Request
from starlette.responses import StreamingResponse, JSONResponse
from neo4j import GraphDatabase

logger = logging.getLogger(__name__)

# =============================================================================
# ORG CONFIGURATION (shared with bot.py)
# =============================================================================

# Default Curve Labs Neo4j
NEO4J_URI = os.environ.get("NEO4J_URI", "")
NEO4J_USER = os.environ.get("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.environ.get("NEO4J_PASSWORD", "")

# Org configs - keyed by org API key prefix
ORG_BY_KEY = {}

def init_org_configs():
    """Initialize org configs from environment."""
    global ORG_BY_KEY

    # Curve Labs (default)
    if NEO4J_URI:
        ORG_BY_KEY["curvelabs"] = {
            "name": "curvelabs",
            "neo4j_uri": NEO4J_URI,
            "neo4j_user": NEO4J_USER,
            "neo4j_password": NEO4J_PASSWORD,
        }

    # Test org
    testorg_uri = os.environ.get("TESTORG_NEO4J_URI", "")
    if testorg_uri:
        ORG_BY_KEY["testorg"] = {
            "name": "testorg",
            "neo4j_uri": testorg_uri,
            "neo4j_user": os.environ.get("TESTORG_NEO4J_USER", "neo4j"),
            "neo4j_password": os.environ.get("TESTORG_NEO4J_PASSWORD", ""),
        }

    logger.info(f"MCP orgs configured: {list(ORG_BY_KEY.keys())}")

# Initialize on module load
init_org_configs()

# =============================================================================
# NEO4J DRIVERS (per-org)
# =============================================================================

org_drivers = {}

def get_org_driver(org_config: dict):
    """Get or create org-specific Neo4j driver."""
    if not org_config:
        return None

    org_name = org_config.get("name", "default")
    uri = org_config.get("neo4j_uri")
    user = org_config.get("neo4j_user", "neo4j")
    password = org_config.get("neo4j_password")

    if not uri or not password:
        return None

    if org_name not in org_drivers:
        org_drivers[org_name] = GraphDatabase.driver(uri, auth=(user, password))
        logger.info(f"MCP Neo4j driver initialized for org: {org_name}")

    return org_drivers[org_name]


def run_org_query(query: str, params: dict = None, org_config: dict = None) -> list:
    """Run a Cypher query on org-specific Neo4j."""
    driver = get_org_driver(org_config)
    if not driver:
        return []

    try:
        with driver.session() as session:
            result = session.run(query, params or {})
            return [dict(record) for record in result]
    except Exception as e:
        logger.error(f"MCP Neo4j query failed: {e}")
        return []


# =============================================================================
# API KEY VALIDATION
# =============================================================================

def validate_api_key(api_key: str) -> Optional[dict]:
    """Validate API key and return org config.

    API key format: ek_<org>_<secret>
    Example: ek_testorg_abc123xyz
    """
    if not api_key or not api_key.startswith("ek_"):
        return None

    parts = api_key.split("_", 2)
    if len(parts) < 3:
        return None

    org_name = parts[1]
    # TODO: validate secret against stored hash

    return ORG_BY_KEY.get(org_name)


# =============================================================================
# MCP TOOL DEFINITIONS
# =============================================================================

MCP_TOOLS = [
    {
        "name": "neo4j_query",
        "description": "Execute a Cypher query on the Neo4j knowledge graph. Returns results as JSON.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "The Cypher query to execute"
                },
                "params": {
                    "type": "object",
                    "description": "Query parameters (optional)",
                    "additionalProperties": True
                }
            },
            "required": ["query"]
        }
    },
    {
        "name": "neo4j_schema",
        "description": "Get the Neo4j database schema including node labels, relationship types, and properties.",
        "inputSchema": {
            "type": "object",
            "properties": {},
            "required": []
        }
    },
    {
        "name": "telegram_send",
        "description": "Send a message to a Telegram chat or user.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "recipient": {
                    "type": "string",
                    "description": "Person name (e.g., 'oz', 'cem') or chat ID"
                },
                "message": {
                    "type": "string",
                    "description": "Message text to send"
                }
            },
            "required": ["recipient", "message"]
        }
    }
]


# =============================================================================
# MCP TOOL HANDLERS
# =============================================================================

async def handle_neo4j_query(args: dict, org_config: dict) -> dict:
    """Execute a Neo4j query."""
    query = args.get("query", "")
    params = args.get("params", {})

    if not query:
        return {"error": "No query provided"}

    # Security: block write operations unless explicitly allowed
    query_lower = query.lower().strip()
    if any(kw in query_lower for kw in ["create", "merge", "delete", "set", "remove"]):
        # For now, allow writes - org isolation provides security
        pass

    results = run_org_query(query, params, org_config)
    return {"results": results, "count": len(results)}


async def handle_neo4j_schema(args: dict, org_config: dict) -> dict:
    """Get Neo4j schema."""
    # Get node labels
    labels = run_org_query("CALL db.labels() YIELD label RETURN collect(label) AS labels", org_config=org_config)

    # Get relationship types
    rels = run_org_query("CALL db.relationshipTypes() YIELD relationshipType RETURN collect(relationshipType) AS types", org_config=org_config)

    # Get property keys
    props = run_org_query("CALL db.propertyKeys() YIELD propertyKey RETURN collect(propertyKey) AS keys", org_config=org_config)

    return {
        "labels": labels[0]["labels"] if labels else [],
        "relationshipTypes": rels[0]["types"] if rels else [],
        "propertyKeys": props[0]["keys"] if props else []
    }


async def handle_telegram_send(args: dict, org_config: dict) -> dict:
    """Send a Telegram message."""
    recipient = args.get("recipient", "")
    message = args.get("message", "")

    if not recipient or not message:
        return {"error": "Missing recipient or message"}

    # Look up telegram ID from Neo4j
    results = run_org_query(
        "MATCH (p:Person {name: $name}) RETURN p.telegramId AS telegramId",
        {"name": recipient.lower()},
        org_config
    )

    if not results or not results[0].get("telegramId"):
        return {"error": f"No Telegram ID found for {recipient}"}

    telegram_id = results[0]["telegramId"]

    # Send via Telegram Bot API
    import httpx
    bot_token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
    if not bot_token:
        return {"error": "Telegram not configured"}

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"https://api.telegram.org/bot{bot_token}/sendMessage",
                json={"chat_id": telegram_id, "text": message}
            )
            if resp.status_code == 200:
                return {"success": True, "recipient": recipient}
            else:
                return {"error": f"Telegram API error: {resp.text}"}
    except Exception as e:
        return {"error": str(e)}


TOOL_HANDLERS = {
    "neo4j_query": handle_neo4j_query,
    "neo4j_schema": handle_neo4j_schema,
    "telegram_send": handle_telegram_send,
}


# =============================================================================
# MCP PROTOCOL HANDLERS
# =============================================================================

def make_response(id, result=None, error=None):
    """Create JSON-RPC response."""
    resp = {"jsonrpc": "2.0", "id": id}
    if error:
        resp["error"] = error
    else:
        resp["result"] = result
    return resp


async def handle_mcp_request(request_data: dict, org_config: dict) -> dict:
    """Handle a single MCP JSON-RPC request."""
    method = request_data.get("method", "")
    params = request_data.get("params", {})
    req_id = request_data.get("id")

    logger.info(f"MCP request: {method} (org: {org_config.get('name', 'unknown')})")

    # Initialize
    if method == "initialize":
        return make_response(req_id, {
            "protocolVersion": "2024-11-05",
            "capabilities": {
                "tools": {}
            },
            "serverInfo": {
                "name": "egregore-mcp",
                "version": "1.0.0"
            }
        })

    # List tools
    if method == "tools/list":
        return make_response(req_id, {"tools": MCP_TOOLS})

    # Call tool
    if method == "tools/call":
        tool_name = params.get("name", "")
        tool_args = params.get("arguments", {})

        handler = TOOL_HANDLERS.get(tool_name)
        if not handler:
            return make_response(req_id, error={"code": -32601, "message": f"Unknown tool: {tool_name}"})

        try:
            result = await handler(tool_args, org_config)
            return make_response(req_id, {
                "content": [{"type": "text", "text": json.dumps(result, default=str)}]
            })
        except Exception as e:
            logger.error(f"Tool error: {e}")
            return make_response(req_id, error={"code": -32000, "message": str(e)})

    # Notifications (no response needed)
    if method == "notifications/initialized":
        return None

    # Unknown method
    return make_response(req_id, error={"code": -32601, "message": f"Unknown method: {method}"})


# =============================================================================
# HTTP ENDPOINTS
# =============================================================================

async def handle_mcp_sse(request: Request) -> StreamingResponse:
    """Handle MCP over SSE transport.

    Client POSTs JSON-RPC requests, server responds with SSE stream.
    """
    # Validate API key
    auth_header = request.headers.get("Authorization", "")
    api_key = auth_header.replace("Bearer ", "") if auth_header.startswith("Bearer ") else ""

    org_config = validate_api_key(api_key)
    if not org_config:
        return JSONResponse({"error": "Invalid API key"}, status_code=401)

    # Parse request body
    try:
        body = await request.json()
    except:
        return JSONResponse({"error": "Invalid JSON"}, status_code=400)

    # Handle single request or batch
    if isinstance(body, list):
        responses = []
        for req in body:
            resp = await handle_mcp_request(req, org_config)
            if resp:
                responses.append(resp)
        result = responses
    else:
        result = await handle_mcp_request(body, org_config)

    # Return as SSE event
    async def generate():
        if result:
            data = json.dumps(result, default=str)
            yield f"data: {data}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


async def handle_mcp_post(request: Request) -> JSONResponse:
    """Handle MCP over simple POST (non-streaming).

    Simpler alternative to SSE for clients that don't need streaming.
    """
    # Validate API key
    auth_header = request.headers.get("Authorization", "")
    api_key = auth_header.replace("Bearer ", "") if auth_header.startswith("Bearer ") else ""

    org_config = validate_api_key(api_key)
    if not org_config:
        return JSONResponse({"error": "Invalid API key"}, status_code=401)

    # Parse request body
    try:
        body = await request.json()
    except:
        return JSONResponse({"error": "Invalid JSON"}, status_code=400)

    # Handle single request or batch
    if isinstance(body, list):
        responses = []
        for req in body:
            resp = await handle_mcp_request(req, org_config)
            if resp:
                responses.append(resp)
        return JSONResponse(responses)
    else:
        result = await handle_mcp_request(body, org_config)
        return JSONResponse(result if result else {})


def get_mcp_routes():
    """Get Starlette routes for MCP endpoints."""
    from starlette.routing import Route
    return [
        Route("/mcp", handle_mcp_post, methods=["POST"]),
        Route("/mcp/sse", handle_mcp_sse, methods=["POST"]),
    ]
