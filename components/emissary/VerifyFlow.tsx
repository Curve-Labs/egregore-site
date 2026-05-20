"use client";

// Email-verification target (/emissary/verify?token=...). Reads the token
// query param, calls GET /api/v1/emissary/verify client-side, and shows
// success or failure. The token is the credential — no other auth.

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { verify } from "./api";
import { CheckIcon } from "./ui";
import "../setup/setup.css";
import "./emissary.css";

type Stage =
  | { name: "loading" }
  | { name: "success" }
  | { name: "no-token" }
  | { name: "error"; message: string };

function ErrorIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export default function VerifyFlow() {
  const params = useSearchParams();
  const token = params.get("token");
  const [stage, setStage] = useState<Stage>({ name: "loading" });

  useEffect(() => {
    if (!token) {
      setStage({ name: "no-token" });
      return;
    }
    let cancelled = false;
    verify(token)
      .then((res) => {
        if (cancelled) return;
        if (res.verified) {
          setStage({ name: "success" });
        } else {
          setStage({ name: "error", message: "Verification did not complete. Try the link again." });
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setStage({
          name: "error",
          message: err instanceof Error ? err.message : "Verification failed.",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (stage.name === "loading") {
    return (
      <div className="setup-stage">
        <div className="em-result">
          <div className="setup-spinner" />
          <p className="em-prose">Verifying your email…</p>
        </div>
      </div>
    );
  }

  if (stage.name === "success") {
    return (
      <div className="setup-stage">
        <div className="em-result">
          <div className="em-result-icon em-result-icon-ok">
            <CheckIcon />
          </div>
          <h1 className="setup-title">Email verified.</h1>
          <p className="em-prose">
            Your emissary identity is verified. Emissaries you send now carry a
            verified-sender badge on their human render. You can close this tab.
          </p>
          <a href="/emissary" className="setup-btn setup-btn-primary" style={{ marginTop: 8 }}>
            Send an emissary
          </a>
        </div>
      </div>
    );
  }

  if (stage.name === "no-token") {
    return (
      <div className="setup-stage">
        <div className="em-result">
          <div className="em-result-icon em-result-icon-err">
            <ErrorIcon />
          </div>
          <h1 className="setup-title">No verification token.</h1>
          <p className="em-prose">
            This page verifies an email link. Open the link from the
            verification email we sent you — it carries the token this page
            needs.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="setup-stage">
      <div className="em-result">
        <div className="em-result-icon em-result-icon-err">
          <ErrorIcon />
        </div>
        <h1 className="setup-title">Couldn&apos;t verify.</h1>
        <p className="em-prose">{stage.message}</p>
        <p className="em-prose" style={{ opacity: 0.6 }}>
          Verification links expire after 24 hours. Trigger a fresh one with{" "}
          <code>emissary resend-verification</code>, or from your harness&apos;s
          emissary connector.
        </p>
      </div>
    </div>
  );
}
