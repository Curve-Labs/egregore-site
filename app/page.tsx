"use client";

import { useEffect, useRef, useState, useCallback, memo } from "react";
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

const TestimonialCarousel = memo(function TestimonialCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slideKey, setSlideKey] = useState(0);
  const slideCount = 3;

  const goToSlide = useCallback((index: number) => {
    setCurrentSlide(index);
    setSlideKey((k) => k + 1);
    const track = trackRef.current;
    if (track) {
      track.style.transform = `translateX(-${index * (100 / slideCount)}%)`;
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      goToSlide((currentSlide + 1) % slideCount);
    }, 4000);
    return () => clearTimeout(timer);
  }, [currentSlide, goToSlide]);

  return (
    <section className="testimonials">
      <div className="testimonial-viewport">
        <div className="testimonial-track" ref={trackRef}>
          <div className="testimonial-slide">
            <blockquote>
              &ldquo;It&rsquo;s like having a Claude that already sat in on
              every standup. Everyone&rsquo;s context is just there.&rdquo;
            </blockquote>
            <div className="testimonial-author">
              <div className="testimonial-avatar">
                <img src="/avatar.png" alt="Alex M." />
              </div>
              <div>
                <div className="testimonial-name">Alex M.</div>
                <div className="testimonial-role">eng lead, 4-person startup</div>
              </div>
            </div>
          </div>
          <div className="testimonial-slide">
            <blockquote>
              &ldquo;Three of us work across timezones. Egregore turned Claude
              from &lsquo;my&rsquo; assistant into the team&rsquo;s shared
              brain.&rdquo;
            </blockquote>
            <div className="testimonial-author">
              <div className="testimonial-avatar">
                <img src="/avatar.png" alt="Sam K." />
              </div>
              <div>
                <div className="testimonial-name">Sam K.</div>
                <div className="testimonial-role">distributed team</div>
              </div>
            </div>
          </div>
          <div className="testimonial-slide">
            <blockquote>
              &ldquo;The unlock isn&rsquo;t any single feature — it&rsquo;s
              that Claude finally has institutional memory. It compounds.&rdquo;
            </blockquote>
            <div className="testimonial-author">
              <div className="testimonial-avatar">
                <img src="/avatar.png" alt="Jordan R." />
              </div>
              <div>
                <div className="testimonial-name">Jordan R.</div>
                <div className="testimonial-role">technical co-founder</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="testimonial-bars">
        {Array.from({ length: slideCount }).map((_, i) => (
          <div
            key={i}
            className={`bar ${i === currentSlide ? "active" : i < currentSlide ? "past" : ""}`}
            onClick={() => goToSlide(i)}
          >
            <div className="bar-fill" key={i === currentSlide ? `fill-${slideKey}` : `static-${i}`} />
          </div>
        ))}
      </div>
    </section>
  );
});

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
              <AnimatedLine text="Claude code" startIndex={0} />
              <br />
              <AnimatedLine text="now multiplayer" startIndex={11} />
            </h1>
            <p className="hero-sub">
              You open a terminal. You talk to Claude. But this Claude connects
              the dots. It knows what your teammates did yesterday.
            </p>
          </div>

          <div className="hero-cta-area">
            <CtaPill />
            <p className="hero-doc-link">
              Or read the <a href="#">documentation</a>
            </p>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <div className="features-wrapper">
        <nav className="features-nav">
          <div className="features-nav-label">Features</div>
          <span className="active" data-section="todo">
            /todo
          </span>
          <span data-section="handoff">/handoff</span>
          <span data-section="save">/save</span>
          <span data-section="activity">/activity</span>
        </nav>

        <div className="features-content">
          {/* /todo */}
          <section
            className="action-section"
            id="todo"
            style={{ paddingTop: 0 }}
          >
            <div className="action-text">
              <img src="/icon-todo.svg" alt="" className="action-icon" />
              <h2>
                Track your work <span className="cmd-label">/todo</span>
              </h2>
              <p>
                Tell Claude what you&apos;re working on. It creates todos, checks
                progress, and never loses context between sessions.
              </p>
            </div>
            <TerminalBlock>
              <div className="cmd-line">
                <span className="prompt">$ </span>
                <span className="type-line">
                  <span className="cmd">
                    <span className="highlight">/todo</span> fix the auth
                    redirect bug
                  </span>
                </span>
              </div>
              <br />
              <span className="fade-line">
                <span className="success">&#10003;</span>{" "}
                <span className="output">Todo: fix the auth redirect bug</span>
                <br />
                <span className="dim">
                  &nbsp;&nbsp;3 open todos &middot; /todo to see all
                </span>
              </span>
              <br />
              <br />
              <div className="cmd-line fade-line">
                <span className="prompt">$ </span>
                <span className="type-line-2">
                  <span className="cmd">
                    <span className="highlight">/todo</span>
                  </span>
                </span>
              </div>
              <br />
              <span className="fade-line-2">
                <span className="output">
                  [1] <span className="highlight">&#9733;</span> fix the auth
                  redirect bug
                </span>
                <br />
                <span className="output">
                  [2] &nbsp; update onboarding flow
                </span>
                <br />
                <span className="output">
                  [3] &nbsp; review Sam&apos;s PR
                </span>
              </span>
              <br />
            </TerminalBlock>
          </section>

          <SectionDivider />

          {/* /handoff */}
          <section className="action-section" id="handoff">
            <div className="action-text">
              <img src="/icon-handoff.svg" alt="" className="action-icon" />
              <h2>
                Pass the baton <span className="cmd-label">/handoff</span>
              </h2>
              <p>
                End your session with notes for the next person. They pick up
                exactly where you left off — no Slack catch-up, no stale docs.
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
                  &nbsp;&nbsp;Fixed auth redirect, added tests
                </span>
                <br />
                <span className="output">
                  &nbsp;&nbsp;Refactored token refresh logic
                </span>
              </span>
              <br />
              <br />
              <span className="fade-line">
                <span className="dim">&nbsp;&nbsp;Still open:</span>
                <br />
                <span className="output">
                  &nbsp;&nbsp;<span className="highlight">&#8594;</span> edge
                  case with expired sessions
                </span>
                <br />
                <span className="output">
                  &nbsp;&nbsp;<span className="highlight">&#8594;</span> needs QA
                  on mobile Safari
                </span>
              </span>
              <br />
              <br />
              <span className="fade-line">
                <span className="success">&#10003;</span>{" "}
                <span className="dim">
                  pushed to memory &middot; Sam will see this
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
                Ship your work <span className="cmd-label">/save</span>
              </h2>
              <p>
                One command creates a PR with everything you did. Teammates
                review it, or markdown changes merge automatically.
              </p>
            </div>
            <TerminalBlock branch="dev/kaan/auth-fix">
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
                  <span className="highlight">dev/kaan/auth-fix</span>
                </span>
              </span>
              <br />
              <br />
              <span className="fade-line">
                <span className="dim">&nbsp;&nbsp;&#10003; 3 files staged</span>
                <br />
                <span className="dim">
                  &nbsp;&nbsp;&#10003; committed: &quot;fix auth redirect on token
                  expiry&quot;
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
                <span className="output">PR #42 created</span>
                <br />
                <span className="dim">
                  &nbsp;&nbsp;github.com/team/app/pull/42
                </span>
                <br />
                <span className="dim">
                  &nbsp;&nbsp;<span className="highlight">&#8594;</span> Sam
                  added as reviewer
                </span>
              </span>
            </TerminalBlock>
          </section>

          <SectionDivider />

          {/* /activity */}
          <section className="action-section" id="activity">
            <div className="action-text">
              <img src="/icon-activity.svg" alt="" className="action-icon" />
              <h2>
                See the whole board{" "}
                <span className="cmd-label">/activity</span>
              </h2>
              <p>
                What happened today. Who worked on what. Open threads, recent
                handoffs, the full picture — without a standup.
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
                <span className="dim">
                  &nbsp;&nbsp;Today &middot; 3 sessions
                </span>
              </span>
              <br />
              <br />
              <span className="fade-line">
                <span className="output">
                  &nbsp;&nbsp;<span className="highlight">Kaan</span> &middot;
                  2h ago
                </span>
                <br />
                <span className="dim">
                  &nbsp;&nbsp;fixed auth redirect, refactored tokens
                </span>
                <br />
                <span className="dim">
                  &nbsp;&nbsp;<span className="highlight">&#8594;</span> handoff
                  for Sam: expired sessions edge case
                </span>
              </span>
              <br />
              <br />
              <span className="fade-line">
                <span className="output">
                  &nbsp;&nbsp;<span className="highlight">Sam</span> &middot; 5h
                  ago
                </span>
                <br />
                <span className="dim">
                  &nbsp;&nbsp;shipped onboarding v2, updated docs
                </span>
              </span>
              <br />
              <br />
              <span className="fade-line">
                <span className="output">
                  &nbsp;&nbsp;<span className="highlight">Jordan</span> &middot;
                  8h ago
                </span>
                <br />
                <span className="dim">
                  &nbsp;&nbsp;set up CI pipeline, added lint checks
                </span>
              </span>
              <br />
            </TerminalBlock>
          </section>
        </div>
      </div>

      {/* ── Egregoric Intelligence ── */}
      <SectionDivider
        style={{ maxWidth: 752, margin: "60px auto", padding: "0 28px" }}
      />

      <section className="egregoric">
        <div className="egregoric-text">
          <p className="egregoric-label">From the lab</p>
          <h2>
            Teams forgot how<br />
            to remember
          </h2>
        </div>
        <div className="egregoric-text" style={{ maxWidth: "55%" }}>
          <p>
            Every organization runs on context. Who decided what. Why it was
            decided. What was tried before. AI made this worse, not better —
            coding agents are powerful but amnesiac.
          </p>
          <Link href="/blog/teams-forgot-how-to-remember" className="btn-history">
            Read full history
          </Link>
        </div>
        <div className="egregoric-img">
          <video src="/wizard-video.mp4" autoPlay loop muted playsInline />
        </div>
      </section>

      <SectionDivider
        style={{ maxWidth: 752, margin: "60px auto", padding: "0 28px" }}
      />

      {/* ── Testimonials ── */}
      <TestimonialCarousel />

      {/* ── Footer CTA ── */}
      <section className="footer-cta">
        <h2>Try it now</h2>
        <p className="footer-sub">
          You open a terminal. You talk to Claude. But this Claude connects the
          dots. It knows what your teammates did yesterday.
        </p>

        <div className="footer-visual">
          <div className="footer-img">
            <video src="/footer-video.mp4" autoPlay loop muted playsInline />
          </div>
          <CtaPill />
        </div>

        <div className="footer-links">
          <a
            href="https://github.com/Curve-Labs/egregore"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
          <a
            href="https://curvelabs.eu"
            target="_blank"
            rel="noopener noreferrer"
          >
            Curve Labs
          </a>
          <a
            href="https://egregore.xyz"
            target="_blank"
            rel="noopener noreferrer"
          >
            egregore.xyz
          </a>
        </div>
      </section>
    </>
  );
}
