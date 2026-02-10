"""Cross-tenant data leakage prevention tests.

Sets up TWO orgs (alpha, beta) and verifies complete isolation at every layer:
API keys, Neo4j org-scoping, notifications, tokens, and install scripts.
"""

import sys
import json
import secrets
from pathlib import Path
from unittest.mock import patch

import pytest
import respx
from httpx import Response

sys.path.insert(0, str(Path(__file__).parent.parent))

from api.services.graph import inject_org_scope
from api.services.tokens import _tokens, create_token, create_invite_token

pytestmark = pytest.mark.isolation


@pytest.fixture(autouse=True)
def clear_tokens():
    _tokens.clear()
    yield
    _tokens.clear()


def _neo4j_ok():
    return {"data": {"fields": [], "values": []}}


# =============================================================================
# API KEY ISOLATION
# =============================================================================


class TestApiKeyIsolation:
    def test_api_key_rejects_wrong_org(self, app_client, org_alpha, org_beta):
        """Alpha's key used on beta's data — should only return alpha-scoped data.

        We verify by sending a graph query with alpha's key and checking
        the Cypher sent to Neo4j has alpha's slug injected.
        """
        captured_bodies = []

        with respx.mock:
            route = respx.post(url__regex=r"https://neo4j-alpha.*")
            route.mock(side_effect=lambda req: (
                captured_bodies.append(json.loads(req.content)),
                Response(200, json=_neo4j_ok()),
            )[-1])

            resp = app_client.post(
                "/api/graph/query",
                json={"statement": "MATCH (p:Person) RETURN p", "parameters": {}},
                headers={"Authorization": f"Bearer {org_alpha['api_key']}"},
            )

        assert resp.status_code == 200
        # Verify the query was scoped to alpha
        assert len(captured_bodies) == 1
        body = captured_bodies[0]
        assert body["parameters"]["_org"] == "alpha"
        assert "org: $_org" in body["statement"]

    def test_api_key_format_validation(self, app_client):
        """Malformed keys → 401."""
        for bad_key in ["", "not_a_key", "ek_", "ek_bad", "Bearer xyz"]:
            resp = app_client.post(
                "/api/graph/query",
                json={"statement": "RETURN 1", "parameters": {}},
                headers={"Authorization": f"Bearer {bad_key}"},
            )
            assert resp.status_code in (401, 422), f"Key '{bad_key}' should be rejected"

    def test_api_key_timing_safe_comparison(self):
        """Keys use secrets.compare_digest, not ==."""
        from api import auth
        import inspect

        source = inspect.getsource(auth.validate_api_key)
        assert "compare_digest" in source
        # Should NOT use simple == for key comparison
        # (We check the source code rather than timing, which is more reliable)

    def test_unknown_org_slug_rejected(self, app_client):
        """API key with unknown org slug → 401."""
        fake_key = "ek_nonexistent_" + secrets.token_hex(16)
        resp = app_client.post(
            "/api/graph/query",
            json={"statement": "RETURN 1", "parameters": {}},
            headers={"Authorization": f"Bearer {fake_key}"},
        )
        assert resp.status_code == 401

    def test_wrong_secret_part_rejected(self, app_client):
        """Right org slug but wrong secret part → 401."""
        fake_key = "ek_alpha_" + secrets.token_hex(16)  # Wrong secret
        resp = app_client.post(
            "/api/graph/query",
            json={"statement": "RETURN 1", "parameters": {}},
            headers={"Authorization": f"Bearer {fake_key}"},
        )
        assert resp.status_code == 401


# =============================================================================
# NEO4J ORG-SCOPING
# =============================================================================


class TestNeo4jOrgScoping:
    """Verify inject_org_scope on common query patterns."""

    def test_scope_adds_org_to_bare_nodes(self):
        result = inject_org_scope("MATCH (p:Person) RETURN p", "alpha")
        assert "(p:Person {org: $_org})" in result

    def test_scope_adds_org_to_nodes_with_props(self):
        result = inject_org_scope("MATCH (p:Person {name: $name}) RETURN p", "alpha")
        assert "name: $name, org: $_org}" in result

    def test_scope_skips_org_label(self):
        result = inject_org_scope("MATCH (o:Org {id: $id}) RETURN o", "alpha")
        # Org is a system label — should not get org: $_org
        assert result.count("org: $_org") == 0 or "Org {id: $id}" in result

    def test_scope_skips_call_statements(self):
        stmt = "CALL db.schema.visualization()"
        assert inject_org_scope(stmt, "alpha") == stmt

    def test_scope_idempotent(self):
        stmt = "MATCH (p:Person {name: $name, org: $_org}) RETURN p"
        result = inject_org_scope(stmt, "alpha")
        assert result.count("org: $_org") == 1

    def test_scope_handles_multiple_labels(self):
        result = inject_org_scope(
            "MATCH (p:Person)-[:BY]->(s:Session), (a:Artifact) RETURN p, s, a",
            "alpha",
        )
        assert "(p:Person {org: $_org})" in result
        assert "(s:Session {org: $_org})" in result
        assert "(a:Artifact {org: $_org})" in result

    def test_scope_handles_create_merge(self):
        result = inject_org_scope("CREATE (s:Session) SET s.topic = $t", "alpha")
        assert "(s:Session {org: $_org})" in result

        result2 = inject_org_scope("MERGE (p:Person {name: $n})", "alpha")
        assert "org: $_org" in result2


# =============================================================================
# CROSS-TENANT QUERY ISOLATION
# =============================================================================


class TestCrossTenantQueryIsolation:
    def test_org_alpha_query_scoped_to_alpha(self, app_client, org_alpha):
        """Verify every labeled node in the query sent to Neo4j includes alpha's slug."""
        captured = []

        with respx.mock:
            respx.post(url__regex=r"https://neo4j-alpha.*").mock(
                side_effect=lambda req: (
                    captured.append(json.loads(req.content)),
                    Response(200, json=_neo4j_ok()),
                )[-1]
            )

            app_client.post(
                "/api/graph/query",
                json={
                    "statement": "MATCH (p:Person)-[:BY]->(s:Session) RETURN p, s",
                    "parameters": {},
                },
                headers={"Authorization": f"Bearer {org_alpha['api_key']}"},
            )

        assert len(captured) == 1
        sent_stmt = captured[0]["statement"]
        # Both Person and Session should have org: $_org
        assert sent_stmt.count("org: $_org") == 2
        assert captured[0]["parameters"]["_org"] == "alpha"

    def test_graph_query_endpoint_uses_correct_neo4j_host(self, app_client, org_alpha, org_beta):
        """Alpha's query goes to alpha's Neo4j, not beta's."""
        alpha_hit = []
        beta_hit = []

        with respx.mock:
            respx.post(url__regex=r"https://neo4j-alpha.*").mock(
                side_effect=lambda req: (
                    alpha_hit.append(True),
                    Response(200, json=_neo4j_ok()),
                )[-1]
            )
            respx.post(url__regex=r"https://neo4j-beta.*").mock(
                side_effect=lambda req: (
                    beta_hit.append(True),
                    Response(200, json=_neo4j_ok()),
                )[-1]
            )

            app_client.post(
                "/api/graph/query",
                json={"statement": "MATCH (p:Person) RETURN p", "parameters": {}},
                headers={"Authorization": f"Bearer {org_alpha['api_key']}"},
            )

        assert len(alpha_hit) == 1
        assert len(beta_hit) == 0


# =============================================================================
# NOTIFICATION ISOLATION
# =============================================================================


class TestNotificationIsolation:
    def test_notify_send_uses_own_bot_token(self, app_client, org_alpha, org_beta):
        """Alpha's notify uses alpha's telegram_bot_token."""
        telegram_calls = []

        with respx.mock:
            # Mock Neo4j lookup for telegramId
            respx.post(url__regex=r"https://neo4j-alpha.*").mock(
                return_value=Response(200, json={
                    "data": {"fields": ["tid"], "values": [["12345"]]}
                })
            )
            # Capture Telegram call
            respx.post(url__regex=r"https://api\.telegram\.org/bot.*").mock(
                side_effect=lambda req: (
                    telegram_calls.append(str(req.url)),
                    Response(200, json={"ok": True}),
                )[-1]
            )

            app_client.post(
                "/api/notify/send",
                json={"to": "oz", "message": "test"},
                headers={"Authorization": f"Bearer {org_alpha['api_key']}"},
            )

        assert len(telegram_calls) == 1
        # Should use alpha's bot token, not beta's
        assert "111111:AAAlpha" in telegram_calls[0]
        assert "222222:BBBeta" not in telegram_calls[0]

    def test_notify_group_scoped_to_org(self, app_client, org_alpha):
        """Group message goes to alpha's chat_id."""
        telegram_calls = []

        with respx.mock:
            respx.post(url__regex=r"https://api\.telegram\.org/bot.*").mock(
                side_effect=lambda req: (
                    telegram_calls.append(json.loads(req.content)),
                    Response(200, json={"ok": True}),
                )[-1]
            )

            app_client.post(
                "/api/notify/group",
                json={"message": "hello group"},
                headers={"Authorization": f"Bearer {org_alpha['api_key']}"},
            )

        assert len(telegram_calls) == 1
        assert telegram_calls[0]["chat_id"] == "-100alpha"

    def test_telegram_chat_id_update_scoped(self, app_client, _patch_org_configs, monkeypatch):
        """POST /api/org/telegram updates only the target org's chat_id."""
        bot_token = "test_bot_token_for_auth"
        monkeypatch.setenv("TELEGRAM_BOT_TOKEN", bot_token)

        with respx.mock:
            # Neo4j update
            respx.post(url__regex=r"https://neo4j.*").mock(
                return_value=Response(200, json=_neo4j_ok())
            )

            resp = app_client.post(
                "/api/org/telegram",
                json={"org_slug": "alpha", "chat_id": "-999new"},
                headers={"Authorization": f"Bearer {bot_token}"},
            )

        assert resp.status_code == 200
        # Alpha's chat_id updated
        assert _patch_org_configs["alpha"]["telegram_chat_id"] == "-999new"
        # Beta's chat_id unchanged
        assert _patch_org_configs["beta"]["telegram_chat_id"] == "-100beta"


# =============================================================================
# TOKEN ISOLATION
# =============================================================================


class TestTokenIsolation:
    def test_setup_token_contains_only_own_data(self, app_client):
        """Token from alpha contains alpha's API key, not beta's."""
        from conftest import ALPHA_API_KEY, BETA_API_KEY

        token = create_token({
            "api_key": ALPHA_API_KEY,
            "org_name": "Alpha Corp",
            "slug": "alpha",
        })

        resp = app_client.get(f"/api/org/claim/{token}")
        assert resp.status_code == 200
        data = resp.json()

        assert data["api_key"] == ALPHA_API_KEY
        assert BETA_API_KEY not in json.dumps(data)

    def test_invite_token_scoped_to_org(self):
        """Invite from alpha references alpha's github_org and slug."""
        from api.services.tokens import peek_token

        token = create_invite_token({
            "github_org": "AlphaOrg",
            "org_name": "Alpha Corp",
            "slug": "alpha",
            "invited_username": "newuser",
            "invited_by": "admin",
        })

        data = peek_token(token)
        assert data["github_org"] == "AlphaOrg"
        assert data["slug"] == "alpha"
        assert "BetaOrg" not in json.dumps(data)
        assert "beta" not in data["slug"]


# =============================================================================
# INSTALL SCRIPT ISOLATION
# =============================================================================


class TestInstallScriptIsolation:
    def test_install_script_contains_token_and_api_url(self, app_client):
        """GET /api/org/install/{token} returns script with the token ID for claiming.

        The install script doesn't embed credentials directly — it embeds the
        token ID and API URL. At runtime, curl claims the token to get creds.
        This means the script is safe to transmit and only the token holder
        can claim the credentials.
        """
        from conftest import ALPHA_API_KEY

        token = create_token({
            "fork_url": "https://github.com/AlphaOrg/egregore-core.git",
            "memory_url": "https://github.com/AlphaOrg/AlphaOrg-memory.git",
            "api_key": ALPHA_API_KEY,
            "api_url": "https://api.example.com",
            "org_name": "Alpha Corp",
            "github_org": "AlphaOrg",
            "github_token": "ghp_alpha",
            "slug": "alpha",
            "repos": [],
            "repo_name": "egregore-core",
        })

        resp = app_client.get(f"/api/org/install/{token}")

        assert resp.status_code == 200
        script = resp.text

        # Script should reference the token for claiming
        assert token in script
        # Script should contain the claim endpoint URL
        assert "/api/org/claim/" in script
        # Script should NOT embed the API key directly (it comes from the claim response)
        assert ALPHA_API_KEY not in script

    def test_install_script_expired_token_returns_error(self, app_client):
        """Expired token → 404 error script."""
        import time

        token = create_token({"x": 1}, ttl=0)
        time.sleep(0.01)

        resp = app_client.get(f"/api/org/install/{token}")
        assert resp.status_code == 404
