Invite someone to your Egregore organization.

Arguments: $ARGUMENTS (GitHub username)

## What to do

1. Parse the GitHub username from `$ARGUMENTS`
2. Read org config from `egregore.json`
3. Read token from `.env`
4. Add them as collaborator on both repos
5. Create a zip of the configured egregore-core
6. Send the zip to the group chat via Telegram
7. Create Person node in Neo4j

## Step 1: Validate

```bash
GITHUB_USER="$ARGUMENTS"  # e.g. "cemdag"
GITHUB_ORG=$(jq -r '.github_org' egregore.json)
TOKEN=$(grep '^GITHUB_TOKEN=' .env | cut -d'=' -f2-)
```

If no username provided, ask: "Who do you want to invite? Give me their GitHub username."

## Step 2: Add collaborator on both repos

```bash
# Add to egregore-core fork
curl -s -H "Authorization: token $TOKEN" \
  -X PUT "https://api.github.com/repos/$GITHUB_ORG/egregore-core/collaborators/$GITHUB_USER" \
  -d '{"permission":"push"}'

# Add to memory repo
MEMORY_REPO_NAME=$(basename "$(jq -r '.memory_repo' egregore.json)" .git)
curl -s -H "Authorization: token $TOKEN" \
  -X PUT "https://api.github.com/repos/$GITHUB_ORG/$MEMORY_REPO_NAME/collaborators/$GITHUB_USER" \
  -d '{"permission":"push"}'
```

Check responses: 201 = invited, 204 = already collaborator. If 403/404, the current user may not have admin access — tell them to add the person manually on GitHub.

## Step 3: Create installer zip

Create a zip of the current egregore-core directory with the configured `egregore.json` (org fields filled in), excluding personal/generated files:

```bash
ZIPFILE="/tmp/egregore-core.zip"
rm -f "$ZIPFILE"
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
zip -r "$ZIPFILE" . \
  -x ".git/*" \
  -x ".DS_Store" \
  -x ".env" \
  -x ".egregore-state.json" \
  -x "memory" \
  -x "memory/*" \
  -x ".claude/settings.local.json"
```

## Step 4: Send via Telegram

```bash
INVITER=$(git config user.name || echo "Someone")
ORG_NAME=$(jq -r '.org_name' egregore.json)
bash bin/notify.sh file "$ZIPFILE" "Hey @$GITHUB_USER — $INVITER invited you to *${ORG_NAME}* on Egregore.

Unzip, open Terminal, and paste:
\`cd ~/Downloads/egregore-core && bash start.sh\`"
```

Clean up:
```bash
rm -f "$ZIPFILE"
```

## Step 5: Create Person node in Neo4j

Run with `bash bin/graph.sh query "..." '{"param": "value"}'`

```cypher
MERGE (p:Person {github: $github})
ON CREATE SET p.name = $github, p.invited = date(), p.invitedBy = $inviter
RETURN p.name
```

Where:
- `$github` = the GitHub username
- `$inviter` = short name of the person running `/invite`

## Step 6: Ask for their name

After creating the node, ask: "What's their first name? (So we don't just call them by their GitHub handle.)"

If provided, update:
```cypher
MATCH (p:Person {github: $github})
SET p.name = $name
RETURN p.name
```

## Output

```
> /invite cemdag

Inviting cemdag to Curve-Labs...

  Adding to Curve-Labs/egregore-core...
    ✓ Collaborator invited

  Adding to Curve-Labs/curve-labs-memory...
    ✓ Collaborator invited

  Creating installer zip...
    ✓ 22 files, 68KB

  Sending to Telegram group...
    ✓ Sent

  Creating Person node...
    ✓ cemdag added to knowledge graph

What's their first name?
> Cem

  ✓ Updated: cemdag → Cem

Done. cemdag will get a GitHub invite email + the zip in Telegram.
They just unzip, double-click start.command, and they're in.
```

## Error Handling

**No admin access:**
```
I can't add collaborators — you may not have admin rights on Curve-Labs/egregore-core.

Add them manually:
  https://github.com/Curve-Labs/egregore-core/settings/access
  https://github.com/Curve-Labs/curve-labs-memory/settings/access

I'll still send them the zip.
```

**No Telegram configured:**
```
Zip created at /tmp/egregore-core.zip but Telegram isn't configured.
Send it to them manually.
```

## Rules

- Always use `bin/graph.sh` for Neo4j — never MCP
- Always use `bin/notify.sh` for Telegram — never construct API calls directly
- The zip must include `egregore.json` with filled org fields
- The zip must NOT include `.git/`, `.env`, `.egregore-state.json`, `memory/`
