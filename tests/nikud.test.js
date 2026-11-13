// Vowel marks on this device (src/nikud) and the vendored alef-tools files they use.
// Runs without any model: the pack parts are small stand-ins and the worker is a stub. What the real packs give is measured in
// alef-tools (packages/nikud/review); this file checks the joins: vendoring, laziness, the Name rule, wording, the pack cache.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { check, LOCK } from '../tools/alef-tools/sync.mjs';
import { ALEF_TOOLS } from '../src/settings/alef-tools.generated.js';
import { loader, nikud, NIKUD_FOLDER } from '../src/nikud/vendor.js';
import { addMarks, wantsMarks, hasPack, PACK_BASES, PACK_NAMES, ORT_BASE, SOURCE_NOTE } from '../src/nikud/service.js';
import * as copy from '../src/nikud/copy.js';

const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
const sha = (b) => createHash('sha256').update(b).digest('hex');
const precache = (() => { const self = {}; new Function('self', read('precache-manifest.js'))(self); return self; })();

// ---- stand-ins: Cache Storage in memory, a fetch over a table, a worker that answers like the real one
function memoryCaches() {
  const stores = new Map();
  const open = async (name) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const m = stores.get(name); const url = (k) => (typeof k === 'string' ? k : k.url);
    return { match: async (k) => { const e = m.get(url(k)); return e ? new Response(e.body, { headers: e.headers }) : undefined; },
      put: async (k, res) => { m.set(url(k), { body: new Uint8Array(await res.arrayBuffer()), headers: [...res.headers] }); },
      delete: async (k) => m.delete(url(k)), keys: async () => [...m.keys()].map((u) => ({ url: u })) };
  };
  return { open, delete: async (name) => stores.delete(name), keys: async () => [...stores.keys()], stores };
}
const BASE = 'https://packs.example/';
function world(packs = ['nikud']) {
  const table = {};
  for (const pack of packs) {
    const parts = [new Uint8Array(700).fill(3), new Uint8Array(300).fill(4)];
    const whole = new Uint8Array(1000); whole.set(parts[0]); whole.set(parts[1], 700);
    table[`${BASE}${pack}/pack.json`] = JSON.stringify({ schema: 'alef.pack.v1', pack, version: '1', files: [{ name: 'm.onnx', bytes: 1000, sha256: sha(whole), parts: parts.map((b, i) => ({ path: `m.onnx.p00${i}`, bytes: b.length, sha256: sha(b) })) }] });
    parts.forEach((b, i) => { table[`${BASE}${pack}/m.onnx.p00${i}?v=${sha(b).slice(0, 16)}`] = b; });
  }
  const calls = [];
  const fetch = async (url) => { calls.push(String(url)); return url in table ? new Response(table[url]) : new Response('', { status: 404 }); };
  const storage = { getItem: () => null, setItem() {}, removeItem() {} };
  return { env: { bases: [BASE], fetch, caches: memoryCaches(), storage, navigator: {}, origin: 'https://site.example', gpu: false }, calls };
}
function fakeWorker(log, answers = {}) {
  return class {
    constructor() { log.push({ made: true }); }
    postMessage(m) {
      log.push(m);
      const a = m.type === 'load' ? {} : { result: m.type === 'point' ? (answers.point || ((t) => ({ text: `[${t}]`, changed: true, name: false, reason: '' })))(m.text) : (answers.sounds || ((t) => ({ text: t, marked: t, phonemes: 'ʃaˈbat', name: false, words: [], reason: '' })))(m.text) };
      queueMicrotask(() => this.onmessage({ data: { ...a, id: m.id, ok: true } }));
    }
    terminate() {}
  };
}

// ---- vendoring
test('the vendored alef-tools files are what the shared lock pins, and this lane points at the pinned nikud folder', () => {
  assert.deepEqual(check(), [], 'node tools/alef-tools/sync.mjs --check');
  const lock = JSON.parse(read(LOCK));
  assert.match(lock.ref, /^[0-9a-f]{40}$/, 'the lock names one alef-tools commit');
  assert.equal(ALEF_TOOLS.commit, lock.ref);
  assert.ok(lock.packages.loader && lock.packages.nikud, 'loader and nikud are both vendored');
  assert.equal(nikud.version, lock.packages.nikud.version);
  assert.equal(loader.VERSION, lock.packages.loader.version);
  assert.ok(NIKUD_FOLDER.endsWith(`/assets/vendor/_alef-tools/nikud@${nikud.version}/`));
  assert.ok(read('src/nikud/vendor.js').includes(`_alef-tools/nikud@${lock.packages.nikud.version}/index.js`), 'vendor.js imports the pinned version');
  assert.equal(existsSync(new URL('../assets/vendor/_alef-tools/nikud.lock.json', import.meta.url)), false, 'one lock only');
});

test('the nikud package has the shape the loader expects', () => {
  const p = loader.definePackage(nikud);
  assert.deepEqual([...p.packs], ['nikud', 'phonemes']);
  assert.deepEqual([...PACK_NAMES], ['nikud', 'phonemes']);
  assert.equal(loader.CONTRACT, 1);
});

// ---- nothing in the first install
test('nothing of this lane is installed up front: the code is fetched on first use, the vendored files never precached', () => {
  const installed = precache.ALEF_PRECACHE;
  assert.deepEqual(installed.filter((f) => f.startsWith('src/nikud/') || f.startsWith('assets/vendor/')), []);
  for (const f of ['src/nikud/panel.js', 'src/nikud/service.js', 'src/nikud/copy.js', 'src/nikud/vendor.js']) assert.ok(precache.ALEF_ON_DEMAND.includes(f), `${f} should be listed on demand`);
  assert.equal(precache.ALEF_ON_DEMAND.some((f) => /\.(onnx|wasm)$|\.p\d{3}$/.test(f) && f.includes('nikud')), false, 'no weights are listed anywhere');
});

test('the screens reach the vowel-mark code only through a lazy import', () => {
  for (const f of ['src/talk/talk.view.js', 'src/camera/camera.view.js', 'src/shell/settings.view.js']) {
    const s = read(f);
    assert.ok(s.includes("import('../nikud/panel.js')"), `${f} loads the panel lazily`);
    assert.equal(/^import .*nikud\//m.test(s), false, `${f} must not import src/nikud at the top`);
    assert.equal(/_alef-tools/.test(s), false, `${f} must not name the vendored folder`);
  }
  // Settings fetches nothing until the group is opened
  assert.ok(/marksGroup\.addEventListener\('toggle'/.test(read('src/shell/settings.view.js')));
});

test('no weights and no pack parts are in the repository', () => {
  const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(new URL(e.name + '/', dir)) : [e.name]));
  assert.deepEqual(walk(new URL('../assets/vendor/_alef-tools/', import.meta.url)).filter((n) => /\.(onnx|bin|safetensors|wasm)$|\.p\d{3}$/.test(n)), []);
  assert.equal(existsSync(new URL('../assets/vendor/_packs/', import.meta.url)), false, 'packs are served by the pack host, not kept in git');
});

// ---- packs: where they come from, how they are kept
test('packs are looked for on the site first, then on the project pack host, which the site policy allows', () => {
  assert.equal(PACK_BASES.length, 2);
  assert.ok(PACK_BASES[0].endsWith('/assets/vendor/_packs/'));
  assert.equal(PACK_BASES[1], 'https://alenzacodes.github.io/alef-packs/');
  assert.ok(read('_headers').includes(`connect-src 'self' http://127.0.0.1:* http://localhost:* ${new URL(PACK_BASES[1]).origin}`));
  assert.ok(ORT_BASE.endsWith('/assets/vendor/_ort/'), 'the runtime comes from the site itself');
});

test('a pack that is not on the device is never loaded; asking for marks then changes nothing but the Name', async () => {
  const w = world();
  assert.equal(await hasPack('nikud', { caches: w.env.caches }), false);
  const log = [];
  const r = await addMarks('שלום עולם', { load: { caches: w.env.caches, WorkerCtor: fakeWorker(log) } });
  assert.deepEqual(r, { text: 'שלום עולם', name: false, phonemes: null, soundsLike: null, marked: false });
  assert.equal(log.length, 0, 'no worker was started');
  assert.equal(w.calls.length, 0, 'and nothing was fetched');
});

test('with the pack downloaded (each part checked) marks are added; the pack lives in its own cache', async () => {
  const w = world(['nikud']);
  await loader.downloadPack('nikud', { ...w.env, userStarted: true });
  assert.deepEqual(await w.env.caches.keys(), ['alef-pack-nikud-v1']);
  assert.equal(await hasPack('nikud', { caches: w.env.caches }), true);
  const before = w.calls.length;
  const log = [];
  const r = await addMarks('שלום', { load: { caches: w.env.caches, WorkerCtor: fakeWorker(log, { point: () => ({ text: 'שָׁלוֹם', changed: true, name: false, reason: '' }) }) } });
  assert.equal(r.text, 'שָׁלוֹם'); assert.equal(r.marked, true); assert.equal(r.phonemes, null, 'no sound pack, so no sound line');
  assert.equal(w.calls.length, before, 'adding marks made no network request');
  const sent = log.find((m) => m.type === 'load');
  assert.equal(sent.cacheName, 'alef-pack-nikud-v1');
  assert.ok(sent.ortBase.endsWith('/assets/vendor/_ort/'));
  await nikud.unload();
});

test('a wrong part is refused and nothing is kept', async () => {
  const w = world(['nikud']);
  const realFetch = w.env.fetch;
  w.env.fetch = async (url) => (String(url).includes('.p001') ? new Response(new Uint8Array(300).fill(9)) : realFetch(url));
  await assert.rejects(loader.downloadPack('nikud', { ...w.env, userStarted: true, retries: 0 }), (e) => e.code === 'hash-mismatch');
  assert.equal(await hasPack('nikud', { caches: w.env.caches }), false);
});

// ---- the Name, and traditions
test('the divine Name is written ה׳ and never gets a sound line, with or without packs', async () => {
  const none = world();
  const bare = await addMarks('ברוך אתה יהוה', { load: { caches: none.env.caches, WorkerCtor: fakeWorker([]) } });
  assert.equal(bare.text, 'ברוך אתה ה׳'); assert.equal(bare.name, true); assert.equal(bare.phonemes, null);

  const w = world(['nikud', 'phonemes']);
  for (const p of ['nikud', 'phonemes']) await loader.downloadPack(p, { ...w.env, userStarted: true });
  const log = [];
  const r = await addMarks('בָּרוּךְ אַתָּה יְהוָה', { load: { caches: w.env.caches, WorkerCtor: fakeWorker(log, { point: (t) => ({ text: nikud.guardName(t).text, changed: true, name: true, reason: '' }) }) } });
  assert.equal(r.name, true);
  assert.equal(r.phonemes, null); assert.equal(r.soundsLike, null);
  assert.ok(r.text.endsWith('ה׳') && !/יְהוָה|יהוה/.test(r.text));
  assert.equal(log.filter((m) => m.type === 'sounds').length, 0, 'the sound pack was never asked about a line with the Name');
  await nikud.unload();
});

test('with both packs: a sound line, and the same line written the way the chosen tradition says it', async () => {
  const w = world(['nikud', 'phonemes']);
  for (const p of ['nikud', 'phonemes']) await loader.downloadPack(p, { ...w.env, userStarted: true });
  const answers = { point: () => ({ text: 'שַׁבָּת', changed: true, name: false, reason: '' }), sounds: () => ({ text: 'שַׁבָּת', marked: 'שַׁבָּת', phonemes: 'ʃaˈbat', name: false, words: [], reason: '' }) };
  const opts = (tradition) => ({ tradition, load: { caches: w.env.caches, WorkerCtor: fakeWorker([], answers) } });
  const il = await addMarks('שבת', opts('israeli'));
  assert.equal(il.text, 'שַׁבָּת'); assert.equal(il.phonemes, 'ʃaˈbat');
  assert.match(il.soundsLike, /^shab+at$/i);
  await nikud.unload();
  const ash = await addMarks('שבת', opts('ashkenazi'));
  assert.match(ash.soundsLike, /^shab+os$/i, 'the Ashkenazi line comes from the app\'s own tradition rules');
  await nikud.unload();
});

test('wantsMarks: only Hebrew with at least one bare word', () => {
  assert.equal(wantsMarks('שלום עולם'), true);
  assert.equal(wantsMarks('שָׁלוֹם עולם'), true);
  assert.equal(wantsMarks('שָׁלוֹם עוֹלָם'), false);
  assert.equal(wantsMarks('hello 123'), false);
  assert.equal(wantsMarks(''), false);
});

// ---- wording and rules
test('every word a learner reads: plain, no talk of how the marks are made, Title Case on buttons and headings', () => {
  const all = Object.values(copy).flatMap((v) => (typeof v === 'string' ? [v] : Object.values(v)));
  assert.ok(all.length > 20);
  for (const s of [...all, ...Object.values(SOURCE_NOTE)]) assert.equal(/\b(AI|A\.I\.|artificial|machine|model|neural|LLM|GPT|bot|algorithm)\b/i.test(s), false, s);
  for (const s of [copy.PACKS_TITLE, copy.MARKS_BUTTON, ...Object.values(copy.PACK_LABEL)]) assert.ok(s.split(' ').every((w) => /^[A-Z]/.test(w)), `Title Case: ${s}`);
  assert.ok(copy.NAME_NOTE.includes('ה׳'));
  assert.ok(/on this device/.test(copy.PACKS_LEAD) && /language pack/.test(copy.MARKS_NOTE));
  assert.ok(copy.PACKS_LEAD.includes('Wi-Fi'), 'the size warning comes before any download');
});

test('quiet by design: no timers, no notifications, no background fetch; a download starts only from the learner\'s press', () => {
  for (const f of ['src/nikud/panel.js', 'src/nikud/service.js']) {
    const s = read(f);
    assert.equal(/setInterval|setTimeout|Notification|periodicSync|backgroundFetch|torch|sendBeacon/.test(s), false, f);
  }
  const service = read('src/nikud/service.js');
  assert.ok(/downloadPack\(name, env\(\{ \.\.\.o, userStarted: true/.test(service), 'the one download call says the learner started it');
  const panel = read('src/nikud/panel.js');
  assert.equal((panel.match(/getPack\(/g) || []).length, 1);
  assert.ok(/onclick: \(\) => onGet\(\)/.test(panel) && /const onGet = async \(\) => \{[\s\S]{0,500}getPack\(/.test(panel), 'and it sits inside the button\'s click handler');
});

test('pack files stay out of the per-version cache, and a data wipe treats them like the Talk packs', () => {
  assert.ok(read('sw.js').includes("/\\/assets\\/vendor\\/_packs\\//.test(url.pathname)"));
  assert.ok(read('src/shell/settings.data.js').includes('/^alef-(shell|runtime|talk-pack|pack)-/'));
  assert.ok(read('src/shell/privacy.view.js').includes('alef-pack-nikud-v1'));
});

// ---- vowel marks made ahead of time
test('built vowel marks: small files, the app\'s own pointing never changed, the Name never sounded', () => {
  const dir = new URL('nikud/', NIKUD_FOLDER);
  const units = readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'index.json');
  assert.ok(units.includes('talk.json') && units.includes('lessons.json'));
  let lines = 0;
  for (const f of units) {
    assert.ok(statSync(new URL(f, dir)).size <= 300 * 1024, `${f} is over 300 KiB`);
    for (const l of JSON.parse(readFileSync(new URL(f, dir), 'utf8')).lines) {
      lines++;
      if (l.s !== 'model') assert.equal(l.p, l.t, `the app's text was changed in ${f}: ${l.t}`);
      else assert.equal(nikud.stripPoints(l.p), nikud.guardName(l.t).text, `letters changed in ${f}: ${l.t}`);
      assert.equal(nikud.hasCantillation(l.t), false, 'Torah text is not in these files');
      if (nikud.guardName(l.t).found) assert.equal(l.ph, null);
    }
  }
  assert.ok(lines > 5000);
  const talk = nikud.unitIndex(JSON.parse(readFileSync(new URL('talk.json', dir), 'utf8')));
  const hit = talk.get('שלום');
  assert.ok(hit && nikud.hasPoints(hit.p) && hit.s === 'model');
  assert.ok(SOURCE_NOTE.model.length > 10 && SOURCE_NOTE.checked === '');
});

test('the Talk screen shows built marks only when the learner has asked for vowel marks and Aleph has no checked ones', () => {
  const s = read('src/talk/talk.view.js');
  assert.ok(s.includes('if (built && r.ok && !r.held && toHe && settings.nikkud && !r.pointed) built(r, text);'));
  assert.ok(s.includes("m.builtLine('talk', text)"));
});

test('credits: both models are on the credits page data, Dicta with a CC BY line that says the model was changed', () => {
  const att = JSON.parse(read('data/legal/attributions.json')).entries;
  const dicta = att.find((e) => e.id === 'dictabert-menaked'); const pho = att.find((e) => e.id === 'phonikud-onnx');
  assert.ok(dicta && pho);
  assert.ok(/CC BY 4\.0/.test(dicta.attributionText) && /Changed/.test(dicta.attributionText));
  assert.ok(/MIT/.test(pho.attributionText) && /Dicta/.test(pho.attributionText));
});
