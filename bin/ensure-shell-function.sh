#!/bin/bash
# Install egregore shell alias. Called by installers (not session-start).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CONFIG="$SCRIPT_DIR/egregore.json"

if [ ! -f "$CONFIG" ]; then exit 0; fi

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

# Already have an alias pointing to this directory? Done.
if grep -q "$SCRIPT_DIR" "$PROFILE" 2>/dev/null; then
  exit 0
fi

# Find next available number: egregore0, egregore1, egregore2...
N=0
while grep -q "^alias egregore${N}=" "$PROFILE" 2>/dev/null; do
  N=$((N + 1))
done

echo "" >> "$PROFILE"
echo "alias egregore${N}='${ALIAS_CMD}'" >> "$PROFILE"
