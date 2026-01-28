"""
Egregore Bot

A Telegram bot that answers natural language queries about Egregore
by querying the Neo4j knowledge graph directly.

Architecture:
- LLM (Haiku) picks the right query from user's natural language
- Python formatters render results as Telegram HTML (no LLM formatting)
- Multi-message responses: summary, details, follow-up buttons
- Conversation context for follow-up questions

Deploy to Railway with webhook mode for production.
"""

import os
import json
import logging
import time
from typing import Optional

from dotenv import load_dotenv
load_dotenv(override=False)

import httpx
from neo4j import GraphDatabase

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.constants import ParseMode
from telegram.ext import Application, CommandHandler, MessageHandler, CallbackQueryHandler, filters, ContextTypes

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
# TELEGRAM FORMATTING HELPERS
# =============================================================================

def escape_html(text: str) -> str:
    """Escape special characters for Telegram HTML."""
    if not text:
        return ""
    return (text
        .replace('&', '&amp;')
        .replace('<', '&lt;')
        .replace('>', '&gt;')
    )


def truncate_message(text: str, max_length: int = 4000) -> str:
    """Truncate message to Telegram's limit."""
    if len(text) <= max_length:
        return text
    return text[:max_length - 50] + "\n\n_\\.\\.\\. truncated_"


def make_buttons(options: list[tuple[str, str]], row_width: int = 1) -> InlineKeyboardMarkup:
    """Create inline keyboard from list of (label, callback_data) tuples.
    
    Args:
        options: List of (label, callback_data) tuples
        row_width: Number of buttons per row (default 1 = vertical stack)
    """
    keyboard = []
    row = []
    for label, data in options:
        row.append(InlineKeyboardButton(label, callback_data=data))
        if len(row) >= row_width:
            keyboard.append(row)
            row = []
    if row:  # Add remaining buttons
        keyboard.append(row)
    return InlineKeyboardMarkup(keyboard)


def make_inline_buttons(options: list[tuple[str, str]]) -> InlineKeyboardMarkup:
    """Create inline keyboard with buttons in a single row (for drill-down)."""
    return make_buttons(options, row_width=3)


# =============================================================================
# PYTHON FORMATTERS (replace LLM formatting)
# =============================================================================

def format_sessions(sessions: list) -> str:
    """Format session list as Telegram HTML."""
    if not sessions:
        return "No sessions found."
    
    lines = []
    for s in sessions:
        date = s.get("date", "")
        # Handle Neo4j date objects
        if hasattr(date, "iso_format"):
            date = date.iso_format()
        elif hasattr(date, "__str__"):
            date = str(date)
        
        person = s.get("person", "unknown")
        topic = escape_html(str(s.get("topic", "") or ""))
        summary = escape_html(str(s.get("summary", "") or ""))
        
        line = f"<b>{date}</b> {person}"
        if topic:
            line += f"\n{topic}"
        if summary:
            # Truncate long summaries
            if len(summary) > 150:
                summary = summary[:147] + "..."
            line += f"\n<i>{summary}</i>"
        lines.append(line)
    
    return "\n\n".join(lines)


def format_quests(quests: list) -> str:
    """Format quest list as Telegram HTML."""
    if not quests:
        return "No quests found."
    
    lines = []
    for q in quests:
        qid = q.get("id", "")
        title = escape_html(str(q.get("title", "") or qid))
        by = q.get("started_by", "")
        projects = q.get("projects", [])
        if projects:
            projects = [p for p in projects if p]  # Filter None values
            projects_str = ", ".join(projects)
        else:
            projects_str = ""
        
        line = f"<b>{title}</b>"
        if qid and title != qid:
            line += f" <code>{qid}</code>"
        if by:
            line += f"\nby {by}"
        if projects_str:
            line += f"\n{projects_str}"
        lines.append(line)
    
    return "\n\n".join(lines)


def format_quest_detail(quest: dict) -> str:
    """Format single quest detail as Telegram HTML."""
    title = escape_html(str(quest.get("title", "") or "Untitled"))
    status = quest.get("status", "unknown")
    question = escape_html(str(quest.get("question", "") or ""))
    started_by = quest.get("started_by", "")
    artifacts = quest.get("artifacts", [])
    projects = quest.get("projects", [])
    
    lines = [f"<b>{title}</b>"]
    lines.append(f"Status: {status}")
    
    if started_by:
        lines.append(f"Started by: {started_by}")
    
    if question:
        lines.append(f"\n<i>{question}</i>")
    
    if projects:
        projects = [p for p in projects if p]
        if projects:
            lines.append(f"\nProjects: {', '.join(projects)}")
    
    if artifacts:
        artifacts = [a for a in artifacts if a]
        if artifacts:
            lines.append(f"\nArtifacts ({len(artifacts)}):")
            for a in artifacts[:5]:  # Limit to 5
                lines.append(f"  - {escape_html(str(a))}")
            if len(artifacts) > 5:
                lines.append(f"  ... and {len(artifacts) - 5} more")
    
    return "\n".join(lines)


def format_people(people: list) -> str:
    """Format team list as Telegram HTML."""
    if not people:
        return "No team members found."
    
    lines = []
    for p in people:
        name = p.get("name", "")
        full = p.get("fullName", "")
        projects = p.get("projects", [])
        if projects:
            projects = [pr for pr in projects if pr]
            projects_str = ", ".join(projects)
        else:
            projects_str = ""
        
        line = f"<b>{name}</b>"
        if full:
            line += f" ({full})"
        if projects_str:
            line += f" - {projects_str}"
        else:
            line += " - no projects"
        lines.append(line)
    
    return "\n".join(lines)


def format_projects(projects: list) -> str:
    """Format project list as Telegram HTML."""
    if not projects:
        return "No projects found."
    
    lines = []
    for p in projects:
        name = p.get("name", "") or p.get("project", "")
        domain = p.get("domain", "")
        team = p.get("team", [])
        role = p.get("role", "")
        description = p.get("description", "")
        
        if team:
            team = [t for t in team if t]
            team_str = ", ".join(team)
        else:
            team_str = ""
        
        line = f"<b>{name}</b>"
        if domain:
            line += f" [{domain}]"
        if role:
            line += f" - {role}"
        if team_str:
            line += f"\n{team_str}"
        if description:
            desc = escape_html(str(description))
            if len(desc) > 100:
                desc = desc[:97] + "..."
            line += f"\n<i>{desc}</i>"
        lines.append(line)
    
    return "\n\n".join(lines)


def format_artifacts(artifacts: list) -> str:
    """Format artifact list as Telegram HTML."""
    if not artifacts:
        return "No artifacts found."
    
    lines = []
    for a in artifacts:
        title = escape_html(str(a.get("title", "") or "Untitled"))
        atype = a.get("type", "")
        author = a.get("author", "")
        created = a.get("created", "")
        quests = a.get("quests", [])
        
        line = f"<b>{title}</b>"
        if atype:
            line += f" [{atype}]"
        if author:
            line += f"\nby {author}"
        if created:
            if hasattr(created, "iso_format"):
                created = created.iso_format()
            line += f" ({created})"
        if quests:
            quests = [q for q in quests if q]
            if quests:
                line += f"\nQuests: {', '.join(quests)}"
        lines.append(line)
    
    return "\n\n".join(lines)


# =============================================================================
# PROGRESSIVE DISCLOSURE SUMMARY FORMATTERS
# =============================================================================

def format_activity_summary(sessions: list) -> tuple[str, list]:
    """Return aggregated activity summary and drill-down buttons."""
    if not sessions:
        return "No recent activity.", []
    
    # Group sessions by person
    by_person = {}
    for s in sessions:
        person = s.get("person", "unknown")
        by_person.setdefault(person, []).append(s)
    
    lines = []
    buttons = []
    for person, sess in by_person.items():
        # Extract unique topics (first 20 chars each)
        topics = set()
        for s in sess:
            topic = s.get("topic", "")
            if topic:
                # Get first meaningful word/phrase
                short_topic = str(topic)[:20].split()[0] if topic else ""
                if short_topic:
                    topics.add(short_topic.lower())
        
        topic_str = ", ".join(list(topics)[:2]) if topics else "various"
        count = len(sess)
        lines.append(f"<b>{person}</b> - {count} session{'s' if count != 1 else ''} ({topic_str})")
        buttons.append((person, f"person:{person}"))
    
    buttons.append(("Show all", "expand:recent_activity"))
    return "\n".join(lines), buttons


def format_quests_summary(quests: list) -> tuple[str, list]:
    """Return aggregated quests summary and drill-down buttons."""
    if not quests:
        return "No active quests.", []
    
    lines = []
    buttons = []
    for q in quests:
        qid = q.get("id", "")
        title = escape_html(str(q.get("title", "") or qid))
        by = q.get("started_by", "")
        projects = q.get("projects", [])
        projects = [p for p in projects if p] if projects else []
        
        # Compact format: title (owner, project)
        meta_parts = []
        if by:
            meta_parts.append(by)
        if projects:
            meta_parts.append(projects[0])
        
        meta_str = f" ({', '.join(meta_parts)})" if meta_parts else ""
        lines.append(f"- {title}{meta_str}")
        
        # Button uses quest ID
        if qid:
            buttons.append((title[:15] if len(title) > 15 else title, f"quest:{qid}"))
    
    buttons.append(("Show all", "expand:active_quests"))
    return "\n".join(lines), buttons


def format_people_summary(people: list) -> tuple[str, list]:
    """Return team summary and drill-down buttons."""
    if not people:
        return "No team members found.", []
    
    lines = []
    buttons = []
    for p in people:
        name = p.get("name", "")
        projects = p.get("projects", [])
        projects = [pr for pr in projects if pr] if projects else []
        projects_str = ", ".join(projects) if projects else "no projects"
        
        lines.append(f"<b>{name}</b> - {projects_str}")
        buttons.append((name, f"person:{name}"))
    
    return "\n".join(lines), buttons


def format_projects_summary(projects: list) -> tuple[str, list]:
    """Return projects summary and drill-down buttons."""
    if not projects:
        return "No projects found.", []
    
    lines = []
    buttons = []
    for p in projects:
        name = p.get("name", "") or p.get("project", "")
        domain = p.get("domain", "")
        team = p.get("team", [])
        team = [t for t in team if t] if team else []
        
        meta_parts = []
        if domain:
            meta_parts.append(domain)
        if team:
            meta_parts.append(f"{len(team)} members")
        
        meta_str = f" [{', '.join(meta_parts)}]" if meta_parts else ""
        lines.append(f"<b>{name}</b>{meta_str}")
        buttons.append((name, f"project:{name}"))
    
    return "\n".join(lines), buttons


def format_artifacts_summary(artifacts: list, term: str = "") -> tuple[str, list]:
    """Return artifacts search summary and drill-down buttons."""
    if not artifacts:
        return f"No artifacts found matching '{term}'.", []
    
    lines = []
    buttons = []
    for a in artifacts[:5]:  # Limit to 5 in summary
        title = escape_html(str(a.get("title", "") or "Untitled"))
        atype = a.get("type", "")
        
        type_str = f" [{atype}]" if atype else ""
        lines.append(f"- {title}{type_str}")
    
    if len(artifacts) > 5:
        lines.append(f"... and {len(artifacts) - 5} more")
    
    buttons.append(("Show all", f"expand:search_artifacts:{term}"))
    return "\n".join(lines), buttons


# =============================================================================
# CONVERSATION CONTEXT
# =============================================================================

MAX_HISTORY = 5


def get_conversation_context(context: ContextTypes.DEFAULT_TYPE) -> str:
    """Get recent conversation for LLM context."""
    history = context.chat_data.get("history", [])
    if not history:
        return ""
    
    lines = []
    for h in history[-3:]:
        lines.append(f"Q: {h['question']}")
        lines.append(f"A: {h['summary']}")
    
    return "Recent conversation:\n" + "\n".join(lines)


def store_in_context(context: ContextTypes.DEFAULT_TYPE, question: str, query_name: str, result_count: int) -> None:
    """Store Q&A for future context."""
    # Create human-readable summary
    summary_map = {
        "recent_activity": f"Showed {result_count} recent sessions",
        "active_quests": f"Listed {result_count} active quests",
        "all_people": f"Listed {result_count} team members",
        "all_projects": f"Listed {result_count} projects",
        "person_projects": f"Showed {result_count} projects",
        "person_sessions": f"Showed {result_count} sessions",
        "quest_details": "Showed quest details",
        "project_details": "Showed project details",
        "search_artifacts": f"Found {result_count} artifacts",
    }
    summary = summary_map.get(query_name, f"Showed {result_count} results")
    
    context.chat_data.setdefault("history", []).append({
        "question": question,
        "query": query_name,
        "summary": summary,
        "ts": time.time()
    })
    
    # Trim old entries
    context.chat_data["history"] = context.chat_data["history"][-MAX_HISTORY:]


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
    },
    "person_quests": {
        "description": "Quests started by or involving a specific person",
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
    "recent_quests": {
        "description": "Recently created or updated quests",
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
                "description": f"The {param} to query for (use lowercase for person names)"
            }
            tool["input_schema"]["required"].append(param)
        tools.append(tool)
    
    # Add respond tool for direct responses
    tools.append({
        "name": "respond_directly",
        "description": "Respond directly without querying. Use for greetings, clarifications, or explaining how Egregore works.",
        "input_schema": {
            "type": "object",
            "properties": {
                "message": {"type": "string", "description": "The response message"}
            },
            "required": ["message"]
        }
    })
    
    return tools


async def agent_decide(question: str, conversation_context: str = "") -> dict:
    """LLM agent decides what tool/query to use."""
    if not ANTHROPIC_API_KEY:
        return {"action": "respond", "message": "API not configured."}

    tools = build_tools_schema()
    
    context_info = ""
    if conversation_context:
        context_info = f"\n\nRecent conversation:\n{conversation_context}\n\nUse context to understand follow-ups like 'which ones' or 'tell me more'."

    system_prompt = f"""You are Egregore, a Telegram bot for Curve Labs.

You have tools to query a Neo4j knowledge graph about:
- Team: oz, ali, cem (always lowercase)
- Quests: ongoing explorations/initiatives  
- Sessions: work logs
- Projects: lace, tristero, infrastructure
- Artifacts: documents, decisions, findings
{context_info}

Pick the right tool based on what the user asks. For follow-up questions, use context to determine parameters.

Examples:
- "Which ones did Cem start?" after listing quests -> query_person_quests with name="cem"
- "Tell me about oz" -> query_person_sessions or query_person_projects
- "What's happening?" -> query_recent_activity"""

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
                    "tools": tools,
                    "messages": [{"role": "user", "content": question}]
                },
                timeout=15
            )
            resp.raise_for_status()
            data = resp.json()
            
            # Check for tool use
            for block in data.get("content", []):
                if block.get("type") == "tool_use":
                    tool_name = block.get("name", "")
                    tool_input = block.get("input", {})
                    logger.info(f"Agent chose: {tool_name} with {tool_input}")
                    
                    if tool_name == "respond_directly":
                        return {"action": "respond", "message": tool_input.get("message", "")}
                    
                    if tool_name.startswith("query_"):
                        query_name = tool_name[6:]
                        return {"action": "query", "query": query_name, "params": tool_input}
            
            # Fallback to text response
            for block in data.get("content", []):
                if block.get("type") == "text":
                    return {"action": "respond", "message": block.get("text", "")}
            
            return {"action": "respond", "message": "I'm not sure how to help with that."}

        except Exception as e:
            logger.error(f"Agent failed: {e}")
            return {"action": "respond", "message": "Something went wrong."}


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
    """Answer general questions about Egregore, with knowledge graph context."""
    if not ANTHROPIC_API_KEY:
        return "I can answer questions about Egregore activity. Try: What's happening?"

    # Fetch some context from the knowledge graph to help answer
    recent_quests = run_query(QUERIES["recent_quests"]["cypher"], {})
    people = run_query(QUERIES["all_people"]["cypher"], {})
    
    graph_context = ""
    if recent_quests or people:
        graph_context = f"""
Current knowledge graph data:
- Team members: {', '.join(p.get('name', '') for p in people if p.get('name'))}
- Recent quests: {json.dumps([{'title': q.get('title'), 'id': q.get('id'), 'started_by': q.get('started_by'), 'status': q.get('status')} for q in recent_quests[:5]], default=str)}
"""

    system_prompt = f"""You are Egregore, a Telegram bot for Curve Labs, a living organization where humans and AI collaborate.

{EGREGORE_CONTEXT}
{graph_context}

CRITICAL FORMATTING RULES:
- This is a Telegram bot. Messages are sent as complete blocks, NOT streamed.
- Do NOT use markdown: no #, ##, **, *, `, ```, or - for lists
- Write in plain text only
- Use short paragraphs separated by blank lines
- Keep responses under 200 words
- Be direct and conversational

If the question is about specific data (quests, people, activity), use the knowledge graph data provided above.
If you don't have enough data to answer specifically, say so briefly and suggest what they could ask instead."""

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


def get_followup_buttons(query_name: str, params: dict = None) -> InlineKeyboardMarkup | None:
    """Get contextual follow-up buttons based on query type."""
    button_map = {
        "recent_activity": [
            ("Active quests", "q:active_quests"),
            ("Team", "q:all_people"),
        ],
        "active_quests": [
            ("All projects", "q:all_projects"),
            ("Recent activity", "q:recent_activity"),
        ],
        "all_people": [
            ("All projects", "q:all_projects"),
            ("Active quests", "q:active_quests"),
        ],
        "all_projects": [
            ("Active quests", "q:active_quests"),
            ("Team", "q:all_people"),
        ],
        "person_projects": [
            ("All projects", "q:all_projects"),
            ("Team", "q:all_people"),
        ],
        "person_sessions": [
            ("Recent activity", "q:recent_activity"),
            ("Team", "q:all_people"),
        ],
        "quest_details": [
            ("All quests", "q:active_quests"),
            ("All projects", "q:all_projects"),
        ],
        "project_details": [
            ("All projects", "q:all_projects"),
            ("Active quests", "q:active_quests"),
        ],
        "search_artifacts": [
            ("Active quests", "q:active_quests"),
            ("All projects", "q:all_projects"),
        ],
    }

    options = button_map.get(query_name)
    if options:
        return make_buttons(options)
    return None


def get_summary_text(query_name: str, results: list, params: dict = None) -> str:
    """Get summary text for a query result."""
    count = len(results)
    params = params or {}
    
    summaries = {
        "recent_activity": f"<b>Recent Activity</b>\n{count} session{'s' if count != 1 else ''} in the last 7 days",
        "active_quests": f"<b>Active Quests</b>\n{count} quest{'s' if count != 1 else ''} currently active",
        "all_people": f"<b>Team</b>\n{count} member{'s' if count != 1 else ''}",
        "all_projects": f"<b>Projects</b>\n{count} project{'s' if count != 1 else ''}",
        "person_projects": f"<b>{params.get('name', 'Person').title()}'s Projects</b>\n{count} project{'s' if count != 1 else ''}",
        "person_sessions": f"<b>{params.get('name', 'Person').title()}'s Sessions</b>\n{count} recent session{'s' if count != 1 else ''}",
        "quest_details": "<b>Quest Details</b>",
        "project_details": "<b>Project Details</b>",
        "search_artifacts": f"<b>Search Results</b>\nFound {count} artifact{'s' if count != 1 else ''} matching '{params.get('term', '')}'",
    }
    
    return summaries.get(query_name, f"<b>Results</b>\n{count} item{'s' if count != 1 else ''}")


def format_results(query_name: str, results: list) -> str:
    """Format results based on query type using Python formatters."""
    formatters = {
        "recent_activity": format_sessions,
        "person_sessions": format_sessions,
        "active_quests": format_quests,
        "all_people": format_people,
        "all_projects": format_projects,
        "person_projects": format_projects,
        "project_details": format_projects,
        "search_artifacts": format_artifacts,
    }
    
    # Special case for quest_details (single result)
    if query_name == "quest_details" and results:
        return format_quest_detail(results[0])
    
    formatter = formatters.get(query_name)
    if formatter:
        return formatter(results)
    
    # Fallback: JSON
    return f"<code>{json.dumps(results, indent=2, default=str)}</code>"


async def generate_activity_summary() -> str:
    """Generate conversational summary of org activity using LLM."""
    # Gather data from multiple sources
    sessions = run_query(QUERIES["recent_activity"]["cypher"], {})
    quests = run_query(QUERIES["active_quests"]["cypher"], {})
    people = run_query(QUERIES["all_people"]["cypher"], {})
    
    # Build rich context for LLM
    data_context = {
        "sessions": [{"person": s.get("person"), "topic": s.get("topic"), "summary": s.get("summary"), "date": str(s.get("date"))} for s in sessions],
        "active_quests": [{"title": q.get("title"), "id": q.get("id"), "started_by": q.get("started_by"), "projects": q.get("projects")} for q in quests],
        "team": [{"name": p.get("name"), "projects": p.get("projects")} for p in people],
    }
    
    # Generate conversational summary (no buttons)
    summary = await generate_semantic_summary("activity", data_context)
    return summary


async def generate_person_summary(person: str) -> str:
    """Generate conversational summary of what a person is working on."""
    # Gather data
    sessions = run_query(QUERIES["person_sessions"]["cypher"], {"name": person})
    projects = run_query(QUERIES["person_projects"]["cypher"], {"name": person})
    
    # Build context
    data_context = {
        "person": person,
        "sessions": [{"topic": s.get("topic"), "summary": s.get("summary"), "date": str(s.get("date"))} for s in sessions],
        "projects": [{"name": p.get("project"), "domain": p.get("domain"), "role": p.get("role")} for p in projects],
    }
    
    # Generate conversational summary (no buttons)
    summary = await generate_semantic_summary("person", data_context)
    return summary


async def generate_semantic_summary(context_type: str, data: dict) -> str:
    """Use LLM to generate conversational summary from structured data."""
    if not ANTHROPIC_API_KEY:
        return "Summary not available (no API key)."
    
    if context_type == "activity":
        prompt = f"""You are summarizing recent activity for Curve Labs (also called Egregore), a venture lab for relational technologies.

Data from the knowledge graph:
- Recent work sessions: {json.dumps(data.get('sessions', []), default=str)}
- Active quests (ongoing explorations): {json.dumps(data.get('active_quests', []), default=str)}
- Team members: {json.dumps(data.get('team', []), default=str)}

Write a conversational summary of what the org is working on. Structure it like this:

First paragraph: What's the main focus right now? Who's doing what?

Second paragraph: What other initiatives or quests are active?

Third paragraph: End with an inviting question about what they'd like to explore.

Rules:
- No markdown, no bullets, no special formatting
- Use blank lines between paragraphs
- Plain conversational text like you're chatting with a colleague
- Be specific about actual work, quests, and people
- Around 100-150 words total"""
    
    elif context_type == "person":
        person = data.get("person", "unknown")
        prompt = f"""You are summarizing what {person} has been working on at Curve Labs.

Data:
- Recent sessions: {json.dumps(data.get('sessions', []), default=str)}
- Projects: {json.dumps(data.get('projects', []), default=str)}

Write a conversational summary of their recent work.

First paragraph: What have they been focused on recently?

Second paragraph: What projects do they work on, and what's their role?

End with an inviting question.

Rules:
- No markdown, no bullets, no formatting
- Use blank lines between paragraphs
- Plain conversational text
- Be specific about actual work
- Around 80-100 words"""
    
    else:
        return "Unknown context type."
    
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
                    "messages": [{"role": "user", "content": prompt}]
                },
                timeout=15
            )
            resp.raise_for_status()
            return resp.json()["content"][0]["text"].strip()
        except Exception as e:
            logger.error(f"Semantic summary failed: {e}")
            return "Could not generate summary."


async def send_progressive_response(msg, query_name: str, results: list, params: dict = None) -> None:
    """Send semantic conversational response."""
    params = params or {}
    
    # Activity: Generate conversational summary (no buttons, just chat)
    if query_name == "recent_activity":
        summary = await generate_activity_summary()
        await msg.reply_text(summary)
        return
    
    # Quests: Conversational + list
    elif query_name == "active_quests":
        count = len(results)
        quest_names = [q.get("title") or q.get("id") for q in results[:3]]
        intro = f"There are {count} active quests: {', '.join(quest_names)}"
        if count > 3:
            intro += f" and {count - 3} more"
        intro += ". Which one interests you?"
        
        buttons = []
        for q in results[:4]:
            qid = q.get("id", "")
            title = q.get("title", qid)
            short = title[:12] + "..." if len(title) > 12 else title
            buttons.append((short, f"quest:{qid}"))
        buttons.append(("All details", "expand:active_quests"))
        
        await msg.reply_text(intro, reply_markup=make_inline_buttons(buttons))
        return
    
    # People: Conversational list
    elif query_name == "all_people":
        names = [p.get("name") for p in results if p.get("name")]
        intro = f"The team has {len(names)} members: {', '.join(names)}. Who would you like to know about?"
        
        buttons = [(name, f"person:{name}") for name in names[:4]]
        await msg.reply_text(intro, reply_markup=make_inline_buttons(buttons))
        return
    
    # Projects: Conversational list
    elif query_name == "all_projects":
        proj_names = [p.get("name") for p in results if p.get("name")]
        intro = f"We have {len(proj_names)} projects: {', '.join(proj_names)}. Which one?"
        
        buttons = [(name, f"project:{name}") for name in proj_names[:4]]
        await msg.reply_text(intro, reply_markup=make_inline_buttons(buttons))
        return
    
    # Search: Show results conversationally
    elif query_name == "search_artifacts":
        term = params.get("term", "")
        count = len(results)
        if count == 0:
            await msg.reply_text(f"No artifacts found matching '{term}'.")
            return
        titles = [a.get("title") for a in results[:3]]
        intro = f"Found {count} artifacts matching '{term}': {', '.join(titles)}"
        if count > 3:
            intro += f" and {count - 3} more"
        await msg.reply_text(intro)
        return
    
    # Person's quests: Conversational
    elif query_name == "person_quests":
        person = params.get("name", "someone")
        count = len(results)
        if count == 0:
            await msg.reply_text(f"No quests found started by {person}.")
            return
        
        lines = [f"{person.title()} has started {count} quest{'s' if count != 1 else ''}:"]
        lines.append("")
        for q in results:
            title = q.get("title") or q.get("id", "Untitled")
            status = q.get("status", "")
            question = q.get("question", "")
            line = f"{title}"
            if status:
                line += f" ({status})"
            lines.append(line)
            if question:
                lines.append(f"  {question[:80]}{'...' if len(str(question)) > 80 else ''}")
            lines.append("")
        
        await msg.reply_text("\n".join(lines))
        return
    
    # Recent quests: Conversational
    elif query_name == "recent_quests":
        count = len(results)
        if count == 0:
            await msg.reply_text("No quests found.")
            return
        
        lines = [f"Here are the {count} most recent quests:"]
        lines.append("")
        for q in results:
            title = q.get("title") or q.get("id", "Untitled")
            by = q.get("started_by", "")
            status = q.get("status", "")
            line = f"{title}"
            if by:
                line += f" (by {by})"
            if status:
                line += f" [{status}]"
            lines.append(line)
        
        lines.append("")
        lines.append("Which one interests you?")
        await msg.reply_text("\n".join(lines))
        return
    
    # Fallback to detailed view
    await send_full_response(msg, query_name, results, params)


async def send_full_response(msg, query_name: str, results: list, params: dict = None) -> None:
    """Send full detailed response (legacy behavior for specific queries)."""
    params = params or {}
    
    # Header
    summary = get_summary_text(query_name, results, params)
    await msg.reply_text(summary, parse_mode=ParseMode.HTML)
    
    # Details
    if results:
        details = format_results(query_name, results)
        details = truncate_message(details)
        
        try:
            await msg.reply_text(details, parse_mode=ParseMode.HTML)
        except Exception as e:
            logger.warning(f"HTML parsing failed: {e}")
            import re
            plain = re.sub(r'<[^>]+>', '', details)
            await msg.reply_text(plain)
    
    # Follow-up buttons
    buttons = get_followup_buttons(query_name, params)
    if buttons:
        await msg.reply_text("What else?", reply_markup=buttons)


# Alias for backward compatibility
send_formatted_response = send_progressive_response


async def handle_question(update: Update, context: ContextTypes.DEFAULT_TYPE, question: str, message=None) -> None:
    """Main question handler - agent decides what to do."""
    msg = message or update.message

    if not NEO4J_URI:
        await msg.reply_text("Knowledge graph not configured. Contact admin.")
        return

    # Get conversation context for follow-ups
    conv_context = get_conversation_context(context)

    # Agent decides what to do (tool use)
    decision = await agent_decide(question, conv_context)
    
    action = decision.get("action")
    
    if action == "respond":
        # Direct response from agent
        response = decision.get("message", "")
        await msg.reply_text(response)
        return
    
    if action == "query":
        query_name = decision.get("query")
        params = decision.get("params", {})
        
        if query_name not in QUERIES:
            await msg.reply_text("I couldn't find that information.")
            return
        
        # Run the query
        cypher = QUERIES[query_name]["cypher"]
        logger.info(f"Running query: {query_name} with params: {params}")
        
        results = run_query(cypher, params)
        
        if not results:
            # Give helpful response instead of generic error
            await msg.reply_text(f"No results found for that query. The data might not exist yet.")
            return
        
        # Send response
        await send_progressive_response(msg, query_name, results, params)
        
        # Store in context for follow-ups
        store_in_context(context, question, query_name, len(results))
        return
    
    # Fallback
    await msg.reply_text("I'm not sure how to help with that. Try asking about activity, quests, or team members.")


async def handle_person_drilldown(msg, person: str, action: str = "summary") -> None:
    """Handle drill-down into a specific person."""
    if action == "sessions":
        # Show person's sessions (detailed)
        results = run_query(QUERIES["person_sessions"]["cypher"], {"name": person})
        if results:
            text = f"<b>{person.title()}'s Sessions</b>\n\n"
            text += format_sessions(results)
            buttons = [
                ("Projects", f"person:{person}:projects"),
                ("Back", f"person:{person}"),
            ]
            await msg.reply_text(text, parse_mode=ParseMode.HTML, reply_markup=make_inline_buttons(buttons))
        else:
            await msg.reply_text(f"No sessions found for {person}.")
    
    elif action == "projects":
        # Show person's projects (detailed)
        results = run_query(QUERIES["person_projects"]["cypher"], {"name": person})
        if results:
            text = f"<b>{person.title()}'s Projects</b>\n\n"
            text += format_projects(results)
            buttons = [
                ("Sessions", f"person:{person}:sessions"),
                ("Back", f"person:{person}"),
            ]
            await msg.reply_text(text, parse_mode=ParseMode.HTML, reply_markup=make_inline_buttons(buttons))
        else:
            await msg.reply_text(f"No projects found for {person}.")
    
    else:  # summary - use conversational LLM summary
        summary = await generate_person_summary(person)
        await msg.reply_text(summary)


async def handle_quest_drilldown(msg, quest_id: str) -> None:
    """Handle drill-down into a specific quest."""
    results = run_query(QUERIES["quest_details"]["cypher"], {"quest_id": quest_id})
    if results:
        text = format_quest_detail(results[0])
        buttons = [
            ("All quests", "q:active_quests"),
            ("Projects", "q:all_projects"),
        ]
        await msg.reply_text(text, parse_mode=ParseMode.HTML, reply_markup=make_inline_buttons(buttons))
    else:
        await msg.reply_text(f"Quest '{quest_id}' not found.", parse_mode=ParseMode.HTML)


async def handle_project_drilldown(msg, project_name: str) -> None:
    """Handle drill-down into a specific project."""
    results = run_query(QUERIES["project_details"]["cypher"], {"name": project_name})
    if results:
        text = format_projects(results)
        buttons = [
            ("All projects", "q:all_projects"),
            ("Quests", "q:active_quests"),
        ]
        await msg.reply_text(text, parse_mode=ParseMode.HTML, reply_markup=make_inline_buttons(buttons))
    else:
        await msg.reply_text(f"Project '{project_name}' not found.", parse_mode=ParseMode.HTML)


async def handle_expand(msg, query_name: str, extra: str = "") -> None:
    """Handle 'Show all' expansion to full list view."""
    if query_name == "search_artifacts" and extra:
        results = run_query(QUERIES["search_artifacts"]["cypher"], {"term": extra})
        text = f"<b>Search Results</b>\nAll artifacts matching '{extra}':\n\n"
        text += format_artifacts(results) if results else "No results."
    elif query_name in QUERIES:
        results = run_query(QUERIES[query_name]["cypher"], {})
        formatters = {
            "recent_activity": ("Recent Activity (Full)", format_sessions),
            "active_quests": ("Active Quests (Full)", format_quests),
            "all_people": ("Team (Full)", format_people),
            "all_projects": ("Projects (Full)", format_projects),
        }
        title, formatter = formatters.get(query_name, ("Results", lambda x: str(x)))
        text = f"<b>{title}</b>\n\n"
        text += formatter(results) if results else "No results."
    else:
        text = "Unknown query."
    
    text = truncate_message(text)
    buttons = [("Back", f"q:{query_name}")]
    
    try:
        await msg.reply_text(text, parse_mode=ParseMode.HTML, reply_markup=make_inline_buttons(buttons))
    except Exception as e:
        logger.warning(f"HTML parsing failed: {e}")
        import re
        plain = re.sub(r'<[^>]+>', '', text)
        await msg.reply_text(plain, reply_markup=make_inline_buttons(buttons))


async def handle_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle inline button presses with progressive disclosure."""
    query = update.callback_query
    await query.answer()  # Acknowledge the button press

    if not is_allowed(update):
        return

    data = query.data
    logger.info(f"Callback data: {data}")

    # Handle person drill-down (person:name or person:name:action)
    if data.startswith("person:"):
        parts = data.split(":")
        person = parts[1]
        action = parts[2] if len(parts) > 2 else "summary"
        await handle_person_drilldown(query.message, person, action)
        return

    # Handle quest drill-down (quest:id)
    if data.startswith("quest:"):
        quest_id = data.split(":")[1]
        await handle_quest_drilldown(query.message, quest_id)
        return

    # Handle project drill-down (project:name)
    if data.startswith("project:"):
        project_name = data.split(":")[1]
        await handle_project_drilldown(query.message, project_name)
        return

    # Handle expand (expand:query_name or expand:query_name:extra)
    if data.startswith("expand:"):
        parts = data.split(":")
        query_name = parts[1]
        extra = parts[2] if len(parts) > 2 else ""
        await handle_expand(query.message, query_name, extra)
        return

    # Handle query shortcuts (q:query_name) - now uses progressive response
    if data.startswith("q:"):
        query_name = data[2:]
        if query_name in QUERIES:
            # Run query and send progressive response
            results = run_query(QUERIES[query_name]["cypher"], {})
            if results:
                await send_progressive_response(query.message, query_name, results, {})
            else:
                await query.message.reply_text("No results found.", parse_mode=ParseMode.HTML)
            return

    # Legacy fallback
    logger.warning(f"Unknown callback data: {data}")


# =============================================================================
# TELEGRAM HANDLERS
# =============================================================================

async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /start command."""
    if not is_allowed(update):
        await update.message.reply_text(
            escape_html("This bot is private to Egregore."),
            parse_mode=ParseMode.HTML
        )
        return

    welcome_text = """<b>Welcome to Egregore</b>

Ask me anything about our work:

• What's happening?
• What is Oz working on?
• What quests are active?
• Tell me about FAMP
• Who's on the team?

Or ask how to use Egregore (commands, adding artifacts, etc.)"""

    buttons = make_buttons([
        ("What's happening?", "q:recent_activity"),
        ("Active quests", "q:active_quests"),
        ("Team", "q:all_people"),
    ])

    await update.message.reply_text(
        welcome_text,
        parse_mode=ParseMode.HTML,
        reply_markup=buttons
    )


async def activity_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /activity command."""
    if not is_allowed(update):
        return
    await handle_question(update, context, "What's been happening recently?")


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

    await handle_question(update, context, text)


# =============================================================================
# MAIN
# =============================================================================

def main() -> None:
    """Start the bot."""
    app = Application.builder().token(BOT_TOKEN).build()

    app.add_handler(CommandHandler("start", start_command))
    app.add_handler(CommandHandler("activity", activity_command))
    app.add_handler(CallbackQueryHandler(handle_callback))
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
