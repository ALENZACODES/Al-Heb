# ALEF status (lane 8 integration run, round 4, 2026-11-04)

Checked this run: `node --test` -> 502 tests, 0 failing at the last run (the precache file-list test fails whenever any lane adds a file under src/, assets/ or data/ until `node tools/build-precache.mjs` is re-run; re-run it last). `node tools/smoke.mjs` (Chromium, 390x844 @2x) exits 0: no uncaught page errors, offline reload of the app shell works once with the service worker, first-run setup persists, lesson -> review flow works.

## Routes
Data-driven in `src/shell/router.js`. New this round (lane 1 sub-screens; they re-use `curriculum/learn.view.js` by injecting its query, so `#/learn?loanwords=1` etc. still work):
`#/loanwords`, `#/loanwords/:group`, `#/spotit/:letter`, `#/checkpoint`, `#/dialogues`, `#/dialogues/:id`. They are not in the nav bar (full already; Learn stays highlighted); Home has a "More ways to learn" card with Words you can read, Look-alike check, Israel dialogues. Spot It is linked from lessons (it needs a letter). `#/letters/atlas`, `#/soundgap`, `#/vocab` mount and have Home tiles (their view files now exist).

## Screenshots actually viewed at 390px (docs/screens/)
spotit (seeded, tapped and checked), loanwords lw1 (seeded), checkpoint (seeded), dialogues d-cafe, atlas, soundgap, workbook, home. NOT viewed: dialogues list, vocab, about credits (checked only that it mounts), dark mode, desktop width.
Fixed after viewing: Spot It target line read backwards (RTL container), "(missed)" labels wrapped cells, dialogue lines wrapped mid-sentence, Sound-gap fieldset widened the page to 414px, duplicate workbook labels (the memory-hook PDFs now say so), uneven Home tiles.

## Open defects that are not lane 8's
- `src/curriculum/spotit.view.js` (lane 1): after "Check" the result shows the literal text "null" because `result.replaceChildren(..., fooled.length ? el(...) : null, ...)` stringifies null. Filter nulls.
- Sound gap table is slightly wider than 390px and is clipped by `main{overflow-x:clip}` rather than scrolled; the view should wrap it in `.table-wrap`.
- Atlas and Sound gap use their own inline CSS with fixed colours; dark mode not checked.
- `data/audio/manifest.json` is 1.7 MB and is precached (under the 2 MiB cap); consider lazy loading.

## Not verified
iOS/Android, install prompt, screen readers, keyboard-only walkthrough, CI on GitHub, correctness of Hebrew UI labels (all machine-drafted; new labels nav.loanwords/checkpoint/dialogues are drafts), the credits text has not been legally reviewed.
