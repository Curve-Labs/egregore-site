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
            : "Session expired — sign in again.",
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

  const ext = data.summary.external;
  const all = data.orgs.filter((o) => showOurs || !o.is_internal);
  const withUse = all.filter((o) => o.sessions_total > 0);
  const returned = withUse.filter((o) => o.active_days > 1).length;
  const deepest = Math.max(1, ...withUse.map((o) => o.active_days));

  // Totals computed from the rows we already have — no extra request.
  const extOrgs = data.orgs.filter((o) => !o.is_internal);
  const act = {
    egregores: extOrgs.length,
    sessions: extOrgs.reduce((n, o) => n + (o.sessions_total || 0), 0),
    handoffs: extOrgs.reduce((n, o) => n + (o.handoffs || 0), 0),
    handoffOrgs: extOrgs.filter((o) => (o.handoffs || 0) > 0).length,
    artifacts: extOrgs.reduce((n, o) => n + (o.artifacts || 0), 0),
    artifactOrgs: extOrgs.filter((o) => (o.artifacts || 0) > 0).length,
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

      <section>
        <div className="ad-sec">
          <span className="ad-sec-num">§ 01</span>
          <span className="ad-sec-label">The funnel</span>
          <span className="ad-sec-rule" />
          <span className="ad-sec-label">external only</span>
        </div>
        <div className="ad-funnel">
          <div className="ad-step">
            <span className="ad-step-n">{nf.format(ext.installs_total)}</span>
            <span className="ad-step-l">Registered</span>
            <span className="ad-step-s">completed setup</span>
          </div>
          <div className="ad-step">
            <span className="ad-step-n">{nf.format(ext.orgs_ever_active)}</span>
            <span className="ad-step-l">Ever ran a session</span>
            <span className="ad-step-s">
              {ext.installs_total - ext.orgs_ever_active} never started
            </span>
          </div>
          <div className="ad-step is-key">
            <span className="ad-step-n">{nf.format(returned)}</span>
            <span className="ad-step-l">Came back</span>
            <span className="ad-step-s">active on more than one day</span>
          </div>
          <div className="ad-step is-key">
            <span className="ad-step-n">
              {nf.format(ext.orgs_active_window)}
            </span>
            <span className="ad-step-l">Active this month</span>
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
          <div className="ad-step">
            <span className="ad-step-n">{nf.format(act.artifacts)}</span>
            <span className="ad-step-l">Knowledge</span>
            <span className="ad-step-s">
              {act.artifacts === 0
                ? "none published externally"
                : `across ${act.artifactOrgs} orgs`}
            </span>
          </div>
        </div>
        {act.artifacts === 0 ? (
          <p className="ad-note">
            <strong>No external organisation has published a knowledge
            artifact.</strong> All 1,541 in the registry belong to us. Handoffs
            are the only collaborative primitive with any external usage at all
            — {nf.format(act.handoffs)} of 150. That gap is the product
            question worth answering, and padding it would hide it.
          </p>
        ) : null}
      </section>

      <section>
        <div className="ad-sec">
          <span className="ad-sec-num">§ 03</span>
          <span className="ad-sec-label">create-egregore</span>
          <span className="ad-sec-rule" />
          <span className="ad-sec-label">npm vs reality</span>
        </div>
        <div className="ad-tablewrap">
          <table>
            <thead>
              <tr>
                <th>Measure</th>
                <th className="num">30 days</th>
                <th>What it actually counts</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="ad-org">npm downloads, raw</td>
                <td className="num">{npmRaw !== null ? nf.format(npmRaw) : "—"}</td>
                <td className="ad-who">Every fetch, including mirrors and scanners</td>
              </tr>
              <tr>
                <td className="ad-org">npm, publish days excluded</td>
                <td className="num">{npmOrganic !== null ? nf.format(npmOrganic) : "—"}</td>
                <td className="ad-who">Removes the release spike, not the baseline</td>
              </tr>
              <tr>
                <td className="ad-org">Registrations</td>
                <td className="num">{nf.format(ext.installs_window)}</td>
                <td className="ad-who">Setup completed and org created — verifiable</td>
              </tr>
              <tr>
                <td className="ad-org">Ran a session</td>
                <td className="num">{nf.format(ext.orgs_active_window)}</td>
                <td className="ad-who">Opened Egregore and worked in it</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="ad-note">
          <strong>The npm figures cannot be reconciled, and that is the finding.</strong>{" "}
          In one week <strong>82 distinct versions</strong> of{" "}
          <code>create-egregore</code> were downloaded, including releases
          months old that no human would install by hand. Real users run{" "}
          <code>npx create-egregore@latest</code> and always get the newest.
          Even the publish-day-excluded number is roughly{" "}
          {npmOrganic && ext.installs_window
            ? Math.round(npmOrganic / ext.installs_window)
            : "50"}
          × the registrations. There is no threshold at which npm becomes a
          measure of installs — it is shown here only so nobody quotes it.
        </p>
      </section>

      <section>
        <div className="ad-sec">
          <span className="ad-sec-num">§ 04</span>
          <span className="ad-sec-label">Every organisation</span>
          <span className="ad-sec-rule" />
          <button
            className="ad-btn"
            style={{ marginTop: 0, padding: "5px 12px", fontSize: 10 }}
            onClick={() => setShowOurs((v) => !v)}
          >
            {showOurs ? "Hide ours" : "Show ours"}
          </button>
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
              {all.map((o) => {
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
        </div>
        <p className="ad-note">
          <strong>People come from memberships, not the registering handle.</strong>{" "}
          <code>created_by</code> is empty on seven orgs — keying on it is what
          hid a live install from this board while it sat in the database.
        </p>
      </section>

      <section>
        <div className="ad-sec">
          <span className="ad-sec-num">§ 05</span>
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
          <span className="ad-sec-num">§ 06</span>
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
