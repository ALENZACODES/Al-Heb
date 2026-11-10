# ALEF Retention Mechanics: Implementation Spec (2026-11-10)

Status: PLAN ONLY. Nothing in this document has been built or tested. It is written against `main` at commit `907caadc3`.
Audience: the engineer who builds it. Every rule, number, key, file and string is fixed here. Where a product choice was open, a default is set in section 0.3 so the build never stops for a question.

Revision: review round 2 of 5 (2026-11-10). Round 1 gaps: section 8 (G1–G38). Round 2 gaps: section 9 (G39–G66). Round 2 re-checked the file against `main` at `b574744f6` (no `src` change since `907caadc3`) and `overnight/launch-ready-2026-11-10` at `8102de323`, which adds a Rimon reminder system, Rimon stills and a streak flame. The older text has been corrected in place; where a section points to a G number, that entry has the detail.

Scope: the three groups John listed.
1. Streak and loss aversion: streak, streak freezes bought with seeds (ALEF's gems), 3-minute lessons.
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
| Badges | `src/awards/*` (`streak-2` … `streak-365`) | Streak medallions from the streak engine | Untouched. Seeds are paid alongside them (section 1.4). |
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
9. No money. Seeds, freezes and hearts can never be bought with real money, and no ads (decision D4).

### 0.3 Defaults for open product choices (the build uses these; John can flip any later)

| ID | Question | Default used |
|---|---|---|
| D1 | What completes a streak day? | Either 300 engaged seconds (unchanged) OR finishing one lesson or one quick lesson. |
| D2 | Hearts on by default? | Auto-on after the learner's 3rd finished lesson; never in calm mode; can be switched off in Settings. |
| D3 | Leagues without a server | Simulated cohort, clearly labelled as pretend players (section 2.2). |
| D4 | Real-money purchases | None, ever. |
| D5 | Roast tier | Off unless the learner picks "Playful Rimon" when opting in. Default tone is "Kind Rimon". |
| D6 | Paid streak repair (Duolingo-style) | Not built. A broken streak stays broken; `best` is kept. |
| D7 | XP vs preview `loops.v1` points | Separate. `loops.v1` is not read or written. |
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

- Price: 200 seeds. Maximum held: 2. Bought on `#/seeds` (section 2.4) or from the streak card's "Get a freeze" link (shown only when `held < 2` and balance ≥ 200).
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
    seeds ledger: no change
else: nothing spent
ret.freezes.evaluatedThrough = to
write both keys with store.update (streak first, then retention)
```

`withDeclaredRest` is a no-op on pre-v2 streak records. If `streakRaw.v !== 2`, call the existing engine's `rollover(streakRaw, now)` and store the result first so it becomes v2. This is existing API, not a change to it.

### 1.4 Seeds paid by the streak

Each milestone is paid once per install, ever. Paid milestones are recorded in `ret.seeds.paidMilestones` (e.g. `[7, 30]`). A rebuilt streak that reaches 7 again pays nothing. Checked after every `completeDay` against `projectStreak(...).count`:

| Streak reaches | Seeds |
|---|---|
| 7 | 25 |
| 30 | 50 |
| 100 | 100 |
| 365 | 200 |

### 1.5 Time zones, travel, clocks

- Day keys always use the device's current local zone (existing `dayKey`). Store `ret.lastTz = Intl.DateTimeFormat().resolvedOptions().timeZone` at every session start.
- Travel grace: if the zone changed since the last session, any single missed day is covered free when the real elapsed time between the last session end and now is < 36 h. Covered days go to `ret.travelCovered` (keep 30) and into the streak's `frozenDates` through `withDeclaredRest`. Shown in the strip like a freeze but labelled "Travel day".
- Clock moved backwards (gap < 0): existing engine already does not punish. Retention does nothing.
- DST: all wall-clock times are built with `new Date(y, m, d, hh, mm)` in local time; never add 24 h in milliseconds to get "same time tomorrow".
- A lesson started at 23:58 and finished at 00:02 counts for the day it finished (existing `completeDay(now)` behaviour).

### 1.6 Low friction: the 3-minute short lesson

- Home's primary button reads "3-minute lesson" (`aria-label="Start a three-minute lesson"`). It opens the learner's next lesson with `?short=1`.
- `?short=1` reuses the existing short-session chunking (`comfort.chunkedLessons`): the lesson runs one chunk of at most 8 questions, then the end card. Target median 180 s; the build does not enforce a timer and never shows a countdown.
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
| Finish a game round with ≥ 1 star | 3 | 15 per day | existing `games/engine.js` / `arcade.js` end (`stars`) via new `alef:game-finished` event |
| Reach the daily XP goal | 0 XP, +10 seeds | once per day | computed |

Daily goal: no new goal control. Home already has a daily goal in minutes (`DAILY_GOAL_KEY` / `normalizeDailyGoal` in `src/home/today.js`: 5, 10, 15, 20 or 30, default 5). The XP goal is that number × 4 (5 → 20 XP, 10 → 40, 15 → 60, 20 → 80, 30 → 120), read fresh every time it is needed. A goal ring shows "{x} of {goal} XP today" (text always beside the drawing).

Payout moment on the lesson end card, in this order (total ≤ 2.2 s, all skipped instantly on any tap):
1. t=0: existing Rimon `highfive`/`bounce`, confetti and sting already fire.
2. t=300 ms: an XP chip "+15 XP" under the cheer line. Motion: scale 0.6 → 1.0 over 250 ms, then the "today" total counts up from old to new over 600 ms (`requestAnimationFrame`). Reduced motion or calm: chip appears at full size with the final number, no count-up.
3. If the daily goal was crossed: line "Daily goal reached! +10 seeds", Rimon `laugh` (queued after the cheer by the animator's priority queue).
4. If the streak grew: line "{n}-day streak!". No Rimon cue: the existing flame card lights with its own sound and Rimon stretch (G43).
5. Live region: one `role="status"` sentence that combines all of it, e.g. "Lesson finished. 15 XP. Daily goal reached, 10 seeds. 4-day streak." Announced once.

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
- Player weekly target `T_i = B × m_i`, with `m_i` from a fixed table sorted to spread the field: for tier t, `m_i = 0.35 + 1.6 × (i/28)^1.3 × (1 + 0.04 × (t − 1))`, i = 0..28, then multiplied by jitter `0.9 + 0.2 × rand()`. The result: a learner who does their usual week lands mid-table; about 25% above their usual promotes.
- Progress through the week: `xp_i(now) = round(T_i × curve(f))`, f = elapsed fraction of the league week. `curve(f) = f` with a per-player phase: player i adds its XP in 6 daily steps (Sun–Fri) with step sizes from `rand()` normalised to sum 1. Pretend players earn nothing during Friday 18:00 to Saturday 21:00 (not inside the week anyway).
- Ranking: by XP descending. On a tie the learner ranks above the pretend player.

#### Settlement
At the first app open after the week ends: compute final ranks with f = 1, apply the promote/demote table, push `{week, tier, rank, xp, result:'up'|'stay'|'down'}` to `league.history` (keep 26), set the new tier, set `league.resultUnseen = weekId`. Seeds: exactly one payout per settled week, the first that applies: tier 10 and rank ≤ 3 → 100; rank 1 → 100; promoted → 50; otherwise 0. (Section 8 G14–G16 add the curve, draw order and multi-week rules.)

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
  - Tertiary (only if balance ≥ 350): "Refill all hearts for 350 seeds"
  - Line: "Review is always open. Practising old words is how memory sticks."
- Win back by practising: a refill round is 5 due review cards (from `src/curriculum/srs.js` `due()`; if fewer than 5 are due, the oldest-reviewed cards fill the round). Finishing the round with ≥ 4 right gives +1 heart and +5 XP; with fewer than 4 right it still gives +1 heart (the reward is for practising, not for being perfect). One round = one heart.
- Time refill: +1 heart per 4 hours since `hearts.lastRefillAt`, computed lazily on read, capped at 5.
- Reading, prayer, Torah, songs, games: never cost hearts, never gated.
- Header chip (lesson pages only, when hearts are on): "♥ 4" with `aria-label="4 of 5 hearts"`.

| Moment | Copy | Rimon |
|---|---|---|
| First heart lost in a session | "Oops, one heart. You've got this." | `nervous` |
| Down to 1 heart | "One heart left. Take your time." | `thinking` |
| 0 hearts (end card) | "Out of hearts for now. Practise a few old words to earn one back." | `sad` then `point` |
| Heart won back | "+1 heart! Memory, meet muscle." | `bounce` |
| Refill with seeds | "Hearts full. Off you go!" | `highfive` |

### 2.4 Seeds (ALEF's gems)

Name: "seeds" (a pomegranate is full of them). Hebrew label: גַּרְעִינִים [NATIVE REVIEW]. Icon: a small red seed glyph drawn in CSS (no new image required).

Earned only, never bought:

| Source | Seeds |
|---|---|
| Daily XP goal reached | 10 |
| Lesson with accuracy ≥ 0.9 | 2 |
| Streak 7 / 30 / 100 / 365 | 25 / 50 / 100 / 200 |
| League promotion / rank 1 / top 3 in tier 10 | 50 / 100 / 100 |
| First lesson ever | 50 (so a freeze is reachable in the first week) |

Spent on (`#/seeds`, route title "Seeds"):

| Item | Price | Limit |
|---|---|---|
| Streak freeze | 200 | hold 2 |
| Refill all hearts | 350 | only when hearts < 5 and hearts are on |

`#/seeds` shows balance, the two items with plain-language effects ("Covers one missed day automatically"), and the last 10 ledger lines ("+10 Daily goal, Tuesday"). Buying asks once: "Spend 200 seeds on a streak freeze?" with "Yes, buy it" / "Cancel". On buy: Rimon `wink`, line "Freeze ready. Rimon's keeping it cold."

---

## 3. Notifications and Rimon's tone

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

New file `src/retention/rimon-cue.js`. It does not define or export `showRimon` or `SITUATIONS` (both already exist in `src/shell/rimon-show.js` with a different meaning: stills).

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
| `freeze_bought` | `seeds.view.js` |
| `heart_lost`, `heart_last` | `hooks.js` on a counted wrong answer |
| `hearts_empty` | `hearts.view.js` |
| `heart_back` | `hearts.js` after a refill round |
| `hearts_refilled` | `seeds.view.js` |
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
  "seeds": { "balance": 0, "ledger": [ { "at": 0, "d": 0, "why": "goal" } ], "paidMilestones": [], "goalPaidOn": null },  // ledger keep 100; goalPaidOn = ISO day the goal seeds were last paid
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
| `hearts` | auto, on, off | auto | D2. `auto` = on from the 3rd finished lesson. `on` before lesson 3 still waits for lesson 3. |
| `leagues` | auto, on, off | auto | `auto` = on from the 5th finished lesson. `off` stops tracking; `unlockedAt` is kept. |

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
| 5 | `src/retention/seeds.js` | `earn`, `spend` (returns `{ok, reason}`), prices, milestone payouts | `tests/retention.seeds.test.js` |
| 6 | `src/retention/freeze.js` | `buyFreeze`, `applyMissedDays(streakRaw, ret, now)` (1.3), `travelGrace` (1.5) | `tests/retention.freeze.test.js` |
| 7 | `src/retention/hearts.js` | `heartsOn(ret, settings, route)`, `loseHeart`, `refillByTime`, `refillByPractice`, `refillBySeeds`, `canStartLesson` | `tests/retention.hearts.test.js` |
| 8 | `src/retention/league.names.js` | 120 names | (covered by 9) |
| 9 | `src/retention/league.sim.js` | `mulberry32`, `fnv1a`, `cohort(installId, weekId, tier, baseline)`, `standings(cohort, learnerXp, now)`, `settle(ret, now)` | `tests/retention.league.test.js` |
| 10 | `src/retention/tone.js` | `kindFor3_3({daysAway, tone, nextRoast, stopped, special})` returns a kind or null (3.3); the 70 lines themselves are added to `rimon-reminders.js` (6.2) | `tests/retention.tone.test.js` |
| 11 | `src/retention/timing.js` | `logSession`, `typicalMinute`, `autoTimeUpdate(prefs, ret, notifyRet)` (3.4); `daysAway` comes from `src/home/today.js` | `tests/retention.timing.test.js` |
| 12 | `src/retention/rimon-cue.js` | section 4 | `tests/retention.rimon.test.js` |
| 13 | `src/retention/plan.js` | 14-day Cache Storage plan writer using `composeReminder`, periodic sync registration (3.5); no in-page timer (the existing `notify.js` is that) | `tests/retention.plan.test.js` |
| 14 | `src/retention/hooks.js` | listeners: `alef:celebrate`, `alef:rimon` (source lesson/review), `alef:game-finished`, `hashchange`/`visibilitychange` sessions; calls 4–13 | `tests/retention.hooks.test.js` |
| 15 | `src/retention/boot.js` | `armRetention(ctx)`: rollover, settle league, once-per-day greeting, arm scheduler | (covered by e2e) |
| 16 | `src/retention/retention.css` | chip, ring, league table, seed glyph; `@media (prefers-reduced-motion: reduce)` and `[data-calm]` turn off every animation | a11y browser test |
| 17 | `src/retention/xp-payout.js` | end-card payout node (2.1) | `tests/retention.payout.test.js` |
| 18 | `src/retention/streak-line.js` | one status line with the 1.1 states, rendered under the existing Home flame (`.alef-streak-flame`, `data-streak-slot="home"`) plus the seeds/league row (G53) | `tests/retention.streakline.test.js` |
| 19 | `src/retention/hearts.view.js` | chip + 0-heart end-card block | `tests/retention.heartsview.test.js` |
| 20 | (none) | the opt-in is the existing `reminder-ask.js`, extended in 6.2 | `tests/retention.optin.test.js` |
| 21 | `src/retention/league.view.js` | `#/league` | `tests/retention.leagueview.test.js` |
| 22 | `src/retention/seeds.view.js` | `#/seeds` | `tests/retention.seedsview.test.js` |
| 23 | `docs/retention/README.md` | what is built, what is pretend, what each key holds | none |

### 6.2 Additive edits to existing files (one commit each, after 6.1)

| File | Edit |
|---|---|
| `src/curriculum/exercises.ui.js` line 92 (main) / 104 (overnight) | `signalRimon(ok ? 'correct' : 'wrong', { source: /[?&]review=1/.test(location.hash) ? 'review' : 'lesson', questionId: <the question's id or its index in the quiz> })` (keep the same actions; check which id field the question objects carry before writing this line) |
| `src/curriculum/exercises.ui.js` `mountQuiz` | at mount dispatch `alef:quiz-start {quizId}` (`quizId` = random 12-char id); include `quizId` and `qIndex` in the line-92 `signalRimon` detail (G5) |
| `src/curriculum/exercises.ui.js` `summaryNode` | `d.final` (optional, default `true`) and `d.short` (optional, default `false`) are passed through; add to the `alef:celebrate` detail: `eventId`, `final`, `short`, `answered`, `right`, `ms: d.ms`, `route: location.hash`; append `xpPayoutNode(...)` (the opt-in stays the existing `.alef-remind-slot`) via a lazy import that fails silently (same pattern as `preview/loops/hook.js`); hide "Next lesson" when `!canStartLesson` and show the hearts block instead |
| `src/curriculum/intermediate.view.js` line 365 | pass `final: all` to `summaryNode` (G2) |
| `src/curriculum/review.view.js` | after a successful `rateCard` in `rate(n)` dispatch `alef:card-rated {cardId, rating:n}`; when `?refill=1`, build the queue with `limit: 5` instead of 20 and, when the queue empties, dispatch `alef:review-finished {refill:true, ratings:[…]}` (G3, G4) |
| `src/curriculum/lesson.view.js`, `src/curriculum/intermediate.view.js` | on mount, if `canStartLesson` is false and the lesson has no resume record, render the hearts block instead of the lesson (G7); `lesson.view.js` also honours `?short=1` (G8) |
| `src/curriculum/lesson.parts.js` | `short` option: stop after part 1 and pass `final:true, short:true` to `summaryNode` without calling `completeLesson` (G8) |
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
| `src/shell/router.js` | `{ name:'league', pattern:'/league', module:'../retention/league.view.js', title:'League', owner:'retention', optional:true, group:'learn', quick:'nav.league' }` and the same for `seeds` (`title:'Seeds'`) |
| `src/shell/nav.strings.js` | `nav.league: 'League'`, `nav.seeds: 'Seeds'` |
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
14. `held` never exceeds 2; buying with 199 seeds fails with `reason:'balance'`.

**XP and seeds**
15. Lesson accuracy 0.95 → +15 XP, +2 seeds. Same `awardId` twice → paid once.
16. 25 `alef:card-rated` events in one day → 20 XP.
17. Crossing the goal pays 10 seeds once per day (`goalPaidOn`), even if the minutes goal is lowered and the goal is crossed again.
18. Streak reaching 7 pays 25 once; a later streak reaching 7 again pays nothing (`paidMilestones` is per install).
19. First lesson ever pays 50 seeds.
20. Ledger and `recentIds` trimmed to caps.

**Hearts**
21. Hearts off before the 3rd finished lesson, in calm mode, with setting off, and for an answer event on `#/torahread`, `#/learn?review=1` and any game route.
22. Wrong first answer → −1; wrong retry of the same `quizId:qIndex` (including the end-of-quiz repeat) → no change; an `alef:rimon` event without `source` → no change.
23. 0 hearts → `canStartLesson` false; the current lesson still finishes and pays XP.
24. Time refill: lastRefillAt 9 h ago at 2 hearts → 4 hearts.
25. Refill round, ratings [1,2,3,3,4] (3 counted right) → +1 heart, no XP bonus; ratings [3,3,4,3,2] (4 right) → +1 heart, +5 XP; a round left before 5 ratings → nothing.
26. Seeds refill at 350 → 5 hearts, balance −350; at 5 hearts the option is absent.

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
58. Fresh install: no opt-in card on first open; finish quick lesson → payout "+10 XP", "+50 seeds" ledger line, opt-in card visible, Rimon host `data-action` becomes `highfive` or `bounce`.
59. Ask card with Playful picked, "Yes, nudge me" with a stubbed `Notification` (granted) → `notify.prefs.enabled` true and `retention.notify.v1.tone = 'playful'`; "No" → `notify.asked` set, card never shown again.
60. Reduced motion (`page.emulateMedia({reducedMotion:'reduce'})`): no element under `.alef-retention` has a running animation (`getAnimations().length === 0`), the XP number is final at first paint.
61. Calm mode: no hearts chip, no league route content, no streak count, no opt-in card.
62. Hearts: seed state with 1 heart and 3 lessons done, answer wrong → chip shows "♥ 0", end card shows "Practise to earn a heart", no "Next lesson" link.
63. `#/league`: honesty line visible and above the table; 30 rows; learner row labelled "You"; zero axe violations.
64. `#/seeds`: buy freeze with 250 seeds → balance 50, held 1, confirmation dialog first.
65. Seeded broken-gap state with 1 freeze → Home shows the freeze-used line, and the Progress 7-day strip shows a snowflake on the covered day.
66. Widths 320/360/390 px: nothing clipped sideways on Home, `#/league`, `#/seeds`, the end card.
67. Clock fixed to Friday 19:00 (`page.clock`): scheduler shows no notification even when due.
68. Service worker test: plan in Cache Storage, dispatch a synthetic `periodicsync` → exactly one notification when due, none inside a quiet range.

### 6.4 Hebrew review list

Every new Hebrew string, for the native reviewer (none are to be treated as final):
`גַּרְעִין`, `נֶבֶט`, `שֹׁרֶשׁ`, `עָנָף`, `עָלֶה`, `פֶּרַח`, `פְּרִי`, `פַּרְדֵּס`, `כֶּתֶר`, `רִמּוֹן זָהָב`, `גַּרְעִינִים`, `עוֹד לֵב!`, `עוֹלִים שָׁלָב!` (13 strings; the greeting strings were dropped in round 2, G57). Add all to `docs/hebrew-lint/` with status `needs-native-review`.

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

**G4. The heart-refill round was undefined in code terms.** Rule: `#/learn?review=1&refill=1` builds the queue with `limit: 5`. If fewer than 5 cards are due, it uses whatever `buildQueue` returns; with 0 due it shows "Nothing is due. Here are 5 older cards." and fills from cards sorted by oldest `last` review. "Right" = rating ≥ 3 (Good or Easy). When the 5th rating is saved, the view dispatches `alef:review-finished {refill:true, ratings}`; `hearts.js` adds 1 heart and, if ≥ 4 right, 5 XP (awardId `refill:{ms}`). Leaving early gives nothing. The refill route is reachable at any heart count; above 5 hearts it pays only the per-card XP.

**G5. "Same question" had no identity.** Rule: `mountQuiz` dispatches `alef:quiz-start {quizId}` at mount and adds `quizId` and `qIndex` (index in the original question list) to each answer event. `hearts.js` keeps `{quizId, lostIn:[qIndex…]}`; a new `quiz-start` replaces it. A wrong answer costs a heart only if `qIndex` is not in `lostIn` and this is that question's first answer in the quiz (the end-of-quiz repeat of a missed question never costs). "First heart lost in a session" = first loss for this `quizId`.

**G6. Hearts scope named routes that do not exist** ("prayer routes"). Checked against `src/shell/router.js`. Rule: replaced in 2.3 with the exact route list.

**G7. Where the 0-heart gate lives.** Hiding "Next lesson" on the end card was not enough: lessons also open from Learn, Home and links. Rule: `lesson.view.js` and `intermediate.view.js` check `canStartLesson` on mount. If false AND the lesson has no resume record (the existing `RESUME_KEY` in `lesson.parts.js` / intermediate progress), they render the hearts block (2.3) instead of the lesson. A lesson already in progress always opens. Home's "3-minute lesson" button is replaced by "Practise to earn a heart" while hearts are 0.

**G8. How `?short=1` works** (renamed from `quick` in round 2, G55). Checked: `lesson.view.js` line 30 mounts `mountChunkedLesson` only when `chunkedLessons(ctx)` is true. Rule: `?short=1` forces the chunked path regardless of that setting and stops after part 1. The end card is a real end card (`final:true, short:true`) so it pays 10 XP, counts toward `lessonsFinished` and completes the streak day. It does NOT call `completeLesson`; the lesson stays open, and the end card's primary button is "Keep going" → the same lesson at part 2 (resume record). Home's quick button targets the next lesson from `src/home/nextlesson.js` `nextLesson(...)`, with the same arguments Home already passes.

**G9. Two daily goals.** Checked: Home already stores a minutes goal (`today.js`, 5/10/15/20/30). Rule: no XP goal setting; XP goal = minutes × 4 (2.1). `dailyGoalXp` and `retention.v1.goal` are removed.

**G10. Duplicate on/off state.** `hearts.enabled` and `league.enabled` existed in both settings and the record. Rule: settings only (5.4).

**G11. Existing learners.** (a) When `retention.v1` is first created, `lessonsFinished` = number of keys in `curriculum.progress.completed` (checked: `PROGRESS_KEY` in `src/curriculum/dom.js`), so learners who already finished 3 lessons get hearts at once and 5 get leagues at once. They are NOT paid the 50 "first lesson" seeds unless `lessonsFinished` was 0. (b) Replaced in round 2 by G45: on overnight the study reminder already speaks in Rimon's voice, so there is one reminder system and nothing to switch between.

### 8.2 Rules that were ambiguous

**G12. Goal seeds once per day** had no field. Rule: `seeds.goalPaidOn` (ISO day). Pay only when `goalPaidOn !== today`.

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

**G29. How learners find Seeds and League.** Rule: Home shows one row under the streak card: "{balance} seeds" linking to `#/seeds`, and, when leagues are on, "{tier}: {rank}th" linking to `#/league`. Both are also in the router quick menu (6.2). Calm mode hides the row.

**G30. Where copy lives.** Rule: every learner-facing English string in this spec goes in one file, `src/retention/strings.js` (a frozen object keyed by id). Reminder lines go in `rimon-reminders.js` (3.6). Settings copy: "Hearts" with help line "Mistakes in lessons cost a heart. Practise old words to win them back."; "Practice league" with help line "A weekly race against pretend players paced to you."; "Rimon's reminders" with "Off / Kind Rimon / Playful Rimon (for adults)".

**G31. Colours.** Rule: use the existing theme variables (`--accent` and the dark-green/gold palette already in the app CSS); no new colour variables except `--alef-seed` for the seed glyph, which must reach 3:1 against both light and dark backgrounds (checked by the existing a11y colour test pattern).

**G32. Calendar fallback days.** Rule: the `.ics` event repeats `RRULE:FREQ=WEEKLY;BYDAY=SU,MO,TU,WE,TH` at the typical time (no Friday or Saturday event), titled "Hebrew with Rimon (3 minutes)".

**G33. Backup, delete, privacy.** Checked: `src/store.js` backup and clear operate on every key with the `alef:` prefix, so both new keys are backed up and wiped with no extra code. Rule: add one sentence to `privacy.view.js`: "Your XP, seeds, hearts, practice league and reminder times are kept on this device only." Nothing is sent anywhere; no telemetry is added.

**G34. Time arithmetic.** `nextFire`'s "+23 h 30 min" is elapsed time on purpose (it can drift an hour across a DST change), then clamped to wall-clock windows. Every other "same time tomorrow" uses local wall-clock construction (1.5).

**G35. Shared helpers.** `fnv1a` and `mulberry32` live in `src/retention/clock.js` (not in `league.sim.js`) so other retention modules can use them without importing the league.

**G36. Which games pay XP.** Only games that end through `src/games/engine.js` or `src/games/arcade.js`. Other game views (for example `wordfinder.view.js`) pay nothing in v1; the README says so.

**G37. Precache.** All files from 6.1 (JS and CSS) are added by running `npm run precache` after the last commit; the commit that does this is the last one on the branch.

**G38. Time refill arithmetic.** Rule: when a heart is lost while `n === 5`, set `lastRefillAt = now`. On every read: `gained = floor((now − lastRefillAt) / 4 h)`; `n = min(5, n + gained)`; `lastRefillAt += gained × 4 h`; if `n === 5`, `lastRefillAt = 0`. Practice and seed refills do not reset the timer unless they bring `n` to 5.

### 8.3 Added unit tests (69–86)

69. `alef:celebrate {final:true}` on a v2 streak with `last` = yesterday → count + 1; same event with `final:false` → unchanged, no XP.
70. Quick lesson end → 10 XP, `lessonsFinished` + 1, streak day complete, `curriculum.progress.completed` unchanged.
71. Fresh `retention.v1` with 4 completed lessons in `curriculum.progress` → `lessonsFinished = 4`, hearts on, no 50-seed first-lesson payout.
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

**G39. Which branch to build on.** `main` has no `src` change since the spec was written; the overnight branch has 134 changed `src` files, including Rimon and reminder modules this spec must use. Rule: branch `retention/build` from `overnight/launch-ready-2026-11-10`; if `main` already contains `8102de323` when the build starts, branch from `main` instead. Never merge either into anything (0.2 rule 7).

**G40. Moved anchors.** `signalRimon` in `mountQuiz` is line 104 on overnight. `summaryNode` now also takes `ctx`, `store`, `sfx`, `showStreak` and renders `rimonInline`, `flameCard` and `.alef-remind-slot`. Retention appends its payout after the flame and before the remind slot (G28 order still holds: payout comes before the opt-in). 0.1 and 6.2 updated.

**G41. Name collision.** Overnight already exports `showRimon(situation)` and `SITUATIONS` from `src/shell/rimon-show.js` (stills). The spec's own `showRimon` would have shadowed it. Renamed to `cueRimon(moment)` in `src/retention/rimon-cue.js`, `MOMENTS` instead of `SITUATIONS` (section 4).

**G42. Retention cues would be counted as answers.** The stage's answer tracker counts `bounce wink highfive` as right and `sad` as wrong, and maps `laugh nervous point` to game and lesson stills. Rule: every cue carries `detail.cue: true`; `rimon-stage.js` `onRimon` gets a first-line guard that ignores cue events except for marking activity.

**G43. Double reactions.** The stage already reacts to streak store changes (day milestones, saved, restart, lost, rest), greetings and lesson ends, and the flame card stretches Rimon when the day lights. Rule: retention cues only its own moments (hearts, freezes, league, XP goal, opt-in). 1.1, 2.1 and section 4 updated; the `lesson_complete`, `xp_payout`, `streak_*` (except at-risk), `welcome_back`, `shabbat`, `chag`, `shavua_tov` situations are removed.

**G44. Quiet days, quiet routes, hidden Rimon.** The stage hides Rimon on Yom HaShoah, Yom HaZikaron, Tisha B'Av and on prayer/Torah routes (`body[data-rimon-quiet]`), and `rimon.dismissed` hides the companion. Rule: `cueRimon` returns false in all three cases (section 4).

**G45. A second reminder engine.** Overnight's `notify.js` already speaks with Rimon's lines from `rimon-reminders.js`, chosen at fire time, logged in `notify.log`. Rule: retention builds no scheduler and no message picker. It adds 70 lines to `LINES`, a `state.kind` override in `kindFor`, an `excludeIds` filter in `pickLine`, and the calm/stopped/tone wiring in the `armFromPrefs` show path (6.2). `messages.js` and `scheduler.js` are removed from 6.1 (`tone.js` and `plan.js` replace them).

**G46. Two frequency rule sets.** Rule: the existing caps stay as they are (1 a day, 5 a week, every 3 days from 7 days away, weekly from 14, silent from 45), and the spec's `final` stop at 14 days is applied on top. The ladder in 3.3 is rewritten to use the existing kinds plus `roast` and `final`.

**G47. Two quiet-hour rule sets.** The existing gate (Friday 12:00 to Saturday 23:59, chag and eve from 12:00, solemn days, city window, night 22–07 editable) is wider than John's Friday 18:00 to Saturday 21:00 rule. Rule: it is the only gate; the spec's own 08:00–21:00 clamp and quiet-range builder are dropped (3.2, 6.1 row 2).

**G48. Two opt-in cards.** Overnight's `reminder-ask.js` asks once after the first win. Rule: keep it, ask once (the spec's "ask again after 3 lessons" is dropped), add the tone radio, the iPhone calendar card and a calm-mode check (3.1).

**G49. Personal timing had nowhere to live.** The existing scheduler fires at one daily time. Rule: retention writes the learner's typical time into `notify.prefs.hour/minute` while `autoTime` is on; a manual change switches it off (3.4).

**G50. "+23 h 30 min" rule.** Incompatible with a fixed daily time; dropped (3.4).

**G51. Duplicate stores.** `retention.notify.v1` no longer keeps a send log, ask count or opt-in flag; those are `notify.log`, `notify.asked` and `notify.prefs.enabled` (5.2).

**G52. Copy that contradicts hearts.** Existing line `d16` says "No hearts to lose". Rule: while hearts are on, `d16` is passed in `excludeIds`.

**G53. A second Home streak card.** Overnight already shows a flame under the Home title (`.alef-streak-flame`, `data-streak-slot="home"`). Rule: no new card; `streak-line.js` adds one status line (1.1 states) and the seeds/league row under that flame (6.1 row 18).

**G54. Flame copy ignores D1.** `flame.js` says "N more minutes of study today keeps your streak", but with D1 a finished lesson also completes the day. Rule: the not-lit sub line ends with " Or finish one lesson." (6.2).

**G55. "Quick" already means something.** The lesson page has a "quick check" (`#alef-quick-start`) that completes a lesson. Rule: the 3-minute lesson parameter is `?short=1` and the flag is `short`; learner-facing copy says "3-minute lesson" (1.6, 6.2, G8).

### 9.2 Contradictions removed from the file

**G56. Situational duplicates.** S01, S02 (after Shabbat/chag) and S05 (Friday) duplicated existing `after-rest` and `erev-shabbat` lines; dropped. D8 now points to `erev-shabbat` (Friday before 12:00 only).

**G57. Greeting bubbles.** `welcomeBack`, `chag`, `shavuaTov` bubble lines removed (greetings are the stage's); 6.4 Hebrew list trimmed to 13 strings.

**G58. Solemn days.** The spec never mentioned them; reminders and cues are now silent on Yom HaShoah, Yom HaZikaron and Tisha B'Av (3.2 rule 3, G44).

**G59. Notification click route.** 3.5 said `#/learn?short=1` in one place and `#/` in another; the default is now `#/learn` (the existing reminder route) and a click never starts a lesson on its own.

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
94. `#/learn?lesson=<id>` (no `short`) still renders `#alef-quick-start`; `#/learn?lesson=<id>&short=1` renders part 1 of the chunked flow.
95. `reminderAskCard` with calm mode on → null.
96. Ask card: tone radio defaults to Kind; pressing No saves no tone.
97. Auto time with `quietFrom` 22: typical 21:50 → 21:30; with `quietTo` 7: typical 06:40 → 07:30.
98. Service worker sent ids in the Cache Storage plan are copied into `notify.log` at the next boot, without duplicates.

