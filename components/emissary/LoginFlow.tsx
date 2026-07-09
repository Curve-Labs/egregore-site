"use client";

// /login — the site-owned sign-in surface. Two paths:
//   • no ?token=  → email form → POST /login-link → "check your inbox" (always
//     a success message; the API never reveals whether the email is registered).
//   • ?token=…    → a legacy/fallback magic link. Forward the browser straight
//     to the API verify endpoint (proxied same-origin), which consumes the
//     token, sets the eg_session cookie, and 302s to `next`. Newer emails point
//     directly at that endpoint; this keeps older /login?token= links working.
//
// `next` is honoured but whitelisted to same-origin paths so a sign-in link can
// never bounce the browser off egregore.xyz.

import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { loginLink } from "./account-api";
import { CheckIcon } from "./ui";
import "../setup/setup.css";
import "./emissary.css";
import "./meridian.css";

function safeNext(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return null;
  return raw;
}

type Stage = "form" | "sending" | "sent" | "verifying";

export default function LoginFlow() {
  const params = useSearchParams();
  const token = params.get("token");
  const next = safeNext(params.get("next"));
  const [stage, setStage] = useState<Stage>(token ? "verifying" : "form");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    // Default matches the API's new post-verify default (/emissary?welcome=1) so
    // a link with no explicit next lands on the hub's welcome beat. A supplied
    // same-origin next still wins.
    const dest = next || "/emissary?welcome=1";
    window.location.replace(
      "/api/v1/emissary/login-verify?token=" +
        encodeURIComponent(token) +
        "&next=" +
        encodeURIComponent(dest),
    );
  }, [token, next]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const addr = email.trim();
    if (!addr) return;
    setStage("sending");
    setError("");
    try {
      await loginLink(addr, next || undefined);
      setStage("sent");
    } catch (err) {
      setStage("form");
      setError(err instanceof Error ? err.message : "Something went wrong — try again.");
    }
  }

  if (stage === "verifying") {
    return (
      <div className="setup-stage meridian">
        <div className="em-result">
          <div className="setup-spinner" />
          <p className="em-prose">Signing you in…</p>
        </div>
      </div>
    );
  }

  if (stage === "sent") {
    return (
      <div className="setup-stage meridian">
        <div className="em-result">
          <div className="em-result-icon em-result-icon-ok">
            <CheckIcon />
          </div>
          <h1 className="setup-title">Check your inbox.</h1>
          <p className="em-prose">
            If that email is registered, a one-time sign-in link is on its way.
            It&apos;s valid for 15 minutes — no password, just open the link.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="setup-stage meridian">
      <div className="setup-stage-centered">
        <div className="setup-eyebrow">Emissary · sign in</div>
        <h1 className="setup-title">Sign in</h1>
        <p className="setup-sub">
          Enter your email and we&apos;ll send a one-time sign-in link. No password.
        </p>
      </div>
      <form onSubmit={onSubmit} className="em-login-form">
        <input
          className="setup-input"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError("");
          }}
          placeholder="you@example.com"
          autoComplete="email"
          aria-label="Email address"
          autoFocus
          required
        />
        {error && <div className="setup-error">{error}</div>}
        <button
          type="submit"
          className="setup-btn setup-btn-primary em-login-submit"
          disabled={stage === "sending"}
        >
          {stage === "sending" ? "Sending…" : "Email me a link"}
        </button>
      </form>
    </div>
  );
}
