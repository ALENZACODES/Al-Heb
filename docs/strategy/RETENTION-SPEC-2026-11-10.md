# ALEF Retention Mechanics: Implementation Spec (2026-11-10)

Status: PLAN ONLY. Nothing in this document has been built or tested. It is written against `main` at commit `907caadc3`.
Audience: the engineer who builds it. Every rule, number, key, file and string is fixed here. Where a product choice was open, a default is set in section 0.3 so the build never stops for a question.

Revision: review round 4 of 5 (2026-11-10). Sections 8–11 record the review rounds: 8 (G1–G38), 9 (G39–G66), 10 (G67–G92, Fable build reconciliation and fix list F1–F24), 11 (G93–G116: merge order, Fable's second pass at `78a4f3138`, fix-list status, every default in one table, state transitions, edge cases, acceptance criteria). Where sections disagree, the highest-numbered section wins; small corrections were also made in place.

Scope: the three groups John listed.
1. Streak and loss aversion: streak, streak freezes bought with gems, 3-minute lessons.
2. Gamification and dopamine loops: XP with confetti, sound and payouts; 10-tier weekly leagues; hearts lost on mistakes and won back by practising old material.
3. Notifications: personalised timing from local history; Rimon's tone escalating from encouraging to disappointed to a playful roast.

---

## 0. Ground rules

### 0.1 What already exists (build on it, do not replace it)

| Thing | File | What it does today | How this spec uses it |
|---|---|---|---|
| Streak engine | `src/curriculum/streak.js` | Store key `streak` (v2). A day counts at 300 engaged seconds (`GOAL_SECONDS`). Shabbat and Yom Tov freeze (`freeze`, `mode`). Exports `projectStreak`, `completeDay`, `withDeclaredRest`, `weekStrip`, `dayKey`, `addDaysISO`, `isRestDay`, `restKind`, `yomTovDates` | The ONLY streak. Not edited. Purchased freezes are written into its `frozenDates` through `withDeclaredRest`. |
| Engaged-time timer | `src/morning/engage.js` | Counts seconds on learning routes; exports `isCountedRoute(hash)` | Reused to decide what counts as a session. |
| Rimon | `src/shell/rimon.js`, `rimon-model.js`, `rimon-speech.js`, `rimon-events.js`; on the overnight branch also `rimon-show.js` (`showRimon(situation)` for stills), `rimon-stage.js`, `rimon-triggers.js` (200-still trigger map, quiet days and routes) | Listens on `document` for `alef:rimon` with `detail.action`. The stage also reads `alef:rimon` and counts `correct bounce wink highfive` as right answers and `wrong sad` as wrong ones (G42). 12 drawn actions in `assets/img/rimon/`: `blink wave wink bounce laugh highfive nervous sad thinking point stretch yawn`. Aliases: `correct→bounce`, `wrong→sad`, `lesson→point`, `streak→stretch`. Under reduced motion only the speech bubble shows. | `cueRimon(moment)` (new, section 4) maps every retention moment to one of these 12 actions. It does not redefine `showRimon` (G41). No new drawings are needed for v1. |
| Lesson end card | `src/curriculum/exercises.ui.js` `summaryNode()` | Fires `alef:rimon` (highfive/bounce), fires `alef:celebrate {kind:'lesson', accuracy}` (sting sound in `src/audio/sting.js`), draws 18-piece CSS confetti. Overnight adds an inline Rimon (`rimonInline`), the live streak flame (`src/shell/flame.js` `flameCard`) and the reminder ask slot (`reminder-ask.js`) | XP payout attaches here (section 2.1). |
| Quiz answers | `src/curriculum/exercises.ui.js` line 92 on main, line 104 on overnight | `signalRimon(ok ? 'correct' : 'wrong')` | Hearts listen to this (section 2.3). |
| Reminders | `src/shell/notify.js`, `notify.view.js`, route `#/reminders`; on overnight also `rimon-reminders.js` (58 Rimon lines, `composeReminder`, send log `notify.log`) and `reminder-ask.js` (one-time ask after the first win, `notify.asked`) | Opt-in, permission only from a click, in-page `setTimeout` chain, Rimon's line chosen at fire time, wide Shabbat/chag/solemn-day quiet, night quiet 22–07, at most 1 a day and 5 a week. Store key `notify.prefs`; `normalizePrefs` DROPS unknown keys. | This IS the reminder engine. Retention adds lines, tone and timing to it (G45–G51); it does not build a second one. Retention settings that `notify.prefs` would drop live in `retention.notify.v1`. |
| Calendar | `src/curriculum/calendar.js`, `calendar.locations.js`, `reminders.ics.js` | Holidays, sunset, havdalah, `.ics` export | Quiet hours and the iPhone calendar fallback. |
| Badges | `src/awards/*` (`streak-2` … `streak-365`) | Streak medallions from the streak engine | Untouched. Gems are paid alongside them (section 1.4). |
| Preview loops | `preview/loops/*` (`loops.v1`, points, forgiving "rhythm", free repair) | Preview tier only | Untouched. XP here is a separate live system; merging the two is decision D7. |
| Comfort settings | `src/shell/comfort.js`, `settings.js` | `calmMode` (no animation, sound, streak or timer pressure), `showStreak`, `shortSession`, `soundEffects` | Every mechanic here switches off or goes quiet under `calmMode`. |
| Store | `src/store.js` | Synchronous `get/set/update/subscribe`, in-memory fallback, whole-app backup | All new state lives in two new keys through this store. |

### 0.2 Non-negotiable rules (from John, applied everywhere)

1. Jewish education first. Guilt is playful and kind, never manipulative. Nothing pushes a child. The roast tier is opt-in and adult-only (section 3.3).
2. Shabbat and chagim: no notification from Friday 18:00 to Saturday 21:00 in the learner's time zone, and none on Yom Tov (section 3.2). No copy shames anyone about religion, observance, prayer or G-d. No copy suggests learning on Shabbat.
3. Gender-neutral copy. English uses "you" and "Rimon" (no pronouns for Rimon). Hebrew addresses the learner in the plural (the existing pattern in `rimon-speech.js`) and avoids first-person Rimon verbs (Hebrew present tense marks the speaker's gender).
4. No invented Hebrew. Every new Hebrew string in this spec is tagged `[NATIVE REVIEW]`. The engineer ships it with `data-review="hebrew"` on the element and lists it in `docs/hebrew-lint/` (section 6.4).
5. No mention of AI, models or "smart" anything in learner-facing copy.
6. Logo and app icon stay the gold Aleph. Rimon never appears as the icon, the notification icon or the badge (notification `icon` stays `assets/icons/icon-192.png`).
7. Git: branch `retention/build` from `overnight/launch-ready-2026-11-10` (or from `main` once `main` contains that branch; G39), small additive commits, author John Khan, no AI attribution lines, never force-push, never merge to main, never deploy. Edits to existing files are additive (new export, new optional field, one-line hook) and are listed in section 6.2.
8. `prefers-reduced-motion: reduce` or `calmMode`: no confetti motion, no number count-up, no Rimon animation (the bubble still speaks), no sound.
9. No money. Gems, freezes and hearts can never be bought with real money, and no ads (decision D4).

### 0.3 Defaults for open product choices (the build uses these; John can flip any later)

| ID | Question | Default used |
|---|---|---|
| D1 | What completes a streak day? | Either 300 engaged seconds (unchanged) OR finishing one lesson or one quick lesson. |
| D2 | Hearts on by default? | Auto-on after the learner's 3rd finished lesson; never in calm mode; can be switched off in Settings. |
| D3 | Leagues without a server | Simulated cohort, clearly labelled as pretend players (section 2.2). |
| D4 | Real-money purchases | None, ever. |
| D5 | Roast tier | Off unless the learner picks "Playful Rimon" when opting in. Default tone is "Kind Rimon". |
| D6 | Paid streak repair (Duolingo-style) | Built and adopted in round 3 (G69): within 48 h of a break, a streak of 2+ days can be repaired for 150 gems per missed day, at most 3 days. |
| D7 | XP vs preview `loops.v1` points | Separate. `loops.v1` is not read or written. |
| D9 | Friday as a free streak day | Round 3 default: NO (G70). Saturday and Yom Tov are always free; Friday and the eve of Yom Tov are not. One constant (`STREAK.shabbatCoversFriday`) flips it if John says yes. |
| D10 | `#/league` and `#/shop` visible to all learners | Round 3 default: stay preview tier until John approves (G76). |
| D8 | Friday streak-saver nudge | Use the existing `erev-shabbat` line (Friday before 12:00 only). No other Friday nudge (round 2). |

Note for John: the repo's own competitor review (`docs/strategy/DUOLINGO-100.md`, source S9) records that Duolingo replaced Hearts with an Energy battery in July 2025. This spec builds Hearts as asked; the module is small enough to swap for an energy model later.

---

## 1. Streak and loss aversion

### 1.1 Learner-facing behaviour

A streak day is a local calendar day (device time zone, `dayKey(now)` from `streak.js`) on which the learner either reaches 300 engaged seconds (existing) or finishes one lesson / quick lesson (new, D1, via `completeDay(raw, now)`).

States shown in the Home streak line under the existing flame (G53) and on Progress, one at a time, in this order of precedence:

| State | Condition (from `projectStreak` + retention record) | English copy | Rimon |
|---|---|---|---|
| `rest` | `restToday` true (Shabbat/Yom Tov with freeze on, or declared rest) | "Shabbat Shalom. Your streak rests today too." / Yom Tov: "Chag sameach. Your streak rests today too." | none from retention (the stage's `shabbat.rest` / `streak.rest` triggers already react; G43) |
| `done` | `activeToday` | "{n} days in a row. See you tomorrow!" (n=1: "Day 1 done. See you tomorrow!") | none (already celebrated) |
| `freeze-used` | a purchased freeze was applied since the learner last saw the line | "A streak freeze covered {weekday}. Your {n}-day streak is safe. {held} left." | `wink` |
| `at-risk` | `count ≥ 1`, not active today, local time ≥ 18:00 | "Keep your {n}-day streak: one 3-minute lesson does it." | `nervous` |
| `open` | `count ≥ 1`, not active today, before 18:00 | "Keep your {n}-day streak going." | none |
| `broken` | `broken` true | "Fresh start. Your best is {best} days. Let's build again." | none from retention (stage `streak.lost` / `streak.restart`; G43) |
| `new` | `count = 0`, never had one | "Finish one 3-minute lesson to start a streak." | none |

The 7-day strip (existing `weekStrip`, shown on Progress; Home has no strip) gains one visual state: a day covered by a purchased freeze shows a snowflake (❄, `aria-label="Covered by a streak freeze"`). Shabbat/Yom Tov rest keeps its candle. A freeze day is never drawn as a failure.

`showStreak === false` or `calmMode === true`: the card shows no count, no strip and no "at risk" line, only "Next lesson". Progress data is unaffected (existing behaviour in `comfort.streakVisible`).

### 1.2 Streak freezes

- Price: 200 gems. Maximum held: 2. Bought on `#/shop` (section 2.4) or from the streak card's "Get a freeze" link (shown only when `held < 2` and balance ≥ 200).
- A freeze is used automatically, never by a tap. Nothing to equip.
- Applied during the retention rollover (1.3) for each MISSED day: a past day after `streak.last`, not today, not already frozen by the streak engine, not covered by travel grace.
- All-or-nothing: if missed days ≤ `held`, every missed day is covered and `held` drops by that number. If missed days > `held`, NO freeze is spent (no wasting freezes on a streak that breaks anyway) and the streak shows as broken.
- Freezes cannot cover a gap retroactively: a gap is evaluated once. `freezeEvaluatedThrough` (ISO) records the last day judged; days at or before it are never re-judged, so buying a freeze after a break does not repair it.
- Today is never "missed"; it stays open until local midnight.
- Freezes held at a break are kept for the next streak.

### 1.3 Rollover algorithm (runs at boot, on `visibilitychange` to visible, and at local midnight while open)

```
input: streakRaw = store.get('streak'), ret = retention record, now
today = dayKey(now)
if streakRaw.last is null → set freezeEvaluatedThrough = yesterday; stop
from = max(addDays(streakRaw.last, 1), addDays(ret.freezes.evaluatedThrough, 1))
to   = addDays(today, -1)
missed = [d in from..to where !isFrozenByEngine(d)]      // isFrozenByEngine = projectStreak semantics: (freeze && isRestDay(d, mode)) || frozenDates has d
missed = missed minus travelGrace(ret, now)                // 1.5
if missed.length == 0 → evaluatedThrough = to; stop
if missed.length <= ret.freezes.held:
    for d in missed: streakRaw = withDeclaredRest(streakRaw, d, true)
    ret.freezes.held -= missed.length
    ret.freezes.used += missed (keep last 60)
    ret.freezes.unseen = true                               // drives the freeze-used line state once
    gems ledger: no change
else: nothing spent
ret.freezes.evaluatedThrough = to
write both keys with store.update (streak first, then retention)
```

`withDeclaredRest` is a no-op on pre-v2 streak records. If `streakRaw.v !== 2`, call the existing engine's `rollover(streakRaw, now)` and store the result first so it becomes v2. This is existing API, not a change to it.

### 1.4 Gems paid by the streak

Each milestone is paid once per install, ever (round 3 adopts the built list, G68). Paid milestones are recorded in `ret.gems.paidMilestones`. A rebuilt streak that reaches a milestone again pays nothing. Checked after every `completeDay` against `projectStreak(...).count`:

| Streak reaches | Gems |
|---|---|
| 3 | 5 |
| 7 | 25 |
| 14 | 30 |
| 30 | 50 |
| 50 | 75 |
| 100 | 100 |
| 365 | 200 |

### 1.5 Time zones, travel, clocks

- Day keys always use the device's current local zone (existing `dayKey`). Store `ret.lastTz = Intl.DateTimeFormat().resolvedOptions().timeZone` at every session start.
- Travel grace: if the zone changed since the last session, any single missed day is covered free when the real elapsed time between the last session end and now is < 36 h. Covered days go to `ret.travelCovered` (keep 30) and into the streak's `frozenDates` through `withDeclaredRest`. Shown in the strip like a freeze but labelled "Travel day".
- Clock moved backwards (gap < 0): existing engine already does not punish. Retention does nothing.
- DST: all wall-clock times are built with `new Date(y, m, d, hh, mm)` in local time; never add 24 h in milliseconds to get "same time tomorrow".
- A lesson started at 23:58 and finished at 00:02 counts for the day it finished (existing `completeDay(now)` behaviour).

### 1.6 Low friction: the 3-minute short lesson

- Home's primary button reads "3-minute lesson" (`aria-label="Start a three-minute lesson"`). It opens the learner's next lesson with `?quick=1`.
- `?quick=1` (round 4, G95–G96) opens the existing short-parts player (`mountChunkedLesson`) even when the learner's short-session setting is off. After 4 parts are done in one sitting (same route, not left) a "Three Minutes Done" card pays 10 XP, completes the streak day and counts as a finished lesson, without completing the lesson; it offers "Keep going" or "Done for today". A lesson of 4 parts or fewer simply ends with its normal end card. The build never enforces a timer and never shows a countdown.
- Finishing the chunk calls `completeDay` (D1), pays XP (2.1) and fires `lesson_complete`.
- First-run: the very first quick lesson never costs hearts and never shows a league.

---

## 2. Gamification and dopamine loops

### 2.1 XP and rewards

XP only goes up. It is never spent and never removed.

| Action | XP | Cap | Event source |
|---|---|---|---|
| Finish a lesson or quick lesson | 10 | none | `alef:celebrate` `{kind:'lesson', final:true}` (G2) |
| Accuracy ≥ 0.9 on that lesson | +5 | none | same event, `accuracy` |
| Rate a review card | 1 | 20 per day | new `alef:card-rated {cardId, rating}` from `review.view.js` (G3) |
| Finish a heart-refill practice round | 5 | none | 2.3 |
| Combo inside one lesson (G72) | +2 per 5 right in a row | +6 per lesson | `alef:rimon` correct/wrong with `source:'lesson'` |
| Finish a game round with ≥ 1 star | 3 | 15 per day | existing `games/engine.js` / `arcade.js` end (`stars`) via new `alef:game-finished` event |
| Reach the daily XP goal | 0 XP, +10 gems | once per day | computed |

Daily goal: no new goal control. Home already has a daily goal in minutes (`DAILY_GOAL_KEY` / `normalizeDailyGoal` in `src/home/today.js`: 5, 10, 15, 20 or 30, default 5). The XP goal is that number × 4 (5 → 20 XP, 10 → 40, 15 → 60, 20 → 80, 30 → 120), read fresh every time it is needed. A goal ring shows "{x} of {goal} XP today" (text always beside the drawing).

Payout moment on the lesson end card, in this order (total ≤ 2.2 s, all skipped instantly on any tap):
1. t=0: existing Rimon `highfive`/`bounce`, confetti and sting already fire.
2. t=300 ms: an XP chip "+15 XP" under the cheer line. Motion: scale 0.6 → 1.0 over 250 ms, then the "today" total counts up from old to new over 600 ms (`requestAnimationFrame`). Reduced motion or calm: chip appears at full size with the final number, no count-up.
3. If the daily goal was crossed: line "Daily goal reached! +10 gems", Rimon `laugh` (queued after the cheer by the animator's priority queue).
4. If the streak grew: line "{n}-day streak!". No Rimon cue: the existing flame card lights with its own sound and Rimon stretch (G43).
5. Live region: one `role="status"` sentence that combines all of it, e.g. "Lesson finished. 15 XP. Daily goal reached, 10 gems. 4-day streak." Announced once.

Sound: the existing `alef:celebrate` sting only, and only when `soundEffects` is on and calm mode is off. No new sound files in v1.

Idempotency: every award carries an `awardId`. The lesson end card's `alef:celebrate` event gains `eventId` (section 6.2). The XP module ignores an `awardId` already in `ret.xp.recentIds` (keep 300). Re-rendering the card never pays twice.

### 2.2 Weekly leagues (10 tiers, no server)

#### Honesty first
ALEF has no accounts and no server, so there are no other real learners to rank against. v1 runs a practice league: 29 pretend players paced from the learner's own past weeks. This is said plainly on the screen, every time:

> **Practice league.** The other players are pretend, paced to your own weeks so the race is fair. Real leagues need accounts, which ALEF doesn't have yet.

The line is never hidden, shortened or moved below the fold. The pretend players have no photos (initial circles only), never send messages and never "react".

#### Tiers

| Tier | English | Hebrew [NATIVE REVIEW] | Promote | Demote |
|---|---|---|---|---|
| 1 | Seed | גַּרְעִין | top 10 | none |
| 2 | Sprout | נֶבֶט | top 7 | bottom 5 |
| 3 | Root | שֹׁרֶשׁ | top 7 | bottom 5 |
| 4 | Branch | עָנָף | top 7 | bottom 5 |
| 5 | Leaf | עָלֶה | top 7 | bottom 5 |
| 6 | Blossom | פֶּרַח | top 7 | bottom 5 |
| 7 | Fruit | פְּרִי | top 7 | bottom 5 |
| 8 | Orchard | פַּרְדֵּס | top 7 | bottom 5 |
| 9 | Crown | כֶּתֶר | top 5 | bottom 5 |
| 10 | Golden Pomegranate | רִמּוֹן זָהָב | none | bottom 5 |

Sensitivity note for the rabbi review: "Pardes" and "Keter" carry religious meaning. Safe fallbacks if either is rejected: tier 8 "Grove", tier 9 "Treetop".

#### Week
- League week = Sunday 00:00 to Friday 14:00, learner's local time. Results are final before Shabbat.
- XP earned Friday 14:00 to Saturday 23:59 is held in `league.carry` and added to the next week's total at Sunday 00:00.
- `weekId` = ISO date of that week's Sunday.
- A learner joins the week's league by earning ≥ 1 XP in it. A week with no XP has no result and does not change the tier.

#### Cohort generation (deterministic, pure)
- PRNG: mulberry32, seed = FNV-1a 32-bit hash of `installId + '|' + weekId + '|' + tier`.
- 29 players. Names: drawn without replacement from `league.names.js`: 120 gender-neutral first names plus an initial ("Noam K.", "Ariel S.", "Tal B.", "Shai R.", "Yuval M.", "Eden L.", "Lior G.", "Sasha P.", "Robin T.", "Jordan F.", "Avery H.", "Rowan D."…). No real public figures; no religious titles. The engineer writes the full list of 120; list rules: Latin letters, 3–8 letters, used as both men's and women's names in English or Israeli use.
- Baseline `B` = median weekly XP of the learner's last 4 joined weeks (from `league.history`); 120 if fewer than 2 weeks.
- Player weekly target `T_i = B × m_i × jitter`, jitter `0.9 + 0.2 × rand()`, with `m_i = paceOf(i, t)` (round 3 adopts the built curve, G71, because the earlier formula could not meet both targets): x = i/28; if x ≤ 0.5, `m = 0.35 + 0.65 × (x/0.5)`; else `m = 1 + 0.9 × ((x − 0.5)/0.5)^3 × (1 + 0.04 × (t − 1))`. The result: a learner who does their usual week lands mid-table; about 25% above their usual promotes.
- Progress through the week: `xp_i(now) = round(T_i × curve(f))`, f = elapsed fraction of the league week. `curve(f) = f` with a per-player phase: player i adds its XP in 6 daily steps (Sun–Fri) with step sizes from `rand()` normalised to sum 1. Pretend players earn nothing during Friday 18:00 to Saturday 21:00 (not inside the week anyway).
- Ranking: by XP descending. On a tie the learner ranks above the pretend player.

#### Settlement
At the first app open after the week ends: compute final ranks with f = 1, apply the promote/demote table, push `{week, tier, rank, xp, result:'up'|'stay'|'down'}` to `league.history` (keep 26), set the new tier, set `league.resultUnseen = weekId`. Gems: exactly one payout per settled week, the first that applies: tier 10 and rank ≤ 3 → 100; rank 1 → 100; promoted → 50; otherwise 0. (Section 8 G14–G16 add the curve, draw order and multi-week rules.)

#### Screens
`#/league` (route title "League"):
- Header: tier badge (gold-outlined circle with the tier's English name and, under it, the Hebrew name with `lang="he" dir="rtl"`), "Ends Friday at 2 pm" countdown in words ("2 days 5 hours left"; no ticking seconds), and the honesty line.
- Table of 30 rows: rank, initial circle, name, XP. The learner's row is highlighted with the gold outline and "You". Green band above the promotion line labelled "Moves up"; muted band below the demotion line labelled "Moves down". Bands are also written in words for colour-blind and screen-reader users.
- Results card (when `resultUnseen`): up: "You moved up to {tier}!" Rimon `highfive`, confetti; stay: "You stayed in {tier}. Steady is good." Rimon `wave`; down: "You're in {tier} this week. A fresh run starts now." Rimon `thinking` (never `sad`: demotion is not a scolding).
- Settings → "Show the practice league" (default on after the 5th finished lesson; always off in calm mode). Off = route shows one line and a switch.
- Before the 5th lesson the route shows: "Leagues open after 5 lessons." (Progressive depth rule.)

#### Minimal real backend (described, NOT built)
Only if John chooses real leagues later. Cloudflare Worker + D1 (or similar): anonymous random id, no name required (learner picks a display name from a safe list, no free text), `POST /xp {id, weekId, xp}` signed with a per-install key, cohorts of 30 assigned at Sunday 00:00 UTC by tier, `GET /league/{weekId}`. Needs a privacy review (PIPEDA; under-13 users), abuse caps (max 2,000 XP/day accepted), and a written decision from John. Out of scope for this build.

### 2.3 Hearts and mistakes (spaced repetition win-back)

- 5 hearts max. Start at 5.
- Off (infinite, no heart UI) when: calm mode; the learner switched Hearts off in Settings; fewer than 3 lessons finished (D2).
- Hearts only ever apply to answers given inside `mountQuiz` (`src/curriculum/exercises.ui.js`) on two routes: `#/learn?lesson=<id>` (without `review=1`) and `#/intermediate/:id`. Every other route, including `#/learn?review=1`, `#/morning`, `#/service`, `#/trope`, `#/torahreader`, `#/torahread*`, `#/read*`, `#/listen*`, `#/songs`, every game route, `#/lab*`, `#/firstday*`, `#/firstwin`, `#/placement`, `#/welcome`, never costs a heart and is never gated.
- A heart is lost on a wrong FIRST answer to a lesson question: event `alef:rimon` with `action:'wrong'` and `source:'lesson'` (section 6.2 adds `source`). An `alef:rimon` event without `source` is ignored by hearts (games send these). A retry of the same question that is wrong again does not cost another heart (identity rule: section 8 G5).
- Hearts never stop a lesson in progress. At 0 the current lesson still finishes and pays XP.
- At 0, starting a NEW lesson is gated. The end card's "Next lesson" button is replaced by:
  - Primary: "Practise to earn a heart" → `#/learn?review=1&refill=1`
  - Secondary: "Next heart in {h} h {m} min" (disabled text, updates each minute)
  - Tertiary (only if balance ≥ 350): "Refill all hearts for 350 gems"
  - Line: "Review is always open. Practising old words is how memory sticks."
- Win back by practising (round 3, G74): every 5 review ratings anywhere in review (`#/learn?review=1`, and `#/learn?review=1&refill=1` which is the same queue) give +1 heart; if 4 or more of those 5 were rated Good or Easy, also +5 XP. Leaving part-way keeps the count toward the next 5.
- Time refill: +1 heart per 4 hours since `hearts.lastRefillAt`, computed lazily on read, capped at 5.
- Reading, prayer, Torah, songs, games: never cost hearts, never gated.
- Header chip (lesson pages only, when hearts are on): "♥ 4" with `aria-label="4 of 5 hearts"`.

| Moment | Copy | Rimon |
|---|---|---|
| First heart lost in a session | "Oops, one heart. You've got this." | `nervous` |
| Down to 1 heart | "One heart left. Take your time." | `thinking` |
| 0 hearts (end card) | "Out of hearts for now. Practise a few old words to earn one back." | `sad` then `point` |
| Heart won back | "+1 heart! Memory, meet muscle." | `bounce` |
| Refill with gems | "Hearts full. Off you go!" | `highfive` |

### 2.4 Gems

Name: "Gems" (round 3, G67: John's brief says "Streak Freezes bought with virtual gems"; the built constant is `CURRENCY` in `src/retention/gems.js`). No Hebrew label in v1. Icon: a small gem glyph drawn in CSS (no new image required).

Earned only, never bought:

| Source | Gems |
|---|---|
| Daily XP goal reached | 10 |
| Lesson with accuracy ≥ 0.9 | 2 |
| Streak 7 / 30 / 100 / 365 | 25 / 50 / 100 / 200 |
| League promotion / rank 1 / top 3 in tier 10 | 50 / 100 / 100 |
| First lesson ever | 50 (so a freeze is reachable in the first week) |

Spent on (`#/shop`, route title "Shop"):

| Item | Price | Limit |
|---|---|---|
| Streak freeze | 200 | hold 2 |
| Refill all hearts | 350 | only when hearts < 5 and hearts are on |

`#/shop` shows balance, the two items with plain-language effects ("Covers one missed day automatically"), and the last 10 ledger lines ("+10 Daily goal, Tuesday"). Buying asks once: "Spend 200 gems on a streak freeze?" with "Yes, buy it" / "Cancel". On buy: Rimon `wink`, line "Freeze ready. Rimon's keeping it cold."

---

## 3. Notifications and Rimon's tone

Round 3 note (G80): the sender is retention's scheduler (`src/retention/notify.js`). Wherever 3.1–3.5 say "the existing engine", "`composeReminder`" or "`armFromPrefs`", read: retention's scheduler, gated also by the overnight `isRestTime` and night quiet, with the overnight `reminder-ask.js` card as the only ask. Retention's own 08:00–21:00 window applies too (G79).

### 3.1 Opt-in (only after the first win)

The overnight branch already has the ask: `src/shell/reminder-ask.js`, shown once in the end card's `.alef-remind-slot` after the first lesson win, answer kept in `notify.asked`, permission requested only from the Yes click, never shown when unsupported, already decided or already enabled. Retention keeps all of that (ask once, never twice) and adds, without changing the existing title, body or buttons:
- A tone choice under the body, radio buttons, default Kind: "Kind Rimon: gentle reminders" / "Playful Rimon: gentle, then teasing jokes (for adults)". The choice is saved to `retention.notify.v1.tone` when Yes is pressed. If the learner presses No, nothing is saved.
- iPhone in a Safari tab (`status().ios && !status().standalone`, where `shouldAsk` returns false today): instead of no card, one card titled "Reminders on iPhone" with "Add ALEF to your Home Screen to get Rimon's reminders, or add a daily reminder to your calendar." and buttons "How to add" (`#/install`) and "Add to calendar" (the `.ics` of G32). Shown once; the answer is written to `notify.asked` as `{at, answer:'ios-card'}`.
- Calm mode: no card (existing card has no calm check; add one).
- Rimon `point` cue when the card appears (section 4).

### 3.2 Quiet hours (checked before every send, in the learner's zone)

Retention adds no quiet-hour logic of its own. The existing `composeReminder` (`rimon-reminders.js`) already blocks, and stays the single gate:
1. Without a city: Friday 12:00 through Saturday 23:59 local, every major chag day (traditional mode, so second days count), and from 12:00 on the eve of one. This is wider than John's Friday 18:00 to Saturday 21:00 rule, so that rule is always met.
2. With a city: the exact candle-lighting to havdalah window from `notify.js`, in addition to rule 1.
3. Solemn days: Yom HaShoah, Yom HaZikaron, Tisha B'Av (no reminders at all).
4. Night quiet `notify.prefs.quietFrom`–`quietTo`, default 22:00–07:00, editable on `#/reminders`.
5. Already studied today (streak `activeToday`), except milestone lines.
6. Frequency cap (G46).
Retention adds two checks before calling it: calm mode on → no reminder; `retention.notify.v1.stopped` → no reminder.

The learner's zone is the device zone. Copy rule: no message suggests studying during Shabbat or a chag; greetings for them come only from the existing `after-rest`, `holiday` and `erev-*` lines.

### 3.3 Escalation ladder

`daysAway` = the existing `daysAway()` in `src/home/today.js` (local days since the last streak day or card review). Kinds come from the existing `kindFor`, with retention choosing the kind first only in the cases below (passed as `state.kind`, G45):

| daysAway | Kind Rimon | Playful Rimon |
|---|---|---|
| 0 | existing: milestone, holiday, streak-risk, welcome, daily | same |
| 1–2 | existing: comeback-1 or streak-risk or daily (encourage) | same |
| 3–4 | existing: comeback-3 (disappointed) | same |
| 5–6 | comeback-3 | `roast` |
| 7–13 | comeback-7 (existing cap: one every 3 days) | alternate `roast` / comeback-7, starting with `roast` |
| ≥ 14 | `final` once, then `stopped = true` | same |

Holiday, after-rest and milestone lines keep priority over this table (existing `kindFor` order). Returning (any streak day) clears `stopped`, and the next in-app visit shows the welcome-back cue.

Caps (existing `underCap`, unchanged): at most 1 a day, `perWeek` (default 5) a week, every 3 days from 7 days away, weekly from 14, silent from 45. The `final` stop is stricter and wins.

Kids and safety: `roast` lines are only picked when `tone === 'playful'`. Roasts tease Rimon's own drama, never the learner's intelligence, body, family, faith or worth.

### 3.4 Timing from local history

The existing scheduler fires at `notify.prefs.hour:minute` on `notify.prefs.days`. `reminder-ask.js` sets the hour from the time of the first win (clamped 08–20). Retention personalises it:
- Session log: `retention.v1.sessions` (last 60 `{s, e}`); a session starts at the first interaction on a route where `isCountedRoute(hash)` is true and ends after 30 minutes without one or on page hide.
- `typicalMinute()`: as before (weighted half-hour buckets over 28 days; 19:00 with no sessions; last session start with fewer than 3).
- After each session ends, if `retention.notify.v1.autoTime` is true, set `notify.prefs.hour/minute` to `typicalMinute()` rounded to the nearest 15 minutes, clamped to at least 30 minutes after `quietTo` and at least 30 minutes before `quietFrom`, then call the existing `armFromPrefs(ctx)`.
- `autoTime` starts true. It becomes false when the learner changes the time on `#/reminders`, detected as: stored `notify.prefs` hour/minute differ from `retention.notify.v1.lastAuto` (the last value retention wrote). It never turns back on by itself; `#/reminders` gets a "Match my usual study time" switch that sets it true.
- The earlier "last session + 23 h 30 min" rule is dropped: the existing scheduler fires once a day at a fixed time, and the typical time already sits about a day after the usual session.

### 3.5 Delivery (what a static PWA can and cannot do)

1. **App open**: the existing `notify.js` chain (fires only while the tab is open), unchanged.
2. **App closed, Chromium, installed**: Periodic Background Sync, as before (tag `alef-rimon`, `minInterval` 12 h, plan in Cache Storage `alef-retention` / `/__alef/rimon-plan.json`). The page writes 14 entries, one per day at `notify.prefs.hour:minute`, each message chosen by calling `composeReminder` with the state projected for that day assuming no study (`daysAway` + k, streak broken from the first missed non-rest day), so the service worker never composes anything (G19). Entries that `composeReminder` returns null for are left out. The worker shows the first entry with `fireAt ≤ now < fireAt + 6 h` whose day has no session (`lastSessionAt`), then removes it; the page copies removed ids into `notify.log` at its next boot (G18).
3. **App closed elsewhere (iPhone, Firefox, desktop Safari)**: no reminder. `#/reminders` already says reminders need the app open; add "For a reminder that always arrives, add one to your calendar." with the calendar button.
4. **Web Push**: needs a server; not built.

`sw.js` also needs a `notificationclick` handler (none exists on main or overnight): close the notification, focus an existing ALEF window or open one, navigate to `data.route` (default `#/learn`).

Notification fields: as `notify.showNow` builds them today (title and body from the line, `icon` = gold Aleph `assets/icons/icon-192.png`), with `tag: 'alef-rimon'`.

### 3.6 Message catalogue (70 lines added to the existing 58)

These lines are added to `LINES` in `src/shell/rimon-reminders.js`. That file uses `{id, kind, title, body}`; for every line below the title is "Rimon" unless given, and the id is the lower-case code (E01 → `e01`). Kind mapping: E08 and E21 (they use `{n}`) → `streak-risk`; the other E lines → `daily`; D01–D10 → `comeback-3`; D11–D20 → `comeback-7`; R01–R20 → new kind `roast`. Bodies are English only. No pronouns for Rimon. `{n}` = streak days. `{next}` is not supported by `pickLine`, so D09 reads "Rimon put a note on your next lesson: saved for you." (G60).

**Encourage (E01–E24)**
- E01 Three minutes. One lesson. Rimon's already stretching.
- E02 Your next Hebrew letter is waiting to meet you.
- E03 Rimon saved you a seat. It's the comfy one.
- E04 Quick lesson? Rimon promises it's shorter than boiling a kettle.
- E05 Today's Hebrew is ready when you are.
- E06 Small steps make a reader. Ready for today's?
- E07 Rimon polished the letters. They're very shiny.
- E08 One lesson keeps your {n}-day streak glowing.
- E09 Aleph, Bet, and you. Classic trio.
- E10 Rimon's ready to cheer. Give Rimon a reason?
- E11 Your brain likes a little Hebrew around now.
- E12 A few friendly questions. That's it. Go!
- E13 Rimon did the warm-up. Your turn for the fun part.
- E14 Pick up right where you left off. Rimon kept your place.
- E15 A tiny lesson now means a happy Rimon later.
- E16 A pomegranate has a lot of seeds. Rimon is saving one for you.
- E17 Hebrew o'clock! (Rimon made that up. It's still true.)
- E18 You plus 3 minutes = one more word you can read.
- E19 Today's word is a good one. Rimon peeked.
- E20 Rimon's confetti is loaded. Just saying.
- E21 Keep the {n}-day streak rolling. One quick lesson does it.
- E22 Your review pile is small and friendly today.
- E23 Ready to read something new? Rimon is.
- E24 Rimon's doing a little dance. It's better with you here.

**Disappointed, gently (D01–D20)**
- D01 Rimon checked the door. Twice. No pressure.
- D02 The letters asked about you. Rimon said you're busy being great.
- D03 Rimon is sitting very still, hoping you'll stop by.
- D04 It's quiet here. Even the vowels miss you.
- D05 Rimon made tea for two. One cup is getting cold.
- D06 Rimon is practising the welcome-back dance. Just in case.
- D07 Rimon is fine. Totally fine. Mostly fine.
- D08 Your Hebrew misses you a little. Rimon misses you a lot.
- D09 Rimon put a note on "{next}": saved for you.
- D10 The Bet is leaning on the Aleph, waiting. Very dramatic.
- D11 Rimon's leaves are a little droopy today. A lesson might help.
- D12 Rimon counted the days, then stopped counting. Come say hi?
- D13 Rimon isn't sad. Rimon is just… pomegranate-pensive.
- D14 One quick lesson and Rimon perks right back up.
- D15 Rimon reread your last lesson alone. It wasn't the same.
- D16 The Shin has three branches, and all three are pointing at the door.
- D17 Rimon kept your place. Come back whenever you're ready.
- D18 Rimon is sighing in a very small, very round way.
- D19 Rimon wrote you a letter. It's an Aleph. It means hi.
- D20 No guilt. Just a wave from a hopeful fruit.

**Roast, Playful Rimon only (R01–R20)**
- R01 Rimon has stared at the door so long it's basically furniture now.
- R02 These reminders aren't working. Rimon will try interpretive dance.
- R03 Rimon is now emotionally ripe. Please come pick a lesson.
- R04 Breaking news: local pomegranate refuses to give up on you.
- R05 Rimon practised a big welcome speech. The audience so far: one spoon.
- R06 Rimon taught the vowels a card game. The Kamatz keeps winning. Help.
- R07 Rimon's seeds have formed a search party.
- R08 Rimon is now reading your lessons out loud to a houseplant. The houseplant is doing great.
- R09 Rimon's leaves are being very dramatic. Fix it with 3 minutes?
- R10 Rimon tried learning Hebrew without you. It went badly. Rimon is a fruit.
- R11 The Final Mem keeps asking if this is the end. Tell it no.
- R12 Rimon has rehearsed this welcome-back speech 47 times.
- R13 Good news: your Hebrew hasn't packed its bags. Yet.
- R14 Rimon is not crying. Pomegranates just get juicy sometimes.
- R15 Rimon wrote a sad song called "Lesson Without You." It's one note long.
- R16 Rimon started your fan club. Members: one fruit.
- R17 Even the silent Aleph is louder than this. Come back?
- R18 Rimon is worried the confetti will expire. Can confetti expire? Please check.
- R19 Rimon put all 22 letters in order. They already were. Bored now.
- R20 Last joke, Rimon promises: 3 minutes, one lesson, big hug.

**Situational (new kinds; S01, S02 and S05 are dropped because the existing `after-rest` and `erev-shabbat` lines already cover them)**
- S03 → kind `freeze-used`, id `s103`: Your streak freeze covered yesterday. Your {n}-day streak is safe.
- S04 → kind `streak-risk`, id `s104`: Your {n}-day streak would love one lesson before bed.
- S06 → kind `league`, id `l01`: Your practice league week is done. Come see where you landed.
- S07 → kind `league`, id `l02`: You're close to moving up in your practice league.
- S08 → kind `hearts-full`, id `hf1`: Your hearts are full. Ready for a new lesson?
- S09 → kind `final`, id `f01`: Rimon will stop the reminders now. The door is always open. Shalom!

When each applies: `freeze-used` when the plan day is the first after a day a held freeze will cover; `league` l01 on Friday after 14:00 when the week was joined, l02 on Thursday when within 30 XP of the promotion line; `hearts-full` on the day hearts refill from 0; `final` as in 3.3. These are passed as `state.kind` and still go through every quiet rule and cap.

**In-app bubble pairs (new)**, same shape as `rimon-speech.js`:

| id | he [NATIVE REVIEW] | en |
|---|---|---|
| `goal` | כָּל הַכָּבוֹד! (existing) | GOAL REACHED! |
| `heartBack` | עוֹד לֵב! | ONE MORE HEART! |
| `moveUp` | עוֹלִים שָׁלָב! | MOVING UP! |

(Round 1 flagged `rimon-speech.js` `again` for a masculine verb. Overnight already changed it to a plural, neutral line, so the flag is withdrawn; G61.)

---

## 4. Rimon: `cueRimon(moment)` and the event contract

File `src/retention/rimon.js` (built; round 3 F8 renames its export to `cueRimon`). It does not define or export `showRimon` or `SITUATIONS` (both already exist in `src/shell/rimon-show.js` with a different meaning: stills).

```js
export const MOMENTS = Object.freeze({
  daily_goal:        { action: 'laugh',   line: 'goal' },
  streak_at_risk:    { action: 'nervous' },
  freeze_used:       { action: 'wink',    still: 'streak' },
  freeze_bought:     { action: 'wink' },
  heart_lost:        { action: 'nervous' },
  heart_last:        { action: 'thinking' },
  hearts_empty:      { action: 'sad', then: 'point' },
  heart_back:        { action: 'bounce',  line: 'heartBack' },
  hearts_refilled:   { action: 'highfive' },
  league_up:         { action: 'highfive', line: 'moveUp', still: 'award', confetti: true },
  league_stay:       { action: 'wave' },
  league_down:       { action: 'thinking' },
  notify_optin:      { action: 'point' },
  streak_repaired:   { action: 'highfive' },
});
export function cueRimon(moment, data = {}, doc = globalThis.document) { … }
```

Moments that already have a Rimon reaction on overnight are NOT cued again (G43): lesson complete (end card), streak day and milestones, streak saved, streak restart, the minutes-goal flame (stage store triggers and `flameCard`; the XP goal is retention's own and keeps `daily_goal`), welcome back, Shabbat, chag and Shavua tov greetings (stage greeting triggers).

Behaviour:
- Unknown moment → returns false, nothing dispatched.
- If `document.body` has `data-rimon-quiet` (stage quiet day or quiet route) or the store has `rimon.dismissed === true`: returns false, nothing dispatched.
- Dispatches `new CustomEvent('alef:rimon', {bubbles: true, detail: {action, moment, line, cue: true, ...data}})` on `document`. `cue: true` tells the stage not to count it as an answer (G42).
- `then`: the second action 1500 ms later, cancelled by a newer cue.
- `still`: also calls the existing `showRimon(still, {store, settings})` from `rimon-show.js` (it already handles reduced motion, calm mode, missing files).
- `confetti: true`: dispatches `alef:celebrate {kind: moment}`.
- Reduced motion: `rimon.js` already speaks without animating.

`rimon.js` change (additive): if `detail.line` is a key of the new `LINES` export in `rimon-speech.js` (or of the existing `MESSAGES`/`SHABBAT`), the bubble says that pair instead of the action's default. `mountSpeechBubble` gains `sayLine(pair)` if not already present. `rimon-stage.js` change (additive): first line of `onRimon`: `if (e?.detail?.cue) { activity(); return; }`.

Moment-to-caller table:

| Moment | Caller |
|---|---|
| `daily_goal` | `hooks.js` after an XP award crosses the goal |
| `streak_at_risk` | Home streak line when it renders the `at-risk` state (once per local day) |
| `freeze_used` | Home streak line when it renders the `freeze-used` state |
| `freeze_bought` | `shop.view.js` |
| `heart_lost`, `heart_last` | `hooks.js` on a counted wrong answer |
| `hearts_empty` | `hearts.view.js` |
| `heart_back` | `boot.js` `reviewRated` when the 5th rating returns a heart |
| `streak_repaired` | `shop.view.js` after a repair |
| `hearts_refilled` | `shop.view.js` |
| `league_up/stay/down` | `league.view.js` results card |
| `notify_optin` | the `reminder-ask.js` card (3.1) |

No two cues within 400 ms (`rimon-cue.js` queues them).

---

## 5. Data model

### 5.1 Key `retention.v1` (new)

```jsonc
{
  "v": 1,
  "installId": "uuid",                       // crypto.randomUUID(); fallback: 16 random hex from crypto.getRandomValues
  "createdAt": "YYYY-MM-DD",
  "lessonsFinished": 0,                      // drives D2, opt-in timing, league unlock; first created = number of keys in curriculum.progress.completed (G11)
  "xp": { "total": 0, "days": { "YYYY-MM-DD": 0 }, "reviewDays": { "YYYY-MM-DD": 0 }, "gameDays": { "YYYY-MM-DD": 0 }, "recentIds": [] },  // *Days keep 120 (cap counters); recentIds keep 300
  "gems": { "balance": 0, "ledger": [ { "at": 0, "d": 0, "why": "goal" } ], "paidMilestones": [], "goalPaidOn": null },  // ledger keep 100; goalPaidOn = ISO day the goal gems were last paid
  "freezes": { "held": 0, "used": [], "evaluatedThrough": null, "unseen": false },                   // used keep 60
  "travelCovered": [],                                                                                 // keep 30
  "hearts": { "n": 5, "lastRefillAt": 0, "quizId": null, "lostIn": [] },        // on/off lives in settings only; lostIn = qIndex list for quizId (G5)
  "league": { "tier": 1, "weekId": null, "weekXp": 0, "carry": 0, "joined": false, "unlockedAt": null,  // on/off lives in settings only
              "history": [ { "week": "", "tier": 1, "rank": 0, "xp": 0, "result": "stay" } ], "resultUnseen": null },  // history keep 26
  "sessions": [ { "s": 0, "e": 0 } ],                                                                  // keep 60
  "lastTz": "America/Toronto"
}
```

`why` values: `goal`, `accuracy`, `streak7|30|100|365`, `promote`, `rank1`, `top3`, `first`, `buy-freeze`, `buy-hearts`.

### 5.2 Key `retention.notify.v1` (new)

```jsonc
{ "v": 1,
  "tone": "kind",          // "kind" | "playful"; set by the 3.1 card or #/reminders
  "autoTime": true,        // 3.4
  "lastAuto": null,        // {hour, minute} retention last wrote into notify.prefs
  "finalSentAt": null,     // ms; set when the `final` line is sent
  "stopped": false,        // true after `final`, cleared on the next streak day
  "nextRoast": true,       // 7–13 days away, Playful: which of roast / comeback-7 is next
  "periodicSync": false }
```

The send log is the existing `notify.log` (`[{at, id}]`, last 30). Whether the ask was shown is the existing `notify.asked`. Retention never writes either except: `notify.log` gets entries for sends made by the service worker (G18), written in the same shape.

### 5.3 Rules for both keys

- Read through `normalize*()` that never throws; unknown fields are KEPT (forward compatibility), bad fields are reset to defaults one by one, arrays are trimmed to their caps.
- `v` greater than 1: read what is understood, never write (the newer app owns the record), log once to the console.
- Corrupt (not an object): defaults are used; the raw value is copied once to `retention.v1.corrupt` (or `retention.notify.v1.corrupt`) before overwriting, so nothing is lost silently.
- All writes use `store.update(key, fn)` (multi-tab safe per `src/store.js`).
- Both keys are included in the whole-app backup automatically (store export covers all ALEF keys); add both to the backup round-trip test.
- Migration path for later: `migrate(raw)` switch on `v`; v1 has no predecessors.
- `streak` (existing) is written only through `withDeclaredRest`, `rollover` and `completeDay`.

### 5.4 Settings keys (added to `settings.js` validated list, additive)

| key | type | default | meaning |
|---|---|---|---|
| (removed in round 4, G101) `hearts` | auto, on, off | auto | D2. `auto` = on from the 3rd finished lesson. `on` before lesson 3 still waits for lesson 3. |
| (removed in round 4, G101) `leagues` | auto, on, off | auto | `auto` = on from the 5th finished lesson. `off` stops tracking; `unlockedAt` is kept. |

No `dailyGoalXp` key: the XP goal is derived from the existing minutes goal (2.1). Settings is the only place hearts and leagues are switched; `retention.v1` holds no enabled flags.

---

## 6. Build plan

### 6.1 New files, in build order (one commit each)

| # | File | Contents | Tests (file) |
|---|---|---|---|
| 1 | `src/retention/clock.js` | `weekIdOf(now)`, `leagueEnd(weekId)`, `localAt(dateISO, minute)`, `minuteOfDay(ms)`, re-exports `dayKey`, `addDaysISO` from `streak.js` | `tests/retention.clock.test.js` |
| 2 | (removed in round 2) | quiet hours are the existing `composeReminder` gate (3.2) | none |
| 3 | `src/retention/state.js` | keys, defaults, `normalizeRetention`, `normalizeNotify`, `load(store)`, `save(store, fn)` | `tests/retention.state.test.js` |
| 4 | `src/retention/xp.js` | `award(rec, {awardId, kind, amount, now})`, caps, `todayXp`, `goalCrossed` | `tests/retention.xp.test.js` |
| 5 | `src/retention/gems.js` | `earn`, `spend` (returns `{ok, reason}`), prices, milestone payouts | `tests/retention.gems.test.js` |
| 6 | `src/retention/freeze.js` | `buyFreeze`, `applyMissedDays(streakRaw, ret, now)` (1.3), `travelGrace` (1.5) | `tests/retention.freeze.test.js` |
| 7 | `src/retention/hearts.js` | `heartsOn(ret, settings, route)`, `loseHeart`, `refillByTime`, `refillByPractice`, `refillByGems`, `canStartLesson` | `tests/retention.hearts.test.js` |
| 8 | `src/retention/league.names.js` | 120 names | (covered by 9) |
| 9 | `src/retention/league.sim.js` | `mulberry32`, `fnv1a`, `cohort(installId, weekId, tier, baseline)`, `standings(cohort, learnerXp, now)`, `settle(ret, now)` | `tests/retention.league.test.js` |
| 10 | `src/retention/tone.js` | `kindFor3_3({daysAway, tone, nextRoast, stopped, special})` returns a kind or null (3.3); the 70 lines themselves are added to `rimon-reminders.js` (6.2) | `tests/retention.tone.test.js` |
| 11 | `src/retention/timing.js` | `logSession`, `typicalMinute`, `autoTimeUpdate(prefs, ret, notifyRet)` (3.4); `daysAway` comes from `src/home/today.js` | `tests/retention.timing.test.js` |
| 12 | `src/retention/rimon-cue.js` | section 4 | `tests/retention.rimon.test.js` |
| 13 | `src/retention/plan.js` | 14-day Cache Storage plan writer using `composeReminder`, periodic sync registration (3.5); no in-page timer (the existing `notify.js` is that) | `tests/retention.plan.test.js` |
| 14 | `src/retention/hooks.js` | listeners: `alef:celebrate`, `alef:rimon` (source lesson/review), `alef:game-finished`, `hashchange`/`visibilitychange` sessions; calls 4–13 | `tests/retention.hooks.test.js` |
| 15 | `src/retention/boot.js` | `armRetention(ctx)`: rollover, settle league, once-per-day greeting, arm scheduler | (covered by e2e) |
| 16 | `src/retention/retention.css` | chip, ring, league table, gem glyph; `@media (prefers-reduced-motion: reduce)` and `[data-calm]` turn off every animation | a11y browser test |
| 17 | `src/retention/xp-payout.js` | end-card payout node (2.1) | `tests/retention.payout.test.js` |
| 18 | `src/retention/streak-line.js` | one status line with the 1.1 states, rendered under the existing Home flame (`.alef-streak-flame`, `data-streak-slot="home"`) plus the gems/league row (G53) | `tests/retention.streakline.test.js` |
| 19 | `src/retention/hearts.view.js` | chip + 0-heart end-card block | `tests/retention.heartsview.test.js` |
| 20 | (none) | the opt-in is the existing `reminder-ask.js`, extended in 6.2 | `tests/retention.optin.test.js` |
| 21 | `src/retention/league.view.js` | `#/league` | `tests/retention.leagueview.test.js` |
| 22 | `src/retention/shop.view.js` | `#/shop` | `tests/retention.shopview.test.js` |
| 23 | `docs/retention/README.md` | what is built, what is pretend, what each key holds | none |

### 6.2 Additive edits to existing files (one commit each, after 6.1)

| File | Edit |
|---|---|
| `src/curriculum/exercises.ui.js` line 92 (main) / 104 (overnight) | `signalRimon(ok ? 'correct' : 'wrong', { source: /[?&]review=1/.test(location.hash) ? 'review' : 'lesson', questionId: <the question's id or its index in the quiz> })` (keep the same actions; check which id field the question objects carry before writing this line) |
| `src/curriculum/exercises.ui.js` `mountQuiz` | at mount dispatch `alef:quiz-start {quizId}` (`quizId` = random 12-char id); include `quizId` and `qIndex` in the line-92 `signalRimon` detail (G5) |
| `src/curriculum/exercises.ui.js` `summaryNode` | `d.final` (optional, default `true`) and `d.quick` (optional, default `false`) are passed through; add to the `alef:celebrate` detail: `eventId`, `final`, `quick`, `answered`, `right`, `ms: d.ms`, `route: location.hash`; append `xpPayoutNode(...)` (the opt-in stays the existing `.alef-remind-slot`) via a lazy import that fails silently (same pattern as `preview/loops/hook.js`); hide "Next lesson" when `!canStartLesson` and show the hearts block instead |
| `src/curriculum/intermediate.view.js` line 365 | pass `final: all` to `summaryNode` (G2) |
| `src/curriculum/review.view.js` | after a successful `rateCard` in `rate(n)` dispatch `alef:card-rated {cardId, rating:n}`; when `?refill=1`, build the queue with `limit: 5` instead of 20 and, when the queue empties, dispatch `alef:review-finished {refill:true, ratings:[…]}` (G3, G4) |
| `src/curriculum/lesson.view.js`, `src/curriculum/intermediate.view.js` | on mount, if `canStartLesson` is false and the lesson has no resume record, render the hearts block instead of the lesson (G7); `lesson.view.js` also honours `?short=1` (G8) |
| `src/curriculum/lesson.parts.js` | dispatch `alef:lesson-part {lessonId, part, of}` when a part changes (built in 78a4f3138); retention counts done parts (G96, F26) |
| `src/shell/notify.view.js` | tone radio (Off is the existing switch; Kind / Playful (for adults)), "Match my usual study time" switch (3.4), calendar line (3.5) |
| `src/shell/rimon-reminders.js` | add the 70 lines (3.6); `kindFor`: first line `if (state.kind) return state.kind;`; `pickLine`: drop ids in `state.excludeIds`; `composeReminder`: nothing else changes (G45, G52) |
| `src/shell/notify.js` `armFromPrefs` show path | before `R.composeReminder`, stop if calm mode or `stopped`; add `kind` from `tone.js` and `excludeIds` (G52) to the state; after a `final` send set `stopped` (G46) |
| `src/shell/reminder-ask.js` | tone radio, iPhone calendar card, calm-mode check, `notify_optin` cue (3.1) |
| `src/shell/rimon-stage.js` | `cue` guard in `onRimon` (G42) |
| `src/shell/flame.js` | not-lit sub line ends with " Or finish one lesson." (G54) |
| `src/shell/privacy.view.js` | one sentence naming the two new keys (G33) |
| `src/games/engine.js`, `src/games/arcade.js` | at round end, dispatch `alef:game-finished {stars, game}` (one line each) |
| `src/shell/rimon.js` | `detail.line` support (section 4) |
| `src/shell/rimon-speech.js` | `export const LINES` (3.6 table) and `sayLine` |
| `src/shell/settings.js` | three keys (5.4) |
| `src/shell/router.js` | `{ name:'league', pattern:'/league', module:'../retention/league.view.js', title:'League', owner:'retention', optional:true, group:'learn', quick:'nav.league' }` and the same for `gems` (`title:'Gems'`) |
| `src/shell/nav.strings.js` | `nav.league: 'League'`, `nav.route.shop: 'Shop'` |
| `src/shell/boot-hooks.js` | `export const armRetention = (ctx) => import('../retention/boot.js').then((m) => m.armRetention(ctx)).catch(() => {});` |
| `src/app.js` `boot()` | one line next to the existing hooks: `import('./shell/boot-hooks.js').then((m) => m.armRetention(ctxBase)).catch(() => {});` |
| `src/shell/home.view.js` (overnight) | after the existing `.alef-streak-flame` is appended, mount `streak-line.js` under it; if the import fails, Home is unchanged (G53) |
| `src/shell/settings.view.js` | Daily goal, Hearts, Practice league, Rimon reminders (tone, on/off, calendar button) |
| `sw.js` | `periodicsync` and `notificationclick` handlers (3.5); bump the cache version |
| `precache-manifest.js` | regenerate with `npm run precache` |

Every edit is wrapped so a failure in retention code cannot break lessons (try/catch or `.catch(() => {})`, the same style the repo already uses for Rimon and loops).

### 6.3 Acceptance tests

Unit tests run under `npm test` (node:test, no DOM); every pure module takes `now` as an argument. All times below are America/Toronto unless stated.

**Streak and freezes (`retention.freeze.test.js`)**
1. Streak 10, last = Mon, today = Wed, 1 freeze held → Tue covered, held 0, count still 10, `used` has Tue, `unseen` true.
2. Same with 0 held → broken (projectStreak count 0), nothing spent.
3. Gap of 2 missed days, 1 held → nothing spent, broken.
4. Gap of 2, 2 held → both covered, held 0.
5. Missed Saturday with Shabbat freeze on → no freeze spent (engine already froze it).
6. Missed Saturday with Shabbat freeze off → a freeze is spent.
7. Rosh Hashanah 2-day gap, reform mode, freeze on → none spent.
8. After a break, buying a freeze then re-running rollover does not repair (`evaluatedThrough`).
9. Rollover is idempotent: run twice → same records.
10. Clock moved back one day → nothing spent, nothing broken.
11. Zone change Toronto → Tel Aviv, 20 h real elapsed, one calendar day skipped → travel grace covers it, no freeze spent.
12. Zone change with 40 h elapsed → no travel grace.
13. Pre-v2 streak record is rolled over to v2 before freezes apply.
14. `held` never exceeds 2; buying with 199 gems fails with `reason:'balance'`.

**XP and gems**
15. Lesson accuracy 0.95 → +15 XP, +2 gems. Same `awardId` twice → paid once.
16. 25 `alef:card-rated` events in one day → 20 XP.
17. Crossing the goal pays 10 gems once per day (`goalPaidOn`), even if the minutes goal is lowered and the goal is crossed again.
18. Streak reaching 7 pays 25 once; a later streak reaching 7 again pays nothing (`paidMilestones` is per install).
19. First lesson ever pays 50 gems.
20. Ledger and `recentIds` trimmed to caps.

**Hearts**
21. Hearts off before the 3rd finished lesson, in calm mode, with setting off, and for an answer event on `#/torahread`, `#/learn?review=1` and any game route.
22. Wrong first answer → −1; wrong retry of the same `quizId:qIndex` (including the end-of-quiz repeat) → no change; an `alef:rimon` event without `source` → no change.
23. 0 hearts → `canStartLesson` false; the current lesson still finishes and pays XP.
24. Time refill: lastRefillAt 9 h ago at 2 hearts → 4 hearts.
25. Refill round, ratings [1,2,3,3,4] (3 counted right) → +1 heart, no XP bonus; ratings [3,3,4,3,2] (4 right) → +1 heart, +5 XP; a round left before 5 ratings → nothing.
26. Gems refill at 350 → 5 hearts, balance −350; at 5 hearts the option is absent.

**Leagues**
27. Same `installId`/week/tier → identical cohort (names, targets) on every call.
28. 29 unique names, none repeated, all from the list.
29. Learner with exactly baseline XP ranks between 10th and 20th (over 200 random installIds, ≥ 90% of cases).
30. Learner at 1.3 × baseline promotes in ≥ 70% of 200 cases in tier 4.
31. Tie with a pretend player → learner ranks higher.
32. Week boundaries: Fri 13:59 counts in week; Fri 14:01 goes to `carry`; Sun 00:00 adds carry.
33. Settlement promotes/demotes by the table; tier 1 never demotes; tier 10 never promotes.
34. A week with 0 XP → no history entry, tier unchanged.
35. Settlement runs once (idempotent on reload).

**Quiet hours and timing**
36. Retention gate: calm mode on → no reminder; `stopped` → no reminder; otherwise the existing `composeReminder` decides (its own tests already cover Shabbat, chag, solemn days, night quiet and caps).
37. 14-day plan: every planned entry is one `composeReminder` returned non-null for; no entry Friday 12:00 to Saturday 23:59 without a city.
38. Plan with Yom HaShoah inside the 14 days → no entry that day.
39. No sessions → typical 19:00. Sessions at 07:10, 07:20, 07:40 last week → typical 07:15 (bucket centre); with default quiet 22–07 the auto time becomes 07:30.
40. `autoTime` true → after a session `notify.prefs` hour/minute = rounded typical time and `lastAuto` matches; learner edits the time → `autoTime` false; later sessions leave prefs alone.
41. Studied today → no reminder today (existing `activeToday` rule).
42. DST spring-forward Sunday: auto time 19:00 still fires at 19:00 local wall time.

**Messages**
43. 70 new lines: 22 `daily`, 3 `streak-risk` (e08, e21, s104), 10 `comeback-3`, 10 `comeback-7`, 20 `roast`, 1 `freeze-used`, 2 `league`, 1 `hearts-full`, 1 `final`; ids unique across all 128 lines.
44. Kind tone: `tone.js` never returns `roast` for any `daysAway` 0..60.
45. Playful: daysAway 1 → null (existing kinds), 3 → null (existing comeback-3), 5 → `roast`, 7 → `roast`, next eligible send → `comeback-7`, 14 → `final`; after `final`, `stopped` is true and nothing is sent until a streak day.
46. No repeat of the last 8 ids sent (existing `pickLine` rule) holds for the new kinds.
47. The new lines use only `{n}`, and only in `streak-risk` and `freeze-used` lines; no line contains `{next}`.
48. Copy lint on the 70 new lines: no match for `/\b(AI|artificial|algorithm|smart)\b/i`, `/\b(he|him|his|she|her|hers)\b/i`, or `God|G-d|pray|prayer|sin|shul|synagogue|rabbi|Torah|kosher`; none contains "Shabbat".
49. Hearts on → `d16` ("No hearts to lose…") is never picked; hearts off → it can be.

**Rimon cue**
50. Every moment maps to one of the 12 drawn actions in `assets/img/rimon/`; every `still` is a key of `SITUATIONS` in `rimon-show.js`.
51. `then` fires the second action after 1500 ms (fake timers) and is cancelled by a newer call.
52. Event bubbles: a listener on `window` receives it.
53. Unknown moment → false; `body[data-rimon-quiet]` or `rimon.dismissed` → false; every dispatched event has `detail.cue === true`, and a stage fed only cue events records no answers.

**State**
54. Corrupt `retention.v1` → defaults, raw copy kept in `.corrupt`.
55. `v: 2` record → read, never written.
56. Unknown fields survive a write.
57. Backup round-trip keeps both keys byte-identical (extend the existing backup test).

**Browser (Playwright, `tests/retention.*.browser.test.js`, skipped without Playwright like the existing browser tests)**
58. Fresh install: no opt-in card on first open; finish quick lesson → payout "+10 XP", "+50 gems" ledger line, opt-in card visible, Rimon host `data-action` becomes `highfive` or `bounce`.
59. Ask card with Playful picked, "Yes, nudge me" with a stubbed `Notification` (granted) → `notify.prefs.enabled` true and `retention.notify.v1.tone = 'playful'`; "No" → `notify.asked` set, card never shown again.
60. Reduced motion (`page.emulateMedia({reducedMotion:'reduce'})`): no element under `.alef-retention` has a running animation (`getAnimations().length === 0`), the XP number is final at first paint.
61. Calm mode: no hearts chip, no league route content, no streak count, no opt-in card.
62. Hearts: seed state with 1 heart and 3 lessons done, answer wrong → chip shows "♥ 0", end card shows "Practise to earn a heart", no "Next lesson" link.
63. `#/league`: honesty line visible and above the table; 30 rows; learner row labelled "You"; zero axe violations.
64. `#/shop`: buy freeze with 250 gems → balance 50, held 1, confirmation dialog first.
65. Seeded broken-gap state with 1 freeze → Home shows the freeze-used line, and the Progress 7-day strip shows a snowflake on the covered day.
66. Widths 320/360/390 px: nothing clipped sideways on Home, `#/league`, `#/shop`, the end card.
67. Clock fixed to Friday 19:00 (`page.clock`): scheduler shows no notification even when due.
68. Service worker test: plan in Cache Storage, dispatch a synthetic `periodicsync` → exactly one notification when due, none inside a quiet range.

### 6.4 Hebrew review list

Every new Hebrew string, for the native reviewer (none are to be treated as final):
`גַּרְעִין`, `נֶבֶט`, `שֹׁרֶשׁ`, `עָנָף`, `עָלֶה`, `פֶּרַח`, `פְּרִי`, `פַּרְדֵּס`, `כֶּתֶר`, `רִמּוֹן זָהָב`, `עוֹד לֵב!`, `עוֹלִים שָׁלָב!` (12 strings; the gems label was dropped in round 3, G67; the greeting strings were dropped in round 2, G57). Add all to `docs/hebrew-lint/` with status `needs-native-review`.

### 6.5 Definition of done

- `npm test` green, including unit cases 1–57, 69–86 (section 8.3) and 87–98 (section 9.3). Browser cases 58–68 pass locally with Playwright (they are advisory in CI, matching the repo's current CI rule).
- All work on branch `retention/build`; no force-push; nothing merged to main; nothing deployed.
- `docs/retention/README.md` states plainly: practice leagues are pretend; reminders arrive only while the app is open or on installed Android; nothing has been tested with real learners.

---

## 7. What this spec does not claim

- No retention numbers are promised. Nothing here has been tried with learners.
- Periodic Background Sync frequency is decided by the browser and can be zero.
- The Hebrew in this file is unreviewed.
- The 1.3 × baseline promotion rate is a design target that the league tests check against the simulator, not a measured learner outcome.

---

## 8. Review round 1: gaps closed

Each entry gives the gap (what an engineer would have had to ask) and the rule that now answers it. Verified against the code on `main` where marked "Checked".

### 8.1 Hooks into the real code

**G1. A finished lesson did not extend the streak.** Checked: `completeLesson` (`src/curriculum/actions.js`) writes the streak through `recordActivity`, which returns a v2 record unchanged (`src/curriculum/progress.js` line 117). So D1 needed its own write. Rule: on `alef:celebrate {kind:'lesson', final:true}`, `hooks.js` runs `store.update('streak', (r) => completeDay(r, now))` with no `extraRest` (Progress rest days are already mirrored into `frozenDates` by `withDeclaredRest`, so Home, Progress and retention agree). Then it checks milestones (1.4).

**G2. "Lesson finished" vs "Round finished".** Checked: `intermediate.view.js` line 365 calls `summaryNode` for partial rounds too. Rule: `summaryNode` gets an optional `final` flag (default `true`); intermediate passes `final: all`. Only `final:true` pays lesson XP, increments `lessonsFinished`, calls `completeDay` and can show the opt-in card. A `final:false` round pays nothing.

**G3. Review XP had no event to listen to.** Checked: review (`#/learn?review=1`) uses `review.view.js` rating buttons 1–4 and `rateCard`, not `mountQuiz`, so no `correct`/`wrong` event fires there. Rule: `review.view.js` dispatches `alef:card-rated {cardId, rating}` after each successful `rateCard`. Undo (`restoreRating`) does not take XP back (XP never goes down). awardId = `rate:{cardId}:{ms}`.

**G4. The heart-refill round was undefined in code terms.** (Replaced in round 3 by G74; kept for history.) Rule was: `#/learn?review=1&refill=1` builds the queue with `limit: 5`. If fewer than 5 cards are due, it uses whatever `buildQueue` returns; with 0 due it shows "Nothing is due. Here are 5 older cards." and fills from cards sorted by oldest `last` review. "Right" = rating ≥ 3 (Good or Easy). When the 5th rating is saved, the view dispatches `alef:review-finished {refill:true, ratings}`; `hearts.js` adds 1 heart and, if ≥ 4 right, 5 XP (awardId `refill:{ms}`). Leaving early gives nothing. The refill route is reachable at any heart count; above 5 hearts it pays only the per-card XP.

**G5. "Same question" had no identity.** Rule: `mountQuiz` dispatches `alef:quiz-start {quizId}` at mount and adds `quizId` and `qIndex` (index in the original question list) to each answer event. `hearts.js` keeps `{quizId, lostIn:[qIndex…]}`; a new `quiz-start` replaces it. A wrong answer costs a heart only if `qIndex` is not in `lostIn` and this is that question's first answer in the quiz (the end-of-quiz repeat of a missed question never costs). "First heart lost in a session" = first loss for this `quizId`.

**G6. Hearts scope named routes that do not exist** ("prayer routes"). Checked against `src/shell/router.js`. Rule: replaced in 2.3 with the exact route list.

**G7. Where the 0-heart gate lives.** Hiding "Next lesson" on the end card was not enough: lessons also open from Learn, Home and links. Rule: `lesson.view.js` and `intermediate.view.js` check `canStartLesson` on mount. If false AND the lesson has no resume record (the existing `RESUME_KEY` in `lesson.parts.js` / intermediate progress), they render the hearts block (2.3) instead of the lesson. A lesson already in progress always opens. Home's "3-minute lesson" button is replaced by "Practise to earn a heart" while hearts are 0.

**G8. How the 3-minute lesson works** (param is `?quick=1` and it pays after 4 parts since round 4, G95–G96; text below is the round-1 rule). Checked: `lesson.view.js` line 30 mounts `mountChunkedLesson` only when `chunkedLessons(ctx)` is true. Rule: `?short=1` forces the chunked path regardless of that setting and stops after part 1. The end card is a real end card (`final:true, short:true`) so it pays 10 XP, counts toward `lessonsFinished` and completes the streak day. It does NOT call `completeLesson`; the lesson stays open, and the end card's primary button is "Keep going" → the same lesson at part 2 (resume record). Home's quick button targets the next lesson from `src/home/nextlesson.js` `nextLesson(...)`, with the same arguments Home already passes.

**G9. Two daily goals.** Checked: Home already stores a minutes goal (`today.js`, 5/10/15/20/30). Rule: no XP goal setting; XP goal = minutes × 4 (2.1). `dailyGoalXp` and `retention.v1.goal` are removed.

**G10. Duplicate on/off state.** `hearts.enabled` and `league.enabled` existed in both settings and the record. Rule: settings only (5.4).

**G11. Existing learners.** (a) When `retention.v1` is first created, `lessonsFinished` = number of keys in `curriculum.progress.completed` (checked: `PROGRESS_KEY` in `src/curriculum/dom.js`), so learners who already finished 3 lessons get hearts at once and 5 get leagues at once. They are NOT paid the 50 "first lesson" gems unless `lessonsFinished` was 0. (b) Replaced in round 2 by G45: on overnight the study reminder already speaks in Rimon's voice, so there is one reminder system and nothing to switch between.

### 8.2 Rules that were ambiguous

**G12. Goal gems once per day** had no field. Rule: `gems.goalPaidOn` (ISO day). Pay only when `goalPaidOn !== today`.

**G13. Milestone repayment** contradicted itself. Rule: once per install (1.4 rewritten).

**G14. League payout stacking.** Rule: exactly one payout per settled week (2.2 rewritten).

**G15. League curve and determinism.** Rule: PRNG draws happen in this exact order from one mulberry32 stream: (1) Fisher–Yates shuffle of the 120 names, take the first 29; (2) 29 jitter values; (3) 29 × 6 step weights. Day k of the league week (k = 0 Sunday … 5 Friday) runs from local 00:00 to 24:00, except Friday ends at 14:00. Player i's XP at time t in day k = `T_i × (Σ_{j<k} w_ij + w_ik × fractionOfDayKElapsed)`, rounded down, where `w_ij = r_ij / Σ_j r_ij`. After the week ends, XP = `round(T_i)`.

**G16. Several weeks missed.** Rule: on open, settle every ended week since `league.weekId` in order. A week with `joined:false` makes no history entry and leaves the tier alone. Only the most recent result is shown (`resultUnseen`); older results only appear in history.

**G17. When league tracking starts.** Rule: when leagues become on (auto at 5 lessons, or the switch), set `unlockedAt = now` (if null) and start the current week with `weekXp = 0`. XP earned before `unlockedAt` never counts. Switching off keeps the tier; switching back on starts at the current week.

**G18. Duplicate notifications** (two tabs, or page plus service worker). Rule (log moved to `notify.log` in round 2): before showing, the page sender does `store.update('notify.log')` and aborts if any entry is from the same local day; otherwise it appends `{at, id}` in the same update and then shows. All senders use tag `alef-rimon`, so a race at worst replaces one notification with the other. The page also rewrites the Cache Storage plan after sending, so the service worker skips that entry. The service worker, which cannot read the store, removes an entry from the plan when it sends, and the page reads that plan at boot to copy `{id, at}` into `sent`.

**G19. The service worker cannot work out the escalation itself.** Rule (round 2 wording): the page writes a 14-day plan, one entry per local day at `notify.prefs.hour:minute`, message from `composeReminder` with the projected state (3.5). Any session, settings change or send rewrites the plan from scratch.

**G20. Situational lines** (round 2): all fire at the one daily reminder time; which applies is in 3.6. S01, S02 and S05 were dropped; S04 is an ordinary `streak-risk` line.

**G21. Kind tone and the streak saver.** Rule (round 2): every tone gets at most one notification a day (existing `underCap`). There is no second evening send.

**G22. "Every 3rd day" for d = 8–13.** Replaced in round 2 by the existing cap: from 7 days away, at most one every 3 days (3.3).

**G23. When the freeze-used line stops showing.** Rule: `freezes.unseen` is set to false when the Home streak line renders the `freeze-used` state once.

**G24. Boot race** (Home can render before the lazy rollover finishes). Rule: `streak-line.js` reads from the store and re-renders on `store.subscribe` for `streak` and `retention.v1`. `armRetention` dispatches `alef:retention-ready` when rollover and settlement are done. The once-per-day greeting waits for that event.

**G25. Midnight while the app is open.** Rule: `boot.js` sets a timer to the next local midnight + 1 s, re-armed every time it fires and on `visibilitychange` to visible. It runs the 1.3 rollover and re-plans notifications.

**G26. Friday evening pressure in the app.** Rule: Friday from 18:00 and all of Saturday until 21:00, the streak card never shows `at-risk`; it shows `rest` if today is a rest day, otherwise `open`.

**G27. In-app greetings.** Replaced in round 2 by G43: greetings (welcome back, Shabbat, chag, Shavua tov, broken streak) come from the existing stage triggers. Retention adds no greeting; `lastBootDay` is removed from 5.1. The bubble lines `welcomeBack`, `chag`, `shavuaTov` in 3.6 are dropped; `goal`, `heartBack`, `moveUp` stay.

**G28. End card order and "tap skips".** Rule, top to bottom: existing celebration (confetti, cheer), XP chip and "{x} of {goal} XP today" line, goal/streak lines, hearts block (only at 0), existing stats, opt-in card (only when due), actions row. "Any tap skips" = a pointer or key event on the card jumps every pending animation to its end state at once; it does not dismiss anything.

**G29. How learners find Gems and League.** Rule: Home shows one row under the streak card: "{balance} gems" linking to `#/shop`, and, when leagues are on, "{tier}: {rank}th" linking to `#/league`. Both are also in the router quick menu (6.2). Calm mode hides the row.

**G30. Where copy lives.** Rule: every learner-facing English string in this spec goes in one file, `src/retention/strings.js` (a frozen object keyed by id). Reminder lines go in `rimon-reminders.js` (3.6). Settings copy: "Hearts" with help line "Mistakes in lessons cost a heart. Practise old words to win them back."; "Practice league" with help line "A weekly race against pretend players paced to you."; "Rimon's reminders" with "Off / Kind Rimon / Playful Rimon (for adults)".

**G31. Colours.** Rule: use the existing theme variables (`--accent` and the dark-green/gold palette already in the app CSS); no new colour variables except `--alef-gem` for the gem glyph, which must reach 3:1 against both light and dark backgrounds (checked by the existing a11y colour test pattern).

**G32. Calendar fallback days.** Rule: the `.ics` event repeats `RRULE:FREQ=WEEKLY;BYDAY=SU,MO,TU,WE,TH` at the typical time (no Friday or Saturday event), titled "Hebrew with Rimon (3 minutes)".

**G33. Backup, delete, privacy.** Checked: `src/store.js` backup and clear operate on every key with the `alef:` prefix, so both new keys are backed up and wiped with no extra code. Rule: add one sentence to `privacy.view.js`: "Your XP, gems, hearts, practice league and reminder times are kept on this device only." Nothing is sent anywhere; no telemetry is added.

**G34. Time arithmetic.** `nextFire`'s "+23 h 30 min" is elapsed time on purpose (it can drift an hour across a DST change), then clamped to wall-clock windows. Every other "same time tomorrow" uses local wall-clock construction (1.5).

**G35. Shared helpers.** `fnv1a` and `mulberry32` live in `src/retention/clock.js` (not in `league.sim.js`) so other retention modules can use them without importing the league.

**G36. Which games pay XP.** Only games that end through `src/games/engine.js` or `src/games/arcade.js`. Other game views (for example `wordfinder.view.js`) pay nothing in v1; the README says so.

**G37. Precache.** (Replaced in round 3 by G78.) All files from 6.1 (JS and CSS) are added by running `npm run precache` after the last commit; the commit that does this is the last one on the branch.

**G38. Time refill arithmetic.** Rule: when a heart is lost while `n === 5`, set `lastRefillAt = now`. On every read: `gained = floor((now − lastRefillAt) / 4 h)`; `n = min(5, n + gained)`; `lastRefillAt += gained × 4 h`; if `n === 5`, `lastRefillAt = 0`. Practice and gem refills do not reset the timer unless they bring `n` to 5.

### 8.3 Added unit tests (69–86)

69. `alef:celebrate {final:true}` on a v2 streak with `last` = yesterday → count + 1; same event with `final:false` → unchanged, no XP.
70. Quick lesson end → 10 XP, `lessonsFinished` + 1, streak day complete, `curriculum.progress.completed` unchanged.
71. Fresh `retention.v1` with 4 completed lessons in `curriculum.progress` → `lessonsFinished = 4`, hearts on, no 50-gem first-lesson payout.
72. `alef:quiz-start` resets `lostIn`; wrong at qIndex 2 → −1; the end-of-quiz repeat of qIndex 2 wrong → 0.
73. `canStartLesson` false + no resume record → gate; false + resume record present → lesson opens.
74. Refill round with 0 due cards fills 5 from the oldest-reviewed cards.
75. XP goal follows the minutes goal: 5 → 20, 30 → 120; changing minutes mid-day changes the ring, not past payouts.
76. Leagues: XP before `unlockedAt` excluded; switching off and on starts a fresh week entry.
77. Multi-week settlement: 3 ended weeks, only the middle one joined → one history entry; `resultUnseen` = that week.
78. Draw order fixed: a snapshot of the first cohort for `installId='test', weekId='2026-11-08', tier=1` is stored in the test and must match exactly.
79. Payout precedence: tier 10 rank 1 → 100 only; tier 4 rank 1 → 100; tier 4 rank 5 → 50.
80. Send lock: two senders 1 s apart on the same day → one `notify.log` entry, second aborts.
81. 14-day plan from daysAway 0: the day-14 entry is `f01`; a Kind-tone plan has no `roast` ids.
82. Any tone: never two sends on one local day.
83. iPhone Safari tab (stubbed `status()`): the calendar card shows once, writes `notify.asked`, and its "Add to calendar" downloads an `.ics` with `BYDAY=SU,MO,TU,WE,TH`.
84. Friday 19:00, streak 5, nothing today, Shabbat freeze off → card state `open`, never `at-risk`.
85. Greeting priority: d = 4 on a Saturday evening → `welcome_back`, not `shabbat`; second boot same day → no greeting.
86. Time refill: lose 1 at full (t0), read at t0 + 3 h → 4; at t0 + 4 h → 5 and `lastRefillAt = 0`.

---

## 9. Review round 2: gaps closed (G39–G66)

Checked against `main` at `b574744f6` and `overnight/launch-ready-2026-11-10` at `8102de323`. Fixes are already written into sections 0–8; each entry says what changed and where.

### 9.1 New code on the overnight branch

**G39. Which branch to build on.** (Replaced in round 3 by G67.) `main` has no `src` change since the spec was written; the overnight branch has 134 changed `src` files, including Rimon and reminder modules this spec must use. Rule: branch `retention/build` from `overnight/launch-ready-2026-11-10`; if `main` already contains `8102de323` when the build starts, branch from `main` instead. Never merge either into anything (0.2 rule 7).

**G40. Moved anchors.** `signalRimon` in `mountQuiz` is line 104 on overnight. `summaryNode` now also takes `ctx`, `store`, `sfx`, `showStreak` and renders `rimonInline`, `flameCard` and `.alef-remind-slot`. Retention appends its payout after the flame and before the remind slot (G28 order still holds: payout comes before the opt-in). 0.1 and 6.2 updated.

**G41. Name collision.** Overnight already exports `showRimon(situation)` and `SITUATIONS` from `src/shell/rimon-show.js` (stills). The spec's own `showRimon` would have shadowed it. Renamed to `cueRimon(moment)` in `src/retention/rimon-cue.js`, `MOMENTS` instead of `SITUATIONS` (section 4).

**G42. Retention cues would be counted as answers.** The stage's answer tracker counts `bounce wink highfive` as right and `sad` as wrong, and maps `laugh nervous point` to game and lesson stills. Rule: every cue carries `detail.cue: true`; `rimon-stage.js` `onRimon` gets a first-line guard that ignores cue events except for marking activity.

**G43. Double reactions.** The stage already reacts to streak store changes (day milestones, saved, restart, lost, rest), greetings and lesson ends, and the flame card stretches Rimon when the day lights. Rule: retention cues only its own moments (hearts, freezes, league, XP goal, opt-in). 1.1, 2.1 and section 4 updated; the `lesson_complete`, `xp_payout`, `streak_*` (except at-risk), `welcome_back`, `shabbat`, `chag`, `shavua_tov` situations are removed.

**G44. Quiet days, quiet routes, hidden Rimon.** The stage hides Rimon on Yom HaShoah, Yom HaZikaron, Tisha B'Av and on prayer/Torah routes (`body[data-rimon-quiet]`), and `rimon.dismissed` hides the companion. Rule: `cueRimon` returns false in all three cases (section 4).

**G45. A second reminder engine.** (Replaced in round 3 by G80.) Overnight's `notify.js` already speaks with Rimon's lines from `rimon-reminders.js`, chosen at fire time, logged in `notify.log`. Rule: retention builds no scheduler and no message picker. It adds 70 lines to `LINES`, a `state.kind` override in `kindFor`, an `excludeIds` filter in `pickLine`, and the calm/stopped/tone wiring in the `armFromPrefs` show path (6.2). `messages.js` and `scheduler.js` are removed from 6.1 (`tone.js` and `plan.js` replace them).

**G46. Two frequency rule sets.** Rule: the existing caps stay as they are (1 a day, 5 a week, every 3 days from 7 days away, weekly from 14, silent from 45), and the spec's `final` stop at 14 days is applied on top. The ladder in 3.3 is rewritten to use the existing kinds plus `roast` and `final`.

**G47. Two quiet-hour rule sets.** The existing gate (Friday 12:00 to Saturday 23:59, chag and eve from 12:00, solemn days, city window, night 22–07 editable) is wider than John's Friday 18:00 to Saturday 21:00 rule. Rule: it is the only gate; the spec's own 08:00–21:00 clamp and quiet-range builder are dropped (3.2, 6.1 row 2).

**G48. Two opt-in cards.** Overnight's `reminder-ask.js` asks once after the first win. Rule: keep it, ask once (the spec's "ask again after 3 lessons" is dropped), add the tone radio, the iPhone calendar card and a calm-mode check (3.1).

**G49. Personal timing had nowhere to live.** (Void after G80, see F23.) The existing scheduler fires at one daily time. Rule: retention writes the learner's typical time into `notify.prefs.hour/minute` while `autoTime` is on; a manual change switches it off (3.4).

**G50. "+23 h 30 min" rule.** (Void after G80, see F23.) Incompatible with a fixed daily time; dropped (3.4).

**G51. Duplicate stores.** (Replaced in round 3 by G73 and G80.) `retention.notify.v1` no longer keeps a send log, ask count or opt-in flag; those are `notify.log`, `notify.asked` and `notify.prefs.enabled` (5.2).

**G52. Copy that contradicts hearts.** Existing line `d16` says "No hearts to lose". Rule: while hearts are on, `d16` is passed in `excludeIds`.

**G53. A second Home streak card.** Overnight already shows a flame under the Home title (`.alef-streak-flame`, `data-streak-slot="home"`). Rule: no new card; `streak-line.js` adds one status line (1.1 states) and the gems/league row under that flame (6.1 row 18).

**G54. Flame copy ignores D1.** `flame.js` says "N more minutes of study today keeps your streak", but with D1 a finished lesson also completes the day. Rule: the not-lit sub line ends with " Or finish one lesson." (6.2).

**G55. "Quick" already means something.** (Reversed in round 4 by G95: `?quick=1` is used.) The lesson page has a "quick check" (`#alef-quick-start`) that completes a lesson. Rule: the 3-minute lesson parameter is `?short=1` and the flag is `short`; learner-facing copy says "3-minute lesson" (1.6, 6.2, G8).

### 9.2 Contradictions removed from the file

**G56. Situational duplicates.** S01, S02 (after Shabbat/chag) and S05 (Friday) duplicated existing `after-rest` and `erev-shabbat` lines; dropped. D8 now points to `erev-shabbat` (Friday before 12:00 only).

**G57. Greeting bubbles.** `welcomeBack`, `chag`, `shavuaTov` bubble lines removed (greetings are the stage's); 6.4 Hebrew list trimmed to 13 strings.

**G58. Solemn days.** The spec never mentioned them; reminders and cues are now silent on Yom HaShoah, Yom HaZikaron and Tisha B'Av (3.2 rule 3, G44).

**G59. Notification click route.** 3.5 said `#/learn?quick=1` in one place and `#/` in another; the default is now `#/learn` (the existing reminder route) and a click never starts a lesson on its own.

**G60. `{next}` placeholder.** The existing `pickLine` fills only `{n}`. D09 rewritten without it; test 47 updated.

**G61. Withdrawn Hebrew flag.** Overnight changed `rimon-speech.js` `again` to a plural, gender-neutral line; the round-1 flag is withdrawn.

**G62. Where tone is changed later.** Only two places: the ask card (3.1) and `#/reminders` (6.2). Off is the existing on/off switch; there is no third "off" tone value.

**G63. Two definitions of days away.** The spec's `d` (rest days excluded) is replaced by the existing `daysAway()` in `src/home/today.js`, which the reminder engine already uses. Rest days still never get a reminder because of the quiet gate.

**G64. Lesson completion on overnight.** A lesson completes through its quick check, whose end card is `summaryNode`; that is the `final:true` event D1 listens to. A 3-minute lesson (part 1 of the chunked flow) uses the same end card with `short:true` and does not complete the lesson (G8). No conflict remains.

**G65. Anchors to re-check at build time.** If the overnight branch moves again before the build, the engineer confirms these names still exist before starting, and stops to report any that do not: `projectStreak`, `completeDay`, `withDeclaredRest`, `isCountedRoute`, `summaryNode`, `mountQuiz`, `signalRimon`, `flameCard`, `reminderAskCard`/`offerReminders`, `composeReminder`, `kindFor`, `pickLine`, `armFromPrefs`, `normalizePrefs`, `showRimon`, `mountRimonStage` (its `onRimon`), `daysAway`, `normalizeDailyGoal`, `buildQueue`, `rateCard`, `mountChunkedLesson`.

**G66. Tests.** Tests 36–49, 50, 53, 59 and 80–83 were rewritten to match; new tests below.

### 9.3 Added unit tests (87–98)

87. `kindFor({kind:'roast'})` returns `roast`; without `kind`, `kindFor` returns the same value as before the change for a fixed table of 12 states (snapshot taken from the overnight code before editing).
88. `pickLine` with `excludeIds:['d16']` over 1,000 seeded draws of kind `daily` never returns `d16`.
89. Stage guard: 5 `alef:rimon` events with `action:'bounce', cue:true` → the answer tracker produces no trigger.
90. `cueRimon('freeze_used')` calls `showRimon('streak', …)` once; `cueRimon('heart_lost')` calls it zero times.
91. On `alef:celebrate {kind:'lesson', final:true}`, `hooks.js` dispatches no `alef:rimon` event (only `daily_goal` if the XP goal was crossed).
92. With `body[data-rimon-quiet]` set, `cueRimon('league_up')` returns false and dispatches nothing.
93. `flameState` for an unlit day: `sub` ends with "Or finish one lesson."
94. Replaced by test 104 (round 4).
95. `reminderAskCard` with calm mode on → null.
96. Ask card: tone radio defaults to Kind; pressing No saves no tone.
97. Auto time with `quietFrom` 22: typical 21:50 → 21:30; with `quietTo` 7: typical 06:40 → 07:30.
98. Service worker sent ids in the Cache Storage plan are copied into `notify.log` at the next boot, without duplicates.

---

## 10. Review round 3: reconciliation with the Fable build (G67–G92)

Checked by reading the code on `claude/retention-fable-2026-11-10`, not only its notes (`docs/retention/IMPLEMENTATION.md`). The build was made from the round-0 version of this spec, on `main`, before rounds 1–2 existed. So most of the gaps below are the build still following the earlier text.

### 10.1 Where the fix-up work happens

**G67. Base for the fix-up.** (Replaced in round 4 by G94.) New branch `retention/fixup-2026-11-10`, created from `claude/retention-fable-2026-11-10` at `f0a6220e3`. Then, in that order: (1) merge `overnight/launch-ready-2026-11-10` into it with a normal merge commit (no rebase, no force-push); (2) resolve the expected conflicts in `src/curriculum/exercises.ui.js` (both branches edit the answer line and `summaryNode`; keep both sides' additions), `src/shell/router.js`, `src/app.js`; (3) apply the 10.4 fix list, one commit per item. Nothing goes to `main` and nothing is deployed. If `main` already contains the overnight branch when work starts, merge `main` instead of the overnight branch. This replaces G39.

### 10.2 Departures in the build: decided

| G | Build does | Spec before | Round 3 decision |
|---|---|---|---|
| G67 | Currency shown as "Gems" (`CURRENCY` in `gems.js`) | "Seeds" | **Adopt.** John's brief says gems. Sections 0–9 now say gems; `#/seeds` is `#/shop`; the gems Hebrew label is dropped. |
| G68 | Streak milestones 3, 7, 14, 30, 50, 100, 365 paying 5–200 gems | 7, 30, 100, 365 | **Adopt** (1.4 updated). They line up with the overnight stage's milestone stills. |
| G69 | 48 h paid streak repair (150 gems a day, at most 3 days, streak ≥ 2) | D6: not built | **Adopt** (D6 updated). Gems are earned only, so no money is involved. Copy must say "Repair your streak" and never use a countdown under one hour. |
| G70 | Friday and the eve of every Yom Tov are free rest days for everyone; Saturday and Yom Tov are free for everyone even when the learner's Shabbat freeze is off | Rest days follow the engine's `freeze` setting | **Split.** Saturday and Yom Tov always free: adopt (harmless, respectful). Friday and Yom Tov eves free: **reject by default** (D9). The build's reason ("a missed Friday would be lost at midnight, inside the Shabbat window") does not hold: the streak is judged at the next app open, not at midnight, so nothing is lost inside the window. A free Friday also lets a 5-day study week keep a 7-day streak. Fix: `STREAK.shabbatCoversFriday = false` (10.4 F1). John can flip it. |
| G71 | League pacing curve `paceOf()` | Power formula | **Adopt** (2.2 updated). The build's tests check both targets against the simulator. |
| G72 | Combo bonus: +2 XP per 5 right in a row inside a lesson, at most +6 | Not specified | **Adopt.** Added to 2.1 by this entry. |
| G73 | One storage key; reminder state at `retention.v1.notify` | Two keys | **Adopt.** 5.2 now means the `notify` object inside `retention.v1` with the same fields. Exception after the overnight merge: the send log and the "already asked" flag are the overnight keys `notify.log` and `notify.asked` (G80). |
| G74 | Review XP event `alef:review-rated {rating}`; hearts come back one per 5 review cards rated anywhere (`#/learn?review=1&refill=1` is just the review queue) | `alef:card-rated`; a dedicated 5-card refill queue | **Adopt** the event name and the simpler rule (any 5 ratings = 1 heart; 4+ rated Good or Easy also pays 5 XP). G3/G4 are read with these names. |
| G75 | Module and test names (`gems.js`, `leagues.js`, `notify.js`, `messages.js`, `quiet.js`, `rimon.js`, `ui.js`, `shop.view.js`; tests in `tests/retention/`) | Spec names | **Adopt.** 6.1 is read as the build's file map in `docs/retention/IMPLEMENTATION.md`. Exceptions in 10.4: `rimon.js` must stop exporting a function named `showRimon` (F8). |
| G76 | `/league` and `/shop` as preview-tier routes | Normal routes | **Keep preview until John approves** (D10). Promoting needs `tier: 'v0'` plus raising the route count in `tests/a11y.b2.test.js` and `tests/a11y.hub.test.js`. |
| G77 | Switches (hearts, league, reminders, tone) on `#/shop`, goal picker in the goal card; no Settings controls | Settings page | **Adopt the Shop location**, plus one Settings row "Rewards and reminders" linking to `#/shop` (F14). The goal picker is removed (F6). |
| G78 | Retention code loaded on demand, not in the first-install precache | G37: precached | **Adopt.** It is fetched after first paint and cached once used. |
| G79 | Night window for reminders 08:00–21:00 (`NIGHT` in `quiet.js`) | Round 2: overnight's 22:00–07:00 only | **Adopt** as an extra gate on top of the overnight one: reminders only 08:00–21:00. This corrects 3.2 (round 2 had dropped it). |

### 10.3 Reminders after the overnight merge (the one open design point)

**G80. One sender.** `main` + the Fable build has one reminder sender (retention's in-page scheduler). The overnight branch adds a second (`notify.js` `armFromPrefs` speaking `rimon-reminders.js` lines) and a second ask card (`reminder-ask.js`). After the merge both would fire. Rule:
- The sender is retention's scheduler (`src/retention/notify.js` `createScheduler`), because it has the tone ladder, the 14-day stop, personal timing and the service-worker plan, all tested.
- At retention boot, if `retention.v1.notify.optedIn` is true, call the overnight `notify.js` `cancelAll()` (checked: exported on overnight) and set `notify.prefs.enabled = false` through `normalizePrefs`, so the old timer never runs alongside.
- The ask card is the overnight `reminder-ask.js` card (it is already placed in `.alef-remind-slot`). Retention's own `optInCard` in `ui.js` is not shown when that module exists. The overnight card's "Yes" calls retention's `turnOnReminders(tone)` instead of enabling `notify.prefs`, and gains the tone radio (3.1).
- Ask once: `NOTIFY.maxAsks = 1` (round 2, G48); the build asks twice.
- Lines: retention's 73 lines stay in `src/retention/messages.js`. The overnight `rimon-reminders.js` lines are used only for kinds retention lacks (`holiday`, `milestone`, `welcome`): `pickMessage` falls back to `pickLine` for those days. S01, S02 and S05 are dropped (overnight `after-rest` and `erev-shabbat` cover them, G56).
- Quiet gate: retention's `isQuiet` AND the overnight `isRestTime` (Friday 12:00 to Saturday 23:59, chag eves from 12:00, solemn days). Both must allow a send.
This replaces G45 and G51 for the merged code. Sections 3.1–3.5 are read with "the existing engine" meaning retention's scheduler plus these overnight checks.

### 10.4 Fix list: every point the build misses or contradicts

Each item: what the build does now (checked in the code) → what it must do. One commit each on `retention/fixup-2026-11-10`.

| # | Spec point | Build now | Required |
|---|---|---|---|
| F1 | D9 / G70 | `shabbatCoversFriday: true`; Friday and Yom Tov eves free | Set to `false`; keep Saturday and Yom Tov free |
| F2 | G2 | `boot.js` pays XP and completes the streak day on every `alef:celebrate {kind:'lesson'}`, so an intermediate "Round finished" card pays too | `summaryNode` gets `final` (default true); `intermediate.view.js` passes `final: all`; `lessonFinished` returns early when `final === false` |
| F3 | G6 | Hearts only on `#/learn?…lesson=`; `#/intermediate/:id` lessons never cost or gate | Include `#/intermediate/:id` in `isLessonHash` and in `answered()` |
| F4 | G7 | Gate keyed on an in-memory `lessonHash`; reloading a lesson already in progress at 0 hearts gates it | Do not gate when the lesson has a resume record (`lesson.parts.js` `RESUME_KEY` entry, or intermediate progress for that id) |
| F5 | G11a | `lessonsFinished` starts at 0 for learners who already finished lessons, so hearts, league and the ask wait 3–5 more lessons, and the 50-gem first-lesson payout is paid to experienced learners | On first creation set it to the number of keys in `curriculum.progress.completed`; pay the first-lesson gems only when that number was 0 |
| F6 | G9 | Own XP goal picker (Casual 10 / Regular 20 / Serious 30 / Intense 50) in a Home goal card, next to Home's existing minutes goal | Remove the picker; XP goal = minutes goal × 4 (`normalizeDailyGoal`); `GOAL_CHOICES` unused |
| F7 | G11b, G80 | On `main`, a learner with the old study reminder on can get both it and Rimon's reminder | Apply G80 (disarm and disable the old one when retention reminders are on) on `main` too |
| F8 | G41 | `src/retention/rimon.js` exports `showRimon` and `SITUATIONS`, and assigns `globalThis.ALEF.showRimon`; overnight's `rimon-show.js` exports a different `showRimon` | Rename to `cueRimon` / `MOMENTS`; drop the global assignment |
| F9 | G42 | Cues carry `detail.retention: true`; the overnight stage counts `bounce wink highfive sad` cues as quiz answers and maps `laugh nervous point` to game stills | Add `cue: true` to the detail; add the one-line `cue` guard to `rimon-stage.js` `onRimon` |
| F10 | G43 | Retention cues `lesson_complete`, `streak_extended`, `streak_milestone`, `streak_broken`, `welcome_back`, `shabbat`, `chag`, `shavua_tov`; after the merge these double the stage's and flame's own reactions | Remove those cues (keep the rest of the moment list in section 4, plus `streak_repaired`) |
| F11 | G44 | Cues ignore quiet routes/days and Hide Rimon | `cueRimon` returns false when `body[data-rimon-quiet]` is set or `rimon.dismissed` is true |
| F12 | G53 | Top bar has its own streak flame; overnight Home already shows one under the title | Top bar keeps gems, hearts and league; its flame is hidden on Home when `.alef-streak-flame` exists |
| F13 | G58 | No solemn-day rule in retention quiet | Covered by G80's `isRestTime` after the merge; on `main` add Yom HaShoah, Yom HaZikaron, Tisha B'Av to `quiet.js` (via `holidaysBetween`) |
| F14 | G77 | No Settings entry | Settings row "Rewards and reminders" → `#/shop` |
| F15 | 1.6, G8 | 3-minute lesson not built | Built in 78a4f3138 as `?quick=1` (G95); remaining fixes F25, F26 |
| F16 | 3.6 bubble table | `line` is sent but `rimon.js` ignores it; no `goal`, `heartBack`, `moveUp` text | Add `LINES` and `sayLine` to `rimon-speech.js`, and the `detail.line` branch to `rimon.js` |
| F17 | 1.1 | Streak states shown inside the goal card; no `at-risk`/`freeze-used`/`broken` wording rules, no snowflake on the Progress strip | Add the 1.1 states (with G26: no `at-risk` Friday 18:00 to Saturday 21:00) as one line under the Home flame; snowflake on covered days in `weekStrip` rendering |
| F18 | 3.1, G32 | No iPhone calendar card | Build it (once, `BYDAY=SU,MO,TU,WE,TH`) |
| F19 (replaced in round 4 by G100) | 3.6 | S02, S05, S07, S08 in the catalogue but never sent; S01, S02, S05 duplicate overnight lines | Drop S01, S02, S05 (G56). Wire S07 (Thursday, within 30 XP of promotion) and S08 (hearts back to 5 after being 0) |
| F20 | G54 | (overnight) flame says only "N more minutes", but a finished lesson now completes the day | Add " Or finish one lesson." to the unlit line in `flame.js` |
| F21 | G52 | (overnight) line `d16` "No hearts to lose" can be sent while hearts are on | Exclude `d16` while hearts are on (only relevant where overnight lines are used, G80) |
| F22 | 6.3 browser tests 58–68 | Not automated; checked by hand at 360 px | Add them under `tests/retention/*.browser.test.js` using the existing Playwright pattern (advisory in CI) |
| F23 | G50 vs build | Build keeps the "+23 h 30 min" first-fire rule | Keep it (it works with retention's own scheduler, which is the sender after G80). G49/G50 apply only to the overnight engine and are void after G80 |
| F24 | Hebrew | Ten tier names unreviewed (listed in `docs/retention/HEBREW-REVIEW.md`) | No change; stays on the native review list (6.4) |

### 10.5 Contradictions removed from this file in round 3

**G81.** "Seeds" replaced by "Gems" everywhere except the pomegranate jokes in the message copy and the league tier "Seed" (G67).
**G82.** D6 (repair) and the 1.4 milestone table now match the decisions (G68, G69).
**G83.** The 2.2 pacing formula is replaced by the built curve (G71).
**G84.** D9 (Friday) and D10 (route tier) added to 0.3.
**G85.** 5.2 is now the `notify` object inside `retention.v1` (G73).
**G86.** G39's build base is replaced by G67.
**G87.** G45/G51 (overnight engine as sender) are replaced by G80 (retention scheduler as sender, overnight ask card and quiet gate kept).
**G88.** G48's "ask once" now applies to the merged card (`maxAsks = 1`).
**G89.** 3.2's night window: retention's 08:00–21:00 is restored as an extra gate (G79).
**G90.** G4's dedicated 5-card refill queue is replaced by "any 5 review ratings" (G74).
**G91.** G37 (precache everything) is replaced by on-demand loading (G78).
**G92.** Test names follow the build (`tests/retention/`). Tests whose numbers or names changed with these decisions: 14 and 26 (prices unchanged, currency name), 18 (milestone list), 25 (any 5 ratings), 29–30 (now checked against `paceOf`), 58 and 64 (`#/shop`). New tests for the fix list: one per item F1–F21, each asserting the "Required" column, plus F22's browser set.

---

## 11. Review round 4: final reconciliation, defaults, state transitions, acceptance (G93–G116)

Checked on 2026-11-10 against: `claude/retention-fable-2026-11-10` at `78a4f3138` (Fable's second pass); `overnight/launch-ready-2026-11-10` at `1134fb949`, which now carries Fable's first four commits as `924d7a975`, `aac8027ef`, `3c4f68a80`, `1134fb949` (the `src/retention` and `tests/retention` trees are byte-identical to Fable's `f0a6220e3`, checked with `git diff`); `main` at `b574744f6` (unchanged). Where this section and an older one disagree, this section wins.

### 11.1 Branch state that matters

**G93. Two reminder offers and two schedulers are already live on the overnight branch.** Checked in the code at `1134fb949`: the lesson end card shows the overnight `reminder-ask.js` card in `.alef-remind-slot` AND retention's `optInCard` inside the reward panel (`src/retention/ui.js` line 147); `src/app.js` arms the overnight study reminder (lines 396 and 405) AND retention's scheduler (line 406). F7/G80 are therefore the first fixes, not later ones (11.2 step 4).

**G94. Merge order** (replaces G67). Branch `retention/fixup-2026-11-10`:
1. Create it from `origin/overnight/launch-ready-2026-11-10` at its current head (at least `1134fb949`). Do not merge `claude/retention-fable-2026-11-10` into it (its first four commits are already there as copies, so a merge would replay them).
2. `git cherry-pick 78a4f3138`. A trial cherry-pick (not pushed) conflicts in exactly two files: `src/shell/rimon-speech.js` (keep the overnight file; add Fable's `sayLine(line)` function and add `sayLine` to the object that `mountSpeechBubble` returns) and `precache-manifest.js` (take the overnight side; it is regenerated in step 6). `src/shell/rimon.js` merges cleanly.
3. `npm test` must pass before step 4.
4. Fix commits in this order (each one commit, each followed by `npm test`): F7 → F8 → F9 → F10 → F11 → F2 → F3 → F4 → F5 → F6 → F1 → F12 → F13 → F14 → F17 → F19 → F20 → F21 → F25 → F26 → F27 → F28. F8 comes before F9–F11 because they edit the same file; F2 before F5 because both touch the lesson counter.
5. Browser tests (`tests/retention/retention.browser.test.js` plus 11.8) run locally with Playwright.
6. Last commit: `npm run precache`.
7. Push only `retention/fixup-2026-11-10`. Never push to `main`, `overnight/…` or `claude/retention-fable-…`; never force-push; never deploy. Author John Khan, no AI attribution.
If `main` contains the overnight branch when work starts, step 1 uses `main` instead; nothing else changes.

### 11.2 Fable's second pass: decided

| G | Build does (78a4f3138) | Decision |
|---|---|---|
| G95 | 3-minute lesson uses `?quick=1` | **Adopt `quick=1`** (reverses G55/F15 naming). Checked: the lesson page's quick check is an element id (`#alef-quick-start`), not a query key, so nothing collides. Sections saying `short` read `quick`. |
| G96 | Pays after 4 parts shown in one sitting (`QUICK_PARTS = 4`); a lesson of ≤ 4 parts ends with its normal end card | **Adopt with two fixes** (F25, F26 below). "One sitting" = same route hash without leaving it. The quick payout is `final:true, quick:true`: 10 XP, completes the streak day, `lessonsFinished + 1`, does not complete the lesson. |
| G97 | Rimon's bubble line arrives as `detail.say = {he, en}` | **Adopt** (replaces `detail.line`). `cueRimon` puts the pair in `say`. |
| G98 | Seven-day strip with snowflake in the Home goal card | **Adopt** the place (F17 satisfied for the strip). The one streak line in that card must still use the 1.1 state table and G26 (no `at-risk` Friday 18:00–Saturday 21:00). |
| G99 | Calendar fallback on `#/shop` and on the iPhone opt-in card, Sunday–Thursday | **Adopt** (F18 done). |
| G100 | S02 and S07 wired; S05 and S08 not sent | **Decided:** S01, S02 kept (retention is the sender, G80, and its fallback to overnight lines covers only `holiday`, `milestone`, `welcome`; `holiday` includes the overnight `erev-shabbat` line, which replaces S05). S05 and S08 are removed from `messages.js`. This replaces F19 and the S-line parts of G56. Catalogue: 24 E + 20 D + 20 R + 7 S = 71 lines. |
| G101 | Hearts and league switches stored in the record (`hearts.enabled`, `league.enabled`: `true`, `false` or `null` = automatic), set on `#/shop` | **Adopt.** Replaces G10 and the 5.4 `hearts`/`leagues` settings keys (they are not added to `settings.js`). Calm mode stays the settings key that overrides both. |
| G102 | Repair offer window: 48 h from the rollover that detects the break (`until = now + 48 h`), offered only when missed days ≤ 3 and the streak was ≥ 2 | **Adopt** and specify (11.4). |

### 11.3 Fix list status after the second pass

| # | Status at 78a4f3138 | Still required |
|---|---|---|
| F1 | Open (`shabbatCoversFriday: true`) | Set `false` (D9) |
| F2 | Open (no `final` flag) | As written in 10.4 |
| F3 | Open (`isLessonHash` only `#/learn?…lesson=`) | Add `^#\/intermediate\/[^/?]+` |
| F4 | Open | The resume record is store key `lesson.resume.v1` (`RESUME_KEY` in `src/curriculum/chunks.js`): no gate when it has an entry for this lesson id; for `#/intermediate/:id`, no gate when that lesson has saved progress |
| F5 | Open | As written in 10.4 |
| F6 | Open (`GOAL_CHOICES` 10/20/30/50 picker) | As written; the goal ring stays, the picker goes |
| F7 | Open and live on overnight (G93) | G80; also do not show retention's `optInCard` when `src/shell/reminder-ask.js` exists |
| F8–F14 | Open | As written in 10.4 |
| F15 | Done as `?quick=1` (G95) | F25, F26 |
| F16 | Done as `detail.say` (G97) | None |
| F17 | Strip done; state wording unchecked | Streak line uses 1.1 states and G26 |
| F18 | Done | None |
| F19 | Replaced by G100 | Remove S05, S08 |
| F20, F21 | Overnight files; open | As written |
| F22 | Done (`retention.browser.test.js`) | Add 11.8 browser cases |
| F23 | Not applicable | None |
| F24 | Ten tier names plus the new bubble lines are in `docs/retention/HEBREW-REVIEW.md` | Native review (not code) |
| F25 | `partShown` returns null in calm mode, so a calm learner's 3-minute lesson pays nothing and does not count the day | Calm mode still pays XP and completes the day; it only skips the card animation and Rimon |
| F26 | Parts are counted when shown, so the payout comes when part 4 opens (3 parts done) | Count a part when the NEXT part is shown or the lesson ends; pay when 4 parts are done |
| F27 | `EXEMPT` hearts routes list `/pray` and `/siddur` (no such routes) and miss `/trope` and `/text`-style reading routes | Use the route list in 2.3 exactly |
| F28 | `maxAsks: 2` | `maxAsks: 1` (G88) |

### 11.4 Defaults (single table; values are the build's unless marked changed)

| Constant | Value |
|---|---|
| Streak day | 300 engaged seconds (existing) OR a `final` lesson end OR a quick payout |
| Milestones / gems | 3:5, 7:25, 14:30, 30:50, 50:75, 100:100, 365:200, once per install |
| Freezes | price 200, hold max 2, all-or-nothing, judged once (`evaluatedThrough`) |
| Repair | 150 gems per missed day, missed days ≤ 3, streak before break ≥ 2, window 48 h from detection |
| Travel grace | one missed day free when zone changed and < 36 h real time passed |
| Free rest days | Saturday and Yom Tov for everyone; Friday and Yom Tov eves NOT (changed by F1) |
| At-risk line | from 18:00 local, never Friday 18:00 to Saturday 21:00 |
| XP | lesson 10; accuracy ≥ 0.9 +5; combo +2 per 5 in a row, cap +6; review 1 (20/day); refill round 5; game with ≥ 1 star 3 (15/day); quick payout 10 |
| Daily XP goal | Home minutes goal × 4 (changed by F6): 5→20, 10→40, 15→60, 20→80, 30→120 |
| Gems earned | goal 10/day, accuracy 2, first lesson 50 (only if no lesson was finished before install of retention, F5), promote 50, rank 1 100, tier-10 top 3 100 (one per week) |
| Hearts | max 5, +1 per 4 h, +1 per 5 review ratings (+5 XP if ≥ 4 rated Good/Easy), refill all 350 gems, unlock after 3 lessons |
| League | 29 pretend players, baseline 120 until 2 joined weeks, week Sunday 00:00 to Friday 14:00, unlock after 5 lessons, `paceOf` curve |
| Reminders | sender: retention scheduler; 08:00–21:00 only; also the overnight `isRestTime` gate; first fire about 23.5 h after the last session, moved to the typical half-hour when within 2 h; at most 1 a day, ≥ 3 h apart; no repeat in last 10; stop after 14 days away; ask once (changed by F28) |
| Service worker | Periodic Sync tag `alef-rimon`, min interval 12 h, plan in cache `alef-retention` at `__alef/rimon-plan.json` |
| Quick lesson | `?quick=1`, 4 parts done (F26) |
| Storage | one key `retention.v1` (`alef:retention.v1` in localStorage), in every backup |

### 11.5 State transitions

**Streak day (per local date).** `open` → (300 s engaged, or `final` end card, or quick payout) → `done`. At rollover, each unjudged past day is: `done`; `rest` (Saturday/Yom Tov, engine freeze, declared rest); `travel` (G-rule above); `frozen` (freezes cover the whole gap); else the gap is `missed` and the streak shows broken. Rollover runs at boot, on becoming visible, and at local midnight + 5 s; it is idempotent.

**Repair offer.** `none` → (rollover finds a break with ≤ 3 missed days and streak ≥ 2) → `offered {days, prev, until = now + 48 h}` → (learner pays) → `none`, missed days marked rest, count = prev + days earned since → or (`now > until`) → `none`. Buying a freeze during `offered` does not repair.

**Hearts.** Off (calm, switch off, < 3 lessons) ↔ On. On: `n` 5..0. Wrong first answer on a lesson route → n − 1 (n = 5 → set `lastRefillAt`). Every read applies time refill. `n = 0` → new lessons gated (resume exempt, F4); current lesson continues. +1 per 5 review ratings, or all 5 for 350 gems. Turning hearts off at 0 removes the gate at once and keeps `n` for later.

**League week.** `locked` (< 5 lessons or switched off) → `unjoined` (week started, 0 XP) → (first XP) → `joined` → (Friday 14:00) → `ended` → (next open) → `settled` (one payout, tier change, `resultUnseen`) → (results card seen) → next week. XP earned Friday 14:00 to Saturday 23:59 is carried into the next week.

**Reminder opt-in.** `never asked` → (first `final` lesson, not calm, supported) → ask card → `yes(tone)` / `denied` / `later`. `later` and `denied` are final (ask once). iPhone tab → calendar card once. `yes` → scheduler armed, old study reminder disarmed (G80).

**Reminder ladder.** daysAway 0–2 Encourage; 3–4 Disappointed; 5–13 Disappointed (Kind) or Roast/Disappointed (Playful); 14 the `final` line, then `stopped` until the next streak day.

**Quick lesson.** `?quick=1` opened → parts done counted per route hash → 4 done → quick payout card ("Keep going" / "Done for today") → if the learner keeps going, the lesson's own end card later pays normally (a second payout for the same lesson on the same day is a duplicate and pays nothing).

### 11.6 Edge cases (each needs a test, 11.8)

| Case | Required behaviour |
|---|---|
| Two tabs | Store `update` merges per key; at most one reminder per day (G18 lock); rollover idempotent |
| Clock moved back | Nothing spent, nothing broken, no reminder resent |
| Zone change mid-league-week | Week boundaries use the zone at settlement; no double settlement |
| DST change | Wall-clock times built in local time; "23.5 h" is elapsed time on purpose (G34) |
| Storage unavailable or full | Store's memory fallback; retention never throws; no gem spend is shown as done unless saved |
| Corrupt `retention.v1` | Defaults; raw copy in `.corrupt` once |
| Backup from before retention restored | Record recreated; F5 counts completed lessons again; no first-lesson gems if any lesson is complete |
| Backup with a newer `v` | Read only, never written |
| Permission revoked | Scheduler stops; ask card not shown again |
| Calm mode turned on mid-lesson | Hearts stop counting at once; payouts still saved, no animation |
| Hearts switched off at 0 | Gate removed immediately |
| Learner on `#/torahread` with 0 hearts | Never gated |
| Lesson with ≤ 4 parts in quick mode | Normal end card only; one payout |
| App closed for 20 days | Rollover scans at most 45 days; reminders: final line at 14, then silent; repair not offered (> 3 missed) |
| Yom HaShoah, Yom HaZikaron, Tisha B'Av | No reminder, no Rimon cue (G44, F13) |

### 11.7 Acceptance criteria for `retention/fixup-2026-11-10`

1. `npm test` passes with all `tests/retention/*.test.js` and the existing suite.
2. The Playwright file passes locally at 320, 360 and 390 px, with reduced motion and calm mode cases.
3. Exactly one reminder offer card appears on the first lesson end card (overnight `reminder-ask.js`, with the tone radio).
4. In a 21-day simulated run (fake clock, no study after day 1, Playful tone), the sent log has at most one entry per day, none Friday 12:00 to Saturday 23:59, none outside 08:00–21:00, none on solemn days, the `final` line on day 14 and nothing after.
5. A stage fed a full lesson plus every retention cue records only the lesson's real answers.
6. Each F item in 11.3 has a passing test named after it (`F1 …` in the test title).
7. `docs/retention/IMPLEMENTATION.md` "Where This Differs From the Spec" lists only D9/D10 if John has not decided them, and nothing else.
8. Nothing is merged or deployed; John reviews the branch.

### 11.8 Tests added in round 4 (99–116)

99. G94: cherry-picked tree has `sayLine` exported from `mountSpeechBubble` and the overnight `again` line unchanged.
100. G93/F7: end card contains exactly one `.remind-ask` card and no `.ret-optin` when `reminder-ask.js` exists.
101. F7: after `turnOnReminders('kind')`, `notify.prefs.enabled` is false and the overnight `cancelAll` was called.
102. F25: calm mode, `?quick=1`, 4 parts done → +10 XP, streak day done, no card animation.
103. F26: parts shown 1,2,3,4 with no finish → no payout; part 5 shown → payout.
104. G95: `#/learn?lesson=x&quick=1` mounts the short-parts player; `#/learn?lesson=x` still renders `#alef-quick-start` when the lesson is not chunked.
105. G96: quick payout then the lesson's end card on the same day → second lesson XP paid, no duplicate quick payout; streak counted once.
106. G100: `messages.js` has 71 lines, no `S05`, no `S08`.
107. G101: `hearts.enabled = false` removes the gate at `n = 0`; `null` follows the 3-lesson rule.
108. G102: break found at t0 with 2 missed days → offer until t0 + 48 h at 300 gems; at t0 + 48 h + 1 ms → no offer; 4 missed days → no offer.
109. F27: hearts never apply on `#/trope`, `#/read/x`, `#/service`, `#/morning`; apply on `#/learn?lesson=x` and `#/intermediate/I-01`.
110. F28: after one `later` answer, `shouldAsk` is false forever.
111. 11.6 two tabs: two schedulers firing 1 s apart → one log entry.
112. 11.6 zone change mid-week: settlement once, week id unchanged.
113. 11.6 backup restore without `retention.v1` and 3 completed lessons → `lessonsFinished = 3`, no first-lesson gems.
114. 11.6 20 days away: rollover scans ≤ 45 days; no repair offer.
115. Acceptance 4 as an automated unit test with a fake clock.
116. Acceptance 5 as an automated unit test feeding the stage tracker.

### 11.9 Contradictions removed in round 4

G55/F15 naming (`short`) → `quick` (G95). G8's "stops after part 1" → 4 parts (G96). `detail.line` → `detail.say` (G97). F19 and the S-line part of G56 → G100. G10 and 5.4 `hearts`/`leagues` settings → record switches (G101). G67 merge order → G94. Round-1 test 70 ("quick lesson end → 10 XP after part 1") → test 102/103 rules. Round-2 tests 94 (`short=1`) → test 104.
