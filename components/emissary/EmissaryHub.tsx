"use client";

// EmissaryHub — the /emissary page. Ported from the Claude Design handoff
// bundle ("Send an emissary"). The design's own header is dropped (the
// setup layout supplies the egregore logo) and --bg is kept as our cream;
// everything else is the design. The design-tool TweaksPanel is dropped.

import { useState, useEffect, type FC, type SVGProps } from "react";
import { fetchUsage } from "./api";
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
type Channel = { id: string; name: string; kind: string; Glyph: FC; soon?: boolean };

const CHANNELS: Channel[] = [
  { id: "claude-code", name: "Claude Code", kind: "Agentic · Terminal", Glyph: G_Code },
  { id: "codex", name: "Codex", kind: "Agentic · Terminal", Glyph: G_Codex, soon: true },
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
              aria-disabled={c.soon || undefined}
              disabled={c.soon}
              className={`channel-tab${c.soon ? " soon-tab" : ""}`}
              onClick={c.soon ? undefined : () => setActive(c.id)}
            >
              <span className="dot" />
              {c.soon && <span className="soon">Soon</span>}
              <span className="name">{c.name}</span>
              <span className="kind">{c.kind}</span>
              <span className="glyph"><Glyph /></span>
            </button>
          );
        })}
      </div>
      <div className="channel-body">
        <TerminalPath name={ch.name} />
      </div>
    </div>
  );
}

function TerminalPath({ name }: { name: string }) {
  return (
    <>
      <p className="install-copy">
        Run this once in {name}&apos;s working directory. It registers the{" "}
        <code>egregore-emissary</code> skill and the <code>emissary</code> command —
        nothing else, no questions asked.
      </p>
      <div className="term">
        <span className="cmd">
          <span className="prompt">$</span>npx <span className="accent">egregore-emissary@latest</span>&nbsp;install
        </span>
        <CopyButton text="npx egregore-emissary@latest install" />
      </div>
      <p className="web-note">
        Zero prompts. Your identity is created at your first send — your agent asks your
        name and email in conversation. Verification is one email click. No password.
      </p>
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
            <em className="em-word">a collaborator&apos;s</em> agent. Receiving works with no
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
              <code>egregore.xyz/emissary/e/{`{id}`}</code> link into Claude Code or Codex.
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

        {/* Platform addresses (spec §2.3/§2.5) */}
        <section>
          <div className="sec-head">
            <span className="num">§ 03</span>
            <span className="label">Addresses &amp; the shelf</span>
            <span className="rule" />
            <span className="label">star on the web, enact in the terminal</span>
          </div>
          <div className="pouch-intro">
            <p>
              Published emissaries live at <em className="em-word">named addresses</em>.
              A publisher keeps a shelf; every address resolves in any harness.
            </p>
          </div>
          <div className="addr-list">
            <div className="addr-row">
              <span className="addr-chip">egregore.xyz/@{`{handle}`}</span>
              <p className="addr-desc">A publisher&apos;s shelf — every emissary they&apos;ve put their name to.</p>
            </div>
            <div className="addr-row">
              <span className="addr-chip">egregore.xyz/@{`{handle}`}/{`{slug}`}</span>
              <p className="addr-desc">A named emissary — always points at the latest version.</p>
            </div>
            <div className="addr-row">
              <span className="addr-chip">/emissary/e/{`{id}`}</span>
              <p className="addr-desc">A sealed copy — keeps meaning that exact version, forever.</p>
            </div>
          </div>
          <div className="pouch-intro">
            <p>
              Star an emissary and it becomes addressable from your own agent:{" "}
              <em>&ldquo;enact my deep-research emissary&rdquo;</em> resolves the star,
              fetches it, and runs it. Stars pin by default — to the version you
              evaluated — so a publisher updating an emissary never changes what your
              agent runs without asking you first.
            </p>
          </div>
          <a className="shelf-cta" href="/emissary/browse">
            Browse the shelf <span className="arr">→</span>
          </a>
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
