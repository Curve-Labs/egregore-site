import { useState, useEffect, useCallback, useRef } from "react";
import {
  getGitHubAuthUrl, exchangeCode, getMyEgregores,
  removeMember, getTerminalUrl, graphBatch, getActivityDashboard,
} from "./api";

// ─── Design tokens ──────────────────────────────────────────────

const mono = "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace";
const T = {
  bg: "#0C0C0C",
  card: "#171717",
  border: "#1F1F1F",
  green: "#22C55E",
  text: "#E5E5E5",
  muted: "#525252",
  dim: "#737373",
  sub: "#A3A3A3",
  red: "#EF4444",
  redDark: "#7F1D1D",
  amber: "#F59E0B",
  blue: "#3B82F6",
  purple: "#8B5CF6",
  greenBg: "#0C2A15",
  greenBorder: "#14532D",
};

// ─── Logo SVG ───────────────────────────────────────────────────

function LogoIcon({ size = 20, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill={color} xmlns="http://www.w3.org/2000/svg">
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

// ─── Helpers ────────────────────────────────────────────────────

function timeAgo(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return "";
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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

function isRecent(dateStr, hoursThreshold = 4) {
  if (!dateStr) return false;
  return (Date.now() - new Date(dateStr).getTime()) / 3600000 < hoursThreshold;
}

function CopyButton({ text, label = "copy" }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      style={styles.copyBtn}
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? "copied" : label}
    </button>
  );
}

function Dot({ color, size = 8 }) {
  return (
    <span style={{
      display: "inline-block", width: size, height: size,
      borderRadius: "50%", background: color, flexShrink: 0,
    }} />
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

// ─── Graph data hook (people + knowledge only) ─────────────────

const GRAPH_QUERIES = [
  { // 0: people
    statement: `
      MATCH (p:Person)
      OPTIONAL MATCH (s:Session)-[:STARTED_BY]->(p)
      OPTIONAL MATCH (a:Artifact)-[:CONTRIBUTED_BY]->(p)
      WITH p, count(DISTINCT s) AS sessions, count(DISTINCT a) AS artifacts, max(s.date) AS lastSession
      RETURN p.name AS name, p.github AS github, p.role AS role, sessions, artifacts, lastSession
      ORDER BY sessions DESC`,
  },
  { // 1: knowledge
    statement: `
      MATCH (a:Artifact)
      WHERE a.type IN ['decision', 'finding', 'pattern']
      OPTIONAL MATCH (a)-[:CONTRIBUTED_BY]->(p:Person)
      OPTIONAL MATCH (a)-[:PART_OF]->(q:Quest)
      RETURN a.title AS title, a.type AS type, a.created AS created,
             a.description AS description, a.filePath AS filePath,
             p.name AS author, q.id AS quest
      ORDER BY a.created DESC LIMIT 30`,
  },
  { // 2: todos (full list for todos tab)
    statement: `
      MATCH (t:Todo)-[:BY]->(p:Person)
      OPTIONAL MATCH (t)-[:PART_OF]->(q:Quest)
      RETURN t.id AS id, t.text AS text, t.status AS status,
             t.created AS created, t.priority AS priority,
             p.name AS by, q.id AS quest
      ORDER BY t.priority DESC, t.created DESC LIMIT 50`,
  },
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
    const keyChanged = apiKey !== lastKeyRef.current;
    if (!force && !keyChanged && now - lastFetchRef.current < 30000) return;
    lastFetchRef.current = now;
    lastKeyRef.current = apiKey;
    setLoading(true);
    graphBatch(apiKey, GRAPH_QUERIES)
      .then(res => {
        const results = res.results || [];
        setData({
          people: toRecords(results[0]),
          knowledge: toRecords(results[1]),
          todos: toRecords(results[2]),
        });
        setError(null);
        setLoading(false);
      })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [apiKey]);

  useEffect(() => { fetch_(); }, [fetch_]);

  return { ...data, loading, error, refresh: fetch_ };
}

// ─── Nav config ─────────────────────────────────────────────────

const NAV = [
  { key: "home", label: "home" },
  { key: "people", label: "people" },
  { key: "knowledge", label: "knowledge" },
  { key: "quests", label: "quests" },
  { key: "todos", label: "todos" },
  { key: "handoffs", label: "handoffs" },
  { key: "activity", label: "activity" },
  { key: "manage", label: "manage" },
];

// ─── Sidebar ────────────────────────────────────────────────────

function Sidebar({ view, onNavigate, orgs, selectedOrg, onSelectOrg, user, onLogout }) {
  return (
    <div style={styles.sidebar}>
      <div style={styles.sidebarTop}>
        <div style={styles.logo}>
          <LogoIcon size={22} color={T.green} />
          <span style={styles.logoText}>EGREGORE</span>
        </div>
        <nav style={styles.nav}>
          {NAV.map(item => {
            const active = view === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onNavigate(item.key)}
                style={{ ...styles.navItem, ...(active ? styles.navItemActive : {}) }}
              >
                <span style={{ ...styles.navIndicator, color: active ? T.green : T.muted }}>
                  {active ? ">" : "\u25CB"}
                </span>
                <span style={{ ...styles.navLabel, color: active ? T.text : T.dim }}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {orgs && orgs.length > 1 ? (
          <div style={styles.wsWidget}>
            <span style={styles.wsLabel}>// workspace</span>
            <select
              value={selectedOrg?.slug || ""}
              onChange={e => {
                const org = orgs.find(o => o.slug === e.target.value);
                if (org) onSelectOrg(org);
              }}
              style={styles.wsSelect}
            >
              {orgs.map(o => (
                <option key={o.slug} value={o.slug}>{o.slug}</option>
              ))}
            </select>
          </div>
        ) : selectedOrg ? (
          <div style={styles.wsWidget}>
            <span style={styles.wsLabel}>// workspace</span>
            <span style={styles.wsName}>{selectedOrg.slug}</span>
          </div>
        ) : null}
        <div style={styles.wsWidget}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: mono, fontSize: 12, color: T.sub }}>
              {user?.login || ""}
            </span>
            <button onClick={onLogout} style={styles.logoutBtn}>logout</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page Header ────────────────────────────────────────────────

function PageHeader({ orgName, title, stats }) {
  return (
    <div style={styles.topBar}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={styles.titleOrg}>// {(orgName || "").toLowerCase()}</span>
        <span style={styles.titleText}>{title.toLowerCase()}</span>
      </div>
      {stats && stats.length > 0 && (
        <div style={styles.statsRow}>
          {stats.map((st, i) => (
            <div key={i} style={styles.stat}>
              <span style={{ ...styles.statVal, color: st.color || T.text }}>{st.value}</span>
              <span style={styles.statLabel}>{st.label.toLowerCase()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SectionHeader({ children }) {
  return <div style={styles.sectionHeader}>{typeof children === "string" ? children.toLowerCase() : children}</div>;
}

function EmptyState({ text }) {
  return <div style={styles.emptyState}>// {text}</div>;
}

function TabBar({ tabs, active, onChange }) {
  return (
    <div style={styles.tabs}>
      {tabs.map(t => (
        <button
          key={t}
          onClick={() => onChange(t)}
          style={{
            ...styles.tab,
            color: active === t ? T.text : T.dim,
            fontWeight: active === t ? 500 : 400,
          }}
        >{t}</button>
      ))}
    </div>
  );
}

// ─── Home View ──────────────────────────────────────────────────

function HomeView({ orgName, graph, activity, org }) {
  const feedItems = (() => {
    if (!activity) return [];
    const mySessions = (activity.my_sessions || []).slice(0, 4);
    const teamSessions = (activity.team_sessions || []).slice(0, 4);
    return [
      ...mySessions.map(s => ({ ...s, who: activity.me })),
      ...teamSessions.map(s => ({ ...s, who: s.by })),
    ]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 8)
      .map(s => ({
        time: timeAgo(s.date),
        who: (s.who || "").toLowerCase(),
        text: (s.topic || "session").toLowerCase(),
        recent: isRecent(s.date),
      }));
  })();

  const people = graph.people.map(p => ({
    name: p.name || "",
    online: isRecent(p.lastSession),
    status: isRecent(p.lastSession) ? "active" : `${timeAgo(p.lastSession)} ago`,
  }));

  const threads = (() => {
    if (!activity) return [];
    return (activity.handoffs_to_me || [])
      .filter(h => h.status === "pending" || h.status === "read")
      .slice(0, 4)
      .map(h => ({
        title: (h.topic || "untitled").toLowerCase(),
        meta: `${(h.author || "").toLowerCase()} · ${h.status}`,
        blocked: false,
      }));
  })();

  const questCount = activity?.quests?.length || 0;

  return (
    <div style={styles.content}>
      <PageHeader
        orgName={orgName}
        title="home"
        stats={[
          { value: String(graph.knowledge.length || 0), label: "artifacts" },
          { value: String(questCount), label: "quests" },
          { value: String(questCount), label: "active", color: T.green },
        ]}
      />
      <div style={styles.columns}>
        <div style={styles.mainCol}>
          <SectionHeader>pulse</SectionHeader>
          {feedItems.length === 0 ? <EmptyState text="no recent activity" /> : (
            <div style={styles.feed}>
              {feedItems.map((item, i) => (
                <div key={i} style={styles.feedItem}>
                  <span style={styles.feedTime}>{item.time}</span>
                  <Dot color={item.recent ? T.green : T.muted} size={item.recent ? 8 : 6} />
                  <span style={{ ...styles.feedWho, color: item.recent ? T.green : T.dim }}>{item.who}</span>
                  <span style={{ ...styles.feedText, color: item.recent ? T.text : T.dim }}>{item.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={styles.rightPanel}>
          <SectionHeader>people</SectionHeader>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {people.map((p, i) => (
              <div key={i} style={styles.personRow}>
                <Dot color={p.online ? T.green : T.muted} />
                <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 500, color: p.online ? T.text : T.dim }}>
                  {p.name.toLowerCase()}
                </span>
                <span style={{ fontFamily: mono, fontSize: 11, marginLeft: "auto", color: p.online ? T.sub : T.muted }}>
                  {p.status.toLowerCase()}
                </span>
              </div>
            ))}
          </div>
          {org?.hosting_enabled && (
            <WorkspaceButton org={org} />
          )}
          {threads.length > 0 && (
            <>
              <SectionHeader>open threads</SectionHeader>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {threads.map((t, i) => (
                  <div key={i} style={styles.threadItem}>
                    <span style={{ fontFamily: mono, fontSize: 12, color: T.text }}>{t.title}</span>
                    <span style={{ fontFamily: mono, fontSize: 11, color: t.blocked ? T.red : T.muted }}>{t.meta}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── People View ────────────────────────────────────────────────

function PeopleView({ orgName, graph, orgMembers }) {
  const members = graph.people.map(p => {
    const orgMember = orgMembers.find(m =>
      m.github_username?.toLowerCase() === (p.github || "").toLowerCase()
    );
    return {
      name: p.name || "",
      github: p.github || "",
      role: orgMember?.role || p.role || "member",
      online: isRecent(p.lastSession),
      lastSeen: `${timeAgo(p.lastSession)} ago`,
      sessions: p.sessions || 0,
      artifacts: p.artifacts || 0,
      status: orgMember?.status || "active",
    };
  }).filter(m => m.status !== "removed");
  const onlineCount = members.filter(m => m.online).length;

  return (
    <div style={styles.content}>
      <PageHeader
        orgName={orgName}
        title="people"
        stats={[
          { value: String(members.length), label: "members" },
          { value: String(onlineCount), label: "online", color: T.green },
        ]}
      />
      {members.length === 0 ? <EmptyState text="no members found" /> : (
        <div style={styles.peopleGrid}>
          {members.map((m, i) => (
            <div key={i} style={styles.personCard}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Dot color={m.online ? T.green : T.muted} size={10} />
                <span style={{ fontFamily: mono, fontSize: 16, fontWeight: 500, color: T.text }}>{m.name}</span>
              </div>
              <span style={{ fontFamily: mono, fontSize: 12, color: T.muted }}>@{m.github}</span>
              <span style={{ fontFamily: mono, fontSize: 12, color: T.green }}>{m.role}</span>
              <div style={{ display: "flex", gap: 20 }}>
                <span style={{ fontFamily: mono, fontSize: 11, color: T.dim }}>{m.sessions} sessions</span>
                <span style={{ fontFamily: mono, fontSize: 11, color: T.dim }}>{m.artifacts} artifacts</span>
              </div>
              <span style={{ fontFamily: mono, fontSize: 11, color: m.online ? T.green : T.muted }}>
                {m.online ? "active now" : `last: ${m.lastSeen}`}
              </span>
            </div>
          ))}
          <button style={styles.inviteCard}>
            <span style={{ fontFamily: mono, fontSize: 24, color: T.green }}>+</span>
            <span style={{ fontFamily: mono, fontSize: 12, color: T.green, fontWeight: 500 }}>invite member</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Knowledge View ─────────────────────────────────────────────

function KnowledgeView({ orgName, items }) {
  const [tab, setTab] = useState("all");
  const [selected, setSelected] = useState(0);
  const filtered = tab === "all" ? items : items.filter(it => it.type === tab);
  const active = filtered[selected] || filtered[0];
  const typeColor = { decision: T.green, finding: T.amber, pattern: T.purple };

  return (
    <div style={styles.content}>
      <PageHeader
        orgName={orgName}
        title="knowledge"
        stats={[
          { value: String(items.filter(i => i.type === "decision").length), label: "decisions", color: T.green },
          { value: String(items.filter(i => i.type === "finding").length), label: "findings", color: T.amber },
          { value: String(items.filter(i => i.type === "pattern").length), label: "patterns", color: T.purple },
        ]}
      />
      <div style={styles.columns}>
        <div style={styles.mainCol}>
          <TabBar tabs={["all", "decisions", "findings", "patterns"]} active={tab === "all" ? "all" : tab + "s"} onChange={t => { setTab(t === "all" ? "all" : t.slice(0, -1)); setSelected(0); }} />
          <div style={styles.divider} />
          {filtered.length === 0 ? <EmptyState text={`no ${tab === "all" ? "" : tab + " "}artifacts`} /> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filtered.map((item, i) => (
                <button
                  key={i}
                  onClick={() => setSelected(i)}
                  style={{
                    ...styles.knowledgeItem,
                    background: selected === i ? "#1F1F1F" : "transparent",
                  }}
                >
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 500, color: typeColor[item.type] || T.green }}>{item.type}</span>
                    <span style={{ fontFamily: mono, fontSize: 10, color: T.muted }}>{formatDate(item.created)}</span>
                  </div>
                  <span style={{ fontFamily: mono, fontSize: 14, fontWeight: 500, color: T.text }}>
                    {(item.title || "").toLowerCase()}
                  </span>
                  {item.description && (
                    <span style={{ fontFamily: mono, fontSize: 12, color: T.dim, lineHeight: 1.5 }}>
                      {item.description.toLowerCase().slice(0, 120)}
                    </span>
                  )}
                  <div style={{ display: "flex", gap: 12 }}>
                    {item.author && <span style={{ fontFamily: mono, fontSize: 11, color: T.dim }}>{item.author}</span>}
                    {item.quest && <span style={{ fontFamily: mono, fontSize: 11, color: T.muted }}>{item.quest}</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        {active && (
          <div style={styles.threadPanel}>
            <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 500, color: T.dim }}>thread</span>
            <div style={styles.divider} />
            <span style={{ fontFamily: mono, fontSize: 14, fontWeight: 500, color: T.text }}>
              {(active.title || "").toLowerCase()}
            </span>
            <span style={{ fontFamily: mono, fontSize: 12, color: T.sub, lineHeight: 1.6 }}>
              {(active.description || active.title || "").toLowerCase()}
            </span>
            {active.filePath && (
              <>
                <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 500, color: T.dim, marginTop: 8 }}>source</span>
                <span style={{ fontFamily: mono, fontSize: 11, color: T.muted }}>{active.filePath}</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Quests View ────────────────────────────────────────────────

function QuestsView({ orgName, quests }) {
  const active = quests.filter(q => q.status === "active");
  const completed = quests.filter(q => q.status === "completed");

  return (
    <div style={styles.content}>
      <PageHeader
        orgName={orgName}
        title="quests"
        stats={[
          { value: String(active.length), label: "active", color: T.green },
          { value: String(completed.length), label: "completed" },
        ]}
      />
      {quests.length === 0 ? <EmptyState text="no quests" /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {quests.map((q, i) => {
            const isActive = q.status === "active";
            const people = (q.people || []).filter(Boolean).join(" · ");
            return (
              <div key={i} style={{ ...styles.questCard, borderLeft: `3px solid ${isActive ? T.green : T.muted}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 500, color: isActive ? T.green : T.dim }}>{q.id}</span>
                  <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 500, color: isActive ? T.green : T.dim }}>{q.status}</span>
                </div>
                <span style={{ fontFamily: mono, fontSize: 15, fontWeight: 500, color: isActive ? T.text : T.dim }}>
                  {(q.title || "").toLowerCase()}
                </span>
                {q.description && (
                  <span style={{ fontFamily: mono, fontSize: 12, lineHeight: 1.5, color: isActive ? T.sub : T.muted }}>
                    {q.description.toLowerCase()}
                  </span>
                )}
                <div style={{ display: "flex", gap: 20 }}>
                  <span style={{ fontFamily: mono, fontSize: 11, color: T.muted }}>{q.artifacts || 0} artifacts</span>
                  <span style={{ fontFamily: mono, fontSize: 11, color: T.muted }}>{q.daysSince != null ? `${q.daysSince}d ago` : timeAgo(q.lastActivity)}</span>
                  {q.score && <span style={{ fontFamily: mono, fontSize: 11, color: T.dim }}>score: {Math.round(q.score)}</span>}
                  {people && <span style={{ fontFamily: mono, fontSize: 11, color: T.muted }}>{people}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Todos View ─────────────────────────────────────────────────

function TodosView({ orgName, todos, todosMerged, pendingQuestions }) {
  const [tab, setTab] = useState("open");
  const open = todos.filter(t => t.status === "open" || t.status === "blocked" || t.status === "deferred");
  const done = todos.filter(t => t.status === "done");
  const filtered = tab === "open" ? open : tab === "done" ? done : todos;
  const blocked = todosMerged?.blockedCount || 0;
  const staleBlocked = todosMerged?.staleBlockedCount || 0;

  return (
    <div style={styles.content}>
      <PageHeader
        orgName={orgName}
        title="todos"
        stats={[
          { value: String(open.length), label: "active", color: T.green },
          { value: String(blocked), label: "blocked", color: blocked > 0 ? T.red : undefined },
          { value: String(done.length), label: "done" },
        ]}
      />
      {staleBlocked > 0 && (
        <div style={{ fontFamily: mono, fontSize: 11, color: T.red, padding: "4px 0 8px" }}>
          // {staleBlocked} blocked 3+ days
        </div>
      )}
      <TabBar tabs={["open", "done", "all"]} active={tab} onChange={setTab} />
      <div style={styles.divider} />
      {filtered.length === 0 ? <EmptyState text={`no ${tab} todos`} /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((todo, i) => {
            const isDone = todo.status === "done";
            const isBlocked = todo.status === "blocked";
            const borderColor = isBlocked ? T.red : isDone ? T.muted : T.green;
            return (
              <div key={i} style={{
                ...styles.todoItem,
                borderLeft: `3px solid ${borderColor}`,
                opacity: isDone ? 0.6 : 1,
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <span style={{ fontFamily: mono, fontSize: 16, flexShrink: 0, marginTop: -1, color: isDone ? T.green : isBlocked ? T.red : T.muted }}>
                    {isDone ? "\u2611" : isBlocked ? "\u2612" : "\u2610"}
                  </span>
                  <span style={{
                    fontFamily: mono, fontSize: 13, lineHeight: 1.5,
                    color: isDone ? T.dim : T.text,
                    textDecoration: isDone ? "line-through" : "none",
                  }}>{(todo.text || "").toLowerCase()}</span>
                </div>
                <div style={{ display: "flex", gap: 16, paddingLeft: 28 }}>
                  <span style={{ fontFamily: mono, fontSize: 11, color: T.muted }}>{todo.by}</span>
                  <span style={{ fontFamily: mono, fontSize: 11, color: T.muted }}>{formatDate(todo.created)}</span>
                  {todo.quest && <span style={{ fontFamily: mono, fontSize: 11, color: T.green }}>{todo.quest}</span>}
                  {todo.priority >= 2 && <span style={{ fontFamily: mono, fontSize: 11, color: T.amber }}>★</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* Pending questions */}
      {pendingQuestions.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <SectionHeader>// pending questions</SectionHeader>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {pendingQuestions.map((q, i) => (
              <div key={i} style={{ ...styles.card, borderLeft: `3px solid ${T.purple}` }}>
                <span style={{ fontFamily: mono, fontSize: 13, color: T.text }}>
                  {(q.topic || "").toLowerCase()}
                </span>
                <span style={{ fontFamily: mono, fontSize: 11, color: T.dim }}>
                  from {q.from} · {timeAgo(q.created)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Handoffs View ──────────────────────────────────────────────

function HandoffsView({ orgName, handoffs }) {
  const [tab, setTab] = useState("all");
  const [expanded, setExpanded] = useState({});
  const statusColor = { pending: T.amber, read: T.blue, done: T.green };
  const pending = handoffs.filter(h => h.status === "pending");
  const read = handoffs.filter(h => h.status === "read");
  const done = handoffs.filter(h => h.status === "done");
  const filtered = tab === "all" ? handoffs : handoffs.filter(h => h.status === tab);

  const toggle = (i) => setExpanded(prev => ({ ...prev, [i]: !prev[i] }));

  return (
    <div style={styles.content}>
      <PageHeader
        orgName={orgName}
        title="handoffs"
        stats={[
          { value: String(pending.length), label: "pending", color: T.amber },
          { value: String(read.length), label: "read", color: T.blue },
          { value: String(done.length), label: "done", color: T.green },
        ]}
      />
      <TabBar tabs={["all", "pending", "read", "done"]} active={tab} onChange={setTab} />
      <div style={styles.divider} />
      {filtered.length === 0 ? <EmptyState text={`no ${tab} handoffs`} /> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((h, i) => {
            const isOpen = !!expanded[i];
            const hasContent = h.filePath || h.response || h.summary;
            return (
              <div key={i} style={{ ...styles.handoffCard, borderLeft: `3px solid ${statusColor[h.status] || T.muted}` }}>
                <div
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: hasContent ? "pointer" : "default" }}
                  onClick={() => hasContent && toggle(i)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {hasContent && (
                      <span style={{ fontFamily: mono, fontSize: 10, color: T.muted, transition: "transform 0.15s", transform: isOpen ? "rotate(90deg)" : "rotate(0deg)" }}>
                        ▶
                      </span>
                    )}
                    <span style={{ fontFamily: mono, fontSize: 14, fontWeight: 500, color: T.text }}>
                      {(h.topic || "untitled").toLowerCase()}
                    </span>
                  </div>
                  <span style={{ fontFamily: mono, fontSize: 10, fontWeight: 500, color: statusColor[h.status] || T.dim }}>
                    {h.status}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 20 }}>
                  <span style={{ fontFamily: mono, fontSize: 11, color: T.muted }}>
                    <span style={{ color: T.dim }}>from</span> {h.author}
                  </span>
                  {h.handedTo && (
                    <span style={{ fontFamily: mono, fontSize: 11, color: T.muted }}>
                      <span style={{ color: T.dim }}>to</span> {h.handedTo}
                    </span>
                  )}
                  <span style={{ fontFamily: mono, fontSize: 11, color: T.muted }}>{formatDate(h.date)}</span>
                </div>
                {isOpen && (
                  <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 12, marginTop: 4, display: "flex", flexDirection: "column", gap: 10 }}>
                    {h.response && (
                      <div>
                        <span style={{ fontFamily: mono, fontSize: 10, color: T.dim, display: "block", marginBottom: 4 }}>// response</span>
                        <span style={{ fontFamily: mono, fontSize: 12, color: T.sub, lineHeight: 1.6 }}>{h.response}</span>
                      </div>
                    )}
                    {h.summary && (
                      <div>
                        <span style={{ fontFamily: mono, fontSize: 10, color: T.dim, display: "block", marginBottom: 4 }}>// summary</span>
                        <span style={{ fontFamily: mono, fontSize: 12, color: T.sub, lineHeight: 1.6 }}>{h.summary.toLowerCase()}</span>
                      </div>
                    )}
                    {h.filePath && (
                      <div>
                        <span style={{ fontFamily: mono, fontSize: 10, color: T.dim, display: "block", marginBottom: 4 }}>// source</span>
                        <span style={{ fontFamily: mono, fontSize: 11, color: T.muted }}>{h.filePath}</span>
                      </div>
                    )}
                    {!h.response && !h.summary && h.filePath && (
                      <span style={{ fontFamily: mono, fontSize: 11, color: T.muted }}>// content available in memory repo</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Activity View ──────────────────────────────────────────────

function ActivityView({ orgName, sessions, trends, activity }) {
  const cadence = trends?.cadence || [];
  const thisWeek = cadence.find(c => c.weeksAgo === 0)?.sessions || 0;
  const lastWeek = cadence.find(c => c.weeksAgo === 1)?.sessions || 0;
  const resolution = trends?.resolution || {};
  const throughput = trends?.throughput || {};
  const checkins = activity?.checkins || [];

  const me = activity?.me || "";
  const mySessions = (activity?.my_sessions || []).map(s => ({ ...s, who: me, isMine: true }));
  const teamSessions = (activity?.team_sessions || []).map(s => ({ ...s, who: s.by, isMine: false }));

  // Group sessions by date
  const groupByDate = (items) => {
    const groups = {};
    items.forEach(s => {
      const d = s.date ? new Date(s.date) : null;
      const key = d ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "unknown";
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    });
    return Object.entries(groups);
  };

  // Interleave checkins into my sessions
  const myCheckins = checkins.filter(c => c.by === me).map(c => ({ ...c, _type: "checkin" }));
  const myItems = [...mySessions.map(s => ({ ...s, _type: "session" })), ...myCheckins]
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const teamCheckins = checkins.filter(c => c.by !== me).map(c => ({ ...c, _type: "checkin" }));
  const teamItems = [...teamSessions.map(s => ({ ...s, _type: "session" })), ...teamCheckins]
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const renderItem = (item, i) => {
    if (item._type === "checkin") {
      return (
        <div key={`ci-${i}`} style={{
          ...styles.sessionCard,
          borderLeft: `3px solid ${T.purple}`,
          background: "#1A1525",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontFamily: mono, fontSize: 11, color: T.purple, fontWeight: 500 }}>check-in</span>
              <span style={{ fontFamily: mono, fontSize: 12, fontWeight: 500, color: T.text }}>{item.by}</span>
            </div>
            <span style={{ fontFamily: mono, fontSize: 11, color: T.muted }}>{formatDate(item.date)}</span>
          </div>
          <span style={{ fontFamily: mono, fontSize: 12, color: T.sub, lineHeight: 1.5 }}>
            {(item.summary || "").toLowerCase()}
          </span>
        </div>
      );
    }
    const recent = isRecent(item.date);
    return (
      <div key={`s-${i}`} style={{
        ...styles.sessionCard,
        borderLeft: `3px solid ${recent ? T.green : T.muted}`,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Dot color={recent ? T.green : T.muted} />
            <span style={{ fontFamily: mono, fontSize: 13, fontWeight: 500, color: T.text }}>{item.who || item.by}</span>
          </div>
          <span style={{ fontFamily: mono, fontSize: 11, color: T.muted }}>{formatDate(item.date)}</span>
        </div>
        <span style={{ fontFamily: mono, fontSize: 13, color: T.sub }}>
          {(item.topic || "session").toLowerCase()}
        </span>
      </div>
    );
  };

  return (
    <div style={styles.content}>
      <PageHeader
        orgName={orgName}
        title="activity"
        stats={[
          { value: String(mySessions.length + teamSessions.length), label: "sessions" },
          { value: String(thisWeek), label: "this week", color: T.green },
          { value: String(lastWeek), label: "last week" },
        ]}
      />

      {/* Trends bar */}
      {(cadence.length > 0 || resolution.resolved || throughput.created) && (
        <div style={{
          display: "flex", gap: 24, padding: "14px 18px",
          background: T.card, borderRadius: 4, border: `1px solid ${T.border}`,
        }}>
          {cadence.length > 0 && (
            <span style={{ fontFamily: mono, fontSize: 11, color: T.dim }}>
              // cadence: {cadence.map(c => c.sessions).join(" → ")} (w0→w{cadence.length - 1})
            </span>
          )}
          {resolution.resolved > 0 && (
            <span style={{ fontFamily: mono, fontSize: 11, color: T.dim }}>
              // resolution: {resolution.avgDays?.toFixed(1)}d avg ({resolution.resolved} resolved)
            </span>
          )}
          {throughput.created > 0 && (
            <span style={{ fontFamily: mono, fontSize: 11, color: T.dim }}>
              // throughput: {throughput.created} created, {throughput.completed} done (28d)
            </span>
          )}
        </div>
      )}

      <div style={styles.columns}>
        {/* Your sessions */}
        <div style={styles.mainCol}>
          <SectionHeader>// your sessions ({myItems.length})</SectionHeader>
          {myItems.length === 0 ? <EmptyState text="no sessions yet" /> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {groupByDate(myItems).map(([date, items]) => (
                <div key={date}>
                  <span style={{ fontFamily: mono, fontSize: 10, color: T.muted, display: "block", marginBottom: 6, marginTop: 8 }}>{date}</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {items.map((item, i) => renderItem(item, `my-${date}-${i}`))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Team sessions */}
        <div style={styles.mainCol}>
          <SectionHeader>// team ({teamItems.length})</SectionHeader>
          {teamItems.length === 0 ? <EmptyState text="no team sessions" /> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {groupByDate(teamItems).map(([date, items]) => (
                <div key={date}>
                  <span style={{ fontFamily: mono, fontSize: 10, color: T.muted, display: "block", marginBottom: 6, marginTop: 8 }}>{date}</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {items.map((item, i) => renderItem(item, `tm-${date}-${i}`))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Workspace Button ───────────────────────────────────────────

function WorkspaceButton({ org, token }) {
  const [loading, setLoading] = useState(false);

  const open = async () => {
    setLoading(true);
    try {
      const { url } = await getTerminalUrl(token, org.slug);
      window.open(url, "_blank");
    } catch {
      window.open(org.hosting_workspace_url || org.hosting_coder_url, "_blank");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={open} disabled={loading} style={styles.openWorkspace}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
      </svg>
      {loading ? "connecting..." : ">_ open workspace"}
    </button>
  );
}

// ─── Manage View ────────────────────────────────────────────────

function RemoveMemberDialog({ member, slug, token, onClose, onRemoved }) {
  const [mode, setMode] = useState("revoke");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      await removeMember(token, slug, member.github_username, mode);
      onRemoved();
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <span style={{ fontFamily: mono, fontSize: 15, fontWeight: 500, color: T.red, marginBottom: 8 }}>
          remove {(member.display_name || member.github_username || "").toLowerCase()}
        </span>
        <span style={{ fontFamily: mono, fontSize: 12, color: T.sub, marginBottom: 16 }}>
          this will remove <span style={{ color: T.text }}>{member.github_username}</span> from <span style={{ color: T.text }}>{slug}</span>
        </span>

        <label style={styles.radioLabel}>
          <input type="radio" name="mode" checked={mode === "revoke"} onChange={() => setMode("revoke")} style={{ marginTop: 3 }} />
          <div>
            <div style={{ fontFamily: mono, fontSize: 12, fontWeight: 500, color: T.text }}>revoke access only</div>
            <div style={{ fontFamily: mono, fontSize: 11, color: T.muted }}>// keeps contributions in the knowledge graph</div>
          </div>
        </label>

        <label style={styles.radioLabel}>
          <input type="radio" name="mode" checked={mode === "full"} onChange={() => setMode("full")} style={{ marginTop: 3 }} />
          <div>
            <div style={{ fontFamily: mono, fontSize: 12, fontWeight: 500, color: T.text }}>remove and delete data</div>
            <div style={{ fontFamily: mono, fontSize: 11, color: T.muted }}>// erases sessions, profile, and telemetry</div>
          </div>
        </label>

        {error && <div style={{ fontFamily: mono, fontSize: 12, color: T.red, marginTop: 8 }}>{error}</div>}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <button onClick={onClose} disabled={loading} style={styles.cancelBtn}>cancel</button>
          <button onClick={handleConfirm} disabled={loading} style={{ ...styles.dangerActionBtn, opacity: loading ? 0.6 : 1 }}>
            {loading ? "removing..." : "remove"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ManageView({ orgName, org, token, currentUser, onRefresh }) {
  const [showKey, setShowKey] = useState(false);
  const [removingMember, setRemovingMember] = useState(null);
  const isAdmin = org.role === "admin";
  const checkin = org.latest_checkin;

  const keyOk = checkin?.key_valid !== false;
  const memOk = checkin?.memory_linked !== false;
  const gitOk = checkin?.git_synced !== false;
  const allOk = checkin ? (keyOk && memOk && gitOk) : null;

  const integrations = [
    { name: "github", status: "connected", color: T.green },
    { name: "neo4j", status: allOk !== null ? (allOk ? "connected" : "issues") : "unknown", color: allOk ? T.green : T.amber },
    { name: "telegram", status: org.has_telegram ? "connected" : "not connected", color: org.has_telegram ? T.green : T.muted },
  ];

  return (
    <div style={styles.content}>
      <PageHeader orgName={orgName} title="manage" stats={[]} />
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: -16, marginBottom: 16 }}>
        {isAdmin && <span style={styles.adminBadge}>admin</span>}
      </div>
      <div style={styles.manageGrid}>
        <div style={styles.manageLeftCol}>
          {/* Workspace config */}
          <div style={styles.manageCard}>
            <span style={styles.manageCardHeader}>workspace</span>
            <div style={styles.divider} />
            {[
              ["organization", org.name || org.slug],
              ["github_org", org.github_org || "\u2014"],
              ["slug", org.slug],
            ].map(([label, value], i) => (
              <div key={i} style={styles.manageRow}>
                <span style={styles.manageLabel}>{label}</span>
                <span style={styles.manageValue}>{value}</span>
              </div>
            ))}
          </div>

          {/* Health */}
          <div style={styles.manageCard}>
            <span style={styles.manageCardHeader}>health</span>
            <div style={styles.divider} />
            {!checkin ? (
              <span style={{ fontFamily: mono, fontSize: 12, color: T.muted }}>// no check-in yet</span>
            ) : (
              <>
                <div style={styles.manageRow}>
                  <span style={styles.manageLabel}>status</span>
                  <span style={{ ...styles.manageValue, color: allOk ? T.green : T.red }}>
                    {allOk ? "\u25CF healthy" : "\u25CF issues detected"}
                  </span>
                </div>
                <div style={styles.manageRow}>
                  <span style={styles.manageLabel}>api_key</span>
                  <Dot color={keyOk ? T.green : T.red} />
                </div>
                <div style={styles.manageRow}>
                  <span style={styles.manageLabel}>memory</span>
                  <Dot color={memOk ? T.green : T.red} />
                </div>
                <div style={styles.manageRow}>
                  <span style={styles.manageLabel}>git_sync</span>
                  <Dot color={gitOk ? T.green : T.red} />
                </div>
                <div style={styles.manageRow}>
                  <span style={styles.manageLabel}>last_check</span>
                  <span style={styles.manageValue}>{timeAgo(checkin.checked_in_at)} ago</span>
                </div>
                {checkin.framework_version && (
                  <div style={styles.manageRow}>
                    <span style={styles.manageLabel}>version</span>
                    <span style={styles.manageValue}>v{checkin.framework_version}</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Diagnostics */}
          {org.diagnostics && org.diagnostics.length > 0 && (
            <div style={{ ...styles.manageCard, borderColor: T.redDark }}>
              <span style={{ ...styles.manageCardHeader, color: T.red }}>diagnostics</span>
              <div style={{ ...styles.divider, background: T.redDark }} />
              {org.diagnostics.map((d, i) => (
                <div key={i} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                    <span style={{
                      fontFamily: mono, fontSize: 10, fontWeight: 500, padding: "2px 6px",
                      border: `1px solid ${d.severity === "critical" ? T.red : T.amber}`,
                      color: d.severity === "critical" ? T.red : T.amber, borderRadius: 2,
                    }}>{d.severity}</span>
                    <span style={{ fontFamily: mono, fontSize: 11, color: T.sub }}>
                      {(d.type || "").replace(/_/g, " ")}
                    </span>
                  </div>
                  <span style={{ fontFamily: mono, fontSize: 12, color: T.text }}>{d.detail}</span>
                  {d.correct_key && (
                    <div style={{ marginTop: 8 }}>
                      <span style={{ fontFamily: mono, fontSize: 11, color: T.muted, display: "block", marginBottom: 4 }}>
                        // correct key for this org:
                      </span>
                      <div style={styles.codeBlock}>
                        <code style={{ fontFamily: mono, fontSize: 11 }}>{d.correct_key}</code>
                        <CopyButton text={d.correct_key} />
                      </div>
                      <span style={{ fontFamily: mono, fontSize: 11, color: T.muted, display: "block", marginTop: 6, marginBottom: 4 }}>
                        // fix command:
                      </span>
                      <div style={styles.codeBlock}>
                        <code style={{ fontFamily: mono, fontSize: 11, whiteSpace: "nowrap" }}>
                          {`sed -i.bak "s/^EGREGORE_API_KEY=.*/EGREGORE_API_KEY=${d.correct_key}/" .env`}
                        </code>
                        <CopyButton text={`sed -i.bak "s/^EGREGORE_API_KEY=.*/EGREGORE_API_KEY=${d.correct_key}/" .env`} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* API Key */}
          <div style={styles.manageCard}>
            <span style={styles.manageCardHeader}>api_key</span>
            <div style={styles.divider} />
            <div style={styles.manageRow}>
              <span style={{ fontFamily: mono, fontSize: 13, color: T.sub }}>
                {showKey ? org.api_key : (org.api_key_masked || "egr_sk_\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022")}
              </span>
              <div style={{ display: "flex", gap: 4 }}>
                <button onClick={() => setShowKey(!showKey)} style={styles.copyBtn}>
                  {showKey ? "hide" : "reveal"}
                </button>
                {org.api_key && <CopyButton text={org.api_key} />}
              </div>
            </div>
            <span style={{ fontFamily: mono, fontSize: 11, color: T.muted, marginTop: 4, display: "block" }}>
              // used for graph queries and notifications. store in .env
            </span>
          </div>

          {/* Open workspace */}
          {org.hosting_enabled && (
            <WorkspaceButton org={org} token={token} />
          )}

          {/* Integrations */}
          <div style={styles.manageCard}>
            <span style={styles.manageCardHeader}>integrations</span>
            <div style={styles.divider} />
            {integrations.map((intg, i) => (
              <div key={i} style={styles.manageRow}>
                <span style={styles.manageLabel}>{intg.name}</span>
                <span style={{ fontFamily: mono, fontSize: 11, fontWeight: 500, color: intg.color }}>
                  {intg.status}
                </span>
              </div>
            ))}
          </div>

          {/* Danger zone */}
          {isAdmin && (
            <div style={{ ...styles.manageCard, borderColor: T.redDark }}>
              <span style={{ ...styles.manageCardHeader, color: T.red }}>danger_zone</span>
              <div style={{ ...styles.divider, background: T.redDark }} />
              <div style={styles.manageRow}>
                <div>
                  <span style={styles.manageLabel}>reset_graph</span>
                  <span style={{ fontFamily: mono, fontSize: 11, color: T.muted, display: "block", marginTop: 4 }}>
                    // clears all nodes and relationships
                  </span>
                </div>
                <button style={styles.dangerBtn}>reset</button>
              </div>
              <div style={styles.manageRow}>
                <div>
                  <span style={styles.manageLabel}>delete_egregore</span>
                  <span style={{ fontFamily: mono, fontSize: 11, color: T.muted, display: "block", marginTop: 4 }}>
                    // permanently removes this workspace
                  </span>
                </div>
                <button style={styles.dangerBtn}>delete</button>
              </div>
            </div>
          )}
        </div>

        {/* Members panel */}
        <div style={styles.membersPanel}>
          <span style={styles.manageCardHeader}>members ({(org.members || []).length})</span>
          <div style={styles.divider} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", padding: "4px 0", borderBottom: `1px solid ${T.border}` }}>
              <span style={{ ...styles.membersHeaderCell, flex: 2 }}>github</span>
              <span style={{ ...styles.membersHeaderCell, flex: 2 }}>name</span>
              <span style={{ ...styles.membersHeaderCell, flex: 1 }}>role</span>
              <span style={{ ...styles.membersHeaderCell, flex: 1 }}>status</span>
              {isAdmin && <span style={{ ...styles.membersHeaderCell, flex: 0.7 }}></span>}
            </div>
            {(org.members || []).map((m, i) => {
              const isSelf = currentUser && m.github_username?.toLowerCase() === currentUser.toLowerCase();
              const canRemove = isAdmin && !isSelf && m.role !== "admin" && m.status === "active";
              return (
                <div key={i} style={{ display: "flex", padding: "10px 0", borderBottom: `1px solid ${T.border}` }}>
                  <span style={{ ...styles.memberCell, flex: 2, color: T.green }}>{m.github_username || "\u2014"}</span>
                  <span style={{ ...styles.memberCell, flex: 2 }}>{m.display_name || m.github_name || "\u2014"}</span>
                  <span style={{ ...styles.memberCell, flex: 1 }}>{m.role}</span>
                  <span style={{ ...styles.memberCell, flex: 1 }}>
                    <Dot color={m.status === "active" ? T.green : T.muted} size={6} />
                    <span style={{ marginLeft: 4 }}>{m.status}</span>
                  </span>
                  {isAdmin && (
                    <span style={{ ...styles.memberCell, flex: 0.7 }}>
                      {canRemove && (
                        <button onClick={() => setRemovingMember(m)} style={styles.dangerBtn}>
                          remove
                        </button>
                      )}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <button style={styles.inviteMemberBtn}>+ invite member</button>
        </div>
      </div>

      {removingMember && (
        <RemoveMemberDialog
          member={removingMember}
          slug={org.slug}
          token={token}
          onClose={() => setRemovingMember(null)}
          onRemoved={() => { setRemovingMember(null); onRefresh && onRefresh(); }}
        />
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────

export default function UserDashboard() {
  const { token, user, error: authError, loading: authLoading, logout } = useAuth();
  const [view, setView] = useState("home");
  const [orgs, setOrgs] = useState(null);
  const [selectedSlug, setSelectedSlug] = useState(null);
  const [dashError, setDashError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [activity, setActivity] = useState(null);
  const intervalRef = useRef(null);

  // Derive selectedOrg from orgs + slug — never store the full object
  const selectedOrg = orgs?.find(o => o.slug === selectedSlug) || null;
  const setSelectedOrg = useCallback((org) => setSelectedSlug(org?.slug || null), []);

  const apiKey = selectedOrg?.api_key || null;
  const graph = useGraphData(apiKey);

  const fetchOrgs = useCallback(() => {
    if (!token) return;
    getMyEgregores(token)
      .then(d => {
        setOrgs(d.egregores || []);
        // Auto-select first org only if nothing selected yet
        setSelectedSlug(prev => prev || d.egregores?.[0]?.slug || null);
        setLastUpdated(new Date());
        setDashError(null);
      })
      .catch(e => { setDashError(e.message); setOrgs(prev => prev || []); });
  }, [token]);

  useEffect(() => {
    fetchOrgs();
    intervalRef.current = setInterval(fetchOrgs, 60000);
    return () => clearInterval(intervalRef.current);
  }, [fetchOrgs]);

  // Fetch activity dashboard
  useEffect(() => {
    if (!apiKey || !user?.login) return;
    getActivityDashboard(apiKey, user.login)
      .then(setActivity)
      .catch(() => {});
  }, [apiKey, user?.login]);

  // Transform data for views — activity is primary source, graph for people+knowledge
  const knowledgeItems = graph.knowledge.map(a => ({
    type: a.type || "finding",
    created: a.created,
    title: a.title || "untitled",
    description: a.description || "",
    filePath: a.filePath || "",
    author: a.author || "",
    quest: a.quest || "",
  }));

  // Handoffs from activity endpoint (already has status, author, handedTo)
  const handoffs = (activity?.handoffs_to_me || []).concat(
    (activity?.all_handoffs || []).filter(h =>
      !(activity?.handoffs_to_me || []).some(m => m.topic === h.topic && m.date === h.date)
    ).map(h => ({
      topic: h.topic, date: h.date, author: h.from,
      status: "info", handedTo: h.to,
    }))
  ).map(h => ({
    id: h.sessionId || "", topic: h.topic || "untitled",
    summary: "", status: h.status || "pending",
    date: h.date, author: h.author || h.from || "",
    handedTo: h.handedTo || "",
    filePath: h.filePath || "",
    response: h.response || "",
  }));

  // Sessions from activity endpoint (my + team merged)
  const sessions = [
    ...(activity?.my_sessions || []).map(s => ({
      id: s.id || "", topic: s.topic || "", status: "active",
      date: s.date, branch: "", summary: "", by: activity?.me || "",
    })),
    ...(activity?.team_sessions || []).map(s => ({
      id: "", topic: s.topic || "", status: "active",
      date: s.date, branch: "", summary: "", by: s.by || "",
    })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  // Quests from activity endpoint
  const activityQuests = (activity?.quests || []).map(q => ({
    id: q.quest || "", title: q.title || "", description: "",
    status: "active", artifacts: q.artifacts || 0,
    lastActivity: null, people: [], daysSince: q.daysSince, score: q.score,
  }));

  // Todos from activity endpoint (summary counts — full list not available)
  const todosMerged = activity?.todos_merged || { activeTodoCount: 0, blockedCount: 0, deferredCount: 0 };

  // Trends + extras
  const trends = activity?.trends || {};
  const pendingQuestions = activity?.pending_questions || [];
  const checkins = activity?.checkins || [];

  // ── Login screen ──
  if (!token && !authLoading) {
    return (
      <div style={styles.loginPage}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
          <div style={styles.logo}>
            <LogoIcon size={32} color={T.green} />
            <span style={{ ...styles.logoText, fontSize: 22 }}>EGREGORE</span>
          </div>
          <span style={{ fontFamily: mono, fontSize: 12, color: T.muted, textAlign: "center", maxWidth: 360 }}>
            // sign in to see your workspaces, knowledge graph, and team activity
          </span>
          {authError && <span style={{ fontFamily: mono, fontSize: 12, color: T.red }}>{authError}</span>}
          <button
            style={styles.loginBtn}
            onClick={() => {
              sessionStorage.setItem("dash_auth_pending", "1");
              window.location.href = getGitHubAuthUrl("joiner");
            }}
          >
            sign in with github
          </button>
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div style={styles.loginPage}>
        <LogoIcon size={22} color={T.green} />
        <span style={{ fontFamily: mono, fontSize: 13, color: T.muted, marginLeft: 8 }}>authenticating...</span>
      </div>
    );
  }

  if (!orgs) {
    return (
      <div style={styles.loginPage}>
        <LogoIcon size={22} color={T.green} />
        <span style={{ fontFamily: mono, fontSize: 13, color: T.muted, marginLeft: 8 }}>loading...</span>
      </div>
    );
  }

  if (orgs.length === 0) {
    return (
      <div style={styles.loginPage}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <LogoIcon size={28} color={T.green} />
          <span style={{ fontFamily: mono, fontSize: 14, color: T.text }}>no egregore instances found</span>
          <span style={{ fontFamily: mono, fontSize: 12, color: T.muted, textAlign: "center" }}>
            visit <a href="/setup" style={{ color: T.green, textDecoration: "none" }}>egregore.xyz/setup</a> to create one,
            or ask your team admin to invite you.
          </span>
          <button onClick={logout} style={styles.logoutBtn}>logout</button>
        </div>
      </div>
    );
  }

  const orgName = selectedOrg?.name || selectedOrg?.slug || "";

  return (
    <div style={styles.shell}>
      <Sidebar
        view={view}
        onNavigate={setView}
        orgs={orgs}
        selectedOrg={selectedOrg}
        onSelectOrg={setSelectedOrg}
        user={user}
        onLogout={logout}
      />
      <div style={styles.main}>
        {/* Error bar */}
        {(dashError || graph.error) && (
          <div style={styles.alertBar}>
            // error: {dashError || graph.error}
          </div>
        )}
        {/* Update indicator */}
        {lastUpdated && (
          <div style={styles.updateIndicator}>
            // updated {timeAgo(lastUpdated.toISOString())} ago · auto-refreshes every 60s
          </div>
        )}
        {view === "home" && <HomeView orgName={orgName} graph={graph} activity={activity} org={selectedOrg} />}
        {view === "people" && <PeopleView orgName={orgName} graph={graph} orgMembers={selectedOrg?.members || []} />}
        {view === "knowledge" && <KnowledgeView orgName={orgName} items={knowledgeItems} />}
        {view === "quests" && <QuestsView orgName={orgName} quests={activityQuests} />}
        {view === "todos" && <TodosView orgName={orgName} todos={graph.todos} todosMerged={todosMerged} pendingQuestions={pendingQuestions} />}
        {view === "handoffs" && <HandoffsView orgName={orgName} handoffs={handoffs} />}
        {view === "activity" && <ActivityView orgName={orgName} sessions={sessions} trends={trends} activity={activity} />}
        {view === "manage" && selectedOrg && (
          <ManageView
            orgName={orgName}
            org={selectedOrg}
            token={token}
            currentUser={user?.login}
            onRefresh={fetchOrgs}
          />
        )}
      </div>
    </div>
  );
}

// ─── Styles ─────────────────────────────────────────────────────

const styles = {
  shell: {
    display: "flex",
    height: "100vh",
    background: T.bg,
    fontFamily: mono,
    color: T.text,
    overflow: "hidden",
  },
  loginPage: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    background: T.bg,
    fontFamily: mono,
  },
  main: {
    flex: 1,
    overflow: "auto",
  },

  // Sidebar
  sidebar: {
    width: 220,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    padding: "32px 20px",
    gap: 32,
    flexShrink: 0,
    borderRight: `1px solid ${T.border}`,
  },
  sidebarTop: {
    display: "flex",
    flexDirection: "column",
    gap: 32,
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  logoText: {
    fontFamily: mono,
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: "0.08em",
    color: T.text,
  },
  nav: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 14px",
    background: "none",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
    width: "100%",
    textAlign: "left",
    fontFamily: mono,
    fontSize: 13,
    transition: "background 0.1s",
  },
  navItemActive: {
    background: T.card,
  },
  navIndicator: {
    fontFamily: mono,
    fontSize: 14,
    fontWeight: 700,
    width: 16,
    textAlign: "center",
  },
  navLabel: {
    fontFamily: mono,
    fontSize: 13,
  },
  wsWidget: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    background: T.card,
    borderRadius: 4,
    padding: "10px 14px",
    border: `1px solid ${T.border}`,
  },
  wsLabel: {
    fontFamily: mono,
    fontSize: 11,
    color: T.muted,
  },
  wsName: {
    fontFamily: mono,
    fontSize: 13,
    fontWeight: 600,
    color: T.green,
  },
  wsSelect: {
    fontFamily: mono,
    fontSize: 13,
    fontWeight: 600,
    color: T.green,
    background: T.card,
    border: `1px solid ${T.border}`,
    borderRadius: 4,
    padding: "4px 8px",
    cursor: "pointer",
    outline: "none",
    width: "100%",
  },
  logoutBtn: {
    fontFamily: mono,
    fontSize: 10,
    color: T.muted,
    background: "none",
    border: `1px solid ${T.border}`,
    borderRadius: 4,
    padding: "4px 10px",
    cursor: "pointer",
  },
  loginBtn: {
    fontFamily: mono,
    fontSize: 13,
    fontWeight: 600,
    padding: "12px 28px",
    background: T.green,
    color: T.bg,
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
    letterSpacing: "0.02em",
  },

  // Content
  content: {
    display: "flex",
    flexDirection: "column",
    gap: 28,
    padding: "40px 48px",
    height: "100%",
    overflow: "auto",
  },
  topBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleOrg: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: 400,
    color: T.muted,
  },
  titleText: {
    fontFamily: mono,
    fontSize: 28,
    fontWeight: 500,
    color: T.text,
  },
  statsRow: {
    display: "flex",
    alignItems: "flex-end",
    gap: 32,
  },
  stat: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 2,
  },
  statVal: {
    fontFamily: mono,
    fontSize: 20,
  },
  statLabel: {
    fontFamily: mono,
    fontSize: 10,
    fontWeight: 500,
    color: T.muted,
  },
  sectionHeader: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: 500,
    color: T.dim,
  },
  emptyState: {
    fontFamily: mono,
    fontSize: 13,
    color: T.muted,
    padding: "40px 0",
    textAlign: "center",
  },

  // Tabs
  tabs: {
    display: "flex",
    gap: 24,
  },
  tab: {
    background: "none",
    border: "none",
    fontFamily: mono,
    fontSize: 12,
    cursor: "pointer",
    padding: 0,
  },
  divider: {
    height: 1,
    background: T.border,
    width: "100%",
  },

  // Layout
  columns: {
    display: "flex",
    gap: 32,
    flex: 1,
    minHeight: 0,
  },
  mainCol: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    minHeight: 0,
    overflow: "auto",
  },
  rightPanel: {
    width: 300,
    display: "flex",
    flexDirection: "column",
    gap: 16,
    flexShrink: 0,
  },

  // Feed
  feed: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  feedItem: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    background: T.card,
    borderRadius: 4,
    padding: "14px 18px",
    border: `1px solid ${T.border}`,
  },
  feedTime: {
    fontFamily: mono,
    fontSize: 11,
    color: T.muted,
    minWidth: 24,
  },
  feedWho: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: 500,
    flexShrink: 0,
  },
  feedText: {
    fontFamily: mono,
    fontSize: 12,
  },
  personRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: T.card,
    borderRadius: 4,
    padding: "12px 16px",
    border: `1px solid ${T.border}`,
  },
  threadItem: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    background: T.card,
    borderRadius: 4,
    padding: "12px 16px",
    border: `1px solid ${T.border}`,
  },

  // People grid
  peopleGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: 16,
  },
  personCard: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    background: T.card,
    borderRadius: 4,
    padding: 24,
    border: `1px solid ${T.border}`,
  },
  inviteCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    background: "none",
    border: `1px dashed ${T.muted}`,
    borderRadius: 4,
    padding: 24,
    cursor: "pointer",
    minHeight: 180,
  },

  // Knowledge
  knowledgeItem: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    padding: "16px 18px",
    borderRadius: 4,
    border: `1px solid ${T.border}`,
    cursor: "pointer",
    textAlign: "left",
    width: "100%",
    fontFamily: mono,
    transition: "background 0.1s",
  },
  threadPanel: {
    width: 320,
    display: "flex",
    flexDirection: "column",
    gap: 16,
    padding: "20px 22px",
    background: T.card,
    borderRadius: 4,
    border: `1px solid ${T.border}`,
    flexShrink: 0,
    overflow: "auto",
  },

  // Quests
  questCard: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    padding: "20px 22px",
    background: T.card,
    borderRadius: 4,
    border: `1px solid ${T.border}`,
  },

  // Todos
  todoItem: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    padding: "16px 20px",
    background: T.card,
    borderRadius: 4,
    border: `1px solid ${T.border}`,
  },

  // Handoffs
  handoffCard: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    padding: "20px 22px",
    background: T.card,
    borderRadius: 4,
    border: `1px solid ${T.border}`,
  },

  // Sessions
  sessionCard: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    padding: "18px 22px",
    background: T.card,
    borderRadius: 4,
    border: `1px solid ${T.border}`,
  },

  // Workspace button
  openWorkspace: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    background: T.green,
    borderRadius: 4,
    padding: "14px 20px",
    border: "none",
    cursor: "pointer",
    fontFamily: mono,
    fontSize: 12,
    fontWeight: 600,
    color: T.bg,
    width: "100%",
  },

  // Manage
  adminBadge: {
    fontFamily: mono,
    fontSize: 10,
    fontWeight: 500,
    color: T.green,
    background: T.greenBg,
    padding: "6px 12px",
    borderRadius: 4,
    border: `1px solid ${T.greenBorder}`,
  },
  manageGrid: {
    display: "flex",
    gap: 32,
    flex: 1,
    minHeight: 0,
  },
  manageLeftCol: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  manageCard: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
    padding: "20px 22px",
    background: T.card,
    borderRadius: 4,
    border: `1px solid ${T.border}`,
  },
  manageCardHeader: {
    fontFamily: mono,
    fontSize: 11,
    fontWeight: 500,
    color: T.dim,
  },
  manageRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  manageLabel: {
    fontFamily: mono,
    fontSize: 13,
    color: T.sub,
  },
  manageValue: {
    fontFamily: mono,
    fontSize: 13,
    fontWeight: 500,
    color: T.text,
  },
  codeBlock: {
    background: "rgba(0,0,0,0.4)",
    padding: "6px 10px",
    fontFamily: mono,
    fontSize: 11,
    borderRadius: 4,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    overflowX: "auto",
    color: T.text,
  },
  copyBtn: {
    fontFamily: mono,
    fontSize: 10,
    fontWeight: 500,
    color: T.text,
    background: "#252525",
    border: `1px solid ${T.border}`,
    borderRadius: 4,
    padding: "4px 10px",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  dangerBtn: {
    fontFamily: mono,
    fontSize: 10,
    fontWeight: 500,
    color: T.red,
    background: "transparent",
    border: `1px solid ${T.redDark}`,
    borderRadius: 4,
    padding: "4px 10px",
    cursor: "pointer",
  },
  membersPanel: {
    width: 480,
    display: "flex",
    flexDirection: "column",
    gap: 14,
    padding: "20px 22px",
    background: T.card,
    borderRadius: 4,
    border: `1px solid ${T.border}`,
    flexShrink: 0,
  },
  membersHeaderCell: {
    fontFamily: mono,
    fontSize: 11,
    color: T.muted,
  },
  memberCell: {
    fontFamily: mono,
    fontSize: 13,
    color: T.sub,
    display: "flex",
    alignItems: "center",
  },
  inviteMemberBtn: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: 500,
    color: T.green,
    background: T.greenBg,
    border: `1px solid ${T.greenBorder}`,
    borderRadius: 4,
    padding: "10px 0",
    cursor: "pointer",
    width: "100%",
    textAlign: "center",
  },

  // Modal
  modalOverlay: {
    position: "fixed",
    top: 0, left: 0, right: 0, bottom: 0,
    background: "rgba(0,0,0,0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    background: T.bg,
    border: `1px solid ${T.border}`,
    borderRadius: 8,
    padding: 24,
    maxWidth: 420,
    width: "90%",
    fontFamily: mono,
    display: "flex",
    flexDirection: "column",
  },
  radioLabel: {
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
    cursor: "pointer",
    marginBottom: 12,
    color: T.text,
  },
  cancelBtn: {
    fontFamily: mono,
    fontSize: 12,
    background: "transparent",
    color: T.muted,
    border: `1px solid ${T.muted}`,
    padding: "6px 16px",
    borderRadius: 4,
    cursor: "pointer",
  },
  dangerActionBtn: {
    fontFamily: mono,
    fontSize: 12,
    background: T.red,
    color: "#fff",
    border: "none",
    padding: "6px 16px",
    borderRadius: 4,
    cursor: "pointer",
  },

  // Alerts
  alertBar: {
    background: "rgba(239,68,68,0.08)",
    border: `1px solid ${T.redDark}`,
    padding: "10px 16px",
    fontFamily: mono,
    fontSize: 12,
    color: T.red,
  },
  updateIndicator: {
    fontFamily: mono,
    fontSize: 10,
    color: T.muted,
    padding: "8px 48px",
  },
};
