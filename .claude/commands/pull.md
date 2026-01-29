Get latest from all repos (memory, project, submodules).

## What to do

1. Pull latest from egregore
2. Check if memory symlink exists — if not, create it: `ln -s ../curve-labs-memory memory`
3. Pull latest from memory repo
4. Pull latest from sibling projects (tristero, lace) if they exist

## Example

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

## Next

Read any recent handoffs, then start working.
