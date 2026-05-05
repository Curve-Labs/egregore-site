#!/usr/bin/env bash
# Egregore One-Step Installer.
#
# Usage (curl one-liner, public endpoint):
#   curl -fsSL https://egregore.xyz/install | bash
#
# Usage (local clone, also works):
#   gh repo clone egregore-labs/egregore-hub ~/egregore
#   bash ~/egregore/scripts/install.sh
#
# The egregore-hub repo is currently private; an `egregore-labs` GitHub
# invitation + `gh auth login` is enough — the script's clone step uses
# `gh repo clone` if available, falls back to git's credential helper.
#
# This script clones the codebase if needed, installs the TUI deps
# (uv/pip + rich + prompt_toolkit + pyyaml), and launches the
# step-by-step installer at src/egregore/installer/tui.py. Note: the
# default tui.py join-hearth step joins egregore-labs's hearth — to
# create a NEW hearth instead, run `egregore wizard` after install.
#
# Canonical source: egregore-hub/scripts/install.sh
# Public copy:      curve-labs-core/site/public/install.sh
#                   (deployed at egregore.xyz/install)
# Keep them in sync until we add a GitHub Action.

# When run as `curl … | bash`, bash is reading the SCRIPT from stdin (the
# curl pipe). Naively doing `exec </dev/tty` would swap stdin to the
# terminal — but then bash would try to read the REST OF THE SCRIPT from
# the terminal, hanging forever waiting for the user to type it.
#
# The correct pattern (used by Homebrew, rustup, et al.): save the rest
# of stdin to a tempfile, then re-exec bash on that file with /dev/tty
# as stdin. The tempfile is the "rest of the script" — the lines bash
# hasn't executed yet — so the post-bootstrap install runs from a file
# while interactive prompts read from the user's terminal.
#
# We sentinel via EGREGORE_INSTALL_REEXEC so the re-exec'd shell
# doesn't recurse. set -euo pipefail is applied AFTER this bootstrap
# block so it's active in both the original and the re-exec'd pass.
if [ "${EGREGORE_INSTALL_REEXEC:-0}" != "1" ] \
   && [ ! -t 0 ] \
   && [ -t 1 ] \
   && [ -r /dev/tty ]; then
  _eg_tmp="$(mktemp -t egregore-install.XXXXXX)"
  trap 'rm -f "$_eg_tmp"' EXIT
  # cat reads what's left of stdin (the rest of the script bash hasn't
  # consumed yet). It returns when the curl pipe closes.
  cat > "$_eg_tmp"
  EGREGORE_INSTALL_REEXEC=1 exec bash "$_eg_tmp" "$@" </dev/tty
fi

set -euo pipefail

BOLD='\033[1m'
CYAN='\033[0;36m'
DIM='\033[2m'
RESET='\033[0m'

printf '%b\n' "${BOLD}⚕ Egregore${RESET}"
printf '%b\n' "${CYAN}collective cognition that travels${RESET}"
printf '%b\n' "${DIM}────────────────────────────────────────${RESET}"
echo

# ────────── preflight ─────────────────────────────────────────────────

if ! command -v python3 >/dev/null 2>&1; then
  printf '%b\n' "✗ ${BOLD}Python 3${RESET} is required. Install it first and try again." >&2
  exit 1
fi

if ! command -v git >/dev/null 2>&1; then
  printf '%b\n' "✗ ${BOLD}git${RESET} is required. Install it first and try again." >&2
  exit 1
fi

# ────────── clone (if needed) ─────────────────────────────────────────

EGREGORE_HOME="${EGREGORE_HOME:-$HOME/egregore}"
EGREGORE_REPO="${EGREGORE_REPO:-egregore-labs/egregore-hub}"

# The egregore-hub repo is currently PRIVATE. Cloning needs GitHub auth.
# We try gh first (handles OAuth automatically with a fresh `gh auth login`),
# then fall back to git (which needs HTTPS credentials or SSH key set up).
# If neither works, we surface a clear, actionable error rather than git's
# cryptic 404 message.

_clone_egregore() {
  if command -v gh >/dev/null 2>&1; then
    if gh auth status >/dev/null 2>&1; then
      gh repo clone "$EGREGORE_REPO" "$EGREGORE_HOME" -- --quiet 2>/dev/null && return 0
    fi
  fi
  # Fall back to plain git over HTTPS — uses git's credential helper.
  git clone --quiet "https://github.com/${EGREGORE_REPO}.git" "$EGREGORE_HOME" 2>/dev/null && return 0
  return 1
}

if [ ! -d "$EGREGORE_HOME/.git" ]; then
  printf '%b\n' "  Downloading Egregore codebase..."
  if ! _clone_egregore; then
    echo
    printf '%b\n' "✗ ${BOLD}Couldn't clone $EGREGORE_REPO${RESET} — likely a private-repo auth issue." >&2
    echo >&2
    printf '%b\n' "Easiest fix:" >&2
    printf '%b\n' "  ${CYAN}gh auth login${RESET}" >&2
    printf '%b\n' "  ${CYAN}gh repo clone $EGREGORE_REPO $EGREGORE_HOME${RESET}" >&2
    printf '%b\n' "  ${CYAN}bash $EGREGORE_HOME/scripts/install.sh${RESET}" >&2
    echo >&2
    printf '%b\n' "Alternatives: a fine-grained read-only PAT in your git credentials," >&2
    printf '%b\n' "or an SSH key registered with your GitHub account." >&2
    exit 1
  fi
  printf '%b\n' "${CYAN}✓ Codebase ready.${RESET}"
else
  printf '%b\n' "${CYAN}✓ Codebase already present.${RESET}"
fi

cd "$EGREGORE_HOME"

# ────────── prepare installer deps ────────────────────────────────────

printf '%b\n' "  Preparing installer tools..."

# Find a package manager (uv if installed, else pip)
PKGMGR=""
if command -v uv >/dev/null 2>&1; then
  PKGMGR="uv pip install"
elif command -v pip3 >/dev/null 2>&1; then
  PKGMGR="pip3 install"
elif command -v pip >/dev/null 2>&1; then
  PKGMGR="pip install"
else
  # Fallback: install uv
  curl -LsSf https://astral.sh/uv/install.sh | sh >/dev/null 2>&1
  if [ -f "$HOME/.cargo/env" ]; then
    . "$HOME/.cargo/env" 2>/dev/null || true
  fi
  PKGMGR="uv pip install"
fi

if [ -n "$PKGMGR" ]; then
  # Install the TUI deps into user site so python3 can find them
  $PKGMGR rich prompt_toolkit pyyaml --quiet --user --upgrade 2>/dev/null || true
fi

# Verify prompt_toolkit is importable
if ! python3 -c "import prompt_toolkit" 2>/dev/null; then
  printf '%b\n' "  ${DIM}Falling back to console-only installer (TUI deps unavailable)...${RESET}"
  # Run console-mode with args
  python3 src/egregore/installer/tui.py --mode console "$@"
  exit $?
fi

echo
printf '%b\n' "${CYAN}Launching Egregore installer...${RESET}"
echo

# ────────── launch the TUI ────────────────────────────────────────────

python3 src/egregore/installer/tui.py "$@"
