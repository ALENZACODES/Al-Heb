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

## Review of the Brain Lab Games Branch With the 3D Studio Merged (Review Round 3 of 5)

This lane now owns the 3D Studio work as well (handoff of the `feature/brain-lab-games-2026-11-10` branch at `8cef9ebc`). I merged it into this branch (`4546c9b9`) and reviewed the result. For the review I ran:
- the full unit tier on a full checkout;
- the browser test of every game;
- axe (WCAG A and AA) on the page and all eleven studio games in light and dark;
- the audio each game requests in Chromium.

**Score for the merged branch as it arrived: 82/100.** The studio games are real games and play cleanly. Eight things held it back:

1. **Four unit failures already on the handed-over branch** (`data/audio/summary.json` counts, "every counted clip on disk", Man/Woman, clip lookup). Its holy-day clips were added without rebuilding the two generated audio files. Fixed: rebuilt with `tools/audio/summary.mjs` and `tools/vocab/build-clip-lookup.mjs`. The full unit tier now passes (3,502 tests, 0 failures).
2. **A learner-facing pack label named an outside tool** and the code used branch names. Fixed: the pack is "Hebrew for Synagogue and Israel" (`LIFE_GAMES`).
3. **Layout:** every pack section was upper-cased, and studio covers filled the card. Fixed: pack headings are in normal case, and covers are a 3:2 frame.
4. **Two class-name collisions** (`.lab-sky`, `.lab-drop`): studio CSS restyled Taxi Turns and Vowel Rain. Fixed: the studio uses `.lab-flock` and `.lab-sdrop`.
5. **Studio games left the "Hebrew You Met" list empty.** Fixed in all eleven. Star Search now lists the odd letter or syllable, not the vowel sign names.
6. **Ten of the eleven studio games were silent.** Only Echo Hunt played Hebrew. Word Burst, Root Forge and Path Word had no recordings attached even though Letter Pattern has them for the same words. Fixed (round 9 below).
7. **Vowel Storm named kamatz and tzere for "a" and "e" to Ashkenazi learners**, who say kamatz as "o" and tzere as a glide (`niqqud.json`). Fixed: those learners see patach and segol only.
8. **Some studio covers draw Hebrew letters into the picture,** which the house style avoids. Not fixed here: that is for the images lane.

After the fixes, axe found nothing on the page or any studio game, in light or dark, and the browser test plays all 27 games to their results card.

## Round 9: The Studio Games Speak

| Round | Commit | Score | What changed | What would raise it |
|---|---|---|---|---|
| 9 | this push | 95 | Merged the 3D Studio games (27 games in three packs), with the eight fixes above. Studio games speak their Hebrew on a right answer: the word in Word Burst, Root Forge and Path Word (803 of 929 family words have a recording, shared with Letter Pattern through `familyClipRows`); the number in Migration Birds; and, to level 3, the letter name in Letter Sequence and Tile Turn and the syllable in Speed Match and Vowel Storm. A syllable plays only where the learner's tradition says its consonant the Israeli way (`syllableTraditions`, from the consonant tables), so a Sephardi learner never hears an Israeli Chet or Resh as theirs. The audio list names the studio games beside the items they share. | Below. |

Checked in Chromium: Word Burst, Migration Birds, Letter Sequence, Speed Match, Tile Turn and Vowel Storm request their recordings when answered correctly. Root Forge and Path Word use the same code path and are covered by the unit test of their word lists, but were not played to a correct answer in the browser.

## What Would Take It From 95 to 98 and Up

1. **John's held decisions:** Barchu and the other prayer items holding a divine name (Hagomel, Sim Shalom, the after-Haftarah blessing, Elohim and Eloheinu in Prayer Chain, Mourner's Kaddish). The four-letter Name is never voiced.
2. **35 held recordings** (44 rows in the audio list) need a person to listen. Until then Brain Lab shows their written sound.
3. **Recordings not made here (no voice service in this workspace):** the 14 month names, then priority 2 in the audio list (126 family words, 27 syllables). The 28 Sephardi and Ashkenazi items need checked respellings before any recording.
4. **Pictures:** the 23 still on order for the six synagogue-and-Israel games, and studio covers redrawn without letters.
5. **A native speaker** checks the game titles and the café and direction transliterations.
6. **A real phone and a screen reader.** Everything here ran in headless Chromium.
