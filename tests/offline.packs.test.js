// Lane 4 (12 Nov; points plan #18): offline packs (core lessons, core prayers, the learner's due reviews) with honest
// sizes, the card that downloads them, where the new code sits (on demand, not in the first install), and a check that
// the installable app is complete (manifest, icons, install prompt, service worker).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { install, newRoot, El, tick } from './wordtrace.fakedom.js';
import { computePacks, packsText, OUT } from '../tools/offline-packs.mjs';
import { computeManifest } from '../tools/build-precache.mjs';
import { packFiles, dueCards, sizeLine, size } from '../src/sync/packs.js';
import { ON_DEMAND_GROUPS, onDemandGroups } from '../src/shell/offline.js';
import { ROUTES } from '../src/shell/router.js';
import { VIEW_FILES } from '../src/shell/views.generated.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const packs = JSON.parse(read(OUT));
const T0 = Date.UTC(2026, 10, 2, 15);

test('packs.json is current with the code (node tools/offline-packs.mjs, or the precache rebuild, writes it)', async () => {
  assert.equal(read(OUT), packsText(await computePacks()));
});

test('each pack holds its screens and data, every file exists, and every size is the size on disk', () => {
  const want = {
    'core-lessons': ['src/curriculum/learn.view.js', 'src/curriculum/lesson.view.js', 'src/curriculum/exercises.session.js', 'data/curriculum/lessons.json', 'data/letters/letters.json'],
    'core-prayers': ['src/corpus/read.view.js', 'src/service/service.view.js', 'data/corpus/registry.json', 'data/service/orders.json', 'data/corpus/reader/shema.json'],
    'due-review': ['src/curriculum/review.view.js', 'src/curriculum/srs.js', 'data/letters/memory-chain.json'],
  };
  for (const [id, files] of Object.entries(want)) {
    const p = packs.packs.find((x) => x.id === id); assert.ok(p, id);
    const paths = p.files.map((f) => f[0]);
    for (const f of files) assert.ok(paths.includes(f), `${id} has ${f}`);
    for (const [f, n] of p.files) { assert.ok(existsSync(join(root, f)), f); assert.equal(n, statSync(join(root, f)).size, f); }
    // src/games/tg-core.js is the one shared helper allowed: Follow the Service imports its showName, and without it the screen cannot open offline
    assert.ok(!paths.some((f) => /^src\/(games|retention|synagogues)\//.test(f) && f !== 'src/games/tg-core.js'), `${id} does not pull in unrelated screens`);
    assert.ok(!paths.some((f) => f.startsWith('audio/')), 'no voice clips (the card says so)');
  }
  for (const [, [f, n]] of Object.entries(packs.letterPictures)) assert.equal(n, statSync(join(root, f)).size);
});

test('the due-review pack follows the learner: due memory cards add their letter pictures; cards not due add nothing', () => {
  const store = { get: (k) => (k === 'srs.cards' ? { 'mem:gimel:pic': { id: 'mem:gimel:pic', due: T0 - 1 }, 'mem:dalet:hook': { id: 'mem:dalet:hook', due: T0 + 1e9 }, 'letter:alef': { due: T0 } } : k === 'srs.vocab' ? [{ id: 'v:1', due: T0 - 5 }] : undefined) };
  assert.equal(dueCards(store, T0).length, 3);
  const p = packFiles(packs, 'due-review', { store, now: T0 });
  assert.equal(p.due, 3);
  assert.ok(p.urls.includes('assets/letters/morph/gimel.svg')); assert.ok(!p.urls.includes('assets/letters/morph/dalet.svg'));
  const base = packFiles(packs, 'due-review', { store: { get: () => undefined }, now: T0 });
  assert.equal(p.bytes - base.bytes, statSync(join(root, 'assets/letters/morph/gimel.svg')).size);
  assert.equal(new Set(p.urls).size, p.urls.length, 'no file twice');
  assert.equal(packFiles(packs, 'nope'), null);
});

test('size lines are honest: total, and what is not on this device yet', () => {
  const p = packFiles(packs, 'core-prayers');
  const sizes = new Map(packs.packs.find((x) => x.id === 'core-prayers').files.map(([u, n]) => [u, n]));
  assert.match(sizeLine(p, [], sizes), /All saved on this device/);
  const miss = ['src/service/service.view.js'];
  assert.equal(sizeLine(p, miss, sizes), `${p.urls.length} files, ${size(p.bytes)} in all. 1 of them (${size(sizes.get(miss[0]))}) are not on this device yet.`);
});

test('first install stays the same: the new code and pack lists are on demand and grouped on the offline page', () => {
  const m = computeManifest();
  const mine = m.onDemand.filter((f) => f.startsWith('src/sync/') || f.startsWith('data/offline/'));
  assert.ok(mine.includes('src/sync/move.view.js') && mine.includes('src/sync/certificate.view.js') && mine.includes('data/offline/packs.json'));
  assert.ok(!m.files.some((f) => f.startsWith('src/sync/') || f.startsWith('data/offline/')));
  const listed = read('precache-manifest.js');
  for (const f of mine) assert.ok(listed.includes(JSON.stringify(f)), `precache-manifest.js lists ${f}`);
  assert.deepEqual(onDemandGroups(mine).map((g) => g.id), ['od-sync']);
  assert.ok(ON_DEMAND_GROUPS.find((g) => g.id === 'od-sync'));
  for (const v of ['sync/move.view.js', 'sync/certificate.view.js']) assert.ok(VIEW_FILES.includes(v));
  for (const n of ['move', 'certificate']) assert.ok(ROUTES.find((r) => r.name === n && r.module.startsWith('../sync/')));
});

test('installable app checklist: manifest, icons on disk, install prompt captured, service worker with offline fallback', () => {
  const man = JSON.parse(read('manifest.webmanifest'));
  for (const k of ['name', 'short_name', 'start_url', 'scope', 'display', 'icons', 'theme_color', 'background_color']) assert.ok(man[k], k);
  assert.equal(man.display, 'standalone');
  const png = (p) => { const b = readFileSync(join(root, p)); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; };
  for (const want of [['192x192', 'any'], ['512x512', 'any'], ['512x512', 'maskable']]) {
    const ic = man.icons.find((i) => i.sizes === want[0] && i.purpose === want[1]); assert.ok(ic, want.join(' '));
    const d = png(ic.src); assert.equal(`${d.w}x${d.h}`, want[0], ic.src);
  }
  const index = read('index.html');
  assert.match(index, /rel="manifest"/); assert.match(index, /apple-touch-icon/);
  assert.match(read('src/shell/install.js'), /beforeinstallprompt/); assert.match(read('src/shell/install.js'), /appinstalled/);
  assert.ok(ROUTES.find((r) => r.name === 'install'));
  const sw = read('sw.js');
  assert.match(sw, /ALEF_PRECACHE/); assert.match(sw, /offline\.html/); assert.match(read('src/app.js'), /swc\.register\('sw\.js'\)/);
});

// ---------- the card ----------
const doc = install();
const toNode = (c) => (typeof c === 'string' ? doc.createTextNode(c) : c);
El.prototype.append = function (...k) { for (const c of k) this.appendChild(toNode(c)); };
El.prototype.replaceChildren = function (...k) { for (const c of [...this.childNodes]) this.removeChild(c); this.append(...k); };

test('card: lists the three packs with sizes, downloads the missing files of one, then shows it ready; offline says why', async () => {
  const { mountPacks } = await import('../src/sync/packs.card.js');
  const cached = new Set(packs.packs.flatMap((p) => p.files.filter((f) => f[2]).map((f) => f[0]))); // the first install is there
  const O = {
    cacheReport: async (urls) => ({ supported: true, missing: urls.filter((u) => !cached.has(u)) }),
    warmCache: async (urls, o) => { for (const u of urls) cached.add(u); return { ok: urls.length, failed: [], offline: false, requested: urls.length }; },
  };
  const fetchFn = async (u) => ({ ok: u === 'data/offline/packs.json', status: 200, json: async () => packs });
  const host = newRoot(doc);
  mountPacks(host, { store: { get: () => undefined } }, O, { fetch: fetchFn, navigator: { onLine: true } });
  await tick(50);
  for (const id of ['core-lessons', 'core-prayers', 'due-review']) assert.ok(host.querySelector(`[data-pack="${id}"]`), id);
  assert.match(host.querySelector('[data-pack="core-prayers"]').textContent, /files, [\d.]+ (KB|MB) in all\. \d+ of them \([\d.]+ KB\) are not on this device yet/);
  assert.match(host.textContent, /Voice clips are not in these packs/);
  host.querySelector('[data-pack-go="core-prayers"]').click(); await tick(50);
  assert.match(host.querySelector('[data-pack="core-prayers"]').textContent, /Ready offline\./);
  assert.match(host.querySelector('#of-packs-status').textContent, /Core prayers saved/);
  const host2 = newRoot(doc);
  mountPacks(host2, { store: { get: () => undefined } }, { ...O, cacheReport: async (urls) => ({ supported: true, missing: urls }) }, { fetch: fetchFn, navigator: { onLine: false } });
  await tick(50);
  assert.equal(host2.querySelector('[data-pack-go="core-lessons"]').getAttribute('disabled'), '');
  assert.match(host2.querySelector('[data-why="core-lessons"]').textContent, /You are offline/);
  const host3 = newRoot(doc);
  mountPacks(host3, {}, O, { fetch: async () => ({ ok: false, status: 404 }) }); await tick(30);
  assert.match(host3.textContent, /pack list did not load/);
});

test('the offline page mounts the card from its own file, in one grouped block', () => {
  const v = read('src/shell/offline.view.js');
  assert.match(v, /\/\/ lane 4: offline packs/); assert.match(v, /import\("\.\.\/sync\/packs\.card\.js"\)/);
});
