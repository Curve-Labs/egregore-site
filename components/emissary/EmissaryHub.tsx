"use client";

// EmissaryHub — the /emissary page. Ported from the Claude Design handoff
// bundle ("Send an emissary"). The design's own header is dropped (the
// setup layout supplies the egregore logo) and --bg is kept as our cream;
// everything else is the design. The design-tool TweaksPanel is dropped.

import { useState, useEffect, type FC, type SVGProps } from "react";
import { register, fetchUsage } from "./api";
import type { McpConfig } from "./api";
import { SigilSpiral, SigilBootstrap, SigilCartographer, SigilForge } from "./sigils";
import "./emissary-hub.css";

// ── Icons ──────────────────────────────────────────────
const IconCopy: FC<SVGProps<SVGSVGElement>> = (props) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);
const IconCheck: FC<SVGProps<SVGSVGElement>> = (props) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const IconInbox: FC<SVGProps<SVGSVGElement>> = (props) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
    <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
  </svg>
);
// Paper-plane — "carried N times" (one tick per receiver who ran it).
const IconRuns: FC<SVGProps<SVGSVGElement>> = (props) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

// ── Channel glyphs (the four tabs) ─────────────────────
const G_Code: FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
  </svg>
);
const G_Codex: FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
  </svg>
);
const G_Web: FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
  </svg>
);
const G_Chat: FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);

// ── CopyButton ─────────────────────────────────────────
function CopyButton({ text, className = "copy-btn", label = "Copy" }: { text: string; className?: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* clipboard blocked — no-op */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  return (
    <button type="button" className={`${className}${copied ? " copied" : ""}`} onClick={onClick}>
      {copied ? <IconCheck /> : <IconCopy />}
      {copied ? "Copied" : label}
    </button>
  );
}

// ── Setup section (tabbed channels) ────────────────────
type ChannelPath = "terminal" | "web";
type Channel = { id: string; name: string; kind: string; path: ChannelPath; Glyph: FC };

const CHANNELS: Channel[] = [
  { id: "claude-code", name: "Claude Code", kind: "Agentic · Terminal", path: "terminal", Glyph: G_Code },
  { id: "codex", name: "Codex", kind: "Agentic · Terminal", path: "terminal", Glyph: G_Codex },
  { id: "claude-ai", name: "claude.ai", kind: "Web chat · MCP", path: "web", Glyph: G_Web },
  { id: "chatgpt", name: "ChatGPT", kind: "Web chat · MCP", path: "web", Glyph: G_Chat },
];

function SetupModule() {
  const [active, setActive] = useState("claude-code");
  const ch = CHANNELS.find((c) => c.id === active) ?? CHANNELS[0];
  return (
    <div className="setup">
      <div className="channel-tabs" role="tablist">
        {CHANNELS.map((c) => {
          const Glyph = c.Glyph;
          return (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={c.id === active}
              className="channel-tab"
              onClick={() => setActive(c.id)}
            >
              <span className="dot" />
              <span className="name">{c.name}</span>
              <span className="kind">{c.kind}</span>
              <span className="glyph"><Glyph /></span>
            </button>
          );
        })}
      </div>
      <div className="channel-body">
        {ch.path === "terminal" ? <TerminalPath name={ch.name} /> : <WebPath name={ch.name} channelId={ch.id} />}
      </div>
    </div>
  );
}

function TerminalPath({ name }: { name: string }) {
  return (
    <>
      <p className="install-copy">
        Run this once in {name}&apos;s working directory. It registers your identity,
        installs the <code>egregore-emissary</code> skill and the <code>emissary</code> command,
        and wires the egregore MCP into your harness — detected automatically.
      </p>
      <div className="term">
        <span className="cmd">
          <span className="prompt">$</span>npx <span className="accent">egregore-emissary@latest</span>&nbsp;install
        </span>
        <CopyButton text="npx egregore-emissary@latest install" />
      </div>
      <p className="web-note">
        Prompts for name + email if not flagged. No password — verification is a magic link.
      </p>
    </>
  );
}

function WebPath({ name, channelId }: { name: string; channelId: string }) {
  const [fname, setFname] = useState("");
  const [email, setEmail] = useState("");
  const [stage, setStage] = useState<"form" | "submitting" | "done" | "error">("form");
  const [message, setMessage] = useState("");
  const [mcp, setMcp] = useState<McpConfig | null>(null);

  const submit = async () => {
    if (!fname.trim() || !email.trim()) {
      setStage("error");
      setMessage("Name and email are both required.");
      return;
    }
    setStage("submitting");
    try {
      const res = await register({
        name: fname.trim(),
        email: email.trim(),
        harness: channelId,
      });
      setMcp(res.mcp_config);
      setStage("done");
    } catch (e) {
      setStage("error");
      setMessage(e instanceof Error ? e.message : "Something went wrong — try again.");
    }
  };

  if (stage === "done" && mcp) {
    return (
      <>
        <p className="install-copy">
          Registered. Check your email to verify your identity — we sent your auth
          header there. Then paste this connector URL into <em>{name} → Settings → Connectors</em>.
        </p>
        <div className="term">
          <span className="cmd">{mcp.server_url}</span>
          <CopyButton text={mcp.server_url} />
        </div>
        <p className="web-note">
          Auth header: <code>{mcp.header_template}</code> — your token arrives by email.
        </p>
      </>
    );
  }

  return (
    <>
      <p className="install-copy">
        {name} installs the emissary MCP connector. Register once — we email a
        connector URL and an auth header you paste into <em>Settings → Connectors</em>.
      </p>
      <div className="web-form">
        <div className="field">
          <label>Your name</label>
          <input value={fname} onChange={(e) => setFname(e.target.value)} placeholder="appears as sender" />
        </div>
        <div className="field">
          <label>Your email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@domain" />
        </div>
        <div className="field full">
          <span className="hint">Bound to your connector token. Verification link goes here. No password.</span>
        </div>
      </div>
      <div className="form-foot">
        <span className="flags">Free · No password · Magic link</span>
        <button type="button" className="btn-primary" onClick={submit} disabled={stage === "submitting"}>
          {stage === "submitting" ? "Registering…" : "Get my connector →"}
        </button>
      </div>
      {stage === "error" && <p className="web-note err">{message}</p>}
    </>
  );
}

// ── Emissary data ──────────────────────────────────────
type Emissary = {
  id: string;
  stamp: string;
  seal: string;
  tag: string;
  cat: string;
  name: string;
  italic: boolean;
  desc: string;
  meta: [string, string][];
  uuid?: string;
  Sigil: FC;
  draft: boolean;
};

const EMISSARY_BASE = "https://egregore.xyz/emissary/e/";

const EMISSARIES: Emissary[] = [
  {
    id: "bootstrap",
    stamp: "I · BOOTSTRAP",
    seal: "S-001",
    tag: "Live",
    cat: "Self-install",
    name: "First Stone",
    italic: false,
    desc: "The bootstrap emissary. Send it to anyone — it walks their AI through installing egregore-emissary. The cold-to-installed conversion, delivered as an emissary itself.",
    meta: [["Steps", "4"], ["Run", "~20 sec"], ["Best with", "First contact"]],
    uuid: "d9ba091e-2083-4546-8243-bae37f168bbc",
    Sigil: SigilBootstrap,
    draft: false,
  },
  {
    id: "spiral",
    stamp: "II · CLARITY",
    seal: "S-002",
    tag: "Live",
    cat: "Socratic",
    name: "Spiral",
    italic: false,
    desc: "Pressure-tests a half-formed thesis in three descending rings. Each pass tightens the question, until the receiver can say plainly what they want and how to get there.",
    meta: [["Rings", "3"], ["Run", "~15 min"], ["Best with", "Goals · Theses"]],
    uuid: "75bedab5-e4da-42c0-a955-cd360388442c",
    Sigil: SigilSpiral,
    draft: false,
  },
  {
    id: "cartographer",
    stamp: "III · RESEARCH",
    seal: "S-003",
    tag: "In workshop",
    cat: "Inquiry",
    name: "Cartographer",
    italic: true,
    desc: "Charts a domain on the receiver's behalf — sources, claims, contested edges. Returns an annotated map you can hand back as the next emissary.",
    meta: [["Passes", "2"], ["Run", "~7 min"], ["Best with", "Open questions"]],
    Sigil: SigilCartographer,
    draft: true,
  },
  {
    id: "forge",
    stamp: "IV · BUILD",
    seal: "S-004",
    tag: "In workshop",
    cat: "Construction",
    name: "Forge",
    italic: true,
    desc: "The emissary that builds emissaries. Run it and it teaches the model, shapes one real task of yours into a runnable handoff, and publishes it — you leave holding a link to send.",
    meta: [["Steps", "3"], ["Run", "~1 min"], ["Best with", "First emissary"]],
    Sigil: SigilForge,
    draft: true,
  },
];

function EmissaryCard({ em, uses }: { em: Emissary; uses?: number }) {
  const Sigil = em.Sigil;
  const link = em.uuid ? `${EMISSARY_BASE}${em.uuid}` : null;
  return (
    <article className={`em-card${em.draft ? " draft" : ""}`}>
      <div className="em-sigil">
        <span className="stamp">{em.stamp}</span>
        <Sigil />
        <span className="seal">{em.seal}</span>
      </div>
      <div className="em-body">
        <div className="em-tags">
          <span className="pill">{em.tag}</span>
          <span>{em.cat}</span>
          {typeof uses === "number" && (
            <span className="em-uses" title={`Carried ${uses} time${uses === 1 ? "" : "s"}`}>
              <IconRuns /> {uses}
            </span>
          )}
        </div>
        <h3 className="em-name" style={em.italic ? { fontStyle: "italic" } : undefined}>{em.name}</h3>
        <p className="em-desc">{em.desc}</p>
        <div className="em-meta">
          {em.meta.map(([k, v]) => (
            <span key={k}>{k} · <strong>{v}</strong></span>
          ))}
        </div>
        {link && em.uuid && (
          <div className="em-link-row">
            <div className="em-link">
              <span className="scheme">{EMISSARY_BASE}</span>
              <span className="id">{em.uuid.slice(0, 8)}…{em.uuid.slice(-4)}</span>
            </div>
            <CopyButton text={link} className="em-copy" label="Copy link" />
          </div>
        )}
        {em.draft && (
          <div className="draft-row">
            <span>Draft</span><span className="dash" /><span>Subscribe for release →</span>
          </div>
        )}
      </div>
    </article>
  );
}

// ── Page ───────────────────────────────────────────────
export default function EmissaryHub() {
  // Live "carried N times" counts, keyed by emissary uuid. Fetched best-
  // effort on mount; if the endpoint is unavailable the cards just render
  // without a count.
  const [uses, setUses] = useState<Record<string, number>>({});
  useEffect(() => {
    const ids = EMISSARIES.map((e) => e.uuid).filter((u): u is string => !!u);
    if (ids.length === 0) return;
    fetchUsage(ids)
      .then(setUses)
      .catch(() => {
        /* endpoint not yet deployed / unreachable — show no counts */
      });
  }, []);

  return (
    <div className="em-hub">
      <div className="rules"><div className="vert l" /><div className="vert r" /></div>

      <main className="em-main">
        {/* Hero */}
        <section className="em-hero">
          <h1 className="display">Send an <em>emissary</em>.</h1>
          <p className="lede">
            An emissary is a portable, runnable task — handed to{" "}
            <em className="em-word">someone else&apos;s</em> AI. Receiving works with no
            install: paste the link into any harness. Install once and every emissary
            runs at full fidelity.
          </p>
        </section>

        {/* Setup */}
        <section>
          <div className="sec-head">
            <span className="num">§ 01</span>
            <span className="label">Set up — to send</span>
            <span className="rule" />
            <span className="label">pick your channel</span>
          </div>
          <SetupModule />
          <div className="receive">
            <span className="ic"><IconInbox /></span>
            <p>
              <strong style={{ fontWeight: 500 }}>Receiving?</strong> Paste any{" "}
              <code>egregore.xyz/emissary/e/{`{id}`}</code> link into Claude Code, Codex,
              claude.ai, or ChatGPT.
            </p>
          </div>
        </section>

        {/* The Pouch */}
        <section>
          <div className="sec-head">
            <span className="num">§ 02</span>
            <span className="label">Featured Emissaries</span>
            <span className="rule" />
            <span className="label">{EMISSARIES.length} of {EMISSARIES.length}</span>
          </div>
          <div className="pouch-intro">
            <p>
              Each emissary carries a workflow. Copy their link, paste it into your harness,
              and with consent, your agent will run it. Use the First Stone emissary to get
              started.
            </p>
          </div>
          <div className="pouch">
            {EMISSARIES.map((em) => (
              <EmissaryCard key={em.id} em={em} uses={em.uuid ? uses[em.uuid] : undefined} />
            ))}
          </div>
        </section>

        <footer>
          <span>egregore.xyz</span>
          <span>
            <a href="https://egregore.xyz">Docs</a> &nbsp;{" "}
            <a href="https://github.com/Curve-Labs">Source</a> &nbsp;{" "}
            <a href="mailto:info@egregore.xyz">Mail us</a>
          </span>
          <span>MMXXVI</span>
        </footer>
      </main>
    </div>
  );
}
