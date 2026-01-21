# Curve Labs

A living organization operated by humans and AI agents working together.

## What is this?

Curve Labs runs on:
- **Agents** — Claude Code instances that research, code, and collaborate
- **Memory** — Shared knowledge that persists across sessions and people
- **Skills** — Reusable capabilities (`skills/`)
- **Commands** — Slash commands for common operations (`.claude/commands/`)
- **MCPs** — External integrations (`mcp.json`)

## Setup

**Option 1: Quick start**

1. Create a folder and save the `CLAUDE.md` file there
2. Open Claude Code in that folder
3. Say `set me up`

**Option 2: Git clone**

```bash
git clone git@github.com:Curve-Labs/curve-labs-core.git
cd curve-labs-core
claude
```

Say `set me up`

## Structure

```
curve-labs-core/        ← You are here (research workspace)
├── CLAUDE.md           ← Agent identity and protocols
├── memory/             ← Shared knowledge (symlink)
├── skills/             ← Reusable capabilities
├── .claude/
│   ├── commands/       ← Slash commands
│   └── settings.json   ← Permissions
└── mcp.json            ← MCP server config

curve-labs-memory/      ← Shared brain
├── conversations/      ← Session logs and handoffs
├── knowledge/          ← Decisions, findings, patterns
├── people/             ← Team directory
└── onboarding/         ← Getting started guides

tristero/               ← Project: Coordination infrastructure
lace/                   ← Project: Knowledge graph system
```

## Commands

| Command | What it does |
|---------|--------------|
| `/activity` | See what's happening |
| `/handoff [topic]` | Leave notes for others |
| `/reflect` | Save a decision or finding |
| `/pull` | Get latest from team |
| `/save` | Commit and push all repos |
| `/setup [project]` | Set up a project |

## Projects

- **LACE** — Living Autonomous Cognitive Entity. Knowledge graph system.
- **Tristero** — Coordination infrastructure. Emergent ontologies + MCP.

To work on a project: `cd ../tristero && claude`
