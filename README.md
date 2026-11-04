# ALEF

An interactive Hebrew course (web app + companion book) with two goals: read Torah and prayers aloud with a
congregation, and get around in Israel without sounding like an outsider. Zero-dependency static PWA: plain ES
modules, no build step, runs from any static file server.

**License: not chosen yet.** No license file exists; until one is added, all rights are reserved by default. Fonts,
images, audio and liturgical/Scripture texts each have their own provenance and licence notes (see lane docs).
A dated, source-by-source audit (what was verified, what was not, and the share-alike effect of the Wiktionary-derived vocabulary) is in [docs/legal/CONTENT-LICENCE-AUDIT.md](docs/legal/CONTENT-LICENCE-AUDIT.md); open decisions are in [docs/legal/DECISIONS-FOR-JOHN.md](docs/legal/DECISIONS-FOR-JOHN.md). Not legal advice; no lawyer has reviewed any of it.

## Run

Needs Node 22 (v22.23.4 was used for the checks in `docs/STATUS.md`). No install step.

```sh
node tools/serve.mjs 8080        # static server (zero dependencies); open http://localhost:8080/
node --test "tests/*.test.js"    # all tests (Node 22: `node --test tests/` fails on a directory, so give the glob)
node tools/smoke.mjs             # Chromium smoke test, screenshots to docs/screens/ (needs Playwright installed globally)
node tools/build-precache.mjs    # regenerate precache-manifest.js after adding files under src/ data/ assets/
```
The app is plain static files: any static server over HTTPS works, and `node tools/serve.mjs [port]` is the one in the repo (default 8080). `package.json` has scripts only (`npm test`, `npm run serve`); there is nothing to `npm install`.

## Status
Early draft; nothing is deployed, no learner has used it, and no native speaker, teacher or clergy member has reviewed any Hebrew. Measured counts (routes, lessons, vocabulary, audio, images, tests), the commands that produced them and the known gaps are in [docs/STATUS.md](docs/STATUS.md). What only the owner can do next is in [docs/NEXT-STEPS-JOHN.md](docs/NEXT-STEPS-JOHN.md). How ALEF compares with Duolingo Hebrew, feature by feature: [docs/strategy/DUOLINGO-100.md](docs/strategy/DUOLINGO-100.md).

Other lanes (curriculum, letters, pronunciation, audio, corpus, photo, book) are loaded lazily; a missing module shows a "Not available yet" card. Hosting: see [docs/DEPLOY.md](docs/DEPLOY.md) and [docs/deploy/CLOUDFLARE-PAGES.md](docs/deploy/CLOUDFLARE-PAGES.md).

## Structure
```
index.html manifest.webmanifest sw.js offline.html precache-manifest.js (generated)
src/app.js  src/store.js  src/shell/*   shell (router, settings, home, i18n, audio stub)
src/curriculum src/letters src/pronunciation src/audio src/corpus src/photo   lane modules (views export mount(root, ctx))
data/*  assets/*  tools/*  book/*  docs/*  tests/*
```
Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Build contract: [docs/CONTRACT.md](docs/CONTRACT.md).
