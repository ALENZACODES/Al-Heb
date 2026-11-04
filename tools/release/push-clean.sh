#!/usr/bin/env bash
# Push the repo to the private GitHub remote with every commit attributed only to John Khan:
# author and committer rewritten, and any "Co-Authored-By", "Claude-Session" or "Generated with" trailer lines removed.
# The rewrite is deterministic (same input => same hashes), so repeated runs only add new commits.
# Usage: tools/release/push-clean.sh [--force]    (--force only for the first run after the history was rewritten)
set -euo pipefail
SRC="$(cd "$(dirname "$0")/../.." && pwd)"
NAME="John Khan"; EMAIL="johnnykhan1@gmail.com"
REMOTE="$(git -C "$SRC" remote get-url origin)"
WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT
git clone -q --no-local "$SRC" "$WORK/r"
cd "$WORK/r"
git checkout -q master
export FILTER_BRANCH_SQUELCH_WARNING=1
git filter-branch -f \
  --env-filter "export GIT_AUTHOR_NAME='$NAME' GIT_AUTHOR_EMAIL='$EMAIL' GIT_COMMITTER_NAME='$NAME' GIT_COMMITTER_EMAIL='$EMAIL'" \
  --msg-filter "grep -viE '^(co-authored-by|claude-session):|generated with|claude\.ai|anthropic' | sed -e :a -e '/^\n*\$/{\$d;N;ba' -e '}'" \
  -- master >/dev/null 2>&1
echo "rewritten head: $(git rev-parse --short HEAD) ($(git rev-list --count HEAD) commits)"
if git log --format='%an %ae %cn %ce%n%B' | grep -iE 'claude|anthropic|co-authored|noreply@anthropic' >/dev/null; then echo "ABORT: attribution text still present"; exit 1; fi
git remote add target "$REMOTE" 2>/dev/null || git remote set-url target "$REMOTE"
if [ "${1:-}" = "--force" ]; then git push --force target HEAD:main; else git push target HEAD:main; fi
