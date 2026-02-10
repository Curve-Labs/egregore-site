"""
Egregore Bot

A Telegram bot that answers natural language queries about Egregore
by querying the Neo4j knowledge graph directly.

Uses LLM (Haiku) to:
1. Parse questions and pick the right query
2. Format results as natural language

Deploy to Railway with webhook mode for production.
"""

import os
import json
import logging
import time
from datetime import date
from typing import Optional

from analytics import log_query_event, log_event
import secrets
import hashlib
import uuid

from dotenv import load_dotenv
load_dotenv(override=False)

import httpx
from neo4j import GraphDatabase

from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, ChatMemberHandler, filters, ContextTypes
from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import JSONResponse, PlainTextResponse
from starlette.routing import Route
import uvicorn

# MCP server - import safely
try:
    from mcp_server import get_mcp_routes
    MCP_ENABLED = True
except Exception as e:
    import logging
    logging.error(f"MCP server import failed: {e}")
    MCP_ENABLED = False
    def get_mcp_routes():
        return []

# =============================================================================
# CONFIG
# =============================================================================

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Telegram
BOT_TOKEN = os.environ["TELEGRAM_BOT_TOKEN"]
WEBHOOK_URL = os.environ.get("WEBHOOK_URL", "")
PORT = int(os.environ.get("PORT", 8443))

# Neo4j Aura (default/legacy - used if no org match)
NEO4J_URI = os.environ.get("NEO4J_URI", "")
NEO4J_USER = os.environ.get("NEO4J_USER", "")
NEO4J_PASSWORD = os.environ.get("NEO4J_PASSWORD", "")

# GitHub token for adding collaborators
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")

# Anthropic (for Haiku)
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")

# Spirit adapter admin secret (required for /spirit/init)
SPIRIT_ADMIN_SECRET = os.environ.get("SPIRIT_ADMIN_SECRET", "")

# Egregore API (for dynamic org registration)
EGREGORE_API_URL = os.environ.get("EGREGORE_API_URL", "")

# Security: Allowed chats/users — loaded dynamically from Neo4j + ORG_CONFIG at startup.
# Env override still works for manual additions.
ALLOWED_CHAT_IDS = [
    int(x) for x in os.environ.get("ALLOWED_CHAT_IDS", "").split(",") if x.strip()
]

# =============================================================================
# MULTI-ORG CONFIG
# =============================================================================

EGREGORE_CHANNEL_ID = int(os.environ.get("EGREGORE_CHANNEL_ID", "0") or "0")

ORG_CONFIG = {
    -1003527692267: {
        "name": "curvelabs",
        "neo4j_uri": os.environ.get("NEO4J_URI", ""),
        "neo4j_user": os.environ.get("NEO4J_USER", "neo4j"),
        "neo4j_password": os.environ.get("NEO4J_PASSWORD", ""),
        "mcp_api_key": os.environ.get("CURVELABS_MCP_KEY", "ek_curvelabs_default"),
    },
}

# Egregore org (new standalone org)
if EGREGORE_CHANNEL_ID:
    ORG_CONFIG[EGREGORE_CHANNEL_ID] = {
        "name": "egregore",
        "neo4j_uri": os.environ.get("EGREGORE_NEO4J_URI", ""),
        "neo4j_user": os.environ.get("EGREGORE_NEO4J_USER", "neo4j"),
        "neo4j_password": os.environ.get("EGREGORE_NEO4J_PASSWORD", ""),
        "mcp_api_key": os.environ.get("EGREGORE_MCP_KEY", "ek_egregore_default"),
    }


def load_dynamic_orgs():
    """Load org configs + allowed users from Neo4j on startup.

    Populates ORG_CONFIG with orgs that have telegram_chat_id set.
    Populates ALLOWED_CHAT_IDS with user telegram IDs from Person nodes.
    """
    shared_uri = os.environ.get("EGREGORE_NEO4J_URI", "")
    shared_user = os.environ.get("EGREGORE_NEO4J_USER", "neo4j")
    shared_password = os.environ.get("EGREGORE_NEO4J_PASSWORD", "")

    if not shared_uri or not shared_password:
        # Fall back to default Neo4j if shared not configured
        if NEO4J_URI and NEO4J_PASSWORD:
            shared_uri = NEO4J_URI
            shared_user = NEO4J_USER
            shared_password = NEO4J_PASSWORD
        else:
            logger.info("No Neo4j configured — skipping dynamic loading")
            return

    try:
        driver = GraphDatabase.driver(shared_uri, auth=(shared_user, shared_password))
        with driver.session() as session:
            # Load orgs with telegram groups
            result = session.run(
                "MATCH (o:Org) WHERE o.telegram_chat_id IS NOT NULL "
                "RETURN o.id AS id, o.name AS name, o.telegram_chat_id AS chat_id, o.api_key AS api_key"
            )
            org_count = 0
            for record in result:
                chat_id = int(record["chat_id"])
                if chat_id in ORG_CONFIG:
                    continue  # Don't overwrite static config
                ORG_CONFIG[chat_id] = {
                    "name": record["id"] or record["name"],
                    "neo4j_uri": shared_uri,
                    "neo4j_user": shared_user,
                    "neo4j_password": shared_password,
                    "mcp_api_key": record.get("api_key", ""),
                }
                if chat_id not in ALLOWED_CHAT_IDS:
                    ALLOWED_CHAT_IDS.append(chat_id)
                org_count += 1

            # Load allowed user IDs from Person nodes
            people = session.run(
                "MATCH (p:Person) WHERE p.telegramId IS NOT NULL RETURN p.telegramId AS tid"
            )
            user_count = 0
            for record in people:
                tid = int(record["tid"])
                if tid not in ALLOWED_CHAT_IDS:
                    ALLOWED_CHAT_IDS.append(tid)
                    user_count += 1

            # Also add all org chat_ids from static ORG_CONFIG
            for cid in ORG_CONFIG:
                if cid not in ALLOWED_CHAT_IDS:
                    ALLOWED_CHAT_IDS.append(cid)

            logger.info(f"Loaded {org_count} org(s), {user_count} user(s) from Neo4j")
        driver.close()
    except Exception as e:
        logger.error(f"Failed to load dynamic orgs: {e}")


async def register_group(slug: str, chat_id: int) -> dict | None:
    """Register a Telegram group with the API. Falls back to direct Neo4j write."""
    # Try API first
    if EGREGORE_API_URL:
        headers = {"Content-Type": "application/json"}
        if BOT_TOKEN:
            headers["Authorization"] = f"Bearer {BOT_TOKEN}"

        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    f"{EGREGORE_API_URL}/api/org/telegram",
                    json={"org_slug": slug, "chat_id": str(chat_id)},
                    headers=headers,
                    timeout=10.0,
                )
            if resp.status_code == 200:
                data = resp.json()
                logger.info(f"Registered group {chat_id} for org {slug} via API")
                return data
            else:
                logger.warning(f"API registration failed: {resp.status_code} {resp.text}")
        except Exception as e:
            logger.warning(f"API registration failed: {e}")

    # Fallback: write directly to Neo4j
    neo4j_uri = os.environ.get("EGREGORE_NEO4J_URI", NEO4J_URI)
    neo4j_user = os.environ.get("EGREGORE_NEO4J_USER", NEO4J_USER)
    neo4j_password = os.environ.get("EGREGORE_NEO4J_PASSWORD", NEO4J_PASSWORD)

    if not neo4j_uri or not neo4j_password:
        logger.error("No Neo4j connection — cannot register group")
        return None

    try:
        driver = GraphDatabase.driver(neo4j_uri, auth=(neo4j_user, neo4j_password))
        with driver.session() as session:
            result = session.run(
                "MATCH (o:Org {id: $slug}) "
                "SET o.telegram_chat_id = $chat_id "
                "RETURN o.name AS name",
                slug=slug, chat_id=str(chat_id),
            )
            record = result.single()
            driver.close()
            if record:
                org_name = record["name"] or slug
                logger.info(f"Registered group {chat_id} for org {slug} via Neo4j fallback")
                return {"status": "connected", "org_slug": slug, "org_name": org_name}
            else:
                logger.error(f"Org {slug} not found in Neo4j")
                return None
    except Exception as e:
        logger.error(f"Neo4j fallback registration failed: {e}")
        return None


# Load dynamic orgs at import time (after static config)
load_dynamic_orgs()


def get_org_for_chat(chat_id: int, user_id: int = None) -> dict:
    """Get org config for a chat."""
    if chat_id in ORG_CONFIG:
        return ORG_CONFIG[chat_id]
    return {
        "name": "default",
        "neo4j_uri": NEO4J_URI,
        "neo4j_user": NEO4J_USER,
        "neo4j_password": NEO4J_PASSWORD,
    }

# Log startup config
logger.info("=== Egregore Bot Starting ===")
logger.info(f"NEO4J_URI: {'SET' if NEO4J_URI else 'NOT SET'}")
logger.info(f"ANTHROPIC_API_KEY: {'SET' if ANTHROPIC_API_KEY else 'NOT SET'}")
logger.info(f"ALLOWED_CHAT_IDS: {ALLOWED_CHAT_IDS}")

# =============================================================================
# NEO4J CONNECTION
# =============================================================================

neo4j_driver = None
org_drivers = {}  # Cache of org-specific drivers

def get_neo4j_driver():
    """Get or create default Neo4j driver."""
    global neo4j_driver
    if neo4j_driver is None and NEO4J_URI:
        neo4j_driver = GraphDatabase.driver(
            NEO4J_URI,
            auth=(NEO4J_USER, NEO4J_PASSWORD)
        )
        logger.info("Neo4j driver initialized (default)")
    return neo4j_driver


def get_org_driver(org_config: dict):
    """Get or create org-specific Neo4j driver."""
    if not org_config:
        return get_neo4j_driver()

    org_name = org_config.get("name", "default")
    uri = org_config.get("neo4j_uri")
    user = org_config.get("neo4j_user", "neo4j")
    password = org_config.get("neo4j_password")

    if not uri or not password:
        logger.warning(f"Neo4j not configured for org {org_name}")
        return None

    if org_name not in org_drivers:
        org_drivers[org_name] = GraphDatabase.driver(uri, auth=(user, password))
        logger.info(f"Neo4j driver initialized for org: {org_name}")

    return org_drivers[org_name]


def run_query(query: str, params: dict = None) -> list:
    """Run a Cypher query on default Neo4j."""
    driver = get_neo4j_driver()
    if not driver:
        logger.warning("Neo4j not configured")
        return []

    try:
        with driver.session() as session:
            result = session.run(query, params or {})
            return [dict(record) for record in result]
    except Exception as e:
        logger.error(f"Neo4j query failed: {e}")
        return []


def run_org_query(query: str, params: dict = None, org_config: dict = None) -> list:
    """Run a Cypher query on org-specific Neo4j."""
    driver = get_org_driver(org_config)
    if not driver:
        logger.warning("Neo4j not configured for org")
        return []

    try:
        with driver.session() as session:
            result = session.run(query, params or {})
            return [dict(record) for record in result]
    except Exception as e:
        logger.error(f"Neo4j org query failed: {e}")
        return []


def lookup_person_by_telegram_id(telegram_id: int) -> Optional[str]:
    """Look up Person name by Telegram ID."""
    results = run_query(
        "MATCH (p:Person {telegramId: $tid}) RETURN p.name AS name",
        {"tid": telegram_id}
    )
    if results and results[0].get("name"):
        return results[0]["name"]
    return None


def auto_register_telegram_id(telegram_id: int, first_name: str = None, username: str = None) -> Optional[str]:
    """Auto-register a Telegram ID to a Person node if we can match them.

    Matches by first name against Person nodes in Neo4j.
    Returns the person's name if registered, None otherwise.
    """
    # First check if already registered
    existing = lookup_person_by_telegram_id(telegram_id)
    if existing:
        # Update username on existing TelegramUser if we have it now
        if username:
            run_query(
                "MATCH (tu:TelegramUser {telegramId: $tid}) SET tu.username = $username",
                {"tid": telegram_id, "username": username},
            )
        return existing

    # Try matching by first name (lowercase)
    if first_name:
        name_lower = first_name.lower().strip()
        results = run_query(
            """MATCH (p:Person)
               WHERE (p.name = $name OR toLower(p.fullName) STARTS WITH $name)
               AND p.telegramId IS NULL
               SET p.telegramId = $tid
               RETURN p.name AS name""",
            {"name": name_lower, "tid": telegram_id}
        )
        if results:
            person_name = results[0].get("name")
            logger.info(f"Auto-registered {person_name} with Telegram ID {telegram_id} (matched by first name)")
            # Also create/link TelegramUser node
            run_query(
                """
                MERGE (tu:TelegramUser {telegramId: $tid})
                SET tu.firstName = $firstName, tu.username = $username
                WITH tu
                MATCH (p:Person {telegramId: $tid})
                MERGE (tu)-[:IDENTIFIES]->(p)
                """,
                {"tid": telegram_id, "firstName": first_name, "username": username or ""},
            )
            return person_name

    return None


def track_telegram_membership(telegram_id: int, username: str, first_name: str, org_slug: str, action: str = "join"):
    """Track Telegram group membership via TelegramUser nodes.

    Creates/updates TelegramUser node and IN_GROUP relationship.
    Uses the shared Neo4j driver directly since TelegramUser is global (unscoped).

    action: "join" or "leave"
    """
    driver = get_neo4j_driver()
    if not driver:
        logger.warning("Neo4j not configured — cannot track membership")
        return

    try:
        with driver.session() as session:
            if action == "join":
                # Create/update TelegramUser and IN_GROUP relationship
                session.run(
                    """
                    MERGE (tu:TelegramUser {telegramId: $tid})
                    SET tu.username = $username, tu.firstName = $firstName
                    WITH tu
                    MATCH (o:Org {id: $org})
                    MERGE (tu)-[r:IN_GROUP]->(o)
                    SET r.joinedAt = datetime(), r.status = 'active'
                    """,
                    {"tid": telegram_id, "username": username or "", "firstName": first_name or "", "org": org_slug},
                )
                # Link to existing Person nodes that have this telegramId
                session.run(
                    """
                    MATCH (tu:TelegramUser {telegramId: $tid})
                    MATCH (p:Person {telegramId: $tid})
                    MERGE (tu)-[:IDENTIFIES]->(p)
                    """,
                    {"tid": telegram_id},
                )
                logger.info(f"Tracked join: TelegramUser {telegram_id} ({first_name}) → org {org_slug}")
            elif action == "leave":
                session.run(
                    """
                    MATCH (tu:TelegramUser {telegramId: $tid})-[r:IN_GROUP]->(o:Org {id: $org})
                    SET r.status = 'left', r.leftAt = datetime()
                    """,
                    {"tid": telegram_id, "org": org_slug},
                )
                logger.info(f"Tracked leave: TelegramUser {telegram_id} from org {org_slug}")
    except Exception as e:
        logger.error(f"Failed to track membership: {e}")


# =============================================================================
# PREDEFINED QUERIES
# =============================================================================

QUERIES = {
    "recent_activity": {
        "description": "Recent sessions/activity from the team (last 7 days)",
        "params": [],
        "cypher": """
            MATCH (s:Session)-[:BY]->(p:Person)
            WHERE s.date >= date() - duration('P7D')
            RETURN s.date AS date, s.topic AS topic, p.name AS person, s.summary AS summary
            ORDER BY s.date DESC LIMIT 10
        """
    },
    "person_projects": {
        "description": "What projects a specific person works on",
        "params": ["name"],
        "cypher": """
            MATCH (p:Person {name: $name})-[w:WORKS_ON]->(proj:Project)
            RETURN proj.name AS project, proj.domain AS domain, w.role AS role
        """
    },
    "person_sessions": {
        "description": "Recent sessions by a specific person",
        "params": ["name"],
        "cypher": """
            MATCH (s:Session)-[:BY]->(p:Person {name: $name})
            RETURN s.date AS date, s.topic AS topic, s.summary AS summary
            ORDER BY s.date DESC LIMIT 5
        """
    },
    "quest_details": {
        "description": "Details about a specific quest",
        "params": ["quest_id"],
        "cypher": """
            MATCH (q:Quest {id: $quest_id})
            OPTIONAL MATCH (a:Artifact)-[:PART_OF]->(q)
            OPTIONAL MATCH (q)-[:STARTED_BY]->(p:Person)
            OPTIONAL MATCH (q)-[:RELATES_TO]->(proj:Project)
            RETURN q.title AS title, q.status AS status, q.question AS question,
                   p.name AS started_by,
                   collect(DISTINCT a.title) AS artifacts,
                   collect(DISTINCT proj.name) AS projects
        """
    },
    "active_quests": {
        "description": "All currently active quests",
        "params": [],
        "cypher": """
            MATCH (q:Quest {status: 'active'})
            OPTIONAL MATCH (q)-[:RELATES_TO]->(proj:Project)
            OPTIONAL MATCH (q)-[:STARTED_BY]->(p:Person)
            RETURN q.id AS id, q.title AS title,
                   collect(DISTINCT proj.name) AS projects,
                   p.name AS started_by
        """
    },
    "search_artifacts": {
        "description": "Search artifacts by keyword in title",
        "params": ["term"],
        "cypher": """
            MATCH (a:Artifact)
            WHERE toLower(a.title) CONTAINS toLower($term)
            OPTIONAL MATCH (a)-[:PART_OF]->(q:Quest)
            OPTIONAL MATCH (a)-[:CONTRIBUTED_BY]->(p:Person)
            RETURN a.title AS title, a.type AS type, a.created AS created,
                   p.name AS author, collect(DISTINCT q.id) AS quests
            LIMIT 10
        """
    },
    "all_people": {
        "description": "List all team members and their projects",
        "params": [],
        "cypher": """
            MATCH (p:Person)
            OPTIONAL MATCH (p)-[:WORKS_ON]->(proj:Project)
            RETURN p.name AS name, p.fullName AS fullName,
                   collect(DISTINCT proj.name) AS projects
        """
    },
    "project_details": {
        "description": "Details about a specific project",
        "params": ["name"],
        "cypher": """
            MATCH (proj:Project {name: $name})
            OPTIONAL MATCH (q:Quest {status: 'active'})-[:RELATES_TO]->(proj)
            OPTIONAL MATCH (p:Person)-[:WORKS_ON]->(proj)
            RETURN proj.name AS name, proj.domain AS domain,
                   proj.description AS description,
                   collect(DISTINCT q.id) AS quests,
                   collect(DISTINCT p.name) AS team
        """
    },
    "all_projects": {
        "description": "List all projects",
        "params": [],
        "cypher": """
            MATCH (proj:Project)
            OPTIONAL MATCH (p:Person)-[:WORKS_ON]->(proj)
            RETURN proj.name AS name, proj.domain AS domain,
                   collect(DISTINCT p.name) AS team
        """
    },
    "person_quests": {
        "description": "Quests started by a specific person",
        "params": ["name"],
        "cypher": """
            MATCH (q:Quest)-[:STARTED_BY]->(p:Person {name: $name})
            OPTIONAL MATCH (q)-[:RELATES_TO]->(proj:Project)
            WITH q, collect(DISTINCT proj.name) AS projects
            ORDER BY q.created DESC
            RETURN q.id AS id, q.title AS title, q.status AS status,
                   q.question AS question, projects
        """
    },
    "person_artifacts": {
        "description": "Artifacts contributed by a specific person",
        "params": ["name"],
        "cypher": """
            MATCH (a:Artifact)-[:CONTRIBUTED_BY]->(p:Person {name: $name})
            OPTIONAL MATCH (a)-[:PART_OF]->(q:Quest)
            WITH a, collect(DISTINCT q.id) AS quests
            ORDER BY a.created DESC
            RETURN a.title AS title, a.type AS type, a.created AS created, quests
            LIMIT 10
        """
    },
    "recent_artifacts": {
        "description": "Recently added artifacts",
        "params": [],
        "cypher": """
            MATCH (a:Artifact)
            OPTIONAL MATCH (a)-[:CONTRIBUTED_BY]->(p:Person)
            OPTIONAL MATCH (a)-[:PART_OF]->(q:Quest)
            WITH a, p, collect(DISTINCT q.id) AS quests
            ORDER BY a.created DESC LIMIT 10
            RETURN a.title AS title, a.type AS type, a.created AS created,
                   p.name AS author, quests
        """
    },
    "recent_quests": {
        "description": "Recently created quests",
        "params": [],
        "cypher": """
            MATCH (q:Quest)
            OPTIONAL MATCH (q)-[:STARTED_BY]->(p:Person)
            OPTIONAL MATCH (q)-[:RELATES_TO]->(proj:Project)
            WITH q, p, collect(DISTINCT proj.name) AS projects
            ORDER BY q.created DESC LIMIT 10
            RETURN q.id AS id, q.title AS title, q.status AS status,
                   p.name AS started_by, projects
        """
    },
    "activity_on_date": {
        "description": "All activity (sessions, artifacts) on a specific date. Use for 'what happened today/yesterday'",
        "params": ["date"],
        "cypher": """
            MATCH (s:Session)-[:BY]->(p:Person)
            WHERE s.date = date($date)
            RETURN 'session' AS type, s.topic AS title, p.name AS person, s.summary AS summary, s.date AS date
            UNION
            MATCH (a:Artifact)-[:AUTHORED_BY]->(p:Person)
            WHERE a.date = date($date)
            RETURN 'artifact' AS type, a.title AS title, p.name AS person, a.summary AS summary, a.date AS date
        """
    },
    "person_sessions_on_date": {
        "description": "Sessions by a specific person on a specific date. Use for 'what did X do today'",
        "params": ["name", "date"],
        "cypher": """
            MATCH (s:Session)-[:BY]->(p:Person {name: $name})
            WHERE s.date = date($date)
            RETURN s.date AS date, s.topic AS topic, s.summary AS summary
            ORDER BY s.date DESC
        """
    },
    "handoffs_to_person": {
        "description": "Handoffs addressed to a specific person. Use for 'what was handed off to X'",
        "params": ["recipient"],
        "cypher": """
            MATCH (a:Artifact {type: 'handoff'})-[:FOR]->(recipient:Person {name: $recipient})
            OPTIONAL MATCH (a)-[:AUTHORED_BY]->(author:Person)
            RETURN a.title AS title, a.summary AS summary, a.date AS date,
                   author.name AS from_person
            ORDER BY a.date DESC
        """
    },
    "handoffs_from_person": {
        "description": "Handoffs written by a specific person. Use for 'what did X hand off'",
        "params": ["author"],
        "cypher": """
            MATCH (a:Artifact {type: 'handoff'})-[:AUTHORED_BY]->(author:Person {name: $author})
            OPTIONAL MATCH (a)-[:FOR]->(recipient:Person)
            RETURN a.title AS title, a.summary AS summary, a.date AS date,
                   recipient.name AS to_person
            ORDER BY a.date DESC
        """
    }
}


# =============================================================================
# LLM AGENT WITH TOOL USE
# =============================================================================

def build_tools_schema() -> list:
    """Build Anthropic tools schema from QUERIES."""
    tools = []
    for name, q in QUERIES.items():
        tool = {
            "name": f"query_{name}",
            "description": q["description"],
            "input_schema": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
        for param in q.get("params", []):
            tool["input_schema"]["properties"][param] = {
                "type": "string",
                "description": f"The {param} (use lowercase for person names: oz, ali, cem)"
            }
            tool["input_schema"]["required"].append(param)
        tools.append(tool)
    
    # Direct response tool
    tools.append({
        "name": "respond_directly",
        "description": "Respond directly without querying. Use for greetings, explaining how Egregore works, or when no data query is needed.",
        "input_schema": {
            "type": "object",
            "properties": {
                "message": {"type": "string", "description": "The response message"}
            },
            "required": ["message"]
        }
    })
    
    return tools


async def agent_decide(question: str, conversation_context: str = "", sender_name: str = None) -> dict:
    """LLM agent with tool use decides what to do.

    Returns dict with:
        action: "respond" or "query"
        message: (if respond) the response text
        query: (if query) the query name
        params: (if query) the query parameters
        usage: {"input_tokens": int, "output_tokens": int}
        latency_ms: float
    """
    if not ANTHROPIC_API_KEY:
        return {"action": "respond", "message": "API not configured.", "usage": {}, "latency_ms": 0}

    tools = build_tools_schema()

    context_info = ""
    if conversation_context:
        context_info = f"\n\nPrevious context:\n{conversation_context}\n\nUse this to understand follow-ups like 'which ones', 'tell me more', etc."

    # Identity context for "my" / "I" questions
    sender_info = ""
    if sender_name:
        sender_info = f"""
SENDER IDENTITY: The person asking this question is "{sender_name}".
When they say "my", "I", "me", or ask about themselves, use name="{sender_name}" in queries.
Examples for {sender_name}:
- "What am I working on?" -> query_person_sessions(name="{sender_name}")
- "My activity" -> query_person_sessions(name="{sender_name}")
- "What have I done?" -> query_person_sessions(name="{sender_name}")
- "My quests" -> query_person_quests(name="{sender_name}")
- "What did I write?" -> query_person_artifacts(name="{sender_name}")
"""

    today_str = date.today().isoformat()

    system_prompt = f"""You are Egregore, the shared memory for Curve Labs - an INTERNAL tool for team members.

TODAY'S DATE: {today_str}
When user says "today", use date parameter = "{today_str}"
When user says "yesterday", use date parameter for the day before.

IMPORTANT: Everyone works on the same projects (lace, tristero, infrastructure).
Don't answer "working on" questions with just project names - that's not useful.
Instead, show ACTIVITY: sessions, quests, artifacts.
{sender_info}
QUERY PRIORITY for "what is X working on?" or "what's X doing?":
1. query_person_sessions - shows their recent actual work/activity
2. query_person_quests - shows initiatives they're driving
3. query_person_artifacts - shows what they've created

DO NOT use query_person_projects for "working on" questions - it just shows repo assignments.

DATE-SPECIFIC QUERIES:
- "What happened today?" -> query_activity_on_date(date="{today_str}")
- "What did X do today?" -> query_person_sessions_on_date(name="x", date="{today_str}")
- "What did X handoff to Y?" -> query_handoffs_to_person(recipient="y") then filter by sender

TEAM (lowercase for queries): oz, ali, cem, pali, damla
{context_info}

Examples:
- "What is Cem working on?" -> query_person_sessions(name="cem")
- "What's Oz been up to?" -> query_person_sessions(name="oz")
- "What quests did Cem start?" -> query_person_quests(name="cem")
- "What has Ali written?" -> query_person_artifacts(name="ali")
- "What's happening?" -> query_recent_activity
- "What's happening today?" -> query_activity_on_date(date="{today_str}")
- Single word "cem" -> query_person_sessions(name="cem")
- "Tell me about lace" -> query_project_details(name="lace")
- "What is Egregore?" -> respond_directly (brief explanation)"""

    async with httpx.AsyncClient() as client:
        try:
            start_time = time.perf_counter()
            resp = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "claude-haiku-4-5-20251001",
                    "max_tokens": 400,
                    "system": system_prompt,
                    "tools": tools,
                    "messages": [{"role": "user", "content": question}]
                },
                timeout=15
            )
            latency_ms = (time.perf_counter() - start_time) * 1000
            resp.raise_for_status()
            data = resp.json()

            # Extract token usage
            usage = data.get("usage", {})
            usage_info = {
                "input_tokens": usage.get("input_tokens", 0),
                "output_tokens": usage.get("output_tokens", 0)
            }

            # Check for tool use
            for block in data.get("content", []):
                if block.get("type") == "tool_use":
                    tool_name = block.get("name", "")
                    tool_input = block.get("input", {})
                    logger.info(f"Agent chose: {tool_name} with {tool_input}")

                    if tool_name == "respond_directly":
                        return {"action": "respond", "message": tool_input.get("message", ""), "usage": usage_info, "latency_ms": latency_ms}

                    if tool_name.startswith("query_"):
                        query_name = tool_name[6:]
                        return {"action": "query", "query": query_name, "params": tool_input, "usage": usage_info, "latency_ms": latency_ms}

            # Fallback to text response
            for block in data.get("content", []):
                if block.get("type") == "text":
                    return {"action": "respond", "message": block.get("text", ""), "usage": usage_info, "latency_ms": latency_ms}

            return {"action": "respond", "message": "I'm not sure how to help with that.", "usage": usage_info, "latency_ms": latency_ms}

        except Exception as e:
            logger.error(f"Agent failed: {e}")
            return {"action": "respond", "message": "Something went wrong. Try asking differently?", "usage": {}, "latency_ms": 0}


async def format_response(question: str, query_name: str, results: list, params: dict = None) -> tuple:
    """Use LLM to format query results as conversational text.

    Returns tuple of (response_text, usage_dict, latency_ms)
    """
    if not ANTHROPIC_API_KEY:
        return f"Found {len(results)} results.", {}, 0

    if not results:
        return "No results found.", {}, 0

    system_prompt = """You are Egregore, shared memory for Curve Labs. Internal tool - everyone knows each other.

FORMAT RULES:

FOR EXPLICIT LIST QUERIES ("what quests are active", "who's on the team", "list projects"):
- Use clean list format: one item per line
- Include key info per item

FOR EVERYTHING ELSE (activity, "what's X doing", updates):
- Write naturally like you're catching someone up over coffee
- "Cem's been deep in the evaluation stuff - surveyed 80+ datasets and landed on LLMs4OL Task B. Also wrapped up the Egregore Spec and handed it to Oz."
- NOT log format: "Cem - 4 sessions: Item 1, Item 2..."
- Weave the information into sentences, mention what's interesting
- 2-3 short paragraphs max

TONE:
- Conversational, not structured
- Skip intros - everyone knows each other
- Include specifics (dates, names) but naturally
- End with casual follow-up

BAD (log-like): "Cem - 4 sessions this week: Egregore Spec V2 (Jan 28), Evaluation benchmarks (Jan 26)..."
GOOD (natural): "Cem's been heads-down on evaluation benchmarks - surveyed 80+ datasets and locked in LLMs4OL Task B. The big handoff was the Egregore Spec V2 going to Oz, ready for the blog launch."

NO markdown, NO emojis."""

    async with httpx.AsyncClient() as client:
        try:
            start_time = time.perf_counter()
            resp = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "claude-haiku-4-5-20251001",
                    "max_tokens": 600,
                    "system": system_prompt,
                    "messages": [{
                        "role": "user",
                        "content": f"Question: {question}\nQuery type: {query_name}\nData: {json.dumps(results, default=str)}"
                    }]
                },
                timeout=15
            )
            latency_ms = (time.perf_counter() - start_time) * 1000
            resp.raise_for_status()
            data = resp.json()

            usage = data.get("usage", {})
            usage_info = {
                "input_tokens": usage.get("input_tokens", 0),
                "output_tokens": usage.get("output_tokens", 0)
            }

            return data["content"][0]["text"], usage_info, latency_ms
        except Exception as e:
            logger.error(f"LLM response formatter failed: {e}")
            return f"Found {len(results)} results for {query_name}.", {}, 0


async def generate_no_results_response(question: str, query_name: str, params: dict) -> str:
    """Generate a helpful response when no results are found."""
    if not ANTHROPIC_API_KEY:
        return "Nothing in the graph for that yet. Try a different angle?"

    search_context = f"Query: {query_name}, Params: {params}"
    
    system_prompt = """You are Egregore, shared memory for Curve Labs. Talking to INTERNAL team members.
A search returned no results. Keep it brief and casual:

1. Quick acknowledgment (not apologetic)
2. Suggest what they could try instead
3. One line max

TONE: Like a colleague saying "nothing on that yet, try X"
NO markdown, NO emojis, NO formal language."""

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "claude-haiku-4-5-20251001",
                    "max_tokens": 300,
                    "system": system_prompt,
                    "messages": [{
                        "role": "user",
                        "content": f"User asked: {question}\n{search_context}\n\nNo results were found. Provide a helpful response."
                    }]
                },
                timeout=15
            )
            resp.raise_for_status()
            return resp.json()["content"][0]["text"]
        except Exception as e:
            logger.error(f"No results response failed: {e}")
            return "No results found for that search. Try asking about team members (oz, ali, cem), projects (lace, tristero), or recent activity."


# =============================================================================
# EGREGORE CONTEXT (for general questions)
# =============================================================================

EGREGORE_CONTEXT = """Egregore = our shared memory + async coordination system.

The concept: collective intelligence that emerges from shared focus (thoughtform/group mind).
The system: Neo4j graph connecting people, projects, quests, artifacts. This bot queries it.

Quick reference:
- Quests: ongoing explorations (NLNet grant, evaluation benchmark, etc.)
- Artifacts: content we create (blog posts, decisions, findings)
- Sessions: daily work logs

To add stuff: /add in Claude Code, then /save"""


# Team info - kept brief for internal use
TEAM_INFO = {
    "oz": "lace, tristero, infrastructure - architecture side",
    "ali": "infrastructure, deployment, this bot",
    "cem": "research - emergent ontologies, evaluation frameworks",
    "pali": "operations, coordination",
    "damla": "design, product, user experience"
}


async def answer_general(question: str) -> str:
    """Answer general questions about Egregore (not data queries)."""
    if not ANTHROPIC_API_KEY:
        return "I can answer questions about Egregore activity. Try: What's happening?"

    system_prompt = f"""You are Egregore, a living organization where humans and AI collaborate.

{EGREGORE_CONTEXT}

Answer the user's question concisely. If it's about how Egregore works, explain briefly.
If it seems like a data question but you couldn't match it, suggest rephrasing.
Don't use emojis."""

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "claude-haiku-4-5-20251001",
                    "max_tokens": 300,
                    "system": system_prompt,
                    "messages": [{"role": "user", "content": question}]
                },
                timeout=15
            )
            resp.raise_for_status()
            return resp.json()["content"][0]["text"]
        except Exception as e:
            logger.error(f"General answer failed: {e}")
            return "I can help with: activity, quests, projects, artifacts, people. Try asking 'What's happening?'"


# =============================================================================
# CONVERSATION CONTEXT
# =============================================================================

MAX_HISTORY = 5

def get_conversation_context(context) -> str:
    """Get recent conversation history for follow-ups."""
    history = context.chat_data.get("history", [])
    if not history:
        return ""
    
    lines = []
    for entry in history[-3:]:  # Last 3 exchanges
        lines.append(f"Q: {entry['question']}")
        lines.append(f"A: {entry['summary']}")
    return "\n".join(lines)


def store_in_context(context, question: str, query_name: str, result_summary: str):
    """Store exchange in conversation context."""
    if "history" not in context.chat_data:
        context.chat_data["history"] = []
    
    context.chat_data["history"].append({
        "question": question,
        "query": query_name,
        "summary": result_summary
    })
    
    # Trim old entries
    if len(context.chat_data["history"]) > MAX_HISTORY:
        context.chat_data["history"] = context.chat_data["history"][-MAX_HISTORY:]


# =============================================================================
# MAIN HANDLER
# =============================================================================

def is_allowed(update: Update) -> bool:
    """Check if chat/user is allowed."""
    chat_id = update.effective_chat.id
    user_id = update.effective_user.id if update.effective_user else None
    return chat_id in ALLOWED_CHAT_IDS or user_id in ALLOWED_CHAT_IDS or chat_id in ORG_CONFIG


async def handle_question(update: Update, context, question: str) -> None:
    """Main question handler - agent decides what to do."""

    # Get org config for this chat
    chat_id = update.effective_chat.id
    org_config = ORG_CONFIG.get(chat_id)
    if not org_config:
        await update.message.reply_text("This group isn't connected to an Egregore org yet. Ask your admin to add the bot through the setup flow.")
        return

    org_name = org_config.get("name", "default")
    logger.info(f"handle_question: chat_id={chat_id}, org={org_name}")

    # Check if Neo4j is configured for this org
    if not org_config or not org_config.get("neo4j_uri"):
        if not NEO4J_URI:
            await update.message.reply_text("Knowledge graph not configured.")
            return

    # Track user info for analytics
    user_id = None
    sender_name = None
    if update.effective_user:
        user_id = update.effective_user.id
        first_name = update.effective_user.first_name
        username = update.effective_user.username

        # Try lookup first, then auto-register if not found
        sender_name = lookup_person_by_telegram_id(user_id)
        if not sender_name:
            sender_name = auto_register_telegram_id(user_id, first_name, username=username)
        elif username:
            # Update username on existing TelegramUser if available
            run_query(
                "MATCH (tu:TelegramUser {telegramId: $tid}) SET tu.username = $username",
                {"tid": user_id, "username": username},
            )

        if sender_name:
            logger.info(f"Identified sender: {sender_name} (Telegram ID: {user_id})")

    # Get conversation context for follow-ups
    conv_context = get_conversation_context(context)

    # Agent decides (tool use) - now returns usage and latency
    decision = await agent_decide(question, conv_context, sender_name)

    action = decision.get("action")
    decision_usage = decision.get("usage", {})
    decision_latency = decision.get("latency_ms", 0)

    if action == "respond":
        # Direct response from agent
        response = decision.get("message", "")
        await update.message.reply_text(response)
        store_in_context(context, question, "direct", response[:100])

        # Log analytics for direct response
        log_query_event(
            query_type="direct",
            tokens_in=decision_usage.get("input_tokens", 0),
            tokens_out=decision_usage.get("output_tokens", 0),
            latency_ms=decision_latency,
            results_count=0,
            success=True,
            user_id=user_id,
            user_name=sender_name,
            question=question,
            decision_tokens_in=decision_usage.get("input_tokens", 0),
            decision_tokens_out=decision_usage.get("output_tokens", 0),
            decision_latency_ms=decision_latency,
        )
        return

    if action == "query":
        query_name = decision.get("query")
        params = decision.get("params", {})

        if query_name not in QUERIES:
            await update.message.reply_text("I couldn't find that information.")
            return

        # Run the query with timing (org-specific Neo4j)
        cypher = QUERIES[query_name]["cypher"]
        logger.info(f"Running query: {query_name} with params: {params} (org: {org_name})")

        neo4j_start = time.perf_counter()
        results = run_org_query(cypher, params, org_config)
        neo4j_latency = (time.perf_counter() - neo4j_start) * 1000

        if not results:
            # Give helpful response based on what was searched
            helpful_msg = await generate_no_results_response(question, query_name, params)
            await update.message.reply_text(helpful_msg)

            # Log analytics for empty results
            log_query_event(
                query_type=query_name,
                tokens_in=decision_usage.get("input_tokens", 0),
                tokens_out=decision_usage.get("output_tokens", 0),
                latency_ms=decision_latency + neo4j_latency,
                results_count=0,
                success=True,  # Query worked, just no results
                user_id=user_id,
                user_name=sender_name,
                question=question,
                decision_tokens_in=decision_usage.get("input_tokens", 0),
                decision_tokens_out=decision_usage.get("output_tokens", 0),
                decision_latency_ms=decision_latency,
                neo4j_latency_ms=neo4j_latency,
            )
            return

        # Format and send response (pass params for person context)
        response, format_usage, format_latency = await format_response(question, query_name, results, params)
        await update.message.reply_text(response)

        # Store in context
        summary = f"{query_name}: {len(results)} results"
        store_in_context(context, question, query_name, summary)

        # Calculate totals for analytics
        total_tokens_in = decision_usage.get("input_tokens", 0) + format_usage.get("input_tokens", 0)
        total_tokens_out = decision_usage.get("output_tokens", 0) + format_usage.get("output_tokens", 0)
        total_latency = decision_latency + neo4j_latency + format_latency

        # Log analytics
        log_query_event(
            query_type=query_name,
            tokens_in=total_tokens_in,
            tokens_out=total_tokens_out,
            latency_ms=total_latency,
            results_count=len(results),
            success=True,
            user_id=user_id,
            user_name=sender_name,
            question=question,
            decision_tokens_in=decision_usage.get("input_tokens", 0),
            decision_tokens_out=decision_usage.get("output_tokens", 0),
            decision_latency_ms=decision_latency,
            format_tokens_in=format_usage.get("input_tokens", 0),
            format_tokens_out=format_usage.get("output_tokens", 0),
            format_latency_ms=format_latency,
            neo4j_latency_ms=neo4j_latency,
        )
        return

    # Fallback
    await update.message.reply_text("I'm not sure how to help with that.")


# =============================================================================
# TELEGRAM HANDLERS
# =============================================================================

async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /start command.

    In groups: check for startgroup deep link payload (org_SLUG) to register the group.
    In private: start onboarding flow.
    """
    user = update.effective_user
    chat_type = update.effective_chat.type

    # Handle startgroup deep link in group chats: /start org_SLUG
    if chat_type in ("group", "supergroup") and context.args:
        payload = context.args[0]
        if payload.startswith("org_"):
            slug = payload[4:]  # Strip "org_" prefix
            chat_id = update.effective_chat.id
            logger.info(f"Group registration: slug={slug}, chat_id={chat_id}")

            result = await register_group(slug, chat_id)
            if result:
                org_name = result.get("org_name", slug)
                # Add to local config
                shared_uri = os.environ.get("EGREGORE_NEO4J_URI", "")
                shared_user = os.environ.get("EGREGORE_NEO4J_USER", "neo4j")
                shared_password = os.environ.get("EGREGORE_NEO4J_PASSWORD", "")
                ORG_CONFIG[chat_id] = {
                    "name": slug,
                    "neo4j_uri": shared_uri,
                    "neo4j_user": shared_user,
                    "neo4j_password": shared_password,
                }
                if chat_id not in ALLOWED_CHAT_IDS:
                    ALLOWED_CHAT_IDS.append(chat_id)

                await update.message.reply_text(
                    f"Connected to {org_name}! Notifications will appear here.\n\n"
                    "Ask me anything — I can search the knowledge graph, show activity, and more."
                )
            else:
                await update.message.reply_text(
                    "Couldn't connect this group. Make sure the org exists in Egregore."
                )
            return

    # In private chat, point to website
    if chat_type == "private":
        site_url = os.environ.get("EGREGORE_SITE_URL", "https://egregore-core.netlify.app")
        await update.message.reply_text(
            "Welcome to Egregore!\n\n"
            f"Get set up here: {site_url}/setup\n\n"
            "Already set up? Ask me anything about your org's work."
        )
        return

    if not is_allowed(update):
        await update.message.reply_text("This bot is private to Egregore.")
        return

    await update.message.reply_text(
        "I'm Egregore. Ask me anything about our work:\n\n"
        "- What's happening?\n"
        "- What is Oz working on?\n"
        "- What quests are active?\n"
        "- Tell me about the FAMP proposal\n"
        "- Who's on the team?\n\n"
        "Or ask how to use Egregore (commands, adding artifacts, etc.)"
    )


async def activity_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /activity command."""
    if not is_allowed(update):
        return
    await handle_question(update, context, "What's been happening recently?")


async def debug_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /debug command - show deployment info."""
    if not is_allowed(update):
        return

    from pathlib import Path
    import os

    cwd = os.getcwd()
    file_loc = Path(__file__).parent

    # List files in likely locations
    locations = {
        "cwd": Path(cwd),
        "__file__.parent": file_loc,
        "/app": Path("/app"),
        "/app/telegram-bot": Path("/app/telegram-bot"),
    }

    lines = [f"CWD: {cwd}", f"__file__: {__file__}", ""]

    for name, path in locations.items():
        if path.exists():
            files = list(path.glob("*.zip")) + list(path.glob("*.py"))[:3]
            lines.append(f"{name}: {[f.name for f in files]}")
        else:
            lines.append(f"{name}: (not found)")

    await update.message.reply_text("\n".join(lines))


async def onboard_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /onboard command — redirect to website."""
    site_url = os.environ.get("EGREGORE_SITE_URL", "https://egregore-core.netlify.app")
    await update.message.reply_text(f"Get set up here: {site_url}/setup")


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle any text message."""
    if not update.message or not update.message.text:
        return

    # Check for onboarding DM first
    if update.effective_chat.type == "private":
        if await handle_onboarding_dm(update, context):
            return

    if not is_allowed(update):
        return

    text = update.message.text.strip()

    # In groups, only respond if mentioned or replied to
    chat_type = update.effective_chat.type
    if chat_type in ["group", "supergroup"]:
        bot_username = context.bot.username
        if f"@{bot_username}" not in text:
            if not (update.message.reply_to_message and
                    update.message.reply_to_message.from_user.id == context.bot.id):
                return
        text = text.replace(f"@{bot_username}", "").strip()

    if not text:
        return

    await handle_question(update, context, text)


# =============================================================================
# NOTIFICATIONS
# =============================================================================

def get_telegram_id(name: str) -> Optional[int]:
    """Look up Telegram ID by person name from Neo4j.

    Matches against name, fullName, or aliases (case-insensitive).
    Examples: 'oz', 'oguzhan', 'Oz Broccoli' all resolve to oz's telegramId.
    """
    name_lower = name.lower().strip()

    # Try exact match on name first (fastest)
    results = run_query(
        "MATCH (p:Person {name: $name}) WHERE p.telegramId IS NOT NULL RETURN p.telegramId AS telegramId",
        {"name": name_lower}
    )
    if results and results[0].get("telegramId"):
        return int(results[0]["telegramId"])

    # Try fuzzy match on fullName or aliases
    results = run_query(
        """MATCH (p:Person)
           WHERE p.telegramId IS NOT NULL AND (
               toLower(p.fullName) CONTAINS $name
               OR $name IN [x IN coalesce(p.aliases, []) | toLower(x)]
           )
           RETURN p.telegramId AS telegramId
           LIMIT 1""",
        {"name": name_lower}
    )
    if results and results[0].get("telegramId"):
        return int(results[0]["telegramId"])

    return None


async def send_notification(bot, recipient: str, message: str, notification_type: str = "mention") -> bool:
    """Send a notification to a team member."""
    telegram_id = get_telegram_id(recipient)
    if not telegram_id:
        logger.warning(f"No Telegram ID found for {recipient}")
        return False

    try:
        await bot.send_message(chat_id=telegram_id, text=message)
        logger.info(f"Notification sent to {recipient} ({telegram_id})")
        return True
    except Exception as e:
        logger.error(f"Failed to send notification to {recipient}: {e}")
        return False


# Global reference to bot for HTTP handler
telegram_bot = None


async def handle_notify_request(request: Request) -> JSONResponse:
    """HTTP endpoint for sending notifications.

    POST /notify
    {
        "recipient": "oz",           # Person name (lowercase)
        "message": "...",            # Notification message
        "type": "handoff|quest|mention"  # Optional
    }
    """
    global telegram_bot

    if not telegram_bot:
        return JSONResponse({"error": "Bot not initialized"}, status_code=503)

    try:
        data = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid JSON"}, status_code=400)

    recipient = data.get("recipient")
    message = data.get("message")
    notification_type = data.get("type", "mention")

    if not recipient or not message:
        return JSONResponse({"error": "Missing recipient or message"}, status_code=400)

    success = await send_notification(telegram_bot, recipient, message, notification_type)

    if success:
        return JSONResponse({"status": "sent", "recipient": recipient})
    else:
        return JSONResponse({"error": f"Could not notify {recipient}"}, status_code=404)


# =============================================================================
# NEW MEMBER ONBOARDING
# =============================================================================

async def handle_member_update(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle members joining or leaving a group — track membership + welcome."""
    if not update.chat_member:
        return

    old_status = update.chat_member.old_chat_member.status
    new_status = update.chat_member.new_chat_member.status
    member = update.chat_member.new_chat_member.user
    chat_id = update.effective_chat.id

    if chat_id not in ORG_CONFIG:
        return

    org_config = ORG_CONFIG[chat_id]
    org_slug = org_config.get("name", "default")

    # Detect join
    if new_status in ["member", "administrator"] and old_status not in ["member", "administrator"]:
        logger.info(f"Member joined: {member.first_name} ({member.id}) → {org_slug}")
        track_telegram_membership(
            telegram_id=member.id,
            username=member.username or "",
            first_name=member.first_name or "",
            org_slug=org_slug,
            action="join",
        )
        site_url = os.environ.get("EGREGORE_SITE_URL", "https://egregore-core.netlify.app")
        await context.bot.send_message(
            chat_id=chat_id,
            text=f"Welcome {member.first_name}! Get set up here: {site_url}/setup",
        )

    # Detect leave
    elif old_status in ["member", "administrator"] and new_status in ["left", "kicked"]:
        logger.info(f"Member left: {member.first_name} ({member.id}) from {org_slug}")
        track_telegram_membership(
            telegram_id=member.id,
            username=member.username or "",
            first_name=member.first_name or "",
            org_slug=org_slug,
            action="leave",
        )


async def handle_onboarding_dm(update: Update, context: ContextTypes.DEFAULT_TYPE) -> bool:
    """Legacy DM handler — no longer used for onboarding. Returns False."""
    return False


# =============================================================================
# SPIRIT ADAPTER ENDPOINTS
# =============================================================================

async def handle_spirit_init(request: Request) -> JSONResponse:
    """Initialize a Spirit node in the bot's database.

    POST /spirit/init
    Headers: X-Admin-Secret: <SPIRIT_ADMIN_SECRET>
    {
        "spirit_id": "spirit-openclaw-cem-alter",
        "name": "Alter",
        "vessel": "cem",
        "platform": "openclaw",
        "trust_level": "elevated"
    }
    """
    # Require admin secret
    if not SPIRIT_ADMIN_SECRET:
        return JSONResponse({"error": "Spirit init not configured"}, status_code=503)

    admin_secret = request.headers.get("X-Admin-Secret", "")
    if not secrets.compare_digest(admin_secret, SPIRIT_ADMIN_SECRET):
        return JSONResponse({"error": "Unauthorized"}, status_code=401)

    try:
        data = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid JSON"}, status_code=400)

    spirit_id = data.get("spirit_id")
    name = data.get("name")
    vessel = data.get("vessel")
    platform = data.get("platform", "unknown")
    trust_level = data.get("trust_level", "standard")

    if not all([spirit_id, name, vessel]):
        return JSONResponse({"error": "Missing required fields"}, status_code=400)

    # Create Spirit node with registration token
    reg_token = f"reg-{uuid.uuid4()}"

    result = run_query("""
        MATCH (p:Person {name: $vessel})
        CREATE (s:Spirit {
            id: $spiritId,
            name: $name,
            platform: $platform,
            status: "pending",
            trustLevel: $trustLevel,
            registrationToken: $regToken,
            tokenExpiresAt: datetime() + duration('PT2H'),
            created: datetime()
        })
        CREATE (s)-[:INVOKED_BY]->(p)
        RETURN s.id AS id, s.registrationToken AS token, s.tokenExpiresAt AS expires
    """, {
        "spiritId": spirit_id,
        "name": name,
        "vessel": vessel,
        "platform": platform,
        "trustLevel": trust_level,
        "regToken": reg_token
    })

    if not result:
        return JSONResponse({"error": "Failed to create Spirit (vessel not found?)"}, status_code=404)

    return JSONResponse({
        "status": "created",
        "spirit_id": result[0]["id"],
        "registration_token": result[0]["token"],
        "expires": str(result[0]["expires"])
    })


async def handle_spirit_activate(request: Request) -> JSONResponse:
    """Activate a pending external Spirit.

    POST /spirit/activate
    {
        "registration_token": "reg-...",
        "platform": {"name": "openclaw", "version": "2026.2.2"},
        "endpoint": "http://localhost:8765",
        "capabilities": ["shell", "web", "fs"]
    }

    Returns API key (one-time) on success.
    """
    try:
        data = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid JSON"}, status_code=400)

    registration_token = data.get("registration_token")
    platform_info = data.get("platform", {})
    endpoint = data.get("endpoint")
    capabilities = data.get("capabilities", [])

    if not registration_token:
        return JSONResponse({"error": "Missing registration_token"}, status_code=400)

    logger.info(f"Spirit activation attempt with token: {registration_token[:20]}...")

    # Find pending Spirit with this token (not expired)
    result = run_query("""
        MATCH (s:Spirit {registrationToken: $token, status: "pending"})
        WHERE s.tokenExpiresAt > datetime()
        RETURN s.id AS id, s.name AS name, s.trustLevel AS trustLevel
    """, {"token": registration_token})

    logger.info(f"Spirit query result: {result}")

    if not result:
        logger.info(f"Spirit activation failed: no matching pending Spirit for token {registration_token[:20]}...")
        return JSONResponse({"error": "Invalid or expired token"}, status_code=404)

    spirit = result[0]
    spirit_id = spirit["id"]
    spirit_name = spirit["name"]

    # Generate API key: sk_egregore_[short_id]_[random]
    short_id = spirit_id.replace("spirit-", "")[:15].replace("-", "_")
    api_key = f"sk_egregore_{short_id}_{secrets.token_hex(12)}"
    api_key_hash = hashlib.sha256(api_key.encode()).hexdigest()

    # Activate the Spirit
    run_query("""
        MATCH (s:Spirit {registrationToken: $token})
        SET s.status = "manifest",
            s.apiKeyHash = $apiKeyHash,
            s.endpoint = $endpoint,
            s.platformVersion = $version,
            s.capabilities = $capabilities,
            s.activatedAt = datetime(),
            s.lastHeartbeat = datetime()
        REMOVE s.registrationToken, s.tokenExpiresAt
    """, {
        "token": registration_token,
        "apiKeyHash": api_key_hash,
        "endpoint": endpoint,
        "version": platform_info.get("version", "unknown"),
        "capabilities": capabilities
    })

    # Log the activation
    log_event(
        component="spirit",
        operation="activate",
        success=True,
        metadata={
            "spirit_id": spirit_id,
            "spirit_name": spirit_name,
            "platform": platform_info.get("name", "unknown"),
            "platform_version": platform_info.get("version", "unknown"),
            "capabilities": capabilities
        }
    )

    logger.info(f"Spirit activated: {spirit_id} ({spirit_name})")

    return JSONResponse({
        "status": "activated",
        "spirit_id": spirit_id,
        "spirit_name": spirit_name,
        "api_key": api_key  # One-time return - store this!
    })


async def handle_spirit_heartbeat(request: Request) -> JSONResponse:
    """Heartbeat from an active Spirit.

    POST /spirit/heartbeat
    Headers: Authorization: Bearer sk_egregore_...
    {
        "status": "idle" | "working" | "completing",
        "task_id": "..." (optional)
    }
    """
    # Validate API key
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer sk_egregore_"):
        return JSONResponse({"error": "Invalid authorization"}, status_code=401)

    api_key = auth_header.replace("Bearer ", "")
    api_key_hash = hashlib.sha256(api_key.encode()).hexdigest()

    # Find Spirit by API key hash
    result = run_query("""
        MATCH (s:Spirit {apiKeyHash: $hash, status: "manifest"})
        SET s.lastHeartbeat = datetime()
        RETURN s.id AS id, s.name AS name
    """, {"hash": api_key_hash})

    if not result:
        return JSONResponse({"error": "Spirit not found or not active"}, status_code=404)

    spirit = result[0]

    try:
        data = await request.json()
        status = data.get("status", "idle")
    except Exception:
        status = "idle"

    logger.debug(f"Heartbeat from {spirit['name']}: {status}")

    return JSONResponse({
        "status": "ok",
        "spirit_id": spirit["id"]
    })


async def handle_spirit_callback(request: Request) -> JSONResponse:
    """Callback when a Spirit completes a task.

    POST /spirit/callback
    Headers: Authorization: Bearer sk_egregore_...
    {
        "task_id": "...",
        "status": "fulfilled" | "failed" | "timeout",
        "outputs": [...],
        "essence": {"tokens_in": N, "tokens_out": N, "model": "...", "cost_usd": N}
    }
    """
    # Validate API key
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer sk_egregore_"):
        return JSONResponse({"error": "Invalid authorization"}, status_code=401)

    api_key = auth_header.replace("Bearer ", "")
    api_key_hash = hashlib.sha256(api_key.encode()).hexdigest()

    # Find Spirit by API key hash
    result = run_query("""
        MATCH (s:Spirit {apiKeyHash: $hash, status: "manifest"})-[:INVOKED_BY]->(p:Person)
        RETURN s.id AS spirit_id, s.name AS spirit_name, p.name AS vessel_name
    """, {"hash": api_key_hash})

    if not result:
        return JSONResponse({"error": "Spirit not found or not active"}, status_code=404)

    spirit_info = result[0]

    try:
        data = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid JSON"}, status_code=400)

    task_id = data.get("task_id", "unknown")
    status = data.get("status", "fulfilled")
    outputs = data.get("outputs", [])
    essence = data.get("essence", {})

    # Log the task completion
    log_event(
        component="spirit",
        operation=f"task:{status}",
        tokens_in=essence.get("tokens_in", 0),
        tokens_out=essence.get("tokens_out", 0),
        model=essence.get("model", "unknown"),
        success=(status == "fulfilled"),
        user_name=spirit_info["vessel_name"],
        metadata={
            "spirit_id": spirit_info["spirit_id"],
            "spirit_name": spirit_info["spirit_name"],
            "task_id": task_id,
            "outputs_count": len(outputs),
            "cost_usd": essence.get("cost_usd", 0)
        }
    )

    # Update Spirit heartbeat
    run_query("""
        MATCH (s:Spirit {id: $id})
        SET s.lastHeartbeat = datetime()
    """, {"id": spirit_info["spirit_id"]})

    logger.info(f"Task callback from {spirit_info['spirit_name']}: {task_id} -> {status}")

    # TODO: Process outputs (create artifacts, sessions, etc.) based on trust level
    # For now, just acknowledge

    return JSONResponse({
        "status": "received",
        "task_id": task_id,
        "outputs_processed": len(outputs)
    })


# =============================================================================
# MAIN
# =============================================================================

def main() -> None:
    """Start the bot."""
    global telegram_bot

    ptb_app = Application.builder().token(BOT_TOKEN).build()
    telegram_bot = ptb_app.bot

    ptb_app.add_handler(CommandHandler("start", start_command))
    ptb_app.add_handler(CommandHandler("activity", activity_command))
    ptb_app.add_handler(CommandHandler("debug", debug_command))
    ptb_app.add_handler(CommandHandler("onboard", onboard_command))
    ptb_app.add_handler(ChatMemberHandler(handle_member_update, ChatMemberHandler.CHAT_MEMBER))
    ptb_app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    if WEBHOOK_URL:
        logger.info(f"Starting webhook + notification API on port {PORT}")
        import asyncio

        async def handle_telegram_webhook(request: Request) -> PlainTextResponse:
            """Handle incoming Telegram webhook updates."""
            data = await request.json()
            update = Update.de_json(data, ptb_app.bot)
            await ptb_app.process_update(update)
            return PlainTextResponse("ok")

        async def health_check(request: Request) -> PlainTextResponse:
            """Health check endpoint."""
            return PlainTextResponse("ok")

        # Single Starlette app with all endpoints
        # Use token as webhook path for security (only Telegram knows it)
        webhook_path = f"/{BOT_TOKEN}"
        starlette_app = Starlette(
            routes=[
                Route(webhook_path, handle_telegram_webhook, methods=["POST"]),
                Route("/notify", handle_notify_request, methods=["POST"]),
                Route("/health", health_check, methods=["GET"]),
                # Spirit adapter endpoints
                Route("/spirit/init", handle_spirit_init, methods=["POST"]),
                Route("/spirit/activate", handle_spirit_activate, methods=["POST"]),
                Route("/spirit/heartbeat", handle_spirit_heartbeat, methods=["POST"]),
                Route("/spirit/callback", handle_spirit_callback, methods=["POST"]),
            ] + get_mcp_routes()  # MCP server endpoints
        )

        async def run_server():
            # Initialize PTB app
            await ptb_app.initialize()
            await ptb_app.start()

            # Set webhook (use token as path for security)
            webhook_url = f"https://{WEBHOOK_URL}/{BOT_TOKEN}"
            await ptb_app.bot.set_webhook(url=webhook_url)
            logger.info(f"Webhook set to https://{WEBHOOK_URL}/[TOKEN]")

            # Run uvicorn
            config = uvicorn.Config(starlette_app, host="0.0.0.0", port=PORT, log_level="info")
            server = uvicorn.Server(config)
            await server.serve()

        asyncio.run(run_server())
    else:
        logger.info("Starting polling mode...")
        # In polling mode, use simple run_polling
        ptb_app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
