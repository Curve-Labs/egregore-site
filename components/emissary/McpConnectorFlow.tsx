"use client";

// Web-chat install path (B2). Collects name + email, registers an emissary
// identity, and shows the MCP connector URL + auth header to paste into the
// chat client's connector settings. Optionally carries an install token from
// an /emissary/i/{token} entry point.

import { useCallback, useState } from "react";
import { register } from "./api";
import type { McpConfig } from "./api";
import { CopyButton } from "./ui";

type Stage =
  | { name: "form" }
  | { name: "submitting" }
  | {
      name: "success";
      mcp: McpConfig;
      authToken: string;
      email: string;
      displayName: string;
    }
  | { name: "error"; message: string };

export default function McpConnectorFlow({
  installToken,
  defaultHarness = "claude-ai",
}: {
  installToken?: string;
  defaultHarness?: "claude-ai" | "chatgpt";
}) {
  const [stage, setStage] = useState<Stage>({ name: "form" });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [harness, setHarness] = useState<"claude-ai" | "chatgpt">(defaultHarness);

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
        const res = await register({
          name: trimmedName,
          email: trimmedEmail,
          harness,
          ...(installToken ? { token: installToken } : {}),
        });
        setStage({
          name: "success",
          mcp: res.mcp_config,
          authToken: res.auth_token,
          email: trimmedEmail,
          displayName: trimmedName,
        });
      } catch (err) {
        setStage({
          name: "error",
          message: err instanceof Error ? err.message : "Something went wrong.",
        });
      }
    },
    [name, email, harness, installToken],
  );

  if (stage.name === "success") {
    const headerValue = stage.mcp.header_template.replace(
      "{auth_token}",
      stage.authToken,
    );
    const clientLabel = harness === "chatgpt" ? "ChatGPT" : "Claude.ai";
    return (
      <div className="em-section">
        <div className="em-banner em-banner-ok">
          Identity created for <strong>{stage.email}</strong>. We sent a
          verification email — verify when you can. You can already send
          emissaries; verifying just adds the verified badge to your renders.
        </div>

        <div className="em-section">
          <div className="em-section-label">Step 1 · Connector URL</div>
          <p className="em-prose">
            In {clientLabel}, open Settings → Connectors → Add custom
            connector. Paste this server URL:
          </p>
          <div className="em-url-field">
            <code>{stage.mcp.server_url}</code>
            <CopyButton value={stage.mcp.server_url} label="Copy URL" />
          </div>
        </div>

        <div className="em-section">
          <div className="em-section-label">Step 2 · Authorization header</div>
          <p className="em-prose">
            Add this header so the connector knows it&apos;s you. Keep it
            private — it&apos;s shown once.
          </p>
          <div className="em-url-field">
            <code>{headerValue}</code>
            <CopyButton value={headerValue} label="Copy header" />
          </div>
        </div>

        <p className="em-prose" style={{ opacity: 0.6 }}>
          Save the connector. Your next chat can send and respond to emissaries
          as you.
        </p>
      </div>
    );
  }

  const submitting = stage.name === "submitting";
  return (
    <form className="em-section" onSubmit={onSubmit}>
      <div className="em-section">
        <div className="em-section-label">Web chat</div>
        <p className="em-prose">
          claude.ai and ChatGPT install the emissary MCP connector. Register
          once — you&apos;ll get a connector URL and auth header to paste into
          the client&apos;s connector settings.
        </p>
      </div>

      <div className="em-harness-grid">
        <button
          type="button"
          className={`em-harness${harness === "claude-ai" ? " is-selected" : ""}`}
          onClick={() => setHarness("claude-ai")}
        >
          <span className="em-harness-name">Claude.ai</span>
          <span className="em-harness-kind">Web chat</span>
        </button>
        <button
          type="button"
          className={`em-harness${harness === "chatgpt" ? " is-selected" : ""}`}
          onClick={() => setHarness("chatgpt")}
        >
          <span className="em-harness-name">ChatGPT</span>
          <span className="em-harness-kind">Web chat</span>
        </button>
      </div>

      <div>
        <label htmlFor="em-name" className="em-section-label" style={{ display: "block", marginBottom: 8 }}>
          Your name
        </label>
        <input
          id="em-name"
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
        <p className="setup-input-hint">Appears as the sender on every emissary you send.</p>
      </div>

      <div>
        <label htmlFor="em-email" className="em-section-label" style={{ display: "block", marginBottom: 8 }}>
          Your email
        </label>
        <input
          id="em-email"
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
          Bound to your connector token. We send a verification link here.
        </p>
      </div>

      {stage.name === "error" && (
        <div role="alert" className="em-banner em-banner-error">
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
          {submitting ? "Registering…" : "Free · No password"}
        </span>
        <button type="submit" className="setup-btn setup-btn-primary" disabled={submitting}>
          {submitting ? "Working…" : "Get my connector"}
        </button>
      </div>
    </form>
  );
}
