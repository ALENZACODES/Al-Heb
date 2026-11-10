# Camera Translator (`#/camera`): What Was Built, What Was Reused, What Was Measured

Date: 2026-11-10.

## In One Paragraph

A learner photographs a Hebrew sign or menu and sees the English drawn over the Hebrew on the photo itself, can switch between the original and the translated photo, and can tap any line to hear the Hebrew and see how to say it. With no service configured (the state this branch ships in) everything runs on the device: the app's existing in-browser Hebrew reader plus an 87-entry word list of common sign and menu words. When `data/camera/config.json` names the service in `tools/camera-translate`, the photo is sent there after an explicit notice and button, and the service uses Google Cloud Vision and Google Cloud Translation when it has credentials. **The Google path has not been run against Google**: no credentials were available. Its request and response handling is tested against the real library types with a stand-in client only.

## Existing OCR Code Found (GitHub code search across the ALENZACODES account, 2026-11-10)

Search terms: tesseract, pytesseract, ocr, paddleocr, easyocr, docling, surya, text detection, DOCUMENT_TEXT_DETECTION, image_to_string, createWorker, heb.traineddata, vision. Code search covers default branches only.

| Repo | Path | What it does | Licence | Used here |
|---|---|---|---|---|
| Al-Heb | `src/photo/engines/tesseract-browser.js` | Hebrew OCR in the browser: vendored tesseract.js 7 + `heb` model, lazy, word boxes | repo: all rights reserved (John Khan); vendored engine Apache-2.0 | **Yes**: the on-device reader for `#/camera` |
| Al-Heb | `src/photo/order-lines.js` | right-to-left reading order from word boxes | repo licence | **Yes**: imported by the app code; ported line for line into `camera_translate/ocr.py` |
| Al-Heb | `src/photo/hebrew.js`, `src/photo/preprocess.js` | mark stripping, contrast and deskew before OCR | repo licence | **Yes**: `stripMarks`, `isHebrew`, `isPointed`; preprocessing runs inside the reused reader |
| Al-Heb | `src/shell/names.js` | sacred-name rules | repo licence | **Yes**: imported in the app; mirrored in `camera_translate/hebrew.py` |
| Al-Heb | `tools/ocr-server.mjs` | local helper: Tesseract CLI `heb` + Argos translation over loopback HTTP | repo licence | Pattern reused (raw image body, loopback-only CORS, Tesseract TSV parsing); not called |
| Al-Heb | `tools/ocr-bench/gen.py`, `bench.mjs`, `e2e-scan.mjs` | synthetic image generator, benchmark, browser check for `#/scan` | repo licence | Method reused for `tests/make_signs.py` and `e2e-camera.mjs` |
| Al-Heb | `src/photo/engines/local-server.js`, `web.js`, `pipeline.js`, `scan.view.js` | the `#/scan` screen and its adapters | repo licence | Not changed; `#/scan` is untouched |
| renewal-radar | `backend/renewal/ocr/camera.py` | bounded intake for photographed documents (size, signature, pixel budget, quality) | MIT (John Khan) | Approach reused in `camera_translate/intake.py` (same order of checks), rewritten smaller |
| renewal-radar | `backend/renewal/ocr/engines.py`, `engine_registry.py`, `tempfiles.py`, `documents/text.py` | Tesseract engine with provenance, optional Docling/Paddle/EasyOCR adapters, temp-dir cleanup | MIT | Not used: built for English mortgage documents; this service avoids temp files altogether |
| decision-ladder | `modules/renewal-radar/...` | a copy of the renewal-radar OCR module | not checked | Not used |
| beljour, beljour-app | `web/src/vision/*`, `js/vision/*` | matched the word "vision" only; by path these are camera/face pipelines, not text recognition | not opened | Not used |

## What Is New

App (all loaded only when `#/camera` opens; nothing added to the first-install precache):

- `src/camera/camera.view.js`: the screen.
- `src/camera/camera-model.js`: service-address rules, word-list translation, answer checking, text fitting and alignment, colour sampling.
- `src/camera/camera-client.js`: config and service calls.
- `src/camera/on-device.js`: on-device reading and canvas overlay.
- `data/camera/sign-glossary.json`, `config.json`, `glossary-cases.json`, `sample-sign.jpg`.
- One line each in `src/shell/router.js`, `nav.strings.js`, `search.js`, `nav-model.js`, `offline.js`, `tools/build-precache.mjs`; `precache-manifest.js` and `views.generated.js` regenerated.

Service: `tools/camera-translate/` (see its README).

## Measured Results

All numbers are on **20 computer-made sign images** (28 lines): shop, door and street signs and three menus, in five fonts, 12 clean and 8 with simulated wear (noise, blur, 4-degree tilt, perspective, low contrast, one thin-lettered sign). They are not photographs. Real photos will do worse, by an amount nobody has measured.

Reader: Tesseract `heb` on the server. Translator: the built-in word list. Run: `python3 eval.py`, 2026-11-10.

| Measure | Result |
|---|---|
| OCR character error rate, pooled | 2.9% (letters and digits; vowel points, spaces and punctuation ignored) |
| OCR character error rate, mean per image | 2.5% |
| Images read with no error | 16 of 20 |
| Lines read with no error | 23 of 28 |
| Lines translated correctly, end to end | 24 of 28 (21 of 28 with exact word-list matches only; 3 more through the one-letter near-match rule) |
| Lines translated correctly when given the true Hebrew | 26 of 28 |

The first run of this table, before tilted text was levelled, gave 2.4% and 25 of 28. Levelling changed how one tilted sign was resampled and it picked up a second wrong letter. The wider run below is why levelling was kept.

### Every Sign Under Every Kind Of Wear (120 Images)

`python3 eval.py --wear` renders each of the 20 signs six ways in memory. Same reader and translator.

| Wear | Character error rate before levelling | After levelling | Lines read exactly (of 28) | Lines translated end to end (of 28) |
|---|---|---|---|---|
| clean | 3.4% | 3.4% | 22 | 24 |
| noise + heavy JPEG | 3.9% | 3.9% | 21 | 23 |
| blur | 2.4% | 2.4% | 25 | 24 |
| tilt of 4 degrees | 11.2% | 2.4% | 24 | 25 |
| perspective | 2.4% | 1.9% | 25 | 25 |
| low contrast, uneven light | 2.9% | 2.9% | 23 | 24 |

The last two columns are after levelling. Tilt was the weak point (20 lines read exactly before, 24 after). The "clean" row is not the main table: it is all 20 signs rendered without wear, including the ones the main set stores with wear.

Reading the translation numbers honestly:

- 18 of the 20 signs use words that are in the word list, and two (`חנות ספרים`, `תחנת דלק`) were chosen from outside it. So "26 of 28 given the true Hebrew" shows the lookup works and that the list has gaps. It says nothing about translation quality on signs in general.
- The five misread lines were all look-alike letters (kaf read as bet, samekh as tet, an extra vav). Three were recovered by the near-match rule and are labelled "closest match" in the app. One was left untranslated because two listed words were one letter away, and one because two letters were wrong.
- An earlier render of one sign at a hairline font weight was read as nonsense. The generator now uses weight 600 for variable fonts and keeps one sign at weight 300.

The on-device path of the app (the in-browser reader plus the same word list) was also run on the same 20 images in headless Chromium on a desktop machine: 24 of 28 lines came out with the correct English on the photo, with no page errors. Its character error rate was not computed separately.

Not measured: Google Cloud Vision accuracy, Google Cloud Translation accuracy, any real photograph, any phone, speed on a phone.

## Checks That Ran

- `python3 -m pytest tools/camera-translate/tests -q`: 19 passed.
- `node --test tests/camera.model.test.js`: 11 passed.
- `node --test tests/camera.browser.test.js`: 3 passed in headless Chromium with the `_headers` Content-Security-Policy applied to the page: no policy violations, on-device path contacts only the app's own origin, the service path posts exactly one JPEG with no EXIF block.

## Added In The Second Pass (2026-11-10)

- **Word By Word.** In the panel for a tapped line, a second button looks up each word: the sign list first (listed phrases stay together), then the app's own 6,303-entry dictionary (`data/vocab/index.json`, fetched only when the button is pressed), then one attached prefix letter (the, and, in, to, from), then a possible joined form or plural. The last three are shown as possibilities, never as fact. A spelling with several meanings shows up to three, things before verbs. This means a sign outside the word list (for example the bookshop test sign) still gets each word explained, although nothing is drawn on the photo.
- **Tilted text.** The service levels tilted text before reading and draws the English at the sign's own tilt (table above).
- **Privacy page.** `#/privacy` now lists the camera service among the requests that can carry something of the learner's, says no address is set in this build, and describes the on-device path.
- **Way in.** The Scan screen links to the Camera Translator.
- **Word list check.** The 87 entries were compared with the app's sourced dictionary: of the 59 words found there, 46 have identical pointing, 12 differ because the sign form is a joined form, a command or carries "the" (for example `בֵּית` beside the dictionary's `בַּיִת`), and 1 (`פיתה`) was corrected to the dictionary's and phrasebook's spelling. 50 words in the list (place names, plurals, joined forms) are not in the dictionary and remain unchecked.
- **Fixed.** A stray "null" appeared in the tap panel for lines with no English.
- **First-install size.** The privacy and Scan additions are in installed files: the first install is now 3.948 MiB, about 1.7 KB under the 3.95 MiB limit the tests enforce.

## Open Items For John

1. **Credentials and hosting.** Create a Google Cloud project with the Vision and Translation APIs, set a budget cap, deploy the service, then set `backendUrl`. If the service is on another origin, add that origin to `connect-src` in `_headers`.
2. **Run `python3 eval.py --ocr vision --translate google`** once credentials exist, and record the numbers here.
3. **Privacy page.** `#/privacy` now describes the camera service and says no address is set. When `backendUrl` is set, change that sentence ("No address is set in this build") and the short version at the top of the page.
4. **Word list review.** The pointing and Latin spellings of the 87 entries were written for this project and have not been checked by a native speaker (`review` field in the file). The dictionary comparison above covers 59 words' pointing only.
5. **Naming Google in the send notice.** The notice tells the learner the photo may be passed to Google Cloud. That is a disclosure of where the photo goes; say so if you would rather word it differently.
6. **Sacred text.** A line with the four-letter name is left as photographed and listed as "Sacred text" with no Hebrew, English or audio. This is the strictest reading of the rule and is yours to relax.
7. **Real photos.** Ten to twenty phone photos of real signs, with the correct text typed out, would turn the numbers above into something that can be quoted.
