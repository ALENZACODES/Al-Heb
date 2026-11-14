# Retention: Review Round 4 of 5

Reviewed: the retention work at `29bdb0de` (contains `main` at `81f9fc45`).
Earlier rounds read the code, scanned for accessibility and attacked the logic with random input. This round followed one learner through ten calendar days in a real browser, with the clock set for every visit, so the whole chain ran as shipped: boot, day rollover, storage, screens. It is now a browser test, `tests/retention/journey.browser.test.js`. No real phone and no real learner was involved.

## The Ten Days

| Day | What happened | Checked |
| --- | --- | --- |
| Monday | First lesson ever | 10 XP, 50 gems, 1-day streak, the reminder question appears |
| Tuesday | Second lesson; a freeze is bought | "Daily quests are open" note; 200 gems spent after one confirmation |
| Wednesday | Missed | |
| Thursday | App opened, then a lesson | The freeze covered Wednesday without a tap; snowflake in the strip; streak still 2, then 3; the 3-day milestone paid and can be shared; "Hearts are on" note |
| Friday 19:00, Saturday | App opened | "Shabbat Shalom", a rest day, never "at risk"; no quests on Saturday |
| Sunday | App opened, no lesson | Friday and Saturday cost nothing; last week's recap reads "30 XP on 3 days"; three new quests |
| Monday, Tuesday | Missed | |
| Wednesday | App opened | Streak broken; a repair for three days is offered; bought for 450 gems, streak back to 3 |
| Wednesday, later | Shop opened | No repair on offer any more |
| Thursday | App opened | Wednesday itself was not studied, so the streak broke again and a one-day repair is offered |

## Found and Fixed in This Round

| # | Finding | Fix |
| --- | --- | --- |
| 1 | The "a freeze covered a missed day" note came back on every visit if the app was closed from Home, because "seen" was only remembered in the page. It could also trigger the matching reminder for a note the learner had already read. | Seeing it is saved at once; the note is retired at the next page or the next visit, and the reminder is skipped once it was seen. |
| 2 | Two open tabs could each pay for the same finished lesson, and one lesson could be re-done all day for XP. | The finish is noted in the stored record, so a second tab sees it; a lesson pays at most twice a day. |
| 3 | After a repair nothing told the learner that today still needs a lesson. | The shop now says "Streak repaired. One lesson today keeps it going." |
| 4 | Parts of the system (quests, hearts, league) used to switch on with no explanation. | A "New for You" note on the end card the first time each opens. |
| 5 | Unused imports and a leftover re-export in `ui.js`. | Removed. |
| 6 | Test hazard: a failing check on a browser element made the test runner run out of memory instead of reporting. | The browser tests compare plain true/false. |

## Still Open

| # | Finding | Why it is open |
| --- | --- | --- |
| A | Two daily goals on Home (minutes and XP). | Product decision. |
| B | Friday is a free streak day for everyone. | Follows the Friday 18:00 rule; one switch turns it off. |
| C | A repaired streak breaks again if the learner does not study on the day of the repair. This is how the rules add up, and the shop now says so, but it may feel harsh after paying. | A product choice: the repair could also count today. Not changed. |
| D | A closed app is reminded only on installed Android or Chromium, when the browser chooses. The wake-up itself has never run on a real phone. | No push server; needs a device. |
| E | Fifteen Hebrew strings are unreviewed. | Needs a native reader. |
| F | `/league` and `/shop` are preview routes with the "unreviewed" banner. | Owner's call. |
| G | First install is within about 1 KB of the 3.95 MiB limit. | Not caused by retention. |
| H | Rimon's speech bubble can sit over a button on a small screen. | Existing behaviour of the shell's Rimon. |
| I | Every number in the system is a design guess. | Nothing has been tried with learners. |
