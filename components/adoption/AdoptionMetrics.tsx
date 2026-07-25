"use client";

// AdoptionMetrics — the public /adoption board. Client component: the site
// is a static export, so it fetches in the browser from /api/adoption-metrics,
// a Netlify edge function that injects the secret key. Same sealed-manuscript
// language as EmissaryMetrics; no charting library — the series is plain CSS
// columns. Theme-sensitive colors are var(--token) applied via className;
// inline styles carry computed geometry only.
//
// Editorial rule this file exists to enforce: every number on this page is
// one we can defend if someone checks it.
//
//   * Installs come from the org registry — real completed setups — not npm.
//     npm's headline is ~83% publish-day registry mirror traffic, so we show
//     the organic figure and label the raw one as inflated.
//   * Clone counts are deliberately absent. Over a representative fortnight
//     the repo saw 181 unique cloners against 50 unique page visitors; more
//     cloners than humans who opened the page means that series is bots.
//   * Internal orgs and test fixtures are excluded server-side.

import { useEffect, useState } from "react";
import "./adoption-metrics.css";

// ── Types — mirrors get_public_adoption() ──────────────────────

export type ExternalEntry = {
  value: number | null;
  captured_on?: string;
  delta_30d?: number;
  prev_on?: string;
  source?: string;
  subject?: string;
};

export type AdoptionPoint = {
  day: string;
  installs: number;
  active_orgs: number;
  active_users: number;
  sessions: number;
};

export type AdoptionCommand = {
  command: string;
  runs: number;
  orgs: number;
};

export type AdoptionData = {
  window_days: number;
  series_days: number;
  installs: { total: number; window: number; basis: string };
  activity: {
    orgs_active: number;
    users_active: number;
    sessions: number;
    orgs_ever_active: number;
    teams_multi_member: number;
  };
  timeseries: AdoptionPoint[];
  commands: AdoptionCommand[];
  external: {
    headline: Record<string, ExternalEntry>;
    by_subject: Record<string, Record<string, Record<string, ExternalEntry>>>;
  };
  coverage: {
    installs_observed: number;
    orgs_ever_reporting: number;
    reporting_rate: number | null;
    note: string;
  };
  excludes_internal: boolean;
};

// ── Formatting ─────────────────────────────────────────────────

const nf = new Intl.NumberFormat("en-US");

function fmtDate(iso: string): string {
  // Date-only strings must be built from parts — `new Date("2026-07-11")`
  // parses as UTC midnight and renders as the previous day west of UTC.
  const [y, m, d] = iso.split("-").map(Number);
  const date = y && m && d ? new Date(y, m - 1, d) : new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function num(e: ExternalEntry | undefined): number | null {
  return e && e.value !== null && e.value !== undefined ? e.value : null;
}

function Delta({ entry }: { entry?: ExternalEntry }) {
  if (!entry || entry.delta_30d === undefined) return null;
  const d = entry.delta_30d;
  if (d === 0) return <span className="ad-delta is-flat">no change · 30d</span>;
  return (
    <span className={`ad-delta${d < 0 ? " is-flat" : ""}`}>
      {d > 0 ? "+" : ""}
      {nf.format(d)} · 30d
    </span>
  );
}

// ── Chrome ─────────────────────────────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="ad-metrics">
      <div className="rules">
        <div className="vert l" />
        <div className="vert r" />
      </div>
      <main className="ad-main">
        <section className="ad-hero">
          <div className="eyebrow">
            Egregore <span className="dot">·</span> Adoption
          </div>
          <h1 className="display">
            Who is actually <em>using</em> this.
          </h1>
          <p className="lede">
            Organizations that installed Egregore and kept working in it —
            counted from the registry and from sessions, not from download
            badges. Our own orgs and test fixtures are excluded.
          </p>
        </section>
        {children}
        <footer>
          <span>egregore.xyz</span>
          <span>
            <a href="https://github.com/egregore-labs/egregore">Source</a>{" "}
            &nbsp; <a href="/docs">Docs</a> &nbsp;{" "}
            <a href="mailto:info@egregore.xyz">Mail us</a>
          </span>
          <span>MMXXVI</span>
        </footer>
      </main>
    </div>
  );
}

function Loading() {
  return (
    <Shell>
      <section>
        <div className="ad-empty">Reading the registry…</div>
      </section>
    </Shell>
  );
}

function Unavailable({ detail }: { detail?: string }) {
  return (
    <Shell>
      <section>
        <div className="ad-unavail">
          <span className="ad-unavail-mark">Signal lost</span>
          <h2>Adoption metrics unavailable</h2>
          <p>
            The metrics endpoint isn&apos;t answering. This is expected until{" "}
            <code>/api/v1/adoption/public</code> ships and{" "}
            <code>ADOPTION_METRICS_KEY</code> is set on the site.
          </p>
          {detail ? <span className="ad-detail">{detail}</span> : null}
        </div>
      </section>
    </Shell>
  );
}

// ── § 01 — Installs and activity ───────────────────────────────

function Headline({ d }: { d: AdoptionData }) {
  const { installs, activity, window_days } = d;
  return (
    <section>
      <div className="sec-head">
        <span className="num">§ 01</span>
        <span className="label">Installs &amp; activity</span>
        <span className="rule" />
        <span className="label">last {window_days} days</span>
      </div>
      <div className="ad-stats">
        <div className="ad-stat is-accent">
          <span className="ad-stat-label">Organizations</span>
          <span className="ad-stat-value">{nf.format(installs.total)}</span>
          <span className="ad-stat-sub">installed all-time</span>
        </div>
        <div className="ad-stat">
          <span className="ad-stat-label">New</span>
          <span className="ad-stat-value">{nf.format(installs.window)}</span>
          <span className="ad-stat-sub">in the last {window_days} days</span>
        </div>
        <div className="ad-stat is-accent">
          <span className="ad-stat-label">Active orgs</span>
          <span className="ad-stat-value">{nf.format(activity.orgs_active)}</span>
          <span className="ad-stat-sub">ran a session in window</span>
        </div>
        <div className="ad-stat">
          <span className="ad-stat-label">Active people</span>
          <span className="ad-stat-value">{nf.format(activity.users_active)}</span>
          <span className="ad-stat-sub">distinct humans</span>
        </div>
        <div className="ad-stat">
          <span className="ad-stat-label">Sessions</span>
          <span className="ad-stat-value">{nf.format(activity.sessions)}</span>
          <span className="ad-stat-sub">work sessions started</span>
        </div>
        <div className="ad-stat">
          <span className="ad-stat-label">Teams</span>
          <span className="ad-stat-value">
            {nf.format(activity.teams_multi_member)}
          </span>
          <span className="ad-stat-sub">more than one member</span>
        </div>
      </div>
      <p className="ad-note">
        <strong>What counts as an install.</strong> {installs.basis} It never
        counts people who joined someone else&apos;s org, so the real number is
        higher than this one — we would rather undercount.
      </p>
    </section>
  );
}

// ── § 02 — Series ──────────────────────────────────────────────

const SERIES: { key: keyof Omit<AdoptionPoint, "day">; label: string }[] = [
  { key: "sessions", label: "Sessions" },
  { key: "active_orgs", label: "Active orgs" },
  { key: "active_users", label: "Active people" },
  { key: "installs", label: "New installs" },
];

function Series({ points, days }: { points: AdoptionPoint[]; days: number }) {
  const peak = Math.max(
    1,
    ...points.flatMap((p) => SERIES.map((s) => p[s.key] ?? 0)),
  );
  return (
    <section>
      <div className="sec-head">
        <span className="num">§ 02</span>
        <span className="label">Over time</span>
        <span className="rule" />
        <span className="label">{days} days</span>
      </div>
      <div className="ad-chart">
        <div className="ad-chart-legend">
          {SERIES.map((s) => (
            <span key={s.key} className="ad-legend-item">
              <span className={`ad-legend-swatch ad-s-${s.key}`} />
              {s.label}
            </span>
          ))}
        </div>
        {points.length === 0 ? (
          <div className="ad-empty">No activity recorded yet.</div>
        ) : (
          <div className="ad-chart-plot">
            {points.map((p, i) => (
              <div key={p.day} className="ad-col">
                <div className="ad-col-bars">
                  {SERIES.map((s) => {
                    const v = p[s.key] ?? 0;
                    const h = Math.round((v / peak) * 100);
                    return (
                      <div
                        key={s.key}
                        className={`ad-bar ad-s-${s.key}`}
                        style={{ height: `${h}%` }}
                        title={`${fmtDate(p.day)} — ${s.label}: ${v}`}
                      />
                    );
                  })}
                </div>
                {/* Label roughly every 7th column so the axis stays legible. */}
                <span className="ad-col-date">
                  {i % 7 === 0 ? fmtDate(p.day) : " "}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ── § 03 — What people run ─────────────────────────────────────

function Commands({ commands }: { commands: AdoptionCommand[] }) {
  const peak = Math.max(1, ...commands.map((c) => c.runs));
  return (
    <section>
      <div className="sec-head">
        <span className="num">§ 03</span>
        <span className="label">What people run</span>
        <span className="rule" />
        <span className="label">commands</span>
      </div>
      {commands.length === 0 ? (
        <div className="ad-empty">No command telemetry in this window.</div>
      ) : (
        <div className="ad-rank">
          {commands.map((c) => (
            <div key={c.command} className="ad-rank-row">
              <span className="ad-rank-name">/{c.command}</span>
              <span className="ad-rank-track">
                <span
                  className="ad-rank-fill"
                  style={{ width: `${Math.round((c.runs / peak) * 100)}%` }}
                />
              </span>
              <span className="ad-rank-value">
                {nf.format(c.runs)} · {c.orgs} {c.orgs === 1 ? "org" : "orgs"}
              </span>
            </div>
          ))}
        </div>
      )}
      <p className="ad-note">
        <strong>A floor, not a census.</strong> Command telemetry is emitted
        best-effort by the agent, so these counts under-report — particularly
        for commands whose skills don&apos;t emit reliably. Session counts above
        are measured by the shell and are exact.
      </p>
    </section>
  );
}

// ── § 04 — Open source ─────────────────────────────────────────

function OpenSource({ h }: { h: Record<string, ExternalEntry> }) {
  const stars = num(h.stars);
  const forks = num(h.forks);
  const contributors = num(h.contributors);
  const prsMerged = num(h.prs_merged);
  const prsOpen = num(h.prs_open);
  const issuesOpen = num(h.issues_open);
  const organic = num(h.downloads_organic);
  const raw = num(h.downloads_raw);

  const any =
    [stars, forks, contributors, prsMerged, organic].some((v) => v !== null);

  return (
    <section>
      <div className="sec-head">
        <span className="num">§ 04</span>
        <span className="label">Open source</span>
        <span className="rule" />
        <span className="label">egregore-labs/egregore</span>
      </div>
      {!any ? (
        <div className="ad-empty">
          External signals haven&apos;t been captured yet — the daily snapshot
          job hasn&apos;t run.
        </div>
      ) : (
        <div className="ad-stats">
          {stars !== null && (
            <div className="ad-stat is-accent">
              <span className="ad-stat-label">Stars</span>
              <span className="ad-stat-value">{nf.format(stars)}</span>
              <Delta entry={h.stars} />
            </div>
          )}
          {forks !== null && (
            <div className="ad-stat">
              <span className="ad-stat-label">Forks</span>
              <span className="ad-stat-value">{nf.format(forks)}</span>
              <Delta entry={h.forks} />
            </div>
          )}
          {contributors !== null && (
            <div className="ad-stat">
              <span className="ad-stat-label">Contributors</span>
              <span className="ad-stat-value">{nf.format(contributors)}</span>
              <span className="ad-stat-sub">with merged commits</span>
            </div>
          )}
          {prsMerged !== null && (
            <div className="ad-stat">
              <span className="ad-stat-label">PRs merged</span>
              <span className="ad-stat-value">{nf.format(prsMerged)}</span>
              <span className="ad-stat-sub">
                {prsOpen !== null ? `${nf.format(prsOpen)} open` : " "}
              </span>
            </div>
          )}
          {issuesOpen !== null && (
            <div className="ad-stat">
              <span className="ad-stat-label">Issues open</span>
              <span className="ad-stat-value">{nf.format(issuesOpen)}</span>
              <span className="ad-stat-sub">on the OSS repo</span>
            </div>
          )}
          {organic !== null && (
            <div className="ad-stat">
              <span className="ad-stat-label">npm installs</span>
              <span className="ad-stat-value">{nf.format(organic)}</span>
              <span className="ad-stat-sub">30d, organic</span>
            </div>
          )}
        </div>
      )}
      {organic !== null && raw !== null && raw > organic ? (
        <p className="ad-note">
          <strong>Why npm says a bigger number.</strong> The raw 30-day count
          for <code>create-egregore</code> is {nf.format(raw)}, but{" "}
          {Math.round(((raw - organic) / raw) * 100)}% of it lands on days we
          published a release — registry mirrors re-downloading the package, not
          people installing it. We report the {nf.format(organic)} that happened
          on quiet days.
        </p>
      ) : null}
    </section>
  );
}

// ── Page ───────────────────────────────────────────────────────

export default function AdoptionMetrics() {
  const [data, setData] = useState<AdoptionData | null>(null);
  const [detail, setDetail] = useState<string | undefined>(undefined);
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

  if (loading) return <Loading />;
  if (!data) return <Unavailable detail={detail} />;

  return (
    <Shell>
      <Headline d={data} />
      <Series points={data.timeseries ?? []} days={data.series_days} />
      <Commands commands={data.commands ?? []} />
      <OpenSource h={data.external?.headline ?? {}} />
    </Shell>
  );
}
