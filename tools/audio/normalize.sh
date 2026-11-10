#!/usr/bin/env bash
# Loudness-normalize delivered clips (two-pass EBU R128 loudnorm) and encode for the app and for PDF/desktop use.
#   tools/audio/normalize.sh <input_dir_of_wav_or_mp3> <output_root>   (mirrors subfolders)
# Outputs per input file: <out>/<rel>.mp3 (mono 96 kbps, PDF/desktop) and <out>/<rel>.m4a (AAC mono 80 kbps, app) and .opus (mono 48 kbps).
# Targets: I=-16 LUFS, TP=-1.5 dBTP, LRA=11 (a common spoken-word/mobile target; adjust with LUFS=-18 etc.).
# Status: exercised locally on synthetic tones only (no real recordings exist). Requires ffmpeg with libmp3lame, aac, libopus; jq-free.
set -euo pipefail
IN="${1:-}"; OUT="${2:-}"
if [[ -z "$IN" || -z "$OUT" ]]; then echo "usage: $0 <input_dir> <output_root>" >&2; exit 2; fi
command -v ffmpeg >/dev/null || { echo "ffmpeg not found; install it (this script is untested without it)" >&2; exit 3; }
LUFS="${LUFS:--16}"; TP="${TP:--1.5}"; LRA="${LRA:-11}"
shopt -s nullglob globstar
count=0
while IFS= read -r -d '' f; do
  rel="${f#"$IN"/}"; base="${rel%.*}"
  mkdir -p "$OUT/$(dirname "$base")"
  stats="$(ffmpeg -hide_banner -nostats -i "$f" -af "loudnorm=I=$LUFS:TP=$TP:LRA=$LRA:print_format=json" -f null - 2>&1 | sed -n '/^{/,/^}/p')"
  get() { printf '%s' "$stats" | grep "\"$1\"" | head -1 | sed -E 's/.*: "([^"]+)".*/\1/'; }
  mi="$(get input_i)"; mtp="$(get input_tp)"; mlra="$(get input_lra)"; mth="$(get input_thresh)"; off="$(get target_offset)"
  if [[ -z "$mi" ]]; then echo "skip (cannot measure, silent or unreadable?): $f" >&2; continue; fi
  filt="loudnorm=I=$LUFS:TP=$TP:LRA=$LRA:measured_I=$mi:measured_TP=$mtp:measured_LRA=$mlra:measured_thresh=$mth:offset=$off:linear=true"
  ffmpeg -hide_banner -loglevel error -y -i "$f" -af "$filt" -ac 1 -ar 44100 -c:a libmp3lame -b:a 96k "$OUT/$base.mp3"
  ffmpeg -hide_banner -loglevel error -y -i "$f" -af "$filt" -ac 1 -ar 44100 -c:a aac -b:a 80k "$OUT/$base.m4a"
  ffmpeg -hide_banner -loglevel error -y -i "$f" -af "$filt" -ac 1 -ar 48000 -c:a libopus -b:a 48k "$OUT/$base.opus"
  count=$((count+1)); echo "normalized: $rel"
done < <(find "$IN" -type f \( -iname '*.wav' -o -iname '*.mp3' -o -iname '*.flac' -o -iname '*.m4a' \) -print0)
echo "done: $count file(s) -> $OUT"
