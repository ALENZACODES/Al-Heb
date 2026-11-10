# Brain Lab

Brain Lab (`#/lab`) is ALEF's brain-training page: sixteen 45-second games that each train one skill and teach one piece of Hebrew. Every game adjusts its level as you play (two right in a row moves you up, a miss moves you down), scores speed and accuracy, and feeds one of five skill scores. Scores compare you only with your own past games. Each day, Today's Workout picks three games from three different skills.

Calm mode and Settings > No time limits both take the clocks away: rounds wait for you and a game ends after ten rounds.

## The Sixteen Games

| Game | Skill | What it teaches | Hebrew comes from | Added |
|---|---|---|---|---|
| Letter Hunt | Attention | Spotting a letter among its look-alikes | `data/letters/letters.json` | Nov 9 |
| Letter Matrix | Memory | Holding letter shapes in mind | `data/letters/letters.json` | Nov 9 |
| Sound Match | Speed | Hearing syllables | `data/lab/syllables.json` (recorded syllables) | Nov 9 |
| Siddur Flash | Speed | Reading prayer words fast | `data/corpus/registry.json` | Nov 9 |
| Rule Switch | Flexibility | Dots and end-of-word letters | the table in `src/lab/lab.games.js` | Nov 9 |
| Gematria | Problem Solving | Letter values | `data/letters/letters.json` | Nov 9 |
| Count Up | Speed | Number words | `data/lab/numbers.json` (dictionary) | Nov 9 |
| Number Ear | Attention | Hearing and reading numbers | `data/lab/numbers.json` | Nov 9 |
| Calendar Puzzle | Memory | Hebrew months and holy days | `src/curriculum/calendar.js` | Nov 9 |
| Letter Pattern | Problem Solving | Three-letter roots | `data/roots/families.json` | Nov 9 |
| **Sound Twins** | Speed | Letters that look different but sound the same (Tet and Tav, Kaf and Qof, Vet and Vav), in the learner's own tradition | `data/lab/words.json` cards, from `data/pronunciation/consonants.json` | Nov 10 |
| **Vowel Rain** | Speed | Reading the vowel signs fast: a e i o u, with kamatz and tzere from level 4 and shuruk from level 6 | `data/lab/words.json` vowels, from `data/pronunciation/niqqud.json` | Nov 10 |
| **Middle Letter** | Attention | Naming a letter when its look-alikes crowd it | `data/letters/letters.json` | Nov 10 |
| **Taxi Turns** | Flexibility | Right, left and straight on, for taxis and directions in Israel | `data/lab/words.json` directions, from the dictionary | Nov 10 |
| **Café Order** | Memory | Ordering food and drink | `data/lab/words.json` café, from the dictionary | Nov 10 |
| **Prayer Chain** | Memory | The order of the words in the blessings and prayers | `data/corpus/registry.json` | Nov 10 |

Every game's rules live in `src/lab/lab.core.js` as plain functions with tests. The first ten games draw in `src/lab/lab.games.js`, the six added on November 10 in `src/lab/lab.games2.js`, and the page is `src/lab/lab.view.js`.

## How Each New Game Grows With the Learner

- **Sound Twins:** levels 1 and 2 keep the card to compare with in view, faded, and say why after every answer; from level 3 most "same" rounds are a twin rather than the identical card; from level 4 "different" cards are often the same letter with or without its dot (Bet and Vet); finals join at level 5; from level 7 you compare with the card two before.
- **Vowel Rain:** levels 1 to 3 show which signs make each sound on the buttons (בַ בָ for a); the fall speeds up from about 4 seconds to 1.6; reduced vowels (chataf) join at level 9, only under the throat letters. In the Ashkenazi tradition kamatz counts as o and tzere is left out (it reads as a glide), as `niqqud.json` says.
- **Middle Letter:** level 1 is all one letter; from level 2 half the rows put the letter between its look-alikes; the row grows to seven and the choices to four.
- **Taxi Turns:** levels 1 to 3 always follow the word; from level 4 the rule switches, said in words and drawn two ways (a round gold sign for the word, a square green one for the side) so it never rests on colour alone. Straight on joins at level 3, "turn right" and "turn left" at level 7.
- **Café Order:** orders grow from two things to six; levels 1 and 2 show the English with the Hebrew, levels 3 and 4 the transliteration, then Hebrew alone; from level 6 the menu holds look-alike orders (black coffee next to coffee with milk). Noa's and Ari's approved speaking portraits take the order.
- **Prayer Chain:** levels 1 to 4 start at the opening words of the blessing, with its English meaning and, to level 3, how each choice is said in the learner's tradition (barukh, borukh). Higher levels start mid-prayer, offer four choices and take the wrong ones from the same prayer.

## Choices Made for the Games (Open to Review)

- **The divine name** is never a choice and never the word to catch. In Prayer Chain it is filled in, in gold, and the chain carries on past it; in Siddur Flash it is never the target. This follows the app's existing convention (`src/shell/names.js`, the four-letter name only). Whether other names (for example Elohim or Eloheinu) should also be filled in rather than chosen is held for John.
- **Mourner's Kaddish** is left out of Prayer Chain and Siddur Flash (`NOT_A_GAME` in `lab.core.js`): it is said for the dead, so it is studied in the reader rather than raced or scored. One line to change if John wants it back.
- **Hebrew titles** of the six new games (תְּאוֹמֵי צְלִיל, גֶּשֶׁם תְּנוּעוֹת, הָאוֹת בָּאֶמְצַע, יָמִינָה אוֹ שְׂמֹאלָה, בֵּית קָפֶה, שַׁרְשֶׁרֶת תְּפִלָּה) have not been checked by a native speaker yet. Everything inside the games comes from the app's own data.

## Pictures

- **Drawn and showing** (`data/images/brain-lab-2026-11-10`, wired in `src/lab/lab.art.js`): a cover, an in-game picture and a results picture for all sixteen games, the new-best rosette and the workout-done picture. Board pictures sit behind the board with an opaque backing under every tile, so text never sits on a picture. Four new games place their picture themselves, where its order put it: the Sound Twins card face, the Vowel Rain sky, the Taxi Turns road and the Café Order counter.
- **Drawn and showing** (`data/images/commercial-2026-11-10`): the Brain Lab hero at the top of the page and the round tokens of the first ten games, laid over the letter disc once they load.
- **Still on order** ([`docs/images/BRAIN-LAB-NEW-GAMES-ORDERS-2026-11-10.md`](../images/BRAIN-LAB-NEW-GAMES-ORDERS-2026-11-10.md)): the six new games' tokens, the seventeen café menu pictures, the raindrop and the taxi. These go through the shared image resolver: each shows once it is ingested and approved, and nothing is fetched before that. Until then a new game's token is its letter on a green-and-gold disc.
- Every picture is decorative, loads lazily, and changes nothing if it fails (offline, save-data) or under high contrast and forced colours. When a results picture is missing or fails, Rimon from his own sprite sheets stands in.

Review rounds for this work, with scores and what would raise them: [`BRAIN-LAB-REVIEW-ROUNDS-2026-11-10.md`](BRAIN-LAB-REVIEW-ROUNDS-2026-11-10.md).

## Rimon

Brain Lab tells the companion what is happening (`alef:rimon` with `{ action, moment, game }`): a wave when the page opens, thinking during the memory phase of Letter Matrix and Café Order, a bounce on every second level reached, and a high five, wink or "you can do it" on the results card by how the game went. The moments and the Rimon stills they can map to are listed at the end of the new games' picture orders.

## Rebuilding and Testing

- `node tools/lab/build-lab-words.mjs` rebuilds `data/lab/words.json` from the dictionary, the clip list and the sound tables. Run it after any of those change; a test fails if the file drifts from a fresh build.
- `node --test tests/lab.core.test.js tests/lab.games2.test.js tests/warm-routes.test.js` checks the rules, the data against its sources, and that tapping at random scores at chance in every new game.
- `node --test tests/lab.browser.test.js` (browser tier, about 5 minutes) plays all sixteen games to their results card in Chromium.
- Brain Lab's code and data are not in the first install; the shell keeps them on the device once per build (`src/shell/warm-routes.js`, about 420 KB).
