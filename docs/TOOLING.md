# Dev tooling record (Round 2)

## Lane 2 letters (tools/letters/*) - dev/build only, never imported by app code
These were already installed in the environment; this lane did NOT run pip install. Versions observed 2026-11-03:
| Tool | Version | Licence | Used for |
|---|---|---|---|
| numpy | 2.5.3 | BSD-3-Clause | raster/skeleton arrays |
| scipy | 1.18.1 | BSD-3-Clause | distance transform, labelling |
| scikit-image | 0.26.0 | BSD-3-Clause | skeletonize |
| opencv (cv2) | 5.0.0 | Apache-2.0 | decoding rasters, debug images |
| fontTools | 4.67.0 | MIT | glyph outlines from the OFL fonts |
| Pillow | 12.3.0 | HPND | debug crops only |
| rsvg-convert (librsvg) | 2.58.0 | LGPL-2.1+ | SVG -> PNG (rasterise glyphs, preview sheets) |
| Playwright (Chromium) | as installed | Apache-2.0 | workbook PDFs (tools/letters/workbook.mjs), QA screenshots |
Run order: tools/letters/derive_cursive.py -> build_letters.py -> render_preview.py (+ rsvg-convert for PNG) -> worksheets.mjs / workbook.mjs.

## Lane 7 book/images (book/*, tools/images/make_cursive_refs.mjs) - dev/build only, never imported by app code
No new install was needed in this session: every tool below was already present (versions observed 2026-11-03; nothing was pip/npm-installed by this lane). The runtime app is untouched.
| Tool | Version | Licence | Used for |
|---|---|---|---|
| segno (python) | 1.6.6 | BSD-3-Clause | QR codes as inline SVG (book/make_qr.py), error correction M |
| pypdf (python) | 6.17.0 | BSD-3-Clause | named-destination page numbers, even padding, TrimBox/BleedBox, page-order reversal (book/pdf_tools.py) |
| opencv-python-headless (cv2) | 5.0.0 | Apache-2.0 | QR decode verification only (book/verify_qr.py; tests skip if absent) |
| Pillow | 12.3.0 | HPND | contact sheets (book/contact_sheets.py) |
| poppler `pdftoppm`, `pdffonts`, `pdftotext` | 24.02.0 | GPL-2+ | rasterising every PDF page for QA, font-embedding check |
| rsvg-convert | 2.58.0 | LGPL-2.1+ | SVG -> PNG for the QR decode check |
| Playwright (Chromium) | 1.63.0 at /opt/npm-tools | Apache-2.0 | HTML -> PDF (book/build.mjs), reference silhouettes (tools/images/make_cursive_refs.mjs) |
If a fresh machine lacks them: `pip install segno pypdf opencv-python-headless pillow` and `npm i playwright` (in a tools-only location; Playwright is resolved from `playwright` or /opt/npm-tools).
Fonts (OFL 1.1, files in assets/fonts/): Noto Serif Hebrew = book print face, Gveret Levin = cursive, Frank Ruhl Libre = fallback. Latin text uses system Liberation Serif/Sans; DejaVu/FreeSerif are picked by Chromium as fallbacks for a few IPA/arrow glyphs and get embedded too (check their licences before a commercial print run; FreeSerif is GPL with the font exception).
Commands: `node book/build.mjs --pdf` (draft with cover) | `node book/make_print.mjs` (KDP, KDP+bleed, RTL spreads, reversed Ingram/Lulu) | `python3 book/contact_sheets.py FILE.pdf OUTDIR` | `node tools/images/make_cursive_refs.mjs`.

## Lane 6 round 2 (photo OCR / vowelizer / translation), 2026-11-04
Dev/benchmark tooling only; none of it is in app code paths. Vendored runtime files are listed with sizes in `assets/vendor/_tesseract/README.md`.
| What | Version | Licence | Where / how |
|---|---|---|---|
| tesseract.js (+ tesseract.js-core) | 7.0.0 | Apache-2.0 | `npm i` in `tools/ocr-bench/` (`node_modules` there, not committed); 4 files copied to `assets/vendor/_tesseract/` |
| Tesseract CLI (already on the box) + `heb` tessdata_fast | 5.3.4 / system package | Apache-2.0 | no install; tessdata_fast and tessdata_best `heb` downloaded from raw.githubusercontent.com/tesseract-ocr/ to `/tmp/tessdata-{fast,best}/` (heb fast is also vendored) |
| argostranslate (+ torch, ctranslate2, stanza, spacy...) | 1.11.0 | MIT | `python3 -m venv ~/venv-argos && pip install argostranslate` (venv is 5.7 GB, outside the repo); he->en package 1.5 (132 MB, licence not verified) installed with `argostranslate.package` |
| paddleocr-hebrew ONNX models (server-v5, mobile-word, charset) | HF snapshot 2026-11-03 | Apache-2.0 per model card | downloaded to `/tmp/pph` only; used with the already-installed onnxruntime 1.29 in `tools/ocr-bench/paddle-hebrew-sign-test.py`; not vendored |
| Pillow 12.3 (raqm), numpy, opencv 5.0, Playwright 1.63 | already installed | various | used by `tools/ocr-bench/gen.py` and `bench.mjs` |
Network checks: Dicta Nakdan endpoint called with public test words only (39 calls). MyMemory anonymous API called 60 times in total (rate-limited, results discarded). LibreTranslate public instance called once (needs a key).
Commands: `python3 tools/ocr-bench/gen.py`; `node tools/ocr-bench/bench.mjs data/photo/_benchmark`; `node tools/ocr-bench/e2e-scan.mjs <img> prayer|sign out.png`; `node tools/ocr-server.mjs` (env `ARGOS_PYTHON=~/venv-argos/bin/python`).

## Image ingest (tools/images/ingest*.mjs, ingest_image.py, validate.mjs) - dev tooling only, never imported by app code
Nothing was installed for this; all tools were already on the box (versions observed 2026-11-03). Tested only with synthetic images drawn by `tests/images.ingest_fixtures.py`.
| Tool | Version | Licence | Used for |
|---|---|---|---|
| Pillow (python) | 12.3.0 | HPND | decode/verify, resize, WebP encode (metadata dropped), sRGB conversion via ImageCms, synthetic test images |
| Tesseract CLI + `heb`, `eng` traineddata | 5.3.4 / system package | Apache-2.0 | cheap "contains text" screen (one pass per language, `--psm 11`, TSV) |
| Python `zipfile` (stdlib) | - | PSF | safe extraction (member names flattened) |
Python runs as `python3 -I` (isolated). Commands: see `docs/images/README.md`.


## Release check: no AI or tool names in tracked text

`node tools/meta/scan.mjs --text` scans every tracked text file (`git ls-files`) for outside-tool names. The patterns live in `tools/meta/text.mjs`. Exit 0 = clean, 1 = findings. Legitimate uses (the scan tool itself, the push-clean filter, licence records, functional API code) are listed with a reason in `tools/meta/text-allowlist.json`. Run it before every push, together with `node tools/meta/scan.mjs` (binary and JSON metadata).
