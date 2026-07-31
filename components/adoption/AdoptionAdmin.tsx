"use client";

// AdoptionAdmin — /adoption/admin. The diligence surface.
//
// Built around one question: who is actually using this, and how do you
// know? So the centrepiece is a named evidence table, not stat tiles.
// Aggregate counts ("11 active orgs") are unfalsifiable to an outsider and
// uninformative to us — the first thing anyone asks is "who?", and the
// answer has to be a list with dates on it.
//
// active_days is the column that matters. 349 sessions across 76 days is a
// habit; 7 sessions in one afternoon is a trial. Both are real and they are
// not the same claim, so the table shows both rather than collapsing them
// into one number.
//
// Identity comes from memberships -> users (the `people` field), never from
// orgs.created_by — that column is NULL for 7 orgs and hid a live client
// from this very board while he sat in the database the whole time.
//
// Auth: GitHub token straight to Railway, checked against ADMIN_USERS
// server-side. Deliberately not PasswordGate, which ships its password in
// the bundle — this page carries other organisations' names.

import { useCallback, useEffect, useState } from "react";
import { TOKEN_KEY } from "../desk/api";
import { getGitHubAuthUrl } from "../setup/api";
import "./adoption-metrics.css";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://egregore-production-55f2.up.railway.app";

type OrgRow = {
  slug: string;
  name: string | null;
  created_by: string | null;
  people: string | null;
  created_at: string;
  is_internal: boolean;
  members: number;
  sessions_window: number;
  sessions_total: number;
  active_days: number;
  users: number;
  handoffs: number;
  artifacts: number;
  knowledge_writes: number;
  signal: "active" | "lost" | "none";
  first_seen: string | null;
  last_activity: string | null;
  commands: string | null;
  framework_version: string | null;
  platform: string | null;
};

type Summary = {
  installs_total: number;
  installs_window: number;
  orgs_ever_active: number;
  orgs_active_window: number;
  users_active_window: number;
  sessions_window: number;
  teams_multi_member: number;
};

type VersionRow = {
  framework_version: string;
  platform: string;
  orgs: number;
  users: number;
  last_seen: string | null;
};

type AdminData = {
  window_days: number;
  summary: { external: Summary; all: Summary; internal_orgs: number };
  orgs: OrgRow[];
  versions: VersionRow[];
  coverage: { installs_observed: number; orgs_ever_reporting: number };
  timeseries?: {
    external: { day: string; installs: number; active_orgs: number; active_users: number; sessions: number }[];
    all: { day: string; installs: number; active_orgs: number; active_users: number; sessions: number }[];
  };
  external?: Record<
    string,
    Record<string, Record<string, { value: number | null }>>
  >;
};

const nf = new Intl.NumberFormat("en-US");

function day(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function ago(iso: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}

// Status comes from `signal` (see migration 035), not from absence of data.
// The old logic printed "never ran" whenever last_activity was null, which
// asserted the customer did nothing. We cannot know that: bin/init-gh.sh
// installs never register, DO_NOT_TRACK hides everything, and five orgs have
// health check-ins with zero session_start events — a check-in fires AT
// session start, so those provably ran and we lost the record.
function status(o: OrgRow): { label: string; cls: string; title: string } {
  if (o.is_internal)
    return { label: "ours", cls: "is-ours", title: "Our own org or a test fixture" };
  if (o.signal === "lost")
    return {
      label: "signal lost",
      cls: "is-warn",
      title:
        "Provably ran — health check-ins or other telemetry exist — but no session events reached us. Our instrumentation failed, not their usage.",
    };
  if (o.signal === "none")
    return {
      label: "unknown",
      cls: "is-unknown",
      title:
        "No telemetry of any kind. They may be using Egregore via an untracked install path (bin/init-gh.sh never registers) or with DO_NOT_TRACK set. We cannot tell.",
    };
  const d = ago(o.last_activity);
  if (d === null) return { label: "unknown", cls: "is-unknown", title: "No activity recorded" };
  if (o.active_days >= 10 && d <= 14)
    return { label: "using it", cls: "is-live", title: `${o.active_days} active days` };
  if (d <= 14)
    return { label: "trialling", cls: "is-trial", title: `${o.active_days} active day(s), last seen ${d}d ago` };
  return { label: `quiet ${d}d`, cls: "is-gone", title: `Last active ${d} days ago` };
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="ad">
      <main className="ad-main">
        <div className="ad-head">
          <span className="ad-head-mark">egregore</span>
          <span className="ad-head-sep">/</span>
          <span className="ad-head-label">Adoption · internal</span>
          <span className="ad-head-right">
            {new Date().toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
        {children}
        <footer>
          <span>egregore.xyz · internal</span>
          <span>
            <a href="/desk">Desk</a> &nbsp; <a href="/adoption">Public board</a>
          </span>
          <span>MMXXVI</span>
        </footer>
      </main>
    </div>
  );
}

function SignIn({ detail, onToken }: { detail?: string; onToken: () => void }) {
  const [token, setToken] = useState("");
  // OAuth builds redirect_uri from window.location.origin, and only
  // egregore.xyz is registered on the GitHub App — so on a Netlify deploy
  // preview GitHub refuses with "redirect_uri is not associated with this
  // application". Rather than register every ephemeral preview domain on
  // the production OAuth app, allow pasting a token directly. Same storage
  // and same server-side ADMIN_USERS check as the OAuth path; it only skips
  // the browser round-trip that the preview domain breaks.
  const isPreview =
    typeof window !== "undefined" &&
    !/^https:\/\/(www\.)?egregore\.xyz$/.test(window.location.origin);

  function save() {
    const t = token.trim();
    if (!t) return;
    window.sessionStorage.setItem(TOKEN_KEY, t);
    setToken("");
    onToken();
  }

  return (
    <Shell>
      <section>
        <div className="ad-panel">
          <span className="ad-mark">Restricted</span>
          <h2>Sign in to continue</h2>
          <p>
            This page carries other organisations&apos; names and activity. It
            is limited to Egregore admins.
          </p>
          {detail ? <span className="ad-detail">{detail}</span> : null}
          <br />
          <a className="ad-btn" href={getGitHubAuthUrl("/adoption/admin")}>
            Sign in with GitHub
          </a>

          <div
            style={{
              marginTop: 30,
              paddingTop: 22,
              borderTop: "1px solid var(--line)",
              maxWidth: 460,
              marginInline: "auto",
            }}
          >
            <p style={{ fontSize: 13, marginBottom: 12 }}>
              {isPreview
                ? "GitHub sign-in only works on egregore.xyz — this preview domain isn't registered on the OAuth app. Paste a GitHub token instead."
                : "Or paste a GitHub token."}
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && save()}
                placeholder="ghp_…"
                aria-label="GitHub token"
                style={{
                  flex: 1,
                  fontFamily: "var(--mono)",
                  fontSize: 12,
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--line-2)",
                  background: "var(--bg)",
                  color: "var(--ink)",
                }}
              />
              <button
                className="ad-btn"
                style={{ marginTop: 0, whiteSpace: "nowrap" }}
                onClick={save}
              >
                Use token
              </button>
            </div>
            <span className="ad-detail">
              Kept in this tab only (sessionStorage). The API still checks it
              against the admin list.
            </span>
          </div>
        </div>
      </section>
    </Shell>
  );
}

export default function AdoptionAdmin() {
  const [data, setData] = useState<AdminData | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [detail, setDetail] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [showOurs, setShowOurs] = useState(false);
  const [windowDays, setWindowDays] = useState(30);
  // Drill-down. Clicking any number or chart segment narrows the table below
  // rather than opening a modal — one surface, always the same one, so the
  // user never loses their place.
  const [focus, setFocus] = useState<{ label: string; test: (o: OrgRow) => boolean } | null>(null);
  const [page, setPage] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const PAGE = 10;

  // Drilling down from a chart must land the user on the result, otherwise
  // the table is off-screen and the click reads as a no-op.
  function drill(label: string, test: (o: OrgRow) => boolean) {
    setFocus({ label, test });
    setPage(0);
    requestAnimationFrame(() =>
      document.getElementById("orgs")?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }

  const load = useCallback(async () => {
    setRefreshing(true);
    const token =
      typeof window !== "undefined"
        ? window.sessionStorage.getItem(TOKEN_KEY)
        : null;
    if (!token) {
      setNeedsAuth(true);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const resp = await fetch(`${API_URL}/api/admin/adoption?window_days=${windowDays}&series_days=${Math.max(windowDays, 14)}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (resp.status === 401 || resp.status === 403) {
        setNeedsAuth(true);
        setDetail(
          resp.status === 403
            ? "That account is not on the admin list."
            : "Session expired — sign in again.",
        );
        setLoading(false);
      setRefreshing(false);
        return;
      }
      if (!resp.ok) {
        setDetail(`Endpoint returned HTTP ${resp.status}.`);
        setLoading(false);
      setRefreshing(false);
        return;
      }
      setData((await resp.json()) as AdminData);
      setLoading(false);
      setRefreshing(false);
    } catch {
      setDetail("Could not reach the API.");
      setLoading(false);
      setRefreshing(false);
    }
  }, [windowDays]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading)
    return (
      <Shell>
        <section>
          <div className="ad-empty">Reading the registry…</div>
        </section>
      </Shell>
    );
  if (needsAuth)
    return (
      <SignIn
        detail={detail}
        onToken={() => {
          setNeedsAuth(false);
          setDetail(undefined);
          setLoading(true);
          void load();
        }}
      />
    );
  if (!data)
    return (
      <Shell>
        <section>
          <div className="ad-panel">
            <span className="ad-mark">Signal lost</span>
            <h2>Adoption data unavailable</h2>
            {detail ? <span className="ad-detail">{detail}</span> : null}
          </div>
        </section>
      </Shell>
    );

  const ext = showOurs ? data.summary.all : data.summary.external;
  const all = data.orgs
    .filter((o) => showOurs || !o.is_internal)
    .filter((o) => (focus ? focus.test(o) : true));
  const withUse = all.filter((o) => o.sessions_total > 0);
  const returned = withUse.filter((o) => o.active_days > 1).length;
  const deepest = Math.max(1, ...withUse.map((o) => o.active_days));
  const extOrgs = data.orgs.filter((o) => showOurs || !o.is_internal);

  // ── Derived series. All computed from rows already fetched — the API
  // returns one payload and every chart is a view over it, so filtering
  // never costs a round trip.
  const month = (iso: string) => (iso || "").slice(0, 7);
  const winLabel = windowDays === 30 ? "30 days" : windowDays === 90 ? "90 days" : "12 months";

  // 1. cohort activation — the chart that stops 71→18 being misread
  const cohorts = Array.from(
    extOrgs.reduce((m, o) => {
      const k = month(o.created_at);
      const c = m.get(k) || { m: k, active: 0, lost: 0, none: 0, total: 0 };
      c[o.signal] += 1;
      c.total += 1;
      m.set(k, c);
      return m;
    }, new Map<string, { m: string; active: number; lost: number; none: number; total: number }>()),
  )
    .map(([, v]) => v)
    .sort((a, b) => a.m.localeCompare(b.m));
  const cohortPeak = Math.max(1, ...cohorts.map((c) => c.total));

  // 2. time to first session — you win or lose people during the install
  const TTF = [
    { k: "hour", label: "Within the hour" },
    { k: "day", label: "Same day" },
    { k: "week", label: "Within a week" },
    { k: "later", label: "Later" },
    { k: "never", label: "Never" },
  ] as const;
  function ttfBucket(o: OrgRow): string {
    if (!o.first_seen) return "never";
    const d = new Date(o.first_seen).getTime() - new Date(o.created_at).getTime();
    if (d < 3_600_000) return "hour";
    if (d < 86_400_000) return "day";
    if (d < 7 * 86_400_000) return "week";
    return "later";
  }
  const ttf = TTF.map((t) => ({
    ...t,
    n: extOrgs.filter((o) => ttfBucket(o) === t.k).length,
  }));
  const ttfPeak = Math.max(1, ...ttf.map((t) => t.n));

  // 3. depth — active days, the honest adoption signal
  const depth = [...extOrgs]
    .filter((o) => o.active_days > 0)
    .sort((a, b) => b.active_days - a.active_days)
    .slice(0, 8);

  // 4. sessions over time — weekly buckets from the daily series
  const series = data.timeseries?.external ?? [];
  const weeks: { w: string; n: number }[] = [];
  series.forEach((p, i) => {
    if (i % 7 === 0) weeks.push({ w: p.day, n: 0 });
    if (weeks.length) weeks[weeks.length - 1].n += p.sessions || 0;
  });
  const weekPeak = Math.max(1, ...weeks.map((w) => w.n));

  // 5. coverage — every other chart rests on this
  const cov = {
    active: extOrgs.filter((o) => o.signal === "active").length,
    lost: extOrgs.filter((o) => o.signal === "lost").length,
    none: extOrgs.filter((o) => o.signal === "none").length,
  };

  // Totals computed from the rows we already have — no extra request.
  const act = {
    egregores: extOrgs.length,
    sessions: extOrgs.reduce((n, o) => n + (o.sessions_total || 0), 0),
    handoffs: extOrgs.reduce((n, o) => n + (o.handoffs || 0), 0),
    handoffOrgs: extOrgs.filter((o) => (o.handoffs || 0) > 0).length,
    artifacts: extOrgs.reduce((n, o) => n + (o.artifacts || 0), 0),
    artifactOrgs: extOrgs.filter((o) => (o.artifacts || 0) > 0).length,
    knowledge: extOrgs.reduce((n, o) => n + (o.knowledge_writes || 0), 0),
    knowledgeOrgs: extOrgs.filter((o) => (o.knowledge_writes || 0) > 0).length,
  };
  const npm = data.external?.npm?.["create-egregore"];
  const npmRaw = npm?.downloads_raw?.value ?? null;
  const npmOrganic = npm?.downloads_organic?.value ?? null;

  return (
    <Shell>
      <section className="ad-hero">
        <h1>
          Who is actually <em>using</em> this.
        </h1>
        <p>
          Every organisation that registered, what they did, and when they last
          showed up. Named, unfiltered, straight from the registry and the
          session log.
        </p>
      </section>

      <div className="ad-filters">
        <div className="ad-fgroup">
          <span className="ad-flabel">Window</span>
          {[30, 90, 365].map((d) => (
            <button key={d} className={`ad-pill${windowDays === d ? " on" : ""}`} onClick={() => setWindowDays(d)}>
              {d === 365 ? "1y" : `${d}d`}
            </button>
          ))}
        </div>
        <div className="ad-fgroup">
          <span className="ad-flabel">Scope</span>
          <button className={`ad-pill${!showOurs ? " on" : ""}`} onClick={() => { setShowOurs(false); setPage(0); }}>External</button>
          <button className={`ad-pill${showOurs ? " on" : ""}`} onClick={() => { setShowOurs(true); setPage(0); }}>Include ours</button>
        </div>
        <div className="ad-fgroup">
          <span className="ad-flabel">Signal</span>
          {(["active", "lost", "none"] as const).map((sig) => (
            <button
              key={sig}
              className={`ad-pill${focus?.label === sig ? " on" : ""}`}
              onClick={() =>
                focus?.label === sig ? setFocus(null) : drill(sig, (o) => o.signal === sig)
              }
            >
              {sig === "none" ? "unknown" : sig}
            </button>
          ))}
        </div>
        {refreshing ? (
          <span className="ad-loading" style={{ marginLeft: "auto" }}>
            <span className="ad-spin" /> loading…
          </span>
        ) : null}
        {focus ? (
          <span className="ad-focus">
            showing: {focus.label}
            <button onClick={() => setFocus(null)} aria-label="Clear filter">×</button>
          </span>
        ) : null}
      </div>

      <section>
        <div className="ad-sec">
          <span className="ad-sec-num">§ 01</span>
          <span className="ad-sec-label">The funnel</span>
          <span className="ad-sec-rule" />
          <span className="ad-sec-label">external only</span>
        </div>
        <div className={`ad-funnel${refreshing ? " ad-stale" : ""}`}>
          <div
            className="ad-step ad-clickable"
            onClick={() => drill("registered", () => true)}
            title="Click to list these organisations"
          >
            <span className="ad-step-n">{nf.format(ext.installs_total)}</span>
            <span className="ad-step-l">Registered · all time</span>
            <span className="ad-step-s">{nf.format(ext.installs_window)} in the last {winLabel}</span>
          </div>
          <div
            className="ad-step ad-clickable"
            onClick={() => drill("ran a session", (o) => o.sessions_total > 0)}
            title="Click to list these organisations"
          >
            <span className="ad-step-n">{nf.format(ext.orgs_ever_active)}</span>
            <span className="ad-step-l">Ran a session · all time</span>
            <span className="ad-step-s">
              {ext.installs_total - ext.orgs_ever_active} never started
            </span>
          </div>
          <div
            className="ad-step is-key ad-clickable"
            onClick={() => drill("returned", (o) => o.active_days > 1)}
            title="Click to list these organisations"
          >
            <span className="ad-step-n">{nf.format(returned)}</span>
            <span className="ad-step-l">Came back · all time</span>
            <span className="ad-step-s">active on more than one day</span>
          </div>
          <div className="ad-step is-key">
            <span className="ad-step-n">
              {nf.format(ext.orgs_active_window)}
            </span>
            <span className="ad-step-l">Active in {winLabel}</span>
            <span className="ad-step-s">
              {nf.format(ext.users_active_window)} people ·{" "}
              {nf.format(ext.sessions_window)} sessions
            </span>
          </div>
        </div>
        <p className="ad-note">
          <strong>Read the drop-off, not the first number.</strong> Registering
          costs nothing and proves nothing. Coming back on a second day is the
          first honest signal, and staying past a fortnight is the only one
          that means anything.
        </p>
      </section>

      <section>
        <div className="ad-sec">
          <span className="ad-sec-num">§ 02</span>
          <span className="ad-sec-label">Charts</span>
          <span className="ad-sec-rule" />
          <span className="ad-sec-label">click any bar to list the orgs</span>
        </div>
        <div className={`ad-charts${refreshing ? " ad-stale" : ""}`}>
          <div className="ad-chart">
            <h4>Activation by registration month</h4>
            <div className="sub">All time, by month of registration — the window filter does not apply here.</div>
            <div className="ad-cols">
              {cohorts.map((c) => (
                <div key={c.m} className="ad-colw">
                  <div className="ad-stack" style={{ height: `${Math.round((c.total / cohortPeak) * 100)}%` }}>
                    {(["active", "lost", "none"] as const).map((k) =>
                      c[k] ? (
                        <div
                          key={k}
                          className={`ad-seg ${k}`}
                          style={{ flex: c[k] }}
                          title={`${c.m} · ${k === "none" ? "unknown" : k}: ${c[k]}`}
                          onClick={() =>
                            drill(
                              `${c.m} · ${k === "none" ? "unknown" : k}`,
                              (o) => o.created_at.slice(0, 7) === c.m && o.signal === k,
                            )
                          }
                        />
                      ) : null,
                    )}
                  </div>
                  <span className="ad-collabel">{c.m.slice(5)}</span>
                </div>
              ))}
            </div>
            <div className="ad-legend">
              <span className="ad-lg"><span className="ad-swatch active" />active</span>
              <span className="ad-lg"><span className="ad-swatch lost" />signal lost</span>
              <span className="ad-lg"><span className="ad-swatch none" />unknown</span>
            </div>
          </div>

          <div className="ad-chart">
            <h4>Time from registering to first session</h4>
            <div className="sub">All time. If they don&apos;t start on the first day, they almost never start.</div>
            <div className="ad-hbars">
              {ttf.map((t) => (
                <div
                  key={t.k}
                  className="ad-hrow"
                  onClick={() => drill(t.label, (o) => ttfBucket(o) === t.k)}
                  title="Click to list these organisations"
                >
                  <span className="ad-hlabel">{t.label}</span>
                  <span className="ad-htrack">
                    <span
                      className={`ad-hfill${t.k === "never" ? " dim" : t.k === "hour" ? " deep" : ""}`}
                      style={{ width: `${Math.round((t.n / ttfPeak) * 100)}%` }}
                    />
                  </span>
                  <span className="ad-hval">{t.n}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="ad-chart">
            <h4>Depth — active days per organisation</h4>
            <div className="sub">All time, in days they showed up rather than sessions. Top 8.</div>
            <div className="ad-hbars">
              {depth.map((o) => (
                <div
                  key={o.slug}
                  className="ad-hrow"
                  onClick={() => drill(o.slug, (x) => x.slug === o.slug)}
                  title={`${o.sessions_total} sessions`}
                >
                  <span className="ad-hlabel">{o.slug}</span>
                  <span className="ad-htrack">
                    <span
                      className={`ad-hfill${o.active_days >= 10 ? " deep" : ""}`}
                      style={{ width: `${Math.round((o.active_days / deepest) * 100)}%` }}
                    />
                  </span>
                  <span className="ad-hval">{o.active_days}d</span>
                </div>
              ))}
            </div>
          </div>

          <div className="ad-chart">
            <h4>Sessions per week — external</h4>
            <div className="sub">Last {winLabel} · {weeks.length} weeks. Follows the window filter.</div>
            <div className="ad-spark">
              {weeks.map((w) => (
                <span
                  key={w.w}
                  className="ad-sbar"
                  style={{ height: `${Math.max(2, Math.round((w.n / weekPeak) * 100))}%` }}
                  title={`week of ${w.w}: ${w.n} sessions`}
                />
              ))}
            </div>
            <div className="ad-legend">
              <span className="ad-lg">peak {weekPeak}/wk</span>
              <span className="ad-lg">
                coverage: {cov.active} seen · {cov.lost} lost · {cov.none} unknown
              </span>
            </div>
          </div>
        </div>
        <p className="ad-note">
          <strong>Every chart here rests on coverage.</strong> We can only see{" "}
          {cov.active} of {extOrgs.length} external orgs directly. {cov.lost} ran
          Egregore and their events never reached us; {cov.none} left no signal at
          all. Read every line above as a floor.
        </p>
      </section>

      <section>
        <div className="ad-sec">
          <span className="ad-sec-num">§ 03</span>
          <span className="ad-sec-label">Activity</span>
          <span className="ad-sec-rule" />
          <span className="ad-sec-label">external, all time</span>
        </div>
        <div className="ad-funnel">
          <div className="ad-step">
            <span className="ad-step-n">{nf.format(act.egregores)}</span>
            <span className="ad-step-l">Egregores</span>
            <span className="ad-step-s">registered</span>
          </div>
          <div className="ad-step is-key">
            <span className="ad-step-n">{nf.format(act.sessions)}</span>
            <span className="ad-step-l">Sessions</span>
            <span className="ad-step-s">work sessions started</span>
          </div>
          <div className="ad-step">
            <span className="ad-step-n">{nf.format(act.handoffs)}</span>
            <span className="ad-step-l">Handoffs</span>
            <span className="ad-step-s">
              across {act.handoffOrgs} {act.handoffOrgs === 1 ? "org" : "orgs"}
            </span>
          </div>
          <div className="ad-step is-key">
            <span className="ad-step-n">{nf.format(act.knowledge)}</span>
            <span className="ad-step-l">Knowledge written</span>
            <span className="ad-step-s">
              across {act.knowledgeOrgs}{" "}
              {act.knowledgeOrgs === 1 ? "org" : "orgs"}
            </span>
          </div>
          <div className="ad-step">
            <span className="ad-step-n">{nf.format(act.artifacts)}</span>
            <span className="ad-step-l">Published here</span>
            <span className="ad-step-s">hosted on egregore.xyz</span>
          </div>
        </div>
        <p className="ad-note">
          <strong>Written and published are different things.</strong>{" "}
          {nf.format(act.knowledge)} knowledge writes — wraps, reflects,
          handoffs, meetings — happened across {act.knowledgeOrgs} external
          orgs. Those land as markdown in each org&apos;s own memory repo, on
          their own GitHub, which we cannot read and should not. That is the
          product working as designed.{" "}
          {act.artifacts === 0
            ? "Zero were published to our hosting, which measures our surface, not their behaviour."
            : `${nf.format(act.artifacts)} were also published to our hosting.`}{" "}
          Command telemetry is agent-emitted, so treat the write count as a
          floor.
        </p>
      </section>

      <section>
        <div className="ad-sec">
          <span className="ad-sec-num">§ 03</span>
          <span className="ad-sec-label">Activation</span>
          <span className="ad-sec-rule" />
          <span className="ad-sec-label">last {data.window_days} days</span>
        </div>
        <div className="ad-funnel">
          <div className="ad-step">
            <span className="ad-step-n">{nf.format(ext.installs_window)}</span>
            <span className="ad-step-l">Registered</span>
            <span className="ad-step-s">setup completed, org created</span>
          </div>
          <div className="ad-step is-key">
            <span className="ad-step-n">{nf.format(ext.orgs_active_window)}</span>
            <span className="ad-step-l">Ran a session</span>
            <span className="ad-step-s">
              {ext.installs_window
                ? `${Math.round((ext.orgs_active_window / ext.installs_window) * 100)}% activation`
                : "—"}
            </span>
          </div>
        </div>
        <p className="ad-note">
          <strong>npm downloads are deliberately not in this funnel.</strong>{" "}
          The raw 30-day count for <code>create-egregore</code> is{" "}
          {npmRaw !== null ? nf.format(npmRaw) : "—"}, and{" "}
          {npmOrganic !== null ? nf.format(npmOrganic) : "—"} with publish days
          excluded — but <strong>82 distinct versions</strong> were downloaded
          in a single week, including releases months old that nobody installs
          by hand. Excluding publish days removes the release spike, not the
          scanner baseline underneath. Setting that number beside registrations
          invents a collapse that never happened: those were never people.
          There is no cleaning threshold at which npm becomes a count of
          installs, so it is not treated as one.
        </p>
      </section>

      <section id="orgs">
        <div className="ad-sec">
          <span className="ad-sec-num">§ 05</span>
          <span className="ad-sec-label">
            {focus ? `Organisations · ${focus.label}` : "Every organisation"}
          </span>
          <span className="ad-sec-rule" />
          {/* A narrowed table must never read as the whole list. */}
          <span className="ad-sec-label">{all.length} shown</span>
          {focus ? (
            <button
              className="ad-btn"
              style={{ marginTop: 0, padding: "5px 12px", fontSize: 10 }}
              onClick={() => setFocus(null)}
            >
              Clear filter
            </button>
          ) : null}
        </div>
        <div className="ad-tablewrap">
          <table>
            <thead>
              <tr>
                <th>Organisation</th>
                <th>People</th>
                <th className="num">Active days</th>
                <th style={{ width: 110 }}>Depth</th>
                <th className="num">Sessions</th>
                <th className="num">Handoffs</th>
                <th>First</th>
                <th>Last</th>
                <th>Status</th>
                <th>Commands used</th>
              </tr>
            </thead>
            <tbody>
              {all.slice(page * PAGE, page * PAGE + PAGE).map((o) => {
                const s = status(o);
                return (
                  <tr key={o.slug}>
                    <td>
                      <span className="ad-org">{o.slug}</span>
                    </td>
                    <td>
                      <span className="ad-who">{o.people || "—"}</span>
                    </td>
                    <td className="num">
                      <span className={o.active_days > 1 ? "ad-num" : "ad-dim"}>
                        {o.active_days || "—"}
                      </span>
                    </td>
                    <td>
                      <span className="ad-bartrack">
                        <span
                          className={`ad-bar${o.active_days >= 10 ? " is-deep" : ""}`}
                          style={{
                            width: `${Math.round((o.active_days / deepest) * 100)}%`,
                          }}
                        />
                      </span>
                    </td>
                    <td className="num">
                      {o.sessions_total ? nf.format(o.sessions_total) : "—"}
                    </td>
                    <td className="num ad-dim">{o.handoffs || "—"}</td>
                    <td className="ad-who">{day(o.first_seen)}</td>
                    <td className="ad-who">{day(o.last_activity)}</td>
                    <td>
                      <span className={`ad-chip ${s.cls}`} title={s.title}>
                        {s.label}
                      </span>
                    </td>
                    <td className="ad-who">
                      {o.commands
                        ? o.commands
                            .split(", ")
                            .slice(0, 6)
                            .map((c) => `/${c}`)
                            .join(" ")
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {all.length > PAGE ? (
            <div className="ad-pager">
              <span>
                {page * PAGE + 1}–{Math.min((page + 1) * PAGE, all.length)} of {all.length}
              </span>
              <span className="grp">
                <button className="ad-pill" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                  ← prev
                </button>
                <button
                  className="ad-pill"
                  disabled={(page + 1) * PAGE >= all.length}
                  onClick={() => setPage((p) => p + 1)}
                >
                  next →
                </button>
              </span>
            </div>
          ) : null}
        </div>
        <p className="ad-note">
          <strong>People come from memberships, not the registering handle.</strong>{" "}
          <code>created_by</code> is empty on seven orgs — keying on it is what
          hid a live install from this board while it sat in the database.
        </p>
      </section>

      <section>
        <div className="ad-sec">
          <span className="ad-sec-num">§ 06</span>
          <span className="ad-sec-label">Versions in the wild</span>
          <span className="ad-sec-rule" />
          <span className="ad-sec-label">of those reporting</span>
        </div>
        {data.versions.length === 0 ? (
          <div className="ad-empty">No check-ins recorded.</div>
        ) : (
          <div className="ad-tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Framework</th>
                  <th>Platform</th>
                  <th className="num">Orgs</th>
                  <th className="num">Users</th>
                  <th>Last seen</th>
                </tr>
              </thead>
              <tbody>
                {data.versions.map((v, i) => (
                  <tr key={`${v.framework_version}-${v.platform}-${i}`}>
                    <td>v{v.framework_version}</td>
                    <td className="ad-who">{v.platform}</td>
                    <td className="num">{v.orgs}</td>
                    <td className="num">{v.users}</td>
                    <td className="ad-who">{day(v.last_seen)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <div className="ad-sec">
          <span className="ad-sec-num">§ 07</span>
          <span className="ad-sec-label">What this cannot see</span>
          <span className="ad-sec-rule" />
        </div>
        <p className="ad-note">
          <strong>
            {data.coverage.orgs_ever_reporting} of{" "}
            {data.coverage.installs_observed} registered orgs have ever sent
            telemetry.
          </strong>{" "}
          Installs made through <code>bin/init-gh.sh</code> — the{" "}
          <code>gh</code> option in the public docs — never register, and until
          recently their sessions were discarded on arrival without a trace.
          That is now recorded, so the size of the gap becomes knowable rather
          than assumed. Anyone with <code>DO_NOT_TRACK</code> set is invisible
          by design. Every figure above is a floor.
        </p>
      </section>
    </Shell>
  );
}
