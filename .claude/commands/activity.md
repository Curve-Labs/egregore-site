Fast, personal view of what's happening — your projects, your sessions, team activity.

Topic: $ARGUMENTS

## What to do

1. **Smart sync** — fetch all repos, pull only if behind (fast)
2. **Get current user** from git config, map to Person node (oz, cem, ali)
3. **Query Neo4j** for personal + team activity (4 fast queries)
4. **Display table visualization**

## Smart sync (before queries)

Use `git -C` to avoid `cd &&` chains (which don't match `Bash(git:*)` permission):

```bash
# For each repo path:
git -C /path/to/repo fetch origin --quiet
git -C /path/to/repo rev-parse HEAD           # LOCAL
git -C /path/to/repo rev-parse origin/main    # REMOTE
# if different: git -C /path/to/repo pull origin main --quiet
```

**IMPORTANT:** Never use `cd /path && git ...` — this starts with `cd` and triggers permission prompts. Always use `git -C /path ...` which starts with `git` and matches `Bash(git:*)`.

## Neo4j Queries

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

## Output format

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  EGREGORE ACTIVITY                                            oz · Jan 26  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  YOUR PROJECTS                                                              │
│  ┌────────────────┬──────────┬──────────┐                                   │
│  │ Project        │ Domain   │ Role     │                                   │
│  ├────────────────┼──────────┼──────────┤                                   │
│  │ infrastructure │ both     │ lead     │                                   │
│  │ tristero       │ polis    │ —        │                                   │
│  │ lace           │ psyche   │ —        │                                   │
│  └────────────────┴──────────┴──────────┘                                   │
│                                                                             │
│  YOUR RECENT SESSIONS                                                       │
│  ┌────────────┬─────────────────────────┬───────────────────────────────┐   │
│  │ Date       │ Topic                   │ Summary                       │   │
│  ├────────────┼─────────────────────────┼───────────────────────────────┤   │
│  │ 2026-01-26 │ Neo4j ontology complete │ Schema, seed data, commands   │   │
│  └────────────┴─────────────────────────┴───────────────────────────────┘   │
│                                                                             │
│  TEAM ACTIVITY (last 7 days)                                                │
│  ┌────────────┬─────────────────────────┬──────────┐                        │
│  │ Date       │ Topic                   │ By       │                        │
│  ├────────────┼─────────────────────────┼──────────┤                        │
│  │ 2026-01-26 │ Telegram bot fix        │ ali      │                        │
│  │ 2026-01-26 │ Evaluation benchmarks   │ cem      │                        │
│  └────────────┴─────────────────────────┴──────────┘                        │
│                                                                             │
│  ACTIVE QUESTS                                                              │
│  ┌──────────────────┬─────────────────────┬───────────┬───────────┐         │
│  │ Quest            │ Title               │ Projects  │ Artifacts │         │
│  ├──────────────────┼─────────────────────┼───────────┼───────────┤         │
│  │ benchmark-eval   │ Evaluation metrics  │ tristero  │ 4         │         │
│  └──────────────────┴─────────────────────┴───────────┴───────────┘         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**If sections are empty**, show placeholder:
```
│  ACTIVE QUESTS                                                              │
│  (none yet — use /quest new to create one)                                  │
```

## Notes

- Check for sibling project folders (../tristero, ../lace) and show if they exist
- Do NOT suggest "/setup" for projects that are already cloned — instead tell user to "cd ../[project] && claude"
- Show active quests from memory/quests/ (read frontmatter for status: active)
- Show recent artifacts from memory/artifacts/ (last 7 days)
