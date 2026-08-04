"use client";

import { useEffect, useState } from "react";
import "./traction-board.css";

const months = ["May", "Jun", "Jul"];
const activeDays = [20, 27, 50];
const sessions = [109, 135, 177];
const cohorts = [
  { month: "Apr", rate: 18, note: "OSS launch" },
  { month: "May", rate: 16, note: "launch tail" },
  { month: "Jun", rate: 50, note: "" },
  { month: "Jul", rate: 60, note: "3.3× April" },
];

function Bars({ values, max }: { values: number[]; max: number }) {
  return (
    <div className="tr-bars" aria-hidden="true">
      {values.map((value, index) => (
        <div className="tr-bar-slot" key={`${months[index]}-${value}`}>
          <span className="tr-bar-value">{value}</span>
          <span
            className={`tr-bar ${index === values.length - 1 ? "is-current" : ""}`}
            style={{ "--bar-height": `${Math.max(8, (value / max) * 100)}%` } as React.CSSProperties}
          />
          <span className="tr-bar-label">{months[index]}</span>
        </div>
      ))}
    </div>
  );
}

export default function TractionBoard() {
  const [mode, setMode] = useState<"light" | "auto" | "dark">("auto");

  useEffect(() => {
    const saved = (localStorage.getItem("eg-traction-theme") || "auto") as
      | "light"
      | "auto"
      | "dark";
    setMode(saved);
    const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.dataset.theme = saved === "auto" ? (dark ? "dark" : "light") : saved;
  }, []);

  function cycleTheme() {
    const modes = ["light", "auto", "dark"] as const;
    const next = modes[(modes.indexOf(mode) + 1) % modes.length];
    const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setMode(next);
    localStorage.setItem("eg-traction-theme", next);
    document.documentElement.dataset.theme = next === "auto" ? (dark ? "dark" : "light") : next;
  }

  return (
    <div className="tr">
      <main className="tr-main">
        <header className="tr-masthead">
          <span className="tr-wordmark">egregore</span>
          <span className="tr-slash">/</span>
          <span className="tr-kicker">Traction</span>
          <button className="tr-theme" onClick={cycleTheme} aria-label={`Theme: ${mode}`}>
            <span>{mode === "light" ? "☀" : mode === "dark" ? "☾" : "◐"}</span>
            {mode}
          </button>
        </header>

        <section className="tr-hero">
          <p className="tr-eyebrow">Adoption snapshot · 4 August 2026</p>
          <h1>
            Usage is <em>expanding.</em>
            <br />New Egregores activate faster.
          </h1>
          <p className="tr-lede">
            Egregore has moved from sustained daily use by its core team into a growing
            population of organizations that return, create knowledge, and use it more often.
          </p>
        </section>

        <section className="tr-stats" aria-label="Traction summary">
          <article>
            <strong>76</strong>
            <span>verified Egregores</span>
            <small>real setups, fixtures removed</small>
          </article>
          <article className="is-accent">
            <strong>60%</strong>
            <span>July activation</span>
            <small>3.3× the OSS launch cohort</small>
          </article>
          <article>
            <strong>2,704</strong>
            <span>Egregore sessions</span>
            <small>real work sessions started</small>
          </article>
        </section>

        <section className="tr-feature">
          <div className="tr-section-head">
            <div>
              <p className="tr-section-num">01 · Expansion</p>
              <h2>More Egregores are showing up more often.</h2>
            </div>
            <p>
              Active organization-days nearly doubled in July. This measures breadth of usage,
              not one highly active account.
            </p>
          </div>
          <div className="tr-feature-grid">
            <div className="tr-big-number">
              <span>July</span>
              <strong>+85%</strong>
              <p>month-over-month growth in active Egregore-days</p>
            </div>
            <div className="tr-primary-chart">
              <Bars values={activeDays} max={50} />
              <div className="tr-chart-caption">
                <span>Active Egregore-days</span>
                <span>Expansion beyond the initial core team</span>
              </div>
            </div>
          </div>
        </section>

        <section className="tr-grid-two">
          <article className="tr-panel">
            <p className="tr-section-num">02 · Activation</p>
            <h2>Recent cohorts activate faster.</h2>
            <p className="tr-panel-copy">
              April brought launch-scale curiosity. By July, a much larger share of new
              Egregores reached a first session.
            </p>
            <div className="tr-cohorts">
              {cohorts.map((cohort) => (
                <div className="tr-cohort" key={cohort.month}>
                  <span className="tr-cohort-month">{cohort.month}</span>
                  <span className="tr-cohort-track">
                    <span
                      className={`tr-cohort-fill ${cohort.month === "Jul" ? "is-current" : ""}`}
                      style={{ "--cohort-width": `${cohort.rate}%` } as React.CSSProperties}
                    />
                  </span>
                  <strong>{cohort.rate}%</strong>
                  <small>{cohort.note}</small>
                </div>
              ))}
            </div>
          </article>

          <article className="tr-panel">
            <p className="tr-section-num">03 · Frequency</p>
            <h2>Session volume keeps climbing.</h2>
            <p className="tr-panel-copy">
              Usage beyond the initial team grew in consecutive months: +24% in June and +31%
              in July.
            </p>
            <div className="tr-mini-chart">
              <Bars values={sessions} max={177} />
            </div>
            <div className="tr-growth-note">
              <span>109 → 135 → 177</span>
              <strong>+62% since May</strong>
            </div>
          </article>
        </section>

        <section className="tr-memory">
          <div className="tr-section-head">
            <div>
              <p className="tr-section-num">04 · Compounding value</p>
              <h2>Work becomes organizational memory.</h2>
            </div>
            <p>
              Sessions do not disappear when they end. They leave knowledge, handoffs, and
              context that future work can build upon.
            </p>
          </div>
          <div className="tr-memory-flow">
            <div><strong>2,704</strong><span>sessions started</span></div>
            <i aria-hidden="true">→</i>
            <div><strong>363</strong><span>knowledge writes</span></div>
            <i aria-hidden="true">→</i>
            <div><strong>154</strong><span>handoffs</span></div>
            <i aria-hidden="true">→</i>
            <div className="is-accent"><strong>19</strong><span>knowledge-building Egregores</span></div>
          </div>
        </section>

        <section className="tr-depth">
          <div>
            <p className="tr-section-num">05 · Sustained depth</p>
            <h2>Egregore: A working habit.</h2>
          </div>
          <div className="tr-proof">
            <article>
              <span>Core team</span>
              <strong>111 active days</strong>
              <small>2,170 sessions</small>
            </article>
            <article>
              <span>Early adopter</span>
              <strong>83 active days</strong>
              <small>373 sessions</small>
            </article>
          </div>
        </section>

        <footer className="tr-footer">
          <span>Egregore · shared intelligence for organizations</span>
          <span>Telemetry is privacy-preserving and opt-out. Figures are observed floors.</span>
        </footer>
      </main>
    </div>
  );
}
