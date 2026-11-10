# Review cards, Progress, placement, streak: phone-size QA (2026-11-04)

**Scripted emulation, not real learners.** A script drove headless Chromium at 375x667 (locale en-CA, time zone America/Toronto) against a local static server of the repo, with the page clock moved by overriding `Date` (the same technique as `tools/qa/journey.mjs`). The script clicked the real screens for review, Today, Progress and placement; it created lessons and some review ratings through the app's own `actions.js` and `streak.js` functions where noted. It says nothing about whether a person would understand or enjoy these screens, and it did not test sound (headless Chromium has no voices). The scripts were scratch files and were deleted; this document is the record. Console errors, page errors and failed requests: 0 in every run listed here,.

Simulated period: Monday 2026-11-09 to Sunday 2026-11-22, each day opened at 09:00 Toronto time.

## Defects found and fixed (src/curriculum/review.view.js)

1. **Grade buttons were not reachable after "Show answer" on a 375x667 screen.** The fixed bottom bar (57 px, top edge at y=610) covered the Again and Hard buttons, and Good and Easy were below the screen edge (group bottom at y=718 on a 667 px screen). The old code called `scrollIntoView({block:"nearest"})` and stopped short. Measured before the fix, 20 cards per tradition, answer shown, scroll settled for 1 s: all four buttons above the bar on 9 of 20 (Ashkenazi), 11 of 20 (Sephardi), 10 of 20 (Israeli) cards; the failures were all letter and vowel cards with a long answer. Fix: new `keepRatingsInView()` scrolls instantly (no animation) until the rating group's bottom is 8 px above the fixed bar, rechecked after one animation frame and after 250 ms. After the fix, the same run: all four buttons above y=610 on 20 of 20 cards in each of the three traditions (largest bottom edge 602). Word cards (short answer) were already fine.
2. **"Easily confused with: ." on the Shin card.** The look-alike data set `shin-sin` in `data/letters/confusables.json` lists only `shin`, so the other-letters list came out empty and the answer read "Easily confused with: . Shin has its dot on the upper right...". Fix: `confusedHint()` shows the hint alone when there are no other letters. The empty form was seen in the card run before the fix; after the fix that card was not re-opened in the browser (the unit tests in `tests/curriculum.learnflow.test.js` pass).

Tests run after the changes: `tests/curriculum.learnflow.test.js`, `curriculum.reviewpics.test.js`, `curriculum.progress.test.js`, `images.review.test.js`, `letters.progress.test.js`: 41 pass, 0 fail. `node tools/meta/scan.mjs --text` passes. The full unit suite was not run. Note that `review.view.js` already had uncommitted edits from before this pass (its diff is larger than the two changes above).

## 14-day schedule: intervals

Plan: lessons r01 and r02 on day 1, r03 day 2, r04 day 5, r05 day 7, r06 day 9; review every day studied; Thursday day 4 and both Saturdays (days 6 and 13) skipped. Each session: the first two cards Again, one Hard, one Easy, the rest Good. 24 cards, 76 review events. Observed intervals (stored `due - lastReview`):

| Rating | Observed |
|---|---|
| Again | due in 0.007 days (10 minutes) every time |
| first Good on a new card | 3 days |
| first Easy | 8 days |
| first Hard | 1 day (stability 1.2) |
| Good again after a 4-day wait | 11 days (stability 3.0 to 10.96) |
| next review after an Again | 1 day or 3 days in the trajectories printed (stability 1.01 gave 1 day, 2.57 gave 3); the rating used on that review was not logged |

In the 14 card trajectories printed, intervals grew after successful reviews and dropped to 10 minutes after Again; a card that lapsed four times (`vowel:patach`) never went beyond 2 days. This is the app's own scheduler, not fitted to data (see the header of `src/curriculum/srs.js`); the observation is only that the numbers behave sensibly, not that they are optimal. Cards from a lesson completed today are due immediately (10 cards due right after r01 and r02 on day 1).

## Due counts: Today card, store, review screen

For each studied day, three numbers compared at the start of the day: the "N cards due" text on Today, cards with `due <= now` in the store, and "Card 1 of N" on the review screen. Two runs of the 14 days (11 studied days each): all three agreed on 21 of 22 days. One day (day 12, run without the streak freeze) read 4, 4, 5; likely a card falling due a few seconds after the page opened in the simulated clock, not verified.

Backlog test (34 cards due after completing r01 to r08, all set due): Today primary button reads "Review 34 due cards first" and the due line "34 cards due"; the review screen opens at "Card 1 of 20" (cap of 20 per session); the summary says "14 cards still due"; Today afterwards shows "14 cards due" as a link under the lesson button. Consistent.

## Streak and freeze over the 14 days

| Case | Observed |
|---|---|
| Day counts only after 300 engaged seconds (clock advanced in 55 s steps with a pointer event) | Reviewing alone did not add a day; Today read "Today is not counted yet" until the 5 minutes were done, then "Streak: N days and counting. Today's 5 minutes are done." |
| Missed Thursday (day 4), freeze off (default for a profile with no observance set) | Friday: "Streak: Paused. Your best streak was 3 days"; finishing Friday restarted at 1, best kept at 3 |
| Missed Saturday, freeze OFF | Sunday restarted at 1 (streak broken) |
| Missed Saturday, freeze ON (store `morning.prefs` freeze true) | Sunday counted 2 (Friday 1, Saturday frozen), `frozenDates` held 2026-11-14; second Saturday 2026-11-21 frozen too; day 14 reached 8 with best 8 |
| Today card against Progress "Today" line | Same count on the days compared by eye (for example day 12 without freeze: 6 and 6); not compared programmatically |

Observation (not fixed, `src/home/today.js` is not mine): on a frozen Saturday the Today card reads "Streak: 7 days. Today is not counted yet." with no mention that today is a rest day. Progress has a rest-day button and wording; whether the Today card should say so is a design call.

## Review card contents

- Show answer, then 1 to 4 (also keys 1 to 4): the hint panel appeared only after Again, once per error kind; sessions completed and saved on every run.
- Per-tradition text on letter and vowel cards, same 20 cards, three settings: 7 of 20 differ and 13 are identical. Examples observed: Kamatz "aw as in saw (Barukh -> Bawrukh) [ɔ]" (Ashkenazi), "a as in father [a(ː)]" (Sephardi), "a as in father (short, no glide) [a]" (Israeli); Tzere "ei as in they" / "e as in bed [e(ː)]" / "e as in bed (a few words and speakers say ei as in they)"; Tav "s without dagesh (Shabbos), t with dagesh" (Ashkenazi) against "t" for the other two; Alef "silent" (Ashkenazi) against "silent / a glottal stop between vowels (uh-oh)". The Hebrew names (for example חִירִיק) come from the data files and were not edited.
- **Word cards show no Latin respelling in any tradition**: the answer is the English meaning plus a Listen button. The respelling engine exists (`src/pronunciation/forTradition.js`, `respell()`), but the review card does not call it. Not changed.
- Word pictures: `data/images/approvals.json` has 0 approvals; `data/curriculum/word-vocab-map.json` maps 648 lesson words, and 0 of them have an ingested image in `data/img/index.json`. With the real data no word card shows a picture. The gating was checked with a synthetic index (every word given an 800 px file) and synthetic approvals, one card (`word:r02:2`, "daughter"): no approvals and the "show unapproved" setting off: no picture; setting on: picture; that image approved and setting off: picture. The picture appears on the answer side only (code reading; the front side was not screenshotted). The image bytes in that run were a stub, so nothing was checked about how a real picture looks.

## Empty states

| State | Observed |
|---|---|
| `#/learn?review=1` with no cards | "Nothing due. No reviews are due. Complete a lesson to add cards, or come back later. All caught up." with Lessons and Home buttons; no horizontal overflow |
| `#/learn?lesson=zz99&review=1` | "There is no lesson "zz99"." with an All lessons link |
| `#/learn?lesson=r01&review=1` with nothing created | Not empty: it creates r01's 6 cards and starts (documented in the file header). Side effect seen on Today afterwards: "6 cards due" while no lesson is completed |
| Lesson review when its cards are not due | "Nothing due. No cards from this lesson are due right now. 14 cards still due" |
| Progress on a fresh profile | Renders all 10 sections, 0 console errors, no horizontal overflow (375 px wide, no element past the edge); zeros, "none started", "Finish your first lesson and this panel will list..." with a Start a lesson button; week reads "At least 0 minutes engaged", "0 of 7 days", "No rest days in this week" |

## Progress page with data (375x667)

Seeded over days 1 to 5 through the app's own functions: lessons r01 to r04, letter cards Bet (Again on 4 days, Good once, 4 lapses), Shin (2 lapses), Tav (0), 5-minute goal reached on days 1, 2 and 4, opened on day 5.

- Worth another look: Bet first ("Slipped 4 times in review"), Shin second ("2 times"), each with a "Practice this" link to `#/spotit/<letter>` (which opens a screen labelled Preview, unreviewed).
- This week: "At least 15 minutes engaged", "3 of 7 days reached the daily goal", "3 cards reviewed", "Streak: 1 day"; the 8-week graph text "0, 0, 0, 0, 0, 0, 0, 4" (4 lessons finished). All equal what was seeded.
- Milestones: 5 rows, all "Not yet" with counts (for example "First 100 words started in review (0 of 100)"), as expected for 3 reviewed letter cards.
- No horizontal overflow; 0 console errors.

## Placement test (375x667)

- Start screen, then 20 questions in one run (answers all correct): the Next button sat above the fixed bar on every question; result "Your answers fit lesson r42 ... that lesson is still locked. Start with lesson r01", button "Start lesson r01" at y=568.
- Second run, all wrong: the check stopped after 6 questions; result "Lesson r01 ... 0 of 6 answered correctly" and a "Go to this lesson" button whose bottom edge was at y=654, under the fixed bar until the page is scrolled a little (the bar is 57 px tall; not changed).
- Stored `placement.v1` held the answers and `result` in both runs; no overflow, 0 console errors.

## Not checked

- Sound on any screen; real devices; a screen reader; dark mode; any width other than 375.
- Streak across a clock change or time zone move; Israel and traditional observance modes (covered by `docs/qa/STREAK-FREEZE.md`).
- The review screen with more than 20 cards of a single lesson; the keyboard flow was exercised only through clicks on the rating buttons in these runs.
- Whether `scroll-behavior: smooth` on the page element has other side effects; the fix uses an instant scroll only for the rating group.

## Findings left for other owners (no diffs made)

- `src/home/today.js`: no rest-day wording on a frozen Saturday (above).
- `src/curriculum/review.view.js` deep link `?lesson=<id>&review=1` seeds cards for a lesson the learner has not completed, which raises the Today due count; this is documented behaviour in the file header, listed only because Today does not distinguish those cards.
- No changes were made to firstday, home, today, settings or router files.
