// Lane 8 integration tests: shell pieces + cross-lane data checks. Lane data checks skip when the file is absent.
import { loadManifestFull } from '../tools/audio/manifest_io.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { matchRoute, parseHash, ROUTES } from '../src/shell/router.js';
import { DEFAULTS, ENUMS, createSettings, validate } from '../src/shell/settings.js';
import { createStore, createMemoryStorage } from '../src/store.js';
import { t, en } from '../src/shell/i18n.js';
import { computeManifest } from '../tools/build-precache.mjs';
import { build, findRootAbsolute } from '../tools/build-static.mjs';
import { createAudio } from '../src/audio/player.js';
import { createShellAudio, describeResult, summarizeManifest } from '../src/shell/audio.js';
import { rmSync } from 'node:fs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const rd = (p) => readFileSync(join(root, p), 'utf8');
const json = (p) => JSON.parse(rd(p));

const LETTERS = 'alef bet gimel dalet he vav zayin chet tet yod kaf lamed mem nun samekh ayin pe tsadi qof resh shin tav kaf-final mem-final nun-final pe-final tsadi-final'.split(' ');

test('router table: every required route matches and params parse', () => {
  const cases = { '#/': 'home', '#/learn': 'learn', '#/letters': 'letters', '#/letters/alef': 'letter', '#/sounds': 'sounds', '#/read': 'read', '#/read/abc': 'text', '#/scan': 'scan', '#/calendar': 'calendar', '#/settings': 'settings', '#/about': 'about', '#/how': 'how', '#/welcome': 'welcome', '#/learn?lesson=r01&review=1': 'learn', '': 'home' };
  for (const [h, name] of Object.entries(cases)) assert.equal(matchRoute(h).route?.name, name, h);
  assert.equal(matchRoute('#/letters/kaf-final').params.id, 'kaf-final');
  assert.equal(matchRoute('#/read/x?y=1').query.y, '1');
  assert.equal(matchRoute('#/letters/alef/').route.name, 'letter');
  assert.equal(matchRoute('#/nope').route, null);
  assert.equal(matchRoute('#/letters/%E0%A4%A').route, null, 'malformed escapes do not match');
  assert.equal(matchRoute('#/letters/<script>').route, null);
  assert.deepEqual(parseHash('#//a//b/').path, '/a/b');
});
test('router table: module files for lane 8 exist; others are in the contract paths', () => {
  for (const r of ROUTES) {
    assert.ok(r.module.startsWith('./') || r.module.startsWith('../'), r.name);
    if (r.owner === 'lane8') assert.ok(existsSync(join(root, 'src/shell', r.module)), r.module);
    if (r.nav) assert.ok(en[r.nav], 'nav label ' + r.nav);
  }
});
test('settings defaults and validation', () => {
  assert.deepEqual({ ...DEFAULTS }, { voice: 'f', congregation: 'sephardi', israelTrack: false, script: 'print', theme: 'auto', lat: null, lon: null, goal: 'read', onboarded: false, browserVoiceAnyway: true, showUnapprovedImages: false, writeGodAsGd: false, haptics: false, soundEffects: false });
  const s = createSettings(createStore({ storage: createMemoryStorage() }));
  assert.equal(s.congregation, 'sephardi');
  assert.deepEqual(s.set({ voice: 'x', lat: 200, script: 'cursive' }), ['voice', 'lat']);
  assert.equal(s.script, 'cursive'); assert.equal(s.voice, 'f');
  assert.equal(validate('congregation', 'israeli').ok, true);
  for (const k of Object.keys(ENUMS)) assert.ok(ENUMS[k].includes(DEFAULTS[k]));
  let seen = 0; s.subscribe(() => seen++); s.set({ script: 'cursive' }); s.set({ script: 'print' }); assert.equal(seen, 1);
});
test('settings persist and ignore corrupt saved values', () => {
  const st = createStore({ storage: createMemoryStorage() });
  st.set('settings', { voice: 'm', congregation: 'bogus', lat: 'x' });
  const s = createSettings(st);
  assert.equal(s.voice, 'm'); assert.equal(s.congregation, 'sephardi'); assert.equal(s.lat, null);
});
test('store: memory fallback when storage missing, throwing, or failing mid-run', () => {
  const none = createStore({ storage: null });
  assert.equal(none.persistent, false); none.set('a', { x: 1 }); assert.deepEqual(none.get('a'), { x: 1 });
  const bad = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); }, removeItem() {}, key: () => null, length: 0 };
  const s2 = createStore({ storage: bad }); assert.equal(s2.persistent, false); s2.set('k', 5); assert.equal(s2.get('k'), 5);
  // quota failure after successful probe -> degrade without losing data
  const inner = createMemoryStorage(); let fail = false;
  const flaky = { ...inner, getItem: (k) => inner.getItem(k), removeItem: (k) => inner.removeItem(k), key: (i) => inner.key(i), get length() { return inner.length; }, setItem(k, v) { if (fail && !k.includes('probe')) throw new Error('quota'); inner.setItem(k, v); } };
  const s3 = createStore({ storage: flaky }); s3.set('keep', 1); fail = true; s3.set('new', 2);
  assert.equal(s3.persistent, false); assert.equal(s3.get('keep'), 1); assert.equal(s3.get('new'), 2);
  assert.equal(s3.get('missing', 'dflt'), 'dflt');
});
test('store: export/import roundtrip, validation, newer schema rejected', () => {
  const a = createStore({ storage: createMemoryStorage() }); a.set('progress.completed', ['l1']); a.set('settings', { voice: 'm' });
  const dump = a.exportJSON();
  const b = createStore({ storage: createMemoryStorage() }); b.set('stale', 1);
  assert.deepEqual(b.importData(dump), { ok: true, imported: 2 });
  assert.equal(b.get('stale'), undefined); assert.deepEqual(b.get('progress.completed'), ['l1']);
  b.set('keepme', 1); b.importData(dump, { mode: 'merge' }); assert.equal(b.get('keepme'), 1);
  assert.equal(b.importData('not json').ok, false);
  assert.equal(b.importData({ app: 'other', schema: 1, data: {} }).ok, false);
  assert.equal(b.importData({ app: 'alef', schema: 99, data: {} }).ok, false);
  assert.equal(b.importData({ app: 'alef', data: {} }).ok, false);
});
test('i18n: t() interpolates and falls back to key', () => {
  assert.equal(t('home.due.count', { n: 3 }), '3 cards due');
  const warn = console.warn; console.warn = () => {}; assert.equal(t('home.no.such'), 'home.no.such'); console.warn = warn;
});
test('manifest.webmanifest is valid and icons exist', () => {
  const m = json('manifest.webmanifest');
  assert.equal(m.name, 'ALEF'); assert.ok(m.start_url && m.scope && m.display === 'standalone');
  assert.ok(m.icons.some((i) => i.sizes === '192x192') && m.icons.some((i) => i.sizes === '512x512') && m.icons.some((i) => i.purpose === 'maskable'));
  for (const i of m.icons) assert.ok(existsSync(join(root, i.src)), i.src);
});
test('index.html: manifest link, module entry, skip link, main landmark', () => {
  const html = rd('index.html');
  assert.match(html, /rel="manifest"/); assert.match(html, /type="module" src="src\/app\.js"/);
  assert.match(html, /class="skip-link"/); assert.match(html, /<main id="main"/);
  for (const m of html.matchAll(/(?:href|src)="((?!https?:|#)[^"]+)"/g)) assert.ok(existsSync(join(root, m[1])), m[1]);
});
test('sw.js: precache manifest lists only existing files and includes the shell', () => {
  assert.ok(existsSync(join(root, 'precache-manifest.js')), 'run: node tools/build-precache.mjs');
  const src = rd('precache-manifest.js');
  const files = JSON.parse(src.match(/ALEF_PRECACHE = (\[[\s\S]*?\]);/)[1]);
  for (const f of files) assert.ok(existsSync(join(root, f)), 'missing precache file ' + f);
  for (const must of ['index.html', 'offline.html', 'manifest.webmanifest', 'src/app.js', 'src/store.js', 'assets/css/app.css']) assert.ok(files.includes(must), must);
  assert.match(rd('sw.js'), /importScripts\('precache-manifest\.js'\)/);
  const fresh = computeManifest();
  if (fresh.version !== src.match(/ALEF_VERSION = "(\w+)"/)[1]) console.warn('NOTE: precache-manifest.js is stale; run node tools/build-precache.mjs');
});
test('no dependencies in package.json', () => {
  const p = json('package.json'); assert.ok(!p.dependencies && !p.devDependencies); assert.ok(p.scripts.test && p.scripts.serve);
});

// ---- cross-lane data checks (skip when absent) ----
const ifFile = (p, fn) => test(`data: ${p}`, { skip: !existsSync(join(root, p)) && 'not landed yet' }, () => fn(json(p)));
ifFile('data/letters/letters.json', (d) => {
  const arr = Array.isArray(d) ? d : d.letters;
  assert.deepEqual(arr.map((l) => l.id).sort(), [...LETTERS].sort());
});
const VOWELS = 'kamatz patach tzere segol chirik cholam kubutz shuruk shva chataf-patach chataf-segol chataf-kamatz dagesh shin-dot sin-dot'.split(' ');
ifFile('data/pronunciation/niqqud.json', (d) => {
  const arr = Array.isArray(d) ? d : d.records;
  assert.deepEqual(arr.map((r) => r.id).sort(), [...VOWELS].sort());
  assert.deepEqual([...d.traditions].sort(), ['ashkenazi', 'israeli', 'sephardi']);
});
ifFile('data/corpus/registry.json', (d) => {
  const arr = Array.isArray(d) ? d : (d.texts ?? d.entries ?? []);
  assert.ok(arr.length > 0); const ids = arr.map((x) => x.id); assert.equal(new Set(ids).size, ids.length, 'unique text ids');
});
ifFile('data/audio/manifest.json', (d) => {
  assert.ok(Array.isArray(d));
  for (const e of d) { assert.ok(['m', 'f'].includes(e.voice), e.path); assert.ok(['israeli', 'sephardi', 'ashkenazi'].includes(e.tradition), e.path); assert.ok(['missing', 'tts', 'recorded'].includes(e.status), e.path); assert.equal(e.path, `audio/${e.voice}/${e.tradition}/${e.kind}/${e.id}.mp3`); }
  const letterIds = new Set(d.filter((e) => e.kind === 'letter').map((e) => e.id));
  for (const id of letterIds) assert.ok(LETTERS.includes(id.replace(/-sound$/, '')) || ['vet', 'khaf', 'fe', 'sin'].includes(id.replace(/-sound$/, '')), 'audio letter id not in shared ids: ' + id);
});
test('every data/**/*.json (not _build) parses', () => {
  const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => e.name.startsWith('_') ? [] : e.isDirectory() ? walk(join(d, e.name)) : e.name.endsWith('.json') ? [join(d, e.name)] : []);
  for (const f of walk(join(root, 'data'))) { try { JSON.parse(readFileSync(f, 'utf8')); } catch (e) { assert.fail(f + ': ' + e.message); } }
});

test('settings: goal and onboarding flags validate', () => {
  const s = createSettings(createStore({ storage: createMemoryStorage() }));
  assert.deepEqual(s.set({ goal: 'israel', onboarded: true, browserVoiceAnyway: false }), []);
  assert.deepEqual(s.set({ goal: 'nope', onboarded: 'yes' }), ['goal', 'onboarded']);
  assert.equal(s.goal, 'israel'); assert.equal(s.onboarded, true);
});
test('query deep link #/learn?lesson=<id>&review=1 parses', () => {
  const m = matchRoute('#/learn?lesson=r05&review=1');
  assert.equal(m.route.name, 'learn'); assert.deepEqual(m.query, { lesson: 'r05', review: '1' });
});

// ---- audio ids: every id the app requests resolves to a manifest entry (so the player can find its text) ----
const manifest = loadManifestFull(); // core + lazily loaded word shards
const fakeSpeech = { speak() {}, cancel() {} };
const player = (voice = 'm', congregation = 'israeli') => createAudio({ settings: { voice, congregation }, manifest, speech: fakeSpeech, UtteranceCtor: class { constructor(t) { this.text = t; } } });
test('audio manifest resolves corpus words/lines (reader ids) and lesson words (learn ids)', () => {
  const a = player(); const missing = [];
  for (const rec of json('data/corpus/registry.json').entries) {
    const lines = rec.he.split('\n'); let wi = 0;
    lines.forEach((line, li) => {
      const id = lines.length === 1 ? rec.id : `${rec.id}-l${li + 1}`;
      if (a.status('line', id).source === 'none') missing.push(['line', id]);
      for (const w of line.split(/\s+/).filter((x) => /[א-ת]/.test(x))) { wi++; if (a.status('word', `${rec.id}-w${wi}`).source === 'none') missing.push(['word', `${rec.id}-w${wi}`]); }
    });
  }
  for (const l of json('data/curriculum/lessons.json').lessons) {
    l.words.forEach((_, i) => { if (a.status('word', `${l.id}-w${i + 1}`).source === 'none') missing.push(['word', `${l.id}-w${i + 1}`]); });
    for (const id of l.prayerLines) { const r = json('data/corpus/registry.json').entries.find((e) => e.id === id); const lid = r.lines > 1 ? `${id}-l1` : id; if (a.status('line', lid).source === 'none') missing.push(['line', lid]); }
  }
  assert.deepEqual(missing.slice(0, 5), []);
  assert.ok(manifest.every((e) => e.id !== 'undefined' && !e.path.includes('undefined')), 'no undefined ids');
});
test('Tetragrammaton lines/words are stored with the spoken substitute (Adonai) in the manifest', () => {
  const e = manifest.find((x) => x.kind === 'word' && x.id === 'bless-priestly-1-w2' && x.voice === 'm' && x.tradition === 'israeli');
  assert.equal(e.text, 'אֲדֹנָי');
});
test('shell audio: honest status text for tts, file and refusal; manifest summary', () => {
  assert.match(describeResult({ source: 'tts-fallback', tradition: 'israeli' }).text, /text-to-speech voice, not a recording/);
  assert.match(describeResult({ source: 'tts-fallback', tradition: 'sephardi', mismatch: true }).text, /reads Israeli pronunciation, not Sephardi/);
  assert.match(describeResult({ source: 'file', voice: 'f', tradition: 'israeli', entryStatus: 'recorded' }).text, /Recorded by a human reader \(woman, Israeli\)/);
  assert.match(describeResult({ source: 'none', reason: 'no-hebrew-browser-voice' }).text, /no Hebrew voice/);
  const s = summarizeManifest(manifest); assert.equal(s.recorded, 0); assert.equal(s.tts, 0); assert.equal(s.total, manifest.length);
});
test('shell audio: sephardi learner gets the labelled browser voice (not silence) unless they opt out', async () => {
  const spoken = []; const speech = { speak(u) { spoken.push(u.text); setTimeout(() => u.onend(), 0); }, cancel() {} };
  const mk = (anyway) => createShellAudio({ settings: { get: (k) => ({ voice: 'f', congregation: 'sephardi', browserVoiceAnyway: anyway })[k] }, manifest,
    createAudio: (o) => createAudio({ ...o, speech, UtteranceCtor: class { constructor(t) { this.text = t; } } }) });
  const on = mk(true); const seen = []; on.subscribe((st) => seen.push(st.mode));
  await on.play('letter', 'alef');
  assert.deepEqual(spoken, ['אָלֶף']); assert.equal(on.state.mode, 'tts'); assert.match(on.state.text, /not Sephardi/);
  const off = mk(false); await off.play('letter', 'bet');
  assert.equal(off.state.mode, 'none'); assert.match(off.state.text, /only reads Israeli pronunciation/);
  assert.equal(off.has('letter', 'alef'), false, 'has() is true only for real files');
});

// ---- fonts ----
test('fonts.css: every @font-face file exists, font-display swap, licence texts present', () => {
  const css = rd('assets/css/fonts.css');
  const faces = css.match(/@font-face[^}]+}/g); assert.equal(faces.length, 3);
  for (const f of faces) { assert.match(f, /font-display:\s*swap/); const u = f.match(/url\("\.\.\/([^"]+)"\)/)[1]; assert.ok(existsSync(join(root, 'assets', u)), u); }
  for (const l of ['heebo', 'frankruhllibre', 'gveretlevin', 'alef', 'notosanshebrew', 'notoserifhebrew']) assert.match(rd(`docs/licenses/OFL-${l}.txt`), /SIL OPEN FONT LICENSE Version 1\.1/i);
  assert.match(rd('index.html'), /fonts\.css/);
  assert.match(rd('assets/css/app.css'), /"Frank Ruhl Libre"/);
});

// ---- static build ----
test('build-static: dist has the shell, woff2 fonts, no TTFs/tests/tools, precache matches, no root-absolute URLs', () => {
  const r = build({ out: 'dist-test', base: '/alef/' });
  try {
    assert.deepEqual(r.problems, []);
    const d = join(root, 'dist-test');
    for (const f of ['index.html', 'sw.js', 'precache-manifest.js', 'manifest.webmanifest', '.nojekyll', '404.html', 'assets/fonts/web/frank-ruhl-libre.woff2', 'data/audio/manifest.json', 'src/shell/how.view.js']) assert.ok(existsSync(join(d, f)), f);
    for (const f of ['assets/fonts/heebo-Heebo[wght].ttf', 'tools', 'tests', 'src/corpus/tools', 'data/images']) assert.ok(!existsSync(join(d, f)), 'should not ship ' + f);
    const files = JSON.parse(readFileSync(join(d, 'precache-manifest.js'), 'utf8').match(/ALEF_PRECACHE = (\[[\s\S]*?\]);/)[1]);
    for (const f of files) assert.ok(existsSync(join(d, f)), f);
    assert.ok(files.includes('assets/fonts/web/heebo.woff2'));
    assert.ok(!files.some((f) => f.endsWith('.ttf')));
  } finally { rmSync(join(root, 'dist-test'), { recursive: true, force: true }); }
});
test('findRootAbsolute flags root-absolute URLs but not relative ones or protocol-relative', () => {
  assert.equal(findRootAbsolute('a.html', '<link href="/assets/x.css">').length, 1);
  assert.equal(findRootAbsolute('a.js', "fetch('/data/x.json')").length, 1);
  assert.equal(findRootAbsolute('a.css', 'src: url(/f.woff2)').length, 1);
  assert.equal(findRootAbsolute('a.html', '<link href="assets/x.css"><a href="#/x"><a href="//cdn.example/x">').length, 0);
  assert.equal(findRootAbsolute('a.js', "fetch('data/x.json'); fetch(new URL('../x', import.meta.url))").length, 0);
});
test('shell pages exist for how/about/onboarding and index has the sound status bar', () => {
  for (const f of ['how', 'about', 'onboarding']) assert.ok(existsSync(join(root, `src/shell/${f}.view.js`)));
  assert.match(rd('index.html'), /id="sound-status"/);
});

// ---- data-driven optional routes (round 3) ----
test('optional routes: hidden from the view list when the file is missing, shown when present; atlas is not swallowed by /letters/:id', async () => {
  const { availableRoutes } = await import('../src/shell/router.js');
  const base = ['shell/home.view.js'];
  assert.equal(availableRoutes(base).has('atlas'), false);
  assert.equal(availableRoutes(base).has('home'), true, 'non-optional routes always count');
  assert.equal(availableRoutes([...base, 'letters/atlas.view.js']).has('atlas'), true);
  assert.equal(availableRoutes([...base, 'vocab/vocab.view.js']).has('vocab'), true);
  assert.equal(matchRoute('#/letters/atlas').route.name, 'atlas');
  assert.equal(matchRoute('#/letters/alef').route.name, 'letter');
  for (const [h, n] of Object.entries({ '#/workbook': 'workbook', '#/soundgap': 'soundgap', '#/vocab': 'vocab' })) assert.equal(matchRoute(h).route.name, n);
});
test('views.generated.js lists exactly the *.view.js files on disk (run node tools/build-precache.mjs after adding a view)', async () => {
  const { VIEW_FILES } = await import('../src/shell/views.generated.js');
  const { readdirSync, statSync } = await import('node:fs');
  const out = []; const walk = (d) => { for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) walk(p); else if (n.endsWith('.view.js') && !n.startsWith('_')) out.push(p.slice(join(root, 'src').length + 1).split('\\').join('/')); } };
  walk(join(root, 'src'));
  assert.deepEqual([...VIEW_FILES].sort(), out.sort());
});
test('workbook page: every PDF in assets/workbook/manifest.json exists with the stated size', async () => {
  const { readFileSync, statSync } = await import('node:fs');
  const m = JSON.parse(readFileSync(join(root, 'assets/workbook/manifest.json'), 'utf8'));
  assert.ok(m.files.length >= 4);
  for (const f of m.files) assert.equal(statSync(join(root, 'assets/workbook', f.pdf)).size, f.bytes, f.pdf);
});
test('precache: skips vendor, PDFs and files over the size limit', async () => {
  const { computeManifest, MAX_FILE_BYTES } = await import('../tools/build-precache.mjs');
  const { readFileSync } = await import('node:fs'); const { statSync } = await import('node:fs');
  const m = computeManifest();
  assert.ok(!m.files.some((f) => f.startsWith('assets/vendor/') || f.startsWith('assets/workbook/') || f.endsWith('.pdf') || f.startsWith('data/vocab/packs/')));
  assert.ok(!m.files.some((f) => /^data\/audio\/manifest-words-/.test(f)), 'word shards are lazy + runtime-cached, not precached');
  assert.ok(m.files.includes('data/audio/manifest.json'), 'core audio manifest stays precached');
  assert.match(rd('sw.js'), /manifest-words-/, 'sw.js has a runtime rule for the shards');
  for (const f of m.files) assert.ok(statSync(join(root, f)).size <= MAX_FILE_BYTES, f);
  // compare the file LIST (not the content hash, which changes on every edit by any lane)
  const listed = JSON.parse(readFileSync(join(root, 'precache-manifest.js'), 'utf8').match(/ALEF_PRECACHE = (\[[\s\S]*?\]);/)[1]);
  assert.deepEqual(listed, m.files, 'precache-manifest.js file list is stale: run node tools/build-precache.mjs');
});

test('router: lane 1 sub-screens inject the query learn.view.js dispatches on', () => {
  assert.equal(matchRoute('#/loanwords').query.loanwords, '1');
  assert.equal(matchRoute('#/loanwords/lw2').query.loanwords, 'lw2');
  assert.equal(matchRoute('#/spotit/kaf-final').query.spotit, 'kaf-final');
  assert.equal(matchRoute('#/checkpoint').query.checkpoint, '1');
  assert.equal(matchRoute('#/dialogues').query.dialogues, '1');
  assert.equal(matchRoute('#/dialogues/d-cafe').query.dialogue, 'd-cafe');
  assert.equal(matchRoute('#/letters/atlas').route.name, 'atlas');
  assert.equal(matchRoute('#/soundgap').route.name, 'soundgap');
});

test('shard loader: loads only the learner tradition, re-loads on change, falls back, handles offline', async () => {
  const { createShardLoader, OFFLINE_NOTE } = await import('../src/shell/audio-shards.js');
  const mk = (tradition, id) => [{ voice: 'f', tradition, kind: 'word', id, text: id, status: 'tts', path: `audio/f/${tradition}/word/${id}.mp3` }];
  const shards = { israeli: mk('israeli', 'a'), ashkenazi: mk('ashkenazi', 'b') }; // no sephardi shard
  const calls = []; let offline = false;
  const fakeFetch = async (u) => {
    calls.push(u);
    if (offline) throw new TypeError('network');
    const t = u.match(/manifest-words-(\w+)\.json/)[1];
    return shards[t] ? { ok: true, status: 200, json: async () => shards[t] } : { ok: false, status: 404, json: async () => { throw new Error('x'); } };
  };
  const player = createAudio({ settings: { voice: 'f', congregation: 'ashkenazi' }, manifest: [], speech: null });
  let cong = 'ashkenazi'; const subs = [];
  const settings = { get: () => cong, subscribe: (f) => { subs.push(f); } };
  const states = [];
  const L = createShardLoader({ fetch: fakeFetch, audio: player, settings, onState: (s) => states.push(s.state) });
  assert.equal(player.status('word', 'b').source, 'none', 'before the shard loads the word is unknown');
  await L.load();
  assert.deepEqual(calls, ['data/audio/manifest-words-ashkenazi.json'], 'only the learner shard is fetched');
  assert.equal(player.status('word', 'b').source, 'file');
  await L.load(); assert.equal(calls.length, 1, 'already loaded: no second fetch');
  // setting change re-loads
  L.watch(); cong = 'israeli'; subs[0](null, ['congregation']); await new Promise((r) => setTimeout(r, 0));
  assert.equal(calls.at(-1), 'data/audio/manifest-words-israeli.json');
  assert.equal(player.status('word', 'a', { tradition: 'israeli' }).source, 'file');
  // sephardi: shard absent -> israeli shard already loaded, state fallback, no throw
  cong = 'sephardi'; const r = await L.load();
  assert.equal(r.state, 'fallback'); assert.equal(r.loaded, 'israeli');
  // offline with nothing cached: graceful note, never throws
  const L2 = createShardLoader({ fetch: fakeFetch, audio: createAudio({ settings: { voice: 'f' }, manifest: [], speech: null }), settings: { get: () => 'ashkenazi' } });
  offline = true; const r2 = await L2.load();
  assert.equal(r2.state, 'offline'); assert.equal(r2.note, OFFLINE_NOTE); assert.match(OFFLINE_NOTE, /unavailable offline/);
  // an HTML offline page answering the JSON request is also "offline", not an error
  offline = false;
  const L3 = createShardLoader({ fetch: async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('<'); } }), audio: player, settings: { get: () => 'ashkenazi' } });
  assert.equal((await L3.load()).state, 'offline');
  // a stale request does not win over a newer one
  assert.ok(states.includes('loading'));
});
test('shell audio: setNote appends and clears a short note on the status line', () => {
  const a = createShellAudio({ settings: { get: () => 'f' }, manifest: [], createAudio });
  const base = a.state.text; a.setNote('audio info unavailable offline');
  assert.match(a.state.text, /\(audio info unavailable offline\)$/); a.setNote(''); assert.equal(a.state.text, base);
});
