---
title: Command Reference
description: All Egregore slash commands
---

Egregore extends Claude Code with slash commands for team workflows. Type any command in your session.

## Session Commands

### /activity

Display the activity dashboard showing recent sessions, handoffs, quests, and team activity.

```
/activity
```

Options:
- `/activity quests` — Show all quests with full artifact counts
- `/activity @name` — Filter to a specific person's sessions

### /handoff

End your session with a structured handoff. Creates a handoff file, logs to the knowledge graph, and notifies the team.

```
/handoff
```

The handoff captures:
- Session summary
- Key decisions made
- Open threads and blockers
- Next steps
- Entry points for the next person

### /pull

Sync your local environment with the latest from the team.

```
/pull
```

Syncs:
- Develop branch
- Your working branch (rebases onto develop)
- Memory repository

### /save

Commit and push your current work without ending the session.

```
/save
```

Creates a PR to the develop branch. Markdown-only changes auto-merge.

## Knowledge Commands

### /ask

Ask questions to team members or harvest context from the graph.

```
/ask @cem about authentication flow
/ask about pricing decisions
```

If asking a person, questions are queued and they're notified. If asking about a topic, the graph is searched for relevant context.

### /reflect

Capture insights, decisions, and patterns from your work.

```
/reflect
```

Guides you through extracting:
- Decisions worth documenting
- Patterns worth naming
- Findings worth sharing

### /quest

Manage quests — open-ended explorations that span multiple sessions.

```
/quest                    # List active quests
/quest new               # Create a new quest
/quest suggest           # Analyze quest drift
```

## Project Commands

### /project

Show project status — linked quests, recent artifacts, entry points.

```
/project
```

### /branch

Create a feature or bugfix branch with consistent naming.

```
/branch feature auth-flow
/branch fix login-bug
```

### /pr

Create a pull request for the current branch targeting develop.

```
/pr
```

### /release

*(Maintainer only)* Merge develop into main and sync to public repo.

```
/release
```

## Utility Commands

### /setup

Run first-time setup or re-configure Egregore.

```
/setup
```

### /update

Update your local Egregore installation.

```
/update
```

### /env

Configure environment variables for the current project.

```
/env
```
