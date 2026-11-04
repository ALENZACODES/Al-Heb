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
