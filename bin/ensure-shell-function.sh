#!/bin/bash
# Ensure egregore shell aliases are installed.
# Called by session-start.sh — failures here must not block session start.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CONFIG="$SCRIPT_DIR/egregore.json"

if [ ! -f "$CONFIG" ]; then exit 0; fi

# Derive alias suffix from org slug
SLUG=$(jq -r '.github_org // empty' "$CONFIG" 2>/dev/null | tr '[:upper:]' '[:lower:]' | tr -d '-' | tr -d ' ')
if [ -z "$SLUG" ]; then exit 0; fi

# Find shell profile
PROFILE=""
for p in "$HOME/.zshrc" "$HOME/.bashrc" "$HOME/.bash_profile" "$HOME/.profile"; do
  if [ -f "$p" ]; then
    PROFILE="$p"
    break
  fi
done
if [ -z "$PROFILE" ]; then exit 0; fi

ALIAS_CMD="cd \"$SCRIPT_DIR\" && claude start"

# Comment out old generic function (if we installed one previously)
if grep -q '^egregore()' "$PROFILE" 2>/dev/null; then
  sed 's/^egregore()/# &/' "$PROFILE" > "$PROFILE.tmp" && mv "$PROFILE.tmp" "$PROFILE"
  # Remove the entire old function block
  sed '/^# egregore()/,/^}/d' "$PROFILE" > "$PROFILE.tmp" && mv "$PROFILE.tmp" "$PROFILE"
fi

# Always ensure egregore-{slug} alias exists for this instance
NAMED_ALIAS="alias egregore-${SLUG}="
if ! grep -q "^${NAMED_ALIAS}" "$PROFILE" 2>/dev/null; then
  echo "" >> "$PROFILE"
  echo "# Egregore: $SLUG" >> "$PROFILE"
  echo "alias egregore-${SLUG}='${ALIAS_CMD}'" >> "$PROFILE"
fi

# If no generic 'egregore' alias exists, create one pointing here
if ! grep -q "^alias egregore=" "$PROFILE" 2>/dev/null; then
  echo "alias egregore='${ALIAS_CMD}'" >> "$PROFILE"
fi
