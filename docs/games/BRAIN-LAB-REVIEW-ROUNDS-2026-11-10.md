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

## Review of the Pushed Branch at `54a87d11` (Review Round 4 of 5)

Checked for this review:
- merged against the current integration branch (`overnight/launch-ready` at `1134fb94`, which adds retention: XP, a daily goal, hearts and a practice league) and against `main` (`81f9fc45`);
- read the code of every game that plays a recording;
- ran the Brain Lab browser test for the first time in WebKit, Safari's engine, with an iPhone 13's screen, touch and user agent.

**Score for `54a87d11`: 92/100.** That is lower than the 95 given in round 9, because this review found four things round 9 did not check:

1. **Brain Lab earned nothing toward the new daily goal.** The arcade and lesson games send `alef:game-finished`, which retention pays as game XP. Brain Lab never sent it, so once the branches meet, a learner's Brain Lab games would not move the goal ring. Fixed: the results card sends it, and retention pays as for any game (3 XP for one star or more, its own daily cap of 15). A browser test checks the XP rises, in Chromium and WebKit.
2. **Sound Match asked every tradition for the Israeli recording.** A Sephardi learner could be asked to pick an Israeli Chet or Resh as the sound they heard, which the studio games already avoided. Fixed: the syllable to find is one the learner's tradition says the way it is recorded (95 of 110 syllables for Sephardi, 95 for Ashkenazi, all 110 for Israeli). Any syllable can still be a wrong choice.
3. **Never run in Safari's engine.** In WebKit with iPhone settings, every game started and played normally. The test's random tapper sometimes timed out, though: Playwright waits for tiles that animate in to settle, and 400 ms was not enough under a long WebKit run. Falling syllables and flying birds never stop moving, so WebKit never treats them as ready, and Vowel Storm stalled under the tapper. A real touchscreen tap on a moving syllable in WebKit did register: with No time limits on, Vowel Storm finished in 12 seconds. Fixed in the test only: 1.5 s per tap on WebKit, then a tap at the element's position, as a finger would. `LAB_ENGINE=webkit` runs the whole test there, and `LAB_GAMES=hunt,twins` limits a run to some games.
4. **Behind the integration branch** by its five retention commits. Merging them brought three meta-scan findings from the retention files: a branch name in `docs/retention/IMPLEMENTATION.md`, and tool names written out in two retention tests. Fixed here, without changing what those tests check. The retention lane should know.

Not in Brain Lab, but seen in the Calendar Puzzle screenshot: Rimon sits on an opaque cream square over the dark page. That is for the Rimon lane.

`main` (`81f9fc45`) merges into this branch with conflicts in `.github/workflows/torah-fix.yml` and `docs/INDEX.md`. The workflow file is not this lane's, so `main` is not merged here. The integration branch should take `main` first.

## Round 10: Brain Lab Counts Toward the Daily Goal

| Round | Commit | Score | What changed | What would raise it |
|---|---|---|---|---|
| 10 | this push | 96 | Merged the integration branch (retention). Finished Brain Lab games pay game XP toward the daily goal. Sound Match asks only for syllables the learner's tradition says as recorded. The Brain Lab browser test runs in WebKit with iPhone settings as well as Chromium, and a new test checks the XP. Three meta-scan findings from the retention merge fixed. | Below. |

Checked after the changes:
- full unit tier: 3,567 tests, 0 failures;
- axe: nothing on the page or in Letter Hunt, Sound Match, Word Burst and Café Order, in light or dark, with the retention top bar on the page;
- the browser test in Chromium and in WebKit (results in the commit message).

WebKit in this workspace is the Safari engine, not an iPhone: real Safari on a real phone, and a screen reader, are still untried.

## What Would Take It From 96 to 98 and Up

1. **John's held decisions** on the prayer items that hold a divine name (Barchu, Hagomel, Sim Shalom, the after-Haftarah blessing, Elohim and Eloheinu in Prayer Chain, Mourner's Kaddish).
2. **A person listens** to the 35 held recordings.
3. **Recordings not made here** (no voice service in this workspace): the 14 month names, then the priority-2 list. The 28 Sephardi and Ashkenazi items need checked respellings first.
4. **Pictures:** the 23 on order, and the studio covers redrawn without letters.
5. **A native speaker** checks titles and transliterations.
6. **Real Safari on an iPhone, and VoiceOver.**

## Review of the Pushed Branch at `9afd77cc` (Review Round 5 of 5)

GitHub at the time of the review:
- `main` had three new Torah audio commits;
- no new pictures had landed for Brain Lab;
- the integration branch had not moved since this branch merged it.

So this round looked at the one area no earlier round had tested: playing without a touchscreen or without sight. I drove every game by keyboard in Chromium and WebKit, and checked what a screen reader is told.

**Score for `9afd77cc`: 93/100.** Each round's board replaces the last, and nothing put focus back:

1. **Focus was lost after every answer.** The pressed button went away with its round, and focus fell back to the page body, in Chromium and WebKit alike. A keyboard or switch player had to Tab through the header for every round of every game. Fixed: while the player is on the board, focus moves to the new round's first choice, including after a memory phase (Letter Matrix, Café Order, Letter Span). On multi-tap boards (Count Up, Root Forge, Word Burst), a tile that becomes disabled passes focus to the next free one. Checked on all 27 games: focus stays on a choice through six rounds of each.
2. **Right and wrong were not said in words.** A right answer was announced only as "+40". A miss was announced only if that game had something to say, and Sound Match, for one, said nothing. Fixed: the feedback line, a polite live region, starts with "Right." or "Not quite."
3. **A second press during the pause after an answer ran the round's handler again.** In Café Order it rewrote the feedback, and a stray tap anywhere did the same. Fixed: once a round is decided, taps on the board are ignored until the next round. The board carries `is-decided` meanwhile.
4. **The results card put focus on "Back to Brain Lab"**, so a screen reader heard the link's name and not the result. Fixed: the link is described by one hidden sentence, for example "Middle Letter: 2 of 3 stars, 210 points, 8 of 10 right. Your first score in this game."

## Round 11: Play by Keyboard and Screen Reader

| Round | Commit | Score | What changed | What would raise it |
|---|---|---|---|---|
| 11 | this push | 97 | The four fixes above, in `src/lab/lab.view.js`, so they hold for every game in every pack. A new browser test plays six games by Enter alone, one of each board style, in Chromium and in WebKit. It checks that focus is back on a live choice after every press, that right or wrong is said in words, and that the game ends on a link carrying the result. | Below. |

Checked after the changes:
- full unit tier: 3,567 tests, 0 failures;
- axe (WCAG A and AA), light and dark: nothing on the page, in Middle Letter, in Root Forge, or on the results card of Middle Letter and Word Burst;
- meta scan: only the finding already on `main`.

The full browser test results are in the commit message.

Still not done: an actual screen reader (VoiceOver, TalkBack, NVDA). What is checked here is what the page gives a screen reader (live regions, labels, focus), not how one reads it aloud.

## Where Brain Lab Stands After Five Review Rounds

27 games in three packs, all playable to their results card in Chromium and in WebKit with iPhone settings, by touch, mouse or keyboard. Every pack speaks its Hebrew in Ari's or Noa's voice, and follows the learner's tradition where the sound differs. Finished games count toward the daily goal. What remains needs a person or a service this workspace does not have:

1. **John:** the prayer items holding a divine name (Barchu, Hagomel, Sim Shalom, the after-Haftarah blessing, Elohim and Eloheinu in Prayer Chain, Mourner's Kaddish). The four-letter Name is never voiced.
2. **A listener:** 35 held recordings (`data/lab/clip-holds.json`).
3. **Recording:** the 14 month names, then the priority-2 list in `docs/audio/BRAIN-LAB-AUDIO-2026-11-10.csv`. The 28 Sephardi and Ashkenazi items need checked respellings first.
4. **The images lane:** 23 pictures on order, studio covers without letters, and Rimon's cream square in dark mode for the Rimon lane.
5. **A native speaker:** titles and transliterations.
6. **Real devices:** Safari on an iPhone, Android Chrome, and a screen reader on each.
