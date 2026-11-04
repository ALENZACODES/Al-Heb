# Book visual QA log (2026-11-03, Round 2)

Method: build PDF -> `python3 book/contact_sheets.py FILE.pdf OUTDIR` (pdftoppm, 70 dpi, 6 pages per sheet, plus 110 dpi single pages on request) -> looked at the sheets with the image viewer, fixed, rebuilt, looked again. Only what is listed under "looked at" was inspected by eye; automated checks are listed separately. Nothing was checked by a Hebrew reader or a printer's previewer.

## Page counts (final build)
| File | Pages |
|---|---|
| book/out/alef-book-draft.pdf (with cover) | 63 |
| alef-book-8.5x11-print.pdf, -print-bleed.pdf, -bleed-rtlspreads.pdf, -REVERSED-ingram-lulu.pdf | 62 each (61 content pages + 1 blank pad page to reach an even count) |
Layout of the 8.5x11 interior: opening prayer 1, Priestly Blessing 2, how-to + contents 3, traditions 4-5, alphabet table 6, 27 letter pages 7-33, vowels 34-35, syllables 36, practice words 37-38, blessing word-by-word 39, prayers 40-48 (27 texts), survival 49-59 (204 phrases), index 60, colophon 61, blank 62.

## Looked at by eye
- Draft (63 pp): all 11 contact sheets of the first build; after fixes, sheets 1, 2, 5, 6, 8 again; later revisions: sheets 3, 4, 6, 7, 10, 11. Full-resolution (110 dpi): letter page Alef, vowels page 1, syllable grid.
- Final KDP no-bleed interior (62 pp): sheets 1-9 (pages 1-54) after the last rebuild. Pages 55-62 (end of survival, index, colophon, blank) were looked at in the preceding build; the last rebuild changed only a filter that removes internal "TODO" sentences from sound notes.
- 8.5x8.5 trim: one contact sheet (letters Bet to Vav). Nothing else at 8x10, 6x9 or square.
- 54 QR codes, the 54 reference silhouette PNGs (contact sheets of both sets, 27 each).

## Defects found and fixed
1. Prayer cards: the QR code sat on top of the right-aligned Hebrew and hid the first words of every line -> QR moved beside the English/footer block.
2. Cursive glyph overflowed its card (tall Gveret Levin forms: tsadi sofit, pe sofit) -> glyph size/line-height reduced; checked on all finals.
3. "How to use" page showed the literal text `&lt;letter&gt;` in the URL pattern (double escaping) -> fixed.
4. Pronunciation traditions ran to 4 pages with an orphan card -> compacted to 2 pages.
5. Alphabet table overflowed by two rows onto a second page -> compacted to one page.
6. Vowel chapter left one orphan card (Sin dot) on a third page -> trimmed notes, now 2 pages.
7. Letter page left ~1.3in empty at the bottom -> mnemonic row enlarged.
8. "placeholder host, not a live site" broke mid-word (`l ive`) -> word-break fixed.
9. Index spilled 12 lines onto a second page -> smaller type, now one page.
10. Sentences in data notes that point at repo internals ("src/...", "lane-3", "TODO") appeared in the printed sound panels and vowel cards -> filtered (data files untouched).
11. Practice-words page printed "u" for הוּא (src/pronunciation/transliterate.js drops the initial h before a vav-vowel: הוֹדוּ -> "odu"). Worked around in the book (those words are skipped unless the phrasebook has a curated transliteration). The bug itself is lane 3's and is NOT fixed.
12. Print-bleed output: Chromium rounded the page to 8.6267in -> `pdf_tools.py finalize` forces exact 8.625x11.25in and writes TrimBox/BleedBox.
13. Square trim: letter pages spilled their sound panel onto a second page -> zoom now computed from the available height.

## Automated checks
- `pdffonts`: all fonts embedded; Hebrew = Noto Serif Hebrew (variable font, embedded as Type 3 by Chromium) and Gveret Levin; Liberation, DejaVu and FreeSerif appear as Latin/IPA fallbacks.
- Code points: every Hebrew character in the book HTML exists in Noto Serif Hebrew and Gveret Levin (fontTools cmap check); `pdftotext` shows no U+FFFD.
- QR: 54/54 decode back to their exact URLs (OpenCV QRCodeDetector, see book/verify_qr.py). OpenCV is flaky at fractional pixel-per-module scales, so the verifier tries several integer scales; this tests the SVGs, not a phone camera on paper.
- Margins: measured on rendered pages: no-bleed 0.74/0.76in; bleed LTR odd page 0.74in left / 0.90in right, even page 0.86 / 0.78; RTL-spreads mirrored. Reversed file page i has the same text as the original page N+1-i.
- Tests: tests/book.build.test.js, tests/book.refs.test.js (+ the older book tests).

## Not checked / known remaining
- Every image is still a labelled SVG placeholder; the cover shows a placeholder.
- Niqqud placement was judged by eye at 70-110 dpi on a few hundred words, not on every word; no collisions were seen in Noto Serif Hebrew. Frank Ruhl Libre was compared once on a sample line and not used.
- Hebrew vocabulary: dalet (2 words), tsadi (2), tsadi sofit (1) have fewer than three because the data has no more pointed standalone words for them; words come from phrasebook/lessons only, no new Hebrew was written.
- Stroke diagrams come from data/letters/letters.json as of the last rebuild (lane 2 was still upgrading cursive; cursive is labelled draft).
- Survival Hebrew and prayers are not proofread by a native/educator; the book says so on the pages.
- A blank last page is added for the even count.


# Round 3 addendum (2026-11-03, lane 7): "Remember every letter" chapter, mnemonic flashcards, quirky image prompts

## Page counts (this build)
| File | Pages |
|---|---|
| book/out/alef-book-draft.pdf (with cover) | 68 (was 63) |
| alef-book-8.5x11-print.pdf, -print-bleed.pdf, -bleed-rtlspreads.pdf, -REVERSED-ingram-lulu.pdf | 68 each (67 content pages + 1 blank pad page; was 62) |
| alef-mnemonic-flashcards-letter.pdf, -a4.pdf | 7 each (1 instruction page + 3 sheets x front/back) |
The new chapter is 5 pages (PDF pages 34-38 of the interior): page 1 holds the intro and 4 cards, the other pages 6 cards each (2 x 3), 27 cards in all, right after the 27 letter pages. Interior layout shifts by 5 pages from "Vowels" onward (see the contents page).

## Looked at by eye (rasterised)
- Chapter pages in the draft PDF at 45-80 dpi: all 5 pages, and at 80 dpi pages 1 and 2 in full. Found and fixed: only 4 cards on page 1 spilled a 3rd row onto the next page and left page 2 with 2 cards (now 4 + 6/6/6/5); anchor word clipped at the card bottom (card height set; two cards, mem and tav, then shin, still overflowed by a few pixels: padding trimmed); picture shrunk to 0.85in.
- Interior print PDF: contact sheets 1 (pages 1-6: contents page shows the new chapter with its page number 34) and 6 (pages 31-36), last sheet (colophon, blank page 68). Bleed PDF page 36.
- Flashcards, US Letter: pages 1 (instructions), 2 (fronts 1-9), 3 (backs 1-9: column order mirrored, so Gimel/Bet/Alef sit behind Alef/Bet/Gimel). A4: pages 6 and 7 (fronts 19-27, backs). Found and fixed: sound line on the front overlapped the footer tag for long sounds (front shows the first clause only); glyph overflow by 2px on fronts (sizes reduced).
- Not looked at: the other flashcard pages one by one, the 8x10/6x9/square trims (chapter not checked at those), the RTL-spreads and reversed files beyond the page counts.

## Automated
- tests/book.cards.test.js: 27 cards match data/letters/mnemonics.json field by field, pointed anchor words, chapter in contents, flashcards count/mirror order/instruction page, and (with Chromium) no card or flashcard box overflows.
- These cards read mnemonics.json at build time and the text changed between two of my builds (lane 2 refining it), so the page counts above can move if the text grows; the overflow test is the guard, not these numbers.
- Not checked: duplex alignment on a real printer (a page-geometry design only), how A4 margins behave on printers with 0.25in unprintable edges (sheet margins are 0.38in left/right and 0.6in top/bottom on A4, 0.5in / 0.25in on Letter: the Letter top/bottom margin is at the limit of many printers).

## Colophon licence TODO
The colophon said the Noto licence file "still has to be added". The file was already in the repo (assets/fonts/notoserifhebrew-OFL.txt and docs/licenses/OFL-notoserifhebrew.txt); I fetched https://raw.githubusercontent.com/google/fonts/main/ofl/notoserifhebrew/OFL.txt on 2026-11-03 and it is byte-identical (diff). Only the stale sentence was wrong; it now says so. The colophon cites the licence files, it does not reproduce the text.

## Still placeholder
All pictures (the quirky mnemonics included: prompts exist, no images), cover, QR host (alef.example.org), proofreading of hooks/anchor words/prayers/phrases, handwriting strokes.
