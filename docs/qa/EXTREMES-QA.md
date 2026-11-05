# Extremes QA: large text and zoom, forced colors, slow device and network, reduced motion (2026-11-04)

Method: headless Chromium through Playwright 1.63 on a temporary copy of the repo with a fresh `node tools/build-precache.mjs` (copy deleted afterwards; nothing built inside the repo). Scripts were throwaway and are not committed. No real device, no screen reader, no real Windows high-contrast theme, no real Android font scale was used. Screenshots: `docs/qa/a11y-extremes/` (about 320 KB).

Screens: Home, onboarding (fresh profile), Letters `/letters/bet` with the memory card pressed open and the chain played, lesson r01 and its quick check (quiz), Review (question and answer), Settings, `#/nikkud-fade`, `#/roots`, `#/gender-drill`, `#/record-compare`.

## 1. Large text / 200% zoom
Three emulations: (a) `html{font-size:200%}` at 360x640 (stand-in for a large default font; real Android font scale was not tested); (b) 200% browser zoom of a 360x640 phone = 180x320 CSS px viewport; (c) `--force-device-scale-factor=2` with CSS `zoom:2` at 360x640.
Checked per screen: document horizontal scroll, elements past the viewport edge, `main` clipping (it has `overflow-x: clip`), clipped text in overflow-hidden boxes, primary action reachable (some scroll position puts its centre on it uncovered), space under the last content above the fixed nav.

| Finding | Where | Status |
|---|---|---|
| D1. Lesson letter list and Review answer overflowed `main` and were clipped (not scrollable): 70 px (lesson) and 78 px (review answer) at 200% font; 37 and 44 px at 200% zoom. Cause: grid tracks `auto 1fr` / `repeat(2,1fr)` have an auto minimum, so a button's min-content (Listen, rating buttons) forced the row wider than the card. Right-hand buttons and the 3rd/4th rating were cut off. | `assets/css/learn.css` | FIXED: `.alef-item` columns `auto minmax(0,1fr)`, `.alef-item-actions{min-inline-size:0}`, `.alef-ratings` `repeat(2,minmax(0,1fr))`. Re-run: overflow 0 on lesson, quiz, review, review answer in all three emulations. Layout at normal size unchanged by construction (only changes when the track would overflow). |
| D2. Sound status line ("Sound: the list has not been loaded yet" / "No recordings yet...") is one nowrap line with ellipsis, so at 200% only about 3 words show ("Sound: the list has no..."); the full text sits behind Details. Deliberate (comment in `src/shell/audio.js`) but the meaning is lost at large text. | `assets/css/app.css` line 121-122 (`.sound-bar p`) | NOT FIXED, design call: allow wrapping when font is large. |
| D3. Bottom nav labels "Learn" and "Progress" stay tiny at 200% font while "More" scales; the nav plus sound bar take 238 of 640 px (37%) of a 360x640 screen at 200%. | `assets/css/app.css` (`.site-nav`) | NOT FIXED. Primary actions are still reachable (see below). |
| D4. At 180 px wide, one run showed `main` 6 px wider than its box with the memory card open (`mainClipX=6`). Re-ran twice and could not reproduce it or find the element. | `src/letters/memorycard.js` / its CSS (suspect only) | Open, unconfirmed. |

No screen had document-level horizontal scroll in any emulation. Primary action on every screen listed was reachable by scrolling in all emulations (after fix). The letter tab strip (Alef..Bet) is a horizontal scroller by design and is cut at the edge as expected. Screens: `fs200-*.png`, `zoom200-*.png`.

## 2. Forced colors (Playwright `forcedColors:'active'`)
No clipped text, no overflow, primary actions reachable on all screens. The memory card picture (Bet as a bungalow) is drawn and legible in forced colors (`forced-colors-memory-card.png`; the SVG fill/stroke are replaced by system colours, and the card, art button and "Next: sound hook" keep a visible border). Tabs and pressed buttons show selection (Trace tab filled).
Remaining weak spots found by computed style (controls with no border, outline or underline, so the shape is not drawn): the More button in the nav, the sound bar close button, and the `summary` disclosures ("Remember it", "About this lesson"). They still show text, so they are findable, but have no button shape. Owner: `assets/css/app.css` (forced-colors block near line 222). Not fixed (needs a design choice). Contact sheets: `forced-colors-sheet-1.png`, `-2.png`.
Not checked: focus ring appearance in forced colors beyond screenshots, the other 80 routes.

## 3. CPU 4x + slow 4G (CDP: 150 ms RTT, 1.6 Mbps down, 750 kbps up, cache disabled, fresh context each run, 390x844 mobile, median of 3)
| Cold load | load event | first contentful paint | content ready (`data-ready`) / LCP | long-task blocking | transferred |
|---|---|---|---|---|---|
| `/` first visit (goes to onboarding) | 2.2 s | 1.1 s | 5.1 s | 79 ms | 716 KB, 54 requests |
| `/` onboarded | 2.1 s | 1.2 s | 4.6 s | 103 ms | 1.17 MB, 56 requests |
| `/letters/bet` onboarded | 2.2 s | 1.1 s | 8.3 s | 282 ms | 1.30 MB, 68 requests |
| `/letters/bet` first visit | 2.1 s | 1.0 s | 8.1 s | 198 ms | 1.30 MB, 68 requests |
Interaction delay after ready (still throttled), touch tap: More button click input delay 24 ms, handler 1 ms, next paint 88 ms; memory card picture press delay 23-28 ms, handler 11-24 ms, next paint 56 ms. The first interaction before ready was not tested. Finding: letters page is the slowest to show content (about 8 s on this profile, 3 s more than Home); first paint at 1 s is fine. Likely module and JSON fetches in sequence (`src/letters/trace.view.js`, memory chain data); not profiled further. The service worker was installing in the background during these runs, so bytes include precache.

## 4. prefers-reduced-motion
88 routes (every route with a sample parameter, plus lesson, review, Letters type tab) loaded with `reduce`: no running CSS animations, no elements with non-zero animation or transition duration, no smooth scroll, no idle requestAnimationFrame loop. Caveat: with `no-preference` the same probe also found zero ambient animations on any route, so this part shows only that nothing moves on its own. The motion that exists is on press: on `/letters/bet`, the stroke-order Animate button used 58 animation frames normally and 1 under reduce, Hint 85 and 1; the memory card picture press and Play the chain showed no difference in the probe (1-2 frames both ways; the morph is documented as instant under reduce and was not measured further). Not tested: the lesson progress bar, quiz transitions, any media or JS timers outside these routes.

## Files changed
`assets/css/learn.css` (3 declarations, D1). Nothing committed. Precache not rebuilt in the repo: `precache-manifest.js` is stale relative to this CSS edit; run `node tools/build-precache.mjs` before release.
