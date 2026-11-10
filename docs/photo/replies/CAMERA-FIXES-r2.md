# Camera Fixes, Reply To The Second Review File

Date: 2026-11-10. Applies to "Camera translator failures, 50,000-run review" on the on-device reader: mean 71.41, reading 77.34, translation 65.47, 19,886 failures. (The file asks for the reply name `CAMERA-FIXES-r1.md`; that name already holds the reply to the first file, so this one is r2.)

## Two Things To Know First

1. The translations in the review rows ("Square Dizengoff", "Store Optics") are not what the app's rules produce for those readings, at the reviewed commit or now: the app has always given "Dizengoff Square" and "Optical Store" for them. The review seems to have looked words up in the glossary file one by one. The app's rules (`createGlossary` in `src/camera/camera-model.js`) match phrases, name patterns and closest matches. To score what a learner sees, run the app path itself: `node tools/camera-translate/e2e-batch.mjs <folder>` on any folder of images with a `ground-truth.json` (`{items:[{id, file, variant, lines:[{he, en}]}]}`). It uses no cloud service. Or, for text only: `echo '["<reader output>"]' | node tools/camera-translate/translate-cli.mjs`.
2. The app does not hand the photo straight to the reader. It levels it, enlarges it, turns the letters black on white and frames it first (`src/camera/on-device.js`). If the review ran the reader on the raw images, the reading score describes the bare reader, not the app.

## The 88 Listed Rows, Through The App's Rules

| | Right English | Wrong English | Left untranslated |
|---|---|---|---|
| Rules of the previous push | 33 | 2 | 53 |
| Rules now | 50 | 1 | 37 |

All 88 source phrases translate when read correctly. The rows are a permanent fixture: `tools/camera-translate/tests/fixtures/review-r2-fails.json`.

## By Review Group

| Group | Count | What was done | Status |
|---|---:|---|---|
| ocr-empty-or-total-miss | 6,624 | Reader-side. The app frames, enlarges and recolours before reading; on the builder's dark, bright and tight-crop images it now reads 27 of 28 lines each. Rows where the reader returned one letter or nothing cannot be translated. | Addressed on the app path; needs the review's images to confirm |
| ocr-error-nikkud | 2,869 | Vowel points the reader invents are stripped. A missing first letter (`ניסה` for `כניסה`) is completed when unique. | Fixed where a rule can |
| ocr-error-on-occlude | 2,263 | New: a line in pieces is matched to the closest whole listed phrase when at most a quarter of its letters differ and nothing else is close. A short piece is completed only into a listed phrase (`אי כניסה` gives "No Entry", never "Entrance"). | Partly. Builder's pole test: 13 of 28 |
| glossary-miss-after-ok-ocr | 1,960 | `מחיר מיוחד` added. Two misread words that together form a listed phrase now resolve. | Fixed for the listed rows |
| ocr-letter-or-word-error | 1,873 | Closest-match rules as before, now also checked against the neighbouring word. | Mostly fixed |
| ocr-error-mixed-script | 1,339 | Everything after a slash is treated as the other language. Letters mixed with digits or symbols are dropped as noise. On the photo only the Hebrew words are boxed and replaced. | Fixed |
| translation-paraphrase-or-wrong | 631 | Partial outputs such as "Store" for a two-word sign came from word-by-word lookup, not from the app's rules. `אי כניסה` no longer risks "Entrance". | Fixed on the app's rules |
| noise, angle, dark, blur | 2,327 | Reader-side, as the first group. | Addressed on the app path |

## What Is Not Fixed

- A sign with part of it hidden. This is the weakest case: 13 of 28 on the builder's test, with 2 partial translations drawn ("Store" for a shoe shop sign with the second word hidden).
- A wrong digit (`22` for `24`) is passed through as read.
- Readings of a single letter, an empty string or pure noise.

## The App Path, Measured By The Builder

Computer-made signs, headless desktop Chromium. Not photographs, not a phone, not the review's images.

| Set | Lines | Right English on the photo | Wrong English drawn |
|---|---|---|---|
| Stored 20 signs | 28 | 27 (96.4%) | 0 |
| Wear (noise, blur, tilt, perspective, low contrast) | 168 | 159 (94.6%) | 0 |
| Hard (dark, bright, pole, tight, 8-degree tilt, bilingual, pointed) | 185 | 162 (87.6%) | 2 |

The hard set is below the bar because of the pole condition; without it, 149 of 157 (94.9%).
