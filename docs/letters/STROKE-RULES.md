# Stroke-order rules used for the DRAFT stroke data

Status: authored by the build agent, not a native Israeli teacher. No official Israeli per-letter stroke chart was found
(research: the Ministry of Education 2026 document gives only directionality groups). Treat every order below as a proposal.

Rules (also in tools/letters/author_strokes.py):
- R1 A pure horizontal stroke is written right to left (Hebrew writing direction).
- R2 A pure vertical or falling diagonal stroke is written top to bottom.
- R3 An "arc" (top bar that turns down into a right-hand stem: ר ה ח ת, the bar of ב כ פ ך ף, the hook of ג נ) is ONE stroke
  written from the top left across and then down. This follows the MoE "resh-arc" group (ר ה ת ח ק ב) and is the only place R1 is not applied.
- R4 With several strokes: arc/body first, then legs, feet, inner curls, then base bars.
- R5 Research-confirmed print stroke counts are respected: ו כ ר = 1; ב ד ז ס ע צ ם = 2.
- Exceptions from research text: ayin - second stroke comes from the top left, so the right arm is stroke 1; tsadi - second stroke comes from the top right.

Known doubts to put to the teacher: alef (3 strokes here, order unverified); mem and final mem (arc plus base vs separate base); tsadi and
shin (stroke split); whether Israeli school print is written at all beyond recognition (research gap); every cursive shape.
Preview images: docs/letters/preview-print.svg and preview-cursive.svg (start dot is numbered, arrow marks the end).

## Cursive derivation (Round 2)
Cursive strokes are no longer hand-drawn. tools/letters/derive_cursive.py:
1. takes each glyph of Gveret Levin (OFL, assets/fonts), scales it uniformly (long side <= 760 box units, scale <= 1), centres it in the 0..1000 box;
2. rasterises (rsvg-convert), skeletonises (scikit-image), prunes spurs shorter than ~1.3 stroke radii, builds a pixel graph (endpoints + junctions via crossing number);
3. contracts junctions closer than 45 px, pairs edges through each junction by straightest continuation (turn <= ~110 degrees) => chains = candidate pen strokes;
4. direction: a "flat" chain (width > 1.6 x height) starts at its right end (R1); every other chain starts at its top end (R2/R3); closed loops start at the top and go counter-clockwise (left first);
5. order: chains sorted right to left by mean x (buckets of 120 box units), then top to bottom;
6. per-letter corrections live in tools/letters/cursive_overrides.py (join / flip / order / custom splice: gimel, zayin, chet, tet, mem, tsadi, tav, pe-final) and each one is listed in REVIEW-LIST.md;
7. smoothing (21-sample moving average), Ramer-Douglas-Peucker (6 units), Catmull-Rom path + dense median (geom.py).
The font cannot tell where the pen lifts; stroke count/order are inferences, only partly cross-checked (docs/letters/REVIEW-LIST.md).
