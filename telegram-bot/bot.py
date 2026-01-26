"""
Egregore Activity Bot

A Telegram bot that answers natural language queries about team activity
and explains how to use the Egregore collaboration system.
Uses LLM to understand questions and generate contextual responses.

Deploy to Railway with webhook mode for production.
"""

import os
import json
import base64
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from dotenv import load_dotenv
load_dotenv(override=False)  # Don't override Railway env vars

import httpx

# Debug: Log all env vars at startup (masked)
import logging
logging.basicConfig(level=logging.INFO)
_startup_logger = logging.getLogger("startup")
_startup_logger.info("=== Environment Variables at Startup ===")
for key in ["TELEGRAM_BOT_TOKEN", "REPO_KEY", "GH_TOKEN", "GITHUB_TOKEN", "ANTHROPIC_API_KEY", "WEBHOOK_URL", "PORT", "ALLOWED_CHAT_IDS"]:
    val = os.environ.get(key, "")
    masked = f"{val[:4]}...{val[-4:]}" if len(val) > 8 else ("SET" if val else "NOT SET")
    _startup_logger.info(f"  {key}: {masked}")
_startup_logger.info("=========================================")
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes

# Config
BOT_TOKEN = os.environ["TELEGRAM_BOT_TOKEN"]
GITHUB_TOKEN = os.environ.get("REPO_KEY", "") or os.environ.get("GH_TOKEN", "") or os.environ.get("GITHUB_TOKEN", "")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")

# Webhook config for Railway
WEBHOOK_URL = os.environ.get("WEBHOOK_URL", "")  # e.g., https://your-app.railway.app
PORT = int(os.environ.get("PORT", 8443))

# Security: Only respond to allowed chats/users
# Channel: -1003081443167, Oz: 154132702
# Can override via env: ALLOWED_CHAT_IDS=123,456,789
DEFAULT_ALLOWED_CHATS = [-1003081443167, 154132702]
ALLOWED_CHAT_IDS = [
    int(x) for x in os.environ.get("ALLOWED_CHAT_IDS", "").split(",") if x.strip()
] or DEFAULT_ALLOWED_CHATS

# GitHub API URL for private repo access
GITHUB_API_URL = "https://api.github.com/repos/Curve-Labs/curve-labs-memory/contents/activity.json"

# Memory management: only load events from last N days
MAX_ACTIVITY_DAYS = 14

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def is_allowed_chat(update: Update) -> bool:
    """Check if the chat is in the allowed list."""
    chat_id = update.effective_chat.id
    user_id = update.effective_user.id if update.effective_user else None

    # Allow if chat OR user is in the allowed list
    return chat_id in ALLOWED_CHAT_IDS or user_id in ALLOWED_CHAT_IDS


async def fetch_activity() -> dict:
    """Fetch activity.json from GitHub API (works with private repos)."""
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "CurveLabsActivityBot"
    }

    logger.info(f"GITHUB_TOKEN present: {bool(GITHUB_TOKEN)}")
    logger.info(f"GITHUB_TOKEN length: {len(GITHUB_TOKEN) if GITHUB_TOKEN else 0}")

    if GITHUB_TOKEN:
        headers["Authorization"] = f"token {GITHUB_TOKEN}"

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(GITHUB_API_URL, headers=headers, timeout=10)
            logger.info(f"GitHub API response status: {resp.status_code}")
            resp.raise_for_status()

            data = resp.json()
            content = base64.b64decode(data["content"]).decode("utf-8")
            return json.loads(content)
        except httpx.HTTPStatusError as e:
            logger.error(f"GitHub API HTTP error: {e.response.status_code} - {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"GitHub API error: {type(e).__name__}: {e}")
            raise


def filter_recent(events: list, days: int = MAX_ACTIVITY_DAYS) -> list:
    """Filter events from the last N days."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    recent = []
    for e in events:
        ts_str = e.get("timestamp", "")
        try:
            ts = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
            if ts > cutoff:
                recent.append(e)
        except (ValueError, TypeError):
            continue
    return recent


def format_events_for_llm(events: list) -> str:
    """Format events as context for LLM."""
    lines = []
    for e in events:
        event_type = e.get("type", "unknown")
        author = e.get("author", "Unknown")
        timestamp = e.get("timestamp", "")[:10]  # Just date
        project = e.get("project", "")

        if event_type == "handoff":
            topic = e.get("topic", "untitled")
            lines.append(f"- {timestamp}: {author} handed off on {project}: {topic}")
        elif event_type == "save":
            repos = e.get("repos", [])
            lines.append(f"- {timestamp}: {author} saved changes to {', '.join(repos)}")
        elif event_type == "decision":
            title = e.get("title", "untitled")
            lines.append(f"- {timestamp}: {author} made decision: {title}")
        elif event_type == "finding":
            title = e.get("title", "untitled")
            lines.append(f"- {timestamp}: {author} found: {title}")
        else:
            summary = e.get("summary", e.get("topic", event_type))
            lines.append(f"- {timestamp}: {author}: {summary}")

    return "\n".join(lines)


EGREGORE_CONTEXT = """Egregore is a collaborative intelligence system where humans and AI agents share knowledge.

Key concepts:
- Artifacts: content (sources, thoughts, findings, decisions) stored in memory/artifacts/
- Quests: open-ended explorations that artifacts link to
- Projects: tristero, lace, infrastructure - quests link to these

How to add something:
1. Open Claude Code in egregore folder
2. Run /add (for a thought) or /add https://... (for a source)
3. System suggests which quest to link it to
4. Run /save to push

Commands: /add, /quest, /quest new, /project, /activity, /save

The flow: /add -> tag to quest -> /save -> team sees on /activity"""


async def ask_llm(question: str, activity_context: str) -> str:
    """Ask Claude to answer question based on activity context."""
    if not ANTHROPIC_API_KEY:
        return None

    system_prompt = f"""You are Egregore, a living organization where humans and AI agents collaborate.

You know about:
{EGREGORE_CONTEXT}

Answer questions conversationally. Only share what's relevant to the question asked.

Examples:
- "How do I add something?" -> Explain /add command briefly
- "What's a quest?" -> Explain quests briefly
- "What has Oz been doing?" -> Summarize from activity context

Guidelines:
- Be concise and direct - answer the specific question
- Do not dump all information at once
- Do not use emojis
- If you don't know, say so"""

    user_prompt = f"""Recent Egregore activity (last {MAX_ACTIVITY_DAYS} days):

{activity_context}

Question: {question}"""

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
                    "messages": [
                        {"role": "user", "content": user_prompt}
                    ]
                },
                timeout=30
            )
            resp.raise_for_status()
            data = resp.json()
            return data["content"][0]["text"]
        except Exception as e:
            logger.error(f"LLM request failed: {e}")
            return None


def format_simple_activity(events: list, hours: int = 24) -> str:
    """Simple activity format (fallback when LLM unavailable)."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    recent = []
    for e in events:
        ts_str = e.get("timestamp", "")
        try:
            ts = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
            if ts > cutoff:
                recent.append(e)
        except (ValueError, TypeError):
            continue

    if not recent:
        period = "24 hours" if hours == 24 else f"{hours // 24} days"
        return f"No activity in the last {period}."

    period = "24 hours" if hours == 24 else f"{hours // 24} days"
    lines = [f"Egregore - Last {period}:\n"]

    for event in reversed(recent[-10:]):
        event_type = event.get("type", "unknown")
        author = event.get("author", "Unknown")

        if event_type == "handoff":
            topic = event.get("topic", "untitled")
            lines.append(f"- {author} handed off: {topic}")
        elif event_type == "save":
            repos = event.get("repos", [])
            lines.append(f"- {author} saved to {', '.join(repos)}")
        elif event_type == "decision":
            title = event.get("title", "untitled")
            lines.append(f"- {author} decided: {title}")
        elif event_type == "finding":
            title = event.get("title", "untitled")
            lines.append(f"- {author} found: {title}")
        else:
            summary = event.get("summary", event_type)
            lines.append(f"- {author}: {summary}")

    return "\n".join(lines)


async def handle_query(update: Update, query: str, fallback_hours: int = 24) -> None:
    """Handle a natural language query about activity."""
    try:
        data = await fetch_activity()
        events = data.get("events", [])
        recent = filter_recent(events, days=MAX_ACTIVITY_DAYS)

        if not recent:
            await update.message.reply_text("No recent activity to report.")
            return

        # Try LLM-powered response
        activity_context = format_events_for_llm(recent)
        llm_response = await ask_llm(query, activity_context)

        if llm_response:
            await update.message.reply_text(llm_response)
        else:
            # Fallback to simple format
            simple_response = format_simple_activity(events, hours=fallback_hours)
            await update.message.reply_text(simple_response)

    except httpx.HTTPError as e:
        logger.error(f"Failed to fetch activity: {e}")
        await update.message.reply_text("Couldn't fetch activity. Try again later.")
    except Exception as e:
        logger.error(f"Error: {e}")
        if update.message:
            await update.message.reply_text("Something went wrong.")


async def activity_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /activity command."""
    if not is_allowed_chat(update):
        logger.warning(f"Unauthorized access attempt from chat {update.effective_chat.id}")
        return
    await handle_query(update, "What's been happening in the last 24 hours?")


async def week_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /week command."""
    if not is_allowed_chat(update):
        logger.warning(f"Unauthorized access attempt from chat {update.effective_chat.id}")
        return
    await handle_query(update, "Summarize activity from the last week.", fallback_hours=168)


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle any text message as a natural language query."""
    if not update.message or not update.message.text:
        return

    if not is_allowed_chat(update):
        return  # Silently ignore unauthorized chats

    text = update.message.text.strip()

    # Skip if it looks like it's not meant for the bot
    # (In group chats, only respond if mentioned or replied to)
    chat_type = update.effective_chat.type
    if chat_type in ["group", "supergroup"]:
        # Only respond if bot is mentioned or message is a reply to bot
        bot_username = context.bot.username
        if f"@{bot_username}" not in text and not (
            update.message.reply_to_message and
            update.message.reply_to_message.from_user.id == context.bot.id
        ):
            return
        # Remove bot mention from query
        text = text.replace(f"@{bot_username}", "").strip()

    if not text:
        return

    await handle_query(update, text)


async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /start command."""
    if not is_allowed_chat(update):
        await update.message.reply_text("This bot is private to Egregore.")
        return
    await update.message.reply_text(
        "I'm Egregore. Ask me anything:\n\n"
        "- What's been happening?\n"
        "- What's Oz working on?\n"
        "- How do I add something?\n"
        "- What's a quest?\n\n"
        "/activity - Last 24 hours\n"
        "/week - Last 7 days"
    )


def main() -> None:
    """Start the bot."""
    app = Application.builder().token(BOT_TOKEN).build()

    app.add_handler(CommandHandler("start", start_command))
    app.add_handler(CommandHandler("activity", activity_command))
    app.add_handler(CommandHandler("week", week_command))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    if WEBHOOK_URL:
        # Webhook mode for Railway/production
        logger.info(f"Starting webhook on port {PORT}")
        app.run_webhook(
            listen="0.0.0.0",
            port=PORT,
            url_path=BOT_TOKEN,
            webhook_url=f"{WEBHOOK_URL}/{BOT_TOKEN}"
        )
    else:
        # Polling mode for local development
        logger.info("Starting polling mode...")
        app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
