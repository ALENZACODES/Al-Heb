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
