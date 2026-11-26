# Block K: game playfields, Rimon reactions and workbook covers

23 images in 5 commands, for the 25 Nov 2026 critique (item 8, game graphics) and the printable workbooks. Every picture is optional: the app already runs without it and switches to it as soon as the file is in place.

## How to run

1. Open one image conversation and paste `docs/images/paste/K-MASTER.txt`.
2. Paste `k-01.txt`, save every image under its exact FILENAME, type "next", paste `k-02.txt`, and so on.
3. Put all the downloaded PNGs in one folder and run `python3 tools/images/ingest_blockk.py <folder>`. It resizes each one, makes the cream background transparent where a sprite needs it, and writes it to its place below.
4. Run `node tools/build-precache.mjs` and the tests, then look at each game.

## What goes where

| Cmd | File from the image tool | Goes to | Size | Used by |
|---|---|---|---|---|
| 1 | K-rimon-cheer.png | `assets/games/arcade/cast/rimon-cheer.png` | 256x256, transparent | every arcade game: Rimon cheers on a right answer (src/games/arcade.js boardReact) |
| 1 | K-rimon-oops.png | `assets/games/arcade/cast/rimon-oops.png` | 256x256, transparent | every arcade game: Rimon winces on a wrong answer |
| 2 | K-board-wall.png | `assets/games/arcade/board/wall.png` | 256x256, tiles | Letter Chomp, Word Maze walls (assets/css/arcade.css) |
| 2 | K-board-path.png | `assets/games/arcade/board/path.png` | 256x256, tiles | Letter Chomp, Word Maze open squares |
| 2 | K-board-grass.png | `assets/games/arcade/board/grass.png` | 256x256, tiles | Syllable Snake board |
| 2 | K-board-well.png | `assets/games/arcade/board/well.png` | 768x1152 | Falling Letters well |
| 2 | K-board-sky.png | `assets/games/arcade/board/sky.png` | 768x1152 | Letter Drop lanes |
| 3 | K-snake-head.png | `assets/games/arcade/board/snake-head.png` | 256x256, transparent | Syllable Snake head |
| 3 | K-snake-body.png | `assets/games/arcade/board/snake-body.png` | 256x256, transparent | Syllable Snake body |
| 3 | K-train-engine.png | `assets/games/arcade/cast/train-engine.png` | 384x256, transparent | Sentence Train (replaces the 🚂 emoji) |
| 4 | K-icepop-1.png | `assets/games/arcade/cast/icepop-1.png` | 256x256, transparent | Meltdown, one stage per wrong guess (replaces the emoji) |
| 4 | K-icepop-2.png | `assets/games/arcade/cast/icepop-2.png` | 256x256, transparent | Meltdown, one stage per wrong guess (replaces the emoji) |
| 4 | K-icepop-3.png | `assets/games/arcade/cast/icepop-3.png` | 256x256, transparent | Meltdown, one stage per wrong guess (replaces the emoji) |
| 4 | K-icepop-4.png | `assets/games/arcade/cast/icepop-4.png` | 256x256, transparent | Meltdown, one stage per wrong guess (replaces the emoji) |
| 4 | K-icepop-5.png | `assets/games/arcade/cast/icepop-5.png` | 256x256, transparent | Meltdown, one stage per wrong guess (replaces the emoji) |
| 5 | K-cover-white.png | `assets/workbook/covers/white.png` | 768x1152 | Printable workbook cover for that belt (src/workbook/render.js) |
| 5 | K-cover-yellow.png | `assets/workbook/covers/yellow.png` | 768x1152 | Printable workbook cover for that belt (src/workbook/render.js) |
| 5 | K-cover-orange.png | `assets/workbook/covers/orange.png` | 768x1152 | Printable workbook cover for that belt (src/workbook/render.js) |
| 5 | K-cover-green.png | `assets/workbook/covers/green.png` | 768x1152 | Printable workbook cover for that belt (src/workbook/render.js) |
| 5 | K-cover-blue.png | `assets/workbook/covers/blue.png` | 768x1152 | Printable workbook cover for that belt (src/workbook/render.js) |
| 5 | K-cover-brown.png | `assets/workbook/covers/brown.png` | 768x1152 | Printable workbook cover for that belt (src/workbook/render.js) |
| 5 | K-cover-intermediate.png | `assets/workbook/covers/intermediate.png` | 768x1152 | Printable workbook cover for that belt (src/workbook/render.js) |
| 5 | K-cover-israel.png | `assets/workbook/covers/israel.png` | 768x1152 | Printable workbook cover for that belt (src/workbook/render.js) |

The dictionary pictures are not in this block: they are already written as Block J (`docs/images/BLOCK-J.md`, paste files `j-01.txt` onwards, 788 word pictures). None of those has been made yet, which is why most dictionary entries have no picture.
