# Vendored WebAssembly Runtime For The Talk Translation Pack (lazy, NOT precached)

The directory name starts with `_`, and `tools/build-precache.mjs` also skips `assets/vendor/`, so nothing here is part of the first install.

| File | Size (bytes) | Source | Licence |
|---|---|---|---|
| ort.wasm.min.mjs | 53,725 | onnxruntime-web 1.31.1 `dist/` (npm) | MIT (LICENSE-onnxruntime.txt) |
| ort-wasm-simd-threaded.mjs | 24,738 | onnxruntime-web 1.31.1 `dist/` | MIT |
| ort-wasm-simd-threaded.wasm | 14,848,852 | onnxruntime-web 1.31.1 `dist/` | MIT |

Only the WebAssembly build is shipped. It runs on one thread, because a static host cannot send the headers that shared memory needs.
Update: `npm i onnxruntime-web@<ver>` in a scratch folder, copy the same three files, run `node tools/talk/nmt/pack.mjs --manifest`, then `node tools/talk/nmt/score.mjs tests/fixtures/talk.heldout.json`.
