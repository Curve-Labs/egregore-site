#!/bin/bash
# Ensure the egregore() shell function is installed and old aliases are cleaned up.
# Called by session-start.sh — failures here must not block session start.

# Find shell profile
PROFILE=""
for p in "$HOME/.zshrc" "$HOME/.bashrc" "$HOME/.bash_profile" "$HOME/.profile"; do
  if [ -f "$p" ]; then
    PROFILE="$p"
    break
  fi
done

if [ -z "$PROFILE" ]; then
  exit 0
fi

# Comment out old alias in ALL profiles (might exist in multiple)
for p in "$HOME/.zshrc" "$HOME/.bashrc" "$HOME/.bash_profile" "$HOME/.profile"; do
  if [ -f "$p" ] && grep -q '^alias egregore=' "$p" 2>/dev/null; then
    sed 's/^alias egregore=/#& # replaced by egregore function/' "$p" > "$p.tmp" \
      && mv "$p.tmp" "$p"
  fi
done

# Install egregore() function if not present in any profile
FOUND=false
for p in "$HOME/.zshrc" "$HOME/.bashrc" "$HOME/.bash_profile" "$HOME/.profile"; do
  if [ -f "$p" ] && grep -q 'egregore()' "$p" 2>/dev/null; then
    FOUND=true
    break
  fi
done

if [ "$FOUND" = "false" ]; then
  cat >> "$PROFILE" << 'EGREGORE_FUNC'

# Egregore
egregore() {
  local registry="$HOME/.egregore/instances.json"
  if [ ! -f "$registry" ] || [ ! -s "$registry" ]; then
    echo "No Egregore instances found. Run: npx create-egregore"
    return 1
  fi
  local -a names paths
  local i=0
  while IFS=$'\t' read -r slug name epath; do
    if [ -d "$epath" ]; then
      names[$i]="$name"
      paths[$i]="$epath"
      i=$((i + 1))
    fi
  done < <(jq -r '.[] | [.slug, .name, .path] | @tsv' "$registry" 2>/dev/null)
  local count=$i
  if [ "$count" -eq 0 ]; then
    echo "No Egregore instances found. Run: npx create-egregore"
    return 1
  fi
  if [ "$count" -eq 1 ]; then
    cd "${paths[0]}" && claude start
    return
  fi
  echo ""
  echo "  Which Egregore?"
  echo ""
  for ((j=0; j<count; j++)); do
    echo "  $((j + 1)). ${names[$j]}"
  done
  echo ""
  local choice
  printf "  Pick [1-%d]: " "$count"
  read -r choice
  if ! [[ "$choice" =~ ^[0-9]+$ ]] || [ "$choice" -lt 1 ] || [ "$choice" -gt "$count" ]; then
    echo "  Invalid choice."
    return 1
  fi
  cd "${paths[$((choice - 1))]}" && claude start
}
EGREGORE_FUNC
fi
