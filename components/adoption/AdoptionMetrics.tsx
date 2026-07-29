"use client";

// AdoptionMetrics — /adoption, the shareable board.
//
// Same light theme as /adoption/admin and /desk. Carries no org slugs, no
// creator handles, no user handles: other organisations' names are their
// business, and keeping identities out of this payload means publishing the
// page can never leak them by accident.
//
// npm downloads are deliberately absent. 82 distinct versions of
// create-egregore were downloaded in one week, including releases months
// old that no human would install — that traffic is registry mirrors and
// security scanners. Excluding publish days removed the spike but not the
// baseline, so there is no threshold at which the number becomes true. It
// is not shown at all rather than shown cleaner.
//
// GitHub clone counts are absent for the same reason: 181 unique cloners
// against 50 unique page visitors over one fortnight. More cloners than
// humans who opened the page means bots.

import { useEffect, useState } from "react";
import "./adoption-metrics.css";

export type ExternalEntry = { value: number | null; delta_30d?: number };

export type AdoptionCommand = { command: string; runs: number; orgs: number };

export type AdoptionData = {
  window_days: number;
  installs: { total: number; window: number; basis: string };
  activity: {
    orgs_active: number;
    users_active: number;
    sessions: number;
    orgs_ever_active: number;
    teams_multi_member: number;
  };
  commands: AdoptionCommand[];
  external: { headline: Record<string, ExternalEntry> };
  coverage: { installs_observed: number; orgs_ever_reporting: number };
};

const nf = new Intl.NumberFormat("en-US");
const num = (e?: ExternalEntry) =>
  e && e.value !== null && e.value !== undefined ? e.value : null;

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="ad">
      <main className="ad-main">
        <div className="ad-head">
          <span className="ad-head-mark">egregore</span>
          <span className="ad-head-sep">/</span>
          <span className="ad-head-label">Adoption</span>
        </div>
        {children}
        <footer>
          <span>egregore.xyz</span>
          <span>
            <a href="https://github.com/egregore-labs/egregore">Source</a>{" "}
            &nbsp; <a href="/docs">Docs</a>
          </span>
          <span>MMXXVI</span>
        </footer>
      </main>
    </div>
  );
}

export default function AdoptionMetrics() {
  const [data, setData] = useState<AdoptionData | null>(null);
  const [detail, setDetail] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch("/api/adoption-metrics", { cache: "no-store" });
        if (!resp.ok) {
          if (!cancelled) {
            setDetail(`Metrics endpoint returned HTTP ${resp.status}.`);
            setLoading(false);
          }
          return;
        }
        const json = (await resp.json()) as AdoptionData;
        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setDetail("Could not reach the metrics endpoint.");
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading)
    return (
      <Shell>
        <section>
          <div className="ad-empty">Reading the registry…</div>
        </section>
      </Shell>
    );

  if (!data)
    return (
      <Shell>
        <section>
          <div className="ad-panel">
            <span className="ad-mark">Signal lost</span>
            <h2>Adoption metrics unavailable</h2>
            <p>The metrics endpoint isn&apos;t answering right now.</p>
            {detail ? <span className="ad-detail">{detail}</span> : null}
          </div>
        </section>
      </Shell>
    );

  const h = data.external?.headline ?? {};
  const stars = num(h.stars);
  const forks = num(h.forks);
  const contributors = num(h.contributors);
  const prsMerged = num(h.prs_merged);
  const a = data.activity;

  return (
    <Shell>
      <section className="ad-hero">
        <h1>
          Who is actually <em>using</em> this.
        </h1>
        <p>
          Organisations that installed Egregore and kept working in it —
          counted from the registry and from real sessions, never from download
          badges. Our own orgs and test fixtures are excluded.
        </p>
      </section>

      <section>
        <div className="ad-sec">
          <span className="ad-sec-num">§ 01</span>
          <span className="ad-sec-label">The funnel</span>
          <span className="ad-sec-rule" />
          <span className="ad-sec-label">last {data.window_days} days</span>
        </div>
        <div className="ad-funnel">
          <div className="ad-step">
            <span className="ad-step-n">{nf.format(data.installs.total)}</span>
            <span className="ad-step-l">Registered</span>
            <span className="ad-step-s">
              {nf.format(data.installs.window)} this month
            </span>
          </div>
          <div className="ad-step">
            <span className="ad-step-n">{nf.format(a.orgs_ever_active)}</span>
            <span className="ad-step-l">Ever ran a session</span>
            <span className="ad-step-s">got past setup</span>
          </div>
          <div className="ad-step is-key">
            <span className="ad-step-n">{nf.format(a.orgs_active)}</span>
            <span className="ad-step-l">Active this month</span>
            <span className="ad-step-s">
              {nf.format(a.users_active)} people · {nf.format(a.sessions)}{" "}
              sessions
            </span>
          </div>
          <div className="ad-step">
            <span className="ad-step-n">{nf.format(a.teams_multi_member)}</span>
            <span className="ad-step-l">Teams</span>
            <span className="ad-step-s">more than one member</span>
          </div>
        </div>
        <p className="ad-note">
          <strong>What counts as an install.</strong> {data.installs.basis} Only{" "}
          {data.coverage.orgs_ever_reporting} of{" "}
          {data.coverage.installs_observed} have ever reported telemetry, so
          every figure here is a floor rather than a census.
        </p>
      </section>

      <section>
        <div className="ad-sec">
          <span className="ad-sec-num">§ 02</span>
          <span className="ad-sec-label">What people run</span>
          <span className="ad-sec-rule" />
        </div>
        {data.commands.length === 0 ? (
          <div className="ad-empty">No command telemetry in this window.</div>
        ) : (
          <div className="ad-tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Command</th>
                  <th className="num">Runs</th>
                  <th className="num">Orgs</th>
                </tr>
              </thead>
              <tbody>
                {data.commands.map((c) => (
                  <tr key={c.command}>
                    <td className="ad-org">/{c.command}</td>
                    <td className="num">{nf.format(c.runs)}</td>
                    <td className="num ad-dim">{c.orgs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="ad-note">
          <strong>A floor, not a census.</strong> Command telemetry is emitted
          best-effort by the agent, so these under-report. Session counts above
          are measured by the shell and are exact.
        </p>
      </section>

      <section>
        <div className="ad-sec">
          <span className="ad-sec-num">§ 03</span>
          <span className="ad-sec-label">Open source</span>
          <span className="ad-sec-rule" />
          <span className="ad-sec-label">egregore-labs/egregore</span>
        </div>
        <div className="ad-funnel">
          <div className="ad-step">
            <span className="ad-step-n">
              {stars !== null ? nf.format(stars) : "—"}
            </span>
            <span className="ad-step-l">Stars</span>
          </div>
          <div className="ad-step">
            <span className="ad-step-n">
              {forks !== null ? nf.format(forks) : "—"}
            </span>
            <span className="ad-step-l">Forks</span>
          </div>
          <div className="ad-step">
            <span className="ad-step-n">
              {contributors !== null ? nf.format(contributors) : "—"}
            </span>
            <span className="ad-step-l">Contributors</span>
          </div>
          <div className="ad-step">
            <span className="ad-step-n">
              {prsMerged !== null ? nf.format(prsMerged) : "—"}
            </span>
            <span className="ad-step-l">PRs merged</span>
          </div>
        </div>
        <p className="ad-note">
          <strong>No download counts here, on purpose.</strong> npm reports
          thousands, but 82 separate versions were pulled in a single week —
          including releases months old that nobody would install by hand. That
          is mirrors and scanners, not people. Repository clone counts fail the
          same test: more unique cloners than unique visitors to the page.
        </p>
      </section>
    </Shell>
  );
}
