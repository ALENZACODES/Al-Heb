# Intermediate lesson images: ingest wiring

Source of the slots: `data/curriculum/intermediate-image-slots.json` (50 lessons, 2 slots each, 100 in all). Paste files: `docs/images/paste/inter-01.txt` to `inter-06.txt` (at most 25 images each; 18 fit under the 12000-character limit, so six files). Rebuild with `node tools/images/build_inter.mjs`.

## Filename convention
Every returned image is saved as **`<slot id>.png`**, for example `I-01-img1.png` and `I-01-img2.png`. The paste header says so and every item shows its FILENAME. The slot id is also the image id used everywhere else (provenance, approvals, `generated-manifest.json`, `altText`). The ids only use letters, digits and hyphens, which the ingest accepts.

## Pending list
`data/images/inter-pending.csv` has the 100 rows in the `manifest.csv` column layout (`file,set,command,block,width,height,status,prompt`): set `intermediate_I-NN`, commands 201 to 206 (one per paste file), block `I`, 1792x1024, status `pending`. `next1000.csv` and `manifest.csv` are not touched.

## Matching a returned folder (dry run)
`node tools/images/match_inter.mjs <folder>` reads file names only and writes nothing. It reports: matched slots, missing slots, unmatched files, duplicates, files that differ only in case (accepted), and files with a browser suffix like " (1)" or " copy" (listed as variants, never used). Exit code 1 means an unmatched file or two files for one slot. `--json` prints the full result. Matching rules are the same as `ingest.mjs` (`classifyName` in `ingest_lib.mjs`): exact name, never a guess.

## Getting them through `ingest.mjs`
`ingest.mjs` matches names against `data/images/manifest.csv` only, and it is not changed here. So before the first real ingest the 100 rows of `inter-pending.csv` must be appended to `manifest.csv` (header excluded). That is a deliberate step for you to take; nothing here does it. Then:

1. `node tools/images/ingest.mjs ingest <folder> --dry-run`, then without `--dry-run`.
2. Review on the contact sheets, approve or reject (`docs/images/REVIEW-SHEETS.md`).
3. `node tools/images/ingest.mjs manifest`, then `node tools/images/alt_text.mjs`, then `node tools/images/validate.mjs`.

Note: `alt_text.mjs` has no template for these slots yet (it was written for the letter, setup and vocabulary images), so its generic fallback would give them clumsy text. Add an `I-NN-imgN` template that uses the `scene` sentence from the slots file before ingesting them.

## Style note
The slot file asks for a warm realistic photographic style. The paste files use the flat-vector STYLE GUIDE v1 of the other commands instead, so the whole book looks alike. If photographic scenes are wanted, change `slotPrompt` in `tools/images/build_inter.mjs` and rebuild.
