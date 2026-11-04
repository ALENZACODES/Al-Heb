# Timed Read-Aloud (self-assessed)

Route `#/timedread`. Learner picks a line they can fully decode, reads it aloud while a timer runs, presses Stop, then taps the words they stumbled on or skipped ("I read it all" = none). Stored under its own key `timedread.v1` as `{v:1, reads:[{textId, lineId, words, ms, stumbled, stumbledIdx, at}]}` (last 500, in the normal backup).

Honesty: self-reported, not measured by the app. Only elapsed time is measured. No speech recognition is used, no audio is recorded or sent. `speechSupport()` only detects `SpeechRecognition` (lang he-IL) to say so; there is no word-hit check (an experimental one would have to be off by default and is not built). No leaderboard, no single fluency score: the screen shows ranges over the last 5 reads of the same line, never mixed across lines.

Definitions: wpm = words / minutes (all words); cleanWpm = (words - stumbled) / minutes (used by gates); accuracy = 1 - stumbled / words. Reads under 1.5 s or over 300 wpm are refused (mis-taps).

## Integration for src/progress (parent to apply)
- `src/timedread/gate.js` exports `timedReadGate(gate, state)` returning `{done, have, need, measurable:true, note}`.
- `data/timedread/gates.json` proposes grey and black gates (kind `timedRead`; targets copy belts.json wpmTarget, ALEF proposals, unsourced).
- In `src/progress/model.js` `evaluate()`: add `import { timedReadGate } from '../timedread/gate.js';` and `case 'timedRead': return timedReadGate(g, c.timedRead);`
- In `readSnapshot` (or makeContext): `timedRead: g('timedread.v1', null)` and expose as `c.timedRead`.
- In `src/progress/data.js` merge gates: replace `gates.gates.grey` and `.black` with `data/timedread/gates.json` entries. Until then those gates stay `unmeasured`.
- Update the spec note in progress.view.js that reading speed is "not measured" once wired (it would be self-reported).

Tests: `tests/timedread.model.test.js`, `tests/timedread.view.test.js` (fake DOM; real-browser layout at 390px not checked here).
