"use client";

// /emissary/account — the site-owned account surface. On load it asks the API
// who's signed in (GET /session, cookie-authed). Signed out → a sign-in CTA.
// Signed in → an identity card, the stars you've collected (with unstar), the
// `emissary pull` teach block, and sign out. Every call is same-origin through
// the netlify.toml proxies; nothing here holds the Railway URL.

import { useCallback, useEffect, useState } from "react";
import {
  getSession,
  listStars,
  logout,
  unstar,
  NotSignedIn,
  type Session,
  type Star,
} from "./account-api";
import { CommandBlock } from "./ui";
import "../setup/setup.css";
import "./emissary.css";
import "./account.css";

type State = "loading" | "signed-out" | "signed-in" | "error";

export default function AccountFlow() {
  const [state, setState] = useState<State>("loading");
  const [session, setSession] = useState<Session | null>(null);
  const [stars, setStars] = useState<Star[] | null>(null);
  const [starsError, setStarsError] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [signingOut, setSigningOut] = useState(false);

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

  const loadSession = useCallback(async () => {
    setState("loading");
    try {
      const s = await getSession();
      setSession(s);
      setState("signed-in");
      loadStars();
    } catch (err) {
      if (err instanceof NotSignedIn) {
        setState("signed-out");
        return;
      }
      setErrorMsg(err instanceof Error ? err.message : "Couldn't load your account.");
      setState("error");
    }
  }, [loadStars]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  async function onUnstar(star: Star) {
    const prev = stars;
    // Optimistic removal — roll back if the request fails.
    setStars((cur) => (cur || []).filter((s) => !(s.owner === star.owner && s.slug === star.slug)));
    try {
      await unstar(star.owner, star.slug);
    } catch {
      setStars(prev);
      setStarsError("Couldn't remove that star — try again.");
    }
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
  const who = session?.name || session?.email || "";
  const memberSince = session?.created_at
    ? new Date(session.created_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
      })
    : null;

  return (
    <div className="setup-stage">
      {/* Identity card */}
      <div className="acct-card">
        <div className="acct-id">
          <div className="acct-name">{who}</div>
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
