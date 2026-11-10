# Talk Handoff

State of the Talk screen (`#/talk`) after five build and review rounds and a hardening pass on `claude/live-translator-2026-11-10`. Nothing here is merged to `main`.

## What It Is

An English and Hebrew phrase helper that runs in the browser with no server. It answers from stored lines and sentence frames, labels how each answer was made, and refuses what it does not know. It is not a general translator. `docs/talk/README.md` has the detail.

## What Was Checked

| Check | Result |
|---|---|
| Unit suite on the merged tree | Passing; see the last commit message for the count |
| Screen in headless Chrome, typed lines | Works; no request leaves the site; no console error |
| A recorded phrasebook clip plays | Seen for "Good morning" in headless Chrome; not checked by ear |
| Listening with a microphone | Not tested |
| iPhone, Android, Firefox | Not tested |
| Hebrew checked by a native speaker | Not done (322 lines, 265 nouns, 62 describing words, 62 to-forms) |
| GitHub Actions `ci` run for this branch | Passed for the round 2, 3 and 4 pushes; the round 5 run was still in progress when last looked at |
| Odd input (empty, very long, symbols, mixed scripts, words such as "constructor") | No error and no empty answer over 56 inputs in every direction |

## The Number That Matters

Six held-out sets were written, one per stage, each after the work of that stage. On first run they scored 69.6, 62.7, 74.4, 60.3, 47.5 and 48.5. Each rose above 88 once the engine was widened against it. The next new set started low again.

So: on the topics and frames it holds, Talk answers well. On a new everyday line it answers about half the time and refuses the rest. Five rounds of adding lines and frames did not change that, and more of the same will not.

## The Speech Review

`TRANSLATOR-FAILS-FOR-CLAUDE.md` was sent five times. Every version scored `feature/live-translator-2026-11-10` at `b0fe32d71`, the server pipeline, which is not on the learner's path. Its examples were run through the shipped engine as text (`docs/talk/replies/TRANSLATOR-FIXES-r1.md`). No speech review has scored this branch. To do so, keep the review's speech half and call `node tools/talk/translate.mjs --jsonl` for the translation.

## Decisions Waiting

1. What Talk is for. Either a phrase helper for travel, table and synagogue talk (it is that now), or a translator for open speech (it is not, and needs a translation model in the browser, which was not built or tested).
2. Listening. The browser's speech recognition may send sound to the browser maker. The screen and the privacy page say so. If nothing may leave the device, listening must be typing only.
3. A native speaker's pass over `data/talk/pack.json` before Talk leaves the preview tier.

## Known Faults

- "A bag" is תיק in frames and שקית in the stored shop line. Hebrew שקית now reads back as "bag", but English "a bag" in a new frame still gives תיק.
- Dictionary answers (first meanings only, marked low) can still pick the wrong sense.

## Where Things Are

| Path | What |
|---|---|
| `src/talk/` | Engine, data loader, listening, model, screen |
| `data/talk/pack.json` | Stored lines and word lists |
| `tools/talk/translate.mjs` | Command-line runner and scorer |
| `tests/talk.test.js`, `tests/talk.engine.test.js` | Tests |
| `tests/fixtures/talk.*.json` | The seven scored sets |
| `docs/talk/replies/` | Replies to the speech review |
