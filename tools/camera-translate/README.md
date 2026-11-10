# Camera Translator Service

Hebrew text in a photo, translated to English and drawn back onto the photo. This is the service behind the app's `#/camera` screen.
The screen also works without it (on-device reading plus a small built-in word list); the service adds full translation and better reading.

## What It Does

1. Takes one photo (JPEG, PNG or WebP, at most 10 MB) as the request body.
2. Rebuilds it from its pixels: upright, at most 2000 px on the long side, no EXIF, GPS or other metadata.
3. Finds the Hebrew lines and their boxes.
   - Google Cloud Vision `DOCUMENT_TEXT_DETECTION` with language hint `he` when credentials are set.
   - Otherwise Tesseract with the `heb` model, on the server itself. It is also the fallback when Vision fails.
4. Translates each line to English.
   - Google Cloud Translation when credentials are set.
   - The built-in sign word list (87 entries) otherwise, and for lines the cloud translator could not answer.
5. Removes the Hebrew letters from each box (flat fill on plain signs, OpenCV inpainting on uneven ones, strong blur when letters cannot be separated), then draws the English sized to the box in the sign's own colours. Hebrew that was flush right becomes English flush left.
6. Answers with the regions (box, Hebrew, English, how to say it, where the English came from) and the translated photo.

## Privacy Rules Kept In The Code

- The photo is held in memory for the length of the request. No file, database, cache or log line holds a photo or its text. The Tesseract path passes the image on stdin, not through a temp file. `tests/test_camera_translate.py` checks that handling a photo writes no file.
- Metadata is stripped before anything else reads the photo, and the returned photo is encoded fresh. Checked by tests on both directions.
- Responses carry `Cache-Control: no-store`.
- With the cloud path on, the photo (metadata-free) and the Hebrew text go to Google. The app says so before the learner sends anything.
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

## Connect The App

Set `backendUrl` in `data/camera/config.json`:

- A path on the same site (for example `/api/camera`, with the host forwarding it to this service) works with the site security policy as it is.
- A loopback address (`http://127.0.0.1:8790`) works for local testing. Chrome asks the visitor for permission before a public page may call a loopback address.
- Any other `https://` address also needs that one origin added to `connect-src` in `_headers`. Plain `http://` to another host is refused by the app.

The cloud calls cost money past the free allowance, and the service has no login: set a budget cap in Google Cloud, keep `ALLOWED_ORIGINS` tight, and keep the rate limit on. Origin checks stop other websites, not scripts.

## Test And Measure

```
python3 -m pytest tools/camera-translate/tests -q        # 17 tests; no cloud calls
python3 tools/camera-translate/tests/make_signs.py       # regenerate the 20 synthetic signs
cd tools/camera-translate && python3 eval.py             # Tesseract + word list
python3 eval.py --ocr vision --translate google          # the cloud path; needs credentials, sends the 20 test images to Google
node --test tests/camera.model.test.js                   # app-side logic (from the repo root)
node --test tests/camera.browser.test.js                 # real Chromium, under the site security policy
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
| `e2e-camera.mjs` | drives `#/camera` in headless Chromium |
