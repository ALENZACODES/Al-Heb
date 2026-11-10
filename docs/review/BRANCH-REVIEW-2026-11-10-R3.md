# Branch Review, Round 3 of 5: This Lane's Branch at 57d6522ea

The branch is the lane C branch (lane C, lessons). It was checked against `main` at `b574744f6`.

What was run at `57d6522ea`:
- 3,342 unit tests pass, 0 fail.
- The text scan finds only the one finding already on `main`.
- 0 broken doc links.

What was read:
- every Israel-track lesson word against the vocabulary file;
- every lesson-word clip's text against its lesson word;
- the merge picture against the other branches.

Scores are this reviewer's estimate, not a measurement.

## Score at 57d6522ea: 84 / 100

| Area | State at 57d6522ea |
|---|---|
| Liturgy, blessings, holiday text | Round 1 fixes pinned by 14 tests. Divine-name items held for John. |
| Israel lesson Hebrew | **Three wrong words still taught** (below). |
| Practical course | 194-page outline; 20 pages written; schema; 10 tests. |
| Audio honesty | Lesson-word clips were never checked against the lesson text. |
| Merge readiness | Green on its own. Conflicts with the feature branch, `fix/launch-readiness` and every branch's `precache-manifest.js`. |

## Fixes Found, and What Happened to Each

1. **Three Israel lesson words meant something else, in a lane whose job is lesson integrity.** Rounds 1 to 3 missed them.
   - I-16 taught מִטְעָן (cargo) as "charger".
   - I-37 taught קוֹרֵס (collapses, from קָרַס) as "course".
   - I-40 taught מִפָּה (to map) as "map".

   **Fixed this round** with מַטְעֵן, קוּרְס and מַפָּה. The lesson files are now byte-identical to the feature branch's, so these
   hunks merge cleanly. I-40's word for near now points at the "near" sense, not "relative". The authoring sources and all
   derived files were updated.
2. **The old clips said the old words.** The text could be fixed while the app kept playing "mit'an". **Fixed:** the six rows
   are marked missing, the six mp3s are removed, and a new test checks that every lesson-word clip says its lesson word.
   - The feature branch still ships the old clips under the corrected text, and its Practical clip map points at them. It needs
     the same change.
   - The new test allows one pointing-only difference (`i-42-w11`, בֶּן vs בֵּן; both are said *ben*).
   - It also allows clips for lesson lines with the divine name, which voice the read-aloud form. That is the held decision.
3. **Written-pages file named for a count** (`first-20.json`). **Fixed:** renamed `written.json`, with the readable copy at
   `PRACTICAL-WRITTEN-PAGES.md`. The test now requires the written pages to be the first pages of the outline, with matching
   kinds.
4. **Level 0 half written.** **Fixed:** `pu-numbers` p03–p07 and `pu-introducing` p01–p05 were added. All 30 level-0 pages are
   written, with 143 items.
5. **Dialogue lines have no clips.** Still open. There are now 8 gaps, all `d-smalltalk` lines. The test allows gaps only on
   dialogue lines.
6. **Two Israel courses on one branch** (`#/israel-units` and the Practical outline). Still open: it waits for John's merge
   decision. It is kept for now so the branch has a working course on its own.
7. **v3 page fields are not shown in the app.** Still open. The view lives on the feature branch.
8. **Merge conflicts.**
   - `precache-manifest.js` with every branch: regenerate it.
   - `src/shell/offline.js` and `tools/build-precache.mjs` with `fix/launch-readiness`: keep both sides.
   - `lessons.json` and four lesson files with the feature branch: take this branch's liturgy text, then rebuild.
9. **Native review.** Still open. Nothing here has a native speaker's or cantor's read.

## Score After This Round's Fixes: 88 / 100 (Estimate)

To reach 95:
- John's merge decision, and the v3 fields in the Practical view (+3).
- Clips for the three corrected words and the dialogue lines (+1).
- Levels 1 and 2 written (+2).
- Native-speaker and cantor review (+4), and the divine-name decisions (+2). These need people.
