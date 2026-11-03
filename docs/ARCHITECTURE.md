# ALEF architecture (lane 8)

## Boot
`index.html` -> `src/app.js`: creates `settings` (over `store`), `audio` (lane 4 `createAudio({settings})` via dynamic
import; else `src/shell/audio-stub.js`, which speaks via `speechSynthesis` he-IL and exposes `flags: ['tts-fallback']`),
starts the hash router, registers `sw.js`.

## Router (`src/shell/router.js`)
Table `ROUTES` (name, pattern, lazy module path relative to `src/shell/`). `matchRoute(hash)` is pure and tested.
Routes: `/`, `/learn`, `/letters`, `/letters/:id` (QR deep link), `/sounds`, `/read`, `/read/:textId`, `/scan`, `/calendar`,
`/settings`, `/about`. Params must match `[\p{L}\p{N}_.-]{1,80}`. Views are imported lazily; an import failure renders a
"Not available yet" card, a throwing `mount` renders an error card. On every navigation the previous view is unmounted,
focus moves to `#view-title`/`h1`, the title is announced through a polite live region, and scroll resets.

## View contract
`export function mount(root, ctx): void | (() => void) | Promise<...>`. `ctx` = contract fields
`{settings, store, audio, route(path), t(key)}` plus extras added by the shell: `params`, `query`, `path`, `routeName`,
`installPrompt`. Views should read `ctx.params.id` (letters) / `ctx.params.textId` (reader) and give the main heading
`id="view-title" tabindex="-1"` so focus lands on it.

## Settings (`src/shell/settings.js`)
Keys: `voice` m|f (default **f**, arbitrary; both voices are first class), `congregation` israeli|sephardi|ashkenazi (default
**sephardi**, per the contract's American-synagogue default), `israelTrack` bool, `script` print|cursive, `theme`
auto|light|dark, `lat`/`lon` (null until the user opts in). Access: `settings.get(k)`, `settings.voice`, `settings.set(patch)`
(returns rejected keys), `settings.subscribe(fn)`.

## Store (`src/store.js`)
localStorage (prefix `alef:`), JSON values, in-memory fallback when storage is missing/denied/over quota (data kept in
memory, `store.persistent === false`). Schema version 1 with a `migrations[]` hook; `exportJSON()` / `importData()`
(`replace` or `merge`). Keys in use: `settings`, `progress.completed` (lesson ids), `srs.cards` (lane 1 cards; the home
screen calls lane 1 `due(cards, now)`). IndexedDB intentionally not used yet.

## Service worker
`tools/build-precache.mjs` writes `precache-manifest.js` (shell, `src/`, `assets/` minus `assets/img/`, `data/**/*.json`
minus `_`-prefixed dirs; content-hash version). `sw.js`: precache on install, delete old `alef-shell-*` caches on activate,
navigation network-first with cached `index.html` then `offline.html`, media (audio/images/fonts) cache-first filled at
runtime, other same-origin GETs stale-while-revalidate. Range requests bypass the cache, so audio that was never fully
fetched is not available offline; a pre-download of the audio set is not implemented.

## Lane hooks the home screen guesses
Lane 1: tries `src/curriculum/index.js` then `lessons.js` for `export const lessons`; `srs.js` `due`. If lane 1 ships a
different entry point, change `home.view.js` (one place).

## Accessibility and RTL
Skip link, `banner`/`nav`/`main` landmarks, focus management on route change, 48px targets, visible `:focus-visible`,
`prefers-reduced-motion`, `forced-colors`, dark mode (device or manual), logical CSS properties. Hebrew text is always
`lang="he" dir="rtl"` (`heSpan` helper), with `unicode-bidi: isolate`.

## Fonts
Stack is local only (Ezra SIL / SBL Hebrew if installed, FreeSerif, DejaVu Sans). Plan once downloads are possible:
self-host OFL FiraGO (UI), Ezra SIL (pointed prayer text), Gveret Levin (cursive) under `assets/fonts/`, add `@font-face`
in `assets/css/app.css`, record licences. Not done. Avoid Rubik/Noto Sans for pointed text.

## i18n
`t(key, vars)` English; `tHe(key)` Hebrew nav labels, **machine-drafted and flagged for native review**
(`HEBREW_REVIEW_NEEDED`).
