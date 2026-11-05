# Book outputs status

Last refreshed about 21:15 on 2026-11-04. The earlier text of this file (outputs rebuilt at 17:37 to 17:50, then a pending note that the new chapter was missing) is superseded by the section below.

Current state, from file times and a search I ran at about 21:10: `book/out/alef-book.html` (21:06) contains the chapter "Letters you will never forget" and the new hook words; the PDFs `alef-book-8.5x11-print.pdf` (21:07), `alef-book-8.5x11-print-bleed.pdf`, `alef-book-8.5x11-print-bleed-rtlspreads.pdf`, `alef-book-8.5x11-print-bleed-REVERSED-ingram-lulu.pdf` and `alef-book-draft.pdf` (21:08), and both flashcard sets (21:08) are newer than every file in `assets/letters/morph/` (newest 20:46) and than `data/letters/memory-chain.json` (20:14). I did not open the PDFs; the page checks below are the other lane's. Any later edit to the pictures, the chain source or `book/memorychain/section.mjs` makes the outputs stale again.

To rebuild: `node book/make_print.mjs` (see `docs/book/PRINT.md`). The draft PDF comes from `node book/build.mjs --pdf`, which rewrites `book/out/alef-book.html`; run the print build last if you want the bleed variant left in place.

Not verified: that any PDF was opened in a printer's previewer (none was), and which `alef-book.html` variant should be committed (`docs/DECISIONS-NEEDED.md`, item 10).

## Rebuilt 2026-11-04 (about 20:52 to 21:07 local) after art pass 3

Ran node book/make_print.mjs (bleed, no-bleed, rtlspreads, reversed PDFs and flashcards) and node book/build.mjs --pdf (draft PDF), then python3 book/pdf_tools.py scrub on every PDF in book/out. book/out/alef-book.html is the bleed variant (the make_print copy, restored after the draft build rewrote it). The section "Letters you will never forget" (book/memorychain/section.mjs, pages 15-16, 27 cells) is in every book PDF with the pass-3 pictures and the new hooks (loch, nuts, feather, swim ring, shortcake, mailbox, hut, cup); I looked at pages 15-16 of the print and rtlspreads PDFs. Page counts: 384 (print, print-bleed), 386 (draft, rtlspreads, reversed). pdfinfo shows Author John Khan only on all 7 PDFs; node tools/meta/scan.mjs passed. Not checked: any printer previewer.
