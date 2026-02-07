import base64
import re

import httpx


async def execute_query(
    org: dict, statement: str, parameters: dict = None
) -> dict:
    """Execute a Cypher query against the org's Neo4j instance, scoped to their org."""
    host = org["neo4j_host"]
    user = org["neo4j_user"]
    password = org["neo4j_password"]
    slug = org["slug"]

    url = f"https://{host}/db/neo4j/query/v2"
    auth = base64.b64encode(f"{user}:{password}".encode()).decode()

    # Inject org scoping into the query
    scoped_statement = inject_org_scope(statement, slug)
    params = parameters or {}
    params["_org"] = slug

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
    """Inject org property into MATCH and CREATE clauses.

    Transforms:
      MATCH (p:Person {name: $name}) → MATCH (p:Person {name: $name, org: $_org})
      CREATE (s:Session {id: $id})   → CREATE (s:Session {id: $id, org: $_org})

    Skips system calls (CALL ...) and nodes that already have org:.
    """
    if statement.strip().upper().startswith("CALL"):
        return statement

    # For MATCH: add org filter to node patterns with properties
    # For CREATE: add org property to new nodes
    def add_org_to_pattern(match):
        full = match.group(0)
        # Skip if already has org:
        if "org:" in full or "org :" in full:
            return full
        # Find the closing } and insert org before it
        return full.rstrip("}") + ", org: $_org}"

    # Match node patterns like (var:Label {props})
    pattern = r'\([a-zA-Z_]\w*:[A-Z]\w*\s*\{[^}]*\}'
    result = re.sub(pattern, add_org_to_pattern, statement)

    # For CREATE with node patterns that have NO properties: (var:Label)
    # Add {org: $_org}
    def add_org_to_bare_create(match):
        keyword = match.group(1)
        var = match.group(2)
        label = match.group(3)
        return f"{keyword}({var}:{label} {{org: $_org}}"

    result = re.sub(
        r'(CREATE\s*)\(([a-zA-Z_]\w*):([A-Z]\w*)\)(?!\s*\{)',
        add_org_to_bare_create,
        result,
    )

    return result
