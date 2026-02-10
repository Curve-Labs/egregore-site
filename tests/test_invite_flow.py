"""Tests for the invitation lifecycle.

Admin invite, non-admin blocked, peek info, accept, consume, and edge cases.
All GitHub/Neo4j calls mocked with respx.
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
ADMIN_TOKEN = "ghp_admin_token"
MEMBER_TOKEN = "ghp_member_token"
INVITEE_TOKEN = "ghp_invitee_token"


@pytest.fixture(autouse=True)
def clear_tokens():
    _tokens.clear()
    yield
    _tokens.clear()


def _neo4j_ok():
    return {"data": {"fields": [], "values": []}}


def _egregore_json_content(org_name="Alpha Corp", github_org="AlphaOrg", slug="alpha"):
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


def _mock_admin_github():
    """Set up respx mocks for an admin user creating an invite."""
    respx.get(f"{GITHUB_API}/user").mock(
        return_value=Response(200, json={"login": "admin", "name": "Admin User"})
    )
    # Repo exists
    respx.get(f"{GITHUB_API}/repos/AlphaOrg/egregore-core").mock(
        return_value=Response(200, json={"full_name": "AlphaOrg/egregore-core"})
    )
    # Admin role
    respx.get(f"{GITHUB_API}/user/memberships/orgs/AlphaOrg").mock(
        return_value=Response(200, json={"role": "admin"})
    )
    # GitHub org invitation succeeds
    respx.put(f"{GITHUB_API}/orgs/AlphaOrg/memberships/invitee").mock(
        return_value=Response(200, json={"state": "pending"})
    )
    # egregore.json readable
    respx.get(f"{GITHUB_API}/repos/AlphaOrg/egregore-core/contents/egregore.json").mock(
        return_value=Response(200, json=_egregore_json_content())
    )
    # Add collaborator to memory repo
    respx.put(f"{GITHUB_API}/repos/AlphaOrg/AlphaOrg-memory/collaborators/invitee").mock(
        return_value=Response(204)
    )


# =============================================================================
# INVITE CREATION
# =============================================================================


class TestInviteCreation:
    @respx.mock
    def test_admin_can_invite(self, app_client, _patch_org_configs):
        """POST /api/org/invite with admin role returns invite_url and invite_token."""
        from conftest import ALPHA_SLUG, ALPHA_CONFIG
        _patch_org_configs[ALPHA_SLUG] = {**ALPHA_CONFIG}
        _mock_admin_github()

        resp = app_client.post(
            "/api/org/invite",
            json={
                "github_org": "AlphaOrg",
                "github_username": "invitee",
            },
            headers={"Authorization": f"Bearer {ADMIN_TOKEN}"},
        )

        assert resp.status_code == 200
        data = resp.json()
        assert "invite_url" in data
        assert "invite_token" in data
        assert data["invite_token"].startswith("inv_")
        assert data["invited_username"] == "invitee"

    @respx.mock
    def test_non_admin_cannot_invite(self, app_client):
        """Member role → 403."""
        respx.get(f"{GITHUB_API}/user").mock(
            return_value=Response(200, json={"login": "member", "name": "Member"})
        )
        respx.get(f"{GITHUB_API}/repos/AlphaOrg/egregore-core").mock(
            return_value=Response(200, json={"full_name": "AlphaOrg/egregore-core"})
        )
        # Member role, not admin
        respx.get(f"{GITHUB_API}/user/memberships/orgs/AlphaOrg").mock(
            return_value=Response(200, json={"role": "member"})
        )

        resp = app_client.post(
            "/api/org/invite",
            json={
                "github_org": "AlphaOrg",
                "github_username": "someone",
            },
            headers={"Authorization": f"Bearer {MEMBER_TOKEN}"},
        )

        assert resp.status_code == 403


# =============================================================================
# INVITE PEEK
# =============================================================================


class TestInvitePeek:
    def test_invite_peek_shows_info(self, app_client):
        """GET /api/org/invite/{token} returns org name, inviter, without consuming."""
        from api.services.tokens import create_invite_token

        invite_data = {
            "github_org": "AlphaOrg",
            "org_name": "Alpha Corp",
            "invited_username": "invitee",
            "invited_by": "admin",
            "slug": "alpha",
            "repos": [],
            "repo_name": "egregore-core",
        }
        token = create_invite_token(invite_data)

        resp = app_client.get(f"/api/org/invite/{token}")

        assert resp.status_code == 200
        data = resp.json()
        assert data["org_name"] == "Alpha Corp"
        assert data["invited_by"] == "admin"
        assert data["invited_username"] == "invitee"

        # Token should NOT be consumed — peek again
        resp2 = app_client.get(f"/api/org/invite/{token}")
        assert resp2.status_code == 200

    def test_invite_peek_expired_returns_404(self, app_client):
        """Expired invite → 404."""
        from api.services.tokens import create_invite_token
        import time

        token = create_invite_token({"org_name": "X"}, ttl=0)
        time.sleep(0.01)

        resp = app_client.get(f"/api/org/invite/{token}")
        assert resp.status_code == 404


# =============================================================================
# INVITE ACCEPT
# =============================================================================


class TestInviteAccept:
    @respx.mock
    def test_accept_invite_with_active_membership(self, app_client, _patch_org_configs):
        """POST /api/org/invite/{token}/accept with active membership returns setup_token."""
        from api.services.tokens import create_invite_token
        from conftest import ALPHA_SLUG, ALPHA_CONFIG

        _patch_org_configs[ALPHA_SLUG] = {**ALPHA_CONFIG}

        invite_data = {
            "github_org": "AlphaOrg",
            "org_name": "Alpha Corp",
            "invited_username": "invitee",
            "invited_by": "admin",
            "slug": "alpha",
            "repos": [],
            "repo_name": "egregore-core",
        }
        invite_token = create_invite_token(invite_data)

        respx.get(f"{GITHUB_API}/user").mock(
            return_value=Response(200, json={"login": "invitee", "name": "Invitee"})
        )
        # Active membership
        respx.get(f"{GITHUB_API}/orgs/AlphaOrg/memberships/invitee").mock(
            return_value=Response(200, json={"state": "active"})
        )
        # egregore.json
        respx.get(f"{GITHUB_API}/repos/AlphaOrg/egregore-core/contents/egregore.json").mock(
            return_value=Response(200, json=_egregore_json_content())
        )
        # Neo4j person creation
        respx.post(url__regex=r"https://neo4j.*").mock(
            return_value=Response(200, json=_neo4j_ok())
        )
        # Telegram invite link
        respx.post(url__regex=r"https://api\.telegram\.org/.*").mock(
            return_value=Response(200, json={"ok": False})
        )

        resp = app_client.post(
            f"/api/org/invite/{invite_token}/accept",
            headers={"Authorization": f"Bearer {INVITEE_TOKEN}"},
        )

        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "accepted"
        assert data["setup_token"].startswith("st_")
        assert data["org_slug"] == "alpha"

    @respx.mock
    def test_accept_invite_auto_accepts_pending(self, app_client, _patch_org_configs):
        """Pending membership → auto-accepts, returns setup token."""
        from api.services.tokens import create_invite_token
        from conftest import ALPHA_SLUG, ALPHA_CONFIG

        _patch_org_configs[ALPHA_SLUG] = {**ALPHA_CONFIG}

        invite_data = {
            "github_org": "AlphaOrg",
            "org_name": "Alpha Corp",
            "invited_username": "invitee",
            "invited_by": "admin",
            "slug": "alpha",
            "repos": [],
            "repo_name": "egregore-core",
        }
        invite_token = create_invite_token(invite_data)

        respx.get(f"{GITHUB_API}/user").mock(
            return_value=Response(200, json={"login": "invitee", "name": "Invitee"})
        )
        # Pending membership
        respx.get(f"{GITHUB_API}/orgs/AlphaOrg/memberships/invitee").mock(
            return_value=Response(200, json={"state": "pending"})
        )
        # Accept invitation
        respx.patch(f"{GITHUB_API}/user/memberships/orgs/AlphaOrg").mock(
            return_value=Response(200, json={"state": "active"})
        )
        # egregore.json
        respx.get(f"{GITHUB_API}/repos/AlphaOrg/egregore-core/contents/egregore.json").mock(
            return_value=Response(200, json=_egregore_json_content())
        )
        # Neo4j
        respx.post(url__regex=r"https://neo4j.*").mock(
            return_value=Response(200, json=_neo4j_ok())
        )
        # Telegram
        respx.post(url__regex=r"https://api\.telegram\.org/.*").mock(
            return_value=Response(200, json={"ok": False})
        )

        resp = app_client.post(
            f"/api/org/invite/{invite_token}/accept",
            headers={"Authorization": f"Bearer {INVITEE_TOKEN}"},
        )

        assert resp.status_code == 200
        assert resp.json()["status"] == "accepted"

    @respx.mock
    def test_accept_invite_consumes_token(self, app_client, _patch_org_configs):
        """After accept, same invite token → 404."""
        from api.services.tokens import create_invite_token
        from conftest import ALPHA_SLUG, ALPHA_CONFIG

        _patch_org_configs[ALPHA_SLUG] = {**ALPHA_CONFIG}

        invite_data = {
            "github_org": "AlphaOrg",
            "org_name": "Alpha Corp",
            "invited_username": "invitee",
            "invited_by": "admin",
            "slug": "alpha",
            "repos": [],
            "repo_name": "egregore-core",
        }
        invite_token = create_invite_token(invite_data)

        respx.get(f"{GITHUB_API}/user").mock(
            return_value=Response(200, json={"login": "invitee", "name": "Invitee"})
        )
        respx.get(f"{GITHUB_API}/orgs/AlphaOrg/memberships/invitee").mock(
            return_value=Response(200, json={"state": "active"})
        )
        respx.get(f"{GITHUB_API}/repos/AlphaOrg/egregore-core/contents/egregore.json").mock(
            return_value=Response(200, json=_egregore_json_content())
        )
        respx.post(url__regex=r"https://neo4j.*").mock(
            return_value=Response(200, json=_neo4j_ok())
        )
        respx.post(url__regex=r"https://api\.telegram\.org/.*").mock(
            return_value=Response(200, json={"ok": False})
        )

        # First accept
        resp1 = app_client.post(
            f"/api/org/invite/{invite_token}/accept",
            headers={"Authorization": f"Bearer {INVITEE_TOKEN}"},
        )
        assert resp1.status_code == 200

        # Second accept — invite token consumed
        resp2 = app_client.post(
            f"/api/org/invite/{invite_token}/accept",
            headers={"Authorization": f"Bearer {INVITEE_TOKEN}"},
        )
        assert resp2.status_code == 404

    def test_accept_expired_invite_returns_404(self, app_client):
        """Expired invite token → 404."""
        from api.services.tokens import create_invite_token
        import time

        invite_token = create_invite_token({"github_org": "X", "slug": "x"}, ttl=0)
        time.sleep(0.01)

        resp = app_client.post(
            f"/api/org/invite/{invite_token}/accept",
            headers={"Authorization": f"Bearer {INVITEE_TOKEN}"},
        )
        assert resp.status_code == 404
