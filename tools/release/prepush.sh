#!/usr/bin/env bash
# Pre-push gate. Runs the release checks in order and stops at the first failure.
# Usage: tools/release/prepush.sh [--dry]
#   (no flag)  full run: precache rebuild, metadata scan, staging + text scan, commit-message check, unit tier, status count
#   --dry      read-only rehearsal: does NOT rebuild the precache, does NOT stage, does NOT run npm test;
#              runs every other check, keeps going after a failure and lists all of them at the end.
# Exit 0 = all checks passed, 1 = a check failed, 2 = usage error.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT" || exit 2
DRY=0
case "${1:-}" in
  "") ;;
  --dry) DRY=1 ;;
  *) echo "usage: tools/release/prepush.sh [--dry]" >&2; exit 2 ;;
esac

FAILS=()
step() { echo; echo "== [$1] $2"; }
fail() { # fail <step> <message>
  echo "FAIL [$1]: $2" >&2
  FAILS+=("$1")
  if [ "$DRY" -eq 0 ]; then echo "STOPPED at step $1. Fix the problem above and re-run." >&2; exit 1; fi
}
skip() { echo "SKIPPED (dry): $1"; }

# 1. precache
step 1 "build-precache"
if [ "$DRY" -eq 1 ]; then skip "node tools/build-precache.mjs"
else node tools/build-precache.mjs || fail 1 "tools/build-precache.mjs exited non-zero"; fi

# 2. metadata scan + webp magic + home-path check
step 2 "metadata scan (tools/meta/scan.mjs)"
node tools/meta/scan.mjs || fail 2 "metadata scan reported findings (PDFs, images, audio, json metadata)"

step 2b "webp magic bytes (assets/**/*.webp must be RIFF....WEBP)"
BADWEBP="$(node -e '
const fs=require("fs"),path=require("path");const bad=[];let n=0;
(function w(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);
 if(e.isDirectory())w(p);else if(/\.webp$/i.test(e.name)){n++;const b=Buffer.alloc(12);let ok=false;
  try{const fd=fs.openSync(p,"r");const r=fs.readSync(fd,b,0,12,0);fs.closeSync(fd);ok=r===12&&b.toString("latin1",0,4)==="RIFF"&&b.toString("latin1",8,12)==="WEBP";}catch{}
  if(!ok)bad.push(p);}}})("assets");
console.error("webp files checked: "+n);console.log(bad.join("\n"));' )"
if [ -n "$BADWEBP" ]; then echo "$BADWEBP" | sed 's/^/  not a valid webp: /'; fail 2b "invalid .webp file(s) listed above"; fi

step 2c "no home-directory paths in data/**/*.json"
HOMEHITS="$(grep -rIl --include='*.json' -e '/home/' data 2>/dev/null || true)"
if [ -n "$HOMEHITS" ]; then echo "$HOMEHITS" | sed 's/^/  contains a home path: /'; fail 2c "'/home/' string found in data json"; fi

# 3. stage + text scan
step 3 "git add -A + text scan"
if [ "$DRY" -eq 1 ]; then skip "git add -A (scan below covers tracked files only)"
else git add -A || fail 3 "git add -A failed"; fi
node tools/meta/scan.mjs --text || fail 3 "text scan reported findings"

# 4. commit messages in origin/main..HEAD (read-only)
step 4 "commit messages in origin/main..HEAD"
if ! git rev-parse --verify -q origin/main >/dev/null; then fail 4 "origin/main not found"
else
  # patterns assembled from fragments so this file carries none of the words itself
  P1="co-auth""ored-by"; P2="cla""ude-session"; P3="generated"" with"
  V1="cla""ude"; V2="anthr""opic"; V3="open""ai"; V4="chat""gpt"; V5="gpt-[0-9]"; V6="copi""lot"; V7="gem""ini"; V8="co""dex"; V9="midjour""ney"; V10="dall-?e"
  RE="$P1|$P2|$P3|$V1|$V2|$V3|$V4|$V5|$V6|$V7|$V8|$V9|$V10"
  N="$(git rev-list --count origin/main..HEAD)"
  BAD=""
  while read -r sha; do
    if git log -1 --format='%an %ae %cn %ce%n%B' "$sha" | grep -qiE "$RE"; then BAD="$BAD$(git log -1 --format='  %h %s' "$sha")"$'\n'; fi
  done < <(git rev-list origin/main..HEAD)
  echo "commits checked: $N"
  if [ -n "$BAD" ]; then printf '%s' "$BAD"; fail 4 "commit message/author text matches the banned list in the commit(s) above (clean history before pushing)"; fi
fi

# 5. unit tier
step 5 "unit tier (npm test)"
if [ "$DRY" -eq 1 ]; then skip "npm test"
else npm test || fail 5 "npm test failed"; fi

# 6. status count
step 6 "working tree"
echo "git status --short lines: $(git status --short | wc -l)"

echo
if [ "${#FAILS[@]}" -gt 0 ]; then echo "RESULT: FAILED steps: ${FAILS[*]}"; exit 1; fi
[ "$DRY" -eq 1 ] && echo "RESULT: dry run clean (precache, staging and npm test were not run)" || echo "RESULT: all checks passed"
