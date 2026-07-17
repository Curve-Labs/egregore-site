"use client";

// /emissary/account — the site-owned account surface. On load it asks the API
// who's signed in (GET /session, cookie-authed). Signed out → a sign-in CTA.
// Signed in → an identity card you can actually manage: inline display-name
// edit (PATCH /me), an @handle you can claim once (PUT /platform/profile), the
// CLIs connected to you (GET/DELETE /tokens), the stars you've collected, the
// `emissary pull` teach block, and sign out. Every call is same-origin through
// the netlify.toml proxies; nothing here holds the Railway URL.

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  getSession,
  listStars,
  listTokens,
  updateName,
  claimHandle,
  revokeToken,
  logout,
  unstar,
  getPlatformProfile,
  listPublishedVersions,
  handleError,
  NotSignedIn,
  type Session,
  type Star,
  type Token,
  type PublishedEmissary,
  type PublishedVersion,
} from "./account-api";
import { CommandBlock, CopyButton } from "./ui";
import "../setup/setup.css";
import "./emissary.css";
import "./account.css";
import "./meridian.css";

// One shared URL works for every user's ChatGPT/Claude connector; the OAuth
// flow (Connect → sign in → Allow) handles identity, so nothing needs to be
// minted or pasted as a key.
const MCP_CONNECTOR_URL =
  process.env.NEXT_PUBLIC_MCP_URL ??
  "https://egregore-handoff-mcp-production.up.railway.app/mcp";

type State = "loading" | "signed-out" | "signed-in" | "error";
type VersionState =
  | { state: "loading"; versions: PublishedVersion[] }
  | { state: "ready"; versions: PublishedVersion[] }
  | { state: "error"; versions: PublishedVersion[]; message: string };

// The API lane didn't freeze the exact created / last-used keys, so read both.
function fmtDate(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
const tokenCreated = (t: Token) => t.created_at ?? t.created ?? null;
const tokenLastUsed = (t: Token) => t.last_used_at ?? t.last_used ?? null;
const tokenHarness = (t: Token) => t.harness ?? t.label ?? "CLI";

function labelFrom(value?: string | null, fallback = "emissary") {
  return (value || fallback).trim();
}

function emailLocalPart(email?: string | null) {
  return (email || "").split("@")[0] || "";
}

function accountInitial(session?: Session | null) {
  const source = session?.handle || session?.name || emailLocalPart(session?.email) || "e";
  return source.charAt(0).toUpperCase();
}

function kindClass(value?: string | null) {
  const key = labelFrom(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (["build", "dialogue", "executable", "documentation", "brief", "research"].includes(key)) {
    return key;
  }
  return "emissary";
}

function artInitial(entry: PublishedEmissary) {
  return labelFrom(entry.category || entry.kind).slice(0, 1).toUpperCase();
}

const DEMO_SESSION: Session = {
  user_id: "demo-user",
  name: "Oz",
  email: "oz@example.com",
  handle: "oz",
  badge: "founding member",
  created_at: "2026-07-01T10:00:00Z",
};

const DEMO_PUBLISHED: PublishedEmissary[] = [
  {
    slug: "compose-redesigned-emissary-flow",
    address: "@oz/compose-redesigned-emissary-flow",
    head_id: "demo-head-1",
    topic: "Compose, the way it should feel - a runnable taste of Egregore's redesigned emissary flow",
    summary: "A runnable packet that teaches the receiver what an emissary is, then walks through composing one end to end.",
    kind: "dialogue",
    category: "dialogue",
    version: 5,
    updated_at: "2026-07-05T10:00:00Z",
    stars: 14,
  },
  {
    slug: "decision-surface-skill",
    address: "@oz/decision-surface-skill",
    head_id: "demo-head-2",
    topic: "The Decision Surface skill - install it into your agent",
    summary: "A skill that turns scattered options into a page where the tradeoffs are explicit and reviewable.",
    kind: "build",
    category: "build",
    version: 2,
    updated_at: "2026-07-03T10:00:00Z",
    stars: 6,
  },
];

const DEMO_VERSIONS: Record<string, PublishedVersion[]> = {
  "compose-redesigned-emissary-flow": [
    { id: "demo-head-1", version: 5, topic: "Compose redesigned emissary flow", created_at: "2026-07-05T10:00:00Z", is_head: true },
    { id: "demo-v4", version: 4, topic: "Compose redesigned emissary flow", created_at: "2026-07-04T10:00:00Z", is_head: false },
    { id: "demo-v3", version: 3, topic: "Compose redesigned emissary flow", created_at: "2026-07-03T10:00:00Z", is_head: false },
  ],
  "decision-surface-skill": [
    { id: "demo-head-2", version: 2, topic: "Decision Surface skill", created_at: "2026-07-03T10:00:00Z", is_head: true },
    { id: "demo-v1", version: 1, topic: "Decision Surface skill", created_at: "2026-07-02T10:00:00Z", is_head: false },
  ],
};

const DEMO_STARS: Star[] = [
  {
    address: "@renc/first-stone",
    owner: "renc",
    slug: "first-stone",
    mode: "pin",
    resolved_id: "demo-star-1",
    kind: "build",
    topic: "First Stone",
    summary: "Bootstrap emissary",
    version: 1,
  },
  {
    address: "@cem/decision-surface",
    owner: "cem",
    slug: "decision-surface",
    mode: "follow",
    resolved_id: "demo-star-2",
    kind: "build",
    topic: "Decision Surface",
    summary: "Options into questions",
    version: 2,
    updated_since_star: true,
  },
];

const DEMO_TOKENS: Token[] = [
  { id: "demo-token-1", harness: "Codex", created_at: "2026-07-02T10:00:00Z", last_used_at: "2026-07-06T10:00:00Z" },
  { id: "demo-token-2", harness: "Claude Code", created_at: "2026-07-01T10:00:00Z" },
];

export default function AccountFlow() {
  const params = useSearchParams();
  const demoMode = params.get("demo") === "1";
  const [state, setState] = useState<State>("loading");
  const [session, setSession] = useState<Session | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [signingOut, setSigningOut] = useState(false);

  // Name edit
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState("");

  // Handle claim
  const [handleDraft, setHandleDraft] = useState("");
  const [claimingHandle, setClaimingHandle] = useState(false);
  const [handleErr, setHandleErr] = useState("");

  // Stars
  const [stars, setStars] = useState<Star[] | null>(null);
  const [starsError, setStarsError] = useState("");

  // Published shelf
  const [published, setPublished] = useState<PublishedEmissary[] | null>(null);
  const [publishedError, setPublishedError] = useState("");
  const [openVersions, setOpenVersions] = useState<Record<string, boolean>>({});
  const [versionsBySlug, setVersionsBySlug] = useState<Record<string, VersionState>>({});
  const [profileVerified, setProfileVerified] = useState<boolean | null>(null);

  // Tokens
  const [tokens, setTokens] = useState<Token[] | null>(null);
  const [tokensError, setTokensError] = useState("");
  const [revoking, setRevoking] = useState<string | null>(null);

  const loadStars = useCallback(async () => {
    setStars(null);
    setStarsError("");
    try {
      const res = await listStars();
      setStars(res.stars || []);
    } catch (err) {
      setStars([]);
      setStarsError(err instanceof Error ? err.message : "Couldn't load your stars.");
    }
  }, []);

  const loadTokens = useCallback(async () => {
    setTokens(null);
    setTokensError("");
    try {
      setTokens(await listTokens());
    } catch (err) {
      setTokens([]);
      setTokensError(err instanceof Error ? err.message : "Couldn't load connected CLIs.");
    }
  }, []);

  const loadPublished = useCallback(async (handle?: string | null) => {
    setPublishedError("");
    setOpenVersions({});
    setVersionsBySlug({});
    if (!handle) {
      setProfileVerified(null);
      setPublished([]);
      return;
    }

    setPublished(null);
    setProfileVerified(null);
    try {
      const profile = await getPlatformProfile(handle);
      setProfileVerified(Boolean(profile.verified));
      setPublished(profile.shelf || []);
    } catch (err) {
      setProfileVerified(null);
      setPublished([]);
      setPublishedError(err instanceof Error ? err.message : "Couldn't load your published emissaries.");
    }
  }, []);

  const loadSession = useCallback(async () => {
    setState("loading");
    if (demoMode) {
      setSession(DEMO_SESSION);
      setStars(DEMO_STARS);
      setTokens(DEMO_TOKENS);
      setPublished(DEMO_PUBLISHED);
      setProfileVerified(true);
      setStarsError("");
      setTokensError("");
      setPublishedError("");
      setOpenVersions({});
      setVersionsBySlug({});
      setState("signed-in");
      return;
    }

    try {
      const s = await getSession();
      setSession(s);
      setState("signed-in");
      loadStars();
      loadTokens();
      loadPublished(s.handle);
    } catch (err) {
      if (err instanceof NotSignedIn) {
        setState("signed-out");
        return;
      }
      setErrorMsg(err instanceof Error ? err.message : "Couldn't load your account.");
      setState("error");
    }
  }, [demoMode, loadStars, loadPublished, loadTokens]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // ── Name ──
  function startNameEdit() {
    setNameDraft(session?.name || "");
    setNameError("");
    setEditingName(true);
  }
  async function saveName() {
    const next = nameDraft.trim();
    if (!next || next === (session?.name || "")) {
      setEditingName(false);
      return;
    }
    setSavingName(true);
    setNameError("");
    if (demoMode) {
      setSession((prev) => (prev ? { ...prev, name: next } : prev));
      setEditingName(false);
      setSavingName(false);
      return;
    }

    try {
      const updated = await updateName(next);
      setSession((prev) => (prev ? { ...prev, ...updated } : updated));
      setEditingName(false);
    } catch (err) {
      setNameError(err instanceof Error ? err.message : "Couldn't save — try again.");
    }
    setSavingName(false);
  }

  // ── Handle ──
  async function onClaimHandle() {
    const h = handleDraft.trim();
    const grammar = handleError(h);
    if (!h || grammar) {
      setHandleErr(grammar || "Pick a handle.");
      return;
    }
    setClaimingHandle(true);
    setHandleErr("");
    if (demoMode) {
      setSession((prev) => (prev ? { ...prev, handle: h } : prev));
      setPublished(DEMO_PUBLISHED);
      setProfileVerified(true);
      setHandleDraft("");
      setClaimingHandle(false);
      return;
    }

    try {
      await claimHandle(h);
      // Re-fetch the authoritative identity — the PUT body shape isn't relied on.
      const s = await getSession();
      setSession(s);
      setHandleDraft("");
      loadPublished(s.handle);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Couldn't claim that handle.";
      // 409 surfaces as the API's detail string; make "taken" unmistakable.
      setHandleErr(/409|taken|exist/i.test(msg) ? "That handle's already taken." : msg);
    }
    setClaimingHandle(false);
  }

  // ── Stars ──
  async function onUnstar(star: Star) {
    const prev = stars;
    setStars((cur) => (cur || []).filter((s) => !(s.owner === star.owner && s.slug === star.slug)));
    if (demoMode) return;

    try {
      await unstar(star.owner, star.slug);
    } catch {
      setStars(prev);
      setStarsError("Couldn't remove that star — try again.");
    }
  }

  // ── Tokens ──
  async function onRevoke(token: Token) {
    const prev = tokens;
    setRevoking(token.id);
    setTokens((cur) => (cur || []).filter((t) => t.id !== token.id));
    if (demoMode) {
      setRevoking(null);
      return;
    }

    try {
      await revokeToken(token.id);
    } catch {
      setTokens(prev);
      setTokensError("Couldn't revoke that CLI — try again.");
    }
    setRevoking(null);
  }

  async function onToggleVersions(entry: PublishedEmissary) {
    if (!session?.handle) return;
    const slug = entry.slug;
    const willOpen = !openVersions[slug];
    setOpenVersions((prev) => ({ ...prev, [slug]: willOpen }));
    if (!willOpen || versionsBySlug[slug]) return;

    if (demoMode) {
      setVersionsBySlug((prev) => ({
        ...prev,
        [slug]: { state: "ready", versions: DEMO_VERSIONS[slug] || [] },
      }));
      return;
    }

    setVersionsBySlug((prev) => ({ ...prev, [slug]: { state: "loading", versions: [] } }));
    try {
      const res = await listPublishedVersions(session.handle, slug);
      setVersionsBySlug((prev) => ({
        ...prev,
        [slug]: { state: "ready", versions: res.versions || [] },
      }));
    } catch (err) {
      setVersionsBySlug((prev) => ({
        ...prev,
        [slug]: {
          state: "error",
          versions: [],
          message: err instanceof Error ? err.message : "Couldn't load versions.",
        },
      }));
    }
  }

  async function onSignOut() {
    setSigningOut(true);
    if (demoMode) {
      setSigningOut(false);
      return;
    }

    try {
      await logout();
    } catch {
      // Clear local state regardless — the cookie may already be gone.
    }
    setSigningOut(false);
    loadSession();
  }

  if (state === "loading") {
    return (
      <div className="setup-stage meridian">
        <div className="em-result">
          <div className="setup-spinner" />
          <p className="em-prose">Loading your account…</p>
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="setup-stage meridian">
        <div className="setup-stage-centered">
          <h1 className="setup-title">Account</h1>
          <p className="setup-sub">{errorMsg}</p>
          <button type="button" className="setup-btn setup-btn-secondary" onClick={loadSession}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (state === "signed-out") {
    return (
      <div className="setup-stage meridian">
        <div className="setup-stage-centered">
          <div className="setup-eyebrow">Emissary · account</div>
          <h1 className="setup-title">You&apos;re signed out</h1>
          <p className="setup-sub">
            Sign in to see your identity and saved emissaries.
          </p>
          <a className="setup-btn setup-btn-primary em-login-submit" href="/login?next=/emissary/account">
            Sign in
          </a>
        </div>
      </div>
    );
  }

  // signed-in
  const handle = session?.handle || "";
  const displayName = session?.name || (handle ? `@${handle}` : emailLocalPart(session?.email)) || "Emissary";
  const memberSince = session?.created_at ? fmtDate(session.created_at) : null;
  const publishedCount = published ? published.length : "...";
  const starsCount = stars ? stars.length : "...";
  const tokensCount = tokens ? tokens.length : "...";

  return (
    <div className="setup-stage acct-console meridian">
      {demoMode && (
        <div className="acct-demo-note">
          Fixture preview - no real account, email, device, star, or publish state is being changed.
        </div>
      )}

      <section className="acct-identity-band" aria-labelledby="acct-title">
        <span className="acct-avatar-large" aria-hidden="true">{accountInitial(session)}</span>
        <div className="acct-identity">
          <div className="acct-kicker">Emissary account</div>
          {editingName ? (
            <div className="acct-name-edit">
              <input
                className="setup-input acct-name-input"
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveName();
                  if (e.key === "Escape") setEditingName(false);
                }}
                placeholder="Your display name"
                aria-label="Display name"
                autoFocus
                disabled={savingName}
              />
              <div className="acct-name-actions">
                <button
                  type="button"
                  className="setup-btn setup-btn-primary acct-btn-sm"
                  onClick={saveName}
                  disabled={savingName}
                >
                  {savingName ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  className="setup-btn setup-btn-secondary acct-btn-sm"
                  onClick={() => setEditingName(false)}
                  disabled={savingName}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="acct-name-row">
              <h1 className="acct-name" id="acct-title">{displayName}</h1>
              {session?.badge ? (
                <span className="acct-mbadge">
                  <span className="acct-mbadge-ring" aria-hidden="true" /> {session.badge}
                </span>
              ) : null}
              <button type="button" className="acct-edit" onClick={startNameEdit}>
                Edit
              </button>
            </div>
          )}
          {nameError && <span className="acct-inline-err">{nameError}</span>}

          <div className="acct-meta">
            {handle && <span className="acct-handle">@{handle}</span>}
            {session?.email && <span className="acct-email">{session.email}</span>}
            {profileVerified && <span className="acct-verified">✓ verified</span>}
            {memberSince && <span className="acct-since">member since {memberSince}</span>}
          </div>
        </div>
      </section>

      <div className="acct-overview" aria-label="Account summary">
        <span><strong>{publishedCount}</strong> published</span>
        <span><strong>{starsCount}</strong> stars</span>
        <span><strong>{tokensCount}</strong> devices</span>
      </div>

      {!handle && (
        <div className="acct-claim">
          <div className="acct-section-head">
            <span className="acct-section-label">Claim your handle</span>
            <span className="acct-section-rule" />
          </div>
          <p className="em-prose acct-claim-copy">
            A short public name people use to send you emissaries. Pick carefully:
            it is near-permanent once claimed.
          </p>
          <div className="acct-claim-row">
            <div className="acct-claim-input">
              <span className="acct-at">@</span>
              <input
                className="setup-input"
                value={handleDraft}
                onChange={(e) => {
                  setHandleDraft(e.target.value);
                  setHandleErr(handleError(e.target.value) || "");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onClaimHandle();
                }}
                placeholder="your-handle"
                aria-label="Choose a handle"
                spellCheck={false}
                autoCapitalize="none"
                autoCorrect="off"
                disabled={claimingHandle}
              />
            </div>
            <button
              type="button"
              className="setup-btn setup-btn-primary acct-btn-sm"
              onClick={onClaimHandle}
              disabled={claimingHandle || !handleDraft.trim() || !!handleError(handleDraft)}
            >
              {claimingHandle ? "Claiming..." : "Claim"}
            </button>
          </div>
          <span className={`acct-grammar${handleErr ? " is-err" : ""}`}>
            {handleErr || "Lowercase letters, numbers, and hyphens: [a-z0-9-]"}
          </span>
        </div>
      )}

      <div className="acct-sections">
        <section className="acct-section acct-section-published">
          <div className="acct-section-head acct-section-head-strong">
            <div>
              <span className="acct-section-label">Published by you</span>
              <h2>Live addresses</h2>
            </div>
            <span className="acct-section-count">{published ? published.length : ""}</span>
          </div>

          {!handle ? (
            <p className="em-prose acct-empty">
              Claim a handle before public addresses can attach to your account.
            </p>
          ) : published === null ? (
            <div className="acct-stars-loading">
              <div className="setup-spinner-sm" />
              <span className="em-prose">Loading...</span>
            </div>
          ) : publishedError && published.length === 0 ? (
            <p className="em-prose acct-empty">{publishedError}</p>
          ) : published.length === 0 ? (
            <div className="acct-empty-block">
              <p className="em-prose acct-empty">
                No public addresses yet. Publish from your harness and they will land here.
              </p>
              <CommandBlock command="emissary new" />
            </div>
          ) : (
            <div className="acct-published">
              {publishedError && <p className="em-prose acct-empty">{publishedError}</p>}
              {published.map((entry) => {
                const versionState = versionsBySlug[entry.slug];
                const addressHref = `/@${handle}/${entry.slug}`;
                const copyUrl = `https://egregore.xyz/@${handle}/${entry.slug}`;
                const artKind = kindClass(entry.category || entry.kind);
                return (
                  <article className={`acct-pub acct-pub-${artKind}`} key={entry.slug}>
                    <a className="acct-pub-art" href={addressHref} aria-label={`Open ${entry.address}`}>
                      <span className="acct-art-label">{labelFrom(entry.category || entry.kind)}</span>
                      <span className="acct-art-mark" aria-hidden="true">
                        <span>{artInitial(entry)}</span>
                      </span>
                      <span className="acct-art-rule" aria-hidden="true" />
                    </a>

                    <div className="acct-pub-body">
                      <div className="acct-pub-topline">
                        <a className="acct-pub-address" href={addressHref}>{entry.address}</a>
                        <span className="acct-pub-stats">{entry.stars} stars</span>
                      </div>
                      <h3>{entry.topic || entry.slug}</h3>
                      {entry.summary && <p>{entry.summary}</p>}
                      <div className="acct-star-tags">
                        {entry.kind && <span className="acct-chip">{entry.kind}</span>}
                        {entry.category && <span className="acct-chip acct-chip-mode">{entry.category}</span>}
                        <span className="acct-chip acct-chip-mode">v{entry.version}</span>
                        {fmtDate(entry.updated_at) && (
                          <span className="acct-chip acct-chip-mode">updated {fmtDate(entry.updated_at)}</span>
                        )}
                      </div>
                      <div className="acct-pub-actions">
                        <a className="setup-btn setup-btn-primary acct-btn-sm" href={addressHref}>Open</a>
                        <button
                          type="button"
                          className="setup-btn setup-btn-secondary acct-btn-sm"
                          onClick={() => onToggleVersions(entry)}
                          aria-expanded={!!openVersions[entry.slug]}
                        >
                          Versions
                        </button>
                        <CopyButton value={copyUrl} label="Copy" />
                      </div>
                    </div>

                    {openVersions[entry.slug] && (
                      <div className="acct-version-panel">
                        {versionState?.state === "loading" || !versionState ? (
                          <div className="acct-stars-loading">
                            <div className="setup-spinner-sm" />
                            <span className="em-prose">Loading versions...</span>
                          </div>
                        ) : versionState.state === "error" ? (
                          <p className="em-prose acct-empty">{versionState.message}</p>
                        ) : versionState.versions.length === 0 ? (
                          <p className="em-prose acct-empty">No version history yet.</p>
                        ) : (
                          <div className="acct-version-list">
                            {versionState.versions.map((version) => (
                              <a
                                className="acct-version"
                                href={`/emissary/e/${version.id}`}
                                key={version.id}
                              >
                                <span>v{version.version}{version.is_head ? " head" : ""}</span>
                                <strong>{version.topic || "Untitled emissary"}</strong>
                                {fmtDate(version.created_at) && <small>{fmtDate(version.created_at)}</small>}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="acct-section acct-section-stars" id="stars">
          <div className="acct-section-head acct-section-head-strong">
            <div>
              <span className="acct-section-label">Collection</span>
              <h2>Stars</h2>
            </div>
            <span className="acct-section-count">{stars ? stars.length : ""}</span>
          </div>
          <CommandBlock command="emissary pull" />
          <p className="acct-panel-copy">
            Pull saved emissaries into your terminal when the work is ready to move.
          </p>

          {stars === null ? (
            <div className="acct-stars-loading">
              <div className="setup-spinner-sm" />
              <span className="em-prose">Loading...</span>
            </div>
          ) : starsError && stars.length === 0 ? (
            <p className="em-prose acct-empty">{starsError}</p>
          ) : stars.length === 0 ? (
            <p className="em-prose acct-empty">
              Nothing saved yet. <a href="/emissary/browse">Browse the directory</a>.
            </p>
          ) : (
            <div className="acct-stars">
              {starsError && <p className="em-prose acct-empty">{starsError}</p>}
              {stars.map((star) => (
                <div className="acct-star" key={star.address}>
                  <div className="acct-star-main">
                    <a className="acct-star-addr" href={`/emissary/e/${star.resolved_id}`}>
                      {star.address}
                    </a>
                    {star.topic && <span className="acct-star-topic">{star.topic}</span>}
                    <div className="acct-star-tags">
                      {star.kind && <span className="acct-chip">{star.kind}</span>}
                      <span className="acct-chip acct-chip-mode">
                        {star.mode === "follow" ? "following" : "pinned"}
                      </span>
                      {star.updated_since_star && (
                        <span className="acct-chip acct-chip-alert">updated</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="acct-unstar"
                    onClick={() => onUnstar(star)}
                    aria-label={`Unstar ${star.address}`}
                  >
                    ★
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="acct-section acct-section-connector">
          <div className="acct-section-head acct-section-head-strong">
            <div>
              <span className="acct-section-label">Connectors</span>
              <h2>ChatGPT + Claude</h2>
            </div>
          </div>
          <p className="acct-panel-copy">
            Create emissaries straight from ChatGPT or Claude — no install, no keys.
            Add this connector, click <strong>Connect</strong>, and sign in with your
            Egregore email.
          </p>
          <CommandBlock command={MCP_CONNECTOR_URL} />
          <p className="acct-panel-copy">
            <strong>Claude:</strong> Settings → Connectors → Add custom connector →
            paste the URL → Connect → sign in → Allow.
            <br />
            <strong>ChatGPT:</strong> Settings → Connectors → Add → paste the URL →
            Connect → sign in → Allow.
          </p>
          <p className="em-prose acct-empty">
            Each connection appears under Devices and can be revoked anytime.
          </p>
        </section>

        <section className="acct-section acct-section-devices">
          <div className="acct-section-head acct-section-head-strong">
            <div>
              <span className="acct-section-label">Devices</span>
              <h2>Devices + tokens</h2>
            </div>
            <span className="acct-section-count">{tokens ? tokens.length : ""}</span>
          </div>
          <p className="acct-cli-note">edit in your terminal: egregore emissary tokens</p>

          {tokens === null ? (
            <div className="acct-stars-loading">
              <div className="setup-spinner-sm" />
              <span className="em-prose">Loading...</span>
            </div>
          ) : tokensError && tokens.length === 0 ? (
            <p className="em-prose acct-empty">{tokensError}</p>
          ) : tokens.length === 0 ? (
            <p className="em-prose acct-empty">
              No devices connected yet. Run <code>emissary login</code> in your terminal.
            </p>
          ) : (
            <div className="acct-tokens">
              {tokensError && <p className="em-prose acct-empty">{tokensError}</p>}
              {tokens.map((t) => {
                const created = fmtDate(tokenCreated(t));
                const lastUsed = fmtDate(tokenLastUsed(t));
                return (
                  <div className="devrow" key={t.id}>
                    <div className="acct-token-main">
                      <span className="acct-token-harness">{tokenHarness(t)}</span>
                      <div className="acct-token-meta">
                        {created && <span>connected {created}</span>}
                        <span>{lastUsed ? `last used ${lastUsed}` : "not used yet"}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="setup-btn setup-btn-secondary acct-btn-sm acct-revoke"
                      onClick={() => onRevoke(t)}
                      disabled={revoking === t.id}
                    >
                      {revoking === t.id ? "Revoking..." : "Revoke"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="acct-section acct-danger">
          <div className="acct-section-head acct-section-head-strong">
            <div>
              <span className="acct-section-label">Danger zone</span>
              <h2>Danger zone</h2>
            </div>
          </div>
          <div className="devrow danger-row">
            <div className="acct-token-main">
              <span className="acct-token-harness">Session</span>
              <div className="acct-token-meta">
                <span>Sign out of this browser. Connected devices remain until revoked above.</span>
              </div>
            </div>
            <button
              type="button"
              className="setup-btn setup-btn-secondary acct-btn-sm acct-signout"
              onClick={onSignOut}
              disabled={signingOut}
            >
              {signingOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
