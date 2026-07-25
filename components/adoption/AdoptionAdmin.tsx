"use client";

// AdoptionAdmin — the internal god's-eye adoption view at /adoption/admin.
//
// Auth differs from the public board on purpose. The public page is fronted
// by a Netlify edge function holding a shared secret, because it has nothing
// sensitive in it. This one carries org slugs, creator handles and per-org
// activity, so it is gated on a real GitHub token: the browser sends
// Authorization: Bearer <token> straight to the Railway API, which checks
// membership in ADMIN_USERS server-side (api/auth.py). Same pattern and same
// sessionStorage key as /desk, so signing into one signs into the other.
//
// Note the API is called at its absolute origin rather than through a
// Netlify proxy — CORS on the API already allows egregore.xyz with the
// Authorization header, and this avoids exposing /api/admin/* on the site.

import { useCallback, useEffect, useState } from "react";
import { TOKEN_KEY } from "../desk/api";
import { getGitHubAuthUrl } from "../setup/api";
import "./adoption-metrics.css";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://egregore-production-55f2.up.railway.app";

// ── Types — mirrors get_admin_adoption() ───────────────────────

type Summary = {
  installs_total: number;
  installs_window: number;
  orgs_ever_active: number;
  orgs_active_window: number;
  users_active_window: number;
  sessions_window: number;
  teams_multi_member: number;
};

type OrgRow = {
  slug: string;
  name: string | null;
  created_by: string | null;
  created_at: string;
  is_internal: boolean;
  members: number;
  sessions_window: number;
  last_activity: string | null;
  framework_version: string | null;
  platform: string | null;
};

type VersionRow = {
  framework_version: string;
  platform: string;
  orgs: number;
  users: number;
  last_seen: string | null;
};

type CommandRow = { command: string; runs: number; orgs: number };

type AdminData = {
  window_days: number;
  summary: { external: Summary; all: Summary; internal_orgs: number };
  orgs: OrgRow[];
  versions: VersionRow[];
  commands: { external: CommandRow[]; all: CommandRow[] };
  coverage: {
    installs_observed: number;
    orgs_ever_reporting: number;
    reporting_rate: number | null;
    note: string;
  };
};

const nf = new Intl.NumberFormat("en-US");

function fmtWhen(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

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
            Egregore <span className="dot">·</span> Adoption <span className="dot">·</span> Internal
          </div>
          <h1 className="display">
            The <em>whole</em> picture.
          </h1>
          <p className="lede">
            Every registered organization, including our own and the test
            fixtures. Numbers here are unfiltered — the public board shows the
            external subset.
          </p>
        </section>
        {children}
        <footer>
          <span>egregore.xyz · internal</span>
          <span>
            <a href="/adoption">Public board</a> &nbsp; <a href="/desk">Desk</a>
          </span>
          <span>MMXXVI</span>
        </footer>
      </main>
    </div>
  );
}

function SignIn({ detail }: { detail?: string }) {
  return (
    <Shell>
      <section>
        <div className="ad-signin">
          <span className="ad-unavail-mark">Restricted</span>
          <h2
            style={{
              fontFamily: "var(--ad-serif)",
              fontSize: 24,
              fontWeight: 500,
              margin: "12px 0 10px",
            }}
          >
            Sign in to continue
          </h2>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--muted)" }}>
            This view carries other organizations&apos; names and activity. It
            is limited to Egregore admins.
          </p>
          {detail ? <span className="ad-detail">{detail}</span> : null}
          <br />
          <a className="ad-btn" href={getGitHubAuthUrl("/adoption/admin")}>
            Sign in with GitHub
          </a>
        </div>
      </section>
    </Shell>
  );
}

function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className={`ad-stat${accent ? " is-accent" : ""}`}>
      <span className="ad-stat-label">{label}</span>
      <span className="ad-stat-value">
        {typeof value === "number" ? nf.format(value) : value}
      </span>
      {sub ? <span className="ad-stat-sub">{sub}</span> : null}
    </div>
  );
}

export default function AdoptionAdmin() {
  const [data, setData] = useState<AdminData | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [detail, setDetail] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [showInternal, setShowInternal] = useState(true);

  const load = useCallback(async () => {
    const token =
      typeof window !== "undefined"
        ? window.sessionStorage.getItem(TOKEN_KEY)
        : null;
    if (!token) {
      setNeedsAuth(true);
      setLoading(false);
      return;
    }
    try {
      const resp = await fetch(`${API_URL}/api/admin/adoption`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (resp.status === 401 || resp.status === 403) {
        setNeedsAuth(true);
        setDetail(
          resp.status === 403
            ? "That account is not on the admin list."
            : "Session expired.",
        );
        setLoading(false);
        return;
      }
      if (!resp.ok) {
        setDetail(`Endpoint returned HTTP ${resp.status}.`);
        setLoading(false);
        return;
      }
      setData((await resp.json()) as AdminData);
      setLoading(false);
    } catch {
      setDetail("Could not reach the API.");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <Shell>
        <section>
          <div className="ad-empty">Loading…</div>
        </section>
      </Shell>
    );
  }
  if (needsAuth) return <SignIn detail={detail} />;
  if (!data) {
    return (
      <Shell>
        <section>
          <div className="ad-unavail">
            <span className="ad-unavail-mark">Signal lost</span>
            <h2>Adoption data unavailable</h2>
            {detail ? <span className="ad-detail">{detail}</span> : null}
          </div>
        </section>
      </Shell>
    );
  }

  const ext = data.summary.external;
  const all = data.summary.all;
  const orgs = showInternal
    ? data.orgs
    : data.orgs.filter((o) => !o.is_internal);

  return (
    <Shell>
      <section>
        <div className="sec-head">
          <span className="num">§ 01</span>
          <span className="label">External</span>
          <span className="rule" />
          <span className="label">last {data.window_days} days</span>
        </div>
        <div className="ad-stats">
          <Stat label="Orgs" value={ext.installs_total} sub="external installs" accent />
          <Stat label="New" value={ext.installs_window} sub="in window" />
          <Stat label="Active orgs" value={ext.orgs_active_window} sub="ran a session" accent />
          <Stat label="Active people" value={ext.users_active_window} />
          <Stat label="Sessions" value={ext.sessions_window} />
          <Stat label="Teams" value={ext.teams_multi_member} sub="2+ members" />
        </div>
        <p className="ad-note">
          <strong>Coverage.</strong> {data.coverage.orgs_ever_reporting} of{" "}
          {data.coverage.installs_observed} external orgs have ever sent
          telemetry
          {data.coverage.reporting_rate !== null
            ? ` (${Math.round(data.coverage.reporting_rate * 100)}%)`
            : ""}
          . {data.coverage.note}
        </p>
      </section>

      <section>
        <div className="sec-head">
          <span className="num">§ 02</span>
          <span className="label">Including our own</span>
          <span className="rule" />
          <span className="label">{data.summary.internal_orgs} internal orgs</span>
        </div>
        <div className="ad-stats">
          <Stat label="All orgs" value={all.installs_total} sub="registry total" />
          <Stat label="Active orgs" value={all.orgs_active_window} />
          <Stat label="Active people" value={all.users_active_window} />
          <Stat label="Sessions" value={all.sessions_window} />
        </div>
      </section>

      <section>
        <div className="sec-head">
          <span className="num">§ 03</span>
          <span className="label">Organizations</span>
          <span className="rule" />
          <button
            className="ad-btn"
            style={{ marginTop: 0, padding: "5px 12px", fontSize: 10 }}
            onClick={() => setShowInternal((v) => !v)}
          >
            {showInternal ? "Hide internal" : "Show all"}
          </button>
        </div>
        <div className="ad-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Org</th>
                <th>Created by</th>
                <th>Members</th>
                <th>Sessions</th>
                <th>Last active</th>
                <th>Version</th>
                <th>Platform</th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((o) => (
                <tr key={o.slug} className={o.is_internal ? "is-internal" : ""}>
                  <td>
                    {o.slug}{" "}
                    {o.is_internal ? (
                      <span className="ad-tag">ours</span>
                    ) : o.sessions_window > 0 ? (
                      <span className="ad-tag is-live">live</span>
                    ) : null}
                  </td>
                  <td>{o.created_by ?? "—"}</td>
                  <td>{o.members}</td>
                  <td>{o.sessions_window ? nf.format(o.sessions_window) : "—"}</td>
                  <td>{fmtWhen(o.last_activity)}</td>
                  <td>{o.framework_version ?? "—"}</td>
                  <td>{o.platform ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="sec-head">
          <span className="num">§ 04</span>
          <span className="label">Versions in the wild</span>
          <span className="rule" />
          <span className="label">from health check-ins</span>
        </div>
        {data.versions.length === 0 ? (
          <div className="ad-empty">No check-ins recorded.</div>
        ) : (
          <div className="ad-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Framework</th>
                  <th>Platform</th>
                  <th>Orgs</th>
                  <th>Users</th>
                  <th>Last seen</th>
                </tr>
              </thead>
              <tbody>
                {data.versions.map((v, i) => (
                  <tr key={`${v.framework_version}-${v.platform}-${i}`}>
                    <td>v{v.framework_version}</td>
                    <td>{v.platform}</td>
                    <td>{v.orgs}</td>
                    <td>{v.users}</td>
                    <td>{fmtWhen(v.last_seen)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="ad-note">
          Health check-ins require a GitHub token, so this covers a minority of
          installs. Read it as &ldquo;of those reporting&rdquo; — anyone still on
          an old framework version is worth chasing.
        </p>
      </section>

      <section>
        <div className="sec-head">
          <span className="num">§ 05</span>
          <span className="label">Commands</span>
          <span className="rule" />
          <span className="label">external / all</span>
        </div>
        <div className="ad-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Command</th>
                <th>External runs</th>
                <th>External orgs</th>
                <th>All runs</th>
              </tr>
            </thead>
            <tbody>
              {data.commands.all.map((c) => {
                const e = data.commands.external.find(
                  (x) => x.command === c.command,
                );
                return (
                  <tr key={c.command}>
                    <td>/{c.command}</td>
                    <td>{e ? nf.format(e.runs) : "—"}</td>
                    <td>{e ? e.orgs : "—"}</td>
                    <td>{nf.format(c.runs)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </Shell>
  );
}
