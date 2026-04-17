"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import Image from "next/image";
import Link from "next/link";

function CopyIcon() {
  return (
    <svg
      className="copy-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}

function CtaPill() {
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText("npx create-egregore@latest --open").then(() => {
      const btn = btnRef.current;
      if (!btn) return;
      btn.classList.add("copied");
      setTimeout(() => btn.classList.remove("copied"), 2000);
    });
  }, []);

  return (
    <button className="cta-pill" ref={btnRef} onClick={handleCopy}>
      <span className="cta-text">
        <span className="cmd-npx">npx</span>{" "}
        <span className="cmd-pkg">create-egregore@latest</span>{" "}
        <span className="cmd-flag">--open</span>
      </span>
      <span className="copied-text">Copied!</span>
      <CopyIcon />
    </button>
  );
}

function BlurredCta() {
  // Unblurred for launch — install is live. The blur + reveal animation
  // behind this component is preserved in git history if we need it again.
  return <CtaPill />;
}

function TerminalBlock({
  id,
  children,
  branch = "develop",
}: {
  id?: string;
  children: React.ReactNode;
  branch?: string;
}) {
  return (
    <div className="terminal" data-terminal-id={id}>
      <div className="terminal-bar">
        <div className="terminal-dot red" />
        <div className="terminal-dot yellow" />
        <div className="terminal-dot green" />
        <span className="terminal-bar-title">Claude Code</span>
      </div>
      <div className="terminal-body">{children}</div>
      <div className="terminal-footer">
        <div className="terminal-prompt-line">
          &gt; <span className="cursor">|</span>
        </div>
        <div className="terminal-branch">&#9889; {branch}</div>
      </div>
    </div>
  );
}

function AnimatedLine({ text, startIndex }: { text: string; startIndex: number }) {
  let i = startIndex;
  return (
    <>
      {text.split("").map((ch, idx) => {
        if (ch === " ") {
          return <span key={idx} className="char-space"> </span>;
        }
        const delay = i * 0.01;
        i++;
        return (
          <span
            key={idx}
            className="char"
            style={{ animationDelay: `${delay.toFixed(3)}s` }}
          >
            {ch}
          </span>
        );
      })}
    </>
  );
}

function SectionDivider({ style }: { style?: React.CSSProperties }) {
  return (
    <div className="section-divider" style={style}>
      <div className="diamond" />
    </div>
  );
}

const labPosts = [
  {
    label: "From the lab",
    title: "Context gardening",
    body: "Most teams treat knowledge like a warehouse. Store it, label it, forget where you put it. Context gardening is different: it treats organizational knowledge as something alive that grows, connects, and compounds when you tend to it.",
    href: "/blog/teams-forgot-how-to-remember",
    img: "/context-gardening.png",
    imgWidth: 234,
  },
  {
    label: "From the lab",
    title: "Towards shared minds",
    body: "What happens when a team's AI doesn't just assist individuals, but develops a shared understanding across everyone? Towards shared minds explores the architecture of collective cognition and why it changes how organizations think.",
    href: "/research/towards-shared-minds",
    img: "/shared-minds.png",
    imgWidth: 260,
  },
];

function LabCarousel() {
  const [idx, setIdx] = useState(0);
  const post = labPosts[idx];

  return (
    <section className="egregoric">
      <div className="egregoric-text">
        <p className="egregoric-label">{post.label}</p>
        <h2>{post.title}</h2>
      </div>
      <div className="egregoric-text" style={{ maxWidth: "55%" }}>
        <p>{post.body}</p>
        <div className="lab-carousel-actions">
          <Link href={post.href} className="btn-history">
            Read the full article
          </Link>
          {labPosts.length > 1 && (
            <button
              type="button"
              className="btn-history btn-next-post"
              onClick={() => setIdx((idx + 1) % labPosts.length)}
              aria-label="Show next article"
            >
              Next post →
            </button>
          )}
        </div>
      </div>
      <div className="egregoric-img">
        <img src={post.img} alt="" style={post.imgWidth ? { width: post.imgWidth } : undefined} />
      </div>
    </section>
  );
}

export default function HomePage() {
  const heroBgRef = useRef<HTMLDivElement>(null);

  // Hero parallax
  useEffect(() => {
    const heroBg = heroBgRef.current;
    if (!heroBg) return;

    const handleScroll = () => {
      const y = window.scrollY;
      if (y < 1200) {
        heroBg.style.transform = `translateY(${y * 0.22}px)`;
        const fadeStart = Math.max(50 - y * 0.08, 15);
        const fadeEnd = Math.max(90 - y * 0.08, 40);
        heroBg.style.maskImage = `linear-gradient(to bottom, black ${fadeStart}%, transparent ${fadeEnd}%)`;
        heroBg.style.webkitMaskImage = `linear-gradient(to bottom, black ${fadeStart}%, transparent ${fadeEnd}%)`;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Hero character animation — rendered in JSX, no DOM mutation needed

  // Features nav active state + section fade-in
  useEffect(() => {
    const navLinks = document.querySelectorAll(".features-nav span");
    const sections = document.querySelectorAll(
      ".features-content .action-section"
    );

    const updateActiveNav = () => {
      let current = "";
      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        if (rect.top <= window.innerHeight * 0.4) {
          current = section.id;
        }
      });
      navLinks.forEach((link) => {
        const el = link as HTMLElement;
        el.classList.toggle("active", el.dataset.section === current);
      });
    };

    window.addEventListener("scroll", updateActiveNav, { passive: true });
    updateActiveNav();

    // Click nav to scroll
    navLinks.forEach((link) => {
      link.addEventListener("click", () => {
        const el = link as HTMLElement;
        const target = document.getElementById(el.dataset.section || "");
        if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });

    // Section fade-in observer
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (
            entry.isIntersecting &&
            !entry.target.classList.contains("visible")
          ) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.05 }
    );

    document.querySelectorAll(".action-section").forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        el.classList.add("visible");
      }
      sectionObserver.observe(el);
    });

    return () => {
      window.removeEventListener("scroll", updateActiveNav);
      sectionObserver.disconnect();
    };
  }, []);

  // Terminal typing engine
  useEffect(() => {
    function typeText(
      el: HTMLElement,
      callback?: () => void
    ) {
      const html = el.innerHTML;
      el.innerHTML = "";
      el.style.visibility = "visible";

      const temp = document.createElement("span");
      temp.innerHTML = html;
      const text = temp.textContent || "";
      let i = 0;

      function findHtmlIndex(h: string, charCount: number) {
        let chars = 0;
        let inTag = false;
        for (let j = 0; j < h.length; j++) {
          if (h[j] === "<") inTag = true;
          if (!inTag) chars++;
          if (h[j] === ">") inTag = false;
          if (chars >= charCount) return j + 1;
        }
        return h.length;
      }

      const cursor = document.createElement("span");
      cursor.className = "type-cursor";

      function type() {
        if (i < text.length) {
          el.innerHTML = html.substring(0, findHtmlIndex(html, i + 1));
          el.appendChild(cursor);
          i++;
          setTimeout(type, 40 + Math.random() * 20);
        } else {
          el.innerHTML = html;
          if (callback) callback();
        }
      }
      type();
    }

    function activateTerminal(terminal: Element) {
      const el = terminal as HTMLElement;
      if (el.dataset.activated) return;
      el.dataset.activated = "true";

      const section = el.closest(".action-section");
      if (!section) return;
      const typeLine = section.querySelector(".type-line") as HTMLElement;
      const fadeLines = section.querySelectorAll(".fade-line");

      if (typeLine) {
        setTimeout(() => {
          typeText(typeLine, () => {
            fadeLines.forEach((line, i) => {
              setTimeout(() => line.classList.add("show"), 400 + i * 120);
            });

            const typeLine2 = section.querySelector(
              ".type-line-2"
            ) as HTMLElement;
            const fadeLines2 = section.querySelectorAll(".fade-line-2");
            if (typeLine2) {
              const phase2Delay = 400 + fadeLines.length * 120 + 600;
              setTimeout(() => {
                typeText(typeLine2, () => {
                  fadeLines2.forEach((line, i) => {
                    setTimeout(
                      () => line.classList.add("show"),
                      300 + i * 120
                    );
                  });
                });
              }, phase2Delay);
            }
          });
        }, 200);
      }
    }

    const terminalObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) activateTerminal(entry.target);
        });
      },
      { threshold: 0.2 }
    );

    document.querySelectorAll(".terminal").forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        activateTerminal(el);
      }
      terminalObserver.observe(el);
    });

    return () => terminalObserver.disconnect();
  }, []);


  return (
    <>
      <div className="grid-overlay" aria-hidden="true" />

      {/* ── Hero ── */}
      <section className="hero">
        <div className="hero-bg" aria-hidden="true" ref={heroBgRef}>
          <img src="/hero.png" alt="" />
        </div>
        <div className="hero-fade" aria-hidden="true" />

        <div className="hero-logo">
          <img src="/logo_egregore.svg" alt="egregore" height={33} />
        </div>

        <div className="grid-line" aria-hidden="true" />

        <div className="hero-container">
          <div className="hero-content">
            <h1>
              <AnimatedLine text="Towards" startIndex={0} />
              <br />
              <AnimatedLine text="shared minds" startIndex={7} />
            </h1>
            <p className="hero-sub">
              AI-native collaboration is here. Turn the traces of your
              team&apos;s work into persistent collective cognition.
            </p>
          </div>

          <div className="hero-cta-area">
            <BlurredCta />
            <p className="hero-doc-link">
              See <a href="/docs">documentation</a>
            </p>
          </div>
        </div>
      </section>

      {/* ── Value Propositions ── */}
      <section className="value-props">
        <div className="value-prop">
          <img src="/icon-organize.png" alt="" className="value-prop-icon" />
          <div className="value-prop-text">
            <h3>Organizational cognition</h3>
            <p>
              Every session leaves a trace. Decisions, patterns, handoffs
              structured and ready to build on. Persistent context beyond
              individual sessions, compounding into institutional knowledge
              that any member human or AI can work with.
            </p>
          </div>
        </div>
        <div className="value-prop">
          <img src="/icon-multi.png" alt="" className="value-prop-icon" />
          <div className="value-prop-text">
            <h3>Multi-agent continuity</h3>
            <p>
              Human-AI pairs communicating with each other across a rich,
              shared context space. Handoffs carry not just state, but the
              reasoning that produced it enabling speed and situational
              awareness for people, and depth for AI agents picking up the
              thread.
            </p>
          </div>
        </div>
        <div className="value-prop">
          <img src="/icon-deep.png" alt="" className="value-prop-icon" />
          <div className="value-prop-text">
            <h3>Deep pattern recognition</h3>
            <p>
              Your organization generates more signal than anyone can track.
              Deep pattern recognition makes the invisible visible revealing
              how your team actually operates, where it&apos;s converging, and
              where the coordination infrastructure itself can evolve.
            </p>
          </div>
        </div>
      </section>

      <SectionDivider
        style={{ maxWidth: 752, margin: "0 auto", padding: "0 28px" }}
      />

      {/* ── Features ── */}
      <div className="features-wrapper">
        <nav className="features-nav">
          <div className="features-nav-label">Features</div>
          <span className="active" data-section="invite">
            /invite
          </span>
          <span data-section="handoff">/handoff</span>
          <span data-section="save">/save</span>
          <span data-section="activity">/activity</span>
          <span data-section="deep-reflect">/deep-reflect</span>
        </nav>

        <div className="features-content">
          {/* /invite */}
          <section
            className="action-section"
            id="invite"
            style={{ paddingTop: 0 }}
          >
            <div className="action-text">
              <img src="/icon-invite.svg" alt="" className="action-icon" />
              <h2>
                Make it multiplayer{" "}
                <span className="cmd-label">/invite</span>
              </h2>
              <p>
                One command brings a teammate into your egregore. They get
                access to shared memory and coordination workflows from
                their first session.
              </p>
            </div>
            <TerminalBlock>
              <div className="cmd-line">
                <span className="prompt">$ </span>
                <span className="type-line">
                  <span className="cmd">
                    <span className="highlight">/invite</span> mia@studio.dev
                  </span>
                </span>
              </div>
              <br />
              <span className="fade-line">
                <span className="dim">
                  &nbsp;&nbsp;Inviting mia@studio.dev...
                </span>
              </span>
              <br />
              <br />
              <span className="fade-line">
                <span className="output">
                  &nbsp;&nbsp;<span className="highlight">&#10003;</span> GitHub org invitation sent
                </span>
                <br />
                <span className="output">
                  &nbsp;&nbsp;<span className="highlight">&#10003;</span> Memory access granted
                </span>
                <br />
                <span className="output">
                  &nbsp;&nbsp;<span className="highlight">&#10003;</span> Knowledge graph linked
                </span>
              </span>
              <br />
              <br />
              <span className="fade-line">
                <span className="dim">
                  &nbsp;&nbsp;Mia gets access to the organization&apos;s accumulated
                </span>
                <br />
                <span className="dim">
                  &nbsp;&nbsp;context from her first session.
                </span>
                <br />
                <span className="dim">
                  &nbsp;&nbsp;<span className="highlight">&#8594;</span> handoff something to get her started
                </span>
              </span>
            </TerminalBlock>
          </section>

          <SectionDivider />

          {/* /handoff */}
          <section className="action-section" id="handoff">
            <div className="action-text">
              <img src="/icon-handoff.svg" alt="" className="action-icon" />
              <h2>
                Atomic unit of AI-native coordination{" "}
                <span className="cmd-label">/handoff</span>
              </h2>
              <p>
                A handoff doesn&apos;t just communicate the state of the work
                it carries the context graph that generated it. Decisions,
                trade-offs, open threads, and the reasoning behind them.
              </p>
            </div>
            <TerminalBlock>
              <div className="cmd-line">
                <span className="prompt">$ </span>
                <span className="type-line">
                  <span className="cmd">
                    <span className="highlight">/handoff</span>
                  </span>
                </span>
              </div>
              <br />
              <span className="fade-line">
                <span className="output">&#9998; Handoff saved</span>
              </span>
              <br />
              <br />
              <span className="fade-line">
                <span className="dim">&nbsp;&nbsp;What I did:</span>
                <br />
                <span className="output">
                  &nbsp;&nbsp;Redesigned the dashboard layout, rewired data layer
                </span>
                <br />
                <span className="output">
                  &nbsp;&nbsp;Added responsive breakpoints for mobile
                </span>
              </span>
              <br />
              <br />
              <span className="fade-line">
                <span className="dim">&nbsp;&nbsp;Still open:</span>
                <br />
                <span className="output">
                  &nbsp;&nbsp;<span className="highlight">&#8594;</span> loading
                  state flickers on slow connections
                </span>
                <br />
                <span className="output">
                  &nbsp;&nbsp;<span className="highlight">&#8594;</span> accessibility
                  audit on new color tokens
                </span>
              </span>
              <br />
              <br />
              <span className="fade-line">
                <span className="success">&#10003;</span>{" "}
                <span className="dim">
                  pushed to memory &middot; Alex&apos;s Claude will have this context
                </span>
              </span>
            </TerminalBlock>
          </section>

          <SectionDivider />

          {/* /save */}
          <section className="action-section" id="save">
            <div className="action-text">
              <img src="/icon-save.svg" alt="" className="action-icon" />
              <h2>
                Automate the git workflow{" "}
                <span className="cmd-label">/save</span>
              </h2>
              <p>
                Stage, commit, push, open a PR one command. Automatic
                enforcement of versioning best practices so that collaborative
                AI-driven development stays streamlined.
              </p>
            </div>
            <TerminalBlock branch="dev/alex/dashboard-redesign">
              <div className="cmd-line">
                <span className="prompt">$ </span>
                <span className="type-line">
                  <span className="cmd">
                    <span className="highlight">/save</span>
                  </span>
                </span>
              </div>
              <br />
              <span className="fade-line">
                <span className="output">
                  Saving to{" "}
                  <span className="highlight">dev/alex/dashboard-redesign</span>
                </span>
              </span>
              <br />
              <br />
              <span className="fade-line">
                <span className="dim">&nbsp;&nbsp;&#10003; 4 files staged</span>
                <br />
                <span className="dim">
                  &nbsp;&nbsp;&#10003; committed: &quot;redesign dashboard layout +
                  mobile breakpoints&quot;
                </span>
                <br />
                <span className="dim">
                  &nbsp;&nbsp;&#10003; pushed to origin
                </span>
              </span>
              <br />
              <br />
              <span className="fade-line">
                <span className="success">&#10003;</span>{" "}
                <span className="output">PR #87 created</span>
                <br />
                <span className="dim">
                  &nbsp;&nbsp;github.com/studio/app/pull/87
                </span>
                <br />
                <span className="dim">
                  &nbsp;&nbsp;<span className="highlight">&#8594;</span> Mia
                  added as reviewer
                </span>
              </span>
            </TerminalBlock>
          </section>

          <SectionDivider />

          {/* /activity */}
          <section className="action-section" id="activity">
            <div className="action-text">
              <img src="/icon-todo.svg" alt="" className="action-icon" />
              <h2>
                See the whole board{" "}
                <span className="cmd-label">/activity</span>
              </h2>
              <p>
                What happened today. Who worked on what. Open threads,
                pending handoffs, quest momentum the full picture of your
                organization&apos;s work. A /activity is worth a thousand standups.
              </p>
            </div>
            <TerminalBlock>
              <div className="cmd-line">
                <span className="prompt">$ </span>
                <span className="type-line">
                  <span className="cmd">
                    <span className="highlight">/activity</span>
                  </span>
                </span>
              </div>
              <br />
              <span className="fade-line">
                <pre className="activity-box">{`+--------------------------------------------------------+
|  STUDIO EGREGORE * ACTIVITY        alex . Apr 09       |
+--------------------------------------------------------+
|                                                        |
|  3 sessions today. Mia shipped the new color           |
|  system. Jordan's migration is ready for review.       |
+--------------------------------------------------------+
|  HANDOFFS                                              |
|                                                        |
|  [1] * Mia -> you: color token review (2h ago)         |
|                                                        |
+--------------------------------------------------------+
|  . SESSIONS                                            |
|                                                        |
|  Today     Alex: dashboard redesign                    |
|  Today     Mia: color system + design tokens           |
|  Today     Jordan: v2 schema migration                 |
|                                                        |
|  # QUESTS (2 active)                                   |
|                                                        |
|  onboarding-flow    12 artifacts . 3d ago              |
|  perf-audit          4 artifacts . 1d ago              |
|                                                        |
+--------------------------------------------------------+
|  What's your focus?                                    |
+--------------------------------------------------------+`}</pre>
              </span>
            </TerminalBlock>
          </section>

          <SectionDivider />

          {/* /deep-reflect */}
          <section className="action-section" id="deep-reflect">
            <div className="action-text">
              <img src="/icon-activity.svg" alt="" className="action-icon" />
              <h2>
                Surface what&apos;s beneath{" "}
                <span className="cmd-label">/deep-reflect</span>
              </h2>
              <p>
                Your team&apos;s knowledge base holds more than anyone has read
                end to end. Deep-reflect traverses it across decisions,
                handoffs, quests, and the patterns forming between them.
              </p>
            </div>
            <TerminalBlock>
              <div className="cmd-line">
                <span className="prompt">$ </span>
                <span className="type-line">
                  <span className="cmd">
                    <span className="highlight">/deep-reflect</span> on the
                    architecture disagreement
                  </span>
                </span>
              </div>
              <br />
              <span className="fade-line">
                <span className="dim">
                  &nbsp;&nbsp;Reading 43 artifacts across 3 quests...
                </span>
                <br />
                <br />
                <span className="output">
                  &nbsp;&nbsp;&#9899;&#65039; Spawning CandidateSelection agent...
                </span>
                <br />
                <span className="dim">
                  &nbsp;&nbsp;&nbsp;&nbsp;9 artifacts selected &middot; 5 weeks &middot; 27 graph edges
                </span>
                <br />
                <br />
                <span className="output">
                  &nbsp;&nbsp;&#9899;&#65039; Spawning 3 DeepAnalysis agents in parallel...
                </span>
                <br />
                <span className="dim">
                  &nbsp;&nbsp;&nbsp;&nbsp;&#9500;&#9472; analysis-1 &middot; 9 tool uses &middot; 22.4k tokens &nbsp;<span className="success">Done</span>
                </span>
                <br />
                <span className="dim">
                  &nbsp;&nbsp;&nbsp;&nbsp;&#9500;&#9472; analysis-2 &middot; 7 tool uses &middot; 18.1k tokens &nbsp;<span className="success">Done</span>
                </span>
                <br />
                <span className="dim">
                  &nbsp;&nbsp;&nbsp;&nbsp;&#9492;&#9472; analysis-3 &middot; 5 tool uses &middot; 20.6k tokens &nbsp;<span className="success">Done</span>
                </span>
                <br />
                <br />
                <span className="output">
                  &nbsp;&nbsp;&#9899;&#65039; 3/3 consensus on core finding.
                </span>
              </span>
              <br />
              <br />
              <span className="fade-line">
                <span className="output">
                  &nbsp;&nbsp;You&apos;re not having a technical disagreement.
                </span>
                <br />
                <span className="output">
                  &nbsp;&nbsp;You&apos;re having a disagreement about <span className="highlight">time</span>.
                </span>
                <br />
                <br />
                <span className="dim">
                  &nbsp;&nbsp;Both sides cite the same handoff, the bitter lesson,
                </span>
                <br />
                <span className="dim">
                  &nbsp;&nbsp;&quot;general methods that leverage computation win in the
                </span>
                <br />
                <span className="dim">
                  &nbsp;&nbsp;long run&quot;, as justification for opposite architectures.
                </span>
                <br />
                <span className="dim">
                  &nbsp;&nbsp;They agree on the principle. They disagree on when
                </span>
                <br />
                <span className="dim">
                  &nbsp;&nbsp;&quot;the long run&quot; starts.
                </span>
              </span>
              <br />
              <br />
              <span className="fade-line">
                <span className="output">
                  &nbsp;&nbsp;<span className="highlight">&#9670;</span>{" "}
                  <span className="highlight">tension</span> &middot; architecture &#8596;&#65039; architecture
                </span>
                <br />
                <span className="dim">
                  &nbsp;&nbsp;&nbsp;&nbsp;Same source cited for opposite conclusions.
                </span>
                <br />
                <span className="dim">
                  &nbsp;&nbsp;&nbsp;&nbsp;The hidden variable is time horizon, not method.
                </span>
                <br />
                <br />
                <span className="output">
                  &nbsp;&nbsp;<span className="highlight">&#9670;</span>{" "}
                  <span className="highlight">pattern</span> &middot; 4 &quot;alignment&quot; sessions
                </span>
                <br />
                <span className="dim">
                  &nbsp;&nbsp;&nbsp;&nbsp;Apparent convergence that isn&apos;t. Handoffs
                </span>
                <br />
                <span className="dim">
                  &nbsp;&nbsp;&nbsp;&nbsp;diverge after every recorded agreement.
                </span>
                <br />
                <br />
                <span className="output">
                  &nbsp;&nbsp;<span className="highlight">&#9670;</span>{" "}
                  <span className="highlight">gap</span> &middot; unnamed variable
                </span>
                <br />
                <span className="dim">
                  &nbsp;&nbsp;&nbsp;&nbsp;No artifact marks when &quot;the long run&quot;
                </span>
                <br />
                <span className="dim">
                  &nbsp;&nbsp;&nbsp;&nbsp;transitions to &quot;now.&quot;
                </span>
              </span>
            </TerminalBlock>
          </section>
        </div>
      </div>

      {/* ── Egregoric Intelligence ── */}
      <SectionDivider
        style={{ maxWidth: 752, margin: "60px auto", padding: "0 28px" }}
      />

      <LabCarousel />

      <SectionDivider
        style={{ maxWidth: 752, margin: "60px auto", padding: "0 28px" }}
      />

      {/* ── Footer CTA ── */}
      <section className="footer-cta">
        <h2>Try it now</h2>
        <p className="footer-sub">
          <strong>Draw the magic circle</strong><br />
          One command. Egregore becomes your team&apos;s shared brain.
        </p>

        <div className="footer-visual">
          <div className="footer-img">
            <video src="/footer-video.mp4" autoPlay loop muted playsInline />
          </div>
          <BlurredCta />
        </div>

        <div className="footer-links">
          <a
            href="https://github.com/egregore-labs/egregore"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            className="footer-icon-link"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
          </a>
          <a
            href="https://x.com/egregore_xyz"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="X"
            className="footer-icon-link"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </a>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="site-footer">
        <span className="footer-inquiries">For enterprise inquiries — <a href="mailto:info@egregore.xyz">info@egregore.xyz</a></span>
      </footer>
    </>
  );
}
