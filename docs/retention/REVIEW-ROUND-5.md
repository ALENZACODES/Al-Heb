# Retention: Review Round 5 of 5

Reviewed: the retention work at `85e2be0b` (contains `main` at `81f9fc45`).
This last round checked the work against the lane's own rules line by line, audited every file the branch touches outside its own folders, walked the screens with the keyboard only, and looked at them in dark mode. No real phone and no real learner was involved in any of the five rounds.

## Found and Fixed in This Round

| # | Finding | Fix |
| --- | --- | --- |
| 1 | The word "null" was printed on the Shop whenever no streak repair was on offer, which is almost always. The same empty-slot mistake printed "null" in the Home goal card when streaks are hidden and in the quests card on a rest day. It had been on the Shop since the first pass; four rounds of tests and an accessibility scan did not see it, a screenshot did. | Empty slots are skipped by one helper (`setKids`). The browser tests now look for stray words ("null", "undefined", "NaN") on every retention screen; that check was run against the old code and fails there. |
| 2 | Keyboard: after answering a purchase question, focus was dropped to the top of the page. | Focus returns to the button that asked, or to the result line. |
| 3 | The rules of the system were only discoverable by using it. | The Shop has a "How It All Works" list in plain words. |

## The Lane Rules, One by One

| Rule | Where it is met | How it was checked |
| --- | --- | --- |
| 1. Own branch from main, no force-push, nothing unrelated rewritten | The retention branch; main merged in three times, never the other way | Outside its own folders the branch changes 25 existing files by 108 added and 14 removed lines, all listed in `IMPLEMENTATION.md` |
| 2. Vanilla modules, no new dependencies, lazy-loaded, first install under 3.95 MiB, no inline scripts | `src/retention/` is on demand; loaded by `boot-hooks.js` after first paint | Wiring test; first install measured at 1,055 bytes under the limit; source scan for inline handlers |
| 3. One versioned key with a migration | Store key `retention.v1` (`alef:retention.v1` in localStorage), `migrate()` in `state.js` | State tests |
| 4. Rimon gender-neutral, never the icon, existing art only | `showRimon` in `rimon.js` uses the twelve drawn actions; notification icon is the gold Aleph | Copy tests on every line; the icon is asserted in the service-worker browser test |
| 5. Quiet from Friday 18:00 to Saturday 21:00, and on holidays | `quiet.js` on top of the app's own helper; streak rest days; league settle; the older in-app banner | Unit tests, the ten-day journey, the service-worker test |
| 6. Reduced motion | `retention.css`, `dom.js` | Browser test: no running animation under reduced motion |
| 7. The Name is never spelled | No such string in `src/retention/` | Source scan in the wiring test |
| 8. No tool names in learner copy | | Source scan and message tests |
| a. Streak: day boundaries, freeze, repair window, milestones 3/7/14/30/50/100/365 | `streak.js` | `streak.test.js`, journey |
| b. XP, gems, combo, daily goal 10/20/30/50, confetti | `xp.js`, `gems.js`, `ui.js` | `xp-gems-hearts.test.js`, browser tests |
| c. Hearts: 5, lost on mistakes, won back by old material, timed refill | `hearts.js` | Unit tests; a real lesson walked by hand |
| d. Ten-tier weekly league, seeded pretend players said to be pretend, resets after Shabbat | `leagues.js`, `league.view.js` | `leagues.test.js`, browser test |
| e. Local reminders through the service worker, personal timing, 60+ lines without repeats | `notify.js`, `messages.js` (73 lines), `sw.js` | `notify.test.js`; the real service worker in Chrome |
| f. Top bar, `#/league`, goal ring, end-of-lesson reward, freeze shop | `ui.js`, `league.view.js`, `shop.view.js` | Browser tests at 320, 360 and 390 px; axe in light and dark |
| g. Tests in the repo's runner | `tests/retention/` (the repo's folder is `tests/`) | `npm test` |
| h. `docs/retention/IMPLEMENTATION.md` | Present, with a file map and a tuning table | Read through |

Beyond the brief: daily quests, the 3-minute lesson, weekly recap, welcome back, a quiet first visit, "New for You" notes, milestone sharing, a calendar fallback for reminders.

## What Five Rounds Did Not Cover

These are the honest limits of everything above.

| # | Gap | What it needs |
| --- | --- | --- |
| A | No real phone. Touch, the installed app, the notification as it looks on Android, the share sheet and the calendar file on iPhone were not exercised. | `OWNER-CHECKLIST.md`, about 20 minutes on a phone |
| B | The browser waking the service worker in the background was never observed; only the worker's check was run. | An installed Android phone left alone for a few days |
| C | No real learner. Every number (prices, XP, pacing of the pretend league, when things unlock) is a design guess. | Use, then tuning from the table in `IMPLEMENTATION.md` |
| D | Fifteen Hebrew strings are unreviewed; two league tier names need the rabbi's view. | `HEBREW-REVIEW.md` |
| E | Product decisions left to the owner: two daily goals on Home (minutes and XP); whether a repair should also count today; promoting `/league` and `/shop` out of preview. Decided on 2026-11-10: Friday stays a free streak day. | A yes or no on each of the three |
| F | No screen-reader session (VoiceOver or TalkBack). axe and the keyboard walk passed, which is not the same thing. | A blind or screen-reader user |
| G | First install is about 1 KB under its limit. | Not caused by retention; the next lane to touch an installed file will meet it |
| H | No badges for league results, daily goals or quests. | Medallion pictures |

## Bugs Found Across the Five Rounds

Fifteen in the lane's own code, plus one in older code it touched: the 3-minute card wiped by the lesson redraw; a sitting and a round counted as finished lessons (two); finished lessons gated at zero hearts; league XP ranked before the league opened; travel grace lost; an unshown reminder recorded as sent; a calendar file starting on Friday; redraws dropping focus; a mismatched button name; an empty top bar on a first visit; the freeze note returning; double pay across tabs; focus lost after a purchase; and the printed "null". The older in-app streak banner showing on Saturday was the one in existing code. Fourteen of these have an automated test now (two were added after this round). One is still checked by hand only: the mismatched button name, by an axe run.
