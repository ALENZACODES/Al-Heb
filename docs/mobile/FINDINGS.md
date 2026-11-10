# Mobile findings (2026-11-04)

Method: code reading plus Playwright **Chromium** emulation (390x844, 320x568, 844x390 landscape, dark, forced-colors, root font 200%, an iPhone user-agent string). **WebKit is not installed here, so nothing was run on real Safari or a real phone.** iOS items below are from code reading and Apple's documented behaviour.

## Fixed in my files
- index.html: apple-mobile-web-app and mobile-web-app tags, light/dark theme-color, format-detection; storage-notice module loaded.
- app.css: inputs/selects/textareas >= 16px (stops iOS focus zoom); tap highlight, touch-action, overscroll; side safe-area insets (landscape notch) on header, banner, main, bottom bar; bottom-bar clearance in rem (text zoom); bar labels capped at 14px so words do not break; bar hides while a field has focus (Android keyboard); short landscape phones get a non-fixed bar; forced-colors current-tab marker; prefers-contrast. No 100vh anywhere.
- offline.html: dark mode, safe-area.
- New src/shell/install-notice.js: iOS-only banner after the second day telling tab users to add to Home Screen and keep a backup (Safari 7-day rule). Hidden when installed or dismissed.

## Follow-up (same day, shell lane)
Done in code, Node tests only (`tests/mobile.shell.test.js`, `tests/sw.lifecycle.test.js`); still **not run on a real phone or Safari**.
- Item 2 (iOS audio): `createAudioUnlock` in `src/shell/audio.js` (shell audio `.unlock()`, stub too). app.js calls it in the capture phase of the first `pointerdown`/`keydown`/`touchend`, synchronously: resumes an AudioContext when the browser has one (no-op without), plays a muted empty `Audio`, speaks an empty utterance. Once per page load.
- Item 3 (Back loses scroll): `src/shell/scroll-restore.js`, one scrollY per hash path in sessionStorage; restored only on history traversal. Detection is not `popstate` (browsers also fire it on `location.hash` writes): link clicks and `ctx.route()` mark a forward navigation, an unmarked hashchange is Back/Forward. Loaded lazily from app.js; until it loads, scrollTo(0,0) as before. **Precache owner: add `src/shell/scroll-restore.js` to precache-manifest.js** or it is not restored offline.
- Item 4 (persistence): app.js subscribes to the store and calls `requestPersistence()` on the first non-settings write (own tab only), once per page load, result logged once to the console. Settings' own button is unchanged.
- Item 5 (maskable safe zone): measured `assets/icons/icon-maskable-512.png` with PIL and again in the test: the glyph's bounding box is x 197-315, y 196-343 of 512, every non-background pixel is inside the central 80% circle (radius 204.8). No padded variant was needed; manifest unchanged.
- Update banner / storage notice now mount even without a service worker (private mode, file:); the update part is inert there.
- sw.js no longer calls `skipWaiting()` in `install`; it waits for `{type:'SKIP_WAITING'}` from the banner's Reload button (`src/shell/update.js`) or for all tabs to close. Offline navigation fallback and `alef-shell-<version>` naming unchanged.

## For other owners
1. **precache owner**: add `src/shell/install-notice.js` and `src/shell/scroll-restore.js` to precache-manifest.js (rerun build-precache). Until then neither loads offline (both fail silently).
2. **docs owners**: `docs/data/README.md` ("Limits: sw.js currently calls skipWaiting itself..."), `docs/DEPLOY.md` (update flow row) and `docs/offline/SW-PROPOSALS.md` section 1 describe the old lifecycle; the proposal is now implemented. The title of the test at `tests/offline.test.js:151` ("current sw.js skips waiting") is stale wording; the test still passes (it covers the `activated` path).
3. **Not verified**: Back from a hash route leaving the app (no trap) was not tested; nothing here ran on iOS.
