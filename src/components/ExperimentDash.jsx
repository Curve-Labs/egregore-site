import React, { useState, useEffect } from 'react'
import { getActivityDashboard, graphQuery } from '../api'

const VIEWS = ['home', 'people', 'knowledge', 'quests', 'manage']

const NAV_ITEMS = [
  { key: 'home', icon: '⌂', label: 'HOME' },
  { key: 'people', icon: '◎', label: 'PEOPLE' },
  { key: 'knowledge', icon: '◆', label: 'KNOWLEDGE' },
  { key: 'quests', icon: '⚑', label: 'QUESTS' },
  { key: 'manage', icon: '⚙', label: 'MANAGE' },
]

// ─── Sidebar ────────────────────────────────────────────────

function Sidebar({ activeView, onNavigate, orgName }) {
  return (
    <div style={s.sidebar}>
      <div style={s.sidebarTop}>
        <div style={s.logo}>
          <span style={s.logoIcon}>&gt;</span>
          <span style={s.logoText}>EGREGORE</span>
        </div>
        <nav style={s.nav}>
          {NAV_ITEMS.map(item => {
            const active = activeView === item.key
            return (
              <button
                key={item.key}
                onClick={() => onNavigate(item.key)}
                style={{
                  ...s.navItem,
                  ...(active ? s.navItemActive : {}),
                }}
              >
                <span style={{
                  ...s.navIcon,
                  color: active ? '#059669' : '#9CA3AF',
                }}>{item.icon}</span>
                <span style={{
                  ...s.navLabel,
                  color: active ? '#1A1A1A' : '#9CA3AF',
                  fontWeight: active ? 500 : 400,
                }}>{item.label}</span>
              </button>
            )
          })}
        </nav>
      </div>
      <div style={s.workspaceWidget}>
        <div style={s.wsTop}>
          <span style={s.wsIcon}>⊞</span>
          <span style={s.wsLabel}>WORKSPACES</span>
        </div>
        <span style={s.wsName}>{orgName || 'WORKSPACE'}</span>
      </div>
    </div>
  )
}

// ─── Page Header ────────────────────────────────────────────

function PageHeader({ orgName, title, stats }) {
  return (
    <div style={s.topBar}>
      <div style={s.titleBlock}>
        <span style={s.titleOrg}>// {(orgName || '').toUpperCase()}</span>
        <span style={s.titleText}>{title}</span>
      </div>
      {stats && (
        <div style={s.statsRow}>
          {stats.map((st, i) => (
            <div key={i} style={s.stat}>
              <span style={{ ...s.statVal, color: st.color || '#1A1A1A' }}>{st.value}</span>
              <span style={s.statLabel}>{st.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Section Header ─────────────────────────────────────────

function SectionHeader({ children }) {
  return <div style={s.sectionHeader}>{children}</div>
}

// ─── Home View ──────────────────────────────────────────────

function HomeView({ orgName, feedItems, people, threads, stats }) {
  return (
    <div style={s.content}>
      <PageHeader
        orgName={orgName}
        title="HOME"
        stats={stats}
      />
      <div style={s.columns}>
        <div style={s.mainCol}>
          <SectionHeader>PULSE</SectionHeader>
          <div style={s.feed}>
            {feedItems.map((item, i) => (
              <div key={i} style={s.feedItem}>
                <span style={s.feedTime}>{item.time}</span>
                <span style={{
                  ...s.feedDot,
                  background: item.recent ? '#10B981' : '#E5E7EB',
                  width: item.recent ? 8 : 6,
                  height: item.recent ? 8 : 6,
                }} />
                <span style={{
                  ...s.feedWho,
                  color: item.recent ? '#059669' : '#9CA3AF',
                }}>{item.who}</span>
                <span style={{
                  ...s.feedText,
                  color: item.recent ? '#2D2D2D' : '#6B7280',
                }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={s.rightPanel}>
          <SectionHeader>PEOPLE</SectionHeader>
          <div style={s.peopleList}>
            {people.map((p, i) => (
              <div key={i} style={s.personRow}>
                <span style={{
                  ...s.feedDot,
                  background: p.online ? '#10B981' : '#D1D5DB',
                  width: 8, height: 8,
                }} />
                <span style={{
                  ...s.personName,
                  color: p.online ? '#1A1A1A' : '#9CA3AF',
                }}>{p.name}</span>
                <span style={{
                  ...s.personStatus,
                  color: p.online ? '#B0B5BD' : '#C0C5CD',
                }}>{p.status}</span>
              </div>
            ))}
          </div>
          <button style={s.openWorkspace}>
            &gt;_ OPEN WORKSPACE
          </button>
          <SectionHeader>OPEN THREADS</SectionHeader>
          <div style={s.threadsList}>
            {threads.map((t, i) => (
              <div key={i} style={s.threadItem}>
                <span style={s.threadTitle}>{t.title}</span>
                <span style={{
                  ...s.threadMeta,
                  color: t.blocked ? '#DC2626' : '#B0B5BD',
                }}>{t.meta}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── People View ────────────────────────────────────────────

function PeopleView({ orgName, members }) {
  return (
    <div style={s.content}>
      <PageHeader
        orgName={orgName}
        title="PEOPLE"
        stats={[
          { value: String(members.length), label: 'MEMBERS' },
          { value: String(members.filter(m => m.online).length), label: 'ONLINE', color: '#059669' },
        ]}
      />
      <div style={s.peopleGrid}>
        {members.map((m, i) => (
          <div key={i} style={s.personCard}>
            <div style={s.personCardTop}>
              <span style={{
                ...s.feedDot,
                background: m.online ? '#10B981' : '#D1D5DB',
                width: 10, height: 10,
              }} />
              <span style={s.personCardName}>{m.name}</span>
            </div>
            <span style={s.personCardGithub}>@{m.github}</span>
            <span style={s.personCardRole}>{m.role}</span>
            <div style={s.personCardStats}>
              <span style={s.personCardStat}>{m.sessions || 0} sessions</span>
              <span style={s.personCardStat}>{m.artifacts || 0} artifacts</span>
              <span style={s.personCardStat}>{m.commits || 0} commits</span>
            </div>
            <span style={{
              ...s.personCardFocus,
              color: m.online ? '#059669' : '#B0B5BD',
            }}>{m.online ? `NOW: ${m.focus}` : `LAST: ${m.lastSeen}`}</span>
          </div>
        ))}
        <button style={s.inviteCard}>
          <span style={s.inviteIcon}>+</span>
          <span style={s.inviteText}>INVITE MEMBER</span>
        </button>
      </div>
    </div>
  )
}

// ─── Knowledge View ─────────────────────────────────────────

function KnowledgeView({ orgName, items }) {
  const [tab, setTab] = useState('all')
  const [selected, setSelected] = useState(0)

  const filtered = tab === 'all' ? items : items.filter(it => it.type === tab)
  const active = filtered[selected] || filtered[0]

  const typeColor = { decision: '#059669', finding: '#F59E0B', pattern: '#8B5CF6' }

  return (
    <div style={s.content}>
      <PageHeader
        orgName={orgName}
        title="KNOWLEDGE"
        stats={[
          { value: String(items.filter(i => i.type === 'decision').length), label: 'DECISIONS', color: '#059669' },
          { value: String(items.filter(i => i.type === 'finding').length), label: 'FINDINGS', color: '#F59E0B' },
          { value: String(items.filter(i => i.type === 'pattern').length), label: 'PATTERNS', color: '#8B5CF6' },
        ]}
      />
      <div style={s.columns}>
        <div style={s.mainCol}>
          <div style={s.tabs}>
            {['all', 'decision', 'finding', 'pattern'].map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setSelected(0) }}
                style={{
                  ...s.tab,
                  color: tab === t ? '#1A1A1A' : '#9CA3AF',
                  fontWeight: tab === t ? 500 : 400,
                }}
              >
                {t === 'all' ? 'ALL' : t.toUpperCase() + 'S'}
              </button>
            ))}
          </div>
          <div style={s.divider} />
          <div style={s.knowledgeList}>
            {filtered.map((item, i) => (
              <button
                key={i}
                onClick={() => setSelected(i)}
                style={{
                  ...s.knowledgeItem,
                  background: selected === i ? '#FFFFFF' : '#F5F5F0',
                  boxShadow: selected === i ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                <div style={s.knowledgeBadge}>
                  <span style={{ ...s.knowledgeType, color: typeColor[item.type] }}>
                    {item.type.toUpperCase()}
                  </span>
                  <span style={s.knowledgeDate}>{item.date}</span>
                </div>
                <span style={s.knowledgeTitle}>{item.title}</span>
                <span style={s.knowledgeDesc}>{item.description}</span>
                <div style={s.knowledgeMeta}>
                  <span style={s.knowledgeAuthor}>{item.author}</span>
                  <span style={s.knowledgeQuest}>{item.quest}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
        {active && (
          <div style={s.threadPanel}>
            <span style={s.threadPanelHeader}>THREAD</span>
            <div style={s.divider} />
            <span style={s.threadPanelTitle}>{active.title}</span>
            <span style={s.threadPanelBody}>{active.fullText || active.description}</span>
            {active.related && active.related.length > 0 && (
              <>
                <span style={s.threadPanelLabel}>RELATED</span>
                {active.related.map((r, i) => (
                  <div key={i} style={s.relatedItem}>
                    <span style={{ color: typeColor[r.type] || '#059669' }}>◉</span>
                    <span style={s.relatedText}>{r.title}</span>
                  </div>
                ))}
              </>
            )}
            {active.source && (
              <>
                <span style={s.threadPanelLabel}>SOURCE</span>
                <span style={s.threadPanelSource}>{active.source}</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Quests View ────────────────────────────────────────────

function QuestsView({ orgName, quests }) {
  const active = quests.filter(q => q.status === 'active')
  const completed = quests.filter(q => q.status === 'completed')

  return (
    <div style={s.content}>
      <PageHeader
        orgName={orgName}
        title="QUESTS"
        stats={[
          { value: String(active.length), label: 'ACTIVE', color: '#059669' },
          { value: String(completed.length), label: 'COMPLETED' },
        ]}
      />
      <div style={s.questList}>
        {quests.map((q, i) => {
          const isActive = q.status === 'active'
          return (
            <div key={i} style={s.questCard}>
              <div style={s.questHeader}>
                <div style={s.questLeft}>
                  <span style={{ color: isActive ? '#059669' : '#9CA3AF' }}>⚑</span>
                  <span style={{
                    ...s.questId,
                    color: isActive ? '#059669' : '#9CA3AF',
                  }}>{q.id}</span>
                </div>
                <span style={{
                  ...s.questStatus,
                  color: isActive ? '#059669' : '#9CA3AF',
                }}>{q.status.toUpperCase()}</span>
              </div>
              <span style={{
                ...s.questTitle,
                color: isActive ? '#1A1A1A' : '#9CA3AF',
              }}>{q.title}</span>
              <span style={{
                ...s.questDesc,
                color: isActive ? '#6B7280' : '#B0B5BD',
              }}>{q.description}</span>
              <div style={s.questMeta}>
                <span style={s.questMetaItem}>{q.artifacts} artifacts</span>
                <span style={s.questMetaItem}>{q.age}</span>
                <span style={s.questMetaItem}>{q.people}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Manage View ────────────────────────────────────────────

function ManageView({ orgName, org, members }) {
  return (
    <div style={s.content}>
      <PageHeader
        orgName={orgName}
        title="MANAGE"
        stats={[]}
      />
      <div style={{ ...s.topBar, justifyContent: 'flex-end', marginTop: -16 }}>
        <span style={s.adminBadge}>ADMIN</span>
      </div>
      <div style={s.columns}>
        <div style={s.mainCol}>
          <div style={s.manageCard}>
            <span style={s.manageCardHeader}>WORKSPACE</span>
            <div style={s.divider} />
            {[
              ['Organization', org.name || orgName],
              ['GitHub Org', org.github_org || '—'],
              ['Memory Repo', org.memory_repo || '—'],
              ['Status', null],
            ].map(([label, value], i) => (
              <div key={i} style={s.manageRow}>
                <span style={s.manageLabel}>{label}</span>
                {value !== null ? (
                  <span style={s.manageValue}>{value}</span>
                ) : (
                  <span style={{ ...s.manageValue, color: '#059669' }}>● Connected</span>
                )}
              </div>
            ))}
          </div>
          <div style={s.manageCard}>
            <span style={s.manageCardHeader}>API KEY</span>
            <div style={s.divider} />
            <div style={s.manageRow}>
              <span style={{ ...s.manageLabel, fontFamily: "'IBM Plex Mono', monospace" }}>
                egr_sk_••••••••••••••••
              </span>
              <button style={s.copyBtn}>COPY</button>
            </div>
            <span style={s.manageNote}>Used for graph queries and notifications. Store in .env</span>
          </div>
        </div>
        <div style={s.membersPanel}>
          <span style={s.manageCardHeader}>MEMBERS</span>
          <div style={s.divider} />
          <div style={s.membersTable}>
            <div style={s.membersHeaderRow}>
              <span style={{ ...s.membersHeaderCell, width: 120 }}>Name</span>
              <span style={{ ...s.membersHeaderCell, width: 100 }}>Role</span>
              <span style={{ ...s.membersHeaderCell, width: 100 }}>Status</span>
              <span style={{ ...s.membersHeaderCell, width: 80 }}>Access</span>
            </div>
            {members.map((m, i) => (
              <div key={i} style={s.memberRow}>
                <span style={{ ...s.memberCell, width: 120, fontWeight: 500, color: '#1A1A1A' }}>{m.name}</span>
                <span style={{ ...s.memberCell, width: 100 }}>{m.role}</span>
                <span style={{ ...s.memberCell, width: 100, color: m.online ? '#059669' : '#9CA3AF' }}>
                  {m.online ? '● online' : '○ offline'}
                </span>
                <span style={{ ...s.memberCell, width: 80 }}>{m.access || 'member'}</span>
              </div>
            ))}
          </div>
          <button style={s.inviteMemberBtn}>+ INVITE MEMBER</button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────

// ─── Data helpers ───────────────────────────────────────────

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const mins = Math.floor((now - d) / 60000)
  if (mins < 60) return `${mins}M`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}H`
  const days = Math.floor(hrs / 24)
  return `${days}D`
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function toRecords(result) {
  if (!result) return []
  if (Array.isArray(result)) return result
  if (result.fields && result.values) {
    return result.values.map(row => {
      const obj = {}
      result.fields.forEach((f, i) => { obj[f] = row[i] })
      return obj
    })
  }
  return []
}

// ─── Main Component ─────────────────────────────────────────

export default function ExperimentDash() {
  const [view, setView] = useState('home')
  const [loading, setLoading] = useState(true)
  const [activity, setActivity] = useState(null)
  const [graphPeople, setGraphPeople] = useState([])
  const [graphKnowledge, setGraphKnowledge] = useState([])
  const [graphQuests, setGraphQuests] = useState([])

  // Direct API key auth — no GitHub OAuth needed for the experiment dashboard.
  // In production, this would come from the login flow.
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('egregore_api_key') || '')
  const [username, setUsername] = useState(() => localStorage.getItem('egregore_username') || '')
  const orgName = 'Curve Labs'

  // If no key stored, show a simple key entry
  if (!apiKey) {
    return (
      <div style={{ ...s.loadingScreen, flexDirection: 'column', gap: 16 }}>
        <div style={s.logo}>
          <span style={s.logoIcon}>&gt;</span>
          <span style={s.logoText}>EGREGORE</span>
        </div>
        <form onSubmit={e => {
          e.preventDefault()
          const form = new FormData(e.target)
          const key = form.get('key')?.trim()
          const user = form.get('user')?.trim()
          if (key && user) {
            localStorage.setItem('egregore_api_key', key)
            localStorage.setItem('egregore_username', user)
            setApiKey(key)
            setUsername(user)
          }
        }} style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 320 }}>
          <input name="user" placeholder="GitHub username" defaultValue=""
            style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, padding: '10px 14px', background: '#EAEAE5', border: 'none', borderRadius: 8, color: '#1A1A1A' }} />
          <input name="key" placeholder="API key (ek_...)" defaultValue=""
            style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, padding: '10px 14px', background: '#EAEAE5', border: 'none', borderRadius: 8, color: '#1A1A1A' }} />
          <button type="submit"
            style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, fontWeight: 600, padding: '12px 14px', background: '#059669', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
            CONNECT
          </button>
        </form>
      </div>
    )
  }

  // Fetch all dashboard data
  useEffect(() => {
    if (!apiKey || !username) return

    // Activity dashboard (sessions, handoffs, quests summary, etc.)
    getActivityDashboard(apiKey, username)
      .then(data => { setActivity(data); setLoading(false) })
      .catch(err => { console.warn('Activity fetch failed:', err.message); setLoading(false) })

    // People with stats
    graphQuery(apiKey, `
      MATCH (p:Person)
      OPTIONAL MATCH (s:Session)-[:BY]->(p)
      OPTIONAL MATCH (a:Artifact)-[:CONTRIBUTED_BY]->(p)
      WITH p, count(DISTINCT s) AS sessions, count(DISTINCT a) AS artifacts,
           max(s.date) AS lastSession
      RETURN p.name AS name, p.github AS github, p.role AS role,
             p.fullName AS fullName, sessions, artifacts, lastSession
      ORDER BY sessions DESC
    `).then(r => setGraphPeople(toRecords(r))).catch(() => {})

    // Knowledge artifacts (decisions, findings, patterns)
    graphQuery(apiKey, `
      MATCH (a:Artifact)
      WHERE a.type IN ['decision', 'finding', 'pattern']
      OPTIONAL MATCH (a)-[:CONTRIBUTED_BY]->(p:Person)
      OPTIONAL MATCH (a)-[:PART_OF]->(q:Quest)
      RETURN a.title AS title, a.type AS type, a.created AS created,
             a.filePath AS filePath, a.topics AS topics,
             p.name AS author, q.title AS quest
      ORDER BY a.created DESC LIMIT 20
    `).then(r => setGraphKnowledge(toRecords(r))).catch(() => {})

    // Quests
    graphQuery(apiKey, `
      MATCH (q:Quest)
      OPTIONAL MATCH (a:Artifact)-[:PART_OF]->(q)
      OPTIONAL MATCH (a)-[:CONTRIBUTED_BY]->(p:Person)
      WITH q, count(DISTINCT a) AS artifacts, collect(DISTINCT p.name) AS people,
           max(a.created) AS lastActivity
      RETURN q.id AS id, q.title AS title, q.status AS status,
             q.description AS description, artifacts, people, lastActivity
      ORDER BY q.status ASC, lastActivity DESC
    `).then(r => setGraphQuests(toRecords(r))).catch(() => {})
  }, [apiKey, username])

  // ─── Transform graph data into view props ────────────────

  const isRecentSession = (dateStr) => {
    if (!dateStr) return false
    const hrs = (Date.now() - new Date(dateStr).getTime()) / 3600000
    return hrs < 4
  }

  // Pulse feed from activity sessions
  const feedItems = (() => {
    if (!activity) return MOCK.feedItems
    const mySessions = (activity.my_sessions || []).slice(0, 3)
    const teamSessions = (activity.team_sessions || []).slice(0, 3)
    const all = [
      ...mySessions.map(s => ({ ...s, who: activity.me })),
      ...teamSessions.map(s => ({ ...s, who: s.by })),
    ]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 8)
    return all.map(s => ({
      time: timeAgo(s.date),
      who: (s.who || '').toUpperCase(),
      text: (s.topic || 'session').toUpperCase(),
      recent: isRecentSession(s.date),
    }))
  })()

  // People from graph
  const people = (() => {
    if (graphPeople.length === 0) return MOCK.people
    return graphPeople.map(p => {
      const isOnline = p.lastSession && isRecentSession(p.lastSession)
      return {
        name: (p.name || '').toUpperCase(),
        status: isOnline ? (p.name || '').toUpperCase() : timeAgo(p.lastSession) + ' AGO',
        online: isOnline,
      }
    })
  })()

  // Open threads from handoffs
  const threads = (() => {
    if (!activity) return MOCK.threads
    const pending = (activity.handoffs_to_me || [])
      .filter(h => h.status === 'pending' || h.status === 'read')
      .slice(0, 4)
    if (pending.length === 0) return MOCK.threads
    return pending.map(h => ({
      title: (h.topic || 'untitled').toUpperCase(),
      meta: `${(h.author || '').toUpperCase()} · ${h.status === 'pending' ? 'PENDING' : 'OPEN'}`,
      blocked: false,
    }))
  })()

  // Members for people view
  const members = (() => {
    if (graphPeople.length === 0) return MOCK.members
    return graphPeople.map(p => {
      const isOnline = p.lastSession && isRecentSession(p.lastSession)
      return {
        name: p.name || '',
        github: p.github || p.name || '',
        role: p.role || 'member',
        online: isOnline,
        focus: (p.name || '').toUpperCase(),
        lastSeen: timeAgo(p.lastSession) + ' AGO',
        sessions: p.sessions || 0,
        artifacts: p.artifacts || 0,
        commits: 0,
        access: 'member',
      }
    })
  })()

  // Knowledge items
  const knowledgeItems = (() => {
    if (graphKnowledge.length === 0) return MOCK.knowledgeItems
    return graphKnowledge.map(a => ({
      type: a.type || 'finding',
      date: formatDate(a.created),
      title: a.title || 'Untitled',
      description: (a.topics || []).join(', ') || a.title || '',
      fullText: a.filePath ? `Source: ${a.filePath}` : '',
      author: a.author || '',
      quest: a.quest || '',
      related: [],
      source: a.filePath || '',
    }))
  })()

  // Quests
  const quests = (() => {
    if (graphQuests.length === 0) return MOCK.quests
    return graphQuests.map(q => ({
      id: q.id || '',
      title: q.title || 'Untitled',
      description: q.description || '',
      status: q.status || 'active',
      artifacts: q.artifacts || 0,
      age: timeAgo(q.lastActivity) + ' ago',
      people: (q.people || []).filter(Boolean).join(' · '),
    }))
  })()

  // Stats from activity
  const homeStats = (() => {
    if (!activity) return [
      { value: '—', label: 'ARTIFACTS' },
      { value: '—', label: 'DECISIONS' },
      { value: '—', label: 'ACTIVE NOW', color: '#059669' },
    ]
    const questCount = (activity.quests || []).length
    return [
      { value: String(graphKnowledge.length || '—'), label: 'ARTIFACTS' },
      { value: String(graphKnowledge.filter(k => k.type === 'decision').length || '—'), label: 'DECISIONS' },
      { value: String(questCount), label: 'ACTIVE', color: '#059669' },
    ]
  })()

  if (loading) {
    return (
      <div style={s.loadingScreen}>
        <span style={s.logoIcon}>&gt;</span>
        <span style={{ ...s.logoText, marginLeft: 8 }}>EGREGORE</span>
      </div>
    )
  }

  return (
    <div style={s.shell}>
      <Sidebar activeView={view} onNavigate={setView} orgName={orgName} />
      <div style={s.main}>
        {view === 'home' && (
          <HomeView orgName={orgName} feedItems={feedItems} people={people} threads={threads} stats={homeStats} />
        )}
        {view === 'people' && (
          <PeopleView orgName={orgName} members={members} />
        )}
        {view === 'knowledge' && (
          <KnowledgeView orgName={orgName} items={knowledgeItems} />
        )}
        {view === 'quests' && (
          <QuestsView orgName={orgName} quests={quests} />
        )}
        {view === 'manage' && (
          <ManageView orgName={orgName} org={currentOrg} members={members} />
        )}
      </div>
    </div>
  )
}

// ─── Mock fallback data ─────────────────────────────────────

const MOCK = {
  feedItems: [
    { time: '2M', who: 'KAAN', text: 'STARTED SESSION: UNIFIED CHARACTER ONBOARDING', recent: true },
    { time: '1H', who: 'OZ', text: 'DEPLOYED HOSTED EGREGORE V2', recent: true },
    { time: '3H', who: 'CEM', text: 'CAPTURED DECISION: THICK VS THIN CHARACTER', recent: true },
    { time: '5H', who: 'OZ', text: 'PUSHED: WORKSPACE ENDPOINT + DEPLOY COMMANDS', recent: false },
    { time: '1D', who: 'RENC', text: 'COMPLETED QUEST: SPIRIT ECOLOGY MAINTENANCE', recent: false },
  ],
  people: [
    { name: 'KAAN', status: 'CHARACTER ONBOARDING', online: true },
    { name: 'OZ', status: 'INFRA DEPLOY', online: true },
    { name: 'CEM', status: '3H AGO', online: false },
    { name: 'RENC', status: '1D AGO', online: false },
  ],
  threads: [
    { title: 'THICK VS THIN CHARACTER', meta: 'CEM · WAITING ON EXTERNAL TESTING', blocked: false },
    { title: 'OAUTH URL COPY BROKEN ON MAC', meta: 'OZ · BLOCKED', blocked: true },
    { title: 'ONBOARDING FOR EXISTING USERS', meta: 'OZ · NEEDS DESIGN', blocked: false },
  ],
  members: [
    { name: 'cem', github: 'fcdagdelen', role: 'founder', online: true, focus: 'CHARACTER VOICE', sessions: 24, artifacts: 18, commits: 45, access: 'admin' },
    { name: 'oz', github: 'ozthegreat', role: 'engineering', online: true, focus: 'INFRA DEPLOY', sessions: 31, artifacts: 12, commits: 98, access: 'admin' },
    { name: 'kaan', github: 'keryilmaz', role: 'engineering', online: true, focus: 'UNIFIED CHARACTER ONBOARDING', sessions: 15, artifacts: 8, commits: 30, access: 'admin' },
    { name: 'renc', github: 'renc', role: 'design', online: false, lastSeen: '1D AGO', sessions: 8, artifacts: 5, commits: 12, access: 'member' },
    { name: 'pali', github: 'pali', role: 'operations', online: false, lastSeen: '2D AGO', sessions: 6, artifacts: 3, commits: 4, access: 'member' },
  ],
  knowledgeItems: [
    { type: 'decision', date: 'Mar 10', title: 'Org-level GitHub token for git clone', description: 'External auth requires user to authenticate through Coder first — impossible for new users.', author: 'oz', quest: 'hosted-egregore', related: [], source: '' },
    { type: 'finding', date: 'Mar 10', title: 'Character voice performing authenticity vs being authentic', description: 'Hard truth + proof + thread structure works mechanically but the voice was performing.', author: 'cem', quest: 'character-voice', related: [], source: '' },
    { type: 'pattern', date: 'Mar 09', title: 'Merge commits inflate activity numbers', description: 'Multiple git identities and merge commits make raw counts unreliable.', author: 'cem', quest: 'data-integrity', related: [], source: '' },
    { type: 'decision', date: 'Mar 06', title: 'Session date sort — use created timestamp not string', description: 'String-based date sorting produced wrong order.', author: 'oz', quest: 'infrastructure', related: [], source: '' },
  ],
  quests: [
    { id: 'Q-005', title: 'Character voice — thick vs thin persona', description: 'Should the egregore be opinionated and self-theorizing or a neutral vessel?', status: 'active', artifacts: 4, age: '2d ago', people: 'cem · kaan' },
    { id: 'Q-004', title: 'Hosted Egregore — browser workspace flow', description: 'End-to-end flow: dashboard click → workspace provision → Claude Code launch.', status: 'active', artifacts: 7, age: '1d ago', people: 'oz · renc · kaan' },
    { id: 'Q-003', title: 'Spirit ecology — autonomous graph maintenance', description: 'Spirits that autonomously maintain the knowledge graph.', status: 'active', artifacts: 3, age: '1d ago', people: 'cem · oz' },
    { id: 'Q-001', title: 'Open-source release plan — first draft', description: 'Defined egregore-core public repo strategy and sync workflow.', status: 'completed', artifacts: 2, age: '5d ago', people: 'oz · cem' },
  ],
}

// ─── Styles ─────────────────────────────────────────────────

const font = "'IBM Plex Sans', system-ui, -apple-system, sans-serif"
const mono = "'IBM Plex Mono', 'SF Mono', monospace"

const s = {
  // Shell
  shell: {
    display: 'flex',
    height: '100vh',
    background: '#F5F5F0',
    fontFamily: font,
    color: '#1A1A1A',
    overflow: 'hidden',
  },
  loadingScreen: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    background: '#F5F5F0',
    fontFamily: font,
  },
  main: {
    flex: 1,
    overflow: 'auto',
    borderRadius: 8,
  },

  // Sidebar
  sidebar: {
    width: 220,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '32px 20px',
    gap: 32,
    flexShrink: 0,
    borderRadius: 8,
  },
  sidebarTop: {
    display: 'flex',
    flexDirection: 'column',
    gap: 32,
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  logoIcon: {
    fontFamily: mono,
    fontSize: 20,
    fontWeight: 700,
    color: '#059669',
  },
  logoText: {
    fontFamily: mono,
    fontSize: 18,
    fontWeight: 500,
    color: '#1A1A1A',
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 14px',
    background: 'none',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left',
    fontFamily: font,
    fontSize: 13,
    transition: 'background 0.1s',
  },
  navItemActive: {
    background: '#FFFFFF',
  },
  navIcon: {
    fontFamily: mono,
    fontSize: 14,
  },
  navLabel: {
    fontFamily: font,
    fontSize: 13,
  },
  workspaceWidget: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    background: '#EAEAE5',
    borderRadius: 8,
    padding: '10px 14px',
  },
  wsTop: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  wsIcon: {
    fontFamily: mono,
    fontSize: 14,
    color: '#9CA3AF',
  },
  wsLabel: {
    fontFamily: font,
    fontSize: 11,
    color: '#9CA3AF',
  },
  wsName: {
    fontFamily: font,
    fontSize: 13,
    fontWeight: 600,
    color: '#059669',
  },

  // Content
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: 28,
    padding: '40px 48px',
    height: '100%',
    overflow: 'auto',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  titleOrg: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: 500,
    color: '#B0B5BD',
  },
  titleText: {
    fontFamily: font,
    fontSize: 28,
    fontWeight: 500,
    color: '#1A1A1A',
  },
  statsRow: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 32,
  },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 2,
  },
  statVal: {
    fontFamily: mono,
    fontSize: 20,
    color: '#1A1A1A',
  },
  statLabel: {
    fontFamily: mono,
    fontSize: 10,
    fontWeight: 500,
    color: '#B0B5BD',
  },

  // Section header
  sectionHeader: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: 500,
    color: '#9CA3AF',
  },

  // Columns
  columns: {
    display: 'flex',
    gap: 32,
    flex: 1,
    minHeight: 0,
  },
  mainCol: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    minHeight: 0,
    overflow: 'auto',
  },
  rightPanel: {
    width: 300,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    flexShrink: 0,
  },

  // Feed
  feed: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  feedItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    background: '#FFFFFF',
    borderRadius: 8,
    padding: '14px 18px',
  },
  feedTime: {
    fontFamily: mono,
    fontSize: 11,
    color: '#B0B5BD',
    minWidth: 24,
  },
  feedDot: {
    borderRadius: '50%',
    flexShrink: 0,
    display: 'inline-block',
  },
  feedWho: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: 500,
    flexShrink: 0,
  },
  feedText: {
    fontFamily: font,
    fontSize: 12,
  },

  // People (sidebar)
  peopleList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  personRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: '#FFFFFF',
    borderRadius: 8,
    padding: '12px 16px',
  },
  personName: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: 500,
  },
  personStatus: {
    fontFamily: mono,
    fontSize: 11,
    marginLeft: 'auto',
  },

  // Open workspace button
  openWorkspace: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#10B981',
    borderRadius: 8,
    padding: '14px 20px',
    border: 'none',
    cursor: 'pointer',
    fontFamily: mono,
    fontSize: 12,
    fontWeight: 600,
    color: '#000000',
    width: '100%',
  },

  // Threads
  threadsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  threadItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    background: '#FFFFFF',
    borderRadius: 8,
    padding: '12px 16px',
  },
  threadTitle: {
    fontFamily: mono,
    fontSize: 12,
    color: '#2D2D2D',
  },
  threadMeta: {
    fontFamily: mono,
    fontSize: 11,
  },

  // People grid
  peopleGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: 16,
  },
  personCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    background: '#FFFFFF',
    borderRadius: 8,
    padding: 24,
  },
  personCardTop: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  personCardName: {
    fontFamily: font,
    fontSize: 16,
    fontWeight: 500,
    color: '#1A1A1A',
  },
  personCardGithub: {
    fontFamily: mono,
    fontSize: 12,
    color: '#B0B5BD',
  },
  personCardRole: {
    fontFamily: font,
    fontSize: 12,
    color: '#1d3c71',
    textTransform: 'uppercase',
  },
  personCardStats: {
    display: 'flex',
    gap: 20,
  },
  personCardStat: {
    fontFamily: mono,
    fontSize: 11,
    color: '#9CA3AF',
  },
  personCardFocus: {
    fontFamily: mono,
    fontSize: 11,
  },
  inviteCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    background: 'none',
    border: '2px dashed #D1D5DB',
    borderRadius: 8,
    padding: 24,
    cursor: 'pointer',
    minHeight: 180,
  },
  inviteIcon: {
    fontFamily: mono,
    fontSize: 24,
    color: '#059669',
  },
  inviteText: {
    fontFamily: mono,
    fontSize: 12,
    color: '#059669',
    fontWeight: 500,
  },

  // Knowledge
  tabs: {
    display: 'flex',
    gap: 24,
  },
  tab: {
    background: 'none',
    border: 'none',
    fontFamily: mono,
    fontSize: 12,
    cursor: 'pointer',
    padding: 0,
  },
  divider: {
    height: 1,
    background: '#E5E7EB',
    width: '100%',
  },
  knowledgeList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  knowledgeItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    padding: '16px 18px',
    borderRadius: 8,
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    fontFamily: font,
    transition: 'background 0.1s',
  },
  knowledgeBadge: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  },
  knowledgeType: {
    fontFamily: mono,
    fontSize: 10,
    fontWeight: 500,
  },
  knowledgeDate: {
    fontFamily: mono,
    fontSize: 10,
    color: '#B0B5BD',
  },
  knowledgeTitle: {
    fontFamily: mono,
    fontSize: 14,
    fontWeight: 500,
    color: '#1A1A1A',
  },
  knowledgeDesc: {
    fontFamily: mono,
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 1.5,
  },
  knowledgeMeta: {
    display: 'flex',
    gap: 12,
  },
  knowledgeAuthor: {
    fontFamily: mono,
    fontSize: 11,
    color: '#9CA3AF',
  },
  knowledgeQuest: {
    fontFamily: mono,
    fontSize: 11,
    color: '#B0B5BD',
  },

  // Thread panel
  threadPanel: {
    width: 320,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    padding: '20px 22px',
    background: '#FFFFFF',
    borderRadius: 8,
    flexShrink: 0,
    overflow: 'auto',
  },
  threadPanelHeader: {
    fontFamily: mono,
    fontSize: 11,
    fontWeight: 500,
    color: '#9CA3AF',
  },
  threadPanelTitle: {
    fontFamily: mono,
    fontSize: 14,
    fontWeight: 500,
    color: '#1A1A1A',
  },
  threadPanelBody: {
    fontFamily: mono,
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 1.6,
  },
  threadPanelLabel: {
    fontFamily: mono,
    fontSize: 10,
    fontWeight: 500,
    color: '#9CA3AF',
    marginTop: 8,
  },
  threadPanelSource: {
    fontFamily: mono,
    fontSize: 11,
    color: '#B0B5BD',
  },
  relatedItem: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    padding: '10px 12px',
    background: '#F5F5F0',
    borderRadius: 8,
    fontFamily: mono,
    fontSize: 10,
  },
  relatedText: {
    fontFamily: mono,
    fontSize: 12,
    color: '#6B7280',
  },

  // Quests
  questList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  questCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    padding: '20px 22px',
    background: '#FFFFFF',
    borderRadius: 8,
  },
  questHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  questLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    fontFamily: mono,
    fontSize: 14,
  },
  questId: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: 500,
  },
  questStatus: {
    fontFamily: mono,
    fontSize: 10,
    fontWeight: 500,
  },
  questTitle: {
    fontFamily: font,
    fontSize: 15,
    fontWeight: 500,
  },
  questDesc: {
    fontFamily: mono,
    fontSize: 12,
    lineHeight: 1.5,
  },
  questMeta: {
    display: 'flex',
    gap: 20,
  },
  questMetaItem: {
    fontFamily: mono,
    fontSize: 11,
    color: '#9CA3AF',
  },

  // Manage
  adminBadge: {
    fontFamily: mono,
    fontSize: 10,
    fontWeight: 500,
    color: '#059669',
    background: '#ECFDF5',
    padding: '6px 12px',
    borderRadius: 8,
  },
  manageCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    padding: '20px 22px',
    background: '#FFFFFF',
    borderRadius: 8,
  },
  manageCardHeader: {
    fontFamily: mono,
    fontSize: 11,
    fontWeight: 500,
    color: '#9CA3AF',
  },
  manageRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  manageLabel: {
    fontFamily: font,
    fontSize: 13,
    color: '#6B7280',
  },
  manageValue: {
    fontFamily: font,
    fontSize: 13,
    fontWeight: 500,
    color: '#1A1A1A',
  },
  manageNote: {
    fontFamily: mono,
    fontSize: 11,
    color: '#B0B5BD',
  },
  copyBtn: {
    fontFamily: mono,
    fontSize: 10,
    fontWeight: 500,
    color: '#1A1A1A',
    background: '#F5F5F0',
    border: 'none',
    borderRadius: 8,
    padding: '6px 14px',
    cursor: 'pointer',
  },
  membersPanel: {
    width: 420,
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    padding: '20px 22px',
    background: '#FFFFFF',
    borderRadius: 8,
    flexShrink: 0,
  },
  membersTable: {
    display: 'flex',
    flexDirection: 'column',
  },
  membersHeaderRow: {
    display: 'flex',
    padding: '4px 0',
  },
  membersHeaderCell: {
    fontFamily: mono,
    fontSize: 11,
    color: '#B0B5BD',
  },
  memberRow: {
    display: 'flex',
    padding: '8px 0',
  },
  memberCell: {
    fontFamily: font,
    fontSize: 13,
    color: '#6B7280',
  },
  inviteMemberBtn: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: 500,
    color: '#059669',
    background: '#F5F5F0',
    border: 'none',
    borderRadius: 8,
    padding: '10px 0',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'center',
  },
}
