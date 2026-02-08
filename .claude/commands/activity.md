Activity dashboard. Display it immediately — no preamble, no narration. Output the box and nothing else.

Topic: $ARGUMENTS

## Data collection

Run ALL of these in parallel (one Bash call each):

**Call 1 — sync + user + org + PRs:**
```bash
git fetch origin --quiet 2>/dev/null
CURRENT=$(git branch --show-current)
git checkout develop --quiet 2>/dev/null && git pull origin develop --quiet 2>/dev/null && git checkout "$CURRENT" --quiet 2>/dev/null
[[ "$CURRENT" == dev/* ]] && (git rebase develop --quiet 2>/dev/null || git rebase --abort 2>/dev/null)
git -C memory fetch origin main --quiet 2>/dev/null
LOCAL=$(git -C memory rev-parse HEAD 2>/dev/null); REMOTE=$(git -C memory rev-parse origin/main 2>/dev/null)
[ "$LOCAL" != "$REMOTE" ] && git -C memory pull origin main --quiet 2>/dev/null
echo "---USER---"; git config user.name
echo "---ORG---"; jq -r '.org_name' egregore.json
echo "---PRS---"; gh pr list --base develop --state open --json number,title,author 2>/dev/null || echo "[]"
```

Map git username → short name: "Oguzhan Yayla" → oz, "Cem Dagdelen" → cem, "Cem F" → cem, "Ali" → ali, etc.

**Calls 2–7 — Neo4j queries via `bash bin/graph.sh query "..."`:**

Q1 — My sessions:
```
MATCH (s:Session)-[:BY]->(p:Person {name: '$me'}) RETURN s.date AS date, s.topic AS topic ORDER BY s.date DESC LIMIT 5
```

Q2 — Team (7 days):
```
MATCH (s:Session)-[:BY]->(p:Person) WHERE p.name <> '$me' AND s.date >= date() - duration('P7D') RETURN s.date AS date, s.topic AS topic, p.name AS by ORDER BY s.date DESC LIMIT 5
```

Q3 — Active quests:
```
MATCH (q:Quest {status: 'active'}) OPTIONAL MATCH (a:Artifact)-[:PART_OF]->(q) RETURN q.id AS quest, count(a) AS artifacts ORDER BY count(a) DESC
```

Q4 — Pending questions for me:
```
MATCH (qs:QuestionSet {status: 'pending'})-[:ASKED_TO]->(p:Person {name: '$me'}) MATCH (qs)-[:ASKED_BY]->(asker:Person) RETURN qs.id AS setId, qs.topic AS topic, qs.created AS created, asker.name AS from ORDER BY qs.created DESC
```

Q5 — Answered questions (7 days):
```
MATCH (qs:QuestionSet {status: 'answered'})-[:ASKED_BY]->(p:Person {name: '$me'}) MATCH (qs)-[:ASKED_TO]->(target:Person) WHERE qs.created >= datetime() - duration('P7D') RETURN qs.id AS setId, qs.topic AS topic, target.name AS answeredBy ORDER BY qs.created DESC
```

Q6 — Handoffs to me (7 days):
```
MATCH (s:Session)-[:HANDED_TO]->(p:Person {name: '$me'}) WHERE s.date >= date() - duration('P7D') MATCH (s)-[:BY]->(author:Person) RETURN s.topic, s.date, author.name, s.filePath ORDER BY s.date DESC LIMIT 3
```

## Box dimensions (CRITICAL)

Outer frame: exactly **72** characters wide.
- Top/bottom: `┌` + 70× `─` + `┐` = 72
- Content: `│` + 70 chars (pad with spaces) + `│` = 72
- Separator: `├` + 70× `─` + `┤` = 72

Sub-boxes: exactly **66** characters wide, indented 2 spaces from outer content edge.
- Top/bottom: `│  ┌` + 64× `─` + `┐  │` = 72
- Content: `│  │` + 1 space + 63 chars text (pad with spaces) + `│  │` = 72

**Every single line must be exactly 72 characters.** Pad short content with trailing spaces before the right border. This is the most important rendering rule.

## Layout

After fetching data, output the box directly — nothing before it. The box structure is:

1. **Header** — org name + dashboard title left, user + date right
2. **Insight** — 1-2 lines synthesized from the data: what's the org focused on, what themes are converging, what needs attention. Written by you as Egregore — warm, concise, connective. Not a template.
3. **● ACTION ITEMS** — numbered. Combines: pending questions (Q4), directed handoffs (Q6), answered questions (Q5). This is the inbox. Only show if items exist.
4. **◦ YOUR SESSIONS** — always show (limit 5)
5. **◦ TEAM** — always show (limit 5, 7 days)
6. **⚑ QUESTS (N active)** — top 5 by artifacts. Only if quests exist.
7. **→ OPEN PRs** — only if PRs exist
8. **Footer** — command hints + numbered item prompt if applicable

Example with all sections:

```
┌────────────────────────────────────────────────────────────────────────┐
│  CURVE LABS EGREGORE ✦ ACTIVITY DASHBOARD              cem · Feb 08   │
├────────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Launch prep is converging — blog styling, command UX, and           │
│  defensibility all moved forward. Game engine quest leads.           │
│                                                                      │
│  ● ACTION ITEMS                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ [1] ⇌ Handoff from oz: Infra fix (yesterday)                 │  │
│  │ [2] 2 questions from ali about "blog layout" (3h ago)         │  │
│  │ [3] oz answered "evaluation criteria"                         │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ◦ YOUR SESSIONS                                                     │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ Today      Slash command rewrites                              │  │
│  │ Today      TUI design system + new commands landed             │  │
│  │ Yesterday  Defensibility Architecture                          │  │
│  │ Feb 05     Form factor research                                │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ◦ TEAM                                                              │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ Yesterday  ali: Main Page Styling & Animation                  │  │
│  │ Yesterday  oz: Develop branch workflow                         │  │
│  │ Feb 06     pali: Main page animation handoff                   │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ⚑ QUESTS (15 active)                                                │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ game-engine-multiagent        3 artifacts                      │  │
│  │ evaluation-benchmarks         2 artifacts                      │  │
│  │ grants                        2 artifacts                      │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  → OPEN PRs                                                          │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ #18  Add MCP config (cem)                                      │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  /reflect · /quest · /ask                                            │
│  Type a number to act, or keep working.                              │
└────────────────────────────────────────────────────────────────────────┘
```

## Section rules

Empty sections are omitted entirely — no headers, no sub-boxes.

| Section | When | Notes |
|---------|------|-------|
| Insight | Always | 1-2 lines. Synthesize themes from sessions + team + quests. |
| ● ACTION ITEMS | Handoffs, questions, or answers exist | Single numbered list combining all three types. Handoffs first, then pending questions, then answers. |
| ◦ YOUR SESSIONS | Always (limit 5) | Format: `{date}  Topic` |
| ◦ TEAM | Always (limit 5, 7 days) | Format: `{date}  name: Topic` |
| ⚑ QUESTS (N active) | Quests exist | Top 5 by artifact count |
| → OPEN PRs | PRs exist | Format: `#NN  Title (author)` |
| Footer commands | Always | `/reflect · /quest · /ask` |
| Footer prompt | Numbered items exist | `Type a number to act, or keep working.` |

## Action item formats

- Handoff: `[N] ⇌ Handoff from {name}: {topic} ({time_ago})`
- Pending questions: `[N] {count} questions from {name} about "{topic}" ({time_ago})`
- Answered: `[N] ✓ {name} answered "{topic}"`

## Date formatting

- Today's date → `Today    ` (padded to 9 chars)
- Yesterday → `Yesterday`
- Older → `Mon DD   ` (padded to 9 chars)

2-space gap after date before topic text.

## Time ago (action items only)

<1h `Nm ago`, 1-23h `Nh ago`, 1d `yesterday`, 2-6d `Nd ago`, 7d+ `Mon DD`

## Interactive follow-up

If numbered items exist, use AskUserQuestion after the box. One option per numbered item plus "Skip — just looking".

- Handoff → read s.filePath and display
- Pending questions → load QuestionSet, start /ask answer flow
- Answered questions → load QuestionSet and display answers

Zero numbered items → no AskUserQuestion.

## Argument filtering

- `/activity quests` — show all quests with full artifact counts
- `/activity @name` — filter to that person's sessions (replace $me in Q1/Q2, skip action items)

## Fallback

If Neo4j fails, use `memory/` files. Add `(offline)` after ✦ in header. No action items.

## Rules

- No sibling directory access — Neo4j or memory/ only
- `bash bin/graph.sh query "..."` for Neo4j — never MCP
- `gh pr list --base develop --state open --json number,title,author` for PRs
- Org name from `jq -r '.org_name' egregore.json` — truncate at 20 chars
- Run all queries in parallel
- **Pad every line to exactly 72 chars** — this prevents broken right borders
