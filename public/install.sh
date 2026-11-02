#!/usr/bin/env bash
# Egregore installer.
#
#   curl -fsSL https://egregore.xyz/install | bash
#
# This runs the same launcher the site and docs describe:
#
#   npx create-egregore@latest
#
# Any arguments are passed through to the launcher:
#
#   curl -fsSL https://egregore.xyz/install | bash -s -- join <github-org>/<repo>
#
# The launcher asks questions, so its input comes from the terminal rather
# than from this piped script.

set -euo pipefail

main() {
  if ! command -v node >/dev/null 2>&1 || ! command -v npx >/dev/null 2>&1; then
    echo "Egregore needs Node.js 18 or newer (with npx)." >&2
    echo "Install it from https://nodejs.org, then run this again." >&2
    exit 1
  fi

  local major
  major="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
  if [ "${major:-0}" -lt 18 ]; then
    echo "Egregore needs Node.js 18 or newer; this machine has $(node --version)." >&2
    echo "Update it from https://nodejs.org, then run this again." >&2
    exit 1
  fi

  if ! command -v git >/dev/null 2>&1; then
    echo "Egregore needs git. Install it from https://git-scm.com, then run this again." >&2
    exit 1
  fi

  if [ -r /dev/tty ] && [ -t 1 ]; then
    npx --yes create-egregore@latest "$@" </dev/tty
  else
    npx --yes create-egregore@latest "$@"
  fi
}

# Wrapped in a function so a partly downloaded script never runs half-way.
main "$@"
