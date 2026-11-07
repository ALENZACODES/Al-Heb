# ALEF build contract (all lanes read this first)

Product: interactive Hebrew course (app + book), intro -> intermediate. Two goals: (1) read Torah/prayers aloud
with a congregation, (2) function in Israel without sounding like an outsider. Man + woman voices. Spec: ~/reports/Hebrew learning app research.md and notes in ~/research_notes/Hebrew learning app research/.

## Hard environment facts
- NO npm/pip installs (registries are blocked). Zero third-party dependencies. Plain ES modules (`.js`, JSDoc types), no build step, runs from any static server.
- Tests: Node built-in runner. `node --test tests/` from ~/alef. Each lane writes `tests/<lane>.*.test.js`. Tests must pass before you report.
- Python 3 + fontTools, Playwright(Chromium), rsvg-convert exist locally. Hebrew-capable local fonts: DejaVu, FreeSerif/FreeSans.
- No internet for packages; WebFetch/WebSearch work for reading docs. GitHub push is not possible this session.
- Only edit files inside YOUR lane's paths. Shared files (index.html, src/app.js, sw.js) belong to lane 8 only. If you need a change there, say so in your report.
- Never overstate: your final report must separate (a) built and tested, (b) built but untested, (c) not done / needs a human or credentials. Do not claim native-speaker validation, recordings, or generated images exist unless they do.

## Shared ids (use exactly these)
Letters (27): alef bet gimel dalet he vav zayin chet tet yod kaf lamed mem nun samekh ayin pe tsadi qof resh shin tav + finals kaf-final mem-final nun-final pe-final tsadi-final
Vowel/marks (15): kamatz patach tzere segol chirik cholam kubutz shuruk shva chataf-patach chataf-segol chataf-kamatz dagesh shin-dot sin-dot  (cholam covers male/chaser as variants; lane 3 decides data shape)
Traditions: `israeli` (default for Israel track), `sephardi`, `ashkenazi`. Setting `congregation` in {israeli, sephardi, ashkenazi} drives prayer audio/transliteration; American synagogue default = sephardi values.
Voices: `m` (man), `f` (woman). Narrator names Ari (m), Noa (f).
Scripts: `print`, `cursive`.
Audio file path convention: `audio/<voice>/<tradition>/<kind>/<id>.mp3` (kinds: letter, vowel, syllable, word, line, prayer). Lane 4 owns the manifest `data/audio/manifest.json`: array of {path, voice, tradition, kind, id, text (pointed Hebrew), ipa?, status: "missing"|"tts"|"recorded", source}.
Asset convention: `assets/img/<name>.png|svg` per docs in lane 7.

## Lane paths and exports (ES modules)
Every UI view module exports `mount(root: HTMLElement, ctx): () => void` (returns unmount). `ctx` = {settings, store, audio, route(path), t(key)} provided by lane 8's shell.
- Lane 1 curriculum+calendar: `src/curriculum/*`, `data/curriculum/*`. Exports `lessons` (array: {id, track:"read"|"israel", level, title, letters[], vowels[], words[], prayerLines[], goals}), `srs.js` (FSRS-style scheduler written from scratch: `newCard()`, `review(card, rating, now)`, `due(cards, now)`), `calendar.js` (Reform-observed holidays + Shabbat candle-lighting + morning/evening prompts; offline computation, see lane brief), views `src/curriculum/learn.view.js` and `src/curriculum/calendar.view.js`.
- Lane 2 letterforms+tracing: `src/letters/*`, `data/letters/*`. `letters.json` (27 records: {id, name, he, finalOf?, gematria, sound, print:{strokes:[{path (SVG d, 0..1000 box), median:[[x,y]...]}]}, cursive:{...}, confusableWith[]}); `trace.js` engine (`createTracer(canvasOrSvg, letter, script, opts)` -> events; `scoreStroke(median, userPoints, leniency)` pure + tested); keyboard trainer data (SI-1452 incl. AltGr niqqud); view `src/letters/trace.view.js`.
- Lane 3 vowels+pronunciation: `src/pronunciation/*`, `data/pronunciation/*`. `niqqud.json` (per sign: shape, codepoint, ipa per tradition, english approx, example), `transliterate.js` (`transliterate(pointedHebrew, {scheme:"siddur"|"academic", tradition})`), `shva.js` rules, `drills.json` (foreigner-marker drills, same-word-two-traditions pairs), view `src/pronunciation/sounds.view.js`.
- Lane 4 voices/audio: `src/audio/*`, `tools/audio/*`, `data/audio/*`. `player.js` (`createAudio({settings})` -> {play(kind,id), playSequence([...]), has(kind,id)} resolving manifest paths with fallback to Web Speech `speechSynthesis` he-IL when file missing and flagging it), recording-script generator, TTS provider adapters (Azure/Google/ElevenLabs REST, credentials via env, NOT run here), casting brief + contract docs in `docs/voices/`.
- Lane 5 corpus: `src/corpus/*`, `data/corpus/*`. `registry.json` (every displayed text: id, ref, he (pointed), source, license, attribution, english (PD only), status:"transcribed-needs-check"|"verified"), prayer roster, survival phrasebook (>= 150 phrases with he, transliteration placeholder fields, en), view `src/corpus/read.view.js` (prayer reader with highlighted letters; opener = Priestly Blessing Num 6:24-26).
- Lane 6 photo: `src/photo/*`, `data/photo/*`. Pure, testable pipeline: `order-lines.js` (RTL line ordering from OCR boxes), `match-prayer.js` (fuzzy match consonant skeleton against corpus), `syllabify.js` (Hebrew syllabifier for pointed text), `pipeline.js` (adapter interface for OCR/vowelizer/translate engines, with a mock engine for tests), view `src/photo/scan.view.js` (file input/camera -> pipeline -> letter + syllable breakdown -> audio -> English). Real OCR engine wiring is documented, not run. No online vowelizer in this build (removed 2026-11-07, fix #16).
- Lane 7 images+book: `tools/images/*`, `data/images/*`, `book/*`, `docs/book/*`. Machine-readable prompt groups (~200) derived from the image command doc (content is in the lane brief), SVG overlay templates, print-ready book HTML sources + build script producing a PDF with Chromium (Playwright), QR/URL map per letter page, KDP/Ingram specs doc.
- Lane 8 platform: `index.html`, `manifest.webmanifest`, `sw.js`, `src/app.js`, `src/shell/*`, `src/store.js`, `assets/*`, `.github/workflows/*`, `README.md`, `docs/ARCHITECTURE.md`. Hash router, settings (voice m/f, congregation, script), IndexedDB/localStorage store, offline service worker precaching, install prompt, accessibility, RTL handling, i18n helper, home screen linking all views. Capacitor wrap doc only.

## Quality bar
- Hebrew text always `dir="rtl" lang="he"`; pointed text verified by code points (U+0590-05FF).
- Data files are JSON validated by a test in your lane.
- Lane 8 owns the integration test (`tests/integration.test.js`) that imports every lane's data and checks shared ids exist.

## Round 2 addendum (2026-11-03 evening)
Network changed: npm, PyPI, YouTube pages, Google Fonts/github raw are now reachable (GitHub API/pushes are NOT: add_repo needed). Rules: the RUNTIME app stays zero-dependency static ES modules; dev/build/benchmark tooling may use pip/npm packages but only inside tools/ or your own lane dir, never in app code paths, and any install must be recorded in docs/TOOLING.md (name, version, licence). OFL fonts are in assets/fonts/ (see FONTS.md; Gveret Levin = cursive). Use `node --test` (no directory arg) to run tests. Run the whole suite before you finish; do not leave failing tests. Keep honesty rules: never claim native review, real audio, real images, or real-photo OCR accuracy that you did not measure.
