# Animation poses v2b: v2 k1 outlines with a moved start point (DRAFT)

Status: DRAFT, not reviewed by a designer or a native reader, not wired into the app. `docs/drafts/animation-poses-v2/` and `docs/drafts/animation-poses/` are untouched.

## What this is

27 files `<item>-k1.svg`, each a copy of the same file in `docs/drafts/animation-poses-v2/` in which the only change is the start point of each sub-path of path `p1`: the points are the same, in the same order, with the same winding, but the path begins at a different point. Path count, ids, commands (M, L, Z only), fills, strokes, title and description are identical. `node tools/anim/morph_check.mjs --v2b docs/drafts/animation-poses-v2b` verifies this on every run (`verifyV2b`) and fails if any file is not a pure cyclic shift.

## How the start was chosen

For each letter the checker tries start shifts in order of total squared distance to the matching points of the old k2 `p1` (lowest first, up to 80 candidates) and keeps the first one that is no worse than the v2 start on in-between crossings, area jump, k1 self-crossings and distance. If none is, the v2 start is kept (shift 0). The choice therefore looks at the same metrics it is later reported on; treat the improvement as tuned to the metric, not as proof it looks right. Regenerate with `node tools/anim/morph_check.mjs --make-v2b docs/drafts/animation-poses-v2b`.

## Result

| letter | start shift (per sub-path) | lowest-distance shift | rms B / C | crossings B / C | area jump B / C | wobble B / C | C passes the test |
|---|---|---|---|---|---|---|---|
| shin | 1 | 1 | 19.14 / 18.2 | 2 / 2 | 190.57 / 176.03 | 0.81 / 3.02 | no |
| bet | 40 | 40 | 43.43 / 36.82 | 4 / 4 | 252.68 / 237.5 | 6.43 / 2.29 | yes |
| alef | 0 | 46 | 26.38 / 26.38 | 0 / 0 | 154.82 / 154.82 | 2.35 / 2.35 | yes |
| mem | 3 | 3 | 30.31 / 24.57 | 3 / 0 | 144.3 / 40.52 | 9.03 / 1.33 | yes |
| lamed | 6 | 6 | 33.06 / 26.88 | 4 / 2 | 265.1 / 226.13 | 10.18 / 3.21 | yes |
| resh | 3 | 3 | 25.92 / 23.87 | 0 / 0 | 133.76 / 99.72 | 0.72 / 1.2 | yes |
| vav | 46 | 46 | 14.16 / 11.23 | 0 / 0 | 30.13 / 29.39 | 1.79 / 0.37 | yes |
| tav | 1 | 1 | 19.61 / 18.37 | 0 / 0 | 67.04 / 31.27 | 1.15 / 2.15 | yes |
| yod | 1 | 1 | 16.3 / 16.23 | 0 / 0 | 44.54 / 44.43 | 1.9 / 1.72 | yes |
| dalet | 38 | 38 | 40.24 / 35.26 | 5 / 2 | 190.08 / 182.43 | 6.17 / 3.39 | no |
| he | 2, 45 | 2, 45 | 22.54 / 21.73 | 0 / 0 | 150.96 / 119.27 | 2.3 / 2.28 | yes |
| kaf | 2 | 3 | 32.65 / 30.98 | 0 / 0 | 92.84 / 62.95 | 1.85 / 1.89 | yes |
| nun | 28 | 32 | 47.86 / 27.05 | 2 / 2 | 216.42 / 72.3 | 11.62 / 6.61 | no |
| samech | 0, 0 | 46, 0 | 14.69 / 14.69 | 12 / 12 | 445.87 / 445.87 | 7.7 / 7.7 | no |
| ayin | 0 | 0 | 12.28 / 12.28 | 0 / 0 | 38.29 / 38.29 | 0.05 / 0.05 | yes |
| pe | 6 | 6 | 40.07 / 30.79 | 5 / 4 | 321.86 / 149.31 | 7.31 / 3.45 | no |
| tsadi | 0 | 44 | 31.95 / 31.95 | 2 / 2 | 150.89 / 150.89 | 3.02 / 3.02 | no |
| qof | 0, 1 | 0, 1 | 22.25 / 22.2 | 2 / 2 | 210.36 / 206.49 | 1 / 0.96 | yes |
| gimel | 6 | 6 | 33.14 / 27.88 | 2 / 2 | 202.29 / 187.93 | 2.62 / 1.05 | yes |
| zayin | 35 | 35 | 40.53 / 34.1 | 1 / 0 | 122.15 / 62.75 | 12.18 / 0.77 | yes |
| chet | 46 | 46 | 30.22 / 28.8 | 0 / 0 | 174.72 / 173.62 | 3.72 / 5.09 | no |
| tet | 1 | 1 | 17.78 / 17.56 | 4 / 4 | 244.93 / 225.52 | 0.61 / 0.26 | yes |
| final-kaf | 2 | 2 | 45.85 / 45.09 | 0 / 0 | 80.33 / 7.53 | 0.98 / 1.75 | yes |
| final-mem | 44, 4 | 44, 4 | 34.83 / 32.94 | 8 / 8 | 705.54 / 705.26 | 5.64 / 3.45 | no |
| final-nun | 46 | 46 | 18.05 / 16.9 | 0 / 0 | 33.87 / 31.74 | 1.75 / 0.03 | yes |
| final-pe | 43 | 43 | 37.59 / 31.53 | 4 / 2 | 355.52 / 216.9 | 5.84 / 2.07 | yes |
| final-tsadi | 0 | 45 | 28.75 / 28.75 | 3 / 3 | 208.46 / 208.46 | 6.19 / 6.19 | no |

Where "C passes" is no, the start shift is not enough; see `docs/anim/MORPH-CHECK.md` and `docs/drafts/animation-poses-v2/FIXES.md`. Letters with shift 0 kept the v2 start because every lower-distance start was worse. v2b files are valid on their own but only meaningful together with the original k2..k7.
