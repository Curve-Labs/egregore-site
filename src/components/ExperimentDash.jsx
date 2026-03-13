import React, { useState, useEffect } from 'react'
import { getActivityDashboard, graphQuery } from '../api'

const VIEWS = ['home', 'people', 'knowledge', 'quests', 'todos', 'handoffs', 'activity', 'manage']

const NAV_ITEMS = [
  { key: 'home', icon: '⌂', label: 'home' },
  { key: 'people', icon: '◎', label: 'people' },
  { key: 'knowledge', icon: '◆', label: 'knowledge' },
  { key: 'quests', icon: '⚑', label: 'quests' },
  { key: 'todos', icon: '☐', label: 'todos' },
  { key: 'handoffs', icon: '⇄', label: 'handoffs' },
  { key: 'activity', icon: '◈', label: 'activity' },
  { key: 'manage', icon: '⚙', label: 'manage' },
]

const LogoIcon = ({ size = 20, color = 'currentColor' }) => (
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
)

// ─── Sidebar ────────────────────────────────────────────────

function Sidebar({ activeView, onNavigate, orgName }) {
  return (
    <div style={s.sidebar}>
      <div style={s.sidebarTop}>
        <div style={s.logo}>
          <LogoIcon size={22} color="#22C55E" />
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
                  ...s.navIndicator,
                  color: active ? '#22C55E' : '#525252',
                }}>{active ? '>' : '○'}</span>
                <span style={{
                  ...s.navLabel,
                  color: active ? '#E5E5E5' : '#737373',
                }}>{item.label}</span>
              </button>
            )
          })}
        </nav>
      </div>
      <div style={s.workspaceWidget}>
        <div style={s.wsTop}>
          <span style={s.wsIcon}>⊞</span>
          <span style={s.wsLabel}>workspaces</span>
        </div>
        <span style={s.wsName}>{orgName || 'workspace'}</span>
      </div>
    </div>
  )
}

// ─── Page Header ────────────────────────────────────────────

function PageHeader({ orgName, title, stats }) {
  return (
    <div style={s.topBar}>
      <div style={s.titleBlock}>
        <span style={s.titleOrg}>// {(orgName || '').toLowerCase()}</span>
        <span style={s.titleText}>{title.toLowerCase()}</span>
      </div>
      {stats && (
        <div style={s.statsRow}>
          {stats.map((st, i) => (
            <div key={i} style={s.stat}>
              <span style={{ ...s.statVal, color: st.color || '#E5E5E5' }}>{st.value}</span>
              <span style={s.statLabel}>{st.label.toLowerCase()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Section Header ─────────────────────────────────────────

function SectionHeader({ children }) {
  return <div style={s.sectionHeader}>{typeof children === 'string' ? children.toLowerCase() : children}</div>
}

// ─── Home View ──────────────────────────────────────────────

function HomeView({ orgName, feedItems, people, threads, stats }) {
  return (
    <div style={s.content}>
      <PageHeader
        orgName={orgName}
        title="home"
        stats={stats}
      />
      <div style={s.columns}>
        <div style={s.mainCol}>
          <SectionHeader>pulse</SectionHeader>
          <div style={s.feed}>
            {feedItems.map((item, i) => (
              <div key={i} style={s.feedItem}>
                <span style={s.feedTime}>{item.time}</span>
                <span style={{
                  ...s.feedDot,
                  background: item.recent ? '#22C55E' : '#525252',
                  width: item.recent ? 8 : 6,
                  height: item.recent ? 8 : 6,
                }} />
                <span style={{
                  ...s.feedWho,
                  color: item.recent ? '#22C55E' : '#737373',
                }}>{item.who.toLowerCase()}</span>
                <span style={{
                  ...s.feedText,
                  color: item.recent ? '#E5E5E5' : '#737373',
                }}>{item.text.toLowerCase()}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={s.rightPanel}>
          <SectionHeader>people</SectionHeader>
          <div style={s.peopleList}>
            {people.map((p, i) => (
              <div key={i} style={s.personRow}>
                <span style={{
                  ...s.feedDot,
                  background: p.online ? '#22C55E' : '#525252',
                  width: 8, height: 8,
                }} />
                <span style={{
                  ...s.personName,
                  color: p.online ? '#E5E5E5' : '#737373',
                }}>{p.name.toLowerCase()}</span>
                <span style={{
                  ...s.personStatus,
                  color: p.online ? '#A3A3A3' : '#525252',
                }}>{p.status.toLowerCase()}</span>
              </div>
            ))}
          </div>
          <button style={s.openWorkspace}>
            &gt;_ open workspace
          </button>
          <SectionHeader>open threads</SectionHeader>
          <div style={s.threadsList}>
            {threads.map((t, i) => (
              <div key={i} style={s.threadItem}>
                <span style={s.threadTitle}>{t.title.toLowerCase()}</span>
                <span style={{
                  ...s.threadMeta,
                  color: t.blocked ? '#EF4444' : '#525252',
                }}>{t.meta.toLowerCase()}</span>
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
        title="people"
        stats={[
          { value: String(members.length), label: 'members' },
          { value: String(members.filter(m => m.online).length), label: 'online', color: '#22C55E' },
        ]}
      />
      <div style={s.peopleGrid}>
        {members.map((m, i) => (
          <div key={i} style={s.personCard}>
            <div style={s.personCardTop}>
              <span style={{
                ...s.feedDot,
                background: m.online ? '#22C55E' : '#525252',
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
              color: m.online ? '#22C55E' : '#525252',
            }}>{m.online ? `now: ${(m.focus || '').toLowerCase()}` : `last: ${(m.lastSeen || '').toLowerCase()}`}</span>
          </div>
        ))}
        <button style={s.inviteCard}>
          <span style={s.inviteIcon}>+</span>
          <span style={s.inviteText}>invite member</span>
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

  const typeColor = { decision: '#22C55E', finding: '#F59E0B', pattern: '#8B5CF6' }

  return (
    <div style={s.content}>
      <PageHeader
        orgName={orgName}
        title="knowledge"
        stats={[
          { value: String(items.filter(i => i.type === 'decision').length), label: 'decisions', color: '#22C55E' },
          { value: String(items.filter(i => i.type === 'finding').length), label: 'findings', color: '#F59E0B' },
          { value: String(items.filter(i => i.type === 'pattern').length), label: 'patterns', color: '#8B5CF6' },
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
                  color: tab === t ? '#E5E5E5' : '#737373',
                  fontWeight: tab === t ? 500 : 400,
                }}
              >
                {t === 'all' ? 'all' : t + 's'}
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
                  background: selected === i ? '#1F1F1F' : 'transparent',
                }}
              >
                <div style={s.knowledgeBadge}>
                  <span style={{ ...s.knowledgeType, color: typeColor[item.type] }}>
                    {item.type}
                  </span>
                  <span style={s.knowledgeDate}>{item.date}</span>
                </div>
                <span style={s.knowledgeTitle}>{item.title.toLowerCase()}</span>
                <span style={s.knowledgeDesc}>{item.description.toLowerCase()}</span>
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
            <span style={s.threadPanelHeader}>thread</span>
            <div style={s.divider} />
            <span style={s.threadPanelTitle}>{active.title.toLowerCase()}</span>
            <span style={s.threadPanelBody}>{(active.fullText || active.description).toLowerCase()}</span>
            {active.related && active.related.length > 0 && (
              <>
                <span style={s.threadPanelLabel}>related</span>
                {active.related.map((r, i) => (
                  <div key={i} style={s.relatedItem}>
                    <span style={{ color: typeColor[r.type] || '#22C55E' }}>◉</span>
                    <span style={s.relatedText}>{r.title.toLowerCase()}</span>
                  </div>
                ))}
              </>
            )}
            {active.source && (
              <>
                <span style={s.threadPanelLabel}>source</span>
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
        title="quests"
        stats={[
          { value: String(active.length), label: 'active', color: '#22C55E' },
          { value: String(completed.length), label: 'completed' },
        ]}
      />
      <div style={s.questList}>
        {quests.map((q, i) => {
          const isActive = q.status === 'active'
          return (
            <div key={i} style={{
              ...s.questCard,
              borderLeft: `3px solid ${isActive ? '#22C55E' : '#525252'}`,
            }}>
              <div style={s.questHeader}>
                <div style={s.questLeft}>
                  <span style={{
                    ...s.questId,
                    color: isActive ? '#22C55E' : '#737373',
                  }}>{q.id}</span>
                </div>
                <span style={{
                  ...s.questStatus,
                  color: isActive ? '#22C55E' : '#737373',
                }}>{q.status}</span>
              </div>
              <span style={{
                ...s.questTitle,
                color: isActive ? '#E5E5E5' : '#737373',
              }}>{q.title.toLowerCase()}</span>
              <span style={{
                ...s.questDesc,
                color: isActive ? '#A3A3A3' : '#525252',
              }}>{q.description.toLowerCase()}</span>
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

// ─── Todos View ─────────────────────────────────────────────

function TodosView({ orgName, todos }) {
  const [tab, setTab] = useState('open')

  const open = todos.filter(t => t.status === 'open')
  const done = todos.filter(t => t.status === 'done')
  const filtered = tab === 'open' ? open : tab === 'done' ? done : todos

  return (
    <div style={s.content}>
      <PageHeader
        orgName={orgName}
        title="todos"
        stats={[
          { value: String(open.length), label: 'open', color: '#22C55E' },
          { value: String(done.length), label: 'done' },
        ]}
      />
      <div style={s.tabs}>
        {['open', 'done', 'all'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              ...s.tab,
              color: tab === t ? '#E5E5E5' : '#737373',
              fontWeight: tab === t ? 500 : 400,
            }}
          >{t}</button>
        ))}
      </div>
      <div style={s.divider} />
      <div style={s.todoList}>
        {filtered.length === 0 && (
          <div style={s.emptyState}>// no {tab} todos</div>
        )}
        {filtered.map((todo, i) => {
          const isDone = todo.status === 'done'
          return (
            <div key={i} style={{
              ...s.todoItem,
              borderLeft: `3px solid ${isDone ? '#525252' : '#22C55E'}`,
              opacity: isDone ? 0.6 : 1,
            }}>
              <div style={s.todoHeader}>
                <span style={{
                  ...s.todoCheckbox,
                  color: isDone ? '#22C55E' : '#525252',
                }}>{isDone ? '☑' : '☐'}</span>
                <span style={{
                  ...s.todoText,
                  color: isDone ? '#737373' : '#E5E5E5',
                  textDecoration: isDone ? 'line-through' : 'none',
                }}>{todo.text.toLowerCase()}</span>
              </div>
              <div style={s.todoMeta}>
                <span style={s.todoMetaItem}>{todo.by}</span>
                <span style={s.todoMetaItem}>{todo.date}</span>
                {todo.quest && <span style={{ ...s.todoMetaItem, color: '#22C55E' }}>{todo.quest}</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Handoffs View ──────────────────────────────────────────

function HandoffsView({ orgName, handoffs }) {
  const [tab, setTab] = useState('all')

  const pending = handoffs.filter(h => h.status === 'pending')
  const read = handoffs.filter(h => h.status === 'read')
  const done = handoffs.filter(h => h.status === 'done')
  const filtered = tab === 'all' ? handoffs : handoffs.filter(h => h.status === tab)

  const statusColor = { pending: '#F59E0B', read: '#3B82F6', done: '#22C55E' }

  return (
    <div style={s.content}>
      <PageHeader
        orgName={orgName}
        title="handoffs"
        stats={[
          { value: String(pending.length), label: 'pending', color: '#F59E0B' },
          { value: String(read.length), label: 'read', color: '#3B82F6' },
          { value: String(done.length), label: 'done', color: '#22C55E' },
        ]}
      />
      <div style={s.tabs}>
        {['all', 'pending', 'read', 'done'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              ...s.tab,
              color: tab === t ? '#E5E5E5' : '#737373',
              fontWeight: tab === t ? 500 : 400,
            }}
          >{t}</button>
        ))}
      </div>
      <div style={s.divider} />
      <div style={s.handoffList}>
        {filtered.length === 0 && (
          <div style={s.emptyState}>// no {tab} handoffs</div>
        )}
        {filtered.map((h, i) => (
          <div key={i} style={{
            ...s.handoffCard,
            borderLeft: `3px solid ${statusColor[h.status] || '#525252'}`,
          }}>
            <div style={s.handoffHeader}>
              <span style={s.handoffTopic}>{(h.topic || 'untitled').toLowerCase()}</span>
              <span style={{
                ...s.handoffStatus,
                color: statusColor[h.status] || '#737373',
              }}>{h.status}</span>
            </div>
            {h.summary && (
              <span style={s.handoffSummary}>{h.summary.toLowerCase()}</span>
            )}
            <div style={s.handoffMeta}>
              <span style={s.handoffMetaItem}>
                <span style={{ color: '#737373' }}>from</span> {h.author}
              </span>
              {h.handedTo && (
                <span style={s.handoffMetaItem}>
                  <span style={{ color: '#737373' }}>to</span> {h.handedTo}
                </span>
              )}
              <span style={s.handoffMetaItem}>{h.date}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Activity View ──────────────────────────────────────────

function ActivityView({ orgName, sessions }) {
  const [tab, setTab] = useState('all')

  const activeSessions = sessions.filter(s => s.status === 'active')
  const wrapped = sessions.filter(s => s.status === 'wrapped')
  const handedOff = sessions.filter(s => s.status === 'handed_off')
  const filtered = tab === 'all' ? sessions : sessions.filter(s => s.status === tab)

  const statusColor = {
    active: '#22C55E',
    wrapped: '#3B82F6',
    handed_off: '#F59E0B',
  }

  return (
    <div style={s.content}>
      <PageHeader
        orgName={orgName}
        title="activity"
        stats={[
          { value: String(activeSessions.length), label: 'active', color: '#22C55E' },
          { value: String(wrapped.length), label: 'wrapped', color: '#3B82F6' },
          { value: String(handedOff.length), label: 'handed_off', color: '#F59E0B' },
        ]}
      />
      <div style={s.tabs}>
        {['all', 'active', 'wrapped', 'handed_off'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              ...s.tab,
              color: tab === t ? '#E5E5E5' : '#737373',
              fontWeight: tab === t ? 500 : 400,
            }}
          >{t}</button>
        ))}
      </div>
      <div style={s.divider} />
      <div style={s.activityList}>
        {filtered.length === 0 && (
          <div style={s.emptyState}>// no {tab} sessions</div>
        )}
        {filtered.map((sess, i) => (
          <div key={i} style={{
            ...s.sessionCard,
            borderLeft: `3px solid ${statusColor[sess.status] || '#525252'}`,
          }}>
            <div style={s.sessionHeader}>
              <div style={s.sessionLeft}>
                <span style={{
                  ...s.feedDot,
                  background: statusColor[sess.status] || '#525252',
                  width: 8, height: 8,
                }} />
                <span style={s.sessionBy}>{sess.by}</span>
              </div>
              <span style={{
                ...s.sessionStatus,
                color: statusColor[sess.status] || '#737373',
              }}>{sess.status}</span>
            </div>
            <span style={s.sessionTopic}>
              {(sess.topic || 'untitled session').toLowerCase()}
            </span>
            {sess.summary && (
              <span style={s.sessionSummary}>{sess.summary.toLowerCase()}</span>
            )}
            <div style={s.sessionMeta}>
              <span style={s.sessionMetaItem}>{sess.date}</span>
              {sess.branch && sess.branch !== 'develop' && (
                <span style={{ ...s.sessionMetaItem, color: '#22C55E' }}>{sess.branch}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Manage View ────────────────────────────────────────────

const INTEGRATIONS = [
  { name: 'github', status: 'connected', icon: '⬡' },
  { name: 'neo4j', status: 'connected', icon: '◉' },
  { name: 'telegram', status: 'not connected', icon: '▷' },
  { name: 'google_workspace', status: 'not connected', icon: '◧' },
]

function ManageView({ orgName, org, members }) {
  return (
    <div style={s.content}>
      <PageHeader
        orgName={orgName}
        title="manage"
        stats={[]}
      />
      <div style={{ ...s.topBar, justifyContent: 'flex-end', marginTop: -16 }}>
        <span style={s.adminBadge}>admin</span>
      </div>
      <div style={s.manageGrid}>
        <div style={s.manageLeftCol}>
          <div style={s.manageCard}>
            <span style={s.manageCardHeader}>workspace</span>
            <div style={s.divider} />
            {[
              ['organization', org.name || orgName],
              ['github_org', org.github_org || '—'],
              ['memory_repo', org.memory_repo || '—'],
              ['status', null],
            ].map(([label, value], i) => (
              <div key={i} style={s.manageRow}>
                <span style={s.manageLabel}>{label}</span>
                {value !== null ? (
                  <span style={s.manageValue}>{value}</span>
                ) : (
                  <span style={{ ...s.manageValue, color: '#22C55E' }}>● connected</span>
                )}
              </div>
            ))}
          </div>
          <div style={s.manageCard}>
            <span style={s.manageCardHeader}>api_key</span>
            <div style={s.divider} />
            <div style={s.manageRow}>
              <span style={{ ...s.manageLabel, fontFamily: mono }}>
                egr_sk_••••••••••••••••
              </span>
              <button style={s.copyBtn}>copy</button>
            </div>
            <span style={s.manageNote}>// used for graph queries and notifications. store in .env</span>
          </div>
          <div style={s.manageCard}>
            <span style={s.manageCardHeader}>integrations</span>
            <div style={s.divider} />
            {INTEGRATIONS.map((intg, i) => (
              <div key={i} style={s.manageRow}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ color: intg.status === 'connected' ? '#22C55E' : '#525252', fontSize: 14 }}>{intg.icon}</span>
                  <span style={s.manageLabel}>{intg.name}</span>
                </div>
                <span style={{
                  ...s.manageValue,
                  color: intg.status === 'connected' ? '#22C55E' : '#525252',
                  fontSize: 11,
                }}>{intg.status}</span>
              </div>
            ))}
          </div>
          <div style={{ ...s.manageCard, borderColor: '#7F1D1D' }}>
            <span style={{ ...s.manageCardHeader, color: '#EF4444' }}>danger_zone</span>
            <div style={{ ...s.divider, background: '#7F1D1D' }} />
            <div style={s.manageRow}>
              <div>
                <span style={s.manageLabel}>reset_graph</span>
                <span style={{ ...s.manageNote, display: 'block', marginTop: 4 }}>// clears all nodes and relationships</span>
              </div>
              <button style={s.dangerBtn}>reset</button>
            </div>
            <div style={s.manageRow}>
              <div>
                <span style={s.manageLabel}>delete_egregore</span>
                <span style={{ ...s.manageNote, display: 'block', marginTop: 4 }}>// permanently removes this workspace</span>
              </div>
              <button style={s.dangerBtn}>delete</button>
            </div>
          </div>
        </div>
        <div style={s.membersPanel}>
          <span style={s.manageCardHeader}>members</span>
          <div style={s.divider} />
          <div style={s.membersTable}>
            <div style={s.membersHeaderRow}>
              <span style={{ ...s.membersHeaderCell, flex: 2 }}>name</span>
              <span style={{ ...s.membersHeaderCell, flex: 1.5 }}>role</span>
              <span style={{ ...s.membersHeaderCell, flex: 1.5 }}>status</span>
              <span style={{ ...s.membersHeaderCell, flex: 1 }}>sessions</span>
              <span style={{ ...s.membersHeaderCell, flex: 1 }}>access</span>
            </div>
            {members.map((m, i) => (
              <div key={i} style={s.memberRow}>
                <span style={{ ...s.memberCell, flex: 2, color: '#E5E5E5' }}>{m.name}</span>
                <span style={{ ...s.memberCell, flex: 1.5 }}>{m.role}</span>
                <span style={{ ...s.memberCell, flex: 1.5, color: m.online ? '#22C55E' : '#737373' }}>
                  {m.online ? '● online' : '○ offline'}
                </span>
                <span style={{ ...s.memberCell, flex: 1 }}>{m.sessions || 0}</span>
                <span style={{ ...s.memberCell, flex: 1 }}>{m.access || 'member'}</span>
              </div>
            ))}
          </div>
          <button style={s.inviteMemberBtn}>+ invite member</button>
        </div>
      </div>
    </div>
  )
}

// ─── Data helpers ───────────────────────────────────────────

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const mins = Math.floor((now - d) / 60000)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  return `${days}d`
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
  const [graphTodos, setGraphTodos] = useState([])
  const [graphHandoffs, setGraphHandoffs] = useState([])
  const [graphSessions, setGraphSessions] = useState([])

  const [apiKey, setApiKey] = useState(() => localStorage.getItem('egregore_api_key') || '')
  const [username, setUsername] = useState(() => localStorage.getItem('egregore_username') || '')
  const orgName = 'Curve Labs'

  if (!apiKey) {
    return (
      <div style={{ ...s.loadingScreen, flexDirection: 'column', gap: 16 }}>
        <div style={s.logo}>
          <LogoIcon size={22} color="#22C55E" />
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
          <input name="user" placeholder="github username" defaultValue=""
            style={{ fontFamily: mono, fontSize: 13, padding: '10px 14px', background: '#1A1A1A', border: '1px solid #1F1F1F', borderRadius: 8, color: '#E5E5E5' }} />
          <input name="key" placeholder="api key (ek_...)" defaultValue=""
            style={{ fontFamily: mono, fontSize: 13, padding: '10px 14px', background: '#1A1A1A', border: '1px solid #1F1F1F', borderRadius: 8, color: '#E5E5E5' }} />
          <button type="submit"
            style={{ fontFamily: mono, fontSize: 13, fontWeight: 600, padding: '12px 14px', background: '#22C55E', color: '#0C0C0C', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
            connect
          </button>
        </form>
      </div>
    )
  }

  useEffect(() => {
    if (!apiKey || !username) return

    getActivityDashboard(apiKey, username)
      .then(data => { setActivity(data); setLoading(false) })
      .catch(err => { console.warn('Activity fetch failed:', err.message); setLoading(false) })

    // People
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

    // Knowledge
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

    // Todos
    graphQuery(apiKey, `
      MATCH (t:Todo)-[:BY]->(p:Person)
      OPTIONAL MATCH (t)-[:INVOLVES]->(q:Quest)
      RETURN t.id AS id, t.text AS text, t.status AS status,
             t.created AS created, t.completed AS completed,
             p.name AS by, q.title AS quest
      ORDER BY t.created DESC LIMIT 50
    `).then(r => setGraphTodos(toRecords(r))).catch(() => {})

    // Handoffs
    graphQuery(apiKey, `
      MATCH (s:Session)
      WHERE s.handoffStatus IS NOT NULL
      OPTIONAL MATCH (s)-[:BY]->(p:Person)
      OPTIONAL MATCH (s)-[:HANDED_TO]->(t:Person)
      WITH s, p, collect(DISTINCT t.name) AS handedToList
      RETURN s.id AS id, s.topic AS topic, s.summary AS summary,
             s.handoffStatus AS status, s.date AS date,
             p.name AS author, handedToList
      ORDER BY s.date DESC LIMIT 30
    `).then(r => setGraphHandoffs(toRecords(r))).catch(() => {})

    // Sessions (activity)
    graphQuery(apiKey, `
      MATCH (s:Session)-[:BY]->(p:Person)
      RETURN s.id AS id, s.topic AS topic, s.status AS status,
             s.date AS date, s.branch AS branch, s.summary AS summary,
             p.name AS by
      ORDER BY s.date DESC LIMIT 50
    `).then(r => setGraphSessions(toRecords(r))).catch(() => {})

  }, [apiKey, username])

  // ─── Transform graph data into view props ────────────────

  const isRecentSession = (dateStr) => {
    if (!dateStr) return false
    const hrs = (Date.now() - new Date(dateStr).getTime()) / 3600000
    return hrs < 4
  }

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
      who: (s.who || '').toLowerCase(),
      text: (s.topic || 'session').toLowerCase(),
      recent: isRecentSession(s.date),
    }))
  })()

  const people = (() => {
    if (graphPeople.length === 0) return MOCK.people
    return graphPeople.map(p => {
      const isOnline = p.lastSession && isRecentSession(p.lastSession)
      return {
        name: (p.name || ''),
        status: isOnline ? (p.name || '') : timeAgo(p.lastSession) + ' ago',
        online: isOnline,
      }
    })
  })()

  const threads = (() => {
    if (!activity) return MOCK.threads
    const pending = (activity.handoffs_to_me || [])
      .filter(h => h.status === 'pending' || h.status === 'read')
      .slice(0, 4)
    if (pending.length === 0) return MOCK.threads
    return pending.map(h => ({
      title: (h.topic || 'untitled').toLowerCase(),
      meta: `${(h.author || '').toLowerCase()} · ${h.status === 'pending' ? 'pending' : 'open'}`,
      blocked: false,
    }))
  })()

  const members = (() => {
    if (graphPeople.length === 0) return MOCK.members
    return graphPeople.map(p => {
      const isOnline = p.lastSession && isRecentSession(p.lastSession)
      return {
        name: p.name || '',
        github: p.github || p.name || '',
        role: p.role || 'member',
        online: isOnline,
        focus: (p.name || ''),
        lastSeen: timeAgo(p.lastSession) + ' ago',
        sessions: p.sessions || 0,
        artifacts: p.artifacts || 0,
        commits: 0,
        access: 'member',
      }
    })
  })()

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

  const todos = (() => {
    if (graphTodos.length === 0) return MOCK.todos
    return graphTodos.map(t => ({
      id: t.id || '',
      text: t.text || '',
      status: t.status || 'open',
      date: formatDate(t.created),
      by: t.by || '',
      quest: t.quest || '',
    }))
  })()

  const handoffs = (() => {
    if (graphHandoffs.length === 0) return MOCK.handoffs
    // Deduplicate by id (same handoff can have multiple HANDED_TO)
    const seen = new Map()
    for (const h of graphHandoffs) {
      if (seen.has(h.id)) {
        const existing = seen.get(h.id)
        const newNames = (h.handedToList || []).filter(Boolean)
        existing.handedTo = [...new Set([...existing.handedTo.split(', ').filter(Boolean), ...newNames])].join(', ')
      } else {
        seen.set(h.id, {
          id: h.id || '',
          topic: h.topic || 'untitled',
          summary: h.summary || '',
          status: h.status || 'pending',
          date: formatDate(h.date),
          author: h.author || '',
          handedTo: (h.handedToList || []).filter(Boolean).join(', '),
        })
      }
    }
    return [...seen.values()]
  })()

  const sessions = (() => {
    if (graphSessions.length === 0) return MOCK.sessions
    return graphSessions.map(s => ({
      id: s.id || '',
      topic: s.topic || '',
      status: s.status || 'active',
      date: formatDate(s.date),
      branch: s.branch || '',
      summary: s.summary || '',
      by: s.by || '',
    }))
  })()

  const homeStats = (() => {
    if (!activity) return [
      { value: '—', label: 'artifacts' },
      { value: '—', label: 'decisions' },
      { value: '—', label: 'active now', color: '#22C55E' },
    ]
    const questCount = (activity.quests || []).length
    return [
      { value: String(graphKnowledge.length || '—'), label: 'artifacts' },
      { value: String(graphKnowledge.filter(k => k.type === 'decision').length || '—'), label: 'decisions' },
      { value: String(questCount), label: 'active', color: '#22C55E' },
    ]
  })()

  const currentOrg = {
    name: orgName,
    github_org: 'Curve-Labs',
    memory_repo: 'Curve-Labs/egregore-memory',
  }

  if (loading) {
    return (
      <div style={s.loadingScreen}>
        <LogoIcon size={22} color="#22C55E" />
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
        {view === 'todos' && (
          <TodosView orgName={orgName} todos={todos} />
        )}
        {view === 'handoffs' && (
          <HandoffsView orgName={orgName} handoffs={handoffs} />
        )}
        {view === 'activity' && (
          <ActivityView orgName={orgName} sessions={sessions} />
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
    { time: '2m', who: 'kaan', text: 'started session: unified character onboarding', recent: true },
    { time: '1h', who: 'oz', text: 'deployed hosted egregore v2', recent: true },
    { time: '3h', who: 'cem', text: 'captured decision: thick vs thin character', recent: true },
    { time: '5h', who: 'oz', text: 'pushed: workspace endpoint + deploy commands', recent: false },
    { time: '1d', who: 'renc', text: 'completed quest: spirit ecology maintenance', recent: false },
  ],
  people: [
    { name: 'kaan', status: 'character onboarding', online: true },
    { name: 'oz', status: 'infra deploy', online: true },
    { name: 'cem', status: '3h ago', online: false },
    { name: 'renc', status: '1d ago', online: false },
  ],
  threads: [
    { title: 'thick vs thin character', meta: 'cem · waiting on external testing', blocked: false },
    { title: 'oauth url copy broken on mac', meta: 'oz · blocked', blocked: true },
    { title: 'onboarding for existing users', meta: 'oz · needs design', blocked: false },
  ],
  members: [
    { name: 'cem', github: 'fcdagdelen', role: 'founder', online: true, focus: 'character voice', sessions: 24, artifacts: 18, commits: 45, access: 'admin' },
    { name: 'oz', github: 'ozthegreat', role: 'engineering', online: true, focus: 'infra deploy', sessions: 31, artifacts: 12, commits: 98, access: 'admin' },
    { name: 'kaan', github: 'keryilmaz', role: 'engineering', online: true, focus: 'unified character onboarding', sessions: 15, artifacts: 8, commits: 30, access: 'admin' },
    { name: 'renc', github: 'renc', role: 'design', online: false, lastSeen: '1d ago', sessions: 8, artifacts: 5, commits: 12, access: 'member' },
    { name: 'pali', github: 'pali', role: 'operations', online: false, lastSeen: '2d ago', sessions: 6, artifacts: 3, commits: 4, access: 'member' },
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
  todos: [
    { id: 't-001', text: 'Research secrets/password manager for Claude Code workflows', status: 'open', date: 'Mar 12', by: 'oz', quest: '' },
    { id: 't-002', text: 'Feasibility analysis: Egregore as Claude Code plugin', status: 'open', date: 'Mar 12', by: 'oz', quest: '' },
    { id: 't-003', text: 'Per-org GitHub OAuth app for Coder', status: 'open', date: 'Mar 12', by: 'oz', quest: 'hosted-egregore' },
    { id: 't-004', text: 'Build auto-complete hook — detect when session work resolves open todos', status: 'open', date: 'Mar 12', by: 'oz', quest: '' },
    { id: 't-005', text: 'Review tech tree document from meeting', status: 'open', date: 'Mar 12', by: 'oz', quest: '' },
    { id: 't-006', text: 'Ship onboarding v7 character voice', status: 'done', date: 'Mar 11', by: 'kaan', quest: 'character-voice' },
  ],
  handoffs: [
    { id: 'h-001', topic: 'CORK Launch Plan — Meeting Analysis', summary: 'Analyzed the CORK launch plan from the team meeting. Key decisions around timeline and resource allocation.', status: 'read', date: 'Mar 12', author: 'cem', handedTo: 'oz, renc, kaan' },
    { id: 'h-002', topic: 'Character v5 — test the new version', summary: 'Character v5 is ready for testing. New voice gradient from poetic to practical.', status: 'done', date: 'Mar 11', author: 'kaan', handedTo: 'cem, renc' },
    { id: 'h-003', topic: 'Hosted workspace deploy flow', summary: 'VPS provisioning pipeline is working. Need OAuth app per org next.', status: 'pending', date: 'Mar 10', author: 'oz', handedTo: 'kaan' },
  ],
  sessions: [
    { id: 's-001', topic: 'experiment dashboard dark theme', status: 'active', date: 'Mar 13', branch: 'dev/kaan/experiment-dashboard', summary: '', by: 'kaan' },
    { id: 's-002', topic: 'hosted egregore credentials endpoint', status: 'active', date: 'Mar 13', branch: 'dev/oz/credentials', summary: '', by: 'oz' },
    { id: 's-003', topic: 'CORK launch plan analysis', status: 'wrapped', date: 'Mar 12', branch: 'dev/cem/cork-launch-plan-analysis', summary: 'Analyzed meeting transcript and extracted key decisions.', by: 'cem' },
    { id: 's-004', topic: 'character v5 test new version', status: 'handed_off', date: 'Mar 11', branch: 'dev/kaan/character-v5-test', summary: 'Tested new character voice. Ready for review.', by: 'kaan' },
    { id: 's-005', topic: 'spirit ecology maintenance', status: 'wrapped', date: 'Mar 10', branch: 'dev/renc/spirit-ecology', summary: 'Completed spirit ecology maintenance quest.', by: 'renc' },
  ],
}

// ─── Styles ─────────────────────────────────────────────────

const mono = "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace"

const s = {
  shell: {
    display: 'flex',
    height: '100vh',
    background: '#0C0C0C',
    fontFamily: mono,
    color: '#E5E5E5',
    overflow: 'hidden',
  },
  loadingScreen: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    background: '#0C0C0C',
    fontFamily: mono,
  },
  main: {
    flex: 1,
    overflow: 'auto',
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
    borderRight: '1px solid #1F1F1F',
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
  logoText: {
    fontFamily: mono,
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: '0.08em',
    color: '#E5E5E5',
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
    borderRadius: 4,
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left',
    fontFamily: mono,
    fontSize: 13,
    transition: 'background 0.1s',
  },
  navItemActive: {
    background: '#171717',
  },
  navIndicator: {
    fontFamily: mono,
    fontSize: 14,
    fontWeight: 700,
    width: 16,
    textAlign: 'center',
  },
  navLabel: {
    fontFamily: mono,
    fontSize: 13,
  },
  workspaceWidget: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    background: '#171717',
    borderRadius: 4,
    padding: '10px 14px',
    border: '1px solid #1F1F1F',
  },
  wsTop: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  wsIcon: {
    fontFamily: mono,
    fontSize: 14,
    color: '#525252',
  },
  wsLabel: {
    fontFamily: mono,
    fontSize: 11,
    color: '#525252',
  },
  wsName: {
    fontFamily: mono,
    fontSize: 13,
    fontWeight: 600,
    color: '#22C55E',
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
    fontWeight: 400,
    color: '#525252',
  },
  titleText: {
    fontFamily: mono,
    fontSize: 28,
    fontWeight: 500,
    color: '#E5E5E5',
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
    color: '#E5E5E5',
  },
  statLabel: {
    fontFamily: mono,
    fontSize: 10,
    fontWeight: 500,
    color: '#525252',
  },

  sectionHeader: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: 500,
    color: '#737373',
  },

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
    background: '#171717',
    borderRadius: 4,
    padding: '14px 18px',
    border: '1px solid #1F1F1F',
  },
  feedTime: {
    fontFamily: mono,
    fontSize: 11,
    color: '#525252',
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
    fontFamily: mono,
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
    background: '#171717',
    borderRadius: 4,
    padding: '12px 16px',
    border: '1px solid #1F1F1F',
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

  openWorkspace: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#22C55E',
    borderRadius: 4,
    padding: '14px 20px',
    border: 'none',
    cursor: 'pointer',
    fontFamily: mono,
    fontSize: 12,
    fontWeight: 600,
    color: '#0C0C0C',
    width: '100%',
  },

  threadsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  threadItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    background: '#171717',
    borderRadius: 4,
    padding: '12px 16px',
    border: '1px solid #1F1F1F',
  },
  threadTitle: {
    fontFamily: mono,
    fontSize: 12,
    color: '#E5E5E5',
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
    background: '#171717',
    borderRadius: 4,
    padding: 24,
    border: '1px solid #1F1F1F',
  },
  personCardTop: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  personCardName: {
    fontFamily: mono,
    fontSize: 16,
    fontWeight: 500,
    color: '#E5E5E5',
  },
  personCardGithub: {
    fontFamily: mono,
    fontSize: 12,
    color: '#525252',
  },
  personCardRole: {
    fontFamily: mono,
    fontSize: 12,
    color: '#22C55E',
  },
  personCardStats: {
    display: 'flex',
    gap: 20,
  },
  personCardStat: {
    fontFamily: mono,
    fontSize: 11,
    color: '#737373',
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
    border: '1px dashed #525252',
    borderRadius: 4,
    padding: 24,
    cursor: 'pointer',
    minHeight: 180,
  },
  inviteIcon: {
    fontFamily: mono,
    fontSize: 24,
    color: '#22C55E',
  },
  inviteText: {
    fontFamily: mono,
    fontSize: 12,
    color: '#22C55E',
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
    background: '#1F1F1F',
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
    borderRadius: 4,
    border: '1px solid #1F1F1F',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    fontFamily: mono,
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
    color: '#525252',
  },
  knowledgeTitle: {
    fontFamily: mono,
    fontSize: 14,
    fontWeight: 500,
    color: '#E5E5E5',
  },
  knowledgeDesc: {
    fontFamily: mono,
    fontSize: 12,
    color: '#737373',
    lineHeight: 1.5,
  },
  knowledgeMeta: {
    display: 'flex',
    gap: 12,
  },
  knowledgeAuthor: {
    fontFamily: mono,
    fontSize: 11,
    color: '#737373',
  },
  knowledgeQuest: {
    fontFamily: mono,
    fontSize: 11,
    color: '#525252',
  },

  // Thread panel
  threadPanel: {
    width: 320,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    padding: '20px 22px',
    background: '#171717',
    borderRadius: 4,
    border: '1px solid #1F1F1F',
    flexShrink: 0,
    overflow: 'auto',
  },
  threadPanelHeader: {
    fontFamily: mono,
    fontSize: 11,
    fontWeight: 500,
    color: '#737373',
  },
  threadPanelTitle: {
    fontFamily: mono,
    fontSize: 14,
    fontWeight: 500,
    color: '#E5E5E5',
  },
  threadPanelBody: {
    fontFamily: mono,
    fontSize: 12,
    color: '#A3A3A3',
    lineHeight: 1.6,
  },
  threadPanelLabel: {
    fontFamily: mono,
    fontSize: 10,
    fontWeight: 500,
    color: '#737373',
    marginTop: 8,
  },
  threadPanelSource: {
    fontFamily: mono,
    fontSize: 11,
    color: '#525252',
  },
  relatedItem: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    padding: '10px 12px',
    background: '#1A1A1A',
    borderRadius: 4,
    fontFamily: mono,
    fontSize: 10,
  },
  relatedText: {
    fontFamily: mono,
    fontSize: 12,
    color: '#A3A3A3',
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
    background: '#171717',
    borderRadius: 4,
    border: '1px solid #1F1F1F',
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
    fontFamily: mono,
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
    color: '#525252',
  },

  // Todos
  todoList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  todoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    padding: '16px 20px',
    background: '#171717',
    borderRadius: 4,
    border: '1px solid #1F1F1F',
  },
  todoHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
  },
  todoCheckbox: {
    fontFamily: mono,
    fontSize: 16,
    flexShrink: 0,
    marginTop: -1,
  },
  todoText: {
    fontFamily: mono,
    fontSize: 13,
    lineHeight: 1.5,
  },
  todoMeta: {
    display: 'flex',
    gap: 16,
    paddingLeft: 28,
  },
  todoMetaItem: {
    fontFamily: mono,
    fontSize: 11,
    color: '#525252',
  },

  // Handoffs
  handoffList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  handoffCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    padding: '20px 22px',
    background: '#171717',
    borderRadius: 4,
    border: '1px solid #1F1F1F',
  },
  handoffHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  handoffTopic: {
    fontFamily: mono,
    fontSize: 14,
    fontWeight: 500,
    color: '#E5E5E5',
  },
  handoffStatus: {
    fontFamily: mono,
    fontSize: 10,
    fontWeight: 500,
  },
  handoffSummary: {
    fontFamily: mono,
    fontSize: 12,
    color: '#A3A3A3',
    lineHeight: 1.5,
  },
  handoffMeta: {
    display: 'flex',
    gap: 20,
  },
  handoffMetaItem: {
    fontFamily: mono,
    fontSize: 11,
    color: '#525252',
  },

  // Activity / Sessions
  activityList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  sessionCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    padding: '18px 22px',
    background: '#171717',
    borderRadius: 4,
    border: '1px solid #1F1F1F',
  },
  sessionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  sessionBy: {
    fontFamily: mono,
    fontSize: 13,
    fontWeight: 500,
    color: '#E5E5E5',
  },
  sessionStatus: {
    fontFamily: mono,
    fontSize: 10,
    fontWeight: 500,
  },
  sessionTopic: {
    fontFamily: mono,
    fontSize: 13,
    color: '#A3A3A3',
  },
  sessionSummary: {
    fontFamily: mono,
    fontSize: 12,
    color: '#737373',
    lineHeight: 1.5,
  },
  sessionMeta: {
    display: 'flex',
    gap: 16,
  },
  sessionMetaItem: {
    fontFamily: mono,
    fontSize: 11,
    color: '#525252',
  },

  // Empty state
  emptyState: {
    fontFamily: mono,
    fontSize: 13,
    color: '#525252',
    padding: '40px 0',
    textAlign: 'center',
  },

  // Manage
  adminBadge: {
    fontFamily: mono,
    fontSize: 10,
    fontWeight: 500,
    color: '#22C55E',
    background: '#0C2A15',
    padding: '6px 12px',
    borderRadius: 4,
    border: '1px solid #14532D',
  },
  manageGrid: {
    display: 'flex',
    gap: 32,
    flex: 1,
    minHeight: 0,
  },
  manageLeftCol: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  manageCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    padding: '20px 22px',
    background: '#171717',
    borderRadius: 4,
    border: '1px solid #1F1F1F',
  },
  manageCardHeader: {
    fontFamily: mono,
    fontSize: 11,
    fontWeight: 500,
    color: '#737373',
  },
  manageRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  manageLabel: {
    fontFamily: mono,
    fontSize: 13,
    color: '#A3A3A3',
  },
  manageValue: {
    fontFamily: mono,
    fontSize: 13,
    fontWeight: 500,
    color: '#E5E5E5',
  },
  manageNote: {
    fontFamily: mono,
    fontSize: 11,
    color: '#525252',
  },
  copyBtn: {
    fontFamily: mono,
    fontSize: 10,
    fontWeight: 500,
    color: '#E5E5E5',
    background: '#252525',
    border: '1px solid #1F1F1F',
    borderRadius: 4,
    padding: '6px 14px',
    cursor: 'pointer',
  },
  dangerBtn: {
    fontFamily: mono,
    fontSize: 10,
    fontWeight: 500,
    color: '#EF4444',
    background: 'transparent',
    border: '1px solid #7F1D1D',
    borderRadius: 4,
    padding: '6px 14px',
    cursor: 'pointer',
  },
  membersPanel: {
    width: 480,
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    padding: '20px 22px',
    background: '#171717',
    borderRadius: 4,
    border: '1px solid #1F1F1F',
    flexShrink: 0,
  },
  membersTable: {
    display: 'flex',
    flexDirection: 'column',
  },
  membersHeaderRow: {
    display: 'flex',
    padding: '4px 0',
    borderBottom: '1px solid #1F1F1F',
  },
  membersHeaderCell: {
    fontFamily: mono,
    fontSize: 11,
    color: '#525252',
  },
  memberRow: {
    display: 'flex',
    padding: '10px 0',
    borderBottom: '1px solid #1F1F1F',
  },
  memberCell: {
    fontFamily: mono,
    fontSize: 13,
    color: '#A3A3A3',
  },
  inviteMemberBtn: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: 500,
    color: '#22C55E',
    background: '#0C2A15',
    border: '1px solid #14532D',
    borderRadius: 4,
    padding: '10px 0',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'center',
  },
}
