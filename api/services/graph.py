import base64
import re

import httpx

from .guard import (
    validate_query,
    check_org_tampering,
    rate_limiter,
    audit_log,
    classify_query,
    RateLimitError,
)


async def execute_query(
    org: dict, statement: str, parameters: dict = None
) -> dict:
    """Execute a Cypher query against the org's Neo4j instance, scoped to their org."""
    host = org["neo4j_host"]
    user = org["neo4j_user"]
    password = org["neo4j_password"]
    slug = org["slug"]

    # Guard: validate query before execution
    try:
        validate_query(statement)
        check_org_tampering(statement, parameters)
        rate_limiter.check(slug)
    except RateLimitError as e:
        return {"error": str(e), "rate_limited": True}
    except ValueError as e:
        return {"error": str(e)}

    url = f"https://{host}/db/neo4j/query/v2"
    auth = base64.b64encode(f"{user}:{password}".encode()).decode()

    # Inject org scoping into the query
    scoped_statement = inject_org_scope(statement, slug)
    params = parameters or {}
    params["_org"] = slug

    # Audit log (after injection, before HTTP call)
    audit_log(slug, classify_query(statement), len(statement))

    body = {"statement": scoped_statement, "parameters": params}

    async with httpx.AsyncClient() as client:
        response = await client.post(
            url,
            headers={
                "Authorization": f"Basic {auth}",
                "Content-Type": "application/json",
            },
            json=body,
            timeout=30.0,
        )

    data = response.json()

    if data.get("errors") and data["errors"] != []:
        return {"error": data["errors"]}

    return data.get("data", {})


async def get_schema(org: dict) -> dict:
    """Get the Neo4j schema for an org."""
    result = await execute_query(
        org, "CALL db.schema.visualization()", {}
    )
    return result


async def test_connection(org: dict) -> dict:
    """Test Neo4j connectivity."""
    try:
        result = await execute_query(org, "RETURN 1 AS ok", {})
        if result and not result.get("error"):
            return {"status": "ok"}
        return {"status": "error", "detail": str(result.get("error", "unknown"))}
    except Exception as e:
        return {"status": "error", "detail": str(e)}


def inject_org_scope(statement: str, org_slug: str) -> str:
    """Inject org property into ALL labeled node patterns.

    Transforms:
      (p:Person {name: $name}) → (p:Person {name: $name, org: $_org})
      (s:Session)              → (s:Session {org: $_org})
      CREATE (s:Session)       → CREATE (s:Session {org: $_org})

    Skips: system calls (CALL ...), nodes that already have org:,
    and system-level labels (Org) that are global.
    """
    if statement.strip().upper().startswith("CALL"):
        return statement

    # System labels that should NOT be org-scoped
    SYSTEM_LABELS = {"Org"}

    # 1. Add org to patterns WITH properties: (var:Label {props})
    def add_org_to_props(match):
        full = match.group(0)
        if "org:" in full or "org :" in full:
            return full
        # Extract label and skip system labels
        label_match = re.search(r':([A-Z]\w*)', full)
        if label_match and label_match.group(1) in SYSTEM_LABELS:
            return full
        return full.rstrip("}") + ", org: $_org}"

    pattern_with_props = r'\([a-zA-Z_]\w*:[A-Z]\w*\s*\{[^}]*\}'
    result = re.sub(pattern_with_props, add_org_to_props, statement)

    # 2. Add {org: $_org} to bare patterns: (var:Label) → (var:Label {org: $_org})
    def add_org_to_bare(match):
        var = match.group(1)
        label = match.group(2)
        if label in SYSTEM_LABELS:
            return match.group(0)
        return f"({var}:{label} {{org: $_org}})"

    result = re.sub(
        r'\(([a-zA-Z_]\w*):([A-Z]\w*)\)(?!\s*\{)',
        add_org_to_bare,
        result,
    )

    return result
