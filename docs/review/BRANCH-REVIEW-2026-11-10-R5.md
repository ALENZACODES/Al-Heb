# Branch Review, Round 5 of 5: This Lane's Branch at 85dfa18fb

This is the final review round for the lane C lessons branch.

**GitHub CI is green** on `85dfa18fb`, on its parent `8688d38fe`, and on `8b897775f`. That covers the unit tests, the precache
diff step and the build. The precache failure that failed `2644862f3` and `57d6522ea` is gone.

**Local runs on this round's work:**
- 3,395 unit tests pass, 0 fail.
- First install is 3.93 MiB of the 4 MiB budget.
- The text scan finds only the one finding already on `main`.
- 0 broken doc links.

Scores are this reviewer's estimate, not a measurement.

## Score at 85dfa18fb: 90 / 100

## Fixes Found at 85dfa18fb

| # | Finding | Status |
|---|---|---|
| 1 | **Failed clips were not really pulled.** The hide list lived only in the untracked `gcloud-results.json`. On a fresh install or a deploy the view had no results file, so it showed all 67 items whose clips failed the speech check. | **Fixed:** `data/curriculum/practical/hidden-items.json` is committed and folded in on every load. A hidden item also loses its speaking prompt and pick-the-meaning round. Tested, including a rendered page. |
| 2 | **Level 1 not started:** no written pages beyond level 0. | **Partly fixed:** all ten `pu-cafe` pages are written (40 of 194 now). None uses a hidden item, and every Hebrew line is checked against its source. |
| 3 | **Dialogue lines have no clips.** That is now 20, across `d-smalltalk` and `d-cafe`. | Open. Needs a render. The test allows gaps only on dialogue lines. |
| 4 | **Two festival greetings are sourced only by the project's own lexicon** (from the merge). | Open. Listed for John and a rabbi. |
| 5 | **No native-speaker, teacher or cantor read.** | Open. Needs people. |
| 6 | **Held for John:** the divine-name decisions, בְּעֶזְרַת הַשֵּׁם, `pu-army`, and the single-course merge. | Unchanged. All holds are kept and tested. |

## Final Score With This Round's Fixes: 91 / 100 (Estimate)

What the branch now has that a learner sees:
- Liturgy and blessing fixes, pinned by tests.
- Three wrong Israel words corrected, with their stale clips off.
- 40 written Practical pages, each with:
  - a can-do line;
  - one grammar point with examples;
  - man and woman forms;
  - spaced review of earlier lines;
  - speaking prompts;
  - a pick-the-meaning round.
- 154 draft pages that no longer show file talk.
- Failed clips hidden.

To reach 95 to 100:
- The rest of level 1 written: restaurant, shop, directions, transport and small talk (+2).
- Clips for the dialogue lines and the three corrected words (+1).
- A native speaker on the Israel pages and a cantor on the synagogue lessons (+4). This is the only thing that can mark any line
  as reviewed.
- John's held decisions (+2).

None of those can be done honestly by this lane alone, except the remaining pages.
