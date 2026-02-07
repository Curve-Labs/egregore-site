const API_URL = import.meta.env.VITE_API_URL || "https://egregore-production-55f2.up.railway.app";
const GITHUB_CLIENT_ID = "Ov23lieKKe55MBVYItGg";
const GITHUB_SCOPE = "repo,read:org";

export function getGitHubAuthUrl() {
  const redirectUri = `${window.location.origin}/callback`;
  return `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=${GITHUB_SCOPE}&redirect_uri=${encodeURIComponent(redirectUri)}`;
}

async function request(method, path, { body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const resp = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await resp.json();
  if (!resp.ok) throw new Error(data.detail || `HTTP ${resp.status}`);
  return data;
}

export async function exchangeCode(code) {
  return request("POST", "/api/auth/github/callback", { body: { code } });
}

export async function getOrgs(token) {
  return request("GET", "/api/org/setup/orgs", { token });
}

export async function setupOrg(token, { github_org, org_name, is_personal }) {
  return request("POST", "/api/org/setup", {
    token,
    body: { github_org, org_name, is_personal },
  });
}

export async function joinOrg(token, { github_org }) {
  return request("POST", "/api/org/join", {
    token,
    body: { github_org },
  });
}

export async function getTelegramStatus(slug) {
  return request("GET", `/api/org/telegram/status/${slug}`);
}
