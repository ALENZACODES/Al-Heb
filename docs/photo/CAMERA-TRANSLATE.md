# Camera Translator (`#/camera`): What It Is, What Was Reused, What Was Measured

Last updated 2026-11-10 (seventh pass).

## In One Paragraph

A learner photographs a Hebrew sign or menu and sees the English drawn over the Hebrew on the photo itself, can switch between the photo as taken and the translated photo, and can tap any line to hear the Hebrew and see how to say it, with word-by-word help one button deeper. **Everything runs in the browser. There is no server and nothing is uploaded** (owner decision, 2026-11-10). Reading uses the app's existing in-browser Hebrew reader. Translation uses a 159-entry sign word list, then the app phrasebook, then the app dictionary word for word.

## How A Photo Is Handled

1. The photo is redrawn through a canvas: upright, at most 2000 px on the long side, no location or camera details.
2. A tilted sign is levelled (`deskew` in `src/photo/preprocess.js`).
3. For the reader only, the picture's letters are made black on white whatever the sign's colours were, and a white frame is added so letters at the edge of a tight crop are not lost. The picture is read at a standard size (two page modes, the more confident kept), then read again at the size that makes its letters about 44 pixels tall. The reader makes different mistakes at different letter sizes; line by line, the reading the word list recognises is kept. A line still untranslated after that is cut out and read once more on its own.
4. Words are put in right-to-left reading order and grouped into lines (`src/photo/order-lines.js`).
5. Each Hebrew line is translated:
   - reader noise is dropped first (letters mixed with digits or symbols, a number with punctuation stuck to it), and on a line with a slash only the Hebrew side is used;
   - the sign word list (phrases first, longest match);
   - if a word is not listed: a listed other form (a plural), "the" joined to a listed word, or a closest match (one letter different, one letter added or removed, or two letters different when both are look-alike pairs such as bet and kaf). A closest match must also make sense where it stands: alone on the line, part of a listed phrase, a street or square name, or a describing word beside a listed word. A real Hebrew word, or a piece of two or three letters, is corrected only when the result is a listed phrase;
   - if the line is in pieces and still fails: the closest whole listed phrase, when at most a quarter of its letters differ and nothing else is nearly as close (for a sign with a letter hidden);
   - the app phrasebook, for a whole line it holds;
   - the app dictionary word for word, only if every word on the line is found exactly as written and none is a grammar word. Labelled as word for word.
   Every guess is labelled as a closest match. A line the reader returned noise on is marked as partly read.
   - A reading that looks cut off is not drawn. That means: a stray mark beside the line and what is left is a guess, a single word or includes a number; or a kind-of-place word such as "Store" or "House" with only a number beside it ("Gate" and "Room" are allowed a number). The line is listed under the photo as "Possibly: ..." with the reason, and a notice says a line was left as it is.
6. A line that is still untranslated is left untouched on the photo. So is a line that contains the four-letter name, whose text is never shown, drawn or spoken.
7. On a bilingual line only the Hebrew words are boxed and replaced; the sign's own English is left alone. Each translated line is painted out with the sign's own colour (shaded when light falls across it) and the English is drawn in the sign's letter colour, sized to the line. Hebrew that was flush right becomes English flush left.

## Existing OCR Code Found And Reused

Found by GitHub code search across the ALENZACODES account on 2026-11-10 (default branches only).

| Repo | Path | What it does | Licence | Used here |
|---|---|---|---|---|
| Al-Heb | `src/photo/engines/tesseract-browser.js` | Hebrew OCR in the browser: vendored tesseract.js 7 + `heb` model, lazy, word boxes | repo: all rights reserved (John Khan); vendored engine Apache-2.0 | **Yes**: the reader. One optional argument was added (page mode per call) |
| Al-Heb | `src/photo/preprocess.js` | contrast, skew estimate, levelling | repo | **Yes**: `deskew` |
| Al-Heb | `src/photo/order-lines.js`, `src/photo/hebrew.js` | reading order, mark stripping | repo | **Yes** |
| Al-Heb | `src/shell/names.js` | sacred-name rules | repo | **Yes** |
| Al-Heb | `data/vocab/index.json`, `data/corpus/phrasebook.json` | the app dictionary (6,303 rows) and phrasebook (204 lines) | see `data/vocab/LICENSE-NOTES.md`; phrasebook project-owned | **Yes**: translation tiers and word-by-word help |
| Al-Heb | `tools/ocr-server.mjs`, `tools/ocr-bench/*` | local helper, synthetic image generator, browser check for `#/scan` | repo | Method reused for the test rig |
| renewal-radar | `backend/renewal/ocr/camera.py` | bounded intake for photographed documents | MIT (John Khan) | Approach reused in the offline test rig's intake |
| renewal-radar | rest of `backend/renewal/ocr/` | OCR engines for English mortgage documents | MIT | No |
| decision-ladder | `modules/renewal-radar/...` | a copy of the above | not checked | No |
| beljour, beljour-app | `*/vision/*` | matched the word "vision" only; not opened | not checked | No |

## Files

App (loaded only when `#/camera` opens; nothing in the first-install precache):
`src/camera/camera.view.js`, `camera-model.js`, `camera-client.js`, `on-device.js`; `data/camera/sign-glossary.json`, `real-neighbours.json`, `glossary-cases.json`, `sample-sign.jpg`.

Offline test rig (never called by the app): `tools/camera-translate/`. It holds the 20 test signs and their generator (plus the wear and hard variants), the measuring scripts, and a FastAPI service with Tesseract and Google Cloud adapters that was built before the no-server decision. The service is not deployed and the app has no code that can reach one. The Google adapters have never been run against Google.

## Measured Results

Every number below is on **computer-made sign images**, in headless desktop Chromium. They are not photographs and it was not a phone. Real photos will do worse, by an amount nobody has measured.

### The App's Own Path (In The Browser)

`node tools/camera-translate/e2e-batch.mjs <folder>`. Results files in `tools/camera-translate/tests/signs/`: `results-browser.json`, `-wear.json`, `-hard.json`, `-review-phrases.json`.

| Set | Images | Lines | Character error rate | Lines read exactly | Lines with the right English on the photo | Wrong English drawn |
|---|---|---|---|---|---|---|
| Stored 20 signs | 20 | 28 | 1.9% | 25 | 27 (96.4%) | 0 |
| Wear: clean, noise, blur, 4-degree tilt, perspective, low contrast | 120 | 168 | 1.9% | 150 | 162 (96.4%) | 0 |
| Hard: dark, bright, a pole in front, tight crop, 8-degree tilt, bilingual, vowel-pointed | 133 | 185 | 5.9% | 137 | 168 (90.8%) | 1 |
| Review phrases: the 48 sign phrases named in the two review files, each under twelve conditions | 576 | 576 | 4.5% | 495 | 539 (93.6%) | 2 |
| All four | 849 | 957 | | 807 | 896 (93.6%) | 3 |

Split by whether something is in front of the sign:

| | Lines | Right English | Wrong English drawn |
|---|---|---|---|
| Every condition except the pole | 881 | 862 (97.8%) | 1 |
| A pole hiding about 7% of the sign's width | 76 | 34 (44.7%) | 2 |

How to read this:

- **These totals are 7 lines lower than the fifth pass (903, 94.4%), on purpose.** The sixth pass made guessing stricter (next section). Six of the seven lost lines are hidden-sign guesses.
- **The seventh pass cut wrong drawings from 9 to 3 without losing a right line.** A reading that looks cut off is no longer drawn; it is offered under the photo as "Possibly: ..." (step 5 above). The six drawings removed were all of the kind "Store" for a shoe shop sign or "House 2" where the pole was read as a digit.
- **A partly hidden sign is still the unsolved case for right answers: 34 of 76.** It now mostly stays untranslated instead of being drawn wrong. The 3 wrong drawings left: a guess with a wrong price on a hidden menu line, a street name drawn without the hidden word "Street", and a tightly cropped "Danger" that the reader returned as a different real word the phrasebook holds.
- One sign in the first three sets (`shoe-shop`) is kept outside the word list on purpose: 13 of the 381 lines in those sets.
- Every phrase in the review-phrases set is in the word list, and all images are the builder's renderings.
- Mean time per image was 0.2 to 0.3 s on this desktop in the sixth pass, after the reader had loaded. The times in the seventh-pass results files are higher only because the four sets were run at the same time; time was not re-measured. Phone speed was not measured.

### A Sign That Is Not In The Word List

The four image sets only use listed phrases, so they say nothing about the commonest real case: a sign the list does not have. `node tools/camera-translate/leave-one-out.mjs --list` hides each listed entry in turn (with any longer phrase containing it), translates the line with what is left, and compares the result with the hidden entry's own English. Perfect reading is assumed; place names are skipped.

| | Same English | Close | Different English | Nothing drawn |
|---|---|---|---|---|
| Fifth pass rules | 49 | 2 | 40 | 58 |
| Now (152 entries) | 47 | 4 | 22 | 79 |

Before, "different" included plainly wrong answers: Parking for Store, Window for Hotel, Pita for Pizza, Tomorrow for Price, Calf for Market, Gene for Garden. Now the 22 are near-synonyms from the dictionary (Peril for Danger, Poultry for Chicken, Coffee House for Coffee Shop) with a few sense misses left (Urgent for Push, Origin for Exit, Floor for Cashier). Three changes did this:

1. **A much larger list of real words that are never "corrected"**: 3,264 word forms (was 375), built from the app dictionary, its example sentences and the 50,000-form frequency list the vocabulary was already built from. It is in its own file, `data/camera/real-neighbours.json`, because it is derived from share-alike data.
2. **Word-for-word English is drawn only for a spelling with one naming meaning.** A spelling that can be salt or sailor, market or calf, is left for the Word By Word panel, which shows both.
3. **Whole-phrase guessing accepts only what a hidden letter can cause**: a missing letter, a thin stroke where a letter was, or one look-alike letter. "Flower shop" used to be guessed as "Bookshop"; now it is not. On 20,000 random pairs of real words it makes 0 guesses (1 before).

Two productive words were added so unseen signs compose: "No" (`אין`, giving No Exit, No Parking) and "House" (`בית`). A kind-of-place word now goes last in English (Fish Store, not Store Fish).

### Review Rows (Text Level)

The two review files list example failures with the reader's raw output. Those rows are kept as fixtures (`tools/camera-translate/tests/fixtures/review-r1-fails.json`, `review-r2-fails.json`) and run through the word-list rules in the unit tests. This checks the translation step on the review's own reader output. It cannot fix a wrong reading.

| Fixture | Rows | Right English before | Wrong before | Right now | Wrong now | Left untranslated now |
|---|---|---|---|---|---|---|
| First file (cloud reader) | 80 | 15 | 12 | 39 | 4 | 37 |
| Second file (on-device reader, 50,000 runs, mean 71.41) | 88 | 33 | 2 | 43 | 1 | 44 |

"Before" for the first file is the rules as reviewed; for the second file it is the rules of the previous push. Every source phrase in both files now translates when read correctly (80 of 80 and 88 of 88). The "right now" figures were 45 and 50 before the sixth pass: readings that are themselves real words (the word for a neighbour where the sign said danger, a postman for post office) are no longer corrected, because on a real sign they are more likely to be what the sign says. The wrong rows are a different real listed word or a wrong digit returned by the reader. Most rows left untranslated are readings such as a single letter, an empty string or noise, where nothing can be recovered after the reader.

### Offline Test Rig (Tesseract On A Server, Word List Only)

`python3 eval.py` and `python3 eval.py --wear` in `tools/camera-translate`. Kept as a second measuring stick; it is not the app's path.

| Set | Character error rate | Lines translated end to end |
|---|---|---|
| Stored 20 signs | 3.9% | 26 of 28 |
| Wear run, by wear | clean 4.3%, noise 4.3%, blur 2.4%, tilt 2.9%, perspective 2.9%, low contrast 3.4% | 26, 27, 26, 27, 26, 26 of 28 |

### Things Tried And Not Kept


- A third reading pass on a grey (not black-and-white) picture when the first two were not confident: 156 of 168 lines against 158 without it on the set as it then was. Removed.
- A looser limit for whole-phrase guessing (a quarter of the letters rounded up instead of down): 2 more right rows on each review fixture, but on 20,000 random pairs of real dictionary words it guessed a listed phrase 49 times against once. Kept rounded down; a unit test holds the rate.
- Hiding a translation when unread ink sits beside the line (to stop partial translations of hidden signs): not built, because an arrow or logo beside a one-word sign would also hide a correct translation, and that could not be measured here.
- Accepting any two-letter difference for words of six letters or more: on the review rows it produced 3 wrong answers for 2 right ones. Replaced by the narrower look-alike rule.

## Word List

159 entries. 53 take their vowel pointing and Latin spelling from the app dictionary (`checked: app-dictionary`; a unit test keeps them identical). The other 106 were written for this project and have not been checked by a native speaker. Of the first 87 entries, 59 words were compared with the dictionary earlier: 46 identical, 12 differ only because the sign uses a joined, command or "the" form, 1 was corrected.

The guard list of real words (`data/camera/real-neighbours.json`, 3,264 words, CC BY-SA 4.0) is built by `tools/camera-translate/build_real_neighbours.py --download`, which checks the frequency list against the SHA-256 already pinned in `data/vocab/sources.lock.json`. `--check` runs in the tests without the network. A unit test runs all 5,184 single dictionary words through the translator and requires that none is "corrected".

## Checks That Ran (2026-11-10, Seventh Pass)

- `node --test tests/camera.model.test.js`: 20 passed.
- `node --test tests/camera.browser.test.js`: 5 passed, in headless Chromium with the `_headers` Content-Security-Policy on the page. Every test asserts no policy violations, no request other than GET, and no address contacted other than the app's own.
- `python3 -m pytest tools/camera-translate/tests -q`: 20 passed.
- `npm test` (the full unit tier): UNIT_COUNT.

## Not Done, Not Measured

- No real photograph and no phone has been through this.
- The Hebrew voice is the device's own; nothing was recorded for sign words, and playback was not verified by ear.
- The 106 project-written word-list entries are unchecked.
- A sign that is partly hidden is the weakest case measured (34 of 76 lines). The cut-off rule was tuned on the builder's own pole images; how often it hides a correct one-word translation on a real photo (a one-word sign with an arrow or logo read as a stray mark) is not known. On the builder's sets it hid none.
- The offline test rig does not apply the cut-off rule; only the app does.
- The review's own images have not been run through the app path from here; only its listed reader outputs have.
- Coverage of real-world signs by the word list is unknown.
- The word-for-word tier draws dictionary glosses in reading order (a describing word is moved before its noun). It was exercised by tests on a handful of phrases only.

## Examples

`docs/photo/camera-examples/` holds three before and after pairs (optical store, bakery, exit) saved from the app's own path in headless Chromium. The files carry no metadata.
