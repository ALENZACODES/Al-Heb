# Little books pictures 38–62 — plan

Date: 2026-11-09 (America/Toronto)

## Goal

Add page pictures for books **38–62** only (25 books × 12 pages = 300 JPEGs). Stories and audio already exist. Do not change books 1–37, page text, or audio.

## Branch

- Name: `books/pictures-38-62`
- URL: https://github.com/ALENZACODES/Al-Heb/tree/books/pictures-38-62
- Worktree on the box: `/workspace/al-heb-books-38-62` (does not disturb `/workspace/Al-Heb`)
- Never merge to `main` or deploy without John's OK.

## Style assignment

Chosen by the prompt writer (per book, from: crayon drawing, oil painting, watercolour, 2D cartoon animation, 3D style). Spread about equally across the 25 books; neighbouring books should differ when possible.

Books **52** and **60** are held for John's 6 reference characters (photos pending). Briefs for those two are in the hold batch.

## Output path convention

For each page:

- Path: `assets/books/bookN/BOOKN_pXX.jpg`
- Example: `assets/books/book38/BOOK38_p01.jpg`
- Size: **1659×948** JPEG, landscape, quality ~85
- Keep the **left third** calm/empty for Hebrew overlay
- No text, letters, logos, flags, or real people in the picture
- Create the `bookN/` folder when saving the first page of that book

## Metadata steps (every image)

1. Save the JPEG to the path above.
2. Strip tags:
   ```bash
   exiftool -all= -overwrite_original -- PATH.jpg
   ```
3. Verify only file-level tags remain (no Artist, Software, XMP, C2PA, etc.):
   ```bash
   exiftool PATH.jpg
   ```
4. Also run the repo helpers from the worktree:
   ```bash
   node tools/meta/strip.mjs assets/books/bookN --apply --in-place
   node tools/meta/scan.mjs assets/books/bookN
   node tools/meta/scan.mjs --text
   ```

## Update data/books after a book’s 12 pictures land

From the worktree root:

```bash
node tools/books/build.mjs
```

That flips `hasImg` / `picturedPages` from what exists on disk and refreshes `data/books/index.json`. Do not hand-edit the JSON for image flags.

Then commit on `books/pictures-38-62` only (plain message, no tool or vendor names in the message or paths).

## Prompt briefs (paste batches)

Under the shared storybooks briefs folder on the box:

| File | Books |
| --- | --- |
| `batch-01.md` | 38–42 |
| `batch-02.md` | 43–47 |
| `batch-03.md` | 48–51, 53 |
| `batch-04.md` | 54–58 |
| `batch-05.md` | 59, 61, 62 |
| `batch-06-hold-ref-characters.md` | 52, 60 (hold: reference photos pending) |

Each batch opens with John's wishes, then asks for character sheets + 12 full image prompts per book. Paste one batch at a time.

## Standing rules

- Only pictures for 38–62; use existing page text as is; do not rewrite stories.
- Build on current GitHub state; never rewrite or overwrite existing work.
- Strip all metadata from every image.
- No divine-name or religious-text imagery.
- No tool/vendor names in commits, branch names, filenames, or learner-facing copy.
- John's reference characters appear in exactly 2 books (52 and 60); white-gi karate man is the kid-friendly bad guy there if the story has one — wait for photos.
