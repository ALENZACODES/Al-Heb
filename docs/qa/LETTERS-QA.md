# Letters QA at 375 x 667

Run: `QA_CHROME=/usr/bin/google-chrome node tools/qa/letters.mjs` (headless Chromium, synthetic mouse/pointer events, hash routes, local static server). Raw results: `/tmp/lqa/letters-results.json`; screenshots in `/tmp/lqa/` (grid, alef-print-traced, bet-cursive-traced, bet-full, kaf-final, pe-final, drill, typing, atlas, atlas-final-mem, tav-ashkenazi, review-sheet, offline-mem-final).

What this is not: no real phone, finger, stylus, screen reader or iOS Safari. Only Chromium was used. The first full run was made before the two fixes below; focus and notice position were re-checked afterwards with small scripts, not by repeating the whole run.

## Results

| Area | Result | Observed |
|---|---|---|
| Letter grid `/letters` | PASS | 27 buttons (22 letters + 5 finals), each with an accessible name; smallest 48 px; no horizontal overflow (scrollWidth 375). |
| Each letter page, 27 of 27 | PASS | Name, Hebrew glyph, IPA, sound line, stage svg present. No page or console errors. |
| Print and cursive, 54 of 54 | PASS | Each form was traced stroke by stroke from its own stored centerlines with mouse events; all 54 reached "Done"/"Perfect". Note: this proves the tracer accepts the stored strokes, not that the strokes are right (see draft status below). |
| Tradition sound | PASS (one letter) | Tav: Israeli "t"; Ashkenazi "s without dagesh (Shabbos), t with dagesh". Only tav was checked; other letters were not compared across traditions. |
| Draft notices | PASS | General draft notice on every letter page (2 notice paragraphs); per-record draft line on 52 of 54 forms; red high-doubt caution on the cursive form of final pe and final tsadi. Review sheet title, heading and intro say DRAFT. |
| Final forms | PASS | All 5 reachable in grid and atlas; final mem atlas detail shows shape, story, look-alike. |
| Look-alike drill | PASS | 8 sets; wrong tap showed the look-alike hint, right tap "Good!". No small targets, no overflow. |
| Typing tab | PARTIAL | 47 on-screen keys are 34 x 55 px (below 44 px wide). 13 keys per row cannot be 44 px wide in 375 px; keys are tabindex -1 and the physical keyboard is the intended input. Left as is. A key press was accepted and judged. |
| Atlas `/letters/atlas` | PASS | 31 tiles (27 + vet, khaf, fe, sin); no small targets; no overflow. |
| Touch targets (letters, grid, drill, atlas, trace controls) | PASS | No button/link below 44 x 44 on those screens (typing keys excepted). Stage svg has touch-action none, so drawing does not scroll the page. |
| Keyboard | PASS after fix | See bug 1. Focus ring 3 px solid. Step-by-step mode with Enter on "Next stroke" completed a letter and recorded it as walked through, not drawn. |
| Offline after first load | PASS (with caveat) | Service worker controlled the page; `/letters`, `/letters/atlas`, `/letters/mem-final`, `/letters/zayin` reloaded offline with no failed requests. In the batch run zayin measured only 26 characters of main text; a separate re-check offline showed the full page (1105 chars) so I took it as a measurement race, not an app fault. Audio was not tested offline. |
| REVIEW-SHEET.html at 375 px | FAIL (not fixed, not mine) | Table is 779 px wide and there is no viewport meta tag, so it scrolls sideways on a phone. 55 table rows, 0 images. |

## Bugs found

1. Keyboard focus lost on every action (fixed). Activating a grid letter, a tab, Print/Cursive, Strict or Outline re-rendered the view and left focus on `<body>`, so a keyboard user had to tab from the top each time. Fix in `src/letters/trace.view.js`: `render()` now remembers the focused control and refocuses its twin. Re-checked: grid, tabs and script toggle keep focus.
2. Caution placed below the drawing area (fixed). The review notice, including the red caution for final pe and final tsadi cursive, rendered after the open "Remember it" block, roughly 1,000 px below the stage on a phone. Moved to directly under the toggles, above the stage. Confirmed by DOM order for pe-final cursive.

## Open observations (not fixed)

- At 375 x 667 the tracing area starts about 525 px down the page (app banners, tabs, grid, toggles, open mnemonic), so it is below the first screen. The mnemonic block is open by default; collapsing it or moving it below the stage would help. Product choice, left alone.
- Review sheet: add `<meta name="viewport">` and horizontal scroll or wrapping for the table (file `docs/letters/REVIEW-SHEET.html`, generated; check its generator before editing).
- Typing keys narrower than 44 px (above).
- Final-form sound lines and mnemonics were read only for final mem and final pe; Hebrew content correctness was not assessed.

## Diffs

- `src/letters/trace.view.js`: focus restore (new `focusSig`, `restoreFocus`, `render` wrapper around `renderInner`); review notice moved above the stage.
- `tools/qa/letters.mjs`: new QA script.
- `docs/qa/LETTERS-QA.md`: this file.
- Existing `tests/letters.*.test.js` run file by file after the change: all pass (8 files). The full `tools/test/run.mjs unit` run did not finish within 110 s, so it was not completed.
