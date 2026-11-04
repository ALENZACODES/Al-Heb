# Study reminders and notifications: what works, what does not, what is unverified

Files: `src/shell/notify.js` (logic), `src/shell/notify.view.js` (the card, route in `docs/notify/ROUTES.md`), `tests/notify.test.js` (22 Node tests).
Nothing in `sw.js`, `src/app.js`, `src/shell/router.js` or the calendar lane was changed. The calendar screen keeps its own
"Notifications while the app is open" box (`src/curriculum/reminders.notify.js`) for candle lighting, prayer moments and holidays;
this document is about the one-a-day **study nudge**.

## 1. What fires when (what was built)

| Situation | Study reminder fires? | Why |
|---|---|---|
| ALEF open in a browser tab, foreground, permission granted | Yes, at the chosen hh:mm on chosen days (within 10 minutes of the time, else skipped) | `setTimeout` chain in the page, re-checked at least every 6 hours; a slot more than 10 minutes late is dropped, never fired late |
| ALEF open but the tab is in the background (desktop) | Usually yes | Browsers throttle background timers (Chrome: to once a minute after 5 minutes hidden, and "intensive throttling" to once a minute in chained timers) but still run them; the 10-minute grace covers that. **Not verified in a browser.** |
| Installed PWA open on Android, screen on, in foreground | Yes, expected | Same page timer; the notification is shown through the service-worker registration (`registration.showNotification`), because Android Chrome rejects `new Notification()` from a page |
| Phone locked, app in the background, tab discarded, app closed | **No** | The page is frozen or gone; no timer runs. Nothing wakes ALEF: there is no push server |
| Offline (any of the above) | Same as online | Nothing here needs the network; the notification body and icon are local (`assets/icons/icon-192.png` is in the precache list) |
| Between candle lighting and havdalah (learner's city set on the Calendar screen, "Keep Shabbat quiet" on) | **No**, by design | See section 3 |
| No city set | Fires on Shabbat too | The card says so; nothing is guessed from the device |

So, honestly: **this is an "open-tab" reminder**, the same class of feature the calendar screen already has. For a reminder that fires with the app closed, the learner still needs the calendar's `.ics` export into the phone calendar (existing feature) or a push server (section 4).

Clicking a notification shown through the service worker does nothing today (there is no `notificationclick` handler in `sw.js`; the `data.route` field is set in `notify.js` for when one exists). A notification shown by the page constructor focuses the tab on click in most desktop browsers (default behaviour; not verified).

## 2. Permission

- `requestPermission()` is called only from the "Allow notifications" button click. Opening the card never asks.
- Chrome and Firefox block or quietly ignore permission prompts that are not inside a user gesture; Safari requires one. The code does not try to detect gestures; the view simply only calls it from `onclick`.
- Denied permission cannot be re-asked from code; the card tells the learner to change it in the browser's site settings.
- Permission is per origin per browser; the Cloudflare Pages preview and production hosts are different origins.

## 3. Shabbat quiet hours (what the offsets are)

Location: the Calendar screen's city (`calendar.prefs`: preset or custom lat/lon and IANA zone), falling back to `settings.lat/lon` from the shell Settings screen. The reminder card does not ask for a city.

Window = **[candle lighting, havdalah]** for the Friday/Saturday containing the candidate time, computed with the calendar lane's own code (`sunset`, `havdalah` in `src/curriculum/calendar.js`, NOAA solar equations, zenith 90.833 degrees):

| Edge | Formula | Offsets in use (from `data/calendar/locations.json` and the learner's calendar prefs) |
|---|---|---|
| Start | Friday sunset minus `candleMinutes` | 18 min outside Israel (default); Jerusalem 40; Haifa and Zikhron Ya'akov 30; other Israeli presets 20; custom 0 to 90 as set on the Calendar screen |
| End | Saturday: sun 8.5 degrees below the horizon (`havdalah.mode = "tzeit"`, default) or `havdalah.minutes` after Saturday sunset (`mode = "minutes"`, 20 to 120) | 8.5 degrees / 50 minutes are the calendar defaults; the learner's choice on the Calendar screen is used |
| Day boundary | The candidate instant is converted to the **city's** civil date with `Intl` (not the device's) before deciding whether it is a Friday or Saturday | so a learner whose phone is in another zone still gets the city's Shabbat |
| No computable sunset (polar latitudes, roughly above 66 degrees in midwinter/midsummer) | fallback: quiet from **Friday 15:00 local to the end of Saturday** | deliberately wide; a learner there should pick "minutes after sunset" on the Calendar screen, which does not help when the sun never sets, so the fallback stays |

Checked values (tests): Toronto 2026-11-06 start 16:43, end 17:45 local, the same minutes the calendar lane cross-checked against Hebcal on 2026-11-03/04. Jerusalem with 40 minutes: Friday 14:30Z (16:30 local) is quiet, 13:30Z is not.

### Yom Tov quiet hours

Same window shape as Shabbat, per run of festival days: **eve sunset minus the candle offset, to nightfall of the run's last day** (same havdalah choice: 8.5 degrees or N minutes after sunset). Source of the days: `holidaysBetween` in `src/curriculum/calendar.js`, kind "major", at the learner's observance (`calendar.prefs.observance`):

| Festival | Reform (default, 1 day) | Traditional diaspora | Israel mode |
|---|---|---|---|
| Rosh Hashanah | 1 Tishrei | 1 and 2 Tishrei | 1 and 2 Tishrei (the calendar lists two) |
| Yom Kippur | 10 Tishrei | same | same |
| Sukkot | first day (15 Tishrei) | first two days | first day |
| Shemini Atzeret / Simchat Torah | 22 Tishrei | 22 and 23 Tishrei | 22 Tishrei |
| Pesach | first and last day (15 and 21 Nisan) | first two and last two (15-16, 21-22 Nisan) | first and last day |
| Shavuot | 6 Sivan | 6 and 7 Sivan | 6 Sivan |

Never quiet: Chol HaMoed (middle days of Sukkot and Pesach), Hanukkah, Purim, Tisha B'Av and other fasts, Rosh Chodesh, modern Israeli days. The optional second day of Rosh Hashanah shown under Reform is not quiet unless the learner picks the traditional or Israel observance. Israel-mode Pesach/Shavuot single days follow the calendar's own list, which has not been checked against an Israeli rabbinate calendar. The `verified` flags in the calendar data apply: Yom Kippur, Sukkot and Shavuot day counts are "inferred", not source-checked. Tests (tests/notify.test.js) pin Rosh Hashanah 2026 (Fri 11 Sep eve, Toronto start 19:16 local) and Sukkot 2026 (first day Sat 26 Sep; Sun 27 Sep is not quiet); they check our own window against our own calendar, not against an external calendar.

If every chosen slot in the next 15 days is quiet (for example "Saturdays at noon"), nothing is scheduled and the card says "No reminder in the next two weeks".

## 4. Web Push (needs a server; not built)

What exists: `VAPID_PUBLIC_KEY = ""` placeholder, `subscribePush()` which returns `{ok:false, reason:"no VAPID key"}` until a key is set, and `urlBase64ToUint8Array` for the key.
What is missing, in order:
1. A server that stores `PushSubscription` JSON per learner and sends a push at hh:mm on chosen days in the learner's zone, applying the same Shabbat rule (the phone does not run `notify.js` when the app is closed). This needs a key pair (VAPID), an HTTP endpoint and a scheduler. Cloudflare Pages is static; a Worker with Cron Triggers and KV/D1 would do, which is outside the current "static files only" deployment and its CSP (`connect-src 'self'`, so the endpoint must be same-origin or the CSP in `_headers` must change).
2. `sw.js`: `push` listener (`event.waitUntil(self.registration.showNotification(...))`) and `notificationclick` (focus or open `#/learn`). Not added: `sw.js` is not this lane's file.
3. The card: on "Allow", call `subscribePush()` and POST the subscription; handle `pushsubscriptionchange`.
4. Privacy text: a subscription endpoint is a push-service URL (Google/Mozilla/Apple), so the "no third party" statement in `_headers` and the About screen would no longer be true.
Push subscriptions also expire or rotate; the server must drop 404/410 endpoints.

## 5. iOS and Safari limits (from Apple's and WebKit's published notes; not tested on a device here)

- iOS/iPadOS 16.4 and later show Web Push and `Notification` **only for web apps added to the Home Screen**. In a Safari tab `Notification` is undefined, so the card shows "add ALEF to the Home Screen first" (detected by user agent and `navigator.standalone`; iPadOS presents itself as a Mac, so `maxTouchPoints > 1` on "Macintosh" is treated as iOS).
- Even installed, iOS does not run page timers while the app is in the background, so the open-tab reminder works only while ALEF is on screen. Real reminders on iOS need Web Push (section 4).
- iOS Web Push requires permission to be asked from a user gesture and the notification to be shown by the service worker (`registration.showNotification`); `showNow()` already prefers that path.
- Safari on macOS supports `Notification` in a tab and Web Push since Safari 16 (macOS Ventura); the service-worker path is used there too when a registration exists.
- `manifest.webmanifest` has `display: standalone`, which iOS needs for installability; no change was required.

## 6. What is unverified

- No browser or phone has run the card. The fake-DOM tests check logic (permission flow, scheduling, persistence, quiet hours), not rendering, layout at 390px, or the actual notification UI.
- Android Chrome's rejection of `new Notification()` once a worker is registered, and the background-tab throttling numbers above, are from memory of the Chrome documentation; they were not re-read for this document.
- Whether `registration.getRegistration()` resolves fast enough inside the `onclick` for the test button on every browser (it is awaited; a slow worker only delays the status line).
- The precache manifest was not rebuilt; `notify.js` and `notify.view.js` are not offline-cached until `npm run precache` runs (they are same-origin and will be cached at runtime by `sw.js` after first load).
- `armFromPrefs` is not called from `src/app.js`, so in this build the timer starts only after the learner opens the reminders card in that session (see `docs/notify/ROUTES.md` for the one-line boot hook).
- No learner has asked for a Shabbat-quiet reminder; the default days (Sunday to Thursday and Saturday) assume a Friday-evening-off week and may be wrong for a Reform learner who studies Friday afternoon.
