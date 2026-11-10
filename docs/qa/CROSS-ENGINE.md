# Cross-engine QA: Chromium, Firefox, WebKit at 375x667 and 360x640

Run on 2026-11-04 against the working tree, static server from `tools/serve.mjs`. Playwright 1.63.0 with Chromium 153, Firefox 155.0, WebKit 26.6 (Linux builds).

**WebKit here is the closest available proxy for iOS Safari, and it is not a real device.** It is Playwright's Linux WebKit build, desktop-emulated viewport and touch flag. It does not reproduce iOS Safari's address-bar resizing, safe areas, keyboard behaviour, audio-session rules, storage eviction or Add to Home Screen. Treat a WebKit pass as "no engine-level surprise seen", nothing more. Firefox ran without the mobile-emulation flag (Playwright does not support it there), so Firefox ran as a narrow desktop window.

## How it was run

- `tools/qa/v0-walk.mjs` and `tools/qa/offline.mjs` were copied to a scratch directory outside the repo and patched only to (a) pick the engine and viewport from environment variables and (b) point at the repo root. The scripts in the repo were not changed.
- `offline.mjs` was given a freshly computed precache manifest outside the repo (`QA_MANIFEST`, computed by calling `computeManifest()` from `tools/build-precache.mjs` without writing anything), because the committed `precache-manifest.js` is stale: without it the unmodified script times out on `#view-title, h1` even in Chromium (observed). The stale committed manifest is something to regenerate before release; I did not run the build step.
- Chromium and Firefox used the preinstalled/downloaded browsers. WebKit was downloaded (the disk was full, so browsers and temp files were placed on the in-memory filesystem for this run).

## v0 walk (13 steps x 3 congregation settings = 39 steps per run)

| Engine | 375x667 | 360x640 |
|---|---|---|
| Chromium | 39 pass, 0 warn, 0 fail | 39 pass, 0 warn, 0 fail |
| Firefox | 39 pass, 0 warn, 0 fail | 39 pass, 0 warn, 0 fail |
| WebKit | 39 pass, 0 warn, 0 fail | 38 pass, 1 warn, 0 fail |

Observed differences:
- WebKit 360x640, sephardi, step 1 (onboarding): WARN, 8 taps instead of 6, the walk saw the letters question twice before the plan card. Re-run twice at the same engine and viewport (sephardi only): 12 of 12 steps passed both times. So it did not reproduce; cause not found. Treat as an intermittent script/timing observation, not a confirmed app defect.
- WebKit shows 7 controls on the lesson screen where Chromium and Firefox show 11 (both viewports). I did not investigate which controls differ or why (for example the engine's speech support); worth a look on a real iPhone.
- No console errors, no failed requests, no horizontal overflow flagged in any run.

The walk is a scripted emulation: it says nothing about Hebrew correctness, audio, or comprehension.

## Offline / update / storage checks (83 checks per complete run)

| Engine | 375x667 | 360x640 |
|---|---|---|
| Chromium | 82 pass, 1 fail (complete) | 82 pass, 1 fail (complete) |
| Firefox | script aborted: 51 pass, 1 fail before the abort | script aborted: 51 pass, 1 fail before the abort |
| WebKit | script aborted: 19 pass, 33 fail before the abort | complete: 49 pass, 34 fail |

Failures and what is known about each:
- Chromium, both viewports: "malformed backup file is rejected, data unchanged". Checked by hand in all three engines on the real settings screen: choosing a malformed file shows "Could not restore: Not valid JSON. Your progress on this device was not changed." So the app behaves correctly; the script's status read in that step did not see the message (cause not found, likely script state or timing). Not an engine defect.
- Firefox, both viewports: the persistence section failed and the script then aborted with `window.alef is undefined`. A separate probe loaded the app in Firefox with no init script and `window.alef` was present, so the app boots; the persistence test's injected wrapper around `navigator.storage.persist` appears to interact badly with Firefox. Cause not confirmed. Result: the checks after that section (backup, restore, iOS notice and later) did NOT run in Firefox. The 51 earlier checks passed apart from the persistence one.
- WebKit: 31 of the failures are the "first load offline" scenarios (A and B, every route) plus the deep-path info check, all with "WebKit encountered an internal error" when navigating after the context is set offline. Cause investigated in the follow-up section below. The persistence checks also fail in WebKit ("not granted"), which is expected of an automated profile, not evidence about Safari. The 375 run aborted partway at the persistence section; the 360 run completed.
- Install-notice, update-banner and service-worker install checks that ran passed in Chromium; in Firefox those that ran before the abort passed; in WebKit the ones that ran are included in the counts above.

## Defects and fixes

No CSS or JS defect in the app was confirmed by these runs, so no app files were changed. Open items for owners:
1. Committed `precache-manifest.js` is stale relative to `src/` (offline script cannot render without a fresh one). Owner of the build step should regenerate.
2. `tools/qa/offline.mjs` now takes `--engine`, `--viewport` and `--offline` (see follow-up below). The malformed-backup check was not changed.
3. The 7-versus-11 lesson control difference in WebKit is still uninvestigated. Offline on a real iPhone is still unchecked (see follow-up).

## Follow-up: engine-aware offline script, and the WebKit offline failure

Run later the same day against the then-current working tree (other files under `src/` were being edited by others at the time, so counts may drift). `QA_MANIFEST` pointed at a freshly computed manifest kept outside the repo; the build step was not run. Browsers: Playwright 1.63.0 builds as above.

### Changes to `tools/qa/offline.mjs`
- New flags: `--engine chromium|firefox|webkit` (default chromium), `--viewport WxH` (default 375x667), `--offline setoffline|stop-server` (default setoffline).
- `isMobile` is only passed for Chromium and WebKit (Firefox ran without it).
- The persistence test now wraps `persist` on the `StorageManager` prototype inside a try/catch instead of rebinding it on `navigator.storage`. Observed: Firefox no longer aborts with `window.alef is undefined`.
- `--offline stop-server` closes the static server instead of calling `context.setOffline(true)`, then restarts it on the same port after each offline scenario.
- Syntax-checked with `node --check`. Not run: Firefox or WebKit at 360x640 with setoffline, or Firefox with stop-server.

### Results of this follow-up
| Run | Result |
|---|---|
| Chromium 375x667, setoffline | 83/83 passed |
| Firefox 375x667, setoffline | complete, 82/83. Only failure: "first real save requests persistence once" (`persist` result undefined, no log line). Cause not investigated; the wrapper no longer aborts the script. |
| WebKit 375x667, setoffline | 52/83. All 30 first-load-offline checks (scenarios A and B, every route) plus the deep-path info check fail with "WebKit encountered an internal error". |
| WebKit 375x667, stop-server | 82/83. All 30 first-load-offline checks and the deep-path check passed. The one failure is a localStorage-corruption case ("alef:settings = huge-theme garbage values") with 1 page error. |
| WebKit 360x640, stop-server | 80/83. First-load-offline checks passed. Failures are three localStorage-corruption cases (page errors "due to access control checks" on the word-shard fetch, and one `/progress` title empty). |

An earlier Chromium 375x667 run in this session (before the final one above) showed restore-store failures and then crashed in the backup section; the later run passed 83/83. I did not find the cause; the working tree was changing during the session.

The localStorage-corruption failures in WebKit were not investigated, and each appeared in only one of the two stop-server runs, so treat them as unexplained and possibly timing related.

### WebKit "internal error" on first load offline
Probe (service worker installed and controlling the page, same routes, then going offline):
- `context.setOffline(true)`: `page.goto` to `/`, `/sw.js` and `/src/app.js` all fail with "WebKit encountered an internal error". A `fetch()` from the already-controlled page also fails ("Load failed"), i.e. the worker's cached response is not served.
- Server stopped instead: `page.goto` to `/` returned 200 with the app's h1 rendered, and an in-page `fetch` of the shell returned 200. A control (fresh context with no worker, server stopped) failed with "Connection refused", so the server was really down and the pages above came from the worker's cache.
- The full script with the server stopped passed every first-load-offline check in WebKit at both viewports.

Conclusion supported by these runs: the failure follows Playwright's WebKit `setOffline` emulation, not the app, because the same cached shell and routes load offline when the network is genuinely unavailable. Not shown: that this holds on real iOS Safari. Playwright's Linux WebKit is not iOS Safari, so offline use on a real iPhone remains unchecked.
