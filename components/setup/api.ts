const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://egregore-production-55f2.up.railway.app";

const GITHUB_CLIENT_ID = "Iv23li2obNsAjakoK2RE";
const GITHUB_SCOPE = "";

export function getGitHubAuthUrl(): string {
  if (typeof window === "undefined") return "";
  const redirectUri = `${window.location.origin}/callback`;
  let url = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}`;
  if (GITHUB_SCOPE) url += `&scope=${GITHUB_SCOPE}`;
  return url;
}

type RequestOpts = {
  body?: unknown;
  token?: string;
};

async function request<T>(method: string, path: string, opts: RequestOpts = {}): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.token) headers["Authorization"] = `Bearer ${opts.token}`;

  const resp = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
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

export type UserProfile = {
  name: string;
  telegram_username?: string;
  memberships?: { org_slug: string; org_name: string; in_telegram_group: boolean }[];
};

// ── API ────────────────────────────────────────────────────────

export async function exchangeCode(code: string): Promise<{ github_token: string; user: GithubUser }> {
  return request("POST", "/api/auth/github/callback", { body: { code } });
}

export async function getOrgs(token: string): Promise<SetupOrgsResponse> {
  return request("GET", "/api/org/setup/orgs", { token });
}

export async function getOrgRepos(token: string, org: string): Promise<OrgReposResponse> {
  return request("GET", `/api/org/setup/repos?org=${encodeURIComponent(org)}`, { token });
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

export async function getUserProfile(token: string): Promise<UserProfile> {
  return request("GET", "/api/user/profile", { token });
}

export async function updateUserProfile(token: string, body: { telegram_username: string }): Promise<void> {
  await request("POST", "/api/user/profile", { token, body });
}
