# Rimon flip-book animations

Updated 2026-11-10, 12:59 AM ET (America/Toronto).

These are decoration on top of the existing 12-frame companion in `assets/img/rimon/`. They do not replace that animator. The design stays frozen and on-model. No Kool-Aid branding, pitcher, or slogan. No text in the frames.

## Sheets

Eight-frame, 256 px, horizontal WebP strips in `data/images/rimon/anim/`. Built from consecutive-feeling stills that already exist in `data/images/rimon/`. Total size is about 178 KiB for all seven sheets.

`tools/build-precache.mjs` already skips `data/images/`, so these sheets are **on demand only** and stay out of the first-install precache budget (the v0 core target of under 4 MiB). A missing sheet leaves the single still visible; a missing still hides the moment.

| Flip | File | Frames (still ids) | When | Motion |
| --- | --- | --- | --- | --- |
| burst | `rimon-flip-burst.webp` | 018 023 030 002 027 057 025b 040 | Home, onboarding, lesson start, Brain Lab | Crash-in from the page edge, then a big cheer |
| bounce | `rimon-flip-bounce.webp` | 023 030 005 023 027 030 023 001 | Hints, loading | Springy landings |
| celebrate | `rimon-flip-celebrate.webp` | 028 039 034 026 027 031 035 024 | Correct, high-five, lesson complete, awards | Sway, kick, spin, laugh, arms up, clap |
| slump | `rimon-flip-slump.webp` | 041 042 048 043 044 045 054 055 | A miss, then kindness | Soft "oh", think, encourage, recover — never scolding |
| sleepy | `rimon-flip-sleepy.webp` | 015 050 015 037 015 050 001 015 | Idle, story reader (loop) | Eyes closed, a breath, a soft return |
| peek | `rimon-flip-peek.webp` | 033 011 020 033 009 011 020 001 | "Where are you?", empty, offline, reminders, books | Peek around the page edge |
| streak | `rimon-flip-streak.webp` | 056 057 058 027 030 002 025b 035 | Streak moments | Big cheers plus a gold pulse (not a flame, no numbers) |

## Motion rules

CSS entrances (`burst`, `bounce`, `crash`, `peek`) use transforms only. `prefers-reduced-motion: reduce` turns every entrance and flip off and shows one still. Friday 18:00 through Saturday 21:00 local is a quiet window: no flip, no crash, a calm still only. This is decoration, not a halachic calculator.

Code: `src/shell/rimon-flips.js`, `src/shell/rimon-stills.js`. Mounted from `src/app.js` next to the existing companion, inside try/catch. Tests: `tests/shell.rimon-stills.test.js`.
