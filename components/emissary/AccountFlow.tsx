"use client";

// /emissary/account — the site-owned account surface. On load it asks the API
// who's signed in (GET /session, cookie-authed). Signed out → a sign-in CTA.
// Signed in → an identity card you can actually manage: inline display-name
// edit (PATCH /me), an @handle you can claim once (PUT /platform/profile), the
// CLIs connected to you (GET/DELETE /tokens), the stars you've collected, the
// `emissary pull` teach block, and sign out. Every call is same-origin through
// the netlify.toml proxies; nothing here holds the Railway URL.

import { useCallback, useEffect, useState } from "react";
import {
  getSession,
  listStars,
  listTokens,
  updateName,
  claimHandle,
  revokeToken,
  logout,
  unstar,
  handleError,
  NotSignedIn,
  type Session,
  type Star,
  type Token,
} from "./account-api";
import { CommandBlock } from "./ui";
import "../setup/setup.css";
import "./emissary.css";
import "./account.css";

type State = "loading" | "signed-out" | "signed-in" | "error";

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

export default function AccountFlow() {
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

  const loadSession = useCallback(async () => {
    setState("loading");
    try {
      const s = await getSession();
      setSession(s);
      setState("signed-in");
      loadStars();
      loadTokens();
    } catch (err) {
      if (err instanceof NotSignedIn) {
        setState("signed-out");
        return;
      }
      setErrorMsg(err instanceof Error ? err.message : "Couldn't load your account.");
      setState("error");
    }
  }, [loadStars, loadTokens]);

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
    try {
      await claimHandle(h);
      // Re-fetch the authoritative identity — the PUT body shape isn't relied on.
      const s = await getSession();
      setSession(s);
      setHandleDraft("");
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
    try {
      await revokeToken(token.id);
    } catch {
      setTokens(prev);
      setTokensError("Couldn't revoke that CLI — try again.");
    }
    setRevoking(null);
  }

  async function onSignOut() {
    setSigningOut(true);
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
      <div className="setup-stage">
        <div className="em-result">
          <div className="setup-spinner" />
          <p className="em-prose">Loading your account…</p>
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="setup-stage">
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
      <div className="setup-stage">
        <div className="setup-stage-centered">
          <div className="setup-eyebrow">Emissary · account</div>
          <h1 className="setup-title">You&apos;re signed out</h1>
          <p className="setup-sub">
            Sign in to see your identity and the emissaries you&apos;ve starred.
          </p>
          <a className="setup-btn setup-btn-primary em-login-submit" href="/login?next=/emissary/account">
            Sign in
          </a>
        </div>
      </div>
    );
  }

  // signed-in
  const displayName = session?.name || session?.email || "";
  const memberSince = session?.created_at
    ? new Date(session.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long" })
    : null;

  return (
    <div className="setup-stage">
      {/* Identity card */}
      <div className="acct-card">
        <div className="acct-id">
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
                  {savingName ? "Saving…" : "Save"}
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
              <span className="acct-name">{displayName}</span>
              <button type="button" className="acct-edit" onClick={startNameEdit}>
                Edit
              </button>
            </div>
          )}
          {nameError && <span className="acct-inline-err">{nameError}</span>}

          <div className="acct-meta">
            {session?.handle && <span className="acct-handle">@{session.handle}</span>}
            <span className="acct-email">{session?.email}</span>
            {memberSince && <span className="acct-since">member since {memberSince}</span>}
          </div>
        </div>
        <button
          type="button"
          className="setup-btn setup-btn-secondary"
          onClick={onSignOut}
          disabled={signingOut}
        >
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </div>

      {/* Handle: claim (if none) or permanence note (if claimed) */}
      {session?.handle ? (
        <p className="acct-handle-note">
          Your handle <span className="acct-handle">@{session.handle}</span> is permanent —
          it&apos;s how people address emissaries to you.
        </p>
      ) : (
        <div className="acct-claim">
          <div className="acct-section-head">
            <span className="acct-section-label">Claim your handle</span>
            <span className="acct-section-rule" />
          </div>
          <p className="em-prose acct-claim-copy">
            A short public name people use to send you emissaries. Pick carefully —
            it&apos;s near-permanent once claimed.
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
              {claimingHandle ? "Claiming…" : "Claim"}
            </button>
          </div>
          <span className={`acct-grammar${handleErr ? " is-err" : ""}`}>
            {handleErr || "Lowercase letters, numbers, and hyphens — [a-z0-9-]"}
          </span>
        </div>
      )}

      {/* Connected CLIs */}
      <div className="acct-section">
        <div className="acct-section-head">
          <span className="acct-section-label">Connected CLIs</span>
          <span className="acct-section-rule" />
          <span className="acct-section-count">{tokens ? tokens.length : ""}</span>
        </div>

        {tokens === null ? (
          <div className="acct-stars-loading">
            <div className="setup-spinner-sm" />
            <span className="em-prose">Loading…</span>
          </div>
        ) : tokensError && tokens.length === 0 ? (
          <p className="em-prose acct-empty">{tokensError}</p>
        ) : tokens.length === 0 ? (
          <p className="em-prose acct-empty">
            No CLIs connected yet. Run <code>emissary login</code> in your terminal to
            connect this identity to a harness.
          </p>
        ) : (
          <div className="acct-tokens">
            {tokensError && <p className="em-prose acct-empty">{tokensError}</p>}
            {tokens.map((t) => {
              const created = fmtDate(tokenCreated(t));
              const lastUsed = fmtDate(tokenLastUsed(t));
              return (
                <div className="acct-token" key={t.id}>
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
                    {revoking === t.id ? "Revoking…" : "Revoke"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Stars */}
      <div className="acct-section">
        <div className="acct-section-head">
          <span className="acct-section-label">Stars</span>
          <span className="acct-section-rule" />
          <span className="acct-section-count">{stars ? stars.length : ""}</span>
        </div>

        {stars === null ? (
          <div className="acct-stars-loading">
            <div className="setup-spinner-sm" />
            <span className="em-prose">Loading…</span>
          </div>
        ) : starsError && stars.length === 0 ? (
          <p className="em-prose acct-empty">{starsError}</p>
        ) : stars.length === 0 ? (
          <p className="em-prose acct-empty">
            Nothing starred yet. <a href="/emissary/browse">Browse the directory</a> and ★ what you trust.
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
                      <span className="acct-chip acct-chip-alert">updated since</span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  className="acct-unstar"
                  onClick={() => onUnstar(star)}
                  aria-label={`Unstar ${star.address}`}
                  title="Remove star"
                >
                  ★
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pull teach block */}
      <div className="acct-teach">
        <div className="acct-section-head">
          <span className="acct-section-label">Pull them in</span>
          <span className="acct-section-rule" />
        </div>
        <CommandBlock command="emissary pull" />
        <p className="acct-teach-note">
          Run this in your terminal — your agent will offer these to run or install.
        </p>
      </div>
    </div>
  );
}
