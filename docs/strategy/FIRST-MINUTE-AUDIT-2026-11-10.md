# First Minute, Look and Consistency vs Duolingo (2026-11-10)

Scope: what a brand-new learner sees from opening the app to finishing the first lesson, plus the main screens after it (Home, Learn, Progress, Brain Lab), at phone size (390 x 844). Checked by scripted walks in headless Chrome with screenshots, and by the unit tests. Not checked: a real phone, a screen reader, a learner.

## Gaps found, ranked by first-minute impact

| # | Gap (before) | Duolingo does | Fixed in this branch |
|---|---|---|---|
| 1 | Setup was one long form: two questions, eight option cards, no mascot, tab bar and teachers band showing | One question per screen, the mascot asks it, progress bar on top, one big Continue pinned at the bottom, no tabs | Yes: three pages (reading level, goal, daily goal), Rimon asks each in a speech bubble, progress bar, Back, pinned Continue, chrome hidden |
| 2 | Tapping an answer (setup and the lesson player) scrolled the page down: the "keep focus above the tab bar" code measured the hidden tab bar | Taps never move the page | Yes: the check now skips a hidden bar (src/app.js) |
| 3 | Each setup step opened half-way down; the plan opened below its own Start button | Each screen opens at its top | Yes |
| 4 | No daily goal choice at first run (it sat behind "Change goal or minutes a day") | Asks 5, 10, 15 or 20 minutes as a commitment | Yes: Casual, Regular (preselected, the plan default), Serious, Intense; saved as the plan minutes and the Home goal |
| 5 | Time in "Your First 10 Minutes" never counted toward the streak (route missing from the counted list) | The first lesson starts the streak | Yes: /firstday, /firstwin and /placement count, like /learn (rule unchanged: a day counts at 5 minutes) |
| 6 | No streak or goal in sight outside the Learn page | Streak flame and goal in the top bar on every main screen | Yes: header chips, flame with day count (lights when today counts) and today's minutes against the daily goal |
| 7 | First lesson finish had a check-mark medal and "Five minutes of study today starts your streak." | The mascot celebrates, then a streak screen | Yes: Rimon high-fives; a flame card fills toward 5 minutes and lights live (with the streak sound) if the day starts to count while the screen is open |
| 8 | The first letter (Shin) was never shown large on its own screen: the memory card replaced it with a thumbnail when it loaded | The new character is the hero of the screen | Yes: the letter stays large above its picture card |
| 9 | Look split by device setting: cream pages with green cards in light mode, green in dark; teachers band always cream | One look | Yes: dark green and gold is the default theme (owner's order 2026-11-08); the band takes the page colours; Light and Match device stay in Settings |
| 10 | Tab bar: text only, uneven widths, More clipped at 390 px, Progress had no Hebrew label | Icon tabs, equal widths | Yes: icons, equal widths, gold marker on the current tab, התקדמות under Progress |
| 11 | Three button styles (flat pill, gold pill, chunky lesson button) | One chunky pressable button | Yes: one style from the tokens (14 px corners, 4 px lip, presses down) |
| 12 | Learn goal ring said 0/5 while setup said 10 minutes a day | One number | Yes: the ring uses the daily goal |
| 13 | Lesson list read as a list | A winding path with the current stop marked | Partly: the list winds on phones too, a dotted trail joins the stops, the current stop has a Start tag and rises gently; still cards, not bare circles |
| 14 | Rimon sheets were about 1 MB each, loaded on every page | Light assets | Yes: WebP copies at about 100 KB each (originals kept) |

Not fixed here, for later rounds: the opening prayer appears before the welcome on the very first visit (kept: the owner asked for it on open); no XP or gems (by design: badges instead); the lesson path is still cards, not circles with a pop-over; no leagues or friends; Rimon has 12 moves, not 200.

## Before and after

| Before | After |
|---|---|
| ![Before: one long welcome form](first-minute-2026-11-10/before-welcome.webp) | ![After: Rimon asks the reading level](first-minute-2026-11-10/after-1-level.webp) |
| ![Before: plan opened below its Start button](first-minute-2026-11-10/before-plan.webp) | ![After: goal question](first-minute-2026-11-10/after-2-goal.webp) |
| ![Before: Learn page, cream with green cards](first-minute-2026-11-10/before-learn.webp) | ![After: daily goal](first-minute-2026-11-10/after-3-daily.webp) |
| ![Before: first letter shown only as a thumbnail](first-minute-2026-11-10/before-first-letter.webp) | ![After: plan with Start pinned](first-minute-2026-11-10/after-4-plan.webp) |
| | ![After: first letter large](first-minute-2026-11-10/after-5-first-letter.webp) |
| | ![After: Learn with header chips and icon tabs](first-minute-2026-11-10/after-6-learn.webp) |

## Files

- `assets/css/tokens.css` (new): spacing, type, corners, lip, shadows, motion, brand colours.
- `assets/css/polish.css` (new, loaded last): buttons, headings, header chips, tab icons, setup screens, Rimon bubble, path, finish flame, first letter.
- `src/onboarding/firstrun.view.js`: the one-question-per-screen setup (same store keys, ids and answers as before).
- `src/shell/statbar.js` (new), `src/shell/rimon-inline.js` (new), `assets/img/rimon/web/*.webp` (new).
- `src/firstday/firstday.view.js`: Rimon, the flame, the large first letter.
- `src/morning/engage.js`: first lesson counts toward the day. `src/app.js`: hidden tab bar no longer scrolls the page.
- `src/shell/settings.js`: default theme dark green and gold. `src/shell/companions.js`, `src/shell/nav.js`, `src/shell/nav-model.js`, `src/shell/i18n.js`, `src/curriculum/learn.view.js`.
- `tools/build-precache.mjs`, `src/shell/offline.js`: three preview-only views (word builder, Sound like a local, Common phrases) load on first open, keeping the first install under 3.95 MiB.
- Tests: `tests/firstminute.test.js` (new, 10), `tests/onboarding.test.js` (+4, one count updated from 2 to 3 questions), `tests/morning.test.js`, `tests/integration.test.js` (default theme), `tests/cognitive.test.js` (five new animations added to the motion inventory with their review note). Unit tier: 3,334 tests, 3,324 pass, 0 fail, 10 skipped.

## For native review

- התקדמות (Progress) as the tab's Hebrew label.

## Round 2 (2026-11-10, about 2 AM)

- Every lesson summary now ends like the first lesson: Rimon plays his high five in the page and the streak flame card fills toward 5 minutes and lights live (src/shell/flame.js, shared).
- A one-time "Today counts" toast appears wherever the learner is when the day lights.
- Merged `overnight/launch-ready-2026-11-10` into this branch: its one-tap quick start sits under Continue on the first question; its text flame on the lesson summary is folded into the live flame card; three more preview views load on first open to keep the first install under budget.
- Locked path stops and the cheer line are readable on dark green.
- Branch review round 1: [BRANCH-REVIEW-R1-2026-11-10.md](BRANCH-REVIEW-R1-2026-11-10.md).

## Round 3 (2026-11-10, about 2 AM): self-review against GitHub

Checked against `main` at b574744 (merged in; no conflicts) and `overnight/launch-ready-2026-11-10` at c9e9e17 (already merged). Scripted phone-size walk repeated after the changes.

Fixed this round:
1. The lesson list still read as a stack of cards. Now only the next lesson is a card; finished lessons are gold stops with a check, the next stop has a star and the Start tag, locked stops show a lock and no dead Start button (the disabled button stays in the page for screen readers).
2. If a Rimon sheet could not load, the page showed an empty box. Rimon now falls back to his single picture, still.
3. On the first setup question the two pinned buttons (Continue and the quick start) covered the last answer. The page now leaves room for both.
4. The branch was three commits behind `main`; merged.

Still open, ranked:
1. No real phone and no screen reader has been used on any of this; only headless Chrome at 390 x 844 and unit tests.
2. Three ways of showing Rimon (the animated sheets here, `rimon-show.js` stills on launch-ready, the trigger map on `lane-rimon-mascot`); the stills are opaque cream squares. One map and transparent stills are needed before Rimon can appear on more screens.
3. The opening prayer is the very first screen on a first visit, before Rimon and setup (the owner asked for Mah Tovu on the first visit; kept, flagged).
4. Fixed in round 3: a tap anywhere on an open stop opens its lesson (keyboard and screen readers keep the Start or Review button). Still not a pop-over card like Duolingo's.
5. The first lesson can finish before 5 engaged minutes, so day 1 often does not light on the first visit (rule kept; the flame says how many minutes are left).
6. Two buttons on the first setup screen (Continue and "New to Hebrew? Start now") split attention; one may be enough.
7. Progress and Brain Lab use the tokens but were not reworked screen by screen.
8. No browser-tier test drives the new setup flow; it is covered by fake-DOM unit tests and scripted walks only.

## Score

Round 3: 86/100 (before this round: 82). Round 2: 82/100. Round 1: 72/100 for this round (first minute, look and consistency against Duolingo). What would raise it: the path as true round stops with a tap-to-open card; a lesson-complete screen for every lesson (not just the first) with Rimon and the flame; Rimon's move set used across Home, Progress and Brain Lab; a real-phone and screen-reader pass; streak-freeze and badge moments shown at the moment they happen.
