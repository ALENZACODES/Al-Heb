# B: record-and-compare speaking practice (feature d)

Status: PREVIEW tier, DRAFT, UNSCORED. Route `#/record-compare` (Speak section). Gameplan pillar 4, kept to what can be said honestly.

## What already existed (found before building)
`src/speak/` already has record-and-listen-back (`createRecorder`, MediaRecorder) in the "say" tab, a browser-recogniser check, minimal-pair listening drills (`pairs.js`) and `data/speak/minimal-pairs.json` (rule-generated from the vocabulary data). This feature adds only what was missing: a production drill on minimal pairs with two recordings side by side.

## What is real
- `src/recordcompare/model.js` + `recordcompare.view.js`. For each pair the learner can hear each word in the device voice, record themselves saying A and B (one at a time, auto-stop at 4 s), play both back, and answer "Could you hear a difference?" (yes / not sure / no).
- Pairs: only those `data/speak/minimal-pairs.json` marks audible in the chosen reading style (Israeli, Sephardi or Ashkenazi), with that style's rule-made respelling. Filter by contrast.
- Recordings stay in memory as object URLs and are dropped on Next or when the page closes; nothing is uploaded by ALEF or stored. The store (`recordcompare.v1`) keeps only counts of the learner's own answers.
- No microphone or no MediaRecorder: the page says so and still lets the learner hear the words and report.
- Wording on screen: "Practice only. ALEF does not judge your pronunciation and gives no score." No accuracy figure anywhere; the summary says "your own reports, not a measurement". A test blocks accuracy/percent wording.
- Tests: `tests/recordcompare.test.js` (9): tradition filter against the data, state, selection, honesty strings, view with a fake recorder (record, stop, play back, report, microphone refused, no recorder, style switch). No real microphone was used.

## What is not real
- No phoneme or accuracy scoring and no speech recognition here. The Hebrew model voice is the device's speech synthesis, which can mispronounce (the page says so); there are no human recordings (STATUS: 0 clips recorded).
- Pairs are rule-made and unreviewed; glosses may not separate homographs. The Israeli style has only 12 pairs. Contrasts with no audible pairs (bet/vet, tav/sav) have none.
- Real-device behaviour (permission prompt, codecs, iOS Safari recording, playback of object URLs) was not tested; only the fake recorder was.
- Minimal-pair "stress" drills from the gameplan are not built.
- Finding in existing code: `createRecorder` auto-stops at `maxMs` and discards the result of that stop, so on the "say" and "shadow" tabs a recording that runs to the 6 s limit is lost (a later Stop press returns `not-recording`). This feature avoids it by stopping on its own timer first. Not fixed in `src/speak/` (another lane's file).
- Browser rendering at 375x667 not run.

## Update after R/M audit (same session)
- Hebrew inside prompts (feature text, explanations) is now wrapped as `lang="he" dir="rtl"` runs through `src/hebrewtext/mixed.js` in all four views.
- Still simulated only: microphone permission denial, codec and iOS behaviour. The fake recorder is the only recorder run in tests.
