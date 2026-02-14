#!/bin/bash
set -euo pipefail

# Preflight check — catches multi-tenancy violations before they ship.
# Run before /save, /release, or /sync-public.
#
# Checks:
#   1. Hardcoded org strings in command/skill files (execution flow)
#   2. Direct curl to Neo4j or Telegram (should use bin/graph.sh, bin/notify.sh)
#   3. Hardcoded memory repo paths
#   4. Missing dynamic config reads from egregore.json
#
# Exit 0 = clean, Exit 1 = violations found

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CONFIG="$SCRIPT_DIR/egregore.json"

if [ ! -f "$CONFIG" ]; then
  echo "⚠ No egregore.json found — skipping preflight"
  exit 0
fi

# Read org-specific strings that should NOT appear hardcoded
GITHUB_ORG=$(jq -r '.github_org // empty' "$CONFIG")
ORG_NAME=$(jq -r '.org_name // empty' "$CONFIG")
SLUG=$(jq -r '.slug // empty' "$CONFIG")
MEMORY_REPO=$(jq -r '.memory_repo // empty' "$CONFIG")
MEMORY_DIR=$(basename "$MEMORY_REPO" .git 2>/dev/null || echo "")

VIOLATIONS=0
WARNINGS=0

# Colors (if terminal supports it)
RED='\033[0;31m'
YELLOW='\033[0;33m'
GREEN='\033[0;32m'
NC='\033[0m'

violation() {
  echo -e "${RED}  ✗ VIOLATION${NC}: $1"
  echo "    $2"
  VIOLATIONS=$((VIOLATIONS + 1))
}

warning() {
  echo -e "${YELLOW}  ⚠ WARNING${NC}: $1"
  echo "    $2"
  WARNINGS=$((WARNINGS + 1))
}

echo "Running preflight checks..."
echo ""

# ============================================================
# CHECK 1: Hardcoded org strings in commands and skills
# ============================================================
echo "  [1/4] Checking for hardcoded org references..."

# Files to scan (commands, skills, CLAUDE.md — NOT egregore.json itself)
SCAN_DIRS=(
  "$SCRIPT_DIR/.claude/commands"
  "$SCRIPT_DIR/skills"
  "$SCRIPT_DIR/bin"
)

for dir in "${SCAN_DIRS[@]}"; do
  [ -d "$dir" ] || continue

  # Check for hardcoded memory directory name
  if [ -n "$MEMORY_DIR" ]; then
    matches=$(grep -rn "$MEMORY_DIR" "$dir" --include="*.md" --include="*.sh" 2>/dev/null | grep -v "egregore.json" | grep -v "# derived" | grep -v "basename" || true)
    if [ -n "$matches" ]; then
      while IFS= read -r match; do
        file=$(echo "$match" | cut -d: -f1 | sed "s|$SCRIPT_DIR/||")
        line=$(echo "$match" | cut -d: -f2)
        violation "Hardcoded memory directory '$MEMORY_DIR'" "$file:$line"
      done <<< "$matches"
    fi
  fi

  # Check for hardcoded GitHub org in execution flow (not in comments/examples)
  if [ -n "$GITHUB_ORG" ]; then
    matches=$(grep -rn "github.com[:/]$GITHUB_ORG/" "$dir" --include="*.md" --include="*.sh" 2>/dev/null | grep -v "^#" | grep -v "egregore.json" || true)
    if [ -n "$matches" ]; then
      while IFS= read -r match; do
        file=$(echo "$match" | cut -d: -f1 | sed "s|$SCRIPT_DIR/||")
        line=$(echo "$match" | cut -d: -f2)
        warning "GitHub org '$GITHUB_ORG' in URL" "$file:$line — use \$GITHUB_ORG from egregore.json"
      done <<< "$matches"
    fi
  fi
done

# ============================================================
# CHECK 2: Direct API calls (should use bin/ wrappers)
# ============================================================
echo "  [2/4] Checking for direct API calls..."

for dir in "${SCAN_DIRS[@]}"; do
  [ -d "$dir" ] || continue

  # Direct Neo4j curl (should use bin/graph.sh)
  matches=$(grep -rn "curl.*neo4j\|curl.*\/db\/neo4j\|curl.*graph/query" "$dir" --include="*.md" 2>/dev/null | grep -v "bin/graph.sh" | grep -v "# Never" | grep -v "never MCP" || true)
  if [ -n "$matches" ]; then
    while IFS= read -r match; do
      file=$(echo "$match" | cut -d: -f1 | sed "s|$SCRIPT_DIR/||")
      line=$(echo "$match" | cut -d: -f2)
      violation "Direct Neo4j curl call" "$file:$line — use bin/graph.sh"
    done <<< "$matches"
  fi

  # Direct Telegram curl (should use bin/notify.sh)
  matches=$(grep -rn "curl.*api.telegram\|curl.*sendMessage" "$dir" --include="*.md" 2>/dev/null | grep -v "bin/notify.sh" | grep -v "# Never" || true)
  if [ -n "$matches" ]; then
    while IFS= read -r match; do
      file=$(echo "$match" | cut -d: -f1 | sed "s|$SCRIPT_DIR/||")
      line=$(echo "$match" | cut -d: -f2)
      violation "Direct Telegram API call" "$file:$line — use bin/notify.sh"
    done <<< "$matches"
  fi
done

# ============================================================
# CHECK 3: Hardcoded person names in query logic
# ============================================================
echo "  [3/4] Checking for hardcoded identities in queries..."

for dir in "${SCAN_DIRS[@]}"; do
  [ -d "$dir" ] || continue

  # Person names hardcoded in Cypher queries (not in $me variable or mapping docs)
  matches=$(grep -rn "Person {name: '[a-z]" "$dir" --include="*.md" 2>/dev/null | grep -v '\$me' | grep -v "Map git" | grep -v "mapping" | grep -v "Example" | grep -v "example" || true)
  if [ -n "$matches" ]; then
    while IFS= read -r match; do
      file=$(echo "$match" | cut -d: -f1 | sed "s|$SCRIPT_DIR/||")
      line=$(echo "$match" | cut -d: -f2)
      warning "Hardcoded person name in query" "$file:$line — use \$me or dynamic resolution"
    done <<< "$matches"
  fi
done

# ============================================================
# CHECK 4: Commands missing dynamic config pattern
# ============================================================
echo "  [4/4] Checking commands read config dynamically..."

COMMANDS_DIR="$SCRIPT_DIR/.claude/commands"
if [ -d "$COMMANDS_DIR" ]; then
  for cmd in "$COMMANDS_DIR"/*.md; do
    [ -f "$cmd" ] || continue
    name=$(basename "$cmd")

    # Commands that reference memory/ should read from egregore.json
    if grep -q "memory/" "$cmd" 2>/dev/null; then
      if grep -q "ln -s" "$cmd" 2>/dev/null; then
        if ! grep -q "egregore.json\|MEMORY_DIR\|memory_repo" "$cmd" 2>/dev/null; then
          warning "Creates memory symlink without reading egregore.json" "$name"
        fi
      fi
    fi

    # Commands that clone repos should use dynamic org
    if grep -q "git clone" "$cmd" 2>/dev/null; then
      if ! grep -q "GITHUB_ORG\|github_org\|egregore.json" "$cmd" 2>/dev/null; then
        warning "Clones repos without reading github_org from egregore.json" "$name"
      fi
    fi
  done
fi

# ============================================================
# SUMMARY
# ============================================================
echo ""
if [ $VIOLATIONS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo -e "${GREEN}  ✓ Preflight passed — no multi-tenancy issues found${NC}"
  exit 0
elif [ $VIOLATIONS -eq 0 ]; then
  echo -e "${YELLOW}  ⚠ $WARNINGS warning(s) — review recommended${NC}"
  exit 0
else
  echo -e "${RED}  ✗ $VIOLATIONS violation(s), $WARNINGS warning(s) — fix before shipping${NC}"
  exit 1
fi
