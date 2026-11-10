# Animation poses v2: candidate letter outlines (DRAFT)

Status: DRAFT, candidate outlines, not wired into the app, not reviewed by a designer or a native reader. The originals in `docs/drafts/animation-poses/` are untouched.

## What is here
27 files `<item>-k1.svg` (shin, bet, alef, mem, lamed, resh, vav, tav, yod, dalet, he, kaf, nun, samech, ayin, pe, tsadi, qof, gimel, zayin, chet, tet, final-kaf, final-mem, final-nun, final-pe, final-tsadi). Each is a copy of the old k1 file in which ONLY the `d` of path `p1` was replaced by the real outline of the printed letter. All other paths, ids, fills, strokes and the title and description are unchanged. `candidates.json` lists per item the glyph contours, old and new command counts, and the bounding box. `contact-sheet-1.png` and `contact-sheet-2.png` show old (left) and new (right) for every letter.

## Source and licence
Outlines come from the Alef Regular font already in the repo (`assets/fonts/alef-Alef-Regular.ttf`, copyright 2012 HaGilda and Mushon Zer-Aviv), licensed under the SIL Open Font License 1.1 (`assets/fonts/alef-OFL.txt`, `docs/licenses/OFL-alef.txt`). The font declares the Reserved Font Name "Alef". No font file is copied here: the outlines are flattened, scaled, simplified and rounded to whole numbers, which makes them a modified derivative of glyph shapes; do not present them as the Alef font or under that font name. Licence text must travel with any redistribution of the font itself (not needed for these SVGs, but recorded for the reviewer).

## How they were made
`python3 tools/anim/resample_path.py --font assets/fonts/alef-Alef-Regular.ttf --src docs/drafts/animation-poses --out docs/drafts/animation-poses-v2` (needs fontTools; deterministic). Steps, also in the script header: flatten curves; one uniform scale for all letters (lamed is 104 units tall, a yod stays small); centre on the old outline's bounding box; reduce or split to exactly the old number of points per sub-path (Visvalingam with a corner penalty); keep the old start point and winding; round to integers. Output uses M, L, Z only, like the originals. Contact sheets: `tools/anim/contact_sheet.py`.

## What was checked (and what was not)
- Run on all 27: same path count, same ids, same command sequence as the old k1 (49 commands, or 98 for he, samech, qof, final-mem), and the same sequence as the existing k2 p1; all coordinates are integers; zero self-crossings after rounding (diagnostic in `candidates.json`).
- Looked at the contact sheets by eye. Not checked: how the morph into k2..k7 looks. The start point and winding match the old outline, but the old k2 onward were drawn against the old shape, so some in-between frames may twist. Needs a player run.
- Letters that were `fill="none"` stay fill none, so they render as an outlined glyph with the 6-unit stroke; thin stems look hollow and bold.

## Honest result
Clearly closer to the printed letter than before: kaf (was a rounded C), final-kaf, nun, final-nun, pe, final-pe, final-tsadi (was a Y), tsadi, ayin, gimel, tet, zayin, yod, lamed, qof, he, bet, tav, resh. Shin now has three prongs, but the middle prong is only a short stub joined to the bowl (the source glyph floats it; it was slid down to touch). Final forms differ from the non-final forms (kaf/final-kaf, mem/final-mem, nun/final-nun, pe/final-pe, tsadi/final-tsadi).
Still rough: 48 points per outline is few, so edges are slightly wobbly and some corners are nicked (top-left of final-mem and chet, left edge of nun, samech outline). Mem, alef, dalet, samech and chet were already acceptable and change little. The pe and final-pe curl is angular. Tet is recognisable but its inner hook is crude. Raising the point count (and the k2..k7 poses to match) would fix most of this but breaks the "same count as existing" rule, so it is left for a decision.
