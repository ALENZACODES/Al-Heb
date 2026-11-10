# Rimon placement map

Updated 2026-11-10, 12:47 AM ET (America/Toronto), after John's note that Rimon has to be like the Kool-Aid Man: a big, bold, high-energy, show-up-everywhere mascot. Energy only — no Kool-Aid branding, pitcher, or slogan. Design stays frozen and on-model.

Two picture catalogues share numbers but not poses:

- Drawn set: `data/images/rimon/rimon-###.webp`, asked for by a plain id such as `023`.
- Claude-order v2 set: `data/images/rimon/v2/rimon-###-<slug>.webp`, asked for only by name as `v2:023`. A v2 file is never treated as a replacement for the same-numbered drawn still.

The companion should fail safe: if a file is missing, show nothing (no broken-image icon, no throw). Entrance motion is a CSS burst-in or bounce, and must not run when `prefers-reduced-motion: reduce` is set (show the still only).

| Situation | Where it appears | Trigger | Still ids (preferred first) | Entrance |
| --- | --- | --- | --- | --- |
| Home landing | Home / path | Opening the home screen | 057, 056, 002, 006 | burst-in from bottom |
| First-minute / onboarding start | Welcome, first launch | New learner opens the app | 002, 001, 191, 006 | burst-in |
| Onboarding steps | Path pick, tooltips, sound, mic, start | Each onboarding beat | 004, 006, 009, 010, 016, 017, 018, 019 | bounce |
| Onboarding welcome-back | Day-2 return | Second session | 020, 191, 001 | bounce |
| Lesson start | Every lesson intro | A lesson is opened | 017, 018, 046, 055 | burst-in |
| Correct answer | Every lesson item | Answer is correct | 023, 024, 026, 027, 030, 031, 035, 039, 022, 013 | bounce |
| Wrong answer (kind) | Every lesson item | Answer is incorrect | 041, 042, 043, 048, 044, 045 | bounce (softer) |
| Hint / retry | After a miss | Hint or retry is offered | 047, 052, 053, 046 | bounce |
| Streak celebrate | Home, streak badge, 3 / 7 / 14 / 30 | Streak milestone | 057, 058, 059, 061, 069 | burst-in |
| Streak at risk / saved / rest | Home, evening, Shabbat-aware rest | Streak risk, saved, rest day | 062, 063, 064, 195 | bounce |
| Streak comeback | Home after a broken streak | Starting again | 068, 055 | burst-in |
| Lesson complete | End of every lesson | Lesson finished | 071, 073, 074, 075, 083, 084, 027 | burst-in |
| Next lesson CTA | Lesson complete | Next is offered | 078, 004, 019 | bounce |
| Unit / path complete | Unit or path end | A unit or path is finished | 081, 082, 180 | burst-in |
| Idle / dock | Companion dock, any screen | Waiting, reduced motion uses 086 | 086, 087, 089, 098, 100 | none (or small bounce if motion is ok) |
| Loading | Between screens, lesson load | A wait starts | 043, 148, 018 | bounce |
| Empty state | Search / no results / empty library | No results | 114, 103, 049 | bounce |
| Error / retry | Error toast or error screen | A failure, then retry | 101, 108, 112, 047 | bounce; 112 burst-in on success |
| Offline | Offline screen, downloaded lesson still ok | App is offline | 105, 106, 107 | bounce |
| Shabbat | Home on Friday evening / Shabbat mode | Shabbat-aware rest | 116, 117, 064, 196 | none (no burst on Shabbat) |
| Holidays | Home holiday cards | Holiday greeting | 121–145 by holiday; fallback 144, 145 | bounce; quiet holidays (123, 140, 141) have no entrance motion |
| Brain Lab hub | Brain Lab home | Opening or leaving the lab | 146, 147, 160 | burst-in |
| Brain Lab play / results | Puzzles and game end | Think, aha, win, miss, try again | 148, 149, 151, 152, 158, 159 | bounce |
| Storybooks library | Library | Opening or recommending a book | 161, 170, 173 | burst-in |
| Storybook reader | Reader | Open, read, page, end, bedtime | 162, 163, 164, 169, 171 | bounce |
| Awards / badges | Badge, certificate, level-up, collection | A new award | 176, 178, 180, 184, 187 | burst-in |
| Reminders | Daily, morning, evening, streak risk, come back, goodnight | Re-engagement | 191, 192, 194, 197, 199, 200 | burst-in (200 is a soft bounce) |

Bold rerolls of the tamest drawn 001–025 stills, if present, are stored as `rimon-###b.webp` and should be preferred over the quieter original without deleting it.

Situation lists in `src/shell/rimon-stills.js` now follow the Lane A trigger map: drawn ids first, then the matching `v2:NNN` catalogue stills. Holiday rows use the festival-specific v2 stills (Hanukkah, Purim, Pesach, and the rest) rather than a short fallback-only list.

Existing sprite sheets in `assets/img/rimon/` stay untouched. No main merge, no deploy.
