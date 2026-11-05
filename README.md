# ALEF

An interactive Hebrew course (web app plus a companion book) with two goals: read Torah and prayers aloud with a
congregation, and get around in Israel without sounding like an outsider. It is a zero-dependency static PWA: plain ES
modules, no build step, served by any static file server.

## Status

Early draft. The code runs and has unit tests; the lessons, vocabulary and other Hebrew content are drafts built by programs, the audio is a list of scripts with no recordings, and many tests have not been run on real devices. A directory full of drafts is not a finished course. Nothing is deployed, no learner has used it, and no native speaker, teacher or clergy member has reviewed any
Hebrew. Measured counts and known gaps are in [docs/STATUS.md](docs/STATUS.md).

What has been checked, and how: scripted walks in headless Chromium (plus Firefox and WebKit emulation for one cross-engine
run) at phone size, unit tests, and read-through content checks written by the repo itself. What has not: any real phone or
screen reader, any real recording (0 of 24,906 listed clips exist; sound is the browser's voice), any approved image (0 of
1,797), and any review of the Hebrew (0 of 3,718 rows in the review packs). Today's QA and content-check results are
summarised in [docs/STATUS.md](docs/STATUS.md); the step list for going live is
[docs/deploy/GO-LIVE-CHECKLIST.md](docs/deploy/GO-LIVE-CHECKLIST.md) (nothing on it has been done).

**v0 versus preview.** The app has 86 routes. 15 are tier `v0` (the baby-steps first release: welcome, home, first day, the
r01 to r10 lesson path and review, letters and atlas, progress, settings with backup/restore/delete, about, credits, privacy,
install, offline, search). The other 71 are tier `preview`: still reachable by direct link and search, but unreviewed, labelled
"Preview" and shown only in a collapsed group in the More sheet. The tier is the `tier` field on `ROUTES` in
`src/shell/router.js`; the list and the promotion bar (native review, tests, a real-phone check, meta scan) are in
[docs/v0/SCOPE.md](docs/v0/SCOPE.md). No route has met that bar yet, so "v0" means the intended first-release set, not a reviewed one.

**Letter memory chain (draft).** Each of the 27 letter forms has a picture that turns into the letter, a sound hook word (for example loch, hut, cup, mailbox, swim ring, shortcake, feather, nuts) and one example word, with a short story written for each of the three pronunciation settings. It shows as a memory card on the letter page (above the tracing box until the letter has been traced), as review practice cards, a poster, flashcards and a book section. Of the 28 pictures, 9 are installed for offline use and 19 load on demand. The letters tests pass in a run on 2026-11-04 (223 tests, 222 pass, 1 skipped); no native speaker, teacher or learner has reviewed it, and its pictures are self-rated. See [docs/letters/MEMORY-SYSTEM.md](docs/letters/MEMORY-SYSTEM.md) and [docs/review/MEMORY-CHAIN-AUDIT.md](docs/review/MEMORY-CHAIN-AUDIT.md).

## Run locally

Needs Node 22 (v22.23.4 was used). There is nothing to install.

```sh
node tools/serve.mjs 8080     # static server, default port 8080; also `npm run serve`
```

Then open http://localhost:8080/. (Checked on 2026-11-04: started on another port, `GET /` returned 200 `text/html` with
title "ALEF", then the server was stopped.)

## Tests

```sh
npm test               # unit tier: the fast tests in tests/*.test.js
npm run test:browser   # browser tier: launches a real browser, one file at a time, slow
npm run test:all       # both tiers
node tools/docs/linkcheck.mjs [--all]   # relative-link check for README and docs (see tests/docs.linkcheck.test.js)
```

The tiers are defined in `tools/test/tiers.mjs`. The browser tier needs Playwright installed (the repo has no dependency on it;
`tools/smoke.mjs` and the browser tests expect a global install). I did not run the full suites when writing this section; the
last measured result I know of is recorded, with its age, in [docs/STATUS.md](docs/STATUS.md). `node tools/meta/scan.mjs --text`
is the text scan the docs must pass.

Before publishing, `node tools/build-precache.mjs` regenerates `precache-manifest.js` (see [docs/DEPLOY.md](docs/DEPLOY.md)).

## Repo map

| Path | What is there |
|---|---|
| `index.html`, `manifest.webmanifest`, `sw.js`, `offline.html`, `precache-manifest.js` | PWA entry points; the precache manifest is generated |
| `src/` | App code: `app.js`, `store.js`, `shell/` (router, nav, settings, i18n) and lane modules (curriculum, letters, pronunciation, audio, corpus, photo, and more); views export `mount(root, ctx)` |
| `data/` | Lesson, vocabulary, corpus, audio-manifest, image, calendar and legal data (JSON/CSV) |
| `assets/` | Fonts, images, screenshots |
| `tools/` | Dev and QA scripts: `serve.mjs`, `smoke.mjs`, `test/`, `meta/`, `deploy/`, `docs/`, and per-lane tooling |
| `tests/` | `node --test` files (`*.test.js`) |
| `docs/` | All documentation; see below |
| `book/` | Companion book sources and build scripts (`build.mjs`, `make_print.mjs`); `book/out/` holds generated PDFs |
| `dist/` | Generated deploy build, git-ignored |

Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Build contract: [docs/CONTRACT.md](docs/CONTRACT.md).
Tooling notes: [docs/TOOLING.md](docs/TOOLING.md). Handoff: [docs/HANDOFF.md](docs/HANDOFF.md).
Hosting: [docs/DEPLOY.md](docs/DEPLOY.md) and [docs/deploy/CLOUDFLARE-PAGES.md](docs/deploy/CLOUDFLARE-PAGES.md).
There is no single docs index file; `docs/` has top-level files plus one folder per lane, many with their own `README.md`.

## Decisions needed

Decisions only the owner can make (15 items: licence, hosting account, recordings, images, reviewers and more) are in [docs/DECISIONS-NEEDED.md](docs/DECISIONS-NEEDED.md). Other next steps:
[docs/NEXT-STEPS-JOHN.md](docs/NEXT-STEPS-JOHN.md). Comparison with Duolingo Hebrew: [docs/strategy/DUOLINGO-100.md](docs/strategy/DUOLINGO-100.md).

## Licence

**Not chosen yet.** There is no `LICENSE` file, so by default all rights are reserved. Fonts, images, audio and
liturgical/Scripture texts each have their own provenance and licence terms. Options are compared in
[docs/legal/LICENCE-OPTIONS.md](docs/legal/LICENCE-OPTIONS.md); the dated source-by-source audit is
[docs/legal/CONTENT-LICENCE-AUDIT.md](docs/legal/CONTENT-LICENCE-AUDIT.md); the open questions are in
[docs/legal/DECISIONS-FOR-JOHN.md](docs/legal/DECISIONS-FOR-JOHN.md). Not legal advice; no lawyer has reviewed any of it.
