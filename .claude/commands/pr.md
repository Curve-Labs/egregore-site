Create a pull request for current branch.

## What to do

1. Summarize branch changes
2. Prompt for title and description
3. Create PR via GitHub CLI
4. Return PR URL

## Example

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

## Next

Share the PR link. Run `/handoff` if ending your session.
