# Reviewer packets: getting the unreviewed Hebrew proofread

Almost everything in ALEF that is Hebrew was written, pointed or typed by an AI agent or machine-copied from a source; nobody who reads Hebrew has proofread it. Records say so with flags (`proofread:false`, `needsNativeReview`, `typedFromMemory`, `needsVerification`, `draft`, `clergyReviewed:false`, `status: transcribed-needs-check`, `validated:false`, `review: native-speaker-needed`). This folder turns those flags into work a teacher, native speaker or clergy member can do in a few sittings, and lets the answers flow back without anyone editing JSON.

Nothing here claims the content is correct. A row only becomes "reviewed" when a named person says `ok` on a dated row.

## Quick start

```
node tools/review/build_packet.mjs            # writes docs/review/out/  (CSV + HTML + PDF per area, index.html, manifest.json)
node tools/review/build_packet.mjs --no-pdf   # skip Playwright
open docs/review/out/index.html               # the landing page lists every packet, item counts and hours

node tools/review/apply_review.mjs returned.csv --reviewer "Name" --date 2026-11-20            # DRY RUN: report only
node tools/review/apply_review.mjs returned.csv --reviewer "Name" --date 2026-11-20 --apply    # writes data/ and the ledger
node --test                                   # always run after --apply (see "After you apply")
```

Both scripts only need Node; PDFs need Playwright with Chromium (the same one `book/build.mjs` uses). `--root DIR` points either tool at another checkout.

## What the scan covers

`build_packet.mjs` walks `data/**/*.json` for records carrying the flags above, and reads three things that live outside data files: `book/opening-prayer.txt`, the holiday/month names in `src/curriculum/calendar.js` and the parasha names in `data/calendar/parsha.json`. It also lists every `docs/**` file that mentions a flag in prose (57 files on the last run, mostly generated worksheets and QA notes; see `manifest.json` > `audit.docsWithMarkers`). Docs are reported, not turned into rows, except `docs/letters/REVIEW-LIST.md`, whose per-letter doubts are copied into the stroke cards.

Safety net: any flagged data file that no dedicated area knows about is picked up by the generic `other-flagged` area, so newly added data is never silently skipped. On the last run that area was empty. `manifest.json` > `audit.dataFilesNotCoveredByAnyArea` lists any flagged file that still ends up with no area.

Not covered, on purpose: audio (none exists yet), `data/wordtrace/words.json` (derived from lesson/vocab words, pointing marked `course-data`), the Wiktionary-derived vocabulary beyond rank 5000, and any record already marked `proofread:true`.

## The areas, in priority order

Counts and hours are from the run on 2026-11-03 (`docs/review/out/manifest.json`). Re-run the builder for current numbers: other lanes were still adding data while this was written.

| # | Area (suggested reviewer) | Priority | Items | Est. hours |
|---|---|---|---|---|
| 1 | `opening-prayer` (clergy or educator) | P1 | 5 | 0.2 |
| 2 | `prayers` (clergy / cantor / Hebrew educator) | P2 | 140 | 12.2 |
| 3 | `prayer-prompts` (clergy / Hebrew educator) | P2 | 41 | 1.4 |
| 4 | `prayer-guide` (clergy) | P2 | 17 | 1.3 |
| 5 | `torahread` (Hebrew teacher / clergy) | P3 | 37 | 0.6 |
| 6 | `lessons` (Hebrew teacher) | P3 | 380 | 3.0 |
| 7 | `dialogues` (Israeli native speaker / teacher) | P3 | 54 | 0.7 |
| 8 | `gender-pairs` (Hebrew teacher) | P3 | 22 | 0.3 |
| 9 | `loanwords` (Israeli native speaker) | P3 | 26 | 0.2 |
| 10 | `hints` (Hebrew teacher) | P3 | 6 | 0.1 |
| 11 | `israel-everyday` (Israeli native speaker) | P4 | 133 | 3.2 |
| 12 | `phrasebook` (Israeli native speaker) | P4 | 204 | 2.0 |
| 13 | `letter-strokes` (Israeli primary-school teacher) | P4 | 54 | 2.6 |
| 14 | `mnemonics` (Hebrew teacher) | P4 | 31 | 1.5 |
| 15 | `pron-soundgap` (native speaker / speech teacher) | P5 | 32 | 0.5 |
| 16 | `pron-prayerwords` (native speaker + Ashkenazi-trained reader) | P5 | 10 | 0.4 |
| 17 | `pron-vowels` (Hebrew teacher) | P5 | 56 | 1.1 |
| 18 | `pron-traditions` (linguist / cantor / Hebrew teacher) | P5 | 25 | 1.2 |
| 19 | `calendar` (Hebrew teacher / clergy) | P5 | 80 | 2.3 |
| 20 | `vocab-top1000` (Hebrew teacher / native speaker) | P6 | 1000 | 6.4 |
| 21 | `vocab-rest` (Hebrew teacher / native speaker), sheet only | P7 | 4000 | 25.6 |
| | **Total** | | **6353** | **66.6** |

Phase one (P1 to P6, everything except `vocab-rest`) is 2,353 items, about 41 hours. `vocab-rest` is deliberately phase two and has a CSV but no PDF.

Notes on what is inside:

* `prayers` has 70 registry texts (27 older plus the 43 liturgy records added in commit 449b068, which nobody has read) and 70 clergy-note rows (`prayers:meta:<id>`: where in the service, delivery, use per denomination). The five records with status `transcribed-needs-check` (`vayehi-binsoa`, `vezot-hatorah`, `etz-chaim`, `yigdal`, `haftarah-after`) are sorted to the top.
* `lessons` has one row per lesson (title and goals) plus one per lesson word; `dialogues` one row per spoken line.
* `letter-strokes` has 54 cards (27 letters x print and cursive) with a drawn diagram: grey outline, coloured pen path, numbered start dots, arrows.
* `vocab-top1000` rows carry the pointed lemma, an app-generated transliteration (labelled as such in the check text) and the gloss.
* `calendar` and the opening prayer have no data flag to flip. They are review-only: an `ok` is recorded in the ledger, and a person edits the source by hand.

## How to give this to a reviewer

1. Pick the person for the area (last column above). Clergy for areas 1 to 5 and the `meta:` rows; a teacher for curriculum, letters and pronunciation; a native Israeli speaker for dialogues, `israel-everyday`, phrasebook and loanwords. One person can cover several areas.
2. Send **two files per area** from `docs/review/out/`, with the same number prefix: the PDF (`NN-area.pdf`, large type, to read aloud; print it if they prefer paper) and the CSV (`NN-area.csv`, where answers are recorded). The HTML is the same as the PDF.
3. Send them the five lines below, nothing else.

   > Please read each Hebrew item aloud. In the `status` column of the CSV write `ok` (I would put my name to it), `fix` (put the right text in `corrected_text`) or `unsure`. Write your name in `reviewer` and the date (YYYY-MM-DD) in `review_date` on every row you mark `ok`. Do not edit the `hebrew` column; put corrections in `corrected_text`. If a row has more than one Hebrew field, start the correction with the field name and a colon, for example `f: אֲנִי תַּלְמִידָה` or `example.he: ...`. Leaving a row blank means "not reviewed", which is fine.
4. Open the CSV in Excel, Numbers or Google Sheets (File > Import, UTF-8). It has a byte-order mark so Hebrew opens correctly; it keeps right-to-left cells readable. Please ask them to **save as CSV (UTF-8)**, not as `.xlsx`.
5. When it comes back, run the importer without `--apply` first and read the report with them if anything was refused.

Where to start: do the areas in the order of the table. A reviewer who only has two hours should get `opening-prayer`, the five `transcribed-needs-check` rows of `prayers`, and the first pages of `lessons` and `vocab-top1000`.

## Estimated hours: how they were computed

These are my estimates from a per-item time model in `tools/review/config.mjs`. **They were not measured with a real reviewer.** Assumptions:

* The reviewer is fluent, reads each Hebrew line aloud once, compares it with what they know (or a printed text on the desk), and types a status. They do not research from scratch.
* Seconds per item: vocabulary 20, lesson word 25, phrasebook 30, dialogue line 40, gender pair 40, `israel-everyday` 75, stroke card 150 (they have to look at the drawing), mnemonic 150, clergy-note row 150, guide section 240; prayers 150 plus 10 seconds per Hebrew word (a 100-word text is about 19 minutes), prompts 60 plus 8 per word.
* A 15% overhead is added for breaks and notes.
* Not included: setup, second opinions, the time to fix the rows marked `fix`, or consulting a printed siddur for every line. If the clergy reviewer verifies each text against a printed siddur of the named nusach, expect the `prayers` area to roughly double.
* Subtotals by reviewer type, from the table: clergy-type areas 1 to 5 about 15.7 hours; teacher and native-speaker areas 6 to 19 about 19 hours; vocabulary top 1000 about 6.4 hours; `vocab-rest` about 25.6 hours.

## What reviewers must NOT be asked to do

* Rule on halacha, kashrut of materials, or whether the app or book is "approved" or "kosher". They are checking words, not endorsing a product.
* Choose between nuschaot or streams for the whole project. They report what is wrong or unusual for the nusach named on the card; the project decides which nusach to ship.
* Settle disputes between denominations or write theology. If a card claims what Orthodox/Conservative/Reform congregations do, they say fair / unfair for what they know, not rewrite it.
* Write new text, translations or lessons. Corrections to existing items only.
* Edit JSON, CSV structure, column names, ids or the `hebrew` column.
* Judge licences, copyright or source attribution (the registry texts come from Sefaria, tanach.us and others; licences are a separate, unreviewed question in `docs/corpus/LICENSES.md`).
* Check audio (none exists), app screens, or design.
* Approve the transliteration as a spelling system. They check that it matches how the word is said, not that it follows a standard.
* Review `vocab-rest` before phase one is finished, or review more than one area in a sitting without a break. Four hours of pointing review is a lot; stop at the reviewer's pace.
* Sign anything, or be quoted, without agreeing the wording first (see credit).

## Credit

* Agree in advance whether they want to be named. Put name, role and the areas they reviewed on the book's acknowledgments page and the app's About screen, with their own approved wording, and with the date range of the review.
* Say exactly what they did: "Hebrew pointing and glosses of the lessons reviewed by X". Do not write "approved by", "endorsed by" or "checked for correctness", and never imply they reviewed areas they did not.
* The ledger (`docs/review/ledger.jsonl`, appended by `--apply`) records who marked which id `ok` and when; `reviewedBy` and `reviewedOn` are also written on the record itself.
* Clergy reviewers: offer a choice of title as they prefer it printed. Paid reviewers: agree the fee and the cap in hours (use the table above) before they start; an unpaid favour should not be open-ended.
* A `fix` is the reviewer's work too. Credit them even when their row did not become `ok`.
* If a reviewer found many errors in an area, say so in the release notes rather than hiding it; the number of rows turned from `ok` to `fix` is evidence the review was real.

## Question list (to ask before or alongside the packets)

Ask these once, early. The answers decide how the rest should be judged.

**For clergy and cantors**

1. **Which tradition for "Ashkenazi"?** The app has an Ashkenazi setting (kamatz read as "aw", tav without dagesh as "s", penultimate stress: `BO-rukh`, `Shabbos`, `sholom`). Is that the reading you want taught: Lithuanian ("Litvish"), Polish/Hasidic, Hungarian, or another? Do you say tav as `s` or `t`; cholam as `oy` or `o`; and what vowel for kamatz in "Shabbos"? Affects `pron-prayerwords`, `pron-soundgap`, `pron-traditions`.
2. **Which nusach per text?** The registry mixes three: Ashkenaz (Metsudah, 21 texts), Edot HaMizrach (Shaliehsaboo, 15) and Sefard (Torat Emet, 6), plus 28 verse texts from the Leningrad Codex. Should each card say its nusach (the book footers name the source)? Are the mixed Torah-service pages (Ashkenaz plus Mizrahi haftarah blessings) acceptable, or should one nusach be used per chapter?
3. **The divine name.** The verse texts print `יְהוָה` (82 times in the registry) as in the Leningrad Codex; liturgy usually shows `יְיָ` or `אֲדֹנָי` and is read "Adonai". Should the app and book print the four-letter form at all, replace it with `אֲדֹנָי` or `ה׳`, and should the app tell learners to say "Adonai"? Also: does a printed beginner's book with divine names need any note about handling (shemot)? Affects every registry text.
4. **Missing and clipped text.** Which prayers must a first-year attendee be able to follow that are not in the registry (the gap list is `data/corpus/gaps.json`: Modim, the middle Amidah blessings, Hallel, Kabbalat Shabbat psalms)? Is `avot-1` acceptable cut before its closing clause, with `avot-closing` supplying the rest?
5. **Gender-neutral and feminine forms.** Daily prompts have a `heFemale` variant of Modeh Ani (מוֹדָה אֲנִי). Is that the form you want, and are there others that should be offered (for example the Amidah matriarchs, or non-binary-inclusive wording)?
6. **Opening prayer.** Is an original English prayer (with the words *hineni*, *or*, *tikkun*, *baruch ha-ba*) acceptable at the front of a book that also contains traditional liturgy, or should it be labelled differently, or replaced by a traditional blessing such as Shehecheyanu?
7. **Calendar.** The app keeps one festival day per festival (a Reform-oriented default, with Rosh Hashanah's second day optional) and does not model Yom HaShoah, Yom HaZikaron, Yom HaAtzmaut, Rosh Chodesh or the Omer. Is that a defensible default for a general audience, and what should the screen say about the others?

**For a teacher or native Israeli speaker**

8. **How do Israelis actually say it?** For each of these, is the form in the data what people say, and what do they say instead? `אֶפְשָׁר בְּכַרְטִיס?` (can I pay by card), `קָפֶה הָפוּךְ` (cafe hafuch) and `מָה תִּרְצִי?` (to a woman), prices said as `אַרְבָּעִים וּשְׁמוֹנָה שְׁקָלִים`, `בֶּטַח`, `יַאלְלָה`, `סַבָּבָה`, `מַשֶּׁהוּ`. Also the numbers: do people say `אַחַת` or `אֶחָד` for counting, and the feminine forms in everyday speech?
9. **Pointed or unpointed?** Israelis write without niqqud. The app shows pointed text for learners. Should everyday phrases (phrasebook, dialogues, vocabulary) also be shown in unpointed everyday spelling beside it (ktiv male)? Which spellings are standard (`סוכה` vs `סוכּה`, `פירות`)?
10. **Colloquial reductions.** Rapid Israeli speech drops or merges sounds (`ma ze` becomes `maze`, `yesh li` becomes `yeshli`). The app deliberately does not teach these. Is that right for a beginner, and which three would you teach first?
11. **Transliteration style.** The data uses `ch` for chet and khaf, `ts` for tsadi, apostrophe for alef/ayin breaks, capitals for stress in some files. What would an Israeli teacher write instead (`kh`, `tz`, `h`) for an English-speaking adult? Is a single scheme across the app worth the churn?
12. **Stress.** Is the default of last-syllable stress plus the listed exceptions (`stress.json`: segolates and `בַּיִת`) what you would teach, and which common words are missing?
13. **Handwriting.** Does an Israeli school teach print letters written by hand, or only cursive (ktav yad)? Which stroke counts and directions do you teach for shin, tet, mem and the final forms? (These are the DOUBT rows of `docs/letters/REVIEW-LIST.md`, shown on each stroke card.) Are the cursive pe-final and tsadi-final in the Gveret Levin font what schools teach?
14. **Letter-name claims.** The mnemonics say names such as bayit (house), yad (hand), kof (monkey), ayin (eye). Which letter-name meanings (tet, chet, tsadi, nun) are safe to print as fact, and which should stay hedged?
15. **Gender and register.** For each dialogue and `israel-everyday` scenario, is the register (formal, neutral, casual, rude) labelled correctly, and is the masculine or feminine form chosen for the right speaker?
16. **Glosses.** Wiktionary glosses were refined by hand for the top words. Is a given gloss misleading for modern Israeli use (for example a biblical sense listed first)? Which of the first 100 words would you rewrite?
17. **Loanwords.** Which of the loanwords are really in everyday use, and which sound dated or odd?

## The round trip: what `apply_review.mjs` does and refuses

Dry run by default: it prints what it would do and writes nothing. Only `--apply` writes.

| Row says | Effect with `--apply` |
|---|---|
| `status: ok`, reviewer and ISO date present (in the row, or `--reviewer` / `--date`) | The record gets `proofread:true` (or the area's own flag: `validated:true` and `needsNativeReview:false` for strokes, `clergyReviewed:true` for clergy notes), plus `reviewedBy` and `reviewedOn`. Records that only had a file-level draft flag get a record-level `proofread:true` inserted. Vocabulary words are flipped in `vocab5000.json` and in their tier pack together. |
| `ok` without a reviewer name or without a valid date | Refused and reported. Nothing is marked reviewed. |
| `ok` with text in `corrected_text` | Refused (contradiction). |
| `fix` with `corrected_text` | The text is written into the field, but the record **stays unreviewed**: a second person should confirm the fix. With several fields use `field: text` (`he:`, `translit:`, `en:`, `m:`, `f:`, `example.he:` and so on). If the item does not store that field the fix is kept as a note only. |
| `fix` without text, `unsure`, blank | Listed in the report only. |
| Hebrew cell differs from current data | Refused: the sheet is stale or the cell was edited in place. |
| Unknown id, duplicate id, invalid status | Reported; duplicates are skipped entirely. |

Other behaviour:

* **Containers.** A dialogue or loanword group is marked `proofread:true` only when every one of its flagged lines/words is `ok` in the same import. File-level flags are never changed automatically.
* **All or nothing.** If any error remains, `--apply` writes nothing. The dry run performs the same edit plan, including re-parsing every edited file, so a clean dry run means the apply will succeed.
* **Surgical edits.** Data files use many layouts (compact one-line records, 1- or 2-space indent). The importer changes only the touched values, so `git diff` shows only the intended lines. It proves the result is still valid JSON before writing.
* **Ledger.** `docs/review/ledger.jsonl` is appended on `--apply` (who, when, which id, text changes, with before and after). Review-only items (opening prayer, calendar texts, parasha names) are recorded there as `ok-report-only`; a person then edits the source file.
* **Vocabulary rebuilds.** `data/vocab/vocab5000.json` is generated by `tools/vocab/` from `data/vocab/overrides.json`. A text fix to a vocabulary item is also written to `docs/review/vocab-overrides-patch.json`; copy those entries into `overrides.json` or the next rebuild will undo them. The same risk applies to the `proofread` flags: check that the generator keeps `reviewedBy`/`proofread:true`, or re-run `--apply` from the ledger.

### After you apply

Run `node --test`. Several existing tests pin the unreviewed state on purpose (for example in `tests/corpus.*`, `tests/letters.data.test.js` and `tests/vocab.schema.test.js`, which assert that no record is claimed as proofread). On a scratch copy, applying a handful of `ok` rows made those assertions fail, as expected. Whoever owns those tests has to relax them to "proofread only with reviewedBy and reviewedOn", otherwise the first real review will turn the suite red. The importer never edits tests.

Also review the `git diff` of `data/` before committing. `quality: "draft"` on stroke records is left as is; promote it by hand if the reviewer's `ok` covers it.

## Files

* `tools/review/build_packet.mjs`: builds packets (`--root`, `--out`, `--only a,b`, `--no-pdf`, `--date`).
* `tools/review/apply_review.mjs`: importer (`--apply`, `--reviewer`, `--date`, `--report FILE`, `--root`).
* `tools/review/config.mjs`: areas, priority order, time model, the 43 liturgy-addition ids, `VOCAB_TOP` (1000).
* `tools/review/lib/`: `extract.mjs` (one extractor per area plus the generic one), `render.mjs` (HTML), `csv.mjs`, `jsonspan.mjs` (span-aware JSON patcher).
* `tests/review.*.test.js`: tests on a fake repo built in a temp dir, plus a smoke test that runs the extractors on the real data (read-only).
* `docs/review/out/`: generated packets. The sheet columns are `id, area, hebrew, transliteration, english, what_to_check, status, corrected_text, reviewer_notes, reviewer, review_date, priority, source`.
* `docs/review/.gitignore`: keeps the generated PDFs and the 1 MB `vocab-rest` sheet out of git; they are rebuilt by the command above.

## Known limits

* The packet is only as complete as the flags: an unflagged record that is also wrong is not in it.
* Transliteration in the sheets is produced by the app's own `src/pronunciation/transliterate.js` wherever the data has none. It is a check on the pointing, not independent evidence.
* PDFs were checked by looking at rendered pages (prayers p1, letter strokes p1, vocabulary p2, `israel-everyday` p1), not every page. Long Hebrew texts (Yigdal, Berich shmei) are set smaller to fit a card.
* Time estimates are a model, not a measurement.
