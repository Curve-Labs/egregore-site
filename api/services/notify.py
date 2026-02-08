import httpx

from .graph import execute_query


async def send_message(org: dict, to: str, message: str) -> dict:
    """Send a message to a person by name. DMs if telegramId exists, falls back to group."""
    bot_token = org.get("telegram_bot_token", "")
    chat_id = org.get("telegram_chat_id", "")

    if not bot_token:
        return {"status": "error", "detail": "No Telegram bot token configured for this org"}

    # Look up telegramId from Neo4j
    tid = await lookup_telegram_id(org, to)

    if tid:
        return await _send_telegram(bot_token, tid, message)
    elif chat_id:
        return await _send_telegram(bot_token, chat_id, f"@{to}: {message}")
    else:
        return {"status": "error", "detail": f"No Telegram ID for {to} and no group chat configured"}


async def send_group(org: dict, message: str) -> dict:
    """Send a message to the org's group chat."""
    bot_token = org.get("telegram_bot_token", "")
    chat_id = org.get("telegram_chat_id", "")

    if not bot_token:
        return {"status": "error", "detail": "No Telegram bot token configured"}
    if not chat_id:
        return {"status": "error", "detail": "No group chat configured"}

    return await _send_telegram(bot_token, chat_id, message)


async def test_notify(org: dict) -> dict:
    """Test Telegram connectivity."""
    bot_token = org.get("telegram_bot_token", "")
    if not bot_token:
        return {"status": "error", "detail": "No Telegram bot token configured"}

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://api.telegram.org/bot{bot_token}/getMe",
                timeout=10.0,
            )
        data = response.json()
        if data.get("ok"):
            return {"status": "ok", "bot": data["result"]["username"]}
        return {"status": "error", "detail": data.get("description", "unknown")}
    except Exception as e:
        return {"status": "error", "detail": str(e)}


async def lookup_telegram_id(org: dict, name: str) -> str | None:
    """Look up a person's Telegram ID from Neo4j."""
    result = await execute_query(
        org,
        "MATCH (p:Person {name: $name}) RETURN p.telegramId AS tid",
        {"name": name},
    )
    try:
        values = result.get("values", [])
        if values and values[0] and values[0][0]:
            return str(values[0][0])
    except (IndexError, KeyError, TypeError):
        pass
    return None


def generate_bot_invite_link(org_slug: str, bot_username: str = "Egregore_clbot") -> str:
    """Generate a Telegram invite link that auto-connects the bot to a group."""
    return f"https://t.me/{bot_username}?startgroup=org_{org_slug}"


async def create_group_invite_link(org: dict) -> str | None:
    """Generate a one-time Telegram group invite link for an org's chat.

    Uses createChatInviteLink Bot API. Returns the invite link string or None.
    """
    bot_token = org.get("telegram_bot_token", "")
    chat_id = org.get("telegram_chat_id", "")

    if not bot_token or not chat_id:
        return None

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"https://api.telegram.org/bot{bot_token}/createChatInviteLink",
                json={
                    "chat_id": chat_id,
                    "member_limit": 1,
                    "name": "Egregore invite",
                },
                timeout=10.0,
            )
        data = response.json()
        if data.get("ok"):
            return data["result"]["invite_link"]
        return None
    except Exception:
        return None


async def _send_telegram(bot_token: str, chat_id: str, text: str) -> dict:
    """Send a Telegram message."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"https://api.telegram.org/bot{bot_token}/sendMessage",
            json={
                "chat_id": chat_id,
                "text": text,
                "parse_mode": "Markdown",
            },
            timeout=10.0,
        )

    data = response.json()
    if data.get("ok"):
        return {"status": "sent"}
    return {"status": "error", "detail": data.get("description", "unknown")}
