# Sale readiness: licence facts that could complicate a later sale

Written 2026-11-04. NOT LEGAL ADVICE. I am not a lawyer and no lawyer has reviewed this. Section 1 lists what I observed in the repo files and what I ran. Section 3 lists open questions for a lawyer; they are questions, not conclusions. Licence labels below are what each source says about itself (see `docs/legal/CONTENT-LICENCE-AUDIT.md`, `docs/corpus/LICENSES.md`, `docs/vocab/LICENSES.md`); I did not re-read any upstream licence page for this note.

## 1. Observed facts

### 1.1 ShareAlike sources (CC BY-SA 4.0)

| Source | Where it is in the repo | What it feeds |
|---|---|---|
| Wiktionary via Wiktextract/kaikki.org (CC BY-SA 4.0, GFDL also mentioned) | `data/vocab/words.json`, `data/vocab/vocab5000.json`, `data/vocab/packs/`, `data/vocab/packs.json`, `data/vocab/index.json`, `data/vocab/themes/`, `data/vocab/frequency.json`, `data/vocab/deck-order.json`, `data/vocab/attribution.json` | Lemmas, glosses, pointed forms, forms. `data/vocab/attribution.json` counts 6,033 of 6,303 records as Wiktionary-derived. |
| FrequencyWords 2018 Hebrew (OpenSubtitles-based; repo README says CC-by-sa-4.0 for content) | Same vocab files (rank order) | Word ranking |
| Wikipedia text, paraphrased (CC BY-SA 4.0) | `data/traditions/sources.json`, `data/traditions/sounds.json` | Pronunciation-tradition notes; repo says facts paraphrased, no wording copied (not checked by me line by line) |

Downstream of the vocab data (they read `data/vocab/words.json` or the packs, so they carry Wiktionary-derived glosses or pointing): `src/vocab/`, `src/speak/` (`data/speak/`), `src/listen/`, `src/wordtrace/`, `src/audio/` (word audio manifests under `data/audio/`), and the review packs and book material generated from them. `data/torahread/words30.json` says it does not take glosses from `data/vocab`.

### 1.2 Attribution-only, but with conditions a buyer will inherit

- Tatoeba sentences, CC BY 2.0 FR: 5,272 `words.json` records carry one (counted by me from `example.source.type`, which is what `docs/vocab/ATTRIBUTION.md` says; the licence audit and vocab licence notes were brought in line, see 1.5). Each record keeps both authors, both sentence ids and the URL in `example.source`. Author credit is per sentence, so it needs to travel with each sentence wherever one is shown.
  - Observation (earlier today): the vocab-themes screen (`src/vocab/themes.view.js`) shows examples whose source channel is the project's own corpus or curriculum (counted 642 corpus, 405 curriculum), not Tatoeba. The Tatoeba sentences are in the served data files and in the review CSVs under `docs/vocab/review/`, but I found no UI that displays them. `src/shell/sources.js` now also holds `exampleCredit()` (per-sentence author credit with sentence id and link), and `src/vocab/themes.view.js` calls it for each example; it returns nothing unless the example's source type is Tatoeba, and the themes examples are not. Status: Tatoeba sentences are not displayed anywhere yet, as far as I found. The credits screen lists Tatoeba with the credit line and `perItemCredit: true`.
- Metsudah siddur 1981, via Sefaria, label CC-BY: 9 records in `data/corpus/registry.json` when counted by me on 2026-11-04 from the `source` field (Modeh Ani, Mourner's Kaddish, Vayehi binsoa, Brich shmei, Elohai netzor, Sim shalom, Lecha Dodi, Yigdal, zimun). Hagomel was counted here as Metsudah earlier today (10), but the working-tree registry now sources it from Torat Emet 357. `data/legal/attributions.json` was later updated to say 9 and no longer lists Hagomel under Metsudah. `docs/corpus/LICENSES.md` calls this the riskiest source: no licence text from the publisher was found, and the label is Sefaria's. Copies of these strings also sit in `data/corpus/source-snapshot.json` (history of re-sourced records) and in derived files: `data/speak/prayers.json`, `data/corpus/reader/`, `data/corpus/trope/`, audio and book output. I did not trace every derived file.
- Torat Emet 357 via Sefaria, label Public Domain: 17 records in the registry as counted by me now (16 earlier today, before Hagomel moved to it). The toratemetfreeware.com home page footer says "all rights reserved" (read 2026-11-04 per `docs/corpus/LICENSES.md`) with no licence text for the siddur data; on another Sefaria index the same version is labelled "unknown". The label is not confirmed by a rights-holder.
- Shaliehsaboo edition via Sefaria, label CC0: 16 records; label is Sefaria's only; another version of the same title is labelled unknown.
- JPS 1917 via Sefaria, label Public Domain: label only; not re-checked against a second source.
- Hebcal data, CC BY 4.0: `data/calendar/hebcal-fixtures.json`.
- UXLC (tanach.us): copy without restriction; do not represent as the WLC.
- Fonts (Heebo, Frank Ruhl Libre, Gveret Levin in use; Alef, Noto Sans Hebrew, Noto Serif Hebrew present in `assets/fonts/`): SIL OFL 1.1, licence texts in `assets/fonts/*-OFL.txt` and `docs/licenses/`. `assets/fonts/FONTS.md` says no Reserved Font Name is declared in the copied headers, except that `docs/licenses/OFL-alef.txt` line 2 says "with Reserved Font Name Alef"; the web build does not load Alef (`assets/css/fonts.css`). The OFL forbids selling the font on its own; the font files are bundled with the app. The web woff2 files are format conversions without subsetting (per FONTS.md).
- Tesseract.js, Hebrew trained data, xkb layout: permissive licences recorded in `assets/vendor/_tesseract/` and the credits entries; the Hebrew model and xkb entries are marked unverified.

### 1.3 NonCommercial terms

I searched `data/`, `docs/`, `src/`, `tools/` for "NonCommercial", "non-commercial", "CC BY-NC". No shipped data source carries an NC licence. The hits are in documents that discuss rejected or unused sources (`docs/legal/*`, `docs/corpus/LICENSES.md`, `docs/verification/*`, `docs/tts/README.md`, `docs/book/IMAGE-RUN.md`) and in `data/curriculum/resource-concepts-gratis.json`, which lists free resources as concept references only. I did not read each hit in full; the "not used" statements come from the repo's own notes.

### 1.4 Other rights questions that are not SA/NC

- Generated illustrations: `assets/img/gen/` holds 1,828 files on disk (958 tracked by git, the rest untracked at the time of writing). `data/images/generated-manifest.json` reports `count: 0` and `assets/img/index.json` lists no files, so I could not see any image wired into the app. Provenance is in `data/images/provenance.json`; `docs/images/RIGHTS.md` records the repo's own caveats (terms read through a summariser; copyrightability of machine-made images uncertain; disclosure is the owner's job). The credits entry `generated-images` is `unverified`.
- Project-written text with no stated licence: 117 lesson-derived vocab records (`data/curriculum/lessons.json`; flag `lesson-licence-not-stated`). They are bundled into the CC BY-SA vocab data set.
- The project's own code and original text have no licence chosen (the credits screen says all rights are reserved). `docs/legal/LICENCE-OPTIONS.md` and `docs/legal/DECISIONS-FOR-JOHN.md` hold the options.
- `data/curriculum/resource-concepts-gratis.json` records that one free course (FSI) is described as public domain by a mirror site, unconfirmed; the file is a concept list, and I did not check whether any course text was copied.

### 1.5 Record-keeping inconsistencies found (not all fixed)

- `docs/legal/CONTENT-LICENCE-AUDIT.md` and `data/vocab/LICENSE-NOTES.md` said 5,315 Tatoeba records and 21 Metsudah records. Both files were updated later on 2026-11-04 to the counts from the data (5,272 and 9, 21 of 70 became 9 of 70); the credits data was updated earlier. `data/legal/attributions.json` was later updated to 9 / 17 / 16, matching the registry.
- `data/legal/attributions.json` had 21 / 6 / 15 prayer-record counts for Metsudah / Torat Emet / Shaliehsaboo and said no generated image had been ingested. Updated today to 10 / 16 / 16 and to the current image facts (see section 2).
- `docs/corpus/LICENSES.md` says the generator `src/corpus/tools/build-licenses.mjs` does not yet know the re-sourcing; re-running it would overwrite hand edits.
- The Wiktionary attribution (`ATTRIBUTION` in `src/vocab/vocab.view.js`) is shown on the vocabulary screen. Earlier today I did not find a credit line on the speak, listen and word-trace screens. Since then a short Sources line (`sourcesLine()` in `src/shell/sources.js`: "Word meanings: Wiktionary contributors (CC BY-SA 4.0) ... Sources and licences", linking `#/credits`) has been added to the vocab, themes, speak, listen and word-trace views (read from the working-tree code; not checked in a browser).

### 1.6 Assets added 2026-11-04 (record-and-compare, gender setting, vowel-fade, roots, memory chain)

| Asset | Provenance as recorded | Licence consequence |
|---|---|---|
| `assets/letters/morph/*.svg` (28 pictures) | Original works by John Khan, no third-party sources (owner's statement). I checked the files: no credit line, licence text or external link. 27 of 28 embed the print letter outline from `data/letters/letters.json` (my path match; `sin.svg` did not match and I did not look further). | The pictures themselves: owner's. The embedded letter outlines are derived from DejaVu Sans (Bitstream Vera notice must travel). Row `morph-pictures`. |
| `data/letters/memory-chain.json`, `data/letters/mnemonics.json`, `tools/letters/memory-chain.source.json` | Hooks, picture ideas and stories original (owner's statement). Hebrew word, pointing, gloss and rank copied from `data/vocab/words.json`. | Text: owner's. Copied words: CC BY-SA 4.0 (Wiktionary). Row `memory-chain-text`. |
| `data/roots/families.json`, `verbs.json` | Copied from `data/vocab/words.json` (file `source` field); roots and binyan labels come from its dictionary source, unreviewed. `verified.json` is empty. | CC BY-SA 4.0, share-alike. Row `practice-data-from-vocab`. |
| `data/gender/templates.json` | Copied from `words.json`; gender tags from the dictionary source; person-noun list is an editorial selection. | Same row. |
| `data/nikkudfade/reading-set.json`, `homographs.json` | Copied or computed from `words.json`. `schedule.json` holds design numbers (project choices). | Same row. No example sentences are carried, so no Tatoeba duty. |
| `data/speak/minimal-pairs.json` (used by record-and-compare) | Rule-generated from the vocabulary data per `src/recordcompare/model.js`; I did not open the generator. | Treated as CC BY-SA 4.0 in the same row. |
| Microphone recordings | Kept in page memory only, never stored or uploaded by the app code (checked in `src/speak/recognizer.js`, `src/recordcompare/`, and by test). | Nothing to license. |

Records inside `words.json` that come from the 117 lesson-derived or the phrasebook set are copied into these files too, and carry the same unresolved status as in 1.4.

**Lacking provenance or unclear:** (a) how the 28 pictures were produced is not recorded in the repo; (b) no drawn-by or date record exists for them; (c) the generator behind `minimal-pairs.json` was not checked; (d) nothing here has been reviewed by a Hebrew teacher.

## 2. What I changed

Earlier today only `data/legal/attributions.json` (mechanical count and description fixes: Tatoeba 5,315 to 5,272; Metsudah 21 to 10 records; Torat Emet 6 to 16; Shaliehsaboo 15 to 16; generated-images description). No status or licence wording was changed. No other file edited besides this note.

## 3. Open questions for a lawyer

1. Does merging the CC BY-SA vocab data into the app (same bundle, same screens, speak/listen/word-trace features built from it) make the app, or any larger combined work, subject to CC BY-SA, or is it an aggregate? (`docs/vocab/LICENSES.md` already says to ask before selling a mixed bundle.)
2. Would a sale of the app or of the vocab data set be possible given that the vocab data must stay under CC BY-SA 4.0 or a compatible licence? What does a buyer inherit, and can an exclusive-asset valuation be claimed for it?
3. Does app-store packaging or any DRM count as an effective technological measure that restricts the rights CC BY-SA grants?
4. Can CC BY 2.0 FR sentences (Tatoeba) sit inside a data set distributed under CC BY-SA 4.0? What exactly must the per-sentence author credit look like, and where must it appear if the sentences are later displayed in the app or printed in the book?
5. If the Wiktionary GFDL dual licence is not relied on, are there any duties from it?
6. Is the Sefaria "CC-BY" label enough for the 1981 Metsudah vocalised text (9 records), given the publisher's licence text was not found and the NLI catalogue note says copying may be prohibited? Is replacement or permission needed before a sale?
7. Do Sefaria labels of Public Domain / CC0 for Torat Emet (16 records) and Shaliehsaboo (16 records) hold up when the upstream site says "all rights reserved" or the same version is labelled unknown elsewhere?
8. Can the 117 lesson-derived records and the unreviewed pointing and glosses in project-written records be licensed by the project at all, and under what terms should they be released?
9. Rights position of machine-generated illustrations in `assets/img/gen/` (ownership, copyrightability, disclosure duties in stores and in the book) before any are wired in.
10. Whether a buyer would require a software licence for the project's own code and original text to be chosen before closing (currently all rights reserved, nothing stated).

## 4. Tests run

`node --test tests/credits.test.js tests/legal.test.js tests/vocab.attribution.test.js`: 28 passed, 0 failed (run before and after the credits data edit). `node tools/meta/scan.mjs --text`: PASS (it also printed a note that three allowlist entries matched nothing; not mine). No `licenses*` test file exists in `tests/`; the closest match is `tests/vocab.attribution.test.js`, which I ran.

## 5. Update 2026-11-04 (new features audit)

Changed: `src/shell/privacy.view.js` (microphone, session-only scroll key, no IndexedDB/cookies, speech-voice wording), `data/legal/attributions.json` and `CONTENT-LICENCE-AUDIT.md` (three new rows: `morph-pictures`, `memory-chain-text`, `practice-data-from-vocab`), Sources line added to the roots, gender, vowel-fade and record-and-compare screens, tests in `tests/credits.test.js` and `tests/legal.test.js`.

Additional open questions: (11) the hosting header was `Permissions-Policy: microphone=()`, which blocked the microphone on the deployed site; it is now `microphone=(self)` (own origin only) so record-and-compare and the Say-it recorder can work there once deployed (not tested live). (12) How were the 28 pictures made, and is "original work by John Khan" accurate for each file? If a tool generated any, question 9 applies. (13) The letter outlines inside the pictures derive from DejaVu Sans; is that notice enough? (14) Gender setting is optional personal data stored on the device only; confirm that is how a buyer's privacy review should describe it.
