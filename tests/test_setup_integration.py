"""Real integration test for the setup flow.

Calls REAL GitHub API — creates actual repos, verifies privacy.
Runs the full setup endpoint via FastAPI TestClient (in-process, uses
our code changes) with real GitHub but mocked Neo4j/Telegram.

Requires: GITHUB_TOKEN in ../.env with repo scope.

Usage:
    cd tests && python -m pytest test_setup_integration.py -v -s
"""

import sys
import json
import asyncio
from pathlib import Path

import pytest
import respx
from httpx import Response

sys.path.insert(0, str(Path(__file__).parent.parent))

from api.services.github import (
    generate_from_template,
    create_repo,
    repo_exists,
    wait_for_repo,
    get_user,
)
from api.services.tokens import _tokens

# Load token from .env
_env_path = Path(__file__).parent.parent / ".env"
GITHUB_TOKEN = ""
if _env_path.exists():
    for line in _env_path.read_text().splitlines():
        if line.startswith("GITHUB_TOKEN="):
            GITHUB_TOKEN = line.split("=", 1)[1].strip()

GITHUB_API = "https://api.github.com"
TEST_INSTANCE_SUFFIX = "integration-test"
TEST_REPO_NAME = f"egregore-{TEST_INSTANCE_SUFFIX}"

pytestmark = pytest.mark.integration


def _headers():
    return {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github+json",
    }


def _memory_name(owner: str) -> str:
    """Compute memory repo name matching setup flow convention."""
    base_slug = owner.lower().replace("-", "").replace(" ", "")
    slug = f"{base_slug}-{TEST_INSTANCE_SUFFIX}"
    return f"{slug}-memory"


@pytest.fixture(autouse=True)
def require_token():
    if not GITHUB_TOKEN:
        pytest.skip("No GITHUB_TOKEN in .env — skipping integration tests")


@pytest.fixture(autouse=True)
def clear_tokens():
    _tokens.clear()
    yield
    _tokens.clear()


# =============================================================================
# FULL SETUP ENDPOINT — real GitHub, mocked Neo4j
# =============================================================================


class TestFullSetupEndpoint:
    """Test POST /api/org/setup with real GitHub API calls.

    Neo4j and Telegram are mocked (they're not what we're testing).
    GitHub calls are REAL — this creates actual repos.

    Tests are idempotent — they work whether repos exist or not.
    Cleanup requires delete_repo scope (optional, repos are harmless).
    """

    @pytest.fixture(autouse=True)
    def setup_owner(self):
        user = asyncio.get_event_loop().run_until_complete(get_user(GITHUB_TOKEN))
        self.owner = user["login"]
        self.test_memory = _memory_name(self.owner)

    @pytest.fixture
    def app_client(self):
        from fastapi.testclient import TestClient
        from api.main import app
        return TestClient(app, raise_server_exceptions=False)

    def test_setup_creates_private_repos(self, app_client, monkeypatch):
        """Full setup flow: creates egregore repo (private) + memory repo (private).

        This is THE critical test. It simulates exactly what happens when
        someone goes through the website → npx create-egregore flow.
        """
        owner = self.owner

        # Mock only Neo4j (real GitHub)
        monkeypatch.setenv("EGREGORE_NEO4J_HOST", "neo4j-test.example.com")
        neo4j_ok = {"data": {"fields": [], "values": []}}

        with respx.mock(assert_all_mocked=False) as rsps:
            rsps.route(url__regex=r"https://neo4j-test.*").mock(
                return_value=Response(200, json=neo4j_ok)
            )
            rsps.route(host="api.github.com").pass_through()

            resp = app_client.post(
                "/api/org/setup",
                json={
                    "github_org": owner,
                    "org_name": "Integration Test",
                    "is_personal": True,
                    "instance_name": TEST_INSTANCE_SUFFIX,
                },
                headers={"Authorization": f"Bearer {GITHUB_TOKEN}"},
            )

        assert resp.status_code == 200, f"Setup failed: {resp.text}"
        data = resp.json()

        # Verify response structure
        assert data["setup_token"].startswith("st_")
        assert TEST_REPO_NAME in data["fork_url"]
        assert self.test_memory in data["memory_url"]

        # Verify BOTH repos are private on GitHub
        import httpx
        for repo_name in [TEST_REPO_NAME, self.test_memory]:
            check = httpx.get(
                f"{GITHUB_API}/repos/{owner}/{repo_name}",
                headers=_headers(),
                timeout=10.0,
            )
            assert check.status_code == 200, f"{repo_name} not found on GitHub"
            assert check.json()["private"] is True, f"{repo_name} should be private"

        print(f"\n  PASS: {owner}/{TEST_REPO_NAME} — private: true")
        print(f"  PASS: {owner}/{self.test_memory} — private: true")
        print(f"  PASS: Setup token: {data['setup_token'][:20]}...")

    def test_setup_idempotent(self, app_client, monkeypatch):
        """Running setup twice doesn't error — repos already exist."""
        owner = self.owner

        # Ensure repos exist (create if needed — first run may have done this)
        if not asyncio.get_event_loop().run_until_complete(
            repo_exists(GITHUB_TOKEN, owner, TEST_REPO_NAME)
        ):
            asyncio.get_event_loop().run_until_complete(
                generate_from_template(GITHUB_TOKEN, owner, TEST_REPO_NAME, private=True)
            )
            asyncio.get_event_loop().run_until_complete(
                wait_for_repo(GITHUB_TOKEN, owner, TEST_REPO_NAME, timeout=30)
            )
        if not asyncio.get_event_loop().run_until_complete(
            repo_exists(GITHUB_TOKEN, owner, self.test_memory)
        ):
            asyncio.get_event_loop().run_until_complete(
                create_repo(GITHUB_TOKEN, self.test_memory, org=None, private=True)
            )

        # Second setup call — should succeed
        monkeypatch.setenv("EGREGORE_NEO4J_HOST", "neo4j-test.example.com")
        neo4j_ok = {"data": {"fields": [], "values": []}}

        with respx.mock(assert_all_mocked=False) as rsps:
            rsps.route(url__regex=r"https://neo4j-test.*").mock(
                return_value=Response(200, json=neo4j_ok)
            )
            rsps.route(host="api.github.com").pass_through()

            resp = app_client.post(
                "/api/org/setup",
                json={
                    "github_org": owner,
                    "org_name": "Integration Test",
                    "is_personal": True,
                    "instance_name": TEST_INSTANCE_SUFFIX,
                },
                headers={"Authorization": f"Bearer {GITHUB_TOKEN}"},
            )

        assert resp.status_code == 200, f"Idempotent setup failed: {resp.text}"
        print(f"\n  PASS: Idempotent setup — repos already existed, no error")

    def test_egregore_json_written_to_repo(self, app_client, monkeypatch):
        """After setup, egregore.json in the repo has correct config."""
        owner = self.owner

        # Run setup (idempotent)
        monkeypatch.setenv("EGREGORE_NEO4J_HOST", "neo4j-test.example.com")
        neo4j_ok = {"data": {"fields": [], "values": []}}

        with respx.mock(assert_all_mocked=False) as rsps:
            rsps.route(url__regex=r"https://neo4j-test.*").mock(
                return_value=Response(200, json=neo4j_ok)
            )
            rsps.route(host="api.github.com").pass_through()

            app_client.post(
                "/api/org/setup",
                json={
                    "github_org": owner,
                    "org_name": "Integration Test",
                    "is_personal": True,
                    "instance_name": TEST_INSTANCE_SUFFIX,
                },
                headers={"Authorization": f"Bearer {GITHUB_TOKEN}"},
            )

        # Read egregore.json from the repo
        import httpx
        import base64
        resp = httpx.get(
            f"{GITHUB_API}/repos/{owner}/{TEST_REPO_NAME}/contents/egregore.json",
            headers=_headers(),
            timeout=10.0,
        )
        assert resp.status_code == 200, f"egregore.json not found in {TEST_REPO_NAME}"

        config = json.loads(base64.b64decode(resp.json()["content"]).decode())
        assert config["org_name"] == "Integration Test"
        assert config["github_org"] == owner
        assert self.test_memory in config["memory_repo"]
        print(f"\n  PASS: egregore.json has correct config")
        print(f"    org_name: {config['org_name']}")
        print(f"    github_org: {config['github_org']}")
        print(f"    memory_repo: {config['memory_repo']}")

    def test_claim_token_returns_install_data(self, app_client, monkeypatch):
        """Claim the setup token and verify installer gets correct data."""
        owner = self.owner

        monkeypatch.setenv("EGREGORE_NEO4J_HOST", "neo4j-test.example.com")
        neo4j_ok = {"data": {"fields": [], "values": []}}

        with respx.mock(assert_all_mocked=False) as rsps:
            rsps.route(url__regex=r"https://neo4j-test.*").mock(
                return_value=Response(200, json=neo4j_ok)
            )
            rsps.route(host="api.github.com").pass_through()

            setup_resp = app_client.post(
                "/api/org/setup",
                json={
                    "github_org": owner,
                    "org_name": "Integration Test",
                    "is_personal": True,
                    "instance_name": TEST_INSTANCE_SUFFIX,
                },
                headers={"Authorization": f"Bearer {GITHUB_TOKEN}"},
            )

        assert setup_resp.status_code == 200
        setup_token = setup_resp.json()["setup_token"]

        # Claim the token (simulates what npx create-egregore does)
        claim_resp = app_client.get(f"/api/org/claim/{setup_token}")
        assert claim_resp.status_code == 200

        claim = claim_resp.json()
        assert claim["repo_name"] == TEST_REPO_NAME
        assert TEST_REPO_NAME in claim["fork_url"]
        assert self.test_memory in claim["memory_url"]
        assert claim["api_key"].startswith("ek_")
        assert claim["org_name"] == "Integration Test"

        print(f"\n  PASS: Claim returns correct install data")
        print(f"    repo_name: {claim['repo_name']}")
        print(f"    fork_url: {claim['fork_url']}")
        print(f"    memory_url: {claim['memory_url']}")
        print(f"    api_key: {claim['api_key'][:20]}...")
