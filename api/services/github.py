"""GitHub API operations for org setup."""

import base64

import httpx


API_BASE = "https://api.github.com"
UPSTREAM_OWNER = "Curve-Labs"
UPSTREAM_REPO = "egregore-core"


def _headers(token: str) -> dict:
    return {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }


async def get_user(token: str) -> dict:
    """Get authenticated user info."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{API_BASE}/user", headers=_headers(token), timeout=10.0)
    if resp.status_code != 200:
        raise ValueError(f"GitHub auth failed: {resp.status_code}")
    data = resp.json()
    return {"login": data["login"], "name": data.get("name", data["login"]), "avatar_url": data.get("avatar_url", "")}


async def list_orgs(token: str) -> list[dict]:
    """List user's GitHub organizations."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{API_BASE}/user/orgs", headers=_headers(token), timeout=10.0)
    if resp.status_code != 200:
        return []
    orgs = []
    for org in resp.json():
        orgs.append({
            "login": org["login"],
            "name": org["login"],
            "avatar_url": org.get("avatar_url", ""),
        })
    return orgs


async def get_org_membership(token: str, org: str) -> str:
    """Get user's role in an org (admin, member, or empty if not a member)."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{API_BASE}/user/memberships/orgs/{org}",
            headers=_headers(token),
            timeout=10.0,
        )
    if resp.status_code != 200:
        return ""
    return resp.json().get("role", "member")


async def repo_exists(token: str, owner: str, repo: str) -> bool:
    """Check if a repo exists and is accessible."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{API_BASE}/repos/{owner}/{repo}",
            headers=_headers(token),
            timeout=10.0,
        )
    return resp.status_code == 200


async def fork_repo(token: str, target_org: str | None = None) -> dict:
    """Fork egregore-core into target org (or personal account if None)."""
    body = {}
    if target_org:
        body["organization"] = target_org

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{API_BASE}/repos/{UPSTREAM_OWNER}/{UPSTREAM_REPO}/forks",
            headers=_headers(token),
            json=body,
            timeout=30.0,
        )
    if resp.status_code not in (200, 202):
        raise ValueError(f"Fork failed: {resp.status_code} {resp.text}")
    return resp.json()


async def generate_from_template(
    token: str, owner: str, repo_name: str, private: bool = False,
) -> dict:
    """Generate a repo from the egregore-core template.

    Uses POST /repos/{template_owner}/{template_repo}/generate.
    Requires egregore-core to be marked as a template repo on GitHub.
    """
    body = {
        "owner": owner,
        "name": repo_name,
        "private": private,
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{API_BASE}/repos/{UPSTREAM_OWNER}/{UPSTREAM_REPO}/generate",
            headers=_headers(token),
            json=body,
            timeout=30.0,
        )
    if resp.status_code not in (200, 201):
        raise ValueError(f"Template generation failed: {resp.status_code} {resp.text}")
    return resp.json()


async def rename_repo(token: str, owner: str, old_name: str, new_name: str) -> dict:
    """Rename a repository. Returns updated repo data."""
    async with httpx.AsyncClient() as client:
        resp = await client.patch(
            f"{API_BASE}/repos/{owner}/{old_name}",
            headers=_headers(token),
            json={"name": new_name},
            timeout=15.0,
        )
    if resp.status_code != 200:
        raise ValueError(f"Rename failed: {resp.status_code} {resp.text}")
    return resp.json()


async def wait_for_fork(token: str, owner: str, timeout: int = 30) -> bool:
    """Poll until fork is ready."""
    import asyncio
    for _ in range(timeout // 2):
        if await repo_exists(token, owner, UPSTREAM_REPO):
            return True
        await asyncio.sleep(2)
    return False


async def wait_for_repo(token: str, owner: str, repo_name: str, timeout: int = 30) -> bool:
    """Poll until a repo is ready."""
    import asyncio
    for _ in range(timeout // 2):
        if await repo_exists(token, owner, repo_name):
            return True
        await asyncio.sleep(2)
    return False


async def create_repo(token: str, name: str, org: str | None = None, private: bool = True) -> dict:
    """Create a new repository."""
    if org:
        url = f"{API_BASE}/orgs/{org}/repos"
    else:
        url = f"{API_BASE}/user/repos"

    body = {
        "name": name,
        "private": private,
        "auto_init": True,
        "description": "Egregore shared memory",
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(url, headers=_headers(token), json=body, timeout=15.0)
    if resp.status_code not in (200, 201):
        raise ValueError(f"Create repo failed: {resp.status_code} {resp.text}")
    return resp.json()


async def update_file(token: str, owner: str, repo: str, path: str, content: str, message: str) -> dict:
    """Create or update a file via the Contents API."""
    encoded = base64.b64encode(content.encode()).decode()
    url = f"{API_BASE}/repos/{owner}/{repo}/contents/{path}"

    # Check if file exists to get its SHA (needed for updates)
    async with httpx.AsyncClient() as client:
        existing = await client.get(url, headers=_headers(token), timeout=10.0)

    body = {"message": message, "content": encoded}
    if existing.status_code == 200:
        body["sha"] = existing.json()["sha"]

    async with httpx.AsyncClient() as client:
        resp = await client.put(url, headers=_headers(token), json=body, timeout=15.0)
    if resp.status_code not in (200, 201):
        raise ValueError(f"Update file failed: {resp.status_code} {resp.text}")
    return resp.json()


async def init_memory_structure(token: str, owner: str, repo: str) -> None:
    """Create the memory directory structure with .gitkeep files."""
    dirs = [
        "people",
        "conversations",
        "knowledge/decisions",
        "knowledge/patterns",
    ]
    for d in dirs:
        try:
            await update_file(
                token, owner, repo,
                f"{d}/.gitkeep", "",
                f"Initialize {d} directory",
            )
        except ValueError:
            pass  # Directory may already exist


async def list_org_repos(token: str, org: str) -> list[dict]:
    """List repos for an org (or personal account), filtering out egregore/memory repos.

    Returns [{name, description, language, private}].
    Falls back to /users/{org}/repos for personal accounts.
    """
    repos: list[dict] = []
    page = 1
    while True:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{API_BASE}/orgs/{org}/repos",
                headers=_headers(token),
                params={"per_page": 100, "sort": "updated", "page": page},
                timeout=15.0,
            )
        if resp.status_code == 404:
            # Not an org — try as personal account
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    f"{API_BASE}/users/{org}/repos",
                    headers=_headers(token),
                    params={"per_page": 100, "sort": "updated", "page": page},
                    timeout=15.0,
                )
        if resp.status_code != 200:
            break
        batch = resp.json()
        if not batch:
            break
        for r in batch:
            name = r.get("name", "")
            # Filter out memory repos and egregore repos
            if name.endswith("-memory"):
                continue
            if name.startswith("egregore"):
                continue
            repos.append({
                "name": name,
                "description": r.get("description") or "",
                "language": r.get("language") or "",
                "private": r.get("private", False),
            })
        if len(batch) < 100:
            break
        page += 1
    return repos


async def update_egregore_json(
    token: str, owner: str, repo: str,
    org_name: str, github_org: str, memory_repo: str,
    api_url: str,
    slug: str = "",
    repos: list[str] | None = None,
) -> None:
    """Update egregore.json in the fork with org-specific config.
    NOTE: api_key is NOT written here — it goes in .env (gitignored), not committed files.
    """
    import json
    config = {
        "org_name": org_name,
        "github_org": github_org,
        "memory_repo": memory_repo,
        "api_url": api_url,
        "repo_name": repo,
    }
    if slug:
        config["slug"] = slug
    if repos is not None:
        config["repos"] = repos
    await update_file(
        token, owner, repo,
        "egregore.json",
        json.dumps(config, indent=2) + "\n",
        f"Configure egregore for {org_name}",
    )


async def check_collaborator(token: str, owner: str, repo: str, username: str) -> bool:
    """Check if a user is a collaborator on a repo."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{API_BASE}/repos/{owner}/{repo}/collaborators/{username}",
            headers=_headers(token),
            timeout=10.0,
        )
    return resp.status_code == 204


async def list_egregore_instances(token: str, org: str) -> list[dict]:
    """Find all egregore instances in an org by listing repos starting with 'egregore'.

    For each, reads egregore.json to get config.
    Returns [{repo_name, slug, org_name, repos}].
    """
    import json as _json

    instances: list[dict] = []
    page = 1
    egregore_repos: list[str] = []

    while True:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{API_BASE}/orgs/{org}/repos",
                headers=_headers(token),
                params={"per_page": 100, "sort": "updated", "page": page},
                timeout=15.0,
            )
        if resp.status_code == 404:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    f"{API_BASE}/users/{org}/repos",
                    headers=_headers(token),
                    params={"per_page": 100, "sort": "updated", "page": page},
                    timeout=15.0,
                )
        if resp.status_code != 200:
            break
        batch = resp.json()
        if not batch:
            break
        for r in batch:
            name = r.get("name", "")
            if name.startswith("egregore") and not name.endswith("-memory") and name != "egregore-site":
                egregore_repos.append(name)
        if len(batch) < 100:
            break
        page += 1

    for repo_name in egregore_repos:
        config_raw = await get_file_content(token, org, repo_name, "egregore.json")
        if not config_raw:
            continue  # No config → not a configured instance
        try:
            config = _json.loads(config_raw)
            org_name = config.get("org_name", "")
            if not org_name:
                continue  # Empty org_name → template or unconfigured repo
            instances.append({
                "repo_name": repo_name,
                "slug": config.get("slug", ""),
                "org_name": org_name,
                "repos": config.get("repos", []),
            })
        except _json.JSONDecodeError:
            continue

    return instances


async def get_file_content(token: str, owner: str, repo: str, path: str) -> str | None:
    """Get file content from a repo."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{API_BASE}/repos/{owner}/{repo}/contents/{path}",
            headers=_headers(token),
            timeout=10.0,
        )
    if resp.status_code != 200:
        return None
    import json
    data = resp.json()
    return base64.b64decode(data["content"]).decode()


async def invite_to_org(token: str, org: str, username: str) -> dict:
    """Send a GitHub org invitation. Requires admin:org scope + org owner/admin role.
    Returns {"status": "invited"} or {"status": "failed", "reason": "..."}."""
    async with httpx.AsyncClient() as client:
        resp = await client.put(
            f"{API_BASE}/orgs/{org}/memberships/{username}",
            headers=_headers(token),
            json={"role": "member"},
            timeout=15.0,
        )
    if resp.status_code in (200, 201):
        state = resp.json().get("state", "pending")
        return {"status": "invited", "state": state}
    elif resp.status_code == 404:
        return {"status": "failed", "reason": f"User '{username}' not found on GitHub"}
    elif resp.status_code == 403:
        return {"status": "failed", "reason": "Insufficient permissions. You need org admin rights."}
    elif resp.status_code == 422:
        return {"status": "already_member"}
    else:
        return {"status": "failed", "reason": f"GitHub API error: {resp.status_code}"}


async def check_org_membership(token: str, org: str, username: str) -> str:
    """Check a user's org membership state. Returns 'active', 'pending', or 'none'."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{API_BASE}/orgs/{org}/memberships/{username}",
            headers=_headers(token),
            timeout=10.0,
        )
    if resp.status_code == 200:
        return resp.json().get("state", "active")
    return "none"


async def add_repo_collaborator(token: str, owner: str, repo: str, username: str) -> bool:
    """Add a user as a collaborator to a repo. Returns True if successful."""
    async with httpx.AsyncClient() as client:
        resp = await client.put(
            f"{API_BASE}/repos/{owner}/{repo}/collaborators/{username}",
            headers=_headers(token),
            json={"permission": "push"},
            timeout=10.0,
        )
    return resp.status_code in (200, 201, 204)


async def accept_org_invitation(token: str, org: str) -> bool:
    """Accept a pending org invitation on behalf of the authenticated user.
    Uses PATCH /user/memberships/orgs/{org} with state=active."""
    async with httpx.AsyncClient() as client:
        resp = await client.patch(
            f"{API_BASE}/user/memberships/orgs/{org}",
            headers=_headers(token),
            json={"state": "active"},
            timeout=10.0,
        )
    return resp.status_code == 200


async def accept_repo_invitations(token: str, owner: str) -> int:
    """Accept all pending repo collaboration invitations from a specific owner.
    Returns the number of invitations accepted."""
    accepted = 0
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{API_BASE}/user/repository_invitations",
            headers=_headers(token),
            params={"per_page": 100},
            timeout=15.0,
        )
    if resp.status_code != 200:
        return 0
    for inv in resp.json():
        repo_owner = inv.get("repository", {}).get("owner", {}).get("login", "")
        if repo_owner.lower() == owner.lower():
            async with httpx.AsyncClient() as client:
                patch_resp = await client.patch(
                    f"{API_BASE}/user/repository_invitations/{inv['id']}",
                    headers=_headers(token),
                    timeout=10.0,
                )
            if patch_resp.status_code == 204:
                accepted += 1
    return accepted


async def is_org(token: str, name: str) -> bool:
    """Check if a GitHub name is an org (True) or a user (False)."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{API_BASE}/orgs/{name}",
            headers=_headers(token),
            timeout=10.0,
        )
    return resp.status_code == 200
