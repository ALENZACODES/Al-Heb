import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { autoNormalize, normalizeContrast, contrastSpan, targetSize, boxBlur } from '../src/photo/preprocess.js';
import { wordsFromData, createBrowserTesseract } from '../src/photo/engines/tesseract-browser.js';
import { createLocalServer } from '../src/photo/engines/local-server.js';
import { createPhotoEngines } from '../src/photo/engines/index.js';
import { createLane3ShvaClassifier, loadLane3Shva, syllabifyWord } from '../src/photo/syllabify.js';
import { runPipeline } from '../src/photo/pipeline.js';

test('preprocess: low-contrast image is stretched, good-contrast image is left alone, polarity kept', () => {
  const mk = (lo, hi, w = 60, h = 20) => { const d = new Uint8ClampedArray(w * h * 4); for (let i = 0; i < w * h; i++) { const v = (i % w) % 10 < 3 ? lo : hi; d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255; } return { data: d, width: w, height: h }; };
  const low = mk(140, 190); assert.ok(contrastSpan(low) < 110);
  const r = autoNormalize(low); assert.equal(r.applied, true);
  const d = low.data; assert.ok(Math.max(...d.filter((_, i) => i % 4 === 0)) - Math.min(...d.filter((_, i) => i % 4 === 0)) > 150);
  assert.ok(d[0] < d[3 * 4]); // dark pixels (x%10<3) stay darker than light ones
  const good = mk(10, 240); const copy = Uint8ClampedArray.from(good.data);
  assert.equal(autoNormalize(good).applied, false); assert.deepEqual(good.data, copy);
  assert.deepEqual(targetSize(4000, 3000, { maxSide: 2000 }), { width: 2000, height: 1500, scale: 0.5 });
  assert.equal(targetSize(100, 50).scale, 1);
  const flat = boxBlur(new Float32Array([1, 1, 1, 1]), 2, 2, 1); assert.ok([...flat].every((x) => Math.abs(x - 1) < 1e-6));
});

test('tesseract-browser: wordsFromData handles v7 blocks and legacy words; adapter runs against an injected fake module', async () => {
  const bb = (x0, y0, x1, y1) => ({ x0, y0, x1, y1 });
  assert.deepEqual(wordsFromData({ blocks: [{ paragraphs: [{ lines: [{ words: [{ text: ' שלום ', bbox: bb(10, 5, 60, 25), confidence: 91 }, { text: ' ', bbox: bb(0, 0, 1, 1) }] }] }] }] }),
    [{ text: 'שלום', x: 10, y: 5, w: 50, h: 20, conf: 91 }]);
  assert.equal(wordsFromData({ words: [{ text: 'א', bbox: bb(0, 0, 4, 4), confidence: 1 }] }).length, 1);
  const calls = [];
  const fake = { createWorker: async (lang, oem, opts) => { calls.push({ lang, oem, opts }); return { setParameters: async () => {}, recognize: async () => ({ data: { words: [] } }), terminate: async () => {} }; } };
  const eng = createBrowserTesseract({ loader: async () => fake });
  assert.equal(eng.sendsImageOffDevice, false);
  assert.match(eng.describe(), /vendored tesseract\.js 7\.0\.0/);
  await eng.terminate();
});
test('vendored tesseract files exist and no CDN is referenced by the engine config', () => {
  const dir = new URL('../assets/vendor/_tesseract/', import.meta.url);
  for (const f of ['tesseract.esm.min.js', 'worker.min.js', 'tesseract-core-simd-lstm.wasm.js', 'heb.traineddata', 'LICENSE-tesseract.js.md']) assert.ok(existsSync(new URL(f, dir)), f);
  const src = readFileSync(new URL('../src/photo/engines/tesseract-browser.js', import.meta.url), 'utf8');
  assert.ok(!/jsdelivr|unpkg|cdnjs/.test(src));
});

test('local-server adapter: posts to the right paths, surfaces server errors', async () => {
  const log = [];
  const f = async (url, init) => { log.push([url, init.method]); if (url.endsWith('/translate')) return { ok: true, json: async () => ({ text: 'Where is the hospital?', engine: 'argos' }) }; return { ok: false, status: 503, json: async () => ({ error: 'tesseract failed' }) }; };
  const s = createLocalServer({ url: 'http://127.0.0.1:9/', fetch: f });
  assert.deepEqual(await s.translate.translate('איפה'), { text: 'Where is the hospital?', engine: 'argos' });
  await assert.rejects(s.ocr.ocr(new Blob([1])), /tesseract failed/);
  assert.equal(log[0][0], 'http://127.0.0.1:9/translate');
});

test('provider: nothing that leaves the device is enabled by default; the local helper opt-in adds disclosure + parts; no online vowelizer exists', () => {
  const base = createPhotoEngines({ tesseractLoader: async () => ({}) });
  assert.equal(base.demo, false); assert.equal(typeof base.ocr, 'function');
  assert.equal(base.vowelize, undefined); assert.equal(base.translate, undefined); assert.deepEqual(base.disclosure, []);
  const full = createPhotoEngines({ localServerUrl: 'http://127.0.0.1:8787', tesseractLoader: async () => ({}) });
  assert.equal(full.vowelize, undefined); assert.equal(typeof full.translate, 'function');
  assert.ok(full.disclosure.some((d) => /helper/.test(d)));
  assert.ok(!full.disclosure.some((d) => /Dicta|nakdan/i.test(d)));
  // fix #16 regression: the removed `online` option cannot re-enable a third-party vowelizer
  const ignored = createPhotoEngines({ online: true, tesseractLoader: async () => ({}) });
  assert.equal(ignored.vowelize, undefined); assert.deepEqual(ignored.disclosure, []);
});

test('pipeline with engines shaped like the real ones: OCR boxes -> vowelize -> syllables -> machine translation label', async () => {
  const engines = { name: 't', names: { vowelize: 'stub-vowelizer' }, ocr: async () => [{ text: 'ברוך', x: 100, y: 0, w: 40, h: 20 }, { text: 'הבא', x: 50, y: 0, w: 40, h: 20 }],
    vowelize: async (text) => (text === 'ברוך הבא' ? 'בָּרוּךְ הַבָּא' : text),
    translate: async () => ({ text: 'welcome', engine: 'x' }) };
  const r = await runPipeline({}, engines, { mode: 'sign' });
  assert.equal(r.lines[0].pointed, 'בָּרוּךְ הַבָּא'.normalize('NFC'));
  assert.equal(r.lines[0].english.label, 'machine translation');
  assert.ok(r.lines[0].words[0].syllables.length >= 2);
  assert.ok(r.lines[0].warnings.some((w) => /machine-generated/.test(w)));
});

test('lane 3 shva adapter: aligns clusters, agrees with lane 3 verdicts, falls back when it cannot align', async () => {
  const f = await loadLane3Shva();
  assert.equal(typeof f, 'function');
  const shvaSyls = (w, opts = {}) => syllabifyWord(w, opts).map((s) => s.he).join('.');
  for (const w of ['וְיִשְׁמְרֶךָ', 'שְׁמַע', 'יִשְׂרָאֵל', 'וְאָהַבְתָּ', 'בָּרְכוּ', 'מִשְׁכְּנֹתֶיךָ']) assert.equal(shvaSyls(w, { shvaClassifier: f }), shvaSyls(w), w);
  // a classifier built from a fake lane 3 proves the verdict is actually consulted and mapped na->'na' / nach->'nach'
  const fake = createLane3ShvaClassifier({ parseWord: (w) => [...w].filter((c) => c >= 'א' && c <= 'ת').map((ch) => ({ ch })), classifyShvas: (cl) => new Map(cl.map((_, i) => [i, { na: true }])) });
  const w = 'שְׁמַע';
  const with_ = syllabifyWord(w, { shvaClassifier: fake })[0];
  assert.equal(with_.letters.find((l) => l.vowel === 'shva').shva, 'na');
  const broken = createLane3ShvaClassifier({ parseWord: () => [], classifyShvas: () => new Map() });
  assert.equal(broken({ index: 0, clusters: [{}], all: [{}], word: 'x' }), undefined);
});
