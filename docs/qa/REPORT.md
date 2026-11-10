# QA report (QA lane, 2026-11-04)

Tool: `node tools/qa/walk.mjs` (headless Chromium 153 via Playwright; whole run about 5 minutes; `--quick` is a 1-minute subset used by `tests/qa.walk.test.js`). Raw results: `docs/qa/results.json` (final run) and `docs/qa/results-before-fixes.json` (walk phase before the fixes below). Screenshots: `docs/qa/shots/` (JPEG q50, tall pages cut at 3200px).

## Honest limits
Headless Chromium on Linux only. No real phone, no iOS Safari or Android Chrome, no real finger or stylus (pointer input is synthetic mouse events and CDP touch events, which have perfect timing and no jitter), no screen reader, no real text-to-speech (the sound bar says "browser voice reported an error" in headless, which is expected), no real network conditions. Contrast was judged by eye on screenshots; axe results are in `docs/A11Y.md`, not repeated here. Tap-target checks measure the element box, not the finger-reachable area. Hebrew UI labels and lesson content were not proofread.

## What was walked
- 57 distinct paths: all 33 entries in `src/shell/router.js` with sample parameters, plus deep links with params/query (`/letters/bet?tab=drill&x=1`, `/learn?lesson=r05&review=1`, `/read/bless-priestly-1?line=2`, `/vocab?tier=1&q=...`, `/fade/<line>`) and bad input (`/nope`, `/letters/zzz`, `/letters/%E0%A4%A`, `/read/nonexistent`, `/dialogues/zzz`, `/loanwords/zzz`, `/spotit/zzz`, `/fade/zzz`, `/learn?lesson=zzz`, `/learn?lesson=`).
- 285 page visits: phone 390x844 light (all 57, profile with 24 lessons done), phone dark (15 routes), desktop 1280x800 light (10) and dark (3), phone light on a fresh profile (6 routes whose content depends on progress).
- Per visit: page errors, console errors, failed requests, horizontal overflow (scrollWidth > innerWidth), elements cut off by `main{overflow-x:clip}` (box right edge beyond the viewport, outside a scroll container), literal `null`/`undefined`/`NaN`/`[object ...]` in visible text, accessible name for every visible button/link/input/summary, Hebrew text without an ancestor `lang=he` or without RTL direction, tap targets under 44x44 (label box used for radios/checkboxes; inline links in paragraphs excluded), first 14 Tab stops (first is the skip link, no backwards jumps, no invisible focus, no trap) on phone-light.
- Screenshots viewed (Read tool): phone-light for every route (all 57), phone-dark for 12 routes, desktop-light for home, letters, sounds, read. Not viewed: desktop-dark, the other desktop routes (checked by script only).

## Results of the final run
| Check | Result |
|---|---|
| Console errors / uncaught exceptions | 0 in 285 visits |
| Failed network requests | 0 |
| Horizontal overflow or clipped elements | 0 (15 clipped before the fixes) |
| Literal null/undefined text | 0 on the walk; 1 found by interaction (vocab search), fixed |
| Controls without an accessible name | 0 |
| First Tab stop is the skip link, order sane | pass on all 57 phone-light routes |
| Hebrew without `lang=he` | 10 visits, all `/vocab` English glosses that contain Hebrew letters (open) |
| Tap targets under 44px | 285 visits flagged before the fixes, 19 after (range slider on fade, file inputs on Scan, one checkbox label on vocab; open, minor) |
| Offline (service worker precache 143 entries, load then reload with network off) | pass for `/`, `/learn`, `/letters/alef`, `/sounds`, `/read/bless-priestly-1` |
| Interaction checks | 31 of 31 pass |

Interaction checks: stroke tracing on alef (3 strokes), bet (2), shin (2): a synthetic mouse drag along each stroke's median point list is accepted, the counter goes 1/n ... n/n, feedback says Perfect or Done, progress is saved; a stray horizontal line is not counted; a CDP touch drag counts stroke 1 on alef. Atlas: 31 tiles, tap opens the detail panel, quiz starts and answers give feedback. Sound gap: controls work, no page overflow, both tables are in scroll regions. Vowel board: selecting a sign prompts for a family, placing gives feedback. Vocab: search, Add to reviews (stored in `srs.vocab`), review show-answer and rating by key. Workbook: every PDF link returns 200 application/pdf.

## Defects
Found 14, fixed 8 (+ aria helper fix counted once), open 6. Detail in `docs/qa/DEFECTS.md`. Fixes are separate commits naming the lane (lane9 vocab, lane3 sounds, lane2 letters/atlas) or "shell".

## Findings worth a human look that are not defects
The header, nav and sound bar use about 200px of an 844px phone screen before any content. The nav scrolls sideways (Scan to About are cut off until scrolled). The tracing canvas sits about 1660px down the Letters page on a phone (open defect 1). Content is draft by design and says so on each screen.
