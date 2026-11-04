# Reviewing the Codex batch 01 images (contact sheets)

Nothing is approved. 282 images are ingested and waiting for YOUR decision. Approval is only ever recorded in `data/images/approvals.json`; no script applies decisions for you.

## 1. Open a sheet
1. Get the repo on your machine (the web copies are in `assets/img/gen/`; the originals are not needed to review).
2. Generate the sheets (they are git-ignored, so they are not in a fresh clone): `node tools/images/ingest.mjs sheets`
3. Open `data/images/sheets/index.html` in a browser (double-click is fine; it works from `file://`). Block A is 31 images (style, characters, mouths, frames, backgrounds, tests); block B is 251 (lesson images L01 to L26). Blocks C to G are empty (not generated yet).

## 2. Decide
- Each tile shows the image (click it for the 1600 px version), file size, the prompt (expand "prompt #n"), and a yellow notes box with the matcher's known defects: wrong backdrop (scene seen vs scene the prompt asked for; 58 s1/s2/s3 images), aspect substituted (1254x1254 delivered for a 1792x1024 row; 79 images, red badge `aspect_mismatch_allowed`), minor style drift, and the eye-check result "text in image: none found".
- Some tiles also say "OCR flagged text" (37 images; badge `contains_text`). The OCR hits look like noise but have not been confirmed one by one; zoom in. Our rule is no text inside images.
- Click Approve or Reject (click again to clear). The filter at the top defaults to "unapproved"; "flagged" shows only tiles with warnings. Decisions are kept in this browser's local storage, so you can close the tab and come back (same browser, same file path).
- Checklist for a good image: `docs/images/RIGHTS.md`.

## 3. Export
Press "Export decisions" on a block page. The JSON appears in the box (and is copied to the clipboard). Save it as `decisions.json`, shape `{"approve":[ids],"reject":[ids],"reset":[ids]}`. It lists only changes from the state when the sheet was generated. Repeat per block (the sheet exports every decision you made in this browser, so one export may already contain both blocks; applying twice is harmless).

## 4. Apply (a deliberate step; do it yourself or tell the assistant)
`node tools/images/ingest.mjs apply-decisions decisions.json`
- Approve of an image flagged `contains_text` is SKIPPED with a message. If you looked and the detection is wrong, re-run with `--force` (it is recorded as `forcedDespite`).
- This updates `approvals.json`, `provenance.json` (humanApproved) and `generated-manifest.json` (approved images only; this is what the book and app read).
- Then `node tools/images/validate.mjs` (must report 0 errors) and `node tools/images/ingest.mjs status`. Commit the three JSON files.

## Where things live
| What | Where |
|---|---|
| Web copies (WebP q88, long edge 800 and 1600, metadata stripped) | `assets/img/gen/` (in git, about 32 MB) |
| Full-resolution originals (1254 px PNG, metadata intact) | NOT in git: `/home/claude/research_notes/images/codex-batch-01/ingest-originals/` (symlinked as `../alef-image-originals`; or set `ALEF_IMAGE_ORIGINALS`). Back it up. |
| Lossless 1024 px PNGs of the first import | removed from the tree; still in git history at commit 86867c7 |
| Defect notes shown on sheets | `data/images/review-notes.json` |
