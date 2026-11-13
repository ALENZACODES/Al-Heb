// alef-tools lane 7: the pinned alef-tools code (lock, vendored files, sync), what stays out of the first install,
// the pack host in the Content-Security-Policy, and Shabbat-safe mode checked by faking the clock.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, cpSync, existsSync, rmSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { check, sync, catalogFrom, shimText, LOCK, VENDOR, SHIM, CATALOG, REPO } from '../tools/alef-tools/sync.mjs';
import { computeManifest, budget, isToolCode, isOnDemand, FIRST_INSTALL_BUDGET } from '../tools/build-precache.mjs';
import { isPackData } from '../tools/deploy/make-dist.mjs';
import { loader, toolUrl, ALEF_TOOLS } from '../src/settings/tools.js';
import { armShabbatCheck, isShabbatSafeMode, allowed } from '../src/settings/shabbat.js';
import { packFiles, downloadPack, removePack, packState, PACK_CACHE, whyNot } from '../src/talk/nmt/pack.js';
import { yomTovDates } from '../src/curriculum/streak.js';
import { isLocalTorchQuiet } from '../src/light/light.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const json = (p) => JSON.parse(read(p));
const sha = (b) => createHash('sha256').update(b).digest('hex');
const lock = json(LOCK);
const at = (isoLocal) => new Date(isoLocal).getTime();

/** A copy of just the pinned files in a temp folder, to tamper with. */
function scratch() {
  const dir = mkdtempSync(join(tmpdir(), 'alef-lock-'));
  for (const p of [LOCK, VENDOR, SHIM, CATALOG]) cpSync(join(root, p), join(dir, p), { recursive: true });
  return dir;
}

test('the lock pins one alef-tools commit and every vendored file matches it by size and SHA-256', () => {
  assert.deepEqual(check(), []);
  assert.equal(lock.repo, REPO); assert.match(lock.ref, /^[0-9a-f]{40}$/); assert.equal(lock.contract, 1);
  assert.ok(lock.packages.loader, 'the shared loader is vendored');
  assert.equal(lock.packages.loader.path, `${VENDOR}/loader@${lock.packages.loader.version}`);
  assert.equal(ALEF_TOOLS.commit, lock.ref);
  assert.ok(toolUrl('loader').endsWith(`/assets/vendor/_alef-tools/loader@${lock.packages.loader.version}/index.js`));
  assert.equal(loader.VERSION, lock.packages.loader.version); assert.equal(loader.CONTRACT, 1);
  assert.equal(read(SHIM), shimText(lock));
});

test('the check notices a changed file, a missing file, a stray file, an edited generated file and a pin that is not a commit', () => {
  const dir = scratch();
  const one = join(dir, lock.packages.loader.path, 'loader.js');
  const good = readFileSync(one);
  writeFileSync(one, good.toString('utf8').replace('16 * 1048576', '64 * 1048576'));
  assert.match(check({ root: dir }).join('\n'), /loader\.js does not match the lock/);
  rmSync(one);
  assert.match(check({ root: dir }).join('\n'), /loader\.js is missing/);
  writeFileSync(one, good);
  writeFileSync(join(dir, lock.packages.loader.path, 'extra.js'), 'export {}');
  assert.match(check({ root: dir }).join('\n'), /extra\.js is not in the lock/);
  rmSync(join(dir, lock.packages.loader.path, 'extra.js'));
  mkdirSync(join(dir, VENDOR, 'loader@9.9.9')); writeFileSync(join(dir, VENDOR, 'loader@9.9.9', 'index.js'), '');
  assert.match(check({ root: dir }).join('\n'), /loader@9\.9\.9 is not in the lock/);
  rmSync(join(dir, VENDOR, 'loader@9.9.9'), { recursive: true });
  assert.deepEqual(check({ root: dir }), []);
  writeFileSync(join(dir, CATALOG), read(CATALOG).replace('"published": false', '"published": true'));
  assert.match(check({ root: dir }).join('\n'), /catalog\.json was edited by hand or is stale/);
  writeFileSync(join(dir, CATALOG), read(CATALOG));
  writeFileSync(join(dir, LOCK), read(LOCK).replace(lock.ref, 'main'));
  assert.match(check({ root: dir }).join('\n'), /must pin a full commit/);
  rmSync(dir, { recursive: true });
});

test('sync: fetches the pinned commit from the raw file host only, checks every file, replaces the older version, and refuses weights or odd paths', async () => {
  const body = { 'index.js': "export const VERSION = '0.2.0';\n", 'cache.js': 'export const a = 1;\n' };
  const listing = (files, version = '0.2.0') => JSON.stringify({ schema: 'alef.dist.v1', name: 'loader', version, files });
  const entries = Object.entries(body).map(([path, text]) => ({ path, bytes: Buffer.byteLength(text), sha256: sha(text) }));
  const manifest = { contract: 1, checked: '2026-11-12', packHost: 'https://alenzacodes.github.io/alef-packs/', packs: { words: { title: 'Word helper', what: 'Tap any Hebrew word.', budgetBytes: 1, device: { webgpu: false, minRamGB: 0 }, published: false, cache: 'alef-pack-words-v1', format: 'alef.pack.v1' } }, models: [{ id: 'a/b', pack: 'words', licence: 'CC-BY-4.0', attribution: 'b by a, CC BY 4.0' }] };
  const ref = 'a'.repeat(40);
  const serve = (table) => { const urls = []; const f = async (url) => { urls.push(url); const k = url.replace(`https://raw.githubusercontent.com/${REPO}/${ref}/`, ''); return k in table ? new Response(table[k]) : new Response('', { status: 404 }); }; f.urls = urls; return f; };
  const table = { 'packages/loader/dist/dist.json': listing(entries), 'packages/loader/dist/index.js': body['index.js'], 'packages/loader/dist/cache.js': body['cache.js'], 'models.manifest.json': JSON.stringify(manifest) };
  const dir = scratch();
  // The pretend host below serves the loader only, so the scratch copy holds the loader only (the real lock may pin more packages).
  { const l = JSON.parse(readFileSync(join(dir, LOCK), 'utf8')); for (const [id, pkg] of Object.entries(l.packages)) if (id !== 'loader') rmSync(join(dir, pkg.path), { recursive: true }); l.packages = { loader: l.packages.loader }; writeFileSync(join(dir, LOCK), JSON.stringify(l)); }
  const f = serve(table);
  const next = await sync({ root: dir, ref, fetchImpl: f });
  assert.equal(next.ref, ref); assert.equal(next.packages.loader.version, '0.2.0');
  assert.ok(f.urls.every((u) => u.startsWith(`https://raw.githubusercontent.com/${REPO}/${ref}/`)), 'nothing is fetched from anywhere else');
  assert.ok(existsSync(join(dir, VENDOR, 'loader@0.2.0/index.js'))); assert.ok(!existsSync(join(dir, lock.packages.loader.path)), 'the older version is gone');
  assert.deepEqual(check({ root: dir }), []);
  assert.match(readFileSync(join(dir, SHIM), 'utf8'), /loader@0\.2\.0\/index\.js/);
  const cat = JSON.parse(readFileSync(join(dir, CATALOG), 'utf8'));
  assert.deepEqual(cat.packs[0].credits, ['b by a, CC BY 4.0']); assert.equal(cat.packs[0].published, false); assert.equal(cat.tools, ref);
  // a file whose bytes are not the ones its listing names
  await assert.rejects(sync({ root: dir, ref, fetchImpl: serve({ ...table, 'packages/loader/dist/cache.js': 'export const a = 2;\n' }) }), /cache\.js does not match dist\.json/);
  // weights, or a path that climbs out of the folder, are never vendored
  for (const path of ['model.onnx', 'weights.bin', '../../sw.js', '/etc/x.js']) await assert.rejects(sync({ root: dir, ref, fetchImpl: serve({ ...table, 'packages/loader/dist/dist.json': listing([...entries, { path, bytes: 1, sha256: sha('x') }]) }) }), /refusing/, path);
  await assert.rejects(sync({ root: dir, ref: 'main', fetchImpl: f }), /full 40-character commit/);
  rmSync(dir, { recursive: true });
  assert.deepEqual(catalogFrom(manifest, ref).packs.map((p) => p.name), ['words']);
});

test('first install: nothing of alef-tools is installed up front; the loader code is on demand; no language pack is listed at all', () => {
  const m = computeManifest();
  const installed = new Set(m.files);
  for (const f of m.files) assert.ok(!/assets\/vendor\/|src\/settings\/|data\/packs\/|alef-tools/.test(f), `${f} must not be in the first install`);
  for (const f of lock.packages.loader.files) { const rel = `${lock.packages.loader.path}/${f.path}`; assert.ok(isToolCode(rel) && isOnDemand(rel) && m.onDemand.includes(rel), `${rel} is fetched on demand`); }
  for (const f of ['src/settings/packs.view.js', 'src/settings/packs.model.js', 'src/settings/shabbat.js', 'src/settings/tools.js', SHIM, CATALOG]) assert.ok(m.onDemand.includes(f) && !installed.has(f), f);
  const listed = [...m.files, ...m.onDemand];
  assert.ok(!listed.some((f) => /_nmt|_ort|_packs/.test(f)), 'language packs and their runtime are never listed, not even for "Download everything"');
  assert.ok(!listed.includes(LOCK), 'the lock is a build-time file');
  for (const f of ['assets/vendor/_alef-tools/speech@1.0.0/vendor/big-runtime.js', 'assets/vendor/_alef-tools/loader@0.1.0/dist.json', 'assets/vendor/_packs/words/model.onnx.p000', 'assets/vendor/_tesseract/x.js']) assert.equal(isToolCode(f), false, f);
  const b = budget(m);
  assert.ok(b.ok, b.problems.join('; ')); assert.ok(b.bytes < FIRST_INSTALL_BUDGET);
  const pre = read('precache-manifest.js');
  assert.ok(!/ALEF_PRECACHE = \[[^\]]*_alef-tools/.test(pre), 'the committed precache list does not install alef-tools');
  for (const f of ['assets/vendor/_packs/words/pack.json', 'assets/vendor/_packs/words/model.onnx.p000']) assert.equal(isPackData(f), true, f);
  assert.equal(isPackData(`${lock.packages.loader.path}/index.js`), false, 'the loader code ships with every copy of the site');
});

test('the service worker never copies a language pack into the per-version cache', () => {
  const sw = read('sw.js');
  const rule = /if \((.+)\) \{\n\s+event\.respondWith\(\(async \(\) => \(await caches\.match\(req\.url\)\) \|\| fetch\(req\)\)\(\)\);/.exec(sw.slice(sw.indexOf('never copy them into the')));
  assert.ok(rule, 'the keep-or-network rule is there');
  assert.ok(rule[1].includes("'/assets/vendor/_packs/'") && rule[1].includes('_(nmt|ort)'), rule[1]);
});

test('Content-Security-Policy: the pack host is allowed for reading data only, in both header files, and nothing else outside the site is', () => {
  const host = new URL(json(CATALOG).packHost).origin;
  assert.equal(host, 'https://alenzacodes.github.io');
  const render = /name: Content-Security-Policy\n\s+value: "([^"]+)"/.exec(read('render.yaml'))[1];
  const headers = /Content-Security-Policy:\s*(.+)/.exec(read('_headers'))[1].trim();
  assert.equal(render, headers, 'render.yaml and _headers carry the same policy');
  for (const csp of [render, headers]) {
    const connect = /connect-src ([^;]*)/.exec(csp)[1];
    assert.deepEqual(connect.split(' '), ["'self'", 'http://127.0.0.1:*', 'http://localhost:*', host]);
    assert.ok(!csp.replace(/connect-src [^;]*/, '').includes('http'), 'no other directive names another address');
    assert.match(csp, /script-src 'self' 'wasm-unsafe-eval';/);
    assert.match(csp, /default-src 'self'/);
  }
});

test('Shabbat-safe mode, by faking the clock: the fixed hours, a Yom Tov on a weekday, and candle lighting when a city is set', async () => {
  await armShabbatCheck({});
  assert.equal(isShabbatSafeMode(at('2026-11-13T17:59:00')), false, 'Friday before 18:00, no city');
  assert.equal(isShabbatSafeMode(at('2026-11-13T18:00:00')), true);
  assert.equal(isShabbatSafeMode(at('2026-11-14T12:00:00')), true);
  assert.equal(isShabbatSafeMode(at('2026-11-14T21:00:00')), false, 'Saturday from 21:00');
  assert.equal(isShabbatSafeMode(at('2026-11-10T12:00:00')), false, 'an ordinary Tuesday');
  // the first Yom Tov day of 2027 that does not fall on a Saturday, at noon, and its eve at 19:00
  const day = [...yomTovDates('2027-01-01', '2027-12-31', 'reform')].sort().find((d) => new Date(`${d}T12:00:00`).getDay() !== 6 && new Date(`${d}T12:00:00`).getDay() !== 5);
  assert.ok(day, 'a weekday Yom Tov exists in 2027');
  assert.equal(isShabbatSafeMode(at(`${day}T12:00:00`)), true, `${day} is Yom Tov`);
  const eve = new Date(at(`${day}T19:00:00`) - 86400000);
  assert.equal(isShabbatSafeMode(eve.getTime()), true, 'the evening before');
  for (const now of [at('2026-11-14T12:00:00'), at(`${day}T12:00:00`)]) {
    assert.equal(allowed('notify', { now }), false); assert.equal(allowed('torch', { now, userStarted: true }), false);
    assert.equal(allowed('download', { now }), false); assert.equal(allowed('download', { now, userStarted: true }), true);
  }
  assert.equal(allowed('download', { now: at('2026-11-10T12:00:00') }), true);
  // With a city set, candle lighting counts even before 18:00. Friday 11 December 2026, 08:00 UTC is 17:00 in Tokyo, after
  // candle lighting there, and still Friday morning (or night) for the clocks these tests run under.
  const tokyoFriday = Date.UTC(2026, 11, 11, 8, 0);
  assert.equal(isShabbatSafeMode(tokyoFriday), false, 'no city: the fixed hours only');
  const armed = await armShabbatCheck({ settings: { get: (k) => ({ lat: 35.68, lon: 139.69 })[k] } });
  assert.ok(armed.loc, 'the city was read the way the calendar reads it');
  assert.equal(isShabbatSafeMode(tokyoFriday), true, 'after candle lighting in the learner\'s city');
  assert.equal(isShabbatSafeMode(Date.UTC(2026, 11, 9, 8, 0)), false, 'a Wednesday there');
  await armShabbatCheck({});
  assert.equal(isShabbatSafeMode(tokyoFriday), false, 'cleared again');
  // the app's own torch rule (src/light) already keeps the torch off in the same fixed hours
  assert.equal(isLocalTorchQuiet(new Date('2026-11-14T12:00:00')), true);
});

function memoryCaches() {
  const stores = new Map();
  const open = async (name) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const m = stores.get(name); const url = (k) => (typeof k === 'string' ? k : k.url);
    return { match: async (k) => { const e = m.get(url(k)); return e ? new Response(e.body, { headers: e.headers }) : undefined; }, put: async (k, res) => { m.set(url(k), { body: new Uint8Array(await res.arrayBuffer()), headers: [...res.headers] }); }, delete: async (k) => m.delete(url(k)), keys: async () => [...m.keys()].map((u) => ({ url: u })) };
  };
  return { open, delete: async (name) => stores.delete(name), keys: async () => [...stores.keys()], stores };
}
function miniTalk() {
  const body = { a: 'aaaaaaaa', b: 'bbbbbbbbbbbb', c: 'cccc', rt: 'runtime' };
  const part = (path, k) => ({ path, bytes: body[k].length, sha256: sha(body[k]) });
  const manifest = { version: 'v1', runtime: { base: '../_ort/', files: [{ path: 'rt.wasm', ...part('', 'rt'), path2: 0 }].map(({ path2, ...f }) => ({ ...f, path: 'rt.wasm' })) },
    packs: { 'he-en': { files: [{ name: 'table.onnx', parts: [part('he-en/a.bin', 'a'), part('he-en/b.bin', 'b')] }] }, 'en-he': { files: [{ name: 'table.onnx', parts: [part('en-he/c.bin', 'c')] }] } } };
  const fetched = [];
  const fetch = async (url) => { fetched.push(url); const k = url.includes('a.bin') ? 'a' : url.includes('b.bin') ? 'b' : url.includes('c.bin') ? 'c' : 'rt'; return new Response(body[k]); };
  return { manifest, fetch, fetched };
}

test('a Talk pack download nobody started does not begin on Shabbat and fetches nothing; started by hand it works; Wi-Fi only and the storage limit are respected', async () => {
  const SAT = at('2026-11-14T12:00:00'), TUE = at('2026-11-10T12:00:00');
  const t = miniTalk(); const caches = memoryCaches();
  const base = { caches, fetch: t.fetch, subtle: globalThis.crypto.subtle, navigator: {}, storage: { getItem: () => null, setItem() {}, removeItem() {} } };
  await assert.rejects(downloadPack(t.manifest, 'he-en', { ...base, now: SAT }), (e) => whyNot(e) === 'shabbat');
  assert.equal(t.fetched.length, 0, 'nothing was fetched');
  assert.equal((await downloadPack(t.manifest, 'he-en', { ...base, now: SAT, userStarted: true })).ready, true);
  assert.deepEqual([...caches.stores.keys()], [PACK_CACHE], 'the Talk packs keep their own cache name');
  // "Only on Wi-Fi" is on unless switched off
  await assert.rejects(downloadPack(t.manifest, 'en-he', { ...base, now: TUE, userStarted: true, navigator: { connection: { type: 'cellular' } } }), (e) => whyNot(e) === 'wifi-only');
  const off = { getItem: (k) => (k === 'alef.packs.wifi-only' ? '0' : null), setItem() {}, removeItem() {} };
  // the learner's own limit
  const limited = { getItem: (k) => (k === 'alef.packs.limit-bytes' ? '5' : null), setItem() {}, removeItem() {} };
  await assert.rejects(downloadPack(t.manifest, 'en-he', { ...base, now: TUE, userStarted: true, storage: limited }), (e) => whyNot(e) === 'over-limit');
  assert.equal((await downloadPack(t.manifest, 'en-he', { ...base, now: TUE, userStarted: true, storage: off, navigator: { connection: { type: 'cellular' } } })).ready, true);
});

test('deleting one Talk pack keeps the other pack and the runtime they share; deleting the last one clears the cache', async () => {
  const t = miniTalk(); const caches = memoryCaches();
  const base = { caches, fetch: t.fetch, subtle: globalThis.crypto.subtle, navigator: {}, userStarted: true, now: at('2026-11-10T12:00:00') };
  await downloadPack(t.manifest, 'he-en', base); await downloadPack(t.manifest, 'en-he', base);
  assert.equal(await removePack(t.manifest, 'he-en', { caches }), true);
  assert.equal((await packState(t.manifest, 'he-en', { caches })).have, 7, 'only the shared runtime is left of it');
  assert.equal((await packState(t.manifest, 'en-he', { caches })).ready, true, 'the other pack is untouched');
  assert.equal(packFiles(t.manifest, 'en-he').length, 2);
  assert.equal(await removePack(t.manifest, 'en-he', { caches }), true);
  assert.equal(caches.stores.has(PACK_CACHE), false, 'nothing is left behind');
});
