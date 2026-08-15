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
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

async function request<T>(method: string, path: string, opts: RequestOpts = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers || {}),
  };
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

export type ConnectContext = {
  connection_intent_id: string;
  status: string;
  plan: "connect";
  organization: {
    slug: string;
    name: string;
    github_org: string;
  };
  actor: GithubUser;
  instance: {
    mode?: string;
    repo_name?: string;
    managed_repo_count?: number;
    launcher_version?: string;
  };
  checkout_session_id?: string | null;
};

export type CheckoutStatus = {
  checkout_status: string;
  payment_status: string;
  payment_confirmed: boolean;
};

// ── API ────────────────────────────────────────────────────────

export async function exchangeCode(code: string): Promise<{ github_token: string; user: GithubUser }> {
  return request("POST", "/api/auth/github/callback", { body: { code } });
}

export type EditableArtifact = {
  id: string;
  org: string;
  kind?: "org" | "handoff";
  title: string;
  artifact_type: string;
  published_url?: string;
  text_sources?: string[];
  html: string;
  sha256: string;
};

export type ArtifactTextChange = {
  before: string;
  after: string;
};

export async function getEditableArtifact(
  token: string,
  org: string,
  id: string,
  kind: "org" | "handoff" = "org",
): Promise<EditableArtifact> {
  const path = kind === "handoff"
    ? `/api/artifacts/edit/handoff/${encodeURIComponent(id)}`
    : `/api/artifacts/edit/${encodeURIComponent(org)}/${encodeURIComponent(id)}`;
  return request("GET", path, { token });
}

export async function saveEditableArtifact(
  token: string,
  artifact: EditableArtifact,
  html: string,
  textChanges: ArtifactTextChange[] = [],
): Promise<{ status: string; id: string; url: string; html: string; sha256: string }> {
  const path = artifact.kind === "handoff"
    ? `/api/artifacts/edit/handoff/${encodeURIComponent(artifact.id)}`
    : `/api/artifacts/edit/${encodeURIComponent(artifact.org)}/${encodeURIComponent(artifact.id)}`;
  return request(
    "PUT",
    path,
    {
      token,
      body: { html, expected_sha256: artifact.sha256, text_changes: textChanges },
    },
  );
}

export async function getOrgs(token: string): Promise<SetupOrgsResponse> {
  return request("GET", "/api/org/setup/orgs", { token });
}

export async function getOrgRepos(token: string, org: string): Promise<OrgReposResponse> {
  return request("GET", `/api/org/setup/repos?org=${encodeURIComponent(org)}`, { token });
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

export async function getTelegramStatus(
  slug: string,
  signal?: AbortSignal,
): Promise<TelegramStatusResponse> {
  return request("GET", `/api/org/telegram/status/${slug}`, { signal });
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

export async function getConnectContext(
  intentId: string,
  ticket: string,
): Promise<ConnectContext> {
  return request(
    "GET",
    `/api/billing/connect/${encodeURIComponent(intentId)}/context`,
    { headers: { "X-Connect-Ticket": ticket } },
  );
}

export async function createConnectCheckout(
  intentId: string,
  ticket: string,
): Promise<{ checkout_session_id: string; checkout_url: string }> {
  return request(
    "POST",
    `/api/billing/connect/${encodeURIComponent(intentId)}/checkout`,
    {
      headers: { "X-Connect-Ticket": ticket },
      body: { plan: "connect" },
    },
  );
}

export async function getConnectCheckoutStatus(
  sessionId: string,
): Promise<CheckoutStatus> {
  return request(
    "GET",
    `/api/billing/checkout/${encodeURIComponent(sessionId)}/status`,
  );
}
