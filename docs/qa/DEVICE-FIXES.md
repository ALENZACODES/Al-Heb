# Device-profile fix list (P074)

Source: `docs/qa/DEVICES.md`, full run of `node tools/qa/devices.mjs` (5 profiles x light/dark x 10 routes = 100 visits, headless Chromium emulation, not a real device; WebKit not installed, so nothing here is a Safari result). Status of each item is in the table below. No `src/` or `assets/` file has been edited for this list.

What was clean on every profile and route: no sideways page scroll, no box poking past the viewport, no page or console errors, every view reached `data-ready`, the fixed bottom nav never covers the end of `main` (body padding 60px vs bar 57px), no RTL mixed-script wrap or niqqud-clip flag (heuristic; see DEVICES.md), nothing at all on iPad Mini except the calendar text sizes. Everything below is on the calendar page or in the shell nav, and almost all of it only bites at 320 px (iPhone SE, Galaxy S9+).

Root font is 16 px (`rem`), body text is 17 px (`1.0625rem`), so `.75rem` = 12 px exactly and `.68rem` = 10.9 px.

## P1. Calendar day buttons are 35 px wide at 320 px (tap target)

- Where: `/calendar`, iPhone SE and Galaxy S9+ (320 px), light and dark; 35 buttons per page, each 35 x 67 px (taller cells up to 155 px).
- Selector: `.alef-cal-table td > button.alef-cal-day`
- CSS: `src/curriculum/calendar.style.js` line 15 `.alef-cal-table { inline-size: 100%; table-layout: fixed }`, line 19 `.alef-cal-day { inline-size: 100%; min-block-size: 4.2rem; padding: .2rem .25rem }`, and line 7 `.alef-calendar * { min-inline-size: 0 }` which lets the cells go below any minimum.
- Why: 320 - 2 x 16 px main padding = 288 px for 7 columns = 41 px per cell minus borders = 35 px. At 393 px and up the cells are 50-55 px and pass.
- Fix (CSS only, no markup change): give the table a floor and let it scroll inside its card at the narrowest widths:
  ```css
  @media (max-width: 359.98px) {
    .alef-cal-table { min-inline-size: 322px; }           /* 7 x 46 px */
    .alef-cal-table-wrap, .alef-cal-month { overflow-x: auto; }  /* whichever element wraps the table; today the table is appended directly, so add a wrapper div.alef-cal-table-wrap in calendar.view.js line 174 or put overflow-x:auto on its parent */
  }
  ```
  Alternative with no scrolling: accept 35 px wide because the cells are 67+ px tall and the whole cell is the hit area (WCAG 2.5.8 minimum is 24 px; 44 px is the Apple HIG / WCAG AAA figure). If that is the decision, say so in DEVICES.md and lower the walker threshold for `.alef-cal-day` rather than leaving it flagged forever.

## P2. Calendar day labels: 10.9 px text and words broken in the middle ("Chay / ei Sara", "Hanu / kkah")

- Where: `/calendar`, every profile for the font size (7 labelled days per page); the mid-word break shows on all four phones (27 px text box inside the 35-50 px cell), not on iPad Mini.
- Selector: `button.alef-cal-day > span.l`
- CSS: `src/curriculum/calendar.style.js` line 22 `.alef-cal-day .l { font-size: .68rem; line-height: 1.15; overflow-wrap: anywhere; }` (and line 7 `.alef-calendar * { overflow-wrap: anywhere }`).
- Why: `.68rem` = 10.9 px, and `overflow-wrap: anywhere` lets Chromium cut "Chayei" after four letters instead of overflowing. The button already carries the full text in `aria-label` (`dayLabel(c)`, calendar.view.js line 179), so the visible label is a hint, not the only copy.
- Fix:
  ```css
  .alef-cal-day .l { font-size: .75rem; line-height: 1.2; overflow-wrap: normal; hyphens: auto; }
  @media (max-width: 419.98px) {
    .alef-cal-day .l { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }  /* one truncated line; the aria-label has the full name */
  }
  ```
  Dark mode shows the same numbers; nothing extra needed there.

## P3. "Draft, not reviewed by clergy" is 10.7 px

- Where: `/calendar`, every profile and scheme, 2 per page (morning and evening prompt cards).
- Selector: `section.alef-prayer > p.alef-cal-draft > small`
- CSS: `src/curriculum/calendar.style.js` line 38 `.alef-cal-draft { font-size: .8rem }` (12.8 px) multiplied by the browser default `small { font-size: smaller }`; the `small` wrapper is built in `src/curriculum/calendar.view.js` line 99.
- Fix (CSS only): `.alef-cal-draft small { font-size: 100%; }` right after line 38, giving 12.8 px. Or drop the `small` element in calendar.view.js line 99, since the paragraph already has the muted draft style. The same `small` pattern sits in lines 111, 114 and 168 (candle-lighting note, havdalah note, `.alef-cal-note`) but those were not flagged because their parent is 17 px; they end up at about 14 px.

## P4. Bottom-nav Hebrew sublabels are 10.2 px on phones

- Where: all 10 routes, iPhone SE, iPhone 14 Pro, Pixel 7, Galaxy S9+ (every profile under 720 px), light and dark; 6 per page (5 nav items + More). Not on iPad Mini (nav is the wide layout there, 15 px).
- Selector: `nav.site-nav ul#nav > li > a > span.he.nav-he` and `button#more-btn > span.he.nav-he`
- CSS: `assets/css/app.css` line 135 (phone media query) `.site-nav a, .more-btn { font-size: .75rem }` = 12 px, then line 34 `.nav-he { font-size: .85em }` = 10.2 px (line 18 `.he { font-size: 1.15em }` has equal specificity and loses to the later `.nav-he`).
- Why it is lower priority: the Hebrew word duplicates the English label above it (home / בית) and the nav link is 56 px tall, so legibility of the sublabel is cosmetic; still, 10 px Hebrew on a 2x-3x phone is hard to read and this is a Hebrew course.
- Fix: inside the `@media (max-width: 719.98px)` block in `assets/css/app.css` (after line 135) add `.site-nav .nav-he { font-size: 1em; }` (12 px) or `.site-nav a, .more-btn { font-size: .8rem; }` plus `.site-nav .nav-he { font-size: 1em; }` (12.8 px). Check with the walker that the five labels still fit one line at 320 px (`ul#nav li` is `flex: 1 1 0`: 50 px each beside the 72 px More button at 320 px).

## P5. `overflow-wrap: anywhere` on every calendar element breaks ordinary words at 320 px

- Where: `/calendar`, iPhone SE and Galaxy S9+: the "Holidays" checkbox label in the calendar settings (`details.alef-cal-settings > div.alef-cal-form > fieldset > label.check`, 221 px wide) is split mid-word.
- CSS: `src/curriculum/calendar.style.js` line 7 `.alef-calendar * { min-inline-size: 0; overflow-wrap: anywhere; }`; the flex label is line 43 `.alef-cal-form .check { display: flex; gap: .5rem; align-items: center }`.
- Why: `anywhere` lets the min-content width of a flex item shrink to one character, so the checkbox row shrinks the text instead of wrapping between words.
- Fix: change line 7 to `overflow-wrap: break-word;` (long tokens still break, normal words wrap at spaces) and keep `anywhere` only where it is wanted (after P2, nowhere). Rerun: the P2 fix alone does not clear this one.

## Not fixable from here, still owed

- Safari / iOS WebKit: `100vh`, `env(safe-area-inset-bottom)` on the fixed nav, `position: fixed` with the on-screen keyboard, niqqud placement in Frank Ruhl Libre, `color-mix()` support on older iOS: none of this was exercised. Needs a real iPhone or a WebKit install (`npx playwright install webkit`, then run the walker with a WebKit launch; it is Chromium-only today).
- Android Chrome with a real font stack (DejaVu fallback here vs. Noto on a device), pinch zoom, and the 48 dp Material target rule were not tested.

## Rerun

After a fix: `node tools/qa/devices.mjs --diff docs/qa/shots-devices/results.json` regenerates DEVICES.md with a "Diff vs previous run" section listing fixed and new issue keys; then update the status lines above.

## Status after Stage 4 and Stage 5 (before / after, same emulation caveats)

Before (Stage 2 full run, 100 visits): tap < 44 px 140 element-visits (35 distinct on one page), text < 12 px 570, words broken mid-word 52, page-level overflow 0, errors 0. Issue keys in the diff: 762.
After P1-P5 applied (rerun with `--diff`, same 100 visits): tap 0, text < 12 px 0, mid-word breaks 0, overflow 0, errors 0. Diff: 762 fixed, 0 new.

| Item | Status | What changed |
|---|---|---|
| P1 day buttons 35 px wide | fixed | `src/curriculum/calendar.style.js`: under 360 px the grid section scrolls sideways inside its card and the table has `min-inline-size: 322px` (7 x 46 px). Trade-off: at 320 px the month grid scrolls horizontally; wider phones are unchanged. |
| P2 day labels 10.9 px / split words | fixed | `.alef-cal-day .l` is `.75rem` (12 px), `overflow-wrap: normal`; under 420 px it is one line with an ellipsis (full name stays in the button's `aria-label`). |
| P3 draft note 10.7 px | fixed | `.alef-cal-draft small { font-size: 100% }` (12.8 px). |
| P4 nav Hebrew sublabels 10.2 px | fixed | `assets/css/app.css`, inside the phone media query: `.site-nav .nav-he { font-size: 1em }` (12 px). The five labels still fit on one line at 320 px (no mid-word flags). |
| P5 `overflow-wrap: anywhere` | fixed | `.alef-calendar *` now `overflow-wrap: break-word`. |

### Stage 5: newly wired routes

Added to the walker's default route list: `/speak`, `/offline`, `/reminders`, `/install`, `/vocab/themes`, `/welcome`, `/firstday/ladder`, `/progress` (the full run is now 18 routes x 10 profile/scheme combos = 180 visits, about 5 minutes; `--quick` is unchanged). Result: all ready, 0 errors, 0 page-level sideways scroll, 0 tap targets < 44 px, 0 text < 12 px, 0 mid-word breaks, 0 RTL flags. One finding, not fixed here:

- **P6 `/progress` is 367 px wide inside a 288 px column at 320 px (open).** Boxes stick out 47 px to the right and are cut off by `main { overflow-x: clip }`, so the page does not scroll but the right edge of every card is clipped (iPhone SE and Galaxy S9+ only, light and dark; 24 flagged boxes). Selector: `main#main > div.pg`. File: `src/progress/progress.view.js`, the injected CSS line `.pg { display: grid; gap: var(--gap, 1rem); }` (line 13). Cause: the grid has no column template, so its single implicit column is `auto` and grows to the min-content of its widest child instead of the 288 px available. Fix: `.pg { display: grid; grid-template-columns: minmax(0, 1fr); gap: ...}`. I did not edit it: the file was modified a few minutes before this run by another lane's work, so it is main's call. After the fix the walker should report 0 overflow on `/progress`.
- Not a fix: the other seven routes were clean at every width, so no change was made to their style code.

Test note: `tests/calendar.cards.test.js` ("every Hebrew phrase is a verbatim slice of its registry entry", card m08, hashivenu) fails in the working tree; it is a prayer-card data/registry check unrelated to the CSS above, and I did not touch it.
