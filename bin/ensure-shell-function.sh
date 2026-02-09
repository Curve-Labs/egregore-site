#!/bin/bash
# Install egregore shell alias. Called by installers (not session-start).
# Outputs the alias name on stdout so callers can display it.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CONFIG="$SCRIPT_DIR/egregore.json"

if [ ! -f "$CONFIG" ]; then exit 0; fi

# Read slug from config (for alias naming)
SLUG=""
if command -v jq &>/dev/null; then
  SLUG=$(jq -r '.slug // empty' "$CONFIG" 2>/dev/null)
fi
if [ -z "$SLUG" ]; then
  # Fallback: extract slug with grep
  SLUG=$(grep -o '"slug"[[:space:]]*:[[:space:]]*"[^"]*"' "$CONFIG" 2>/dev/null | sed 's/.*"slug"[[:space:]]*:[[:space:]]*"//;s/"$//' || true)
fi

# --- Detect shell and profile ---
detect_profile() {
  local shell_name
  shell_name=$(basename "${SHELL:-}")

  case "$shell_name" in
    zsh)
      echo "$HOME/.zshrc"
      return
      ;;
    bash)
      # macOS uses .bash_profile for login shells, Linux uses .bashrc
      if [ -f "$HOME/.bash_profile" ]; then
        echo "$HOME/.bash_profile"
      elif [ -f "$HOME/.bashrc" ]; then
        echo "$HOME/.bashrc"
      else
        echo "$HOME/.bash_profile"
      fi
      return
      ;;
    fish)
      echo "$HOME/.config/fish/config.fish"
      return
      ;;
  esac

  # Fallback: check which profile files exist
  for p in "$HOME/.zshrc" "$HOME/.bashrc" "$HOME/.bash_profile" "$HOME/.profile"; do
    if [ -f "$p" ]; then
      echo "$p"
      return
    fi
  done
}

PROFILE=$(detect_profile)
if [ -z "$PROFILE" ]; then
  # Create the profile for the user's shell
  PROFILE="$HOME/.$(basename "${SHELL:-bash}")rc"
fi

IS_FISH=false
if [[ "$PROFILE" == *"/fish/"* ]]; then
  IS_FISH=true
fi

# Ensure profile directory exists (for fish)
mkdir -p "$(dirname "$PROFILE")"

ALIAS_CMD="cd \"$SCRIPT_DIR\" && claude start"

# Already have an alias pointing to this directory? Output existing name and exit.
if grep -q "$SCRIPT_DIR" "$PROFILE" 2>/dev/null; then
  # Extract the existing alias name
  EXISTING=$(grep "$SCRIPT_DIR" "$PROFILE" | head -1 | sed -n "s/^alias \([^=]*\)=.*/\1/p" 2>/dev/null || true)
  if [ -z "$EXISTING" ] && $IS_FISH; then
    EXISTING=$(grep "$SCRIPT_DIR" "$PROFILE" | head -1 | sed -n "s/^alias \([^ ]*\) .*/\1/p" 2>/dev/null || true)
  fi
  echo "${EXISTING:-egregore}"
  exit 0
fi

# Determine alias name:
# - First install (no "egregore" alias): use "egregore"
# - Subsequent: use "egregore-{slug}" or "egregore-{n}" as fallback
if ! grep -q "^alias egregore=" "$PROFILE" 2>/dev/null && \
   ! grep -q "^alias egregore " "$PROFILE" 2>/dev/null; then
  ALIAS_NAME="egregore"
elif [ -n "$SLUG" ]; then
  ALIAS_NAME="egregore-${SLUG}"
  # If this slug alias already exists, it's a reinstall — reuse it
  if grep -q "^alias ${ALIAS_NAME}=" "$PROFILE" 2>/dev/null || \
     grep -q "^alias ${ALIAS_NAME} " "$PROFILE" 2>/dev/null; then
    # Remove old entry so we can update the path
    if $IS_FISH; then
      grep -v "^alias ${ALIAS_NAME} " "$PROFILE" > "$PROFILE.tmp" && mv "$PROFILE.tmp" "$PROFILE"
    else
      grep -v "^alias ${ALIAS_NAME}=" "$PROFILE" > "$PROFILE.tmp" && mv "$PROFILE.tmp" "$PROFILE"
    fi
  fi
else
  # No slug, fall back to numbered
  N=1
  while grep -q "^alias egregore-${N}=" "$PROFILE" 2>/dev/null || \
        grep -q "^alias egregore-${N} " "$PROFILE" 2>/dev/null; do
    N=$((N + 1))
  done
  ALIAS_NAME="egregore-${N}"
fi

# Write the alias
echo "" >> "$PROFILE"
if $IS_FISH; then
  echo "alias ${ALIAS_NAME} '${ALIAS_CMD}'" >> "$PROFILE"
else
  echo "alias ${ALIAS_NAME}='${ALIAS_CMD}'" >> "$PROFILE"
fi

# Output the alias name for callers
echo "$ALIAS_NAME"
