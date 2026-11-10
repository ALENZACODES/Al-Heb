// Talk language pack: tokenizer, post-editing, the stored-lines-first path, the pack files and the held-out scores.
// Unit tier. The last tests run the shipped pack itself under Node with the vendored WebAssembly runtime (a few seconds).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createTokenizer, normalizeLine } from '../src/talk/nmt/tokenizer.js';
import { maskName, showsName, finishLine, applyTerms, NAME_SHOWN } from '../src/talk/nmt/postedit.js';
import { translateLine, FAST_PATH } from '../src/talk/hybrid.js';
import { packFiles, packState, downloadPack, megabytes, connectionKind, hasGraphics, PACK_CACHE, NMT_BASE } from '../src/talk/nmt/pack.js';
import { loadEngine } from '../src/talk/data.js';
import { strictScore, acceptedScore, summarize, openContractions } from '../tools/talk/nmt/scoring.mjs';
import { loadDirection, readManifest } from '../tools/talk/nmt/node-runtime.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const json = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));
const NMT = join(root, 'assets/vendor/_nmt');
const manifest = readManifest();
const terms = json('data/talk/terms.json');

test('tokenizer: the same piece ids as the reference tokenizer of each model', () => {
  const fx = json('tests/fixtures/talk.nmt.tokens.json');
  for (const d of ['he-en', 'en-he']) {
    const tok = createTokenizer(json(`assets/vendor/_nmt/${d}/vocab.json`));
    assert.ok(fx[d].length >= 100, `${d}: enough lines`);
    for (const [line, ids] of fx[d]) assert.deepEqual(tok.encode(line), ids, `${d}: ${line}`);
  }
});

test('tokenizer: vowel points, curly quotes and long dashes are cleaned before the line is split; decode drops the special ids', () => {
  assert.equal(normalizeLine('שָׁלוֹם  עֲלֵיכֶם'), 'שלום עליכם');
  assert.equal(normalizeLine('“It’s” — fine…'), '"It\'s" - fine...');
  const v = json('assets/vendor/_nmt/he-en/vocab.json'); const tok = createTokenizer(v);
  assert.deepEqual(tok.encode('שָׁלוֹם'), tok.encode('שלום'));
  assert.deepEqual(tok.encode(''), [v.eos]);
  const ids = tok.encode('שלום עולם');
  assert.equal(ids[ids.length - 1], v.eos);
  assert.equal(tok.decode([...ids, v.pad]), 'שלום עולם');
});

test('the Name: shown as ה׳ wherever it would appear, with its prefix kept, and such a line is never handed to a voice', () => {
  const name = 'יהוה';
  assert.equal(maskName(`ברוך אתה ${name}`), `ברוך אתה ${NAME_SHOWN}`);
  assert.equal(maskName(`הודו ל${name} כי טוב`), `הודו ל${NAME_SHOWN} כי טוב`);
  assert.equal(maskName('Praise Yahweh today'), `Praise ${NAME_SHOWN} today`);
  assert.equal(maskName('Jehovah is one'), `${NAME_SHOWN} is one`);
  assert.equal(maskName('שלום עולם'), 'שלום עולם');
  for (const s of [`ברוך ${name}`, `ברוך ${NAME_SHOWN}`, "ברוך ה'", `ל${NAME_SHOWN} הארץ`, 'YHWH']) assert.equal(showsName(s), true, s);
  for (const s of ['שלום עולם', 'הוא הלך הביתה', 'the house', 'זה היה טוב']) assert.equal(showsName(s), false, s);
  assert.equal(finishLine(`- ${name} is my shepherd`.replace(name, 'Yahweh'), 'x', 'he-en'), `${NAME_SHOWN} is my shepherd`);
  assert.equal(finishLine(`ברוך ${name}`, 'Blessed is the Lord', 'en-he'), `ברוך ${NAME_SHOWN}`);
});

test('post-editing: a stray subtitle dash goes; a listed synagogue word is fixed only when the source holds it', () => {
  assert.equal(finishLine('- need a dome to get in?', 'צריך כיפה כדי להיכנס?', 'he-en', terms), 'Need a kippah to get in?');
  assert.equal(applyTerms('The dome is gold.', 'הבניין גבוה.', 'he-en', terms), 'The dome is gold.');
  assert.equal(applyTerms('The sanctification will be in the hall.', 'הקידוש יהיה באולם.', 'he-en', terms), 'The kiddush will be in the hall.');
  assert.equal(applyTerms('איפה ספר התפילה?', 'Where is the prayer book?', 'en-he', terms), 'איפה סידור?'.replace('סידור', 'סידור'));
  assert.equal(applyTerms('איפה הספר?', 'Where is the book?', 'en-he', terms), 'איפה הספר?');
  for (const t of terms.terms) for (const he of t.he) assert.ok(!['חלה', 'סידור', 'סוכות', 'מניין', 'מקווה', 'רב', 'שבת', 'סדר', 'הגדה'].includes(he), `${he} has a second everyday meaning and must not be listed`);
});

test('stored lines answer first; the pack answers the rest; without the pack the result says which pack would', async () => {
  const engine = await loadEngine(); await engine.loadDictionary();
  const calls = [];
  const pack = { ready: (d) => d === 'he-en', translate: async (d, t) => { calls.push([d, t]); return 'Our dog ran off yesterday.'; } };
  const stored = await translateLine(engine, pack, 'Where is the hotel?', { direction: 'en-he' });
  assert.ok(FAST_PATH.has(stored.method)); assert.equal(calls.length, 0, 'a stored line never goes to the pack');
  const fresh = await translateLine(engine, pack, 'הכלב שלנו ברח אתמול.', { direction: 'he-en' });
  assert.equal(fresh.method, 'model'); assert.equal(fresh.ok, true); assert.equal(fresh.translation, 'Our dog ran off yesterday.'); assert.match(fresh.note, /not from a checked line/);
  const other = await translateLine(engine, pack, 'Our dog ran away yesterday.', { direction: 'en-he' });
  assert.equal(other.needsPack, 'en-he'); assert.notEqual(other.method, 'model');
  const none = await translateLine(engine, null, 'הכלב שלנו ברח אתמול.', { direction: 'he-en' });
  assert.equal(none.needsPack, 'he-en');
  const held = await translateLine(engine, pack, 'ברוך יהוה', { direction: 'he-en' });
  assert.equal(held.held, true); assert.equal(held.translation, ''); assert.equal(calls.length, 1, 'a line that holds the Name never goes to the pack');
  const named = await translateLine(engine, { ready: () => true, translate: async () => 'Yahweh is good to the dog' }, 'הכלב שלנו ברח אתמול.', { direction: 'he-en' });
  assert.equal(named.translation, `${NAME_SHOWN} is good to the dog`); assert.equal(showsName(named.translation), true);
  const broken = await translateLine(engine, { ready: () => true, translate: async () => { throw new Error('x'); } }, 'הכלב שלנו ברח אתמול.', { direction: 'he-en' });
  assert.equal(broken.packFailed, true);
});

test('pack files: every part is on disk with the size and SHA-256 the manifest names, no part is over 16 MiB, each pack is under 85 MiB', () => {
  assert.deepEqual(Object.keys(manifest.packs).sort(), ['en-he', 'he-en']);
  for (const [d, pack] of Object.entries(manifest.packs)) {
    assert.match(pack.licence, /Apache-2\.0/); assert.ok(pack.model.length > 5);
    assert.ok(pack.bytes < 85 * 1048576, `${d} is ${megabytes(pack.bytes)} MB`);
    for (const f of pack.files) {
      const whole = createHash('sha256');
      for (const p of f.parts) {
        const buf = readFileSync(join(NMT, p.path));
        assert.equal(buf.length, p.bytes, p.path); assert.ok(buf.length <= 16 * 1048576, p.path);
        assert.equal(createHash('sha256').update(buf).digest('hex'), p.sha256, p.path);
        whole.update(buf);
      }
      assert.equal(whole.digest('hex'), f.sha256, `${d}/${f.name}`);
    }
  }
  for (const f of manifest.runtime.files) { const buf = readFileSync(join(NMT, manifest.runtime.base, f.path)); assert.equal(createHash('sha256').update(buf).digest('hex'), f.sha256, f.path); }
});

test('pack files carry no producer, tool or author notes', () => {
  for (const d of ['he-en', 'en-he']) for (const f of ['table', 'encoder', 'decoder']) {
    const head = readFileSync(join(NMT, d, `${f}.p0.bin`)).subarray(0, 4096).toString('latin1');
    assert.doesNotMatch(head, /pytorch|onnx\.quantize|optimum|producer/i, `${d}/${f}`);
  }
});

test('nothing of the pack is in the first install, and the service worker keeps it out of the per-version cache', () => {
  const pre = readFileSync(join(root, 'precache-manifest.js'), 'utf8');
  const installed = JSON.parse(/self\.ALEF_PRECACHE\s*=\s*(\[[\s\S]*?\]);/.exec(pre)[1]);
  assert.ok(installed.length > 100);
  for (const f of installed) { assert.ok(!f.startsWith('assets/vendor/'), f); assert.ok(!f.startsWith('src/talk/'), f); }
  assert.ok(!/_nmt|_ort/.test(pre), 'the packs and their runtime are not even listed for "Download everything"');
  const sw = readFileSync(join(root, 'sw.js'), 'utf8');
  assert.match(sw, /assets\\\/vendor\\\/_\(nmt\|ort\)/);
  assert.equal(PACK_CACHE, 'alef-talk-pack-v1');
});

function fakeCaches() {
  const stores = new Map();
  const open = async (name) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const m = stores.get(name);
    return { match: async (k) => m.get(typeof k === 'string' ? k : k.url) || null, put: async (k, res) => { m.set(k, res); }, keys: async () => [...m.keys()].map((url) => ({ url })), delete: async (k) => m.delete(typeof k === 'string' ? k : k.url) };
  };
  return { open, delete: async (name) => stores.delete(name), stores };
}

test('download: part by part with rising progress, a wrong part is refused and not kept, a second call fetches only what is missing', async () => {
  const sha = (s) => createHash('sha256').update(s).digest('hex');
  const body = { a: 'aaaaaaaa', b: 'bbbbbbbbbbbb', rt: 'runtime' };
  const mini = { runtime: { base: '../_ort/', files: [{ path: 'rt.wasm', bytes: 7, sha256: sha(body.rt) }] }, packs: { 'he-en': { direction: 'he-en', files: [{ name: 'table.onnx', parts: [{ path: 'he-en/a.bin', bytes: 8, sha256: sha(body.a) }, { path: 'he-en/b.bin', bytes: 12, sha256: sha(body.b) }] }] } } };
  const files = packFiles(mini, 'he-en');
  assert.equal(files.length, 3); assert.ok(files.every((f) => f.url.includes('?v=')), 'every fetch address carries the content hash');
  assert.ok(files[1].key.startsWith(NMT_BASE));
  const caches = fakeCaches(); const fetched = []; let corrupt = true;
  const fetch = async (url) => { fetched.push(url); const k = url.includes('a.bin') ? 'a' : url.includes('b.bin') ? 'b' : 'rt'; const text = k === 'b' && corrupt ? 'bbbbbbbbbbbX' : body[k]; return new Response(text); };
  assert.deepEqual(await packState(mini, 'he-en', { caches }), { ready: false, gpu: false, have: 0, total: 27, missing: 27 });
  const seen = [];
  await assert.rejects(downloadPack(mini, 'he-en', { caches, fetch, subtle: globalThis.crypto.subtle, onProgress: (h) => seen.push(h) }), /hash-mismatch/);
  assert.deepEqual((await packState(mini, 'he-en', { caches })).have, 15, 'the two good files are kept, the bad part is not');
  corrupt = false; fetched.length = 0;
  const done = await downloadPack(mini, 'he-en', { caches, fetch, subtle: globalThis.crypto.subtle, onProgress: (h) => seen.push(h) });
  assert.equal(done.ready, true); assert.equal(fetched.length, 1, 'only the missing part is fetched again');
  assert.equal(seen[seen.length - 1], 27);
  assert.equal((await packState(mini, 'he-en', { caches })).ready, true);
  assert.equal(connectionKind({ connection: { type: 'cellular' } }), 'cellular'); assert.equal(connectionKind({ connection: { saveData: true } }), 'saver'); assert.equal(connectionKind({}), '');
});

test('screen copy: the pack is offered in plain words, with its size left to the manifest, a Wi-Fi line and no talk of how it was made', async () => {
  const v = await import('../src/talk/talk.view.js');
  assert.match(v.PACK_LEAD, /Wi-Fi/); assert.match(v.PACK_LEAD, /on this device/); assert.match(v.PACK_LEAD, /sends nothing anywhere/);
  assert.match(v.HELD_LINE, /ה׳/); assert.match(v.NAME_NOT_READ, /not read aloud/);
  const h = await import('../src/talk/hybrid.js');
  for (const s of [v.PACK_LEAD, v.PACK_OFFER, v.PACK_CELLULAR, v.PACK_SAVER, v.PACK_FULL, v.PACK_FAILED, v.PACK_CANNOT_RUN, v.PACK_NONE, v.METHOD_LABEL.model, h.MODEL_NOTE_EN, h.MODEL_NOTE_HE])
    assert.doesNotMatch(s, /\bA\.?I\.?\b|artificial|neural|machine|\bmodel\b|\bbot\b|GPT|LLM/i, s);
});

const heldout = json('tests/fixtures/talk.heldout.json');
const results = json('tests/fixtures/talk.heldout.results.json');

test('held-out file: at least 200 lines, 100 each way, none of them in the older Talk test files', () => {
  const S = heldout.samples;
  assert.ok(S.length >= 200); assert.equal(new Set(S.map((s) => s.id)).size, S.length); assert.equal(new Set(S.map((s) => s.source)).size, S.length);
  for (const d of ['en-he', 'he-en']) assert.ok(S.filter((s) => s.direction === d).length >= 100, d);
  const old = new Set();
  for (const f of ['talk.fresh.json', 'talk.fresh2.json', 'talk.fresh3.json', 'talk.utterances.json']) for (const s of json(`tests/fixtures/${f}`).samples) old.add(s.source.trim().toLowerCase());
  for (const s of S) assert.ok(!old.has(s.source.trim().toLowerCase()), `${s.id} is in an older file`);
});

test('held-out scores: the recorded results add up, and stay at or above the recorded floor', () => {
  assert.equal(results.rows.length, heldout.samples.length);
  const byId = new Map(heldout.samples.map((s) => [s.id, s]));
  const rows = results.rows.map((r) => { const s = byId.get(r.id); assert.equal(r.source, s.source); return { ...r, strict: r.ok ? strictScore(r.translation, s) : 0, accepted: r.ok ? acceptedScore(r.translation, s) : 0 }; });
  const sum = summarize(rows);
  assert.equal(sum.all.strict, results.summary.all.strict); assert.equal(sum.all.accepted, results.summary.all.accepted);
  assert.equal(sum.all.refused, 0);
  assert.ok(sum.all.accepted >= 92, `accepted wordings ${sum.all.accepted}`);
  assert.ok(sum.all.strict >= 74, `first-choice wording ${sum.all.strict}`);
  assert.equal(openContractions("Where's the bus? I don't know."), 'where is the bus? i do not know.');
});

test('the shipped pack itself: loads under the vendored runtime and gives the recorded line for a sample of the held-out file', async () => {
  const want = results.rows.filter((r) => r.method === 'model');
  for (const d of ['he-en', 'en-he']) {
    const rt = await loadDirection(d);
    const pick = want.filter((r) => r.direction === d).filter((_, i) => i % 17 === 0).slice(0, 6);
    assert.ok(pick.length >= 5);
    for (const r of pick) assert.equal(finishLine(await rt.translate(r.source, { beams: 2 }), r.source, d, terms), r.translation, r.source);
    assert.equal(await rt.translate('', {}), '');
  }
});

test('graphics-card files: two small graphs per direction that hold no weights, a runtime in parts under 16 MiB, and the same pack parts either way', () => {
  assert.ok(manifest.gpuRuntime.files.every((f) => f.bytes <= 16 * 1048576));
  for (const f of manifest.gpuRuntime.files) assert.equal(createHash('sha256').update(readFileSync(join(NMT, manifest.gpuRuntime.base, f.path))).digest('hex'), f.sha256, f.path);
  for (const d of ['he-en', 'en-he']) {
    const pack = manifest.packs[d];
    assert.deepEqual(pack.gpu.map((g) => g.name), ['encoder.gpu.onnx', 'decoder.gpu.onnx']);
    for (const g of pack.gpu) { assert.ok(g.bytes < 300 * 1024, `${g.name} is wiring only (${g.bytes} bytes)`); assert.equal(createHash('sha256').update(readFileSync(join(NMT, g.parts[0].path))).digest('hex'), g.sha256); }
    assert.equal(pack.probe.length, 2);
    const plain = packFiles(manifest, d); const fast = packFiles(manifest, d, { gpu: true });
    const parts = (l) => l.filter((f) => /\.p\d+\.bin\?|vocab\.json/.test(f.key) && f.key.includes('/_nmt/')).map((f) => f.key);
    assert.deepEqual(parts(fast), parts(plain), 'no second copy of the weights');
    assert.ok(fast.some((f) => /ort\.webgpu\.min\.mjs$/.test(f.key)) && !fast.some((f) => /ort\.wasm\.min\.mjs$/.test(f.key)));
    const extra = fast.reduce((a, f) => a + f.bytes, 0) - plain.reduce((a, f) => a + f.bytes, 0);
    assert.ok(extra < 16 * 1048576, `the graphics-card set costs ${megabytes(extra)} MB more, all of it runtime`);
  }
});

test('a software stand-in for a graphics card does not count as one; no adapter, no graphics', async () => {
  assert.equal(await hasGraphics({}, false), false);
  assert.equal(await hasGraphics({ gpu: { requestAdapter: async () => null } }, false), false);
  assert.equal(await hasGraphics({ gpu: { requestAdapter: async () => ({ info: { architecture: 'swiftshader' } }) } }, false), false);
  assert.equal(await hasGraphics({ gpu: { requestAdapter: async () => ({ isFallbackAdapter: true, info: {} }) } }, false), false);
  assert.equal(await hasGraphics({ gpu: { requestAdapter: async () => ({ info: { architecture: 'gen-12lp', vendor: 'intel' } }) } }, false), true);
  assert.equal(await hasGraphics({ gpu: { requestAdapter: async () => { throw new Error('x'); } } }, false), false);
});

test('the graphics-card graphs, run on the processor: they read their weights from the 8-bit files and give the recorded check lines', async () => {
  for (const d of ['he-en', 'en-he']) {
    const rt = await loadDirection(d, 'float');
    for (const p of manifest.packs[d].probe) assert.equal(await rt.translate(p.text, { beams: 2 }), p.expect, p.text);
  }
});

test('a deploy built without the packs leaves out pack data only; the pack host is named once, allowed for reading data, never for scripts', async () => {
  const { isPackData } = await import('../tools/deploy/make-dist.mjs');
  for (const f of ['assets/vendor/_nmt/manifest.json', 'assets/vendor/_nmt/he-en/table.p0.bin', 'assets/vendor/_ort/ort-wasm-simd-threaded.wasm', 'assets/vendor/_ort/ort-wasm-simd-threaded.asyncify.p1.bin']) assert.equal(isPackData(f), true, f);
  for (const f of ['assets/vendor/_ort/ort.wasm.min.mjs', 'assets/vendor/_ort/ort.webgpu.min.mjs', 'assets/vendor/_tesseract/heb.traineddata', 'src/talk/nmt/pack.js', 'data/talk/pack-host.json']) assert.equal(isPackData(f), false, f);
  const hosts = json('data/talk/pack-host.json').hosts;
  assert.equal(hosts.length, 1); assert.match(hosts[0], /^https:\/\/alenzacodes\.github\.io\/alef-packs\/_nmt\/$/);
  const csp = /Content-Security-Policy:\s*(.+)/.exec(readFileSync(join(root, '_headers'), 'utf8'))[1];
  assert.match(/connect-src ([^;]*)/.exec(csp)[1], /https:\/\/alenzacodes\.github\.io/);
  assert.match(csp, /script-src 'self' 'wasm-unsafe-eval';/, 'scripts still come from the site only');
  const files = packFiles({ ...manifest, base: hosts[0] }, 'he-en');
  for (const f of files) assert.equal(f.key.startsWith(hosts[0].replace('_nmt/', '')), !/\.mjs$/.test(f.key), f.key);
});
