---
title: FAQ
description: Frequently asked questions about Egregore
---

## General

### What is Egregore?

Egregore is a shared intelligence layer for teams using Claude Code. It adds persistent memory, async handoffs, and a knowledge graph on top of Claude's capabilities.

### Why the name "Egregore"?

An egregore is a concept from occult traditions — a collective thought-form created by a group's shared focus and intention. We use it to describe what emerges when a team's knowledge accumulates and becomes searchable across sessions.

### Is Egregore free?

Egregore is open source. You need your own Claude Code subscription and can self-host the infrastructure, or use our hosted API.

### Does Egregore work with other AI assistants?

Currently, Egregore is designed specifically for Claude Code. The architecture could support other assistants in the future.

## Setup

### Do I need a GitHub organization?

No. Egregore works with personal GitHub accounts too. An organization is recommended for teams.

### What gets stored in the memory repository?

- Handoff files (markdown)
- Knowledge artifacts (decisions, patterns, findings)
- Quest definitions
- Team member profiles

No code is stored in the memory repo — that stays in your project repos.

### Is my data private?

Yes. Your memory repository is private by default. The knowledge graph is isolated per organization.

## Usage

### How do I know what my team has been working on?

Run `/activity` to see the dashboard with recent sessions, handoffs, and quests.

### Can I use Egregore solo?

Yes. Even solo, Egregore helps with:
- Persistent context across sessions
- Structured handoffs to your future self
- Accumulated decisions and patterns

### How do I search past knowledge?

Use `/ask about [topic]` to search the knowledge graph, or browse `memory/knowledge/` directly.

### What happens if I forget to handoff?

Your work isn't lost — it's in your local files and git history. But it won't be indexed in the knowledge graph or visible to teammates until you run `/save` or `/handoff`.

## Technical

### Where is data stored?

- **Memory** — Git repository (GitHub)
- **Graph** — Neo4j database (hosted or self-hosted)
- **Notifications** — Telegram (optional)

### Can I self-host everything?

Yes. The API server, Neo4j database, and all infrastructure can be self-hosted. See the deployment guide.

### How do I backup my knowledge?

The memory repository is a standard Git repo — clone it anywhere. The Neo4j graph can be exported with standard Neo4j backup tools.

### What's the API key for?

The API key (`EGREGORE_API_KEY`) authenticates your requests to the graph and notification services. It's scoped to your organization.
