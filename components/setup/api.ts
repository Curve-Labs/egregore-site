const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://egregore-production-55f2.up.railway.app";

const GITHUB_CLIENT_ID = "Iv23li2obNsAjakoK2RE";
const GITHUB_SCOPE = "";

const GITHUB_RETURN_KEY = "egregore_github_return";

export function getGitHubAuthUrl(returnTo?: string): string {
  if (typeof window === "undefined") return "";
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//") && !returnTo.includes("\\")) {
    sessionStorage.setItem(GITHUB_RETURN_KEY, returnTo);
  }
  const redirectUri = `${window.location.origin}/callback`;
  let url = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}`;
  if (GITHUB_SCOPE) url += `&scope=${GITHUB_SCOPE}`;
  return url;
}

export function consumeGitHubAuthReturn(): string | null {
  if (typeof window === "undefined") return null;
  const value = sessionStorage.getItem(GITHUB_RETURN_KEY);
  sessionStorage.removeItem(GITHUB_RETURN_KEY);
  return value?.startsWith("/") && !value.startsWith("//") && !value.includes("\\")
    ? value
    : null;
}

type RequestOpts = {
  body?: unknown;
  token?: string;
  signal?: AbortSignal;
};

async function request<T>(method: string, path: string, opts: RequestOpts = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.token) headers["Authorization"] = `Bearer ${opts.token}`;

  const resp = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
  });

  const data = await resp.json();
  if (!resp.ok) throw new Error(data.detail || `HTTP ${resp.status}`);
  return data as T;
}

// ── Types ─────────────────────────────────────────────────────

export type GithubUser = {
  login: string;
  name: string;
  avatar_url?: string;
};

export type OrgInstance = {
  repo_name: string;
  org_name?: string;
  repos?: string[];
};

export type OrgInfo = {
  login: string;
  name: string;
  has_egregore: boolean;
  is_member?: boolean;
  role?: string;
  avatar_url?: string;
  instances?: OrgInstance[];
};

export type PersonalInfo = {
  login: string;
  has_egregore: boolean;
  is_member?: boolean;
  instances?: OrgInstance[];
};

export type SetupOrgsResponse = {
  user: GithubUser;
  orgs: OrgInfo[];
  personal: PersonalInfo;
};

export type RepoInfo = {
  name: string;
  language: string;
  description: string;
  private?: boolean;
};

export type OrgReposResponse = {
  repos: RepoInfo[];
};

export type SetupResult = {
  org_slug: string;
  setup_token: string;
  repo_name?: string;
  telegram_invite_link?: string;
  telegram_group_link?: string;
  org_name?: string;
  status?: string;
  message?: string;
};

export type TelegramStatusResponse = {
  connected: boolean;
};

export type TelegramMembership = {
  status: string;
  in_group: boolean;
  group_name?: string;
  telegram_username?: string;
  telegram_group_link?: string;
};

export type InviteInfo = {
  org_name: string;
  invited_by: string;
};

export type GithubSearchUser = {
  login: string;
  avatar_url?: string;
  profile_url?: string;
};

export type InviteResult = {
  invite_url: string;
  invited_username: string;
  github_invite: { status: string; reason?: string };
  memory_access?: { repo: string; status: string };
  managed_access?: { repo: string; status: string }[];
};

export type UserProfile = {
  name: string;
  telegram_username?: string;
  memberships?: { org_slug: string; org_name: string; in_telegram_group: boolean }[];
};

// ── API ────────────────────────────────────────────────────────

export async function exchangeCode(code: string): Promise<{ github_token: string; user: GithubUser }> {
  const authBase = typeof window !== "undefined" && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)
    ? API_URL
    : "";
  const resp = await fetch(`${authBase}/api/auth/github/callback`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.detail || `HTTP ${resp.status}`);
  return data as { github_token: string; user: GithubUser };
}

export async function getOrgs(token: string, signal?: AbortSignal): Promise<SetupOrgsResponse> {
  return request("GET", "/api/org/setup/orgs", { token, signal });
}

export async function getOrgRepos(token: string, org: string): Promise<OrgReposResponse> {
  return request("GET", `/api/org/setup/repos?org=${encodeURIComponent(org)}`, { token });
}

export async function searchGithubUsers(
  token: string,
  query: string,
  org?: string,
  signal?: AbortSignal,
): Promise<{ users: GithubSearchUser[] }> {
  const params = new URLSearchParams({ q: query });
  if (org) params.set("org", org);
  return request("GET", `/api/github/users/search?${params.toString()}`, { token, signal });
}

export type AppInstallationStatus = {
  installed: boolean;
  installation_id?: number;
  install_url?: string;
  reason?: string;
};

export async function checkAppInstallation(githubOrg: string): Promise<AppInstallationStatus> {
  return request("GET", `/api/github-app/installation/${encodeURIComponent(githubOrg)}`);
}

type SetupOrgBody = {
  github_org: string;
  org_name: string;
  is_personal: boolean;
  repos?: string[];
  instance_name?: string;
  transcript_sharing?: boolean;
};

export async function setupOrg(token: string, body: SetupOrgBody): Promise<SetupResult> {
  const payload: SetupOrgBody = {
    github_org: body.github_org,
    org_name: body.org_name,
    is_personal: body.is_personal,
    repos: body.repos ?? [],
    transcript_sharing: body.transcript_sharing ?? false,
  };
  if (body.instance_name) payload.instance_name = body.instance_name;
  return request("POST", "/api/org/setup", { token, body: payload });
}

export async function joinOrg(
  token: string,
  { github_org, repo_name = "egregore" }: { github_org: string; repo_name?: string },
): Promise<SetupResult> {
  return request("POST", "/api/org/join", {
    token,
    body: { github_org, repo_name },
  });
}

export async function getTelegramStatus(slug: string): Promise<TelegramStatusResponse> {
  return request("GET", `/api/org/telegram/status/${slug}`);
}

export async function checkTelegramMembership(slug: string, githubToken: string): Promise<TelegramMembership> {
  return request("GET", `/api/org/${slug}/telegram/membership`, { token: githubToken });
}

export async function getInviteInfo(inviteToken: string): Promise<InviteInfo> {
  return request("GET", `/api/org/invite/${inviteToken}`);
}

export async function acceptInvite(token: string, inviteToken: string): Promise<SetupResult> {
  return request("POST", `/api/org/invite/${inviteToken}/accept`, { token });
}

export async function inviteTeammate(
  token: string,
  body: { github_org: string; github_username: string; repo_name: string; slug: string },
): Promise<InviteResult> {
  return request("POST", "/api/org/invite", { token, body });
}

export async function getUserProfile(token: string): Promise<UserProfile> {
  return request("GET", "/api/user/profile", { token });
}

export async function updateUserProfile(token: string, body: { telegram_username: string }): Promise<void> {
  await request("POST", "/api/user/profile", { token, body });
}
