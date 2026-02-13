"""Setup token storage with TTL.

Tokens are one-time-use, expire after 10 minutes by default.
Stores everything the npx installer needs to clone and configure.

When USE_SUPABASE=true, tokens are persisted to Supabase (survive restarts).
Otherwise falls back to in-memory storage.
"""

import os
import secrets
import time
import logging

logger = logging.getLogger(__name__)

USE_SUPABASE = os.environ.get("USE_SUPABASE", "false").lower() == "true"

# In-memory fallback
_tokens: dict[str, dict] = {}


def create_token(data: dict, ttl: int = 600) -> str:
    """Create a setup token. Returns 'st_xxxx' string."""
    if USE_SUPABASE:
        try:
            from .supabase import create_setup_token
            return create_setup_token(data, ttl)
        except Exception as e:
            logger.warning(f"Supabase token create failed, using memory: {e}")

    token_id = f"st_{secrets.token_hex(12)}"
    _tokens[token_id] = {
        "data": data,
        "expires": time.time() + ttl,
    }
    _cleanup()
    return token_id


def claim_token(token: str) -> dict | None:
    """Claim and consume a setup token. Returns data or None."""
    if USE_SUPABASE:
        try:
            from .supabase import claim_setup_token
            return claim_setup_token(token)
        except Exception as e:
            logger.warning(f"Supabase token claim failed, checking memory: {e}")

    _cleanup()
    entry = _tokens.pop(token, None)
    if not entry:
        return None
    if time.time() > entry["expires"]:
        return None
    return entry["data"]


def peek_token(token: str) -> dict | None:
    """Read a token's data WITHOUT consuming it. Returns data or None."""
    if USE_SUPABASE:
        try:
            from .supabase import peek_setup_token
            return peek_setup_token(token)
        except Exception as e:
            logger.warning(f"Supabase token peek failed, checking memory: {e}")

    _cleanup()
    entry = _tokens.get(token)
    if not entry:
        return None
    if time.time() > entry["expires"]:
        return None
    return entry["data"]


def create_invite_token(data: dict, ttl: int = 604800) -> str:
    """Create an invite token (7-day TTL by default). Returns 'inv_xxxx' string."""
    if USE_SUPABASE:
        try:
            from .supabase import create_invite_token as sb_create_invite
            return sb_create_invite(data, ttl)
        except Exception as e:
            logger.warning(f"Supabase invite token create failed, using memory: {e}")

    token_id = f"inv_{secrets.token_hex(12)}"
    _tokens[token_id] = {
        "data": data,
        "expires": time.time() + ttl,
    }
    _cleanup()
    return token_id


def _cleanup():
    """Remove expired tokens."""
    now = time.time()
    expired = [k for k, v in _tokens.items() if now > v["expires"]]
    for k in expired:
        del _tokens[k]
