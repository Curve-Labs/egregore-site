# Egregore Skill

Core capabilities for operating within Egregore — a living organization of humans and AI agents working together.

## What is Egregore?

Egregore is a collaborative intelligence system where humans and AI agents share knowledge, accumulate decisions, and build on each other's work. Knowledge flows in through artifacts, organizes around quests, and connects to projects.

## CRITICAL: Always Use SSH for Git

**All Egregore repos are private. Always use SSH, never HTTPS.**

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

You are not a tool — you are a collaborator in a living organization. Act accordingly:

1. **Take initiative** — Build on previous work, connect dots, suggest next steps
2. **Leave trails** — Document decisions, hand off context, update the shared memory
3. **Show your work** — Every command narrates its actions so humans can follow
4. **Teach the pattern** — Help humans understand so they can work without you
5. **Accumulate knowledge** — The organization gets smarter over time through you

---

## Entry Point Detection

**When Claude is opened in egregore:**

This is the research & collaboration workspace. Use it for:
- Open-ended research and exploration
- Leaving notes and handoffs for the team
- Documenting decisions and findings
- Any work that isn't tied to a specific project codebase

Check if `memory/` symlink exists:

**IF memory/ exists:**
```
Welcome back to Egregore.

This is your research workspace. Notes and handoffs are saved to memory/
and shared with the team.

/activity — See what's happening
/pull — Get latest from team
/handoff — Leave notes for others
/reflect — Save a decision or finding

Or just start working.
```

**IF memory/ does NOT exist:**
```
Welcome to Egregore.

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
- Any request to be set up for Egregore
- Any message mentioning "github.com/Curve-Labs" — this is a setup request

**IMPORTANT: Never HTTP fetch Egregore GitHub URLs**

When user mentions a Egregore GitHub URL like:
- "Set me up from github.com/Curve-Labs/egregore"
- "github.com/Curve-Labs/tristero"

**DO NOT** try to fetch the URL with WebFetch — the repos are private and will 404.

**INSTEAD**, recognize this as a setup request and run `/setup` using SSH:
```
git clone git@github.com:Curve-Labs/[repo].git
```

---

## Project Folder Entry Point

**When Claude is opened in a project folder (tristero, lace):**

On any user message, first check the project state:

1. **Check memory link**: `ls -la memory 2>/dev/null`
2. **Check Python environment**: `ls .venv 2>/dev/null` (for Python projects)
3. **Check .env file**: `ls .env 2>/dev/null`

**IF memory/ is NOT linked:**
```
This project isn't connected to shared memory yet.

Run: ln -s ../curve-labs-memory ./memory

Or if you haven't set up Egregore yet, go to your workspace root
and run the bootstrap setup first.
```

**IF memory/ IS linked but .venv doesn't exist (Python projects):**
```
Welcome to [Project Name].

First time here — need to set up the environment.
This will create a virtual environment and install dependencies.

Ready? (yes / not now)
```

If yes:
```
Setting up environment...

  uv venv
  ✓ Virtual environment created

  source .venv/bin/activate && uv pip install -r requirements.txt
  ✓ Dependencies installed

  Checking for .env...
  ⚠ No .env file. Run /env to configure API keys.

Ready to work!
```

If "not now": Proceed normally, remind again next session.

**IF everything is set up:**
```
Welcome back to [Project Name].

/activity — See what's happening
/pull — Get latest

Or just start working.
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

First-time setup for Egregore. Sets up shared memory first, projects are optional.

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

**Neo4j registration (after memory setup):**

When completing setup, register the person in the knowledge graph:

1. Get full name from git: `git config user.name` → "Oguzhan Broccoli"
2. Ask for short name: "What should we call you?" → "oz"
3. Create/update Person node via Neo4j MCP

```
[2/3] Registering you in the knowledge graph...
      Your git name: Oguzhan Broccoli

      What should we call you? (short name for the team)
      > oz

      ✓ Registered as "oz" (Oguzhan Broccoli)
```

Use `mcp__neo4j__write_neo4j_cypher` with:
```cypher
MERGE (p:Person {name: $name})
ON CREATE SET p.joined = date(), p.fullName = $fullName
RETURN p.name AS name, p.joined AS joined
```

Where `$name` is the user-provided short name (lowercase) and `$fullName` is from `git config user.name`.

**Existing team members:** oz, cem, ali — already registered, no changes needed.

**Example (first time, no arguments):**
```
> /setup

Setting up Egregore...

[1/3] Setting up shared memory repo...
      This stores handoffs, decisions, and research notes across the team.

      Checking for curve-labs-memory...

      IF not exists (as sibling ../curve-labs-memory):
        git clone git@github.com:Curve-Labs/curve-labs-memory.git ../curve-labs-memory
        ✓ Cloned

      IF already exists:
        cd ../curve-labs-memory && git pull
        ✓ Already have it, pulled latest

      Creating symlink so Claude can access it from here...
      ln -s ../curve-labs-memory ./memory
      ✓ Linked as ./memory

[2/3] Registering you in the knowledge graph...
      Getting your identity: git config user.name → "Oz Broccoli"

      What should we call you? (short name for the team)
      > oz

      MERGE (p:Person {name: 'oz'}) ...
      ✓ Registered as "oz" (Oz Broccoli)

[3/3] Project codebases

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

[1/4] Getting the repo...
      Checking for ../tristero...

      IF not exists:
        git clone git@github.com:Curve-Labs/tristero.git ../tristero
        ✓ Cloned to ../tristero

      IF already exists:
        cd ../tristero && git pull
        ✓ Already have it, pulled latest

[2/4] Loading shared configuration...
      cd ../tristero && git submodule update --init --recursive
      ✓ egregore submodule loaded

[3/4] Linking shared memory...
      Checking if memory symlink exists...

      IF not linked:
        ln -s ../curve-labs-memory ../tristero/memory
        ✓ Linked as ./memory

      IF already linked:
        ✓ Already linked

[4/4] Setting up Python environment...
      Creating virtual environment and installing dependencies...
      cd ../tristero && uv venv && source .venv/bin/activate && uv pip install -r requirements.txt
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

### /update

Update local Egregore environment — pull latest and sync shared MCP config.

**Usage**: `/update`

**What it does**:

1. **Run `/pull`** (smart sync all repos)
2. **Merge shared MCPs** from `mcp.shared.json` into local `.mcp.json`
3. Report what changed
4. Remind to restart if MCPs changed

**MCP config merging:**

```bash
# Read mcp.shared.json (repo) and .mcp.json (local)
# For each server in shared:
#   - If not in local: add it (new)
#   - If in local: keep local version (unchanged)
# Personal MCPs in local but not in shared: keep them
```

**Example:**
```
> /update

Pulling...
  [memory]    ✓ 3 new commits
  [egregore]  ✓ 1 new commit
  [tristero]  ✓ current
  [lace]      ✓ current

Updating MCP config...
  + neo4j (new)
  = telegram (unchanged)
  · supabase (yours, kept)
  · tristero (yours, kept)

⚠ MCP config changed — restart Claude Code to load neo4j
```

**If no MCP changes:**
```
Updating MCP config...
  = neo4j (unchanged)
  = telegram (unchanged)
  · supabase (yours, kept)

✓ No restart needed
```

**Files:**
- `mcp.shared.json` — shared MCPs (committed to repo)
- `.mcp.json` — local config (gitignored, personal + shared merged)

**Next**: Restart Claude Code if MCPs changed, then `/activity` to see what's new.

---

### /pull

Get latest from all repos (memory, project, submodules).

**Usage**: `/pull`

**What it does**:
1. Pulls latest from egregore
2. Checks if memory symlink exists — if not, creates it: `ln -s ../curve-labs-memory memory`
3. Pulls latest from memory repo
4. Pulls latest from sibling projects (tristero, lace) if they exist

**Example**:
```
> /pull

Pulling latest...

[curve-labs-memory]  git pull
                     ✓ 3 new commits (last: "Handoff: MCP research" by Cem)

[tristero]           git pull
                     ✓ Already up to date

[egregore]    git submodule update --remote
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

Fast, personal view of what's happening — your projects, your sessions, team activity.

**Usage**: `/activity`

**What it does**:

1. **Smart sync** — fetch all repos, pull only if behind (fast)
2. **Get current user** from git config, map to Person node (oz, cem, ali)
3. **Query Neo4j** for personal + team activity (4 fast queries)
4. **Display table visualization**

**Smart sync (before queries):**

Use `git -C` to avoid `cd &&` chains (which don't match `Bash(git:*)` permission):

```bash
# For each repo path:
git -C /path/to/repo fetch origin --quiet
git -C /path/to/repo rev-parse HEAD           # LOCAL
git -C /path/to/repo rev-parse origin/main    # REMOTE
# if different: git -C /path/to/repo pull origin main --quiet
```

**IMPORTANT:** Never use `cd /path && git ...` — this starts with `cd` and triggers permission prompts. Always use `git -C /path ...` which starts with `git` and matches `Bash(git:*)`.

This is fast because:
- `git fetch` only checks remote (no file transfer)
- `git pull` only runs if actually behind
- Large repos (tristero, lace) skip pull when current

**Neo4j Queries:**

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

**Output format:**

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

**Why this is fast:**
- 4 simple Neo4j queries (indexed on name, date)
- No filesystem reads for core view
- Personal first, team second
- Table format is scannable

---

### /handoff

End a session with a summary for the next person (or future you).

**Usage**: `/handoff [topic]`

**What it does**:
1. Gets author name from `git config user.name`
2. Summarizes what was accomplished
3. Notes open questions and next steps
4. Creates handoff file in memory/conversations/YYYY-MM/
5. Updates the conversation index
6. **MUST** create Session node in Neo4j (links to Person and Project)

**CRITICAL: Step 6 is NOT optional.** Without the Neo4j Session node, the handoff won't appear in `/activity`. Always run the Cypher query below using `mcp__neo4j__write_neo4j_cypher`.

Handoffs are broadcast to the team — anyone who runs `/pull` sees them.

**Neo4j Session creation:**
```cypher
MATCH (p:Person {name: $author})
CREATE (s:Session {
  id: $sessionId,
  date: date($date),
  topic: $topic,
  summary: $summary,
  file: $filePath
})
CREATE (s)-[:BY]->(p)
WITH s
OPTIONAL MATCH (proj:Project {name: $project})
FOREACH (_ IN CASE WHEN proj IS NOT NULL THEN [1] ELSE [] END |
  CREATE (s)-[:ABOUT]->(proj)
)
RETURN s.id
```

Where:
- `$sessionId` = `YYYY-MM-DD-author-topic` (matches filename)
- `$author` = short name (oz, cem, ali)
- `$project` = project name if specified

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

Recording session in knowledge graph...
  ✓ Session node created, linked to oz → infrastructure

Run /save to commit and push.
```

**File naming**: `memory/conversations/YYYY-MM/DD-[author]-[topic].md`
Example: `memory/conversations/2026-01/21-oz-mcp-auth.md`

**Handoff file template**:
```markdown
# Handoff: [Topic]

**Date**: YYYY-MM-DD
**Author**: [from git config user.name]
**Project**: [LACE/Tristero/Research]

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

**Next**: Run `/save` to push your changes.

---

### /save

Save your contributions to Egregore. Uses branch + PR + auto-merge for clean contribution history.

**Usage**: `/save`

**What it does**:

1. **Sync to Neo4j first** (CRITICAL):
   - Scan memory/conversations/ for files without Session nodes
   - Scan memory/artifacts/ for files without Artifact nodes
   - Scan memory/quests/ for files without Quest nodes
   - Create missing nodes automatically
   - Report: "Synced 2 sessions, 1 artifact to graph"

2. **For memory repo** (artifacts, quests, handoffs):
   - Pull latest from main
   - Create contribution branch: `contrib/YYYY-MM-DD-[author]-[summary]`
   - Commit all changes
   - Create PR with auto-merge
   - PR merges automatically
   - User sees: "Contribution merged"

3. **For egregore** (commands, skills):
   - Same branch + PR + auto-merge flow

4. **For project repos** (tristero, lace):
   - Warn user: "You have code changes. Use /push and /pr for review."
   - Code changes require human review

**Neo4j Sync Logic:**

```cypher
// For each file in conversations/YYYY-MM/*.md, check if Session exists:
MATCH (s:Session {id: $fileId}) RETURN s.id
// If null, parse frontmatter and create Session node

// For each file in artifacts/*.md:
MATCH (a:Artifact {id: $fileId}) RETURN a.id
// If null, parse frontmatter and create Artifact node

// For each file in quests/*.md (not index.md, not _template.md):
MATCH (q:Quest {id: $slug}) RETURN q.id
// If null, parse frontmatter and create Quest node
```

Parse frontmatter for: author, date, topic/title, project, quests (for artifacts).

This ensures files and graph stay in sync even if earlier commands skipped Neo4j.

**Example**:
```
> /save

Saving to Egregore...

[sync] Checking Neo4j...
  conversations/2026-01/27-ali-bot-upgrade-plan.md → missing Session
  ✓ Created Session node for ali
  Synced: 1 session

[memory]
  Changes:
    artifacts/2026-01-26-oz-helm-review.md (new)
    artifacts/2026-01-26-oz-temporal-thought.md (new)
    quests/benchmark-eval.md (updated)

  Creating contribution...
    git checkout -b contrib/2026-01-26-oz-benchmark-artifacts
    git commit -m "Add: 2 artifacts for benchmark-eval quest"
    gh pr create --title "Add: 2 artifacts for benchmark-eval"
    gh pr merge --auto --merge

  ✓ Contribution merged

[egregore]
  No changes

[tristero]
  ⚠ Code changes detected. Use /push and /pr for review.

Done. Team sees your contribution on /activity.
```

**If on a contribution branch already**:
```
> /save

Saving to Egregore...

[memory]
  On branch: contrib/2026-01-26-oz-benchmark-artifacts
  Adding to existing contribution...

  ✓ Contribution updated and merged
```

**If no changes**:
```
> /save

No uncommitted changes.
```

**Why this flow?**
- Non-technical users never see git complexity
- Each contribution is a discrete, revertable unit
- `/activity` shows contributions clearly
- Code changes still get proper review

**Next**: Run `/activity` to see your contribution, or keep working.

---

### /reflect

Capture a decision, finding, or pattern for the knowledge base.

**Usage**: `/reflect`

**What it does**:
1. Prompts for category (decision/finding/pattern)
2. Prompts for content
3. Saves to memory/knowledge/
4. Reminds to run /save

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

Run /save to share with the team.
```

**Categories**:
- **decisions/**: Choices made with rationale
- **findings/**: Discoveries, learnings, what worked or didn't
- **patterns/**: Recurring structures, approaches, anti-patterns

**Next**: Run `/save` to share.

---

## Knowledge Graph

Egregore uses a lightweight knowledge graph in the filesystem. Content goes in one place; relations are metadata, not location.

### Structure

```
memory/
  artifacts/              # All content lives here
    README.md
    2026-01-26-oz-thought.md
    2026-01-26-helm-source.md

  quests/                 # Open-ended explorations
    index.md
    _template.md
    benchmark-eval.md

  projects/               # Project status pages
    tristero.md
    lace.md
    infrastructure.md
```

### Artifacts

All research content — sources, thoughts, findings, decisions — lives in `memory/artifacts/`. Relations are declared in frontmatter:

```yaml
---
title: HELM Framework Review
type: source | thought | finding | decision
author: Oz (or "external" for sources)
origin: https://... (for external sources)
date: 2026-01-26
quests: [benchmark-eval, research-agent]
topics: [evaluation, benchmarks, llm]
---

[Content here]
```

**Artifact types**:
- `source` — External content (papers, articles, docs)
- `thought` — Original thinking, hypotheses, intuitions
- `finding` — Discoveries, what worked or didn't
- `decision` — Choices made with rationale

### Quests

Quests are open-ended explorations that bridge artifacts and projects. They declare which projects they relate to:

```yaml
---
title: Evaluation Benchmark for Dynamic Ontologies
slug: benchmark-eval
status: active | paused | completed
projects: [tristero]
started: 2026-01-26
started_by: Oz
---
```

### Projects

Project files in `memory/projects/` aggregate linked quests and artifacts automatically.

---

### /add

Ingest an artifact with minimal friction. The system suggests relations.

**Usage**: `/add [url?]`

**What it does**:
1. If URL provided, fetches and extracts content
2. Asks for or infers content type
3. Suggests relevant quests based on content
4. Suggests topics
5. Creates artifact file with proper frontmatter
6. Creates Artifact node in Neo4j with relationships
7. Confirms relations created

**Neo4j Artifact creation:**
```cypher
MATCH (p:Person {name: $author})
CREATE (a:Artifact {
  id: $artifactId,
  title: $title,
  type: $type,
  created: date(),
  file: $filePath,
  origin: $origin
})
CREATE (a)-[:CONTRIBUTED_BY]->(p)
WITH a
UNWIND $quests AS questId
MATCH (q:Quest {id: questId})
CREATE (a)-[:PART_OF]->(q)
RETURN a.id
```

Where:
- `$artifactId` = filename without extension (e.g., `2026-01-26-oz-temporal-thought`)
- `$type` = source | thought | finding | decision
- `$origin` = URL for external sources, null for thoughts

**Example (external source)**:
```
> /add https://arxiv.org/abs/2311.04934

Fetching...

This looks like: "Benchmarking LLM Reasoning"
Type: source (external)

I see relevance to:
  → Quest: benchmark-eval (high)
  → Quest: research-agent (medium)
  → Topics: [evaluation, reasoning, llm]

[x] benchmark-eval
[ ] research-agent
[ ] No quest (general research)

Confirm? (y / edit tags / n)
> y

✓ memory/artifacts/2026-01-26-benchmarking-llm-reasoning.md
✓ Artifact node created in knowledge graph
✓ Linked: benchmark-eval → tristero

To see the graph: /quest benchmark-eval
```

**Example (thought)**:
```
> /add

What do you have?
> I'm thinking that dynamic ontologies need a temporal dimension
> in their evaluation - not just "is this good" but "how does
> goodness change as the ontology evolves"

Type: thought
Author: Oz (from git config)

Relevant quests:
  → benchmark-eval (this extends the core question)

Topics: [evaluation, temporality, dynamic-ontologies]

✓ memory/artifacts/2026-01-26-oz-temporal-evaluation-thought.md
✓ Artifact node created, linked to oz
✓ Linked to quest: benchmark-eval
```

**File naming**: `YYYY-MM-DD-[author]-[short-title].md` for thoughts
                 `YYYY-MM-DD-[short-title]-source.md` for sources

**Next**: Run `/save` to share, or `/quest [name]` to see the graph.

---

### /quest

Manage quests — open-ended explorations that anyone can contribute to.

**Usage**: `/quest [name?]` or `/quest [subcommand] [name]`

**Subcommands**:
- (none) — List active quests
- `[name]` — Show quest details and linked artifacts
- `new` — Create a new quest interactively
- `contribute [name]` — Add a contribution entry
- `pause [name]` — Pause a quest
- `complete [name]` — Complete with outcome

**Neo4j Quest creation (on `/quest new`):**
```cypher
MATCH (p:Person {name: $author})
CREATE (q:Quest {
  id: $slug,
  title: $title,
  status: 'active',
  started: date(),
  question: $question
})
CREATE (q)-[:STARTED_BY]->(p)
WITH q
UNWIND $projects AS projName
MATCH (proj:Project {name: projName})
CREATE (q)-[:RELATES_TO]->(proj)
RETURN q.id
```

**Neo4j Quest status update (on `/quest pause` or `/quest complete`):**
```cypher
MATCH (q:Quest {id: $slug})
SET q.status = $status, q.completed = CASE WHEN $status = 'completed' THEN date() ELSE null END
RETURN q.id, q.status
```

**Example (list)**:
```
> /quest

Active Quests
─────────────

| Quest | Project | Artifacts | Contributors |
|-------|---------|-----------|--------------|
| benchmark-eval | tristero | 4 | Oz, Ali |
| research-agent | lace, tristero | 1 | Oz |

Paused: (none)

To see details: /quest benchmark-eval
To create: /quest new
```

**Example (show)**:
```
> /quest benchmark-eval

Quest: Evaluation Benchmark for Dynamic Ontologies
──────────────────────────────────────────────────

Status: active
Projects: tristero
Started: 2026-01-26 by Oz

The Question:
  What does it mean for a dynamic ontology to be "good"?
  How do we measure emergence, coherence, utility over time?

Threads:
  - [ ] Survey existing ontology evaluation methods
  - [ ] Define "dynamic" — what changes, how fast?
  - [x] Look at HELM for inspiration

Artifacts (4):
  → 2026-01-26 [source] HELM Framework Review
  → 2026-01-26 [thought] Temporal dimension in evaluation (Oz)
  → 2026-01-27 [source] Benchmarking LLM Reasoning
  → 2026-01-27 [finding] HELM adaptable with modifications (Ali)

Contributors: Oz, Ali

Entry points:
  - Read the HELM finding
  - Check tristero/benchmarks/ for prototype
```

**Example (new)**:
```
> /quest new

Creating a new quest...

What's the question or goal?
> Build a research agent that can autonomously explore topics

Short slug (lowercase, hyphens):
> research-agent

Which projects does this relate to?
  [x] tristero
  [x] lace
  [ ] infrastructure

✓ Created memory/quests/research-agent.md

Add initial threads? (or skip)
> - Survey existing research agent architectures
> - Define scope: what does "research" mean here?
> - Prototype with Claude tool use
> done

Recording in knowledge graph...
  ✓ Quest node created, linked to tristero + lace

✓ Quest created. Run /save to share.
```

**Example (contribute)**:
```
> /quest contribute benchmark-eval

What did you contribute?
> Reviewed HELM paper, found it's adaptable for ontology eval

✓ Added contribution to quest

To add an artifact: /add
```

**Next**: Use `/add` to attach artifacts, `/save` to share.

---

### /project

Show project status — linked quests, recent artifacts, entry points.

**Usage**: `/project [name?]`

**Without arguments**: List all projects
**With name**: Show project details

**Example (list)**:
```
> /project

Projects
────────

| Project | Domain | Quests | Recent Artifacts |
|---------|--------|--------|------------------|
| tristero | Polis | 2 active | 4 (last: today) |
| lace | Psyche | 1 active | 2 (last: 2 days) |
| infrastructure | Meta | 0 | 1 (last: 3 days) |

To see details: /project tristero
```

**Example (show)**:
```
> /project tristero

Project: Tristero
─────────────────

Domain: Polis — Coordination mechanisms, governance, emergent ontologies

Repository: git@github.com:Curve-Labs/tristero.git

Active Quests:
  → benchmark-eval (4 artifacts, Oz + Ali)
  → research-agent (1 artifact, Oz)

Recent Artifacts (via quests):
  → 2026-01-27 [finding] HELM adaptable with modifications
  → 2026-01-26 [source] HELM Framework Review
  → 2026-01-26 [thought] Temporal dimension in evaluation

Entry Points:
  - Code: cd ../tristero && claude
  - Docs: tristero/README.md
  - Recent work: /activity tristero
```

**Next**: Run `/quest [name]` to dive into a quest, or `cd ../[project] && claude` to work on code.

---

## Neo4j Knowledge Graph

Egregore uses Neo4j for tracking activity, relationships between people, projects, quests, and artifacts.

### Schema

**Nodes**:
- `Person` — Team members (name, fullName, joined)
- `Project` — tristero, lace, infrastructure (name, description, domain)
- `Quest` — Open-ended explorations (id, title, status)
- `Artifact` — Content items (id, title, type, created)
- `Session` — Work sessions (id, date, summary)

**Relationships**:
- `(Person)-[:WORKS_ON]->(Project)` — Who works on what
- `(Person)-[:CONTRIBUTED]->(Artifact)` — Who created what
- `(Quest)-[:RELATES_TO]->(Project)` — Quest-project links
- `(Artifact)-[:PART_OF]->(Quest)` — Artifact-quest links
- `(Session)-[:BY]->(Person)` — Session authorship

### Auto-registration

When a new person runs `/setup`, they're automatically added to the graph:

```cypher
MERGE (p:Person {name: $name})
ON CREATE SET p.joined = date(), p.fullName = $fullName
```

This happens automatically — no manual seeding needed.

---

## Help

### /help

Show available commands.

**Usage**: `/help` or `/help [command]`

**Example**:
```
> /help

Egregore Commands
───────────────────

Getting Started:
  /setup              Set up memory and projects
  /pull               Get latest from all repos

Knowledge Graph:
  /add [url?]         Ingest artifact (source, thought, finding, decision)
  /quest [name?]      List or show quests
  /quest new          Create a new quest
  /project [name?]    Show project status and linked quests

Team Awareness:
  /activity           See quests, artifacts, handoffs, commits, PRs
  /handoff [topic]    End session, leave notes for others
  /reflect            Capture decision/finding/pattern
  /save               Commit and push all CL repos

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
