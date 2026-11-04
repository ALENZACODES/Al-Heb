# Learner data safety (store, backup, restore, delete, update)

All progress lives in localStorage under the prefix `alef:` via `src/store.js`. Keys are listed in `/privacy` (`STORE_KEYS`); the backup is prefix-based, so it also covers any key not on that list. Two direct keys exist outside the store (`alef.audioBannerSeen.v1`, `alef.storage-notice.v1`): UI flags, not backed up, removed by Delete all.

## Backup file
`{app:"alef", schema, exportedAt, count, checksum, data:{key:value}}`. The checksum (non-cryptographic) catches truncated or edited files; backups without one (older) are accepted. Restore: `store.previewImport()` validates and returns what would be added, replaced and removed (nothing is written); `store.importData()` re-validates, writes, and rolls back everything if any write fails (for example quota). A corrupt, newer-schema, oversized or badly keyed file is rejected whole.

## Schema and migrations
`SCHEMA_VERSION` (now 1) is stamped in `alef:__meta`. `migrations[i]` upgrades schema i+1 to i+2 over the whole data object; they run on stored data at start-up and on restored backups, all-or-nothing. Data stamped newer than the app is read as is, flagged (`status().newerSchema`) and never downgraded. Individual keys are opaque to the store; each module validates its own shapes on read.

## Storage failures
Blocked storage (private mode) or a failed write (quota) moves the store to memory with the data kept: `store.status()` = `{persistent, reason: unavailable|quota|error}`, `store.onStatus(fn)`, notice text in `settings.data.js`, banner via `mountStorageNotice` (started by `startUpdateBanner`). `store.retryPersistence()` moves memory data back once space exists.

## Two tabs
Reads hit localStorage every time (no per-tab cache). Writes are last-write-wins per key. Settings merge per field (a stale tab cannot overwrite another tab's different field). `storage` events from other tabs are re-emitted to `store.subscribe` listeners with `{external:true}`; settings reload on them. Modules that hold a whole object (SRS cards, progress) and write it back can still overwrite another tab's change to that same key: use `store.update(key, fn)` for those.

## Settings keys
`src/shell/settings.js` validates a fixed key list; unknown keys and bad values in the store are dropped on read.

| key | type | default | used by |
|---|---|---|---|
| voice | m, f | f | audio / speech choice |
| congregation | israeli, sephardi, ashkenazi | sephardi | transliteration and prayer pronunciation |
| israelTrack | boolean | false | Learn: adds the everyday-Israeli track |
| goal | read, israel, both | read | onboarding; default Learn track |
| onboarded | boolean | false | first-run screen done or skipped |
| browserVoiceAnyway | boolean | true | browser speech when it cannot match the tradition (labelled) |
| script | print, cursive | print | letter style |
| theme | auto, light, dark | auto | colour theme |
| lat, lon | number or null | null | candle-lighting location (opt-in) |
| writeGodAsGd | boolean | false | `names.uiEnglish(ctx, text)`: English titles and translation lines write "G-d" (Torah reader translation line, Morning title); Hebrew never changes |
| haptics | boolean | false | `exercises.session.js hapticsOn`: vibration on exercise feedback; never under reduced motion |
| soundEffects | boolean | false | `exercises.session.js soundOn`: sound on exercise feedback; needs `ctx.sfx.play` (no sound files ship yet) |
| showUnapprovedImages | boolean | false | Advanced: image resolver also returns unreviewed pictures (for reviewers) |

## Update flow
`src/shell/update.js`: a waiting worker shows a banner; nothing reloads unless the learner presses Reload, and not while `isBusyDefault()` (body `data-busy="true"` via `markBusy(true)`, or an unsent text answer) is true; the reload then happens after the exercise. Views must call `markBusy` for this to know about exercises. `sw.js` no longer calls skipWaiting on install: a new worker installs its cache and waits. It calls `skipWaiting()` only when it receives a `SKIP_WAITING` message, which `update.js` posts when the learner presses Reload now (and nothing is mid-exercise); the page then reloads on `controllerchange`. Without that press the new worker takes over when every ALEF tab is closed. `activate` still deletes old `alef-shell-*` caches and calls `clients.claim()`. Limits: an older worker without the message handler ignores the message, so the banner shows a "stalled" notice after 4 s asking the learner to close all tabs; the case where another tab pressed Reload (or a pre-change worker took over) shows a plain "reload" banner and lazily imported views may come from the newer cache until then. Only part of this is covered by `tests/settings.update.test.js` (fake service worker); no real browser update was observed for this document.
