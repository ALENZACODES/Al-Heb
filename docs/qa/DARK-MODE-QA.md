# Dark mode and forced-colors QA on the 15 v0 routes (375x667)

Observed only. Run on 2026-11-04 with Chromium (Playwright) against the working tree, served by `tools/serve.mjs`. Viewport 375x667, scale 1, touch on, profile `onboarded: true`, no lesson progress. Throwaway scripts (not kept in the repo) took the screenshots, which were read through the image viewer, as contact sheets of 7 to 8 phones at reduced size, not one by one at full size. No real phone, no Windows high-contrast session, no screen reader. "Forced colors" below is Chromium's `forcedColors: 'active'` emulation, which draws the Windows-style palette but is not a Windows machine.

Routes: `/`, `/learn`, `/letters`, `/letters/atlas`, `/letters/bet`, `/progress`, `/firstday`, `/install`, `/credits`, `/privacy`, `/offline`, `/settings`, `/welcome`, `/search`, `/about`.

Modes: (1) `prefers-color-scheme: dark` plus `prefers-reduced-motion: reduce`; (2) `forced-colors: active` plus reduced motion (light scheme). For each route: one screenshot on load, one after three Tab presses (to see a focus ring). Extra states captured in both modes: /firstday after answering, /learn?review=1, /learn?checkpoint=1, atlas quiz with a right-looking and a wrong tile picked, /letters/alef after Animate, /welcome with radios chosen, /search with text typed.

## Seen, dark mode

| Item | Seen |
|---|---|
| Invisible text or borders | None seen on the 15 routes at the reduced contact-sheet size. Cards, tiles and text read on the dark page. The /search input and the unselected /welcome radios have faint borders, readable but low in contrast; not measured. |
| Sticky bottom tab bar | Dark card colour with light text; the current tab is a light-blue block with dark text, readable on all routes. |
| Sound bar | Dark amber with light text and underlined "Details" link; readable. |
| Sticky action bar (exercise Check/Next) | Not reached: no exercise card was opened (no lesson was started; /learn?review=1 and ?checkpoint=1 showed "nothing due" and "nothing to check" with this profile). Not checked. |
| Focus ring | Amber (`--focus`) ring was visible on links, buttons, tabs, the skip link and the search input in every focus screenshot that was read. On the bottom tab bar the ring ran off the screen edge on the left and bottom (see Fixed). |
| White flash on load | Not measured (no early-paint capture). Reading the files: `index.html` sets `color-scheme: light dark` and a dark `theme-color`; `manifest.webmanifest` has `background_color: #f6efe0` (light), and a manifest cannot switch by colour scheme, so an installed app may show a light splash in dark mode. Not tested on a device. |
| Letter trace (/letters, /letters/bet, /letters/alef) | The trace stage stays a white rectangle on the dark page (fixed `#fff` in `src/letters/trace.view.js`); the grey ghost letter and green start dot are visible on it. Bright against the dark page, readable. After Animate (reduced motion) the stroke drawn was visible on it. Left as is: changing it would mean recolouring the stroke and ghost too. The "Draft" notice on those pages is a cream box with dark text, also bright. |
| Selected state | Selected /welcome radio shows a light-blue dot; atlas "Stop quiz", letters "Trace" tab, "Print", "Outline" and the mode toggle show as blue filled buttons with white text; readable. |
| Error/success marks | Atlas quiz: the picked wrong tile gets a pink fill and red border, and the text "That is Bet." appears under the prompt; the tile itself has no mark, the text is the non-colour cue. Spot It marks (check, cross, dashed border) are defined in `learn.css`; not opened in this run. |
| Disabled states | None on screen on these routes in this run; not checked. |
| /welcome layout | "Some" and "Yes, I read with vowels" sit on one line with two radios, in both modes. Layout, not a colour issue; not changed. |

## Seen, forced colors

| Item | Seen |
|---|---|
| Text, borders | Page text, card borders (2px), buttons and tiles drawn in system colours; legible on all 15. |
| Tab bar | Current tab is a dark filled block with underlined label; visible. |
| Pressed/selected toggles | Before the fix: the Trace/Look-alikes tabs, the letter tiles, Print/Cursive/Strict/Outline and the atlas "Stop quiz" toggle looked the same pressed or not. After: pressed ones are filled with the Highlight colour (re-screenshotted /letters and /letters/atlas). |
| Atlas wrong/right tile | In forced colors a wrong tile shows only a thin blue-ish border change; the text line "That is He." carries the result. Not changed. |
| Trace ghost letter | Pale grey ghost stays on a white stage; visible. |
| Focus ring | Drawn in system colours; visible in the screenshots read. |

## Fixed in this pass

| Finding | File | Result |
|---|---|---|
| Pressed/selected buttons lost their look in forced colors | `assets/css/app.css` (one block appended after the `prefers-contrast` rule) | `button[aria-pressed=true]`, `button[aria-selected=true]`, `[role=tab][aria-selected=true]` get Highlight/HighlightText in forced colors. Re-screenshotted /letters and /letters/atlas: pressed ones now filled. |
| Bottom-tab focus ring cut off by the screen edge (phone width) | `assets/css/app.css`, same block | `outline-offset: -4px` on `.site-nav a` and `.more-btn` under 720px. Re-screenshotted dark /: ring now drawn inside the tab on all four sides. |
| Test | `tests/a11y.static.test.js` | New test asserts both rules exist. |

## Not done

- No lighthouse or contrast measurement of dark colours beyond the existing static contrast test.
- Action bar, disabled states, Spot It marks and first-paint flash were not reached or measured.
- Only light-scheme forced colors; dark scheme with forced colors was not run.
- In `/learn` forced colors the first tab link ("Read the prayer book") showed filled after my edit and outlined before; the rule I added matches buttons only, so the change came from another edit to the working tree in the meantime; not investigated.
