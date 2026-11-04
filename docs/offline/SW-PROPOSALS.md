# Proposed changes to sw.js (NOT applied; sw.js is not this lane's file)

Read from `sw.js` as of 2026-11-04. Each item says what to change, why, and what it costs.

## 1. Let the learner decide when an update takes over (waiting worker + SKIP_WAITING)
**Now:** `install` ends with `self.skipWaiting()` and `activate` deletes every `alef-shell-*` cache except the new one, then `clients.claim()`.
**Problem:** a tab opened on version A keeps running A's modules; the moment B activates, A's cache is deleted, so any module A imports lazily afterwards (route views are `import()`ed on navigation) is fetched from B or the network: a mixed-version page. Also the page gets a surprise `controllerchange`.
**Change:** remove `.then(() => self.skipWaiting())` from `install`; add
```js
self.addEventListener('message', (e) => { if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting(); });
```
**Effect:** B waits until every A tab is closed or the learner presses "Reload now" in the banner (`src/shell/update.js` posts `SKIP_WAITING` then reloads on `controllerchange`). Cost: a learner who never closes the app stays on A until they accept; with the banner that is by design. Also keep A's shell cache until B is active: that already holds because `activate` only runs after B takes over.

## 2. Cache lazy views with the shell version, not "runtime"
**Now:** in the generic handler, a request that misses the shell cache is stored in `alef-runtime-v1`, which is never versioned or pruned.
**Change:** name it `alef-runtime-${VERSION}` for same-origin `.js`/`.json`/`.html` (keep media in an unversioned cache so audio survives updates) and prune old ones in `activate` with the same `startsWith` loop.
**Why:** stale JS/JSON from version A can outlive A forever and be served by `caches.match` ahead of the network for B's SWR path. **Cost:** optional downloads (OCR, vocab packs, audio shard) are re-fetched after each release unless they stay in the unversioned cache; list them explicitly (see 3).

## 3. Put optional downloads in their own durable cache
**Now:** `assets/vendor/_tesseract/*` (about 5 MB), `data/vocab/packs/*` and the audio shards are cached on first use into `alef-runtime-v1` by the generic SWR; nothing records that the learner chose "Download everything".
**Change:** add `const OPTIONAL = 'alef-optional-v1'` and route these three patterns there (cache first for vendor, SWR for packs/shards), never pruned by `activate`.
**Why:** the "Use ALEF offline" card can then report these as one group and survive version bumps; 150 pack files (`data/vocab/packs/`) are only fetched when a pack opens, so the card currently warms only the four tier files.

## 4. `notificationclick` and `push` handlers
**Now:** none. Notifications from `showNow()` (src/shell/notify.js) do nothing when tapped.
**Change:** `notificationclick`: `event.notification.close(); event.waitUntil(clients.matchAll({type:'window'}).then(l => l[0] ? l[0].focus() : clients.openWindow(event.notification.data?.route || './')))`. `push` stays out until a push server exists (docs/deploy/NOTIFICATIONS.md section 4).
**Cost:** a few lines; `openWindow` needs the route relative to the scope.

## 5. Navigation fallback and offline.html
**Now:** navigation is network first and falls back to cached `index.html`, so offline deep links like `#/read/...` work only because the hash router runs client-side. A non-hash path would show `index.html` for any URL.
**Change:** none required; but add `navigationPreload` only if first-paint on slow networks matters (it adds a request per navigation and was not measured). Listed so nobody "fixes" the hash behaviour by accident.

## 6. Range requests for audio
**Now:** requests with a `Range` header bypass the worker (`if (req.headers.has('range')) return;`), so a clip played via `<audio>` on Safari, which always sends Range, is never served from the cache and fails offline.
**Change:** for cached full responses, build a 206 from the cached blob (`new Response(blob.slice(start, end+1), {status:206, headers:{'Content-Range': ...}})`). Only needed once audio clips exist; there are none today. **Unverified:** Safari's behaviour is from memory of WebKit's long-standing Range requirement, not re-tested.

## 7. Version visibility
Expose the version for the card: `self.addEventListener('message', ...)` can answer `{type:'VERSION'}` with `VERSION`. The card currently reads it from `precache-manifest.js` (fetched), which is the same value only while the worker and manifest are in sync.

## What these proposals do not fix
Storage eviction (iOS Safari may clear script-writable storage and caches after about 7 days without use unless the app is installed; this is from Apple's WebKit tracking-prevention notes, not re-verified here). The card's "Protect my progress" button and backups are the mitigation.
