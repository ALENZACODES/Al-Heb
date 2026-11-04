# Photo feature OCR / vowelizer / translation benchmark (Lane 6, round 2, 2026-11-04)

## READ THIS FIRST
- Every OCR number below is measured on **145 SYNTHETIC images: text rendered with fonts and then degraded in software (noise, blur, rotation, perspective, low contrast). They are NOT photographs.** Real phone photos have glare, curvature, shadows, fonts and lenses this set does not have. **Accuracy on real photos is UNKNOWN.** Do not quote these figures as real-world accuracy.
- Two parameters were chosen while looking at this same set (the low-contrast threshold in `src/photo/preprocess.js`, and the choice of "preprocessing on"), so the "85.2%" for the app engine is optimistic even for synthetic data.
- Timings come from a shared, loaded machine and are noisy (p50 40 to 100 ms per small image); they say nothing about phones.

## The set (`data/photo/_benchmark/`, regenerate with `python3 tools/ocr-bench/gen.py`)
145 images, seed 1234, ground truth in `ground-truth.json` (pointed text per line plus consonant-only text).
- 48 `siddur-line`: 8 pointed lines from `data/corpus/registry.json` (Priestly Blessing x3, Shema, Baruch shem, Mah tovu, Modeh ani, Mi chamocha) in Frank Ruhl Libre, Noto Serif Hebrew, FreeSerif, x 6 variants.
- 9 `siddur-page`: 3-line blocks (3 pages x clean / rotate / noise).
- 88 `sign`: 12 unpointed phrasebook phrases + 4 menu strings with digits (e.g. "קפה 12.50"), in Heebo, Alef Bold, Noto Sans, DejaVu on coloured backgrounds, x 4-6 variants.
- Variants: clean 27, noise (gaussian + JPEG q35) 27, blur 24, rotate (+-4/6 deg) 23, perspective 24, low contrast (grey range 140-195 + gradient) 20.
- Folder is named `_benchmark` so `tools/build-precache.mjs` skips it (it skips path parts starting with `_`).

## Engines run (all of them that could be made to work)
| Engine | Result |
|---|---|
| Tesseract 5.3.4 CLI, `heb` tessdata_fast (the system package; md5 equals tessdata_fast) | ran |
| Tesseract 5.3.4 CLI, `heb` tessdata_best (3.7 MB) | ran |
| tesseract.js 7.0.0 WASM in headless Chromium, tessdata_fast, via the shipped `src/photo/engines/tesseract-browser.js`, with and without preprocessing | ran (this is the app engine) |
| tesseract.js under plain Node | crashed (`missing function DotProductSSE`), dropped; the Chromium run covers WASM |
| paddleocr-hebrew (RivoksLab, Apache-2.0) ONNX word recognizers | ran **recognizer only, sign images only, no detector** (see below); not wired |
| Surya, EasyOCR, kraken, Google Vision, Azure, vision LLMs | NOT run (torch/weights not attempted, or needs a key). Unknown. |

Metrics: consonant character accuracy = 1 - Levenshtein(consonant skeleton of truth, of OCR) / truth length, pooled over all characters (finals folded, marks and punctuation ignored, reading order rebuilt with `orderLines` from OCR word boxes); word recall = LCS of consonant words / truth words; exact line = consonant skeleton identical; niqqud kept = share of the truth's vowel points that appear in the OCR text (bag count, generous: it does not check they sit on the right letter).

## Results, whole set (n=145, psm 6 for every image, as the app does)
| Engine | char acc % | word recall % | exact line % | niqqud kept % | p50 ms | p95 ms |
|---|---|---|---|---|---|---|
| tesseract.js WASM + preprocessing (APP ENGINE) | 85.2 | 69.9 | 63.4 | 50.1 | 40 | 289 |
| tesseract.js WASM, no preprocessing | 80.8 | 64.6 | 55.2 | 47.5 | 43 | 177 |
| Tesseract CLI fast | 80.8 | 64.8 | 53.1 | 47.6 | 69 | 209 |
| Tesseract CLI best | 80.6 | 63.8 | 55.9 | 37.2 | 98 | 265 |
Reference (psm 7 for one-line images, i.e. uses the ground truth to pick the mode, so not achievable in the app): CLI fast 77.2, CLI best 78.8.

By kind (char acc % / exact line %), app engine: siddur-line 87.0 / 31.3, siddur-page 76.1 / 0, sign 95.5 / 87.5. No-preprocessing engine: siddur-line 80.0 / 20.8, page 76.1 / 0, sign 91.5 / 79.5.
By variant, app engine (char acc %): clean 82.1, noise 89.6, blur 94.8, rotate 74.0, perspective 87.6, low contrast 90.9. Without preprocessing, low contrast is **51.6** (CLI fast 53.0, best 40.4): Tesseract collapses on washed-out, unevenly lit images, which is why `src/photo/preprocess.js` exists. Rotation of 4-6 degrees costs about 10 points (no deskew is implemented). Clean pointed text is the weakest "clean" case (82%) because niqqud and taamim confuse the line.

## Does niqqud survive? Partly, and unreliably
About half of the truth's vowel points show up in the OCR text for pointed lines (app engine 50.9% on siddur lines; CLI best only 36%), and the bag count is generous. In the clean example in `docs/screens/scan-real.png` the OCR read `ָאַר יְהוָה פָנָיו אַלֶיך ויחְנָּ:` for `יָאֵר יְהוָה פָּנָיו אֵלֶיךָ וִיחֻנֶּךָּ׃`: the right word shapes but wrong or missing letters and vowels. **Do not show OCR vowels to the learner as correct.** The pipeline already replaces them with the corpus text when a prayer line matches, and otherwise warns.

## Prayer matching (corpus lookup), app engine, 75 truth lines, 88 sign images as negatives
| threshold | line top-1 % | wrongly accepted lines | sign false-accept % |
|---|---|---|---|
| 0.60 | 86.7 | 4 | 13.6 |
| 0.75 (default) | 80.0 | 4 | 0 |
| 0.90 | 56.0 | 2 | 0 |
Caveats: signs are short and the matcher has a fragment rule, so 0 false accepts at 0.75 mostly shows short strings cannot match, not that the threshold is safe on real non-prayer pages. A match can show "score 1" even when the OCR line is damaged, because a fragment that sits inside a corpus line scores as contained (seen in the e2e screenshot). The 0.75 default stays; it is not validated on real photos.

## paddleocr-hebrew (experiment, sign images only)
`tools/ocr-bench/paddle-hebrew-sign-test.py`. ONNX word recognizers from huggingface.co/Rivok/paddleocr-hebrew, fed the whole image as one crop (no detector exists in this experiment). 88 sign images, consonant char accuracy: server-v5 (75 MB) 88.2% on the whole image and **96.4% on a crude tight crop** (median 1.5 s CPU); mobile-word (7.4 MB) 80.4% / 84.8% (median 9 ms). Tesseract app engine on the same sign subset: 95.5% with no crop. So a good recognizer with a proper detector might match or beat Tesseract on signs, but: it needs a detector and pipeline that were not built here, its charset has **no niqqud**, the card says it is for document type, not display faces, and the good model is 75 MB. Not wired. The crop used a border-colour heuristic, so treat 96.4 as an upper-ish bound.

## Vowelizer: Dicta Nakdan (live call, 2026-11-04)
- Endpoint: `POST https://nakdan-u2-1a.loadbalancer.dicta.org.il/api`, found in the production JS bundle of nakdan.dicta.org.il (the old guess `nakdan-5-0...` returns HTTP 302). Body JSON `{task:"nakdan", data:<text>, genre:"modern", addmorph:true, keepmetagim:true, keepqq:false, nodageshdefmem:false, patachma:false, useTokenization:true}`. Response `{data:[{str, sep, nakdan:{word, options:[{w, lex, morph, levelChoice, prefix_len,...}]}}, {str:" ", sep:true,...}]}`; we take `options[0].w`, drop `|` (prefix boundary) and meteg, copy separators. Marks come in non-canonical order, so output is NFC-normalised.
- Latency 0.18 to 0.43 s per call from this server (9 calls); 30 calls at 400 ms spacing had median 52 ms, max 677 ms. Response sends `Access-Control-Allow-Origin: *`, so browsers can call it directly.
- **Terms of use, rate limits and SLA: none could be read** (dicta.org.il/developers is a script-rendered page with no text). The endpoint is what their website uses, not a documented API, and could change or be restricted. Ask Dicta before shipping. The recognised text is sent to Dicta, so the UI keeps it behind an unticked checkbox with a disclosure. Only public test words were sent.
- Agreement with the phrasebook's own pointing (30 phrases, 54 words, `tools/ocr-bench/nakdan-eval.mjs`): 51 of 54 words identical (94.4%). The phrasebook pointing is itself flagged "native-speaker-needed", so this is agreement, not accuracy. Differences: שבת (patach vs kamatz), פיתה (dagesh), one more.
- Recorded fixture for tests: `data/photo/_fixtures/nakdan-recorded.json`.

## Translation he -> en (30 phrasebook phrases, `tools/ocr-bench/translate-eval.py`)
The phrasebook `en` is a proxy truth: valid alternative wordings score as errors. Source text was sent unpointed, as the pipeline does.
| Engine | mean token F1 | mean char ratio | F1 >= 0.5 | F1 = 0 |
|---|---|---|---|---|
| Argos Translate 1.11.0, he->en package 1.5 (local, 132 MB model, ~0.1 s per phrase on CPU) | 0.532 | 0.645 | 60% | 23% |
Good on full sentences ("Where is the hospital?", "How much will it cost?"). Poor on single words: repeated words ("Peace of peace", "But but", "Open open"), and wrong meanings ("פיתה" -> "Her mouth", "לחיים!" -> "Life!", "מה המדה?" -> "What is the uniform?"). For signs and menus this is not good enough to present without the existing "machine translation" label and a caveat; treat it as a hint.
- MyMemory free anonymous API: inconclusive. 15 of 30 requests got HTTP 429 from this shared IP, so its score is not comparable and was not kept. Not wired.
- LibreTranslate public instance: needs a paid API key (HTTP 400 "get an API key"). Google Cloud Translation / Microsoft / DeepL: need credentials, not tried. Argos model licence not verified.
- Browser feasibility: a 132 MB ctranslate2 model is not a sensible browser download, so translation is available only through the optional local helper (`tools/ocr-server.mjs`). In the default browser setup there is **no translation**; the UI says so per line.

## Round 3 (2026-11-04): deskew and a binarisation experiment, same SYNTHETIC set
Re-run of all engines on the same 145 synthetic images (not photos). New: `deskew()` in `src/photo/preprocess.js` (projection-profile tilt estimate, +-10 degrees, applied only if the estimate is >= 0.8 degrees with confidence >= 1.02; thresholds fixed in advance, not tuned, but the algorithm was developed while looking at this set, so treat the gain as optimistic) and `adaptiveBinarize()` (local-mean threshold).
| Engine | char acc % | word recall % | exact line % | niqqud kept % |
|---|---|---|---|---|
| app engine + deskew (NEW DEFAULT) | 88.4 | 73.0 | 65.5 | 53.6 |
| app engine (contrast normalisation only, round 2) | 85.2 | 69.9 | 63.4 | 50.1 |
| app engine + deskew + adaptive binarisation | 82.1 | 66.9 | 40.7 | 51.8 |
| tesseract.js, no preprocessing | 80.8 | 64.6 | 55.2 | 47.5 |
| Tesseract CLI fast / best | 80.8 / 80.6 | 64.8 / 63.8 | 53.1 / 55.9 | 47.6 / 37.2 |
By variant with deskew (char acc %): clean 82.1, noise 89.6, blur 94.8, **rotate 74.0 -> 88.9**, perspective 87.6 -> 87.9, low contrast 90.9. All the gain is on the rotated images (which are synthetic +-4 to 6 degrees); nothing else moved. Binarisation hurt (noise 77.4, blur 82.0) and is NOT enabled. Prayer matching at 0.75: line top-1 80.0 -> 85.3 %, sign false accept 0 %, 4 wrongly accepted lines (unchanged); at 0.90 top-1 65.3 %. Still short of the decision rule (CER <= 5%): 11.6% CER here. Deskew does nothing for curved pages or perspective. Unknown on real photos, where lines may be curved and tilt may vary across the page.
Run: `node tools/ocr-bench/bench.mjs --engines tess-browser,tess-browser-deskew,tess-browser-deskew-bin`. Timing impact is within noise (p50 49 -> 53 ms on this loaded machine).

## Run it on 50 real photos
1. Take about 50 photos on real phones (suggested: 20 siddur/Chumash pages, 15 signs, 10 menus, 5 hard cases: curved page, low light, shadow). Put the JPEG/PNG files in `data/photo/real/images/` (this repo ignores nothing there; do not commit photos of people or private documents).
2. `node tools/ocr-bench/make-template.mjs data/photo/real` creates `data/photo/real/ground-truth.json`.
3. Edit it: for every item type the Hebrew you see, line by line, into `lines`; set `kind` (`siddur-line`, `siddur-page`, `sign`); optional `variant` label; for prayers `"source": "registry:<id>"` (ids in `data/corpus/registry.json`, e.g. `registry:bless-priestly-2`, pages `registry:a+b+c` in line order).
4. Get the models once: `curl -L -o /tmp/tessdata-fast/heb.traineddata https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/main/heb.traineddata` (same for `tessdata_best` into `/tmp/tessdata-best/`; make the folders first). Install Playwright for the browser engine, or pass `--engines tess-cli-fast,tess-cli-best` to use only the CLI (`apt-get install tesseract-ocr tesseract-ocr-heb`).
5. `node tools/ocr-bench/bench.mjs data/photo/real --out data/photo/real/results.json` prints the same table and writes per-image OCR text.
6. Compare against the decision rule in `ENGINES.md` (consonant CER <= 5%, prayer top-1 >= 90%, false accept <= 2%). On the synthetic set the app engine is at about 15% CER and 80% top-1, so it does not meet that rule even here.
7. Never mix the synthetic and real tables in one claim. The script labels the dataset as SYNTHETIC only when `ground-truth.json` says `"synthetic": true`.

## What is and is not verified
Verified by running: the figures above; Nakdan reachable and correct on 9 + 30 public inputs; Argos output on 30 phrases; the full browser path (`#/scan` upload -> WASM OCR -> corpus match -> cards) on two synthetic images (`tests/photo.scan-e2e.test.js`, screenshot `docs/screens/scan-real.png`).
Not verified: anything on real photos; phones; Safari/Firefox (only headless Chromium); WASM SIMD fallback on old browsers (only the SIMD core is vendored); offline reload from the service worker cache (the SW's runtime cache should store the vendored files, but this was not tested); Dicta terms; Argos model licence; any Surya/vision-LLM/cloud OCR.
