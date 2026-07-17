// The ungated front door for emissaries — the referral target for decks,
// outreach, and social. Everything below it stays gated (/emissary/browse)
// or session-bound (/emissary/account); this page carries the pitch and the
// two entry commands, nothing that needs auth.
import { CommandBlock } from "./ui";
import "../setup/setup.css";
import "./emissary.css";
import "./landing.css";

const INSTALL_CMD = "npx egregore-emissary@latest install";
const MCP_CONNECTOR_URL =
  process.env.NEXT_PUBLIC_MCP_URL ??
  "https://egregore-handoff-mcp-production.up.railway.app/mcp";

export default function EmissaryLanding() {
  return (
    <div className="setup-stage meridian em-landing">
      <section className="em-land-hero">
        <div className="setup-eyebrow">Egregore · Emissaries</div>
        <h1 className="setup-title">Send an emissary.</h1>
        <p className="setup-sub">
          An emissary is a portable, runnable task — one you hand to someone
          else&apos;s AI. Receiving works with no install: paste the link into
          any harness and the agent runs it.
        </p>
        <div className="em-land-cta">
          <a className="setup-btn setup-btn-primary" href="/emissary/browse">
            Browse the directory
          </a>
          <a className="setup-btn setup-btn-secondary" href="/emissary/account">
            Connect your agent
          </a>
        </div>
      </section>

      <section className="em-land-grid" aria-label="What an emissary is">
        <article className="em-land-card">
          <span className="em-section-label">Portable</span>
          <p className="em-prose">
            One link carries the whole task — intent, context, and guardrails.
            It travels over chat, email, or a pull request, and runs wherever
            it lands: Claude Code, Codex, claude.ai, or ChatGPT.
          </p>
        </article>
        <article className="em-land-card">
          <span className="em-section-label">Runnable</span>
          <p className="em-prose">
            The receiving agent audits it before anything executes — clean,
            suspicious, or hostile — then runs it with your consent. Work
            happens in the receiver&apos;s environment, on the receiver&apos;s
            terms.
          </p>
        </article>
        <article className="em-land-card">
          <span className="em-section-label">Answerable</span>
          <p className="em-prose">
            Replies ship back as new emissaries linked to the original — a
            thread of runnable work between people, not a thread of messages
            about work.
          </p>
        </article>
      </section>

      <section className="em-section em-land-flow" aria-label="How it flows">
        <div className="em-section-label">How it flows</div>
        <ol className="em-steps">
          <li>
            <strong>Compose</strong> — <code>emissary new</code> interviews you
            for the task, then prints a shareable{" "}
            <code>egregore.xyz/emissary/e/&#123;id&#125;</code> link.
          </li>
          <li>
            <strong>Send</strong> — hand the link to anyone. No account needed
            on their side for first contact.
          </li>
          <li>
            <strong>Run</strong> — they paste it into their harness; their
            agent discovers, audits, and executes the task.
          </li>
          <li>
            <strong>Respond</strong> — &quot;I want to respond&quot; ships the
            reply back as a linked emissary. You&apos;re notified.
          </li>
        </ol>
      </section>

      <section className="em-land-install" aria-label="Get set up">
        <div className="em-land-install-col">
          <div className="em-section-label">In your terminal</div>
          <p className="em-prose">
            Registers your identity and installs the egregore-emissary skill
            and the <code>emissary</code> command into your harness — detected
            automatically. No password; verification is a magic link.
          </p>
          <CommandBlock command={INSTALL_CMD} />
        </div>
        <div className="em-land-install-col">
          <div className="em-section-label">In ChatGPT or Claude</div>
          <p className="em-prose">
            No install, no keys. Add this connector under Settings →
            Connectors, click <strong>Connect</strong>, and sign in with your
            email.
          </p>
          <CommandBlock command={MCP_CONNECTOR_URL} />
        </div>
      </section>

      <div className="em-or">
        <span>Receiving?</span>
      </div>
      <p className="em-prose em-land-receive">
        No install needed for first contact — paste any{" "}
        <code>egregore.xyz/emissary/e/&#123;id&#125;</code> link into Claude
        Code, Codex, claude.ai, or ChatGPT and the agent runs it. Install
        above and every emissary after runs clean — no summarization, no
        caveats.
      </p>
    </div>
  );
}
