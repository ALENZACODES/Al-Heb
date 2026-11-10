# Rimon reminders: what ships now and the Web Push proposal (Nov 10 2026)

Status: **proposal only for the server part. Nothing here is deployed; no keys exist; no server runs.**

## Ships on overnight/launch-ready-2026-11-10 (no server)
- **Opt-in only.** The permission prompt runs only from the "Yes, nudge me" button on a card shown after the learner's first lesson win
  (`src/shell/reminder-ask.js`; First day finish and the first lesson-complete card). Never on first load, and the card shows once (`notify.asked`).
- **Rimon's voice.** 62 lines in `src/shell/rimon-reminders.js`: daily, streak at risk, comeback after 1/3/7 days, after Shabbat/chag,
  holiday greetings, milestones (3, 7, 14, 30, 50, 100, 180, 365) and first-week welcome. Rimon is gender-neutral (no he/she); Hebrew is greetings and nouns only (tested).
- **Never nags on rest days.** With a city: the exact candle-lighting to havdalah window and yom tov windows (`src/shell/notify.js`).
  Always, even without a city: Friday 12:00 to the end of Saturday, every major chag day (traditional reckoning, so second days count), from 12:00 on the eve,
  and Yom HaShoah, Yom HaZikaron and Tisha B'Av.
- **Quiet hours** 22:00 to 07:00, **one a day**, **five a week**, no nudge once today's lesson is done, every 3 days after a week away, weekly after two weeks, silent after 45 days.
- **Off switch:** Study reminders (`#/reminders`): "Remind me to study".
- **Delivery:** `registration.showNotification()` through the service worker (falls back to `new Notification()`), timed in the open or backgrounded app.
  `sw.js` handles `notificationclick` (focus or open ALEF at the route). A closed app gets no reminder: that needs Web Push.

## Proposal: real Web Push (needs John)
1. **VAPID keys:** generate a P-256 pair once (`npx web-push generate-vapid-keys`); public key into `VAPID_PUBLIC_KEY` in `src/shell/notify.js`, private key only in the server's secret store.
2. **Tiny server** (e.g. a Render web service plus a cron job): `POST /push/subscribe` stores `{endpoint, keys, tz, city?, hour, days, observance}`; an hourly job runs the same
   `composeReminder()` rules server-side (the module is pure and can be imported in Node) and sends with the `web-push` library.
3. **`sw.js` `push` handler:** `event.waitUntil(self.registration.showNotification(data.title, {body: data.body, tag: 'alef-study-reminder', data: {route}}))`.
4. **Privacy:** the subscription endpoint and reminder time are the only data stored; delete on unsubscribe; list it on the Privacy screen.
5. **iOS:** Web Push only works for a Home Screen install (iOS 16.4+); the reminders card already says so.

Cost: one small service and a cron job. Decision and keys: John.
