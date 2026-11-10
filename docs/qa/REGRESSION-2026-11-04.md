# Regression run, 2026-11-04

Run on a temporary copy of the tree taken about 20:18 local (excluding dist/ and screenshot folders), with a fresh `tools/build-precache.mjs` run inside the copy only. Nothing in the repo was modified except this file. The UI lanes kept editing afterwards, so later edits are not covered; `src/` was re-synced into the copy once (20:45) to re-check the failures below. Scripted emulation only, no real devices or learners.

## Results

| Check | Result |
|---|---|
| v0-walk, israeli/sephardi/ashkenazi at 375x667, 360x640, 412x915 (9 runs) | each run 13 pass, 0 warn, 0 fail |
| journey.mjs (personas A-E, 7 days) | no errors; 3 findings (below). Caveat: my 590 s timeout fired at the same moment the script reported elapsed 590 s (exit 124); journey.json had all five personas but the run may have been cut off at teardown, and the script's own report file was not written |
| a11y run.mjs --quick | 9 routes x 4 configs, 0 violations; 9/9 keyboard checks ok |
| a11y newviews.mjs | 10 routes, 0 findings |
| qa/offline.mjs | 88/88 passed |
| npm run test:browser | 39 tests: 35 pass, 3 fail, 1 skipped (dist smoke: dist/ not built) |

## Failures (each re-run once)

1. `tests/perf.test.js` "perf --quick: first-load JS bytes of / under budget". Reproduced on re-run (347227 B vs budget 317440 B; baseline 301214 B recorded 19:47 today). Cause: first-load JS grew by 46 KB and 4 requests (55 vs 51) since the baseline was recorded. Largest: calendar.js 20.6 KB, router.js 20.4 KB, app.js 20.0 KB, store.js 16.5 KB, today.js 12.8 KB. Not identified which files are the new requests (no VCS to diff). Owner: whichever lane added eagerly loaded modules (candidates edited after 19:47: src/shell/router.js, nav-model.js, nav.strings.js, home.view.js, src/curriculum/progress.js/actions.js/state.js, src/shell/offline.js). Either defer the loading or re-measure with `--set-budget` plus a written reason in docs/perf/PERF.md.
2. `tests/pwa.update-data.browser.test.js` "after a version bump ... served fresh". Reproduced in 3 of 3 runs, but the file that fails differs each time (data/audio/manifest-words-sephardi.json, data/audio/manifest.json, data/vocab/packs/vocab5k-tier-500.json): on-demand files already serve v2 while the old worker is still waiting, where the test expects v1 until reload. Cause not confirmed; likely sw.js stale-while-revalidate for on-demand files updating the cache in the background before the probe, so the test assertion or the sw.js caching policy is out of step. Owner: sw.js (and the test, tests/pwa.update-data.browser.test.js line 73). I did not check whether it passed before today's edits.
3. `tests/qa.walk.test.js` "qa walk --quick ... no hard failures". Reproduced in 3 runs (8, 7, 8 hard-failure groups).
   - Consistent: trace alef/bet/shin. Drags count no progress (feedback stays "Press Animate to see the order, then trace it."), the completion badge is not persisted, and the synthetic touch drag counts no stroke. The tracer apparently needs Animate pressed first (or the new view changed its handles) and tools/qa/walk.mjs does not do that. Owner: src/letters/trace.view.js (new 29 KB view, line 258 area), or tools/qa/walk.mjs if the Animate-first flow is intended. Confirmed against the 20:45 re-synced src/.
   - Flaky: "vowelboard: mounts with tray and modes" (tray=0) failed in 2 of 3 runs and passed in one. Owner: src/vowelboard/ (tray renders late, or walk.mjs checks too early).

## Journey findings (not regressions, as reported by the script)

- B day 4, medium: Today card keeps recommending something already done ("Review 32 due cards first").
- D day 13, low: Home does not greet a learner returning after 10 days.
- E day 1, medium: Home has no visible link to the reader.
I did not compare these with earlier JOURNEY.md results.

## Not run

dist smoke test (skipped by the suite: dist/ not built). Full a11y run without --quick.
