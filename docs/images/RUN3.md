# Run 3: commands 150 to 249 (1,000 images)

Run 3 is John's third command sheet for the image lane (Nov 4, 2026). The sheet lives in the repo as `tools/images/run3-source.md` (a copy of the original with the image tool and its vendor named neutrally; the commands themselves are unchanged). `node tools/images/build_run3.mjs` parses it and writes `data/images/run3.csv`: one row per expected image, 100 commands x 10 = exactly 1,000 rows, ids unique. Nothing in Run 3 repeats Runs 1 and 2 (`docs/images/README.md`, `docs/images/NEXT_1000_COMMANDS.md`, `docs/images/BLOCK-J.md`).

## What it covers

| Block | Commands | Sets (file prefixes) | Shape | Images |
|---|---|---|---|---|
| I | 150-159 | trope mnemonics and cards (`TROPE_<name>_mnemonic`, `TROPE_<name>_card`), hand signals (`TROPE_hand`), Torah craft (`CRAFT_scroll`, `CRAFT_bimah`, `CRAFT_practice`, `CRAFT_haftarah`, `CRAFT_wheel`, `CRAFT_qa`) | square; `CRAFT_bimah` and `CRAFT_wheel` wide | 100 |
| J | 160-169 | ten Torah story arcs, ten panels each (`STORY_creation` ... `STORY_prophets`) | wide | 100 |
| K | 170-179 | numbers 11-20, tens, money, clocks, day, two months wheels, two opposites sets, shapes (`NUM_*`, `OPP_*`) | square; `NUM_months1` slots 1-6 and `NUM_shapes_09` wide | 100 |
| L | 180-189 | verbs and emotions in action (`VERB_*`, `EMOTE_*`) | square | 100 |
| M | 190-199 | text heroes: Amidah, morning, grace, night and travel, Psalms, sights, calendar moments, Motzei Shabbat (`HERO_*`) | wide | 100 |
| N | 200-209 | Israel places atlas (`PLACE_*`) | wide | 100 |
| O | 210-219 | grammar in pictures (`GRAM_*`) | square; `GRAM_place_10` and `GRAM_compare_07` wide | 100 |
| P | 220-229 | dialogue strips, ten panels each (`TALK_*`) | wide (the sheet allows square close-ups "as marked", but no panel is marked) | 100 |
| Q | 230-239 | vocabulary in context (`CTX_*`) | wide | 100 |
| R | 240-249 | mascot states, morning card, streak, empty states, traditions badges, share cards, book headers, game art, finale (`MAS_states`, `MORN_card`, `STREAK_art`, `STATE_art`, `BADGE_trad`, `SHARE_bg`, `HEAD_one`, `HEAD_two`, `GAME_art`, `FINALE_set`) | square; `MORN_card`, `SHARE_bg`, `HEAD_*`, `FINALE_set` wide | 100 |

Wide means 1792x1024 (`aspect` = `1792x1024`); everything else is 1024x1024 (`aspect` = `1:1`). The sheet's "no text, no Hebrew, no nikkud, no numerals" rule is repeated on every prompt. Locked badge variants (`BADGE_trad_NN_locked`) and regenerations are extra and are not rows.

Two places where the builder had to decide:

- Command 171 (tens and hundreds) lists nine images (20 to 100). The builder adds slot 1, one row of ten pomegranate seeds (the anchor for ten), so that the command has its ten images; it is marked in the row's alt text and can be dropped at ingest if John prefers nine.
- Command 173 (clocks) and 153 (hand signals) describe their ten items in running prose; the builder spells them out one per row.

## How returned files are named

Each command fixes its own file names (`TROPE_etnachta_mnemonic.png`, `CRAFT_bimah_01.png` ... `FINALE_set_10.png`), and the row id is exactly that file stem (`id` column, `file` = `<id>.png`). Trope names are slugged from the command (`sof_pasuk`, `zakef_katan`, `karney_para`).

The image tool returns hashed names (`exec-<uuid>.png`), not the names the command asked for, so matching is by file name after a rename: the manifest lines the tool prints with each image (`FILE: <name> | SET: ... | PROMPT: ... | NOTES: ...`) say which hashed file is which. For Runs 1 and 2 the rename maps live outside the repo in `../alef-image-originals/hashed/` (the originals folder next to the repo, `ALEF_IMAGE_ORIGINALS`) (`listing.json`, `map-b1.json`, renamed copies in `renamed/`); do the same for Run 3 (a `map-run3.json` of hashed name to run3 id), rename into a folder, then:

```
node tools/images/match_run3.mjs <folder>            # dry run: missing / extra / duplicates / wrong aspect, per-command progress
node tools/images/match_run3.mjs <folder> --block I  # one block at a time
node tools/images/append_manifest_rows.mjs --dry-run data/images/run3.csv   # then without --dry-run, right before ingesting
node tools/images/ingest.mjs ingest <folder>
node tools/images/alt_text.mjs                        # alt text for run3 ids comes from the csv alt column
```

`match_run3.mjs` applies the block J rules: exact name, case differences accepted and reported, browser suffixes (" (1)", " copy") listed as variants and never used, a second file for one id is a duplicate, and the pixel ratio must be within 3% of the row's width x height.

## Columns of `data/images/run3.csv`

`id`, `file`, `block` (I..R), `command` (150..249), `set` (the command title without its prefix), `slot` (1..10), `kind`, `key`, `aspect`, `width`, `height`, `status` (`pending`), `alt` (plain English, no Hebrew), `prompt` (the full command text plus "Image k of 10: <item>" and the shape).

`kind`: mnemonic, card, hand, object, scene, ui, panel, count, clock, pair, action, portrait, hero, place, grammar, strip, context, mascot, card, streak, state, badge, share, header, game, panorama.

`key` links a row to an app entity only where that is derivable without guessing; otherwise it is empty and the consuming screen matches on `set` and `slot`:

- trope rows (150-152): ids in `data/corpus/trope/table.json` (`etnachta`, `sof-pasuk`, `tipcha`, `zakef-katan`, `zakef-gadol`, `kadma`, `mahpach`, `pashta`, `munach`, `mercha`, `zarka`, `segol`, `pazer`, `karnei-parah`); Telisha is left empty because the table has both `telisha-gedolah` and `telisha-ketanah`;
- counting rows (170, 171): the counted noun looked up as an English gloss in `data/vocab/words.json`, only when exactly one noun has that gloss (lemon, egg, seed, star, finger, orange, coin);
- prayer and blessing heroes (190-199), synagogue scenes (239) and the spice-tower badge (244): ids in `data/corpus/registry.json` (`avot-1`, `sim-shalom`, `modeh-ani-1`, `torah-bless-1`, `birkat-hamazon-1`, `kiddush-wine-1`, `shema-1`, `mi-sheberach-opening`, `ashrei-145-1-3`, `shehecheyanu`, `havdalah-*`, `vayehi-binsoa`, `lecha-hashem`);
- festival scenes (175, 176, 235): ids in `data/festivals/links.json` (`rosh-hashanah`, `hanukkah`, `tu-bishvat`, `purim`, `pesach`, `shavuot`, `tisha-bav`, `sukkot`).

The key table is `KEYS` in `tools/images/build_run3.mjs`; `tests/images.run3.test.js` checks every key exists in its source file.

## Which screens consume each block

| Block | Screen |
|---|---|
| I | trope trainer (`src/trope`): mnemonic and card per mark, hand-signal chart from `TROPE_hand`; Torah reader (`src/torahreader`, `src/service`): `CRAFT_*` for the scroll, bimah and practice pages |
| J | Torah reader story pages and the book's story spreads (`book/`) |
| K | numbers, money, time and opposites in the vocab deck (`src/vocab`) and lessons; months wheels on the festivals page (`src/festivals`) and calendar |
| L | verbs and emotions in the speaking track (`src/speak`) and vocab cards |
| M | hero image at the top of each text page in the reader (`src/corpus` routes `/read/<id>`), the morning page for `HERO_morning` (`src/morning`) |
| N | the Israel atlas (`src/israel`) and travel track |
| O | grammar screens (`src/grammar`) |
| P | the Israel dialogues route (`src/israel`, `data/curriculum/dialogues.json`): one strip per conversation |
| Q | vocab flashcards (`src/vocab`): the word in its scene beside the Run 1 object picture |
| R | mascot states for the dashboard (`src/home`), morning card (`src/morning`), streak and celebration screens (`src/progress`), empty and error states across the shell (`src/shell`), traditions badges (`src/traditions`), share cards, book chapter headers (`book/`), workbook games, completion screen |

Nothing in the app reads `run3.csv` yet; it is the pending list for the lane. Images enter the app only after review and approval (`docs/images/RIGHTS.md`, `docs/images/REVIEW-SHEETS.md`), via `assets/img/gen/` and `data/images/generated-manifest.json`.
