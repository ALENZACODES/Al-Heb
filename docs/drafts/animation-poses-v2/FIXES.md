# Proposed fixes for the v2 k1 start (DRAFT, not applied)

Status: DRAFT proposal. Nothing in `docs/drafts/animation-poses/` or `docs/drafts/animation-poses-v2/` was changed by this file. No designer has reviewed the proposals, the numbers behind them, or the pictures. Evidence and definitions: `docs/anim/MORPH-CHECK.md`; contact sheets: `docs/anim/morph-sheets/`; tool: `tools/anim/morph_check.mjs`.

## Why the v2 start twists in some letters

The poses k2..k7 were drawn against the old hand-traced k1. Pose k2 is that old shape bent a little (mean RMS distance old k1 to k2: 9.8 units), so starting from the real glyph the first 400 ms is a reshape (v2 k1 to k2: 28.9; after moving the start point: 25.7). In 9 letters the interpolation tears or crosses itself and no start point fixes it. Moving the start point is the only mechanical fix that keeps counts, ids and commands, and it is already applied as `docs/drafts/animation-poses-v2b/`.

## 1. Use v2b (start shift is enough by the metric)

bet, mem, lamed, tav, zayin, final-kaf, final-pe. In v2b these pass the metric test that they fail in v2. To my eye bet, lamed and final-pe are still lumpy in the middle frames (see the notes in `MORPH-CHECK.md`), so a designer may still want to touch k2 there. Use the v2b k1 file for these.

## 2. No change needed by the metric

alef, resh, vav, yod, he, kaf, ayin, qof, gimel, tet, final-nun. Two caveats: alef and gimel look lumpy to my eye in frames 5-7 (mild), and bet, tet, qof, gimel already had in-between crossings in the old k1 to k2, so "no worse than before" is a low bar there.

## 3. Redraw needed

For each, the proposal is: redraw the k2 `p1` starting from the v2 k1 outline (keep its point order and the same 48, or 98 for two-part letters, points), moving it only by the small bend k2 is meant to show, and then re-run the checker. The mechanical shortcut (proposal D in the sheets, a least-squares affine map of the old k1-to-k2 change applied to the v2 outline) removes every first-transition crossing except shin's, but it was not applied because it changes the start of k2-to-k3, which was drawn against the old k2. Where k3 also needs a look, it is marked.

- **shin**: first fix the v2 k1 outline itself. It crosses itself twice where the middle prong was slid down onto the bowl (v2 README). Rebuild that joint so the outline does not cross, then redraw k2 from it. k3 needs a look (second-transition crossings go from 2 to 4 under proposal D).
- **dalet**: the top bar tears from the stem in v2 and kinks in v2b. Redraw k2 so the bar stays attached and the same width. k3 needs a look (crossings 2 to 4).
- **nun**: v2b is acceptable but notched at frames 7-9. Redraw k2 as a smooth bend of the v2 outline. k3 needs a look (crossings 0 to 1, area jump 107 to 153).
- **pe**: ragged knot in the middle frames. Redraw k2; the curl of the v2 pe is angular (v2 README), which the old k2 does not match. k3 was not flagged by proposal D.
- **tsadi**: ragged lump in frames 5-7; the shifted start was not accepted. Redraw k2; k3 needs a look (crossings 2 to 3).
- **final-mem**: worst case (counter and outer outline cross in frames 5-8, area jump 705). Redraw k2 and k3 (second-transition crossings go from 2 to 8, area jump from 142 to 631 under proposal D).
- **final-tsadi**: the old k1 was a Y, the v2 glyph is a different slanted shape, so k2 is far from it (RMS 29). Redraw k2; k3 was not flagged by proposal D.
- **chet** and **samech** (mild to my eye, metric says redraw): chet has a small nick on the left leg, samech has its counter crossing the outer outline in the last frames, hidden by the stroke except a spike at the top left. Low priority; redraw k2 from the v2 outline.

## 4. A different start alignment

The checker tried up to 80 start points per letter in order of distance. For alef, samech, tsadi and final-tsadi the lowest-distance start was worse than the v2 start (and kaf and nun kept a start other than the lowest-distance one), so a pure "minimise displacement" rule is not enough. If someone wants to try more, the tool is `chooseShifts` in `tools/anim/morph_check.mjs`; a start chosen by eye on the sheets is as legitimate as a computed one.

## 5. If the point count may change

48 points per outline is few for the real glyphs (v2 README). Raising the count would let k2..k7 follow the new shape more closely but breaks the "same count as existing" rule and means redrawing every later pose, so it is not proposed here.

## After any redraw

```
node tools/anim/check_poses.mjs <folder>            # structure
node tools/anim/morph_check.mjs --v2b docs/drafts/animation-poses-v2b --sheets docs/anim/morph-sheets
```

then look at the sheet for the letter. The checker passing does not mean the morph looks right.
