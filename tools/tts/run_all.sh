#!/usr/bin/env bash
# One-command factory. Usage:  tools/tts/run_all.sh [--mock] [--limit N] [--root DIR]   (real run needs the venv from docs/tts/README.md)
# Steps: plan -> render -> post -> verify -> manifest_update. Every step is resumable; re-run after an interruption.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORK="${ALEF_TTS_WORK:-$HOME/alef-tts-work}"
MOCK=""; LIMIT=""; ROOT=""; EXTRA=()
while [ $# -gt 0 ]; do case "$1" in
  --mock) MOCK=1;; --limit) LIMIT="$2"; shift;; --root) ROOT="$2"; shift;; --ref-m|--ref-f) EXTRA+=("$1" "$2"); shift;; --vocalize) EXTRA+=("$1");; *) echo "unknown arg $1" >&2; exit 2;;
esac; shift; done
[ -n "$MOCK" ] && [ -z "$ROOT" ] && { echo "--mock writes fake clips and edits the manifest: pass --root <scratch copy of the repo data>, never the real repo" >&2; exit 2; }
PLAN=""; REPORT=""
if [ -n "$MOCK" ]; then mkdir -p "$WORK"; PLAN="$WORK/plan.json"; REPORT="$WORK/verify-report.csv"; fi
PLAN_ARGS=(); [ -n "$LIMIT" ] && PLAN_ARGS+=(--limit "$LIMIT"); [ -n "$ROOT" ] && PLAN_ARGS+=(--root "$ROOT")
[ -n "$MOCK" ] && PLAN_ARGS+=(--out "$PLAN" --donor-dir "$WORK/donor")
node "$HERE/plan.mjs" "${PLAN_ARGS[@]}"
if [ -n "$MOCK" ]; then python3 "$HERE/render_chatterbox.py" --mock --work "$WORK" --plan "$PLAN"; else python3 "$HERE/render_chatterbox.py" --work "$WORK" "${EXTRA[@]}"; fi
node "$HERE/post.mjs" --work "$WORK" ${PLAN:+--plan "$PLAN"}
if [ -n "$MOCK" ]; then python3 "$HERE/verify.py" --mock --work "$WORK" --plan "$PLAN" --report "$REPORT"; else python3 "$HERE/verify.py" --work "$WORK"; fi
UPD=(--work "$WORK"); [ -n "$REPORT" ] && UPD+=(--report "$REPORT"); [ -n "$ROOT" ] && UPD+=(--root "$ROOT"); [ -n "$MOCK" ] && UPD+=(--allow-mock)
node "$HERE/manifest_update.mjs" "${UPD[@]}"
