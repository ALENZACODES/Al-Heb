# Performance re-check, 2026-11-04 (after the sound-bar change, new vocab data, audio manifest and review-card respelling)

**Update later on 2026-11-04 (lane figures, not re-measured by me):** the core audio manifest and the word shard are now fetched lazily (first time a view asks about a clip, see `src/app.js`) and no longer on the home route. The lane reports a cold home load of 731 KB, against 4,634 KB measured below, with JS transferred at 311,470 B (budget 317,440 B). The sections below describe the measurement before that change and are kept as observed; where they say the manifest and shard are fetched automatically on the home route, that is no longer the case. I did not re-run `tools/qa/perf.mjs` for this update, so the 731 KB and 311,470 B figures are stated from the lane and not verified here; `docs/perf/budget.json`, `PERF.md` and `results*.json` were not touched.

Observed numbers only. Headless Chromium 153 on one shared Linux machine, not a phone. Network emulated as slow 4G (1.6 Mbit/s down, 750 kbit/s up, 150 ms RTT), CPU slowdown 4x, cold load (new context, HTTP cache off, service worker blocked, onboarding flag set), local server `tools/serve.mjs`, no compression. Milliseconds are indicative only; bytes and request order are the solid part.

## Commands run

- `node --test tests/perf.test.js`: 4 of 4 pass (budget derivation, tool coverage, `--quick` first-load JS under budget, PWA audit), 38 s.
- `node tools/qa/perf.mjs --quick --runs 3 --out <temp dir>` (budget.json copied there; repo `docs/perf/results*.json` not touched): exit 0.
- A temporary script (deleted afterwards) loaded `#/` at 375x667, 3 cold runs, same throttling, and logged every request.
- `computeManifest()` from `tools/build-precache.mjs` called read-only (precache-manifest.js not rewritten) to size the install list; `node --test --test-name-pattern=precache tests/integration.test.js`: 5 of 5 pass.

## First-load transfer, home route `/` (375x667, 3 runs)

| Metric | Observed |
|---|---|
| JS transferred | 309,284 B in 51 requests (identical in all 3 runs) |
| Budget | 317,440 B; headroom 8,156 B (baseline 301,214 B, so +8,070 B since the re-baseline) |
| JS before first contentful paint | 29,832 B / 4 requests in the `perf.mjs` run (390x844) |
| CSS / fonts | 38,035 B / 140,596 B |
| HTML document | 2,934 B |
| All requests, whole observation window | 65 requests, 4,744,912 B |
| Of which `data/*` | 4,254,063 B (see next section) |

Bytes and requests were the same at 375x667 and at the tool's 390x844. Page errors: none.

## Audio manifest and vocab data: loaded when?

- `data/vocab/*`: not requested on the home route in any of 3 runs (0 requests). Not in the install list either (0 vocab files in core, 52 on demand).
- `data/audio/manifest.json` (1,965,695 B = 1.87 MiB) and the tradition word shard `manifest-words-sephardi.json` (1,559,183 B): both ARE fetched automatically on the home route, but late. Shard started at 4.06 to 4.21 s, core manifest at 5.00 to 5.24 s, finishing at 24.2 to 24.5 s. Both started after first contentful paint (1.06 to 1.66 s) and after `body[data-ready=1]` (5.2 to 5.5 s was the ready time; the core manifest request began at about the same moment). So they are deferred off the critical path, not loaded only on a route that needs them. Together they are 3,524,878 B, 74 percent of the 4.74 MB transferred in the window.
- The JS-budget metric counts script bytes only; manifest JSON is not in the 309,284 B.
- Not re-run this time: the manifest-blocked comparison (`perf.mjs` without `--quick`). The last one is in `docs/perf/results.json`.

## Install budget (service worker precache)

- Core install list: 284 files, 3,565,788 B = 3.40 MiB, under the 4 MiB budget (0.60 MiB spare).
- On demand: 246 files, 11,149,121 B. The audio manifest, the word shards and all `data/vocab/` files are outside the core list.
- Largest core files: `data/curriculum/lessons.json` 473,433 B; `data/img/index.json` 234,921 B; `data/letters/letters.json` 200,159 B; `data/corpus/registry.json` 160,077 B.
- The repo's `precache-manifest.js` matched the computed file list (the stale-list test passed).

## Cold-start timings, headless Chromium, 375x667, slow 4G, 4x CPU (3 runs)

| Run | FCP | LCP | ready | long tasks | longest | blocking time after FCP |
|---|---|---|---|---|---|---|
| 1 | 1,056 ms | 5,128 ms | 5,483 ms | 19 | 186 ms | 697 ms |
| 2 | 1,664 ms | 5,240 ms | 5,536 ms | 18 | 518 ms | 824 ms |
| 3 | 1,120 ms | 4,992 ms | 5,228 ms | 8 | 343 ms | 885 ms |

The `perf.mjs` run at 390x844 (3 runs, median): FCP 1,088 ms (1,424 / 1,088 / 1,044), 18 long tasks, blocking time 831 ms, longest 301 ms, main-thread view mounted at 25.8 s (the view-mounted wait follows the manifest settling in that tool, so it is not a first-paint figure). Run-to-run spread is large on this shared machine (FCP 1.06 to 1.66 s at the same settings).

## Baseline decision

Not changed. 309,284 B is under the 317,440 B budget, so no re-baseline is justified. `docs/perf/budget.json`, `PERF.md` and `results*.json` were not edited.

## Observed oddities (not changed)

- `budget.json` records headroom 1.05, while `tools/qa/perf.mjs --set-budget` and its comments use 1.15. The next `--set-budget` would write a different rule than the current file.
- Auto-fetching 3.5 MB of audio manifest on the home route was the dominant transfer when measured. It has since been made lazy (see the update at the top); that change is not measured in this document.
