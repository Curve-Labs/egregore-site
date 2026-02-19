import { useState, useEffect, useCallback, useRef } from "react";
import { C, font } from "./tokens";
import {
  getGitHubAuthUrl,
  exchangeCode,
  getAdminDashboard,
  getAdminOrgDetail,
  getAdminTelemetry,
  getAdminHealth,
} from "./api";

const ADMIN_USERS = ["oguzhan", "fcdagdelen"];

function isAdmin(username) {
  return ADMIN_USERS.includes((username || "").toLowerCase());
}

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
  btnActive: {
    background: "rgba(200,165,90,0.15)",
    borderColor: C.gold,
    color: C.gold,
  },
  content: {
    padding: 24,
    maxWidth: 1400,
    margin: "0 auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 12,
  },
  th: {
    textAlign: "left",
    padding: "8px 12px",
    borderBottom: `1px solid rgba(200,165,90,0.3)`,
    color: C.gold,
    fontWeight: 700,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  td: {
    padding: "8px 12px",
    borderBottom: `1px solid rgba(200,165,90,0.08)`,
    verticalAlign: "top",
  },
  row: {
    cursor: "pointer",
    transition: "background 0.15s",
  },
  card: {
    border: `1px solid rgba(200,165,90,0.2)`,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    ...font.ibmPlex,
    fontSize: 12,
    fontWeight: 700,
    color: C.gold,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
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
  stat: {
    display: "inline-block",
    marginRight: 24,
    fontSize: 12,
  },
  statValue: {
    color: C.gold,
    fontWeight: 700,
    fontSize: 16,
    marginRight: 4,
  },
  statLabel: {
    color: C.muted,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  alertBar: {
    background: "rgba(122,15,27,0.1)",
    border: `1px solid rgba(122,15,27,0.4)`,
    padding: "10px 16px",
    marginBottom: 16,
    fontSize: 12,
    color: C.crimson,
  },
  backBtn: {
    background: "none",
    border: "none",
    color: C.muted,
    cursor: "pointer",
    ...font.mono,
    fontSize: 12,
    padding: "4px 0",
    marginBottom: 12,
  },
  filterRow: {
    display: "flex",
    gap: 12,
    marginBottom: 16,
    flexWrap: "wrap",
    alignItems: "center",
  },
  select: {
    background: "rgba(200,165,90,0.05)",
    border: `1px solid rgba(200,165,90,0.2)`,
    color: C.parchment,
    ...font.mono,
    fontSize: 11,
    padding: "4px 8px",
  },
  input: {
    background: "rgba(200,165,90,0.05)",
    border: `1px solid rgba(200,165,90,0.2)`,
    color: C.parchment,
    ...font.mono,
    fontSize: 11,
    padding: "4px 8px",
    width: 180,
  },
  updated: {
    fontSize: 10,
    color: C.muted,
    marginBottom: 16,
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
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function shortDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toISOString().slice(0, 10);
}

// ─── Auth Gate ────────────────────────────────────────────────────

function useAuth() {
  const [token, setToken] = useState(() => sessionStorage.getItem("admin_gh_token"));
  const [user, setUser] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("admin_gh_user")); } catch { return null; }
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Handle OAuth callback
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
          if (!isAdmin(ghUser?.login)) {
            setError("Access denied. You are not an admin.");
            setLoading(false);
            return;
          }
          sessionStorage.setItem("admin_gh_token", ghToken);
          sessionStorage.setItem("admin_gh_user", JSON.stringify(ghUser));
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
    sessionStorage.removeItem("admin_gh_token");
    sessionStorage.removeItem("admin_gh_user");
    setToken(null);
    setUser(null);
  }, []);

  return { token, user, error, loading, logout };
}

// ─── Overview View ────────────────────────────────────────────────

function OverviewView({ data, onSelectOrg }) {
  if (!data) return <div style={{ color: C.muted }}>Loading...</div>;

  const { orgs, total_orgs, total_users, alerts } = data;

  return (
    <div>
      {/* Stats summary */}
      <div style={{ marginBottom: 20 }}>
        <span style={s.stat}>
          <span style={s.statValue}>{total_orgs}</span>
          <span style={s.statLabel}>Orgs</span>
        </span>
        <span style={s.stat}>
          <span style={s.statValue}>{total_users}</span>
          <span style={s.statLabel}>Users</span>
        </span>
        <span style={s.stat}>
          <span style={s.statValue}>{alerts.length}</span>
          <span style={s.statLabel}>Alerts</span>
        </span>
      </div>

      {/* Alerts bar */}
      {alerts.length > 0 && (
        <div style={s.alertBar}>
          {alerts.map((a, i) => (
            <div key={i}>
              <span style={s.badge(a.severity)}>{a.severity}</span>
              <span style={{ color: C.muted, marginRight: 8 }}>{a.org_slug}</span>
              {a.detail}
            </div>
          ))}
        </div>
      )}

      {/* Orgs table */}
      <table style={s.table}>
        <thead>
          <tr>
            <th style={s.th}>Slug</th>
            <th style={s.th}>Name</th>
            <th style={s.th}>Members</th>
            <th style={s.th}>Sessions</th>
            <th style={s.th}>Last Active</th>
            <th style={s.th}>Neo4j</th>
            <th style={s.th}>Supabase Key</th>
            <th style={s.th}>Graph Key</th>
            <th style={s.th}>Health</th>
          </tr>
        </thead>
        <tbody>
          {orgs.map((org) => (
            <tr
              key={org.slug}
              style={s.row}
              onClick={() => onSelectOrg(org.slug)}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(200,165,90,0.05)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <td style={{ ...s.td, color: C.gold, fontWeight: 700 }}>{org.slug}</td>
              <td style={s.td}>{org.name}</td>
              <td style={s.td}>{org.member_count}</td>
              <td style={s.td}>{org.session_count}</td>
              <td style={{ ...s.td, color: C.muted }}>{timeAgo(org.last_activity)}</td>
              <td style={s.td}>
                <span style={s.dot(org.neo4j_host ? "#4a4" : "#666")} />
                <span style={{ fontSize: 10, color: C.muted }}>{org.neo4j_host || "none"}</span>
              </td>
              <td style={s.td}>
                <span style={s.dot(org.has_active_key ? "#4a4" : C.crimson)} />
                {org.key_prefix || "none"}
              </td>
              <td style={s.td}>
                <span style={s.dot(
                  org.neo4j_has_key ? "#4a4" : org.neo4j_org_node ? C.gold : C.crimson
                )} />
                {org.neo4j_has_key ? "yes" : org.neo4j_org_node ? "missing key" : "no node"}
              </td>
              <td style={s.td}>
                {org.health.length === 0 ? (
                  <span style={{ color: "#4a4" }}>OK</span>
                ) : (
                  org.health.map((h, i) => (
                    <span key={i} style={s.badge(h.severity)}>
                      {h.type.replace(/_/g, " ")}
                    </span>
                  ))
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Org Detail View ──────────────────────────────────────────────

function OrgDetailView({ token, slug, onBack }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!slug || !token) return;
    getAdminOrgDetail(token, slug)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [token, slug]);

  if (error) return <div style={{ color: C.crimson }}>Error: {error}</div>;
  if (!data) return <div style={{ color: C.muted }}>Loading {slug}...</div>;

  const { config, members, api_keys, telemetry, neo4j_stats, neo4j_org_node, isolation, health } = data;

  return (
    <div>
      <button style={s.backBtn} onClick={onBack}>
        &larr; Back to overview
      </button>

      <h2 style={{ ...font.ibmPlex, fontSize: 18, color: C.gold, marginBottom: 20 }}>
        {config.name} <span style={{ color: C.muted, fontWeight: 400 }}>({config.slug})</span>
      </h2>

      {/* Config */}
      <div style={s.card}>
        <div style={s.cardTitle}>Configuration</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 24px", fontSize: 12 }}>
          <div><span style={{ color: C.muted }}>GitHub: </span>{config.github_org}</div>
          <div><span style={{ color: C.muted }}>Created: </span>{shortDate(config.created_at)}</div>
          <div><span style={{ color: C.muted }}>Created by: </span>{config.created_by || "—"}</div>
          <div><span style={{ color: C.muted }}>Neo4j: </span>{config.neo4j_host || "—"}</div>
          <div>
            <span style={{ color: C.muted }}>Telegram: </span>
            {config.telegram_chat_id ? (
              <>{config.telegram_group_title || config.telegram_chat_id}</>
            ) : "not connected"}
          </div>
          <div><span style={{ color: C.muted }}>Transcripts: </span>{config.transcript_sharing ? "on" : "off"}</div>
        </div>
      </div>

      {/* Members */}
      <div style={s.card}>
        <div style={s.cardTitle}>Members ({members.length})</div>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Username</th>
              <th style={s.th}>Name</th>
              <th style={s.th}>Role</th>
              <th style={s.th}>Status</th>
              <th style={s.th}>Telegram</th>
              <th style={s.th}>Joined</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m, i) => (
              <tr key={i}>
                <td style={{ ...s.td, color: C.gold }}>{m.github_username || "—"}</td>
                <td style={s.td}>{m.github_name || "—"}</td>
                <td style={s.td}>{m.role}</td>
                <td style={s.td}>
                  <span style={s.dot(m.status === "active" ? "#4a4" : "#666")} />
                  {m.status}
                </td>
                <td style={s.td}>{m.telegram_username || "—"}</td>
                <td style={{ ...s.td, color: C.muted }}>{shortDate(m.joined_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Neo4j stats */}
      {Object.keys(neo4j_stats).length > 0 && (
        <div style={s.card}>
          <div style={s.cardTitle}>Neo4j Nodes</div>
          <div style={{ display: "flex", gap: 24 }}>
            {Object.entries(neo4j_stats).map(([label, count]) => (
              <span key={label} style={s.stat}>
                <span style={s.statValue}>{count}</span>
                <span style={s.statLabel}>{label}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* API Keys */}
      <div style={s.card}>
        <div style={s.cardTitle}>API Keys</div>
        {api_keys.length === 0 ? (
          <div style={{ color: C.muted }}>No keys found</div>
        ) : (
          api_keys.map((k, i) => (
            <div key={i} style={{ marginBottom: 4, fontSize: 12 }}>
              <span style={s.dot(k.is_active ? "#4a4" : "#666")} />
              <code>{k.key_prefix}</code>
              <span style={{ color: C.muted, marginLeft: 8 }}>
                {k.is_active ? "active" : "revoked"} — {shortDate(k.created_at)}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Neo4j Org Node */}
      <div style={s.card}>
        <div style={s.cardTitle}>Neo4j Org Node</div>
        {neo4j_org_node ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 24px", fontSize: 12 }}>
            <div>
              <span style={{ color: C.muted }}>Exists: </span>
              <span style={s.dot(neo4j_org_node.exists ? "#4a4" : C.crimson)} />
              {neo4j_org_node.exists ? "yes" : "no"}
            </div>
            <div>
              <span style={{ color: C.muted }}>Has API key: </span>
              <span style={s.dot(neo4j_org_node.has_api_key ? "#4a4" : C.crimson)} />
              {neo4j_org_node.has_api_key ? "yes" : "no"}
            </div>
            <div>
              <span style={{ color: C.muted }}>Key slug match: </span>
              {neo4j_org_node.key_slug_match === null ? (
                <span style={{ color: C.muted }}>n/a</span>
              ) : (
                <>
                  <span style={s.dot(neo4j_org_node.key_slug_match ? "#4a4" : C.crimson)} />
                  {neo4j_org_node.key_slug_match ? "yes" : "MISMATCH"}
                </>
              )}
            </div>
          </div>
        ) : (
          <div style={{ color: C.muted }}>No data available</div>
        )}
      </div>

      {/* Isolation */}
      {isolation && (
        <div style={s.card}>
          <div style={s.cardTitle}>
            Isolation
            {isolation.status && (
              <span style={{
                ...s.badge(isolation.status === "ok" ? "info" : "warning"),
                marginLeft: 8,
                color: isolation.status === "ok" ? "#4a4" : C.gold,
                borderColor: isolation.status === "ok" ? "#4a4" : C.gold,
              }}>
                {isolation.status}
              </span>
            )}
          </div>
          {(isolation.checks || []).length === 0 ? (
            <div style={{ color: C.muted }}>No isolation checks ran</div>
          ) : (
            isolation.checks.map((check, i) => (
              <div key={i} style={{ marginBottom: 6, fontSize: 12 }}>
                <span style={s.dot(
                  check.status === "ok" ? "#4a4" : check.status === "warning" ? C.gold : C.muted
                )} />
                <span style={{ color: C.gold, marginRight: 8 }}>{check.check.replace(/_/g, " ")}</span>
                {check.detail}
                {check.other_orgs && (
                  <span style={{ color: C.muted, marginLeft: 8 }}>
                    [{check.other_orgs.join(", ")}]
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Health */}
      <div style={s.card}>
        <div style={s.cardTitle}>Health Diagnostics</div>
        {health.length === 0 ? (
          <div style={{ color: "#4a4" }}>All checks passing</div>
        ) : (
          health.map((h, i) => (
            <div key={i} style={{ marginBottom: 4, fontSize: 12 }}>
              <span style={s.badge(h.severity)}>{h.severity}</span>
              {h.detail}
            </div>
          ))
        )}
      </div>

      {/* Recent telemetry */}
      <div style={s.card}>
        <div style={s.cardTitle}>Recent Telemetry</div>
        {telemetry.length === 0 ? (
          <div style={{ color: C.muted }}>No events</div>
        ) : (
          <div style={{ maxHeight: 300, overflowY: "auto" }}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Type</th>
                  <th style={s.th}>User</th>
                  <th style={s.th}>Time</th>
                  <th style={s.th}>Data</th>
                </tr>
              </thead>
              <tbody>
                {telemetry.map((evt, i) => (
                  <tr key={i}>
                    <td style={{ ...s.td, color: C.gold }}>{evt.type}</td>
                    <td style={s.td}>{evt.user_handle || "—"}</td>
                    <td style={{ ...s.td, color: C.muted }}>{timeAgo(evt.ts)}</td>
                    <td style={{ ...s.td, color: C.muted, maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {evt.data ? JSON.stringify(evt.data) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Telemetry View ───────────────────────────────────────────────

function TelemetryView({ token, dashboardData }) {
  const [events, setEvents] = useState(null);
  const [aggregates, setAggregates] = useState(null);
  const [filters, setFilters] = useState({});
  const [error, setError] = useState(null);

  const orgSlugs = dashboardData?.orgs?.map((o) => o.slug) || [];

  const fetchTelemetry = useCallback(() => {
    if (!token) return;
    getAdminTelemetry(token, { ...filters, limit: 200 })
      .then((data) => {
        setEvents(data.events);
        setAggregates(data.aggregates);
      })
      .catch((e) => setError(e.message));
  }, [token, filters]);

  useEffect(() => {
    fetchTelemetry();
  }, [fetchTelemetry]);

  return (
    <div>
      {/* Filters */}
      <div style={s.filterRow}>
        <select
          style={s.select}
          value={filters.org_slug || ""}
          onChange={(e) => setFilters({ ...filters, org_slug: e.target.value || undefined })}
        >
          <option value="">All orgs</option>
          {orgSlugs.map((slug) => (
            <option key={slug} value={slug}>{slug}</option>
          ))}
        </select>

        <input
          style={s.input}
          placeholder="Event type..."
          value={filters.event_type || ""}
          onChange={(e) => setFilters({ ...filters, event_type: e.target.value || undefined })}
        />

        <input
          style={s.input}
          placeholder="User handle..."
          value={filters.user_handle || ""}
          onChange={(e) => setFilters({ ...filters, user_handle: e.target.value || undefined })}
        />

        <input
          style={{ ...s.input, width: 160 }}
          type="date"
          value={filters.since ? filters.since.slice(0, 10) : ""}
          onChange={(e) => {
            const val = e.target.value;
            setFilters({ ...filters, since: val ? `${val}T00:00:00Z` : undefined });
          }}
        />

        <button style={s.btn} onClick={fetchTelemetry}>Refresh</button>
      </div>

      {error && <div style={{ color: C.crimson, marginBottom: 12 }}>Error: {error}</div>}

      {/* Aggregates */}
      {aggregates && (
        <div style={{ display: "flex", gap: 24, marginBottom: 16 }}>
          <div style={s.card}>
            <div style={s.cardTitle}>By Type</div>
            {Object.entries(aggregates.by_type || {}).sort((a, b) => b[1] - a[1]).map(([t, c]) => (
              <div key={t} style={{ fontSize: 12 }}>
                <span style={{ color: C.gold, marginRight: 8 }}>{c}</span>{t}
              </div>
            ))}
          </div>
          <div style={s.card}>
            <div style={s.cardTitle}>By Org</div>
            {Object.entries(aggregates.by_org || {}).sort((a, b) => b[1] - a[1]).map(([o, c]) => (
              <div key={o} style={{ fontSize: 12 }}>
                <span style={{ color: C.gold, marginRight: 8 }}>{c}</span>{o}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Events list */}
      {events === null ? (
        <div style={{ color: C.muted }}>Loading...</div>
      ) : events.length === 0 ? (
        <div style={{ color: C.muted }}>No events match filters</div>
      ) : (
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Type</th>
              <th style={s.th}>Org</th>
              <th style={s.th}>User</th>
              <th style={s.th}>Time</th>
              <th style={s.th}>Data</th>
            </tr>
          </thead>
          <tbody>
            {events.map((evt, i) => (
              <tr key={i}>
                <td style={{ ...s.td, color: C.gold }}>{evt.type}</td>
                <td style={s.td}>{evt.org_slug}</td>
                <td style={s.td}>{evt.user_handle || "—"}</td>
                <td style={{ ...s.td, color: C.muted, whiteSpace: "nowrap" }}>{timeAgo(evt.ts)}</td>
                <td style={{ ...s.td, color: C.muted, maxWidth: 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {evt.data ? JSON.stringify(evt.data) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─── Health View ──────────────────────────────────────────────────

function HealthView({ token, dashboardData }) {
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState({});
  const [error, setError] = useState(null);

  const orgSlugs = dashboardData?.orgs?.map((o) => o.slug) || [];

  const fetchHealth = useCallback(() => {
    if (!token) return;
    getAdminHealth(token, filters)
      .then(setData)
      .catch((e) => setError(e.message));
  }, [token, filters]);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  const criticalAlerts = data?.alerts?.filter((a) => a.severity === "critical") || [];
  const warningAlerts = data?.alerts?.filter((a) => a.severity === "warning") || [];

  return (
    <div>
      {/* Filters */}
      <div style={s.filterRow}>
        <select
          style={s.select}
          value={filters.org_slug || ""}
          onChange={(e) => setFilters({ ...filters, org_slug: e.target.value || undefined })}
        >
          <option value="">All orgs</option>
          {orgSlugs.map((slug) => (
            <option key={slug} value={slug}>{slug}</option>
          ))}
        </select>
        <button style={s.btn} onClick={fetchHealth}>Refresh</button>
        {data && (
          <span style={{ fontSize: 11, color: C.muted }}>
            {data.total_users} user(s) checked in
          </span>
        )}
      </div>

      {error && <div style={{ color: C.crimson, marginBottom: 12 }}>Error: {error}</div>}

      {/* Alerts bar */}
      {(criticalAlerts.length > 0 || warningAlerts.length > 0) && (
        <div style={{ marginBottom: 16 }}>
          {criticalAlerts.length > 0 && (
            <div style={s.alertBar}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>
                {criticalAlerts.length} Critical
              </div>
              {criticalAlerts.map((a, i) => (
                <div key={i} style={{ marginBottom: 2 }}>
                  <span style={{ color: C.parchment, marginRight: 8 }}>{a.user}</span>
                  <span style={{ color: C.muted, marginRight: 8 }}>{a.org}</span>
                  {a.detail}
                </div>
              ))}
            </div>
          )}
          {warningAlerts.length > 0 && (
            <div style={{
              background: "rgba(200,165,90,0.08)",
              border: `1px solid rgba(200,165,90,0.3)`,
              padding: "10px 16px",
              fontSize: 12,
              color: C.gold,
            }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>
                {warningAlerts.length} Warning{warningAlerts.length > 1 ? "s" : ""}
              </div>
              {warningAlerts.map((a, i) => (
                <div key={i} style={{ marginBottom: 2 }}>
                  <span style={{ color: C.parchment, marginRight: 8 }}>{a.user || "system"}</span>
                  <span style={{ color: C.muted, marginRight: 8 }}>{a.org}</span>
                  {a.detail}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Version spread */}
      {data?.versions && Object.keys(data.versions).length > 0 && (
        <div style={{ ...s.card, marginBottom: 16 }}>
          <div style={s.cardTitle}>Framework Versions</div>
          <div style={{ display: "flex", gap: 16 }}>
            {Object.entries(data.versions).map(([v, count]) => (
              <span key={v} style={{ fontSize: 12 }}>
                <span style={{ color: C.gold, marginRight: 4 }}>v{v}</span>
                <span style={{ color: C.muted }}>{count} user(s)</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Check-ins table */}
      {data === null ? (
        <div style={{ color: C.muted }}>Loading...</div>
      ) : data.checkins.length === 0 ? (
        <div style={{ color: C.muted }}>No health check-ins recorded yet</div>
      ) : (
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>User</th>
              <th style={s.th}>Org</th>
              <th style={s.th}>Key</th>
              <th style={s.th}>Memory</th>
              <th style={s.th}>Git</th>
              <th style={s.th}>Version</th>
              <th style={s.th}>Branch</th>
              <th style={s.th}>Last Check-in</th>
              <th style={s.th}>Errors</th>
            </tr>
          </thead>
          <tbody>
            {data.checkins.map((c, i) => {
              const notCheckedIn = c.checked_in === false;
              const keyOk = c.key_valid !== false;
              const memOk = c.memory_linked !== false;
              const gitOk = c.git_synced !== false;
              const errors = c.errors || [];
              const dimStyle = { ...s.td, color: "rgba(200,165,90,0.3)" };

              return (
                <tr key={i} style={notCheckedIn ? { opacity: 0.5 } : {}}>
                  <td style={{ ...s.td, color: C.gold }}>{c.github_username}</td>
                  <td style={s.td}>{c.org_slug}</td>
                  {notCheckedIn ? (
                    <>
                      <td colSpan={6} style={{ ...s.td, color: C.muted, fontStyle: "italic" }}>
                        not checked in
                      </td>
                      <td style={s.td}>{"—"}</td>
                    </>
                  ) : (
                    <>
                      <td style={s.td}>
                        <span style={s.dot(keyOk ? "#4a4" : C.crimson)} />
                        {keyOk ? "valid" : `mismatch (${c.key_slug})`}
                      </td>
                      <td style={s.td}>
                        <span style={s.dot(memOk ? "#4a4" : C.gold)} />
                        {memOk ? "linked" : "missing"}
                      </td>
                      <td style={s.td}>
                        <span style={s.dot(gitOk ? "#4a4" : C.gold)} />
                        {gitOk ? "synced" : "behind"}
                      </td>
                      <td style={{ ...s.td, color: C.muted }}>{c.framework_version || "—"}</td>
                      <td style={{ ...s.td, color: C.muted }}>{c.branch || "—"}</td>
                      <td style={{ ...s.td, color: C.muted, whiteSpace: "nowrap" }}>
                        {timeAgo(c.checked_in_at)}
                      </td>
                      <td style={s.td}>
                        {errors.length === 0 ? (
                          <span style={{ color: "#4a4" }}>{"—"}</span>
                        ) : (
                          errors.map((e, j) => (
                            <span key={j} style={s.badge("warning")}>
                              {String(e).replace(/_/g, " ")}
                            </span>
                          ))
                        )}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────

export default function AdminDashboard() {
  const { token, user, error: authError, loading: authLoading, logout } = useAuth();
  const [view, setView] = useState("overview"); // "overview" | "telemetry" | "health"
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [dashError, setDashError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const intervalRef = useRef(null);

  const fetchDashboard = useCallback(() => {
    if (!token) return;
    getAdminDashboard(token)
      .then((data) => {
        setDashboardData(data);
        setLastUpdated(new Date());
        setDashError(null);
      })
      .catch((e) => setDashError(e.message));
  }, [token]);

  // Initial fetch + polling
  useEffect(() => {
    fetchDashboard();
    intervalRef.current = setInterval(fetchDashboard, 30000);
    return () => clearInterval(intervalRef.current);
  }, [fetchDashboard]);

  // ── Not logged in ──
  if (!token && !authLoading) {
    return (
      <div style={s.loginPage}>
        <div style={{ ...font.ibmPlex, fontSize: 16, color: C.gold, letterSpacing: 2 }}>
          EGREGORE ADMIN
        </div>
        {authError && <div style={{ color: C.crimson, fontSize: 13 }}>{authError}</div>}
        <button style={s.loginBtn} onClick={() => {
          sessionStorage.setItem("admin_auth_pending", "1");
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

  // ── Check admin ──
  if (user && !isAdmin(user.login)) {
    return (
      <div style={s.loginPage}>
        <div style={{ color: C.crimson, fontSize: 14 }}>Access denied</div>
        <div style={{ color: C.muted, fontSize: 12 }}>
          {user.login} is not an admin user.
        </div>
        <button style={s.btn} onClick={logout}>Sign out</button>
      </div>
    );
  }

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.headerTitle}>EGREGORE ADMIN</div>
        <div style={s.headerRight}>
          {dashboardData && (
            <span>
              {dashboardData.total_orgs} orgs &middot; {dashboardData.total_users} users
            </span>
          )}
          <span>{user?.login}</span>
          <button style={s.btn} onClick={logout}>Logout</button>
        </div>
      </div>

      <div style={s.content}>
        {/* Updated indicator */}
        {lastUpdated && (
          <div style={s.updated}>
            Updated {timeAgo(lastUpdated.toISOString())} &middot; auto-refreshes every 30s
          </div>
        )}

        {dashError && (
          <div style={s.alertBar}>Dashboard error: {dashError}</div>
        )}

        {/* View switcher (only when not in org detail) */}
        {!selectedOrg && (
          <div style={{ marginBottom: 20, display: "flex", gap: 8 }}>
            <button
              style={{ ...s.btn, ...(view === "overview" ? s.btnActive : {}) }}
              onClick={() => setView("overview")}
            >
              Overview
            </button>
            <button
              style={{ ...s.btn, ...(view === "telemetry" ? s.btnActive : {}) }}
              onClick={() => setView("telemetry")}
            >
              Telemetry
            </button>
            <button
              style={{ ...s.btn, ...(view === "health" ? s.btnActive : {}) }}
              onClick={() => setView("health")}
            >
              Health
            </button>
          </div>
        )}

        {/* Content */}
        {selectedOrg ? (
          <OrgDetailView
            token={token}
            slug={selectedOrg}
            onBack={() => setSelectedOrg(null)}
          />
        ) : view === "overview" ? (
          <OverviewView data={dashboardData} onSelectOrg={setSelectedOrg} />
        ) : view === "health" ? (
          <HealthView token={token} dashboardData={dashboardData} />
        ) : (
          <TelemetryView token={token} dashboardData={dashboardData} />
        )}
      </div>
    </div>
  );
}
