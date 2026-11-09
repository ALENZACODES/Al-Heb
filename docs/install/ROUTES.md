# Install Aleph card: route entry (not wired)

`src/shell/router.js` and `src/app.js` were NOT edited. Add this line to `ROUTES` (next to the `reminders` entry):

```js
{ name: 'install', pattern: '/install', module: './install.view.js', title: 'Install Aleph', owner: 'install', optional: true, group: 'learn', quick: 'nav.install' },
```

Also needed by the shell owner: a `nav.install` string ("Install Aleph"), and `src/shell/install.js` and `src/shell/install.view.js` in the precache manifest (`npm run precache`, not run here). Optionally link `#/install` from Home or Settings; the card also works as a deep link from the reminders card's iOS message.

Behaviour: uses `ctx.installPrompt` from `src/app.js` when it holds a saved `beforeinstallprompt` event (Chromium); otherwise listens itself, which only helps if the event fires after the card opens. iOS Safari gets the four Share, Add to Home Screen steps (UA detection; iPadOS counts as iOS when it reports "Macintosh" with touch points). "Not now" stores `{v:1, dismissedAt, dismissCount, installedAt}` under `install.v1` and hides the card for 30 days; "Show the install steps again" overrides.

Unverified: nothing here has run in a real browser, on iOS, or through an actual install; `beforeinstallprompt` is Chromium only (not Safari or Firefox), and iOS non-Safari browsers' share menus were not checked.
