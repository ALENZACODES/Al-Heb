# Sources and licences for data/letters

## letters.json
- Metadata (names, gematria 1-400, IPA): Wikipedia "Hebrew alphabet" as recorded in the research notes. Letter names with niqqud (nameHe) are conventional spellings; not checked against an Academy list.
- Final-form gematria 500-900: a widely cited convention, NOT confirmed by any fetched source (flagged `gematriaIsConvention`).
- Confusable sets: research Key Question 5.

## Print outlines (`print.outline`) - extracted by tools/letters/extract_outlines.py
- Font: **DejaVu Sans** v2.37 (Debian `fonts-dejavu-core`), /usr/share/fonts/truetype/dejavu/DejaVuSans.ttf.
- Licence: Bitstream Vera licence for the original glyphs; "DejaVu changes are in public domain" (see /usr/share/doc/fonts-dejavu-core/copyright). The licence permits use, copying, merging, publishing and distribution, and modification only if the modified FONT is renamed; here we only embed glyph outline paths in data, not a font. Copy of the notice must travel with redistributions of the Font Software: "Copyright (c) 2003 by Bitstream, Inc. All Rights Reserved. Bitstream Vera is a trademark of Bitstream, Inc. DejaVu changes are in public domain."
- No GPL fonts (Culmus, FreeSans/FreeSerif are GPL+font exception) were used. FreeSerif/FreeSans exist locally but were not used.
- Outlines are scaled uniformly by 0.48 and positioned on baseline y=756 in the 0..1000 box (see the script).

## Cursive outlines and stroke centrelines (`cursive.*`) - Round 2
- Font: **Gveret Levin** (Israeli handwriting style), Copyright 2024 The Gveret Levin Project Authors (https://github.com/AlefAlefAlef/gveret-levin), SIL Open Font License 1.1 (assets/fonts/gveretlevin-OFL.txt), fetched from github.com/google/fonts.
- `cursive.outline` is the glyph outline (a modified copy of the font's shapes) and `cursive.strokes[].median/path` are skeletons computed from it by tools/letters/derive_cursive.py (docs/letters/STROKE-RULES.md). They are therefore a DERIVATIVE of an OFL font. Licence consequence, stated honestly: OFL 1.1 allows use, study, modification and redistribution of derivatives provided the copyright notice and licence travel with them, the derivative is under the same OFL, and "Reserved Font Names" are not used for modified versions (none are declared in the shipped OFL text; check it). Practically: keep the OFL text and the copyright line with data/letters/letters.json and anything that embeds these shapes (e.g. the app bundle, worksheets, book). This is not legal advice; confirm before commercial distribution. The OFL covers fonts "sold by themselves" restrictions only, not documents set in them.
- Cursive stroke ORDER/DIRECTION and the per-letter overrides are the build agent's inferences, partly compared with one numbered reference (Abzug, viewed not copied; see docs/letters/REVIEW-LIST.md). Not validated by a native teacher.
- The earlier hand-drawn cursive data was removed.

## Print stroke centerlines (`print.strokes[].median`, `print.strokes[].path`)
- Authored by hand (tools/letters/author_strokes.py). NOT derived from any copyrighted stroke diagram: the Hebrew4Christians, Abzug/JMU, ancient-hebrew.org and Akhlah diagrams were NOT viewed or copied (the PDFs were not reachable and are copyrighted).
- Stroke counts consistent with research text: print vav/kaf/resh = 1; bet, dalet, zayin, samekh, ayin, tsadi, final mem = 2 (flag `strokeCountConfirmedByResearch`). Cursive alef = 2 and mem = 3 (Hebrew4Christians / HebrewPod101 text).
- ORDER and DIRECTION are the author's convention (docs/letters/STROKE-RULES.md). Every record is `validated:false`, `needsNativeReview:true`, `quality:"draft"`.
- Print strokes remain hand-authored over the DejaVu outline (no print font skeletonised; Frank Ruhl Libre, Aleph and Heebo are in assets/fonts but not used for strokes).
- Worksheets/workbooks use Frank Ruhl Libre (print) and Gveret Levin (cursive) as dotted guides (OFL 1.1).

## keyboard-si1452.json
- Source: xkeyboard-config `symbols/il` ("basic", header: implementation of Israeli standard SI-1452 (2013)), as installed in `xkb-data 2.41`; permissive X11-style licence ("Permission to use, copy, modify, distribute, and sell this software ... for any purpose is hereby granted without fee", /usr/share/doc/xkb-data/copyright).
- AltGr niqqud list cross-checked with Wikipedia "Hebrew keyboard" (agrees).
- Gaps: SI-1452 standard document not consulted; 2018 variant not encoded; shuruk is composed (vav + dagesh).
