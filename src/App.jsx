import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { C, font } from "./tokens";
import { POSTS } from "./posts";
import wizardsWorking from "./wizards working.txt?raw";
import egregoricIntelligence from "./egregoric_intelligence.txt?raw";
import terminalFrame from "./terminal_frame.txt?raw";
import footerFlower from "./footer flower.txt?raw";
import footerStar from "./footer_star_last.txt?raw";
import oneSubstrate from "./one_subsrate.txt?raw";
import contextGardening from "./context_gardening.txt?raw";
import organizationalLearning from "./new_organizational_learning.txt?raw";
import astro from "./astro.txt?raw";

const terminalFrameSanitized = terminalFrame;

const wizardsWorkingSanitized = wizardsWorking.replace(/^\s*\n+/, "").replace(/\n+\s*$/, "");
const astroSanitized = astro.replace(/^\s*\n+/, "").replace(/\n+\s*$/, "");

// ─── Utility Components ─────────────────────────────────────────
const Divider = ({ style = {} }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", margin: "3rem 0", gap: "1rem", ...style }}>
    <div style={{ height: 1, width: 80, background: C.warmGray }} />
    <div style={{ width: 6, height: 6, background: C.crimson, transform: "rotate(45deg)" }} />
    <div style={{ height: 1, width: 80, background: C.warmGray }} />
  </div>
);

const Container = ({ children, maxWidth = 1100, paddingX = 32, style = {}, className }) => (
  <div className={className} style={{ width: "100%", maxWidth, margin: "0 auto", padding: `0 ${paddingX}px`, ...style }}>{children}</div>
);

// ─── Navigation ─────────────────────────────────────────────────
const Navigation = () => {
  const linkStyle = {
    ...font.ibmPlex, color: C.ink, textDecoration: "none",
    fontSize: "12px", letterSpacing: "0", textTransform: "uppercase",
    lineHeight: 1,
    fontWeight: 400,
  };

  return (
    <nav className="site-nav" style={{
      position: "fixed", top: 0, left: 0, width: "100%", zIndex: 900,
      height: 80, padding: "0 64px",
      display: "flex", justifyContent: "space-between", alignItems: "center",
      background: C.parchment,
      borderBottom: `1px solid ${C.warmGray}`,
    }}>
      <a href="#top" className="site-brand" style={{
        ...font.gothic, fontSize: "2rem", color: C.crimson,
        textDecoration: "none",
      }}>
        Egregore
      </a>
      <div className="site-nav-links" style={{ display: "flex", gap: "32px", alignItems: "center" }}>
        <Link to="/research" style={linkStyle}>/Research</Link>
        <a href="https://github.com/Curve-Labs/egregore-core" target="_blank" rel="noopener noreferrer" style={linkStyle}>/Docs</a>
        <a href="#join" className="site-nav-waitlist" style={{
          ...linkStyle, border: `1px solid ${C.ink}`,
          width: 112.8, height: 37.17, display: "flex",
          alignItems: "center", justifyContent: "center",
        }}>
          /Waitlist
        </a>
      </div>
    </nav>
  );
};

// ─── Section 1: Hero ────────────────────────────────────────────
const Hero = () => (
  <section id="top" className="hero-section" style={{
    minHeight: 1080, display: "flex", alignItems: "flex-start",
    position: "relative", overflow: "hidden",
    padding: "146px 0 60px",
  }}>
    <Container maxWidth={1654} paddingX={24} style={{ width: "100%" }}>
      <div className="hero-layout" style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 0,
        justifyContent: "space-between",
      }}>
        {/* Left side - Text content */}
        <div className="hero-copy" style={{
          width: "clamp(460px, 34vw, 598px)",
          marginTop: "clamp(120px, 12vw, 237px)",
          position: "relative",
          zIndex: 2,
        }}>
          <h1 className="hero-title" style={{
            ...font.slovic, fontSize: "90px",
            fontWeight: 400, lineHeight: 0.94, color: C.ink,
            marginBottom: "2rem", textTransform: "uppercase",
            letterSpacing: "0.01em",
            fontStyle: "oblique 10deg",
            fontSynthesis: "style",
          }}>
            summoning circle for<br />shared minds
          </h1>

          <p className="hero-subcopy" style={{
            ...font.courierPrime,
            fontSize: "20px",
            lineHeight: "28px",
            letterSpacing: 0,
            fontWeight: 400,
            color: "#8A8578",
            width: 612,
            maxWidth: "100%",
            marginBottom: "3rem",
          }}>
            A terminal-native platform where humans and AI agents <span style={{ color: C.gold }}>share</span> persistent context and work together as a single organizational mind.
          </p>

          <a href="#join" style={{
            ...font.mono, fontSize: "0.72rem", letterSpacing: "1.5px",
            display: "inline-block", textTransform: "uppercase",
            background: C.ink, color: C.parchment, border: "none",
            padding: "0.85rem 2.2rem", cursor: "pointer", textDecoration: "none",
            transition: "background 0.2s ease",
          }}>
            Join the Waitlist
          </a>

          <div style={{
            ...font.mono, fontSize: "0.58rem", color: C.warmGray,
            marginTop: "1rem", letterSpacing: "1.5px", textTransform: "uppercase",
          }}>
            Early access &middot; The circle is forming
          </div>
        </div>

        {/* Right side - Wizards Working ASCII art */}
        <div className="hero-ascii" style={{
          width: "clamp(720px, 62vw, 1056px)",
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "flex-start",
          position: "relative",
          zIndex: 1,
        }}>
          <pre
            style={{
              ...font.mono,
              fontSize: "clamp(0.17rem, 0.225vw, 0.29rem)",
              lineHeight: 1.05,
              color: C.muted,
              whiteSpace: "pre",
              margin: 0,
              overflow: "visible",
            }}
          >
            {wizardsWorkingSanitized}
          </pre>
        </div>
      </div>
    </Container>
  </section>
);

// ─── Section 2: Value Propositions ──────────────────────────────
const ValueProps = () => {
  const cards = [
    {
      title: "UNIFIED SUBSTRATE",
      body: "Production and coordination are not separate activities. They happen in the same environment \u2014 eliminating the boundary between tools for doing work and tools for talking about work.",
      ascii: oneSubstrate,
    },
    {
      title: "CONTEXT GARDENING",
      body: "The overhead of context engineering approaches zero. Context surfaces are pegged to the edges of the organization \u2014 and these edges multiply as the organization interacts.",
      ascii: contextGardening,
    },
    {
      title: "ORGANIZATIONAL LEARNING",
      body: "As the system accumulates, patterns surface from repeated activity and emergent context. Egregore evolves according to the tools, workflows, and coordination patterns of the host organization.",
      ascii: organizationalLearning,
    },
  ];

  return (
    <section className="value-props-section" style={{ padding: "24px 0 88px", position: "relative" }}>
      <Container maxWidth={1440} paddingX={48} style={{ position: "relative", zIndex: 1 }} className="value-props-container">
        <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "86px" }}>
          <div style={{ height: 1, flex: 1, background: C.warmGray }} />
          <div style={{ width: 8, height: 8, background: C.crimson, transform: "rotate(45deg)" }} />
          <div style={{ height: 1, flex: 1, background: C.warmGray }} />
        </div>
        <div className="value-props-grid" style={{ display: "grid", gridTemplateColumns: "379px 380px 379px", justifyContent: "space-between" }}>
          {cards.map((card, i) => (
            <div key={card.title} className="value-props-card" style={{ width: i === 1 ? 380 : 379, minHeight: "auto" }}>
              {/* ASCII art above the card */}
              <div style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: 165,
                marginBottom: "16px",
              }}>
                <pre style={{
                  ...font.mono,
                  fontSize: "0.06rem",
                  lineHeight: 1.05,
                  color: "#8A8578",
                  whiteSpace: "pre",
                  margin: 0,
                  textAlign: "center",
                }}>
                  {card.ascii}
                </pre>
              </div>

              <div style={{ borderTop: `2px solid ${C.gold}`, paddingTop: "1.5rem" }}>
                <h3 style={{
                  ...font.ibmPlex,
                  fontSize: "16px",
                  lineHeight: "22.5px",
                  letterSpacing: "2px",
                  fontWeight: 700,
                  color: "#C8A55A",
                  marginBottom: "1rem",
                  textAlign: "center",
                }}>
                  {card.title}
                </h3>
                <p className="value-props-copy" style={{
                  ...font.courierPrime,
                  fontSize: "16px",
                  lineHeight: "28px",
                  letterSpacing: 0,
                  fontWeight: 400,
                  color: "#8A8578",
                  width: i === 1 ? 380 : 379,
                  maxWidth: "100%",
                  textAlign: "center",
                  margin: "0 auto",
                }}>
                  {card.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
};

// ─── Section 3: Egregoric Intelligence ──────────────────────────
const EgregoricIntelligence = () => {
  return (
    <section className="egregoric-section" style={{ padding: "80px 0 103px", position: "relative" }}>
      <Container maxWidth={1440} paddingX={48} style={{ position: "relative", zIndex: 1 }}>
        <Divider style={{ margin: "0 0 74px" }} />
        <div className="egregoric-layout" style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "116px",
          justifyContent: "space-between",
        }}>
          {/* Left side - Text content */}
          <div className="egregoric-copy" style={{ width: 668 }}>
            <h2 className="egregoric-title" style={{
              ...font.gothic,
              fontSize: "48px",
              lineHeight: "57.6px",
              letterSpacing: 0,
              fontWeight: 400,
              color: C.crimson,
              width: 540,
              marginBottom: "1.5rem",
            }}>
              Egregoric Intelligence
            </h2>
            <p className="egregoric-body" style={{
              ...font.courierPrime,
              fontSize: "20px",
              lineHeight: "28px",
              letterSpacing: 0,
              color: C.muted,
              width: 668,
            }}>
              Production requires coordination. Coordination generates context. Context compounds into organizational learning &mdash; and feeds back into production. A shared substrate makes every coordination act context-rich &mdash; AI workflows operate with full organizational awareness.
            </p>
          </div>

          {/* Right side - Egregoric Intelligence ASCII art */}
          <div className="egregoric-ascii" style={{
            width: 585.43,
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "flex-start",
            position: "relative",
          }}>
            <pre
              style={{
                ...font.mono,
                fontSize: "clamp(0.09rem, 0.125vw, 0.15rem)",
                lineHeight: 1.05,
                color: C.muted,
                whiteSpace: "pre",
                margin: 0,
                overflow: "visible",
              }}
            >
              {egregoricIntelligence}
            </pre>
          </div>
        </div>
      </Container>
    </section>
  );
};

// ─── Section 3: See It Work — Slash Command Demo ────────────────
const COMMANDS = [
  {
    cmd: "/activity",
    label: "activity",
    lines: [
      { t: "", s: "blank" },
      { t: "EGREGORE \u25C6 ACTIVITY                    VESPER \u00B7 FEB 07", s: "header" },
      { t: "", s: "blank" },
      { t: "RECENT SESSIONS", s: "section" },
      { t: "  TODAY      Egregore.md architecture \u2014 soul.md survey", s: "line" },
      { t: "  YESTERDAY  Three-layer structure: declared,", s: "line" },
      { t: "             constitutional, emergent", s: "dim" },
      { t: "  FEB 05     Graph seed schema with Cael", s: "line" },
      { t: "  FEB 04     Reviewed Maren\u2019s ritual cadence proposal", s: "line" },
      { t: "  FEB 03     Membrane permeability model", s: "line" },
      { t: "", s: "blank" },
      { t: "TEAM (LAST 7 DAYS)", s: "section" },
      { t: "  TODAY      Amendment mechanics for egregore.md    WREN", s: "line" },
      { t: "  TODAY      Tonal grammar \u2014 egregore voice         RUNE", s: "line" },
      { t: "  YESTERDAY  Weekly synthesis ritual design         MAREN", s: "line" },
      { t: "  YESTERDAY  Ontology seeding \u2014 312 nodes          CAEL", s: "line" },
      { t: "  FEB 05     Epistemic posture under uncertainty    WREN", s: "line" },
      { t: "  FEB 04     Sigil as membrane \u2014 visual threshold   RUNE", s: "line" },
      { t: "  FEB 03     Edge properties for transformation    CAEL", s: "line" },
      { t: "", s: "blank" },
      { t: "ACTIVE QUESTS", s: "section" },
      { t: "  EGREGORE-SOUL     Draft and ratify egregore.md   5  9", s: "line" },
      { t: "  SEED-ONTOLOGY     Bootstrap graph from traces    2  4", s: "line" },
      { t: "  RITUAL-DESIGN     Collective cadences + triggers 1  3", s: "line" },
      { t: "", s: "blank" },
      { t: "  4 more quests \u2014 /quest to see all", s: "dim" },
    ],
  },
  {
    cmd: "/handoff",
    label: "handoff",
    lines: [
      { t: "", s: "blank" },
      { t: "EGREGORE \u25C6 HANDOFF                     VESPER \u2192 WREN", s: "header" },
      { t: "", s: "blank" },
      { t: "EGREGORE.MD ARCHITECTURE RESEARCH (3H 10M)", s: "section" },
      { t: "", s: "blank" },
      { t: "  Surveyed soul.md landscape \u2014 OpenClaw, Claude", s: "line" },
      { t: "  Diary, DAO constitutions, Arbitrum hash pattern.", s: "line" },
      { t: "  Mapped design space for org identity documents", s: "line" },
      { t: "  backed by knowledge graph.", s: "line" },
      { t: "", s: "blank" },
      { t: "FINDINGS", s: "section" },
      { t: "  \u2192 Three-layer structure: declared (human-authored),", s: "line" },
      { t: "    constitutional (governance), emergent (from graph)", s: "line" },
      { t: "  \u2192 Declared + constitutional in repo \u2014 changes are", s: "line" },
      { t: "    governance events. Emergent in memory.", s: "line" },
      { t: "  \u2192 Constitutional hash (SHA-256) for integrity", s: "line" },
      { t: "  \u2192 Preamble must stay under 50 lines", s: "line" },
      { t: "", s: "blank" },
      { t: "OPEN FOR WREN", s: "section" },
      { t: "  \u2192 Amendment mechanics: who modifies which layer?", s: "line" },
      { t: "  \u2192 Guardian function may not need a separate agent", s: "line" },
      { t: "    \u2014 session infrastructure is already the guardian", s: "line" },
      { t: "", s: "blank" },
      { t: "  \u2713 6 findings \u00B7 2 security decisions \u00B7 1 artifact", s: "accent" },
      { t: "  \u2713 Graph: Session \u2192 Research(soul-md-landscape)", s: "accent" },
      { t: "  \u2713 Wren notified \u2014 ready for implementation spec", s: "accent" },
    ],
  },
  {
    cmd: "/ask",
    label: "ask",
    lines: [
      { t: "", s: "blank" },
      { t: "EGREGORE \u25C6 ASK                         WREN \u2192 CAEL", s: "header" },
      { t: "", s: "blank" },
      { t: "  Wren is drafting the implementation spec and needs", s: "dim" },
      { t: "  graph-level constraints before committing.", s: "dim" },
      { t: "", s: "blank" },
      { t: "CONTEXT", s: "section" },
      { t: "  Vesper \u2192 Wren, Feb 07: Three-layer structure \u2014", s: "line" },
      { t: "    declared, constitutional, emergent.", s: "line" },
      { t: "  Cael, Feb 05: Ontology seeding \u2014 312 nodes,", s: "line" },
      { t: "    edges carry weight, authorship, and decay.", s: "line" },
      { t: "", s: "blank" },
      { t: "QUESTIONS", s: "section" },
      { t: "", s: "blank" },
      { t: "  1. Can the graph enforce the cascade model \u2014", s: "line" },
      { t: "     org ceiling individual configs can\u2019t exceed?", s: "line" },
      { t: "", s: "blank" },
      { t: "     \u25CB Yes, permission layers already scoped", s: "option" },
      { t: "     \u25CB Partially \u2014 needs validation on write", s: "option" },
      { t: "     \u25CB Not yet, requires schema changes", s: "option" },
      { t: "", s: "blank" },
      { t: "  2. Can you diff two graph states reliably?", s: "line" },
      { t: "", s: "blank" },
      { t: "     \u25CB Yes, snapshots are versioned", s: "option" },
      { t: "     \u25CB Nodes yes, edge weights not yet", s: "option" },
      { t: "     \u25CB Would need to build this", s: "option" },
      { t: "", s: "blank" },
      { t: "  3. How should emergent content get selected", s: "line" },
      { t: "     into the 50-line preamble budget?", s: "line" },
      { t: "", s: "blank" },
      { t: "     [ \u258C                                       ]", s: "input" },
    ],
  },
  {
    cmd: "/reflect",
    label: "reflect",
    lines: [
      { t: "", s: "blank" },
      { t: "EGREGORE \u25C6 REFLECT                           FEB 11", s: "header" },
      { t: "", s: "blank" },
      { t: "  Vesper\u2019s architecture research, Wren\u2019s implementation", s: "line" },
      { t: "  work, and Rune\u2019s sigil design are converging on a", s: "line" },
      { t: "  shared constraint across three workstreams:", s: "line" },
      { t: "", s: "blank" },
      { t: "  Vesper: Preamble must stay under 50 lines \u2014 the", s: "quote" },
      { t: "    egregore.md can\u2019t say everything. It selects.", s: "quote" },
      { t: "  Wren: Too many amendment rules and the system", s: "quote" },
      { t: "    becomes brittle. Must protect against", s: "quote" },
      { t: "    over-specification.", s: "quote" },
      { t: "  Rune: The sigil carries ambiguity by design \u2014", s: "quote" },
      { t: "    if it resolves fully, it stops working.", s: "quote" },
      { t: "", s: "blank" },
      { t: "  Same constraint, three directions: the egregore.md", s: "line" },
      { t: "  must be compressed enough to remain functional and", s: "line" },
      { t: "  open enough to remain alive. Selection pressure and", s: "line" },
      { t: "  interpretive room are the same design requirement.", s: "line" },
      { t: "", s: "blank" },
      { t: "  Implication for Quest(egregore-soul): the three-", s: "accent" },
      { t: "  layer architecture needs a compression principle", s: "accent" },
      { t: "  governing what the declared layer includes.", s: "accent" },
      { t: "  Currently unspecified in Wren\u2019s draft.", s: "accent" },
      { t: "", s: "blank" },
      { t: "  Vesper, Feb 07 \u00B7 Wren, Feb 09 \u00B7 Rune, Feb 04", s: "dim" },
      { t: "  9 sessions \u00B7 3 people \u00B7 2 quests", s: "dim" },
    ],
  },
];

const TERM_STYLE_MAP = {
  header: { color: "#c8a55a", fontWeight: 700, letterSpacing: "0.03em" },
  section: { color: "#c8a55a", fontWeight: 600, letterSpacing: "0.05em", fontSize: "0.78rem" },
  line: { color: "#d4d0c8" },
  dim: { color: "#6b6860" },
  accent: { color: "#8b9e7a" },
  quote: { color: "#a89e8c", fontStyle: "italic" },
  option: { color: "#8a8070" },
  input: { color: "#555049" },
  blank: { color: "transparent", userSelect: "none" },
};

const SeeItWork = () => {
  const [active, setActive] = useState(0);
  const scrollRef = useRef(null);
  const cmd = COMMANDS[active];

  const selectCommand = useCallback((i) => {
    setActive(i);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, []);

  return (
    <section className="mobile-section terminal-section" style={{
      height: 1000,
      padding: 0,
      background: C.ink,
      position: "relative",
      overflow: "hidden",
      display: "flex",
      alignItems: "center",
    }}>
      <div className="terminal-ascii-wrapper" style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
        opacity: 0.5,
        width: 1440,
        height: 890,
        overflow: "hidden",
      }}>
          <pre style={{
            ...font.mono,
            fontSize: "5.83px",
            lineHeight: 1.05,
            color: "#ffffff",
            whiteSpace: "pre",
            margin: 0,
            textAlign: "center",
          }}>
            {terminalFrameSanitized}
          </pre>
      </div>

      <div className="machinations-title" style={{
          position: "absolute",
          top: "9rem",
          left: 0,
          right: 0,
          textAlign: "center",
          zIndex: 2,
          ...font.slovic,
          fontSize: "36px",
          letterSpacing: 0,
          color: C.parchment,
        }}>
        MACHINATIONS
      </div>

      <div className="mobile-container terminal-inner" style={{
        maxWidth: 1500,
        margin: "0 auto",
        padding: "0 3rem",
        position: "relative",
        zIndex: 1,
        width: "100%",
      }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <div style={{
            background: C.termBg,
            borderRadius: "10px",
            border: "1px solid #252320",
            overflow: "hidden",
            boxShadow: "0 2px 80px rgba(200, 165, 90, 0.03), 0 16px 48px rgba(0, 0, 0, 0.55)",
            fontFamily: "'Berkeley Mono', 'JetBrains Mono', 'Fira Code', monospace",
          }}>
            <div style={{ display: "flex", alignItems: "center", padding: "9px 13px 0", gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#2a2723" }} />
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#2a2723" }} />
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#2a2723" }} />
              <span style={{ marginLeft: "auto", color: "#332f2a", fontSize: "0.58rem", letterSpacing: "0.12em" }}>
                EGREGORE v0.1
              </span>
            </div>

            <div style={{ display: "flex", padding: "8px 13px 0", borderBottom: "1px solid #1a1916" }}>
              {COMMANDS.map((c, i) => (
                <button key={c.cmd} onClick={() => selectCommand(i)} style={{
                  background: "none", border: "none",
                  borderBottom: active === i ? "1px solid #c8a55a" : "1px solid transparent",
                  color: active === i ? "#c8a55a" : "#44413c",
                  fontFamily: "'Berkeley Mono', 'JetBrains Mono', monospace",
                  fontSize: "0.72rem", letterSpacing: "0.06em",
                  padding: "4px 9px 6px", cursor: "pointer",
                  transition: "color 0.2s, border-color 0.2s",
                  fontWeight: active === i ? 600 : 400,
                }}>
                  /{c.label}
                </button>
              ))}
            </div>

            <div ref={scrollRef} className="terminal-scroll" style={{
              padding: "10px 14px 6px", height: 390,
              overflow: "hidden auto",
              scrollbarWidth: "thin", scrollbarColor: "#2a2824 transparent",
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 7, height: "1.3em", marginBottom: 1 }}>
                  <span style={{ color: "#c8a55a", fontSize: "0.82rem" }}>{"\u276F"}</span>
                  <span style={{
                    color: "#d4d0c8", fontSize: "0.78rem",
                    fontFamily: "'Berkeley Mono', 'JetBrains Mono', 'Fira Code', monospace",
                  }}>
                    {cmd.cmd}
                  </span>
                </div>

                {cmd.lines.map((line, i) => (
                  <div key={`${active}-${i}`} style={{
                    ...TERM_STYLE_MAP[line.s],
                    height: line.s === "blank" ? "0.45em" : "auto",
                    lineHeight: "1.15em",
                    whiteSpace: "pre",
                    fontFamily: "'Berkeley Mono', 'JetBrains Mono', 'Fira Code', monospace",
                    fontSize: "0.78rem",
                    transition: "opacity 0.2s",
                    opacity: 1,
                  }}>
                    {line.t}
                  </div>
                ))}
              </div>
            </div>

            <div style={{
              borderTop: "1px solid #1a1916", padding: "6px 14px",
              display: "flex", alignItems: "center",
            }}>
              <span style={{
                color: "#2e2b26", fontSize: "0.58rem", letterSpacing: "0.1em",
                fontFamily: "'Berkeley Mono', 'JetBrains Mono', monospace",
              }}>
                dev/main &middot; memory synced &middot; {"\u25C6"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// ─── Section 4: The Session Cycle ───────────────────────────────
const SessionCycle = () => {
  const commands = [
    { cmd: "/session", desc: "Connect an existing repo to seed the egregore with context, or start from scratch." },
    { cmd: "/invite", desc: "Bring humans and AI agents into the magic circle." },
    { cmd: "/handoff", desc: "Transfer full context between any participants \u2014 zero switching cost." },
    { cmd: "/activity", desc: "A glance at the organizational mind: decisions, outputs, sessions." },
    { cmd: "/reflect", desc: "The egregore reviews its own patterns, gaps, and emergent connections." },
  ];

  const cycleSteps = [
    { label: "ORIENT", sub: "/activity", angle: -90 },
    { label: "WORK", sub: "/egregore", angle: -18 },
    { label: "PERSIST", sub: "/save", angle: 54 },
    { label: "HANDOFF", sub: "/handoff", angle: 126 },
    { label: "REFLECT", sub: "/reflect", angle: 198 },
  ];

  const [hovered, setHovered] = useState(null);

  // Compute node positions
  const diagramWidth = 472;
  const diagramHeight = 412.58;
  const r = 158, cx = 236, cy = 206;
  const nodes = cycleSteps.map((step) => ({
    ...step,
    x: cx + r * Math.cos((step.angle * Math.PI) / 180),
    y: cy + r * Math.sin((step.angle * Math.PI) / 180),
  }));

  // Outer edges (pentagon) and inner edges (star)
  const outerEdges = nodes.map((_, i) => [i, (i + 1) % 5]);
  const starEdges = nodes.map((_, i) => [i, (i + 2) % 5]);

  return (
    <section className="session-cycle-section" style={{ padding: "48px 0 56px", position: "relative" }}>
      <Container maxWidth={1306} paddingX={0} style={{ position: "relative", zIndex: 1 }}>
        <Divider style={{ margin: "0 0 26px" }} />
        <h2 style={{
          ...font.slovic, fontSize: "36px", fontWeight: 400,
          textAlign: "center", color: C.ink, marginBottom: "10px", lineHeight: 1.05, textTransform: "uppercase",
        }}>
          The Session Cycle
        </h2>
        <p className="session-cycle-intro" style={{
          ...font.courierPrime,
          fontSize: "20px",
          lineHeight: "28px",
          letterSpacing: 0,
          fontWeight: 400,
          textAlign: "center",
          color: "#8A8578",
          width: 648,
          minHeight: 64,
          margin: "0 auto 74px",
        }}>
          Every interaction strengthens the shared context. The egregore remembers so individuals don't have to.
        </p>

        <div className="session-cycle-layout" style={{ display: "grid", gridTemplateColumns: "660px 472px", justifyContent: "space-between", alignItems: "start" }}>
          <div>
            {commands.map((c, i) => (
              <div key={i} className="session-command-row" style={{
                display: "grid", gridTemplateColumns: "110px 1fr", gap: "16px",
                minHeight: 54,
                padding: "14px 0 10px",
                borderBottom: i < commands.length - 1 ? `1px solid ${C.warmGray}` : "none",
                alignItems: "start",
              }}>
                <code style={{
                  ...font.ibmPlex,
                  fontSize: "14px",
                  lineHeight: "20px",
                  letterSpacing: 0,
                  color: C.crimson,
                  fontWeight: 700,
                }}>
                  {c.cmd}
                </code>
                <p className="session-command-desc" style={{
                  ...font.courierPrime,
                  fontSize: "14px",
                  lineHeight: "20px",
                  letterSpacing: 0,
                  fontWeight: 400,
                  color: "#8A8578",
                  width: 441,
                  minHeight: 50,
                }}>
                  {c.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="session-cycle-diagram-col" style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
            <div className="session-cycle-diagram" style={{ position: "relative", width: diagramWidth, height: diagramHeight }}>
              {/* Center label */}
              <div style={{
                position: "absolute", top: "50%", left: "50%",
                transform: "translate(-50%, -50%)", textAlign: "center",
                transition: "opacity 0.3s",
                opacity: hovered !== null ? 0.3 : 1,
              }}>
                <div style={{
                  ...font.mono, fontSize: "0.63rem", letterSpacing: "2px",
                  color: C.muted, textTransform: "uppercase", lineHeight: 1.6,
                }}>
                  Knowledge<br />Graph +<br />Git Memory
                </div>
              </div>

              <svg viewBox={`0 0 ${diagramWidth} ${diagramHeight}`} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}>
                <defs>
                  <marker id="arrow" viewBox="0 0 10 8" refX="8" refY="4"
                    markerWidth="6" markerHeight="5" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 4 L 0 8 z" fill="rgba(200,165,90,0.4)" />
                  </marker>
                  <marker id="arrowHover" viewBox="0 0 10 8" refX="8" refY="4"
                    markerWidth="6" markerHeight="5" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 4 L 0 8 z" fill="rgba(200,165,90,0.8)" />
                  </marker>
                </defs>
                {/* Outer pentagon edges */}
                {outerEdges.map(([a, b], i) => {
                  const highlighted = hovered !== null && (hovered === a || hovered === b);
                  return (
                    <line key={`o${i}`}
                      x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y}
                      stroke={highlighted ? "rgba(122,15,27,0.6)" : "rgba(122,15,27,0.2)"}
                      strokeWidth={highlighted ? 1.8 : 1}
                      style={{ transition: "stroke 0.3s, stroke-width 0.3s" }}
                    />
                  );
                })}
                {/* Inner star edges — bolder with arrowheads */}
                {starEdges.map(([a, b], i) => {
                  const highlighted = hovered !== null && (hovered === a || hovered === b);
                  return (
                    <line key={`s${i}`}
                      x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y}
                      stroke={highlighted ? "rgba(200,165,90,0.7)" : "rgba(200,165,90,0.22)"}
                      strokeWidth={highlighted ? 1.8 : 1.2}
                      markerEnd={highlighted ? "url(#arrowHover)" : "url(#arrow)"}
                      style={{ transition: "stroke 0.3s, stroke-width 0.3s" }}
                    />
                  );
                })}
                {/* Node dots */}
                {nodes.map((n, i) => {
                  const isHovered = hovered === i;
                  return (
                    <g key={i}>
                      {isHovered && (
                        <circle cx={n.x} cy={n.y} r={12}
                          fill="none" stroke="rgba(122,15,27,0.15)" strokeWidth="1"
                          style={{ transition: "opacity 0.3s" }}
                        />
                      )}
                      <circle cx={n.x} cy={n.y} r={isHovered ? 6 : 4}
                        fill={C.crimson}
                        style={{ transition: "r 0.2s", cursor: "pointer" }}
                      />
                    </g>
                  );
                })}
              </svg>

              {/* Labels with hover zones */}
              {nodes.map((node, i) => {
                const labelR = 196;
                const lx = cx + labelR * Math.cos((node.angle * Math.PI) / 180);
                const ly = cy + labelR * Math.sin((node.angle * Math.PI) / 180);
                const isHovered = hovered === i;
                return (
                  <div key={i}
                    onMouseEnter={() => setHovered(i)}
                    onMouseLeave={() => setHovered(null)}
                    style={{
                      position: "absolute", left: lx, top: ly,
                      transform: "translate(-50%, -50%)", textAlign: "center",
                      cursor: "pointer", padding: "6px 10px",
                      transition: "transform 0.2s",
                    }}
                  >
                    <div style={{
                      ...font.mono, fontSize: "0.7rem", fontWeight: 700,
                      color: isHovered ? C.crimson : C.ink,
                      letterSpacing: "1.5px",
                      transition: "color 0.2s",
                    }}>
                      {node.label}
                    </div>
                    <div style={{
                      ...font.mono, fontSize: "0.58rem",
                      color: isHovered ? C.gold : C.crimson,
                      transition: "color 0.2s",
                    }}>
                      {node.sub}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
};

// ─── Wizards Banner Section ─────────────────────────────────────
const WizardsBanner = () => {
  return (
    <section className="wizards-banner-section" style={{ minHeight: 641, padding: "12px 0 20px", background: C.parchment, position: "relative", overflow: "hidden" }}>
      <div style={{ width: "min(1920px, 100%)", margin: "0 auto", position: "relative", zIndex: 1 }}>
        <div style={{ minHeight: 552, display: "flex", justifyContent: "center", alignItems: "flex-start" }}>
          <pre className="wizards-artwork" style={{
            ...font.mono,
            fontSize: "5.8px",
            lineHeight: 1.05,
            color: "#8A8578",
            whiteSpace: "pre",
            margin: 0,
            textAlign: "center",
          }}>
            {astroSanitized}
          </pre>
        </div>
      </div>
    </section>
  );
};

// ─── Section 5: Research ─────────────────────────────────────
const Research = () => {
  const featured = POSTS.filter((p) => p.featured);
  return (
    <section id="research" className="research-section" style={{ padding: "0 0 72px", minHeight: 744.47 }}>
      <Container maxWidth={1500} paddingX={48}>
        <Divider style={{ margin: "0 0 26px" }} />
        <h2 style={{
          ...font.slovic, fontSize: "36px", fontWeight: 400,
          textAlign: "center", color: C.ink, marginBottom: "12px", lineHeight: 1.05, textTransform: "uppercase",
        }}>
          Research
        </h2>
        <p className="research-intro" style={{
          ...font.courierPrime, fontSize: "20px", textAlign: "center",
          color: C.muted, maxWidth: 738, margin: "0 auto 45px", lineHeight: "28px",
        }}>
          Dispatches on shared cognition, coordination infrastructure, and what emerges when organizations develop memory.
        </p>

        <div className="research-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 436px)", justifyContent: "space-between", gap: "48px" }}>
          {featured.map((post) => (
            <Link key={post.slug} to={`/research/${post.slug}`} className="research-card" style={{
              textDecoration: "none", color: "inherit",
              border: `1px solid ${C.warmGray}`, padding: "36px 33px",
              display: "flex", flexDirection: "column",
              minHeight: 371.63,
              transition: "border-color 0.2s, transform 0.2s",
            }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.gold; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.warmGray; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              <div style={{
                ...font.mono, fontSize: "0.68rem", letterSpacing: "1.6px",
                textTransform: "uppercase", color: C.gold, marginBottom: "18px",
              }}>
                {post.tag}
              </div>
              <h3 style={{
                ...font.courierPrime,
                fontSize: "21.6px",
                lineHeight: "28.1px",
                letterSpacing: 0,
                fontWeight: 400,
                color: C.ink,
                marginBottom: "18px",
                display: "inline-block",
              }}>
                {post.title}
              </h3>
              <p className="research-card-excerpt" style={{
                ...font.courierPrime,
                fontSize: "16px",
                lineHeight: "28px",
                letterSpacing: 0,
                color: "#8A8578",
                width: 369.18,
                maxWidth: "100%",
                flex: 1,
              }}>
                {post.excerpt}
              </p>
              <div style={{
                ...font.mono, fontSize: "0.66rem", color: C.warmGray,
                letterSpacing: "1px", marginTop: "28px",
              }}>
                {post.date}
              </div>
            </Link>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: "40px" }}>
          <Link to="/research" style={{
            ...font.mono, fontSize: "0.7rem", letterSpacing: "1.6px",
            textTransform: "uppercase", color: C.crimson,
            textDecoration: "none", borderBottom: `1px solid ${C.crimson}`,
            paddingBottom: "2px",
          }}>
            View all research
          </Link>
        </div>
      </Container>
    </section>
  );
};

// ─── Section 6: CTA ─────────────────────────────────────────────
const API_URL = import.meta.env.VITE_API_URL || "https://egregore-production-55f2.up.railway.app";

const WaitlistCTA = () => {
  const [form, setForm] = useState({ name: "", email: "", source: "" });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const footerMono = {
    ...font.ibmPlex,
    fontSize: "14px",
    lineHeight: "20px",
    letterSpacing: 0,
    fontWeight: 400,
  };

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.source) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/admin/waitlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to submit");
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = {
    ...footerMono,
    background: "transparent", border: "none",
    borderBottom: "1px solid rgba(244,241,234,0.2)",
    color: C.parchment, padding: "0.6rem 0", width: "100%",
    outline: "none",
  };

  const labelStyle = {
    ...footerMono,
    textTransform: "uppercase", color: "rgba(244,241,234,0.3)",
    marginBottom: "0.3rem", display: "block",
  };

  return (
    <footer id="join" className="waitlist-section" style={{ background: C.ink, color: C.parchment, minHeight: 1000, padding: "132px 0 132px", position: "relative", overflow: "hidden" }}>
      <div className="waitlist-layout" style={{ width: "min(1700px, calc(100% - 96px))", margin: "0 auto", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24 }}>
        {/* Left ASCII decoration */}
        <div className="waitlist-side-art waitlist-left-art" style={{ flex: "0 0 497px", display: "flex", justifyContent: "flex-start" }}>
          <pre style={{
            ...font.ibmPlex,
            fontSize: "0.128rem",
            lineHeight: 1.05,
            color: "#7b756d",
            whiteSpace: "pre",
            margin: 0,
          }}>
            {footerFlower}
          </pre>
        </div>

        {/* Center form content */}
        <div className="waitlist-center" style={{ width: 550, position: "relative", zIndex: 1 }}>
        {!submitted ? (
          <>
            <div style={{ textAlign: "center", marginBottom: "48px" }}>
              <div style={{ width: 16.97, height: 16.97, background: C.gold, transform: "rotate(45deg)", margin: "0 auto 28px" }} />
              <h2 className="waitlist-title" style={{ ...font.slovic, fontSize: "36px", letterSpacing: 0, color: C.parchment, fontWeight: 400, marginBottom: "14px", lineHeight: 1.05 }}>
                THE CIRCLE IS FORMING.
              </h2>
              <p style={{ ...footerMono, color: "rgba(244,241,234,0.45)", maxWidth: 415, margin: "0 auto" }}>
                Egregore is in early access. Speak your name and intent.
              </p>
            </div>

            <div className="waitlist-form" style={{ width: 454, margin: "0 auto" }}>
              <div style={{ marginBottom: "28px" }}>
                <label style={labelStyle}>Name</label>
                <input type="text" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  style={inputStyle} />
              </div>
              <div style={{ marginBottom: "28px" }}>
                <label style={labelStyle}>Email</label>
                <input type="email" value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  style={inputStyle} />
              </div>
              <div style={{ marginBottom: "40px" }}>
                <label style={labelStyle}>Intent</label>
                <textarea value={form.source}
                  onChange={(e) => setForm({ ...form, source: e.target.value })}
                  rows={2}
                  style={{ ...inputStyle, resize: "none", fontFamily: font.ibmPlex.fontFamily }}
                  placeholder="What do you want to use Egregore for?" />
              </div>
              {error && (
                <div style={{ ...footerMono, color: C.crimson, marginBottom: "1rem", textAlign: "center" }}>
                  {error}
                </div>
              )}
              <button onClick={handleSubmit} disabled={submitting} style={{
                ...footerMono,
                textTransform: "uppercase", width: "100%",
                background: submitting ? C.muted : C.parchment, color: C.ink, border: "none",
                minHeight: 45.78, padding: "0.9rem 1.5rem", cursor: submitting ? "wait" : "pointer",
                transition: "opacity 0.2s",
              }}>
                {submitting ? "Submitting..." : "Join the Circle"}
              </button>
            </div>
          </>
        ) : (
          <div className="waitlist-form" style={{ width: 454, textAlign: "center", padding: "4rem 0", margin: "0 auto" }}>
            <div style={{ ...font.serif, fontSize: "1.6rem", marginBottom: "1.2rem", color: C.gold }}>
              {"\u2726"} Received.
            </div>
            <p style={{ ...footerMono, color: "rgba(244,241,234,0.45)" }}>
              You'll know when the gates open.
            </p>
          </div>
        )}

        <div className="waitlist-meta" style={{
          ...footerMono, color: "rgba(244,241,234,0.2)",
          borderTop: "1px solid rgba(244,241,234,0.08)",
          width: 454, margin: "49px auto 0", paddingTop: "14px",
          display: "flex", justifyContent: "space-between",
        }}>
          <span>Egregore Systems</span>
          <span>MMXXVI</span>
          <span>Berlin / The Graph</span>
        </div>
      </div>

        {/* Right ASCII decoration */}
        <div className="waitlist-side-art waitlist-right-art" style={{ flex: "0 0 497px", display: "flex", justifyContent: "flex-end" }}>
          <pre style={{
            ...font.ibmPlex,
            fontSize: "0.128rem",
            lineHeight: 1.05,
            color: "#7b756d",
            whiteSpace: "pre",
            margin: 0,
          }}>
            {footerStar}
          </pre>
        </div>
      </div>
    </footer>
  );
};

// ─── Egregore Text Banner ────────────────────────────────────────
const EgregoreTextBanner = () => {
  return null;
};

// ─── App ────────────────────────────────────────────────────────
export default function App() {
  return (
    <div style={{ background: C.parchment, color: C.ink, ...font.serif, lineHeight: 1.6, overflowX: "hidden" }}>
      <Navigation />
      <Hero />
      <EgregoricIntelligence />
      <ValueProps />
      <SeeItWork />
      <EgregoreTextBanner />
      <SessionCycle />
      <WizardsBanner />
      <Research />
      <WaitlistCTA />
    </div>
  );
}
