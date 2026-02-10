---
title: Core Concepts
description: Understanding memory, handoffs, quests, and the knowledge graph
---

Egregore is built on a few core concepts that work together to create persistent, shared intelligence.

## Memory

Memory is the foundation of Egregore. It's a Git repository that stores everything the team learns.

### Structure

```
memory/
├── people/          # Team member profiles
├── handoffs/        # Session handoffs by month
├── knowledge/
│   ├── decisions/   # Documented decisions
│   └── patterns/    # Named patterns
└── quests/          # Quest definitions
```

### How It Works

- Memory syncs automatically at session start
- Changes are committed and pushed with `/save` or `/handoff`
- The entire history is searchable and versioned

## Handoffs

Handoffs are structured session endings that capture context for the next person.

### What's Captured

- **Summary** — What you accomplished
- **Decisions** — Choices you made and why
- **Open Threads** — Unfinished work or blockers
- **Next Steps** — What should happen next
- **Entry Points** — Files and commands to start from

### The Handoff Flow

1. Run `/handoff` when ending a session
2. Claude helps you structure the handoff
3. File is saved to `memory/handoffs/`
4. Session is logged to the knowledge graph
5. Team is notified (if configured)

## Quests

Quests are open-ended explorations that span multiple sessions and people.

### Quest Lifecycle

1. **Active** — Being worked on
2. **Paused** — Temporarily on hold
3. **Completed** — Goal achieved
4. **Archived** — No longer relevant

### Artifacts

Work products link to quests as artifacts:
- Decisions
- Findings
- Code changes
- Documentation

### Quest Sensemaking

When artifacts accumulate without quest links, `/quest suggest` helps restructure.

## Knowledge Graph

The knowledge graph (Neo4j) indexes everything for fast retrieval.

### Node Types

| Node | Description |
|------|-------------|
| Person | Team member |
| Session | A work session with handoff |
| Quest | An exploration or initiative |
| Artifact | A work product (decision, finding, etc.) |
| Project | A codebase or repo |

### Relationships

- `Session -[:BY]-> Person` — Who ran the session
- `Session -[:HANDED_TO]-> Person` — Directed handoff
- `Artifact -[:PART_OF]-> Quest` — Work linked to quest
- `Artifact -[:CONTRIBUTED_BY]-> Person` — Who created it

### Queries

The graph is queried automatically by commands like `/activity` and `/ask`. You can also run direct queries via `bin/graph.sh`.

## Sessions

Every Egregore session follows a rhythm:

1. **Start** — Sync memory, show activity dashboard
2. **Orient** — Choose focus from recent work or handoffs
3. **Work** — Normal Claude Code usage with slash commands
4. **End** — `/handoff` or `/save` to preserve context

This rhythm ensures knowledge accumulates rather than evaporates.
