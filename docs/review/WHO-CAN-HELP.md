# Who can help with ALEF

This page lists, for each kind of outside helper, what they would check, where it lives, how big the job is, and what they must not be asked to do. It names no person or organisation, and nobody has reviewed anything yet: as of this writing the repo holds no returned verdicts (`docs/review/STATUS.md` says 0 reviewed). The consolidated review packet is in [NATIVE-REVIEW-PACKET.md](NATIVE-REVIEW-PACKET.md).

How the numbers were obtained: counts were taken by scripts over the repo files on 2026-11-04 (JSON files parsed and counted; directories listed). Anything marked "not measured" was not counted. Time figures are planning guesses, not measurements: nobody has timed a reviewer on this material.

Rules that apply to every helper:
- Blank means "not reviewed". Never ask for a blanket OK on a file or area.
- Do not ask anyone to approve something they could not read, hear, see or test themselves.
- No row in this repo is marked reviewed on the strength of this page.

---

## (a) Cantor / chazzan

- What to check: trope names and marks, the cantillated texts, the order of the Torah-read ladder, nusach and melodic reading notes, liturgical pronunciation as the app teaches it, the prayer-reading routes.
- Where it lives:
  - `data/torahread/aliyah.json`, `ladder.json`, `trope.json`, `gloss-input.json`; `src/torahread/`, `src/torahreader/`
  - `data/corpus/trope/table.json`, `data/corpus/trope/shema.json`, `data/corpus/trope/priestly-blessing.json`, `data/corpus/reader/`; `src/trope/`
  - `data/trope-trainer/levels.json`; `data/service/orders.json`; `data/corpus/torah-service-guide.json`
  - `data/speak/prayers.json`; `data/pronunciation/prayerwords.json`; `docs/trope/`, `docs/torahread/`, `docs/timedread/`
- Size (measured): aliyah file 10 steps; ladder 4 levels; trope trainer 3 levels; service orders 3; Torah-service guide 13 sections; 70 registry entries in `data/corpus/registry.json`, none with a true `clergyReviewed` value; 9 prayers in `data/speak/prayers.json`; 10 prayer words in `data/pronunciation/prayerwords.json`.
- Plausible time (planning guess): 2 to 4 hours for a first pass of the Torah-read and trope data; the prayer corpus is larger and not timed.
- Do not ask them to: record or approve audio (none exists), approve a melody from text alone, rule on halachic questions, or approve the whole corpus in one pass.

## (b) Rabbi

- What to check: liturgical content and meaning, English glosses that touch religion, divine-name handling (including the `writeGodAsGd` setting), Shabbat and holiday material, the welcome statement, the three-tradition story texts.
- Where it lives:
  - `docs/sensitivity/REVIEW-FOR-CLERGY.md`, `docs/sensitivity/CONVENTIONS.md`, `docs/sensitivity/OPEN.md`
  - `src/shell/names.js` (the setting `writeGodAsGd`, default false) and `src/shell/settings.js`
  - `docs/drafts/WELCOME-STATEMENT.md` (21 lines, a draft not yet in the app)
  - `data/festivals/` (`shabbat-ready.json`, `vocab.json` with 10 packs, `links.json`); `data/morning-verses.json` (130 entries)
  - `data/letters/memory-chain.json` (13 story variants differ between traditions; they are rows `MS-*` in `docs/review/packet/04-memory-chain.csv`)
  - in the packet: the 5 rows flagged `native + rabbi` in `02-gender.csv` and `03-lesson-derived-vocab.csv` (words that are or contain divine names)
- Size (measured): see above; the festival and morning-verse counts are file entry counts, not reviewed items.
- Plausible time (planning guess): 1 hour for the welcome statement, the divine-name rows and `REVIEW-FOR-CLERGY.md`; festival material not timed.
- Do not ask them to: approve the app as a whole, certify any text as kosher or authentic, settle disagreements between traditions, or approve the welcome statement as the owner's voice (the owner decides that).

## (c) Native Israeli Hebrew speaker

- What to check: everyday Hebrew, dialogue naturalness, idioms and phrasebook items, gender agreement, pointing, glosses, whether a word is something people actually say.
- Where it lives (in the packet): `02-gender.csv` (125 rows), `03-lesson-derived-vocab.csv` (117), `06-dialogues.csv` (54 dialogue lines and 24 level-check rows), `07-minimal-pairs.csv` (98), the word rows in `04-memory-chain.csv`. Outside the packet: `data/curriculum/dialogues.json`, `data/curriculum/loanwords.json`, `data/israel/`, `data/corpus/phrasebook.json`, `data/speak/sets.json` (60 sets), `data/vocab/words.json` (6,303 records).
- Size (measured): the packet rows above; the earlier area packets in `docs/review/out/` hold more (see `docs/review/README.md`; their counts were not re-measured here).
- Plausible time (planning guess): 30 to 60 minutes for the dialogue and gender rows.
- Do not ask them to: judge liturgical Hebrew, rule on Ashkenazi or Sephardi pronunciation, or review all 6,303 vocabulary records.

## (d) Sephardi and Ashkenazi community readers

- What to check: the per-tradition sound lines and respellings: is each sentence true for their tradition.
- Where it lives: `data/pronunciation/consonants.json` (27 letters x 3 traditions = 81 say lines; 19 of the 27 letter records carry `verified: true`, 8 do not); `data/traditions/` (`guide.json`, `sounds.json` with 11 sounds, `sources.json`); `data/pronunciation/niqqud.json` (15 records); `data/pronunciation/variants/` (rule-generated); packet rows `SY-*`, `MH-*`, `MS-*`, `MP-*`.
- Size (measured): 81 say lines, 27 hook rows, 13 story-variant rows, 98 minimal pairs. Of the 27 letters, 21 have the same say text in all three traditions (measured by comparing strings).
- Plausible time (planning guess): 20 to 30 minutes per tradition for the say lines and hooks.
- Do not ask them to: speak for a whole community, review the other tradition's rows, or approve rule-generated respellings in bulk (there are 6,630 derived records per `docs/review/README.md`).

## (e) Hebrew teacher or linguist

- What to check: grammar notes, roots, niqqud rules, word levels (A1 to B2), the cafe-dialogue level mismatch, pointing in lessons.
- Where it lives: `data/grammar/notes.json` (6 topics); `data/roots/families.json` (364 families, 82 rule-checked, 0 verified) and `data/roots/verified.json` (0 confirmed roots); `data/pronunciation/niqqud.json`, `data/pronunciation/runtime/rules.json` (7 pages), `exceptions.json`; `data/curriculum/lessons.json` (125 lessons) and `data/curriculum/lessons-intermediate/` (50 files); word levels in `data/vocab/words.json` (level counts measured: A1 825, A2 1,216, B1 1,820, B2 2,442); packet `01-roots.csv` (364), the `DV-*` rows in `06-dialogues.csv`.
- Plausible time (planning guess): roots, 1 to 2 hours for the larger families first; rules and levels not timed.
- Do not ask them to: approve root links they cannot vouch for (the app only says "share letters" until a root is listed in `verified.json`), or re-level the whole word list.

## (f) Voice actors and sound engineers

- What to check: nothing yet; this is a recording job. Clips need a spoken reading in each tradition, with a consistent level and no clipping.
- Where it lives: `data/audio/manifest.json` (6,384 clips: 3,776 word, 1,096 line, 660 syllable, 420 prayer, 342 letter, 90 vowel) and `manifest-words-israeli.json`, `-sephardi.json`, `-ashkenazi.json` (6,174 each); `docs/record-kit/README.md`; `docs/audio/NO-AUDIO.md`.
- Size (measured): 6,384 + 3 x 6,174 = 24,906 clips, all with status `missing`; `data/audio/summary.json` shows 0 recorded.
- Plausible time: not estimated here; a recording plan has not been timed.
- Do not ask them to: record before the Hebrew they would read has been reviewed (they would be fixing errors in audio), speak liturgical items without a cantor, or sign anything about voice rights before a lawyer has seen the terms.

## (g) Illustrators and designers

- What to check: that each picture shows what its caption says, is clear at small size, and carries no copied character or brand.
- Where it lives: `assets/letters/morph/` (28 SVG files, counted); `data/letters/memory-chain.json` (27 forms; picture idea and alt text); `docs/review/MEMORY-CHAIN-AUDIT.md` (an earlier audit that lists pictures that did not match their story; I did not re-check it); `assets/img/` (2,681 files, counted); `data/img/index.json`; `docs/images/` including `RIGHTS.md` and `REVIEW-QUEUE.md`; `data/images/review/index.html`.
- Size (measured): 28 letter pictures; 2,681 files under `assets/img/`.
- Plausible time (planning guess): 1 hour to look at the 28 letter pictures against their stories.
- Do not ask them to: draw from a named game or product, or sign off the image rights (that is for the lawyer).

## (h) Accessibility people: Deaf, blind, colour-blind users, disability advocates

- What to check: whether the accessibility features work for them in real use. Only they can truly test this; automated tests in the repo do not stand in for that.
- Where it lives: `src/shell/a11y.model.js`, `src/shell/a11y.view.js`, `src/shell/settings.view.js`; `docs/a11y/NEWVIEWS.md`, `docs/a11y/SETTINGS-ADDED.md`, `docs/A11Y.md`; tests `tests/a11y.*.test.js`.
- Size (measured): not counted as items; this is task-based testing, not a row list.
- Plausible time (planning guess): 1 hour per person for a guided walk through the first-day path.
- Do not ask them to: test unannounced or unfinished screens without saying so, work unpaid without being told, or confirm "accessible" in general. Ask what worked and what did not.

## (i) A lawyer

- What to check: licences (share-alike vocabulary data), image and voice permissions, terms for selling later.
- Where it lives: `docs/legal/` (`CONTENT-LICENCE-AUDIT.md`, `LICENCE-OPTIONS.md`, `SALE-READINESS.md`, `DECISIONS-FOR-JOHN.md`, `ROUTES.md`), `data/vocab/LICENSE-NOTES.md`, `data/vocab/attribution.json`, `data/legal/attributions.json`, `docs/images/RIGHTS.md`, `docs/vocab/LICENSES.md`.
- Size (measured): 5 files in `docs/legal/`; `attribution.json` counts 6,303 vocabulary records, of which 6,033 trace to a share-alike source and 117 are lesson-derived with no licence stated (the same 117 as in packet file 03).
- Plausible time (planning guess): not estimated; depends on the questions.
- Do not ask them to: rule on Hebrew content, or review anything the repo's own audit says was not read (the audit lists what it did not check).

## (j) Teacher or education reviewer

- What to check: curriculum order, time budget per lesson, whether the path from letters to reading is realistic, exercise design.
- Where it lives: `docs/curriculum/SYLLABUS.md`, `PATH.md`, `INTERMEDIATE.md`; `data/curriculum/lessons.json` (125 lessons), `lessons-intermediate/` (50 files), `belts.json`, `class-track.json`; `docs/teacher/README.md`.
- Size (measured): 125 core lessons and 50 intermediate files.
- Plausible time (planning guess): 2 hours to read the syllabus and try the first 10 lessons.
- Do not ask them to: check Hebrew correctness (route that to a native speaker or teacher of Hebrew), or compare with a named commercial course.

## (k) Learners and beta testers

- What to check: can a beginner follow the first-day path, where do they get stuck, is the English clear, does the app work on their device.
- Where it lives: the app itself (`index.html`, `src/`); first-day path in `data/firstday/` and `src/firstday/`; onboarding in `data/onboarding/`.
- Size: not counted; use task lists, not row lists.
- Plausible time (planning guess): 30 minutes for the first day.
- Do not ask them to: judge whether Hebrew is correct, or to keep going if they are confused. Confusion is the finding.
