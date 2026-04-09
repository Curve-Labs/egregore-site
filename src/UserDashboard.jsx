import { useState, useEffect, useCallback, useRef } from "react";
import {
  getGitHubAuthUrl, exchangeCode, getMyEgregores,
  removeMember, getTerminalUrl, graphBatch, getActivityDashboard,
} from "./api";

// ─── Fonts & Tokens ─────────────────────────────────────────────

const mono = "'IBM Plex Mono', 'JetBrains Mono', 'SF Mono', monospace";
const T = {
  bg: "#0A0A0A",
  panel: "#111111",
  card: "#161616",
  border: "#252525",
  borderLight: "#333333",
  green: "#22C55E",
  greenDim: "rgba(34,197,94,0.15)",
  text: "#E5E5E5",
  sub: "#A1A1AA",
  muted: "#6B6B76",
  dim: "#444450",
  red: "#EF4444",
  amber: "#F59E0B",
  blue: "#3B82F6",
  purple: "#8B5CF6",
  cyan: "#22D3EE",
};

// ─── Global Styles ──────────────────────────────────────────────

const STYLE_ID = "eg-tui";
function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');
    *, *::after, *::before { box-sizing: border-box; -webkit-font-smoothing: antialiased; }
    ::selection { background: ${T.green}; color: ${T.bg}; }
    body { margin: 0; padding: 0; background: ${T.bg}; font-family: ${mono}; }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: ${T.dim}; border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: ${T.muted}; }
  `;
  document.head.appendChild(s);
}

// ─── Helpers ────────────────────────────────────────────────────

function timeAgo(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return "";
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "NOW";
  if (mins < 60) return `${mins}M`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}H`;
  return `${Math.floor(hrs / 24)}D`;
}

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();
}

function fmtTimestamp(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase() + " " +
    d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function toRecords(result) {
  if (!result) return [];
  if (Array.isArray(result)) return result;
  if (result.fields && result.values) {
    return result.values.map(row => {
      const obj = {};
      result.fields.forEach((f, i) => { obj[f] = row[i]; });
      return obj;
    });
  }
  return [];
}

function isRecent(dateStr, hours = 4) {
  if (!dateStr) return false;
  return (Date.now() - new Date(dateStr).getTime()) / 3600000 < hours;
}

function progressBar(value, max, width = 20) {
  const filled = Math.round((value / Math.max(max, 1)) * width);
  return "█".repeat(filled) + "░".repeat(width - filled);
}

// ─── Logo ───────────────────────────────────────────────────────

function Logo({ size = 18, color = T.green }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill={color} aria-hidden="true">
      <rect x="46" y="4" width="8" height="36" rx="4" />
      <rect x="46" y="60" width="8" height="36" rx="4" />
      <rect x="4" y="46" width="36" height="8" rx="4" />
      <rect x="60" y="46" width="36" height="8" rx="4" />
      <rect x="14.5" y="14.5" width="8" height="30" rx="4" transform="rotate(-45 18.5 29.5)" />
      <rect x="77.5" y="14.5" width="8" height="30" rx="4" transform="rotate(45 81.5 29.5)" />
      <rect x="14.5" y="55.5" width="8" height="30" rx="4" transform="rotate(45 18.5 70.5)" />
      <rect x="77.5" y="55.5" width="8" height="30" rx="4" transform="rotate(-45 81.5 70.5)" />
    </svg>
  );
}

// ─── Auth Hook ──────────────────────────────────────────────────

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
          sessionStorage.setItem("dash_gh_token", data.github_token);
          sessionStorage.setItem("dash_gh_user", JSON.stringify(data.user));
          setToken(data.github_token);
          setUser(data.user);
          setLoading(false);
        })
        .catch((err) => { setError(err.message); setLoading(false); });
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

// ─── Graph Data Hook ────────────────────────────────────────────

const GRAPH_QUERIES = [
  { statement: `MATCH (p:Person) OPTIONAL MATCH (s:Session)-[:STARTED_BY]->(p) OPTIONAL MATCH (a:Artifact)-[:CONTRIBUTED_BY]->(p) WITH p, count(DISTINCT s) AS sessions, count(DISTINCT a) AS artifacts, max(s.date) AS lastSession RETURN p.name AS name, p.github AS github, p.role AS role, sessions, artifacts, lastSession ORDER BY sessions DESC` },
  { statement: `MATCH (a:Artifact) WHERE a.type IN ['decision','finding','pattern'] OPTIONAL MATCH (a)-[:CONTRIBUTED_BY]->(p:Person) OPTIONAL MATCH (a)-[:PART_OF]->(q:Quest) RETURN a.title AS title, a.type AS type, a.created AS created, a.description AS description, a.filePath AS filePath, p.name AS author, q.id AS quest ORDER BY a.created DESC LIMIT 30` },
  { statement: `MATCH (t:Todo)-[:BY]->(p:Person) OPTIONAL MATCH (t)-[:PART_OF]->(q:Quest) RETURN t.id AS id, t.text AS text, t.status AS status, t.created AS created, t.priority AS priority, p.name AS by, q.id AS quest ORDER BY t.priority DESC, t.created DESC LIMIT 50` },
];

function useGraphData(apiKey) {
  const [data, setData] = useState({ people: [], knowledge: [], todos: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const lastFetchRef = useRef(0);
  const lastKeyRef = useRef(null);

  const fetch_ = useCallback((force) => {
    if (!apiKey) return;
    const now = Date.now();
    if (!force && apiKey === lastKeyRef.current && now - lastFetchRef.current < 30000) return;
    lastFetchRef.current = now;
    lastKeyRef.current = apiKey;
    setLoading(true);
    graphBatch(apiKey, GRAPH_QUERIES)
      .then(res => {
        const results = res.results || [];
        setData({ people: toRecords(results[0]), knowledge: toRecords(results[1]), todos: toRecords(results[2]) });
        setError(null); setLoading(false);
      })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [apiKey]);

  useEffect(() => { fetch_(); }, [fetch_]);
  return { ...data, loading, error, refresh: fetch_ };
}

// ─── Panel ──────────────────────────────────────────────────────

function Panel({ title, children, style, rightHeader }) {
  return (
    <div style={{ border: `1px solid ${T.border}`, background: T.panel, ...style }}>
      {title && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${T.border}`, padding: "8px 14px" }}>
          <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 600, color: T.muted, letterSpacing: "0.08em" }}>{title}</span>
          {rightHeader}
        </div>
      )}
      {children}
    </div>
  );
}

// ─── Stat ───────────────────────────────────────────────────────

function Stat({ value, label, color }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "10px 20px" }}>
      <span style={{ fontFamily: mono, fontSize: 22, fontWeight: 700, color: color || T.text, fontVariantNumeric: "tabular-nums" }}>{value}</span>
      <span style={{ fontFamily: mono, fontSize: 9, fontWeight: 600, color: T.muted, letterSpacing: "0.1em", marginTop: 2 }}>{label}</span>
    </div>
  );
}

// ─── Toggle ─────────────────────────────────────────────────────

function Toggle({ options, value, onChange }) {
  return (
    <div style={{ display: "flex", border: `1px solid ${T.border}` }}>
      {options.map(opt => (
        <button key={opt} onClick={() => onChange(opt)} style={{
          fontFamily: mono, fontSize: 11, fontWeight: 600, letterSpacing: "0.06em",
          padding: "6px 16px", border: "none", cursor: "pointer",
          background: value === opt ? T.green : "transparent",
          color: value === opt ? T.bg : T.muted, userSelect: "none",
        }}>{opt.toUpperCase()}</button>
      ))}
    </div>
  );
}

// ─── Filter Bar ─────────────────────────────────────────────────

function FilterBar({ filters, active, onChange }) {
  return (
    <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${T.border}` }}>
      {filters.map(f => (
        <button key={f} onClick={() => onChange(f)} style={{
          fontFamily: mono, fontSize: 10, fontWeight: 600, letterSpacing: "0.06em",
          padding: "8px 14px", border: "none", cursor: "pointer",
          background: "transparent", userSelect: "none",
          color: active === f ? T.green : T.muted,
          borderBottom: active === f ? `2px solid ${T.green}` : "2px solid transparent",
        }}>{f.toUpperCase()}</button>
      ))}
    </div>
  );
}

// ─── Stream Item ────────────────────────────────────────────────

const TYPE_CFG = {
  handoff: { label: "HANDOFF", color: T.amber, prefix: "⇄" },
  todo: { label: "TODO", color: T.green, prefix: "☐" },
  session: { label: "SESSION", color: T.cyan, prefix: "●" },
  artifact: { label: "ARTIFACT", color: T.purple, prefix: "◆" },
  quest: { label: "QUEST", color: T.green, prefix: "⚑" },
};

function StreamItem({ item, selected, onClick }) {
  const cfg = TYPE_CFG[item._type] || { label: "?", color: T.muted, prefix: "·" };
  return (
    <div onClick={onClick} style={{
      padding: "10px 14px", cursor: "pointer", userSelect: "none",
      background: selected ? T.card : "transparent",
      borderLeft: selected ? `2px solid ${cfg.color}` : "2px solid transparent",
      borderBottom: `1px solid ${T.border}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span style={{ fontFamily: mono, fontSize: 10, color: T.dim, fontVariantNumeric: "tabular-nums" }}>{fmtTimestamp(item.date)}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 600, color: cfg.color, letterSpacing: "0.04em" }}>{cfg.prefix} {cfg.label}</span>
        <span style={{ fontFamily: mono, fontSize: 12, color: T.text, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {(item.title || item.topic || item.text || "").toLowerCase()}
        </span>
        {item.status && (
          <span style={{
            fontFamily: mono, fontSize: 9, fontWeight: 600, letterSpacing: "0.06em",
            padding: "2px 8px",
            color: item.status === "done" ? T.green : item.status === "pending" ? T.amber : item.status === "active" ? T.cyan : T.muted,
            border: `1px solid ${(item.status === "done" ? T.green : item.status === "pending" ? T.amber : item.status === "active" ? T.cyan : T.dim)}40`,
          }}>{item.status.toUpperCase()}</span>
        )}
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
        {item.by && <span style={{ fontFamily: mono, fontSize: 10, color: T.muted }}>{item.by}</span>}
        {item.author && !item.by && <span style={{ fontFamily: mono, fontSize: 10, color: T.muted }}>{item.author}</span>}
        {item.handedTo && <span style={{ fontFamily: mono, fontSize: 10, color: T.dim }}>→ {item.handedTo}</span>}
        {item.quest && <span style={{ fontFamily: mono, fontSize: 10, color: T.green }}>{item.quest}</span>}
      </div>
    </div>
  );
}

// ─── Detail Panel ───────────────────────────────────────────────

function KV({ label, value, color }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${T.border}` }}>
      <span style={{ fontFamily: mono, fontSize: 11, color: T.muted, letterSpacing: "0.04em" }}>{label}</span>
      <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 500, color: color || T.text }}>{value}</span>
    </div>
  );
}

function DetailPanel({ item }) {
  if (!item) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontFamily: mono, fontSize: 12, color: T.dim }}>// SELECT AN ITEM</div>
  );

  const cfg = TYPE_CFG[item._type] || {};
  const renderMd = (text) => {
    if (!text) return null;
    return text.split("\n").map((line, i) => {
      if (line.startsWith("## ")) return <div key={i} style={{ fontFamily: mono, fontSize: 12, fontWeight: 600, color: T.green, marginTop: 12, letterSpacing: "0.04em" }}>{line.slice(3).toUpperCase()}</div>;
      if (line.startsWith("### ")) return <div key={i} style={{ fontFamily: mono, fontSize: 11, fontWeight: 600, color: T.sub, marginTop: 8 }}>{line.slice(4).toUpperCase()}</div>;
      if (line.startsWith("- ")) return <div key={i} style={{ fontFamily: mono, fontSize: 11, color: T.sub, lineHeight: 1.6, paddingLeft: 12 }}>├ {line.slice(2)}</div>;
      if (line.startsWith("---")) return <div key={i} style={{ fontFamily: mono, fontSize: 11, color: T.border, margin: "6px 0" }}>────────────────────────────</div>;
      if (line.trim() === "") return <div key={i} style={{ height: 6 }} />;
      return <div key={i} style={{ fontFamily: mono, fontSize: 11, color: T.sub, lineHeight: 1.7 }}>{line}</div>;
    });
  };

  return (
    <div style={{ padding: 14, overflow: "auto", height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 700, color: cfg.color, letterSpacing: "0.06em" }}>{cfg.prefix} {cfg.label}</span>
        {item.status && <span style={{ fontFamily: mono, fontSize: 9, fontWeight: 600, color: T.muted, letterSpacing: "0.06em" }}>[{item.status.toUpperCase()}]</span>}
      </div>
      <div style={{ fontFamily: mono, fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 16, lineHeight: 1.4 }}>
        {(item.title || item.topic || item.text || "").toLowerCase()}
      </div>
      <div style={{ marginBottom: 16 }}>
        {item.date && <KV label="DATE" value={fmtDate(item.date)} />}
        {item.by && <KV label="BY" value={item.by} />}
        {item.author && <KV label="FROM" value={item.author} />}
        {item.handedTo && <KV label="TO" value={item.handedTo} />}
        {item.quest && <KV label="QUEST" value={item.quest} color={T.green} />}
        {item.priority >= 2 && <KV label="PRIORITY" value="★ HIGH" color={T.amber} />}
        {item.artifacts != null && <KV label="ARTIFACTS" value={String(item.artifacts)} />}
        {item.score != null && item.score > 0 && (
          <div style={{ padding: "6px 0", borderBottom: `1px solid ${T.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontFamily: mono, fontSize: 11, color: T.muted }}>SCORE</span>
              <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 500, color: T.text }}>{Math.round(item.score)}</span>
            </div>
            <span style={{ fontFamily: mono, fontSize: 11, color: T.green, letterSpacing: 1 }}>{progressBar(item.score, 100, 30)}</span>
          </div>
        )}
        {item.daysSince != null && <KV label="LAST ACTIVITY" value={`${item.daysSince}D AGO`} />}
        {item.filePath && <KV label="SOURCE" value={item.filePath} color={T.muted} />}
      </div>
      {item.description && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: mono, fontSize: 10, fontWeight: 600, color: T.dim, letterSpacing: "0.08em", marginBottom: 8 }}>DESCRIPTION</div>
          <div style={{ fontFamily: mono, fontSize: 11, color: T.sub, lineHeight: 1.7 }}>{item.description}</div>
        </div>
      )}
      {item.summary && (
        <div>
          <div style={{ fontFamily: mono, fontSize: 10, fontWeight: 600, color: T.dim, letterSpacing: "0.08em", marginBottom: 8 }}>SUMMARY</div>
          {renderMd(item.summary)}
        </div>
      )}
      {item.response && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontFamily: mono, fontSize: 10, fontWeight: 600, color: T.dim, letterSpacing: "0.08em", marginBottom: 8 }}>RESPONSE</div>
          <div style={{ fontFamily: mono, fontSize: 11, color: T.sub, lineHeight: 1.7 }}>{item.response}</div>
        </div>
      )}
    </div>
  );
}

// ─── People Row ─────────────────────────────────────────────────

function PeopleRow({ people }) {
  if (people.length === 0) return null;
  return (
    <Panel title="MEMBERS">
      <div style={{ display: "flex", overflowX: "auto" }}>
        {people.map((p, i) => {
          const online = isRecent(p.lastSession);
          return (
            <div key={i} style={{ padding: "10px 20px", borderRight: `1px solid ${T.border}`, minWidth: 140, flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: online ? T.green : T.dim }} />
                <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 600, color: online ? T.text : T.sub }}>{(p.name || "").toUpperCase()}</span>
              </div>
              <div style={{ fontFamily: mono, fontSize: 10, color: T.muted }}>{p.sessions || 0} SESSIONS · {p.artifacts || 0} ART.</div>
              <div style={{ fontFamily: mono, fontSize: 10, color: online ? T.green : T.dim, marginTop: 2 }}>{online ? "ONLINE" : `${timeAgo(p.lastSession)} AGO`}</div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

// ─── Manage View ────────────────────────────────────────────────

function CopyBtn({ text }) {
  const [c, setC] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setC(true); setTimeout(() => setC(false), 2000); }}
      style={{ fontFamily: mono, fontSize: 10, fontWeight: 600, color: T.text, background: T.card, border: `1px solid ${T.border}`, padding: "3px 10px", cursor: "pointer" }}>
      {c ? "COPIED" : "COPY"}
    </button>
  );
}

function ManageView({ org, token, currentUser, onRefresh }) {
  const [showKey, setShowKey] = useState(false);
  const [rm, setRm] = useState(null);
  const members = (org.members || []).filter(m => m.status !== "removed");

  return (
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12, overflow: "auto", height: "100%" }}>
      <Panel title="WORKSPACE">
        <div style={{ padding: "10px 14px" }}>
          <KV label="ORGANIZATION" value={org.name || org.slug} />
          <KV label="GITHUB_ORG" value={org.github_org || "—"} />
          <KV label="SLUG" value={org.slug} />
        </div>
      </Panel>
      <Panel title="API KEY">
        <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: mono, fontSize: 11, color: T.text, flex: 1 }}>{showKey ? org.api_key : "••••••••••••••••"}</span>
          <button onClick={() => setShowKey(!showKey)} style={{ fontFamily: mono, fontSize: 10, color: T.muted, background: "transparent", border: `1px solid ${T.border}`, padding: "3px 10px", cursor: "pointer" }}>{showKey ? "HIDE" : "SHOW"}</button>
          {org.api_key && <CopyBtn text={org.api_key} />}
        </div>
      </Panel>
      <Panel title={`MEMBERS (${members.length})`}>
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr 80px", padding: "6px 14px", borderBottom: `1px solid ${T.border}` }}>
            {["GITHUB", "NAME", "ROLE", ""].map((h, i) => <span key={i} style={{ fontFamily: mono, fontSize: 9, fontWeight: 600, color: T.dim, letterSpacing: "0.08em" }}>{h}</span>)}
          </div>
          {members.map((m, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr 80px", padding: "8px 14px", borderBottom: `1px solid ${T.border}`, alignItems: "center" }}>
              <span style={{ fontFamily: mono, fontSize: 11, color: T.green }}>{m.github_username}</span>
              <span style={{ fontFamily: mono, fontSize: 11, color: T.sub }}>{m.display_name || m.github_name || "—"}</span>
              <span style={{ fontFamily: mono, fontSize: 11, color: T.muted }}>{m.role}</span>
              {m.github_username?.toLowerCase() !== currentUser?.toLowerCase() ? (
                <button onClick={() => setRm(m)} style={{ fontFamily: mono, fontSize: 9, color: T.red, background: "transparent", border: `1px solid ${T.red}40`, padding: "3px 8px", cursor: "pointer" }}>REMOVE</button>
              ) : <span />}
            </div>
          ))}
        </div>
      </Panel>
      {rm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={() => setRm(null)}>
          <div style={{ background: T.panel, border: `1px solid ${T.border}`, padding: 20, maxWidth: 400, width: "90%", fontFamily: mono }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.red, marginBottom: 14 }}>REMOVE {rm.github_username?.toUpperCase()}</div>
            <button onClick={async () => { try { await removeMember(token, org.slug, rm.github_username, "revoke"); setRm(null); onRefresh?.(); } catch {} }}
              style={{ fontFamily: mono, fontSize: 11, color: "#fff", background: T.red, border: "none", padding: "5px 14px", cursor: "pointer", marginRight: 8 }}>CONFIRM</button>
            <button onClick={() => setRm(null)} style={{ fontFamily: mono, fontSize: 11, color: T.muted, background: "transparent", border: `1px solid ${T.border}`, padding: "5px 14px", cursor: "pointer" }}>CANCEL</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main ───────────────────────────────────────────────────────

export default function UserDashboard() {
  useEffect(() => { injectStyles(); }, []);
  const { token, user, error: authError, loading: authLoading, logout } = useAuth();
  const [perspective, setPerspective] = useState("me");
  const [filter, setFilter] = useState("all");
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [showManage, setShowManage] = useState(false);
  const [orgs, setOrgs] = useState(null);
  const [selectedSlug, setSelectedSlug] = useState(null);
  const [activity, setActivity] = useState(null);
  const intervalRef = useRef(null);

  const selectedOrg = orgs?.find(o => o.slug === selectedSlug) || null;
  const apiKey = selectedOrg?.api_key || null;
  const graph = useGraphData(apiKey);
  const me = user?.login || "";

  const fetchOrgs = useCallback(() => {
    if (!token) return;
    getMyEgregores(token).then(d => {
      setOrgs(d.egregores || []);
      setSelectedSlug(prev => prev || d.egregores?.[0]?.slug || null);
    }).catch(() => setOrgs(prev => prev || []));
  }, [token]);

  useEffect(() => { fetchOrgs(); intervalRef.current = setInterval(fetchOrgs, 60000); return () => clearInterval(intervalRef.current); }, [fetchOrgs]);

  useEffect(() => {
    if (!apiKey || !user?.login) return;
    getActivityDashboard(apiKey, user.login).then(setActivity).catch(() => {});
  }, [apiKey, user?.login]);

  // ── Build stream ──
  const buildStream = () => {
    const items = [];
    const myHandoffs = (activity?.handoffs_to_me || []).map(h => ({ _type: "handoff", date: h.date, title: h.topic, topic: h.topic, status: h.status, author: h.author || h.from, handedTo: h.handedTo, summary: h.summary, response: h.response, by: h.author || h.from }));
    const allHandoffs = (activity?.all_handoffs || []).map(h => ({ _type: "handoff", date: h.date, title: h.topic, topic: h.topic, status: h.status || "info", author: h.from, handedTo: h.to, summary: h.summary, response: h.response, by: h.from }));
    const mySessions = (activity?.my_sessions || []).map(s => ({ _type: "session", date: s.date, title: s.topic, topic: s.topic, status: isRecent(s.date) ? "active" : undefined, by: me }));
    const teamSessions = (activity?.team_sessions || []).map(s => ({ _type: "session", date: s.date, title: s.topic, topic: s.topic, status: isRecent(s.date) ? "active" : undefined, by: s.by }));
    const todos = graph.todos.map(t => ({ _type: "todo", date: t.created, title: t.text, text: t.text, status: t.status, by: t.by, quest: t.quest, priority: t.priority }));
    const knowledge = graph.knowledge.map(a => ({ _type: "artifact", date: a.created, title: a.title, description: a.description, author: a.author, quest: a.quest, filePath: a.filePath, status: a.type, by: a.author }));
    const quests = (activity?.quests || []).map(q => ({ _type: "quest", date: null, title: q.title || q.quest, topic: q.quest, status: "active", artifacts: q.artifacts, daysSince: q.daysSince, score: q.score, by: null }));

    if (perspective === "me") {
      items.push(...myHandoffs, ...mySessions);
      items.push(...todos.filter(t => t.by?.toLowerCase() === me.toLowerCase()));
      items.push(...knowledge.filter(a => a.author?.toLowerCase() === me.toLowerCase()));
      items.push(...quests);
    } else {
      const seen = new Set(myHandoffs.map(h => h.topic + h.date));
      items.push(...myHandoffs, ...allHandoffs.filter(h => !seen.has(h.topic + h.date)));
      items.push(...mySessions, ...teamSessions);
      items.push(...todos, ...knowledge, ...quests);
    }

    const filtered = filter === "all" ? items : items.filter(i => {
      if (filter === "handoffs") return i._type === "handoff";
      if (filter === "todos") return i._type === "todo";
      if (filter === "sessions") return i._type === "session";
      if (filter === "knowledge") return i._type === "artifact";
      if (filter === "quests") return i._type === "quest";
      return true;
    });

    return filtered.sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(b.date) - new Date(a.date);
    });
  };

  const stream = buildStream();
  const selected = selectedIdx != null ? stream[selectedIdx] : null;
  const counts = { handoff: 0, todo: 0, session: 0, artifact: 0, quest: 0 };
  stream.forEach(i => { if (counts[i._type] != null) counts[i._type]++; });

  // ── Auth screens ──
  if (!token && !authLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: T.bg }}>
        <Panel title="EGREGORE" style={{ maxWidth: 360, width: "90%" }}>
          <div style={{ padding: "30px 20px", textAlign: "center" }}>
            <Logo size={32} /><br /><br />
            <div style={{ fontFamily: mono, fontSize: 11, color: T.muted, marginBottom: 20 }}>// SIGN IN TO ACCESS YOUR WORKSPACE</div>
            {authError && <div style={{ fontFamily: mono, fontSize: 11, color: T.red, marginBottom: 12 }}>{authError}</div>}
            <button onClick={() => { sessionStorage.setItem("dash_auth_pending", "1"); window.location.href = getGitHubAuthUrl("joiner"); }}
              style={{ fontFamily: mono, fontSize: 12, fontWeight: 600, padding: "10px 24px", background: T.green, color: T.bg, border: "none", cursor: "pointer", letterSpacing: "0.04em" }}>
              SIGN IN WITH GITHUB
            </button>
          </div>
        </Panel>
      </div>
    );
  }
  if (authLoading || !orgs) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: T.bg }}>
        <Logo size={24} />
        <span style={{ fontFamily: mono, fontSize: 12, color: T.muted, marginLeft: 10 }}>{authLoading ? "AUTHENTICATING..." : "LOADING..."}</span>
      </div>
    );
  }
  if (orgs.length === 0) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: T.bg }}>
        <Panel title="NO INSTANCES" style={{ maxWidth: 360, width: "90%" }}>
          <div style={{ padding: 20, textAlign: "center", fontFamily: mono }}>
            <div style={{ fontSize: 12, color: T.text, marginBottom: 8 }}>NO EGREGORE INSTANCES FOUND</div>
            <div style={{ fontSize: 11, color: T.muted }}>VISIT <a href="/setup" style={{ color: T.green, textDecoration: "none" }}>EGREGORE.XYZ/SETUP</a></div>
            <button onClick={logout} style={{ fontFamily: mono, fontSize: 10, color: T.muted, background: "transparent", border: `1px solid ${T.border}`, padding: "4px 12px", cursor: "pointer", marginTop: 12 }}>LOGOUT</button>
          </div>
        </Panel>
      </div>
    );
  }

  // ── Dashboard ──
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: T.bg, color: T.text, fontFamily: mono, overflow: "hidden" }}>
      {/* TOP BAR */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", height: 44, borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Logo size={18} />
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.1em" }}>EGREGORE</span>
          <span style={{ fontSize: 10, color: T.dim }}>// {(selectedOrg?.slug || "").toUpperCase()}</span>
          {orgs.length > 1 && (
            <select value={selectedOrg?.slug || ""} onChange={e => setSelectedSlug(e.target.value)}
              style={{ fontFamily: mono, fontSize: 10, color: T.green, background: "transparent", border: `1px solid ${T.border}`, padding: "2px 6px", cursor: "pointer", outline: "none" }}>
              {orgs.map(o => <option key={o.slug} value={o.slug}>{o.slug.toUpperCase()}</option>)}
            </select>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Toggle options={["me", "org"]} value={perspective} onChange={(v) => { setPerspective(v); setSelectedIdx(null); }} />
          <button onClick={() => setShowManage(!showManage)} style={{
            fontFamily: mono, fontSize: 10, fontWeight: 600, letterSpacing: "0.06em",
            color: showManage ? T.bg : T.muted, background: showManage ? T.green : "transparent",
            border: `1px solid ${showManage ? T.green : T.border}`, padding: "5px 12px", cursor: "pointer",
          }}>⚙ MANAGE</button>
          <span style={{ fontSize: 10, color: T.sub }}>{me.toUpperCase()}</span>
          <button onClick={logout} style={{ fontFamily: mono, fontSize: 9, color: T.dim, background: "transparent", border: `1px solid ${T.border}`, padding: "3px 8px", cursor: "pointer" }}>LOGOUT</button>
        </div>
      </div>

      {/* STATS BAR */}
      <div style={{ display: "flex", borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
        <Stat value={counts.session} label="SESSIONS" color={T.cyan} />
        <div style={{ width: 1, background: T.border }} />
        <Stat value={counts.handoff} label="HANDOFFS" color={T.amber} />
        <div style={{ width: 1, background: T.border }} />
        <Stat value={counts.todo} label="TODOS" color={T.green} />
        <div style={{ width: 1, background: T.border }} />
        <Stat value={counts.quest} label="QUESTS" color={T.green} />
        <div style={{ width: 1, background: T.border }} />
        <Stat value={counts.artifact} label="ARTIFACTS" color={T.purple} />
        {perspective === "org" && <>
          <div style={{ width: 1, background: T.border }} />
          <Stat value={graph.people.length} label="PEOPLE" color={T.text} />
        </>}
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", alignItems: "center", padding: "0 14px", fontSize: 9, color: T.dim }}>// {stream.length} ITEMS</div>
      </div>

      {/* PEOPLE ROW (ORG) */}
      {perspective === "org" && !showManage && <PeopleRow people={graph.people} />}

      {/* MAIN */}
      {showManage ? (
        <ManageView org={selectedOrg} token={token} currentUser={me} onRefresh={fetchOrgs} />
      ) : (
        <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
          {/* STREAM */}
          <div style={{ width: "50%", display: "flex", flexDirection: "column", borderRight: `1px solid ${T.border}` }}>
            <FilterBar filters={["all", "handoffs", "todos", "sessions", "knowledge", "quests"]} active={filter} onChange={(f) => { setFilter(f); setSelectedIdx(null); }} />
            <div style={{ flex: 1, overflow: "auto" }}>
              {stream.length === 0 ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, fontSize: 12, color: T.dim }}>// NO ITEMS</div>
              ) : stream.map((item, i) => (
                <StreamItem key={`${item._type}-${i}`} item={item} selected={selectedIdx === i} onClick={() => setSelectedIdx(i)} />
              ))}
            </div>
          </div>
          {/* DETAIL */}
          <div style={{ width: "50%", display: "flex", flexDirection: "column" }}>
            <div style={{ borderBottom: `1px solid ${T.border}`, padding: "8px 14px" }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: T.muted, letterSpacing: "0.08em" }}>DETAIL</span>
            </div>
            <div style={{ flex: 1, overflow: "auto" }}>
              <DetailPanel item={selected} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
