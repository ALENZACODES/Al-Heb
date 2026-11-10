# The Arcade: thirty quick games for beginners

Thirty games added on 2026-11-07, built for one goal: a beginner comes back tomorrow. Each is a 60 to 240 second round, has five levels that unlock one at a time, saves a best score per level, hands out badges, offers a daily challenge that is the same board for everyone that day, and ends by pointing to the next game. Levels 1 to 4 (27 games) are the heart of it; three level-5 games cover the seven laws given to all humanity, the ten statements of Exodus 20, and a sample of the 613 mitzvot.

Everything here is preview content. The Hebrew comes from the app's existing word bank and letter data plus three small editorial files; none of it has been reviewed by a native educator, and the game screens say so.

## Why a learner comes back

| Loop | What the shared layer does (`src/games/arcade.js`, `arcade.model.js`) |
| --- | --- |
| Short rounds | Every game has a round clock (60 to 240 s by level); `untimed` and calm mode switch it off. |
| Visible progress | Five level buttons with star ratings; a level unlocks when the one before earns a star. |
| Personal best | Per-level and overall bests on this device; the results card says "New best, 12 more than before" or "8 short of your best. One more go?" |
| Badges | Bronze, Silver, Gold (stars), Perfect (no misses), Summit (level 5), Scholar (gold on every level), Marathon (10 rounds), Comeback (beat your best), Daily, and 3-, 7- and 30-day streaks. New badges show on the results card. |
| Daily challenge | A button on every game seeds the board from the date (`seededRandom(seedFrom(game|day|level))`), so the same puzzle appears for everyone that day. The games hub names today's featured game. |
| Streak | `games.arcade.v1` keeps the arcade-wide day streak and badge total; the hub shows it. |
| Hand-off | The results card offers Play again, Next level, and Next game (the next title in the catalogue). |
| Cast | Rimon is the player sprite, Noa and Ari host, call and voice the games, matching the lesson art. Sprites are optional files; text labels stand in until they arrive. |

Scores never leave the device. Store keys are `games.<id>.v1` and `games.arcade.v1`; all are listed on the Privacy page.

## Controls and access

- Every action fires on release (click, or key up through the shared `keys()` handler). No drag, swipe or long press anywhere. Movement games take arrow keys, W A S D, an on-screen pad, or a tap on the side of the board.
- Calm mode and reduced motion: nothing moves by itself; the maze, snake, falling letters and bubbles advance one step per press, and timers are off.
- Every called letter or word is also written on screen, so hearing is never required (inventory row in `docs/a11y/deaf-hoh.md`).
- Sound: recorded word and letter clips through the shared player only; game voice lines and law keywords are optional files under `audio/<voice>/israeli/games/`. With `audioFree` nothing plays.

## The games

| # | Id | Title | Level | Genre it borrows from | Mechanic | What it drills | Data |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `letterchomp` | Letter Chomp | 1 | Maze chase | Rimon eats every copy of the target letter; look-alikes are poison; erasers chase | Letter recognition against confusables | letters.json |
| 2 | `fallingletters` | Falling Letters | 1 | Falling blocks | Steer each falling letter into the slot that spells the word right to left | Spelling order, right-to-left | firstwords |
| 3 | `lettertwins` | Letter Twins | 1 | Concentration | Pairs: letter + name, letter + final form, letter + sound | Letter names, finals, sounds | letters.json |
| 4 | `soundsnap` | Sound Snap | 1 | Whack-a-mole | A letter is called; tap it as it pops up | Name-to-shape reaction | letters.json |
| 5 | `lookalikes` | Look-Alike Sorter | 1 | Sorting | Bin each letter under its name among its look-alikes, with a one-line tip | ב/כ, ד/ר, ה/ח/ת, ו/ז, ג/נ, ס/ם, ט/מ, ע/צ | letters.json |
| 6 | `alefbetrun` | Alef-Bet Run | 1 | Tap-in-order | Tap the scattered letters alef to tav, time bonus | Alphabet order | letters.json |
| 7 | `finalfive` | Final Five | 1 | Fill the gap | Choose the ending shape; reverse; spot the wrong spelling | ך ם ן ף ץ | firstwords |
| 8 | `letterdrop` | Letter Drop | 1 | Catch | Slide Noa's basket under the called letter in 3 to 5 lanes | Shape under time pressure | letters.json |
| 9 | `vowelstack` | Vowel Stack | 2 | Stacking | Put the vowel mark that makes the asked sound under a consonant | The five vowel sounds and seven marks | syllables.js |
| 10 | `syllablesnake` | Syllable Snake | 2 | Snake | Eat the word's syllables in order | Blending syllables into words | syllables.js |
| 11 | `wordbuilder` | Word Builder | 2 | Builder | Tap letters in order from meaning and sound; spares mixed in | Spelling from sound | firstwords |
| 12 | `meltdown` | Meltdown | 2 | Word guess | Guess letters before Noa's ice pop melts | Letter frequency, spelling | firstwords |
| 13 | `flapvowel` | Flap the Vowel | 2 | Flap-through-gates | Fly Rimon through the opening whose mark makes the called sound | Vowel marks at speed | syllables.js |
| 14 | `bingoletters` | Letter Bingo | 2 | Bingo | Ari calls names, syllables or words; mark the card | Listening and first letters | letters, firstwords |
| 15 | `wordsearch` | Word Search | 3 | Word search | Tap first and last letter; words run right to left and down, diagonals later | Scanning Hebrew text | firstwords |
| 16 | `minicross` | Mini Crossword | 3 | Crossword | English clues, Hebrew answers typed on a keyboard, built at runtime | Spelling from meaning | firstwords |
| 17 | `wordmaze` | Word Maze | 3 | Maze | Walk a path whose floor letters spell the word | Spelling + navigation | firstwords |
| 18 | `scramble` | Scramble | 3 | Anagram | Reorder shuffled letters, hint and shuffle | Spelling | firstwords |
| 19 | `bubbleword` | Bubble Word | 3 | Bubble pop | Pop the bubble carrying the missing letter | Missing-letter recall | firstwords |
| 20 | `trueornot` | True or Not | 3 | Left/right decision | Is the meaning right? Streak multiplier, per-card timer | Fast meaning recall | firstwords |
| 21 | `lettercrush` | Letter Crush | 3 | Match three | Swap tiles to line up three letters; spell a target word for a bonus | Letter shapes, word recognition | firstwords |
| 22 | `lettersudoku` | Letter Sudoku | 3 | Sudoku | 4 x 4 then 6 x 6 with look-alike letter sets | Telling look-alikes apart | letters |
| 23 | `quizladder` | Quiz Ladder | 3 | Quiz show | Ten rungs, two lifelines, safe rungs, bank or climb | Mixed recall | firstwords |
| 24 | `speedtype` | Speed Type | 3 | Typing race | Type the word on an Israeli-layout keyboard; finals matter | Typing Hebrew | firstwords, keyboard layout |
| 25 | `gendersplit` | Gender Split | 4 | Left/right sort | Masculine to Ari, feminine to Noa; tricky endings level | Grammatical gender | arcade-extra (from vocabulary) |
| 26 | `pluralpop` | Plural Pop | 4 | Balloon pop | Pop the right plural; irregulars later | ים / ות and exceptions | arcade-extra |
| 27 | `sentencetrain` | Sentence Train | 4 | Ordering | Couple word carriages into the sentence, decoys later | Word order | arcade-extra (sentences from the little books) |
| 28 | `noahseven` | The Seven Laws | 5 | Match, sort, recite | Hebrew names, meanings, scenes, recitation | The seven laws | mitzvot.json |
| 29 | `tenwords` | The Ten Words | 5 | Match, order, tablets | Keywords to meanings; fill two tablets in order | Exodus 20 by opening word | mitzvot.json |
| 30 | `mitzvot613` | 613 Sorter | 5 | Sort, match | Do or Do Not; keyword to meaning; which book | 48 sample mitzvot | mitzvot.json |

## Files

- `src/games/arcade.model.js`: pure logic (scores, badges, streaks, seeds, word search, crossword and maze builders). Tested in `tests/games.arcade.test.js`.
- `src/games/arcade.js`: the DOM layer every game mounts through (`mountArcade(spec, setup)`).
- `src/games/arcade.catalog.js`: the thirty entries; the hub and the next-game hand-off read it.
- `src/games/syllables.js`, `src/games/laws.js`: consonant and vowel tables; loader for the laws file.
- `data/games/arcade-extra.json`: 70 masculine and 44 feminine nouns copied from the vocabulary with their dictionary gender tags, 48 regular and irregular plurals, 52 short sentences. Editorial, unreviewed.
- `data/games/mitzvot.json`: the seven laws, the ten statements, 48 of the 613. Traditional enumerations; unreviewed by a rabbi.
- `assets/css/arcade.css`: layout; no keyframes, motion is JS-stepped.
- `docs/games/ARCADE-COMMANDS.md`, `arcade-images.csv`, `arcade-voice-lines.csv`: the picture and voice hand-offs.

## Honest limits

- No native speaker has checked the Hebrew, the pointing or the transliteration in the three editorial files.
- No game has been played on a real phone yet; the tests run in the repository's fake DOM.
- The level-5 games teach vocabulary and ordering, not halacha; they say so on screen.
- Pictures and voice lines are not yet produced; the games run text-only until they are.
