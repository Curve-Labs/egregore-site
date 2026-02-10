import { useState, useEffect, useRef } from "react";
import SetupFlow from "./components/SetupFlow";
import { getGitHubAuthUrl } from "./api";

// ─── Palette & Tokens ───────────────────────────────────────────
const C = {
  parchment: "#F4F1EA",
  ink: "#1a1714",
  crimson: "#7A0F1B",
  termBg: "#2a1215",
  muted: "#8a8578",
  warmGray: "#d4cfc5",
};

const font = {
  gothic: { fontFamily: "'UnifrakturMaguntia', cursive" },
  serif: { fontFamily: "'Cormorant Garamond', serif" },
  mono: { fontFamily: "'Space Mono', monospace" },
};

// ─── Simple Router ──────────────────────────────────────────────
function useRoute() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  return path;
}

// ─── Utility Components ─────────────────────────────────────────
const Divider = () => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", margin: "5rem 0", gap: "1rem" }}>
    <div style={{ height: 1, width: 80, background: C.warmGray }} />
    <div style={{ width: 6, height: 6, background: C.crimson, transform: "rotate(45deg)" }} />
    <div style={{ height: 1, width: 80, background: C.warmGray }} />
  </div>
);

const SectionLabel = ({ children }) => (
  <div style={{ ...font.mono, fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "3px", color: C.muted, marginBottom: "1rem", textAlign: "center" }}>
    {children}
  </div>
);

const SectionTitle = ({ children }) => (
  <h2 style={{ ...font.serif, fontSize: "2.4rem", fontWeight: 400, textAlign: "center", color: C.ink, marginBottom: "1rem", lineHeight: 1.2 }}>
    {children}
  </h2>
);

const Container = ({ children, style = {} }) => (
  <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 2rem", ...style }}>{children}</div>
);

// ─── Navigation ─────────────────────────────────────────────────
const Navigation = () => {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const linkStyle = {
    ...font.mono,
    color: C.ink,
    textDecoration: "none",
    fontSize: "0.7rem",
    letterSpacing: "1.5px",
    textTransform: "uppercase",
    padding: "0.4rem 0",
  };

  return (
    <nav style={{
      position: "fixed", top: 0, width: "100%", zIndex: 900,
      padding: "1.5rem 3rem",
      display: "flex", justifyContent: "space-between", alignItems: "center",
      background: scrolled ? "rgba(244,241,234,0.95)" : "transparent",
      backdropFilter: scrolled ? "blur(10px)" : "none",
      borderBottom: scrolled ? `1px solid ${C.warmGray}` : "1px solid transparent",
      transition: "all 0.3s ease",
    }}>
      <a href="/" style={{ ...font.gothic, fontSize: "1.8rem", color: C.crimson, textDecoration: "none" }}>
        Egregore
      </a>
      <div style={{ display: "flex", gap: "2.5rem", alignItems: "center" }}>
        <a href="#problem" style={linkStyle}>Manifesto</a>
        <a href="#commands" style={linkStyle}>Commands</a>
        <a href="#research" style={linkStyle}>Research</a>
        <a href="/blog" style={linkStyle}>Blog</a>
        <a href="/getting-started" style={linkStyle}>Docs</a>
        <a href={getGitHubAuthUrl()} style={{ ...linkStyle, border: `1px solid ${C.ink}`, padding: "0.4rem 1rem" }}>
          Join
        </a>
      </div>
    </nav>
  );
};

// ─── Summoning Hero ─────────────────────────────────────────────
const AsciiSpirit = () => {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 100);
    return () => clearInterval(id);
  }, []);

  const spiritMap = [
    "       \u00B7       ",
    "    \u00B7  \u2217  \u00B7    ",
    "  \u00B7   \u00B7\u2726\u00B7   \u00B7  ",
    " \u00B7  \u00B7 \u2217\u2726\u2217 \u00B7  \u00B7 ",
    "\u00B7  \u00B7\u2217 \u2726\u25C6\u2726 \u2217\u00B7  \u00B7",
    " \u00B7  \u00B7 \u2217\u2726\u2217 \u00B7  \u00B7 ",
    "  \u00B7   \u00B7\u2726\u00B7   \u00B7  ",
    "    \u00B7  \u2217  \u00B7    ",
    "       \u00B7       ",
  ];

  const getCharOpacity = (char, row, col) => {
    if (char === " ") return 0;
    if (char === "\u25C6") return 0.85 + Math.sin(tick * 0.07) * 0.15;
    if (char === "\u2726") return 0.45 + Math.sin(tick * 0.055 + row * 0.4) * 0.35;
    if (char === "\u2217") return 0.25 + Math.sin(tick * 0.045 + col * 0.5 + row * 0.3) * 0.2;
    const dist = Math.sqrt((row - 4) ** 2 + (col - 7) ** 2);
    return 0.06 + Math.sin(tick * 0.035 - dist * 0.4) * 0.1;
  };

  const getCharColor = (char) => {
    if (char === "\u25C6" || char === "\u2726") return C.crimson;
    if (char === "\u2217") return "#9a4a3a";
    return C.muted;
  };

  return (
    <div style={{ ...font.mono, fontSize: "0.8rem", lineHeight: 1.5, letterSpacing: "0.2em", whiteSpace: "pre", pointerEvents: "none" }}>
      {spiritMap.map((row, ri) => (
        <div key={ri}>
          {row.split("").map((char, ci) => (
            <span key={ci} style={{
              opacity: getCharOpacity(char, ri, ci),
              color: getCharColor(char),
              transition: "opacity 0.25s ease",
              width: "0.8em", display: "inline-block", textAlign: "center",
            }}>
              {char === " " ? "\u00A0" : char}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
};

const GitHubIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: 8, flexShrink: 0 }}>
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

const SummoningHero = () => {
  const [hovered, setHovered] = useState(false);

  return (
    <section id="top" style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      justifyContent: "center", position: "relative", overflow: "hidden",
      padding: "8rem 4rem 6rem",
    }}>
      <div style={{ position: "absolute", top: "12vh", right: "8vw", zIndex: 1, opacity: 0.7 }}>
        <AsciiSpirit />
      </div>

      <div style={{ position: "relative", zIndex: 2, maxWidth: 680 }}>
        <div style={{ ...font.mono, fontSize: "0.6rem", letterSpacing: "4px", textTransform: "uppercase", color: C.muted, marginBottom: "2.5rem" }}>
          egregore
        </div>

        <h1 style={{
          ...font.serif, fontSize: "clamp(2.8rem, 6vw, 4.8rem)",
          fontWeight: 400, lineHeight: 1.08, color: C.ink, marginBottom: "2rem",
        }}>
          Shared cognition for<br />
          teams and agents.
        </h1>

        <p style={{
          ...font.serif, fontSize: "1.25rem", fontWeight: 400,
          color: C.muted, maxWidth: 520, lineHeight: 1.65, marginBottom: "3rem",
        }}>
          A terminal-native platform where humans and AI agents share persistent context and work together as a single organizational mind.
        </p>

        <a
          href={getGitHubAuthUrl()}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            ...font.mono, fontSize: "0.75rem", letterSpacing: "1px",
            display: "inline-flex", alignItems: "center",
            background: hovered ? C.crimson : C.ink,
            color: C.parchment, border: "none",
            padding: "0.85rem 2rem", cursor: "pointer",
            transition: "background 0.2s ease",
            textDecoration: "none",
          }}
        >
          <GitHubIcon />
          Join with GitHub
        </a>

        <div style={{ ...font.mono, fontSize: "0.6rem", color: C.warmGray, marginTop: "1rem", letterSpacing: "1px" }}>
          Or: <code style={{ color: C.muted }}>npx create-egregore@latest</code>
        </div>
      </div>
    </section>
  );
};


// ─── Terminal Altar ─────────────────────────────────────────────
const TERM_BG = "#3a1a1d";
const TERM_BORDER = "rgba(200,160,140,0.15)";
const TERM_TEXT = "#e8e0d4";
const TERM_DIM = "rgba(232,224,212,0.45)";
const TERM_ACCENT = "#d4a574";

const terminalScreens = [
  {
    command: "/activity",
    lines: [
      { text: "EGREGORE \u2726 ACTIVITY                             mira \u00B7 Feb 07", s: "header" },
      { text: "", s: "blank" },
      { text: "YOUR RECENT SESSIONS", s: "section" },
      { text: "\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u252C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u252C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510", s: "dim" },
      { text: "\u2502 When       \u2502 Topic                        \u2502 Summary                       \u2502", s: "bold" },
      { text: "\u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524", s: "dim" },
      { text: "\u2502 yesterday  \u2502 API rate-limit strategy      \u2502 Decided on token bucket + 429 \u2502", s: "line" },
      { text: "\u2502 Feb 05     \u2502 Q1 roadmap triage            \u2502 Cut 3 features, re-scoped SDK \u2502", s: "line" },
      { text: "\u2502 Feb 04     \u2502 Onboarding flow rewrite      \u2502 Simplified to 2 steps + video \u2502", s: "line" },
      { text: "\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2534\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2534\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518", s: "dim" },
      { text: "", s: "blank" },
      { text: "TEAM ACTIVITY (last 7 days)", s: "section" },
      { text: "\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u252C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u252C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510", s: "dim" },
      { text: "\u2502 When       \u2502 Topic                            \u2502 By    \u2502", s: "bold" },
      { text: "\u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524", s: "dim" },
      { text: "\u2502 today      \u2502 Webhook retry logic              \u2502 tom\u00E1s \u2502", s: "line" },
      { text: "\u2502 yesterday  \u2502 Dashboard latency investigation  \u2502 priya \u2502", s: "line" },
      { text: "\u2502 Feb 05     \u2502 Auth migration to passkeys       \u2502 tom\u00E1s \u2502", s: "line" },
      { text: "\u2502 Feb 04     \u2502 Billing page redesign            \u2502 jun   \u2502", s: "line" },
      { text: "\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2534\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2534\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518", s: "dim" },
    ],
  },
  {
    command: "/handoff --to agent:researcher",
    lines: [
      { text: "EGREGORE \u2726 HANDOFF                              mira \u00B7 Feb 07", s: "header" },
      { text: "", s: "blank" },
      { text: "INITIATING HANDOFF", s: "section" },
      { text: "  from:   mira (human)", s: "line" },
      { text: "  to:     agent:researcher", s: "line" },
      { text: "  scope:  quest/sdk-v2-launch", s: "line" },
      { text: "", s: "blank" },
      { text: "CONTEXT SNAPSHOT", s: "section" },
      { text: "  Memory nodes: 631 (8 new since last handoff)", s: "line" },
      { text: "  Active quests: 3 in scope", s: "line" },
      { text: "  Pending decisions: 2", s: "line" },
      { text: "", s: "blank" },
      { text: "TRANSFER LOG", s: "section" },
      { text: "  \u2713 Context graph serialized          [187ms]", s: "line" },
      { text: "  \u2713 Quest state synchronized           [94ms]", s: "line" },
      { text: "  \u2713 Agent memory loaded                 [63ms]", s: "line" },
      { text: "  \u2713 Session permissions granted         [OK]", s: "line" },
      { text: "", s: "blank" },
      { text: "  handoff complete. agent:researcher has full context.", s: "accent" },
    ],
  },
  {
    command: "/reflect",
    lines: [
      { text: "EGREGORE \u2726 REFLECTION                           mira \u00B7 Feb 07", s: "header" },
      { text: "", s: "blank" },
      { text: "PATTERN ANALYSIS (last 14 days)", s: "section" },
      { text: "  \u25B8 68% of sessions touch quest/sdk-v2-launch", s: "line" },
      { text: "  \u25B8 Handoff frequency: 1.8x/day (up from 0.9x)", s: "line" },
      { text: "  \u25B8 Context reuse rate: 91% \u2014 memory is compounding", s: "line" },
      { text: "", s: "blank" },
      { text: "GAPS DETECTED", s: "section" },
      { text: "  \u26A0 No sessions on quest/enterprise-pilot in 6 days", s: "line" },
      { text: "  \u26A0 2 decisions pending review with no assignee", s: "line" },
      { text: "", s: "blank" },
      { text: "EMERGENT CONNECTIONS", s: "section" },
      { text: "  \u2726 SDK error format decision blocks enterprise pilot", s: "line" },
      { text: "    \u2014 resolving quest/sdk-v2-launch unblocks both", s: "line" },
      { text: "  \u2726 Onboarding rewrite generated 6 reusable patterns", s: "line" },
      { text: "", s: "blank" },
      { text: "  organizational coherence: 78% \u2014 trending up", s: "accent" },
    ],
  },
];

const LINE_DELAY = 30;
const CMD_TYPE_SPEED = 55;
const PAUSE_AFTER_CMD = 350;
const DWELL_TIME = 4500;

const TerminalAltar = () => {
  const [activeIdx, setActiveIdx] = useState(0);
  const [typedCmd, setTypedCmd] = useState("");
  const [visibleLines, setVisibleLines] = useState(0);
  const [phase, setPhase] = useState("typing");
  const scrollRef = useRef(null);
  const screen = terminalScreens[activeIdx];

  useEffect(() => {
    const cleanup = [];

    if (phase === "typing") {
      setTypedCmd("");
      setVisibleLines(0);
      const cmd = screen.command;
      let idx = 0;
      const id = setInterval(() => {
        idx++;
        setTypedCmd(cmd.slice(0, idx));
        if (idx >= cmd.length) {
          clearInterval(id);
          const t = setTimeout(() => setPhase("streaming"), PAUSE_AFTER_CMD);
          cleanup.push(() => clearTimeout(t));
        }
      }, CMD_TYPE_SPEED);
      cleanup.push(() => clearInterval(id));
    }

    if (phase === "streaming") {
      setVisibleLines(0);
      let lineIdx = 0;
      const id = setInterval(() => {
        lineIdx++;
        setVisibleLines(lineIdx);
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        if (lineIdx >= screen.lines.length) {
          clearInterval(id);
          const t = setTimeout(() => setPhase("dwelling"), 200);
          cleanup.push(() => clearTimeout(t));
        }
      }, LINE_DELAY);
      cleanup.push(() => clearInterval(id));
    }

    if (phase === "dwelling") {
      const t = setTimeout(() => {
        setActiveIdx((prev) => (prev + 1) % terminalScreens.length);
        setPhase("typing");
      }, DWELL_TIME);
      cleanup.push(() => clearTimeout(t));
    }

    return () => cleanup.forEach((fn) => fn());
  }, [phase, activeIdx]);

  const handleTabClick = (i) => {
    if (i === activeIdx) return;
    setActiveIdx(i);
    setPhase("typing");
  };

  const lineStyle = (s) => {
    switch (s) {
      case "header": return { fontWeight: 700, paddingBottom: "0.35rem", borderBottom: `1px solid ${TERM_BORDER}`, marginBottom: "0.4rem" };
      case "section": return { fontWeight: 700, color: TERM_TEXT };
      case "bold": return { fontWeight: 700, color: TERM_TEXT };
      case "accent": return { color: TERM_ACCENT, fontWeight: 700 };
      case "dim": return { color: TERM_DIM };
      case "blank": return { height: "0.55em" };
      default: return { color: TERM_TEXT };
    }
  };

  return (
    <section style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "2rem 2rem 6rem" }}>
      <div style={{
        width: "min(78vw, 940px)", position: "relative",
        border: `2px solid ${C.crimson}`, borderBottom: "none",
        borderRadius: "50% 50% 0 0 / 10% 10% 0 0",
        padding: "2.5rem 2.5rem 0",
        boxShadow: `0 0 0 8px ${C.parchment}, 0 0 0 10px rgba(122,15,27,0.15)`,
      }}>
        <div style={{ position: "absolute", top: -8, left: "50%", transform: "translateX(-50%)", background: C.parchment, padding: "0 12px" }}>
          <div style={{ width: 10, height: 10, background: C.crimson, transform: "rotate(45deg)" }} />
        </div>

        <div
          ref={scrollRef}
          style={{
            background: TERM_BG, ...font.mono, color: TERM_TEXT,
            fontSize: "0.66rem", padding: "1.1rem 1.4rem", lineHeight: 1.4,
            height: 520,
            borderTop: `1px solid rgba(122,15,27,0.4)`,
            borderLeft: `1px solid rgba(122,15,27,0.2)`,
            borderRight: `1px solid rgba(122,15,27,0.2)`,
            whiteSpace: "pre", overflowY: "auto", overflowX: "hidden",
          }}
        >
          <div style={{ marginBottom: "0.5rem" }}>
            <span style={{ color: TERM_DIM }}>{"\u276F "}</span>
            <span style={{ color: TERM_ACCENT }}>{typedCmd}</span>
            {phase === "typing" && <span style={{ animation: "blink 1s infinite" }}>{"\u2588"}</span>}
          </div>

          {phase !== "typing" && screen.lines.slice(0, visibleLines).map((ln, i) => (
            <div key={`${activeIdx}-${i}`} style={lineStyle(ln.s)}>
              {ln.s === "blank" ? "\u00A0" : ln.text}
            </div>
          ))}

          {phase === "streaming" && visibleLines < screen.lines.length && (
            <span style={{ color: TERM_DIM, animation: "blink 1s infinite" }}>{"\u2588"}</span>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.25rem", marginTop: "1.5rem" }}>
        {terminalScreens.map((sc, i) => (
          <button key={i} onClick={() => handleTabClick(i)} style={{
            ...font.mono, fontSize: "0.65rem", letterSpacing: "1px",
            padding: "0.45rem 1rem", cursor: "pointer",
            border: `1px solid ${activeIdx === i ? C.crimson : C.warmGray}`,
            background: activeIdx === i ? C.crimson : "transparent",
            color: activeIdx === i ? C.parchment : C.muted,
            transition: "all 0.2s", borderRadius: 0,
          }}>
            {sc.command.split(" ")[0]}
          </button>
        ))}
      </div>
    </section>
  );
};


// ─── Problem ────────────────────────────────────────────────────
const ProblemSection = () => {
  const problems = [
    { num: "I", title: "Context dies between sessions", body: "Every conversation starts from zero. What the organization learned yesterday is invisible today. Intelligence is ephemeral." },
    { num: "II", title: "Coordination is overhead, not intelligence", body: "Status updates, handoff meetings, shared docs \u2014 the machinery of alignment produces friction, not insight." },
    { num: "III", title: "Knowledge doesn't compound", body: "Decisions, patterns, and institutional memory are trapped in individual heads and scattered threads. Nothing accumulates." },
  ];

  return (
    <section id="problem" style={{ padding: "4rem 0 6rem" }}>
      <Container>
        <Divider />
        <SectionLabel>The problem</SectionLabel>
        <SectionTitle>Organizational intelligence is a contradiction in terms</SectionTitle>
        <p style={{ ...font.serif, fontSize: "1.15rem", textAlign: "center", color: C.muted, maxWidth: 600, margin: "0 auto 4rem", lineHeight: 1.7 }}>
          Current tools treat collaboration as messaging. Egregore treats it as shared cognition.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "3rem" }}>
          {problems.map((p) => (
            <div key={p.num} style={{ borderTop: `2px solid ${C.crimson}`, paddingTop: "1.5rem" }}>
              <div style={{ ...font.mono, fontSize: "0.65rem", color: C.crimson, letterSpacing: "2px", marginBottom: "0.75rem" }}>{p.num}</div>
              <h3 style={{ ...font.serif, fontSize: "1.3rem", fontWeight: 600, marginBottom: "0.75rem", lineHeight: 1.3 }}>{p.title}</h3>
              <p style={{ ...font.serif, fontSize: "1rem", color: "#5a5650", lineHeight: 1.7 }}>{p.body}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
};

// ─── How It Works ───────────────────────────────────────────────
const WorkflowSection = () => {
  const steps = [
    { cmd: "/setup", desc: "Connect an existing repo to seed the egregore with context, or start from scratch." },
    { cmd: "/invite", desc: "Bring humans and AI agents into the magic circle." },
    { cmd: "/handoff", desc: "Transfer full context between any participants \u2014 zero switching cost." },
    { cmd: "/activity", desc: "A glance at the organizational mind: decisions, outputs, sessions." },
    { cmd: "/reflect", desc: "The egregore reviews its own patterns, gaps, and emergent connections." },
  ];

  const gothicNums = ["1", "2", "3", "4", "5"];

  return (
    <section style={{ padding: "6rem 0", background: C.ink, color: C.parchment }}>
      <Container>
        <SectionLabel><span style={{ color: "rgba(244,241,234,0.4)" }}>How it works</span></SectionLabel>
        <h2 style={{ ...font.serif, fontSize: "2.4rem", fontWeight: 400, textAlign: "center", color: C.parchment, marginBottom: "1rem" }}>
          The session cycle
        </h2>
        <p style={{ ...font.serif, fontSize: "1.1rem", textAlign: "center", color: "rgba(244,241,234,0.5)", maxWidth: 550, margin: "0 auto 4rem" }}>
          Every interaction strengthens the shared context. The egregore remembers so individuals don't have to.
        </p>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem", position: "relative" }}>
          <div style={{ position: "absolute", top: 32, left: "8%", right: "8%", height: 1, background: "rgba(122,15,27,0.4)" }} />
          {steps.map((s, i) => (
            <div key={i} style={{ flex: 1, textAlign: "center", position: "relative", zIndex: 2 }}>
              <div style={{ ...font.gothic, fontSize: "3.2rem", lineHeight: 1, color: C.crimson, marginBottom: "0.75rem", opacity: 0.85 }}>
                {gothicNums[i]}
              </div>
              <div style={{ ...font.mono, fontSize: "0.78rem", color: C.parchment, fontWeight: 700, letterSpacing: "0.5px", marginBottom: "0.6rem" }}>
                {s.cmd}
              </div>
              <p style={{ ...font.serif, fontSize: "0.88rem", color: "rgba(244,241,234,0.45)", lineHeight: 1.55, padding: "0 0.35rem" }}>
                {s.desc}
              </p>
            </div>
          ))}
        </div>
        <div style={{ ...font.mono, fontSize: "0.65rem", textAlign: "center", color: C.crimson, marginTop: "3rem", letterSpacing: "3px" }}>
          \u21BB CONTINUOUS CYCLE
        </div>
      </Container>
    </section>
  );
};

// ─── Commands ───────────────────────────────────────────────────
const CommandsSection = () => {
  const commands = [
    { cmd: "/activity", desc: "Surface recent actions, decisions, and agent outputs across the session" },
    { cmd: "/reflect", desc: "Trigger a metacognitive pass \u2014 the egregore reviews its own patterns and gaps" },
    { cmd: "/save", desc: "Commit the current context state to persistent memory as a named checkpoint" },
    { cmd: "/handoff", desc: "Transfer active session to another agent or human with full context intact" },
    { cmd: "/quest", desc: "Define an objective that persists across sessions until explicitly resolved" },
  ];

  return (
    <section id="commands" style={{ padding: "6rem 0" }}>
      <Container>
        <Divider />
        <SectionLabel>Command reference</SectionLabel>
        <SectionTitle>The slash command system</SectionTitle>
        <p style={{ ...font.serif, fontSize: "1.1rem", textAlign: "center", color: C.muted, maxWidth: 550, margin: "0 auto 3rem" }}>
          Five primitive operations. Everything the egregore does composes from these.
        </p>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          {commands.map((c, i) => (
            <div key={i} style={{
              display: "grid", gridTemplateColumns: "160px 1fr", gap: "2rem",
              padding: "1.25rem 0",
              borderBottom: i < commands.length - 1 ? `1px solid ${C.warmGray}` : "none",
              alignItems: "baseline",
            }}>
              <code style={{ ...font.mono, fontSize: "0.85rem", color: C.crimson, fontWeight: 700 }}>{c.cmd}</code>
              <p style={{ ...font.serif, fontSize: "1rem", color: "#5a5650", lineHeight: 1.6 }}>{c.desc}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
};

// ─── Architecture ───────────────────────────────────────────────
const ArchitectureSection = () => {
  const [expanded, setExpanded] = useState(null);
  const layers = [
    { key: "memory", label: "Memory Layer", sub: "Persistent context graph", detail: "A knowledge graph that accumulates decisions, patterns, conversations, and relationships. Every session reads from and writes to this shared substrate." },
    { key: "runtime", label: "Agent Runtime", sub: "Orchestration engine", detail: "Manages agent lifecycle: activation, context loading, task execution, and graceful handoff. Agents operate asynchronously, each with access to the full memory layer." },
    { key: "interface", label: "Interface", sub: "Terminal + Telegram", detail: "Terminal-native CLI for power users and agents. Telegram integration for lightweight human coordination. Both interfaces share the same session state." },
    { key: "protocol", label: "Protocol", sub: "Handoffs, reflections, quests", detail: "The coordination primitives that govern how agents and humans interact. Handoffs preserve full context. Reflections trigger metacognitive review." },
  ];

  return (
    <section style={{ padding: "6rem 0", background: "#eae7e0" }}>
      <Container>
        <SectionLabel>Architecture</SectionLabel>
        <SectionTitle>Four layers, one memory</SectionTitle>
        <div style={{ maxWidth: 700, margin: "2rem auto 0" }}>
          {layers.map((l, i) => (
            <div key={l.key} style={{ borderBottom: `1px solid ${C.warmGray}` }}>
              <button
                onClick={() => setExpanded(expanded === l.key ? null : l.key)}
                style={{
                  width: "100%", background: "none", border: "none", cursor: "pointer",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "1.5rem 0", textAlign: "left", borderRadius: 0,
                }}
              >
                <div>
                  <span style={{ ...font.mono, fontSize: "0.65rem", color: C.crimson, marginRight: "1rem" }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span style={{ ...font.serif, fontSize: "1.2rem" }}>{l.label}</span>
                  <span style={{ ...font.mono, fontSize: "0.75rem", color: C.muted, marginLeft: "1rem" }}>{l.sub}</span>
                </div>
                <span style={{ ...font.mono, fontSize: "1.2rem", color: C.crimson, transition: "transform 0.2s", transform: expanded === l.key ? "rotate(45deg)" : "rotate(0)" }}>+</span>
              </button>
              {expanded === l.key && (
                <div style={{ paddingBottom: "1.5rem", paddingLeft: "2.5rem" }}>
                  <p style={{ ...font.serif, fontSize: "1rem", color: "#5a5650", lineHeight: 1.8, maxWidth: 560 }}>{l.detail}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
};

// ─── Use Cases ──────────────────────────────────────────────────
const UseCasesSection = () => {
  const [active, setActive] = useState(0);
  const cases = [
    {
      tab: "Research team",
      title: "A research collective bootstrapping shared knowledge",
      terminal: `> /activity --last 24h
  \u21B3 agent:scholar reviewed 12 papers on mechanism design
  \u21B3 agent:archivist extracted 34 key findings \u2192 memory
  \u21B3 human:mira added 3 synthesis notes

> /reflect
  \u21B3 pattern detected: convergence between Ostrom's
    commons governance and token-curated registries
  \u21B3 gap: no primary sources on quadratic funding`,
      body: "Three researchers and two agents working across timezones. The egregore maintains a living literature review that grows with every session. No one briefs anyone \u2014 the memory layer is the briefing.",
    },
    {
      tab: "Engineering team",
      title: "Async development with persistent handoffs",
      terminal: `> /handoff --to agent:reviewer --context pr-247
  \u21B3 context snapshot: 847 nodes (12 new)
  \u21B3 active quest: "refactor auth middleware"
  \u21B3 handoff complete. agent:reviewer has full state.

> agent:reviewer /activity
  \u21B3 reviewing PR #247 against quest objectives...
  \u21B3 3 comments posted, 1 blocking issue flagged`,
      body: "Engineers hand off to agents at end of day. Agents review, test, and document overnight. Morning standup is replaced by /activity.",
    },
    {
      tab: "Distributed org",
      title: "Continuity across timezones and turnover",
      terminal: `> /quest --status
  \u21B3 "Q1 strategy alignment" \u2014 73% resolved
    \u2514 4 decisions committed, 2 pending review
  \u21B3 "onboard new contributor" \u2014 active
    \u2514 agent:mentor compiled context briefing
    \u2514 12 key decisions surfaced from memory`,
      body: "When someone leaves, the knowledge stays. When someone joins, the egregore generates their briefing from the graph. The organization's memory is independent of any individual.",
    },
  ];

  const c = cases[active];

  return (
    <section style={{ padding: "6rem 0" }}>
      <Container>
        <Divider />
        <SectionLabel>Use cases</SectionLabel>
        <SectionTitle>How teams use the egregore</SectionTitle>
        <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginBottom: "3rem" }}>
          {cases.map((cs, i) => (
            <button key={i} onClick={() => setActive(i)} style={{
              ...font.mono, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "1px",
              padding: "0.5rem 1.2rem", cursor: "pointer", border: `1px solid ${C.crimson}`,
              background: active === i ? C.crimson : "transparent",
              color: active === i ? C.parchment : C.crimson,
              transition: "all 0.2s", borderRadius: 0,
            }}>
              {cs.tab}
            </button>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3rem", alignItems: "start" }}>
          <div style={{
            background: C.termBg, ...font.mono, fontSize: "0.75rem", color: C.parchment,
            padding: "1.5rem", lineHeight: 1.8, whiteSpace: "pre-wrap",
            border: `1px solid rgba(122,15,27,0.3)`,
          }}>
            {c.terminal}
          </div>
          <div>
            <h3 style={{ ...font.serif, fontSize: "1.4rem", fontWeight: 600, marginBottom: "1rem", lineHeight: 1.3 }}>{c.title}</h3>
            <p style={{ ...font.serif, fontSize: "1.05rem", color: "#5a5650", lineHeight: 1.8 }}>{c.body}</p>
          </div>
        </div>
      </Container>
    </section>
  );
};

// ─── Memory Viz ─────────────────────────────────────────────────
const MemoryViz = () => {
  const nodes = [
    { x: 50, y: 50, r: 4 }, { x: 25, y: 35, r: 3 }, { x: 75, y: 30, r: 3.5 },
    { x: 30, y: 70, r: 2.5 }, { x: 70, y: 65, r: 3 }, { x: 15, y: 55, r: 2 },
    { x: 85, y: 50, r: 2.5 }, { x: 45, y: 25, r: 2 }, { x: 60, y: 80, r: 2 },
  ];
  const edges = [[0,1],[0,2],[0,4],[1,5],[2,4],[3,0],[4,8],[6,0],[7,3],[1,7],[2,6],[5,7]];

  return (
    <section style={{ padding: "6rem 0", background: C.ink }}>
      <Container>
        <SectionLabel><span style={{ color: "rgba(244,241,234,0.4)" }}>Shared memory</span></SectionLabel>
        <h2 style={{ ...font.serif, fontSize: "2.4rem", fontWeight: 400, textAlign: "center", color: C.parchment, marginBottom: "1rem" }}>
          Nothing is lost. Everything compounds.
        </h2>
        <p style={{ ...font.serif, fontSize: "1.1rem", textAlign: "center", color: "rgba(244,241,234,0.5)", maxWidth: 500, margin: "0 auto 3rem" }}>
          The knowledge graph grows with every session. Decisions, patterns, conversations, entities \u2014 all connected, all persistent.
        </p>
        <div style={{ position: "relative", height: 400, border: `1px solid rgba(122,15,27,0.2)`, overflow: "hidden" }}>
          <svg viewBox="0 0 100 100" style={{ width: "100%", height: "100%" }}>
            {edges.map(([a, b], i) => (
              <line key={i} x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y}
                stroke="rgba(122,15,27,0.25)" strokeWidth="0.3" />
            ))}
            {nodes.map((n, i) => (
              <g key={i}>
                <circle cx={n.x} cy={n.y} r={n.r} fill="none" stroke={C.crimson} strokeWidth="0.4" />
                <circle cx={n.x} cy={n.y} r={0.8} fill={C.crimson} />
              </g>
            ))}
          </svg>
          <div style={{ position: "absolute", bottom: "1rem", left: "1.5rem", ...font.mono, fontSize: "0.65rem", color: "rgba(244,241,234,0.3)" }}>
            9 nodes \u00B7 12 edges \u00B7 persistent
          </div>
        </div>
      </Container>
    </section>
  );
};

// ─── Research ───────────────────────────────────────────────────
const ResearchSection = () => {
  const [filter, setFilter] = useState("All");
  const posts = [
    { domain: "Psyche", date: "Jan 2025", title: "Persistent Context as Cognitive Architecture", excerpt: "Current LLMs are episodic \u2014 they live and die within the context window. Moving beyond chat logs into structured, graph-based memory systems is the prerequisite for organizational intelligence." },
    { domain: "Polis", date: "Dec 2024", title: "Governing the Synthetic Commons", excerpt: "When agents generate the majority of an organization's intellectual output, who owns the drift? We explore governance layers for AI-generated assets." },
    { domain: "Psyche", date: "Nov 2024", title: "Metacognition in Multi-Agent Systems", excerpt: "The /reflect command implements a simple but powerful idea: agents that review their own patterns produce better outputs and surface gaps that humans would miss." },
  ];

  const filtered = filter === "All" ? posts : posts.filter((p) => p.domain === filter);

  return (
    <section id="research" style={{ padding: "6rem 0" }}>
      <Container>
        <Divider />
        <SectionLabel>Research</SectionLabel>
        <SectionTitle>Psyche & Polis</SectionTitle>
        <p style={{ ...font.serif, fontSize: "1.1rem", textAlign: "center", color: C.muted, maxWidth: 500, margin: "0 auto 2.5rem" }}>
          Two research domains. <em>Psyche</em>: cognitive systems, AI memory, agent architectures. <em>Polis</em>: coordination, governance, collective intelligence.
        </p>

        <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginBottom: "3rem" }}>
          {["All", "Psyche", "Polis"].map((f) => (
            <button key={f} onClick={() => setFilter(f)} style={{
              ...font.mono, fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "1px",
              padding: "0.4rem 1rem", cursor: "pointer", border: `1px solid ${C.crimson}`,
              background: filter === f ? C.crimson : "transparent",
              color: filter === f ? C.parchment : C.crimson,
              borderRadius: 0,
            }}>
              {f}
            </button>
          ))}
        </div>

        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          {filtered.map((p, i) => (
            <article key={i} style={{ borderLeft: `3px solid ${C.crimson}`, padding: "0 2rem", marginBottom: "3rem" }}>
              <div style={{ ...font.mono, fontSize: "0.65rem", color: C.muted, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "0.5rem", display: "flex", gap: "1rem" }}>
                <span style={{ color: C.crimson }}>{p.domain}</span>
                <span>{p.date}</span>
              </div>
              <h3 style={{ ...font.serif, fontSize: "1.5rem", fontWeight: 600, marginBottom: "0.75rem", lineHeight: 1.3 }}>
                <span style={{ ...font.gothic, fontSize: "2.8rem", float: "left", marginRight: "0.5rem", marginTop: "-0.15rem", color: C.crimson, lineHeight: 1 }}>
                  {p.title[0]}
                </span>
                {p.title.slice(1)}
              </h3>
              <p style={{ ...font.serif, fontSize: "1.05rem", color: "#5a5650", lineHeight: 1.7 }}>{p.excerpt}</p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
};

// ─── Footer ─────────────────────────────────────────────────────
const Footer = () => (
  <footer id="join" style={{ background: C.ink, color: C.parchment, padding: "5rem 0 3rem", textAlign: "center" }}>
    <Container>
      <div style={{ width: 8, height: 8, background: C.crimson, transform: "rotate(45deg)", margin: "0 auto 2rem" }} />
      <h2 style={{ ...font.serif, fontSize: "2rem", fontWeight: 400, marginBottom: "0.75rem" }}>
        The memory is persistent.
      </h2>
      <p style={{ ...font.mono, fontSize: "0.8rem", color: "rgba(244,241,234,0.5)", marginBottom: "2.5rem" }}>
        Start building shared intelligence today.
      </p>
      <div style={{ display: "flex", justifyContent: "center", gap: "1rem", marginBottom: "4rem" }}>
        <a
          href={getGitHubAuthUrl()}
          style={{
            ...font.mono, fontSize: "0.75rem", letterSpacing: "1px",
            display: "inline-flex", alignItems: "center",
            background: C.parchment, color: C.ink, border: "none",
            padding: "0.85rem 2rem", textDecoration: "none",
            transition: "background 0.2s ease",
          }}
        >
          <GitHubIcon />
          Get Started
        </a>
      </div>
      <p style={{ ...font.mono, fontSize: "0.7rem", color: "rgba(244,241,234,0.35)", marginBottom: "3rem" }}>
        Or: <code>npx create-egregore@latest</code>
      </p>
      <div style={{ ...font.mono, fontSize: "0.6rem", color: "rgba(244,241,234,0.25)", borderTop: "1px solid rgba(244,241,234,0.1)", paddingTop: "2rem", display: "flex", justifyContent: "space-between" }}>
        <span>Egregore</span>
        <span>MMXXVI</span>
        <span>Berlin / The Graph</span>
      </div>
    </Container>
  </footer>
);

// ─── App ────────────────────────────────────────────────────────
export default function App() {
  const path = useRoute();

  // Setup flow routes (check with and without trailing slash)
  const cleanPath = path.replace(/\/$/, "") || "/";
  if (cleanPath === "/callback" || cleanPath === "/setup" || cleanPath === "/join") {
    return <SetupFlow />;
  }

  // Landing page
  return (
    <div style={{ background: C.parchment, color: C.ink, ...font.serif, lineHeight: 1.6, overflowX: "hidden" }}>
      <Navigation />
      <SummoningHero />
      <TerminalAltar />
      <ProblemSection />
      <WorkflowSection />
      <CommandsSection />
      <ArchitectureSection />
      <UseCasesSection />
      <MemoryViz />
      <ResearchSection />
      <Footer />
    </div>
  );
}
