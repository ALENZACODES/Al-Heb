# ALEF performance and PWA audit

Tools: `node tools/qa/perf.mjs` (budget, routes, manifest effect), `node tools/qa/pwa_audit.mjs` (manifest, icons, service worker, offline).
Raw numbers: `docs/perf/results.json` (full run, median of 3), `docs/perf/no-manifest/results.json` (same routes with the audio manifest and word shards blocked, 1 run), `docs/perf/pwa-audit.json`.
Tests: `tests/perf.test.js` (budget check runs `--quick`, about 30 s; PWA audit about 15 s).

## What was measured, and how far to trust it

Headless Chromium 153 on one shared Linux machine, Playwright plus the DevTools protocol: network "slow 4G" (1.6 Mbit/s down, 750 kbit/s up, 150 ms RTT, the Lighthouse preset), CPU slowdown 4x, 390x844 phone viewport, cold load (new context, HTTP cache off, service worker blocked, onboarding flag pre-set), local static server (`tools/serve.mjs`).

Limits, stated plainly: this is emulation, not a real phone. Byte counts, request counts and the order of events are solid. Milliseconds are indicative only (the shared machine adds noise: three runs of the same route gave FCP 804 / 1284 / 848 ms). CPU throttling is a multiplier on this machine's CPU, not a mid-range Android. Heap and node counts come from Chromium and will differ in Safari. The dev server sends no compression; sizes below are bytes on the wire as measured here, so they are uncompressed. Whether the real host compresses (Cloudflare Pages normally does for text types) was not checked from here. No Lighthouse score was produced (see PWA section).

## Budget

Metric: JS bytes transferred (script resources, headers included) on a cold load of `/`, measured after the audio manifest has settled plus 1 s.
Original baseline (median of 3 runs, this machine, 2026-11-04): **234197 B** in 38 requests. Runs seen while developing the tool ranged from 215 to 234 KB, because late-loading modules land inside or outside the settle window.
Budget: baseline x 1.15 rounded up to 10 KB = **276480 B** (`docs/perf/budget.json`). The 15 % margin is a choice to absorb the run-to-run spread above, not a target from users. The test fails if one cold load exceeds it. Raising it needs a written reason in this file, then `node tools/qa/perf.mjs --set-budget`.

### Budget bump, 2026-11-04 (re-baselined)

Re-measured with `node tools/qa/perf.mjs --quick --runs 3 --set-budget`: **301214 B** in 51 requests (was 234197 B in 38). The old budget of 276480 B was exceeded by 24.7 KB at that point (the measure was 299.4 to 299.8 KB in the first runs of the day).
Why: since the first baseline the home page gained eager modules (shell/nav-model, preview-banner, audio-labels, scroll-restore, names, a larger update.js and others, mostly small, 13 more requests in all). Each is needed at boot or by the router/home view.
What was tried first: `shell/install-notice.js` no longer loads `shell/install.js` (6.1 KB) unless the notice can actually show (not dismissed and a day or more since the first visit), which removed that request from a first load. Loading `settings.data.js` lazily from `update.js` was tried and reverted (a test requires the storage notice synchronously, and it saved only 5 KB); `shell/menu.js` stays eager because `renderNav` builds the menu synchronously and the More button visibility depends on its result. The rest of the home-page JS (calendar, streak, store, router, today, morning engagement timer) is used on first paint or by the engagement timer.
Headroom is tightened to 5 % (budget 317440 B) instead of 15 %, so that the bump is not also a licence to grow. This was measured in emulation only, like the rest of this file.

### Home JS reduction, 2026-11-04 (no re-baseline)

The cold load of `/` had grown to 346346 B in 55 requests (budget 317440 B). Cause: `home.view.js` imported `curriculum/actions.js` only for `loadState`, which pulled in the whole practice chain (progress, scaffold, fade, hints, checkpoint, content, ladder, gender, spotit, hebrew, memory.core, about 47 KB). `loadState` and `currentStreak` now live in `curriculum/state.js`; `actions.js` and `progress.js` re-export them, and Home imports `state.js`. Measured after: 277 KB in 44 requests (`node tools/qa/perf.mjs --quick`, emulated, this machine). Budget and baseline are unchanged.

## Numbers (slow 4G, 4x CPU, median of 3)

| Route | FCP ms | JS KB (req) | JS KB before FCP | total KB | long tasks (TBT ms) | DOM nodes (main) | JS heap MB |
|---|---|---|---|---|---|---|---|
| / | 916 | 229 (38) | 18 | 3712 | 5 (168) | 284 (206) | 6.6 |
| /read/bless-priestly-1 | 848 | 240 (33) | 12 | 3926 | 10 (287) | 410 (332) | 6.7 |
| /vocab | 1108 | 238 (36) | 30 | 3352 | 9 (697) | 664 (585) | 6.5 |
| /vocab/themes | 896 | 251 (38) | 18 | 3275 | 6 (168) | 248 (169) | 6.2 |
| /placement | 988 | 189 (31) | 12 | 4040 | 14 (577) | 83 (5) | 7.0 |
| /progress | 844 | 346 (45) | 12 | 4522 | 17 (1250) | 369 (291) | 7.4 |
| /speak | 1172 | 270 (34) | 30 | 3307 | 9 (379) | 185 (106) | 6.3 |

FCP is about 0.8 to 1.2 s everywhere because only index.html, the CSS, a font and a small first batch of JS (12 to 30 KB) are needed to paint the shell. Heap is after a forced GC and includes the 1.9 MB audio manifest parsed in memory.
The placement view really has few nodes (main 5 on this run); it was not examined further.

## What dominates load

1. **The audio manifest and a word shard** (`data/audio/manifest.json` 1,908,843 B plus one `manifest-words-<tradition>.json` of about 860 KB) are about 2.8 MB of the 3.3 to 4.5 MB total. They are lazy, correctly: requested after first paint (at about 3.4 s on `/`), so FCP is unchanged (916 ms with, 904 ms without; the difference is within the noise). But they are not free:
   - With them blocked, `<main>` has real content at about 5.2 to 8.2 s on every route; with them, it appears at 18 to 31 s (`/` 20.3 s vs 5.6 s, `/read/bless-priestly-1` 20.8 s vs 8.2 s, `/progress` 25.4 s vs 12.4 s). "View mounted" here means `<main>` has more than 4 descendants; `body[data-ready]` is set earlier, when the route's `mount()` returns, and does not mean the content is there.
   - Cause not established. Two candidates: the manifest and shard downloads share the 1.6 Mbit/s link with the route's own data fetches, or the app re-renders the route when the manifest arrives (`scheduleManifest` in `src/app.js`) and the first mount is nearly empty on slow links. Measuring which needs a request waterfall with the manifest throttled separately. Unthrottled locally the content shows immediately, so this is a slow-network effect.
   - Long tasks and TBT are not clearly worse with the manifest (JSON parse of 1.9 MB is in the 100 to 300 ms range per task in these runs).
2. **JS: 189 to 346 KB over 31 to 45 requests**, all small ES module files (largest: `src/speak/speak.js` 53 KB, `src/progress/model.js` 31 KB, `src/corpus/read.view.js` 26 KB, `src/vocab/vocab.view.js` 27 KB). On `/`, `src/shell/notify.js` (22 KB), `src/curriculum/calendar.js` (21 KB), `src/shell/router.js` (18 KB) and `src/curriculum/streak.js` (10 KB) are the biggest. Requests are many but small; HTTP/2 or 3 on the real host makes that cheaper than here.
3. **Data per route**: `data/curriculum/lessons.json` 472 KB on `/`, `/placement`, `/progress`; `data/letters/letters.json` 200 KB and `data/corpus/registry.json` 158 KB (fetched twice on `/read/...`, see below); `data/img/index.json` 135 KB on `/`, `/vocab`, `/speak`.
4. **Fonts 141 KB, CSS 27 KB**: already woff2 with `font-display: swap` and one preload. Not a problem.
5. **Main-thread work**: TBT after FCP between 170 and 1250 ms at 4x slowdown; `/progress` is worst (17 long tasks, 1250 ms) because it loads 1.7 MB of data and builds 291 nodes.

## Proposals (not applied; no files under src were edited)

Each has an expected effect that is an estimate, not a measurement.

1. **Compress text on the host.** `manifest.json` gzips from 1,908,843 B to 74,491 B here (`gzip -9`), `lessons.json` from 472,048 to 69,261 B, all `src/**/*.js` together from 1.51 MB to 0.46 MB. If the host does not already compress these (verify with `curl -H 'accept-encoding: br' -I` against the deployed URL), this alone removes most of the slow-network cost. Brotli would be smaller still.
2. **Shrink or split the audio manifest.** Even compressed it is parsed as 1.9 MB of JSON. Options: ship only the clips for the learner's current lesson and tradition, key by lesson id and fetch on demand (the per-tradition word shards already follow this pattern); or a compact format (arrays or a short-key table instead of repeated objects). Also load the shard after the view has mounted rather than in parallel with it.
3. **Prove or fix the view-mount delay** (item 1 above): run the same route with only the manifest blocked, then with only the shards blocked; if the first mount is nearly empty, render the route fully before the manifest arrives and update only the audio buttons instead of re-rendering the whole route.
4. **Defer non-critical modules on `/`.** `notify.js`, `calendar.js` and `streak.js` (about 53 KB together) load on the first screen; if the home view only needs them after interaction or idle time, `import()` them then. Needs checking of who imports them before changing.
5. **Code-split heavy views**: `speak.js` (53 KB) and `progress/model.js` are already route-loaded; keep helpers they share out of the shell's static import graph.
6. **Avoid duplicate fetches**: `data/corpus/registry.json` shows twice in the `/read/bless-priestly-1` waterfall (resource timing lists it twice; it may be a second request or a revalidation, not checked). A shared memoised loader would make it one.
7. **Bundle for production**: 30+ module files per route cost round trips. A build step conflicts with the zero-dependency rule, so this is only worth it if the real-device numbers show request count matters; ES modules over HTTP/2 are acceptable otherwise.
8. **Cache headers**: `/src/*` and `/data/*` are `no-cache` (revalidate every visit). After the first visit the service worker serves them, so repeat loads are not affected; only the first (cold) load matters for this report.

## PWA audit

Run: `node tools/qa/pwa_audit.mjs` gives 61 ok, 0 FAIL on 2026-11-04. Checked by hand: manifest fields (name, short_name, id, description, lang, display, background and theme colour), `start_url` inside `scope` and both relative (works under a `/repo/` prefix), theme-color meta equal to the manifest, real PNG dimensions equal to the declared ones (192, 512 any; 512 maskable; 180 apple-touch), separate any and maskable icons, shortcuts inside scope, narrow and wide screenshots present, `sw.js` with a fetch handler registered at the root (scope equals the origin root in the browser), offline.html present, precached and self-contained, every precache entry exists on disk, `_headers` no-cache for `sw.js` and the precache list, manifest media type. Browser part: shell cache filled, Chromium's own installability errors (`Page.getInstallabilityErrors`) empty, manifest parsed without errors, and offline reloads of `/`, `#/learn` and `#/read/bless-priestly-1` show the app (offline.html is also served from cache).

Lighthouse 13 is in `tools/lighthouse/node_modules` but it dropped its PWA category, so there is no Lighthouse PWA score; the hand checks above plus `tools/lighthouse/pwa-check.mjs` replace it. Limits: headless Chromium over localhost; no real install prompt, no iOS or Safari Add to Home Screen, and the maskable icon's safe zone was not checked visually. The offline fallback page itself is only reached when index.html is not cached (the service worker serves index.html first), so the offline reloads above do not exercise it; it was checked for presence, precaching and cached delivery only.
