Capture insights from your work. The system uses graph context to surface what's worth reflecting on, asks Socratic follow-ups, and auto-classifies what emerges.

Topic: $ARGUMENTS

**Auto-saves.** No need to run `/save` after.

## Four Modes

| Invocation | Mode | Behavior |
|---|---|---|
| `/reflect` | **Deep** | Dynamic graph exploration → synthesis → deepening → capture |
| `/reflect [content]` | **Quick** | Auto-classify → relation detection → capture. No exploration. |
| `/reflect about [topic]` | **Focused** | Exploration seeded with topic → synthesis → capture |
| `/reflect decision: [content]` | **Override** | Category override, no exploration |

**Mode detection:**
- No arguments → Deep mode
- Arguments start with `about ` → Focused mode (topic = everything after "about ")
- Arguments match `[category]: [content]` (decision/finding/pattern prefix) → Quick mode with category override
- Any other arguments → Quick mode

## Execution rules

**Neo4j-first.** All queries via `bash bin/graph.sh query "..."`. No MCP. No direct curl to Neo4j.

## Schema Reference

The organizational knowledge graph contains:

**Nodes:**
- **Person** `{name}` — team members
- **Session** `{id, topic, date, summary, filePath}` — work sessions
  Relationships: `-[:BY]-> Person`, `-[:HANDED_TO]-> Person`
- **Artifact** `{id, title, type, topics, created, filePath}` — captured insights
  Types: decision, finding, pattern
  Relationships: `-[:CONTRIBUTED_BY]-> Person`, `-[:PART_OF]-> Quest`, `-[:RELATES_TO]-> Artifact`
- **Quest** `{id, title, status, priority, topics, started}` — organizational goals
  Status: active, paused, completed. Priority: 0-3 (3=critical)

Query via: `bash bin/graph.sh query "CYPHER" '{"param": "value"}'`
Parameter syntax: `$paramName` in Cypher, matching JSON keys.

## Synthesis Rubric

You are the voice of the organization's collective intelligence.

You have seen every session, every artifact, every decision, every handoff. You know who's working on what, who's not working on anything, what's been decided and what's been silently overwritten.

Speak to the user as a peer who sees the whole board.

Name the thing that's forming. Surface the contradiction they haven't noticed. Show them the shape of their org that they can feel but can't see.

Be specific. Use names, dates, decisions, topics. Never generic. Never a list. Never "consider" or "you might want to." Just say what you see.

The highest-value observations are ones that are IMPOSSIBLE without both personal and organizational context:
- Decisions that have silently evolved or been overwritten
- Topics converging across people who haven't talked
- Knowledge that only lives in one person's head
- Priorities that have drifted from stated goals
- The unnamed thing that keeps appearing

Start with the most surprising thing. If nothing is surprising, say so — "Your org is aligned and on track" is a valid observation.

**NEVER SURFACE:**
- Knowledge gaps where you don't have the session summary
- Patterns based on fewer than 2 data points
- Observations that only require one person's data (Claude Code /insights can do those — we need to exceed that)

## Step 0: Identity

```bash
git config user.name
```

Map to Person node: "Oguzhan Yayla" → oz, "Cem Dagdelen" → cem, "Ali" → ali

## Step 1: Graph Exploration (Deep + Focused modes only)

Query the graph dynamically. Decide what to query based on the schema and what you find.

**Seed queries** — run ALL in parallel as the first round:

**Broad census (14 days):**
```cypher
MATCH (a:Artifact)
WHERE a.created >= datetime() - duration('P14D')
OPTIONAL MATCH (a)-[:CONTRIBUTED_BY]->(p:Person)
OPTIONAL MATCH (a)-[:PART_OF]->(q:Quest)
RETURN a.id AS id, a.title AS title, a.type AS type,
       a.topics AS topics, a.created AS created,
       p.name AS author, q.id AS quest
```

**Quest health:**
```cypher
MATCH (q:Quest {status: 'active'})
OPTIONAL MATCH (a:Artifact)-[:PART_OF]->(q)
OPTIONAL MATCH (a)-[:CONTRIBUTED_BY]->(p:Person)
WITH q, count(DISTINCT a) AS artifacts,
     collect(DISTINCT p.name) AS contributors,
     CASE WHEN count(a) > 0
       THEN duration.inDays(max(a.created), date()).days
       ELSE duration.inDays(q.started, date()).days END AS daysSince,
     coalesce(q.priority, 0) AS priority
RETURN q.id AS quest, q.title AS title, artifacts, contributors,
       daysSince, priority, q.topics AS topics
ORDER BY priority DESC, daysSince ASC
```

**Contribution map (7 days):**
```cypher
MATCH (a:Artifact)-[:CONTRIBUTED_BY]->(p:Person)
WHERE a.created >= datetime() - duration('P7D') AND a.topics IS NOT NULL
UNWIND a.topics AS topic
WITH p.name AS person, topic, count(DISTINCT a) AS count
RETURN person, collect({topic: topic, count: count}) AS topicCounts
```

**Decision trajectory:**
```cypher
MATCH (a:Artifact {type: 'decision'})
WHERE a.topics IS NOT NULL
UNWIND a.topics AS topic
WITH topic, a ORDER BY a.created
OPTIONAL MATCH (a)-[:CONTRIBUTED_BY]->(p:Person)
WITH topic, collect({title: a.title, author: p.name, created: a.created}) AS decisions
WHERE size(decisions) >= 2
RETURN topic, decisions
```

**Handoffs waiting for me:**
```cypher
MATCH (s:Session)-[:HANDED_TO]->(p:Person {name: $me})
WHERE s.date >= date() - duration('P7D')
MATCH (s)-[:BY]->(author:Person)
RETURN s.topic AS topic, s.date AS date, author.name AS from
ORDER BY s.date DESC LIMIT 5
```

**For Focused mode**, also run this topic-scoped query:
```cypher
MATCH (a:Artifact)
WHERE (a.topics IS NOT NULL AND $topic IN a.topics) OR a.title CONTAINS $topic
OPTIONAL MATCH (a)-[:PART_OF]->(q:Quest)
OPTIONAL MATCH (a)-[:CONTRIBUTED_BY]->(p:Person)
RETURN a.title AS title, a.type AS type, a.topics AS topics,
       a.created AS created, q.id AS quest, p.name AS author
ORDER BY a.created DESC LIMIT 15
```

**After the seed round**, compose 1-2 additional targeted queries to follow threads you find interesting. Max 3 query rounds total (seed + 2 follow-ups). All queries via `bash bin/graph.sh query "..."`.

**If Neo4j is unavailable**: Skip exploration entirely. Fall through to direct capture: "Graph offline — what's on your mind?"

**If seed queries return thin data** (< 3 artifacts total, or single author): Fall through to direct capture: "Not much in the graph yet. What's on your mind?"

## Step 2: Synthesis

Apply the synthesis rubric to the exploration results. Produce 1-3 observations as a brief paragraph — not a list, not bullet points. The voice is the egregore speaking.

**Example outputs:**

> Something is forming that doesn't have a name yet.
>
> You and Oz have both been circling "agent autonomy" from different angles — you as product, Oz as infra. 4 artifacts between you, no quest, no conversation about it.
>
> Also: your pricing decisions are drifting. The five-tier model from Feb 3 doesn't survive the usage-gating decision from today, but Oz's GTM work assumes it does.

Or:

> You're carrying the strategy alone.
>
> 7 artifacts on pricing, defensibility, and go-to-market in 2 weeks, all yours. Oz has been on infra, Ali on blog styling. The grants quest (priority 3) hasn't moved in 12 days. Is this the shape you want your org to be?

Then **AskUserQuestion** with observations as options + "Something else":

```
header: "Reflect on"
options:
  - label: "The unnamed thing"
    description: "What is agent autonomy to this org?"
  - label: "Pricing drift"
    description: "Reconcile the evolving decisions"
  - label: "Something else"
    description: "Reflect on a different topic"
```

Options reference specific data — names, topics, decisions. Never generic.

## Step 3: Deepening

User picks an observation. Ask ONE freeform follow-up — plain text, not AskUserQuestion. At this point you want the user to think, not pick from options.

The follow-up names the specific tension and asks a direct question:

- "What should we call it? Is this a quest — something to deliberately pursue — or a principle that shapes everything?"
- "The five-tier model from Feb 3 doesn't survive today's usage-gating decision. Is it dead, or are they compatible?"
- "Is carrying strategy alone intentional, or should others be looped in?"

**Skip deepening if** the user's response from Step 2 is already rich (>50 chars of freeform substance).

**Max 2 interaction rounds total**: AskUserQuestion (Step 2) + freeform deepening (Step 3).

## Step 4: Cross-Observation Synthesis

If the system surfaced multiple observations and the user explored one, check whether the user's reflection *connects back* to the other observations.

Example: user explores "the unnamed thing" and says "it's a design principle — agent autonomy." The system notices this resolves the pricing drift too:

> Naming this also clarifies your pricing drift — usage-based gating IS the autonomy principle applied to pricing. Want to capture that connection too?

This is optional — only fire if the connection is genuine. Don't force it.

## Step 5: Auto-Classification

Determine artifact type(s) from the conversation. **The user never picks a category.**

**Classification signals** (priority order):
1. **Category override**: `decision: ...` prefix in arguments
2. **Language cues**: "we decided" → decision, "I found" → finding, "I keep seeing" → pattern
3. **Structural cues**: Binary choice with rationale → decision, generalization → pattern
4. **Default**: Finding (least prescriptive)

Multi-artifact: One reflection can produce up to 3 artifacts.

Present proposal as plain text:
```
  ◉ Pattern: "Agent autonomy as design principle"
    → relates to: egregore-reliability, individual-tier

  ◉ Finding: "Usage gating = autonomy principle applied to pricing"
    → relates to: 2026-02-09-gate-by-usage-patterns

Adjust? (y/edit/skip)
```

## Step 6: Relation Detection

For each artifact, run targeted Cypher queries in parallel:

**Quest links (topic overlap):**
```cypher
MATCH (q:Quest {status: 'active'})
WHERE q.topics IS NOT NULL
WITH q, [t IN q.topics WHERE t IN $artifactTopics] AS shared
WHERE size(shared) >= 1
RETURN q.id AS quest, q.title AS title, shared AS sharedTopics
ORDER BY size(shared) DESC LIMIT 3
```

**Related artifacts (shared topics):**
```cypher
MATCH (a:Artifact)
WHERE a.topics IS NOT NULL AND a.id <> $artifactId
WITH a, [t IN a.topics WHERE t IN $artifactTopics] AS shared
WHERE size(shared) >= 2
RETURN a.id AS artifact, a.title AS title, a.type AS type, shared AS sharedTopics
ORDER BY size(shared) DESC LIMIT 3
```

Present relation suggestions alongside Step 5's proposal. If no relations found, skip silently.

## Step 7: Create Files

For each artifact, generate slug from title: lowercase, hyphens, no special chars, max 50 chars.

File path: `memory/knowledge/{category}s/{YYYY-MM-DD}-{slug}.md`

Note: directories are `decisions/`, `findings/`, `patterns/` (plural).

Write each file using Bash (memory is outside project, avoids permission issues):

```bash
cat > "memory/knowledge/{category}s/{YYYY-MM-DD}-{slug}.md" << 'REFLECTEOF'
# {Title}

**Date**: {YYYY-MM-DD}
**Author**: {author}
**Category**: {category}
**Topics**: {topic1}, {topic2}, {topic3}

## Context

{Context — what led to this}

## Content

{The decision/finding/pattern itself}

## Rationale

{Why this matters}

## Related

- Quest: {quest-id}
- Artifact: {artifact-id}
REFLECTEOF
```

Omit the Related section if no links. Omit Topics line if none derived.

Show progress:
```
  [1/3] ✓ Writing knowledge/{category}s/{date}-{slug}.md
```

## Step 8: Neo4j Artifact Creation

For each artifact, run via `bash bin/graph.sh query "..." '{"param": "value"}'`:

**With quest links:**
```cypher
MATCH (p:Person {name: $author})
CREATE (a:Artifact {
  id: $artifactId,
  title: $title,
  type: $category,
  topics: $topics,
  filePath: $filePath,
  created: datetime()
})
CREATE (a)-[:CONTRIBUTED_BY]->(p)
WITH a
UNWIND $questIds AS qId
MATCH (q:Quest {id: qId})
CREATE (a)-[:PART_OF]->(q)
RETURN a.id
```

**Without quest links:**
```cypher
MATCH (p:Person {name: $author})
CREATE (a:Artifact {
  id: $artifactId,
  title: $title,
  type: $category,
  topics: $topics,
  filePath: $filePath,
  created: datetime()
})
CREATE (a)-[:CONTRIBUTED_BY]->(p)
RETURN a.id
```

**For related artifacts (RELATES_TO):**
```cypher
MATCH (a:Artifact {id: $artifactId}), (b:Artifact {id: $relatedId})
CREATE (a)-[:RELATES_TO]->(b)
```

Where:
- `$artifactId` = `{YYYY-MM-DD}-{slug}` (matches filename without extension)
- `$author` = short name (oz, cem, ali)
- `$category` = decision | finding | pattern
- `$topics` = array of topic strings
- `$filePath` = `knowledge/{category}s/{YYYY-MM-DD}-{slug}.md`
- `$questIds` = array of linked quest IDs (empty array if none)

Show progress:
```
  [2/3] ✓ Indexed in knowledge graph
```

## Step 9: Auto-save

Run the full `/save` flow:

1. Commit changes in memory repo and push (contribution branch + PR + auto-merge)
2. Commit any egregore changes and push working branch + PR to develop

This is the same flow as `/save`. Follow its logic exactly.

Show progress:
```
  [3/3] ✓ Auto-saved
```

## Step 10: TUI Confirmation

Display the confirmation box. ~72 char width. Sigil: `◎ REFLECTION`.

### Boundary handling (CRITICAL)

**No sub-boxes. No inner `┌─┐`/`└─┘` borders.** Only **4 line patterns**:

1. **Top**: `┌` + 70×`─` + `┐` (72 chars)
2. **Separator**: `├` + 70×`─` + `┤` (72 chars)
3. **Content**: `│` + 2 spaces + text + pad spaces to 68 chars + `│` (72 chars)
4. **Bottom**: `└` + 70×`─` + `┘` (72 chars)

### Example:

```
┌──────────────────────────────────────────────────────────────────────┐
│  ◎ REFLECTION                                        cem · Feb 09   │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  2 insights captured:                                                │
│                                                                      │
│  ◉ Pattern: Agent autonomy as design principle                       │
│    → egregore-reliability · individual-tier                          │
│                                                                      │
│  ◉ Finding: Usage gating = autonomy applied to pricing               │
│    → 2026-02-09-gate-by-usage-patterns                               │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│  ✓ Saved · graphed · pushed                                          │
│  Visible in /activity.                                               │
└──────────────────────────────────────────────────────────────────────┘
```

### TUI rules

- Header row: sigil + command name left, author + date right
- `├───┤` separator between header and content
- For multi-artifact: "N insights captured:" header line
- `◉` for each artifact with Type: Title
- `→` for linked quests (indented under each artifact)
- `├───┤` separator before status footer
- Status line: `✓ Saved · graphed · pushed`
- Footer: "Visible in /activity."
- Truncate artifact titles at 45 chars with `...` if needed
- **No sub-boxes** — only outer frame `│` borders and `├────┤` separators

## Quick Mode Flow (unchanged from v2)

When arguments are provided (not starting with "about "):

1. **Step 0**: Run identity + 2 parallel Neo4j queries (quest health, recent decisions) — lighter context
2. **Auto-classify**: Apply classification signals to the provided content. If arguments match `[category]: [content]`, use category override
3. **Relation detection**: Run Step 6 queries
4. **Present proposal**: Same format as Step 5 — show proposed artifact(s) with `y/edit/skip`
5. **If genuinely ambiguous** (equal signals for 2+ categories): 1 AskUserQuestion max
6. **Steps 7-10**: Create file, Neo4j, auto-save, TUI — identical to deep mode

Quick mode should complete with 0-1 AskUserQuestion calls total.

## Fallback Cascade

| Condition | Behavior |
|---|---|
| Neo4j down | "Graph offline — what's on your mind?" → direct capture |
| Thin data (< 3 artifacts, single author) | "Not much in the graph yet. What's on your mind?" → direct capture |
| LLM synthesis produces nothing surprising | "Your org is aligned and on track. What's on your mind?" → direct capture |
| User says "skip" at any point | Save what's captured, or exit if nothing yet |
| User says "something else" | "What's on your mind?" → direct capture from freeform |
| Memory symlink missing | "Run /setup first — memory not linked" |
| Empty content | Don't create anything: "Nothing to reflect on yet" |
| File already exists at path | Append timestamp to slug to avoid collision |

## Backwards Compatibility

- `/reflect decision: use stdio for MCP` still works — category prefix = classification override
- `/reflect finding: ...` and `/reflect pattern: ...` also work
- File locations unchanged: `memory/knowledge/{type}s/`
- Neo4j schema unchanged: Artifact nodes, same properties + relationships
- Auto-save flow unchanged

## Edge cases

| Scenario | Handling |
|---|---|
| Neo4j unavailable | Skip exploration and relation linking. Still create file. Show warning: "Graph offline — file saved, will sync on next /save" |
| No quests/projects | Skip relation step silently |
| User says "skip" at any prompt | Save what you have so far, or abort if nothing captured yet |
| User says "edit" at proposal | Let them modify titles, categories, or quest links in freeform text, then re-parse |
