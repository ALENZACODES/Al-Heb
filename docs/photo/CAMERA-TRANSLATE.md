# Camera Translator (`#/camera`): What It Is, What Was Reused, What Was Measured

Last updated 2026-11-10 (fifth pass).

## In One Paragraph

A learner photographs a Hebrew sign or menu and sees the English drawn over the Hebrew on the photo itself, can switch between the photo as taken and the translated photo, and can tap any line to hear the Hebrew and see how to say it, with word-by-word help one button deeper. **Everything runs in the browser. There is no server and nothing is uploaded** (owner decision, 2026-11-10). Reading uses the app's existing in-browser Hebrew reader. Translation uses a 156-entry sign word list, then the app phrasebook, then the app dictionary word for word.

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
`src/camera/camera.view.js`, `camera-model.js`, `camera-client.js`, `on-device.js`; `data/camera/sign-glossary.json`, `glossary-cases.json`, `sample-sign.jpg`.

Offline test rig (never called by the app): `tools/camera-translate/`. It holds the 20 test signs and their generator (plus the wear and hard variants), the measuring scripts, and a FastAPI service with Tesseract and Google Cloud adapters that was built before the no-server decision. The service is not deployed and the app has no code that can reach one. The Google adapters have never been run against Google.

## Measured Results

Every number below is on **computer-made sign images**, in headless desktop Chromium. They are not photographs and it was not a phone. Real photos will do worse, by an amount nobody has measured.

### The App's Own Path (In The Browser)

`node tools/camera-translate/e2e-batch.mjs <folder>`. Results files in `tools/camera-translate/tests/signs/`: `results-browser.json`, `-wear.json`, `-hard.json`, `-review-phrases.json`.

| Set | Images | Lines | Character error rate | Lines read exactly | Lines with the right English on the photo | Wrong English drawn |
|---|---|---|---|---|---|---|
| Stored 20 signs | 20 | 28 | 1.9% | 25 | 27 (96.4%) | 0 |
| Wear: clean, noise, blur, 4-degree tilt, perspective, low contrast | 120 | 168 | 1.9% | 150 | 162 (96.4%) | 0 |
| Hard: dark, bright, a pole in front, tight crop, 8-degree tilt, bilingual, vowel-pointed | 133 | 185 | 5.9% | 137 | 169 (91.4%) | 2 |
| Review phrases: the 48 sign phrases named in the two review files, each under twelve conditions | 576 | 576 | 4.4% | 495 | 545 (94.6%) | 7 |
| All four | 849 | 957 | | 807 | 903 (94.4%) | 9 |

The same figures split by whether something is in front of the sign:

| | Lines | Right English | Wrong English drawn |
|---|---|---|---|
| Every condition except the pole | 881 | 863 (98.0%) | 1 |
| A pole hiding about 7% of the sign's width | 76 | 40 (52.6%) | 8 |

How to read this:

- **A partly hidden sign is the unsolved case.** About half of those lines are recovered. The 8 wrong drawings there are translations of the part that could be read ("Store" for a shoe shop sign, "Forbidden 2" where the pole was read as a digit). They are right for what was read and wrong for the sign.
- The one wrong drawing elsewhere is a tight crop that the reader turned into a different real word that the phrasebook holds.
- One sign in the first three sets (`shoe-shop`) is kept outside the word list on purpose and is never translated: 13 of the 381 lines in those sets.
- The review-phrases set uses phrases chosen by the review, not by the builder, but every one of them is now in the word list, and the images are the builder's renderings, not the review's.
- None of this measures how many real-world signs the word list covers.
- Mean time per image was 0.2 to 0.3 s on this desktop, after the reader had loaded. Phone speed was not measured.

What this pass changed, on the wear and hard sets: lines read exactly went from 132 to 150 of 168 and from 119 to 137 of 185; lines with the right English from 159 to 162 and from 162 to 169. The gain came from reading at a second, letter-height-matched size (the first size alone was also changed from 1800 to 1200 pixels after a sweep: character error 4.0% at 1800, 2.7% at 1200, 3.0% at 900, 3.1% at 600 on the wear set).

### Review Rows (Text Level)

The two review files list example failures with the reader's raw output. Those rows are kept as fixtures (`tools/camera-translate/tests/fixtures/review-r1-fails.json`, `review-r2-fails.json`) and run through the word-list rules in the unit tests. This checks the translation step on the review's own reader output. It cannot fix a wrong reading.

| Fixture | Rows | Right English before | Wrong before | Right now | Wrong now | Left untranslated now |
|---|---|---|---|---|---|---|
| First file (cloud reader) | 80 | 15 | 12 | 45 | 4 | 31 |
| Second file (on-device reader, 50,000 runs, mean 71.41) | 88 | 33 | 2 | 50 | 1 | 37 |

"Before" for the first file is the rules as reviewed; for the second file it is the rules of the previous push. Every source phrase in both files now translates when read correctly (80 of 80 and 88 of 88). The wrong rows are a different real listed word or a wrong digit returned by the reader. Most rows left untranslated are readings such as a single letter, an empty string or noise, where nothing can be recovered after the reader.

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

156 entries. 51 take their vowel pointing and Latin spelling from the app dictionary (`checked: app-dictionary`; a unit test keeps them identical). The other 105 were written for this project and have not been checked by a native speaker. Of the first 87 entries, 59 words were compared with the dictionary earlier: 46 identical, 12 differ only because the sign uses a joined, command or "the" form, 1 was corrected.

`realNeighbours` (375 words) is built by `tools/camera-translate/build_real_neighbours.py` from the dictionary and phrasebook: real words that sit one letter, or two look-alike letters, from a listed word. A unit test runs all 5,184 single dictionary words through the translator and requires that none is "corrected".

## Checks That Ran (2026-11-10, Fifth Pass)

- `node --test tests/camera.model.test.js`: 18 passed.
- `node --test tests/camera.browser.test.js`: 5 passed, in headless Chromium with the `_headers` Content-Security-Policy on the page. Every test asserts no policy violations, no request other than GET, and no address contacted other than the app's own.
- `python3 -m pytest tools/camera-translate/tests -q`: 20 passed.
- `npm test` (the full unit tier): 3,328 passed, 0 failed, 10 skipped.

## Not Done, Not Measured

- No real photograph and no phone has been through this.
- The Hebrew voice is the device's own; nothing was recorded for sign words, and playback was not verified by ear.
- The 105 project-written word-list entries are unchecked.
- A sign that is partly hidden is the weakest case measured (13 of 28).
- The review's own images have not been run through the app path from here; only its listed reader outputs have.
- Coverage of real-world signs by the word list is unknown.
- The word-for-word tier draws dictionary glosses in reading order (a describing word is moved before its noun). It was exercised by tests on a handful of phrases only.

## Examples

`docs/photo/camera-examples/` holds three before and after pairs (optical store, bakery, exit) saved from the app's own path in headless Chromium. The files carry no metadata.
