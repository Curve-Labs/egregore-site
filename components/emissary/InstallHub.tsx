"use client";

// Emissary install hub (/emissary). Two paths:
//   - Agentic CLI harness (Claude Code, Codex): installs the egregore-emissary
//     skill via the `npx egregore-emissary` CLI — the harness is auto-detected.
//   - Web chat (claude.ai, ChatGPT): installs the emissary MCP connector.
// One install covers both directions — send and receive. Receiving works
// cold (paste the link), but runs at full fidelity once installed.

import { useState } from "react";
import { CommandBlock } from "./ui";
import McpConnectorFlow from "./McpConnectorFlow";
import "../setup/setup.css";
import "./emissary.css";

type Path = "cli" | "web";

export default function InstallHub({
  installToken,
}: {
  installToken?: string;
}) {
  const [path, setPath] = useState<Path>("cli");

  // The install command (see docs/specs/emissary-architecture.md). The CLI
  // auto-detects the harness, so no --harness flag is needed. --token binds
  // the registration to an /emissary/i/{token} funnel.
  const installCmd = installToken
    ? `npx egregore-emissary install --token=${installToken}`
    : `npx egregore-emissary install`;

  return (
    <div className="setup-stage">
      <div>
        <div className="setup-eyebrow">Emissary Courier</div>
        <h1 className="setup-title">Send an emissary.</h1>
        <p className="setup-sub">
          An emissary is a portable, runnable task — one you hand to someone
          else&apos;s AI. Receiving works with no install: paste the link into
          any harness. Install the egregore-emissary skill and every emissary
          — sent or received — runs at full fidelity.
        </p>
      </div>

      {installToken && (
        <div className="em-banner em-banner-ok">
          You followed an install link. Run the command below — the
          registration will be bound to this invite.
        </div>
      )}

      {/* Path selector */}
      <div className="em-harness-grid">
        <button
          type="button"
          className={`em-harness${path === "cli" ? " is-selected" : ""}`}
          onClick={() => setPath("cli")}
        >
          <span className="em-harness-name">Agentic harness</span>
          <span className="em-harness-kind">Claude Code · Codex</span>
        </button>
        <button
          type="button"
          className={`em-harness${path === "web" ? " is-selected" : ""}`}
          onClick={() => setPath("web")}
        >
          <span className="em-harness-name">Web chat</span>
          <span className="em-harness-kind">claude.ai · ChatGPT</span>
        </button>
      </div>

      {path === "cli" ? (
        <>
          <div className="em-section">
            <div className="em-section-label">Install egregore-emissary</div>
            <p className="em-prose">
              Run this in your terminal. It registers your identity, sends a
              verification email, and installs the egregore-emissary skill and
              the <code>emissary</code> command — and the egregore MCP into
              your harness. The harness is detected automatically.
            </p>
            <CommandBlock command={installCmd} />
            <p className="setup-install-note">
              The command asks for your name and email if you don&apos;t pass
              them as flags. No password — verification is a magic link.
            </p>
          </div>

          <div className="em-section">
            <div className="em-section-label">Then</div>
            <ol className="em-steps">
              <li>
                Compose and send: <code>emissary new</code> — it interviews you
                for the task, then prints a shareable{" "}
                <code>egregore.xyz/emissary/e/&#123;id&#125;</code> link.
              </li>
              <li>
                Respond to one you received: tell your agent &quot;I want to
                respond&quot; — the reply ships as a new emissary linked to the
                original.
              </li>
            </ol>
          </div>
        </>
      ) : (
        <McpConnectorFlow installToken={installToken} />
      )}

      <div className="em-or">
        <span>Receiving?</span>
      </div>
      <p className="em-prose" style={{ textAlign: "center", opacity: 0.65 }}>
        No install needed for first contact — paste any{" "}
        <code>egregore.xyz/emissary/e/&#123;id&#125;</code> link into Claude
        Code, Codex, claude.ai, or ChatGPT and the agent runs it. Install
        above and every emissary after runs clean — no summarization, no
        caveats.
      </p>
    </div>
  );
}
