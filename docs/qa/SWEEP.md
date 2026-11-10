# Route sweep findings

Generated 2026-11-04 by `node tools/qa/sweep.mjs`. Raw data: `sweep.json` in this folder.

**This is emulation.** Headless Chromium through Playwright with fixed viewports and axe-core. No real phone, finger, stylus or screen reader was used, and nothing here says how the app sounds in VoiceOver, TalkBack or NVDA. Treat findings as leads to confirm on a device.

## What was swept

- 71 routes from `src/shell/router.js` (sample value for each path parameter), 426 page loads at 320, 390, 1280 px, themes light and dark (settings.theme).
- Per page: console errors, uncaught exceptions, failed requests (network failure or HTTP 400+), axe (WCAG 2 A/AA, 2.1, 2.2 AA tags), horizontal overflow, empty main, missing h1, touch targets under 44 px (phone widths), clipped text.
- Keyboard: first 30 Tab stops per route at 390 and 1280 px, light; checks for a visible focus change, focus on invisible or off-screen controls, and focus traps. "Visible focus" is a computed-style comparison with and without focus, not a look at pixels.
- Clean run on 426 pages took 663 s.

Limits: the sample ids may land on a "not found" card for a few routes; a fresh onboarded profile with no progress was used, so states that need progress are not covered; hover, drag and audio paths are not exercised; contrast is axe on the rendered page only.

## Counts by type

- touch-target: 4
- axe-serious: 3
- overflow: 2
- focus-hidden: 1
- clipped: 1
- focus-offscreen: 1

## Ranked findings

Rank = severity first, then how many routes and configurations are affected. "shared" owner means it appears on at least 6 routes (or 40 percent), so the fix probably belongs in common code or CSS.

| # | Sev | Route(s) | Issue | Evidence | Suggested fix | Owner |
|---|---|---|---|---|---|---|
| 1 | 5 | /settings | focus-hidden: focus lands on an invisible element | /settings @390/light: input#s-import "Restore from backup file" | Keep tabbable controls visible or remove them from the tab order (hidden, inert, tabindex=-1). | src/shell/settings.view.js |
| 2 | 4 | /letters/atlas /ladder | axe-serious: label-content-name-mismatch | /letters/atlas @320/light: Elements must have their visible text as part of their accessible name; 31 node(s); button[data-tile="alef"] | axe: Elements must have their visible text as part of their accessible name | src/letters/atlas.view.js, src/curriculum/learn.view.js |
| 3 | 4 | / | axe-serious: link-name | / @320/light: Links must have discernible text; 1 node(s); a[href$="#/rules/:rule"] | axe: Links must have discernible text | src/shell/home.view.js |
| 4 | 4 | /classsummary /typing /rules/kamatz | overflow: horizontal overflow at 320px | /classsummary @320/light: scrollWidth 320 > 320; p.draft-flag right=341, section.card right=341, p right=327, div right=341 | Constrain the widest element (max-inline-size:100%, overflow-wrap:anywhere, flex-wrap:wrap or a scroll wrapper). | src/teacher/teacher.view.js, src/typing/typing.view.js, src/pronunciation/rules.view.js |
| 5 | 4 | /typing | axe-serious: color-contrast | /typing @320/light: Elements must meet minimum color contrast ratio thresholds; 4 node(s); #ty-drill-letters > .muted | axe: Elements must meet minimum color contrast ratio thresholds | src/typing/typing.view.js |
| 6 | 4 | /rules/kamatz | overflow: horizontal overflow at 390px | /rules/kamatz @390/light: scrollWidth 390 > 390; table right=433, caption right=433, thead right=432, tr right=432 | Constrain the widest element (max-inline-size:100%, overflow-wrap:anywhere, flex-wrap:wrap or a scroll wrapper). | src/pronunciation/rules.view.js |
| 7 | 3 | /words/trace /rules | touch-target: a under 44px | /words/trace @320/light: "Go to the letters" 102x21 | Give the control at least 44x44 CSS px of hit area (min-block-size and min-inline-size, or padding). | src/wordtrace/wordtrace.view.js, src/pronunciation/rules.view.js |
| 8 | 3 | /morning | touch-target: input#mrn-res under 44px | /morning @320/light: "20:00" 238x25 | Give the control at least 44x44 CSS px of hit area (min-block-size and min-inline-size, or padding). | src/morning/morning.view.js |
| 9 | 3 | /reminders | touch-target: input#nt-time under 44px | /reminders @320/light: "19:00" 254x26 | Give the control at least 44x44 CSS px of hit area (min-block-size and min-inline-size, or padding). | src/shell/notify.view.js |
| 10 | 3 | /calendar | clipped: span.l clips text (x) | /calendar @320/light: "Chayei Sara" scroll/client 63/37/16/16 ellipsis | Allow wrapping (overflow-wrap:anywhere, white-space:normal) or remove overflow:hidden; do not truncate learner-facing text. | src/curriculum/calendar.view.js |
| 11 | 3 | /morning | touch-target: input#mrn-time under 44px | /morning @390/light: "07:00" 123x25 | Give the control at least 44x44 CSS px of hit area (min-block-size and min-inline-size, or padding). | src/morning/morning.view.js |
| 12 | 2 | /progress /traditions /festivals/hanukkah /dialogues/d-cafe (+6) | focus-offscreen: focused control is outside the viewport | /progress @390/light: a "Go"; summary "White belt: Working on" | Scroll the focused control into view or remove it from the tab order while collapsed. | shared: src/app.js, assets/css/app.css or src/shell/ui.js |

## How to rerun

```
node tools/qa/sweep.mjs            # full sweep, writes docs/qa/sweep.json and SWEEP.md
node tools/qa/sweep.mjs --quick     # 3 routes, 390 px light, 12 Tab stops
node tools/qa/sweep.mjs --routes /,/typing --out /tmp/x --no-md
```

## Fix pass (2026-11-04): fixed / not fixed

Evidence: `node tools/qa/sweep.mjs --routes /,/settings,/letters/atlas,/ladder,/classsummary,/typing,/rules/kamatz,/rules,/morning,/reminders,/calendar,/listen` (all three widths, light and dark, 12 routes; 2 findings left) and `--quick` (0 findings). Chromium emulation only; nothing was checked on a real device or with a screen reader.

| # | Finding | Status | Change and evidence |
|---|---|---|---|
| 1 | /settings hidden file input focused | Fixed | Input is tabindex -1; its label is now the tab stop (tabindex 0, role button, Enter/Space opens the picker); focus returns to the label. No focus-hidden finding on /settings. |
| 2 | atlas label-content-name-mismatch | Fixed | Cause: `aria-label="false"` was written on every tile outside quiz mode (the helper in the view stringified false). Now omitted. No finding on /letters/atlas. |
| 2b | /ladder label-content-name-mismatch | Not fixed | The node is `.alef-play` "Play the sound again" with visible text "Listen again (R)" in `src/curriculum/ladder.view.js`, which is outside the allowed file list. Suggested fix: make the aria-label start with the visible text. |
| 3 | link with no text on / | Fixed | Cause: the "more" list on home included route `rules-page` (group learn, pattern `/rules/:rule`, no `quick` label), producing `href="#/rules/:rule"` with empty text. Now only routes with a label and no path parameter are listed. |
| 4, 6 | overflow at 320 on /classsummary /typing /rules/kamatz (433px table at 390) | Fixed | Tables sit in labelled, focusable scroll regions; the teacher grid uses `minmax(0,1fr)` and `min-inline-size:0`. No overflow findings on those routes at 320, 390, 1280. |
| 5 | /typing contrast | Fixed | Muted text inside drill buttons now inherits the button colour. No axe finding on /typing. |
| 7 | touch targets /rules links | Fixed | `min-inline-size` 48px on rule links. /words/trace link is in `src/wordtrace/wordtrace.view.js` (not allowed): not fixed. |
| 8, 9, 11 | time inputs on /morning /reminders | Fixed | Both the input and its label now have at least 48px height (the sweep measures the larger of input and label). |
| 10 | /calendar clipped week labels | Fixed | Removed nowrap/ellipsis on narrow screens in `src/curriculum/calendar.style.js`; labels wrap. No clipped finding. (That file was not on the allowed list but the item was; flag for review.) |
| 12 | focus-offscreen (shared) | Not fixed | Needs a shared change (`src/app.js` or `src/shell/ui.js`), outside the allowed files. /calendar "Previous month" still reported at 1280. |
| - | listen focus handling | Fixed | After each question or the final screen the focus moved to the removed button (lost to body); now it goes to the new lead paragraph. Not a sweep finding; verified by reading code and unit tests only, no keyboard run. |

Unit tests: 278 run across calendar, atlas, listen, morning, notify, teacher, typing, home, pronunciation, a11y and learnflow; 277 pass. One fails, `tests/a11y.newviews.test.js` test 4: "known finding is gone, remove it from KNOWN: /progress reflow-195(200% of 390)". /progress was not touched by this pass; it needs its KNOWN list updated by whoever owns that test (not weakened here).

## Follow-up pass: remaining three items

Headless Chromium emulation only (no real device or screen reader). `node tools/qa/sweep.mjs --routes /ladder,/words/trace,/calendar` at 320, 390, 1280, light and dark, 30 Tab stops: 0 findings (before: 3).

| Item | Status | What changed |
|---|---|---|
| /ladder label-content-name-mismatch | Fixed | `src/curriculum/ladder.view.js`: removed the `aria-label` on the "Listen again (R)" button, so the name is its visible text (the arrow glyph is aria-hidden). |
| 12 focus-offscreen (calendar, shared) | Fixed | Route-change focus on the view heading already existed. Cause: on phones the bottom nav is fixed and covered the focused control (Previous month sat at 832-880 px under a nav at 788 px). `src/app.js`: a `focusin` handler scrolls the control above the fixed nav. |
| 7 /words/trace "Go to the letters" 102x21 | Fixed | `src/wordtrace/wordtrace.view.js`: inline-flex link with 48px minimum block and inline size. |

Unit tests: 68 run (a11y*, wordtrace*, letters.trace, firstday.ladder), 67 pass, 1 skipped, 0 fail. The KNOWN list in `tests/a11y.newviews.test.js` is already empty, so nothing to remove. `tools/meta/scan.mjs` and `--text` PASS. Not covered: no manual keyboard run beyond the sweep's Tab pass.
