// Same-origin Emissary identity + platform client. Every call is a relative
// path — Netlify's 200-rewrite proxies (netlify.toml) forward /api/v1/emissary/*
// and /api/v1/platform/* to the Railway origin, so requests stay first-party on
// egregore.xyz and the eg_session cookie rides along (credentials: "include").
//
// Deliberately NOT built on components/emissary/api.ts: that client points at
// the absolute Railway URL, which would make the session cookie cross-origin
// (third-party, dropped by browsers). The Railway URL lives ONLY in netlify.toml.

// ── Types ──────────────────────────────────────────────────────

export type Session = {
  user_id: string;
  name: string | null;
  email: string;
  handle?: string | null;
  // Optional — surfaced as "member since" when the API provides it.
  created_at?: string | null;
};

export type Star = {
  address: string;          // @owner/slug
  owner: string;
  slug: string;
  mode: "pin" | "follow";
  resolved_id: string;      // head this star resolves to → /emissary/e/{id}
  evaluated_id?: string | null;
  updated_since_star?: boolean;
  kind?: string | null;     // executable | skill | knowledge | …
  topic?: string | null;
  summary?: string | null;
  version?: number;
  raw_url?: string;
  starred_at?: string | null;
};

export type StarsResponse = { stars: Star[] };

// A CLI token minted by `emissary login` / `install`. Field names are kept
// permissive: the API lane's exact keys for created / last-used weren't frozen
// at build time, so the account UI reads through the getters below.
export type Token = {
  id: string;
  harness?: string | null;
  label?: string | null;
  created_at?: string | null;
  created?: string | null;
  last_used_at?: string | null;
  last_used?: string | null;
};

export type TokensResponse = { tokens: Token[] };

// Thrown when no valid session cookie is present (HTTP 401). The account page
// uses it to distinguish "signed out" (expected) from "API down" (an error).
export class NotSignedIn extends Error {
  constructor() {
    super("Not signed in");
    this.name = "NotSignedIn";
  }
}

// ── Request helper ─────────────────────────────────────────────

async function sameOrigin<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  let resp: Response;
  try {
    resp = await fetch(path, {
      method,
      credentials: "include",
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Couldn't reach the server. Check your connection and try again.");
  }

  if (resp.status === 401) throw new NotSignedIn();

  let data: unknown = null;
  try {
    data = await resp.json();
  } catch {
    // empty / non-JSON body — fine for 204-style responses
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

// GET /session — the signed-in identity for page chrome. Throws NotSignedIn on 401.
export function getSession(): Promise<Session> {
  return sameOrigin<Session>("GET", "/api/v1/emissary/session");
}

// POST /login-link {email, next?} — always resolves (no user enumeration).
export function loginLink(email: string, next?: string): Promise<{ sent: boolean }> {
  return sameOrigin("POST", "/api/v1/emissary/login-link", next ? { email, next } : { email });
}

// POST /logout — revoke the session + clear the cookie.
export function logout(): Promise<{ status: string }> {
  return sameOrigin("POST", "/api/v1/emissary/logout", {});
}

// GET /platform/stars — my stars, resolved per mode.
export function listStars(): Promise<StarsResponse> {
  return sameOrigin<StarsResponse>("GET", "/api/v1/platform/stars");
}

// POST /platform/stars {owner, slug, mode} — collect an emissary for pull.
export function starEmissary(
  owner: string,
  slug: string,
  mode: "pin" | "follow" = "pin",
): Promise<Star> {
  return sameOrigin<Star>("POST", "/api/v1/platform/stars", { owner, slug, mode });
}

// DELETE /platform/stars/{owner}/{slug} — remove a star.
export function unstar(owner: string, slug: string): Promise<{ status: string }> {
  return sameOrigin(
    "DELETE",
    `/api/v1/platform/stars/${encodeURIComponent(owner)}/${encodeURIComponent(slug)}`,
  );
}

// ── Identity management ────────────────────────────────────────

// PATCH /emissary/me {name} — update the display name. Returns the updated
// identity (same shape as GET /session). Cookie-authed.
export function updateName(name: string): Promise<Session> {
  return sameOrigin<Session>("PATCH", "/api/v1/emissary/me", { name });
}

// PUT /platform/profile {handle, display?} — claim a near-immutable @handle.
// 409 (surfaced as a thrown Error with the API's detail) means the handle is
// taken. Cookie-authed. The caller re-fetches the session afterwards so the
// authoritative handle lands in the UI regardless of this body's shape.
export function claimHandle(handle: string, display?: string): Promise<unknown> {
  return sameOrigin(
    "PUT",
    "/api/v1/platform/profile",
    display ? { handle, display } : { handle },
  );
}

// GET /emissary/tokens — the CLIs connected to this identity. Tolerates either
// a { tokens: [...] } envelope or a bare array so a small contract drift in the
// API lane doesn't blank the section.
export async function listTokens(): Promise<Token[]> {
  const res = await sameOrigin<TokensResponse | Token[]>("GET", "/api/v1/emissary/tokens");
  if (Array.isArray(res)) return res;
  return res?.tokens ?? [];
}

// DELETE /emissary/tokens/{id} — revoke a connected CLI.
export function revokeToken(id: string): Promise<{ status: string }> {
  return sameOrigin("DELETE", `/api/v1/emissary/tokens/${encodeURIComponent(id)}`);
}

// ── Handle grammar ─────────────────────────────────────────────

// Client-side pre-check for the @handle claim input. Kept deliberately minimal
// — it mirrors the stated grammar ([a-z0-9-]) and leaves availability, length,
// and reserved-word rules to the server (409/422). Returns an error string to
// show, or null when the input is claimable (or empty — the button gates that).
export function handleError(raw: string): string | null {
  const h = raw.trim();
  if (!h) return null;
  if (!/^[a-z0-9-]+$/.test(h)) return "Lowercase letters, numbers, and hyphens only.";
  return null;
}
