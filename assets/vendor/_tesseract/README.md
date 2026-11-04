# Vendored OCR runtime for the photo feature (lazy, NOT precached)
Directory starts with `_` so `tools/build-precache.mjs` skips it. Lane 8: please also add an explicit `assets/vendor/` rule to SKIP so this stays true if the folder is renamed.

| File | Size (bytes) | Source | Licence |
|---|---|---|---|
| tesseract.esm.min.js | 63,220 | tesseract.js 7.0.0 `dist/` (npm) | Apache-2.0 (LICENSE-tesseract.js.md) |
| worker.min.js | 111,307 | tesseract.js 7.0.0 `dist/` | Apache-2.0 |
| tesseract-core-simd-lstm.wasm.js | 3,899,472 | tesseract.js-core 7.0.0 (WASM embedded; needs WebAssembly SIMD) | Apache-2.0 (LICENSE-tesseract.js-core.txt) |
| heb.traineddata | 961,404 | github.com/tesseract-ocr/tessdata_fast `heb` (md5 935468444ded38098c86383ae0ae0a2b) | Apache-2.0 |
| tesseract.min.js.LICENSE.txt | 149 | regenerator-runtime notice bundled in the build | MIT |
Total about 4.97 MB. Update: `cd tools/ocr-bench && npm i tesseract.js@<ver>` and copy the same files; re-run `node tools/ocr-bench/bench.mjs`.

## Loading and caching plan
- Nothing loads until the first photo is processed (`createBrowserTesseract` imports the module lazily). Page weight at startup: 0.
- The worker is created with explicit same-origin `workerPath`, `corePath` (a full `.js` path, so no CDN lookup) and `langPath`, `gzip:false`. No jsDelivr request is made (checked in the e2e test: zero external origins).
- First photo downloads about 5 MB. tesseract.js keeps `heb.traineddata` in IndexedDB; `sw.js` runtime-caches same-origin non-media GETs (stale-while-revalidate), which should keep the JS/WASM for offline use after the first scan. Offline reload not tested.
- Only the SIMD LSTM core is shipped (browsers since about 2021; Safari 16.4+). Older browsers will fail with an error shown in the scan view. Adding `tesseract-core-lstm.wasm.js` (3.9 MB) would need feature detection in `tesseract-browser.js`.
- tessdata_best (3.7 MB) was not adopted: on the synthetic set it scored no better in the browser-comparable CLI test (80.6 vs 80.8) and kept fewer vowel points.
