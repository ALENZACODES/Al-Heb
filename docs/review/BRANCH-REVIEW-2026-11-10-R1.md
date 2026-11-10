# Branch review, round 1 of 5 (2026-11-10)

Branches reviewed against `main` at `b574744f6`: `overnight/launch-ready-2026-11-10` and the five `feature/*-2026-11-10` branches.
For each: the unit tier (`npm test`, the full suite on the code branches, the image and precache tests on the image branches), the
text scan (`node tools/meta/scan.mjs --text`), merge checks against `main`, against the overnight branch and against this lane's
branch, and a read of the diff. Scores are this reviewer's estimate of merge readiness, not a measurement.

One finding is on `main` already and shows in every branch: the text scan flags `tests/audio.music.test.js:137` (a regex that lists
vendor names to keep them out of track groups). Allowlist it in `tools/meta/text-allowlist.json` or build the regex without the names.

| Branch | Unit tests | Text scan (beyond the one on main) | Merges | Score |
|---|---|---|---|---|
| `overnight/launch-ready-2026-11-10` | 3,338 pass, 0 fail | none | clean with main; with this lane's branch only `precache-manifest.js` (regenerate) | **88** |
| `feature/brain-lab-graphics-2026-11-10` | image tests pass; precache list stale | none | clean everywhere | **80** |
| `feature/commercial-images-2026-11-10` | image and precache tests pass | none | clean everywhere | **82** |
| `feature/rimon-stills-2026-11-10` | precache list stale (2 tests) | 4 (tool name in three docs) | conflicts with overnight in `assets/css/rimon.css` | **74** |
| `feature/brain-lab-games-2026-11-10` | 3,321 pass, 3 fail | 9 (pack id and constant named after a tool) | clean everywhere | **72** |
| `feature/lesson-integrity-2026-11-10` | 35 fail | none | conflicts with this lane's branch in 5 files | **60** |

## overnight/launch-ready-2026-11-10 (88)

Good: Rimon reminders are opt-in after the first win with rest-day and quiet-hour rules, gender-neutral copy, answer feedback band,
robots.txt and sitemap, warm-route prefetch, and tests for each (rimon-reminders, rimon-show, warm-routes, update.missing-page).
Fixes:
1. It includes none of the five feature branches yet; merge them into it in the order below and rebuild the precache after each.
2. `assets/css/rimon.css` conflicts with `feature/rimon-stills`; keep both rule sets (the overnight one sizes the bubble, the
   stills branch adds still classes).
3. `docs/deploy/WEB-PUSH-PROPOSAL-2026-11-10.md` is a proposal; make sure nothing in the app says push reminders exist.

## feature/brain-lab-graphics-2026-11-10 (80)

Covers, win pictures and a new-best rosette, decorative and fail-safe. Fixes:
1. Run `node tools/build-precache.mjs` (the on-demand list is stale; `tests/integration.test.js` "precache: skips vendor...").
2. The two contact sheets in `docs/images` (137 KB and 208 KB) are review aids; fine in docs, keep them out of the app paths.

## feature/commercial-images-2026-11-10 (82)

Store key art, Play feature graphic, link preview, screenshot heroes. Tests pass. Fixes:
1. `KEYART_v2_og-1200x630.png` (780 KB) and `ICON_v2_plate.png` (620 KB) are heavy for a link preview; add WebP or compressed PNG
   copies under 300 KB for the web, keep the originals for the stores.
2. The commit says "with the Aleph logo"; the product name rule is ALEF in English. Check the wordmark spelling on every image.

## feature/rimon-stills-2026-11-10 (74)

125 Rimon stills, contact sheets, a 200-pose catalogue and a gender-neutral voice note. Fixes:
1. Three docs name a coding tool (`data/images/rimon/README.md:16`, `docs/images/rimon-name-options.md:1`,
   `docs/images/rimon-stills-catalogue.md:3-4`); reword ("for John", "the mascot lane") so the text scan passes.
2. Run `node tools/build-precache.mjs` (two precache tests fail on the stale list).
3. Resolve `assets/css/rimon.css` with the overnight branch (see above).

## feature/brain-lab-games-2026-11-10 (72)

Ten 75-second 3D Studio games built from verified letters, syllables and word families, divine-name items held, logic tests. Fixes:
1. The text scan fails on a pack id and an exported constant named after a coding tool (`src/lab/lab.art.js:14`,
   `src/lab/lab.core.js:46,48`, `src/lab/lab.view.js:7,208`, `tests/lab.core.test.js:5,16,24`, `tests/lab.studio.test.js:44`).
   The constant is an empty array: delete it and the third pack id, and drop the tool name from the test regex.
2. `tests/cognitive.test.js` ("motion audit: ... new animations require a motion review"): add the new CSS 3D tile and burst animations to the reviewed
   motion inventory, with their reduced-motion and calm-mode behaviour.
3. `tests/docs.index.test.js`: `docs/INDEX.md` counts are off after the new docs; update the table.
4. Run `node tools/build-precache.mjs`.

## feature/lesson-integrity-2026-11-10 (60)

This is a second branch on the same lane. Its strongest work is real: Hallel refrain verses from UXLC (Psalms 113, 115 to 118) and the
festival Kiddush from Torat Emet, each with a snapshot and source, wired into I-07, I-29 and I-30, plus a clear decisions memo
(`docs/review/JOHN-DECISIONS.md`) and a rabbi checklist. Fixes before it can merge:
1. **35 unit tests fail**: the audio summary and manifests (new lesson-word clip slots without mp3 files, `summary.json` counts),
   voice kit and cost plan, syllabus, word-vocab map, vocab packs and overrides, festival vocab, typing drills, roots, speak sets,
   pronunciation shards, wordtrace bank, precache. Each names the builder to run; the audio ones need either the clips or the slots
   removed until the clips exist.
2. **Learner-facing text uses internal words in 9 places** ("the corpus", "corpus gap (g-hallel)") in titles and goals of I-07, I-28,
   I-29, I-30, I-31 and I-34.
3. **Liturgy slips still present** (fixed on this lane's branch): the leader's Priestly Blessing answered Amen (I-10), an Amen after
   "ki l'olam chasdo" mid-blessing (I-33), "gentlemen" for the zimun (I-33).
4. The intermediate authoring sources (`tools/curriculum/intermediate/*.py`) were not updated, so a rebuild would drop the Hallel work.
5. Merging it with this lane's branch conflicts in I-07, I-29, I-30, `lessons.json` and the lint baseline. The resolution was worked out
   and tested here (keep its new Hallel and Kiddush content, keep the plain goal wording: "Know that ALEF has selected Hallel verses,
   not the full Hallel; follow the rest in your congregation's siddur" and the like). The merge was then backed out, not pushed,
   because of fix 1: those 35 failures need the builders run first.

## Suggested merge order

1. `overnight/launch-ready-2026-11-10` into `main`.
2. `feature/brain-lab-graphics`, `feature/commercial-images` (clean), then `feature/rimon-stills` (resolve `rimon.css`), each after its
   fixes; rebuild the precache after each.
3. `feature/brain-lab-games` after its four fixes.
4. This lane's branch (lesson integrity and Israel units; regenerate `precache-manifest.js` on conflict).
5. `feature/lesson-integrity` last, after its fixes, using the conflict resolution above.
