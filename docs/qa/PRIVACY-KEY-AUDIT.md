# Privacy page key and permission audit

Date: 2026-11-04. Scope: `src/shell/privacy.view.js` (FLOWS, LOCAL_ONLY, STORE_KEYS, prose) against `src/`, `sw.js`, `_headers`. Method: reading and grep, plus a small scan script and a test run in a scratch copy under `/tmp/privaudit` (the live tree was not edited). Patches: `docs/release/patches/privacy/`.

## Result

The table is mostly complete (51 rows; every row's key string exists in its listed source file). Found: 3 storage names missing, 1 wrong permission statement, 2 statements that are incomplete (camera, cache names), 1 row that understates what it holds.

## Findings

| # | Severity | Finding | Evidence |
|---|---|---|---|
| 1 | Medium (wrong) | The speech-recognition flow says `_headers` sets `microphone=()`, "which should disable microphone use". The root `_headers` sets `microphone=(self)`. The page contradicts itself: the Record and compare bullet (privacy.view.js:18) says `(self)`. `()` is what the stale, git-ignored `dist/_headers:18` has. | `_headers:18`; `src/shell/privacy.view.js:10` vs `:18`; `dist/_headers:18`; `docs/qa/SINKS-AUDIT.md:84-85,121` |
| 2 | Medium (missing key) | `service.prefs` is written but not listed (order, tradition, transliteration toggle). | `src/service/service.view.js:12,49,56`; `src/progress/model.js:24` |
| 3 | Medium (missing key) | `progress.milestones.v1` is written but not listed (milestones reached and when). | `src/progress/model.js:25`; `src/progress/store.js:24,29-30`; called at `src/progress/progress.view.js:167` |
| 4 | Low (missing key) | `alef:__meta` (schema number) is written to localStorage on first run and is excluded from backups. Holds no learner data. | `src/store.js:18,278` (excluded: `:118,170`) |
| 5 | Low (understated) | The `alef.scroll.v1` row says "scroll position per screen". Each entry is named by `location.hash`, which includes the query, so a Search term typed on the Search screen (`#/search?q=...`) is stored as an entry name in sessionStorage (tab-only). | `src/shell/scroll-restore.js:15-19,45`; `src/app.js:190,242`; `src/shell/search.view.js:40` |
| 6 | Low (incomplete, permission) | Camera is not mentioned. The Scan screen uses `<input type=file accept=image/* capture=environment>`, so a phone may open the camera through the browser's own picker. No `getUserMedia` video request exists in `src/` (`video:` search found none). `_headers` also grants `camera=(self)`. | `src/photo/scan.view.js:64`; `_headers:18`; `docs/qa/SINKS-AUDIT.md:84` |
| 7 | Low (incomplete) | Cache Storage is described generically. Actual names: `alef-shell-<version>`, `alef-data-<version>`, `alef-runtime-v1`. The page's claim that they hold no progress or settings matches `sw.js` (precache list, runtime GETs). | `sw.js:15-17,19,28,30,54,63` |

## Checked and correct

- localStorage prefix `alef:`; the three exact-name keys (`alef.audioBannerSeen.v1` audio-access.js:82, `alef.storage-notice.v1` install-notice.js:6, `alef.scroll.v1` scroll-restore.js:11) match the page, and `alef.scroll.v1` is sessionStorage only (scroll-restore.js:27).
- No IndexedDB, cookies, BroadcastChannel, OPFS or WebSQL anywhere in `src/` (grep). The page's "no IndexedDB and no cookies" holds.
- Geolocation: single call, `navigator.geolocation.getCurrentPosition` on a button press (`src/shell/settings.view.js:89-91`), saved to settings lat/lon as the page says.
- Microphone: `getUserMedia({audio:true})` only in the recorder, started on button (`src/speak/recognizer.js:55,69`); recording kept as an object URL in memory. Not stored (see also `tests/credits.test.js:135-146`).
- Notifications: `requestPermission` (`src/shell/notify.js:83`, `src/curriculum/reminders.notify.js:25`). Push: `VAPID_PUBLIC_KEY = ""` (`src/shell/notify.js:18`), so `subscribePush` returns early (`:393`). Matches the page.
- Clipboard: one `navigator.clipboard.writeText`, Teacher screen (`src/teacher/teacher.view.js:70`). Matches.
- The Dicta CSP statement matches `_headers:18` (`connect-src` has no Dicta origin).
- All 51 listed keys were found in the code by the scan, and apart from findings 2 to 4 every key the scan found was already listed (script output kept in the scratch dir only).
- "Delete all my data" removes `alef.`/`alef:` localStorage keys (`src/shell/settings.data.js:47-51`). It does not clear the sessionStorage scroll entry; that ends with the tab.

## Why the existing test missed these

`tests/credits.test.js:120-127` only matches `const ...KEY... = '...'`. `service.prefs` is `const PREFS`, and `progress.milestones.v1` lives in a `KEYS` object map, and `__meta` is a differently named constant. The new test also checks literal store calls, the `KEYS` map, web-storage calls, `_headers` vs page wording, and cache names vs `sw.js`.

## Patch and test

- `01-privacy-view-rows.patch`: fixes finding 1, adds rows for 2, 3, 4, extends 5, adds camera (6) and cache names (7) bullets.
- `02-privacy-audit-test.patch`: new `tests/privacy.audit.test.js` (3 tests).
- In a scratch copy (`src`, `tests`, `sw.js`, `_headers`, `data/legal`, `docs/legal`): the new test fails 3/3 on the current `privacy.view.js` and passes 3/3 with the patch; with the patch, `tests/credits.test.js` plus the new file give 17 pass, 0 fail. Both patches pass `git apply --check` against the live tree and apply cleanly to a fresh scratch copy.

## Not verified

- Nothing was run in a real browser or on a device: no check of what the Scan "take photo" control actually opens, whether the scroll key really receives the search query at runtime, or what a deployed host really sends in headers. `_headers` was read as a file; Cloudflare behaviour and `dist/` (stale) were not checked.
- Keys built from dynamic strings (template or concatenated names) cannot be found by grep. The scan patterns skip `$`-templated names; I did not trace every call that passes a variable key (`wordtrace/flow.js:63-65`, `curriculum/dom.js:29-32`, `progress/store.js:71`; their callers use the constants listed).
- Only `src/` was scanned for storage use. `index.html`, `offline.html`, `assets/` and vendored OCR code were grep-checked for `alef:`/`alef.` literals only, not read in full.
- Whether the descriptions in the "What it holds" column fit every field in each stored object was not checked beyond the rows above.
- The full test suite was not run (`tools/` is about 595 MB and was not copied); only the two test files named above.
- Not legal advice or a compliance review.
