const API_URL = import.meta.env.VITE_API_URL || "https://egregore-production-55f2.up.railway.app";
const GITHUB_CLIENT_ID = "Ov23lizB4nYEeIRsHTdb";

const GITHUB_SCOPES = {
  joiner: "read:user",
  founder: "repo,read:org",
  admin: "repo,read:org",
};

export function getGitHubAuthUrl(role = "founder") {
  const scope = GITHUB_SCOPES[role] || GITHUB_SCOPES.founder;
  const redirectUri = `${window.location.origin}/callback`;
  return `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=${scope}&redirect_uri=${encodeURIComponent(redirectUri)}`;
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

export async function getOrgRepos(token, org) {
  return request("GET", `/api/org/setup/repos?org=${encodeURIComponent(org)}`, { token });
}

export async function setupOrg(token, { github_org, org_name, is_personal, repos = [], instance_name, transcript_sharing = false }) {
  const body = { github_org, org_name, is_personal, repos, transcript_sharing };
  if (instance_name) body.instance_name = instance_name;
  return request("POST", "/api/org/setup", { token, body });
}

export async function joinOrg(token, { github_org, repo_name = "egregore-core" }) {
  return request("POST", "/api/org/join", {
    token,
    body: { github_org, repo_name },
  });
}

export async function getTelegramStatus(slug) {
  return request("GET", `/api/org/telegram/status/${slug}`);
}

export async function checkTelegramMembership(slug, githubToken) {
  return request("GET", `/api/org/${slug}/telegram/membership`, { token: githubToken });
}

export async function getInviteInfo(inviteToken) {
  return request("GET", `/api/org/invite/${inviteToken}`);
}

export async function acceptInvite(token, inviteToken) {
  return request("POST", `/api/org/invite/${inviteToken}/accept`, { token });
}

export async function getUserProfile(token) {
  return request("GET", "/api/user/profile", { token });
}

export async function updateUserProfile(token, { telegram_username }) {
  return request("POST", "/api/user/profile", { token, body: { telegram_username } });
}

export async function joinWaitlist(name, email) {
  return request("POST", "/api/admin/waitlist", { body: { name, email, source: "website" } });
}

export async function getMyEgregores(token) {
  return request("GET", "/api/me/egregores", { token });
}

export async function getAdminHealth(token, filters = {}) {
  const params = new URLSearchParams();
  if (filters.org_slug) params.set("org_slug", filters.org_slug);
  const qs = params.toString();
  return request("GET", `/api/admin/health${qs ? `?${qs}` : ""}`, { token });
}

export async function getAdminDashboard(token) {
  return request("GET", "/api/admin/dashboard", { token });
}

export async function getAdminOrgDetail(token, slug) {
  return request("GET", `/api/admin/org/${encodeURIComponent(slug)}`, { token });
}

export async function getAdminTelemetry(token, filters = {}) {
  const params = new URLSearchParams();
  if (filters.org_slug) params.set("org_slug", filters.org_slug);
  if (filters.event_type) params.set("event_type", filters.event_type);
  if (filters.user_handle) params.set("user_handle", filters.user_handle);
  if (filters.since) params.set("since", filters.since);
  if (filters.limit) params.set("limit", String(filters.limit));
  const qs = params.toString();
  return request("GET", `/api/admin/telemetry${qs ? `?${qs}` : ""}`, { token });
}
