# Brain Lab Games: Review Rounds (2026-11-10)

Seven rounds on the night of November 10. Each round was scored 0 to 100 against the brief (new Brain Lab games that teach Hebrew and are genuinely fun, a picture order for every game, a GitHub status, tests) and against John's standing goals: the look of the app, the first minute, standing up to Duolingo, rabbi appeal, and launch readiness. The score says what was checked, not what was hoped.

| Round | Commit | Score | What changed | What would raise it |
|---|---|---|---|---|
| 1 | `7b82ce43` | 70 | Six new games (Sound Twins, Vowel Rain, Middle Letter, Taxi Turns, Café Order, Prayer Chain) with rules in `lab.core.js`, word lists built from the dictionary and sound tables, unit tests including random-tapping checks; hub grouped by skill with tokens and New marks; stars and "Hebrew You Met" on results; No time limits honoured. | Rimon covered Play again on results; no pictures wired; the first ten games had no word list on results; no picture order yet. |
| 2 | `ecb73d4b` | 78 | Results lead with the actions; "in a row" counter; every game fills "Hebrew You Met"; Noa's and Ari's approved portraits take the café orders; slots for every picture already ordered for Brain Lab. | No picture order for the new games; untested in dark mode; Prayer Chain too hard for someone who cannot read every vowel yet. |
| 3 | `e97de3f5` | 84 | Picture order for the six games (41 pictures); dark mode fixed (score, stats and word list were dark on dark, partly before today); Prayer Chain shows how each choice is said in the learner's tradition. | No browser test; no accessibility scan; a rabbi might object to Mourner's Kaddish as a game; reduced vowels fell under letters that never take them. |
| 4 | `34206408` | 88 | Browser test plays all sixteen games to their results; axe (WCAG A and AA) clean in light and dark; Mourner's Kaddish left out of the games; chataf only under the throat letters; Brain Lab notes and GitHub status written. | Rimon is only in the corner, not in the games; returning learners do not see the new games first; Rimon waved on every return to the list. |
| 5 | `f908ed0f` | 90 | Rimon cheers on every results card from his own sprite sheets; "New Games to Try" at the top; Rimon waves once per visit; Sound Twins lists every letter met. | Vowel Rain's buttons wrapped and fell below the fold on a 360 px phone. |
| 6 | `2bc4c0b8e` | 91 | Vowel Rain fits a 360 px phone; the drop falls to the ground on any sky height; Tav without its dot is "Sav" for Ashkenazi learners; wide screens show the new games and skills in rows. | See round 7. |
| 7 | `4258e646` | 94 | Merged the integration branch back and reconciled the art: the drawn pack now shows covers, board pictures and results for all sixteen games, the ten drawn tokens and the hero are on the page, and the four new games place their own pictures (card face, sky, road, café counter) instead of a mat that turned the road cream. Unit tests, the browser test of all sixteen games and axe re-run after the merge. | Below. |

## What Would Take It From 94 to 97 and Up

1. **The last pictures:** the six new tokens, the seventeen café menu pictures, the raindrop and the taxi (23 in `docs/images/BRAIN-LAB-NEW-GAMES-ORDERS-2026-11-10.md`). Each already has its slot; no code change is needed. John's look at the drawn Brain Lab pack, which is shown directly rather than through the approval list.
2. **A native speaker** checks the six new Hebrew titles and the café and direction transliterations (they come from the dictionary's style, for example "semolah" where speakers say "smola").
3. **John's held decision:** whether names other than the four-letter name (Elohim, Eloheinu) should also be filled in, never chosen, in Prayer Chain; and whether Mourner's Kaddish stays out.
4. **Ten café words are silent** (cake, juice, ice cream, chocolate, soup, apple, orange, sandwich, lemonade, challah): their only recordings are in the 1.2 MB dictionary list, which Brain Lab does not load. Recording them into the word list, the same way as the other café words, would let every order be heard.
5. **A real phone:** everything here was checked in headless Chromium at 360, 390 and 1280 px; nothing was tried on an iPhone or with a screen reader.
6. **Rimon stills:** map the Brain Lab moments to stills 146 to 160 once the stills branch lands (table at the end of the picture order).

## Review of the Integration Branch at `8102de32` (Review Round 2 of 5, 3:45 AM)

Checked by running the branch: the Brain Lab unit tests, axe (WCAG A and AA) in light and dark, screenshots of the new games, and the audio files each game requests in Chromium.

**Score for Brain Lab on `8102de32`: 78/100.** It carries this lane's round 1 (`e97de3f5`) and the drawn art, but none of the later rounds, so:

1. **Taxi Turns and Vowel Rain look broken:** the board-mat backing paints the road and the sky warm white, so the sign floats on a blank panel and the lanes disappear. Fixed here: those games place their own picture (`own` in `lab.art.js`).
2. **Contrast:** the Hebrew skill names under All Games are 4.27:1 in light mode, and the Sound Twins "Different" button is 2.16:1 in dark mode (gold on the warm-white mat backing). Fixed here.
3. **Silent games:** Sound Twins plays nothing; ten café words, Letter Pattern, letter names and Vowel Rain's kamatz and tzere syllables are silent. Fixed here (see below).
4. **Vowel Rain wraps its fifth button onto a second row** on a 360 px phone, below the fold. Fixed here.
5. **Rimon covers Play again on the results card;** Rimon waves on every return to the list; there is no New Games strip. Fixed here.
6. **Content:** Mourner's Kaddish is played as a game, and chataf vowels fall under letters that never take them. Fixed here.
7. **No browser test** of the sixteen games. Added here (`tests/lab.browser.test.js`).

Merging the Brain Lab games branch into the integration branch brings all seven, and conflicts only in the generated `precache-manifest.js`.

## Round 8 (after the review): Letter Pattern Speaks

| Round | Commit | Score | What changed | What would raise it |
|---|---|---|---|---|
| 8 | this push | 96 | Merged `8102de32`. Letter Pattern says each right word (830 words have a recording; 518 of them were only in the dictionary list and are handed to the player by the game); prayer lines on the results list; contrast of Prayer Chain choices on the mat in dark mode. 1,109 of the 1,291 Hebrew items in Brain Lab can be heard (was 615). | Record Barchu and the ten holy-day names; the 23 pictures still on order; a real phone and a screen reader. |

The data Brain Lab fetches once per build grew to about 470 KB (the test budget moved from 450 to 500 KB for the Letter Pattern recordings list).
