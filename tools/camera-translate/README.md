# Camera Translator: Offline Test Rig

**The app does not use anything in this folder at run time.** The Camera Translator (`#/camera`) runs entirely in the browser, with no server and no upload (owner decision, 2026-11-10). This folder is what measures it:

- `tests/signs/`: the 20 computer-made test signs, their ground truth and the saved results; `tests/make_signs.py` regenerates them (`--wear-dir DIR` writes the 120 wear variants, `--hard-dir DIR` the 133 harder ones).
- `e2e-camera.mjs`, `e2e-batch.mjs`: drive the real screen and the real in-browser reader in headless Chromium, under the site security policy.
- `build_real_neighbours.py`: rebuilds the guard list in the sign word list after the list is edited.
- `translate-cli.mjs`: runs the app's own word-list rules from the command line; `camera_translate/hebrew.py` calls it, so the rig has no second copy of the rules. Needs Node.
- `eval.py`: a second measuring stick using Tesseract on this machine.
- `camera_translate/app.py` and the rest: a FastAPI service built before the no-server decision (Tesseract or Google Cloud reading, Pillow/OpenCV overlay). It is not deployed and the app has no code that can call it. Its Google adapters have never been run against Google. The sections below describe that service as built.

## What It Does

1. Takes one photo (JPEG, PNG or WebP, at most 10 MB) as the request body.
2. Rebuilds it from its pixels: upright, at most 2000 px on the long side, no EXIF, GPS or other metadata.
3. Finds the Hebrew lines and their boxes.
   - Google Cloud Vision `DOCUMENT_TEXT_DETECTION` with language hint `he` when credentials are set.
   - Otherwise Tesseract with the `heb` model, on the server itself, after levelling tilted text. It is also the fallback when Vision fails.
4. Translates each line to English.
   - Google Cloud Translation when credentials are set.
   - The built-in sign word list otherwise, and for lines the cloud translator could not answer.
5. Removes the Hebrew letters from each box (flat fill on plain signs, OpenCV inpainting on uneven ones, strong blur when letters cannot be separated), then draws the English sized to the box in the sign's own colours. Hebrew that was flush right becomes English flush left.
6. Answers with the regions (box, Hebrew, English, how to say it, where the English came from) and the translated photo.

## Privacy Rules Kept In The Code

- The photo is held in memory for the length of the request. No file, database, cache or log line holds a photo or its text. The Tesseract path passes the image on stdin, not through a temp file. `tests/test_camera_translate.py` checks that handling a photo writes no file.
- Metadata is stripped before anything else reads the photo, and the returned photo is encoded fresh. Checked by tests on both directions.
- Responses carry `Cache-Control: no-store`.
- With the cloud path on, the photo (metadata-free) and the Hebrew text would go to Google. The app cannot reach this service, so no learner photo does.
- A line containing the four-letter name is left exactly as photographed: not sent for translation, not drawn over, and its text is not returned.

## Run It

```
cd tools/camera-translate
pip install -r requirements.txt          # Tesseract path also needs: tesseract-ocr tesseract-ocr-heb
uvicorn camera_translate.app:app --host 127.0.0.1 --port 8790
```

| Variable | Meaning |
|---|---|
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to a service-account key with the Cloud Vision API and the Cloud Translation API enabled. Without it the service uses Tesseract and the word list. |
| `CAMERA_OCR` | `vision`, `tesseract` or `auto` (default). |
| `CAMERA_TRANSLATE` | `google`, `word-list` or `auto` (default). |
| `ALLOWED_ORIGINS` | Comma-separated site origins allowed to call the service, for example `https://alef-review.onrender.com`. Loopback origins are always allowed. |
| `RATE_LIMIT_PER_MIN` | Photos per minute per client address. Default 12. |

`Dockerfile` builds the same thing with Tesseract included. `python3 demo.py` opens an optional Gradio page for trying photos by hand (needs `pip install gradio`; not run in this build).

## Test And Measure

```
python3 -m pytest tools/camera-translate/tests -q        # 20 tests; no cloud calls
python3 tools/camera-translate/tests/make_signs.py       # regenerate the 20 synthetic signs
cd tools/camera-translate && python3 eval.py             # Tesseract + word list
python3 eval.py --wear                                   # the 20 signs under six kinds of wear (120 images)
python3 eval.py --ocr vision --translate google          # the cloud path; needs credentials, sends the 20 test images to Google
node --test tests/camera.model.test.js                   # app-side logic (from the repo root)
node --test tests/camera.browser.test.js                 # real Chromium, under the site security policy
node tools/camera-translate/e2e-batch.mjs tools/camera-translate/tests/signs   # the app's own path on a folder of labelled signs
```

Results and their limits are in `docs/photo/CAMERA-TRANSLATE.md`.

## Files

| File | Purpose |
|---|---|
| `camera_translate/app.py` | FastAPI app: `/health`, `/translate-image`, CORS, rate limit, no-store |
| `camera_translate/intake.py` | size, type and pixel checks; metadata stripping |
| `camera_translate/ocr.py` | Cloud Vision adapter, Tesseract adapter, reading order |
| `camera_translate/translate.py` | Cloud Translation adapter, word-list translator, fallback chain |
| `camera_translate/overlay.py` | erase the Hebrew, fit and draw the English |
| `camera_translate/hebrew.py` | mark stripping, the sacred-name guard, the word list lookup |
| `camera_translate/pipeline.py` | the steps above in order |
| `camera_translate/sign-glossary.json` | copy of `data/camera/sign-glossary.json` (a test keeps them identical) |
| `camera_translate/fonts/` | Alef Bold (SIL Open Font License, licence text alongside) |
| `eval.py`, `tests/` | measurement script, tests, the 20 synthetic signs and their ground truth |
| `e2e-camera.mjs`, `e2e-batch.mjs` | drive `#/camera` in headless Chromium |
| `build_real_neighbours.py` | rebuilds the guard list of real words in the sign word list |
