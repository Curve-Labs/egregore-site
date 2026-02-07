Interactive activity dashboard — your action items, sessions, team, quests, PRs.

Topic: $ARGUMENTS

**Auto-syncs.** Pulls latest if behind before showing activity. Numbered action items let the user act immediately.

## Execution rules

**Neo4j-first.** All data comes from Neo4j via `bin/graph.sh`. No MCP. No filesystem access to sibling repos.
- Smart sync: fetch, pull only if behind (runs in parallel with queries)
- 1 Bash call: git config user.name
- 7 Neo4j queries via `bash bin/graph.sh query "..."` (run in parallel)
- PRs via `gh pr list`
- File-based fallback only if Neo4j unavailable

## Step 0: Smart sync (parallel with Step 2)

```bash
# Fetch and sync develop
git fetch origin --quiet
CURRENT=$(git branch --show-current)
git checkout develop --quiet && git pull origin develop --quiet && git checkout "$CURRENT" --quiet 2>/dev/null
# If on dev/* branch, rebase onto develop
if [[ "$CURRENT" == dev/* ]]; then
  git rebase develop --quiet 2>/dev/null || (git rebase --abort 2>/dev/null && git merge develop -m "Sync with develop" --quiet 2>/dev/null)
fi

# Memory
git -C memory fetch origin main --quiet 2>/dev/null
LOCAL=$(git -C memory rev-parse HEAD 2>/dev/null)
REMOTE=$(git -C memory rev-parse origin/main 2>/dev/null)
if [ "$LOCAL" != "$REMOTE" ]; then
  git -C memory pull origin main --quiet
fi

# Open PRs to develop
gh pr list --base develop --state open --json number,title,author 2>/dev/null
```

Run this in parallel with Neo4j queries. Don't wait for it unless Neo4j fails.

## Step 1: Get current user

```bash
git config user.name
```

Map to Person node short name: "Oguzhan Yayla" -> oz, "Cem Dagdelen" -> cem, "Ali" -> ali, etc.

Also get org name and today's date:
```bash
jq -r '.org_name' egregore.json
```
Truncate org name at 20 chars if longer.

## Step 2: Neo4j Queries (run all in parallel via bin/graph.sh)

Execute each query with `bash bin/graph.sh query "..."`. Run all 7 in parallel Bash calls.

```cypher
// Query 1: My recent sessions (limit 3)
MATCH (s:Session)-[:BY]->(p:Person {name: $me})
RETURN s.date AS date, s.topic AS topic
ORDER BY s.date DESC LIMIT 3

// Query 2: Team activity (others, last 7 days, limit 3)
MATCH (s:Session)-[:BY]->(p:Person)
WHERE p.name <> $me AND s.date >= date() - duration('P7D')
RETURN s.date AS date, s.topic AS topic, p.name AS by
ORDER BY s.date DESC LIMIT 3

// Query 3: Active quests with artifact counts
MATCH (q:Quest {status: 'active'})
OPTIONAL MATCH (a:Artifact)-[:PART_OF]->(q)
RETURN q.id AS quest, count(a) AS artifacts

// Query 4: Pending questions for me
MATCH (qs:QuestionSet {status: 'pending'})-[:ASKED_TO]->(p:Person {name: $me})
MATCH (qs)-[:ASKED_BY]->(asker:Person)
RETURN qs.id AS setId, qs.topic AS topic, qs.created AS created, asker.name AS from
ORDER BY qs.created DESC

// Query 5: My answered questions (last 7 days)
MATCH (qs:QuestionSet {status: 'answered'})-[:ASKED_BY]->(p:Person {name: $me})
MATCH (qs)-[:ASKED_TO]->(target:Person)
WHERE qs.created >= datetime() - duration('P7D')
RETURN qs.id AS setId, qs.topic AS topic, target.name AS answeredBy
ORDER BY qs.created DESC

// Query 6: Directed handoffs to me (last 7 days)
MATCH (s:Session)-[:HANDED_TO]->(p:Person {name: $me})
WHERE s.date >= date() - duration('P7D')
MATCH (s)-[:BY]->(author:Person)
RETURN s.topic, s.date, author.name, s.filePath
ORDER BY s.date DESC LIMIT 3
```

## Step 3: Argument filtering

If `$ARGUMENTS` is set, filter the output:

- `/activity quests` — expand quests section with more detail (show title, related projects, full artifact list)
- `/activity @{name}` — filter to that person's sessions and contributions only (replace $me with the target name in queries 1 and 2, skip questions/handoffs sections)

If no arguments, show the full dashboard.

## Step 4: File-based fallback

If Neo4j unavailable, use memory/ symlink:

```bash
# Active quests
grep -l "status: active" memory/quests/*.md 2>/dev/null | xargs -I{} basename {} | grep -v template

# Recent conversations (for session list)
ls -t memory/conversations/**/*.md 2>/dev/null | head -6
```

In fallback mode, show a simpler single-column layout without action items or answers sections. Note at the top: `(offline mode — Neo4j unavailable)`

## Step 5: Build and display TUI

Assemble all numbered action items first. The numbering is sequential across sections:
- Pending questions for me: each gets a number, format `[N] K questions from {name} about "{topic}" ({time_ago})`
- Directed handoffs to me: each gets a number, format `[N] ⇌ Handoff from {name}: {topic} ({time_ago})`
- Answered questions: each gets a number, format `[N] {name} answered "{topic}"`

Track each numbered item's type and metadata for the interactive step.

### Output format

Full dashboard with all sections populated:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  {ORG_NAME} EGREGORE ✦ ACTIVITY DASHBOARD                    {me} · {date} │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ● ACTION ITEMS                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ [1] 2 questions from oz about "MCP transport" (3h ago)                 │  │
│  │ [2] ⇌ Handoff from ali: blog styling (yesterday)                      │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ✓ ANSWERS RECEIVED                                                          │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ [3] oz answered "evaluation criteria"                                  │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
├─────────────────────────────────┬────────────────────────────────────────────┤
│  ◦ YOUR SESSIONS                │  ◦ TEAM                                    │
│                                 │                                            │
│  Feb 07  Defensibility analysis │  Feb 07  oz: Infra fix + sync              │
│  Feb 07  Develop workflow       │  Feb 07  ali: Main page style              │
│  Feb 05  Form factor research   │  Feb 06  pali: Animation                   │
│                                 │                                            │
├─────────────────────────────────┼────────────────────────────────────────────┤
│  ⚑ ACTIVE QUESTS                │  → OPEN PRs                                │
│                                 │                                            │
│  benchmark-eval    3 artifacts  │  #18  .neo4j-creds (cem)                   │
│  research-agent    1 artifact   │  #17  Save command (oz)                    │
│                                 │                                            │
├─────────────────────────────────┴────────────────────────────────────────────┤
│                                                                              │
│  Type a number to act, or keep working.                                      │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Layout rules

**Header**: `{ORG_NAME} EGREGORE ✦ ACTIVITY DASHBOARD` left-aligned, `{me} · {Mon DD}` right-aligned. Org name from egregore.json, truncated at 20 chars. User short name and current date.

**Full-width sections** (top, before column split):
- `● ACTION ITEMS` — pending questions + directed handoffs, each numbered `[N]`. Only show if there are action items.
- `✓ ANSWERS RECEIVED` — answered question sets, each numbered `[N]` continuing from action items numbering. Only show if there are answers.
- If no action items AND no answers: skip both sections, go straight to column split after the header separator.

**Column split** — `├───┬───┤` starts columns:
- Left column: user's stuff (sessions, quests)
- Right column: team/org stuff (team sessions, PRs)

**Column rows**:
- Row 1: `◦ YOUR SESSIONS` (left) | `◦ TEAM` (right)
- Row 2: `⚑ ACTIVE QUESTS` (left) | `→ OPEN PRs` (right) — separated by `├───┼───┤`

**Column close** — `├───┴───┤` merges back to full-width for footer.

**Footer**: `Type a number to act, or keep working.` — only if there are numbered items. If no numbered items, omit the footer line entirely and close with `└───┘` directly after the columns.

### Width

~78 characters total outer width. Column split roughly at position 35 (left column ~33 inner chars, right column ~42 inner chars). Adjust to fit content naturally but keep consistent.

### Session lines (compact)

```
Feb DD  Topic text here
```

Date in `Mon DD` format (3-letter month, space, 2-digit day). Two spaces gap. Topic text. Truncate topics > 35 chars with `...`.

### Team session lines

```
Feb DD  oz: Topic text here
```

Same format but with `name:` prefix before topic.

### Quest lines

```
quest-id         N artifacts
```

Quest ID left-aligned, artifact count right-aligned within the column. Singular "artifact" when count is 1.

### PR lines

```
#NN  Title (author)
```

PR number, title truncated if needed, author login in parens.

### Time ago formatting

For action items, show relative time:
- < 1 hour: `Nm ago`
- 1-23 hours: `Nh ago`
- 1 day: `yesterday`
- 2-6 days: `Nd ago`
- 7+ days: `Mon DD`

## Step 6: Interactive numbered items

After displaying the TUI, if there are any numbered items, present an interactive choice.

Dynamically build the options based on what items exist:

For each numbered item, create an option string:
- Pending questions: `"[N] Answer {name}'s questions"` — triggers `/ask` flow for that QuestionSet
- Directed handoffs: `"[N] Read {name}'s handoff"` — reads the handoff file at `s.filePath`
- Answered questions: `"[N] See {name}'s answers"` — loads and displays the answered QuestionSet

Always include a final option: `"Skip — just looking"`

**On selection:**
- Pending questions item: Load the QuestionSet by ID and initiate the `/ask` answer flow
- Handoff item: Read the file at `s.filePath` from memory and display it
- Answered questions item: Load the QuestionSet by ID and display the answers
- Skip: End the command, return to normal conversation

If there are zero numbered items, skip this step entirely — no AskUserQuestion.

## Section visibility summary

| Section | When shown |
|---------|-----------|
| ● ACTION ITEMS | Only if pending questions or directed handoffs exist |
| ✓ ANSWERS RECEIVED | Only if answered question sets exist |
| ◦ YOUR SESSIONS | Always (limit 3) |
| ◦ TEAM | Always (limit 3, last 7 days) |
| ⚑ ACTIVE QUESTS | Only if non-empty |
| → OPEN PRs | Only if non-empty |
| Footer with "Type a number..." | Only if any numbered items exist |

If a column section is empty (e.g., no quests AND no PRs), omit that row entirely — don't show an empty row. If both quests and PRs are empty, the column layout has only the sessions/team row.

## Rules

- **No sibling directory access** — all data from Neo4j or memory/ symlink
- **Use `bash bin/graph.sh query "..."` for all Neo4j queries** — never use MCP
- **PRs via `gh pr list --base develop --state open --json number,title,author`**
- **Org name from `jq -r '.org_name' egregore.json`** — truncate at 20 chars
- Minimize tool calls — run Neo4j queries in parallel, sync in parallel
- File-based fallback only if `bin/graph.sh` fails
- All box lines must have valid left and right borders
- Never show empty section headers — omit the entire section
- Truncate topics > 35 chars with `...` in column layouts
- Use `Mon DD` date format everywhere (e.g., `Feb 08`)
