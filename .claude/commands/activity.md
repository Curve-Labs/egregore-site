Fast, personal view of what's happening — your projects, your sessions, team activity.

Topic: $ARGUMENTS

## Execution rules

**Neo4j-first.** All data comes from Neo4j. No filesystem access to sibling repos.
- 1 Bash call: git config user.name
- 4 Neo4j queries (run in parallel)
- File-based fallback only if Neo4j unavailable

## Step 1: Get current user

```bash
git config user.name
```

Map to Person node: "Oguzhan Yayla" → oz, "Cem Dagdelen" → cem, "Ali" → ali

## Step 2: Neo4j Queries (run all in parallel)

```cypher
// Query 1: My projects
MATCH (p:Person {name: $me})-[w:WORKS_ON]->(proj:Project)
RETURN proj.name AS project, proj.domain AS domain, w.role AS role

// Query 2: My recent sessions
MATCH (s:Session)-[:BY]->(p:Person {name: $me})
RETURN s.date AS date, s.topic AS topic, s.summary AS summary
ORDER BY s.date DESC LIMIT 5

// Query 3: Team activity (others, last 7 days)
MATCH (s:Session)-[:BY]->(p:Person)
WHERE p.name <> $me AND s.date >= date() - duration('P7D')
RETURN s.date AS date, s.topic AS topic, p.name AS by
ORDER BY s.date DESC LIMIT 5

// Query 4: Active quests
MATCH (q:Quest {status: 'active'})-[:RELATES_TO]->(proj:Project)
OPTIONAL MATCH (a:Artifact)-[:PART_OF]->(q)
RETURN q.id AS quest, q.title AS title, collect(DISTINCT proj.name) AS projects, count(a) AS artifacts
```

## Step 3: File-based fallback

If Neo4j unavailable, use memory/ symlink (doesn't trigger sibling permissions):

```bash
# Active quests
grep -l "status: active" memory/quests/*.md 2>/dev/null | xargs -I{} basename {} | grep -v template

# Recent artifacts
ls -t memory/artifacts/*.md 2>/dev/null | head -10 | xargs -I{} basename {}
```

## Output format

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  EGREGORE ACTIVITY                                            oz · Feb 01  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PROJECTS                                                                   │
│  ┌────────────────┬──────────┬────────────────────────────────┐             │
│  │ Project        │ Domain   │ Access                         │             │
│  ├────────────────┼──────────┼────────────────────────────────┤             │
│  │ curve-labs-core│ both     │ (here)                         │             │
│  │ tristero       │ polis    │ cd ../tristero && claude       │             │
│  │ lace           │ psyche   │ cd ../lace && claude           │             │
│  └────────────────┴──────────┴────────────────────────────────┘             │
│                                                                             │
│  YOUR RECENT SESSIONS                                                       │
│  ┌────────────┬─────────────────────────┬───────────────────────────────┐   │
│  │ Date       │ Topic                   │ Summary                       │   │
│  ├────────────┼─────────────────────────┼───────────────────────────────┤   │
│  │ 2026-01-31 │ NLNet grant submitted   │ €30k for open-source Egregore │   │
│  └────────────┴─────────────────────────┴───────────────────────────────┘   │
│                                                                             │
│  TEAM ACTIVITY (last 7 days)                                                │
│  ┌────────────┬─────────────────────────┬──────────┐                        │
│  │ Date       │ Topic                   │ By       │                        │
│  ├────────────┼─────────────────────────┼──────────┤                        │
│  │ 2026-01-30 │ Blog versions reviewed  │ cem      │                        │
│  │ 2026-01-27 │ Bot deployed to Railway │ ali      │                        │
│  └────────────┴─────────────────────────┴──────────┘                        │
│                                                                             │
│  ACTIVE QUESTS                                                              │
│  ┌──────────────────┬─────────────────────┬───────────┬───────────┐         │
│  │ Quest            │ Title               │ Projects  │ Artifacts │         │
│  ├──────────────────┼─────────────────────┼───────────┼───────────┤         │
│  │ nlnet-commons    │ NLNet grant app     │ egregore  │ 4         │         │
│  │ blog-launch      │ V2 blog content     │ egregore  │ 2         │         │
│  └──────────────────┴─────────────────────┴───────────┴───────────┘         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**If sections are empty**, show:
```
│  (none yet — use /quest new to create one)                                  │
```

## Rules

- **No sibling directory access** — all data from Neo4j or memory/ symlink
- Projects from Neo4j → show `cd ../[project] && claude`
- Minimize tool calls — run Neo4j queries in parallel
- File-based fallback only if Neo4j MCP unavailable
