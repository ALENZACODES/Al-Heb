# Branch Review, Round 4 of 5: This Lane's Branch at 8688d38fe

The branch is the lane C lessons branch. It now contains the lesson-integrity feature branch, merged in at `b10b5e9a8`. It was
checked against `main` at `b574744f6`.

What was run at `8688d38fe`:
- 3,392 unit tests pass, 0 fail.
- `node tools/build-precache.mjs` leaves `precache-manifest.js` unchanged. That is CI's step, which failed on `57d6522ea`.
- The first-install precache is 3.93 MiB of the 4 MiB budget (`check-deploy`).
- The text scan finds only the finding already on `main`.
- 0 broken doc links.

Scores are this reviewer's estimate, not a measurement.

## Score at 8688d38fe: 88 / 100

What lifted it from round 3:
- **One lesson branch.** The live `#/practical` course (36 units, 166 draft pages), the festival Hallel and Kiddush lines and the
  tradition playback work now sit on the same green branch as the liturgy fixes. The feature branch's own CI was failing; this
  branch passes.
- **The written pages are live.** The five level-0 units show their 30 written pages in `#/practical`. Each page has:
  - the can-do line;
  - one grammar point with examples;
  - man and woman tags;
  - earlier lines brought back for spaced review;
  - speaking prompts;
  - a pick-the-meaning round, left out under "I do not use audio".
- **Holds kept.** `politeness-21` is held for John and never reaches the page (tested). `pu-army` is off the live set, and
  `#/israel-units` stays.
- **Wrong words fixed.** The three lesson words that meant something else (charger, course, map) are corrected, and their old
  clips are marked missing.

## Fixes Found

| # | Finding | Status |
|---|---|---|
| 1 | All 166 draft Practical pages showed learners a "grammar note" that described data files ("This page uses only Hebrew already stored in data/corpus/phrasebook.json…") or item ids. | **Fixed after 8688d38fe:** file-talk sentences are removed before display. 32 of 36 unit notes keep their real grammar sentence. A test checks every note. |
| 2 | The Practical intro said "not a new lesson track… does not change the 125 lessons". That is internal wording. | **Fixed:** "Short practice pages for real situations. They add practice to your lessons and do not change them. A native speaker has not checked them yet." |
| 3 | 136 live pages (levels 1 to 4) are still draft pages: no grammar point, no speaking prompts, no pick-the-meaning round. | Open. This is the biggest remaining gap. Level 1 is next (53 outline pages). |
| 4 | The merge brought in two festival greetings sourced only by the project's own lesson lexicon: `גְּמַר חֲתִימָה טוֹבָה` (I-50) and `חַג כָּשֵׁר וְשָׂמֵחַ`. They are the usual greetings, but no outside source in the repo attests them, which this lane's no-invented-Hebrew rule asks for. | Open. Listed for John and a rabbi; not removed. |
| 5 | Three corrected lesson words and 8 dialogue lines have no clips. | Open. Needs a render. The review lane's Cloud check covers new items only. |
| 6 | The divine-name lesson lines play clips that read the substitute aloud. The clip-text test allows this case explicitly. | Held for John (unchanged). |
| 7 | Two Israel courses (`#/israel-units` and `#/practical`). | Held for John (unchanged). |
| 8 | No native-speaker, teacher or cantor read. | Open. Needs people. |

## Score With the Two Fixes Above: 90 / 100 (Estimate)

To reach 95:
- level 1 written to the same standard (+2);
- clips for the gaps (+1);
- native and clergy review (+4);
- John's holds (+2).
