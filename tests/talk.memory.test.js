// Lane: translation tools from alef-tools. The vendored package, the sentence memory, the high-quality pack entry,
// the camera's use of both, and the promise that none of it touches the first install or any address but the site and the pack host.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { translateLine, MEMORY_NOTE_APP, MEMORY_NOTE_PACK } from '../src/talk/hybrid.js';
import { loadEngine } from '../src/talk/data.js';
import { createMemory } from '../src/talk/nmt/memory.js';
import { loader } from '../src/settings/tools.js';
import { translateUrl } from '../src/talk/nmt/tools.js';
const { createPackStore } = await import(translateUrl('pack.js')); const { tmKey, fnv1a } = await import(translateUrl('tm.js'));
import { PACK_NAMES, PACK_LABEL, PACK_DIRECTION, HQ_PACK, DIRECTIONS, packFiles } from '../src/talk/nmt/pack.js';
import { translateMissingLines, sourceLabel, PACK_MIN_CONF } from '../src/camera/camera-model.js';
import { METHOD_LABEL, HQ_NOTE } from '../src/talk/talk.view.js';
import { strictScore, acceptedScore, summarize } from '../tools/talk/nmt/scoring.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const json = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));
const sha = (b) => createHash('sha256').update(b).digest('hex');
const TM = join(root, 'data/talk/tm');
const NAME = 'יהוה';
const diskMemory = () => createMemory({ base: 'file:///tm/', fetch: async (u) => { try { return new Response(readFileSync(join(TM, String(u).slice('file:///tm/'.length)))); } catch { return new Response('', { status: 404 }); } } });

test('the vendored tools package is the pinned one, file for file; no wrapper names a version; the old import paths still work', async () => {
  assert.match(execFileSync(process.execPath, [join(root, 'tools/alef-tools/sync.mjs'), '--check'], { encoding: 'utf8' }), /translate@\d+\.\d+\.\d+ \(\d+ files\).*match the lock/);
  const lock = json('data/alef-tools.lock.json');
  assert.match(lock.ref, /^[0-9a-f]{40}$/); assert.ok(lock.packages.translate && lock.packages.loader);
  for (const f of ['tokenizer', 'decode', 'runtime', 'pack', 'client', 'worker', 'memory']) {
    const text = readFileSync(join(root, `src/talk/nmt/${f}.js`), 'utf8');
    assert.match(text, /translateUrl\('/, f); assert.ok(!/translate@\d/.test(text), `${f} names no version`);
  }
  assert.ok(translateUrl('tm.js').endsWith(`/assets/vendor/_alef-tools/translate@${lock.packages.translate.version}/tm.js`));
  const { createTokenizer } = await import('../src/talk/nmt/tokenizer.js'); const { createRuntime } = await import('../src/talk/nmt/runtime.js'); const { createDecoder } = await import('../src/talk/nmt/decode.js');
  assert.equal(typeof createTokenizer, 'function'); assert.equal(typeof createRuntime, 'function'); assert.equal(typeof createDecoder, 'function');
});

test('none of it is in the first install: the vendored code, the sentence memory and the wrappers are all fetched on demand', () => {
  const pre = readFileSync(join(root, 'precache-manifest.js'), 'utf8');
  const installed = JSON.parse(/self\.ALEF_PRECACHE\s*=\s*(\[[\s\S]*?\]);/.exec(pre)[1]);
  assert.ok(installed.length > 100);
  for (const f of installed) { assert.ok(!f.startsWith('assets/vendor/'), f); assert.ok(!f.startsWith('data/talk/'), f); assert.ok(!f.startsWith('src/talk/'), f); assert.ok(!f.startsWith('src/camera/'), f); }
  assert.ok(!/_nmt|_ort/.test(pre), 'no pack file is listed anywhere');
});

test('sentence memory files: units of at most 300 KiB, an index that matches them, and no line that holds the Name', () => {
  const index = json('data/talk/tm/index.json');
  assert.ok(statSync(join(TM, 'index.json')).size <= 300 * 1024);
  let n = 0; const seen = new Set();
  for (const u of index.units) {
    const body = readFileSync(join(TM, u.file));
    assert.ok(body.length <= 300 * 1024, `${u.file} is ${body.length} bytes`); assert.equal(body.length, u.bytes); assert.equal(sha(body), u.sha256);
    const unit = JSON.parse(body.toString('utf8')); assert.equal(unit.entries.length, u.entries);
    const set = new Set(new Uint32Array(Uint8Array.from(Buffer.from(u.hashes, 'base64')).buffer));
    for (const [key, en, src] of unit.entries) {
      n++;
      assert.equal(tmKey(key), key, 'a stored key is already in key form'); assert.ok(set.has(fnv1a(key)), key);
      assert.ok(!seen.has(key), `twice: ${key}`); seen.add(key);
      assert.ok(!key.includes(NAME), 'no line with the Name is stored'); assert.ok(!/yhwh|yahweh|jehovah/i.test(en), en);
      assert.ok(en && !/[א-ת]/.test(en), `English only: ${en}`); assert.ok(src === 'a' || src === 'p');
      assert.ok(key.split(' ').length >= 3);
    }
  }
  assert.equal(n, index.entries); assert.ok(n > 800);
  assert.deepEqual(readdirSync(TM).sort(), ['index.json', ...index.units.map((u) => u.file)].sort());
});

test('Talk: a lesson sentence is answered from the memory with no pack; stored lines still come first; a line with the Name is held and goes nowhere', async () => {
  const engine = await loadEngine();
  const asked = []; const memory = diskMemory(); const spy = { lookup: async (he) => { asked.push(he); return memory.lookup(he); } };
  const sample = json('data/talk/tm/books.json').entries.find((e) => e[2] === 'a' && e[0].split(' ').length >= 4);
  const r = await translateLine(engine, null, sample[0], { direction: 'he-en', memory: spy });
  assert.equal(r.ok, true); assert.equal(r.method, 'memory'); assert.equal(r.translation, sample[1]); assert.equal(r.note, MEMORY_NOTE_APP); assert.ok(!r.needsPack);
  const made = json('data/talk/tm/israel.json').entries.find((e) => e[2] === 'p');
  const m = await translateLine(engine, null, made[0], { direction: 'he-en', memory: spy });
  assert.equal(m.method, 'memory'); assert.equal(m.note, MEMORY_NOTE_PACK); assert.equal(m.confidence, 'medium');
  asked.length = 0;
  const stored = await translateLine(engine, null, 'בוקר טוב', { direction: 'he-en', memory: spy });
  assert.equal(stored.method, 'phrase'); assert.equal(asked.length, 0, 'a stored line never reaches the memory');
  let packCalls = 0; const pack = { ready: () => true, translate: async () => { packCalls++; return 'x'; } };
  for (const line of [`ברוך אתה ${NAME} אלהינו`, `הודו ל${NAME} כי טוב`, 'Praise Yahweh in the morning']) {
    const held = await translateLine(engine, pack, line, { memory: spy });
    assert.equal(held.held, true, line); assert.ok(!held.translation, line);
  }
  assert.equal(asked.length, 0, 'a held line is never looked up'); assert.equal(packCalls, 0, 'and never sent to a pack');
  const en = await translateLine(engine, null, 'Our neighbour painted the fence green yesterday.', { direction: 'en-he', memory: spy });
  assert.equal(asked.length, 0, 'English lines do not use the memory'); assert.equal(en.needsPack, 'en-he');
  const other = await translateLine(engine, pack, 'הכלב שלנו ברח אתמול אל היער הגדול.', { direction: 'he-en', memory: spy });
  assert.equal(other.method, 'model', 'a line the memory does not hold still goes to the pack');
  assert.equal(METHOD_LABEL.memory, 'A lesson sentence');
  for (const s of [MEMORY_NOTE_APP, MEMORY_NOTE_PACK, HQ_NOTE, ...Object.values(PACK_LABEL)]) assert.ok(!/\bAI\b|model|neural|machine|artificial/i.test(s), s);
});

test('the high-quality pack: listed part by part in the site, inside its size budget, hidden until it is on the pack host', async () => {
  const host = json('data/talk/pack-host.json');
  assert.equal(host.hosts.length, 1);
  const r = host.remote[HQ_PACK]; const pack = r.pack;
  assert.equal(r.published, false, 'flip to true only when the files are on the pack host');
  assert.equal(pack.direction, 'he-en'); assert.equal(pack.quality, 'high'); assert.equal(pack.requires, 'webgpu'); assert.equal(pack.licence, 'CC-BY-4.0');
  assert.match(pack.revision, /^[0-9a-f]{40}$/); assert.equal(pack.probe.length, 2); assert.equal(pack.gpu.length, 2);
  assert.ok(pack.bytes <= 250 * 1048576, `${pack.bytes} bytes`);
  for (const f of [...pack.files, ...pack.gpu]) { assert.equal(f.parts.reduce((a, p) => a + p.bytes, 0), f.bytes); for (const p of f.parts) { assert.ok(p.bytes <= 16 * 1048576, p.path); assert.match(p.sha256, /^[0-9a-f]{64}$/); assert.ok(p.path.startsWith('he-en-hq/')); } }
  assert.deepEqual([...PACK_NAMES], [...DIRECTIONS, HQ_PACK]); assert.equal(PACK_DIRECTION[HQ_PACK], 'he-en');
  const manifest = json('assets/vendor/_nmt/manifest.json');
  const SITE = 'https://site.example/assets/vendor/_nmt/', HOSTS = 'https://site.example/data/talk/pack-host.json';
  const run = async (doc) => {
    const log = []; const fetch = async (u) => { log.push(String(u)); if (String(u) === SITE + 'manifest.json') return new Response(JSON.stringify(manifest)); if (String(u) === HOSTS) return new Response(JSON.stringify(doc)); return new Response('', { status: 404 }); };
    const caches = { open: async () => ({ match: async () => undefined, put: async () => {}, keys: async () => [], delete: async () => true }) };
    const store = createPackStore({ loader, base: SITE, cacheName: 't', hostsFile: HOSTS });
    return { m: await store.loadManifest({ fetch, caches }), log, store };
  };
  const off = await run(host);
  assert.deepEqual(Object.keys(off.m.packs).sort(), ['en-he', 'he-en'], 'not offered while unpublished');
  for (const u of off.log) assert.ok(u.startsWith('https://site.example/'), `only the site is asked: ${u}`);
  const on = await run({ ...host, remote: { [HQ_PACK]: { ...r, published: true } } });
  assert.equal(on.m.packs[HQ_PACK].base, host.hosts[0]);
  for (const f of on.store.packFiles(on.m, HQ_PACK, { gpu: true })) {
    const fromHost = f.key.startsWith(host.hosts[0]); const fromSite = f.key.startsWith('https://site.example/');
    assert.ok(fromHost || fromSite, f.key); assert.equal(fromHost, f.key.includes('/he-en-hq/'), f.key);
    if (/\.mjs(\?|$)/.test(f.key)) assert.ok(fromSite, 'code only ever comes from the site');
  }
  assert.ok(packFiles(manifest, 'he-en').length > 5, 'the ordinary packs are listed as before');
  const cat = json('data/packs/catalog.json').packs.find((p) => JSON.stringify(p).includes('he-en-hq'));
  assert.equal(cat.published, false); assert.ok(cat.credits.some((c) => /CC BY 4\.0/.test(c)), 'its credit line reaches the Credits page once it is published');
});

test('camera: a line the word lists miss gets the translator\'s answer when there is one, and is left for the old path when there is not', async () => {
  const mk = () => [
    { id: 1, he: 'חנות נעליים חדשה', conf: 92 }, { id: 2, he: 'מלח', conf: 95 }, { id: 3, he: 'כניסה חופשית לכולם', conf: 92, en: 'Free Entry' },
    { id: 4, he: `ברוך ${NAME} לעולם`, conf: 95, held: true }, { id: 5, he: 'פתוח כל יום', conf: PACK_MIN_CONF - 5 }, { id: 6, he: 'סגור בשבת ובחג', conf: 90, partial: true }, { id: 7, he: 'הכניסה מהצד השני', conf: 90, occluded: true },
  ];
  const sent = []; let regions = mk();
  assert.equal(await translateMissingLines(regions, async (he) => { sent.push(he); return 'new shoe shop.'; }), 1);
  assert.deepEqual(sent, ['חנות נעליים חדשה'], 'one clean, confident, untranslated line of two words or more; never the held, shaky, partial or hidden ones');
  assert.equal(regions[0].en, 'New Shoe Shop'); assert.equal(regions[0].translationSource, 'language-pack'); assert.equal(regions[2].en, 'Free Entry');
  regions = mk(); await translateMissingLines(regions, async () => ({ en: 'A new shoe shop', source: 'lesson-sentence' }));
  assert.equal(regions[0].translationSource, 'lesson-sentence'); assert.match(sourceLabel('lesson-sentence'), /lessons/);
  for (const answer of [async () => '', async () => null, async () => { throw new Error('not-loaded'); }]) {
    regions = mk(); assert.equal(await translateMissingLines(regions, answer), 0);
    assert.equal(regions[0].en, undefined, 'left for the dictionary, as before');
  }
});

test('held-out scores with the high-quality pack: the recorded lines add up, clear the bar of 80, and no direction is worse than with the ordinary pack', () => {
  // Recorded on 12 November 2026 with: node tools/talk/nmt/score.mjs tests/fixtures/talk.heldout.json --hq <packs dir> --out tests/fixtures/talk.heldout.results.hq.json
  // The pack itself is not in this repository (it lives on the pack host), so the lines are recorded and re-scored here.
  const heldout = json('tests/fixtures/talk.heldout.json'); const hq = json('tests/fixtures/talk.heldout.results.hq.json'); const std = json('tests/fixtures/talk.heldout.results.json');
  const byId = new Map(heldout.samples.map((x) => [x.id, x]));
  const rescore = (res) => summarize(res.rows.map((r) => { const x = byId.get(r.id); assert.equal(r.source, x.source); return { ...r, strict: r.ok ? strictScore(r.translation, x) : 0, accepted: r.ok ? acceptedScore(r.translation, x) : 0 }; }));
  const a = rescore(hq), b = rescore(std);
  assert.equal(hq.rows.length, heldout.samples.length);
  assert.equal(a.all.strict, hq.summary.all.strict); assert.equal(a.all.accepted, hq.summary.all.accepted); assert.equal(a.all.refused, 0);
  assert.ok(a.all.strict >= 80, `first-choice wording ${a.all.strict}`); assert.ok(a.all.accepted >= 95, `accepted wordings ${a.all.accepted}`);
  assert.ok(a['he-en'].strict > b['he-en'].strict && a['he-en'].accepted > b['he-en'].accepted, 'Hebrew to English is better with the high-quality pack');
  assert.ok(a['en-he'].strict >= b['en-he'].strict - 0.2 && a['en-he'].accepted >= b['en-he'].accepted - 0.2, 'English to Hebrew is the same pack as before');
  const idOrd = new Map(std.rows.map((r) => [r.id, r]));
  for (const r of hq.rows) if (r.direction === 'en-he') assert.equal(r.translation, idOrd.get(r.id).translation, r.id);
});

test('the worker, through its wrapper, loads the shipped Hebrew to English pack and answers like the scoring tool', async () => {
  // The browser worker run under Node: files come from disk in place of the pack cache, messages go through self.onmessage.
  const NMT = join(root, 'assets/vendor/_nmt'); const base = pathToFileURL(NMT).href + '/'; const ortBase = pathToFileURL(join(root, 'assets/vendor/_ort')).href + '/';
  const manifest = json('assets/vendor/_nmt/manifest.json');
  const store = createPackStore({ loader, base, cacheName: 'none', ortLocal: ortBase });
  const files = store.packFiles(manifest, 'he-en').map((f) => ({ ...f, path: f.key.startsWith(base) ? f.key.slice(base.length).replace(/\?.*$/, '') : f.key }));
  const posted = []; const g = /** @type {any} */ (globalThis); const keep = { self: g.self, fetch: g.fetch };
  g.self = { postMessage: (m) => posted.push(m) };
  g.fetch = async (u) => new Response(readFileSync(fileURLToPath(String(u).replace(/\?.*$/, ''))));
  try {
    await import('../src/talk/nmt/worker.js');
    assert.equal(typeof g.self.onmessage, 'function');
    const answer = async (n) => { for (let i = 0; i < 600 && posted.length < n; i++) await new Promise((r) => setTimeout(r, 50)); return posted[n - 1]; };
    // sent at once, before the vendored code has loaded: the wrapper holds the message and hands it on
    g.self.onmessage({ data: { type: 'load', id: 1, name: 'he-en', direction: 'he-en', pack: manifest.packs['he-en'], files, gpu: false, version: manifest.version, cache: 'none', ortBase } });
    const loaded = await answer(1);
    assert.equal(loaded.ok, true, loaded.error); assert.equal(loaded.info.engine, 'wasm');
    g.self.onmessage({ data: { type: 'translate', id: 2, name: 'he-en', direction: 'he-en', text: 'הכלב שלנו ברח אתמול.', beams: 2 } });
    const said = await answer(2);
    assert.equal(said.ok, true, said.error); assert.equal(said.text, 'Our dog ran off yesterday.');
    g.self.onmessage({ data: { type: 'translate', id: 3, name: 'en-he', direction: 'en-he', text: 'x' } });
    assert.equal((await answer(3)).ok, false, 'a pack that was never loaded does not answer');
  } finally { g.self = keep.self; g.fetch = keep.fetch; }
});
