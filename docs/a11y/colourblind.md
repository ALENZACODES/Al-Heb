# Colour-blind and low-contrast vision

Lane: colour-vision deficiency (protan, deutan, tritan, achromatopsia) and high contrast. Run on 2026-11-04.

**Not tested with real colour-blind or low-vision people.** The screenshots use SVG feColorMatrix filters (Machado 2009 matrices, severity 1.0, plus luminance weights for achromatopsia) applied over a Chromium render at 375x667. These are approximations of colour vision, not people. Real users differ in severity and in how they use colour. No screen reader, no real Windows high-contrast mode, no phone: forced colours was checked only with Chromium's emulation.

## Tools
- `node tools/a11y/contrast.mjs [--json] [--strict]`: reads the colour variables in `assets/css/app.css` for light, dark and both high-contrast themes, plus a fixed list of hard-coded state colours and the memory-picture colours. Text needs 4.5:1, components 3:1. The list of hard-coded colours is typed in by hand, so a colour added later is not covered until it is listed.
- `tests/a11y.colour.test.js` fails if any listed pair drops below target (the sun-yellow fill is the one known exception).

## Contrast numbers (112 pairs, final run)
- Light theme: body 13.5+ on page, muted 5.33 (page) / 5.87 (card), accent 10.03, focus ring above 3. Dark: muted 7.8 / 6.92, accent 8.49. All pass 4.5:1 and 3:1.
- Fixed because they failed: trace guide `#e8e8ee` on white 1.22 -> `#8f8fa0` 3.18; trace hint stroke and number `#e67e22` 2.85 -> `#b45309` 5.02; trace start dot with white number 3.4 -> `#1a7f37` 5.08; focus rings in Letters, Atlas and the memory card `#e67e22` on white 2.85 -> theme focus colour; word-trace "wrong" border on dark cards 2.93 and Israel "wrong" border on dark 2.78 -> `--bad-line` (dark: `#ff8a80`, about 7:1).
- Not fixed: `--morph-3` yellow fill of the memory pictures is 1.31:1 on the card. It is a fill (suns, lamps); the outline in the ink colour carries the shape. Left as is.
- Not fixed, found by the numbers: `--border` is 1.38:1 (light) and 1.54:1 (dark) against the page. Text fields and card edges that rely only on that border are below 3:1. Changing it alters the whole look, so I did not; the high-contrast themes make it solid black or white.

## Where colour carries meaning, and the second cue
| Place | Colour | Second cue |
|---|---|---|
| Exercise answers (lesson, review) | none on options | tick / cross before the option, "Right." / "Not quite. The answer is ...", dashed card border when wrong (already present) |
| Spot It result | green / red / amber | tick, cross + strike-through, border style, text (already present) |
| Rating buttons (Again / Hard / ...) | red / amber / blue | number and word on every button (already present; not re-checked beyond the code) |
| Atlas quiz tiles | green / red tint | NEW: "Right" with tick, "Not this" with cross, thicker / dashed border; the line of text below already said "Good!" / "That is X." |
| Sound like a local, Say it | green / red border | NEW tick / cross before each option and dashed border when wrong; the "Natural / Stiff / Wrong register" words were already there |
| Sound like a local, labels | green / red text | NEW tick / cross before "Sounds local" / "Gives you away" |
| Word trace, vowel-sign quiz cells | green / red border | NEW tick / cross in the cell; dashed border for wrong already existed |
| Word trace finished letter | green border | still colour (and the "done" state is announced by the screen reader label); not added |
| Tracing strokes | green start dot, blue stroke, red wrong stroke, orange hint | start dot and hint carry stroke numbers; the wrong stroke is a short flash and the text line says whether it was right (already present) |
| Tracing keyboard hint | green flash | "Good!" text (already present) |
| Finished letters in the Letters grid | none | tick badge and spoken "completed" (already present) |
| Progress milestones / path | none | words: Reached, Not yet, Done, Next, Later (already present) |
| Atlas variants and final forms | dashed border, faint tint | dashed border and the word "Final" in the name |
| Memory pictures | orange, blue, yellow, green | see below |
| Streak, heatmap, SRS stages | I found no colour-coded calendar, heatmap or stage chip in the views I searched (grep of colours in src/ and the CSS); stages and due counts are words and numbers |

I did not read every view file line by line. I searched for hex / rgb colours in `src/` and `assets/css` and read the ones tied to state.

## Screens looked at (filter approximations)
Rendered at 375x667 under none, protan, deutan, tritan and greyscale: Home, a letter page with its memory card (Dalet), a lesson page, Review (empty: no cards were due in my fresh profile, so I did not see the rating buttons in this run), Settings (looked at in the high-contrast theme only), an exercise answered wrong and right, the Atlas quiz after a wrong tap, the Say it drill after a pick. Screenshots are in `/tmp/cb/` (outside the repo, will not survive).
- What disappeared: the accent blue turns teal under tritan and dark grey under greyscale; the yellow notice bars and the orange left bar of the draft notice lose hue but stay visible because of the bar and the heading words. Selected tab / selected letter (filled dark) vs unselected (outline) stays obvious in every filter. The green start dot of the trace stage turns olive or grey, but it carries a number.
- What I did not see: the Review rating buttons, the Spot It result, the word-trace quiz, the tracing wrong-stroke flash, the Progress page. They were checked by reading CSS and code only.
- Atlas right / wrong: the tint pair (green vs red) becomes near-identical under deutan and greyscale; the new tick or cross with words, and the dashed border, are what separates them.

## Memory pictures (28 files in `assets/letters/morph/`)
Contact sheet rendered in greyscale (light and dark card background), protan and deutan. All 28 stay recognisable by their dark outlines; the letter itself (blue, `--morph-2`) turns dark grey and stays readable against the picture. Under protan and deutan, orange (`--morph-1`) and green (`--morph-4`) both turn olive, so where a picture uses both side by side the two parts are the same colour; the outlines still separate them. I judged this by looking at the sheet myself, not with a learner. Not changed.

## High-contrast theme
- Settings > Theme now lists "High contrast, light" (`contrast`) and "High contrast, dark" (`contrast-dark`). No new key; see `SETTINGS-ADDED.md`.
- Light: black on white, muted 10.86:1, accent 13.91:1. Dark: white on black, muted 15.91:1, accent 11.88:1. Focus ring 4px (8.55:1 on white, 14.67:1 on black), card and tile edges 2px solid, links underlined in the main area, radios and checkboxes redrawn with a solid edge (the native dark radios were hard to see on black in my screenshot).
- "Match device" switches to the same palettes when the device reports `prefers-contrast: more` (light or dark following the device), checked by emulation in Chromium.
- Windows forced colours: existing rules for tabs and pressed buttons stay; the new right / wrong marks are text, so they survive. In Chromium's forced-colours emulation the Letters and Atlas pages kept their icons, memory picture, focus-able controls and tick badge. The tracing guide grey stayed grey there; I did not check a real Windows device.

## Not done / open
- The review rating buttons and Spot It were not rendered by me this round.
- The 1.38:1 default border (above).
- `tests/integration.test.js` "settings defaults" and three precache / views tests fail on the current tree because of other lanes' work (new settings keys, new views); not from this lane.
