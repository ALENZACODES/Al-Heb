# ALEF

An interactive Hebrew course (web app + companion book) with two goals: read Torah and prayers aloud with a
congregation, and get around in Israel without sounding like an outsider. Zero-dependency static PWA: plain ES
modules, no build step, runs from any static file server.

**License: not chosen yet.** No license file exists; until one is added, all rights are reserved by default. Fonts,
images, audio and liturgical/Scripture texts each have their own provenance and licence notes (see lane docs).

## Run

```sh
node tools/serve.mjs 8080        # open http://localhost:8080/
node --test                      # all tests (Node 22 note: `node --test tests/` fails on directories; use plain `node --test`)
node tools/smoke.mjs             # Chromium smoke test, screenshots to docs/screens/ (needs Playwright installed globally)
node tools/build-precache.mjs    # regenerate precache-manifest.js after adding files under src/ data/ assets/
```
No `npm install` is needed or possible here (registries blocked); `package.json` has scripts only.

## Status
Start with [current completion and release boundaries](docs/COMPLETION.md). The lane notes below are historical snapshots and include superseded gaps; they are retained as an implementation history.

See [docs/STATUS.md](docs/STATUS.md) for the latest honest per-route result. Summary of what is the app shell (lane 8):

| Area | State |
|---|---|
| Router, 11 routes + deep links (`#/letters/<id>`, `#/read/<textId>`) | built, unit-tested, smoke-tested |
| Settings (voice, congregation, Israel track, script, theme, location) + store + backup/restore | built, unit-tested; UI smoke-rendered only |
| Home screen (draft-opening placeholder, lesson/review hooks, quick links) | built; lesson/review hooks depend on lane 1 export shapes |
| Service worker offline | built; offline reload of the shell verified once in Chromium; not tested on iOS/Android |
| Install prompt | coded for Chromium; untested |
| Hebrew UI labels | machine-drafted, **need native review** |
| Opening prayer | **placeholder only**, pending clergy/educator review |
| Fonts | local system fonts only; OFL self-hosting not done (downloads blocked) |
| Capacitor wrap, store listings | documentation only ([docs/CAPACITOR.md](docs/CAPACITOR.md)) |
| Hosting | not deployed ([docs/DEPLOY.md](docs/DEPLOY.md)) |

Other lanes (curriculum, letters, pronunciation, audio, corpus, photo, book) are loaded lazily; a missing module shows a
"Not available yet" card.

## Structure
```
index.html manifest.webmanifest sw.js offline.html precache-manifest.js (generated)
src/app.js  src/store.js  src/shell/*   shell (router, settings, home, i18n, audio stub)
src/curriculum src/letters src/pronunciation src/audio src/corpus src/photo   lane modules (views export mount(root, ctx))
data/*  assets/*  tools/*  book/*  docs/*  tests/*
```
Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Build contract: [docs/CONTRACT.md](docs/CONTRACT.md).
