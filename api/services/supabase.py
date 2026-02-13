"""Supabase client for admin/platform operations.

Replaces Neo4j for org management, API key validation, tokens, and user management.
Neo4j remains the knowledge graph — this module handles everything else.
"""

import os
import hashlib
import secrets
import time
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from supabase import create_client, Client

logger = logging.getLogger(__name__)

_client: Optional[Client] = None


def get_client() -> Client:
    """Get or create the Supabase client singleton."""
    global _client
    if _client is None:
        url = os.environ.get("SUPABASE_URL", "")
        key = os.environ.get("SUPABASE_SERVICE_KEY", "")
        if not url or not key:
            raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")
        _client = create_client(url, key)
    return _client


def _hash_key(api_key: str) -> str:
    """SHA-256 hash an API key for storage."""
    return hashlib.sha256(api_key.encode()).hexdigest()


def _key_prefix(api_key: str) -> str:
    """Extract prefix from API key for lookup: ek_slug_first8."""
    parts = api_key.split("_")
    if len(parts) >= 3:
        return f"ek_{parts[1]}_{parts[2][:8]}"
    return api_key[:20]


# =============================================================================
# ORG OPERATIONS
# =============================================================================


def get_org_by_slug(slug: str) -> Optional[dict]:
    """Get org by slug. Returns None if not found."""
    result = get_client().table("orgs").select("*").eq("slug", slug).execute()
    if result.data:
        return result.data[0]
    return None


def list_orgs() -> list[dict]:
    """List all orgs."""
    result = get_client().table("orgs").select("*").execute()
    return result.data or []


def create_org(
    slug: str,
    name: str,
    github_org: str,
    neo4j_host: str = "",
    neo4j_user: str = "neo4j",
    neo4j_password: str = "",
    telegram_chat_id: Optional[str] = None,
    created_by: Optional[str] = None,
) -> dict:
    """Create a new org. Returns the created org row."""
    data = {
        "slug": slug,
        "name": name,
        "github_org": github_org,
        "neo4j_host": neo4j_host,
        "neo4j_user": neo4j_user,
        "neo4j_password": neo4j_password,
        "created_by": created_by,
    }
    if telegram_chat_id:
        data["telegram_chat_id"] = telegram_chat_id

    result = get_client().table("orgs").upsert(data, on_conflict="slug").execute()
    return result.data[0] if result.data else data


def update_org(slug: str, **fields) -> Optional[dict]:
    """Update org fields. Returns updated row or None."""
    if not fields:
        return None
    result = get_client().table("orgs").update(fields).eq("slug", slug).execute()
    return result.data[0] if result.data else None


# =============================================================================
# API KEY OPERATIONS
# =============================================================================


def create_api_key(org_slug: str, api_key: str) -> dict:
    """Store a new API key (hashed). Returns the row (without the hash)."""
    data = {
        "org_slug": org_slug,
        "key_prefix": _key_prefix(api_key),
        "key_hash": _hash_key(api_key),
        "is_active": True,
    }
    result = get_client().table("api_keys").insert(data).execute()
    return result.data[0] if result.data else data


def validate_api_key(api_key: str) -> Optional[dict]:
    """Validate an API key against stored hashes.

    Returns the org row if valid, None if invalid.
    Uses prefix lookup + hash comparison for security.
    """
    prefix = _key_prefix(api_key)
    key_hash = _hash_key(api_key)

    # Look up by prefix (fast index scan), then verify hash
    result = (
        get_client()
        .table("api_keys")
        .select("org_slug, key_hash")
        .eq("key_prefix", prefix)
        .eq("is_active", True)
        .execute()
    )

    for row in result.data or []:
        if secrets.compare_digest(row["key_hash"], key_hash):
            return get_org_by_slug(row["org_slug"])

    return None


def revoke_api_key(org_slug: str) -> None:
    """Revoke all active API keys for an org."""
    get_client().table("api_keys").update(
        {"is_active": False, "revoked_at": datetime.now(timezone.utc).isoformat()}
    ).eq("org_slug", org_slug).eq("is_active", True).execute()


def get_active_api_key_hash(org_slug: str) -> Optional[str]:
    """Get the active API key hash for an org (for migration verification)."""
    result = (
        get_client()
        .table("api_keys")
        .select("key_hash")
        .eq("org_slug", org_slug)
        .eq("is_active", True)
        .limit(1)
        .execute()
    )
    return result.data[0]["key_hash"] if result.data else None


# =============================================================================
# TOKEN OPERATIONS (replaces in-memory _tokens dict)
# =============================================================================


def create_setup_token(data: dict, ttl: int = 600) -> str:
    """Create a setup token with TTL. Returns 'st_xxxx' string."""
    token_id = f"st_{secrets.token_hex(12)}"
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=ttl)

    get_client().table("setup_tokens").insert({
        "token": token_id,
        "token_type": "setup",
        "data": data,
        "expires_at": expires_at.isoformat(),
    }).execute()

    return token_id


def create_invite_token(data: dict, ttl: int = 604800) -> str:
    """Create an invite token (7-day TTL). Returns 'inv_xxxx' string."""
    token_id = f"inv_{secrets.token_hex(12)}"
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=ttl)

    get_client().table("setup_tokens").insert({
        "token": token_id,
        "token_type": "invite",
        "data": data,
        "expires_at": expires_at.isoformat(),
    }).execute()

    return token_id


def claim_setup_token(token: str) -> Optional[dict]:
    """Claim and consume a token. Returns data or None."""
    now = datetime.now(timezone.utc).isoformat()

    # Find unclaimed, unexpired token
    result = (
        get_client()
        .table("setup_tokens")
        .select("id, data, expires_at")
        .eq("token", token)
        .is_("claimed_at", "null")
        .gte("expires_at", now)
        .limit(1)
        .execute()
    )

    if not result.data:
        return None

    row = result.data[0]

    # Mark as claimed
    get_client().table("setup_tokens").update(
        {"claimed_at": now}
    ).eq("id", row["id"]).execute()

    return row["data"]


def peek_setup_token(token: str) -> Optional[dict]:
    """Read a token's data WITHOUT consuming it."""
    now = datetime.now(timezone.utc).isoformat()

    result = (
        get_client()
        .table("setup_tokens")
        .select("data, expires_at")
        .eq("token", token)
        .is_("claimed_at", "null")
        .gte("expires_at", now)
        .limit(1)
        .execute()
    )

    if not result.data:
        return None

    return result.data[0]["data"]


# =============================================================================
# USER OPERATIONS
# =============================================================================


def upsert_user(
    github_username: str,
    github_name: Optional[str] = None,
    avatar_url: Optional[str] = None,
    telegram_username: Optional[str] = None,
    telegram_id: Optional[int] = None,
) -> dict:
    """Create or update a user. Returns the user row."""
    data = {"github_username": github_username}
    if github_name is not None:
        data["github_name"] = github_name
    if avatar_url is not None:
        data["avatar_url"] = avatar_url
    if telegram_username is not None:
        data["telegram_username"] = telegram_username
    if telegram_id is not None:
        data["telegram_id"] = telegram_id

    result = get_client().table("users").upsert(
        data, on_conflict="github_username"
    ).execute()
    return result.data[0] if result.data else data


def get_user_by_github(github_username: str) -> Optional[dict]:
    """Get user by GitHub username."""
    result = (
        get_client()
        .table("users")
        .select("*")
        .eq("github_username", github_username)
        .limit(1)
        .execute()
    )
    return result.data[0] if result.data else None


# =============================================================================
# MEMBERSHIP OPERATIONS
# =============================================================================


def get_memberships(org_slug: str) -> list[dict]:
    """Get all memberships for an org."""
    result = (
        get_client()
        .table("memberships")
        .select("*, users(github_username, github_name, avatar_url, telegram_username)")
        .eq("org_slug", org_slug)
        .execute()
    )
    return result.data or []


def get_user_orgs(github_username: str) -> list[dict]:
    """Get all orgs a user belongs to."""
    user = get_user_by_github(github_username)
    if not user:
        return []

    result = (
        get_client()
        .table("memberships")
        .select("*, orgs(slug, name, github_org, telegram_chat_id)")
        .eq("user_id", user["id"])
        .eq("status", "active")
        .execute()
    )
    return result.data or []


def add_membership(
    org_slug: str,
    github_username: str,
    role: str = "member",
    invited_by_username: Optional[str] = None,
) -> dict:
    """Add a user as a member of an org. Creates user if needed."""
    user = upsert_user(github_username)
    user_id = user["id"]

    invited_by_id = None
    if invited_by_username:
        inviter = get_user_by_github(invited_by_username)
        if inviter:
            invited_by_id = inviter["id"]

    data = {
        "org_slug": org_slug,
        "user_id": user_id,
        "role": role,
        "status": "active",
    }
    if invited_by_id:
        data["invited_by"] = invited_by_id

    result = get_client().table("memberships").upsert(
        data, on_conflict="org_slug,user_id"
    ).execute()
    return result.data[0] if result.data else data


# =============================================================================
# WAITLIST OPERATIONS
# =============================================================================


def waitlist_add(
    email: Optional[str] = None,
    github_username: Optional[str] = None,
    source: Optional[str] = None,
) -> dict:
    """Add to waitlist."""
    data = {"status": "pending"}
    if email:
        data["email"] = email
    if github_username:
        data["github_username"] = github_username
    if source:
        data["source"] = source

    result = get_client().table("waitlist").insert(data).execute()
    return result.data[0] if result.data else data


def waitlist_list(status: Optional[str] = None) -> list[dict]:
    """List waitlist entries, optionally filtered by status."""
    query = get_client().table("waitlist").select("*").order("created_at")
    if status:
        query = query.eq("status", status)
    result = query.execute()
    return result.data or []


def waitlist_approve(waitlist_id: int, approved_by_username: str) -> Optional[dict]:
    """Approve a waitlist entry."""
    approver = get_user_by_github(approved_by_username)
    approver_id = approver["id"] if approver else None

    result = get_client().table("waitlist").update({
        "status": "approved",
        "approved_at": datetime.now(timezone.utc).isoformat(),
        "approved_by": approver_id,
    }).eq("id", waitlist_id).execute()

    return result.data[0] if result.data else None


# =============================================================================
# TELEGRAM EVENT LOGGING
# =============================================================================


def log_telegram_event(
    org_slug: str,
    event_type: str,
    chat_id: Optional[str] = None,
    group_title: Optional[str] = None,
    triggered_by: Optional[str] = None,
) -> None:
    """Log a Telegram event for audit."""
    get_client().table("telegram_events").insert({
        "org_slug": org_slug,
        "event_type": event_type,
        "chat_id": chat_id,
        "group_title": group_title,
        "triggered_by": triggered_by,
    }).execute()


# =============================================================================
# BULK LOAD (for startup — replaces load_orgs_from_neo4j)
# =============================================================================


def load_all_org_configs() -> dict:
    """Load all org configs from Supabase into a dict keyed by slug.

    Returns the same shape as ORG_CONFIGS for backward compatibility:
    {slug: {api_key, org_name, github_org, neo4j_host, neo4j_user, neo4j_password, ...}}
    """
    orgs = list_orgs()
    default_bot_token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
    configs = {}

    for org in orgs:
        slug = org["slug"]

        # Get the active API key for this org
        key_result = (
            get_client()
            .table("api_keys")
            .select("key_prefix")
            .eq("org_slug", slug)
            .eq("is_active", True)
            .limit(1)
            .execute()
        )

        configs[slug] = {
            "org_name": org["name"],
            "github_org": org["github_org"],
            "neo4j_host": org["neo4j_host"],
            "neo4j_user": org["neo4j_user"],
            "neo4j_password": org["neo4j_password"],
            "telegram_bot_token": default_bot_token,
            "telegram_chat_id": org.get("telegram_chat_id") or "",
            "telegram_group_title": org.get("telegram_group_title") or "",
            "telegram_group_username": org.get("telegram_group_username") or "",
            # api_key is validated via hash — we don't store plaintext in memory
            # But we need a marker that this org exists
            "_has_api_key": bool(key_result.data),
        }

    return configs
