---
title: What is Egregore?
description: The shared intelligence layer for teams using Claude Code
---

Egregore is a shared intelligence layer for organizations using Claude Code. It gives teams persistent memory, async handoffs, and accumulated knowledge across sessions and people.

## The Problem

When teams use AI assistants, each session starts fresh. Context is lost. Knowledge doesn't accumulate. Handoffs between people require manual documentation that often gets skipped.

## The Solution

Egregore adds a shared memory layer on top of Claude Code:

- **Persistent Memory** — Knowledge accumulates in Git-based storage that every session can access
- **Async Handoffs** — End sessions with structured handoffs that the next person (or future you) can pick up
- **Knowledge Graph** — Decisions, patterns, and insights are indexed in Neo4j for retrieval
- **Slash Commands** — Simple commands like `/handoff`, `/quest`, and `/reflect` for daily workflows

## How It Works

1. Install Egregore in your terminal
2. Start a session — you're greeted with recent activity and context
3. Work normally with Claude Code
4. Use `/handoff` when you're done — your session becomes searchable context for the team

## Next Steps

- [Setup Guide](/docs/getting-started/setup) — Install and configure Egregore
- [Commands](/docs/commands) — Learn the slash commands
- [Core Concepts](/docs/concepts) — Understand memory, quests, and handoffs
