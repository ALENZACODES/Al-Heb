# Next 1000 images: command runbook

Pending list: **981 images** = 496 unfinished manifest rows (commands 38-101) + 485 new block H images (commands 102-149).
Done set used: data/images/provenance.json (ingested images).
**432 images are already done.** The next command to run is **38** (Alef cursive set), file `cmd-038.txt`.

Files: `data/images/next1000.csv` (same columns as manifest.csv, all pending, command order), `data/images/next1000-groups.json` (per-command prompts, file lists, refs). Rebuild with `node tools/images/build_next1000.mjs`.

## How to run

1. Open one conversation in your image tool and keep it for the whole run so STYLE GUIDE v1 stays pinned. If the conversation was restarted, paste the STYLE GUIDE v1 text from `tools/images/spec.mjs` first.
2. Run **one command at a time**. For each command, attach the reference sheets named in the `refs` column (for example CHAR_ari_sheet.png, CHAR_noa_sheet.png, FRAME_lettercard.png, REF_cursive_*.png, or an earlier image of the same set).
3. Each image is its own PNG, named exactly as in `next1000-groups.json` (`expectedFiles`). Never any text, letters or numerals in an image: Hebrew is overlaid later as vector.
4. Save each image under its exact file name and check the command's count before saying "next".
5. Sizes are only 1024x1024, 1792x1024 or 1024x1280 (icons in command 98 are 512x512 per the manifest).

## Paste-ready master command

```
Your image tool cannot read repo files, so do not use next1000-groups.json there. Paste the first pending command's file (see docs/images/paste/INDEX.md), then the next one ... (one self-contained file per command, see docs/images/paste/README.md; the paste files are built by node tools/images/build_paste_files.mjs).
```

Several commands in a row:

```
For several commands in a row, paste the first pending file, wait for the filenames list, say "next", then paste the following file, and so on (docs/images/paste/INDEX.md lists every file; commands split into -a/-b files are noted there).
```

## Command table

| Cmd | Block | Title | Images | Size | Refs to attach |
|---|---|---|---|---|---|
| 38 | C | Alef cursive set | 6 | 1024x1024 | REF_cursive_alef.png, CHAR_ari_sheet.png, CHAR_noa_sheet.png +1 |
| 39 | C | Bet / Vet cursive set | 6 | 1024x1024 | REF_cursive_bet.png, CHAR_ari_sheet.png, CHAR_noa_sheet.png +1 |
| 40 | C | Gimel cursive set | 6 | 1024x1024 | REF_cursive_gimel.png, CHAR_ari_sheet.png, CHAR_noa_sheet.png +1 |
| 41 | C | Dalet cursive set | 6 | 1024x1024 | REF_cursive_dalet.png, CHAR_ari_sheet.png, CHAR_noa_sheet.png +1 |
| 42 | C | He cursive set | 6 | 1024x1024 | REF_cursive_he.png, CHAR_ari_sheet.png, CHAR_noa_sheet.png +1 |
| 43 | C | Vav cursive set | 6 | 1024x1024 | REF_cursive_vav.png, CHAR_ari_sheet.png, CHAR_noa_sheet.png +1 |
| 44 | C | Zayin cursive set | 6 | 1024x1024 | REF_cursive_zayin.png, CHAR_ari_sheet.png, CHAR_noa_sheet.png +1 |
| 45 | C | Chet cursive set | 6 | 1024x1024 | REF_cursive_chet.png, CHAR_ari_sheet.png, CHAR_noa_sheet.png +1 |
| 46 | C | Tet cursive set | 6 | 1024x1024 | REF_cursive_tet.png, CHAR_ari_sheet.png, CHAR_noa_sheet.png +1 |
| 47 | C | Yod cursive set | 6 | 1024x1024 | REF_cursive_yod.png, CHAR_ari_sheet.png, CHAR_noa_sheet.png +1 |
| 48 | C | Kaf / Khaf cursive set | 6 | 1024x1024 | REF_cursive_kaf.png, CHAR_ari_sheet.png, CHAR_noa_sheet.png +1 |
| 49 | C | Lamed cursive set | 6 | 1024x1024 | REF_cursive_lamed.png, CHAR_ari_sheet.png, CHAR_noa_sheet.png +1 |
| 50 | C | Mem cursive set | 6 | 1024x1024 | REF_cursive_mem.png, CHAR_ari_sheet.png, CHAR_noa_sheet.png +1 |
| 51 | C | Nun cursive set | 6 | 1024x1024 | REF_cursive_nun.png, CHAR_ari_sheet.png, CHAR_noa_sheet.png +1 |
| 52 | C | Samekh cursive set | 6 | 1024x1024 | REF_cursive_samekh.png, CHAR_ari_sheet.png, CHAR_noa_sheet.png +1 |
| 53 | C | Ayin cursive set | 6 | 1024x1024 | REF_cursive_ayin.png, CHAR_ari_sheet.png, CHAR_noa_sheet.png +1 |
| 54 | C | Pe / Fe cursive set | 6 | 1024x1024 | REF_cursive_pe.png, CHAR_ari_sheet.png, CHAR_noa_sheet.png +1 |
| 55 | C | Tsadi cursive set | 6 | 1024x1024 | REF_cursive_tsadi.png, CHAR_ari_sheet.png, CHAR_noa_sheet.png +1 |
| 56 | C | Kof cursive set | 6 | 1024x1024 | REF_cursive_qof.png, CHAR_ari_sheet.png, CHAR_noa_sheet.png +1 |
| 57 | C | Resh cursive set | 6 | 1024x1024 | REF_cursive_resh.png, CHAR_ari_sheet.png, CHAR_noa_sheet.png +1 |
| 58 | C | Shin / Sin cursive set | 6 | 1024x1024 | REF_cursive_shin.png, CHAR_ari_sheet.png, CHAR_noa_sheet.png +1 |
| 59 | C | Tav cursive set | 6 | 1024x1024 | REF_cursive_tav.png, CHAR_ari_sheet.png, CHAR_noa_sheet.png +1 |
| 60 | C | Khaf sofit cursive set | 6 | 1024x1024 | REF_cursive_kaf_final.png, CHAR_ari_sheet.png, CHAR_noa_sheet.png +1 |
| 61 | C | Mem sofit cursive set | 6 | 1024x1024 | REF_cursive_mem_final.png, CHAR_ari_sheet.png, CHAR_noa_sheet.png +1 |
| 62 | C | Nun sofit cursive set | 6 | 1024x1024 | REF_cursive_nun_final.png, CHAR_ari_sheet.png, CHAR_noa_sheet.png +1 |
| 63 | C | Fe sofit cursive set | 6 | 1024x1024 | REF_cursive_pe_final.png, CHAR_ari_sheet.png, CHAR_noa_sheet.png +1 |
| 64 | C | Tsadi sofit cursive set | 6 | 1024x1024 | REF_cursive_tsadi_final.png, CHAR_ari_sheet.png, CHAR_noa_sheet.png +1 |
| 65 | D | Kamatz vowel set | 5 | 1024x1024 | CHAR_ari_sheet.png, MOUTH_ah.png, CHAR_noa_sheet.png +2 |
| 66 | D | Patach vowel set | 5 | 1024x1024 | CHAR_ari_sheet.png, MOUTH_ah.png, CHAR_noa_sheet.png +2 |
| 67 | D | Tzere vowel set | 5 | 1024x1024 | CHAR_ari_sheet.png, MOUTH_eh.png, CHAR_noa_sheet.png +2 |
| 68 | D | Segol vowel set | 5 | 1024x1024 | CHAR_ari_sheet.png, MOUTH_eh.png, CHAR_noa_sheet.png +2 |
| 69 | D | Chirik vowel set | 5 | 1024x1024 | CHAR_ari_sheet.png, MOUTH_ee.png, CHAR_noa_sheet.png +2 |
| 70 | D | Cholam male vowel set | 5 | 1024x1024 | CHAR_ari_sheet.png, MOUTH_oh.png, CHAR_noa_sheet.png +2 |
| 71 | D | Cholam chaser vowel set | 5 | 1024x1024 | CHAR_ari_sheet.png, MOUTH_oh.png, CHAR_noa_sheet.png +2 |
| 72 | D | Kubutz vowel set | 5 | 1024x1024 | CHAR_ari_sheet.png, MOUTH_oo.png, CHAR_noa_sheet.png +2 |
| 73 | D | Shuruk vowel set | 5 | 1024x1024 | CHAR_ari_sheet.png, MOUTH_oo.png, CHAR_noa_sheet.png +2 |
| 74 | D | Shva vowel set | 5 | 1024x1024 | CHAR_ari_sheet.png, MOUTH_none.png, CHAR_noa_sheet.png +2 |
| 75 | D | Chataf patach vowel set | 5 | 1024x1024 | CHAR_ari_sheet.png, MOUTH_ah.png, CHAR_noa_sheet.png +2 |
| 76 | D | Chataf segol vowel set | 5 | 1024x1024 | CHAR_ari_sheet.png, MOUTH_eh.png, CHAR_noa_sheet.png +2 |
| 77 | D | Chataf kamatz vowel set | 5 | 1024x1024 | CHAR_ari_sheet.png, MOUTH_oh.png, CHAR_noa_sheet.png +2 |
| 78 | D | Dagesh vowel set | 5 | 1024x1024 | CHAR_ari_sheet.png, MOUTH_none.png, CHAR_noa_sheet.png +2 |
| 79 | D | Shin and sin dots vowel set | 5 | 1024x1024 | CHAR_ari_sheet.png, MOUTH_none.png, CHAR_noa_sheet.png +2 |
| 80 | E | Greetings & fillers pack | 10 | 1024x1024 | - |
| 81 | E | Cafe & ordering pack | 10 | 1024x1024 | - |
| 82 | E | Numbers 1-10 pack | 10 | 1024x1024 | - |
| 83 | E | Market & shopping pack | 10 | 1024x1024 | - |
| 84 | E | Directions & city pack | 10 | 1024x1024 | - |
| 85 | E | Transport & travel pack | 10 | 1024x1024 | - |
| 86 | E | Home & family pack | 10 | 1024x1024 | - |
| 87 | E | Body & health pack | 10 | 1024x1024 | - |
| 88 | E | Colours & days pack | 10 | 1024x1024 | - |
| 89 | E | Synagogue objects pack | 10 | 1024x1024 | - |
| 90 | E | Shabbat table pack | 10 | 1024x1024 | - |
| 91 | E | Holidays pack | 10 | 1024x1024 | - |
| 92 | E | Prayer verbs & actions pack | 10 | 1024x1024 | - |
| 93 | E | Classroom & learning pack | 10 | 1024x1024 | - |
| 94 | E | Weather, time & small talk pack | 10 | 1024x1024 | - |
| 95 | F | Opening prayer art | 6 | 1792x1024 | - |
| 96 | F | Prayer-track scenes | 10 | 1024x1024 | - |
| 97 | F | Level badges | 16 | 1024x1024 | BADGE_01.png, BADGE_02.png, BADGE_03.png +5 |
| 98 | F | App icon set | 40 | 512x512 | - |
| 99 | F | Store & book covers | 6 | 1024x1024/1792x1024/1024x1536 | - |
| 100 | F | Final QA and manifest | text only | text only | - |
| 101 | G | Quirky mnemonic images (one per letter form) | 31 | 1024x1024 | - |
| 102 | H | Torah service steps | 10 | 1792x1024 | CHAR_noa_sheet.png, CHAR_ari_sheet.png |
| 103 | H | Synagogue service flow | 10 | 1792x1024 | CHAR_ari_sheet.png, CHAR_noa_sheet.png |
| 104 | H | Shabbat table steps | 10 | 1792x1024 | CHAR_noa_sheet.png, CHAR_ari_sheet.png |
| 105 | H | Friday prep and havdalah | 10 | 1792x1024 | CHAR_ari_sheet.png, CHAR_noa_sheet.png |
| 106 | H | Rosh Hashanah and Yom Kippur | 10 | 1792x1024 | CHAR_ari_sheet.png |
| 107 | H | Sukkot and Simchat Torah | 10 | 1792x1024 | CHAR_noa_sheet.png |
| 108 | H | Hanukkah | 10 | 1792x1024 | CHAR_ari_sheet.png, CHAR_noa_sheet.png |
| 109 | H | Tu BiShvat and Purim | 11 | 1792x1024 | CHAR_ari_sheet.png |
| 110 | H | Pesach | 10 | 1792x1024 | CHAR_ari_sheet.png, CHAR_noa_sheet.png |
| 111 | H | Shavuot and Tisha B'Av | 10 | 1792x1024 | - |
| 112 | H | Other days on the calendar | 10 | 1792x1024 | - |
| 113 | H | Street Hebrew: buses and trains | 10 | 1792x1024 | CHAR_ari_sheet.png, CHAR_noa_sheet.png |
| 114 | H | Street Hebrew: the market | 10 | 1792x1024 | CHAR_noa_sheet.png, CHAR_ari_sheet.png |
| 115 | H | Street Hebrew: cafe scenes | 10 | 1792x1024 | CHAR_ari_sheet.png, CHAR_noa_sheet.png |
| 116 | H | Street Hebrew: phone life | 10 | 1792x1024 | CHAR_noa_sheet.png, CHAR_ari_sheet.png |
| 117 | H | Street Hebrew: directions and city | 10 | 1792x1024 | CHAR_noa_sheet.png, CHAR_ari_sheet.png |
| 118 | H | Street Hebrew: shops and services | 10 | 1792x1024 | CHAR_noa_sheet.png, CHAR_ari_sheet.png |
| 119 | H | Street Hebrew: travel | 10 | 1792x1024 | CHAR_ari_sheet.png, CHAR_noa_sheet.png |
| 120 | H | Street Hebrew: friends and neighbours | 10 | 1792x1024 | CHAR_noa_sheet.png, CHAR_ari_sheet.png |
| 121 | H | Street Hebrew: health and wellbeing | 10 | 1792x1024 | CHAR_noa_sheet.png, CHAR_ari_sheet.png |
| 122 | H | Street Hebrew: work life | 10 | 1792x1024 | CHAR_noa_sheet.png, CHAR_ari_sheet.png |
| 123 | H | Object illustrations: Fruit | 10 | 1024x1024 | - |
| 124 | H | Object illustrations: Vegetables | 10 | 1024x1024 | - |
| 125 | H | Object illustrations: Bakery and dairy | 10 | 1024x1024 | - |
| 126 | H | Object illustrations: Drinks | 10 | 1024x1024 | - |
| 127 | H | Object illustrations: Israeli dishes | 10 | 1024x1024 | - |
| 128 | H | Object illustrations: Family members | 10 | 1024x1024 | - |
| 129 | H | Object illustrations: More body parts | 10 | 1024x1024 | - |
| 130 | H | Object illustrations: Rooms and furniture | 10 | 1024x1024 | - |
| 131 | H | Object illustrations: Kitchen items | 10 | 1024x1024 | - |
| 132 | H | Object illustrations: Clothing | 10 | 1024x1024 | - |
| 133 | H | Object illustrations: Travel objects | 10 | 1024x1024 | - |
| 134 | H | Object illustrations: Animals | 10 | 1024x1024 | - |
| 135 | H | Object illustrations: Nature | 10 | 1024x1024 | - |
| 136 | H | Object illustrations: School and office | 10 | 1024x1024 | - |
| 137 | H | Object illustrations: City places | 10 | 1024x1024 | - |
| 138 | H | Traditions explorer | 11 | 1792x1024 | CHAR_ari_sheet.png, CHAR_noa_sheet.png |
| 139 | H | Achievement badges and belts | 11 | 1024x1024 | - |
| 140 | H | Progress dashboard mascot | 11 | 1024x1024 | MAS_rimon_01.png |
| 141 | H | Workbook notebook doodles | 10 | 1024x1280 | - |
| 142 | H | Street Hebrew: the train | 10 | 1792x1024 | CHAR_ari_sheet.png, CHAR_noa_sheet.png |
| 143 | H | Street Hebrew: beach and kibbutz | 10 | 1792x1024 | CHAR_ari_sheet.png, CHAR_noa_sheet.png |
| 144 | H | Street Hebrew: haggling in the shuk | 10 | 1792x1024 | CHAR_ari_sheet.png, CHAR_noa_sheet.png |
| 145 | H | Reform life-cycle moments | 10 | 1792x1024 | CHAR_ari_sheet.png, CHAR_noa_sheet.png |
| 146 | H | Classroom and learning scenes | 10 | 1792x1024 | CHAR_ari_sheet.png, CHAR_noa_sheet.png |
| 147 | H | Object illustrations: Garden and outdoors | 10 | 1024x1024 | - |
| 148 | H | Mouth and articulation panels | 10 | 1024x1024 | - |
| 149 | H | Extra achievement pins | 11 | 1024x1024 | - |
