# Missing pictures and sound: what is still to make (checked 2026-11-08)

Checked by looking for each file on disk in this repo. "Missing" means the file is not in the repo yet; every screen listed here still works without it (text only, or the device voice).

## Summary

| Area | Missing | Prompts / rows | Where files go |
| --- | --- | --- | --- |
| Antonym Tug-of-War pair pictures (new 600-round bank) | 0 (all 201 complete) | `docs/games/tugowar-image-batches.md` (21 batches), master in `docs/games/TUGOWAR-COMMANDS.md` | `assets/games/tugowar/pairs/TUG_<key>.png` |
| Games that ask for an indexed picture that was never made | 0 (all 8 complete) | registered in `data/img/index.json` | `assets/img/gen/` |
| Little books 22-62 page pictures | 492 pictures (books 22 to 62, 12 pages each) | `docs/books/missing-pages.csv`, master in `docs/books/COMMANDS-6-62.md` | `assets/books/bookN/BOOKN_pXX.jpg` |
| Other image-manifest rows never produced | 666 rows | `docs/images/MISSING-NOW.csv` (file, block, set, size, full prompt) | through the image ingest (below) |

## What is complete (nothing to make)

- All 201 Tug-of-War pair pictures and the 8 Weather Studio, Barter and Rental Agent pictures were generated and uploaded on 2026-11-08.

- The 30 arcade games: all 67 pictures in `docs/games/arcade-images.csv` and all 370 voice lines in `docs/games/arcade-voice-lines.csv` are in the repo.
- The 26 game backdrops (`GAME_*_env`) the other games use: all present and approved.
- Little-book audio: all 1,368 page clips for books 6-62 (both voices) are in the repo, and books 1-5 have their clips too.
- Little-book pictures for books 1-21 are complete.
- The main Aleph book (`book/out/alef-book.html`): every picture it links exists. The 27 letter drawings in its mnemonic cards are drawn in code on purpose, not placeholders.

## The 8 completed game pictures

| Game | Picture ids |
| --- | --- |
| Weather Studio | `PLACE_seasons_07`, `PLACE_seasons_08` |
| Barter | `CTX_food_01`, `CTX_food_02`, `CTX_food_03`, `CTX_food_04` |
| Rental Agent | `CTX_house_02`, `CTX_house_03` |

All eight are generated, approved and registered. The game-ready 800px and 1600px WebP files are in `assets/img/gen/`; their generation prompts are retained in the image provenance records.

## The other 666 manifest rows, by block

| Block | Rows | What they are |
| --- | --- | --- |
| C | 157 | cursive letter sets (mnemonic, Ari, Noa, silhouette, trace, postcard) |
| E | 56 | vocabulary pictures: classroom, holidays, prayer actions, Shabbat, synagogue, weather |
| F | 72 | 40 icons, badges and locked badges, brand art, prayer blessing and prayer track pictures |
| G | 4 | quirky letter pictures (variants) |
| K | 1 | Tens & hundreds |
| M | 27 | prayer "heroes" and blessings |
| N | 46 | Israel places (the 2 Weather Studio ones are in the table above) |
| O | 53 | grammar scenes |
| P | 100 | the ten dialogue stories (bakery, clinic, bus, taxi, ...) |
| Q | 97 | words in context (the 6 Barter / Rental Agent ones are in the table above) |
| R | 61 | book chapter headers, empty/error states, finale, morning cards, share cards, streak art, traditions badges, workbook game art |

None of these 666 is linked by any screen or by the book today (checked by searching `src/`, `book/`, `data/img/index.json`, `data/curriculum`, `data/books`, `data/games` and `data/homepage` for each id), so they add new art rather than fill a visible gap.

## Pushing the remaining 666 manifest pictures

1. Generate with the prompt from `docs/images/MISSING-NOW.csv`, and keep the exact file name from its `file` column.
2. Put the files in one folder (or a zip) and run:

```
node tools/images/ingest.mjs ingest <folder-or-zip> --dry-run
node tools/images/ingest.mjs ingest <folder-or-zip>
node tools/images/ingest.mjs sheets        # open data/images/sheets/index.html, approve or reject, export decisions.json
node tools/images/ingest.mjs apply-decisions decisions.json
node tools/img/build_index.mjs
node tools/images/validate.mjs
node tools/meta/scan.mjs --text
npm test
```

To refresh the missing list later: `node tools/images/ingest.mjs list missing --csv`.

## Pushing little-book pictures

Save each page as `assets/books/bookN/BOOKN_pXX.jpg`, then:

```
node tools/books/build.mjs
node tools/meta/scan.mjs
node tools/meta/scan.mjs --text
npm test
```
