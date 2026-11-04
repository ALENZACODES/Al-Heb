# ALEF status (lane 8 integration run, round 3, 2026-11-04)

Checked: `node --test` -> 364 pass, 1 transient fail (the precache file-list test, which fails whenever any lane adds a file under src/, assets/ or data/ until `node tools/build-precache.mjs` is re-run; it passed after re-running).
Browser smoke (`node tools/smoke.mjs`, Chromium, 390x844 @2x, screenshots in `docs/screens/`): no uncaught page errors, offline reload of the app shell succeeded once with the service worker, first-run onboarding persisted voice/tradition/goal.
Screenshots actually viewed this round: home, welcome (onboarding), workbook. Others (including the three "not available yet" cards) were not viewed.

Routes are data-driven: `src/shell/router.js` ROUTES; routes flagged `optional` are hidden from nav/quick links unless their view file exists
(`src/shell/views.generated.js`, written by `node tools/build-precache.mjs`; re-run it after adding a view). A direct visit to a missing view shows the "not available yet" card.

| Route | Result | Notes |
|---|---|---|
| `#/` | real content (lane 8) | draft-opening placeholder, today's lesson from lane 1 ("Shin and Bet..."), quick links |
| `#/learn` | lane 1 view mounted | `?lesson=` query from home is NOT read by lane 1's view (not verified) |
| `#/letters`, `#/letters/alef` | lane 2 view mounted | view ignores `ctx.params.id` (always opens alef), so QR deep links do not select a letter yet: lane 2 must read `ctx.params.id` |
| `#/sounds` | lane 3 view mounted | |
| `#/read`, `#/read/<textId>` | lane 5 view mounted | reads `ctx.params.textId` |
| `#/scan` | lane 6 view mounted | no OCR engine wired (mock only) |
| `#/calendar` | lane 1 view mounted | |
| `#/workbook` | real content (lane 8) | lists the 4 PDFs from assets/workbook/manifest.json with print instructions; PDFs are not precached (download online); PDF print quality not checked by me |
| `#/letters/atlas`, `#/soundgap`, `#/vocab` | not available yet | registered, but src/letters/atlas.view.js, src/pronunciation/soundgap.view.js and src/vocab/vocab.view.js do not exist yet; they appear in the Home "Go to" tiles automatically once the file exists and the view list is regenerated |
| `#/settings`, `#/about` | real content (lane 8) | |
| `#/nope` | not-found card | |

Smoke "content" means a view mounted and rendered something without errors; it does not mean the content is correct.
Visually inspected screenshots: home, settings, learn (earlier), sounds (full page, tiny). Others were not individually reviewed.

Not verified: iOS/Android, install prompt, real recorded audio (none exists; the audio player falls back to speech synthesis),
screen-reader behaviour, keyboard-only walkthrough, CI workflow on GitHub, Hebrew UI label correctness.
