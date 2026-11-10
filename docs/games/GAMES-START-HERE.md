# GAMES — START HERE

**For the quarterback of the 25-game programme.** This branch carries the
programming start for the games programme: a shared engine and the first
two games, finished and playable, at their final repo paths. Your job:
integrate, verify, and run the waves from here.

## What is on this branch

| File | What it is |
|---|---|
| `src/games/engine.js` | Shared plumbing for every game: shuffle/pick helpers, tug-pull math, `createSession` (score, streak, stars, best-score store), `loadGameImages` (the image resolver, loaded exactly as `src/letters` loads it), `speak` (clip index + audio player, silent no-op when a clip is missing), and `resultsCard` (the standard end-of-game card). Pure logic has no DOM and is Node-testable. |
| `src/games/tugowar.view.js` | **Antonym Tug-of-War** (registry #23). 12 opposite pairs, rope with pull physics, 10 rounds, session scoring. Header art is the olive-tree pair picture. `PAIRS[].img` is the named slot for per-card pictures — fill it from the Opposites asset sets so every card carries its picture. |
| `src/games/vowelcatcher.view.js` | **Shooting Star Vowel Catcher** (registry #3). Falling niqqud stars, a movable consonant basket (pointer + arrow keys), the target syllable announced in text and audio, 12 targets per game, full cleanup on exit. |
| `assets/css/games.css` | Scoped styles for both games (`.game-*`, `.tug-*`, `.catcher-*`). |

The two games are **not yet wired into the app** — no router rows, no CSS
link. That wiring is step 1 below, deliberately left to you so the games
land under your control, on your schedule.

## Integration (about 15 minutes)

1. Router rows in `src/shell/router.js`, both `tier: 'preview'` until the
   verification gate below passes:
   - `{ name: 'tugowar', pattern: '/tugowar', module: '../games/tugowar.view.js', title: 'Antonym Tug-of-War', owner: 'games' }`
   - `{ name: 'vowelcatcher', pattern: '/vowelcatcher', module: '../games/vowelcatcher.view.js', title: 'Vowel Catcher', owner: 'games' }`
2. `<link rel="stylesheet" href="assets/css/games.css">` in `index.html`,
   after `learn.css`.
3. Re-run `node tools/build-precache.mjs` so the new files and the cache
   version roll properly.
4. Store keys the games use: `games.tugowar.v1`, `games.vowelcatcher.v1`
   (best score + play count, device-local, same pattern as other lanes).
5. Merge `main` into this branch before integrating — main may have moved
   since this branch was cut.

## Contracts the games rely on

- `mount(root, ctx)` with `ctx.settings`, `ctx.store`, `ctx.audio`,
  `ctx.fetchFn` — identical to the letter and lesson views.
- Images resolve through `engine.loadGameImages()` →
  `src/img/index.js`. If the resolver is unavailable the games run
  text-only **by design**; with it on, they get richer. That gap is the
  point of the programme: games are the surface that uses the library.
- Audio goes through `engine.speak()` → `src/audio/clip-index.js` +
  `ctx.audio.playClipFor`. Missing clips are a silent no-op.
- Both mounts return a cleanup function; the catcher's animation loop
  also stops itself when its stage leaves the document.

## First enrichment orders

1. **Tug-of-War pictures:** fill `PAIRS[].img` with real index ids
   (resolver kind `'id'`) from the Opposites I/II asset sets. Target:
   at least 10 of 12 pairs pictured.
2. **Catcher data:** swap the starter `LETTERS`/`MARKS` tables for
   loaders over `data/letters` and the pronunciation variants, keeping
   the exported names so nothing else changes.
3. Then open Wave 1 of the registry: Prefix Blast, Memory Palace,
   Pinball — each with its image sets named before any code is written.

## Verification gate (before either game leaves Preview)

- Plays start to finish with images on **and** with the resolver
  disabled, and with audio unavailable.
- No console errors; navigate away mid-game and confirm cleanup.
- **Identity Test:** the game cannot be won without the Hebrew skill it
  teaches — random tapping scores at chance over 3 full plays.
- Registry status flips only after an independent audit re-plays the
  game cold. Built is not verified.

## Standing rules on this branch

- Zero dependencies. ES modules, `h()`/`heSpan()` views, scoped CSS —
  house style only.
- Main is **frozen for a demo until Fri Nov 6, 2026, 2:00 PM ET**. This
  branch is where games live until the owner says otherwise.
- Characters and voices are frozen as they are. Build around them,
  never over them.
- Every game declares its skill, data sources, image sources and gate
  in the registry before it is built. No row, no build.
