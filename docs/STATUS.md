## Audio shard lazy loading (lane 8, 2026-11-03)
- Boot loads the core manifest only (1.29 MiB, precached). `src/shell/audio-shards.js` then fetches just the learner's `manifest-words-<congregation>.json` (0.81-0.83 MiB) after first paint and calls `player.extend`; re-loads when the congregation setting changes. Sephardi shard exists now; if absent, israeli shard is used. Offline/uncached: sound bar note "audio info unavailable offline", no error.
- Precache skips the three shards; `sw.js` runtime-caches them (stale-while-revalidate). Precache is now 149 files.
- Tests: precache skip rule asserted; new fake-fetch loader test (only learner shard fetched, no refetch, change reloads, sephardi fallback, offline, non-JSON answer); `setNote` test. Full `node --test`: 598 pass, 0 fail.
- Checked in Chromium: `walk.mjs --quick` run to /tmp: hardFailures 0; own script on /read/ein-kamocha with ashkenazi and browserVoiceAnyway off: status `none/unknown-item` with the shard blocked (note shown), `none/tts-pronunciation-mismatch` once loaded; screenshot of the offline case viewed. Not verified: real offline reload serving a shard from the runtime cache (the cache rule is simple but not exercised in a browser), and every shard entry is currently status "missing" (no recordings exist), so no shard word plays a file yet.

# ALEF status (lane 8, shell/QA-fix round, 2026-11-04)

## This round (lane 8)
- Precache test: `precache: skips vendor, PDFs and files over the size limit` failed because `precache-manifest.js` was stale, not because of a rule bug. Other lanes were adding and removing files under `data/` (corpus gaps/prayer-meta/torah-service-guide came and went) and `data/audio/manifest.json` was rewritten (it measured 3.9 MB at one point, over the 2 MiB cap, so the builder dropped it; at the last look it is 1.78 MB, so it is back in). Fix: re-ran `node tools/build-precache.mjs`. It will go stale again whenever any lane adds a file under `src/`, `assets/` or `data/`; re-run it last.
- QA defect O1 (tracing stage ~1660px down on a phone): fixed in CSS only (`assets/css/app.css`, phone widths), without editing lane 2's files. The 27-letter grid becomes a one-row horizontal strip, and the stage is moved up under the letter name; toggles, draft notice and the "Remember it" panel are below it. Measured in a screenshot at 390x844: stage starts at about y=390 and is on screen without scrolling (before: about 1660). Caveat: this depends on the child order of lane 2's markup (documented in ARCHITECTURE.md); if lane 2 changes that markup the reorder may need a tweak.
- Chrome compaction: content now starts at y=71 on a phone (was y=203). Header is one 44px row; the sound bar is one line with an ellipsis (tap it for the full text; the full text is still in the DOM for screen readers); the five main sections (Home, Learn, Letters, Sounds, Read) are a fixed bottom tab bar with a "More" button that opens a sheet with Scan, Calendar, Workbook, Settings, About. At 720px and wider the old top nav (all sections in one row) is used. Escape and an outside tap close the sheet.
- Tap targets: range sliders, file inputs (and their button), text/url inputs and select are at least 44px; the sound-bar link is 44px (QA walk `--quick`: 0 small targets on 8 routes).
- Not fixed by me (other lanes' markup, see below): the two checkbox rows whose label is a sibling, not a wrapper.
- Verified: `node tools/qa/walk.mjs --quick` 0 hard failures; full `node --test`: 596 tests, 593 pass, 3 fail, all three in the audio lane (`audio manifest resolves corpus words/lines...`, `Tetragrammaton lines/words are stored with the spoken substitute...`, `audio hook ids agree with the audio manifest...`), which was being edited at the same time. Screenshots viewed at 390px: home, letters/alef, learn, vocab, About with the More sheet open, and About at 1280px. Not viewed: dark mode after this change, other routes. `tools/smoke.mjs` and `tools/a11y/run.mjs` were not re-run after the nav change (a11y run still finds `#nav a`).
- Limits: headless Chromium only; the bottom bar was not checked against an iOS Safari toolbar or a real notch; the "More" sheet is a non-modal disclosure (no focus trap), and the one-line sound status can only be expanded by tap/click, not by keyboard.


Checked this run: `node --test` -> 502 tests, 0 failing at the last run (the precache file-list test fails whenever any lane adds a file under src/, assets/ or data/ until `node tools/build-precache.mjs` is re-run; re-run it last). `node tools/smoke.mjs` (Chromium, 390x844 @2x) exits 0: no uncaught page errors, offline reload of the app shell works once with the service worker, first-run setup persists, lesson -> review flow works.

## Routes
Data-driven in `src/shell/router.js`. New this round (lane 1 sub-screens; they re-use `curriculum/learn.view.js` by injecting its query, so `#/learn?loanwords=1` etc. still work):
`#/loanwords`, `#/loanwords/:group`, `#/spotit/:letter`, `#/checkpoint`, `#/dialogues`, `#/dialogues/:id`. They are not in the nav bar (Learn stays highlighted); Home has a "More ways to learn" card with Words you can read, Look-alike check, Israel dialogues. Spot It is linked from lessons (it needs a letter). `#/letters/atlas`, `#/soundgap`, `#/vocab` mount and have Home tiles (their view files now exist).

## Screenshots actually viewed at 390px (docs/screens/)
spotit (seeded, tapped and checked), loanwords lw1 (seeded), checkpoint (seeded), dialogues d-cafe, atlas, soundgap, workbook, home. NOT viewed: dialogues list, vocab, about credits (checked only that it mounts), dark mode, desktop width.
Fixed after viewing: Spot It target line read backwards (RTL container), "(missed)" labels wrapped cells, dialogue lines wrapped mid-sentence, Sound-gap fieldset widened the page to 414px, duplicate workbook labels (the memory-hook PDFs now say so), uneven Home tiles.

## Open defects that are not lane 8's
- From the QA list (docs/qa/DEFECTS.md): O2 ladder progress bar overlaps its status line (lane 1, `ladder.view.js`); O3 Hebrew letters in vocab glosses lack `lang=he` (lane 9); O4 unknown letter/text ids silently show a default, `?tab=drill|type` ignored (lanes 2, 5); O5 remainder: `#photo-online` (lane 6, scan.view.js) and `#vc-forms` (lane 9, vocab.view.js) are checkboxes with a sibling `<label for>`, so the click target is under 44px: wrap the input in the label; O6 plural copy "1 reviews due" (lanes 1, 9).
- `data/audio/manifest.json` is 1.78 MB and is precached only while under 2 MiB; it is also fetched on every boot by `src/app.js`. Lane 4 should consider splitting it.
- `src/curriculum/spotit.view.js` (lane 1): after "Check" the result shows the literal text "null" because `result.replaceChildren(..., fooled.length ? el(...) : null, ...)` stringifies null. Filter nulls.
- Sound gap table is slightly wider than 390px and is clipped by `main{overflow-x:clip}` rather than scrolled; the view should wrap it in `.table-wrap`.
- Atlas and Sound gap use their own inline CSS with fixed colours; dark mode not checked.

## Not verified
iOS/Android, install prompt, screen readers, keyboard-only walkthrough, CI on GitHub, correctness of Hebrew UI labels (all machine-drafted; new labels nav.loanwords/checkpoint/dialogues are drafts), the credits text has not been legally reviewed.
