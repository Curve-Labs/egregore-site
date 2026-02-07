"""Setup token storage with TTL.

Tokens are one-time-use, expire after 10 minutes by default.
Stores everything the npx installer needs to clone and configure.
"""

import secrets
import time


_tokens: dict[str, dict] = {}


def create_token(data: dict, ttl: int = 600) -> str:
    """Create a setup token. Returns 'st_xxxx' string."""
    token_id = f"st_{secrets.token_hex(12)}"
    _tokens[token_id] = {
        "data": data,
        "expires": time.time() + ttl,
    }
    _cleanup()
    return token_id


def claim_token(token: str) -> dict | None:
    """Claim and consume a setup token. Returns data or None."""
    _cleanup()
    entry = _tokens.pop(token, None)
    if not entry:
        return None
    if time.time() > entry["expires"]:
        return None
    return entry["data"]


def _cleanup():
    """Remove expired tokens."""
    now = time.time()
    expired = [k for k, v in _tokens.items() if now > v["expires"]]
    for k in expired:
        del _tokens[k]
