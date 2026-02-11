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
    def test_founder_setup_creates_org(self, app_client):
        """POST /api/org/setup with valid GitHub token creates org and returns setup token."""
        # Mock GitHub: user, fork, repo exists checks, repo creation, etc.
        respx.get(f"{GITHUB_API}/user").mock(
            return_value=Response(200, json={"login": "founder", "name": "Founder"})
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
        # Neo4j bootstrap queries (3 MERGE calls)
        respx.post(url__regex=r"https://neo4j.*").mock(
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
    def test_founder_setup_idempotent_when_repo_exists(self, app_client):
        """Same org twice → succeeds (setup is idempotent, skips existing repos)."""
        respx.get(f"{GITHUB_API}/user").mock(
            return_value=Response(200, json={"login": "founder", "name": "Founder"})
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
        respx.post(url__regex=r"https://neo4j.*").mock(
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
