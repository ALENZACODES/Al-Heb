# Morph check: v2 k1 outlines against the old k2..k7 poses (DRAFT)

Status: DRAFT. No designer and no native reader has reviewed any of this. The numbers are geometry only, and the "after looking" column is one person (not a designer) looking at small contact sheets. Nothing here is wired into the app; the pose folders were not changed, and the player (`src/letters/tween.js`) was only read, never edited.

## Question

`docs/drafts/animation-poses-v2/` holds candidate k1 outlines cut from a real font for the 27 letters. The poses k2..k7 in `docs/drafts/animation-poses/` were drawn against the old hand-traced k1. Does the first morph (k1 to k2, 0 to 400 ms) still look right when it starts from the new outline?

## What was compared

Frames come from `sampleFrame` in `src/letters/tween.js` (the player's own pure interpolation, with the contract's per-pose easing read from the batch JSON files): 12 steps per transition, 13 samples for k1 to k2, 73 frames over 0..2600 ms.

- **A**: original k1..k7.
- **B**: v2 k1, original k2..k7.
- **C**: `docs/drafts/animation-poses-v2b/` k1 (the v2 outline with its start point moved around the outline, nothing else), original k2..k7. See `docs/drafts/animation-poses-v2b/README.md`.
- **D** (a proposal, never applied to any file): C plus a k2 outline made by carrying the old k1-to-k2 change over to the v2 outline with a least-squares affine map. Shown in the sheets and in the second table to say what a redraw of k2 would do to the next transition.

Only path `p1` (the letter outline) differs between A, B and C; the checker verifies that paths `p2..` and poses k2..k7 are identical in the three, and the metrics are computed on `p1`. Because only k1 changes, only the first transition can differ between A and B; later transitions are the same in every variant (their crossing counts are in the table for context).

## Run it

```
node tools/anim/morph_check.mjs --self-test
node tools/anim/morph_check.mjs --v2b docs/drafts/animation-poses-v2b                      # table on stdout
node tools/anim/morph_check.mjs --v2b docs/drafts/animation-poses-v2b --sheets docs/anim/morph-sheets --table table.md --json out.json
node tools/anim/morph_check.mjs --make-v2b docs/drafts/animation-poses-v2b                  # rewrite v2b from v2 (deterministic)
node --test tests/anim.morph_check.test.js
```

Exit codes: 0 ran, 1 error or failed self-test or a v2b that is not a pure start shift, 2 usage. Zero dependencies; `--sheets` needs `rsvg-convert`. The numbers and the metric verdict in the table come from the tool; the last column and the notes are written by hand.

## Metrics (all on p1, for the k1 to k2 transition unless stated)

- **rms k1-k2**: RMS distance between matching points of the two key poses, in units of the 200 by 200 canvas. How far the start is from the next pose.
- **self-crossings of k1**: proper crossings in the k1 outline itself.
- **max crossings k1>k2**: the largest number of proper self-crossings of the outline in any of the 13 frames. Touching and collinear overlap are not counted. Crossings between the outer outline and the counter of a letter with two sub-paths are counted. Stroke width (6 units) is ignored, so a counted crossing can be hidden under the stroke.
- **area jump**: largest change of signed polygon area between consecutive frames, in square units.
- **max point move**: largest distance one point moves between consecutive frames, in units. (It is larger in B and C simply because the start is farther from k2; it is not by itself a twist.)
- **centroid wobble**: largest distance of the area centroid (vertex mean if the area is under 1) from the straight line between the transition's end centroids.

## Verdict rules

- A variant **passes** if, against A, it has no more in-between crossings, no more self-crossings in k1, an area jump of at most 1.5 x A + 50 square units and a wobble of at most A + 3 units. These tolerances are my judgement, not a standard.
- **ok**: B passes. **twists**: B fails but C (shifted start) passes, so a start alignment cures it. **needs redraw**: B and C both fail, so k2 (and possibly k3) has to be redrawn. This is the "metric verdict".
- The "verdict after looking" is the metric verdict, changed in 5 letters where the contact sheet clearly disagreed (alef, gimel: ok to twists; tav: twists to ok; chet, samech: needs redraw to twists). The reasons are in the notes.
- A passing letter can still be rough when A was already rough: 7 letters already have in-between crossings in the old k1 to k2 (bet (4), lamed (2), dalet (2), qof (2), gimel (2), tet (4), final-pe (2)), and 19 of 27 have crossings somewhere in k2..k7.

## Result

By the metric: ok 11, twists 7, needs redraw 9. After looking: ok 10, twists 10, needs redraw 7.

- The v2 start is much farther from k2 than the old one was: mean RMS distance 9.8 (A), 28.9 (B), 25.7 (C), and mean largest per-frame point move 2.5 (A) against 8.1 (B). This is the underlying cause: k2 is the old hand-traced shape bent a little, so the first 400 ms now reshapes the real glyph into the crude trace.
- Moving the start point (C) helps where it is accepted: it cures 7 letters that fail in B (bet, mem, lamed, tav, zayin, final-kaf, final-pe), and does not change the verdict of the 9 that fail in both (shin, dalet, nun, samech, pe, tsadi, chet, final-mem, final-tsadi).
- The lowest-distance start is not always the least twisty: for 6 letters the lowest-distance start was not the one kept (alef (chosen 0, lowest-distance 46); kaf (chosen 2, lowest-distance 3); nun (chosen 28, lowest-distance 32); samech (chosen 0,0, lowest-distance 46,0); tsadi (chosen 0, lowest-distance 44); final-tsadi (chosen 0, lowest-distance 45)).
- One v2 outline is broken by itself: shin's k1 crosses itself 2 times (the middle prong), which no start shift can fix.

## Table

Three numbers are A / B / C.

| letter | rms k1-k2 A / B / C | k1 self-crossings A / B / C | max crossings k1>k2 A / B / C | area jump A / B / C | max point move A / B / C | centroid wobble A / B / C | crossings k2>k7 (same in A, B, C) | metric verdict | verdict after looking |
|---|---|---|---|---|---|---|---|---|---|
| shin | 9.77 / 19.14 / 18.2 | 0 / 2 / 2 | 0 / 2 / 2 | 11.63 / 190.57 / 176.03 | 2.62 / 5.81 / 6.2 | 0.09 / 0.81 / 3.02 | 2 | needs redraw | needs redraw |
| bet | 15.05 / 43.43 / 36.82 | 0 / 0 / 0 | 4 / 4 / 4 | 249.45 / 252.68 / 237.5 | 3.2 / 10.06 / 8.09 | 0.75 / 6.43 / 2.29 | 4 | twists | twists |
| alef | 10.57 / 26.38 / 26.38 | 0 / 0 / 0 | 0 / 0 / 0 | 113.98 / 154.82 / 154.82 | 2.82 / 8.26 / 8.26 | 0.02 / 2.35 / 2.35 | 6 | ok | twists |
| mem | 11.39 / 30.31 / 24.57 | 0 / 0 / 0 | 0 / 3 / 0 | 18.71 / 144.3 / 40.52 | 2.94 / 9.98 / 6.72 | 0.94 / 9.03 / 1.33 | 4 | twists | twists |
| lamed | 12.85 / 33.06 / 26.88 | 0 / 0 / 0 | 2 / 4 / 2 | 209 / 265.1 / 226.13 | 3.08 / 8.23 / 7.49 | 0.47 / 10.18 / 3.21 | 5 | twists | twists |
| resh | 5.68 / 25.92 / 23.87 | 0 / 0 / 0 | 0 / 0 / 0 | 77.69 / 133.76 / 99.72 | 1.68 / 7.96 / 7.65 | 0.17 / 0.72 / 1.2 | 0 | ok | ok |
| vav | 3.75 / 14.16 / 11.23 | 0 / 0 / 0 | 0 / 0 / 0 | 8.27 / 30.13 / 29.39 | 1.08 / 3.63 / 2.47 | 0.01 / 1.79 / 0.37 | 0 | ok | ok |
| tav | 6.62 / 19.61 / 18.37 | 0 / 0 / 0 | 0 / 0 / 0 | 7.43 / 67.04 / 31.27 | 1.79 / 5.7 / 6.29 | 0.06 / 1.15 / 2.15 | 0 | twists | ok |
| yod | 2.96 / 16.3 / 16.23 | 0 / 0 / 0 | 0 / 0 / 0 | 2.44 / 44.54 / 44.43 | 0.77 / 3.92 / 4.2 | 0.01 / 1.9 / 1.72 | 0 | ok | ok |
| dalet | 9.81 / 40.24 / 35.26 | 0 / 0 / 0 | 2 / 5 / 2 | 185.31 / 190.08 / 182.43 | 2.46 / 10.17 / 8.68 | 0.32 / 6.17 / 3.39 | 2 | needs redraw | needs redraw |
| he | 7.91 / 22.54 / 21.73 | 0 / 0 / 0 | 0 / 0 / 0 | 94.69 / 150.96 / 119.27 | 3.03 / 8.57 / 8.1 | 0.91 / 2.3 / 2.28 | 2 | ok | ok |
| kaf | 11.22 / 32.65 / 30.98 | 0 / 0 / 0 | 0 / 0 / 0 | 36.65 / 92.84 / 62.95 | 2.56 / 8.65 / 7.62 | 0.23 / 1.85 / 1.89 | 0 | ok | ok |
| nun | 6.55 / 47.86 / 27.05 | 0 / 0 / 0 | 0 / 2 / 2 | 38.47 / 216.42 / 72.3 | 1.84 / 11.8 / 7.93 | 0.34 / 11.62 / 6.61 | 1 | needs redraw | needs redraw |
| samech | 11.32 / 14.69 / 14.69 | 0 / 0 / 0 | 0 / 12 / 12 | 363.02 / 445.87 / 445.87 | 2.87 / 4.65 / 4.65 | 0.05 / 7.7 / 7.7 | 12 | needs redraw | twists |
| ayin | 7.53 / 12.28 / 12.28 | 0 / 0 / 0 | 0 / 0 / 0 | 51.55 / 38.29 / 38.29 | 1.87 / 4.13 / 4.13 | 0.34 / 0.05 / 0.05 | 2 | ok | ok |
| pe | 9.19 / 40.07 / 30.79 | 0 / 0 / 0 | 0 / 5 / 4 | 63.62 / 321.86 / 149.31 | 2.47 / 11.96 / 9.51 | 0.64 / 7.31 / 3.45 | 4 | needs redraw | needs redraw |
| tsadi | 11.04 / 31.95 / 31.95 | 0 / 0 / 0 | 0 / 2 / 2 | 84.8 / 150.89 / 150.89 | 2.44 / 10.6 / 10.6 | 0.4 / 3.02 / 3.02 | 2 | needs redraw | needs redraw |
| qof | 10.84 / 22.25 / 22.2 | 0 / 0 / 0 | 2 / 2 / 2 | 168.55 / 210.36 / 206.49 | 2.79 / 6.6 / 6.51 | 0.02 / 1 / 0.96 | 5 | ok | ok |
| gimel | 11.28 / 33.14 / 27.88 | 0 / 0 / 0 | 2 / 2 / 2 | 182.05 / 202.29 / 187.93 | 2.48 / 9.14 / 7.21 | 0.09 / 2.62 / 1.05 | 5 | ok | twists |
| zayin | 9.26 / 40.53 / 34.1 | 0 / 0 / 0 | 0 / 1 / 0 | 24.15 / 122.15 / 62.75 | 2.44 / 11.19 / 9.49 | 0.11 / 12.18 / 0.77 | 0 | twists | twists |
| chet | 13.75 / 30.22 / 28.8 | 0 / 0 / 0 | 0 / 0 / 0 | 122.24 / 174.72 / 173.62 | 3.15 / 8.82 / 7.74 | 0.31 / 3.72 / 5.09 | 3 | needs redraw | twists |
| tet | 11.57 / 17.78 / 17.56 | 0 / 0 / 0 | 4 / 4 / 4 | 189.1 / 244.93 / 225.52 | 2.42 / 5.67 / 4.64 | 0.16 / 0.61 / 0.26 | 6 | ok | ok |
| final-kaf | 11.23 / 45.85 / 45.09 | 0 / 0 / 0 | 0 / 0 / 0 | 17.4 / 80.33 / 7.53 | 3.09 / 11.34 / 11.38 | 0.99 / 0.98 / 1.75 | 0 | twists | twists |
| final-mem | 10.4 / 34.83 / 32.94 | 0 / 0 / 0 | 0 / 8 / 8 | 161.69 / 705.54 / 705.26 | 3.22 / 7.58 / 8.78 | 0.02 / 5.64 / 3.45 | 2 | needs redraw | needs redraw |
| final-nun | 7.7 / 18.05 / 16.9 | 0 / 0 / 0 | 0 / 0 / 0 | 26.5 / 33.87 / 31.74 | 1.66 / 4.56 / 4.16 | 0.01 / 1.75 / 0.03 | 0 | ok | ok |
| final-pe | 12.17 / 37.59 / 31.53 | 0 / 0 / 0 | 2 / 4 / 2 | 226.61 / 355.52 / 216.9 | 2.55 / 9.63 / 9.42 | 0.16 / 5.84 / 2.07 | 4 | twists | twists |
| final-tsadi | 12.62 / 28.75 / 28.75 | 0 / 0 / 0 | 0 / 3 / 3 | 175.8 / 208.46 / 208.46 | 3.15 / 9.51 / 9.51 | 0.1 / 6.19 / 6.19 | 7 | needs redraw | needs redraw |

## Proposal D: what redrawing k2 from the v2 outline would do to the next transition

The affine map makes k1 to k2 smooth by construction (only shin, which inherits the crossings of its v2 outline, and final-kaf, whose thin stem shrinks, fail the test), but it moves the mismatch to k2 to k3, which was drawn against the old k2. Where the second transition gets worse, k3 also needs a look.

| letter | k1>k2 maxX A / D | k1>k2 areaJump A / D | k1>k2 wobble A / D | k2>k3 maxX A / D | k2>k3 areaJump A / D | D passes the test |
|---|---|---|---|---|---|---|
| shin | 0 / 2 | 11.63 / 25.35 | 0.09 / 0.01 | 2 / 4 | 101.26 / 312.87 | no |
| bet | 4 / 0 | 249.45 / 179.05 | 0.75 / 0.02 | 4 / 3 | 138.52 / 77.92 | yes |
| alef | 0 / 0 | 113.98 / 118.89 | 0.02 / 0.01 | 2 / 3 | 193.71 / 222.76 | yes |
| mem | 0 / 0 | 18.71 / 44.51 | 0.94 / 0 | 4 / 4 | 229.91 / 294.91 | yes |
| lamed | 2 / 0 | 209 / 150.97 | 0.47 / 0.01 | 5 / 4 | 161.89 / 214.17 | yes |
| resh | 0 / 0 | 77.69 / 3.6 | 0.17 / 0.01 | 0 / 0 | 176.49 / 284.68 | yes |
| vav | 0 / 0 | 8.27 / 10.47 | 0.01 / 0.01 | 0 / 0 | 32.16 / 50.58 | yes |
| tav | 0 / 0 | 7.43 / 29.92 | 0.06 / 0.01 | 0 / 0 | 8.39 / 60.78 | yes |
| yod | 0 / 0 | 2.44 / 4.57 | 0.01 / 0.01 | 0 / 0 | 15.6 / 49.79 | yes |
| dalet | 2 / 0 | 185.31 / 121.98 | 0.32 / 0.01 | 2 / 4 | 158.33 / 205.12 | yes |
| he | 0 / 0 | 94.69 / 69.01 | 0.91 / 0 | 2 / 2 | 216.73 / 411.49 | yes |
| kaf | 0 / 0 | 36.65 / 60.16 | 0.23 / 0.01 | 0 / 0 | 161.33 / 152.89 | yes |
| nun | 0 / 0 | 38.47 / 13.94 | 0.34 / 0 | 0 / 1 | 107.46 / 153.38 | yes |
| samech | 0 / 0 | 363.02 / 226.72 | 0.05 / 0.01 | 12 / 6 | 211.2 / 129.33 | yes |
| ayin | 0 / 0 | 51.55 / 21.62 | 0.34 / 0.01 | 2 / 2 | 216.48 / 226.81 | yes |
| pe | 0 / 0 | 63.62 / 104.55 | 0.64 / 0.03 | 4 / 4 | 79.04 / 166.49 | yes |
| tsadi | 0 / 0 | 84.8 / 133.2 | 0.4 / 0.02 | 2 / 3 | 100.63 / 203.95 | yes |
| qof | 2 / 0 | 168.55 / 182.89 | 0.02 / 0.01 | 5 / 5 | 246.99 / 326.06 | yes |
| gimel | 2 / 0 | 182.05 / 160.54 | 0.09 / 0.03 | 5 / 6 | 115.93 / 147.79 | yes |
| zayin | 0 / 0 | 24.15 / 30.09 | 0.11 / 0.02 | 0 / 0 | 110.2 / 123.11 | yes |
| chet | 0 / 0 | 122.24 / 111.38 | 0.31 / 0.02 | 0 / 0 | 121.76 / 165.62 | yes |
| tet | 4 / 0 | 189.1 / 201.08 | 0.16 / 0.01 | 6 / 6 | 106.44 / 142.43 | yes |
| final-kaf | 0 / 0 | 17.4 / 100.22 | 0.99 / 0.02 | 0 / 0 | 168.3 / 308.58 | no |
| final-mem | 0 / 0 | 161.69 / 146.87 | 0.02 / 0 | 2 / 8 | 142.02 / 631.21 | yes |
| final-nun | 0 / 0 | 26.5 / 29.38 | 0.01 / 0.02 | 0 / 0 | 66.86 / 61.81 | yes |
| final-pe | 2 / 0 | 226.61 / 160.58 | 0.16 / 0.01 | 4 / 5 | 146.95 / 169.17 | yes |
| final-tsadi | 0 / 0 | 175.8 / 188.16 | 0.1 / 0.03 | 7 / 5 | 94.55 / 64.24 | yes |

## Eyeballed notes

How the looking was done: every letter's contact sheet in `docs/anim/morph-sheets/` was opened as an image (13 frames per row, each frame 84 pixels wide), plus the two key-pose overviews. Samech was also rendered larger to check the crossings. The k2..k7 transitions were looked at only as key poses (`keyposes-1.png`, `keyposes-2.png`), not frame by frame, and nothing was played in a browser.

- **shin** (needs redraw): The v2 outline itself crosses itself twice (the slid-down middle prong, see v2 README); the prong then collapses into a lump in frames 4-7 and the shift does not change that. Fix the v2 outline first.
- **bet** (twists): Old k1 already crushes the letter into a flat blob (A has 4 crossings). B crumples with a visible kink at frames 5-8; C is smoother but still lumpy.
- **alef** (twists): Metrics pass, my eye does not: frames 6-7 of B and C are a lumpy dent where A stays smooth. Mild. The lowest-distance start (shift 46) was worse, so v2b keeps the v2 start.
- **mem** (twists): B notches and crumples at frames 5-7 (3 crossings); C is clean. The start shift fixes it.
- **lamed** (twists): B folds into a small knot at frames 5-7 (4 crossings); C improves it (2, same as A) but the foot of the letter is still knotted.
- **resh** (ok): Smooth. A tiny nick on the right edge at frames 6-8. Fine.
- **vav** (ok): Smooth, small letter. Fine.
- **tav** (ok): Smooth to my eye. The metric verdict "twists" comes from the area-jump tolerance (67 against a limit of 61); not a visible twist.
- **yod** (ok): Smooth; a few stray pixels at frame 6 from the head of the letter. Fine.
- **dalet** (needs redraw): The top bar tears away from the stem in B (frames 4-7, 5 crossings) and kinks in C (2). Both are visibly wrong.
- **he** (ok): B has a nick on the right leg at frames 6-8; C is clean. Fine.
- **kaf** (ok): A boxy C bends into the old thin crescent: a big reshape (rms 31) with a small notch at the lower left in frames 6-8, but no tear.
- **nun** (needs redraw): B pinches into a blob (frames 5-7); C is better but has notches at frames 7-9 and 2 crossings. Borderline between twists and needs redraw; metrics put it at needs redraw.
- **samech** (twists): The 12 crossings are the counter poking through the outer outline in frames 8-11; at 6 units of stroke they are mostly hidden, visible as a small spike at the top left in frames 5-7. Metrics say needs redraw; to my eye it is a mild twist. The start shift does not apply (kept 0).
- **ayin** (ok): Smooth. Fine.
- **pe** (needs redraw): B turns into a black knot at frames 5-8 (5 crossings); C is lumpy (4). Needs a new k2.
- **tsadi** (needs redraw): Both B and C break into a ragged lump at frames 5-7 (2 crossings); the shift was not accepted (kept 0).
- **qof** (ok): A already has 2 crossings in this transition; B and C look the same as A.
- **gimel** (twists): Metrics pass (A already has 2 crossings). My eye: B crumples into a jagged knot at frames 5-7; C is milder. Called twists.
- **zayin** (twists): B kinks the bar at frames 4-7; C is clean in the crossing count (0) but the stem is still bumpy at frames 7-9.
- **chet** (twists): Metrics say needs redraw (C wobble 5.1 against a limit of 3.3); to my eye there is only a small nick on the left leg at frames 5-8. Called twists, mild.
- **tet** (ok): A already has 4 crossings in this transition (the old k2 collapses the letter into a ring); B and C are no worse.
- **final-kaf** (twists): B thickens the vertical stem into a heavy black bar at frames 5-8; C is smoother. The start shift fixes most of it.
- **final-mem** (needs redraw): Worst letter: the counter and outer outline cross in frames 5-8 (8 crossings, area jump 705) and the shape squashes into a distorted blob. The shift changes nothing.
- **final-nun** (ok): Smooth thin stem. Fine.
- **final-pe** (twists): B has a black blob at frames 5-8 (4 crossings); C halves the crossings (2) but is still ragged at frames 6-7.
- **final-tsadi** (needs redraw): Both B and C turn into a ragged lump at frames 5-8 (3 crossings, wobble 6.2); shift not accepted (kept 0). The old k1 was a Y and v2 is a different glyph, so k2 is far from it (rms 29).

## Contact sheets

`docs/anim/morph-sheets/<letter>.png`: rows A, B, C, D, columns the 13 frames of k1 to k2 (frame 0 is k1, frame 12 is k2, eased as the player does it). `keyposes-1.png` and `keyposes-2.png`: old k1, v2 k1, then k2..k7 for each letter. Total size about 2.5 MB. Colours are the pose colours; the later picture parts fade in at low opacity and show as faint grey.

## Limits

- Geometry only. It cannot tell whether a frame looks good or whether the letter reads as the letter.
- 12 steps per transition can miss a crossing that lasts less than one step. The crossing test ignores stroke width and curves other than M, L, C, Z flattened in 8 steps (the letter outlines use only M, L, Z).
- The tolerances in the verdict rule are judgement calls. The five hand overrides are one person's view.
- Whether frames 8-11 of an ease-in-out 400 ms transition (the last ~100 ms) would be noticed at speed was not tested.
- Proposed fixes are in `docs/drafts/animation-poses-v2/FIXES.md`. Nothing is applied except the separate `docs/drafts/animation-poses-v2b/` folder.
