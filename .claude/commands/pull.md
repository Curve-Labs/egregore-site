Pull latest for current repo and shared memory.

**Note:** `/activity` auto-syncs. Use `/pull` only when you need to sync without viewing activity.

## What to do

1. Pull current repo (curve-labs-core or whichever you're in)
2. Check memory symlink exists — if not: `ln -s ../curve-labs-memory memory`
3. Pull memory repo via symlink

**Does NOT sync sibling repos.** Use `/sync-repos` for that.

## Execution

```bash
# Current repo
git pull origin main --quiet

# Memory (via symlink)
git -C memory pull origin main --quiet
```

## Output

```
Pulling...
  curve-labs-core    ✓ up to date
  memory             ↓ 2 commits → pulled

For sibling repos (tristero, lace): /sync-repos
```
