# Native review packet

One consolidated set of rows for a native Hebrew reader, a rabbi or cantor, and an Ashkenazi or Sephardi reader. Nothing in it has been reviewed. Every `decision` and `corrections` cell is blank, and a row only counts as reviewed when a named person fills it in on a dated copy.

Who else to ask for help (voice actors, lawyers, accessibility testers and so on) is in [WHO-CAN-HELP.md](WHO-CAN-HELP.md).

## How the counts were measured

- The CSV files were written by a throwaway script (kept outside the repo) that reads the JSON data files and writes rows. It changes no app data. The row counts below were then re-read from the written CSV files with a CSV parser: every row has 13 columns, 930 rows in `ALL-ITEMS.csv`, 930 distinct ids, 0 rows with a decision filled in.
- Source counts: roots, gender, lesson-derived records (records whose origin is `lessons` in `data/vocab/attribution.json`), memory-chain letters, say lines, dialogue lines and minimal pairs were counted from the data files named below.
- The level check of dialogues used `src/knownwords/validate.js` (the repo's own known-word checker), at each dialogue's own level, then looked up each unknown word in `data/vocab/words.json` by exact unpointed spelling.
- The flagged-file census (`99-census-flagged-data-files.csv`) walks every `data/**/*.json` and counts keys set to a flag value. It counts keys, not unique items: one record can carry two flags, and rule-generated files inflate `proofread:false`.
- `?? CHECK`: searched the whole repo as a literal string. It appears only in tooling, tests and drafting instructions (`tools/drafts/`, `tests/drafts.inbox.test.js`, `docs/drafts/`), never as a marker inside content data. `docs/drafts/INBOX-REPORT.md` reports 0 such flags and 0 files checked.

## Files

All under `docs/review/packet/`. Columns in every review file: `id, area, hebrew, transliteration, english, tradition, source_file, reviewer_type, context, question_for_reviewer, decision, corrections, reviewer_notes`. Files open in a spreadsheet as UTF-8 (they start with a byte-order mark so Hebrew shows correctly; I did not test them in any particular spreadsheet program).

| File | Rows | What it holds | Best reviewer |
|---|---|---|---|
| `01-roots.csv` | 364 | Root families (`data/roots/families.json`), largest first. 82 are marked rule-checked, 0 verified. `data/roots/verified.json` has 0 confirmed roots. | native, Hebrew teacher |
| `02-gender.csv` | 125 | 79 irregular-gender nouns (43 feminine without a feminine ending, 36 masculine with one), 19 noun pairs, 5 pronouns (all from `data/gender/templates.json`), 16 sentence pairs and 6 paradigms (`data/curriculum/gender-pairs.json`, status `draft-needs-native-review`) | native |
| `03-lesson-derived-vocab.csv` | 117 | The lesson-derived vocabulary records (`data/vocab/words.json`; origin from `data/vocab/attribution.json`). Levels: 78 A1, 18 A2, 21 B1. All carry the flags `lesson-licence-not-stated` and `pointing-unreviewed`. | native; rabbi for the divine-name rows |
| `04-memory-chain.csv` | 67 | 27 example words, 27 hook and sound lines, 13 Ashkenazi story variants that differ from the Israeli story (`data/letters/memory-chain.json`) | native; Ashkenazi reader; Sephardi reader |
| `05-say-lines.csv` | 81 | The per-tradition `say` line for each of 27 letters x 3 traditions (`data/pronunciation/consonants.json`) | native (Israeli), Sephardi reader, Ashkenazi reader |
| `06-dialogues.csv` | 78 | 54 dialogue lines in 7 dialogues (`data/curriculum/dialogues.json`) and 24 level-check rows | native; Hebrew teacher for level rows |
| `07-minimal-pairs.csv` | 98 | Minimal pairs in 9 contrasts (`data/speak/minimal-pairs.json`); 2 contrasts have 0 pairs (bet/vet, tav/sav, as built) | native plus both tradition readers |
| `ALL-ITEMS.csv` | 930 | The seven files above joined, same columns | filter by `reviewer_type` |
| `99-census-flagged-data-files.csv` | 290 files | Not review rows. One row per data file that carries a flag, with counts per flag. | whoever plans the work |

Rows by `reviewer_type` in `ALL-ITEMS.csv`: native 709; native + Ashkenazi reader + Sephardi reader 125; native + teacher 24; Ashkenazi reader (rabbi/cantor) 27; Sephardi reader (rabbi/cantor) 27; Ashkenazi reader 13; native + rabbi 5.

## Things worth knowing before you start

- The A1 cafe dialogue (`d-cafe`, 23 word tokens) has 6 distinct words that are not in the A1 known-word set. Two of them are listed A2 in `words.json`: עוּגָה (cake) and תּוֹדָה (gratitude). The others: קָפֶה is listed B2 for coffee (an A2 record with the same letters means "money box", a different word), הָפוּךְ is listed B2, and תִּרְצִי and בְּכַרְטִיס have no exact match. These are rows `DV-d-cafe-*` in `06-dialogues.csv`. The other six dialogues are A2 and also have words outside the A2 set; all 24 level-check rows are in the same file.
- Say lines: for 21 of 27 letters the sentence is word-for-word the same in all three traditions (measured by string comparison). 19 of 27 letter records carry `verified: true` in the source and 8 do not. Identical text across traditions is not evidence it is right for each.
- Divine names: 5 rows are tagged `native + rabbi` because the Hebrew is, or contains, a divine name (one in `02-gender.csv`, four in `03-lesson-derived-vocab.csv`). The tag was set by matching unpointed spellings of five names, so it can miss other cases.
- Memory-chain pictures: an earlier audit (`docs/review/MEMORY-CHAIN-AUDIT.md`) says some pictures do not match the story text. I did not re-check the pictures, and this packet asks no one to judge them (that is a designer's job, see WHO-CAN-HELP).
- Glosses on minimal pairs come from `words.json` and may be a same-letters homograph. The question column asks the reviewer to say so.

## How to review in 20 minutes

Pick one lane. Planning guess: about 15 seconds per short row, so 20 minutes is roughly 80 rows. This is an assumption, not a timing.

1. Native Hebrew reader. Open `06-dialogues.csv`. Read the 7 `DL-d-cafe-*` lines aloud, then the 6 `DV-d-cafe-*` rows, then the next 40 or so dialogue lines. Write `ok`, `fix` or `unsure` in `decision`; put the right Hebrew in `corrections`. Skip any row you did not read aloud.
2. Rabbi or cantor. Open `ALL-ITEMS.csv`, filter `reviewer_type` to contain `rabbi`. Do the 5 divine-name rows first, then the 27 Ashkenazi `SY-*` or the 27 Sephardi `SY-*` lines (whichever tradition you read), then the story-variant rows `MS-*`. About 45 to 70 rows.
3. Ashkenazi or Sephardi reader. Do only the `SY-*` rows for your tradition (27 rows), then the `MH-*` hook rows (27), and say for each hook whether it starts with the letter's sound in your tradition. Then, if time remains, the `MP-*` pairs where the `audible` note names your tradition.

Rules for marking: `ok` means you would put your name to it. `fix` needs the corrected text in `corrections`. `unsure` needs a reason in `reviewer_notes`. Leave a row blank if you did not look. Do not edit the `id` or `hebrew` columns. Return the CSV as UTF-8, with your name and the date in the file name.

## What NOT to approve

- Do not approve a row you did not read, say aloud or compare with your own usage. Blank is correct for those.
- Do not approve a whole file or area. There is no "all OK" in this packet.
- Do not approve a pronunciation line for a tradition you do not read.
- Do not approve a root family unless you know every listed word comes from that one root. "They share letters" is not enough, and the app says only "share letters" until a root is confirmed.
- Do not approve a gloss because the Hebrew word is real; check that the English means this word and not another with the same letters.
- Do not approve level labels (A1, A2 and so on) as settled; they are the word list's labels, and the question is only whether the word suits the lesson.
- Do not approve any audio, recording or melody: none exists in the repo (all 24,906 listed clips have status `missing`).
- Do not approve pictures, licences, or the welcome statement from this packet; those belong to the helpers in WHO-CAN-HELP.
- Do not approve transliteration spelling conventions; only say whether the transliteration matches how the Hebrew is said.
- Do not mark anything reviewed on someone else's behalf, and do not carry decisions over from a different file.

## What this packet does not cover

- Other flagged content (prayers, Torah-read data, intermediate lessons, phrasebook, top-1000 vocabulary, calendar, letter strokes and more) already has area packets listed in `docs/review/README.md`, built by `tools/review/build_packet.mjs` into `docs/review/out/`. I did not rebuild or re-count those; their counts there are as of that tool's last run.
- The census of flagged data files (`99-census-flagged-data-files.csv`, 290 files): `proofread:false` on 118 files (10,410 keys), `needsReview:true` on 150 files (6,605 keys), `needsNativeReview:true` on 70 files (332), status text containing draft, needs or unreviewed on 81 files (201), `review` text mentioning a native speaker on 1 file (204), `validated:false` on 1 file (54), `clergyReviewed:false` on 1 file (70), `draft:true` on 2 files (2). `typedFromMemory` and `needsVerification` were not found as flag keys in data JSON. The reasons are in the file; the keys-not-items caveat above applies.
- Prose mentions (case-insensitive, files read per folder, excluding `docs/review/out`, `docs/review/packet` and `book/out`; file extensions md, js, mjs, json, txt, csv, html): `src` 269 files read, 37 mention "unreviewed", 91 "draft", 27 "proofread", 8 "needs native"; `docs` 663 read, 51, 253, 38, 25; `book` 15 read, 3, 9, 2, 1; `tools` 4,184 read, 12, 94, 12, 6; `tests` 265 read, 19, 55, 28, 8. "Draft" is a common word, so that column overstates real review needs.

## Getting answers back

The existing ingest tools (`tools/review/apply_review.mjs`, `tools/review/ingest.mjs`) expect their own CSV layouts. I did not test whether these packet files load into them, and nothing here applies answers to app data. Returned files should be kept as they come and applied by a person after reading them.
