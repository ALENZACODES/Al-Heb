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
| 7 | final | 91 | Full unit suite and the browser test re-run; PR opened. | Below. |

## What Would Take It From 91 to 95 and Up

1. **The pictures** (biggest gap): ingest and approve the Brain Lab hero and ten tokens already drawn on `feature/commercial-images-2026-11-10`, then draw the 41 in `docs/images/BRAIN-LAB-NEW-GAMES-ORDERS-2026-11-10.md` and the 32 in `docs/images/BRAIN-LAB-ORDERS-2026-11-09.md`. Every one already has its slot; no code change is needed.
2. **A native speaker** checks the six new Hebrew titles and the café and direction transliterations (they come from the dictionary's style, for example "semolah" where speakers say "smola").
3. **John's held decision:** whether names other than the four-letter name (Elohim, Eloheinu) should also be filled in, never chosen, in Prayer Chain; and whether Mourner's Kaddish stays out.
4. **Ten café words are silent** (cake, juice, ice cream, chocolate, soup, apple, orange, sandwich, lemonade, challah): their only recordings are in the 1.2 MB dictionary list, which Brain Lab does not load. Recording them into the word list, the same way as the other café words, would let every order be heard.
5. **A real phone:** everything here was checked in headless Chromium at 360, 390 and 1280 px; nothing was tried on an iPhone or with a screen reader.
6. **Rimon stills:** map the Brain Lab moments to stills 146 to 160 once the stills branch lands (table at the end of the picture order).
