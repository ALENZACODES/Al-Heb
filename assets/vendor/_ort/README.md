# Vendored WebAssembly Runtime For The Talk Translation Pack (lazy, NOT precached)

The directory name starts with `_`, and `tools/build-precache.mjs` also skips `assets/vendor/`, so nothing here is part of the first install.

| File | Size (bytes) | Source | Licence |
|---|---|---|---|
| ort.wasm.min.mjs | 53,725 | onnxruntime-web 1.31.1 `dist/` (npm) | MIT (LICENSE-onnxruntime.txt) |
| ort-wasm-simd-threaded.mjs | 24,738 | onnxruntime-web 1.31.1 `dist/` | MIT |
| ort-wasm-simd-threaded.wasm | 14,848,852 | onnxruntime-web 1.31.1 `dist/` | MIT |

| ort.webgpu.min.mjs | 70,742 | onnxruntime-web 1.31.1 `dist/` | MIT |
| ort-wasm-simd-threaded.asyncify.mjs | 53,457 | onnxruntime-web 1.31.1 `dist/` | MIT |
| ort-wasm-simd-threaded.asyncify.p0.bin, .p1.bin | 28,747,738 together | `ort-wasm-simd-threaded.asyncify.wasm` of onnxruntime-web 1.31.1, cut at 16 MiB (one host caps a file at 25 MiB); joined on the device | MIT |

The last three are the runtime for browsers with a usable graphics card; it also runs the ordinary way, so such a browser fetches it in place of the first three. It runs on one thread, because a static host cannot send the headers that shared memory needs.
Update: `npm i onnxruntime-web@<ver>` in a scratch folder, copy the same three files, run `node tools/talk/nmt/pack.mjs --manifest`, then `node tools/talk/nmt/score.mjs tests/fixtures/talk.heldout.json`.
