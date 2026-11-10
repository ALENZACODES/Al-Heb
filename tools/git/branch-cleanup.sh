#!/usr/bin/env sh
# Branch cleanup for ALENZACODES/Al-Heb. Run from any clone with `gh` signed in as the maintainer.
#
#   sh tools/git/branch-cleanup.sh          # dry run: prints what would happen
#   sh tools/git/branch-cleanup.sh --apply  # do it
#
# Rule: every branch whose first path segment is not in KEEP is a stray name from an
# earlier workflow. If main already contains all of its commits it is deleted; otherwise
# it is renamed to john/<rest-of-name> so no work and no open pull request is lost
# (GitHub's rename endpoint moves open pull requests to the new name).
# Orphan branches (no common ancestor with main) are left alone and listed.

set -eu
REPO="ALENZACODES/Al-Heb"
KEEP="main john audio voice-sprint-2026-11-05 voice-sprint-2026-11-05-clips voice-sprint-2026-11-05-docs voice-sprint-2026-11-05-scale handover dependabot"
APPLY="${1:-}"

enc() { printf '%s' "$1" | sed 's|/|%2F|g'; }
keep() { seg="${1%%/*}"; for k in $KEEP; do [ "$seg" = "$k" ] && return 0; done; return 1; }

# Branches whose pull request was squash-merged (so compare still shows 1 ahead): #31, #32, #33 on 2026-11-07.
MERGED="john/arcade-30-2026-11-07 john/status-counts-2026-11-07 audio/arcade-30-voice john/branch-cleanup-2026-11-07"

gh api --paginate "repos/$REPO/branches?per_page=100" --jq '.[].name' | while IFS= read -r b; do
  for m in $MERGED; do
    if [ "$b" = "$m" ]; then
      echo "delete  $b (pull request squash-merged)"
      [ "$APPLY" = "--apply" ] && gh api -X DELETE "repos/$REPO/git/refs/heads/$(enc "$b")" >/dev/null
      continue 2
    fi
  done
  keep "$b" && continue
  cmp=$(gh api "repos/$REPO/compare/main...$(enc "$b")" --jq '"\(.ahead_by) \(.behind_by)"' 2>/dev/null || echo "orphan")
  case "$cmp" in
    orphan) echo "leave   $b (no common ancestor with main)";;
    "0 "*)  echo "delete  $b (0 commits not in main)"
            [ "$APPLY" = "--apply" ] && gh api -X DELETE "repos/$REPO/git/refs/heads/$(enc "$b")" >/dev/null;;
    *)      rest="${b#*/}"; new="john/$rest"
            echo "rename  $b -> $new ($cmp ahead/behind)"
            [ "$APPLY" = "--apply" ] && gh api -X POST "repos/$REPO/branches/$(enc "$b")/rename" -f new_name="$new" >/dev/null;;
  esac
done
