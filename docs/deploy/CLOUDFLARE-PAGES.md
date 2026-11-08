# Deploying ALEF on Cloudflare Pages (archived alternative — not the live host)

> **Archived alternative — not the live host.** The review site is served by Render from `main` (https://alef-review.onrender.com/); see `docs/DEPLOY.md`. This document is kept as the record of the Cloudflare Pages path, its limits, and why it cannot host the full audio library (20,000-file Free cap vs about 25,000 clips). Nothing below has been set up and no Cloudflare account is needed.

Why Cloudflare Pages: docs/ research (competitor analysis, item 39) picks it as the PWA host because audio clips are static files and the Free plan has no bandwidth charge for static requests. That claim comes from the research; the only Cloudflare numbers re-read for this document are in the table below.

## Limits (read from developers.cloudflare.com/pages/platform/limits and /pages/configuration/build-image on 2026-11-03)
| Limit | Value | ALEF today (`node tools/deploy/build_site.mjs`, run 2026-11-04) |
|---|---|---|
| Files per site (Free) | 20,000 (paid plans up to 100,000 with `PAGES_WRANGLER_MAJOR_VERSION=4`) | 723 files (59.76 MiB) |
| Size of one file | 25 MiB | largest is 8.86 MiB (`assets/workbook/alef-flashcards-letter.pdf`); the largest script is 3.72 MiB (`assets/vendor/_tesseract/tesseract-core-simd-lstm.wasm.js`) |
| Builds per month (Free) | 500; one build at a time; 20 minute timeout | not applicable yet |
| `_headers` | 100 rules, 2,000 characters per header | 18 rules, longest header 343 characters |
| `_redirects` | 2,000 static + 100 dynamic | no file (see below) |
| Build image Node.js | default 22.23.4; override with env var `NODE_VERSION` or a `.node-version` file | scripts need Node 18+ |
Re-open the limits page on deploy day: quotas change. The audio manifests list 24,900 clips (core 6,384 plus three word shards of 6,172), none recorded by a person; 87 synthetic word clips exist as real files under `audio/` (`cat data/audio/summary.json`, 2026-11-05; about 1.2 MB with sidecars) and are not in the precache. If every listed clip became its own file the site would hold 723 + 24,900 = 25,623 files, over the 20,000 Free limit (paid plans allow more). Not all of them are planned for the first release (the priority set is in `docs/voices/recording/priority_summary.md`), but **file count is the limit to watch**, not size.
The `_headers` merge rules (all matching rules apply, a header named twice is comma-joined, `! Name` detaches) were taken from memory of the Cloudflare docs; that page was not fetched here. `check-deploy` therefore avoids depending on them: no file may match two rules that both set Cache-Control.

## Files added for this
| File | Purpose |
|---|---|
| `_headers` | CSP with no third-party origin, nosniff, no-referrer, Permissions-Policy, frame and opener protection, cache rules |
| `tools/deploy/make-dist.mjs` | copies only runtime files to `dist/`, writes a fresh `precache-manifest.js` for what ships, prints a size report |
| `tools/deploy/check-deploy.mjs` | serves `dist/` locally with `_headers` applied and checks it (44 checks on 2026-11-04: 44 passed, 6 warnings about origins named in code) |
| `tests/deploy.test.js` | the same logic as unit tests, including a case where the check must fail |
No `_redirects` (the hash router needs no rewrites; with no `404.html` Pages serves `index.html` for unknown paths) and no `wrangler.toml` (a repo-level Wrangler file changes how the dashboard treats the project; add one only if you move to `wrangler pages deploy`).

## What ships and what does not
Ships: the install (precache) list, now a small core: 284 files, 3.36 MiB (measured 2026-11-04 from `dist/precache-manifest.js`; `build_site` prints "precache 284 files, 3.36 MiB"). A further 246 files, 10.46 MiB (`ALEF_ON_DEMAND`: vocabulary, pronunciation, speak, calendar and other data that only preview routes read, the audio manifest, intermediate lessons, screenshots) are not installed up front; `sw.js` caches them the first time a page asks for them, or all at once from the offline page's download-everything button (`tools/build-precache.mjs`, `src/shell/offline.js`). The committed root `precache-manifest.js` is stale and was not regenerated; `build_site` writes a fresh one inside `dist/`. Also shipped: `sw.js`, `_headers`, the OCR runtime `assets/vendor/` (4.8 MiB, loaded on the first photo), `assets/workbook/` PDFs (29.5 MiB, not precached), `data/vocab/packs/`, the three `data/audio/manifest-words-*.json` shards, the OFL font licence texts, and `audio/` once it exists.
Does not ship: docs, tests, tools, book, research, `assets/images/` (219 MB of incoming photos), `*.test.js`, `.md` files (except the vendored licences), and `assets/img/` (about 42 MB on disk of placeholder SVG/WebP that no file in `src/` references; add `--with-img` when the app starts using them).

## Steps
Local, before anything else (these can be run locally; **John does** everything from step 3 on).
1. `node tools/build-precache.mjs` is not needed for Cloudflare (make-dist regenerates the list inside `dist/`), but the committed `precache-manifest.js` is still what local `node tools/serve.mjs` uses.
2. `node tools/deploy/build_site.mjs && node tools/deploy/check-deploy.mjs --root dist`. All checks must say PASS. The warnings about origins named in code are expected (credits and links), except the two in `src/photo/engines/web.js` (see "CSP consequences").
3. **John does:** create a free Cloudflare account at dash.cloudflare.com (email, 2FA).
4. **John does:** Workers & Pages, Create, Pages tab, Connect to Git, authorise the Cloudflare GitHub app, and pick **only** the private repository ALENZACODES/Al-Heb (GitHub Settings, Applications, Cloudflare Pages, "Only select repositories"). Private repos are supported by Pages; a push to the repo is not possible from the build sandbox (invalid token), so John pushes from his own machine.
5. **John does:** build settings: Framework preset `None`; Build command `node tools/deploy/build_site.mjs`; Build output directory `dist`; Root directory empty; Production branch: `main` (the default branch; `.github/workflows/pages.yml` and the CI `build-dist` job also run on pushes to `main`).
6. **John does:** Environment variables (Production and Preview): `NODE_VERSION` = `22` (optional; the default is 22.23.4 today).
7. **John does:** Save and Deploy. Watch the log for the "dist ready" report; if it prints "OVER A CLOUDFLARE PAGES LIMIT" the build fails by design.
8. **John does:** open `https://<project>.pages.dev` in Chrome on a phone and a desktop and run the after-deploy list below. Note any failure.
9. **John does (optional):** custom domain under the project's Custom domains tab (DNS in Cloudflare; HTTPS and HSTS are then configured per zone, not in `_headers`).
10. **John does:** in the project's Settings, leave preview deployments on, so each branch gets its own URL for review. Preview URLs are public unless you add Cloudflare Access; do not put private material (the incoming photos are not shipped, but the OCR sample images in `assets/img/` would be with `--with-img`) in a preview.

## After the deploy: what only a real host can show (not verified yet)
- `curl -sI https://<project>.pages.dev/manifest.webmanifest` shows `content-type: application/manifest+json`; `/sw.js` and `/` show `cache-control: no-cache` (Cloudflare may add its own ETag and `cf-cache-status`).
- Chrome DevTools, Application: manifest has no errors, service worker "activated and running", scope `https://<project>.pages.dev/`, Install offered. Reload with Network set to Offline: the home page, `/#/learn` and `/#/letters/alef` render.
- Console has no CSP violation messages while using: a lesson, the letters, settings, backup download, and a photo scan (the OCR worker and WebAssembly are the likeliest to trip the CSP).
- The `_tesseract` folder name starts with an underscore. Cloudflare reserves only `_headers`, `_redirects`, `_worker.js`, `_routes.json` at the root as far as known; that a nested `_`-prefixed folder deploys normally was **not confirmed**. If the OCR files 404, rename the folder (needs a `src/` edit, so it is not done here).
- After a second deploy with a changed file, an already-open installed copy picks up the new `precache-manifest.js` version (the app does not yet show a "new version" notice, see docs/DEPLOY.md).

## CSP consequences (decide before launch)
The CSP allows only `'self'`, `blob:` and `data:`, plus `http://127.0.0.1:*` and `http://localhost:*` for the optional local translation helper. Required relaxations, all explained in `_headers`: `style-src 'unsafe-inline'` (inline style attributes set from JavaScript, and `offline.html`), `script-src 'wasm-unsafe-eval'` (Tesseract WebAssembly), `worker-src blob:`.
Removed 2026-11-07 (fix #16): the optional online vowel service (Dicta Nakdan) and the Google Vision URL named in `src/photo/engines/web.js` were deleted from the code, because this CSP blocked both hosts and the vowel service has no confirmed terms. Nothing in the app calls a third-party origin now; the local translation helper (`http://127.0.0.1:*`, `http://localhost:*`) is the only non-`'self'` connect-src entry.
Cache policy: no file name is content-hashed, so nothing is `immutable`. Code and data revalidate on every load (a 304 is cheap); fonts, icons, workbook PDFs and the OCR runtime are cached for one week. A hashed-name rule is stubbed at the end of `_headers`.

## Capacitor wrapper: review of docs/CAPACITOR.md
The existing note is correct as far as it goes (nothing run). Gaps and corrections:
1. Step 1 lists files to copy but omits `assets/vendor/` (OCR), `data/vocab/packs/` and the audio word shards. Use `node tools/deploy/make-dist.mjs --out www` and set `webDir: 'www'`; the folder already holds exactly the runtime files.
2. It says iOS WKWebView with a custom scheme does not register service workers. True of the custom scheme, so the plan "bundle everything" holds; but then `sw.js` and `precache-manifest.js` in `www/` are dead weight, and `src/app.js` registers the worker only on non-`file:` pages: check what Capacitor's `capacitor://` (iOS) and `https://localhost` (Android) origins do (not tested).
3. Android: a Capacitor 6+ project needs `minSdkVersion` that supports WebAssembly SIMD (Tesseract core is SIMD-only; Android System WebView updates through the Play Store, so old devices may lack it). iOS needs 16.4+ for the same reason. Feature detection with a fallback or a clear message is missing in the app.
4. `speechSynthesis` with a Hebrew (`he-IL`) voice is the audio fallback (`src/audio/player.js`). It depends on voices installed on the device; on Android the Google TTS Hebrew voice is a separate download. Needs a first-run check and message (not built).
5. The CSP in `_headers` is a web-host header; in a wrapper add a `<meta http-equiv>` copy or rely on the app-store sandbox. `connect-src 'self'` would also block Capacitor's own bridge origin, so test.
6. Permissions: camera (Scan lane), location (calendar), notifications (morning card and reminders, which currently use the web Notification API and `.ics` downloads) each need Info.plist usage strings (iOS) and manifest entries (Android 13+ runtime POST_NOTIFICATIONS). None are written.
7. Backup/export (`URL.createObjectURL` + anchor download) and the `.ics` download use the same trick; both need `@capacitor/filesystem` + `@capacitor/share`. Not built.
8. Storage: `localStorage` can be purged by iOS; consider `@capacitor/preferences` or IndexedDB mirrored backup.
9. Safe areas: `viewport-fit=cover` and `env(safe-area-inset-*)` need a check on a notched device; status-bar style and splash screen are unset.
10. Store requirements not mentioned: app icons and splash at all sizes (only 192/512/maskable exist), privacy policy URL, Apple privacy nutrition label and Google Data Safety form (the app collects nothing, which has to be stated and is not yet written), screenshots per device class, age rating, 4.2 minimum-functionality justification (already noted), an Apple Developer ($99/yr) and Google Play ($25) account (fees from the research, not re-checked), and a Mac with Xcode for iOS.
11. Updates: bundled builds update only through store releases; the web version on Pages can update immediately, so the two can drift. Decide whether the wrapper loads the hosted site (`server.url`, but then Apple 4.2 risk rises and offline needs the SW) or ships the bundle.
12. Hebrew right-to-left and VoiceOver/TalkBack were never tested on a device (docs/A11Y.md).
This section is a desk review of the files; no Capacitor project was created or run.

## Audio clips, Range requests and the service worker
The host must answer `Range` requests for `audio/**` with 206 and `Accept-Ranges: bytes` (Cloudflare Pages does so for static files; not verified here, nothing is deployed). Browsers play clips with `Range: bytes=0-`. `sw.js` handles that case: a clip the learner already played is served from `alef-runtime-v1` as a 206 slice, and an unplayed one goes to the network and is then fetched in full in the background and cached. Limits: 512 KiB per file, 600 clips, oldest stored dropped first; nothing is cached at install, so clips add nothing to the first-install size (precache 341 files, 4,119,960 bytes measured from `precache-manifest.js` before and after this change; no `audio/` entry). Keep clips under 512 KiB or they will not be available offline. Not offline: unplayed clips, oversized clips, evicted clips, and lazy data (`data/audio/manifest.json`, word shards) not yet fetched through the worker. Details and the Chrome measurements: [`../audio/RANGE-AND-OFFLINE.md`](../audio/RANGE-AND-OFFLINE.md). Real iOS Safari: not tested.
