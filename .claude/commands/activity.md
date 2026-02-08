Activity dashboard. Display it immediately — no preamble, no narration.

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

## Layout

**Full-width, single-column, stacked sections. No column split.** ~72 chars outer width.

Number action items sequentially across sections. Then output the box — nothing before it, nothing between data and box.

```
┌────────────────────────────────────────────────────────────────────────┐
│  {ORG} EGREGORE ✦ ACTIVITY DASHBOARD                   {me} · Feb 08  │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ● ACTION ITEMS                                                        │
│  [1] 2 questions from oz about "MCP transport" (3h ago)                │
│  [2] ⇌ Handoff from ali: blog styling (yesterday)                     │
│                                                                        │
│  ✓ ANSWERS RECEIVED                                                    │
│  [3] oz answered "evaluation criteria"                                 │
│                                                                        │
│  ◦ YOUR SESSIONS                                                       │
│  Feb 08  Slash command rewrites                                        │
│  Feb 08  TUI design system + new commands landed                       │
│  Feb 05  Form factor research                                          │
│                                                                        │
│  ◦ TEAM                                                                │
│  Feb 07  oz: Infra fix after egregore-core sync                        │
│  Feb 07  ali: Main Page Styling & Animation                            │
│  Feb 06  pali: Quest system exploration                                │
│                                                                        │
│  ⚑ QUESTS (15 active)                                                  │
│  game-engine-multiagent          3 artifacts                           │
│  evaluation-benchmarks           2 artifacts                           │
│  egregore-reliability            2 artifacts                           │
│  grants                          2 artifacts                           │
│  nlnet-commons-fund              2 artifacts                           │
│                                                                        │
│  → OPEN PRs                                                            │
│  #18  Add MCP config (cem)                                             │
│  #17  Save command improvements (oz)                                   │
│                                                                        │
│  Type a number to act, or keep working.                                │
└────────────────────────────────────────────────────────────────────────┘
```

## Section rules

Empty sections are omitted entirely — no headers, no placeholders.

| Section | When | Format |
|---------|------|--------|
| ● ACTION ITEMS | Pending questions or handoffs exist | `[N] description (time_ago)` |
| ✓ ANSWERS RECEIVED | Answered question sets exist | `[N] name answered "topic"` |
| ◦ YOUR SESSIONS | Always (limit 5) | `Mon DD  Topic text` |
| ◦ TEAM | Always (limit 5, 7 days) | `Mon DD  name: Topic text` |
| ⚑ QUESTS (N active) | Quests exist | Top 5 by artifacts. `quest-id` left, `N artifacts` right |
| → OPEN PRs | PRs exist | `#NN  Title (author)` |
| Footer | Numbered items exist | `Type a number to act, or keep working.` |

**Time ago**: <1h `Nm ago`, 1-23h `Nh ago`, 1d `yesterday`, 2-6d `Nd ago`, 7d+ `Mon DD`

## Interactive follow-up

If numbered items exist, use AskUserQuestion after the box. One option per item plus "Skip — just looking".

- Pending questions → load QuestionSet, start /ask answer flow
- Handoff → read s.filePath and display
- Answered questions → load and display answers

Zero numbered items → no AskUserQuestion.

## Argument filtering

- `/activity quests` — show all quests with full artifact counts
- `/activity @name` — show only that person's sessions (replace $me in Q1/Q2, skip action items)

## Fallback

If Neo4j fails, use `memory/` files. Add `(offline)` to header. No action items in fallback.

## Rules

- No sibling directory access — Neo4j or memory/ only
- `bash bin/graph.sh query "..."` for Neo4j — never MCP
- `gh pr list --base develop --state open --json number,title,author` for PRs
- Org name from `jq -r '.org_name' egregore.json` — truncate at 20 chars
- Run all queries in parallel
- `Mon DD` date format everywhere
