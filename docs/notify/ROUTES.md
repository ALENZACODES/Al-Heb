# Study reminders: route entry (not wired)

`src/shell/router.js` was NOT edited. To show the card, add this line to `ROUTES` (next to the `settings` entry):

```js
{ name: 'reminders', pattern: '/reminders', module: './notify.view.js', title: 'Study reminders', owner: 'notify', optional: true, quick: 'nav.reminders' },
```

Also needed by the shell owner:
- a `nav.reminders` string ("Study reminders");
- `src/shell/notify.js` and `src/shell/notify.view.js` in the precache manifest (`npm run precache`; not run here);
- optional, so reminders start at app open and not only after the card is visited: in `src/app.js` `boot()`, after `ctxBase` exists,
  `import('./shell/notify.js').then((m) => m.armFromPrefs(ctxBase)).catch(() => {});`
- optional: a link to `#/reminders` from the Settings screen or the Calendar screen's "Notifications while the app is open" box.

Store key: `notify.prefs` (`{ v, enabled, hour, minute, days[], shabbatQuiet }`, validated by `normalizePrefs`).
Location for Shabbat quiet hours is read from the Calendar screen's prefs (`calendar.prefs`) with the shell `settings.lat/lon` as fallback; the card does not ask for a city itself.

Status: the module runs in Node (tests/notify.test.js); the card has not been opened in a browser or on a phone. See docs/deploy/NOTIFICATIONS.md for what fires when.

## Boot hook (stage 2 addendum)

`src/app.js` was not edited. To re-arm the reminder at every app start, add this line in `boot()` right after `ctxBase` is defined (next to the `startMorning` line):

```js
import('./shell/boot-hooks.js').then((m) => m.armReminders(ctxBase)).catch(() => {});
```

`armReminders` never asks for permission and does nothing unless the learner enabled reminders earlier and permission is still granted. Add `src/shell/boot-hooks.js`, `notify.js`, `install.js` to the precache list (`npm run precache`, not run here).

## Quiet hours

Card toggles: "Keep Shabbat quiet" (`shabbatQuiet`) and "Keep festivals quiet" (`yomTovQuiet`), both default on. Festival days follow the Calendar screen's observance (`calendar.prefs.observance`), see docs/deploy/NOTIFICATIONS.md section 3.
