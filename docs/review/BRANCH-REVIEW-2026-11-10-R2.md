# Branch Review, Round 2 of 5 (2026-11-10)

Against `main` at `b574744f6`, at the branch tips on GitHub at 03:00 Toronto time. For each code branch: the full unit tier
(`npm test`), the text scan (`node tools/meta/scan.mjs --text`) and merge checks against `main` and this lane's branch
(`git merge-tree`). Scores are this reviewer's estimate of merge readiness, not a measurement. Round 1:
[`BRANCH-REVIEW-2026-11-10-R1.md`](BRANCH-REVIEW-2026-11-10-R1.md).

The one text-scan finding on `main` (`tests/audio.music.test.js:137`) still shows on every branch and is not counted below.

| Branch | Tip | Unit tests | Text scan | Merge with main | R1 → R2 |
|---|---|---|---|---|---|
| `overnight/launch-ready-2026-11-10` | `e793e5f83` | 3,442 pass, 0 fail | clean | clean | 88 → **90** |
| `fix/launch-readiness-2026-11-10` (new) | `ca33bdf59` | 3,312 pass, 0 fail | clean | clean | – → **86** |
| `feature/commercial-images-2026-11-10` | `c0eea428e` | unchanged since R1 | unchanged | clean | 82 → **82** |
| `feature/brain-lab-graphics-2026-11-10` | `bcc50a1a2` | unchanged since R1 | unchanged | clean | 80 → **80** |
| `feature/brain-lab-games-2026-11-10` | `c841923f7` | 3,348 pass, 1 fail | 15 lines in 5 files | clean | 72 → **74** |
| `feature/rimon-stills-2026-11-10` | `41f23b9ce` | 3,319 pass, 3 fail | 8 lines in 6 files | clean | 74 → **70** |
| `feature/lesson-integrity-2026-11-10` | `e2e93d76a` | 3,324 pass, 22 fail | see below | clean | 60 → **66** |

## overnight/launch-ready-2026-11-10 (90)

All 3,442 tests pass, the scan is clean, and it merges cleanly with `main`. Against this lane's branch only
`precache-manifest.js` conflicts; regenerate it with `node tools/build-precache.mjs` after the merge. It is ready to merge first.

## fix/launch-readiness-2026-11-10 (86)

New since round 1. All 3,312 tests pass, the scan is clean, and it merges cleanly with `main`. Against this lane's branch it
conflicts in `src/shell/offline.js` and `tools/build-precache.mjs`, because both register on-demand files. Keep both sides' entries,
then regenerate the precache. It has about 130 fewer tests than the overnight branch, so check that it is based on a current
`main` before merging.

## feature/brain-lab-games-2026-11-10 (74)

Two of round 1's three failures are fixed. Still failing:

- `docs/INDEX.md` counts. Run the index builder, or update the counts by hand.

Still found by the text scan: a constant, a pack id, a pack card id and a learner-facing pack title named after a tool, plus
comments, in `src/lab/lab.core.js`, `src/lab/lab.games.js`, `src/lab/lab.view.js`, `tests/lab.core.test.js`
and `tests/warm-routes.test.js`. Rename them to something neutral (for example `NEW_GAMES`, pack `new`, "New Games"). Learners see the
pack title, so this blocks merge.

## feature/rimon-stills-2026-11-10 (70)

Down from round 1. Three precache tests fail. Run `node tools/build-precache.mjs`, and give any new on-demand path a group in
`src/shell/offline.js`. The text scan now finds the tool name in eight lines across six files, up from four:

- `data/images/rimon/README.md`
- `data/images/rimon/legacy/README.md`
- `docs/images/rimon-name-options.md`
- `docs/images/rimon-stills-catalogue.md`
- `src/shell/rimon-stills.js:78`
- `tools/images/rimon-stills-index.mjs:2`

Replace the tool name with "v2 order" where it labels the still order, and drop it where it names a reader.

## feature/lesson-integrity-2026-11-10 (66)

Down from 35 failing tests to 22. Most are audio and precache files that are out of date after lesson-word inserts:

- clip lists and coverage
- cost plan
- recording kit
- word manifests
- priority CSVs
- soundwords
- on-demand groups
- committed outputs
- privacy `STORE_KEYS`

Running the builders listed in the round 1 review in order should clear most of them. One failure is a real check:
`corpus reader: every line and word id as read.view.js requests them`.

The Practical course is the strongest part of the branch: 33 units, 162 pages, a route, a view, progress and a clip map. Two
problems:

- **All 162 page grammar notes describe data files** ("This page uses only Hebrew already stored in data/corpus/phrasebook.json…")
  instead of teaching grammar. This lane's round 3 has real notes for the first 20 pages, in the same page shape
  ([`../curriculum/PRACTICAL-200-PAGE-PLAN.md`](../curriculum/PRACTICAL-200-PAGE-PLAN.md)). The branch's own plan says such
  pages should replace its drafts.
- **Two files carry words the text scan bans:**
  - `docs/curriculum/BABBEL-STYLE-CURRICULUM-PLAN.md`, lines 7 and 165, names a tool lane.
  - `tools/curriculum/gcloud_practical_test.py`, line 5.

  Neither was confirmed by a scan run this round; confirm before merge.

The round 1 liturgy fixes are still not in the branch. Against this lane's branch it conflicts in `lessons.json`, four
intermediate lesson files and derived vocab files. Take this lane's side for the lesson text, then rebuild the derived files.

## Suggested Merge Order (Unchanged in Spirit)

1. `overnight/launch-ready-2026-11-10` (green).
2. `fix/launch-readiness-2026-11-10` (green; regenerate the precache).
3. `feature/commercial-images-2026-11-10`, then `feature/brain-lab-graphics-2026-11-10`.
4. `feature/brain-lab-games-2026-11-10` once renamed and the index is fixed.
5. `feature/rimon-stills-2026-11-10` once the scan and precache are clean.
6. This lane's branch (green), then `feature/lesson-integrity-2026-11-10` once its tests pass,
   with the Practical pages from this lane folded in.

Nothing merges to `main` without John.
