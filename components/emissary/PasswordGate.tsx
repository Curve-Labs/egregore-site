"use client";

// Client-side password overlay for the /emissary test surface. Pre-launch
// gate only — the password ships in the bundle, so this keeps the page out
// of casual sight, not a real secret. Unlock is remembered for the tab via
// sessionStorage so navigation within the session doesn't re-prompt.

import { useEffect, useState, type ReactNode, type FormEvent } from "react";
import "../setup/setup.css";
import "./meridian.css";

const GATE_PASSWORD = "xhd~10!asxc";
const STORAGE_KEY = "emissary-gate";

export default function PasswordGate({
  children,
  password = GATE_PASSWORD,
  storageKey = STORAGE_KEY,
}: {
  children: ReactNode;
  password?: string;
  storageKey?: string;
}) {
  const [unlocked, setUnlocked] = useState(false);
  const [ready, setReady] = useState(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(storageKey) === "1") setUnlocked(true);
    } catch {
      /* sessionStorage unavailable — fall through to the prompt */
    }
    setReady(true);
  }, [storageKey]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (value === password) {
      try {
        sessionStorage.setItem(storageKey, "1");
      } catch {
        /* non-fatal — the unlock just won't persist across navigations */
      }
      setUnlocked(true);
    } else {
      setError(true);
    }
  }

  // Hold render until sessionStorage is read — avoids flashing the gate
  // for an already-unlocked tab.
  if (!ready) return null;
  if (unlocked) return <>{children}</>;

  return (
    <div
      className="meridian"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflowY: "auto",
        padding: "24px",
        background: "var(--paper)",
      }}
    >
      <form
        onSubmit={onSubmit}
        style={{
          width: "100%",
          maxWidth: "360px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
          background: "var(--card)",
          border: "1px solid var(--line)",
          borderRadius: "16px",
          padding: "28px",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            color: "var(--t1)",
          }}
        >
          Emissary · internal
        </div>
        <div
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "20px",
            color: "var(--ink)",
          }}
        >
          This page is gated
        </div>
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "14px",
            lineHeight: 1.55,
            color: "var(--ink)",
            opacity: 0.7,
            margin: 0,
          }}
        >
          The emissary test surface is private while we&apos;re in testing. Enter
          the team password to continue.
        </p>
        <input
          type="password"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(false);
          }}
          autoFocus
          placeholder="Password"
          aria-label="Team password"
          style={{
            padding: "10px 12px",
            borderRadius: "10px",
            border: `1px solid ${error ? "var(--t3)" : "var(--line)"}`,
            fontFamily: "var(--font-mono)",
            fontSize: "14px",
            background: "var(--paper)",
            color: "var(--ink)",
          }}
        />
        {error && (
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "13px",
              color: "var(--t3)",
            }}
          >
            Wrong password.
          </div>
        )}
        <button type="submit" className="setup-btn">
          Enter
        </button>
      </form>
    </div>
  );
}
