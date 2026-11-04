import test from 'node:test';
import assert from 'node:assert/strict';
import { runPipeline, composeEngines, MACHINE_TRANSLATION_LABEL } from '../src/photo/pipeline.js';
import { createMockEngine } from '../src/photo/engines/mock.js';
import { createNakdanVowelizer, parseNakdanResponse, nakdanRequest, tesseractWordsToBoxes, createTesseractOcr, visionResponseToBoxes, createVisionOcr, createLibreTranslate, createPhonikudPlaceholder, describeAdapters } from '../src/photo/engines/web.js';
import { buildCards } from '../src/photo/scan.view.js';

test('sign mode with the mock engine: order, vowelize, syllables, labelled machine translation', async () => {
  const r = await runPipeline({}, createMockEngine(), { mode: 'sign' });
  assert.equal(r.demo, true);
  assert.match(r.notice, /demo engine: no real OCR installed/);
  assert.equal(r.lines.length, 2);
  const l0 = r.lines[0];
  assert.equal(l0.ocrText, 'ברוך שלום הבא');
  assert.equal(l0.pointedSource, 'mock-lexicon');
  assert.equal(l0.words[0].syllables.length, 2);
  assert.equal(l0.english.label, MACHINE_TRANSLATION_LABEL);
  assert.equal(l0.english.machineTranslation, true);
  assert.match(l0.english.text, /blessed peace/);
  // second line has an LTR price token
  assert.ok(r.lines[1].words.some((w) => w.kind === 'other' && w.he === '12.50'));
});
test('prayer mode: match -> canonical pointed text from corpus; no MT label for corpus text', async () => {
  const mock = createMockEngine();
  const r = await runPipeline({}, mock, { mode: 'prayer' });
  const l = r.lines[0];
  assert.equal(l.ocrText, 'יאר יהוה פניו אליך ויחנך');
  assert.equal(l.match.matched, true);
  assert.equal(l.pointedSource, 'corpus');
  assert.match(l.pointed, /וִיחֻנֶּךָּ/);
  assert.equal(l.words.length, 5);
  // fixture has no english, so mock translate (labelled MT) is used
  assert.equal(l.english.machineTranslation, true);
  // divine name read as Adonai, flagged
  const name = l.words.find((w) => w.he.replace(/[^א-ת]/g, '') === 'יהוה');
  assert.match(name.note, /Adonai/);
});
test('prayer mode uses registry english when present and labels it as corpus translation', async () => {
  const reg = [{ id: 'r1', ref: 'Test 1:1', he: 'שְׁמַע יִשְׂרָאֵל', english: 'Hear, O Israel' }];
  const boxes = [{ text: 'שמע', x: 100, y: 0, w: 50, h: 20 }, { text: 'ישראל', x: 10, y: 0, w: 80, h: 20 }];
  const r = await runPipeline({ mockBoxes: boxes }, createMockEngine(), { mode: 'prayer', registry: reg });
  assert.equal(r.lines[0].english.machineTranslation, false);
  assert.equal(r.lines[0].english.label, 'corpus translation');
});
test('prayer mode falls back (with a warning) when nothing matches', async () => {
  const boxes = [{ text: 'חלב', x: 10, y: 0, w: 50, h: 20 }];
  const r = await runPipeline({ mockBoxes: boxes }, createMockEngine(), { mode: 'prayer' });
  assert.match(r.lines[0].warnings.join(' '), /no confident corpus match/);
  assert.equal(r.lines[0].pointedSource, 'mock-lexicon');
});
test('already-pointed OCR text is used as is; missing engines degrade with warnings, not crashes', async () => {
  const boxes = [{ text: 'שָׁלוֹם', x: 10, y: 0, w: 50, h: 20 }, { text: 'עולם', x: 100, y: 0, w: 50, h: 20 }];
  const r = await runPipeline(null, { ocr: () => boxes }, { mode: 'sign' });
  assert.equal(r.demo, false);
  assert.equal(r.lines[0].pointedSource, 'ocr'); // line already contains vowel points
  assert.match(r.lines[0].warnings.join('|'), /no translation engine/);
  assert.equal(r.lines[0].words[0].syllables.length, 0); // 'עולם' unpointed: no guessing
  assert.equal(r.lines[0].words[1].syllables.length, 2);
});
test('engine failures are captured per line', async () => {
  const eng = { ocr: () => [{ text: 'שלום', x: 0, y: 0, w: 10, h: 10 }], vowelize: () => { throw new Error('boom'); }, translate: () => { throw new Error('nope'); } };
  const r = await runPipeline(null, eng, { mode: 'sign' });
  assert.match(r.lines[0].warnings.join('|'), /vowelize failed: boom/);
  assert.match(r.lines[0].warnings.join('|'), /translate failed: nope/);
  assert.equal(r.lines[0].english, null);
});
test('validation: ocr required, mode checked, empty OCR warns', async () => {
  await assert.rejects(() => runPipeline({}, {}), /ocr/);
  await assert.rejects(() => runPipeline({}, createMockEngine(), { mode: 'x' }), /unknown mode/);
  const r = await runPipeline({}, { ocr: () => [] });
  assert.deepEqual(r.warnings, ['OCR returned no text']);
});
test('ipa engine is optional and used when given', async () => {
  const eng = { ...createMockEngine(), ipa: (w) => `/${w.length}/` };
  const r = await runPipeline({}, eng, { mode: 'sign' });
  assert.ok(r.lines[0].words[0].ipa);
});
test('composeEngines marks demo if any part is a mock', () => {
  const m = createMockEngine();
  const e = composeEngines({ ocr: { name: 'real', ocr: () => [] }, vowelize: m, translate: m });
  assert.equal(e.demo, true);
  assert.equal(composeEngines({ ocr: { name: 'real', ocr: () => [] } }).demo, false);
});
test('buildCards: pure card model for the view', async () => {
  const r = await runPipeline({}, createMockEngine(), { mode: 'sign' });
  const cards = buildCards(r);
  assert.equal(cards[0].he, 'בָּרוּךְ');
  assert.equal(cards[0].syllables.length, 2);
  assert.equal(cards[0].letters[0].id, 'bet');
});

// ---- adapters: no real network; injected fakes and dry mode ----
test('Nakdan adapter: dry mode sends nothing; injected fetch is used; parser accepts the real shape (see photo.engines.test.js for recorded live data)', async () => {
  let called = 0;
  const f = async () => { called++; return { ok: true, json: async () => ({ data: [{ str: 'שלום', sep: false, nakdan: { word: 'שלום', options: [{ w: 'שָׁ|לוֹם' }] } }, { str: ' ', sep: true, nakdan: { word: ' ', options: [], sep: true } }] }) }; };
  const dry = await createNakdanVowelizer({ fetch: f, dry: true }).vowelize('שלום');
  assert.equal(dry.dry, true);
  assert.equal(called, 0);
  assert.equal(dry.request.body.data, 'שלום');
  const live = await createNakdanVowelizer({ fetch: f }).vowelize('שלום');
  assert.equal(called, 1);
  assert.equal(live, 'שָׁלוֹם ');
  assert.throws(() => parseNakdanResponse([]), /no data array/);
  assert.equal(nakdanRequest('x').method, 'POST');
  await assert.rejects(() => createNakdanVowelizer({ fetch: async () => ({ ok: false, status: 500 }) }).vowelize('x'), /HTTP 500/);
});
test('Tesseract adapter: box conversion and injected module (fake)', async () => {
  const data = { words: [{ text: ' שלום ', confidence: 90, bbox: { x0: 10, y0: 20, x1: 60, y1: 50 } }, { text: '', bbox: { x0: 0, y0: 0, x1: 1, y1: 1 } }] };
  assert.deepEqual(tesseractWordsToBoxes(data), [{ text: 'שלום', x: 10, y: 20, w: 50, h: 30, conf: 90 }]);
  const fake = { recognize: async (img, lang) => { assert.equal(lang, 'heb'); return { data }; } };
  assert.equal((await createTesseractOcr({ Tesseract: fake }).ocr('img')).length, 1);
  assert.equal((await createTesseractOcr({ dry: true }).ocr('img')).dry, true);
  await assert.rejects(() => createTesseractOcr({}).ocr('img'), /not provided/);
});
test('Vision adapter: response conversion (SYNTHETIC response) and dry mode never calls fetch', async () => {
  const resp = { responses: [{ fullTextAnnotation: { pages: [{ blocks: [{ paragraphs: [{ words: [{ symbols: [{ text: 'ש' }, { text: 'ם' }], boundingBox: { vertices: [{ x: 5, y: 5 }, { x: 25, y: 5 }, { x: 25, y: 20 }, { x: 5, y: 20 }] } }] }] }] }] } }] };
  assert.deepEqual(visionResponseToBoxes(resp), [{ text: 'שם', x: 5, y: 5, w: 20, h: 15 }]);
  const o = createVisionOcr({ fetch: () => { throw new Error('must not be called'); }, dry: true, apiKey: 'SECRET' });
  const d = await o.ocr('img');
  assert.equal(d.dry, true);
  assert.equal(JSON.stringify(d).includes('SECRET'), false);
});
test('LibreTranslate-compatible adapter: dry + injected fetch; result is later labelled machine translation by the pipeline', async () => {
  const t = createLibreTranslate({ dry: true, apiKey: 'K' });
  const d = await t.translate('שלום');
  assert.equal(d.dry, true);
  assert.equal(d.request.body.api_key, '<redacted>');
  const f = async (url, init) => ({ ok: true, json: async () => ({ translatedText: 'peace', _sent: JSON.parse(init.body) }) });
  const eng = { ocr: () => [{ text: 'שלום', x: 0, y: 0, w: 10, h: 10 }], translate: createLibreTranslate({ fetch: f }).translate };
  const r = await runPipeline(null, eng, { mode: 'sign' });
  assert.equal(r.lines[0].english.text, 'peace');
  assert.equal(r.lines[0].english.label, 'machine translation');
});
test('Phonikud placeholder is inert; describeAdapters lists every adapter as unverified/placeholder', () => {
  assert.equal(createPhonikudPlaceholder().ipa, undefined);
  const d = describeAdapters();
  assert.equal(d.length, 5);
  assert.ok(d.every((x) => /unverified|placeholder|dicta-nakdan/.test(x)));
});
