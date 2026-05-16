"use client";

import { useState, useCallback } from "react";
import "./setup.css";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://egregore-production-55f2.up.railway.app";

type Stage =
  | { name: "form" }
  | { name: "submitting" }
  | { name: "success"; mcp_url: string; email: string; display_name: string }
  | { name: "error"; message: string };

function CopyIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const onClick = useCallback(() => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }, [value]);
  return (
    <button type="button" className="setup-btn setup-btn-secondary" onClick={onClick} aria-label={label}>
      {copied ? <CheckIcon /> : <CopyIcon />}
      <span style={{ marginLeft: 8 }}>{copied ? "Copied" : label}</span>
    </button>
  );
}

export default function McpRegisterFlow() {
  const [stage, setStage] = useState<Stage>({ name: "form" });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmedName = name.trim();
      const trimmedEmail = email.trim();
      if (!trimmedName || !trimmedEmail) {
        setStage({ name: "error", message: "Name and email are both required." });
        return;
      }
      setStage({ name: "submitting" });
      try {
        const res = await fetch(`${API_URL}/api/mcp/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmedName, email: trimmedEmail }),
        });
        if (!res.ok) {
          let detail = `Registration failed (${res.status}).`;
          try {
            const body = await res.json();
            if (body?.detail) detail = body.detail;
          } catch {}
          setStage({ name: "error", message: detail });
          return;
        }
        const data = await res.json();
        if (!data?.mcp_url) {
          setStage({ name: "error", message: "Registration returned without a connector URL." });
          return;
        }
        setStage({
          name: "success",
          mcp_url: data.mcp_url,
          email: data.email || trimmedEmail,
          display_name: data.name || trimmedName,
        });
      } catch (err) {
        setStage({
          name: "error",
          message: err instanceof Error ? err.message : "Something went wrong reaching the server.",
        });
      }
    },
    [name, email]
  );

  // ── Stage: success — show the personalised connector URL + install steps
  if (stage.name === "success") {
    return (
      <div className="setup-stage">
        <div>
          <div className="setup-eyebrow">Egregore MCP · Installed</div>
          <h1 className="setup-title">Your connector is ready, {stage.display_name}.</h1>
          <p className="setup-sub">
            Paste this URL into Claude.ai (or any other LLM that accepts custom MCP connectors). Identity is bound to{" "}
            <strong>{stage.email}</strong> — you can publish handoffs, receive replies, and list your capsules without telling
            the agent who you are each time.
          </p>
        </div>

        <div
          style={{
            background: "var(--cream)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: 16,
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <code
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              color: "var(--black)",
              flex: "1 1 240px",
              wordBreak: "break-all",
            }}
          >
            {stage.mcp_url}
          </code>
          <CopyButton value={stage.mcp_url} label="Copy URL" />
        </div>

        <div>
          <div className="setup-eyebrow">Install in Claude.ai</div>
          <ol style={{ paddingLeft: 20, margin: "12px 0", fontFamily: "var(--font-sans)", fontSize: 15, lineHeight: 1.6 }}>
            <li>
              Open <strong>Claude.ai</strong> (web or desktop).
            </li>
            <li>
              Settings → <strong>Connectors</strong> → <strong>Add custom connector</strong>.
            </li>
            <li>Paste the URL above. Save.</li>
            <li>
              That's it. Your next chat has <code style={{ fontFamily: "var(--font-mono)" }}>send_handoff</code>,{" "}
              <code style={{ fontFamily: "var(--font-mono)" }}>receive_handoff</code>,{" "}
              <code style={{ fontFamily: "var(--font-mono)" }}>reply_to_handoff</code>, and{" "}
              <code style={{ fontFamily: "var(--font-mono)" }}>list_my_handoffs</code> available as tools.
            </li>
          </ol>
        </div>

        <div>
          <div className="setup-eyebrow">Other harnesses</div>
          <p className="setup-sub" style={{ marginTop: 8 }}>
            <strong>Claude Code / Codex / Cursor</strong> — you don't need this URL. Run{" "}
            <code style={{ fontFamily: "var(--font-mono)" }}>npx egregore-handoff install</code> in your terminal and the
            harness-native skill takes care of identity.{" "}
            <strong>ChatGPT</strong> — MCP support shipping; in the meantime use the Custom GPT in{" "}
            <code style={{ fontFamily: "var(--font-mono)" }}>packages/egregore-handoff/gpt/</code>.{" "}
            <strong>Browser-only</strong> — no install needed; paste any handoff URL into a browser to read it and reply via
            the confirmation page.
          </p>
        </div>

        <p className="setup-sub" style={{ opacity: 0.7 }}>
          Lost this URL? Re-register at any time — old tokens stay valid; you can use whichever you have.
        </p>
      </div>
    );
  }

  // ── Stage: form (default) + submitting + error
  const submitting = stage.name === "submitting";
  return (
    <form className="setup-stage" onSubmit={onSubmit}>
      <div>
        <div className="setup-eyebrow">Egregore MCP</div>
        <h1 className="setup-title">Connect Egregore to your LLM.</h1>
        <p className="setup-sub">
          Register once, paste your personalised connector URL into Claude.ai (or another LLM that accepts custom MCP
          connectors), and send / receive / reply to handoffs from inside chat — no terminal required.
        </p>
      </div>

      <div>
        <label
          htmlFor="mcp-name"
          style={{
            display: "block",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--black)",
            opacity: 0.7,
            marginBottom: 8,
          }}
        >
          Your name
        </label>
        <input
          id="mcp-name"
          type="text"
          className="setup-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Oz"
          required
          maxLength={200}
          autoComplete="name"
          disabled={submitting}
        />
        <p className="setup-input-hint">Appears as the sender on every handoff you publish.</p>
      </div>

      <div>
        <label
          htmlFor="mcp-email"
          style={{
            display: "block",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--black)",
            opacity: 0.7,
            marginBottom: 8,
          }}
        >
          Your email
        </label>
        <input
          id="mcp-email"
          type="email"
          className="setup-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          maxLength={200}
          autoComplete="email"
          disabled={submitting}
        />
        <p className="setup-input-hint">
          Bound to your connector token. Used for handoff substrate; we'll never share it.
        </p>
      </div>

      {stage.name === "error" && (
        <div
          role="alert"
          style={{
            padding: 12,
            border: "1px solid var(--terracotta)",
            background: "rgba(212, 135, 90, 0.08)",
            borderRadius: 10,
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            color: "var(--black)",
          }}
        >
          {stage.message}
        </div>
      )}

      <div className="setup-actions">
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--black)",
            opacity: 0.55,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          {submitting ? "Registering…" : "Free · No password · Re-registrable"}
        </span>
        <button type="submit" className="setup-btn setup-btn-primary" disabled={submitting}>
          {submitting ? "Working…" : "Get my connector URL"}
        </button>
      </div>
    </form>
  );
}
