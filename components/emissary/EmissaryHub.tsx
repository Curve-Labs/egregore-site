"use client";

// EmissaryHub — the /emissary page. Ported from the Claude Design handoff
// bundle ("Send an emissary"). The design's own header is dropped (the
// setup layout supplies the egregore logo) and --bg is kept as our cream;
// everything else is the design. The design-tool TweaksPanel is dropped.

import { useEffect, useState, type FC, type SVGProps } from "react";
import { getSession, type Session } from "./account-api";
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

// ── Install block ──────────────────────────────────────
// One command, every harness. No picker — the founder's smoke-test call: a web
// visitor should see HOW to install first, and it's a single line that
// auto-detects Claude Code and Codex.
function InstallBlock() {
  return (
    <div className="setup">
      <div className="install-block">
        <p className="install-copy">
          One command — for every harness. Run it once in your project&apos;s
          working directory. It registers your identity, installs the{" "}
          <code>egregore-emissary</code> skill and the <code>emissary</code>{" "}
          command, and wires the egregore MCP into your harness — no flags to pick.
        </p>
        <div className="term">
          <span className="cmd">
            <span className="prompt">$</span>npx <span className="accent">egregore-emissary@latest</span>&nbsp;install
          </span>
          <CopyButton text="npx egregore-emissary@latest install" />
        </div>
        <p className="web-note">Works with Claude Code and Codex — detected automatically.</p>
      </div>
    </div>
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
    id: "spiral",
    stamp: "I · CLARITY",
    seal: "S-001",
    tag: "Live",
    cat: "Socratic",
    name: "Spiral",
    italic: false,
    desc: "Pressure-tests a half-formed thesis in three descending rings. Each pass tightens the question, until the receiver can say plainly what they want and how to get there.",
    meta: [["Rings", "3"], ["Run", "~12 min"], ["Best with", "Goals · Theses"]],
    uuid: "75bedab5-e4da-42c0-a955-cd360388442c",
    Sigil: SigilSpiral,
    draft: false,
  },
  {
    id: "bootstrap",
    stamp: "II · BOOTSTRAP",
    seal: "S-002",
    tag: "Live",
    cat: "Self-install",
    name: "First Stone",
    italic: false,
    desc: "The bootstrap emissary. Send it to anyone — it walks their AI through installing egregore-emissary. The cold-to-installed conversion, delivered as an emissary itself.",
    meta: [["Steps", "4"], ["Run", "~3 min"], ["Best with", "First contact"]],
    uuid: "d9ba091e-2083-4546-8243-bae37f168bbc",
    Sigil: SigilBootstrap,
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
    meta: [["Passes", "2"], ["Run", "~25 min"], ["Best with", "Open questions"]],
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
    meta: [["Steps", "3"], ["Run", "~10 min"], ["Best with", "First emissary"]],
    Sigil: SigilForge,
    draft: true,
  },
];

function EmissaryCard({ em }: { em: Emissary }) {
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

// ── Auth chip (identity spine) ─────────────────────────
// Fail-soft: a signed-in session shows the account link, anything else
// (signed out / API down) falls back to the sign-in link. Never blocks render.
//
// Welcome beat: the API redirects a just-verified magic link to
// /emissary?welcome=1. When that flag is present AND a session resolves, the
// chip pulses in and a short "Signed in as … ✓" toast plays, then settles into
// the persistent chip. The param is stripped immediately (history.replaceState)
// so a refresh or shared URL never replays it. prefers-reduced-motion drops the
// motion to a plain fade. The param is read from window.location in an effect
// (not useSearchParams) so this stays outside any Suspense requirement and is
// static-export safe.
type Beat = "hidden" | "in" | "out";

function AuthChip() {
  const [session, setSession] = useState<Session | null>(null);
  const [welcome, setWelcome] = useState(false);
  const [beat, setBeat] = useState<Beat>("hidden");

  useEffect(() => {
    // Detect + strip the welcome flag (client-only).
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("welcome") === "1") {
        setWelcome(true);
        params.delete("welcome");
        const qs = params.toString();
        const url = window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash;
        window.history.replaceState(null, "", url);
      }
    } catch {
      /* no window / SSR — skip the beat */
    }

    let cancelled = false;
    getSession()
      .then((s) => {
        if (!cancelled) setSession(s);
      })
      .catch(() => {
        /* signed out or API unreachable — stay anonymous */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Play the beat once we have both the flag and a resolved session.
  useEffect(() => {
    if (!welcome || !session) return;
    setBeat("in");
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const dwell = reduce ? 3000 : 3400;
    const fade = reduce ? 200 : 460;
    const t1 = setTimeout(() => setBeat("out"), dwell);
    const t2 = setTimeout(() => setBeat("hidden"), dwell + fade);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [welcome, session]);

  if (session) {
    const who = session.handle ? "@" + session.handle : session.email;
    return (
      <>
        <a
          className={`em-authlink${beat !== "hidden" ? " em-authlink--pulse" : ""}`}
          href="/emissary/account"
        >
          Signed in as {who} <span className="arr">→</span> Account
        </a>
        {beat !== "hidden" && (
          <div
            className={`em-welcome-toast${beat === "out" ? " leaving" : ""}`}
            role="status"
            aria-live="polite"
          >
            Signed in as <span className="who">{who}</span> <span className="tick">✓</span>
          </div>
        )}
      </>
    );
  }
  return (
    <a className="em-authlink" href="/login?next=/emissary/account">
      Sign in
    </a>
  );
}

// ── The loop (identity spine): browse → ★ → pull ───────
function LoopSection() {
  return (
    <section>
      <div className="sec-head">
        <span className="num">§ 03</span>
        <span className="label">The loop — browse &amp; pull</span>
        <span className="rule" />
        <span className="label">directory</span>
      </div>
      <div className="loop">
        <div className="loop-step">
          <span className="loop-num">01</span>
          <h3>Browse the directory</h3>
          <p>
            See what people are publishing. Every emissary has a page and a
            canonical link you can open cold.
          </p>
          <a className="loop-link" href="/emissary/browse">Browse emissaries →</a>
        </div>
        <div className="loop-step">
          <span className="loop-num">02</span>
          <h3>★ what you trust</h3>
          <p>
            Sign in and star the ones worth keeping. A star pins the version you
            saw — it stays put until you say otherwise.
          </p>
          <a className="loop-link" href="/login?next=/emissary/account">Sign in to star →</a>
        </div>
        <div className="loop-step">
          <span className="loop-num">03</span>
          <h3>Pull them in your terminal</h3>
          <p>
            Run <code>emissary pull</code> — your agent offers each starred
            emissary to run or install.
          </p>
          <div className="loop-cmd"><span className="prompt">$</span>emissary pull</div>
        </div>
      </div>
    </section>
  );
}

// ── Page ───────────────────────────────────────────────
export default function EmissaryHub() {
  return (
    <div className="em-hub">
      <div className="rules"><div className="vert l" /><div className="vert r" /></div>

      <main className="em-main">
        {/* Auth chip — nav area */}
        <div className="em-authbar"><AuthChip /></div>

        {/* Hero */}
        <section className="em-hero">
          <div className="eyebrow">Emissary Courier <span className="dot">·</span> v0.2</div>
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
            <span className="label">one command</span>
          </div>
          <InstallBlock />
          <div className="receive">
            <span className="ic"><IconInbox /></span>
            <p>
              <strong style={{ fontWeight: 500 }}>Receiving?</strong> Paste any{" "}
              <code>egregore.xyz/emissary/e/{`{id}`}</code> link into Claude Code, Codex,
              claude.ai, or ChatGPT — the agent runs it. Install above and every emissary
              after runs clean: no summarization, no caveats.
            </p>
          </div>
        </section>

        {/* The Pouch */}
        <section>
          <div className="sec-head">
            <span className="num">§ 02</span>
            <span className="label">The Pouch — try one</span>
            <span className="rule" />
            <span className="label">{EMISSARIES.length} of {EMISSARIES.length}</span>
          </div>
          <div className="pouch-intro">
            <p>
              Each emissary carries a job. Copy a link, paste it into your harness, and the
              receiver runs it. Send one to yourself first to see how it reads.
            </p>
          </div>
          <div className="pouch">
            {EMISSARIES.map((em) => <EmissaryCard key={em.id} em={em} />)}
          </div>
        </section>

        {/* The loop — browse → ★ → pull */}
        <LoopSection />

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
