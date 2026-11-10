# Camera Translator (`#/camera`): What It Is, What Was Reused, What Was Measured

Last updated 2026-11-10 (third pass).

## In One Paragraph

A learner photographs a Hebrew sign or menu and sees the English drawn over the Hebrew on the photo itself, can switch between the photo as taken and the translated photo, and can tap any line to hear the Hebrew and see how to say it, with word-by-word help one button deeper. **Everything runs in the browser. There is no server and nothing is uploaded** (owner decision, 2026-11-10). Reading uses the app's existing in-browser Hebrew reader. Translation uses a 155-entry sign word list, then the app phrasebook, then the app dictionary word for word.

## How A Photo Is Handled

1. The photo is redrawn through a canvas: upright, at most 2000 px on the long side, no location or camera details.
2. A tilted sign is levelled (`deskew` in `src/photo/preprocess.js`).
3. For the reader only, the picture is enlarged if small and its letters are made black on white whatever the sign's colours were. Two page modes are tried and the more confident reading is kept.
4. Words are put in right-to-left reading order and grouped into lines (`src/photo/order-lines.js`).
5. Each Hebrew line is translated:
   - the sign word list (phrases first, longest match);
   - if a word is not listed: a listed other form (a plural), "the" joined to a listed word, or a closest match (one letter different, one letter added or removed, or two letters different when both are look-alike pairs such as bet and kaf). A closest match is always labelled as one. A real Hebrew word is never "corrected" into a listed word unless the result forms a listed phrase with the word beside it;
   - the app phrasebook, for a whole line it holds;
   - the app dictionary word for word, only if every word on the line is found exactly as written. Labelled as word for word.
6. A line that is still untranslated is left untouched on the photo. So is a line that contains the four-letter name, whose text is never shown, drawn or spoken.
7. Each translated line is painted out with the sign's own colour (shaded when light falls across it) and the English is drawn in the sign's letter colour, sized to the line. Hebrew that was flush right becomes English flush left.

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

Offline test rig (never called by the app): `tools/camera-translate/`. It holds the 20 test signs and their generator, the measuring scripts, a Python copy of the word-list rules held to the same cases file, and a FastAPI service with Tesseract and Google Cloud adapters that was built before the no-server decision. The service is not deployed and the app has no code that can reach one. The Google adapters have never been run against Google.

## Measured Results

Every number below is on **computer-made sign images**, in headless desktop Chromium. They are not photographs and it was not a phone. Real photos will do worse, by an amount nobody has measured.

### The App's Own Path (In The Browser)

`node tools/camera-translate/e2e-batch.mjs <folder>`. Results files: `tools/camera-translate/tests/signs/results-browser.json` and `results-browser-wear.json`.

| Set | Images | Lines | Character error rate | Lines read exactly | Lines with the right English on the photo | Wrong English drawn |
|---|---|---|---|---|---|---|
| Stored 20 signs | 20 | 28 | 2.9% | 23 | 27 (96.4%) | 0 |
| Every sign under six kinds of wear | 120 | 168 | 4.0% | 132 | 156 (92.9%) | 0 |

By wear, lines with the right English out of 28: clean 27, noise 27, blur 25, tilt 26, perspective 25, low contrast 26.

How to read this:

- One sign in the set (`shoe-shop`) is kept outside the word list on purpose and is never translated: it accounts for 1 of the 28 and 6 of the 168. Counting only lines whose words are listed, the wear run is 156 of 162 (96.3%).
- 18 of the 20 signs were written from the same list of sign words that the word list was written from. This measures reading and lookup. It does not measure how many real-world signs the list covers.
- The six other misses on the wear run: a price read as letters (`10` read as two letters, twice), one word read with extra or wrong letters beyond what the closest-match rules accept (three times), and another with two wrong letters (once).
- "Wrong English drawn" counts any English put on the photo that is not the expected English. It was 0 on both sets.
- Mean time per image was about 0.27 s on this desktop, after the reader had loaded. Phone speed was not measured.

Before this pass the same path gave 24 of 28 on the stored set as it then was. The set changed in this pass (two out-of-list signs were replaced, because the old two were added to the word list), so the figures are not a like-for-like comparison.

### Review Round 1 Rows (Text Level)

The round 1 review ran a cloud vision model, not the in-browser reader, over other computer-made signs and listed 80 example failures. Those 80 reader outputs are kept in `tools/camera-translate/tests/fixtures/review-r1-fails.json` and run through the word-list rules in the unit tests.

| | Right English | Wrong English | Left untranslated |
|---|---|---|---|
| Rules as reviewed | 15 | 12 | 53 |
| Rules now | 43 | 4 | 33 |

All 80 source phrases now translate when read correctly (60 did before). The 4 wrong ones are cases where that reader returned a different real listed word (for example the word for entrance where the sign said danger); nothing after the reader can catch that. The 33 left untranslated are misreadings two or more letters away from anything listed, where the rules refuse to guess.

### Offline Test Rig (Tesseract On A Server, Word List Only)

`python3 eval.py` and `python3 eval.py --wear` in `tools/camera-translate`. Kept as a second measuring stick; it is not the app's path.

| Set | Character error rate | Lines translated end to end |
|---|---|---|
| Stored 20 signs | 3.9% | 26 of 28 |
| Wear run, by wear | clean 4.3%, noise 4.3%, blur 2.4%, tilt 2.9%, perspective 2.9%, low contrast 3.4% | 26, 27, 26, 27, 26, 26 of 28 |

### Things Tried And Not Kept

- A third reading pass on a grey (not black-and-white) picture when the first two were not confident: 156 of 168 lines against 158 without it on the set as it then was. Removed.
- Accepting any two-letter difference for words of six letters or more: on the review rows it produced 3 wrong answers for 2 right ones. Replaced by the narrower look-alike rule.

## Word List

155 entries. 51 take their vowel pointing and Latin spelling from the app dictionary (`checked: app-dictionary`; a unit test keeps them identical). The other 104 were written for this project and have not been checked by a native speaker. Of the first 87 entries, 59 words were compared with the dictionary earlier: 46 identical, 12 differ only because the sign uses a joined, command or "the" form, 1 was corrected.

`realNeighbours` (374 words) is built by `tools/camera-translate/build_real_neighbours.py` from the dictionary and phrasebook: real words that sit one letter, or two look-alike letters, from a listed word. A unit test runs all 5,184 single dictionary words through the translator and requires that none is "corrected".

## Checks That Ran (2026-11-10, Third Pass)

- `node --test tests/camera.model.test.js`: 15 passed.
- `node --test tests/camera.browser.test.js`: 4 passed, in headless Chromium with the `_headers` Content-Security-Policy on the page. Every test asserts no policy violations, no request other than GET, and no address contacted other than the app's own. One test saves the translated photo from a phone-style photo that carries camera details and a position, and checks the saved file carries none.
- `python3 -m pytest tools/camera-translate/tests -q`: 20 passed.
- `npm test` (the full unit tier): 3,325 passed, 0 failed, 10 skipped.

## Not Done, Not Measured

- No real photograph and no phone has been through this.
- The Hebrew voice is the device's own; nothing was recorded for sign words, and playback was not verified by ear.
- The 104 project-written word-list entries are unchecked.
- Coverage of real-world signs by the word list is unknown.
- The word-for-word tier draws dictionary glosses in reading order (a describing word is moved before its noun). It was exercised by tests on a handful of phrases only.

## Examples

`docs/photo/camera-examples/` holds three before and after pairs (optical store, bakery, exit) saved from the app's own path in headless Chromium. The files carry no metadata.
