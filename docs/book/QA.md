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
