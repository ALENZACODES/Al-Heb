# Letter Check And Photo Text Tidy-Up

Two additions, both built in the alef-tools repo and pulled in here at a fixed commit (`data/alef-tools.lock.json`).
This branch is built on the shared language-pack work (the loader, the sync tool and the Language Packs page).
Neither adds anything to the first install beyond two small hooks and one credit line (1,741 bytes in all; 512 bytes gzipped).

## Letter check (tracing screens)

After a learner draws a letter, the check reads the whole drawing and says which letter it looks like and one thing to
fix, for example: "This looks more like Resh (ר). In Dalet the top line reaches a little past the leg on the right. Let
that small corner stick out." It runs on the device.

- It is a hint. It never changes a score or a completion, and when it is not confident it says nothing.
- It speaks in two places: after two missed strokes on a letter, and when the tracer has accepted a letter whose overall
  shape reads as a look-alike (the tracer is forgiving stroke by stroke; the check looks at the result).
- Word tracing uses it too, one sentence at most per letter, when the pack is already on the device.
- Yod, Vav and Final Nun are told apart by the height the learner drew.

The pack (`assets/vendor/_packs/handwriting/`, 1.3 MB) is never fetched on its own. The Letters tracing screen shows a
"Letter check" row with the size; the learner taps "Get the letter check (1.3 MB)". The file is checked against its size
and SHA-256 and kept in its own cache (`alef-pack-handwriting-v1`). "Remove it from this device" is on the same row. The
cache name and the per-part header follow the alef-tools contract, so the shared Language Packs page can list and
remove it once that page is in the app.

| File | What |
|---|---|
| `src/handcheck/hook.js` | the row on the tracing screen, loading the checker, `hintFor()` |
| `src/handcheck/pack.js` | pack list, download with checks, cache, remove |
| `src/handcheck/tools.js` | paths of the vendored packages |
| `src/letters/trace.view.js` | +607 bytes: keeps the accepted strokes and calls the hook |
| `src/wordtrace/wordtrace.view.js` | same for word tracing (this file is fetched on demand already) |
| `assets/vendor/_alef-tools/handwriting@0.1.0/` | the vendored package (23 KB) |

Measured (alef-tools `packages/handwriting/eval/v1.json`): 84.1% top-1 on 1,134 real handwritten letters it never saw
(HHD_v0 TEST, adult cursive on paper), against a bar of 95%; the look-alike pairs are between 75.6% and 88.9% against a
bar of 90%. All 54 of this app's own letter models read as themselves, which is a sanity check, not a held-out score.
No learner tracings and no phone timings have been collected. The tips in the feedback describe print letters and
have not been checked by a Hebrew teacher.

## Photo text tidy-up (camera translator and photo reader)

The reader mixes up letters that look alike. After reading, a word the reader was unsure of, that is not in the app's
own word list and has exactly one close neighbour in it, is replaced by that neighbour. A word the reader was sure of
(88 or more out of 100) is never touched, and neither is pointed text, a number, or anything that could be the Name.

- Camera translator: only lines the sign word list did not recognise, that were fully read and are not sacred text, are
  tidied; the tidied line is then offered to the sign word list once more (`fixRegions` in `src/handcheck/ocr-fix.js`).
- Photo reader (`#/scan`): the step runs between reading and line matching (`engines.correct` in `src/photo/pipeline.js`).
  The original reading is kept on each word box as `raw`.
- The Name read from a photo is shown as ה׳ in the photo reader, prefix letters kept, and its word card is not broken
  into letters or sounds.

The word list (`assets/vendor/_packs/ocr-words/lexicon.json`, 5,332 words, 55 KB) is built from the dictionary, the sign
list and the phrasebook, and is fetched the first time a photo is read. Rebuild it after the dictionary changes:

```sh
python3 ../alef-tools/packages/ocr-fix/scripts/build_lexicon.py --app . --out assets/vendor/_packs/ocr-words/lexicon.json
```

Measured with `tools/ocr-bench` (`--fix`) on the 145 synthetic images, tesseract command line with the app's own Hebrew
data: sign images 79.7% → 83.6% word accuracy (+3.9 points; the bar was +10), no image worse, prayer lines unchanged.
That is a best case: the sign images use phrasebook phrases, and the word list holds them. With those words taken out
of the list the same run goes 79.7% → 78.9%. The in-browser engine was not re-run. No real photos were scored.

```sh
node tools/ocr-bench/bench.mjs data/photo/_benchmark --engines tess-cli-fast --fix --out /tmp/ocr-fix.json
```

To switch the step off: pass `photoFix: false` (photo reader) or `cameraFixer: null` (camera translator) in the view context.

## Updating the vendored packages

The packages come in through the shared sync tool (`tools/alef-tools/sync.mjs`, see `docs/ALEF-TOOLS.md`), which also writes the
lock and the generated list of package folders that `src/handcheck/tools.js` reads.

```sh
node tools/alef-tools/sync.mjs --ref <alef-tools commit> --add handwriting --add ocr-fix
node tools/alef-tools/sync.mjs --check
node tools/build-precache.mjs
```
