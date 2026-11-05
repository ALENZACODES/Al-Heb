# Engagement loops: ALEF against the Duolingo loop features (draft)

Status of this file: a plan and a gap list. It was written by reading ALEF's source and a small set of public Duolingo pages fetched on 2026-11-05. No learner has used ALEF. Nothing below says a loop improves retention or learning in ALEF; the only claims are about what the code does and what tests cover. Every row marked "needs human review" waits on a person.

## How to read the matrix

- "ALEF today" cites files in this repo as they were at commit `a160084`, before the loops work in `preview/loops/` (section 4).
- "Duolingo" facts are only the ones in section 6, each with its page and date. Where I could not fetch a page, the row says so. No Duolingo number is quoted from memory.
- Effort: S = under a day, M = a few days, L = a week or more, X = needs a server or content that does not exist.
- "Owner decision" means John has to choose before it can ship. "Needs review" means a Hebrew teacher, native speaker, accessibility reviewer or real-device check is still required.
- Design rules for every ALEF version: free, no ads, no paywall, nothing blocks a learner, no guilt notifications, no dark patterns, offline-first, data stays on the device, reduced motion and calm mode honoured, no flashing, screen-reader announcements, controls at least 48 px.

## 1. Matrix

| Duolingo feature (source in section 6) | ALEF today | Gap | ALEF's better version | Effort | Owner decision? | Needs review? |
|---|---|---|---|---|---|---|
| Streak: consecutive days with a lesson; Streak Freeze pauses one day; up to two equipped (a 2022 post) | Engaged-time streak: a day counts at 300 s (`src/curriculum/streak.js` `GOAL_SECONDS`, accrual in `src/morning/engage.js`); Shabbat and Yom Tov rest days with a setting; rest days the learner declares in Progress (`src/progress/store.js` `setRestDay`); a break is a projection and `best` is kept. Home and Progress show one number. Hidden in calm mode (`src/shell/comfort.js` `streakVisible`). Tests: `tests/streak.freeze.test.js`, `tests/engagement.dst.test.js` | A missed ordinary day resets the shown count to 0. No earned rest days. No one-tap repair. Copy about a break exists in views | `preview/loops/rhythm.js`: a "practice rhythm" that earns a free rest day for every 5 practice days (bank of 3), spends one automatically on a missed day, and has a free repair that restores the run after a gap. Never uses loss wording; tests scan the copy for banned words. Home's existing streak is untouched | M | Yes: should the Home streak adopt these rules, and what counts as a practice day (5 points here)? | Copy and real-phone check |
| Streak repair, paid with gems | Nothing | Duolingo's current repair rules not confirmed in my fetches (the pages I read do not mention repair) | Free repair, no currency, no timer, unlimited, recorded locally | S | Same as above | No |
| XP and weekly XP totals; XP counts toward leagues | None by design (`docs/feel/FEEL.md`: "No timer, hearts, XP or streak animation") | No running score | "Points" from real actions only (lesson 10, each review card 1 up to 20 a day, timed read 5, speaking try 1 up to 5 a day). Points never expire or drop, grant no bonus for streak length, and cannot be bought | S | Weights are a guess: owner can change `preview/loops/points.js` | No |
| Daily goal | Goal in minutes, 5 to 30, kept in `onboarding.v1.dailyGoal`, a personal target that does not touch the streak (`src/home/today.js`); cards-a-day goal in Progress (`src/progress/store.js` `setGoalTarget`) | No progress ring toward the goal; two unrelated goals already exist | A goal ring in points (10, 20, 30 or 50) with a text twin ("12 of 20 points"), no animation, and a sentence when reached. It does not replace the minutes goal | S | Merge the three goals into one? | No |
| Weekly rhythm summary | `src/progress/weekly.js` (lower-bound minutes, cards reviewed, 8-week sparkline) on the v0 Progress screen | Not tied to points or quests | A gentle weekly paragraph: days practiced, points, how it compares with the week before, no red numbers, a calm sentence for a quiet week | S | No | Copy |
| Leagues: weekly leaderboard, 10 leagues, grouped by habits and time zone (May 2023 post) | None | Needs a server and other people | Not built. If wanted: opt-in, a first name or nickname only, no ranking of strangers by default, a private group instead of a public ladder | X | Yes: a server, accounts, moderation, child safety | Legal and privacy review |
| Daily quests | None | No daily variety | Three small quests chosen from a pool by the date, completed from the day's real actions, nothing stored beyond the activity log, no reward currency, can be hidden | S | Pool wording | Copy |
| Friends Quests and Friend Streak (Sep 2022, Aug 2024 posts) | None. The only sharing is the learner-initiated progress file (`src/teacher/`) | Social features absent | Not built. If wanted: a share-a-code private pair streak with no accounts, still needs a relay | X | Yes | Legal and privacy review |
| Hearts (a heart lost per wrong exercise, practice to earn back, or gems) | None. Wrong answers repeat once; nothing is blocked (`docs/feel/FEEL.md`) | Intentionally absent | Keep absent. A wrong answer is information, not a cost | none | No | No |
| Gems and Shop | None | Intentionally absent | Keep absent. No currency, no purchase surface | none | No | No |
| Celebrations and animation (a streak-extension animation, special milestone days; a 2022 post says seeing them raised 7-day retention for new learners by 1.7%) | Text summary only (`src/curriculum/exercises.ui.js` `summaryNode`); haptics and sound hooks exist behind off-by-default settings (`src/shell/settings.js` `haptics`, `soundEffects`); no sound files exist | Nothing marks a finished lesson beyond text | `preview/loops/celebrate.js`: a short line plus points and goal progress, announced politely; one slow fade only when motion is allowed; none in calm mode or under reduced motion; no flashing; no sound unless the sound setting is on and a sound exists. Wired into the intermediate lesson summary only | S | No | Real-phone and screen-reader check |
| Notifications and reminders | Opt-in reminders that fire only while the page is open (`src/shell/notify.js`, push key empty), quiet on Shabbat and festivals; a calendar-file export (`src/curriculum/reminders.ics.js`); morning card (`src/morning/`) | No guilt notifications exist; a closed app cannot remind (no push server) | Keep opt-in. The new page sends nothing and asks for no permission | none | Push needs a server and a key | Real-device check |
| Path: ordered units with nodes | 125 core and 50 intermediate lessons (`data/curriculum/`), a syllabus screen (`src/coursemap/`), belts (`src/progress/model.js` `evaluateBelts`) | Draft content, no native review | Keep. A visual path view is possible later | M | Content review first | Yes (every Hebrew string) |
| Stories (short dialogues for reading and listening; large courses only) | Israel dialogues (`src/curriculum/dialogues.view.js`), a reader with 2 full texts with trope (`docs/STATUS.md`) | Far fewer texts; no recorded audio | More graded texts after native review | L | Yes | Yes |
| Practice hub: mistakes practice, matching (a Super subscriber feature per the Dec 2024 post) | Review queue with confusable interleaving (`src/curriculum/progress.js` `buildQueue`), weak-spot report (`src/progress/weak.js`), Word Sprint (`src/sprint/`), Spot It, ladders and fade drills | Free for everyone already; entry points are scattered | A single "practice what slipped" entry is possible later | S | No | No |
| Spaced repetition quality | Own FSRS-style scheduler with hand-chosen constants not fitted to data (`src/curriculum/srs.js` header); a faithful FSRS-6 model exists but is not wired in (`src/fsrs/fsrs6.js`, preview `#/scheduler`) | Scheduler is unvalidated; no review-accuracy readout | The progress page reports review accuracy from the cards' own counts and says what it is | S | Whether to switch the live scheduler to FSRS-6 | Needs real review data |
| Badges and achievements (Dec 2023 post: award levels, personal records) | Personal milestones: first 100 words, first prayer read, siddur coverage (`src/progress/milestones.js`, data in `data/progress/`) | Few, no personal-best records | Personal bests shown as plain text on the progress page, no rarity or scarcity | S | No | No |
| Profile and progress statistics | `src/progress/progress.view.js` (v0): path, belts, weak spots, weekly card, milestones | No calendar view, no heatmap | `/daily` page: letters known, words known, minutes, review accuracy, and a calendar heatmap with a text table alternative | M | No | Accessibility check with a real screen reader |

## 2. Where Duolingo wins today

- Course depth and polish: ALEF's 125 core and 50 intermediate lessons are draft content, 0 of 3,718 review rows reviewed (`docs/review/STATUS.md`).
- Audio: ALEF has 0 recorded clips of 24,906 listed (`docs/STATUS.md`). Duolingo's Stories and exercises include listening (Dec 2024 post).
- Art and animation: 0 generated images are approved for display in ALEF (`docs/STATUS.md`), and the new celebration is deliberately plain.
- Social: friends, leagues, friend streaks and quests need people and a server. ALEF has none.
- Scale and experimentation: Duolingo's posts describe thousands of experiments and millions of learners on long streaks. ALEF has no learners and no experiments.
- Reminders from a closed app: needs push infrastructure ALEF does not have.

## 3. Metrics where ALEF can be better, and how each is checked

These are properties of the code, not outcomes. No retention, learning or satisfaction claim is made.

| Metric | ALEF's position | How it is checked |
|---|---|---|
| Price, ads, paywall | None of the three exist in the source | search of `src/` and `docs/legal/` (not a legal review) |
| Anything that blocks a learner (hearts, timers, locked practice) | None in the new modules | tests assert every loop function returns without gating; the page has no disabled "continue" state |
| Loss-shaming copy | Banned-word scan over all new copy | `tests/loops.copy.test.js` |
| Data leaving the device | The new modules make no network request | `tests/loops.copy.test.js` scans for `fetch`, `XMLHttpRequest`, `sendBeacon`, `WebSocket` |
| Reduced motion and calm mode | The celebration returns a no-motion plan when either is on | `tests/loops.celebrate.test.js` |
| Flashing | One opacity fade at most, 0.6 s, played once; nothing blinks | code review; `tests/loops.celebrate.test.js` checks the CSS text |
| Touch targets | New buttons use the shared 48 px `--tap` variable | static check in tests; not measured on a device |
| Screen reader | Ring, heatmap and celebration have text equivalents and a polite live region | fake-DOM tests only; no real screen reader was run |
| Offline | Works from local storage with no network | modules are fetched on first visit and then cached by the service worker; not available offline before that first visit (section 5) |

## 4. What was built in this pass (preview tier)

Built and unit-tested (fake DOM and Node; 35 new tests in `tests/loops.core.test.js` and `tests/loops.page.test.js`; nothing was opened in a real browser, on a phone or with a screen reader):

| Loop | Rows above it covers | Files |
|---|---|---|
| Points, daily goal ring, weekly summary | XP, daily goal, weekly rhythm summary | `preview/loops/points.js`, `store.js`, `derive.js` |
| Forgiving rhythm: earned rest days, free repair | Streak, streak repair | `preview/loops/rhythm.js` |
| Three small daily quests | Daily quests | `preview/loops/quests.js` |
| Lesson-finished card | Celebrations | `preview/loops/celebrate.js`, `hook.js` (called from the intermediate lesson summary only) |
| Progress page with heatmap and table alternative | Statistics | `preview/loops/stats.js`, `daily.view.js`, route `/daily` |

Not built: leagues, friends, friend streaks (need a server; owner decisions 1 above), hearts and gems (rejected on purpose), push reminders, a visual path, more Stories, any change to the Home streak.

Limits you should know about:
- Reviews and minutes are lower bounds. The review store keeps only each card's latest review time, so a card reviewed on two days counts once. Lessons, timed reads and speaking tries are exact. The page says so.
- Points for reviews done in the v0 review screen appear only after `/daily` or a finished intermediate lesson reads the store; there is no hook in v0 code.
- "Known" letters and words mean answered right at least twice and not currently being relearned. Review accuracy is an upper bound, because the scheduler does not count a first wrong answer on a brand-new card as a lapse.
- Point weights, the 5-point practice day, the rest-day earning rate (every 5th day, bank of 3) and the quest pool are my guesses, not tuned on any learner.
- The rhythm is separate from the Home streak, so a learner can see two different numbers. That is owner decision 3.

## 5. Install-size note

`preview/loops/` is outside the folders the precache builder walks (`src`, `assets`, `data`), so none of its 10 files are in the first-install list. They are fetched the first time `/daily` is opened (or the first lesson summary after the hook runs) and then cached by the service worker's ordinary same-origin rule. The wiring lines (router row, menu section entry, menu string, privacy row, backup key, the one hook line) are in `src/`, so the first-install list grew by 732 bytes (4,085,501 to 4,086,233 bytes by my measurement with `computeManifest`). The first-install size test passed after `node tools/build-precache.mjs` in this checkout.

Consequence: a learner who has never opened `/daily` online will not have it offline, and "Download everything" does not list it. The hook fails silently in that case and the lesson summary is unchanged. `tools/deploy/make-dist.mjs` gets one `EXTRAS` row so the host build ships the folder; I did not run the host build. Whether to move these files into the offline download group is an owner decision (it touches the deferral list, which I did not change).

## 6. Sources fetched on 2026-11-05

- Duolingo blog, "The habit-building research behind your Duolingo streak" (31 Jan 2022): a streak counts consecutive days with a lesson; a Streak Freeze pauses a streak for one day; up to two can be equipped, a change it says raised relative daily active learners by 0.38%; a streak-extension animation raised 7-day retention of new learners by 1.7%; learners at a 7-day streak are 3.6 times as likely to finish a course; it says nothing about repair, daily goals or notifications. https://blog.duolingo.com/how-duolingo-streak-builds-habit
- Duolingo blog, "Friends Quests" (9 Sep 2022): weekly random pairing, five days, 5.6 times as likely to finish a course for learners who follow friends, opt-out in settings. https://blog.duolingo.com/friends-quests/
- Duolingo blog, "Friend Streak" (5 Aug 2024): up to five friends, each with its own streak, nudges, 22% more likely to complete the daily lesson with a shared streak (as reported there). https://blog.duolingo.com/friend-streak/
- Duolingo blog, "How Duolingo Leaderboards and Leagues Work" (3 May 2023): 10 leagues, weekly cycle, grouped by habits and time zone, opt-out by making the profile private. https://blog.duolingo.com/duolingo-leagues-leaderboards/
- Duolingo blog, "How to Earn Achievement Badges on Duolingo" (11 Dec 2023): milestone awards with levels and personal records. https://blog.duolingo.com/achievement-badges/
- Duolingo blog, "Duolingo 101" (2 Dec 2024): XP counts toward weekly leaderboards, gems buy items including streak freezes and hearts, a heart is lost per wrong exercise, Stories are short dialogues in the largest courses, Practice Hub options are for subscribers. https://blog.duolingo.com/duolingo-101-how-to-learn-a-language-on-duolingo/
- Duolingo blog, "7 ways you can switch up your practice" (16 Dec 2025): practice modes including Side Quest and Match Madness. https://blog.duolingo.com/ways-to-practice-in-duolingo/
- Duolingo blog, "No excuses: 23 tips to keep your streak alive" (19 Dec 2022): freezes and notifications mentioned; no repair, no daily goal. https://blog.duolingo.com/tips-for-maintaining-streak/
- Not confirmed: Duolingo's current streak repair rules, daily quest design, notification content and timing, and the current heart or energy rules. The pages above do not describe them, and I did not find a fetchable primary page.
- Cepeda, Pashler, Vul, Wixted and Rohrer (2006), Psychological Bulletin 132, 354-380: the study spacing that gives the best retention grows as the retention interval grows. https://www.yorku.ca/ncepeda/publications/CPVWR2006.html
- Roediger and Karpicke (2006), Psychological Science 17(3): taking a test improves later retention; on a delayed test (2 days, 1 week) prior testing beat restudying; restudying gave more confidence without better delayed retention. https://www.psychologicalscience.org/journals/psychological-science/j.1467-9280.2006.01693.x/
- Rohrer and Taylor (2007), Instructional Science 35(6), 481-498: spaced practice and mixed (shuffled) practice both beat the usual grouped format on a test a week later. https://digitalcommons.usf.edu/psy_facpub/1767/

What these support for design: short repeated sessions, retrieval over rereading, and mixing item types. They do not show that points, streaks or quests improve learning, and ALEF has no data on that.

## 7. Owner decisions raised by this file

1. Leagues, friend streaks and friends quests: a server, accounts and child-safety rules. Not built.
2. One goal or three: minutes goal (Today card), cards-a-day goal (Progress), and the new points goal.
3. Should the Home streak adopt the forgiving rules, or stay engaged-time with the new rhythm shown only on `/daily`?
4. Point weights and the quest pool wording.
5. Whether `preview/loops/` joins the offline download group (touches the deferral list).
6. Push reminders for a closed app: needs a push server and a key.
7. Whether to wire the FSRS-6 model into the live scheduler once there is review data.
