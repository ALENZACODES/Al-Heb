# B2: FSRS-6 memory model and scheduler preview (R-001, option 1 of M's revision)

Status: module + preview route. NOT wired into the live review scheduler.

## What exists
- `src/fsrs/fsrs6.js` (86 lines, pure, no imports): retrievability, interval, first-review state, next state, replay of a history, on-due-day what-if.
- `src/fsrs/scheduler.view.js` (route `scheduler`, preview): pick the first and later answers and a target recall, see the table of intervals. Stores nothing; says it does not change real reviews.
- `tests/fsrs6.test.js` (7 tests) with `tests/fixtures/fsrs6-reference.json`.

## Real (RAN)
- The 21 weights are the published defaults of ts-fsrs 6.0.0 (MIT licence; copyright its authors). Their licence notice must be reproduced in /credits and docs/licenses/ before the module is wired into anything learners use: NOT done here (credits file is another lane's).
- The fixture was produced once by running ts-fsrs 6.0.0 in a private temp folder outside the repo (fuzz off, short-term stage off, no learning steps, whole-day gaps): 30 review histories, 210 review steps, all four ratings present.
- `node --test tests/fsrs6.test.js`: 7 of 7 pass. Every one of the 210 steps matches the reference to 1e-6 in stability, difficulty and retrievability before the review, and exactly in scheduled days. The match on days needed the reference scheduler's rule that Again < Hard < Good < Easy by at least one day each; that rule is in `intervalsFor`.
- First attempt compared only the raw interval and failed on 43 of 210 steps (reference was 1 to 2 days longer); the ordering rule explained all of them.

## Not done / draft
- Not wired into `src/curriculum/srs.js` (12 importers, v0 review path, integration lane active). Swap needs decisions listed in the board (10-minute Again step, `state` mapping, same-day reviews). No store migration is needed if the card shape is kept.
- Same-day (short-term) memory and learning steps are not modelled; the reference was run with them off.
- Fuzz is not implemented.
- No claim about fewer reviews or better retention. The weights are not fitted to Aleph data (there is none).
- Not run in a browser.

## Browser check (RAN, temp copy only)
In a temp copy with the precache build run (never in the repo), `node tools/a11y/newviews.mjs --routes /scheduler,/known-words,/syllabus,/time-budget` (Chromium + axe-core, light and dark, initial state of each page) at 390x844 and at 375x667: 0 findings after one fix. The first run found a reflow overflow at 320 px on the scheduler table (fixed: narrower headers and a scrollable named region). Deeper states (after tapping) were not audited in a browser. No screen reader.
