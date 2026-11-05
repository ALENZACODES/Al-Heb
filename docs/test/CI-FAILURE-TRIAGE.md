# CI failure triage: ci run 41899215557 / pages run 41899215538

Pushed commit: c2dc882 (origin/main). Reproduced in a fresh clone of that commit
(Node 22, no extra installs) by running the failing test files one by one, then re-ran the
same files against a copy of the current working tree.

Note: the local branch and origin/main have no common ancestor (142 commits each side), so
"already fixed in the working tree" means the working tree content, not a descendant commit.
Most fixes below are uncommitted changes and only take effect once committed and pushed.

Method limits: only the 9 test files below were run, not the whole suite, on the working tree.
Whether the CI runner passes after a push has not been observed.

## Result per failing test (17 "not ok" lines in the log)

| # | Test (file) | Class | Cause / status |
|---|---|---|---|
| 151 | manifest.csv has one line per row (book.images) | a (b-type) | generated-manifest.json at c2dc882 had 797 rows, manifest.csv 1797. Passes on working tree (data/images/generated-manifest.json modified, uncommitted). |
| 157 | book HTML: 27 letter pages (book.overlay) | c, fixed | Runner had no python `segno`; pushed ci.yml had no pip step and the test had no skip guard. Working tree has both the pip step (segno==1.6.6 in ci.yml) and a `hasSegno` skip guard; passes locally. Reproduced only by reading the CI log (segno is installed here). |
| 520 | vocab.json equals builder output (festivals) | a | data/festivals/vocab.json stale at c2dc882; passes on working tree. |
| 522 | reading lines verbatim from corpus (festivals) | a | same cause (rosh-hashanah/h725d19e2); passes on working tree. |
| 587 | hebrew-lint baseline: 2 new definite errors | a | passes on working tree (data fixes uncommitted). |
| 625 | real manifest parses, stems unique (images.ingest) | a (b-type) | 797 vs 1797 rows, as #151; passes on working tree. |
| 646, 651, 652, 657 | redo / next1000 (images.redo) | a (b-type) | stale committed generated files (next1000.csv, groups, redo paste files); pass on working tree. |
| 653 | alt text matches a fresh build (images.redo) | d-candidate, OPEN | Still fails on working tree: committed `altText` in data/images/generated-manifest.json for `L18_tsadi_print_mnemonic` says "a kneeling figure, body leaning right..." while the builder now produces "a sitting cat with pointed ears on a flat base.". Fix is to run `node tools/images/alt_text.mjs` once someone decides which wording is intended. Not run by me because it rewrites a tracked data file that others are editing. |
| 663, 670, 674 | review page / block J altText (images.review) | a (b-type) | counts 37 vs 51 and 282 vs 432, and missing altText map; pass on working tree. |
| 675 | wrong aspect via python3 -I PIL (images.review) | c, fixed | Runner has no Pillow. Added `hasPil` skip guard to tests/images.review.test.js (same pattern already used in images.ingest and images.redo). Verified: passes with PIL, skips cleanly with PIL hidden by a stub. |
| 682 | run 3 rows appended, alt text (images.run3) | a | altText map missing at c2dc882; passes on working tree. |
| 685 | data/img/index.json in sync (img.index) | a (b-type) | stale committed index.json; passes on working tree. |

## Run results on the working-tree copy

book.images, book.overlay, festivals, hebrew-lint, images.ingest, images.review, images.run3,
img.index: all pass. images.redo: 1 failure (#653). 

## Changes made
- tests/images.review.test.js: skip the PIL-dependent test when Pillow is absent.
- (already in working tree, not by me) .github/workflows/ci.yml segno step, tests/book.overlay.test.js guard.

## Still needed
1. Commit and push the modified generated data (listed as `M` under data/) and tests together.
2. Resolve #653 (regenerate altText after deciding the L18 wording).
3. The "Precache manifest is current" CI step was not run here.
4. No category-d (real code) bug was found; every failure traced to stale committed generated data or a missing runner Python module.
