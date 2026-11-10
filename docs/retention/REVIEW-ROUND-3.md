# Retention: Review Round 3 of 5

Reviewed: branch `claude/retention-fable-2026-11-10` at `8e001f71` (which already contains `main` at `4da2d9a5`).
Round 2 was a read-through and an accessibility scan. This round tried to break the system instead: random sequences of learner actions, broken stored data, and the real service worker running in Chrome. No real phone and no real learner was involved.

## What Was Tried

| Check | Result |
| --- | --- |
| Random walk: 60 pretend learners, 400 steps each over about 8 months (lessons, wrong answers, reviews, games, purchases, repairs, goal changes, reminders, clocks moved back, time-zone changes). After every step: XP never goes down, gems and hearts stay in range, lists stay inside their caps, reading the record twice gives the same record, the league table has 30 rows, and every planned reminder is in the future and outside quiet time. | Passed. The walk is checked to reach the states that matter: freezes used (371 times), streaks broken (2,318), repairs (81), league weeks settled (1,558), promotions (594), reminders planned (268), all three quests finished (211), zero hearts, rest days covered (1,456). Now a permanent test: `tests/retention/invariants.test.js`. |
| Broken stored data (wrong types, missing parts, junk quests, junk streak). | Nothing throws; defaults take over. |
| The real service worker in Chrome, with notification permission granted. | A planned reminder was shown on a Tuesday at noon with the title "Rimon" and the gold Aleph icon, removed from the plan and recorded. Nothing was shown on a Saturday at noon or inside a quiet range. Now a browser test. |
| The "Send a test reminder" button in Chrome. | A real notification was created through the service worker. |
| The page writes the reminder plan to Cache Storage, and the retention code is cached after first load (18 files), so it works offline afterwards. | Confirmed in Chrome. |
| axe-core on Home with the new welcome and recap cards, light and dark. | No violations. |

## Found and Fixed in This Round

| # | Finding | Fix |
| --- | --- | --- |
| 1 | The service-worker browser test could not run in Playwright's small bundled browser, which never grants notifications; it would have failed for a reason that has nothing to do with the code. | The test uses a full Chrome when one is installed and is skipped otherwise. |
| 2 | On Home the weekly recap sat above the welcome-back card. A returning learner should be greeted first. | Welcome first, then last week, then today's goal. |

The random walk and the broken-data checks found no fault in the code as pushed. That is a statement about these checks only.

## Still Open

| # | Finding | Why it is open |
| --- | --- | --- |
| A | Two daily goals on Home (minutes and XP). | Product decision. |
| B | Friday is a free streak day for everyone. | Follows the Friday 18:00 rule; one switch turns it off. |
| C | A closed app is reminded only on installed Android or Chromium, when the browser chooses. | No push server. |
| D | Periodic Background Sync itself (the browser waking the worker) cannot be triggered from a test. The worker's check was run directly; the wake-up was not. Nothing was run on a real phone. | Needs a real installed Android device and some days. |
| E | Fifteen Hebrew strings are unreviewed. | Needs a native reader. |
| F | `/league` and `/shop` are preview routes with the "unreviewed" banner. | Owner's call. |
| G | First install is within about 1 KB of the 3.95 MiB limit. | Not caused by retention. |
| H | Rimon's speech bubble can sit over a button on a small screen (seen over the welcome card). A tap anywhere clears it. | Existing behaviour of the shell's Rimon, not changed here. |
| I | Two tabs open at once each keep their own combo count and can each pay for the same finished lesson. | Rare; the award id is per page. Not fixed. |
| J | Every number in the system is a design guess. | Nothing has been tried with learners. |
