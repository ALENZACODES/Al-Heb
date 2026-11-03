# InDesign handoff: how the sources map to the research architecture

Status: NOTHING here has been done in InDesign (not available). `book/build.mjs` makes a Chromium draft PDF only. It is a layout proof and content skeleton, not the production file.

## Architecture (from the research, lane 7)
InDesign **Middle Eastern edition**, World-Ready Paragraph Composer, RTL binding where chosen -> (1) print PDF, (2) optional fixed-layout EPUB (Apple Books, with per-letter audio), (3) "ebook PDF" with QR/URL per letter linking to the companion web app (lane 8).

## Mapping
| Research element | Source in this repo |
|---|---|
| Letter chapter pages (27) | `book/build.mjs` letter template; data from `data/letters/letters.json` (glyph, stroke medians) |
| Mnemonic + 3 states of Hebrew glyph as vector | `tools/images/overlay.mjs` (SVG; place as linked SVG/PNG in InDesign, glyph stays live text in the final font) |
| Images | `data/images/manifest.csv` names = InDesign link names; `book/img.js` resolves real vs placeholder |
| Front matter: author's "Prayer for the One Who Begins" | TODO block (text not available to the builder) |
| Page 1 Priestly Blessing | from `data/corpus/registry.json` (bless-priestly-1..3) |
| QR/URL per letter | `https://<host>/#/letters/<id>`; `letterUrl()` in build.mjs. QR images NOT generated (no QR lib; python qrcode/segno absent). Generate in InDesign (Object > Generate QR Code) or externally. Host is a placeholder `alef.example.org` |
| Vowels, reading, prayers, survival chapters | generated from code points / registry; survival chapter is a 6-phrase draft |

## Fonts
Draft uses local FreeSerif/DejaVu. Production: Adobe Fonts Hebrew (Adobe Hebrew or Noto Serif Hebrew for print; Playpen Sans Hebrew for the cursive-style look; confirm mark anchoring visually). Adobe Fonts may be embedded in PDF/EPUB but NOT in the app (app uses OFL fonts per lane 8). The real Israeli cursive form is not in the draft (Gveret Levin not installed).

## Print specs (research, partly unverified)
KDP: 8.5x11 available (also 8x10, 8.5x8.5, 6x9); bleed 0.125in top/bottom/outer; premium color for Hebrew titles only (standard color unavailable); RTL paperback only (no hardcover RTL); interior PDF page 1 first. `book/build.mjs --bleed` adds 0.125in on all four sides (a convenience, not KDP-exact). `--trim` selects the trim size. The draft is LTR English-primary with RTL Hebrew spans; whether the print binding is RTL is an open decision (it changes the PDF convention below).
**IngramSpark / Lulu reverse-bound (only if RTL binding):** interior PDF in reverse page order (last page = PDF page 1), even page count, front cover on the left of the cover template; select "Right-to-Left Content". Export two PDFs from InDesign (normal for KDP, reversed for Ingram/Lulu) or reverse with a PDF tool. Ingram/Lulu trim and bleed specs were not fetched.

## EPUB
Fixed-layout EPUB for Apple Books (audio, Read Aloud supported); Kindle FXL unreliable. The InDesign FXL RTL page-progression setting and Thorium RTL support were unverified in the research. Reflowable Hebrew EPUB from InDesign has a 2025 reversed-text bug report: set RTL paragraph direction, World-Ready composer, ME edition, and test.

## Accessibility
Tag language per story (he/en), RTL paragraph direction, check reading order in Acrobat (RTL reading-order export bugs reported).

## What a human must do
InDesign master from these sources; QR codes; final fonts; real images; both PDF exports; EPUB export and device testing; KDP/Ingram uploads and proofs.
