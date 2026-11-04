# Timed read: spec for the missing measurement

Status: **built as self-report, not measured by the app.** The timed-read lane (`#/timedread`, `src/timedread/`, key `timedread.v1`) implements steps 1 to 5 below with these differences from the first draft: stumbled words are tapped, not counted; the key is `timedread.v1`, not `progress.reads`. Step 6 is wired: `src/progress/data.js` merges `data/timedread/gates.json` into the grey and black belts and `evaluate()` resolves kind `timedRead` through `src/timedread/gate.js`. There is still no speech recognition, so nothing about reading is measured except elapsed time; every wpm number on the Progress screen is labelled self-reported. The rest of this file is the original spec, kept for the record.

## Smallest honest version (self-report, no ASR)
1. Pick a registry text the learner can fully decode (`readableNow().linesFull`), at least 20 words.
2. Show it pointed, with a Start button; a Stop button records elapsed ms with `performance.now()`.
3. After stopping, ask "How many words did you stumble on or skip?" (number input, 0..N). No guessing for the learner.
4. Store to `progress.reads` as `{ textId, words, ms, errors, at }`. wpm = (words - errors) / (ms / 60000), computed on display only.
5. Progress shows the median of the last 5 reads of the SAME text and a plain label "self-reported". Never average across texts of different difficulty.
6. Belt grey/black gates become `{kind: "timedRead", minWpm, minWords}` and are only evaluated from stored reads; targets in belts.json are ALEF proposals, unsourced.

## Needed from other lanes
- A read-aloud view with a timer (lane 5 read.view.js) or a new view that writes `progress.reads`.
- Optional later: on-device speech recognition for Hebrew to replace the self-reported error count. Not available offline in the browser today; do not claim it.
