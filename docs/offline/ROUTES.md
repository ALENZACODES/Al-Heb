# Offline readiness card, update banner, storage health: wiring (not wired)

`src/shell/router.js`, `src/app.js` and `sw.js` were NOT edited.

## Route line (next to the `install` entry)

```js
{ name: 'offline', pattern: '/offline', module: './offline.view.js', title: 'Use Aleph offline', owner: 'offline', optional: true, group: 'learn', quick: 'nav.offline' },
```
Needs a `nav.offline` string ("Use Aleph offline") and `src/shell/offline.js`, `offline.view.js`, `update.js` in the precache (`npm run precache`, not run here). Link to `#/offline` from Settings if wanted.

## Update banner (works on every screen)

In `src/app.js` `boot()`, after the service worker registration line (so `getRegistration()` finds it):

```js
import('./shell/update.js').then((m) => { window.alef.update = m.startUpdateBanner().handle; }).catch(() => {});
```
and, if you want the card's "Check for a new version" button to work, pass it in `ctxBase`: `update: window.alef?.update` (or add `ctxBase.update = handle` inside that `.then`). Without it the Updates section of the card is simply not shown; the banner still works.
Views that hold in-memory work can add a flush function: `handle` accepts `beforeReload` hooks via `startUpdateBanner({ beforeReload: [() => ...] })`.

## Storage warning target

The backup download is on the Settings screen (`#/settings`, "download a backup" in `src/shell/settings.view.js`); `#/progress` has no export, so the warning links to Settings when that route exists.

Status: tested only with fakes (tests/offline.test.js). Not opened in a browser, not run offline.
