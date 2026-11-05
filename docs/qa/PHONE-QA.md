# Phone and tablet QA of the 15 v0 routes (2026-11-05)

Headless Google Chrome 153 (desktop build with touch and mobile emulation), driven by a script that opened every v0 route and recorded what it measured. This is emulation. It is not a real phone, a finger, a real screen reader or a real network.

- Routes (the 15 with `tier: 'v0'` in `src/shell/router.js`): `/`, `/learn`, `/letters`, `/letters/atlas`, `/letters/bet` (the `/letters/:id` route), `/progress`, `/firstday`, `/install`, `/credits`, `/privacy`, `/offline`, `/settings`, `/welcome`, `/search`, `/about`.
- Viewports: 360x640 and 390x844 (touch, mobile emulation), 768x1024 (tablet). Light and dark (`prefers-color-scheme`).
- Configurations, each over all routes and viewports and both colour schemes: default; Calm mode on with `prefers-reduced-motion: reduce`; the browser's own default font size set to 24 px ("very large"); the app's Text size set to Largest (360 and 390 only).
- That is 330 page states before the fixes and the same 330 after. For each one the script recorded console errors, page errors and HTTP 400+, sideways scroll, elements past the viewport edge, tap targets under 48 px, clipped text, axe-core 4.14 violations (WCAG 2.0/2.1/2.2 A and AA plus best-practice, which includes colour contrast), Hebrew text without `lang="he"` and `dir="rtl"`, and whether the first 10 Tab stops had a visible focus ring. It saved a full-page screenshot of each.
- Screenshots are not in git, except six small proofs in `docs/qa/phone-proof/`.

## What was measured and found clean

Zero in all 330 page states, before and after: console errors, page errors, HTTP 400+ responses, sideways scroll, elements past the viewport edge, axe violations (including colour contrast as axe computes it), Hebrew text without the right `lang` and `dir`, and Tab stops with no focus ring (first 10 per page, default and large-browser-font runs only).

## Defects

Severity: high = a person cannot read or use something; medium = hard to use or inconsistent with the stated 48 px rule; low = cosmetic or a judgement call. "Measured" means a script number; "seen" means I looked at the screenshot. Screenshot names are the capture names in the local run (`<config>__<viewport>-<scheme>__<route>.jpg`); only the proofs listed at the end are in git.

| # | Route | Viewport | Defect | How found | Severity | Screenshot | Fixed |
|---|---|---|---|---|---|---|---|
| 1 | `/progress` | 360, 390 | In "What have I practised?" the value ("0 of 27 letters, 0 of 15 signs") took half the row, so the label broke one word per line, mid-word at 360 ("Lette / rs / and / signs / met"). | seen, then measured (label 41 px wide) | high | base__p360-light__progress | yes |
| 2 | every route | 360, 390 at Largest text (app setting) or 24 px browser font | The sound bar message was squeezed to 29 px wide and showed "Sou t..." because the buttons took the row. | seen, measured (29 px) | high | bigapp__p360-light__learn | yes |
| 3 | every route | all | Header brand link 90x44, sound bar "Full message" 92x44, "Details" 44x44, dismiss 44x44. | measured | medium | base__p360-light__home | yes (48) |
| 4 | `/letters`, `/letters/bet`, `/firstday` | all | Trace / Look-alikes / Typing tabs, Animate, Hint, Walk me through, Start over, Print, Cursive, Strict checking, Show outline, the two "First look" buttons and "Picture, sound, word" were 44 px tall. | measured | medium | base__p360-light__letters | yes (48) |
| 5 | `/letters/atlas` | all | "Practice: picture, sound, word" and "Quiz me" buttons 44 px tall. | measured | medium | base__p360-dark__letters_atlas | yes (48) |
| 6 | `/`, `/learn`, `/letters`, `/letters/bet`, `/firstday`, `/credits`, `/settings` | all | `summary` disclosures 46 px tall (including "Strokes in words" on the letter screen, found when the fix was re-measured). | measured | medium | base__p390-light__letters_bet | yes (48) |
| 7 | `/progress` | all | Daily goal select, import mode select and file input 44 px; "Open", "Go" and the third link 44 px. | measured | medium | base__p360-light__progress | yes (48) |
| 8 | `/credits` | all | "Source page" links 44 px tall. | measured | medium | base__p360-dark__credits | yes (48) |
| 9 | `/settings`, `/welcome` | all | Every radio and checkbox row was 44 px: `.opt` asks for `var(--tap)` but a later, more specific `main label:has(input)` rule set 44 px and won. The same rule beat the Touch and movement "large" size for these rows. | measured, then traced to the cascade | medium | base__p360-light__settings | yes (48, follows `--tap`) |
| 10 | `/search`, `/settings` | all | Search box and the "type the word to erase" box 44 px tall. | measured | medium | base__p360-light__search | yes (48) |
| 11 | `/welcome` | 768 | The two-line answers ran inline, so "No, start from the beginning" and "Some" shared a row with uneven widths, unlike the phone layout. | seen | low | base__t768-dark__welcome | yes |
| 12 | `/letters/atlas` | all, dark | The final-form tiles (Final Kaf, Mem, Nun, Pe, Tsadi) stay light in dark mode. `app.css` says this is deliberate ("fixed light tile colours"). Text on them is readable; it is a glare, not a contrast failure. | seen | low | base__p360-dark__letters_atlas | no (design choice) |
| 13 | `/install`, `/offline` | 768 | These two pages use a narrower, centred column while every other route is full width, so the heading jumps sideways when you move between them. | seen | low | base__t768-dark__install | no |
| 14 | `/letters`, `/letters/bet` | all | The two draft notes under the letter ("Stroke order is a draft awaiting teacher review. (draft)" and the longer "Draft: an Israeli teacher has not yet checked...") say the same thing. | seen | low | base__p360-light__letters_bet | no (content) |
| 15 | every route | all | The yellow sound bar reads "Sound: the list has not been loaded yet." and, in an 8 s wait on `/`, never changed (`data-audio-manifest="idle"`). It is a warning-coloured bar on every screen. Whether the idle wording is right is a product call. | seen, measured (stays idle for 8 s) | low | base__p360-light__home | no |
| 16 | every route | 360, 390 at Largest text | The sound bar message still clamps to two lines (it needs three); "Full message" opens it. | measured (scrollHeight 76 > 50) | low | bigapp__p390-dark__learn | no (by design) |
| 17 | `/letters` | 360, 390 | The letter strip is a sideways scroll strip and the left-most letter is cut at the edge with no other cue that it scrolls. | seen | low | base__p360-light__letters | no |
| 18 | repo test | n/a | `tests/integration.test.js` "precache: first install is the v0 core only (under 4 MiB)" fails at the starting commit: first-install precache is 3.90 MiB, headroom rule wants 0.25 MiB under 4 MiB. It failed before any change here. The size rule and the deferral lists were not touched. | test run | medium | n/a | no |

Counts: 18 findings. 11 fixed (rows 1 to 11), 7 left (rows 12 to 18: six judgement or design items and one failing size test that is outside what this round was allowed to change). Measured tap-target hits under 48 px: 868 across the 330 page states before (most are the four header and sound-bar controls repeated on every route). After the first round of fixes the same 330 states gave 8 hits, all the "Strokes in words" summary at 390 and 768 (row 6). That was then fixed and re-checked by the new test at 360 and 390, not re-measured at 768.

## Overlap check

The first overlap scan reported 90 overlaps. I looked at them: they were elements under the fixed bottom bar in a full-page capture, controls inside closed `details` (they still report a box), and wrapped inline links whose bounding boxes cross. A second scan that ignores fixed bars found only those same closed-details and wrapped-link cases. I saw no real overlap in the screenshots I looked at. This is partly eyeballed, not proven.

## Offline

Checked with the real service worker on a 360x640 emulated phone: load `/`, wait for the service worker to control the page and for the cache to stop growing (337 entries), then switch the browser offline. Each of the 15 routes then opened by hash and also survived a full page reload, with its heading and content rendered and no page errors. An unknown path while offline returned the app page (HTTP 200, title "ALEF"). `tools/qa/offline.mjs` (the repo's own update and storage script) was not re-run here.

## First paint

Median of 3 cold loads per route (HTTP cache off, service worker blocked, 360x640 at device pixel ratio 2) against the local static server, read from the browser's paint and navigation timing. There is no network throttling, so these are CPU and parse costs only. A real phone on a real connection will be slower.

| Route | First paint ms | LCP ms | DOMContentLoaded ms | Requests | KB |
|---|---|---|---|---|---|
| `/` | 132 | 572 | 281 | 60 | 1218 |
| `/learn` | 136 | 772 | 342 | 104 | 1536 |
| `/letters` | 324 | 776 | 460 | 73 | 1173 |
| `/letters/atlas` | 264 | 764 | 356 | 64 | 1087 |
| `/letters/bet` | 136 | 576 | 372 | 74 | 1369 |
| `/progress` | 140 | 748 | 242 | 83 | 1712 |
| `/firstday` | 176 | 660 | 311 | 95 | 2015 |
| `/install` | 272 | 532 | 372 | 52 | 714 |
| `/credits` | 132 | 272 | 162 | 52 | 734 |
| `/privacy` | 124 | 264 | 164 | 51 | 718 |
| `/offline` | 108 | 300 | 145 | 54 | 757 |
| `/settings` | 108 | 280 | 170 | 53 | 726 |
| `/welcome` | 88 | 324 | 142 | 60 | 1223 |
| `/search` | 216 | 352 | 240 | 58 | 1840 |
| `/about` | 208 | 372 | 259 | 51 | 704 |

With the CPU slowed 4x the first paint ranged from 200 to 344 ms and LCP from 756 to 1372 ms (slowest: `/progress`, `/firstday`). Part of this run overlapped with other work on the same machine and it ran before the CSS fixes were final, so treat the numbers as rough. No route was slow by these measures; nothing here says how it feels on a slow connection.

## What changed

- `assets/css/app.css`: a closing block "Phone QA round" that re-points the 44/46 px controls at `--tap` (48 px by default, still 64 px with the large-target setting), lets the sound bar wrap, and keeps Welcome answers one per row. Existing 44 px rules and their tests are untouched.
- `src/progress/progress.view.js`: under 480 px the "What have I practised?" rows stack label, value and detail.
- `tests/phoneqa.browser.test.js`: five checks (48 px targets at 360 and 390, no sideways scroll at three sizes, sound bar width at Largest text, Progress label width, Welcome rows at 768). Four of them fail on the code before the fixes and pass after; the sideways scroll check is a guard and passed before too.

## What a real phone could still show differently

Real fonts and font rendering (the screenshots use the fonts on this machine), real touch hit areas and finger size, the on-screen keyboard resizing the page, safe-area insets on notched phones, browser chrome that grows and shrinks while scrolling, system text-size settings (only the browser default font and the app's own Text size were tried), Samsung and Safari engines (only one Chrome engine was used), slow storage and low memory, and real network conditions. The Typing tab's on-screen keyboard keys (44 px wide by design, 13 per row) were not opened in this run. The 62 preview routes were not tested. I looked at about 25 contact sheets (each shows the three viewports side by side) out of 660 screenshots; the rest were only checked by the script.

## Proofs

`docs/qa/phone-proof/`: `progress-360-before.jpg` / `-after.jpg`, `soundbar-largest-360-before.jpg` / `-after.jpg`, `welcome-768-before.jpg` / `-after.jpg`.
