# Curve Labs Collaborator Skill

Commands for setup, collaboration, and continuity across Curve Labs projects.

## CRITICAL: Always Use SSH for Git

**All Curve Labs repos are private. Always use SSH, never HTTPS.**

```bash
# Correct
git clone git@github.com:Curve-Labs/curve-labs-memory.git
git clone git@github.com:Curve-Labs/tristero.git

# Wrong — will fail
git clone https://github.com/Curve-Labs/...
```

**Never WebFetch github.com/Curve-Labs URLs** — they're private, will 404.

---

## Philosophy

1. **Always show what you're doing** — Every command narrates its actions
2. **One command, one job** — Lean commands that compose
3. **Teach the pattern** — User understands what's happening and why
4. **Suggest, don't automate decisions** — Prompt user to run the next logical command

---

## Entry Point Detection

**When Claude is opened directly in curve-labs-core (not as submodule):**

Check if `memory/` symlink exists:

**IF memory/ exists:**
```
Welcome back to Curve Labs.

/activity — See what's happening
/pull — Get latest from team

Or just start working. I'll remember everything.
```

**IF memory/ does NOT exist:**
```
Welcome to Curve Labs.

Looks like first time setup. I'll get you ready:
- Shared memory (notes, handoffs, research)
- Optionally: project codebases (tristero, lace)

Ready to set up? (yes / tell me more)
```

If user says "tell me more":
> Explain collaborative Claude concept briefly — shared memory across sessions,
> handoffs between people, accumulated decisions and findings. Then offer setup again.

**Trigger phrases for /setup:**
- "set me up"
- "getting started"
- "first time"
- "new here"
- "yes" (in response to setup prompt)
- Any request to be set up for Curve Labs
- Any message mentioning "github.com/Curve-Labs" — this is a setup request

**IMPORTANT: Never HTTP fetch Curve Labs GitHub URLs**

When user mentions a Curve Labs GitHub URL like:
- "Set me up from github.com/Curve-Labs/curve-labs-core"
- "github.com/Curve-Labs/tristero"

**DO NOT** try to fetch the URL with WebFetch — the repos are private and will 404.

**INSTEAD**, recognize this as a setup request and run `/setup` using SSH:
```
git clone git@github.com:Curve-Labs/[repo].git
```

---

## Branch Awareness

**When working in a project repo (tristero, lace):**

Always check which branch the user is on. If they're on `main` or `master`, remind them before making changes:

```
You're on main. Create a branch before making changes:

  /branch [description]

Or manually:
  git checkout -b feature/YYYY-MM-DD-your-description

Then when ready:
  /commit     # stage and commit
  /push       # push to GitHub
  /pr         # create pull request
```

Only remind once per session unless they switch back to main.

---

## Setup & Sync

### /setup

First-time setup for Curve Labs. Sets up shared memory first, projects are optional.

**Usage**: `/setup` or `/setup [project]`

**Always use SSH for cloning (repos are private):**
```
git clone git@github.com:Curve-Labs/[repo].git
```

**If clone fails:**
```
Can't access repo. Check your SSH keys: ssh -T git@github.com
```

**Show reflective messages at each step** — tell the user what's happening right now.

**Example (first time, no arguments):**
```
> /setup

Setting up Curve Labs...

[1/2] Cloning shared memory repo...
      This stores handoffs, decisions, and research notes across the team.

      git clone git@github.com:Curve-Labs/curve-labs-memory.git ~/dev/curve-labs-memory
      ✓ Cloned

      Creating symlink so Claude can access it from here...
      ln -s ~/dev/curve-labs-memory ./memory
      ✓ Linked as ./memory

[2/2] Project codebases

      Memory is ready. Now, do you want to work on any project code?

      • tristero — Coordination infrastructure (Python)
      • lace — Knowledge graph system (Python + Node)

      Type project names (comma-separated), 'all', or 'none'

      'none' = Just collaborative research, no code repos

> none

✓ Setup complete.

You now have collaborative Claude with shared memory.

What you can do now:
  /activity     — See what the team has been working on
  /handoff      — Leave notes for others (or future you)
  /reflect      — Save a decision or finding
  /pull         — Get latest from team

To add a project later: /setup tristero
```

**Example (adding a specific project later):**
```
> /setup tristero

Setting up Tristero...

[1/4] Cloning the repo...
      git clone git@github.com:Curve-Labs/tristero.git ~/dev/tristero
      ✓ Cloned to ~/dev/tristero

[2/4] Loading shared configuration...
      git submodule update --init --recursive
      ✓ curve-labs-core submodule loaded

[3/4] Linking shared memory...
      ln -s ~/dev/curve-labs-memory ~/dev/tristero/memory
      ✓ Linked as ./memory

[4/4] Setting up Python environment...
      Creating virtual environment and installing dependencies...
      uv venv && source .venv/bin/activate && uv pip install -r requirements.txt
      ✓ Environment ready

Setup complete.

⚠ Missing .env file. Run /env to configure API keys.
```

**If clone fails:**
```
[1/4] Cloning the repo...
      git clone git@github.com:Curve-Labs/tristero.git ~/dev/tristero
      ✗ Failed

Can't access this repo. This is likely an SSH key issue.

Check your SSH connection to GitHub:
  ssh -T git@github.com

If that fails, you need to set up SSH keys:
  https://docs.github.com/en/authentication/connecting-to-github-with-ssh
```

**Next**: Run `/env` to configure environment variables, or `/activity` to see what's happening.

---

### /pull

Get latest from all repos (memory, project, submodules).

**Usage**: `/pull`

**What it does**:
1. Pulls latest from memory repo
2. Pulls latest from current project (if in one)
3. Updates submodules to latest

**Example**:
```
> /pull

Pulling latest...

[curve-labs-memory]  git pull
                     ✓ 3 new commits (last: "Handoff: MCP research" by Cem)

[tristero]           git pull
                     ✓ Already up to date

[curve-labs-core]    git submodule update --remote
                     ✓ Updated to latest

Ready. Recent activity:
- Jan 20: Cem handed off MCP research (memory/conversations/2026-01/20-cem-mcp.md)

You might want to read that handoff before starting.
```

**Next**: Read any recent handoffs, then start working.

---

### /env

Configure environment variables for current project.

**Usage**: `/env`

**What it does**:
1. Checks which env vars are required/optional
2. Shows which are missing
3. Prompts to add missing keys
4. Writes to .env file

**Example**:
```
> /env

Checking .env...

Required for Tristero:
  OPENROUTER_API_KEY  ✗ missing
  OPENAI_API_KEY      ✗ missing

Optional:
  LLM_MODEL           ✓ set (anthropic/claude-3.5-sonnet)

To add missing keys:
  1. Get OpenRouter key from: https://openrouter.ai/keys
  2. Get OpenAI key from: https://platform.openai.com/api-keys

Paste your OPENROUTER_API_KEY (or 'skip'):
> sk-or-...

✓ Added to .env

Paste your OPENAI_API_KEY (or 'skip'):
> sk-...

✓ Added to .env

Environment ready.
```

**Next**: You're ready to work. Run `/activity` to see recent activity.

---

## Branching & Commits

### /branch

Create a feature or bugfix branch with consistent naming.

**Usage**: `/branch [description]`

**What it does**:
1. Determines branch type (feature/bugfix)
2. Creates branch with date-prefixed name
3. Switches to the new branch

**Example**:
```
> /branch mcp authentication

Creating branch...

Convention: feature/YYYY-MM-DD-short-description
            bugfix/YYYY-MM-DD-short-description

This looks like a feature.

  git checkout -b feature/2026-01-20-mcp-authentication
  ✓ Created and switched to feature/2026-01-20-mcp-authentication

You're now on a feature branch. When ready:
- /commit to save your work
- /pr when ready for review
```

**Next**: Make your changes, then `/commit` when ready.

---

### /commit

Stage changes and commit with a message.

**Usage**: `/commit [message?]`

**What it does**:
1. Shows modified and untracked files
2. Stages relevant files (ignores build artifacts)
3. Prompts for or suggests commit message
4. Creates the commit

**Example**:
```
> /commit

Checking changes...

Modified files:
  src/mcp/auth.py        (+42, -3)
  src/mcp/server.py      (+8, -2)
  tests/test_auth.py     (+28, new file)

Untracked:
  src/mcp/__pycache__/   (ignored ✓)

Staging modified files...
  git add src/mcp/auth.py src/mcp/server.py tests/test_auth.py

Enter commit message (or I can suggest one):
> Add MCP authentication with API key validation

  git commit -m "Add MCP authentication with API key validation"
  ✓ Committed (abc1234)

Changes committed locally. Run /push to share, or /pr when ready for review.
```

**Next**: Run `/push` to share, or keep working and commit again.

---

### /push

Push current branch to remote.

**Usage**: `/push`

**What it does**:
1. Pushes current branch to origin
2. Sets upstream if first push

**Example**:
```
> /push

Pushing feature/2026-01-20-mcp-authentication...

  git push -u origin feature/2026-01-20-mcp-authentication
  ✓ Pushed

Branch is now on GitHub.
Run /pr when ready for review.
```

**Next**: Run `/pr` when ready for review.

---

### /pr

Create a pull request for current branch.

**Usage**: `/pr`

**What it does**:
1. Summarizes branch changes
2. Prompts for title and description
3. Creates PR via GitHub CLI
4. Returns PR URL

**Example**:
```
> /pr

Creating pull request...

Branch: feature/2026-01-20-mcp-authentication
Commits: 3 commits ahead of main
Changes: +78 lines, -5 lines, 3 files

Title: Add MCP authentication with API key validation
       (from your last commit — edit? y/n)
> n

Description — summarize what this PR does:
> Adds API key validation to MCP server. Keys are checked against env var. Includes tests.

  Creating PR via GitHub CLI...
  ✓ PR #42 created: https://github.com/Curve-Labs/tristero/pull/42

PR ready for review. Share the link with the team.
```

**Next**: Share the PR link. Run `/handoff` if ending your session.

---

## Team Awareness

### /activity

See what's happening across Curve Labs.

**Usage**: `/activity`

**What it does**:
1. Shows current git state (if in a project)
2. Reads memory/conversations/index.md for recent activity
3. Lists open handoffs and pending PRs

**Example**:
```
> /activity

Curve Labs Activity
───────────────────

Your current state:
  Location: curve-labs-core
  Memory:   ✓ linked

Recent activity (from memory/conversations/index.md):
  Jan 20  Cem — MCP exploration, decided on stdio transport
  Jan 19  Oz — Architecture planning, memory system design
  Jan 19  Oz — LACE/Tristero comparison

Open handoffs:
  → Cem's MCP research (Jan 20) — you might want to read this

Pending PRs:
  tristero #41 — "Fix reflection loop" (waiting on review)
```

**Next**: Read any relevant handoffs, or continue working.

---

### /handoff

End a session with a summary for the next person (or future you).

**Usage**: `/handoff [topic]`

**What it does**:
1. Summarizes what was accomplished
2. Notes open questions and next steps
3. Creates handoff file in memory/conversations/
4. Updates the conversation index

**Example**:
```
> /handoff mcp auth

Creating handoff...

I'll summarize this session. Checking what we did...

Session summary:
- Added MCP authentication (feature branch)
- Created PR #42
- Open question: how to handle key rotation?

Writing to memory/conversations/2026-01/20-oz-mcp-auth.md...
  ✓ Created

Updating memory/conversations/index.md...
  ✓ Added entry

Now commit the memory repo:

  cd ~/dev/curve-labs-memory
  git add .
  git commit -m "Handoff: MCP auth session"
  git push

Or run /save-memory and I'll do it.
```

**Handoff file template**:
```markdown
# Handoff: [Topic]

**Date**: YYYY-MM-DD
**Collaborator**: [Name]
**Project**: [LACE/Tristero/Infrastructure]

## Session Summary

[2-3 sentences on what was accomplished]

## Key Decisions

- **[Decision]**: [Rationale]

## Current State

[What's working, what's in progress, what's blocked]

## Open Threads

- [ ] [Unfinished item with context]

## Next Steps

1. [Clear action with entry point]

## Entry Points

For the next session, start by:
- Reading: [specific file]
- Running: [specific command]
```

**Next**: Run `/save-memory` to push the handoff.

---

### /save-memory

Commit and push the shared memory repo.

**Usage**: `/save-memory`

**What it does**:
1. Stages all changes in memory repo
2. Commits with descriptive message
3. Pushes to origin

**Example**:
```
> /save-memory

Saving shared memory...

  cd ~/dev/curve-labs-memory
  git add .

Changes to save:
  conversations/2026-01/20-oz-mcp-auth.md (new)
  conversations/index.md (modified)

  git commit -m "Handoff: MCP auth session"
  ✓ Committed

  git push
  ✓ Pushed

Memory saved. Others will see your handoff on their next /pull.
```

**Next**: You're done! Others will see your handoff on `/pull`.

---

### /reflect

Capture a decision, finding, or pattern for the knowledge base.

**Usage**: `/reflect`

**What it does**:
1. Prompts for category (decision/finding/pattern)
2. Prompts for content
3. Saves to memory/knowledge/
4. Reminds to run /save-memory

**Example**:
```
> /reflect

What did you notice? (decision / finding / pattern)
> decision

What was decided?
> Use stdio transport for MCP instead of HTTP

Why?
> Simpler auth model, Claude Code expects it, fewer moving parts

Saving to memory/knowledge/decisions/2026-01-20-mcp-stdio-transport.md...
  ✓ Created

Run /save-memory to share with the team.
```

**Categories**:
- **decisions/**: Choices made with rationale
- **findings/**: Discoveries, learnings, what worked or didn't
- **patterns/**: Recurring structures, approaches, anti-patterns

**Next**: Run `/save-memory` to share.

---

## Help

### /help

Show available commands.

**Usage**: `/help` or `/help [command]`

**Example**:
```
> /help

Curve Labs Commands
───────────────────

Getting Started:
  /setup              Set up memory and projects
  /pull               Get latest from all repos

Team Awareness:
  /activity           See what's happening across CL
  /handoff [topic]    End session, leave notes for others
  /reflect            Capture decision/finding/pattern
  /save-memory        Push your notes to team

Working on Code:
  /branch [name]      Create feature branch
  /commit             Stage and commit
  /push               Push branch
  /pr                 Create pull request
  /env                Configure API keys

Help:
  /help               This list
  /help [command]     Details on specific command
```
