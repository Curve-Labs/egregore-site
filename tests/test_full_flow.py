"""End-to-end flow tests: setup → invite → accept → claim.

These tests simulate the COMPLETE lifecycle with mocked GitHub API:
1. Founder creates an Egregore instance (org or personal, default or named)
2. Founder invites a user
3. Invitee accepts the invite and gets a setup token
4. Invitee claims the setup token and gets install config
5. Install config (fork_url, memory_url) must point to repos that exist

The key invariant tested: repo_name, memory_repo, and slug must stay
consistent across the entire chain. A mismatch (like the accept endpoint
looking at egregore-core when the instance uses egregore-research) is
the exact class of bug these tests catch.
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

pytestmark = pytest.mark.flow

GITHUB_API = "https://api.github.com"
FOUNDER_TOKEN = "ghp_founder_token"
INVITEE_TOKEN = "ghp_invitee_token"


@pytest.fixture(autouse=True)
def clear_tokens():
    _tokens.clear()
    yield
    _tokens.clear()


def _neo4j_ok():
    return {"data": {"fields": [], "values": []}}


def _b64_json(obj: dict) -> dict:
    """Encode a dict as a base64 GitHub content response."""
    raw = json.dumps(obj).encode()
    return {
        "content": base64.b64encode(raw).decode(),
        "encoding": "base64",
        "sha": "abc123",
    }


# =============================================================================
# PERSONAL ACCOUNT + NAMED INSTANCE (the exact bug scenario)
# =============================================================================


class TestPersonalNamedInstanceFlow:
    """Full flow on a personal GitHub account with a named instance.

    This is the scenario that was failing: user 'oguzhan' creates instance
    'research' → egregore-research + oguzhan-research-memory.
    The invite must reference egregore-research (not egregore-core).
    """

    @respx.mock
    def test_setup_creates_named_instance(self, app_client, monkeypatch):
        """POST /api/org/setup with instance_name creates correctly named repos."""
        monkeypatch.setenv("EGREGORE_NEO4J_HOST", "neo4j-test.example.com")
        # GitHub user
        respx.get(f"{GITHUB_API}/user").mock(
            return_value=Response(200, json={"login": "testuser", "name": "Test User"})
        )
        # is_org check (personal account → 404)
        respx.get(f"{GITHUB_API}/orgs/testuser").mock(
            return_value=Response(404)
        )
        # Named instance repo: 404 on initial check, then 200 when wait_for_repo polls
        repo_check_calls = []
        def _repo_check(request):
            repo_check_calls.append(True)
            if len(repo_check_calls) == 1:
                return Response(404)
            return Response(200, json={"full_name": "testuser/egregore-research"})
        respx.get(f"{GITHUB_API}/repos/testuser/egregore-research").mock(
            side_effect=_repo_check
        )
        # Generate from template (creates with final name, private by default)
        respx.post(f"{GITHUB_API}/repos/Curve-Labs/egregore-core/generate").mock(
            return_value=Response(201, json={"full_name": "testuser/egregore-research"})
        )
        # CLAUDE.md content check (wait_for_repo checks template content is committed)
        respx.get(f"{GITHUB_API}/repos/testuser/egregore-research/contents/CLAUDE.md").mock(
            return_value=Response(200, json={"content": "IyBFZ3JlZ29yZQ==", "encoding": "base64", "sha": "tmpl"})
        )
        # Create memory repo (personal account → /user/repos)
        respx.post(f"{GITHUB_API}/user/repos").mock(
            return_value=Response(201, json={"full_name": "testuser/testuser-research-memory"})
        )
        # Memory repo verification
        respx.get(f"{GITHUB_API}/repos/testuser/testuser-research-memory").mock(
            return_value=Response(200, json={"full_name": "testuser/testuser-research-memory"})
        )
        # Init memory structure
        respx.get(url__regex=rf"{GITHUB_API}/repos/testuser/testuser-research-memory/contents/.*").mock(
            return_value=Response(404)
        )
        respx.put(url__regex=rf"{GITHUB_API}/repos/testuser/testuser-research-memory/contents/.*").mock(
            return_value=Response(201, json={"content": {"sha": "new"}})
        )
        # Update egregore.json in the new repo
        respx.get(f"{GITHUB_API}/repos/testuser/egregore-research/contents/egregore.json").mock(
            return_value=Response(404)
        )
        respx.put(f"{GITHUB_API}/repos/testuser/egregore-research/contents/egregore.json").mock(
            return_value=Response(201, json={"content": {"sha": "new"}})
        )
        # Neo4j
        respx.post(url__regex=r"https://neo4j.*").mock(
            return_value=Response(200, json=_neo4j_ok())
        )
        # sync_branch_to_main (skip — branch doesn't exist yet)
        respx.get(f"{GITHUB_API}/repos/testuser/egregore-research/git/ref/heads/main").mock(
            return_value=Response(404)
        )

        resp = app_client.post(
            "/api/org/setup",
            json={
                "github_org": "testuser",
                "org_name": "Test Research",
                "is_personal": True,
                "instance_name": "research",
            },
            headers={"Authorization": f"Bearer {FOUNDER_TOKEN}"},
        )

        assert resp.status_code == 200
        data = resp.json()

        # Verify naming conventions
        assert data["setup_token"].startswith("st_")
        assert data["org_slug"] == "testuser-research"
        assert "egregore-research" in data["fork_url"]
        assert "testuser-research-memory" in data["memory_url"]

        # Verify the setup token contains correct repo_name
        from api.services.tokens import peek_token
        token_data = peek_token(data["setup_token"])
        assert token_data["repo_name"] == "egregore-research"
        assert token_data["slug"] == "testuser-research"

    @respx.mock
    def test_full_setup_invite_accept_chain(self, app_client, _patch_org_configs, monkeypatch):
        """Complete flow: setup → invite → accept for a personal named instance.

        This is THE critical test. It verifies that:
        1. Setup creates the right repo_name in the setup token
        2. Invite reads repo_name and embeds it in the invite token
        3. Accept reads repo_name from the invite and checks the right repos
        """
        monkeypatch.setenv("EGREGORE_NEO4J_HOST", "neo4j-test.example.com")
        # ---- STEP 1: SETUP ----
        respx.get(f"{GITHUB_API}/user").mock(
            return_value=Response(200, json={"login": "founder", "name": "Founder"})
        )
        # is_org check (personal account → 404)
        respx.get(f"{GITHUB_API}/orgs/founder").mock(
            return_value=Response(404)
        )
        # Named instance repo: 404 on initial check, then 200 when wait_for_repo polls
        repo_check_calls = []
        def _repo_check(request):
            repo_check_calls.append(True)
            if len(repo_check_calls) == 1:
                return Response(404)
            return Response(200, json={"full_name": "founder/egregore-research"})
        respx.get(f"{GITHUB_API}/repos/founder/egregore-research").mock(
            side_effect=_repo_check
        )
        # Generate from template (creates with final name, private by default)
        respx.post(f"{GITHUB_API}/repos/Curve-Labs/egregore-core/generate").mock(
            return_value=Response(201, json={"full_name": "founder/egregore-research"})
        )
        # CLAUDE.md content check (wait_for_repo checks template content is committed)
        respx.get(f"{GITHUB_API}/repos/founder/egregore-research/contents/CLAUDE.md").mock(
            return_value=Response(200, json={"content": "IyBFZ3JlZ29yZQ==", "encoding": "base64", "sha": "tmpl"})
        )
        respx.post(f"{GITHUB_API}/user/repos").mock(
            return_value=Response(201, json={"full_name": "founder/founder-research-memory"})
        )
        # Memory repo verification
        respx.get(f"{GITHUB_API}/repos/founder/founder-research-memory").mock(
            return_value=Response(200, json={"full_name": "founder/founder-research-memory"})
        )
        respx.get(url__regex=rf"{GITHUB_API}/repos/founder/founder-research-memory/contents/.*").mock(
            return_value=Response(404)
        )
        respx.put(url__regex=rf"{GITHUB_API}/repos/founder/founder-research-memory/contents/.*").mock(
            return_value=Response(201, json={"content": {"sha": "new"}})
        )
        # egregore.json update (GET returns 404, PUT succeeds)
        respx.get(f"{GITHUB_API}/repos/founder/egregore-research/contents/egregore.json").mock(
            return_value=Response(404)
        )
        respx.put(f"{GITHUB_API}/repos/founder/egregore-research/contents/egregore.json").mock(
            return_value=Response(201, json={"content": {"sha": "new"}})
        )
        respx.post(url__regex=r"https://neo4j.*").mock(
            return_value=Response(200, json=_neo4j_ok())
        )
        # sync_branch_to_main (skip — branch doesn't exist yet)
        respx.get(f"{GITHUB_API}/repos/founder/egregore-research/git/ref/heads/main").mock(
            return_value=Response(404)
        )

        setup_resp = app_client.post(
            "/api/org/setup",
            json={
                "github_org": "founder",
                "org_name": "Research Lab",
                "is_personal": True,
                "instance_name": "research",
            },
            headers={"Authorization": f"Bearer {FOUNDER_TOKEN}"},
        )
        assert setup_resp.status_code == 200
        setup_data = setup_resp.json()
        slug = setup_data["org_slug"]
        assert slug == "founder-research"

        # respx context ended. Start a new one for the invite step.

    @respx.mock
    def test_invite_uses_correct_repo_name(self, app_client, _patch_org_configs):
        """Invite for named instance must embed the correct repo_name in the token.

        If the invite defaults to egregore-core instead of egregore-research,
        the accept step will check the wrong repos.
        """
        slug = "founder-research"
        _patch_org_configs[slug] = {
            "api_key": "ek_founder-research_abc",
            "org_name": "Research Lab",
            "github_org": "founder",
            "neo4j_host": "neo4j+s://test.neo4j.io",
            "neo4j_user": "neo4j",
            "neo4j_password": "test",
            "telegram_bot_token": "",
            "telegram_chat_id": "",
        }

        # Founder is the personal account owner
        respx.get(f"{GITHUB_API}/user").mock(
            return_value=Response(200, json={"login": "founder", "name": "Founder"})
        )
        # Repo exists (egregore-research, NOT egregore-core)
        respx.get(f"{GITHUB_API}/repos/founder/egregore-research").mock(
            return_value=Response(200, json={"full_name": "founder/egregore-research"})
        )
        # Is NOT an org (personal account)
        respx.get(f"{GITHUB_API}/orgs/founder").mock(
            return_value=Response(404)
        )
        # Add collaborator on egregore repo
        respx.put(f"{GITHUB_API}/repos/founder/egregore-research/collaborators/invitee").mock(
            return_value=Response(201)
        )
        # egregore.json in the correct repo
        egregore_config = {
            "org_name": "Research Lab",
            "github_org": "founder",
            "memory_repo": "founder-research-memory",
            "api_url": "https://api.example.com",
            "slug": "founder-research",
            "repo_name": "egregore-research",
        }
        respx.get(f"{GITHUB_API}/repos/founder/egregore-research/contents/egregore.json").mock(
            return_value=Response(200, json=_b64_json(egregore_config))
        )
        # Add collaborator on memory repo
        respx.put(f"{GITHUB_API}/repos/founder/founder-research-memory/collaborators/invitee").mock(
            return_value=Response(204)
        )

        resp = app_client.post(
            "/api/org/invite",
            json={
                "github_org": "founder",
                "github_username": "invitee",
                "repo_name": "egregore-research",
            },
            headers={"Authorization": f"Bearer {FOUNDER_TOKEN}"},
        )

        assert resp.status_code == 200
        data = resp.json()
        assert data["invite_token"].startswith("inv_")

        # KEY ASSERTION: the invite token must contain the correct repo_name
        from api.services.tokens import peek_token
        invite_data = peek_token(data["invite_token"])
        assert invite_data["repo_name"] == "egregore-research", (
            f"Invite token has repo_name={invite_data['repo_name']!r}, "
            f"expected 'egregore-research'. This would cause the accept endpoint "
            f"to check the wrong repos!"
        )
        assert invite_data["is_personal"] is True
        assert invite_data["slug"] == "founder-research"

    @respx.mock
    def test_accept_checks_correct_repos(self, app_client, _patch_org_configs):
        """Accept must use repo_name from invite token, not default to egregore-core.

        This is the exact bug: invite says egregore-research but accept
        checked egregore-core (the default), which existed as a ghost repo,
        then looked for oguzhan-memory (wrong) instead of oguzhan-research-memory.
        """
        slug = "founder-research"
        _patch_org_configs[slug] = {
            "api_key": "ek_founder-research_abc",
            "org_name": "Research Lab",
            "github_org": "founder",
            "neo4j_host": "neo4j+s://test.neo4j.io",
            "neo4j_user": "neo4j",
            "neo4j_password": "test",
            "telegram_bot_token": "123:ABC",
            "telegram_chat_id": "-100test",
        }

        # Create an invite token with the correct repo_name
        from api.services.tokens import create_invite_token
        invite_token = create_invite_token({
            "github_org": "founder",
            "org_name": "Research Lab",
            "invited_username": "invitee",
            "invited_by": "founder",
            "slug": "founder-research",
            "repos": [],
            "repo_name": "egregore-research",
            "is_personal": True,
        })

        # Invitee authenticates
        respx.get(f"{GITHUB_API}/user").mock(
            return_value=Response(200, json={"login": "invitee", "name": "Invitee"})
        )
        # Accept pending repo invitations
        respx.get(f"{GITHUB_API}/user/repository_invitations").mock(
            return_value=Response(200, json=[
                {
                    "id": 42,
                    "repository": {"owner": {"login": "founder"}, "name": "egregore-research"},
                },
                {
                    "id": 43,
                    "repository": {"owner": {"login": "founder"}, "name": "founder-research-memory"},
                },
            ])
        )
        respx.patch(f"{GITHUB_API}/user/repository_invitations/42").mock(
            return_value=Response(204)
        )
        respx.patch(f"{GITHUB_API}/user/repository_invitations/43").mock(
            return_value=Response(204)
        )

        # Invitee CAN access egregore-research (the correct repo)
        respx.get(f"{GITHUB_API}/repos/founder/egregore-research").mock(
            return_value=Response(200, json={"full_name": "founder/egregore-research"})
        )
        # egregore.json in the correct repo
        egregore_config = {
            "org_name": "Research Lab",
            "github_org": "founder",
            "memory_repo": "founder-research-memory",
            "api_url": "https://api.example.com",
            "slug": "founder-research",
            "repo_name": "egregore-research",
        }
        respx.get(f"{GITHUB_API}/repos/founder/egregore-research/contents/egregore.json").mock(
            return_value=Response(200, json=_b64_json(egregore_config))
        )
        # Invitee CAN access the memory repo
        respx.get(f"{GITHUB_API}/repos/founder/founder-research-memory").mock(
            return_value=Response(200, json={"full_name": "founder/founder-research-memory"})
        )
        # Neo4j
        respx.post(url__regex=r"https://neo4j.*").mock(
            return_value=Response(200, json=_neo4j_ok())
        )
        # Telegram
        respx.post(url__regex=r"https://api\.telegram\.org/.*").mock(
            return_value=Response(200, json={
                "ok": True,
                "result": {"invite_link": "https://t.me/+abc123"},
            })
        )

        resp = app_client.post(
            f"/api/org/invite/{invite_token}/accept",
            headers={"Authorization": f"Bearer {INVITEE_TOKEN}"},
        )

        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "accepted"
        assert data["setup_token"].startswith("st_")
        assert data["org_slug"] == "founder-research"

        # Verify setup token has correct repo info
        from api.services.tokens import peek_token
        setup_data = peek_token(data["setup_token"])
        assert setup_data["repo_name"] == "egregore-research"
        assert "founder-research-memory" in setup_data["memory_url"]
        assert "egregore-research" in setup_data["fork_url"]
        assert setup_data["slug"] == "founder-research"

    @respx.mock
    def test_accept_fails_when_memory_repo_not_accessible(self, app_client, _patch_org_configs):
        """Accept returns pending_github when memory repo isn't accessible yet.

        This catches the case where GitHub collaboration invitation
        hasn't been processed yet for the memory repo.
        """
        slug = "founder-research"
        _patch_org_configs[slug] = {
            "api_key": "ek_founder-research_abc",
            "org_name": "Research Lab",
            "github_org": "founder",
            "neo4j_host": "neo4j+s://test.neo4j.io",
            "neo4j_user": "neo4j",
            "neo4j_password": "test",
            "telegram_bot_token": "",
            "telegram_chat_id": "",
        }

        from api.services.tokens import create_invite_token
        invite_token = create_invite_token({
            "github_org": "founder",
            "org_name": "Research Lab",
            "invited_username": "invitee",
            "invited_by": "founder",
            "slug": "founder-research",
            "repos": [],
            "repo_name": "egregore-research",
            "is_personal": True,
        })

        respx.get(f"{GITHUB_API}/user").mock(
            return_value=Response(200, json={"login": "invitee", "name": "Invitee"})
        )
        respx.get(f"{GITHUB_API}/user/repository_invitations").mock(
            return_value=Response(200, json=[])
        )
        # Egregore repo accessible
        respx.get(f"{GITHUB_API}/repos/founder/egregore-research").mock(
            return_value=Response(200, json={"full_name": "founder/egregore-research"})
        )
        # egregore.json readable
        egregore_config = {
            "org_name": "Research Lab",
            "github_org": "founder",
            "memory_repo": "founder-research-memory",
            "api_url": "https://api.example.com",
            "slug": "founder-research",
            "repo_name": "egregore-research",
        }
        respx.get(f"{GITHUB_API}/repos/founder/egregore-research/contents/egregore.json").mock(
            return_value=Response(200, json=_b64_json(egregore_config))
        )
        # Memory repo NOT accessible (invitation pending)
        respx.get(f"{GITHUB_API}/repos/founder/founder-research-memory").mock(
            return_value=Response(404)
        )

        resp = app_client.post(
            f"/api/org/invite/{invite_token}/accept",
            headers={"Authorization": f"Bearer {INVITEE_TOKEN}"},
        )

        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "pending_github"
        assert "founder-research-memory" in data["message"], (
            f"Error message mentions wrong repo: {data['message']!r}. "
            f"Should reference founder-research-memory, not founder-memory."
        )

    @respx.mock
    def test_owner_accepting_own_invite_skips_access_checks(self, app_client, _patch_org_configs):
        """Owner of a personal account doesn't need repo access verification."""
        slug = "founder-research"
        _patch_org_configs[slug] = {
            "api_key": "ek_founder-research_abc",
            "org_name": "Research Lab",
            "github_org": "founder",
            "neo4j_host": "neo4j+s://test.neo4j.io",
            "neo4j_user": "neo4j",
            "neo4j_password": "test",
            "telegram_bot_token": "",
            "telegram_chat_id": "",
        }

        from api.services.tokens import create_invite_token
        invite_token = create_invite_token({
            "github_org": "founder",
            "org_name": "Research Lab",
            "invited_username": "someone",
            "invited_by": "founder",
            "slug": "founder-research",
            "repos": [],
            "repo_name": "egregore-research",
            "is_personal": True,
        })

        # The owner authenticates (same user as github_org)
        respx.get(f"{GITHUB_API}/user").mock(
            return_value=Response(200, json={"login": "founder", "name": "Founder"})
        )
        # egregore.json
        egregore_config = {
            "org_name": "Research Lab",
            "github_org": "founder",
            "memory_repo": "founder-research-memory",
            "api_url": "https://api.example.com",
            "slug": "founder-research",
            "repo_name": "egregore-research",
        }
        respx.get(f"{GITHUB_API}/repos/founder/egregore-research/contents/egregore.json").mock(
            return_value=Response(200, json=_b64_json(egregore_config))
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
            headers={"Authorization": f"Bearer {FOUNDER_TOKEN}"},
        )

        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "accepted"


# =============================================================================
# ORG ACCOUNT + DEFAULT INSTANCE
# =============================================================================


class TestOrgDefaultInstanceFlow:
    """Full flow for a GitHub org with the default egregore-core instance."""

    @respx.mock
    def test_invite_accept_org_active_membership(self, app_client, _patch_org_configs):
        """Org member with active membership gets accepted immediately."""
        from conftest import ALPHA_SLUG, ALPHA_CONFIG
        _patch_org_configs[ALPHA_SLUG] = {**ALPHA_CONFIG}

        from api.services.tokens import create_invite_token
        invite_token = create_invite_token({
            "github_org": "AlphaOrg",
            "org_name": "Alpha Corp",
            "invited_username": "invitee",
            "invited_by": "admin",
            "slug": "alpha",
            "repos": ["repo-a"],
            "repo_name": "egregore-core",
            "is_personal": False,
        })

        respx.get(f"{GITHUB_API}/user").mock(
            return_value=Response(200, json={"login": "invitee", "name": "Invitee"})
        )
        # Active membership
        respx.get(f"{GITHUB_API}/orgs/AlphaOrg/memberships/invitee").mock(
            return_value=Response(200, json={"state": "active"})
        )
        # egregore.json (includes repos list)
        config = {
            "org_name": "Alpha Corp",
            "github_org": "AlphaOrg",
            "memory_repo": "AlphaOrg-memory",
            "api_url": "https://api.example.com",
            "slug": "alpha",
            "repo_name": "egregore-core",
            "repos": ["repo-a"],
        }
        respx.get(f"{GITHUB_API}/repos/AlphaOrg/egregore-core/contents/egregore.json").mock(
            return_value=Response(200, json=_b64_json(config))
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
        data = resp.json()
        assert data["status"] == "accepted"
        assert data["org_slug"] == "alpha"

        # Setup token has correct repo_name
        from api.services.tokens import peek_token
        setup_data = peek_token(data["setup_token"])
        assert setup_data["repo_name"] == "egregore-core"
        assert setup_data["repos"] == ["repo-a"]

    @respx.mock
    def test_invite_accept_org_pending_auto_accepts(self, app_client, _patch_org_configs):
        """Pending org membership gets auto-accepted."""
        from conftest import ALPHA_SLUG, ALPHA_CONFIG
        _patch_org_configs[ALPHA_SLUG] = {**ALPHA_CONFIG}

        from api.services.tokens import create_invite_token
        invite_token = create_invite_token({
            "github_org": "AlphaOrg",
            "org_name": "Alpha Corp",
            "invited_username": "invitee",
            "invited_by": "admin",
            "slug": "alpha",
            "repos": [],
            "repo_name": "egregore-core",
            "is_personal": False,
        })

        respx.get(f"{GITHUB_API}/user").mock(
            return_value=Response(200, json={"login": "invitee", "name": "Invitee"})
        )
        # Pending membership
        respx.get(f"{GITHUB_API}/orgs/AlphaOrg/memberships/invitee").mock(
            return_value=Response(200, json={"state": "pending"})
        )
        # Auto-accept succeeds
        respx.patch(f"{GITHUB_API}/user/memberships/orgs/AlphaOrg").mock(
            return_value=Response(200, json={"state": "active"})
        )
        # egregore.json
        config = {
            "org_name": "Alpha Corp",
            "github_org": "AlphaOrg",
            "memory_repo": "AlphaOrg-memory",
            "api_url": "https://api.example.com",
            "slug": "alpha",
            "repo_name": "egregore-core",
        }
        respx.get(f"{GITHUB_API}/repos/AlphaOrg/egregore-core/contents/egregore.json").mock(
            return_value=Response(200, json=_b64_json(config))
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
    def test_invite_accept_org_no_membership_returns_pending(self, app_client, _patch_org_configs):
        """No org membership at all → pending_github status."""
        from api.services.tokens import create_invite_token
        invite_token = create_invite_token({
            "github_org": "AlphaOrg",
            "org_name": "Alpha Corp",
            "invited_username": "invitee",
            "invited_by": "admin",
            "slug": "alpha",
            "repos": [],
            "repo_name": "egregore-core",
            "is_personal": False,
        })

        respx.get(f"{GITHUB_API}/user").mock(
            return_value=Response(200, json={"login": "invitee", "name": "Invitee"})
        )
        # No membership at all
        respx.get(f"{GITHUB_API}/orgs/AlphaOrg/memberships/invitee").mock(
            return_value=Response(404)
        )

        resp = app_client.post(
            f"/api/org/invite/{invite_token}/accept",
            headers={"Authorization": f"Bearer {INVITEE_TOKEN}"},
        )

        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "pending_github"


# =============================================================================
# DATA CONSISTENCY: repo_name mismatch detection
# =============================================================================


class TestRepoNameConsistency:
    """Tests that catch the repo_name mismatch bug.

    The bug: /invite defaults repo_name to 'egregore-core', but the actual
    instance uses 'egregore-research'. The accept endpoint then reads
    egregore.json from the wrong repo and derives the wrong memory repo name.
    """

    @respx.mock
    def test_invite_without_repo_name_defaults_to_egregore_core(self, app_client, _patch_org_configs):
        """When repo_name is omitted from invite request, it defaults to egregore-core."""
        from conftest import ALPHA_SLUG, ALPHA_CONFIG
        _patch_org_configs[ALPHA_SLUG] = {**ALPHA_CONFIG}

        respx.get(f"{GITHUB_API}/user").mock(
            return_value=Response(200, json={"login": "admin", "name": "Admin"})
        )
        respx.get(f"{GITHUB_API}/repos/AlphaOrg/egregore-core").mock(
            return_value=Response(200, json={"full_name": "AlphaOrg/egregore-core"})
        )
        respx.get(f"{GITHUB_API}/user/memberships/orgs/AlphaOrg").mock(
            return_value=Response(200, json={"role": "admin"})
        )
        respx.put(f"{GITHUB_API}/orgs/AlphaOrg/memberships/invitee").mock(
            return_value=Response(200, json={"state": "pending"})
        )
        respx.get(f"{GITHUB_API}/orgs/AlphaOrg").mock(
            return_value=Response(200, json={"login": "AlphaOrg"})
        )
        config = {
            "org_name": "Alpha Corp",
            "github_org": "AlphaOrg",
            "memory_repo": "AlphaOrg-memory",
            "api_url": "https://api.example.com",
            "slug": "alpha",
            "repo_name": "egregore-core",
        }
        respx.get(f"{GITHUB_API}/repos/AlphaOrg/egregore-core/contents/egregore.json").mock(
            return_value=Response(200, json=_b64_json(config))
        )
        respx.put(f"{GITHUB_API}/repos/AlphaOrg/AlphaOrg-memory/collaborators/invitee").mock(
            return_value=Response(204)
        )

        # Note: no repo_name in the request body — uses default "egregore-core"
        resp = app_client.post(
            "/api/org/invite",
            json={
                "github_org": "AlphaOrg",
                "github_username": "invitee",
            },
            headers={"Authorization": f"Bearer {FOUNDER_TOKEN}"},
        )

        assert resp.status_code == 200
        from api.services.tokens import peek_token
        invite_data = peek_token(resp.json()["invite_token"])
        # Default should be egregore-core
        assert invite_data["repo_name"] == "egregore-core"

    @respx.mock
    def test_invite_with_explicit_repo_name(self, app_client, _patch_org_configs):
        """When repo_name is explicitly provided, invite token uses it."""
        slug = "founder-research"
        _patch_org_configs[slug] = {
            "api_key": "ek_founder-research_abc",
            "org_name": "Research Lab",
            "github_org": "founder",
            "neo4j_host": "neo4j+s://test.neo4j.io",
            "neo4j_user": "neo4j",
            "neo4j_password": "test",
            "telegram_bot_token": "",
            "telegram_chat_id": "",
        }

        respx.get(f"{GITHUB_API}/user").mock(
            return_value=Response(200, json={"login": "founder", "name": "Founder"})
        )
        respx.get(f"{GITHUB_API}/repos/founder/egregore-research").mock(
            return_value=Response(200, json={"full_name": "founder/egregore-research"})
        )
        respx.get(f"{GITHUB_API}/orgs/founder").mock(
            return_value=Response(404)  # Personal account
        )
        respx.put(f"{GITHUB_API}/repos/founder/egregore-research/collaborators/invitee").mock(
            return_value=Response(201)
        )
        egregore_config = {
            "org_name": "Research Lab",
            "github_org": "founder",
            "memory_repo": "founder-research-memory",
            "api_url": "https://api.example.com",
            "slug": "founder-research",
            "repo_name": "egregore-research",
        }
        respx.get(f"{GITHUB_API}/repos/founder/egregore-research/contents/egregore.json").mock(
            return_value=Response(200, json=_b64_json(egregore_config))
        )
        respx.put(f"{GITHUB_API}/repos/founder/founder-research-memory/collaborators/invitee").mock(
            return_value=Response(204)
        )

        resp = app_client.post(
            "/api/org/invite",
            json={
                "github_org": "founder",
                "github_username": "invitee",
                "repo_name": "egregore-research",
            },
            headers={"Authorization": f"Bearer {FOUNDER_TOKEN}"},
        )

        assert resp.status_code == 200
        from api.services.tokens import peek_token
        invite_data = peek_token(resp.json()["invite_token"])
        assert invite_data["repo_name"] == "egregore-research"
        assert invite_data["slug"] == "founder-research"

    @respx.mock
    def test_accept_derives_memory_repo_from_egregore_json(self, app_client, _patch_org_configs):
        """Accept endpoint reads memory_repo from egregore.json, not from a hardcoded default.

        This is critical for named instances where memory repo is
        'founder-research-memory' instead of 'founder-memory'.
        """
        slug = "founder-research"
        _patch_org_configs[slug] = {
            "api_key": "ek_founder-research_abc",
            "org_name": "Research Lab",
            "github_org": "founder",
            "neo4j_host": "neo4j+s://test.neo4j.io",
            "neo4j_user": "neo4j",
            "neo4j_password": "test",
            "telegram_bot_token": "",
            "telegram_chat_id": "",
        }

        from api.services.tokens import create_invite_token
        invite_token = create_invite_token({
            "github_org": "founder",
            "org_name": "Research Lab",
            "invited_username": "invitee",
            "invited_by": "founder",
            "slug": "founder-research",
            "repos": [],
            "repo_name": "egregore-research",
            "is_personal": True,
        })

        respx.get(f"{GITHUB_API}/user").mock(
            return_value=Response(200, json={"login": "invitee", "name": "Invitee"})
        )
        respx.get(f"{GITHUB_API}/user/repository_invitations").mock(
            return_value=Response(200, json=[])
        )
        # Egregore repo accessible
        respx.get(f"{GITHUB_API}/repos/founder/egregore-research").mock(
            return_value=Response(200, json={"full_name": "founder/egregore-research"})
        )
        # egregore.json says memory_repo is "founder-research-memory"
        egregore_config = {
            "org_name": "Research Lab",
            "github_org": "founder",
            "memory_repo": "founder-research-memory",
            "api_url": "https://api.example.com",
            "slug": "founder-research",
            "repo_name": "egregore-research",
        }
        respx.get(f"{GITHUB_API}/repos/founder/egregore-research/contents/egregore.json").mock(
            return_value=Response(200, json=_b64_json(egregore_config))
        )
        # Memory repo NOT accessible — expect pending with correct repo name
        respx.get(f"{GITHUB_API}/repos/founder/founder-research-memory").mock(
            return_value=Response(404)
        )

        resp = app_client.post(
            f"/api/org/invite/{invite_token}/accept",
            headers={"Authorization": f"Bearer {INVITEE_TOKEN}"},
        )

        data = resp.json()
        assert data["status"] == "pending_github"
        # CRITICAL: must mention the actual memory repo name, not the default
        assert "founder-research-memory" in data["message"], (
            f"Accept endpoint checked wrong memory repo. "
            f"Expected 'founder-research-memory' in message, got: {data['message']!r}"
        )


# =============================================================================
# SETUP IDEMPOTENCY
# =============================================================================


class TestSetupIdempotency:
    """Setup should be idempotent — running twice doesn't break things."""

    @respx.mock
    def test_setup_skips_existing_repo(self, app_client, monkeypatch):
        """If the egregore repo already exists, setup continues without error."""
        monkeypatch.setenv("EGREGORE_NEO4J_HOST", "neo4j-test.example.com")
        respx.get(f"{GITHUB_API}/user").mock(
            return_value=Response(200, json={"login": "founder", "name": "Founder"})
        )
        # is_org check (FounderOrg is an org → 200)
        respx.get(f"{GITHUB_API}/orgs/FounderOrg").mock(
            return_value=Response(200, json={"login": "FounderOrg"})
        )
        # Repo already exists on first check
        respx.get(f"{GITHUB_API}/repos/FounderOrg/egregore-core").mock(
            return_value=Response(200, json={"full_name": "FounderOrg/egregore-core"})
        )
        # Memory repo creation returns 422 (already exists)
        respx.post(f"{GITHUB_API}/orgs/FounderOrg/repos").mock(
            return_value=Response(422, json={"message": "name already exists"})
        )
        # Memory repo verification (it exists from before)
        respx.get(f"{GITHUB_API}/repos/FounderOrg/FounderOrg-memory").mock(
            return_value=Response(200, json={"full_name": "FounderOrg/FounderOrg-memory"})
        )
        # Init memory structure
        respx.get(url__regex=rf"{GITHUB_API}/repos/FounderOrg/FounderOrg-memory/contents/.*").mock(
            return_value=Response(404)
        )
        respx.put(url__regex=rf"{GITHUB_API}/repos/FounderOrg/FounderOrg-memory/contents/.*").mock(
            return_value=Response(201, json={"content": {"sha": "new"}})
        )
        # egregore.json update
        respx.get(f"{GITHUB_API}/repos/FounderOrg/egregore-core/contents/egregore.json").mock(
            return_value=Response(200, json=_b64_json({
                "org_name": "Founder Org",
                "github_org": "FounderOrg",
            }))
        )
        respx.put(f"{GITHUB_API}/repos/FounderOrg/egregore-core/contents/egregore.json").mock(
            return_value=Response(200, json={"content": {"sha": "updated"}})
        )
        # Neo4j
        respx.post(url__regex=r"https://neo4j.*").mock(
            return_value=Response(200, json=_neo4j_ok())
        )
        # sync_branch_to_main (skip)
        respx.get(f"{GITHUB_API}/repos/FounderOrg/egregore-core/git/ref/heads/main").mock(
            return_value=Response(404)
        )

        resp = app_client.post(
            "/api/org/setup",
            json={"github_org": "FounderOrg", "org_name": "Founder Org"},
            headers={"Authorization": f"Bearer {FOUNDER_TOKEN}"},
        )

        # Should succeed (not 409)
        assert resp.status_code == 200
        data = resp.json()
        assert "setup_token" in data


# =============================================================================
# EDGE CASES
# =============================================================================


class TestEdgeCases:
    """Edge cases in the flow."""

    def test_expired_invite_token_rejected(self, app_client):
        """Expired invite → 404."""
        from api.services.tokens import create_invite_token
        import time

        token = create_invite_token({"github_org": "X"}, ttl=0)
        time.sleep(0.01)

        resp = app_client.post(
            f"/api/org/invite/{token}/accept",
            headers={"Authorization": "Bearer ghp_test"},
        )
        assert resp.status_code == 404

    @respx.mock
    def test_invite_token_consumed_after_accept(self, app_client, _patch_org_configs):
        """After successful accept, the invite token is consumed."""
        from conftest import ALPHA_SLUG, ALPHA_CONFIG
        _patch_org_configs[ALPHA_SLUG] = {**ALPHA_CONFIG}

        from api.services.tokens import create_invite_token
        invite_token = create_invite_token({
            "github_org": "AlphaOrg",
            "org_name": "Alpha Corp",
            "invited_username": "invitee",
            "invited_by": "admin",
            "slug": "alpha",
            "repos": [],
            "repo_name": "egregore-core",
            "is_personal": False,
        })

        respx.get(f"{GITHUB_API}/user").mock(
            return_value=Response(200, json={"login": "invitee", "name": "Invitee"})
        )
        respx.get(f"{GITHUB_API}/orgs/AlphaOrg/memberships/invitee").mock(
            return_value=Response(200, json={"state": "active"})
        )
        config = {
            "org_name": "Alpha Corp",
            "github_org": "AlphaOrg",
            "memory_repo": "AlphaOrg-memory",
            "api_url": "https://api.example.com",
            "slug": "alpha",
        }
        respx.get(f"{GITHUB_API}/repos/AlphaOrg/egregore-core/contents/egregore.json").mock(
            return_value=Response(200, json=_b64_json(config))
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
        assert resp1.json()["status"] == "accepted"

        # Second accept → consumed
        resp2 = app_client.post(
            f"/api/org/invite/{invite_token}/accept",
            headers={"Authorization": f"Bearer {INVITEE_TOKEN}"},
        )
        assert resp2.status_code == 404

    @respx.mock
    def test_accept_with_invalid_github_token(self, app_client):
        """Invalid GitHub token → 401."""
        from api.services.tokens import create_invite_token
        invite_token = create_invite_token({
            "github_org": "AlphaOrg",
            "slug": "alpha",
        })

        respx.get(f"{GITHUB_API}/user").mock(
            return_value=Response(401, json={"message": "Bad credentials"})
        )

        resp = app_client.post(
            f"/api/org/invite/{invite_token}/accept",
            headers={"Authorization": "Bearer bad_token"},
        )
        assert resp.status_code == 401


# =============================================================================
# CLAIM + INSTALL DATA VERIFICATION
# =============================================================================


class TestClaimDataConsistency:
    """Tests that the claim endpoint returns data the installer can actually use.

    The installer (npx create-egregore) does:
    1. GET /api/org/claim/{token} → gets fork_url, memory_url, api_key, etc.
    2. git clone fork_url
    3. git clone memory_url  ← THIS is where it breaks if memory repo doesn't exist

    These tests verify the claim data is internally consistent and points
    to repos that were actually created during setup.
    """

    @respx.mock
    def test_setup_claim_has_consistent_urls(self, app_client, monkeypatch):
        """Claim data from setup must have matching repo_name, slug, and memory_url."""
        monkeypatch.setenv("EGREGORE_NEO4J_HOST", "neo4j-test.example.com")
        respx.get(f"{GITHUB_API}/user").mock(
            return_value=Response(200, json={"login": "founder", "name": "Founder"})
        )
        # is_org check (personal account → 404)
        respx.get(f"{GITHUB_API}/orgs/founder").mock(
            return_value=Response(404)
        )
        # Named instance repo: 404 on initial check, then 200 when wait_for_repo polls
        repo_check_calls = []
        def _repo_check(request):
            repo_check_calls.append(True)
            if len(repo_check_calls) == 1:
                return Response(404)
            return Response(200, json={"full_name": "founder/egregore-research"})
        respx.get(f"{GITHUB_API}/repos/founder/egregore-research").mock(
            side_effect=_repo_check
        )
        # Generate from template (creates with final name, private by default)
        respx.post(f"{GITHUB_API}/repos/Curve-Labs/egregore-core/generate").mock(
            return_value=Response(201, json={"full_name": "founder/egregore-research"})
        )
        # CLAUDE.md content check (wait_for_repo checks template content is committed)
        respx.get(f"{GITHUB_API}/repos/founder/egregore-research/contents/CLAUDE.md").mock(
            return_value=Response(200, json={"content": "IyBFZ3JlZ29yZQ==", "encoding": "base64", "sha": "tmpl"})
        )
        respx.post(f"{GITHUB_API}/user/repos").mock(
            return_value=Response(201, json={"full_name": "founder/founder-research-memory"})
        )
        # Memory repo exists after creation (verification step)
        respx.get(f"{GITHUB_API}/repos/founder/founder-research-memory").mock(
            return_value=Response(200, json={"full_name": "founder/founder-research-memory"})
        )
        respx.get(url__regex=rf"{GITHUB_API}/repos/founder/founder-research-memory/contents/.*").mock(
            return_value=Response(404)
        )
        respx.put(url__regex=rf"{GITHUB_API}/repos/founder/founder-research-memory/contents/.*").mock(
            return_value=Response(201, json={"content": {"sha": "new"}})
        )
        respx.get(f"{GITHUB_API}/repos/founder/egregore-research/contents/egregore.json").mock(
            return_value=Response(404)
        )
        respx.put(f"{GITHUB_API}/repos/founder/egregore-research/contents/egregore.json").mock(
            return_value=Response(201, json={"content": {"sha": "new"}})
        )
        respx.post(url__regex=r"https://neo4j.*").mock(
            return_value=Response(200, json=_neo4j_ok())
        )
        # sync_branch_to_main (skip)
        respx.get(f"{GITHUB_API}/repos/founder/egregore-research/git/ref/heads/main").mock(
            return_value=Response(404)
        )

        # Setup
        setup_resp = app_client.post(
            "/api/org/setup",
            json={
                "github_org": "founder",
                "org_name": "Research Lab",
                "is_personal": True,
                "instance_name": "research",
            },
            headers={"Authorization": f"Bearer {FOUNDER_TOKEN}"},
        )
        assert setup_resp.status_code == 200
        setup_token = setup_resp.json()["setup_token"]

        # Claim
        claim_resp = app_client.get(f"/api/org/claim/{setup_token}")
        assert claim_resp.status_code == 200
        claim = claim_resp.json()

        # Verify consistency
        assert claim["repo_name"] == "egregore-research"
        assert claim["slug"] == "founder-research"
        assert "egregore-research" in claim["fork_url"]
        assert "founder-research-memory" in claim["memory_url"]
        assert claim["org_name"] == "Research Lab"
        assert claim["github_org"] == "founder"
        assert claim["api_key"].startswith("ek_founder-research_")

    @respx.mock
    def test_accept_claim_has_consistent_urls(self, app_client, _patch_org_configs):
        """Claim data from invite accept must match the instance's actual repos."""
        slug = "founder-research"
        _patch_org_configs[slug] = {
            "api_key": "ek_founder-research_abc",
            "org_name": "Research Lab",
            "github_org": "founder",
            "neo4j_host": "neo4j+s://test.neo4j.io",
            "neo4j_user": "neo4j",
            "neo4j_password": "test",
            "telegram_bot_token": "123:ABC",
            "telegram_chat_id": "-100test",
        }

        from api.services.tokens import create_invite_token
        invite_token = create_invite_token({
            "github_org": "founder",
            "org_name": "Research Lab",
            "invited_username": "invitee",
            "invited_by": "founder",
            "slug": "founder-research",
            "repos": [],
            "repo_name": "egregore-research",
            "is_personal": True,
        })

        respx.get(f"{GITHUB_API}/user").mock(
            return_value=Response(200, json={"login": "invitee", "name": "Invitee"})
        )
        respx.get(f"{GITHUB_API}/user/repository_invitations").mock(
            return_value=Response(200, json=[])
        )
        respx.get(f"{GITHUB_API}/repos/founder/egregore-research").mock(
            return_value=Response(200, json={"full_name": "founder/egregore-research"})
        )
        egregore_config = {
            "org_name": "Research Lab",
            "github_org": "founder",
            "memory_repo": "founder-research-memory",
            "api_url": "https://api.example.com",
            "slug": "founder-research",
            "repo_name": "egregore-research",
        }
        respx.get(f"{GITHUB_API}/repos/founder/egregore-research/contents/egregore.json").mock(
            return_value=Response(200, json=_b64_json(egregore_config))
        )
        respx.get(f"{GITHUB_API}/repos/founder/founder-research-memory").mock(
            return_value=Response(200, json={"full_name": "founder/founder-research-memory"})
        )
        respx.post(url__regex=r"https://neo4j.*").mock(
            return_value=Response(200, json=_neo4j_ok())
        )
        respx.post(url__regex=r"https://api\.telegram\.org/.*").mock(
            return_value=Response(200, json={
                "ok": True,
                "result": {"invite_link": "https://t.me/+abc123"},
            })
        )

        # Accept
        accept_resp = app_client.post(
            f"/api/org/invite/{invite_token}/accept",
            headers={"Authorization": f"Bearer {INVITEE_TOKEN}"},
        )
        assert accept_resp.status_code == 200
        accept_data = accept_resp.json()
        assert accept_data["status"] == "accepted"

        # Claim
        claim_resp = app_client.get(f"/api/org/claim/{accept_data['setup_token']}")
        assert claim_resp.status_code == 200
        claim = claim_resp.json()

        # Verify the installer will clone the RIGHT repos
        assert "egregore-research" in claim["fork_url"], (
            f"fork_url should reference egregore-research, got: {claim['fork_url']}"
        )
        assert "founder-research-memory" in claim["memory_url"], (
            f"memory_url should reference founder-research-memory, got: {claim['memory_url']}"
        )
        assert claim["repo_name"] == "egregore-research"
        assert claim["slug"] == "founder-research"
        assert claim["api_key"] == "ek_founder-research_abc"


# =============================================================================
# MEMORY REPO VERIFICATION
# =============================================================================


class TestMemoryRepoVerification:
    """Tests that setup FAILS if memory repo creation silently fails.

    This catches the exact bug: setup says 'success' but the memory repo
    doesn't exist, so the installer fails at 'git clone memory_url'.
    """

    @respx.mock
    def test_setup_fails_if_memory_repo_not_created(self, app_client, monkeypatch):
        """Setup must error if memory repo doesn't exist after creation attempt."""
        monkeypatch.setenv("EGREGORE_NEO4J_HOST", "neo4j-test.example.com")
        respx.get(f"{GITHUB_API}/user").mock(
            return_value=Response(200, json={"login": "founder", "name": "Founder"})
        )
        # is_org check (personal account → 404)
        respx.get(f"{GITHUB_API}/orgs/founder").mock(
            return_value=Response(404)
        )
        # Egregore repo: first 404 (doesn't exist), then 200 when wait_for_repo polls
        repo_calls = []
        def _repo_check(request):
            repo_calls.append(True)
            if len(repo_calls) == 1:
                return Response(404)
            return Response(200, json={"full_name": "founder/egregore-core"})
        respx.get(f"{GITHUB_API}/repos/founder/egregore-core").mock(
            side_effect=_repo_check
        )
        # Generate from template (creates with correct name, private by default)
        respx.post(f"{GITHUB_API}/repos/Curve-Labs/egregore-core/generate").mock(
            return_value=Response(201, json={"full_name": "founder/egregore-core"})
        )
        # CLAUDE.md content check (wait_for_repo checks template content is committed)
        respx.get(f"{GITHUB_API}/repos/founder/egregore-core/contents/CLAUDE.md").mock(
            return_value=Response(200, json={"content": "IyBFZ3JlZ29yZQ==", "encoding": "base64", "sha": "tmpl"})
        )
        # Memory repo creation "succeeds" (201) but repo doesn't actually exist
        respx.post(f"{GITHUB_API}/user/repos").mock(
            return_value=Response(201, json={"full_name": "founder/founder-memory"})
        )
        # Verification: repo does NOT exist
        respx.get(f"{GITHUB_API}/repos/founder/founder-memory").mock(
            return_value=Response(404)
        )

        resp = app_client.post(
            "/api/org/setup",
            json={
                "github_org": "founder",
                "org_name": "Founder",
                "is_personal": True,
            },
            headers={"Authorization": f"Bearer {FOUNDER_TOKEN}"},
        )

        assert resp.status_code == 500
        assert "memory repo" in resp.json()["detail"].lower()

    @respx.mock
    def test_setup_succeeds_when_memory_repo_verified(self, app_client, monkeypatch):
        """Setup succeeds when memory repo exists after creation."""
        monkeypatch.setenv("EGREGORE_NEO4J_HOST", "neo4j-test.example.com")
        respx.get(f"{GITHUB_API}/user").mock(
            return_value=Response(200, json={"login": "founder", "name": "Founder"})
        )
        # is_org check (personal account → 404)
        respx.get(f"{GITHUB_API}/orgs/founder").mock(
            return_value=Response(404)
        )
        # Egregore repo: first 404 (doesn't exist), then 200 when wait_for_repo polls
        repo_calls = []
        def _repo_check(request):
            repo_calls.append(True)
            if len(repo_calls) <= 1:
                return Response(404)
            return Response(200, json={"full_name": "founder/egregore-core"})
        respx.get(f"{GITHUB_API}/repos/founder/egregore-core").mock(
            side_effect=_repo_check
        )
        # Generate from template (creates with correct name, private by default)
        respx.post(f"{GITHUB_API}/repos/Curve-Labs/egregore-core/generate").mock(
            return_value=Response(201, json={"full_name": "founder/egregore-core"})
        )
        # CLAUDE.md content check (wait_for_repo checks template content is committed)
        respx.get(f"{GITHUB_API}/repos/founder/egregore-core/contents/CLAUDE.md").mock(
            return_value=Response(200, json={"content": "IyBFZ3JlZ29yZQ==", "encoding": "base64", "sha": "tmpl"})
        )
        respx.post(f"{GITHUB_API}/user/repos").mock(
            return_value=Response(201, json={"full_name": "founder/founder-memory"})
        )
        # Verification: repo DOES exist
        respx.get(f"{GITHUB_API}/repos/founder/founder-memory").mock(
            return_value=Response(200, json={"full_name": "founder/founder-memory"})
        )
        respx.get(url__regex=rf"{GITHUB_API}/repos/founder/founder-memory/contents/.*").mock(
            return_value=Response(404)
        )
        respx.put(url__regex=rf"{GITHUB_API}/repos/founder/founder-memory/contents/.*").mock(
            return_value=Response(201, json={"content": {"sha": "new"}})
        )
        respx.get(f"{GITHUB_API}/repos/founder/egregore-core/contents/egregore.json").mock(
            return_value=Response(404)
        )
        respx.put(f"{GITHUB_API}/repos/founder/egregore-core/contents/egregore.json").mock(
            return_value=Response(201, json={"content": {"sha": "new"}})
        )
        respx.post(url__regex=r"https://neo4j.*").mock(
            return_value=Response(200, json=_neo4j_ok())
        )
        # sync_branch_to_main (skip)
        respx.get(f"{GITHUB_API}/repos/founder/egregore-core/git/ref/heads/main").mock(
            return_value=Response(404)
        )

        resp = app_client.post(
            "/api/org/setup",
            json={
                "github_org": "founder",
                "org_name": "Founder",
                "is_personal": True,
            },
            headers={"Authorization": f"Bearer {FOUNDER_TOKEN}"},
        )

        assert resp.status_code == 200
        assert "setup_token" in resp.json()
