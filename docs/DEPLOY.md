# Deploying ALEF (static hosting; nothing has been deployed)

The app is plain static files. Any host that serves the repo root over HTTPS works (HTTPS needed for service worker,
camera, geolocation). Run `node tools/build-precache.mjs` before publishing.

Options: GitHub Pages (project sites serve under `/<repo>/`; all paths in the app are relative, so this works, but the
hash-router means no server rewrites are needed), Cloudflare Pages, Netlify, Vercel, or any object storage + CDN.

**Free-tier limits for these hosts are UNVERIFIED** (the research did not fetch 2026 limits). Check bandwidth and file-count limits
before hosting audio (~1000+ mp3 files planned) and images (assets/img is several MB already).

Hosting notes: serve `sw.js` and `index.html` with short caching (`no-cache`); `.webmanifest` as `application/manifest+json`;
`.mp3` as `audio/mpeg` with Range support. QR deep links look like `https://<host>/#/letters/alef`.
Enable gzip or brotli for `.json`, `.js` and `.css` (the local test server does not compress; see Performance below).
The GitHub push is not possible in the build environment (invalid token).

## PWA: what was checked (2026-11-04) and how to re-run
Command: `node tools/lighthouse/pwa-check.mjs` (full, 9 routes) or `--quick`; also run by `node --test` (tests/pwa.browser.test.js). Headless Chromium 153 on Linux against `http://localhost`; no real device, no iOS or Android install flow, no real network.
| Check | Result |
|---|---|
| Manifest | name, short_name, `start_url` `./#/`, `scope` `./`, `id` `./`, `display` standalone, `display_override`, theme `#1f3a5f` (matches the `<meta>`), background `#f6efe0`, `lang`, `categories`. Chromium's own verdict (`Page.getAppManifest`, `Page.getInstallabilityErrors`): no errors. All paths relative, so a project-site subpath works (tests/pwa.manifest.test.js; the subpath case itself is not browser-tested here) |
| Icons | 192 and 512 "any" PNG, 512 maskable PNG (glyph inside the safe zone: viewed, not measured), SVG, 180px apple-touch-icon |
| Screenshots | 3 narrow (390x844) and 1 wide (1280x800) JPEGs in `assets/screenshots/` (about 160 KB; they are precached; regenerate with `node tools/lighthouse/screenshots.mjs`). They show an install dialog on Chromium; their appearance in the real dialog was not seen |
| Shortcuts | Lessons, Review cards, Letters (long-press the installed icon on Android). Not tried on a device |
| Offline reload (SW active, then network off, real reload) | pass on 9 routes: `/`, `/learn`, `/letters/alef`, `/letters/atlas`, `/sounds`, `/read/priestly-blessing`, `/vocab`, `/calendar`, `/settings` (content present, no failed request, no page error) |
| First session offline | not covered: runtime-cached files (the audio word shard `data/audio/manifest-words-<tradition>.json`) are only stored from the second load, because the first page load is not yet controlled by the service worker. A learner who installs and goes offline before ever reloading has no word-audio list (non-fatal; sound is browser text-to-speech anyway) |
| Not available offline by design | recorded audio (none exists yet), vocab packs `data/vocab/packs/` (fetched when a pack is opened), `assets/img`, workbook PDFs, OCR engine in `assets/vendor` (runtime-cached after first use). Offline use of those was not tested |
| Update flow | pass: when the precache list changes the new worker installs, `skipWaiting` + `clients.claim` activate it, the old `alef-shell-<version>` cache is deleted, the open tab gets `controllerchange`. **Gap:** the app shows no "new version, reload" notice, and the open tab keeps running its old JavaScript while lazily imported views now come from the new cache. Mixing versions inside one tab is possible until the next reload. Spec: in `src/app.js` listen for `controllerchange` (ignore the first one on an uncontrolled page) and show a polite `role=status` banner "A new version is ready. Reload when you are at a good stopping point" with a Reload button; never reload automatically during a lesson |
| Precache freshness | the cache version is a hash written by `tools/build-precache.mjs`. Edits to files under `src/`, `assets/`, `data/` do **not** reach installed learners until it is re-run and deployed (the committed `precache-manifest.js` is stale whenever someone has edited a precached file since the last run). Run it as the last step before publishing. tests/pwa.manifest.test.js checks every listed file exists (one missing file makes the whole install fail) |
| Persistence | `navigator.storage.persist()` is requested once when the learner taps "Start learning" (`src/shell/onboarding.view.js`, `src/shell/backup.js`), and Settings shows the state with a button to ask again. In headless Chromium it reports "not persisted" (Chromium grants it by engagement or install; not testable here). Firefox shows its own prompt; Safari decides itself. Real-device behaviour was not observed |

## Backup and storage: what happens when the learner clears site data
All progress (settings, lesson progress, review cards, tracing progress, vocab cards) is in `localStorage` under the `alef:` prefix (`src/store.js`); there is no server and no account. Clearing site data, uninstalling some browsers, "clear cookies and site data", or a browser clean-up deletes all of it and the service worker cache, and the app starts again as a first run (tested: welcome screen, no errors, progress gone). Safari may also remove script-written storage of sites unused for about 7 days unless the site is added to the Home Screen (WebKit's published policy as remembered; not re-checked or observed here).
Protection that exists:
- Settings, Backup: **Download backup** (`alef-backup-YYYY-MM-DD.json`, tested with a real download) and **Restore from backup file**. Restore is two-step: choosing a file only inspects it (`inspectBackup`, nothing written); a wrong file shows "not an ALEF backup" and changes nothing; a good file shows its date and item count and asks to confirm because restore **replaces** what is on the device; focus moves to the confirm button; afterwards a status line says how many items were restored. Tested end to end: backup, clear site data, restore, progress back (tools/lighthouse/pwa-check.mjs; unit tests in tests/pwa.backup.test.js).
- Backups from a newer app version are refused with a message; older ones go through the store's migrations (there are none yet: schema version 1, so migrations are untested).
Not built: a "last backup N days ago" reminder, automatic backup to a cloud account, merge-on-restore (the store supports `merge` but the UI offers replace only), sharing the file through the OS share sheet (matters in a Capacitor wrapper, see docs/CAPACITOR.md).

## Lighthouse
Lighthouse 13.6.0 (Apache-2.0) is installed dev-only in `tools/lighthouse/` (`cd tools/lighthouse && npm install`, 119 packages, `node_modules` is git-ignored). Run: `node tools/lighthouse/run.mjs [--url-hash /learn /sounds ...]`. It starts the local server, launches the Chromium that Playwright installed (override with `CHROME_PATH=/path/to/chrome`), runs the default mobile profile (simulated slow 4G, 4x CPU slowdown) and prints scores and audits below 0.9; full reports go to `tools/lighthouse/reports/` (not committed; `tools/lighthouse/last-run.json` keeps the scores). Lighthouse 13.6.0's default configuration has no PWA category (checked in its `default-config.js`: performance, accessibility, best-practices, seo), so installability comes from `pwa-check.mjs` above. By hand: `npx lighthouse http://localhost:8080/#/ --view` against `node tools/serve.mjs`.
Result of 2026-11-04 (4 routes, local server, no compression): accessibility 100, best practices 100, SEO 100, performance 68-75.

## Performance finding (lab numbers, simulated; not measured on a device)
Largest Contentful Paint is 14-16 s in Lighthouse's simulated slow-4G profile (First Contentful Paint 1.1 s). The cause is in the boot path: `src/app.js` `makeAudio()` awaits `data/audio/manifest.json` (1.36 MB uncompressed) before `router.start()`, so nothing is rendered until it arrives; the word shard (860 KB) follows. The local server sends no compression, so the real size on a host with gzip or brotli would be several times smaller, but the page still waits on it on a first visit. Fix (shell owner, not done here): render the first route, then load the audio manifest and attach it when ready (the stub audio player already exists for the interval). Also flagged: unminified JS and CSS (no build step) and unused CSS.
