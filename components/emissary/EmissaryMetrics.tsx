"use client";

// EmissaryMetrics — the /emissary/metrics telemetry dashboard. Client
// component: the site is a static export, so it fetches its data in the
// browser from /api/emissary-metrics — a Netlify edge function that
// injects the secret key. Rendered in the sealed-courier visual language
// of EmissaryHub; no charting library — the timeseries is plain CSS
// columns. Every theme-sensitive color is a var(--token) emitted via CSS
// class, never a hex literal in an inline style — so dark mode keeps working.

import { useEffect, useState } from "react";
import "./emissary-metrics.css";

// ── Types — mirrors the metrics endpoint contract ──────────────

export type MetricsFunnel = {
  registered: number;
  verified: number;
  published: number;
  verify_rate: number;
  publish_rate: number;
};

export type MetricsTimeseriesPoint = {
  date: string;
  register: number;
  verify: number;
  resend_verification: number;
  emissary_create: number;
};

export type MetricsEmissaries = {
  total: number;
  by_kind: Record<string, number>;
  by_distribution: Record<string, number>;
};

export type MetricsReceipts = {
  total: number;
  unique_emissaries_fetched: number;
};

export type MetricsCreator = {
  name: string;
  email: string;
  count: number;
};

export type MetricsEvent = {
  event_type: string;
  user: string;
  created_at: string;
};

export type EmissaryMetricsData = {
  funnel: MetricsFunnel;
  events_timeseries: MetricsTimeseriesPoint[];
  emissaries: MetricsEmissaries;
  receipts: MetricsReceipts;
  top_creators: MetricsCreator[];
  recent_events: MetricsEvent[];
};

// Data is fetched client-side — see the default export at the bottom.

// ── Formatting helpers ─────────────────────────────────────────

const nf = new Intl.NumberFormat("en-US");

function pct(rate: number): string {
  // accepts either 0–1 fractions or 0–100 values; normalise to percent
  const v = rate <= 1 ? rate * 100 : rate;
  return `${v.toFixed(v >= 10 || v === 0 ? 0 : 1)}%`;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function titleCase(s: string): string {
  return s.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Chrome ─────────────────────────────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="em-metrics">
      <div className="rules">
        <div className="vert l" />
        <div className="vert r" />
      </div>
      <main className="mx-main">
        <section className="mx-hero">
          <div className="eyebrow">
            Emissary Courier <span className="dot">·</span> Telemetry
          </div>
          <h1 className="display">
            The <em>dispatch</em> ledger.
          </h1>
          <p className="lede">
            Every emissary registered, verified, and sent — measured. A live
            reading of how the courier moves through the world.
          </p>
        </section>
        {children}
        <footer>
          <span>egregore.xyz</span>
          <span>
            <a href="/emissary">Courier</a> &nbsp; <a href="https://egregore.xyz">Docs</a>{" "}
            &nbsp; <a href="mailto:info@egregore.xyz">Mail us</a>
          </span>
          <span>MMXXVI</span>
        </footer>
      </main>
    </div>
  );
}

// ── Unavailable state ──────────────────────────────────────────

function Unavailable({ detail }: { detail?: string }) {
  return (
    <Shell>
      <section>
        <div className="mx-unavail">
          <span className="mx-unavail-mark">Signal lost</span>
          <h2>Metrics unavailable</h2>
          <p>
            The telemetry endpoint isn&apos;t answering right now. This is
            expected before the metrics service ships — the dashboard renders
            the moment <code>/api/v1/emissary/metrics</code> goes live.
          </p>
          {detail ? <span className="mx-detail">{detail}</span> : null}
        </div>
      </section>
    </Shell>
  );
}

// ── Funnel ─────────────────────────────────────────────────────

function Funnel({ f }: { f: MetricsFunnel }) {
  return (
    <section>
      <div className="sec-head">
        <span className="num">§ 01</span>
        <span className="label">The Funnel</span>
        <span className="rule" />
        <span className="label">register → verify → publish</span>
      </div>
      <div className="mx-funnel">
        <div className="mx-stage">
          <span className="mx-stage-label">Registered</span>
          <span className="mx-stage-value">{nf.format(f.registered)}</span>
          <span className="mx-stage-sub">identities minted</span>
        </div>
        <div className="mx-arrow">
          <span className="mx-arrow-rate">{pct(f.verify_rate)}</span>
          <span className="mx-arrow-glyph">→</span>
          <span className="mx-arrow-label">verify rate</span>
        </div>
        <div className="mx-stage">
          <span className="mx-stage-label">Verified</span>
          <span className="mx-stage-value">{nf.format(f.verified)}</span>
          <span className="mx-stage-sub">email confirmed</span>
        </div>
        <div className="mx-arrow">
          <span className="mx-arrow-rate">{pct(f.publish_rate)}</span>
          <span className="mx-arrow-glyph">→</span>
          <span className="mx-arrow-label">publish rate</span>
        </div>
        <div className="mx-stage is-final">
          <span className="mx-stage-label">Published</span>
          <span className="mx-stage-value">{nf.format(f.published)}</span>
          <span className="mx-stage-sub">emissaries sent</span>
        </div>
      </div>
    </section>
  );
}

// ── Timeseries — pure-CSS column chart ─────────────────────────

const SERIES: { key: keyof Omit<MetricsTimeseriesPoint, "date">; label: string }[] = [
  { key: "register", label: "Register" },
  { key: "verify", label: "Verify" },
  { key: "resend_verification", label: "Resend" },
  { key: "emissary_create", label: "Create" },
];

function Timeseries({ points }: { points: MetricsTimeseriesPoint[] }) {
  const peak = Math.max(
    1,
    ...points.flatMap((p) => SERIES.map((s) => p[s.key] ?? 0)),
  );
  return (
    <section>
      <div className="sec-head">
        <span className="num">§ 02</span>
        <span className="label">Activity over time</span>
        <span className="rule" />
        <span className="label">
          {points.length} {points.length === 1 ? "day" : "days"}
        </span>
      </div>
      <div className="mx-chart">
        <div className="mx-chart-legend">
          {SERIES.map((s) => (
            <span key={s.key} className="mx-legend-item">
              <span className={`mx-legend-swatch mx-s-${s.key}`} />
              {s.label}
            </span>
          ))}
        </div>
        {points.length === 0 ? (
          <div className="mx-empty">No events recorded yet.</div>
        ) : (
          <div className="mx-chart-plot">
            {points.map((p) => {
              const dayTotal = SERIES.reduce((sum, s) => sum + (p[s.key] ?? 0), 0);
              return (
                <div key={p.date} className="mx-col">
                  <span className="mx-col-total">{nf.format(dayTotal)}</span>
                  <div className="mx-col-bars">
                    {SERIES.map((s) => {
                      const v = p[s.key] ?? 0;
                      const h = Math.round((v / peak) * 100);
                      return (
                        <div
                          key={s.key}
                          className={`mx-bar mx-s-${s.key}`}
                          style={{ height: `${h}%` }}
                          title={`${s.label}: ${v}`}
                        />
                      );
                    })}
                  </div>
                  <span className="mx-col-date">{fmtDate(p.date)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

// ── Breakdown rows ─────────────────────────────────────────────

function Breakdown({
  label,
  data,
}: {
  label: string;
  data: Record<string, number>;
}) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const peak = Math.max(1, ...entries.map(([, v]) => v));
  return (
    <div className="mx-break">
      <span className="mx-break-label">{label}</span>
      {entries.length === 0 ? (
        <span className="mx-reach-sub">None yet.</span>
      ) : (
        entries.map(([name, count]) => (
          <div key={name} className="mx-row">
            <span className="mx-row-name">{titleCase(name)}</span>
            <span className="mx-row-track">
              <span
                className="mx-row-fill"
                style={{ width: `${Math.round((count / peak) * 100)}%` }}
              />
            </span>
            <span className="mx-row-count">{nf.format(count)}</span>
          </div>
        ))
      )}
    </div>
  );
}

// ── Emissaries + Reach ─────────────────────────────────────────

function Composition({
  emissaries,
  receipts,
}: {
  emissaries: MetricsEmissaries;
  receipts: MetricsReceipts;
}) {
  return (
    <section>
      <div className="sec-head">
        <span className="num">§ 03</span>
        <span className="label">Emissaries &amp; Reach</span>
        <span className="rule" />
        <span className="label">what was made · where it landed</span>
      </div>
      <div className="mx-grid">
        <div className="mx-panel">
          <div className="mx-panel-head">
            <span className="mx-panel-title">Emissaries</span>
            <span className="mx-panel-big">{nf.format(emissaries.total)}</span>
          </div>
          <Breakdown label="By kind" data={emissaries.by_kind} />
          <Breakdown label="By distribution" data={emissaries.by_distribution} />
        </div>
        <div className="mx-panel">
          <div className="mx-panel-head">
            <span className="mx-panel-title">Reach</span>
            <span className="mx-panel-big">
              {nf.format(receipts.total)}
              <span className="mx-unit">receipts</span>
            </span>
          </div>
          <Breakdown
            label="Pickups"
            data={{
              "total fetches": receipts.total,
              "unique emissaries": receipts.unique_emissaries_fetched,
            }}
          />
          <p className="mx-reach-sub">
            {nf.format(receipts.unique_emissaries_fetched)} distinct{" "}
            {receipts.unique_emissaries_fetched === 1 ? "emissary has" : "emissaries have"}{" "}
            been opened by a receiver — every fetch is a courier reaching a desk.
          </p>
        </div>
      </div>
    </section>
  );
}

// ── Top creators ───────────────────────────────────────────────

function TopCreators({ creators }: { creators: MetricsCreator[] }) {
  return (
    <section>
      <div className="sec-head">
        <span className="num">§ 04</span>
        <span className="label">Top creators</span>
        <span className="rule" />
        <span className="label">
          {creators.length} {creators.length === 1 ? "sender" : "senders"}
        </span>
      </div>
      {creators.length === 0 ? (
        <div className="mx-chart">
          <div className="mx-empty">No emissaries created yet.</div>
        </div>
      ) : (
        <div className="mx-creators">
          {creators.map((c, i) => (
            <div key={`${c.email}-${i}`} className="mx-creator">
              <span className="mx-creator-rank">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="mx-creator-id">
                <span className="mx-creator-name">{c.name || "Unnamed"}</span>
                <span className="mx-creator-email">{c.email}</span>
              </span>
              <span className="mx-creator-count">
                <strong>{nf.format(c.count)}</strong>
                {c.count === 1 ? "emissary" : "emissaries"}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ── Recent activity ────────────────────────────────────────────

function RecentActivity({ events }: { events: MetricsEvent[] }) {
  return (
    <section>
      <div className="sec-head">
        <span className="num">§ 05</span>
        <span className="label">Recent activity</span>
        <span className="rule" />
        <span className="label">
          last {events.length} {events.length === 1 ? "event" : "events"}
        </span>
      </div>
      {events.length === 0 ? (
        <div className="mx-feed">
          <div className="mx-empty">Nothing has happened yet.</div>
        </div>
      ) : (
        <div className="mx-feed">
          {events.map((e, i) => (
            <div key={`${e.created_at}-${i}`} className="mx-event">
              <span className="mx-event-dot" />
              <span className="mx-event-type">{titleCase(e.event_type)}</span>
              <span className="mx-event-user">{e.user || "—"}</span>
              <span className="mx-event-time">{fmtDateTime(e.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ── Loading state ──────────────────────────────────────────────

function Loading() {
  return (
    <Shell>
      <section>
        <div className="mx-unavail">
          <span className="mx-unavail-mark">Reading</span>
          <h2>Gathering the ledger…</h2>
          <p>Pulling the latest dispatch figures.</p>
        </div>
      </section>
    </Shell>
  );
}

// ── Page ───────────────────────────────────────────────────────
//
// Client component. The site is a static export with no server runtime,
// so the dashboard fetches its data in the browser from
// /api/emissary-metrics — a Netlify edge function that adds the secret
// X-Emissary-Metrics-Key header. The key never reaches the browser.

export default function EmissaryMetrics() {
  const [data, setData] = useState<EmissaryMetricsData | null>(null);
  const [detail, setDetail] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch("/api/emissary-metrics", { cache: "no-store" });
        if (!resp.ok) {
          if (!cancelled) {
            setDetail(`Metrics endpoint returned HTTP ${resp.status}.`);
            setLoading(false);
          }
          return;
        }
        const json = (await resp.json()) as EmissaryMetricsData;
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
      <Funnel f={data.funnel} />
      <Timeseries points={data.events_timeseries ?? []} />
      <Composition emissaries={data.emissaries} receipts={data.receipts} />
      <TopCreators creators={data.top_creators ?? []} />
      <RecentActivity events={data.recent_events ?? []} />
    </Shell>
  );
}
