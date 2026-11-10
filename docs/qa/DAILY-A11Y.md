# Daily goal page and lesson-finished card: browser accessibility and behaviour audit

Date: 2026-11-05. Scope: route `#/daily` (goal ring, points, practice rhythm, quests, week, Badges shelf and tier, new-badge card, progress section with the calendar heatmap) and the lesson-finished card (`preview/loops/hook.js`). Intent docs: `docs/feel/LOOPS-PARITY.md`, `docs/feel/BADGES.md`.

## What was and was not tested

Tested by running code, in headless Chromium driven by Playwright, with axe-core 4.14.0 from `tools/a11y`:

- Viewports 320x640, 360x640, 390x844, 768x1024, and 320x256 (the 400 percent zoom equivalent of a 1280 px window).
- Light and dark colour schemes; calm mode with reduced motion and the largest text size; dark with the largest text size.
- Seeded browser storage: empty, mid-way (a lesson today, a few earlier days), long history (260 days), all badges earned, new badges not yet announced, corrupt `loops.v1` text, an old-shaped record with bad dates and wrong types, a record from before badges, other stores corrupt (`srs.cards`, `streak`, `progress.state`), writes blocked (`setItem` throws), and `localStorage` itself throwing on access.
- Per page: console errors and page errors, axe violations, sideways overflow, tap targets in `main` (48 px), a keyboard-only Tab walk (focus order, a visible focus ring, no trap, whether the focused control is covered by the bottom bar), the accessibility tree as Chromium reports it (`ariaSnapshot`), contrast computed from the rendered colours for the heatmap digits and the badge art, forced-colours screenshots, an RTL page direction pass.
- The lesson-finished card: the real `hook.js`, the real store and settings modules, called in the real page, with a stand-in summary heading (the real intermediate lesson was not driven end to end; see limits).

Not tested, and nothing here claims it: a real screen reader (NVDA, JAWS, VoiceOver, TalkBack), a real phone or a finger, a person using Switch Control or voice control, learners of any kind, a Hebrew reader's view of the two letter pictures, real Windows high contrast themes. "Announcements" below means the markup is correct (role, live attribute, where the region sits); whether a given screen reader speaks it was not heard.

Method labels: **measured** = a number or a pass/fail from code run in the browser; **eyeballed** = I looked at a screenshot.

## Defects

| # | Defect | How found | Status |
|---|---|---|---|
| 1 | Every card on `#/daily` was 574 px wide on a 328 px column at 320, 360 and 390 px (the heatmap grid's own width pushed the grid column out) and `main` clips sideways overflow, so the right-hand part of every card (goal buttons, text, the share box) was cut off and could not be scrolled to. Also true with the largest text at 768 px. | Measured: card right edge 590 px on a 360 px screen, all 96 phone-width loads in the first sweep. Screenshot confirmed cut-off text (eyeballed). | Fixed: `.lp` now has `grid-template-columns: minmax(0, 1fr)`, and the heatmap scrolls inside its own box. Measured after: card right edge 344 px at 360 px; test added. |
| 2 | The heatmap's scroll box is aria-hidden but, once it overflows, Chromium makes it a keyboard Tab stop. A keyboard user landed on a hidden region whose only content is digits, and a screen reader could announce them as one long number. | Measured: Tab walk listed a `DIV` named "0000000000..." | Fixed: `tabindex="-1"` on the box (the table below it is the keyboard-reachable alternative). Test added (fails without the fix, checked). |
| 3 | Heatmap text said "Last 26 weeks" but the table alternative held only 12 weeks, so 14 weeks of the picture had no text equivalent. | Measured: 12 table rows, 26 drawn columns. | Fixed: the table lists every drawn week. Test asserts rows equal drawn weeks. |
| 4 | Heatmap digit contrast: level 2 digits were 3.93:1 in dark (4.82:1 in light, passing); the digits are the non-colour cue for the level, so they need 4.5:1. | Measured with rendered colours on a canvas. | Fixed: level 2 now uses the accent-on-card mix with `--accent-fg` digits: 4.60:1 light, 5.12:1 dark; level 1 9.43 light and 7.62 dark; level 3 11.04 light, 8.73 dark. Test added. The digit is still 9.6 px at normal text size (it scales with the text-size setting); small, not a failure of any rule I tested, left. |
| 5 | A new-badge card on `#/daily` put an `h3` directly under the page `h1` (axe `heading-order`, moderate), in every configuration that showed one. | Measured: axe on 16 of 16 configurations with a card. | Fixed: on `#/daily` the card's heading is an `h2` (the lesson-finished card stays `h3` under the lesson summary's `h2`). Test added. |
| 6 | The goal ring was read twice (an image named "N of M points today" and the sentence beside it). | Accessibility tree. | Fixed: the ring is aria-hidden; the sentence is the text twin. |
| 7 | Each badge picture was exposed as an image with a long name plus description ("... A circle frame with 1 dot for level 1, First. You ...") directly beside text that says the same, so 15 to 18 items were read twice. | Accessibility tree. | Fixed: in the shelf and the new-badge card the pictures are decorative (`decorative` option on the badge art; default unchanged, so the art tests are untouched). The text beside each carries name, level word, threshold and date. The picture keeps its title and description for a mouse hover. |
| 9 | The calendar table (opened from the summary) was wider than its card at 320 px, and at 360 and 390 px with the largest text, and `main` clips sideways overflow, so its right-hand columns were cut off. Found by the re-run of the sweep after fixes 1 to 8. | Measured: table right edge 335 px against a card edge of 304 px at 320 px. | Fixed: the table sits in the app's `table-wrap` box (a named region, focusable, scrolls sideways). Test added. |
| 8 | The heatmap started scrolled to the oldest week, so on a phone today was off screen. | Eyeballed (screenshot). | Fixed: it starts scrolled to the newest week. Not separately tested. |

## Checked and left as found (no defect measured)

- Console and page errors: none in any state, including corrupt and old records, blocked writes and a throwing `localStorage` (the store falls back to memory and the page opens; the goal buttons work for the session). Measured.
- Axe: after the fixes, no violation in the quick matrix, see "Sweep" below. Measured.
- Tap targets: every button, summary and the textarea in `main` is at least 48 px at all four widths and the largest text. Measured.
- Keyboard: 21 to 22 stops on a filled page, in reading order (goal buttons, repair if shown, quests toggle, share summary, the share box, copy, calendar table summary), no trap (focus leaves the page content after the last stop), a visible focus ring on every stop (computed outline 2 px or more), and a focused control is not covered by the fixed bottom bar at 320x256 or 360x640 with the largest text (measured with smooth scrolling off; with smooth scrolling on, a long jump had not finished after 0.7 s, which I took as a measurement artefact, not a defect). Goal changes, quests toggle and repair return focus to a control by id after re-render. Measured.
- Reflow: no sideways page scroll at 320x640 or 320x256 with the largest text. Measured.
- Badge art contrast (frame against card, picture against frame fill): 5.87 to 11.04 light, 6.92 to 8.73 dark; the dashed "not earned" outline is 5.87 light, 6.92 dark. Measured, both themes. Forced colours: screenshots of light-in-forced and dark-in-forced show the shelf, the heatmap (digits and the thicker level-3 border stay) and the buttons legible. Eyeballed, two combinations only, not a real Windows theme.
- Motion: the lesson-finished card and the new-badge card have `data-motion="none"` and `animation-name: none` in calm mode and with the system reduced-motion setting; in the default they use one 600 ms opacity fade played once. No flashing styles exist (a unit test already scans the CSS). Measured in the browser. There is no other animation on `#/daily` (the ring is static).
- Calm mode hides the practice rhythm card on `#/daily` (as designed) and the rest still renders. Measured.
- RTL: with `dir="rtl"` on the root, no overflow and no covered focus at 390x844. Eyeballed layout only, not a Hebrew-reader review. The two letter pictures (aleph, final kaf) are now hidden from screen readers; the text beside them names the badge.
- Hebrew bits: the only Hebrew on the page is in those two pictures. Not reviewed by a Hebrew reader.

## Left (needs a human or a decision)

- Live-region announcement of the lesson-finished card and the new-badge card. Both are `role="status" aria-live="polite"`, appended with their text already inside. Many screen readers announce a polite region reliably only when its text changes after the region exists. I could not hear a screen reader, so I did not change it. Making this robust (an empty region present first, text filled a moment later) would change the node shape that `tests/loops.page.test.js` and `tests/badges.page.test.js` assert, so I left it for a person with a screen reader to confirm before touching it. The top-of-page status line on `#/daily` (goal changes, quests, repair, copy) already exists from first render.
- The lesson-finished card repeats the lesson summary's own heading words ("Lesson finished" twice). Cosmetic.
- Level-1 heatmap cells are only 1.6:1 against the card (dotted border; the digit "1" at 9.43:1 light and 7.62:1 dark carries the information). Colour is not the only cue, so left.
- A time-of-day or date-edge check (midnight rollover while the page is open) was not done.
- Points from timed reads are not capped per day, unlike review cards and speaking tries, so a corrupted record with a huge `t` count (bounded to 100000 by `clean`) yields a large point total. Not an accessibility matter; noted for the owner.
- The real intermediate lesson was not driven end to end in the browser (16 mixed exercises); the hook was called in the live page with the real store, settings and hook modules instead.

## Tests added

`tests/daily.a11y.browser.test.js` (8 tests, browser tier, Playwright; axe part uses `tools/a11y` axe-core when present and fails in CI if it is missing). It runs in about 30 seconds. Run five times in a row locally: 5 of 5 passed, 8 of 8 tests each time. It was also confirmed to fail without the fixes for defect 1 (clip) and defect 2 (hidden Tab stop). It was not run in the CI browser job itself.

## Sweep after the fixes

The first sweep (before fixes) was 96 loads (4 modes by 4 widths by 6 states) with axe, tap-target, overflow and console checks: 0 console errors, 0 tap-target failures, and the findings above (the clipped cards on every phone-width load, `heading-order` on every load with a new-badge card). The same 96-load matrix was re-run after fixes 1 to 8: 0 axe violations, 0 tap-target failures, 0 console errors, 0 page-level sideways scroll, and the one remaining overflow (the opened table, defect 9), which is fixed by the last change and covered by its own test rather than re-swept.
