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
| OCR character error rate, pooled | 2.4% (letters and digits; vowel points, spaces and punctuation ignored) |
| OCR character error rate, mean per image | 2.0% |
| Images read with no error | 16 of 20 |
| Lines read with no error | 23 of 28 |
| Lines translated correctly, end to end | 25 of 28 (21 of 28 with exact word-list matches only; 4 more through the one-letter near-match rule) |
| Lines translated correctly when given the true Hebrew | 26 of 28 |

Reading the translation numbers honestly:

- 18 of the 20 signs use words that are in the word list, and two (`חנות ספרים`, `תחנת דלק`) were chosen from outside it. So "26 of 28 given the true Hebrew" shows the lookup works and that the list has gaps. It says nothing about translation quality on signs in general.
- The five misread lines were all look-alike letters (kaf read as bet, samekh as tet, an extra vav). Four were recovered by the near-match rule and are labelled "closest match" in the app. One was left untranslated because two listed words were one letter away.
- An earlier render of one sign at a hairline font weight was read as nonsense. The generator now uses weight 600 for variable fonts and keeps one sign at weight 300.

The on-device path of the app (the in-browser reader plus the same word list) was also run on the same 20 images in headless Chromium on a desktop machine: 24 of 28 lines came out with the correct English on the photo, with no page errors. Its character error rate was not computed separately.

Not measured: Google Cloud Vision accuracy, Google Cloud Translation accuracy, any real photograph, any phone, speed on a phone.

## Checks That Ran

- `python3 -m pytest tools/camera-translate/tests -q`: 17 passed.
- `node --test tests/camera.model.test.js`: 9 passed.
- `node --test tests/camera.browser.test.js`: 2 passed in headless Chromium with the `_headers` Content-Security-Policy applied to the page: no policy violations, on-device path contacts only the app's own origin, the service path posts exactly one JPEG with no EXIF block.

## Open Items For John

1. **Credentials and hosting.** Create a Google Cloud project with the Vision and Translation APIs, set a budget cap, deploy the service, then set `backendUrl`. If the service is on another origin, add that origin to `connect-src` in `_headers`.
2. **Run `python3 eval.py --ocr vision --translate google`** once credentials exist, and record the numbers here.
3. **Privacy page.** `#/privacy` describes an app that uploads no photos. Before `backendUrl` is set on a public site, that page needs a paragraph for the camera service. It was left unchanged because nothing is uploaded in the shipped configuration.
4. **Word list review.** The pointing and Latin spellings of the 87 entries were written for this project and have not been checked by a native speaker (`review` field in the file).
5. **Naming Google in the send notice.** The notice tells the learner the photo may be passed to Google Cloud. That is a disclosure of where the photo goes; say so if you would rather word it differently.
6. **Sacred text.** A line with the four-letter name is left as photographed and listed as "Sacred text" with no Hebrew, English or audio. This is the strictest reading of the rule and is yours to relax.
7. **Real photos.** Ten to twenty phone photos of real signs, with the correct text typed out, would turn the numbers above into something that can be quoted.
