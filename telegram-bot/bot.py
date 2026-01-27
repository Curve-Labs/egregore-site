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
from typing import Optional

from dotenv import load_dotenv
load_dotenv(override=False)

import httpx
from neo4j import GraphDatabase

from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes

# =============================================================================
# CONFIG
# =============================================================================

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Telegram
BOT_TOKEN = os.environ["TELEGRAM_BOT_TOKEN"]
WEBHOOK_URL = os.environ.get("WEBHOOK_URL", "")
PORT = int(os.environ.get("PORT", 8443))

# Neo4j Aura
NEO4J_URI = os.environ.get("NEO4J_URI", "")
NEO4J_USER = os.environ.get("NEO4J_USER", "")
NEO4J_PASSWORD = os.environ.get("NEO4J_PASSWORD", "")

# Anthropic (for Haiku)
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")

# Security: Only respond to allowed chats/users
# Channel: -1003081443167, Oz: 154132702, Ali: 952778083, Cem: 72463248
DEFAULT_ALLOWED = [-1003081443167, 154132702, 952778083, 72463248]
ALLOWED_CHAT_IDS = [
    int(x) for x in os.environ.get("ALLOWED_CHAT_IDS", "").split(",") if x.strip()
] or DEFAULT_ALLOWED

# Log startup config
logger.info("=== Egregore Bot Starting ===")
logger.info(f"NEO4J_URI: {'SET' if NEO4J_URI else 'NOT SET'}")
logger.info(f"ANTHROPIC_API_KEY: {'SET' if ANTHROPIC_API_KEY else 'NOT SET'}")
logger.info(f"ALLOWED_CHAT_IDS: {ALLOWED_CHAT_IDS}")

# =============================================================================
# NEO4J CONNECTION
# =============================================================================

neo4j_driver = None

def get_neo4j_driver():
    """Get or create Neo4j driver."""
    global neo4j_driver
    if neo4j_driver is None and NEO4J_URI:
        neo4j_driver = GraphDatabase.driver(
            NEO4J_URI,
            auth=(NEO4J_USER, NEO4J_PASSWORD)
        )
        logger.info("Neo4j driver initialized")
    return neo4j_driver


def run_query(query: str, params: dict = None) -> list:
    """Run a Cypher query and return results."""
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
    }
}


# =============================================================================
# LLM FUNCTIONS
# =============================================================================

async def pick_query(question: str) -> Optional[dict]:
    """Use LLM to pick which query to run and extract parameters."""
    if not ANTHROPIC_API_KEY:
        return None

    query_descriptions = "\n".join([
        f"- {name}: {q['description']} (params: {q['params'] or 'none'})"
        for name, q in QUERIES.items()
    ])

    system_prompt = f"""You help pick the right database query for user questions about Egregore.

Available queries:
{query_descriptions}

Respond with ONLY raw JSON, no markdown, no code blocks: {{"query": "query_name", "params": {{"param": "value"}}}}
If no query fits, respond: {{"query": null}}

Rules for params:
- Person names are lowercase: oz, ali, cem
- Quest IDs are slugs: nlnet-commons-fund, grants, benchmark-eval
- Project names: lace, tristero, infrastructure
- Search terms: use the key phrase from the question

Examples:
- "What's happening?" -> {{"query": "recent_activity", "params": {{}}}}
- "What is Oz working on?" -> {{"query": "person_projects", "params": {{"name": "oz"}}}}
- "Tell me about the FAMP proposal" -> {{"query": "search_artifacts", "params": {{"term": "FAMP"}}}}
- "What quests are active?" -> {{"query": "active_quests", "params": {{}}}}
- "What is nlnet-commons-fund?" -> {{"query": "quest_details", "params": {{"quest_id": "nlnet-commons-fund"}}}}
- "Who's on the team?" -> {{"query": "all_people", "params": {{}}}}"""

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
                    "max_tokens": 150,
                    "system": system_prompt,
                    "messages": [{"role": "user", "content": question}]
                },
                timeout=15
            )
            resp.raise_for_status()
            text = resp.json()["content"][0]["text"].strip()
            logger.info(f"LLM response: {text}")  # DEBUG

            # Strip markdown code blocks if present
            if text.startswith("```"):
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
                text = text.strip()

            # Parse JSON response
            result = json.loads(text)
            if result.get("query") is None:
                return None
            return result

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM response as JSON: {e}")
            return None
        except Exception as e:
            logger.error(f"LLM query picker failed: {e}")
            return None


async def format_response(question: str, results: list) -> str:
    """Use LLM to format query results as natural language."""
    if not ANTHROPIC_API_KEY:
        # Fallback: just return formatted JSON
        return f"Results:\n{json.dumps(results, indent=2, default=str)}"

    if not results:
        return "No results found."

    system_prompt = """You are Egregore assistant. Format database results as a helpful response.

Guidelines:
- Be concise and direct
- Use bullet points for lists
- Don't mention "database" or "query"
- Don't use emojis
- If data is empty/null, acknowledge it gracefully
- For dates, just show YYYY-MM-DD"""

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
                    "max_tokens": 500,
                    "system": system_prompt,
                    "messages": [{
                        "role": "user",
                        "content": f"Question: {question}\n\nData: {json.dumps(results, default=str)}"
                    }]
                },
                timeout=15
            )
            resp.raise_for_status()
            return resp.json()["content"][0]["text"]
        except Exception as e:
            logger.error(f"LLM response formatter failed: {e}")
            return f"Results:\n{json.dumps(results, indent=2, default=str)}"


# =============================================================================
# EGREGORE CONTEXT (for general questions)
# =============================================================================

EGREGORE_CONTEXT = """Egregore is a collaborative intelligence system where humans and AI agents share knowledge.

Key concepts:
- Artifacts: content (sources, thoughts, findings, decisions) in memory/artifacts/
- Quests: open-ended explorations that artifacts link to
- Projects: tristero (polis), lace (psyche), infrastructure
- Sessions: work sessions logged by team members

How to add something:
1. Open Claude Code in egregore folder
2. Run /add (for a thought) or /add https://... (for a source)
3. System suggests which quest to link it to
4. Run /save to push

Commands: /add, /quest, /project, /activity, /handoff, /save, /pull"""


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
# MAIN HANDLER
# =============================================================================

def is_allowed(update: Update) -> bool:
    """Check if chat/user is allowed."""
    chat_id = update.effective_chat.id
    user_id = update.effective_user.id if update.effective_user else None
    return chat_id in ALLOWED_CHAT_IDS or user_id in ALLOWED_CHAT_IDS


async def handle_question(update: Update, question: str) -> None:
    """Main question handler - picks query, runs it, formats response."""

    # Check if Neo4j is configured
    if not NEO4J_URI:
        await update.message.reply_text(
            "Knowledge graph not configured. Contact admin."
        )
        return

    # Try to pick a query
    query_choice = await pick_query(question)

    if query_choice is None:
        # No matching query - answer as general question
        response = await answer_general(question)
        await update.message.reply_text(response)
        return

    query_name = query_choice.get("query")
    params = query_choice.get("params", {})

    if query_name not in QUERIES:
        response = await answer_general(question)
        await update.message.reply_text(response)
        return

    # Run the query
    cypher = QUERIES[query_name]["cypher"]
    logger.info(f"Running query: {query_name} with params: {params}")

    results = run_query(cypher, params)

    if not results:
        await update.message.reply_text(
            "No results found. Try a different question or check if the data exists."
        )
        return

    # Format and send response
    response = await format_response(question, results)
    await update.message.reply_text(response)


# =============================================================================
# TELEGRAM HANDLERS
# =============================================================================

async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /start command."""
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
    await handle_question(update, "What's been happening recently?")


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle any text message."""
    if not update.message or not update.message.text:
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

    await handle_question(update, text)


# =============================================================================
# MAIN
# =============================================================================

def main() -> None:
    """Start the bot."""
    app = Application.builder().token(BOT_TOKEN).build()

    app.add_handler(CommandHandler("start", start_command))
    app.add_handler(CommandHandler("activity", activity_command))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    if WEBHOOK_URL:
        logger.info(f"Starting webhook on port {PORT}")
        app.run_webhook(
            listen="0.0.0.0",
            port=PORT,
            url_path=BOT_TOKEN,
            webhook_url=f"{WEBHOOK_URL}/{BOT_TOKEN}"
        )
    else:
        logger.info("Starting polling mode...")
        app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
