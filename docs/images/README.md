# Generated-image ingest (how to use it when the images arrive)

Status: the pipeline is built and tested with SYNTHETIC images only. No real generated image has been ingested; OCR accuracy on real
illustrations is unmeasured (see "Known limits").

## Flow
1. Generate in your image tool (see `docs/book/IMAGE-RUN.md`), download, keep the file names from `data/images/manifest.csv` (e.g. `L05_dalet_quirky.png`).
2. `node tools/images/ingest.mjs ingest ~/Downloads/batch1.zip` (a zip, a folder, or several of either). Add `--dry-run` first if you like.
3. Read the printed report. Fix anything under UNMATCHED / REJECTED / CONFLICT (below), re-run (re-running is safe: identical files are "unchanged").
4. `node tools/images/ingest.mjs sheets` then open `data/images/sheets/index.html`. Approve / Reject per tile, press "Export decisions", save the text as `decisions.json`, run `node tools/images/ingest.mjs apply-decisions decisions.json`.
   Or by id: `approve L05_dalet_quirky 'L0*_quirky'`, `reject BG_cafe`, `reset BG_cafe` (back to unapproved).
5. `node tools/images/validate.mjs` (exit 1 on inconsistencies), `node tools/images/ingest.mjs status`, `list missing --csv` (rows still to generate, with prompts), `list rejected --csv` (rows to redo).

## What a file name may be
| Name | Result |
|---|---|
| `L05_dalet_quirky.png` (any case, png/jpg/webp) | matched, reported |
| `L05_dalet_quirky (1).png`, `...(2)`, `... - Copy` | matched ONLY if no exact-named file exists; listed as `renamed-duplicate`. If the exact file also exists the suffixed one is listed as an alternate (not used). Identical bytes are reported as duplicates |
| `Generated Image Nov 3, 2026, 10_32_11 AM.png`, anything else | never used. Written to `data/images/unmatched-assignment.csv` (with dimensions and "maybe" near-miss ids). Fill `assign_id`, then `ingest ... --assign data/images/unmatched-assignment.csv` |
Several different files claiming one id are all put in the CSV (ambiguous), none is used. Zip members are flattened to safe names (no path traversal); `__MACOSX`, dotfiles, non-images are skipped and counted.

## Checks per image
- Real format by content (PNG/JPEG/WEBP), decodable, under 40 megapixels.
- Aspect vs the manifest row: equal within 1.5% is `exact`. Image tools may only deliver 1:1, 3:2, 2:3, so the 1792x1024 / 1024x1280 rows normally arrive as 3:2 / 2:3: accepted as `aspect_substituted` (never cropped or stretched; the book layout must absorb it). Anything else is REJECTED unless `--allow-aspect`.
- Flags (recorded in `provenance.json`, shown on the sheets): `contains_text` (blocks approve unless `--force`), `possible_text` (a confident lone Hebrew letter; review), `ocr_not_run`, `aspect_substituted`, `not_transparent` (icons/prompts that asked for transparency), `unexpected_transparency`, `low_resolution`.
- Text rule: tesseract (`heb` and `eng`, one pass each, `--psm 11`) finds a text blob if a word has >= 3 letters/digits at confidence >= 60, or >= 5 at >= 15. Our rule is no text inside images; Hebrew is overlaid as vector.

## Outputs
| Path | In git? | Content |
|---|---|---|
| `assets/img/gen/<id>.800.webp`, `<id>.<N>.webp` | your call | web copies: long edge 800, plus 1600 (or the source size if smaller; never upscaled; icon rows capped at 800). Metadata stripped, converted to sRGB if an ICC profile was present, alpha kept only if used |
| `../alef-image-originals/<id>.png` (next to the repo; override `--originals DIR` or `ALEF_IMAGE_ORIGINALS`) | NO | byte-exact originals, metadata (incl. any C2PA manifest) intact. Back this folder up: it is the only copy of the full-resolution art |
| `data/images/provenance.json` | yes | per image: tool, model (null unless `--model`), prompt id + full prompt snapshot + SHA-256, ingest date, source file name and file date, original SHA-256, checks, flags, humanApproved |
| `data/images/approvals.json` | yes | decisions; absent = unapproved. Source of truth |
| `data/images/generated-manifest.json` | yes | APPROVED images only (what the book and app read) |
| `data/images/ingest-report.json`, `unmatched-assignment.csv`, `sheets/` | no (regenerable) | working files |
`--tool "..."` overrides the recorded tool string (default: image generator, manual run); `--model` records the model if you know it (the tool does not put it in the file).

## Using approved images
`book/img.js` takes the manifest: `createImgResolver({ base, files, generated: manifestJson })`. Lookup order: real file in `assets/img/` -> approved generated image -> placeholder SVG. `r.src(id, { width: 1600 })` picks the large variant (book print); the default is 800.
- Book: `book/build.mjs` (not part of this lane) must pass `generated: readJson('data/images/generated-manifest.json')` where it builds the resolver (line ~139). Until it does, the book keeps using placeholders.
- App: `fetch('data/images/generated-manifest.json')` once and pass it to the same resolver; `assets/img/gen/*` and the manifest also need to be in the service-worker precache list (lane 8's files). Neither wiring is done here.

## Known limits (do not assume more than this)
- OCR is cheap and tuned on synthetic text. It will miss text that is stylised, rotated, tiny or a single large letter, and will over-flag some busy art. It is a screen, not a guarantee: still zoom in on every image (checklist in `RIGHTS.md`).
- `--replace` of an image resets its approval. `approve` of a many-ids glob does not look at images: use the sheets.
- Image decoding uses Pillow (already installed; see `docs/TOOLING.md`). Python 3 with Pillow and the tesseract CLI are required on the machine that ingests.
