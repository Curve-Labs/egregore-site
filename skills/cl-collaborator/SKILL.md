# Curve Labs Collaborator Skill

Commands for maintaining continuity across sessions and collaborators.

## Commands

### /handoff

Create a handoff document for session continuity. Use when ending a significant work session or switching contexts.

**Usage**: `/handoff [topic]`

**Behavior**:
1. Summarize what was accomplished this session
2. List any open threads or unfinished work
3. Note key decisions made and their rationale
4. Identify next steps with clear entry points
5. Save to `memory/conversations/YYYY-MM/YYYY-MM-DD-handoff-[topic].md`
6. Update `memory/conversations/index.md`

**Handoff Document Template**:
```markdown
# Handoff: [Topic]

**Date**: YYYY-MM-DD
**Collaborator**: [Name]
**Project**: [LACE/Tristero/Infrastructure]

## Session Summary

[2-3 sentences on what this session accomplished]

## Key Decisions

- **[Decision]**: [Rationale]

## Current State

[What's working, what's in progress, what's blocked]

## Open Threads

- [ ] [Unfinished item with context]
- [ ] [Another item]

## Next Steps

1. [Clear action with entry point]
2. [Another action]

## Entry Points

For the next session, start by:
- Reading: [specific file or section]
- Running: [specific command if applicable]
- Reviewing: [specific context needed]
```

---

### /status

Get current state across Curve Labs projects.

**Usage**: `/status [project?]`

**Behavior**:
1. Check `memory/conversations/index.md` for recent activity
2. Summarize active work streams per project
3. Identify any handoffs awaiting pickup
4. Note decisions pending review

**Output Format**:
```
## Curve Labs Status

### Recent Activity
- [Date]: [Summary] (@collaborator)

### Active Threads
- **LACE**: [current focus]
- **Tristero**: [current focus]

### Pending Handoffs
- [Handoff title] — created [date] by [collaborator]

### Open Decisions
- [Decision needing review]
```

---

### /reflect

Capture emergent patterns or insights for the knowledge base.

**Usage**: `/reflect [topic]`

**Behavior**:
1. Prompt for the insight or pattern observed
2. Categorize: decision | finding | pattern
3. Save to appropriate location in `memory/knowledge/`
4. Cross-reference with related entries if applicable

**Categories**:
- **decisions/**: Choices made with rationale (reversible or not)
- **findings/**: Discoveries, learnings, things that worked or didn't
- **patterns/**: Recurring structures, approaches, or anti-patterns

---

## Automatic Behaviors

When working on Curve Labs projects, this skill enables:

1. **Session awareness**: Track when significant work happens
2. **Continuity prompts**: Suggest `/handoff` when ending long sessions
3. **Context loading**: Offer to check knowledge base when uncertainty detected
4. **Cross-project awareness**: Note when work in one project affects another
