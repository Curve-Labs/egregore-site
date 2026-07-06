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

// DELETE /platform/stars/{owner}/{slug} — remove a star.
export function unstar(owner: string, slug: string): Promise<{ status: string }> {
  return sameOrigin(
    "DELETE",
    `/api/v1/platform/stars/${encodeURIComponent(owner)}/${encodeURIComponent(slug)}`,
  );
}
