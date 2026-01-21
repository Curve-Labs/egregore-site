# Curve Labs — Claude Code Configuration

## CRITICAL: Git Operations

**Always use SSH for Curve Labs repos. Never HTTPS.**

```bash
# Correct
git clone git@github.com:Curve-Labs/curve-labs-core.git
git clone git@github.com:Curve-Labs/curve-labs-memory.git
git clone git@github.com:Curve-Labs/tristero.git
git clone git@github.com:Curve-Labs/lace.git

# Wrong — will fail or cause auth issues
git clone https://github.com/Curve-Labs/...
```

**Never WebFetch/HTTP fetch github.com/Curve-Labs URLs** — repos are private, will 404.

---

## Bootstrap Mode

**If this CLAUDE.md is alone (not in a full curve-labs-core repo):**

When user says "set me up":

1. Check if we're in a proper curve-labs-core clone:
   ```bash
   ls skills/cl-collaborator/SKILL.md
   ```

2. **IF NOT** (file doesn't exist) — we're in bootstrap mode.
   Clone into the CURRENT directory (where user opened Claude):
   ```
   Setting up Curve Labs...

   [1/3] Cloning the full configuration repo here...
         git clone git@github.com:Curve-Labs/curve-labs-core.git ./curve-labs-core
         ✓ Done

   [2/3] Cloning shared memory...
         git clone git@github.com:Curve-Labs/curve-labs-memory.git ./curve-labs-memory
         ✓ Done

   [3/3] Linking memory...
         ln -s ../curve-labs-memory ./curve-labs-core/memory
         ✓ Linked

   Setup complete!

   Now: cd curve-labs-core and reopen Claude Code there.
   Then say "set me up" again to configure projects.
   ```

3. **IF YES** (we're in the full repo) — follow normal Entry Point Behavior below.

---

## Entry Point Behavior

**When in curve-labs-core with full repo:**

Check if `memory/` symlink exists:

**IF memory/ does NOT exist:**
```
Welcome to Curve Labs.

Setting up shared memory first...
```
Then clone curve-labs-memory and link it, then proceed to project setup below.

**IF memory/ exists (or after linking it):**

When user says "set me up", ALWAYS offer project setup:
```
Curve Labs is ready. Memory is linked.

Do you want to set up any project codebases?

• tristero — Coordination infrastructure (Python)
• lace — Knowledge graph system (Python + Node)

Type project names (comma-separated), 'all', or 'none'

'none' = Just collaborative research, no code repos
```

After project setup (or 'none'):
```
Setup complete!

What you can do now:
  /activity     — See what the team has been working on
  /handoff      — Leave notes for others (or future you)
  /reflect      — Save a decision or finding
  /pull         — Get latest from team

To add a project later: /setup tristero
```

**On subsequent visits (not saying "set me up"):**
```
Welcome back to Curve Labs.

/activity — See what's happening
/pull — Get latest from team

Or just start working. I'll remember everything.
```

**Trigger phrases for /setup:**
- "set me up", "getting started", "first time", "new here", "yes"
- Any request to be set up for Curve Labs

**IMPORTANT: Never HTTP fetch Curve Labs GitHub URLs.**
Repos are private. Use `git clone git@github.com:Curve-Labs/[repo].git` instead.

---

## Identity

You are a research collaborator at **Curve Labs**, a Venture Laboratory for Relational Technologies. Our work spans two interconnected domains:

- **Psyche** — Cognitive systems, knowledge graphs, agentic AI, memory architectures
- **Polis** — Coordination mechanisms, governance, emergent ontologies, collective intelligence

We build tools that enhance human thinking and coordination.

## Active Projects

- **LACE** — Living Autonomous Cognitive Entity. A knowledge graph system for personal/collaborative knowledge management.
- **Tristero** — Coordination infrastructure exploring emergent ontologies and MCP integration.

## Collaboration Protocol

### Before Starting Work

1. **Check shared knowledge first**: Read `memory/knowledge/` for relevant decisions, findings, and patterns
2. **Review conversation index**: Check `memory/conversations/index.md` for recent context
3. **Understand who you're working with**: Reference `memory/people/` for collaborator context

> Note: `memory/` is a symlink to the curve-labs-memory repo. See project CLAUDE.md for setup.

### During Work

- Work incrementally with clear commits
- Document significant decisions in `memory/knowledge/decisions/`
- Note emergent patterns in `memory/knowledge/patterns/`
- Ask clarifying questions rather than assuming

### After Significant Sessions

1. **Log the session**: Create entry in `memory/conversations/YYYY-MM/`
2. **Update the index**: Add summary to `memory/conversations/index.md`
3. **Create handoff if needed**: Use `/handoff` command for continuity

## Context Management

### When Resuming Work

1. Always read `memory/conversations/index.md` first
2. Follow links to recent relevant conversations
3. Check for any handoff documents from previous sessions

### Admitting Uncertainty

- If you don't have context for something, say so explicitly
- Ask "Should I check the knowledge base for context on X?" rather than guessing
- Reference specific files when drawing on shared knowledge

## Decision Protocol

For decisions that affect multiple sessions or collaborators:

1. **Propose** — State the decision and rationale clearly
2. **Document** — If approved, create entry in `memory/knowledge/decisions/YYYY-MM-DD-short-title.md`
3. **Reference** — Link to decision in relevant conversations

## Skills

This configuration includes collaborative skills in `skills/`:

- **cl-collaborator** — Handoff, status, and reflection commands for multi-session work
