import { useState, useEffect, useCallback, useRef } from "react";
import { C, font } from "./tokens";
import { getGitHubAuthUrl, exchangeCode, getMyEgregores } from "./api";

// ─── Shared styles ─────────────────────────────────────────────────

const s = {
  page: {
    background: C.termBg,
    minHeight: "100vh",
    color: C.parchment,
    ...font.mono,
    fontSize: 13,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 24px",
    borderBottom: `1px solid rgba(200,165,90,0.2)`,
  },
  headerTitle: {
    ...font.ibmPlex,
    fontSize: 14,
    fontWeight: 700,
    color: C.gold,
    letterSpacing: 2,
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    fontSize: 12,
    color: C.muted,
  },
  btn: {
    background: "none",
    border: `1px solid rgba(200,165,90,0.3)`,
    color: C.parchment,
    ...font.mono,
    fontSize: 11,
    padding: "4px 12px",
    cursor: "pointer",
  },
  content: {
    padding: 24,
    maxWidth: 1000,
    margin: "0 auto",
  },
  card: {
    border: `1px solid rgba(200,165,90,0.2)`,
    padding: 20,
    marginBottom: 20,
  },
  cardTitle: {
    ...font.ibmPlex,
    fontSize: 12,
    fontWeight: 700,
    color: C.gold,
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  sectionTitle: {
    ...font.ibmPlex,
    fontSize: 11,
    fontWeight: 700,
    color: C.muted,
    marginTop: 16,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 12,
  },
  th: {
    textAlign: "left",
    padding: "6px 10px",
    borderBottom: `1px solid rgba(200,165,90,0.3)`,
    color: C.gold,
    fontWeight: 700,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  td: {
    padding: "6px 10px",
    borderBottom: `1px solid rgba(200,165,90,0.08)`,
  },
  dot: (color) => ({
    display: "inline-block",
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: color,
    marginRight: 6,
  }),
  badge: (severity) => ({
    display: "inline-block",
    fontSize: 10,
    padding: "2px 6px",
    border: `1px solid ${severity === "critical" ? C.crimson : severity === "warning" ? C.gold : C.muted}`,
    color: severity === "critical" ? C.crimson : severity === "warning" ? C.gold : C.muted,
    marginRight: 4,
    marginBottom: 2,
  }),
  roleBadge: (role) => ({
    display: "inline-block",
    fontSize: 10,
    padding: "1px 6px",
    border: `1px solid ${role === "admin" ? C.gold : "rgba(200,165,90,0.3)"}`,
    color: role === "admin" ? C.gold : C.muted,
    marginLeft: 8,
  }),
  keyBox: {
    background: "rgba(200,165,90,0.05)",
    border: `1px solid rgba(200,165,90,0.15)`,
    padding: "8px 12px",
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  copyBtn: {
    background: "none",
    border: `1px solid rgba(200,165,90,0.3)`,
    color: C.gold,
    ...font.mono,
    fontSize: 10,
    padding: "2px 8px",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  alertBar: {
    background: "rgba(122,15,27,0.1)",
    border: `1px solid rgba(122,15,27,0.4)`,
    padding: "10px 16px",
    marginBottom: 16,
    fontSize: 12,
    color: C.crimson,
  },
  fixBox: {
    background: "rgba(122,15,27,0.05)",
    border: `1px solid rgba(122,15,27,0.3)`,
    padding: 12,
    marginTop: 8,
    fontSize: 12,
  },
  codeBlock: {
    background: "rgba(0,0,0,0.3)",
    padding: "6px 10px",
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 11,
    marginTop: 6,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    overflowX: "auto",
  },
  loginPage: {
    background: C.termBg,
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    gap: 24,
    color: C.parchment,
    ...font.mono,
  },
  loginBtn: {
    background: "none",
    border: `1px solid ${C.gold}`,
    color: C.gold,
    ...font.mono,
    fontSize: 13,
    padding: "10px 28px",
    cursor: "pointer",
    letterSpacing: 1,
  },
};

// ─── Helpers ──────────────────────────────────────────────────────

function timeAgo(iso) {
  if (!iso) return "\u2014";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function CopyButton({ text, label = "Copy" }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      style={s.copyBtn}
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? "Copied" : label}
    </button>
  );
}

// ─── Auth Hook ────────────────────────────────────────────────────

function useAuth() {
  const [token, setToken] = useState(() => sessionStorage.getItem("dash_gh_token"));
  const [user, setUser] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("dash_gh_user")); } catch { return null; }
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const url = new URL(window.location);
    const code = url.searchParams.get("code");
    if (code && !token) {
      setLoading(true);
      url.searchParams.delete("code");
      url.searchParams.delete("state");
      window.history.replaceState({}, "", url.pathname);

      exchangeCode(code)
        .then((data) => {
          const ghToken = data.github_token;
          const ghUser = data.user;
          sessionStorage.setItem("dash_gh_token", ghToken);
          sessionStorage.setItem("dash_gh_user", JSON.stringify(ghUser));
          setToken(ghToken);
          setUser(ghUser);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message);
          setLoading(false);
        });
    }
  }, [token]);

  const logout = useCallback(() => {
    sessionStorage.removeItem("dash_gh_token");
    sessionStorage.removeItem("dash_gh_user");
    setToken(null);
    setUser(null);
  }, []);

  return { token, user, error, loading, logout };
}

// ─── Health Status Component ──────────────────────────────────────

function HealthStatus({ checkin }) {
  if (!checkin) return <span style={{ color: C.muted }}>No check-in yet</span>;

  const keyOk = checkin.key_valid !== false;
  const memOk = checkin.memory_linked !== false;
  const gitOk = checkin.git_synced !== false;
  const allOk = keyOk && memOk && gitOk;

  return (
    <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
      <span>
        <span style={s.dot(allOk ? "#4a4" : C.crimson)} />
        {allOk ? "Healthy" : "Issues detected"}
      </span>
      <span style={{ color: C.muted }}>
        Checked in {timeAgo(checkin.checked_in_at)}
      </span>
      {checkin.framework_version && (
        <span style={{ color: C.muted }}>v{checkin.framework_version}</span>
      )}
      {checkin.branch && (
        <span style={{ color: C.muted }}>{checkin.branch}</span>
      )}
    </div>
  );
}

// ─── Org Card ─────────────────────────────────────────────────────

function OrgCard({ org }) {
  const [showKey, setShowKey] = useState(false);

  return (
    <div style={s.card}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ ...font.ibmPlex, fontSize: 16, fontWeight: 700, color: C.gold }}>
              {org.slug}
            </span>
            <span style={s.roleBadge(org.role)}>{org.role}</span>
          </div>
          <span style={{ fontSize: 11, color: C.muted }}>
            {org.github_org}{org.name && org.name !== org.github_org ? ` · ${org.name}` : ""}
          </span>
        </div>
      </div>

      {/* Health Status */}
      <HealthStatus checkin={org.latest_checkin} />

      {/* Diagnostics / Quick Fix */}
      {org.diagnostics && org.diagnostics.length > 0 && (
        <div style={s.fixBox}>
          <div style={{ fontWeight: 700, marginBottom: 6, color: C.crimson }}>
            Issues Found
          </div>
          {org.diagnostics.map((d, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <span style={s.badge(d.severity)}>{d.type.replace(/_/g, " ")}</span>
              <span style={{ color: C.parchment }}>{d.detail}</span>
              {d.correct_key && (
                <div style={{ marginTop: 6 }}>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>
                    Correct key for this org:
                  </div>
                  <div style={s.codeBlock}>
                    <code>{d.correct_key}</code>
                    <CopyButton text={d.correct_key} />
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 6, marginBottom: 4 }}>
                    Fix command:
                  </div>
                  <div style={s.codeBlock}>
                    <code style={{ whiteSpace: "nowrap" }}>
                      {`sed -i.bak "s/^EGREGORE_API_KEY=.*/EGREGORE_API_KEY=${d.correct_key}/" .env`}
                    </code>
                    <CopyButton
                      text={`sed -i.bak "s/^EGREGORE_API_KEY=.*/EGREGORE_API_KEY=${d.correct_key}/" .env`}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* API Key */}
      <div style={s.sectionTitle}>API Key</div>
      <div style={s.keyBox}>
        <code>{showKey ? org.api_key : org.api_key_masked}</code>
        <div style={{ display: "flex", gap: 4 }}>
          <button style={s.copyBtn} onClick={() => setShowKey(!showKey)}>
            {showKey ? "Hide" : "Reveal"}
          </button>
          {org.api_key && <CopyButton text={org.api_key} />}
        </div>
      </div>

      {/* Members */}
      <div style={s.sectionTitle}>Members ({org.members.length})</div>
      <table style={s.table}>
        <thead>
          <tr>
            <th style={s.th}>GitHub</th>
            <th style={s.th}>Name</th>
            <th style={s.th}>Role</th>
            <th style={s.th}>Status</th>
          </tr>
        </thead>
        <tbody>
          {org.members.map((m, i) => (
            <tr key={i}>
              <td style={{ ...s.td, color: C.gold }}>{m.github_username || "\u2014"}</td>
              <td style={s.td}>{m.github_name || "\u2014"}</td>
              <td style={s.td}>{m.role}</td>
              <td style={s.td}>
                <span style={s.dot(m.status === "active" ? "#4a4" : C.muted)} />
                {m.status}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Info row */}
      <div style={{ marginTop: 12, fontSize: 11, color: C.muted, display: "flex", gap: 16 }}>
        <span>GitHub: {org.github_org}</span>
        <span>Telegram: {org.has_telegram ? "connected" : "not connected"}</span>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────

export default function UserDashboard() {
  const { token, user, error: authError, loading: authLoading, logout } = useAuth();
  const [data, setData] = useState(null);
  const [dashError, setDashError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const intervalRef = useRef(null);

  const fetchData = useCallback(() => {
    if (!token) return;
    getMyEgregores(token)
      .then((d) => {
        setData(d);
        setLastUpdated(new Date());
        setDashError(null);
      })
      .catch((e) => setDashError(e.message));
  }, [token]);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 60000);
    return () => clearInterval(intervalRef.current);
  }, [fetchData]);

  // ── Not logged in ──
  if (!token && !authLoading) {
    return (
      <div style={s.loginPage}>
        <div style={{ ...font.ibmPlex, fontSize: 16, color: C.gold, letterSpacing: 2 }}>
          EGREGORE DASHBOARD
        </div>
        <div style={{ color: C.muted, fontSize: 12, textAlign: "center", maxWidth: 400 }}>
          Sign in with GitHub to see your Egregore instances, API keys, and health status.
        </div>
        {authError && <div style={{ color: C.crimson, fontSize: 13 }}>{authError}</div>}
        <button style={s.loginBtn} onClick={() => {
          sessionStorage.setItem("dash_auth_pending", "1");
          window.location.href = getGitHubAuthUrl();
        }}>
          Sign in with GitHub
        </button>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div style={s.loginPage}>
        <div style={{ color: C.muted }}>Authenticating...</div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.headerTitle}>EGREGORE DASHBOARD</div>
        <div style={s.headerRight}>
          {data && (
            <span>{data.egregores.length} org{data.egregores.length !== 1 ? "s" : ""}</span>
          )}
          <span>{user?.login}</span>
          <button style={s.btn} onClick={logout}>Logout</button>
        </div>
      </div>

      <div style={s.content}>
        {/* Updated indicator */}
        {lastUpdated && (
          <div style={{ fontSize: 10, color: C.muted, marginBottom: 16 }}>
            Updated {timeAgo(lastUpdated.toISOString())} &middot; auto-refreshes every 60s
          </div>
        )}

        {dashError && (
          <div style={s.alertBar}>Error: {dashError}</div>
        )}

        {/* Org cards */}
        {data === null ? (
          <div style={{ color: C.muted }}>Loading your egregores...</div>
        ) : data.egregores.length === 0 ? (
          <div style={{ color: C.muted, textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 14, marginBottom: 8 }}>No Egregore instances found</div>
            <div style={{ fontSize: 12 }}>
              Visit <a href="/setup" style={{ color: C.gold }}>egregore.xyz/setup</a> to create one,
              or ask your team admin to invite you.
            </div>
          </div>
        ) : (
          data.egregores.map((org) => <OrgCard key={org.slug} org={org} />)
        )}
      </div>
    </div>
  );
}
