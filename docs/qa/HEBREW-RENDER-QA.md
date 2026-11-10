# Hebrew rendering QA (v0 routes, 375x667)

Date: 2026-11-04. Method: headless Chromium (Google Chrome for Testing 153.0.8010.12, Linux, Playwright), viewport 375x667, device scale factor 2 and 3, service worker blocked, local static server (`tools/serve.mjs`). Screenshots were taken and looked at one by one in the image viewer; they were scratch files and are not kept in the repo. Not run: iOS Safari, Android Chrome, Windows, any real device. Everything below is what this one engine on this one Linux machine showed; the Linux system fonts that fill in are not the ones a phone would use.

Hebrew text used is only text already in the repo (priestly blessing and Shema from `data/corpus/reader/`, letter data from `data/letters/letters.json`, one word from `data/firstday/onramp.json`, and words copied from those corpus files for the line-box measurements). No Hebrew was written for this check.

## Routes and screens looked at
/letters/bet, /letters (grid), /letters/{kaf,mem,nun,pe,tsadi}-final, /read and /read/priestly-blessing, /torahreader (priestly blessing, Shema, legend tab, word detail panel, text sizes Normal / Large / Largest, cantillation marks on and off), and /torahreader again with every `.woff2` request aborted (webfont failure).

## Method for "clipped marks"
For each Hebrew element the script measured the ink extent of its text (canvas `measureText`, `actualBoundingBoxAscent/Descent`, with the element's computed font) against the line box (computed `line-height`, centred around the font ascent/descent). A negative number below means the marks sit that many CSS px inside the line box; a positive number means they hang outside it. This is an estimate for the font Chromium actually used, not a pixel diff. No ancestor of any measured element had `overflow` hidden/clip/auto, so nothing would cut marks off even where they hang outside a line box; the risk is touching a neighbouring line or the card edge. These screens were also checked by eye in the screenshots.

## Results
| Screen | Font size / line-height | Worst headroom above / below the ink | Seen in screenshot |
|---|---|---|---|
| /letters/bet header letter (`.big`) | 64 px / 1.1 | 17.2 / 15.2 px | letter drawn whole |
| /letters finals ך ם ן ף ץ (`.big`) | 64 px / 1.1 | 17.2 above; 4.2 below for ך ן ף ץ, 15.2 for ם | all five descend without touching the box edge (pe-final viewed) |
| /letters name line and example word (pointed) | 19.55 px / 1.55 | 5.2 to 9.2 above, 4.2 to 6.2 below | readable |
| /read priestly blessing, per-letter spans | 35.2 px / 1.7 | 11.9 above, 7.9 below (letters with vowel marks) | readable, no overlap with the transliteration line |
| /torahreader words (`.trd-w`), Normal | 32 px / 1.6 | 6.6 above, 5.6 below | no clipping; trope marks and vowels distinct |
| /torahreader Large / Largest | scaled, 1.6 | 9.1 / 11.5 above, 8.1 / 10.5 below | no clipping, no horizontal overflow (scrollWidth 375) |
| /torahreader word detail (`.trd-big`, `.trd-lg`) | 1.55 / 1.0 | 30.6 above, 11.6 below; 19.5 above, 8.5 below | readable |

Priestly blessing and Shema were each measured at all three sizes: the worst words were יִשָּׂא (blessing) and אֲשֶׁר (Shema), both with headroom. With cantillation off (Cantillation marks toggle) the same words render without the marks and without layout shift beyond the marks themselves.

Present in the on-screen text and seen drawn: final kaf, mem, nun (137, 60 and 13 occurrences in the two reader files); shin dot (24 and 48) and sin dot (29 and 6); dagesh (88 and 202); maqaf (34 and 33); sof pasuq (18 each); paseq (4 and 2, shows as a separate token); meteg (16 and 14). Not present in these texts, so not rendered: final pe and final tsadi in running text (0 occurrences; they were rendered only as the big letter on their letter pages), mappiq (no word-final he with dagesh found by a pattern search, 0 and 0), rafe, qamats qatan. Marks that look crowded but not overlapping: the segol/hataf/trope stack under the aleph-he cluster of אֱלֹהֵינוּ.

## Defect found and fixed
`.alef-firstday .fd-big.alef-huge` (assets/css/learn.css, first-day steps) had `line-height: 1.1` at 3.25rem (52 px). Measured with five pointed words, the marks below the letters hung outside the line box by 0.9 px (שָׁב, the word that screen shows), 1.9 px (שְׁמַע, וַיְדַבֵּר) and 3.9 px (וִֽיחֻנֶּֽךָּ), inside a card with 4 px padding. Changed to `1.25`; re-measured: -3, -2, -2 and 0 px. The line is 7.8 px taller on that screen. The first-day browser test was not run (see below).

The file was modified by other work in the tree before this check (git diff showed the first-day block as uncommitted); only that one declaration was changed after confirming the file's mtime had not moved.

## Fonts
Referenced by `assets/css/fonts.css`: Heebo, Frank Ruhl Libre, Gveret Levin, each `font-display: swap`, each a relative path to a woff2 in `assets/fonts/web/` (no remote URL). No other `@font-face` and no other bundled family is referenced from app CSS (Alef, Noto Sans Hebrew, Noto Serif Hebrew exist in `assets/fonts/` as TTF only and are not shipped).

Observed loading: on every route above `document.fonts` listed Heebo and Frank Ruhl Libre as loaded and Gveret Levin as unloaded (it downloads only when the cursive script setting is on). Font requests seen: `frank-ruhl-libre.woff2`, `heebo.woff2`.

| File | Bytes |
|---|---|
| assets/fonts/web/heebo.woff2 | 63,828 |
| assets/fonts/web/frank-ruhl-libre.woff2 | 76,168 |
| assets/fonts/web/gveret-levin.woff2 | 26,852 |
| Total | 166,848 (163 KB) |

All three are in `precache-manifest.js`. The first-install budget test (`tests/integration.test.js`) is 4 MiB; the fonts are about 4 % of that. `precache-manifest.js` is currently stale relative to the tree (another change added `src/shell/sources.js`); it was not regenerated here.

### Gap: no cantillation glyphs in any shipped font
A cmap check of the three TTFs (the woff2 files are unsubsetted conversions of them) found that none contains the cantillation accents U+0591 to U+05AF, and Heebo and Gveret Levin also lack meteg (U+05BD); Heebo lacks paseq and sof pasuq (U+05C0, U+05C3). Of the 52 distinct Hebrew-block code points in the blessing and Shema files, Frank Ruhl Libre lacks the 12 accents (etnahta, zaqef qatan, tipeha, revia, pashta, tevir, gershayim, munah, mahapakh, merkha, darga, qadma). Frank Ruhl Libre does have meteg, paseq and sof pasuq.

Consequence seen: on /torahreader with cantillation on, Chromium reported two fonts for the Hebrew, Frank Ruhl Libre (416 glyphs) and FreeSerif (178 glyphs, a system font here). The trope marks drawn by the fallback are placed without the primary font's anchors; in the screenshots most sit sensibly, but a few look detached from their letter (for example the mark at the upper left of the final nun of אֶל־אַהֲרֹן, and the marks under the kaf of תְבָרֲכוּ). They did not collide with neighbouring words or lines in anything viewed. Which font supplies them on iOS, Android and Windows was not tested, so how they look there is unknown. Not changed: shipping a font with trope coverage (for example the Noto Serif Hebrew TTF already in the repo, 183,600 B TTF) would add precache weight and needs a decision.

### Fallback when webfonts fail
Stacks in `assets/css/app.css`: UI `"Heebo", system-ui, -apple-system, "Segoe UI", "DejaVu Sans", sans-serif`; Hebrew `"Frank Ruhl Libre", "Ezra SIL", "SBL Hebrew", "FreeSerif", "DejaVu Serif", serif`; cursive `"Gveret Levin", "FreeSans", "DejaVu Sans", cursive`. Each ends in a generic family. Simulated on Linux by aborting every woff2: all Hebrew text still rendered with vowels, dagesh, shin dots, maqaf, sof pasuq and trope; no clipping or overlap in the /torahreader verse viewed (the Hebrew came from system fallback fonts, so spacing differed from the webfont version). The names Ezra SIL, SBL Hebrew, FreeSerif and DejaVu are Linux or desktop-add-on fonts; iOS, Android and Windows would fall to `serif` / `cursive`, whose Hebrew coverage on those systems was not checked. The Gveret Levin stack names no Hebrew-capable cursive font beyond the generic.

Offline normal case (service worker active) was not re-run in this check; the woff2 files are in the precache list.

## Tests
Added `tests/fonts.hebrew.test.js` (4 tests): only the three faces, `font-display: swap`, local woff2 present, all three in the precache and under 200 KB together, every stack ends in a generic family, and first-day line-height at least 1.25. Run: pass 4/4.

Lanes run together (a11y static, letters*, torahreader*, firstday*, perf, the new file, integration): 164 of 168 pass, 2 skipped. Failures, neither caused by this change:
- `tests/integration.test.js` "precache: skips vendor, PDFs and files over the size limit": precache-manifest.js is stale (`src/shell/sources.js` is not listed). Regenerate with `node tools/build-precache.mjs` (not run here by instruction).
- `tests/letters.strokes.review.test.js` "trace view renders the HIGH-doubt notice for pe-final / tsadi-final cursive" fails (0 !== 1), also when that file is run alone. `src/letters/trace.view.js`, `trace.js` and `atlas.view.js` have uncommitted changes from other work; this change touched no JS.

`node tools/meta/scan.mjs --text`: PASS.
