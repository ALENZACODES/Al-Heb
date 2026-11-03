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

## Print and cursive stroke centerlines (`strokes[].median`, `strokes[].path`)
- Authored by hand (tools/letters/author_strokes.py). NOT derived from any copyrighted stroke diagram: the Hebrew4Christians, Abzug/JMU, ancient-hebrew.org and Akhlah diagrams were NOT viewed or copied (the PDFs were not reachable and are copyrighted).
- Stroke counts consistent with research text: print vav/kaf/resh = 1; bet, dalet, zayin, samekh, ayin, tsadi, final mem = 2 (flag `strokeCountConfirmedByResearch`). Cursive alef = 2 and mem = 3 (Hebrew4Christians / HebrewPod101 text).
- ORDER and DIRECTION are the author's convention (docs/letters/STROKE-RULES.md). Every record is `validated:false`, `needsNativeReview:true`, `quality:"draft"`.
- Cursive: no OFL cursive font could be installed (Google Fonts unreachable), so shapes are simplified Israeli ktav yad drawn from verbal descriptions (Mezzoguild, Wikipedia: Cursive Hebrew). They have NOT been compared to a school model and may deviate.

## keyboard-si1452.json
- Source: xkeyboard-config `symbols/il` ("basic", header: implementation of Israeli standard SI-1452 (2013)), as installed in `xkb-data 2.41`; permissive X11-style licence ("Permission to use, copy, modify, distribute, and sell this software ... for any purpose is hereby granted without fee", /usr/share/doc/xkb-data/copyright).
- AltGr niqqud list cross-checked with Wikipedia "Hebrew keyboard" (agrees).
- Gaps: SI-1452 standard document not consulted; 2018 variant not encoded; shuruk is composed (vav + dagesh).
