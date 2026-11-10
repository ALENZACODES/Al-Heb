# Print specs and variants (status: built, NOT tested with any printer's previewer)

Nothing here has been uploaded to KDP, IngramSpark or Lulu. "Correct" below means: matches the published numbers I read, checked by measuring the PDFs. Whether a previewer accepts them is untested. The book is an English-primary LTR book with Hebrew spans; the binding direction is still an open decision (see RTL below).

## Variants (`node book/make_print.mjs`, output in book/out/)
| File | What it is |
|---|---|
| alef-book-draft.pdf | review proof: has a placeholder cover page, 8.5x11, no bleed |
| alef-book-8.5x11-print.pdf | KDP interior without bleed: no cover (KDP wants the cover separately), padded to an even page count (a blank last page when odd), exact 8.5x11in |
| alef-book-8.5x11-print-bleed.pdf | KDP interior with bleed: page = trim width + 0.125in, trim height + 0.25in (8.625x11.25in); bleed on top, bottom and OUTER edge only; odd pages (recto) have the outer edge on the right, even pages on the left; MediaBox/TrimBox/BleedBox written per page parity |
| alef-book-8.5x11-print-bleed-rtlspreads.pdf | same, spreads mirrored for a right-bound book (see below) |
| ...-bleed-REVERSED-ingram-lulu.pdf | the RTL-spreads file with page order reversed (last logical page = PDF page 1) |
Other trims: `node book/build.mjs --pdf --print --trim 8x10|8.5x8.5|6x9`. Only 8.5x11 is the designed layout. The letter pages are scaled with CSS `zoom` for other trims; I looked at six 8.5x8.5 letter pages (text gets small, about 6pt notes) and nothing else at other trims. A real square layout would need redesign. 8.5x8.5 with Hebrew titles is also limited by KDP's colour-ink page-count rules.

## Which alef-book.html is left in book/out
`node book/make_print.mjs` leaves the bleed variant of `book/out/alef-book.html` (page 8.625x11.25in, right-to-left mirrored spreads) because the last print variant it builds writes that HTML. The copy committed in git HEAD is the 0-bleed HTML. The two differ, and a plain `node book/build.mjs` does not reproduce the bleed one. John must choose which to keep: bleed with right-to-left spreads, or the zero-bleed one (DECISIONS-NEEDED item 10 lists the same choice). Until he decides, do not treat the file in book/out as the committed one.

## Numbers used (KDP, read 2026-11-03 from kdp.amazon.com/help/topic/GVBQ3CMEQW3W2VL6)
- Bleed 0.125in; with bleed page width = trim + 0.125in, height = trim + 2 x 0.125in.
- Inside margin minimum by page count: 24-150 pages 0.375in, 151-300 0.5in, 301-500 0.625in. Top/bottom/outside minimum 0.25in without bleed, 0.375in with bleed.
- This build: inside 0.75in, outside 0.75in, top 0.7in, bottom 0.8in (all above the minima for up to 500 pages). Margins are measured on rendered pages (see QA.md), not just read from CSS.
- KDP page-count limits depend on ink/paper; this book's KDP interior (`book/out/alef-book-8.5x11-print.pdf`) is 384 pages (`pdfinfo`, 2026-11-04 build). The page counts in docs/book/QA.md (62) predate this build and are stale.
- Fonts are embedded (checked with pdffonts). KDP's stance on Type 3 fonts was not checked: the variable Noto Serif Hebrew is embedded as Type 3 by Chromium. If a previewer objects, make static instances (fontTools instancer) or typeset in InDesign.
- Premium colour (not standard colour) for Hebrew titles and RTL paperback only were claims in the original research; not re-verified here.

## RTL binding and the reversed file
KDP takes the interior in reading order (PDF page 1 = first page). IngramSpark/Lulu, for a right-to-left book, expect the PDF in reversed order (last page of the book = PDF page 1), an even page count, "Right-to-Left" chosen at setup, and the front cover on the left of the cover template. These Ingram/Lulu rules come from the earlier research and were NOT re-fetched.
Does reversal need mirrored spreads? Yes, if you reverse and keep the left-bound page geometry: in an RTL book logical page 1 is the page on the LEFT of the first spread with its gutter on the right. Reversing the PDF leaves each page where it was, so a page designed with the gutter on its left would arrive with the gutter on the outer edge. `--binding rtl` therefore swaps the :left/:right margin sets (and which side carries the bleed) in the page CSS, and `pdf_tools.py finalize` writes TrimBox/BleedBox with the swapped parity. I verified by measuring left/right whitespace on rendered pages (LTR odd page: 0.74in left / 0.90in right; RTL-spreads odd page: 0.86in left / 0.78in right with bleed) and by checking that reversed page i has the same text as original page N+1-i and the expected TrimBox.
Important: the content itself is still English-first LTR. Reversing the PDF only makes sense if you also decide the whole book reads right to left (Hebrew-first layout). Until that decision is made, use the plain KDP files. Page numbers printed in the RTL variant count in logical order (1 = first page).
Reverse any PDF: `python3 book/pdf_tools.py reverse IN.pdf OUT.pdf` (refuses odd page counts; run `pad-even` first).

## What a human must still do
Final typesetting in InDesign (Middle Eastern edition), real art and the cover, upload each file to the printers' previewers, order proofs, check Type 3 font acceptance, decide the binding direction, choose the domain for the QR codes (book/config.json).


## Mnemonic flashcards (cut-out sheets)
`node book/flashcards.mjs` (also run by `node book/make_print.mjs`) writes `book/out/alef-mnemonic-flashcards-letter.pdf` and `-a4.pdf`: 7 pages each (instructions + 3 x front/back). Cards are 2.5 x 3.5 in, 3 x 3 per sheet, dashed cut lines. Print at 100%, double-sided, flip on the LONG edge; backs are column-mirrored. Not part of the KDP interior, not tested on a printer.
