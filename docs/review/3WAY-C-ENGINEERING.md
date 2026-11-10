# Three-way review, lens C: engineering, security/privacy, release and business readiness

Reviewer C, 2026-11-05. Read-only review of `main` at `fcba08f` (shallow clone). Only this file was added. Everything below is something I ran or read; the last section lists what I did not check.

## Scores

| Question | Score | One line |
|---|---|---|
| Ready to ship to real learners | **70 / 100** | Engineering, tests, privacy and offline are in better shape than most v1s; nothing has been deployed or tried on a real device, a few reachable pages are broken in the built output, and unlicensed audio ships. |
| Ready to sell | **44 / 100** | The code is clean and reproducible, but there is no ownership/licence decision, the data is mostly share-alike, audio and image rights are unresolved, and the repo carries ~700 MB of drafts. |

Rubric (points available / awarded).

Ship: CI, tests, reproducibility 20/18; security and privacy claims vs behaviour 20/17; offline, storage and data-loss paths 20/14; deploy and operations (never deployed, host headers, stale docs) 15/8; performance 10/7; content rights of what actually ships 15/6. Total 70.

Sell: licence and ownership clarity 30/6; provenance of shipped data, audio, images 20/6; repo and hand-over hygiene (size, history, drafts) 15/6; reproducible build, CI, supply chain 15/12; security and privacy documentation a buyer can verify 10/8; operability and docs (runbook, support, monitoring) 10/6. Total 44.

## What I ran

- `npm test` (unit tier): 2790 tests, 2782 pass, 0 fail, 8 skipped, 183 s. Skips are browser-only checks without Playwright and the UXLC cache check (both documented).
- Same suite with `TZ=America/Toronto`: 2783 pass, 0 fail. With `TZ=Pacific/Kiritimati`: 3 fail (see finding 14). CI pins `TZ=UTC`, so CI cannot see this.
- `node tools/build-precache.mjs` on a clean tree: reproduces the committed `precache-manifest.js` byte for byte (version `f7924f19d001`, `git status` clean).
- `node tools/deploy/build_site.mjs` then `check-deploy.mjs --root dist`: 46/46 pass, 3 warnings, 912 files, 46.75 MiB, first-install precache 3.93 MiB against a 4 MiB budget.
- `node tools/meta/scan.mjs` and `--text`: both PASS (914 allowlisted JSON findings, 20 allowlisted text files).
- Served the built `dist/` with the real `_headers` applied and drove it in headless Chromium with a request log over 16 routes: 234 requests, all to the one local origin; no cross-origin request, no page error; one 404 (finding 3). localStorage keys after the walk: `alef:__meta`, `alef:streak`, `alef.storage-notice.v1`. No cookies, no IndexedDB.
- Offline: after first load and one reload, network off, in-app navigation to `/learn`, `/letters/alef`, `/settings`, `/privacy` rendered, and a full reload of `/` returned the app.
- Fault injection: blocking one view module, `lessons.json`, or `letters.json`, and writing corrupt values into `alef:*` keys, gave friendly states and no uncaught errors.
- Greps: network APIs, `innerHTML` family, key-shaped secrets (only hit is a base64 blob inside the vendored wasm file), Windows or home paths in shipped text (none).

## Ranked findings (top 25)

Severity: H = fix before a public launch or a sale; M = fix soon; L = tidy. Effort: S under a day, M a few days, L a week or more.

**1. H. Audio with "licence unknown: not cleared" is in the deploy output.** `audio/m/*/word/*.mp3.meta.json` (87 of 87) say `"redistributionCleared": false`, `"licence": "unknown: not cleared"`, `"origin": "outside-synthetic"`. `listShipFiles()` returns 87 mp3 files for `dist/` (`tools/deploy/make-dist.mjs`, `EXTRAS` entry `audio`). `redistributionCleared` is read only by ingest/render tools, never by the deploy build. The UI labels the clips as synthetic, which is honest, but the licence question is separate. Fix: make-dist (and a test) refuse any clip whose sidecar lacks `redistributionCleared: true`; or knowingly accept the risk in writing. Effort S.

**2. H. No licence or ownership decision, and no LICENSE file.** `package.json` has no `license` field; README says "not chosen". Default law means all rights reserved, which is workable, but a buyer needs a stated position plus chain of title (several contributors/agents push to this repo; I did not read history, see last section). Also `docs/legal/LICENCE-OPTIONS.md` says provenance of machine-drafted code and text is an open lawyer question. Decide: proprietary plus end-user licence, add `LICENSE` and a `NOTICE` that carries the third-party texts, set `"license": "UNLICENSED"` in `package.json`. Effort S for the files, lawyer time for the rest.

**3. M. Three reachable pages 404 in the built site.** `/listen`, `/grammar`, `/placement` fetch `data/vocab/words.json` (7.0 MB, in git) which `make-dist` does not ship. Measured on the served `dist/`: `404 /data/vocab/words.json`; the pages then say "Check your connection and try again" / "could not be loaded", which blames the learner's network. They are preview-tier, but reachable by link and search. Evidence: `src/listen/listen.view.js:59`, `src/grammar/loader.js:21`, `src/placement/loader.js:6`. Fix: either ship a trimmed file for them or mark the three routes unavailable in the build (and add a test that every `fetch`ed data path in a routed view exists in `listShipFiles()`). Effort S to M.

**4. M. A first-time learner sees a warning-coloured status bar before doing anything.** Fresh profile on the welcome screen: "Sound: the list has not been loaded yet. Full message / Details / x" (`src/shell/audio.js:76`, `IDLE_TEXT`; shown whenever no congregation is set yet). It is correct but alarming, and it appears on the very first screen. Fix: do not show the idle bar until the learner has chosen a tradition or pressed a sound button. Effort S.

**5. M. Service worker precache can store stale files under a new version name.** `sw.js:19` uses `cache.addAll(list)`, which goes through the browser HTTP cache. The `_headers` file makes `/src/*` and `/data/*` revalidate, but any host without that file (the GitHub Pages workflow in `.github/workflows/pages.yml` deploys `dist/` with no header control, default 10 minute max-age) can hand the installer old bytes, so a "new" cache holds old files with no later correction. Fix: fetch each URL with `new Request(url, {cache:'reload'})` and `put`. Effort S.

**6. M. Static-host CSP gap if the GitHub Pages path is ever turned on.** CSP, nosniff, Permissions-Policy and cache rules live only in `_headers` (Cloudflare format); `index.html` has no CSP `<meta>` (checked). On GitHub Pages none of it applies. The CSP is otherwise strict (all `'self'`, `object-src 'none'`, `frame-ancestors 'none'`). Fix: keep Cloudflare as the only production host (the docs already say so) and delete or gate the Pages deploy job; or add a meta CSP for the parts a meta tag can carry. Effort S.

**7. M. Navigation is network-first with no timeout.** `sw.js:44-48`: a slow or "lie-fi" connection makes every page load wait for the network before the cached shell is used. Offline and fast-online work; the bad middle does not. Fix: race the network against a 3 to 4 second timer, then fall back to cache. Effort S.

**8. M. Audio will not play offline on Safari.** `sw.js:42` returns early for any request with a `Range` header, and media elements on iOS Safari always send one. `docs/ARCHITECTURE.md` states this limit. With the 87 clips today it is minor; with the planned thousands it breaks the "works offline" promise on the learner's most likely phone. Fix: for audio, fetch whole files into the runtime cache and answer Range requests from the cached blob (slice, return 206). Effort M.

**9. M. Runtime audio cache has no size cap or eviction.** `alef-runtime-v1` (`sw.js:17`, `:63`) is kept across versions and only grows. Fix: count and size limit with oldest-first removal, plus a "remove downloaded sounds" button. Effort S to M.

**10. M. Hundreds of unreferenced bytes at boot.** Cold load of the welcome screen on the built site: 66 requests, 1.28 MB decoded, 350,021 B of JavaScript (my count of response bodies, not the repo's harness; the repo budget is 317,440 B and its quoted figure is 309,860 B, so headroom there is 7,580 B, 2.4 %). `data/img/index.json` (234,921 B) is fetched on every load by `src/app.js:273` although `make-dist` states no image is wired to any screen. Fix: load it lazily when the first image slot appears. Effort S.

**11. M. Precache is at 98 % of its own budget.** `check-deploy`: 3.93 MiB of 4 MiB. The next few features break the check; the update banner then re-downloads about 4 MB for every release. Fix: move preview-only code and data out of the precache (they are already lazy by route) and raise the bar only on purpose. Effort S.

**12. M. Repo weight and handover.** Working tree 1.3 GB; `docs/drafts` is 339 MB (1,502 PNG, 818 SVG), `docs/qa` 28 MB, `docs/screens` 23 MB, `book/out` has four 13 MB PDFs. A depth-1 clone's `.git` is 536 MB; you quoted about 700 MB for full history. Every Cloudflare build and every buyer clone pays this. Fix: move drafts, screens and book output to a release asset or a second private repo; consider a history rewrite once, before any outside party has a clone. Effort M.

**13. M. Deploy docs are stale and contradict each other.** `docs/DEPLOY.md` still says "nothing has been deployed", "GitHub push is not possible", and lists free-tier limits as unverified, while `_headers` and `docs/deploy/CLOUDFLARE-PAGES.md` cite limits read on 2026-11-03; `docs/DEPLOY.md` also says "no recorded audio" while 87 clips ship. `GO-LIVE-CHECKLIST.md` has an unconfirmed item ("`_tesseract` was never confirmed to deploy"). A buyer or a stand-in operator will trust the wrong file. Fix: one authoritative deploy page, others point to it. Effort S.

**14. M. Tests depend on the time zone; CI hides it.** `TZ=Pacific/Kiritimati npm test`: 3 failures: `tests/calendar.reminders.test.js:122` (`r.count >= 3`), `tests/teacher.summary.test.js:24` (expected `2026-11-03`, got `2026-11-04`), and a streak-hiding view test (timeout, may be a flake). Toronto and UTC pass. A learner in Asia or the Pacific on the first night of use can hit the same day-boundary logic. Fix: run unit tests in CI under a second zone (a `matrix` entry with `TZ=Pacific/Auckland`), then fix what falls out. Effort S to M.

**15. M. Storage schema has never migrated.** `src/store.js:16` `SCHEMA_VERSION = 1`, `migrations = []` (`:70`). Backup restore, checksum, rollback on quota error and key validation are good (`previewImport`/`importData`, `:196-250`), but the first real schema bump will be the first real migration, with learners' data on the line. Fix: add a fixture backup file from today's version to the repo and a test that restores it forever. Effort S.

**16. L. Backup checksum is optional and not a security control.** `store.js:206`: a backup without `checksum` is accepted. Fine for local data; just do not describe it as tamper-proof. Effort none.

**17. L. Two storage keys live outside the `alef:` prefix** (`alef.storage-notice.v1` in `src/shell/install-notice.js:6`, `alef.scroll.v1` in sessionStorage). They are documented in the privacy page and wiped by "delete my data" per the code path I read, but they are not in backups. No action needed beyond keeping the docs line "all keys use the prefix" accurate; `docs/DEPLOY.md` still says all progress is under `alef:`. Effort S.

**18. L. `Permissions-Policy` grants `camera=(self)` and `geolocation=(self)`.** The privacy page itself says the app never calls the camera API (the photo picker is a file input). Least privilege: drop `camera`. Effort S.

**19. L. `connect-src` allows `http://127.0.0.1:*` and `http://localhost:*`** for the optional local helper. If a script injection ever happened it could probe local services. There is no injection path I found (only three `innerHTML` writes in `src`: sanitised SVG in `src/letters/memorycard.js:348`, and number-only sparklines), so this is defence in depth. Consider shipping the helper field only behind an advanced switch. Effort S.

**20. L. Dead network adapters ship in the code.** `src/photo/engines/web.js` contains Dicta, Google Vision and LibreTranslate URLs. The photo screen builds engines with `online: false` (`src/photo/scan.view.js:164`), the CSP blocks the origins, and `check-deploy` warns about them. The code's own header says the Dicta endpoint has no readable terms. For a sale, remove the adapters from the shipped tree (keep in `tools/`) so no buyer has to explain them. Effort S.

**21. L. SW background revalidation is eager and un-awaited.** `sw.js:71`: for files served from the precache it still starts a network `fetch` on every request and then drops the result; no `waitUntil` for the background fetch. Costs a second round trip per module on every page load. Fix: skip the network fetch when the hit is in the shell cache. Effort S.

**22. L. CRLF hazard for Windows checkouts.** `.gitattributes` pins LF only for js/mjs/json/md/yml; the precache hash is over raw bytes and includes html, css, svg. On a Windows working tree those become CRLF and the local hash will differ from CI's (the CI step `precache manifest is current` then fails). Add `*.html`, `*.css`, `*.svg`, `*.webmanifest`, `*.txt` with `eol=lf`. Effort S.

**23. L. Supply chain is good; two small gaps.** Every action in both workflows is pinned to a commit SHA with a version comment and `permissions: contents: read`; Dependabot covers `github-actions` monthly. Not covered: the pinned Python packages (`tools/test/requirements-ci.txt`) and `tools/a11y/package-lock.json` / the Playwright pin. I could not verify the SHAs against upstream (no API access to those repos from this session). Add `pip` and `npm` ecosystems to `dependabot.yml`. Effort S.

**24. L. No global crash reporting or "something went wrong" screen.** `src/app.js:288` only stores `lastError` in a data attribute; there is no `unhandledrejection` handler. Individual views recover well (my fault injection), and not collecting telemetry is a feature, but a learner with a stuck page has nothing to copy for support. Add an on-device "copy diagnostics" in Settings. Effort S.

**25. L. Type and lint safety net is thin.** 89 of 273 app modules have `// @ts-check`; there is no `tsconfig`/`jsconfig` and no linter. With 2.1 MB of JS and 88 routes, the 2790 tests carry the load. A zero-dependency `tsc --noEmit` job (dev-only, not shipped) would catch what tests miss. Effort M.

## Things that are good and should not be touched

Privacy page vs reality: its table of network requests (`src/shell/privacy.view.js:5-10`) matches what I saw; only same-origin requests in a 16-route walk; the Dicta path is off by default and blocked by CSP. XSS surface is very small (3 `innerHTML` sites). Backup/restore is all-or-nothing with rollback. Precache build is reproducible and verified in CI. CI runs a browser tier that fails on skips. Actions are SHA-pinned. Metadata scan is clean (PDFs carry the author name only, no tool names; no image metadata hits in a 150-image sample).

## What a buyer must decide before closing

1. Code licence stance and a `LICENSE`/`NOTICE` (finding 2), and written confirmation of who owns the contributions made by agents and helpers.
2. Whether the CC BY-SA vocabulary data (6,033 of 6,303 records per `docs/legal/SALE-READINESS.md`) is shipped as a separate open data set or replaced; that file lists the lawyer questions. I did not re-read upstream licences.
3. Fate of the 87 uncleared clips, the 1,828 generated images, and the 117 lesson-derived vocabulary records with no stated licence.
4. Whether to trim history (finding 12) before handing over.
5. A named production host and domain; today `GO-LIVE-CHECKLIST.md` says nothing has been done.

## What I did not check

- No real phone, no iOS or Android install, no screen reader, no real network or CDN; Cloudflare itself (compression, real header joining, `.pages.dev` behaviour). `check-deploy` is a local imitation.
- The browser-tier tests (a11y, journey, pwa, deploy.smoke) and the Lighthouse run: I did not execute them; I used my own scripts. I did not re-run the repo's perf harness, so my 350 KB figure is not comparable to its 309,860 B.
- Full git history: I used a depth-1 clone to stay under the disk cap, so I did not measure history size, find large blobs that were later deleted, check authorship, or grep old commits for secrets. My secret grep covered the current tree only.
- Upstream licence pages, trademark clearance of the name and logo, app-store rules, privacy law (PIPEDA, GDPR, children's data), accessibility law.
- Whether the workflow SHA pins resolve to the tagged versions in the comments.
- The Hebrew content, the pedagogy, the audio quality and the book (other lenses).
- Update flow in a real browser (two deployed versions, banner, Reload). Only the code and the repo's fake-worker tests were read.
