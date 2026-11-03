# ALEF status (lane 8 integration run, 2026-11-03)

Checked: `node --test` -> 242 pass, 0 fail (all lanes landed at the time, including lane 8's integration tests).
Browser smoke (`node tools/smoke.mjs`, Chromium, 390x844 @2x, screenshots in `docs/screens/`): no uncaught page errors,
no console errors, offline reload of the app shell succeeded once with the service worker.

| Route | Result | Notes |
|---|---|---|
| `#/` | real content (lane 8) | draft-opening placeholder, today's lesson from lane 1 ("Shin and Bet..."), quick links |
| `#/learn` | lane 1 view mounted | `?lesson=` query from home is NOT read by lane 1's view (not verified) |
| `#/letters`, `#/letters/alef` | lane 2 view mounted | view ignores `ctx.params.id` (always opens alef), so QR deep links do not select a letter yet: lane 2 must read `ctx.params.id` |
| `#/sounds` | lane 3 view mounted | |
| `#/read`, `#/read/<textId>` | lane 5 view mounted | reads `ctx.params.textId` |
| `#/scan` | lane 6 view mounted | no OCR engine wired (mock only) |
| `#/calendar` | lane 1 view mounted | |
| `#/settings`, `#/about` | real content (lane 8) | |
| `#/nope` | not-found card | |

Smoke "content" means a view mounted and rendered something without errors; it does not mean the content is correct.
Visually inspected screenshots: home, settings, learn (earlier), sounds (full page, tiny). Others were not individually reviewed.

Not verified: iOS/Android, install prompt, real recorded audio (none exists; the audio player falls back to speech synthesis),
screen-reader behaviour, keyboard-only walkthrough, CI workflow on GitHub, Hebrew UI label correctness.
