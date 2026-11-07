# Engagement and streak check

Date: 2026-11-04. Scope: `src/morning/*`, `src/curriculum/streak.js`, `src/progress/{weekly,milestones,store}.js`, `src/shell/notify*.js`, `src/curriculum/reminders*.js`, and every `fetch` target in `src/`.
Method: read the source, ran the tests named below, wrote one new test file. Everything marked "observed" was read in the files or produced by a test run in this session. Nothing was run in a browser, on a phone, or against a deployed site.

## What was run

| Command | Result |
| --- | --- |
| `node --test tests/engagement.dst.test.js` (new) | 31 pass, 0 fail |
| `node --test tests/morning.test.js tests/notify.test.js tests/credits.test.js` (after the copy edits) | 65 pass, 0 fail |
| `node tools/meta/scan.mjs --text` | PASS |
| `tests/streak.freeze.test.js`, `progress.*` | ran once earlier in the session with the others, 0 fail (before the copy edits; not re-run after) |

## 1. Outbound requests

Every `fetch`, `XMLHttpRequest`, `sendBeacon`, `WebSocket`, `EventSource`, `importScripts` and absolute `http(s)://` string in `src/`, `index.html` and `sw.js` was grepped. No `XMLHttpRequest`, `sendBeacon`, `WebSocket` or `EventSource` exists in `src/`. `index.html` loads only two same-origin module scripts.

| Target | Where | Sends user data? | Justification / status |
| --- | --- | --- | --- |
| Relative same-origin URLs (lesson, corpus, vocab, grammar, trope, pronunciation, audio, workbook manifest, morning verses, registry) | ~30 `fetch(url)` sites, `sw.js` | No (GET, no body) | Needed to load content. `sw.js` returns early for any other origin (line 37). |
| ~~`https://nakdan-u2-1a.loadbalancer.dicta.org.il/api`~~ | ~~`src/photo/engines/web.js`, created only in `src/photo/engines/index.js` when `online` is true~~ | ~~Yes: recognised Hebrew text from a scan (not the photo)~~ | REMOVED 2026-11-07 (fix #16): the adapter and its wiring were deleted; the site CSP blocked the host and no terms could be read. |
| ~~`https://vision.googleapis.com/v1/images:annotate`~~ | ~~`src/photo/engines/web.js` (`VISION_URL`, `createVisionOcr`)~~ | ~~Would send a photo~~ | REMOVED 2026-11-07 (fix #16): the adapter was deleted; nothing in `src/` ever called it and no key existed. |
| `http://127.0.0.1:8787`, `http://localhost:5000` | `src/photo/engines/local-server.js`, `createLibreTranslate` | Text/photo, to the learner's own machine | `local-server.js` refuses non-loopback hosts. `createLibreTranslate` has no caller in `src/`. |
| Browser speech recogniser | `src/speak/recognizer.js` | Decided by the browser | Disclosed in the privacy screen. |
| External `<a href>` links (Wiktionary, kaikki.org, FrequencyWords, CC licence) | `src/vocab/vocab.view.js` | No (user clicks a link) | Credits only. |

None of the engagement code (`src/morning`, `streak.js`, `notify*.js`, `reminders*.js`, `progress/*`) makes a network request. The only fetches there are two same-origin JSON files in `morning.view.js` (`data/morning-verses.json`, `data/corpus/registry.json`). `subscribePush()` returns `{ok:false, reason:"no VAPID key"}` because `VAPID_PUBLIC_KEY` is the empty string, and `sw.js` has no `push` handler (grep).

### Privacy table match

There is no privacy table under `docs/legal/`. `docs/legal/ROUTES.md` only holds the route wiring lines, and `DECISIONS-FOR-JOHN.md` lists "privacy policy" as an open item for John. The table lives in `src/shell/privacy.view.js` (`FLOWS`, `LOCAL_ONLY`, `STORE_KEYS`), and `tests/credits.test.js` checks it against the source (passes, 65-test run above).
Compared by hand to the list above: FLOWS has own-site, local-helper and speech-recognition, which matches every live target (the dicta flow was removed with the adapter, 2026-11-07, fix #16). The LibreTranslate adapter is not listed in FLOWS, but it has no caller in `src/` and only targets the learner's own machine (loopback), and the grep agrees. The reminders row ("no push server... push key is empty") matches `notify.js`. The `streak` and `morning.prefs` / `notify.prefs` keys: `streak` is in `STORE_KEYS`; I did not check that the other two reminder keys are listed, so that is open.

## 2. Notification permission timing

- `requestPermission` / `requestNotificationPermission` are called from exactly two places outside the helper modules: the "Allow notifications" button `onclick` in `src/shell/notify.view.js` (line 107) and the same label button in `src/morning/morning.view.js`. Both buttons only appear on their own screens (`#/reminders`, `#/morning`). The new test asserts this from source and that `app.js`, `morning/boot.js` and `shell/boot-hooks.js` never mention it.
- Boot only re-arms timers: `armReminders` returns early unless `notify.prefs.enabled === true`, and `scheduleStudyReminder` / `scheduleLocalNotifications` do nothing unless `Notification.permission === "granted"`. So nothing prompts on first load. Observed in source, not in a browser.
- Reminders are `setTimeout` timers in the open page, no server, so they do not fire with the app closed. The screens say so.

## 3. Copy audit (kind, no shaming, no dark patterns)

Observed strings: Home "Paused. Your best streak was N days. A new one starts when you finish a counted day." / "Welcome back. No need to catch up"; Progress "Resting today. Your streak is waiting for you." / "A rest day does not break your streak" / "Any amount counts" / "gentle target"; broken-streak "New streak starts today. One day at a time."; milestones: once achieved they stay achieved and a later dip never removes them; dates say "first noticed" when only seen later; wording avoids claiming fluency. No points, hearts, gems, leaderboards, paywall, "premium" or purchase of freezes anywhere in `src/` (grep). Rest days are unlimited and free, not a consumable.

Changed (fixes):
1. `src/morning/morning.view.js`: removed "Reddit and Duolingo do not do this." (naming other products in a settings screen; also not something checked).
2. Same file: the settings sentence said "Shabbat and festival days never break an ALEF streak" even when the box is off, which is false (observed in `streak.js`: with `freeze` false a missed Saturday breaks the chain). It now states which of the two is true for the current setting, and mentions the Progress rest-day button. The rest-today message no longer claims Shabbat when the rest day was one the learner declared.
3. `src/shell/notify.js`: default notification body "A few minutes of Hebrew keeps the streak going." changed to "A few minutes of Hebrew, whenever you are ready." (streak-pressure wording in a push-style message).

Left as is, flagged for John:
- Many strings still carry "(draft)". Not user-ready. (Re-grepped on the v0 routes after this file was written: the remaining notices are plain-language disclosures that nobody has reviewed the content, not code leftovers.)
- `src/home/today.js`, `progress.view.js`, `learn.view.js`, `review.view.js` have uncommitted edits by someone else; I read them but did not edit them.

## 4. Freeze / rest days and Sabbath option

Observed in `streak.js` and `morning/plan.js`:
- Modes `reform` (one-day Yom Tov), `traditional` (adds second days of Sukkot, Pesach, Shavuot, Rosh Hashanah, Simchat Torah), `israel` (one-day, two-day Rosh Hashanah). Unknown modes fall back to `reform`.
- "Streak rests on Shabbat and festival days" (`freeze`) is on by default in observant mode and opt-in otherwise. When on, every Saturday and Yom Tov day is neither a gain nor a break. Learners can also declare any day a rest day (Progress), including yesterday after the fact; the break is a projection, not a mutation, so it can be repaired.
- A day studied on Shabbat still counts if the learner chooses to study (it adds 1); it is not penalised.
- Observant mode: no morning reminder on Shabbat or Yom Tov; one erev reminder at min(chosen time, the erev cap). The cap is a setting on the Morning screen and defaults to 14:00 (`ERAV_LATEST` in `plan.js`; read in source, not run in a browser).
- `tests/streak.freeze.test.js` walks 2026-09 to 2027-09 day by day for all three modes against a Hebcal fixture (independent of `calendar.js`) and passed.

Findings not fixed (judgment calls, tests pin current behaviour). Items the reminder lane has since fixed (Saturday no longer in the default days, now Sunday to Thursday; erev cap now a setting with default 14:00; `rescueBanner` deleted) were removed from this list on 2026-11-04:
- Rest days follow civil midnight, not sunset. Shabbat and Yom Tov start the evening before, so a learner who studies on Friday evening after candle lighting gets a normal "done" Friday and a frozen Saturday. No penalty results, but the doc and screen do not say it.
- The morning-card reminder (`morning.prefs`) and the study reminder (`notify.prefs`) are two separate systems with separate settings; an observant learner has to configure both.

## 5. Time zone and DST (new test `tests/engagement.dst.test.js`)

Controlled clock via `new Date(y, m, d, h)` in a process-level `TZ` switch. Zones and dates:
- America/Toronto: 2026-03-08 (23 h day) and 2026-11-01 (25 h day).
- Asia/Jerusalem: its own changes are Friday 2026-03-27 (23 h) and Sunday 2026-10-25 (25 h). Jerusalem has no change on 2026-03-08 or 2026-11-01 (asserted as 24 h days), so those two dates are not DST tests there; I tested Jerusalem's real dates instead.

For each of the four changes the test checks: five consecutive study days around it count 5 with consecutive day keys; 2 hours of study from 00:30 is exactly 7200 s with the day key unchanged; no phantom missed day on the 23 or 25 hour day, while one truly missed day still breaks the streak; crossing midnight into the change day banks nothing across it; a 02:30 reminder (a time that does not exist in spring, or occurs once at the first pass in autumn) yields one notification per day with gaps of 22 to 26 h, and `nextOccurrence` never lands twice in a day; the evening rescue and morning card trigger at 20:00 / 07:00 wall-clock. Plus Shabbat beside each change: Friday done, Saturday rest, Sunday done gives 2 (3 in Jerusalem with Thursday), and with rest mode off the Saturday counts as missed. Result: no bug found; all pass without source changes. The existing `streak.freeze.test.js` already covered 2026-11-01 in Toronto and 2026-10-25 in Jerusalem; the new file adds 2026-03-08, 2026-03-27 and the reminder/rescue planners.

Limits: a clock set backwards is ignored (`engage.js`) and the streak is not punished (`projectStreak`, gap < 0). A device that changes time zone mid-streak (travel) is judged by the day key in the new zone; not tested.

## 6. Files changed

- `src/morning/morning.view.js` (copy, 2 strings)
- `src/shell/notify.js` (one default string)
- `tests/engagement.dst.test.js` (new)
- `docs/review/ENGAGEMENT-CHECK.md` (this file)

No commit, no push, no precache build. Because `sw.js` precaches app files, the two edited source files will need the usual precache rebuild by whoever owns that step.
