# ALEF code and layout map

Written by auditor M on 2026-11-04. Everything here was read from the tree or counted with `wc`/python on that date. Where a thing is only inferred, it says so. Counts move while about 12 other agents edit; re-measure before quoting.

## 1. Shape of the repo

Zero-dependency static PWA. ES modules, no bundler. `index.html` + `sw.js` + generated `precache-manifest.js` at the root; `src/` (code), `data/` (JSON, 62 MB), `assets/` (css, fonts, icons, letters/morph SVGs, vendor 4.9 MB), `tools/` (Node build/QA scripts), `tests/` (node:test), `docs/` (66 subfolders), `book/`, `dist/` (built output).

`package.json` scripts: `test` (unit), `test:browser`, `test:all`, `serve`, `smoke`, `precache`, `test:profile`.

## 2. Routing and tiers

- `src/app.js` (284 lines) boots store, settings, router, audio, nav. Route table lives in `src/shell/router.js` as `ROUTES` (not in app.js). Each entry: `name, pattern, module (relative to src/shell/), tier, title, owner, optional, group, quick, query, paramQuery, needs`.
- Tier rule (router.js line ~103): `for (const r of ROUTES) if (r.tier !== 'v0') r.tier = 'preview'`. So a route with no `tier` is preview. `tierOf`, `isPreview` exported.
- v0 routes in code (tier: 'v0'): home, learn, letters, atlas, letter, progress, firstday, install, credits, privacy, offline, settings, welcome, search, about. SCOPE doc (`docs/v0/SCOPE.md`) must match; `tests/v0.test.js` parses lines of the form "- `name` (/path)" and compares to code exactly. Adding a v0 route means editing both.
- 81 route entries in total (counted by importing ROUTES): 15 v0 and 66 preview. Everything else is preview: loanwords, spotit, checkpoint, dialogues, ladder, fade, gender, roles, scaffold, wordtrace, israel, traditions, classtrack, morning, timedread, share, service, firstday-ladder, placement, reminders, typing, festivals, listen, trope, tradition-quiz, read-my-way, rules, intermediate, grammar, compare, vocab-themes, speak, sprint, sounds, read, scan, calendar, how, workbook, vowelboard, niqquddial, dottile, syllablechips, torahread, torahreader, vocab, and so on.
- Lane 1 sub-screens (loanwords, spotit, checkpoint, dialogues, ladder, fade, gender, roles, scaffold) all share `module: '../curriculum/learn.view.js'`, which dispatches on `ctx.query` injected by `query`/`paramQuery`. A new curriculum sub-screen follows this pattern: a route entry with `query: {x:'1'}` plus `needs: 'curriculum/x.view.js'`, and a branch in learn.view.js. Other lanes use a direct view module.
- `src/shell/views.generated.js` lists view files present (`VIEW_FILES`); `availableRoutes` hides optional routes whose file is missing. It is generated, do not hand-edit. Nav model: `src/shell/nav-model.js` has a hard-coded list of route names (line 17), a second place to register a new route for menus.

## 3. Hand-written LOC (JS only, excluding `*.generated.js`, `node_modules`, `dist`, vendored, data)

| Area | Lines | Files |
|---|---|---|
| src/ total (incl. 1,047 lines of `.mjs` build helpers under src/*/tools) | 29,028 | |
| src/curriculum | 5,025 | 47 |
| src/shell | 3,404 | 42 |
| src/pronunciation | 2,897 | 24 |
| src/letters | 2,176 | 11 |
| src/photo (OCR scan) | 1,470 | 13 |
| src/speak | 1,400 | 8 |
| src/progress | 1,319 | 8 |
| src/traditions | 781 | 2 |
| src/wordtrace | 763 | 4 |
| src/corpus | 699 | 3 |
| src/vocab | 695 | 5 |
| src/torahread | 630 | 9 |
| src/torahreader | 547 | 3 |
| src/israel, grammar | 490, 484 | 3, 3 |
| other 15 dirs (firstday, typing, morning, sprint, teacher, onboarding, timedread, festivals, service, audio, classtrack, placement, trope, listen, home, img) | each 140 to 467 | |
| src/app.js + src/store.js | 571 | 2 |
| tests/ | 28,835 | 245 files |
| tools/ (excl. node_modules) | 21,828 | biggest: images 4,334; review 2,721; qa 2,696; vocab 1,676; audio 1,649; letters 1,610 |
| assets/css | 475 | 3 |
| sw.js + index.html | 112 | |

So product code is about 29K lines, tests about 29K, tooling about 22K: roughly 79K hand-written JS in total, about 37% of it product. Against the gameplan's "50 to 120K hand-written" the repo is already inside the band if tests and tools count, but product code is the lower quarter of it. Lines of code is not evidence of capability; see Focus.

## 4. Major modules (what each actually is)

- `src/store.js`: sync key/value over localStorage with prefix, canonical JSON backup, checksum, schema migrations, subscribe. Keys seen in code via `store.get/set`: `settings`, `curriculum.progress`, `pron.misses`, `notify.prefs`, `speak.v1` (STORE_KEY in speak/model.js), `onboarded`, `goal`, `voice`, `congregation`, and others. Convention: dotted or `name.vN` strings; no central registry that I found (not verified exhaustively).
- `src/shell/`: router, nav, settings, i18n, audio facade (`audio.js`, `audio-shards.js`, `audio-manifest.js`, stub), backup/persistence, scroll restore, ui helpers (`h`, `heSpan`), plus the v0 pages (home, onboarding, about, credits, privacy, install, offline, settings, search).
- `src/curriculum/`: lessons (`lessons.js`, `lesson.view.js`; data has 125 lessons, status "draft-needs-native-review"; 50 more files in lessons-intermediate), `srs.js` (FSRS-style, written from scratch, header says NOT reference FSRS, weights unfitted), exercises (`exercises.session.js`, `ex-ui.js`), review, streak, fade (cluster masking), ladder, spotit, scaffold, loanwords, dialogues, checkpoint, gender, calendar and reminders (the Jewish-calendar code sits in this folder too, a placement smell).
- `src/letters/`: trace.view (stroke tracing), atlas, memory.js/memorycard.js/memory.view.js (memory-chain cards, mnemonic), interference (look-alike), shapecheck, typing, progress. Assets in `assets/letters/morph/*.svg`.
- `src/pronunciation/`: three traditions (israeli, ashkenazi, sephardi as per data/audio manifests and `forTradition.js`, `transliterate.js`, `tradquiz`, `compare`, `convert`/`readmyway`), niqqud views (`vowelboard`, `niqquddial`, `dottile`, `syllablechips`, `rules`, `shva.js`, `kamatz-katan.js`, `syllables.js`).
- `src/trope/` (210 lines, trainer on `data/trope-trainer/levels.json`), `src/torahread/` and `src/torahreader/` (Torah reading, aliyot, pointing, trope view). Note the near-identical names torahread vs torahreader: two modules, one `optional` preview route each; a naming hazard.
- `src/corpus/`: reader over `data/corpus/*` (registry, phrasebook, reader/, trope/). Phrasebook entries carry m/f `forms`.
- `src/vocab/`: loader, model, view, themes view. Data `data/vocab/words.json` (6,303 entries) plus `packs/`, `themes/`.
- `src/speak/` (1,400 lines): "Say it". Uses the browser `SpeechRecognition` (he-IL), `normalizeHe`, Levenshtein `similarity`, `compare(target, heard)`, `CLOSE_SCORE = 0.7`, minimal pairs data, modes asr/record/self. This is transcript matching, not phoneme scoring, and the file header itself says recognizer quality for Hebrew was not measured.
- `src/audio/player.js` (247 lines) and shell audio: `data/audio/manifest.json` has 6,384 entries (the `summary.json` total says 24,906 across manifests), recorded 0, tts 0. Every clip is status "missing"; playback falls back to browser TTS.
- `src/grammar/` (484 lines): `model.js` builds plural-ending drills and root families from vocab; `data/grammar/notes.json`.
- `src/photo/`: camera/OCR scan. `src/progress/`: progress screen. Others are small preview features.

## 5. Data (data/ = 62 MB; large parts are generated or packs)

vocab 23 MB, images 15 MB, pronunciation 9.4 MB, audio 6.4 MB (manifests), photo 4.9 MB, curriculum 1.2 MB, corpus 0.6 MB, speak 0.4 MB, letters 0.4 MB. Schema tag on vocab: `alef-vocab/1`.

## 6. Build, precache and service worker

- `sw.js` (importScripts `precache-manifest.js`) is generated by `tools/build-precache.mjs`. Header comment in that tool: data read only by preview routes plus the audio manifest are ON-DEMAND, not installed up front; `src/` is never deferred (shared import graph); the rest stays in the install. Word-clip shards `data/audio/manifest-words-*.json` are stale-while-revalidate, not precached. Rule for new work: any new `src/` file lands in the precache automatically on the next precache build (which we do not run); new preview-only `data/` needs adding to the deferred list in build-precache.mjs or it enlarges the first install.
- `_headers` for hosting; `dist/` is build output (`tools/build-static.mjs`).

## 7. Tests and tools

245 test files under `tests/` (node:test; a11y, v0, sweep, srs, vocab.*, speak, gender, grammar and many more). `tools/test/run.mjs` runs unit or browser. `tools/meta/scan.mjs --text` is the vendor/author-name scan that must pass. Other tool folders: a11y, audio, corpus, curriculum, deploy, hebrew-lint, images, letters, lighthouse, ocr-bench, pronunciation, qa, record-kit, release, review, sensitivity, tts, vocab, youtube.

## 8. The four pillars against the code (verified facts only)

1. Nikkud fade. Exists: `src/curriculum/fade.js` masks a pointed line by letter cluster in 4 levels (full, alternate letters hidden, initials, blank). That is a MEMORY-recall fade, not a reading fade. Also `src/firstday/ladder.view.js` "Pointed to unpointed ladder" (preview) and `src/curriculum/scaffold` "Read without Latin". Vocab entries carry `he`, `heUnpointed`, `translit`. Gap: no per-learner schedule that moves text from fully pointed to ambiguous-only to hidden across the course; Settings has a `script` setting but I did not find it driving a staged fade. Tap-to-reveal per word: not verified.
2. Roots and binyanim. Data exists, code barely. In `words.json`: `root` set on 1,611 of 6,303 entries (997 distinct roots; only 501 of 1,820 verbs have a root); `binyan` on 1,817 entries (pa'al 618, pi'el 465, hif'il 306, hitpa'el 191, nif'al 115, pu'al 81, huf'al 39, hitpu'al 2). `forms` only has `plural`, `present`, `future`, `infinitive`, `feminine`; NO past tense, no person/number/gender conjugation tables for any verb (0 verbs with `past`). Code: `src/grammar/model.js` `rootFamilies()` groups words by root (families of 3 or more) for a grammar topic; nothing in vocab view, SRS or exercises uses `binyan`; no conjugator, no root-transform drill, no weak/hollow/guttural classes. Counts are far from the gameplan's 800 to 1,200 taught roots with tables.
3. Gender mechanic. Exists: `src/curriculum/gender.js` and `gender.view.js` (130 lines), data `gender-pairs.json` (16 pairs and 6 paradigms, "original sentences, unreviewed"; an earlier draft of this map said 22 from a grep count, which was wrong), routes `gender` and `roles` ("Say it as me", speaker/addressee m/f), phrasebook m/f forms, a reader select for masculine/feminine, noun gender on 3,063 nulls vs 2,126 m and 1,114 f in vocab. Gap: I found no learner-profile speaker gender that drives all content (the `roles` page picks per screen); no agreement-chain drills (noun, adjective, verb); no gender-tagged sentence templates; 16 pairs and 6 paradigms in total.
4. Scored speaking. Exists: transcript match via browser SpeechRecognition, minimal pairs data, record and self-rate modes. Gap: no recorded native models (0 recordings), no scoring beyond string similarity, no stress drills confirmed, no measure of recognizer accuracy on Hebrew.

## 9. Placement hazards for new work

- Do not add a bottom-nav entry or tier 'v0' route without editing `docs/v0/SCOPE.md` and passing `tests/v0.test.js`.
- New curriculum sub-screens: follow the learn.view.js dispatch pattern, add the name to `src/shell/nav-model.js`.
- New persisted state: a new store key with a `.v1` suffix and a coercer on read, as speak/model.js does (`coerceState`).
- New vocab-derived data: `tools/vocab/` generates it and `tests/vocab.schema.test.js` guards the schema; adding fields to `words.json` means updating the schema test and `data/vocab/index.json`.
- In-flight edit areas flagged by the coordinator: src/letters, src/curriculum, tests, assets/letters/morph, docs. Mtimes in this container are not reliable for ordering (several files show times later than the current clock), so check conflicts by reading before editing.

## 10. Added during the audit session (2026-11-04 afternoon) by the builder agent, all preview tier

- `src/nikkudfade/` (staged vowel-point fade, store `nikkudfade.v1`, route `nikkud-fade`), `src/roots/` (root families and binyan browser/quiz, `roots.v1`, route `roots`), `src/genderdrill/` (gender.v1, route `gender-drill`), `src/recordcompare/` (unscored A/B recording, `recordcompare.v1`, route `record-compare`), `src/hebrewtext/mixed.js` (language-marked Hebrew runs in mixed strings). Data: `data/nikkudfade/`, `data/roots/`, `data/gender/`; build scripts `tools/nikkudfade/`, `tools/roots/`, `tools/gender/`; tests `nikkudfade`, `roots`, `genderdrill`, `recordcompare`, `a11y.builder`.
- Registration points a new route must touch (verified from these additions): `src/shell/router.js` ROUTES, `src/shell/nav-model.js` (line 17 list), `src/shell/nav.strings.js`, `src/shell/privacy.view.js` store-key table (a test enforces it), `src/shell/offline.js` `GROUPS` (installed src) and `ON_DEMAND_GROUPS` (on-demand data), `tools/build-precache.mjs` `ON_DEMAND_PREFIXES`, and `docs/v0/SCOPE.md` only for v0 routes.
- Known open issues at that point: integration tests #28 and #30 need `node tools/build-precache.mjs` (not run, by rule); learner gender is stored in four places; `createRecorder` timer path in `src/speak/recognizer.js` appears to drop a take that hits `maxMs`.
