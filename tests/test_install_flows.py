"""Tests for the three installation paths: founder setup, joiner, and token claim.

All GitHub/Neo4j/Telegram calls are mocked with respx. No real network needed.
"""

import sys
import json
import base64
from pathlib import Path

import pytest
import respx
from httpx import Response

sys.path.insert(0, str(Path(__file__).parent.parent))

from api.services.tokens import _tokens

pytestmark = pytest.mark.api

GITHUB_API = "https://api.github.com"
FAKE_TOKEN = "ghp_test_founder_token"


@pytest.fixture(autouse=True)
def clear_tokens():
    _tokens.clear()
    yield
    _tokens.clear()


def _neo4j_ok():
    return {"data": {"fields": [], "values": []}}


def _egregore_json_content(org_name="TestOrg", github_org="TestOrg", slug="testorg"):
    config = {
        "org_name": org_name,
        "github_org": github_org,
        "memory_repo": f"{github_org}-memory",
        "api_url": "https://api.example.com",
        "slug": slug,
    }
    raw = json.dumps(config).encode()
    return {
        "content": base64.b64encode(raw).decode(),
        "encoding": "base64",
        "sha": "abc123",
    }


# =============================================================================
# FOUNDER SETUP FLOW
# =============================================================================


class TestFounderSetup:
    @respx.mock
    def test_founder_setup_creates_org(self, app_client, monkeypatch):
        """POST /api/org/setup with valid GitHub token creates org and returns setup token."""
        monkeypatch.setenv("EGREGORE_NEO4J_HOST", "neo4j-test.example.com")
        # Mock GitHub: user, fork, repo exists checks, repo creation, etc.
        respx.get(f"{GITHUB_API}/user").mock(
            return_value=Response(200, json={"login": "founder", "name": "Founder"})
        )
        # Auto-detect: FounderOrg is an org (not personal account)
        respx.get(f"{GITHUB_API}/orgs/FounderOrg").mock(
            return_value=Response(200, json={"login": "FounderOrg"})
        )
        # Repo check: first call = 404 (doesn't exist), subsequent = 200 (fork ready)
        _repo_check_calls = []
        def _repo_check(request):
            _repo_check_calls.append(True)
            if len(_repo_check_calls) == 1:
                return Response(404)  # Duplicate check: not yet
            return Response(200, json={"full_name": "FounderOrg/egregore-core"})  # wait_for_fork

        respx.get(f"{GITHUB_API}/repos/FounderOrg/egregore-core").mock(
            side_effect=_repo_check
        )
        # Fork succeeds (async)
        respx.post(f"{GITHUB_API}/repos/Curve-Labs/egregore-core/forks").mock(
            return_value=Response(202, json={"full_name": "FounderOrg/egregore-core"})
        )
        # CLAUDE.md content check (wait_for_repo checks template content is committed)
        respx.get(f"{GITHUB_API}/repos/FounderOrg/egregore-core/contents/CLAUDE.md").mock(
            return_value=Response(200, json={"content": "IyBFZ3JlZ29yZQ==", "encoding": "base64", "sha": "tmpl"})
        )
        # Create memory repo
        respx.post(f"{GITHUB_API}/orgs/FounderOrg/repos").mock(
            return_value=Response(201, json={"full_name": "FounderOrg/FounderOrg-memory"})
        )
        # Memory repo verification
        respx.get(f"{GITHUB_API}/repos/FounderOrg/FounderOrg-memory").mock(
            return_value=Response(200, json={"full_name": "FounderOrg/FounderOrg-memory"})
        )
        # Init memory structure (update_file calls)
        respx.get(url__regex=rf"{GITHUB_API}/repos/FounderOrg/FounderOrg-memory/contents/.*").mock(
            return_value=Response(404)
        )
        respx.put(url__regex=rf"{GITHUB_API}/repos/FounderOrg/FounderOrg-memory/contents/.*").mock(
            return_value=Response(201, json={"content": {"sha": "new"}})
        )
        # Update egregore.json in the forked repo
        respx.get(f"{GITHUB_API}/repos/FounderOrg/egregore-core/contents/egregore.json").mock(
            return_value=Response(404)
        )
        respx.put(f"{GITHUB_API}/repos/FounderOrg/egregore-core/contents/egregore.json").mock(
            return_value=Response(201, json={"content": {"sha": "new"}})
        )
        # Neo4j bootstrap queries
        respx.post(url__regex=r"https://neo4j-test.*").mock(
            return_value=Response(200, json=_neo4j_ok())
        )

        resp = app_client.post(
            "/api/org/setup",
            json={"github_org": "FounderOrg", "org_name": "Founder Org"},
            headers={"Authorization": f"Bearer {FAKE_TOKEN}"},
        )

        assert resp.status_code == 200
        data = resp.json()
        assert "setup_token" in data
        assert data["setup_token"].startswith("st_")
        assert "fork_url" in data
        assert "memory_url" in data
        assert data["org_slug"] == "founderorg"

    @respx.mock
    def test_founder_setup_idempotent_when_repo_exists(self, app_client, monkeypatch):
        """Same org twice → succeeds (setup is idempotent, skips existing repos)."""
        monkeypatch.setenv("EGREGORE_NEO4J_HOST", "neo4j-test.example.com")
        respx.get(f"{GITHUB_API}/user").mock(
            return_value=Response(200, json={"login": "founder", "name": "Founder"})
        )
        # Auto-detect: ExistingOrg is an org
        respx.get(f"{GITHUB_API}/orgs/ExistingOrg").mock(
            return_value=Response(200, json={"login": "ExistingOrg"})
        )
        # Repo already exists
        respx.get(f"{GITHUB_API}/repos/ExistingOrg/egregore-core").mock(
            return_value=Response(200, json={"full_name": "ExistingOrg/egregore-core"})
        )
        # Memory repo creation returns 422 (already exists) — that's fine
        respx.post(f"{GITHUB_API}/orgs/ExistingOrg/repos").mock(
            return_value=Response(422, json={"message": "name already exists"})
        )
        # Memory repo verification (it exists from before)
        respx.get(f"{GITHUB_API}/repos/ExistingOrg/ExistingOrg-memory").mock(
            return_value=Response(200, json={"full_name": "ExistingOrg/ExistingOrg-memory"})
        )
        # Init memory structure
        respx.get(url__regex=rf"{GITHUB_API}/repos/ExistingOrg/ExistingOrg-memory/contents/.*").mock(
            return_value=Response(404)
        )
        respx.put(url__regex=rf"{GITHUB_API}/repos/ExistingOrg/ExistingOrg-memory/contents/.*").mock(
            return_value=Response(201, json={"content": {"sha": "new"}})
        )
        # egregore.json update
        respx.get(f"{GITHUB_API}/repos/ExistingOrg/egregore-core/contents/egregore.json").mock(
            return_value=Response(404)
        )
        respx.put(f"{GITHUB_API}/repos/ExistingOrg/egregore-core/contents/egregore.json").mock(
            return_value=Response(201, json={"content": {"sha": "new"}})
        )
        # Neo4j
        respx.post(url__regex=r"https://neo4j-test.*").mock(
            return_value=Response(200, json=_neo4j_ok())
        )

        resp = app_client.post(
            "/api/org/setup",
            json={"github_org": "ExistingOrg", "org_name": "Existing Org"},
            headers={"Authorization": f"Bearer {FAKE_TOKEN}"},
        )

        assert resp.status_code == 200
        assert "setup_token" in resp.json()

    @respx.mock
    def test_founder_setup_stores_created_by(self, app_client, monkeypatch):
        """Neo4j MERGE for Org node should include created_by with GitHub username."""
        monkeypatch.setenv("EGREGORE_NEO4J_HOST", "neo4j-creator.example.com")
        neo4j_bodies = []

        respx.get(f"{GITHUB_API}/user").mock(
            return_value=Response(200, json={"login": "creator-user", "name": "Creator"})
        )
        # Auto-detect: CreatorOrg is an org
        respx.get(f"{GITHUB_API}/orgs/CreatorOrg").mock(
            return_value=Response(200, json={"login": "CreatorOrg"})
        )
        respx.get(f"{GITHUB_API}/repos/CreatorOrg/egregore-core").mock(
            return_value=Response(200, json={"full_name": "CreatorOrg/egregore-core"})
        )
        respx.post(f"{GITHUB_API}/orgs/CreatorOrg/repos").mock(
            return_value=Response(422, json={"message": "already exists"})
        )
        respx.get(f"{GITHUB_API}/repos/CreatorOrg/CreatorOrg-memory").mock(
            return_value=Response(200, json={"full_name": "CreatorOrg/CreatorOrg-memory"})
        )
        respx.get(url__regex=rf"{GITHUB_API}/repos/CreatorOrg/CreatorOrg-memory/contents/.*").mock(
            return_value=Response(404)
        )
        respx.put(url__regex=rf"{GITHUB_API}/repos/CreatorOrg/CreatorOrg-memory/contents/.*").mock(
            return_value=Response(201, json={"content": {"sha": "new"}})
        )
        respx.get(f"{GITHUB_API}/repos/CreatorOrg/egregore-core/contents/egregore.json").mock(
            return_value=Response(404)
        )
        respx.put(f"{GITHUB_API}/repos/CreatorOrg/egregore-core/contents/egregore.json").mock(
            return_value=Response(201, json={"content": {"sha": "new"}})
        )
        # Develop branch sync
        respx.get(url__regex=rf"{GITHUB_API}/repos/CreatorOrg/egregore-core/git/ref/.*").mock(
            return_value=Response(200, json={"object": {"sha": "abc123"}})
        )
        respx.patch(url__regex=rf"{GITHUB_API}/repos/CreatorOrg/egregore-core/git/refs/.*").mock(
            return_value=Response(200, json={"object": {"sha": "abc123"}})
        )
        respx.post(url__regex=r"https://neo4j-creator.*").mock(
            side_effect=lambda req: (
                neo4j_bodies.append(json.loads(req.content)),
                Response(200, json=_neo4j_ok()),
            )[-1]
        )

        resp = app_client.post(
            "/api/org/setup",
            json={"github_org": "CreatorOrg", "org_name": "Creator Org"},
            headers={"Authorization": f"Bearer {FAKE_TOKEN}"},
        )

        assert resp.status_code == 200
        # Find the MERGE Org query in captured Neo4j calls
        org_merge = None
        for body in neo4j_bodies:
            stmt = body.get("statement", "")
            if "MERGE" in stmt and "Org" in stmt:
                org_merge = body
                break
        assert org_merge is not None, "Expected MERGE Org query in Neo4j calls"
        assert org_merge["parameters"].get("created_by") == "creator-user"
        assert "created_by" in org_merge["statement"]

    @respx.mock
    def test_founder_setup_invalid_github_token(self, app_client):
        """Bad GitHub token → 401."""
        respx.get(f"{GITHUB_API}/user").mock(
            return_value=Response(401, json={"message": "Bad credentials"})
        )

        resp = app_client.post(
            "/api/org/setup",
            json={"github_org": "AnyOrg", "org_name": "Any Org"},
            headers={"Authorization": "Bearer bad_token"},
        )

        assert resp.status_code == 401


# =============================================================================
# JOINER FLOW
# =============================================================================


class TestJoinerFlow:
    @respx.mock
    def test_joiner_joins_existing_org(self, app_client, _patch_org_configs):
        """POST /api/org/join with valid access returns setup token."""
        from conftest import ALPHA_SLUG, ALPHA_CONFIG

        _patch_org_configs[ALPHA_SLUG] = {**ALPHA_CONFIG}

        respx.get(f"{GITHUB_API}/user").mock(
            return_value=Response(200, json={"login": "joiner", "name": "Joiner"})
        )
        # Repo exists
        respx.get(f"{GITHUB_API}/repos/AlphaOrg/egregore-core").mock(
            return_value=Response(200, json={"full_name": "AlphaOrg/egregore-core"})
        )
        # egregore.json readable
        respx.get(f"{GITHUB_API}/repos/AlphaOrg/egregore-core/contents/egregore.json").mock(
            return_value=Response(200, json=_egregore_json_content(
                org_name="Alpha Corp", github_org="AlphaOrg", slug="alpha"
            ))
        )
        # Memory repo accessible
        respx.get(f"{GITHUB_API}/repos/AlphaOrg/AlphaOrg-memory").mock(
            return_value=Response(200, json={"full_name": "AlphaOrg/AlphaOrg-memory"})
        )
        # Neo4j person creation
        respx.post(url__regex=r"https://neo4j.*").mock(
            return_value=Response(200, json=_neo4j_ok())
        )
        # Telegram invite link (may fail, that's ok)
        respx.post(url__regex=r"https://api\.telegram\.org/.*").mock(
            return_value=Response(200, json={"ok": False})
        )

        resp = app_client.post(
            "/api/org/join",
            json={"github_org": "AlphaOrg"},
            headers={"Authorization": f"Bearer {FAKE_TOKEN}"},
        )

        assert resp.status_code == 200
        data = resp.json()
        assert data["setup_token"].startswith("st_")
        assert data["org_slug"] == "alpha"
        assert "AlphaOrg" in data["fork_url"]

    @respx.mock
    def test_joiner_blocked_without_memory_access(self, app_client):
        """No access to memory repo → 403."""
        respx.get(f"{GITHUB_API}/user").mock(
            return_value=Response(200, json={"login": "outsider", "name": "Outsider"})
        )
        respx.get(f"{GITHUB_API}/repos/AlphaOrg/egregore-core").mock(
            return_value=Response(200, json={"full_name": "AlphaOrg/egregore-core"})
        )
        respx.get(f"{GITHUB_API}/repos/AlphaOrg/egregore-core/contents/egregore.json").mock(
            return_value=Response(200, json=_egregore_json_content(
                org_name="Alpha Corp", github_org="AlphaOrg", slug="alpha"
            ))
        )
        # Memory repo NOT accessible
        respx.get(f"{GITHUB_API}/repos/AlphaOrg/AlphaOrg-memory").mock(
            return_value=Response(404)
        )
        # User is not admin of AlphaOrg (needed for can_create check)
        respx.get(f"{GITHUB_API}/user/memberships/orgs/AlphaOrg").mock(
            return_value=Response(200, json={"role": "member"})
        )

        resp = app_client.post(
            "/api/org/join",
            json={"github_org": "AlphaOrg"},
            headers={"Authorization": f"Bearer {FAKE_TOKEN}"},
        )

        assert resp.status_code == 403

    @respx.mock
    def test_joiner_nonexistent_org(self, app_client):
        """Repo doesn't exist → 404."""
        respx.get(f"{GITHUB_API}/user").mock(
            return_value=Response(200, json={"login": "joiner", "name": "Joiner"})
        )
        respx.get(f"{GITHUB_API}/repos/GhostOrg/egregore-core").mock(
            return_value=Response(404)
        )

        resp = app_client.post(
            "/api/org/join",
            json={"github_org": "GhostOrg"},
            headers={"Authorization": f"Bearer {FAKE_TOKEN}"},
        )

        assert resp.status_code == 404


# =============================================================================
# TOKEN CLAIM
# =============================================================================


class TestTokenClaim:
    def test_claim_setup_token_returns_full_config(self, app_client):
        """GET /api/org/claim/{token} returns everything the installer needs."""
        from api.services.tokens import create_token

        token_data = {
            "fork_url": "https://github.com/TestOrg/egregore-core.git",
            "memory_url": "https://github.com/TestOrg/TestOrg-memory.git",
            "api_key": "ek_testorg_abc123",
            "api_url": "https://api.example.com",
            "org_name": "Test Org",
            "github_org": "TestOrg",
            "github_token": "ghp_test",
            "slug": "testorg",
            "repos": ["lace", "tristero"],
            "repo_name": "egregore-core",
        }
        token = create_token(token_data)

        resp = app_client.get(f"/api/org/claim/{token}")

        assert resp.status_code == 200
        data = resp.json()
        assert data["fork_url"] == token_data["fork_url"]
        assert data["api_key"] == token_data["api_key"]
        assert data["slug"] == "testorg"
        assert data["repos"] == ["lace", "tristero"]

    def test_claim_token_is_one_time(self, app_client):
        """Second claim → 404."""
        from api.services.tokens import create_token

        token = create_token({"x": 1})

        resp1 = app_client.get(f"/api/org/claim/{token}")
        assert resp1.status_code == 200

        resp2 = app_client.get(f"/api/org/claim/{token}")
        assert resp2.status_code == 404

    def test_expired_token_returns_404(self, app_client):
        """Token past TTL → 404."""
        from api.services.tokens import create_token
        import time

        token = create_token({"x": 1}, ttl=0)
        time.sleep(0.01)

        resp = app_client.get(f"/api/org/claim/{token}")
        assert resp.status_code == 404


# =============================================================================
# PERSONAL ACCOUNT AUTO-DETECTION
# =============================================================================


class TestPersonalAccountDetection:
    @respx.mock
    def test_personal_account_auto_detected(self, app_client, monkeypatch):
        """Send is_personal: false with personal account. Server detects via GET /orgs → 404."""
        monkeypatch.setenv("EGREGORE_NEO4J_HOST", "neo4j-test.example.com")
        respx.get(f"{GITHUB_API}/user").mock(
            return_value=Response(200, json={"login": "ozfun", "name": "Oz Fun"})
        )
        # Auto-detect: NOT an org (404 → personal account)
        respx.get(f"{GITHUB_API}/orgs/ozfun").mock(
            return_value=Response(404)
        )
        # Personal account: owner = user login, fork goes to personal (no organization field)
        fork_calls = []
        respx.post(f"{GITHUB_API}/repos/Curve-Labs/egregore-core/forks").mock(
            side_effect=lambda req: (
                fork_calls.append(json.loads(req.content)),
                Response(202, json={"full_name": "ozfun/egregore-core"}),
            )[-1]
        )
        # Repo check: first = 404 (pre-check), then 200 (wait_for_fork)
        _repo_calls = []
        respx.get(f"{GITHUB_API}/repos/ozfun/egregore-core").mock(
            side_effect=lambda req: (
                _repo_calls.append(True),
                Response(404) if len(_repo_calls) == 1 else Response(200, json={"full_name": "ozfun/egregore-core"}),
            )[-1]
        )
        # Memory repo creation goes to /user/repos (personal), not /orgs/{org}/repos
        user_repo_calls = []
        respx.post(f"{GITHUB_API}/user/repos").mock(
            side_effect=lambda req: (
                user_repo_calls.append(json.loads(req.content)),
                Response(201, json={"full_name": "ozfun/ozfun-memory"}),
            )[-1]
        )
        # Memory repo verification
        respx.get(f"{GITHUB_API}/repos/ozfun/ozfun-memory").mock(
            return_value=Response(200, json={"full_name": "ozfun/ozfun-memory"})
        )
        # Init memory structure
        respx.get(url__regex=rf"{GITHUB_API}/repos/ozfun/ozfun-memory/contents/.*").mock(
            return_value=Response(404)
        )
        respx.put(url__regex=rf"{GITHUB_API}/repos/ozfun/ozfun-memory/contents/.*").mock(
            return_value=Response(201, json={"content": {"sha": "new"}})
        )
        # egregore.json update
        respx.get(f"{GITHUB_API}/repos/ozfun/egregore-core/contents/egregore.json").mock(
            return_value=Response(404)
        )
        respx.put(f"{GITHUB_API}/repos/ozfun/egregore-core/contents/egregore.json").mock(
            return_value=Response(201, json={"content": {"sha": "new"}})
        )
        # Neo4j
        respx.post(url__regex=r"https://neo4j-test.*").mock(
            return_value=Response(200, json=_neo4j_ok())
        )

        resp = app_client.post(
            "/api/org/setup",
            json={"github_org": "ozfun", "org_name": "Oz Fun", "is_personal": False},
            headers={"Authorization": f"Bearer {FAKE_TOKEN}"},
        )

        assert resp.status_code == 200
        data = resp.json()
        assert data["org_slug"] == "ozfun"

        # Fork should NOT have "organization" field (personal account)
        assert len(fork_calls) == 1
        assert "organization" not in fork_calls[0]

        # Memory repo created via /user/repos (personal endpoint)
        assert len(user_repo_calls) == 1


# =============================================================================
# NEO4J PERSISTENCE ORDERING
# =============================================================================


class TestNeo4jPersistence:
    @respx.mock
    def test_setup_fails_on_neo4j_error(self, app_client, _patch_org_configs, monkeypatch):
        """Neo4j failure during setup → 503. Slug NOT in ORG_CONFIGS."""
        monkeypatch.setenv("EGREGORE_NEO4J_HOST", "neo4j-fail.example.com")
        respx.get(f"{GITHUB_API}/user").mock(
            return_value=Response(200, json={"login": "founder", "name": "Founder"})
        )
        # Auto-detect: org
        respx.get(f"{GITHUB_API}/orgs/FailOrg").mock(
            return_value=Response(200, json={"login": "FailOrg"})
        )
        # Repo already exists (skip fork)
        respx.get(f"{GITHUB_API}/repos/FailOrg/egregore-core").mock(
            return_value=Response(200, json={"full_name": "FailOrg/egregore-core"})
        )
        # Memory repo already exists
        respx.post(f"{GITHUB_API}/orgs/FailOrg/repos").mock(
            return_value=Response(422, json={"message": "name already exists"})
        )
        respx.get(f"{GITHUB_API}/repos/FailOrg/FailOrg-memory").mock(
            return_value=Response(200, json={"full_name": "FailOrg/FailOrg-memory"})
        )
        # Init memory structure
        respx.get(url__regex=rf"{GITHUB_API}/repos/FailOrg/FailOrg-memory/contents/.*").mock(
            return_value=Response(404)
        )
        respx.put(url__regex=rf"{GITHUB_API}/repos/FailOrg/FailOrg-memory/contents/.*").mock(
            return_value=Response(201, json={"content": {"sha": "new"}})
        )
        # Neo4j FAILS with errors array
        respx.post(url__regex=r"https://neo4j-fail.*").mock(
            return_value=Response(200, json={"errors": [{"message": "connection refused"}]})
        )

        resp = app_client.post(
            "/api/org/setup",
            json={"github_org": "FailOrg", "org_name": "Fail Org"},
            headers={"Authorization": f"Bearer {FAKE_TOKEN}"},
        )

        assert resp.status_code == 503
        # Org should NOT be in ORG_CONFIGS since Neo4j failed
        assert "failorg" not in _patch_org_configs

    @respx.mock
    def test_telegram_update_fails_on_neo4j_error(self, app_client, _patch_org_configs, monkeypatch):
        """Neo4j failure during telegram update → 503. chat_id NOT updated."""
        from conftest import ALPHA_SLUG, ALPHA_CONFIG

        _patch_org_configs[ALPHA_SLUG] = {**ALPHA_CONFIG}
        original_chat_id = ALPHA_CONFIG["telegram_chat_id"]

        bot_token = "test_bot_token_for_auth"
        monkeypatch.setenv("TELEGRAM_BOT_TOKEN", bot_token)

        # Neo4j fails (returns errors array → _post_neo4j returns {"error": ...})
        respx.post(url__regex=r"https://neo4j-alpha.*").mock(
            return_value=Response(200, json={"errors": [{"message": "connection timeout"}]})
        )

        resp = app_client.post(
            "/api/org/telegram",
            json={"org_slug": "alpha", "chat_id": "-999new"},
            headers={"Authorization": f"Bearer {bot_token}"},
        )

        assert resp.status_code == 503
        # chat_id should NOT have been updated
        assert _patch_org_configs[ALPHA_SLUG]["telegram_chat_id"] == original_chat_id


# =============================================================================
# TELEGRAM GROUP METADATA
# =============================================================================


class TestTelegramGroupMetadata:
    @respx.mock
    def test_telegram_stores_group_title(self, app_client, _patch_org_configs, monkeypatch):
        """POST with group_title → stored in Neo4j and returned in response."""
        from conftest import ALPHA_SLUG, ALPHA_CONFIG

        _patch_org_configs[ALPHA_SLUG] = {**ALPHA_CONFIG}

        bot_token = "test_bot_token_for_auth"
        monkeypatch.setenv("TELEGRAM_BOT_TOKEN", bot_token)

        neo4j_bodies = []
        respx.post(url__regex=r"https://neo4j-alpha.*").mock(
            side_effect=lambda req: (
                neo4j_bodies.append(json.loads(req.content)),
                Response(200, json=_neo4j_ok()),
            )[-1]
        )

        resp = app_client.post(
            "/api/org/telegram",
            json={
                "org_slug": "alpha",
                "chat_id": "-100new",
                "group_title": "Alpha Team Chat",
                "group_username": "alphateam",
            },
            headers={"Authorization": f"Bearer {bot_token}"},
        )

        assert resp.status_code == 200
        data = resp.json()
        assert data["group_title"] == "Alpha Team Chat"
        assert data["group_username"] == "alphateam"

        # Verify stored in ORG_CONFIGS
        assert _patch_org_configs[ALPHA_SLUG]["telegram_group_title"] == "Alpha Team Chat"
        assert _patch_org_configs[ALPHA_SLUG]["telegram_group_username"] == "alphateam"

        # Verify Neo4j received the group metadata
        assert len(neo4j_bodies) == 1
        stmt = neo4j_bodies[0]["statement"]
        assert "telegram_group_title" in stmt
        assert "telegram_group_username" in stmt

    @respx.mock
    def test_telegram_no_group_title_backwards_compat(self, app_client, _patch_org_configs, monkeypatch):
        """POST without group_title → still 200, backward compatible."""
        from conftest import ALPHA_SLUG, ALPHA_CONFIG

        _patch_org_configs[ALPHA_SLUG] = {**ALPHA_CONFIG}

        bot_token = "test_bot_token_for_auth"
        monkeypatch.setenv("TELEGRAM_BOT_TOKEN", bot_token)

        respx.post(url__regex=r"https://neo4j-alpha.*").mock(
            return_value=Response(200, json=_neo4j_ok())
        )

        resp = app_client.post(
            "/api/org/telegram",
            json={"org_slug": "alpha", "chat_id": "-100new"},
            headers={"Authorization": f"Bearer {bot_token}"},
        )

        assert resp.status_code == 200
        data = resp.json()
        assert data["group_title"] is None
        assert data["group_username"] is None

    @respx.mock
    def test_telegram_status_returns_group_metadata(self, app_client, _patch_org_configs):
        """GET /api/org/telegram/status returns group_title if stored."""
        from conftest import ALPHA_SLUG, ALPHA_CONFIG

        _patch_org_configs[ALPHA_SLUG] = {
            **ALPHA_CONFIG,
            "telegram_group_title": "Alpha Team",
            "telegram_group_username": "alphateam",
        }

        resp = app_client.get("/api/org/telegram/status/alpha")

        assert resp.status_code == 200
        data = resp.json()
        assert data["connected"] is True
        assert data["group_title"] == "Alpha Team"
        assert data["group_username"] == "alphateam"
