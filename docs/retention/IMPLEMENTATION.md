# Retention System: Implementation

Branch `claude/retention-fable-2026-11-10`, built on `main` at `b574744f`. Not merged, not deployed.
Nothing here has been tried with real learners, and no retention numbers are promised.

## What Was Built

| Part | What it does |
| --- | --- |
| Streak | Sits on the existing streak engine (`src/curriculum/streak.js`); it does not keep a second count. Adds streak freezes bought with gems (200 each, hold 2, used automatically, all or nothing), a 48-hour repair window after a break, a free travel day when the time zone changes, and milestone celebrations at 3, 7, 14, 30, 50, 100 and 365 days. A finished lesson now completes the day (the 5-minute rule still works too). |
| XP | 10 per lesson, +5 for 90% accuracy, combo bonus (+2 per 5 right in a row, at most +6), 1 per review card (20 a day), 3 per game round with a star (15 a day), 5 per practice round. Daily goal: Casual 10, Regular 20, Serious 30, Intense 50. Confetti and Rimon when the goal is reached. |
| Gems | Earned only, never sold. Daily goal 10, sharp lesson 2, first lesson 50, streak milestones 5 to 200, league results 50 to 100. Spent on freezes, heart refills and streak repair. |
| Hearts | 5 hearts. A wrong first answer in a lesson costs one (a wrong retry is free). One returns every 4 hours, one for every 5 review cards practised (`#/learn?review=1&refill=1`, the spaced-review queue), or all five for 350 gems. At zero a new lesson is gated; a lesson already running is never stopped, and review, reading, prayer, Torah, songs and games stay open. Hearts start after the 3rd finished lesson. |
| League | 10 tiers, weekly, Sunday 00:00 to Friday 14:00. The other 29 players are pretend: generated on the device from a seeded random number generator and paced to the learner's own past weeks. The screen says so in its first line, every time. Opens after 5 lessons. |
| Reminders | 73 lines from Rimon (24 encouraging, 20 gently disappointed, 20 playful roasts, 9 situational). Sent at the half-hour the learner usually studies. Kind tone by default; roasts only for learners who pick Playful Rimon. Stops after 14 days away. |
| Screens | Top bar: streak flame, gems, hearts, league cup. Home: daily-goal ring with a goal picker. Lesson end card: reward panel with XP count-up, confetti, streak and gem lines, and Rimon. `#/league`. `#/shop` (freeze shop, repair, heart refill, switches). |

### Shabbat and Holidays

- No reminder, no streak loss and no league result or reset from Friday 18:00 to Saturday 21:00 local time, or from 18:00 on the eve of Yom Tov to 21:00 on the day.
- The app's existing quiet helper (`quietHours` in `src/shell/notify.js`, candle lighting to havdalah when a city is set) is reused; the wider of the two windows wins.
- Streak: a missed Friday or Saturday (and a Yom Tov day and its eve) never breaks a streak and never costs a freeze. A missed Friday would be lost at midnight, which is inside the window, so Friday is covered too. Switch: `STREAK.shabbatCoversFriday` in `src/retention/streak.js`.
- No reminder line names the day of rest. The Sunday greeting is sent after it ends.

### What a Reminder Can and Cannot Do

There is no push server. A reminder arrives only (a) while ALEF is open, from a timer in the page, or (b) on installed Chromium or Android when the browser chooses to run Periodic Background Sync, which can be rarely or never. On iPhone and in Firefox a closed app gets no reminder. The shop screen says this in plain words.

## File Map

New code, all under `src/retention/` and all loaded on demand (none of it is in the first-install precache):

| File | Contents |
| --- | --- |
| `state.js` | The one record, key `retention.v1`: defaults, `normalize`, `migrate`, `load`, `save` |
| `clock.js` | Local day keys, the fixed Shabbat window, league week start and end |
| `streak.js` | `applyRollover`, `buyFreeze`, `repairOffer`, `repairStreak`, `afterDayCompleted`, `streakStatus` |
| `xp.js` | `award`, `lessonPayout`, `comboBonus`, goals |
| `gems.js` | `earn`, `spend`, prices, the currency's display name |
| `hearts.js` | `heartsOn`, `loseHeart`, `refillByTime`, `practiceCard`, `refillByGems`, `canStartLesson` |
| `leagues.js`, `league.names.js` | Tiers, seeded cohort, standings, `settle`, 120 names |
| `notify.js`, `messages.js`, `quiet.js` | Timing, tone ladder, message pick, in-page scheduler, plan file for the service worker, quiet hours |
| `rimon.js` | `showRimon(situation)`: sends the app's `alef:rimon` event using the twelve drawn actions only |
| `recap.js` | Weekly recap and welcome back: `lastWeek`, `recapDue`, `welcomeBack` |
| `quests.js` | Daily quests: `dailyQuests`, `questProgress`, `questView` |
| `boot.js` | Controller: listens for lesson, review and game events, rolls the day over, arms reminders |
| `ui.js`, `dom.js`, `retention.css` | Top bar, goal ring, reward panel, out-of-hearts block |
| `league.view.js`, `shop.view.js` | The two screens |

Small additions to existing files:

| File | Addition |
| --- | --- |
| `src/shell/boot-hooks.js`, `src/app.js` | `armRetention`, called after first paint with a dynamic import |
| `src/shell/router.js`, `nav.strings.js`, `nav-model.js`, `views.generated.js` | Routes `/league` and `/shop` (preview tier) |
| `src/curriculum/exercises.ui.js` | The answer event carries the question id and whether it is a retry; the end-card event carries the lesson time |
| `src/curriculum/review.view.js` | Sends `alef:review-rated` after a card is rated |
| `src/curriculum/lesson.view.js`, `lesson.parts.js` | `?quick=1` opens the short-parts player; it sends `alef:lesson-part` when a part changes |
| `src/shell/rimon.js`, `rimon-speech.js` | Rimon's bubble can say a line sent with the event (`detail.say`) |
| `src/games/engine.js`, `src/games/arcade.js` | Send `alef:game-finished` with the stars |
| `sw.js` | `periodicsync` reminder check and a `notificationclick` handler |
| `src/shell/privacy.view.js`, `src/shell/offline.js` | The new storage key and the on-demand group are listed for the learner |
| `tools/build-precache.mjs`, `precache-manifest.js` | `src/retention/` is on demand |
| `tools/test/tiers.mjs` | `npm test` also runs `tests/retention/*.test.js` |
| `tests/cognitive.test.js` | The two new one-shot animations are added to the motion inventory |

Tests: `tests/retention/` (streak and day boundaries, XP, gems, hearts, leagues, reminders and quiet hours, state, Rimon bridge, wiring, service worker).

## Storage

One record, store key `retention.v1`. The app's store adds its own prefix, so the localStorage entry is `alef:retention.v1`. It travels with the whole-app backup. Reminder choices live inside it under `notify`. The streak count itself stays in the existing `streak` record.

Rules: reading never throws; unknown fields are kept; a broken value is copied once to `retention.v1.corrupt` and replaced by defaults; a record written by a newer app is read but never written. To change the shape later, raise `RETENTION_V` and add a case to `migrate()` in `state.js`.

## How to Tune the Numbers

| To change | Edit |
| --- | --- |
| Freeze price, heart refill price, repair price per day | `PRICES` in `gems.js` |
| Gems earned | `EARN` in `gems.js`; streak milestone gems in `STREAK.milestoneGems` |
| The currency's name (for example "Seeds") | `CURRENCY` in `gems.js` |
| Milestones, freezes held, repair window and limits, travel grace, Friday rule | `STREAK` in `streak.js` |
| XP per action, combo, daily caps | `XP` in `xp.js` |
| Daily goal choices | `GOALS` in `xp.js` and `GOAL_CHOICES` in `state.js` |
| Heart count, refill time, practice round size, unlock point | `HEARTS` in `hearts.js` |
| Tier names, promotion and demotion lines | `TIERS` in `leagues.js` |
| How hard the pretend players are | `paceOf()` and `LEAGUE` in `leagues.js` |
| League week end, Shabbat window hours | `clock.js` |
| Reminder hours, gaps, the stop after 14 days, opt-in asks | `NOTIFY` in `notify.js`, `NIGHT` in `quiet.js` |
| Tone by days away | `tierFor()` in `notify.js` |
| Reminder lines | `messages.js` (the copy tests in `tests/retention/notify.test.js` check every line) |
| Which Rimon action goes with which moment | `SITUATIONS` in `rimon.js` |

After changing a number, run `npm test`; the tests state the current values.

## Where This Differs From the Spec

The lane rules win over the spec where they disagree.

- Storage is one key, not two. Reminder state is inside the same record.
- Module names follow the lane brief (`streak.js`, `xp.js`, `gems.js`, `hearts.js`, `leagues.js`, `notify.js`).
- The currency is shown as "Gems". The spec proposed "seeds"; it is one constant to change.
- A streak repair window is built (the spec had left it out).
- Milestones are 3, 7, 14, 30, 50, 100, 365 (the spec paid only 7, 30, 100, 365).
- Friday is a free rest day for the streak, as explained above.
- League pacing: the spec's formula could not meet its own two targets (a usual week lands mid-table; about a quarter more than usual moves up), so `paceOf()` uses a curve that does. The tests check both targets against the simulator.
- Tests live in `tests/retention/`, the folder the existing runner can reach.
- `/league` and `/shop` are preview-tier routes, because two existing tests fix the reviewed first-release route count. To promote them, add `tier: 'v0'` in `router.js` and raise that count in `tests/a11y.b2.test.js` and `tests/a11y.hub.test.js`.

## Not Built

- Settings-page controls. The switches are on `#/shop` and the goal picker is in the goal card.
- Situational lines S05 and S08 are in the catalogue but nothing sends them. S05 (a Friday streak nudge) has no use while Friday is a free day; S08 (hearts full) would have to be sent on a day the learner already studied, which the "never after a session today" rule forbids. S01, S02, S03, S04, S06, S07 and S09 are wired.
- Real leagues with other learners. That needs accounts, a server and a privacy review.

## Added in the Second Pass

- **3-minute lesson.** The Home goal card has a "3-minute lesson" button that opens the learner's next lesson with `?quick=1`, which uses the app's existing short-parts player. After four parts in one sitting a "Three Minutes Done" card pays 10 XP, counts the day for the streak (it does not count as a finished lesson, so it unlocks nothing and pays no first-lesson gems) and offers "Keep going" or "Done for today"; the lesson's place is already saved by the player. A lesson of four parts or fewer simply ends with its normal end card. The number of parts is `QUICK_PARTS` in `boot.js`.
- **Rimon's bubble lines** for welcome back, goal reached, one more heart, moving up, the holiday greeting and the after-Shabbat greeting (`LINES` in `rimon.js`; the shell's Rimon shows a line sent as `detail.say`).
- **Seven-day strip** in the goal card (`weekDots` in `streak.js`).
- **Calendar fallback.** "Add a daily reminder to my calendar" on `#/shop`, and on iPhone in a browser tab the opt-in card offers it together with "How to add" to the Home Screen. The file repeats Sunday to Thursday at the learner's usual time, never Friday or Saturday (`reminderICS` in `notify.js`).
- **Situational lines S02 and S07** (the day after Yom Tov; Thursday when the move-up line is within 30 XP).
- **Browser tests**: `tests/retention/retention.browser.test.js` (advisory tier, like the repo's other browser tests). They pass locally in headless Chrome at 320, 360 and 390 px. A real 3-minute lesson was also walked by hand from the Home button to the end card: the reward panel and the reminder opt-in card appeared and XP, gems and the streak were saved.

## Added in the Third Pass

- **Streak card states.** The goal card on Home carries all seven states (`rest`, `done`, `freeze-used`, `at-risk`, `open`, `broken`, `new`) with its own line for each, and is a rest day from Friday 18:00, all Saturday, and on Yom Tov and its eve from 18:00, so it never says "at risk" then. Once a day, in the evening, Rimon looks worried about an unfinished day.
- **The app's older in-app streak banner** (`src/morning/nudge.js`, "Rimon says: Please keep your streak going") used to stay quiet on Saturday only for learners in observant mode. It is now quiet for everyone from Friday 18:00, all Saturday and on Yom Tov.
- **Fix:** the "Three Minutes Done" card was being wiped when the lesson player redrew the next part. It now sits above the lesson. This was found by clicking through a real six-part lesson, and that click-through is now a browser test.
- Checked by hand in a real lesson: two wrong first answers took hearts from 5 to 3 and the top-bar chip followed.

### Badges

The app's 25 badges (`src/awards/`) already include the streak medallions, and they still come from the streak engine; a retention milestone and its badge arrive together. No new badges were added for leagues or daily goals, because each badge needs its own medallion picture.

## Added in the Fourth Pass

- **Daily quests.** Three small goals a day on Home ("Earn 20 XP", "Review 5 old cards", "Get 5 right in a row" and so on), the same three all day, chosen on the device from a seeded shuffle. Each pays 5 gems and all three pay 10 more. None on Saturday or Yom Tov, none in calm mode, and they open after the 2nd finished lesson. Code: `quests.js`; numbers in `QUESTS` and `POOL`.
- **A first visit is left alone.** The top bar and the Home cards stay hidden until the learner has earned something (XP, a gem or a streak day), so the first screen is as simple as before. The lesson reward panel is where the system introduces itself.
- **Reminder transparency.** The shop says when Rimon usually nudges ("around 7:15 pm") and has a "Send a test reminder" button, which also rests on Shabbat and holidays.
- The Home card is headed "Daily XP Goal", because Home's own lesson card already has a "Daily goal" in minutes.
- Review round 2 fixes are listed in `REVIEW-ROUND-2.md`.

## Added in the Fifth Pass

- **Welcome back.** After 7 or more days away the learner's hearts are filled for free and Home shows a "Welcome Back" card with one small step ("Warm up with old words"). It goes away once any XP is earned that day. Code: `recap.js` (`welcomeBack`); the number of days is `RECAP.comebackDays`.
- **Weekly recap.** From Sunday, one card on Home sums up the week that just ended: XP, days studied, best day, the league result, and a bar for each day with its number. Shown once a week, never during Shabbat, never in calm mode. Code: `recap.js` (`lastWeek`, `recapDue`).
- **Settings** now links to "Streak, hearts and reminders" (`#/shop`).
- Review round 3 is recorded in `REVIEW-ROUND-3.md`.

## Added in the Sixth Pass

- **New parts introduce themselves.** The lesson end card shows a short "New for You" note the first time something opens: daily quests after the 2nd lesson, hearts after the 3rd, the practice league after the 5th. Code: `unlockedBy` in `xp.js`.
- **League line on the end card**: "Practice league: number 12 of 30 in Sprout. 9 XP to the move-up line."
- **Share a milestone.** At a streak milestone the end card has a "Share your streak" button: the phone's own share sheet, or the clipboard where there is none. Only ever from a tap.
- **A lesson pays at most twice a day**, and the same end card can no longer pay in two tabs. Re-doing one lesson over and over is practice, not a way to mint XP. Numbers: `LESSON_PAYS_PER_DAY` and `SAME_FINISH_MS` in `xp.js`.
- Review round 4 is recorded in `REVIEW-ROUND-4.md`.

## Hebrew

The ten tier names are unreviewed. See `HEBREW-REVIEW.md`.
