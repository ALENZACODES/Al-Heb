// Letter check for the tracing screens and the photo-text tidy-up: vendored tools, the pack, the hooks.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { createHash, webcrypto } from 'node:crypto';
import vm from 'node:vm';
import { check as checkVendored } from '../tools/alef-tools/sync.mjs';
import * as pack from '../src/handcheck/pack.js';
import { HANDWRITING, OCR_FIX, OCR_WORDS } from '../src/handcheck/tools.js';
import { loadChecker, forgetChecker, hintFor, familyHeights, attach } from '../src/handcheck/hook.js';
import { loadFix, fixRegions } from '../src/handcheck/ocr-fix.js';
import { runPipeline } from '../src/photo/pipeline.js';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root));
const lock = JSON.parse(read('data/alef-tools.lock.json'));
const letters = JSON.parse(read('data/letters/letters.json'));
const sha = (b) => createHash('sha256').update(b).digest('hex');

// A stand-in for Cache Storage and fetch that serves the repo's own files.
function fakeEnv({ serve = true } = {}) {
  const stores = new Map(); const fetched = [];
  const open = async (name) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const m = stores.get(name);
    return { match: async (k) => { const r = m.get(String(k.url || k)); return r ? r.clone() : undefined; }, put: async (k, res) => { m.set(String(k.url || k), res); }, keys: async () => [...m.keys()].map((url) => ({ url })), delete: async (k) => m.delete(String(k.url || k)) };
  };
  const fetchImpl = async (url) => {
    const u = String(url).split('?')[0]; fetched.push(u);
    if (!serve || !u.startsWith('file:') || !existsSync(new URL(u))) return new Response('', { status: 404 });
    return new Response(readFileSync(new URL(u)), { status: 200 });
  };
  return { caches: { open, delete: async (n) => stores.delete(n) }, fetch: fetchImpl, subtle: webcrypto.subtle, fetched, stores };
}

test('vendored alef-tools files match the lock, and the paths the app uses match the lock', () => {
  assert.deepEqual(checkVendored(), []);
  assert.match(lock.ref, /^[0-9a-f]{40}$/);
  assert.ok(HANDWRITING.endsWith(lock.packages.handwriting.path + '/'));
  assert.ok(OCR_FIX.endsWith(lock.packages['ocr-fix'].path + '/'));
  assert.ok(existsSync(new URL(OCR_WORDS)));
});

test('nothing from this feature is in the first install except the two small hooks', () => {
  const self = {}; vm.runInNewContext(read('precache-manifest.js').toString(), { self });
  const pre = self.ALEF_PRECACHE;
  assert.equal(pre.filter((u) => /handcheck|_alef-tools|_packs|alef-tools\.lock|ocr-fix/.test(u)).join(' '), '');
  for (const f of ['src/handcheck/hook.js', 'src/handcheck/pack.js', 'src/handcheck/tools.js', 'src/handcheck/ocr-fix.js']) assert.ok(self.ALEF_ON_DEMAND.includes(f), f);
  const bytes = pre.reduce((a, u) => a + statSync(new URL(u, root)).size, 0);
  assert.ok(bytes < 3.95 * 1048576, `first install is ${bytes} bytes`);
});

test('the pack list: right format, every part at most 16 MiB, whole pack at most 2 MiB, hashes true', () => {
  const list = JSON.parse(read('assets/vendor/_packs/handwriting/pack.json'));
  assert.equal(list.schema, 'alef.pack.v1'); assert.equal(list.pack, 'handwriting');
  let total = 0;
  for (const f of list.files) for (const p of f.parts) {
    const b = read('assets/vendor/_packs/handwriting/' + p.path);
    assert.ok(p.bytes <= pack.MAX_PART_BYTES); assert.equal(b.length, p.bytes); assert.equal(sha(b), p.sha256); total += b.length;
  }
  assert.ok(total <= 2 * 1048576, `pack is ${total} bytes`);
  assert.equal(pack.megabytes(total), '1.3');
  const model = read('assets/vendor/_packs/handwriting/letters.onnx.p000').toString('latin1');
  assert.ok(!/pytorch|onnxruntime|producer|torch/i.test(model.slice(0, 4000)), 'no producer or tool notes in the model file');
});

test('pack: nothing is fetched until asked; download checks every part; a damaged part is not kept; remove works', async () => {
  const env = fakeEnv();
  const list = await pack.loadList(env);
  assert.deepEqual(await pack.state(list, env), { ready: false, have: 0, total: pack.totalBytes(list), storage: true });
  assert.equal(env.fetched.filter((u) => /\.p\d+$/.test(u)).length, 0, 'looking at the pack does not download it');
  forgetChecker();
  assert.equal(await loadChecker(env), null, 'no pack on the device: no checker, and still no download');
  assert.equal(env.fetched.filter((u) => /\.p\d+$/.test(u)).length, 0);
  // a damaged download
  const bad = { ...env, fetch: async (u) => (/letters\.onnx\.p000/.test(String(u)) ? new Response(new Uint8Array(1311488), { status: 200 }) : env.fetch(u)) };
  await assert.rejects(() => pack.download(list, bad), (e) => e.code === 'hash-mismatch');
  assert.equal((await pack.state(list, env)).ready, false);
  const short = { ...env, fetch: async (u) => (/letters\.onnx\.p000/.test(String(u)) ? new Response(new Uint8Array(10), { status: 200 }) : env.fetch(u)) };
  await assert.rejects(() => pack.download(list, short), (e) => e.code === 'size-mismatch');
  // the real thing
  const seen = [];
  await pack.download(list, { ...env, onProgress: (have, total) => seen.push(have / total) });
  assert.equal(seen[seen.length - 1], 1);
  assert.equal((await pack.state(list, env)).ready, true);
  assert.ok(env.stores.has('alef-pack-handwriting-v1'));
  const n = env.fetched.length; await pack.download(list, env); assert.equal(env.fetched.length, n, 'a second download fetches nothing');
  assert.equal(sha(await pack.readFile(list, 'letters.onnx', env)), list.files.find((f) => f.name === 'letters.onnx').sha256);
  // offline: the kept list still works
  const offline = { ...env, fetch: async () => { throw new Error('offline'); } };
  assert.equal((await pack.state(await pack.loadList(offline), offline)).ready, true);
  await pack.remove(env);
  assert.equal((await pack.state(list, env)).ready, false);
});

const strokesOf = (id, script) => letters.find((l) => l.id === id)[script].strokes.map((s) => s.median);

test('the checker reads the app\'s own letter models: every print and cursive letter, drawn as its model, is not called another letter', async () => {
  const env = fakeEnv(); const list = await pack.loadList(env); await pack.download(list, env);
  forgetChecker(); const api = await loadChecker(env);
  assert.ok(api); assert.equal(api.backend, 'built-in');
  let match = 0, quiet = 0; const wrong = [];
  for (const script of ['print', 'cursive']) for (const L of letters) {
    if (!L[script]?.strokes?.length) continue;
    const drawn = strokesOf(L.id, script);
    const r = await api.checkStrokes(drawn, { targetId: L.id, script, strokeWidth: L[script].strokeWidth, heights: familyHeights(letters, script) });
    if (r.verdict === 'match') match++; else if (r.verdict === 'unsure') quiet++; else wrong.push(`${script} ${L.id}: ${r.verdict} ${r.looksLike || ''}`);
    assert.equal(await hintFor(api, { strokes: drawn, letter: L, script, letters, done: true }), r.verdict === 'looks-like' || r.verdict === 'close' ? r.text : '');
  }
  console.log(`letter models read as themselves: ${match}; nothing said: ${quiet}; called something else: ${wrong.length}${wrong.length ? ' (' + wrong.join('; ') + ')' : ''}`);
  assert.deepEqual(wrong, [], 'a correctly drawn letter must never be "corrected"');
  assert.ok(match >= 45, `only ${match} of 54 recognised`);
  forgetChecker();
});

test('a look-alike drawing gets one kind tip; a scribble gets a nudge only while drawing', async () => {
  const env = fakeEnv(); const list = await pack.loadList(env); await pack.download(list, env);
  forgetChecker(); const api = await loadChecker(env);
  const dalet = letters.find((l) => l.id === 'dalet'); const he = letters.find((l) => l.id === 'he');
  const asResh = await hintFor(api, { strokes: strokesOf('resh', 'print'), letter: dalet, script: 'print', letters, done: true });
  assert.match(asResh, /Resh \(ר\)/); assert.match(asResh, /corner/);
  const asChet = await hintFor(api, { strokes: strokesOf('chet', 'print'), letter: he, script: 'print', letters, done: true });
  assert.match(asChet, /Chet \(ח\)/); assert.match(asChet, /gap at the top left/);
  // vav drawn at yod height: size decides
  const tiny = strokesOf('vav', 'print').map((s) => s.map(([x, y]) => [x, 200 + (y - 200) * 0.38]));
  const short = await hintFor(api, { strokes: tiny, letter: letters.find((l) => l.id === 'vav'), script: 'print', letters, done: true });
  assert.match(short, /Yod/);
  const scribble = [Array.from({ length: 60 }, (_, i) => [500 + 300 * Math.sin(i * 1.7) * Math.cos(i * 0.3), 500 + 300 * Math.cos(i * 2.3)])];
  assert.equal(await hintFor(api, { strokes: scribble, letter: dalet, script: 'print', letters, done: true }), '', 'after the tracer accepted the letter a scribble warning would only confuse');
  for (const text of [asResh, asChet, short]) assert.ok(!/\b(AI|model|algorithm|neural|machine|classifier)\b/i.test(text), text);
  forgetChecker();
});

// A tiny DOM stand-in: enough for attach().
function el(tag, attrs, ...kids) {
  const node = { tag, attrs: { ...attrs }, kids: [], textContent: '', appendChild(k) { this.kids.push(k); return k; }, replaceChildren(...k) { this.kids = k; }, setAttribute(k, v) { this.attrs[k] = v; }, removeAttribute(k) { delete this.attrs[k]; } };
  for (const k of kids.flat()) if (k != null) node.kids.push(typeof k === 'string' ? { text: k } : k);
  return node;
}
const textOf = (n) => (n.text ?? '') + (n.textContent || '') + (n.kids || []).map(textOf).join('');
const find = (n, act) => (n.attrs?.['data-act'] === act ? n : (n.kids || []).map((k) => find(k, act)).find(Boolean));

test('tracing screen row: offers the pack with its size, downloads only on the tap, then can remove it', async () => {
  const env = fakeEnv(); forgetChecker();
  const host = el('div', {});
  const hand = attach({ host, h: el, letters, env });
  await hand.ready;
  const row = host.kids[0];
  assert.match(textOf(row), /Get the letter check \(1\.3 MB\)/);
  assert.match(textOf(row), /kept on this device/);
  assert.ok(!/\b(AI|model|neural|machine)\b/i.test(textOf(row)));
  assert.equal(env.fetched.filter((u) => /\.p\d+$/.test(u)).length, 0);
  const fb = el('div', {}); fb.textContent = 'Done.';
  await hand.check({ strokes: strokesOf('resh', 'print'), letter: letters.find((l) => l.id === 'dalet'), script: 'print', fb, done: true });
  assert.equal(fb.textContent, 'Done.', 'without the pack nothing is said');
  await find(row, 'hand-get').attrs.onclick();
  assert.match(textOf(row), /Letter check is on/);
  await hand.check({ strokes: strokesOf('resh', 'print'), letter: letters.find((l) => l.id === 'dalet'), script: 'print', fb, done: true });
  assert.match(fb.textContent, /^Done\. This looks more like Resh/);
  await find(row, 'hand-remove').attrs.onclick();
  assert.match(textOf(row), /Get the letter check/);
  assert.equal(env.stores.has('alef-pack-handwriting-v1'), false);
  forgetChecker();
});

test('photo word list: under 1 MiB, never holds the Name, and the tidy-up loads from the site only', async () => {
  const raw = read('assets/vendor/_packs/ocr-words/lexicon.json');
  assert.ok(raw.length <= 1048576);
  const lex = JSON.parse(raw); const words = lex.words.split('\n');
  assert.equal(lex.schema, 'alef.ocr-lexicon.v1'); assert.equal(words.length, lex.count);
  assert.ok(!words.some((w) => w.endsWith('יהוה')));
  const env = fakeEnv();
  const fix = await loadFix({ fetch: env.fetch });
  assert.ok(fix && fix.size === words.length);
  assert.ok(env.fetched.every((u) => u.startsWith('file:')), 'no request leaves the site');
  assert.equal((await fix.correctLine('סגוד', { confs: [40] })).text, 'סגור');
  assert.equal((await fix.correctLine('סגוד', { confs: [95] })).text, 'סגוד');
  assert.equal(fix.showName('ברוך אתה יהוה'), 'ברוך אתה ה׳');
  assert.equal(await loadFix({ fetch: async () => new Response('', { status: 404 }) }), null, 'no word list: the step is skipped, not an error');
});

test('camera step: only unsure, untranslated, fully read lines are tidied; sacred and partly read lines are never touched', async () => {
  const fix = await loadFix({ fetch: fakeEnv().fetch });
  const glossary = { translate: (he) => (he === 'סגור' ? { en: 'Closed', status: 'exact', translit: 'sagur', pointed: 'סָגוּר' } : { en: null }) };
  const regions = [
    { id: 'r1', he: 'סגוד', conf: 55, held: false, en: null, partial: false },
    { id: 'r2', he: null, conf: 50, held: true, en: null },
    { id: 'r3', he: 'סגוד', conf: 55, held: false, en: null, partial: true },
    { id: 'r4', he: 'סגוד', conf: 96, held: false, en: null, partial: false },
    { id: 'r5', he: 'פתוח', conf: 55, held: false, en: 'Open', partial: false },
  ];
  assert.equal(await fixRegions(regions, glossary, fix), 1);
  assert.deepEqual([regions[0].he, regions[0].heRead, regions[0].en, regions[0].translationSource], ['סגור', 'סגוד', 'Closed', 'word-list']);
  assert.equal(regions[1].he, null); assert.equal(regions[2].he, 'סגוד'); assert.equal(regions[3].he, 'סגוד'); assert.equal(regions[4].heRead, undefined);
  assert.equal(await fixRegions(regions, glossary, null), 0);
});

test('photo pipeline: the optional tidy-up step runs after the reader; if it fails the photo is read as before', async () => {
  const ocr = async () => [{ text: 'סגוד', x: 0, y: 0, w: 50, h: 20, conf: 40 }];
  const a = await runPipeline({}, { ocr, correct: async (boxes) => boxes.map((b) => ({ ...b, text: 'סגור', raw: b.text })) }, { mode: 'sign' });
  assert.equal(a.lines[0].ocrText, 'סגור');
  const b = await runPipeline({}, { ocr, correct: async () => { throw new Error('gone'); } }, { mode: 'sign' });
  assert.equal(b.lines[0].ocrText, 'סגוד'); assert.ok(b.warnings.some((w) => /tidy-up skipped/.test(w)));
  const c = await runPipeline({}, { ocr }, { mode: 'sign' });
  assert.equal(c.lines[0].ocrText, 'סגוד');
});

test('photo reader: the Name read from a photo is shown as ה׳, prefix letters kept', async () => {
  const { shownHebrew } = await import('../src/photo/scan.view.js');
  assert.equal(shownHebrew('יְבָרֶכְךָ יְהוָה וְיִשְׁמְרֶךָ'), 'יְבָרֶכְךָ ה׳ וְיִשְׁמְרֶךָ');
  assert.equal(shownHebrew('ליהוה'), 'לה׳');
  assert.equal(shownHebrew('שלום יהודה'), 'שלום יהודה');
});

test('the new code talks to nothing but the site itself, and keeps only the pack', () => {
  for (const f of ['src/handcheck/hook.js', 'src/handcheck/pack.js', 'src/handcheck/tools.js', 'src/handcheck/ocr-fix.js']) {
    const src = read(f).toString(); const code = src.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    assert.ok(!/https?:\/\//i.test(code), `${f}: no address of any kind in the code`);
    assert.ok(!/XMLHttpRequest|sendBeacon|WebSocket|EventSource|navigator\.share|method\s*:/.test(code), `${f}: nothing is sent anywhere`);
    assert.ok(!/localStorage|sessionStorage|indexedDB|document\.cookie/.test(code), `${f}: nothing is stored except the pack in its own cache`);
    assert.ok(!/innerHTML|outerHTML|insertAdjacentHTML|document\.write|\beval\(|new Function/.test(src), `${f}: no HTML strings`);
    assert.ok(!/Notification|torch|serviceWorker|setInterval/.test(code), `${f}: no notifications, torch or background work`);
    assert.ok(!src.includes('יהוה'), `${f}: the Name is never written out`);
  }
});
