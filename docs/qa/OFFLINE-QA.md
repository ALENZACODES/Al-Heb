# Offline, update and storage QA (scripted, Chromium)

Script: `node tools/qa/offline.mjs` (writes `/tmp/offlineqa/results.json`, two screenshots, and a temp copy of the site).
Last run: 81 of 81 checks passed, against precache version `5482c771dbe9` (527 precache entries), Google Chrome via Playwright, headless, desktop Linux.
This is scripted emulation. Nothing here was run on a phone, in Safari, or against a real host.

## How it was run
- The script copies only the files in `precache-manifest.js` (plus `sw.js`, the manifest itself, and the three `data/audio/manifest-words-*.json` shards) into a temp directory and serves that with `tools/serve.mjs`. The repo files are not modified.
- "A new version" was simulated by changing `ALEF_VERSION` in the temp copy's `precache-manifest.js` (to `qa-v2`) and calling `registration.update()`. A real release would also change other files; only the version string changed here.
- Offline is Playwright `context.setOffline(true)`, not an airplane-mode device.

## 1. Service worker update flow (observed)
- First visit: worker reached `active`; after one reload the page was controlled. Shell cache `alef-shell-<version>` held 527 of 527 listed entries.
- After the version change: the new worker installed and stayed `waiting`; the old worker stayed `activated` and kept controlling the page; both shell caches existed at that moment.
- The banner `#alef-update-banner` appeared with "A new version of ALEF is ready. Reload to use it; your progress is already saved." and the buttons "Reload now" and "Later".
- "Later" hid the banner without reloading. After a page reload (update still waiting) the banner appeared again.
- "Reload now": the page navigated, no worker was waiting afterwards, only `alef-shell-qa-v2` remained (old cache deleted), the banner was gone, the page was controlled again. This is the SKIP_WAITING path in `sw.js` (`message` handler) plus `controllerchange` in `src/shell/update.js`.
- Not tested: the busy-exercise guard (reload deferred while an exercise is in progress), the `stalled` state, a second update arriving while the first waits, multiple open tabs.

## 2. Offline first load of the v0 routes (observed)
Routes loaded offline in a fresh tab as `#/<route>`: `/`, `/learn`, `/letters`, `/letters/atlas`, `/letters/alef`, `/progress`, `/firstday`, `/install`, `/credits`, `/privacy`, `/offline`, `/settings`, `/welcome`, `/search`, `/about`. "Pass" means an `h1` rendered, no "Not available yet" / error card text, no uncaught page error.

- Scenario A (install finished and page controlled, then offline immediately, no further online page load): all 15 routes rendered. Every page logged one failed request, `data/audio/manifest-words-sephardi.json` (`net::ERR_FAILED`), and the sound line read "... (audio info unavailable offline)". Reason seen in the cache listing: the lazy word shard is not in the precache and was not yet in the runtime cache (the first page load of a fresh install is not controlled, so its shard fetch bypasses the worker).
- Scenario B (one more online page load under the worker, then offline): the shard was in `alef-runtime-v1`; all 15 routes rendered with 0 failed requests and no "audio info unavailable" text.
- A deep non-hash path (`/letters/alef`, not an app URL) returns the cached shell document offline (HTTP 200) but renders no `h1`; the same happens online, because `src/app.js` is loaded by a relative URL. Recorded as information, not judged.
- Mid-session note: one run during concurrent edits (precache regenerated while the script ran) showed `/` and `/welcome` offline with the title "Welcome: Not available yet". The next run on the regenerated manifest rendered them normally. I did not establish the cause of the first result.
- Not tested: audio playback offline, images, the other (non-v0) routes, Safari/iOS offline behaviour, a real offline cache size or eviction.

## 3. Storage persistence request (observed)
- `navigator.storage.persist()` was called exactly once per page load, triggered by the app's first non-settings save. On a fresh load the app itself writes the key `streak`, so the call happens during boot, before the learner has done anything. Console line: `storage persistence after first save of "streak": not granted (keep a backup file)`.
- Headless Chrome returned `false` (not granted). A granted case was not observed here.
- Later saves in the same page load did not call it again.

## 4. Backup, delete all, restore (observed)
Seeded keys `progress`, `srs`, `streak` plus settings (`congregation`, `theme`), then in Settings:
- "Download backup" produced `alef-backup-<date>.json` with app, checksum and data (4 keys).
- "Delete all my data" button stays disabled until `DELETE` is typed; afterwards no `alef*` localStorage keys remained and the cache list was empty (`["alef-shell-..."]` before, `[]` after).
- Restore showed a preview ("This backup was made on ... holds 4 saved items. 4 will be added ...") before changing anything. After "Replace my progress with this backup" the store export equalled the pre-delete export (same keys and values), and the data survived a reload.
- A truncated file was rejected ("Could not restore: Not valid JSON.") and a file with edited data was rejected ("The checksum does not match ..."); stored data unchanged in both cases.
- One earlier run recorded one cache still present after Delete all (before=1, after=1); I did not capture the cache names in that run and it did not recur in the two later runs. Possibly a worker write racing the delete; unconfirmed.
- Not tested: a large backup near `MAX_BACKUP_CHARS`, a backup from an older schema, restore with the service worker unregistered option.

## 5. localStorage corruption (observed)
For each case the app was loaded, the key was overwritten, then `#/`, `#/progress`, `#/settings`, `#/learn` were each loaded and reloaded. All rendered an `h1` with no uncaught page errors, and afterwards `store.exportData()` and a new `store.set` still worked:
- `alef:progress` = truncated JSON
- `alef:settings` = `not json`
- `alef:settings` = `[1,2,3]`
- `alef:srs` = `null` and `alef:__meta` = `}}}`
- `alef.storage-notice.v1` = `{oops`
- `alef:settings` = `{theme:{x:1}, congregation:42, lat:'abc', voice:[]}` (wrong-typed values)
Corrupt keys were skipped in the export (for example the corrupt `progress` did not appear in the exported keys). Whether the rendered screens then show sensible defaults was not checked beyond "an `h1` is present".

## 6. Install notice on an iOS-like UA (observed)
iPhone Safari user agent, touch, 375x667, desktop Chromium engine (so this checks the page's logic, not Safari):
- Not shown on the first visit; the record `alef.storage-notice.v1` was written.
- With the first-seen time set to two days earlier: an `aside` "Keep your progress" appeared with the text about Safari erasing saved data, a "How to add it" link to `#/install`, and a "Not now" button.
- "Not now" removed it and it stayed away after a reload.
- `#/install` on that UA listed Open in Safari, Share, Add to Home Screen, Add.
- Not shown with `navigator.standalone = true`, and not shown on a desktop Chromium UA five days after first visit.
- Not tested: real Safari, iPadOS desktop-mode UA, `display-mode: standalone` via media query, the 7-day eviction itself.

## Product diffs for the owners of those files
No product file was edited. Observations that may warrant a change, none verified beyond what is stated:
1. `sw.js` / `src/shell/audio-shards.js`: after a fresh install the learner's word shard is missing offline until one more online page load under the worker (scenario A). Option: have the page fetch the shard once the worker is active, or add the three shards to the precache (about 0.9 MB each per `src/shell/offline.js`). Not tried.
2. `src/app.js` (boot): the persistence request fires during boot because a `streak` write happens at load, so the browser is asked before any engagement. If the intent (comment in `src/app.js`) is "first real progress", that key may need excluding. Not tried.
