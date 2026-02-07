Save your contributions to Egregore. Uses branch + PR + auto-merge for clean contribution history.

## What to do

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

## Neo4j Sync Logic (via bin/graph.sh)

Run each check with `bash bin/graph.sh query "..."`. Never use MCP.

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

## Example

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

## If on a contribution branch already

```
> /save

Saving to Egregore...

[memory]
  On branch: contrib/2026-01-26-oz-benchmark-artifacts
  Adding to existing contribution...

  ✓ Contribution updated and merged
```

## If no changes

```
> /save

No uncommitted changes.
```

## Why this flow?

- Non-technical users never see git complexity
- Each contribution is a discrete, revertable unit
- `/activity` shows contributions clearly
- Code changes still get proper review

## Next

Run `/activity` to see your contribution, or keep working.
