# Photo feature: engines, status, and benchmark protocol (Lane 6)

**Status in one line (updated 2026-11-07):** the scan view now runs a REAL in-browser Tesseract (vendored tesseract.js 7 + `heb`, about 5 MB, lazy). The online vowelizer was removed 2026-11-07 (fix #16): its host was blocked by the site CSP and no terms could be read. The Tesseract engine was measured only on SYNTHETIC rendered images (see `BENCHMARK.md`: app engine 88.4% consonant character accuracy there with deskew, 85.2% before). **Accuracy on real photos is unknown.** Translation exists only through an optional local helper (Argos, `tools/ocr-server.mjs`); the default browser setup has none. No IPA engine. The mock engine remains for tests/demo (`ctx.photoEngines`).

Round 3 adds: deskew in the default browser OCR (88.4% synthetic char accuracy, was 85.2%; BENCHMARK.md), `src/photo/word-card.js` (letters + names, syllables, 3-tradition transliteration via lane 3, audio hook), an always-visible accuracy notice, a per-line 'translation unavailable offline' message and an opt-in localhost-only translation helper box (docs/photo/TRANSLATION.md).

Round 2 adds: `src/photo/engines/index.js` (provider `createPhotoEngines`), `tesseract-browser.js`, `local-server.js`, `src/photo/preprocess.js`, lane-3 shva adapter in `syllabify.js` (`loadLane3Shva`, passed to `runPipeline` as `shvaClassifier`).

## What exists

| Piece | File | Tested with |
|---|---|---|
| RTL reading order from word boxes | `src/photo/order-lines.js` | synthetic boxes (mixed digits, skew) |
| Hebrew helpers (strip marks, skeleton) | `src/photo/hebrew.js` | unit tests |
| Fuzzy prayer-line match | `src/photo/match-prayer.js` | synthetic OCR-style errors; real registry only if present |
| Syllabifier (pointed text) | `src/photo/syllabify.js` | 33 words, expectations derived by hand, not sourced |
| Orchestration, two modes | `src/photo/pipeline.js` | mock + injected fakes |
| Demo engine | `src/photo/engines/mock.js` | used in tests/UI; does not read the image |
| Real-but-unexercised adapters | `src/photo/engines/web.js` | dry mode + fake fetch only |
| UI | `src/photo/scan.view.js` | smoke-run once in headless Chromium with the mock; not on a phone |

## Engine interface (what a real engine must provide)

- `ocr(image, {mode}) -> [{text,x,y,w,h}]` (image pixel coords, origin top-left). Required.
- `vowelize(unpointedText) -> pointedText`. Optional.
- `ipa(pointedWord) -> string`. Optional (absent in this build).
- `translate(text) -> string | {text, engine}`. Optional. The pipeline always labels the result `machine translation` (`english.label`, `english.machineTranslation === true`). Text taken from the corpus registry is labelled `corpus translation`.
- Bundle: `{name, demo?, names?, ocr, vowelize?, ipa?, translate?}`; `composeEngines()` builds one. Supply it as `ctx.photoEngines` (lane 8 must pass it; default is the mock).

Adapters: `node src/photo/engines/web.js --dry` prints what each would send. The online vowelizer and cloud-vision adapters were removed 2026-11-07 (fix #16); LibreTranslate is still unexercised.

## Engine matrix

"Verified" means confirmed from a primary page during the research run (see `research_notes/.../handwriting_app_tech.md`, Key Questions 7 and 8). Nothing below was *executed* in this build.

| Engine | Role | Hebrew support / fact | Status |
|---|---|---|---|
| Google ML Kit Text Recognition v2 | OCR | Hebrew not listed (Latin, Chinese, Devanagari, Japanese, Korean) | Verified: not usable |
| Tesseract (`heb`) | OCR, WASM or native | Apache-2.0 | RUN: synthetic-set accuracy in BENCHMARK.md; wired in the browser via vendored tesseract.js. Real photos unmeasured. About half of vowel points are returned, unreliably |
| paddleocr-hebrew (RivoksLab) | OCR, ONNX | Apache-2.0; no niqqud in charset | Recognizers run on synthetic SIGN images without a detector (server-v5 96.4% with crude crop, 75 MB; mobile 84.8%, 7.4 MB). Not wired |
| Surya | OCR + reading order | Apache-2.0 repo, "90+ languages"; weights license (believed OpenRAIL-M with revenue threshold) | Weights license UNVERIFIED; no adapter |
| kraken | OCR (historical) | Apache-2.0 | Not evaluated |
| EasyOCR | OCR | Believed no Hebrew | UNVERIFIED |
| Google Cloud Vision | cloud OCR | Hebrew believed supported; first 1,000 units/month free then ~USD 1.50/1,000 | Adapter removed 2026-11-07 (fix #16): its host was blocked by the site CSP; no key ever existed. Sends photo off device, so it would need disclosure + a key to return |
| Azure Read | cloud OCR | Believed Hebrew print; F0 ~5,000 tx/month | UNVERIFIED, no adapter |
| AWS Textract | cloud OCR | Believed Latin-only | UNVERIFIED, not planned |
| Apple Vision `VNRecognizeTextRequest` | iOS OCR | Believed no Hebrew through iOS 18 | UNVERIFIED; check `supportedRecognitionLanguages` at runtime on a device |
| Vision LLMs (GPT, Gemini and similar) | OCR | Print read well, niqqud inconsistent (anecdotal) | UNMEASURED |
| Dicta Nakdan API | vowelizer | Endpoint used by nakdan.dicta.org.il | Removed 2026-11-07 (fix #16): its host was blocked by the site CSP and no terms could be read. Was run live 2026-11-04: shape confirmed, 94.4% agreement with phrasebook pointing (30 phrases); the measurement is kept in BENCHMARK.md |
| nakdimon / unikud (MIT) | self-hosted vowelizer | Exist | Not wired |
| Phonikud | IPA + stress | CC BY 4.0 code, ONNX + Python; no JS runtime | Placeholder only (`createPhonikudPlaceholder`, inert) |
| ML Kit on-device Translation | he->en | Hebrew `he` listed (59 languages) | Verified listing; native Capacitor plugin, no JS adapter here |
| Argos Translate | he->en | MIT library; 132 MB model; model licence UNVERIFIED | RUN: token F1 0.53 on 30 phrases, weak on single words. Available only via `tools/ocr-server.mjs` helper. LibreTranslate public instance needs a paid key |
| Google Cloud Translation, Microsoft Translator | he->en | Free tiers believed 500k / 2M chars per month | UNVERIFIED |
| DeepL, Apple Translation | he->en | Hebrew support uncertain / believed absent | UNVERIFIED |
| NLLB-200 | he->en | Weights CC-BY-NC: not usable in a sold product | Believed; UNVERIFIED here |
| Sefaria | prayer pages | Pointed text + per-text-licensed translations | Not called. The pipeline uses lane 5's `registry.json` (offline) instead |

## Recommended pipeline (hypothesis, to be settled by the benchmark)

1. **Prayer page:** OCR consonants -> `orderLines` -> `matchPrayer` against `registry.json` -> show the *canonical pointed text from the corpus*, syllables, recorded audio, `corpus translation`. Accuracy depends only on the match, not on OCR reading niqqud. If no match >= threshold (default 0.75, **untuned**), fall back to the sign path with a warning.
2. **Sign/menu:** OCR -> `orderLines` -> vowelize (no online provider in this build; unpointed text stays as read except where a demo/mock engine supplies pointing) -> `syllabifyWord` -> optional IPA -> per-syllable audio (recorded if present, else browser voice, flagged) -> translation labelled `machine translation`.
3. **OCR bundle decision** is open: Tesseract.js WASM (small, offline, niqqud weak) vs paddleocr-hebrew ONNX (heavier, Latin/digit handling) vs cloud (privacy, key, cost). Decide from the benchmark below, not from this document.
4. Print only. Handwriting (ktav yad) OCR is out of scope.

Known behaviour to remember: pointed text from the sign path is machine-generated and the UI warns; the syllabifier returns no syllables for unpointed words rather than guessing; the divine name is read as Adonai.

## 50-photo benchmark protocol (real photos NOT run; the script and instructions are in BENCHMARK.md)

**Corpus (50 photos, taken by the team on real phones, no web images):** 20 siddur/Chumash pages (print, vowelled; mix of Ashkenaz/Sefard siddurim and two fonts families; include taamim pages), 15 street/shop signs (outdoor, glare, angle), 10 menus/price lists (mixed Hebrew + Latin + digits), 5 hard cases (curved page, low light, shadow). For each photo store: JPEG, hand-typed ground truth per line (consonants only, plus pointed text for siddur pages), and the correct English gloss for signs/menus.

**Conditions:** same photo through each candidate OCR (Tesseract.js `heb`, paddleocr-hebrew ONNX, Google Vision if a key is available, optionally a vision LLM), with and without a simple preprocessing step (deskew + contrast), on the target device class (mid-range Android and an iPhone) for latency.

**Metrics per photo and engine:**
- Character error rate on consonant skeleton (after `consonantSkeleton`) and word error rate.
- Reading-order correctness: fraction of lines whose word order equals ground truth after `orderLines`.
- Prayer pages: top-1 match accuracy at several thresholds (0.6-0.9); false-accept rate on the non-prayer photos (use the signs as negatives). Pick the threshold from this ROC; replace the untuned 0.75.
- Niqqud retention (informational): share of ground-truth points returned by the OCR.
- Sign path: vowelizer word accuracy against hand-pointed truth (native-speaker check); syllable boundary agreement with a Hebrew-literate reviewer; translation adequacy rated 1-3 by a Hebrew speaker.
- Latency (p50/p95 on device), download size, whether it works offline, and bytes of image leaving the device.

**Decision rule (proposal):** choose the smallest offline bundle that reaches consonant CER <= 5% and prayer top-1 >= 90% with false-accept <= 2% on the benchmark; otherwise ship cloud OCR as an opt-in with a disclosure, or keep the photo feature in the marked demo state. Synthetic results: `data/photo/_benchmark/results.json`. Real-photo results: not yet; run `tools/ocr-bench/bench.mjs data/photo/real`.

## Known limitations of what was built

See `LIMITATIONS` in `src/photo/syllabify.js`. Highlights: kamatz gadol/katan undecided, stress defaults to final, stress exceptions list is a placeholder (one sourced entry), transliteration is a single Israeli-style scheme (lane 3's `transliterate.js` is the authority and is not used), and `data/photo/` holds no data yet. Syllable audio ids are assumed to be the pointed syllable string; lane 4's manifest has no syllable inventory contract yet, so the view falls back to the browser voice when `ctx.audio.playSequence` is missing.
