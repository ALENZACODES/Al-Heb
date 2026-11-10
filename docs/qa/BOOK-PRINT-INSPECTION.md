# Book print inspection (audit item 31)

Date: 2026-11-04. Scope: the existing PDFs in book/out, rendered and looked at page by page. Nothing in the repo was rebuilt or changed. Rasters and extracted text were kept outside the repo.

A human print proof is still required. Everything below is from screen renders and text extraction. No page was printed, no printer previewer was used, no paper, trim, colour, binding or ink was checked. Nothing here says the book is ready to send to a printer.

## Files and sizes (from the PDF info tool)

- alef-book-8.5x11-print.pdf: 384 pages, 612 x 792 pt (letter), no bleed, no cover.
- alef-book-8.5x11-print-bleed.pdf: 384 pages, 621 x 810 pt. Per-page trim box alternates: odd pages x 0 to 612, even pages x 9 to 621, y 9 to 801 (bleed on top, bottom and outer edge).
- alef-book-8.5x11-print-bleed-rtlspreads.pdf: 386 pages, 621 x 810 pt, same trim parity swapped (odd pages x 9 to 621).
- the reversed-order bleed PDF (name ends with the two print-service names): 386 pages, 621 x 810 pt.
- alef-book-draft.pdf: 386 pages, 612 x 792 pt, has a placeholder cover.
- alef-mnemonic-flashcards-letter.pdf: 7 pages, 612 x 792 pt. The A4 version: 7 pages, 594.96 x 841.92 pt.
- docs/book/PRINT.md still says the interior is "about 68 pages". The real count is 384. Stale text.

## What I looked at (page numbers refer to alef-book-8.5x11-print.pdf unless stated)

Viewed as images at 80 to 90 dpi, with some crops at 200 to 220 dpi:
- First 20 pages: 1 to 20 (1 to 11, 14 to 20 individually; 12 and 13 by text only).
- Memory chain pages 15 and 16 (crop of the resh row at 220 dpi).
- Letter pages 21 (alphabet table), 22 (Alef), 37 (Ayin), 42 (Shin), 48 (final Tsadi); letter 23 only in the bleed spread check.
- Chapter openers: 49, 54, 55, 56, 57, 59, 60, 64, 69, 74, 80, 81, 93, 134, 196, 234, 377, 382, 383, 384.
- Interior pages: 61, 66, 82, 94, 95, 97, 99, 107, 117, 131, 132, 135, 137, 163, 175, 178, 185, 197, 235, 261, 300, 334.
- Answer keys: 377, 378, 379, 381 (380 not viewed as an image; its text was extracted).
- Index 382 to 383, colophon 384, blank page 135.
- Bleed file: spread of pages 22 and 23 with the trim box drawn on top.
- RTL-spreads file: pages 95 and 96. Reversed file: pages 2 and 386 (low resolution).
- Flashcards: letter pages 2, 3, 7 (montage at 70 dpi); A4 page 2 at 50 dpi.
- Outside book/out, glanced at only: docs/workbook letter workbook page 2 and the first-day workbook page 2 at 50 dpi.

Measured by script on all pages (50 dpi renders, ink threshold 235 of 255): left, right, top and bottom ink margins for the print, bleed and RTL-spreads files. Extracted text of the print, bleed, RTL, reversed and draft files and compared them.

Key check: I compared the practice pages with the answer key for 43 exercises across 9 lessons (I-01, I-02, I-03, I-07, I-24, I-27, I-34, I-40, I-45; 6 items each, 54 in all). Not every item was compared; the 43 compared include every MATCH item and most ORDER, PRODUCE and RECALL items. All matches were consistent with the exercise (for example I-24 match 1-d 2-a 3-c 4-b 5-e is correct for hot, cold, rain, sun, wind). No mismatch found.

Index check: all 27 letter entries and 33 prayer entries tested against the pages where those titles appear, and the 8 survival-phrase section headings: all agree with the printed page numbers. The contents list on pages 3 and 4 also agrees (printed folio equals PDF page number in the print file).

## Results per check

1. Hebrew right-to-left order: PASS on pages viewed. Words in lines, table columns, question marks and commas at line ends, and the ordered word strips on the practice pages read correctly right to left. Mixed English and Hebrew lines (vocabulary example lines, p235, p261) are readable but awkward, see defect 9.
2. Niqqud and mark placement, clipping: PASS on pages viewed (crops of 64 and 80 at 200 dpi, p7, p10, p16, p54 to 57). No clipped or colliding marks seen. Stacked marks (shin dot with vowel, dagesh with vowel, holam on vav) look correct.
3. Missing glyph boxes, doubled marks, mojibake in extracted text: PASS for the text layer. Zero replacement characters, zero private-use characters, zero control characters, no mojibake byte patterns, no identical doubled marks. Every Hebrew code point in the text exists in the Hebrew print face. Caveat: a text layer cannot prove that a glyph is drawn, and I only saw the pages listed above. One tzere followed by patach on the same letter occurs twice in the text; I did not locate it visually.
4. Page breaks: FAIL (minor). Defects 5 to 7.
5. Writing space on tracing pages: FAIL as a print edition. The 27 letter pages (22 to 48) show stroke-order diagrams but have no ruled or dotted area to write in, although page 3 tells the learner to trace. The only writing space in the book is a single thin rule under each practice item (about 0.4 in apart, pages 95 and similar). Tracing pages with rules exist in docs/workbook (separate files) and were not checked for dimensions.
6. Page numbering: PASS in the print, bleed and RTL files (folios continuous, contents and index agree). The draft file is shifted by one page (cover), and its own index agrees with itself. Page 135 is a deliberately blank page that keeps lesson spreads aligned (even page on the left); the RTL file inserts its own blanks at 94, 136 and 386 and its contents agree (Israel opener 135, word list 197, vocabulary 235, key 378, index 383, colophon 385).
7. Key-to-exercise correspondence: PASS on the 43 items compared. Scope is only the intermediate lessons; there is no key for the earlier chapters, the first-10-minutes quiz or the reading practice.
8. Picture quality: FAIL. Every illustration is a labelled placeholder (letter pages 22 to 48, the large picture box, the small word pictures, page 2, the two intermediate openers on 93 and 134, and the front cover in the draft). The memory-chain page (15, 16) has real greyscale pictures, but several are some heavy, dark clip-art whose subject is hard to read at screen size (for example the Qof picture on 16). I did not judge them at print resolution; embedded image resolution was not measured.
9. Margins against bleed: PASS with notes. Measured minimum left and right ink margin from the trim edge is 0.74 in on every page of the print, bleed and RTL files; minimum top 0.68 in (print, p199) and 0.70 in (bleed, p4); body text bottom at least 0.8 in. No content enters the bleed area. Notes: the folio sits 0.36 in above the trim edge in the print file and about 0.30 to 0.32 in in the bleed file (50 dpi measurement, plus or minus 0.02 in), below the 0.375 in bleed-edition figure that docs/book/PRINT.md itself quotes; margins are equal on both sides (not mirrored), 0.74 in at the gutter for a 384-page book.
10. Three one-page tradition sheets: NOT PRESENT. The only tradition material in the book is the four-page run on pages 17 to 20 (and 19 to 20 is a two-page rule table). The one-page-per-tradition cheat sheets appear only as backlog ideas in docs/drafts. Nothing to fit-check.
11. Reversed and RTL-spreads files: PASS on structure. The reversed file's page i has the same extracted text as the RTL file's page 387 minus i; its first page is blank (padding) and its last is the opening prayer. Content is still English-first left to right, so whether reversal makes sense is the open binding decision recorded in docs/book/PRINT.md.
12. Flashcards: PASS on pages viewed. Backs are column-mirrored for a long-edge flip (3 then 2 then 1 across); cut lines and card grid look right at screen size. Not checked at 100% on paper: the 2.5 x 3.5 in card size is unmeasured.

## Defects found (with pages)

1. Draft and placeholder material is in the print interior: draft badge on pages 1, 6, 9, 15, 19, 93, 134, 234, 377; picture placeholders on 2, 22 to 48, 49 to 53, 93, 134; the web address in the QR codes and the links is a placeholder domain (I decoded the QR codes on pages 22 and 42; both point to it) and the page tells the reader so (p3, p22 and every letter page, colophon 384). The book cannot be sold as is.
2. Right-hand borders of rounded boxes and tables are cut off by about one border width at the right margin: page 2 (blessing box), 5, 6, 9 to 11 (cards and tables), 17, 18, 22 to 48 (stroke card, three word cards), 49 to 53, 54 and 55 (right-hand cards), 60 to 80 (prayer cards). The box edges end at the margin and the right rounded corner is missing, so boxes look open on the right. Cosmetic but systematic.
3. Page 15 to 16: the letter grid splits across two pages in the middle of a table. A stray left border continues below the last row on page 15, and page 16 starts without a top border.
4. Page 15 and 16: hook notes are cut with an ellipsis in the cell (Chet, Ayin, Resh): "...ch of Bach / loch is the...", "...not...; ... or...". Information is lost in print.
5. Page 6: the heading "Three words" is left alone at the bottom of the page; its table is on page 7.
6. Page 11: the "New:" chips of lesson 6 sit at the bottom of the page and their word table starts on page 12. Page 5: the heading "A session in about an hour" touches the table above it (no space). Page 6: "Five letters" heading touches the table.
7. Page 48: the cursive final-Tsadi glyph touches the "CURSIVE" label; the QR link text wraps in the middle of a word ("tsadi-fin / al"). Page 49 to 53: about a quarter of each memory-card page is empty.
8. Page 135 is completely blank (intentional for spread alignment, not confirmed by a person), and page 4 holds ten contents lines and is otherwise empty.
9. Vocabulary chapter (234 to 376): example lines are very long and mix a Hebrew run with an English run inside one paragraph (p235, p261, p334); p261 has 10-line liturgical paragraphs under single-word entries. Some glosses look wrong or out of place (for example "kes: kahen" on p300, a plain Hebrew word listed as "Kodashim, an order of the Mishna"). This is content for a native-speaker review, not layout, but it will show in print.
10. Memory chain (15 to 16): picture quality uneven; hook words are English sound-alikes, and the "I / S / A" tradition notes are tiny type (about 6 pt at 90 dpi).
11. Letter pages carry no writing area and no handwriting lines (see check 5). The "Trace the strokes" instruction on page 3 cannot be done on the page.
12. docs/book/PRINT.md says "about 68 interior pages" and that margins were "measured on rendered pages (see QA.md)". Page count is stale (384).
13. Type 3 Hebrew font embedded in every PDF (the variable Hebrew print face is embedded as Type 3). docs/book/PRINT.md already flags that printer acceptance was never checked; I did not check it either.

## What I did not inspect

- Most of the 384 pages: about 90 of them were looked at as images. The rest (for example the 5,000-word list pages 198 to 233 and vocabulary 236 to 376, intermediate lessons 96 to 133 and 138 to 195, prayer pages not listed) were not viewed; only their text was extracted and scanned, and page-structure was inferred from the pages that were viewed.
- Any page of the draft file as an image.
- The bleed and RTL files beyond the pages listed and the margin measurement.
- The A4 flashcards beyond one page at 50 dpi; flashcard pages 1, 4, 5, 6.
- Real print: colour, greyscale conversion, ink coverage, picture resolution, font acceptance, trim and fold, spine width, cover. No cover file exists in the interior files.
- Whether the audio, app and QR targets work (the domain is a placeholder).
- Hebrew correctness (spelling, pointing, gloss accuracy, tradition rules): that needs a Hebrew reader, not a layout check.
- The workbook PDFs in docs/workbook beyond two pages at 50 dpi.

## Scan

node tools/meta/scan.mjs --text printed: PASS, no AI or tool names in tracked text, 24 files allowlisted, 5537 tracked files.
