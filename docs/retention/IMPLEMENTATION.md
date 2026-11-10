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

- The "3-minute lesson" button and `?quick=1` lesson mode.
- Rimon's new speech-bubble lines (welcome back, one more heart, moving up). Rimon animates for each moment; the bubble text needs a small change in `src/shell/rimon-speech.js`.
- The seven-state streak card and the snowflake in the week strip. The streak line is shown inside the daily-goal card instead.
- Settings-page controls. The switches are on `#/shop` and the goal picker is in the goal card.
- The iPhone calendar-file fallback for reminders.
- Situational lines S02, S05, S07 and S08 are in the catalogue but nothing sends them yet. S01, S03, S04, S06 and S09 are wired.
- Automated browser tests for these screens. The screens were checked by hand in Chrome at 360 px (top bar, goal ring, shop purchase, league table, reward panel, zero-hearts gate, reduced motion, calm mode); the reward panel was driven with the app's own events, not a full lesson click-through.
- Real leagues with other learners. That needs accounts, a server and a privacy review.

## Hebrew

The ten tier names are unreviewed. See `HEBREW-REVIEW.md`.
