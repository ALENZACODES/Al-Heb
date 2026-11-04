# Fonts (all SIL OFL 1.1; licence texts in docs/licenses/OFL-*.txt and alongside here)
Sources: github.com/google/fonts (downloaded 2026-11-03). No Reserved Font Name is declared in any copied licence header.

## In use by the web app (assets/css/fonts.css) - woff2 in assets/fonts/web/, converted from the unmodified TTFs with fontTools+brotli (no glyph subsetting)
| File | Role | TTF size | woff2 size |
|---|---|---|---|
| web/heebo.woff2 | UI text (Latin + Hebrew), variable wght | 122,012 | 63,828 |
| web/frank-ruhl-libre.woff2 | pointed print Hebrew (prayers, lessons), variable wght | 178,468 | 76,168 |
| web/gveret-levin.woff2 | cursive display (Israeli handwriting style) | 59,788 | 26,852 |
Total precached by the service worker: about 167 KB.

## Kept in the repo but NOT shipped in the web build (book / experiments only)
alef-Alef-*.ttf, notosanshebrew-*.ttf, notoserifhebrew-*.ttf, and the original TTFs above. tools/build-static.mjs and the precache exclude `*.ttf`.

## Choice of print face for pointed text
Frank Ruhl Libre vs Noto Serif Hebrew were rendered in Chromium (shalom, bereshit, vayehi, yevarechecha with kaf-sofit + kamatz + shva, chanukah, simchah) and compared by eye at 44px/2x. Both placed niqqud, dagesh and shin/sin dots without collisions in those strings; Frank Ruhl Libre was chosen because it is smaller (76 KB vs 93 KB woff2) and has a conventional siddur-like look. This is a visual check of a handful of words, not a full mark-positioning audit. Gveret Levin is shown with niqqud too (it has the mark glyphs) but handwriting + niqqud should be reviewed by a Hebrew educator before being used for liturgy.
Research flagged Noto Sans Hebrew and Rubik for niqqud positioning problems; Heebo is used only for UI/Latin and unpointed Hebrew labels.
Not embedded in Adobe/InDesign deliverables until licences are confirmed there.
