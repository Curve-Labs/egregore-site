// Emissary v0 API client. Talks to the Railway-served write API at
// /api/v1/emissary/*. Mirrors the contract frozen in
// docs/specs/emissary-api-contract.md (curve-labs-core).

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

const EMISSARY_BASE = "/api/v1/emissary";
const PLATFORM_BASE = "/api/v1/platform";

// ── Types ──────────────────────────────────────────────────────

export type McpConfig = {
  server_url: string;
  header_template: string;
};

export type RegisterResponse = {
  user_id: string;
  auth_token: string;
  mcp_config: McpConfig;
  verification_status: "pending";
};

export type VerifyResponse = {
  verified: boolean;
};

export type RegisterBody = {
  token?: string;
  name: string;
  email: string;
  harness?: string;
};

// ── Request helper ─────────────────────────────────────────────

async function request<T>(
  method: string,
  path: string,
  opts: { body?: unknown; token?: string; base?: string } = {},
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.token) headers["Authorization"] = `Bearer ${opts.token}`;

  let resp: Response;
  try {
    resp = await fetch(`${API_URL}${opts.base ?? EMISSARY_BASE}${path}`, {
      method,
      headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new Error("Couldn't reach the server. Check your connection and try again.");
  }

  let data: unknown = null;
  try {
    data = await resp.json();
  } catch {
    // empty / non-JSON body
  }

  if (!resp.ok) {
    const detail =
      data && typeof data === "object" && "detail" in data
        ? String((data as { detail: unknown }).detail)
        : `HTTP ${resp.status}`;
    throw new Error(detail);
  }
  return data as T;
}

// ── API ────────────────────────────────────────────────────────

// POST /register — mint an emissary identity + auth token. No auth.
export async function register(body: RegisterBody): Promise<RegisterResponse> {
  return request<RegisterResponse>("POST", "/register", { body });
}

// GET /verify?token=... — consume an email-verification magic link. No auth.
export async function verify(token: string): Promise<VerifyResponse> {
  return request<VerifyResponse>(
    "GET",
    `/verify?token=${encodeURIComponent(token)}`,
  );
}

export type UsageResponse = {
  counts: Record<string, number>;
};

export async function fetchUsage(ids: string[]): Promise<Record<string, number>> {
  if (ids.length === 0) return {};
  const res = await request<UsageResponse>(
    "GET",
    `/usage?ids=${encodeURIComponent(ids.join(","))}`,
  );
  return res.counts ?? {};
}

export type BrowseEntry = {
  owner_handle: string;
  slug: string;
  address: string;
  head_id: string;
  topic: string | null;
  summary: string | null;
  kind: string | null;
  category: string | null;
  version: number;
  created_at?: string | null;
  updated_at?: string | null;
  stars: number;
};

export type BrowseCategory = {
  slug: string;
  label: string;
  curated?: boolean;
  sort?: number;
};

export type BrowseResponse = {
  entries: BrowseEntry[];
  categories: BrowseCategory[];
};

export async function fetchBrowse(): Promise<BrowseResponse> {
  return request<BrowseResponse>("GET", "/browse", { base: PLATFORM_BASE });
}

export type PlatformProfile = {
  handle: string;
  display: string | null;
  verified: boolean;
};

export async function fetchProfile(handle: string): Promise<PlatformProfile> {
  return request<PlatformProfile>(
    "GET",
    `/@${encodeURIComponent(handle)}`,
    { base: PLATFORM_BASE },
  );
}
