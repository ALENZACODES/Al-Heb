// Lane 8 integration tests: shell pieces + cross-lane data checks. Lane data checks skip when the file is absent.
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

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const rd = (p) => readFileSync(join(root, p), 'utf8');
const json = (p) => JSON.parse(rd(p));

const LETTERS = 'alef bet gimel dalet he vav zayin chet tet yod kaf lamed mem nun samekh ayin pe tsadi qof resh shin tav kaf-final mem-final nun-final pe-final tsadi-final'.split(' ');

test('router table: every required route matches and params parse', () => {
  const cases = { '#/': 'home', '#/learn': 'learn', '#/letters': 'letters', '#/letters/alef': 'letter', '#/sounds': 'sounds', '#/read': 'read', '#/read/abc': 'text', '#/scan': 'scan', '#/calendar': 'calendar', '#/settings': 'settings', '#/about': 'about', '': 'home' };
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
  assert.deepEqual({ ...DEFAULTS }, { voice: 'f', congregation: 'sephardi', israelTrack: false, script: 'print', theme: 'auto', lat: null, lon: null });
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
  for (const id of letterIds) assert.ok(LETTERS.includes(id.replace(/-sound$/, '')), 'audio letter id not in shared ids: ' + id);
});
test('every data/**/*.json (not _build) parses', () => {
  const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => e.name.startsWith('_') ? [] : e.isDirectory() ? walk(join(d, e.name)) : e.name.endsWith('.json') ? [join(d, e.name)] : []);
  for (const f of walk(join(root, 'data'))) { try { JSON.parse(readFileSync(f, 'utf8')); } catch (e) { assert.fail(f + ': ' + e.message); } }
});
