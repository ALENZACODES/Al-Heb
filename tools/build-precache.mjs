import { pathToFileURL } from 'node:url';
// Generates precache-manifest.js (list of app-shell + data files and a content-hash version) for sw.js.
// Run: node tools/build-precache.mjs   (re-run whenever files under src/, data/, assets/ change)
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const INCLUDE_DIRS = ['src', 'assets', 'data'];
// Files bigger than this are runtime-cached (or not cached) instead of installed up front, so first install stays small.
export const MAX_FILE_BYTES = 2 * 1024 * 1024;
const SKIP = (rel) => (rel.startsWith('assets/img/') && !rel.startsWith('assets/img/rimon/web/')) || rel.startsWith('assets/images/') || rel.startsWith('data/images/sheets/') || rel.startsWith('assets/vendor/') /* OCR engine + language data: opt-in, runtime-cached */
  || rel.startsWith('assets/workbook/') /* printable PDFs (several MB): downloaded on demand */ || /\.pdf$/i.test(rel)
  || rel.startsWith('data/vocab/packs/') /* ~150 pack files: fetched when a pack is opened, then cached at runtime */ /* big, runtime-cached */ || rel.split('/').some((p) => p.startsWith('_') || p === 'node_modules')
  || rel.endsWith('.py') || rel.endsWith('.md') || (rel.startsWith('src/') && rel.endsWith('.mjs')) /* node build/dev scripts that live under src/ (data builders, tier splitter): run by hand, never loaded by the app */
  || /\.(mp3|wav|ogg|m4a|svg\.src|ttf|otf|txt)$/i.test(rel)  // original TTFs and licence texts are not precached; woff2 in assets/fonts/web/ is
  || rel.split('/').includes('tools')
  || (rel.startsWith('data/images/') && rel !== 'data/images/approvals.json' && rel !== 'data/images/word-cues.json' /* read live by the image resolver */) || rel === 'data/corpus/source-snapshot.json' || rel === 'data/audio/tts-prices.json'
  || rel.startsWith('data/tts/') /* respelling files for the offline TTS factory: build-time inputs, never fetched by the app */
  || /^data\/audio\/manifest-words-[a-z]+\.json$/.test(rel)
  || rel === 'data/curriculum/practical/gcloud-results.json' || rel.endsWith('/_gcloud-checkpoint.json'); /* lazy per-tradition word shards: fetched after first paint, runtime-cached by sw.js */ /* tts-prices: build-time cost plan input */ // build-time inputs, not fetched by the app
// ON-DEMAND (not installed up front): data that only preview routes read, plus the audio manifest (every clip is still "missing", so it
// buys nothing offline). sw.js already stale-while-revalidates every same-origin non-media GET into the runtime cache, so these files
// are cached the first time a learner opens the page that needs them, or all at once from "Use Aleph offline" -> Download everything
// (they are listed in precache-manifest.js as ALEF_ON_DEMAND; src/shell/offline.js ON_DEMAND_GROUPS names them for the learner).
// Source code under src/ is never deferred, EXCEPT lazy route modules the router loads with dynamic import():
// src/games/ (preview games) and src/books/ (little books). The service worker runtime-caches them on first
// view, so first install stays the v0 core only (fix #4: first-install precache under 4 MiB; #8 groups).
// Everything NOT listed here stays in the install.
// Letter memory pictures (assets/letters/morph/<id>.svg, 4 to 5 KB each, 28 files, about 125 KB): data/letters/memory-chain.json and the code stay installed (the card
// works from text alone); only the pictures of the letters a learner meets on day one are installed: the first-day on-ramp (shin, bet), the older
// first-ten preview (shin, lamed, vav, mem, he), lessons r01 to r03 (shin, bet, tav, lamed, final mem, vav) and alef (the first card the letters pages show). The other pictures (and sin.svg, which no
// view reads) are fetched the first time a letter page, the atlas or a review card shows them (sw.js caches them) or by "Download everything".
// tests/offline.test.js checks this list against data/firstday and data/curriculum/lessons.json.
export const FIRST_DAY_LETTERS = ['shin', 'bet', 'lamed', 'vav', 'mem', 'he', 'tav', 'mem-final', 'alef'];
const KEEP_DATA = new Set(['data/pronunciation/consonants.json', 'data/pronunciation/niqqud.json', 'data/calendar/locations.json', 'data/audio/equivalence.json',
  ...FIRST_DAY_LETTERS.map((id) => `assets/letters/morph/${id}.svg`)]);
const ON_DEMAND_PREFIXES = ['data/vocab/', 'data/roots/', 'data/knownwords/', 'data/nikkudfade/', 'data/gender/', 'data/pronunciation/', 'data/speak/', 'data/talk/', 'data/israel/', 'data/calendar/', 'data/festivals/', 'data/torahread/', 'data/corpus/torah/', 'data/typing/',
  'data/traditions/', 'data/trope-trainer/', 'data/listen/', 'data/grammar/', 'data/wordtrace/', 'data/corpus/reader/', 'data/corpus/trope/', 'data/curriculum/lessons-intermediate/', 'data/curriculum/practical/',
  'data/curriculum/practical-pages/', // Practical course outline and written pages: not read at first install
  'assets/screens/', 'assets/screenshots/', 'assets/letters/morph/',
  // Light WebP copies of Rimon's animated sheets and still sprite (originals stay as PNG under assets/img/rimon/ and are not listed).
  'assets/img/rimon/web/',
  // Large image sets: runtime-cached on first view (and listed for "Download everything"), never installed up front (fix #4 / R39).
  'assets/game-art/', 'assets/letter-cartoons/', 'assets/books/', 'assets/speak-hold/', 'assets/speak-candidates/',
  // Lazy preview-route code + book content + image indexes: fetched on first view, runtime-cached (fix #4; #8 groups).
  'src/games/', 'src/books/', 'data/books/', 'data/images/',
  // Camera Translator (preview route /camera): view code, word list and config are fetched when the screen first opens, runtime-cached.
  'src/camera/', 'data/camera/',
  // Game data (word bank, prefix deck, arcade lists, the laws) and arcade art (backdrops, cast and letter sprites): fetched when a game first opens, runtime-cached.
  'data/games/', 'assets/games/',
  // Preview-route view code (pronunciation styles, vocabulary browser): not v0, fetched on first view, runtime-cached.
  'src/traditions/', 'src/vocab/', 'src/wordtrace/', 'src/typing/',
  // Reform synagogues in Canada: the directory data, the view and 66 pictures (about 9 MB), fetched on first view, runtime-cached.
  'src/synagogues/', 'data/synagogues/', 'assets/synagogues/',
  // Follow the Service screen code: fetched when the screen first opens, runtime-cached (its service orders stay installed for the v0 offline contract).
  'src/service/',
  // Brain Lab: drill code and its two small lists, fetched when the Lab first opens, runtime-cached.
  'src/lab/', 'data/lab/',
  // Retention (streak freezes, XP, gems, hearts, practice league, reminders): loaded after first paint by boot-hooks.js armRetention, runtime-cached.
  'src/retention/',
  // Library: the article view and the articles, fetched when the Library first opens, runtime-cached.
  'src/library/', 'data/library/',
  // Star of David light: route code, style and stencil, fetched when #/light first opens.
  'src/light/', 'assets/light/',
  // Letter videos (about 70 KB each) and their list: streamed when watched, runtime-cached.
  'assets/videos/', 'data/videos/',
  // Ask the Torah answer bank (about 14 MB raw, 2.8 MB compressed, 32 answer files): fetched when #/ask opens, one answer file per question asked.
  'data/ask/'];
const ON_DEMAND_FILES = new Set([
  // Rimon's stills (src/app.js imports the stage after boot; it shows nothing until the pictures exist, and the pictures are fetched on demand too),
  // and two older Rimon modules no screen imports (kept for reference and their tests).
  'src/shell/rimon-stage.js', 'src/shell/rimon-triggers.js', 'src/shell/rimon-stills.generated.js', 'assets/css/rimon-stills.css',
  'src/shell/rimon-model.js', 'src/shell/mascot.js',
  'data/audio/manifest.json', 'data/audio/manifest-kind-word.json', 'data/audio/manifest-torah.json', 'data/audio/manifest-torah-he.json', 'src/shell/torah-he-index.js', 'data/curriculum/intermediate-index.json', 'data/curriculum/intermediate-image-slots.json', 'data/curriculum/class-track.json', 'data/curriculum/practical-units.json', 'data/curriculum/lesson-lexicon.json',
  // Word-builder bank (63 KB): fetched when the builder first opens, runtime-cached (keeps first install under 3.95 MiB after Hallel and festival Kiddush landed in the installed registry).
  'data/builder_words.json',
  // Non-v0 data (the integration test's must-install list is the v0 offline contract; these are fetched on first use, then runtime-cached).
  'data/audio/english-glosses.json',
  // Book 63's clip record (37 KB): no screen reads it (the reader plays the page files directly), so it stays out of the first install.
  'data/audio/manifest-book63.json',
  // Word Finder bank (51 KB): preview-game data, fetched when the game first opens, runtime-cached by sw.js (keeps first install under 3.95 MiB).
  'data/games/firstwords.json',
  // Awards gallery view: route code only (the router loads views lazily; its engine files stay installed), fetched when Awards first opens, runtime-cached by sw.js (keeps first install under 3.95 MiB after the 25-badge engine landed).
  'src/awards/gallery.view.js',
  // Preview routes Class track and Compare pronunciations: view code only, fetched on first view, runtime-cached (keeps first install under 3.95 MiB after the Torah verse index).
  'src/classtrack/classtrack.view.js', 'src/pronunciation/compare.view.js',
  // Certificate drawing and its embedded PDF font are dependencies of the
  // optional Awards gallery. Cache them on first gallery visit, preserving
  // the existing 3.95 MiB first-install target and its 0.05 MiB headroom.
  'src/awards/proof-font.js', 'src/awards/certificate.js', 'src/awards/icons.js',
  // Day page (preview route /day/<date>): its view and model are loaded lazily by the router when a day is opened, runtime-cached by sw.js; the markers module stays installed because the Calendar (v0) draws them. Morning screen view (optional route /morning): route code only, its verses/model files stay installed. Both moved here when the day pages landed (keeps first install under 3.95 MiB).
  'src/curriculum/day.view.js', 'src/curriculum/calendar.day.js', 'src/morning/morning.view.js',
  'src/curriculum/calendar.addpanel.js', 'src/curriculum/calendar.quickadd.js' /* calendar quick-add box: loaded when the Calendar opens */,
  // Intermediate lessons view (optional preview route /intermediate, 30 KB): route code only, loaded lazily on first open and runtime-cached; its adapter and data stay as they were.
  'src/curriculum/intermediate.view.js',
  // Israel units (preview route /israel-units): view, model and data are loaded on first open and runtime-cached.
  'src/curriculum/practical.view.js', 'src/curriculum/practical-progress.js', 'src/curriculum/practical-written.js',
  'src/curriculum/israel-units.view.js', 'src/curriculum/israel-units.js', 'data/curriculum/israel-units.json',
  // Learn map sub-screens: dynamically imported by learn.view.js when their query is opened; the map itself uses the slim lessons-index and stays installed.
  'src/curriculum/review.view.js', 'src/curriculum/loanwords.view.js', 'src/curriculum/spotit.view.js', 'src/curriculum/checkpoint.view.js', 'src/curriculum/dialogues.view.js', 'src/curriculum/ladder.view.js', 'src/curriculum/fade.view.js', 'src/curriculum/gender.view.js', 'src/curriculum/scaffold.view.js',
  // Speak screen engine (preview route /speak, 58 KB): imported only by speak.view.js, which the router loads lazily; fetched on first open and runtime-cached (keeps first install under 3.95 MiB after the tracing pointer fix).
  'src/speak/speak.js',
  // Talk screen (preview route /talk): route code and its on-device phrase engine, fetched on first open and runtime-cached (keeps first install under 3.95 MiB). Its sentence pairs are data/talk/.
  'src/talk/talk.view.js', 'src/talk/talk.model.js', 'src/talk/engine.js', 'src/talk/data.js', 'src/talk/speech.js',
  // Torah reader view: route code only (the router loads views lazily; its model/loader files stay installed), fetched when the reader first opens, runtime-cached by sw.js (keeps first install under 3.95 MiB after the full-Torah reader landed).
  'src/torahreader/torahreader.view.js',
  // Ask the Torah (#/ask): route code only, fetched on first open, runtime-cached (keeps first install under 3.95 MiB).
  'src/ask/ask.view.js', 'src/ask/model.js', 'src/ask/match.js',
  'data/corpus/prayer-meta.json', 'data/corpus/torah-service-guide.json', 'data/corpus/gaps.json',
  'data/curriculum/dialogues.json', 'data/curriculum/gender-pairs.json', 'data/curriculum/loanwords.json', 'data/curriculum/prompts.json', 'data/curriculum/word-vocab-map.json',
  'data/firstday/minute-one.json', 'data/firstday/buildable-words.json' /* word builder list (168 KB): preview route #/firstwin, fetched when it opens, runtime-cached */, 'data/homepage/prayers.json', 'data/morning-verses.json', 'data/torah-quotes.json',
  'data/letters/art-concept-map.json', 'data/letters/keyboard-si1452.json',
  // Game-music engine (~20 KB): imported only when Play music is first pressed (src/audio/music.js), then runtime-cached.
  'src/audio/synth-music.js',
  // Songs page and the celebration sting: loaded on first open / first lesson finished with music on, then runtime-cached.
  'src/listen/songs.view.js', 'src/audio/sting.js',
  // Optional 'Sound like a local' view (18 KB): loaded when #/israel first opens, runtime-cached.
  // Restores 0.05 MiB of first-install headroom after the Brain Lab warm-up landed on a tighter main.
  'src/israel/israel.view.js',
  // Calendar view (30 KB): loaded when #/calendar first opens, runtime-cached. Keeps first-install headroom for the overnight feedback layer.
  'src/curriculum/calendar.view.js',
  // Privacy screen (26 KB): loaded on first open, runtime-cached; offline group od-preview-pages.
  'src/shell/privacy.view.js',
  // English read-aloud helper (~4 KB): imported when "Hear ... in English" is first pressed, then runtime-cached.
  'src/shell/speak-english.js',
  // Preview-route view code only (their models and data stay as they were): the word builder (#/firstwin, its data was already on demand),
  // Sound like a local (#/israel) and Common phrases (#/phrases). Fetched on first open and runtime-cached; moved here when the
  // first-minute pass added the design tokens, the polish layer, the header stat bar and Rimon in the page (keeps first install under 3.95 MiB).
  'src/firstday/minuteone.view.js', 'src/israel/israel.view.js', 'src/phrases/phrases.view.js',
  // Scan a photo, Sounds and Word Sprint (preview routes): view code only, fetched on first open (keeps first install under 3.95 MiB with the launch branch).
  'src/photo/scan.view.js', 'src/pronunciation/sounds.view.js', 'src/sprint/sprint.view.js',
  // Cursive display font: only fetched when the cursive script setting is on (font-display: swap falls back otherwise).
  'assets/fonts/web/gveret-levin.woff2',
  // Star of David light stylesheet: loaded when #/light first opens, runtime-cached.
  'assets/css/light.css']);
export const isOnDemand = (rel) => !KEEP_DATA.has(rel) && (ON_DEMAND_FILES.has(rel) || /^data\/curriculum\/resource-concepts-/.test(rel) || ON_DEMAND_PREFIXES.some((p) => rel.startsWith(p)));
const DATA_ONLY_JSON = (rel) => !rel.startsWith('data/') || rel.endsWith('.json');

function walk(dir, out = [], root = repoRoot) {
  for (const n of readdirSync(dir).sort()) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out, root); else out.push(relative(root, p).split(sep).join('/'));
  }
  return out;
}

/** @param {string} [root] site root to scan (repo root by default; tools/build-static.mjs passes dist/) */
export function computeManifest(root = repoRoot) {
  const all = ['index.html', 'offline.html', 'manifest.webmanifest'];
  for (const d of INCLUDE_DIRS) { try { all.push(...walk(join(root, d), [], root).filter((r) => !SKIP(r) && DATA_ONLY_JSON(r) && statSync(join(root, r)).size <= MAX_FILE_BYTES)); } catch { /* dir missing */ } }
  const files = all.filter((f) => !isOnDemand(f)), onDemand = all.filter(isOnDemand);
  const hash = createHash('sha256'); // covers on-demand files too, so a change to them still raises the update banner as before
  for (const f of all) {
    hash.update(f);
    const bytes = readFileSync(join(root, f));
    // Git normalizes text to LF. Existing Windows checkouts can still contain
    // CRLF, so hash the committed text representation on every platform.
    // Binary assets must retain their exact bytes.
    hash.update(/\.(?:js|json|html|css|svg|webmanifest)$/i.test(f)
      ? bytes.toString('utf8').replace(/\r\n/g, '\n') : bytes);
  }
  return { files, onDemand, version: hash.digest('hex').slice(0, 12) };
}

/** Text of precache-manifest.js: ALEF_PRECACHE (installed by sw.js) and ALEF_ON_DEMAND (listed for the offline download card only). */
export function manifestText(m, by = 'tools/build-precache.mjs') {
  return `// GENERATED by ${by} - do not edit.\nself.ALEF_VERSION = ${JSON.stringify(m.version)};\nself.ALEF_PRECACHE = ${JSON.stringify(m.files, null, 1)};\nself.ALEF_ON_DEMAND = ${JSON.stringify(m.onDemand || [], null, 1)};\n`;
}

/** Writes src/shell/views.generated.js: every src/**\/*.view.js on disk, so the shell can hide routes whose view is not built yet. */
export function writeViewList(root = repoRoot) {
  const views = walk(join(root, 'src'), [], join(root, 'src')).filter((r) => r.endsWith('.view.js') && !r.startsWith('_'));
  writeFileSync(join(root, 'src/shell/views.generated.js'), `// GENERATED by tools/build-precache.mjs - do not edit. View modules present in this build (paths relative to src/).\nexport const VIEW_FILES = ${JSON.stringify(views)};\n`);
  return views;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  writeViewList();
  const m = computeManifest();
  const root = repoRoot;
  writeFileSync(join(root, 'precache-manifest.js'), manifestText(m));
  console.log(`precache-manifest.js: ${m.files.length} files installed, ${m.onDemand.length} on demand, version ${m.version}`);
}
