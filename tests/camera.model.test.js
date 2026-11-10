// Camera Translator: pure logic, the service client with a fake fetch, and static rules for the view. Unit tier (no browser).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolveBackend, containsSacredName, tokens, createGlossary, regionsFromBoxes, normaliseResponse, decodeJpegDataUrl, percentBox,
  sourceLabel, fitText, wrapWords, chooseAlignment, groupBlocks, boxColours, contrastRatio, HELD_NOTE } from '../src/camera/camera-model.js';
import { translateViaService, loadConfig, ServiceError } from '../src/camera/camera-client.js';
import { NAME_SKELETON } from '../src/shell/names.js';
import { ROUTES, matchRoute } from '../src/shell/router.js';
import { isOnDemand, computeManifest } from '../tools/build-precache.mjs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const glossaryData = JSON.parse(read('data/camera/sign-glossary.json'));
const glossary = createGlossary(glossaryData);

test('camera: service address rules (empty = not set up; photos never go over plain http to another host)', () => {
  const page = 'https://alef.example/#/camera';
  assert.deepEqual(resolveBackend('', page), { mode: 'none', url: null, origin: null });
  assert.equal(resolveBackend(undefined, page).mode, 'none');
  assert.deepEqual(resolveBackend('/api/camera/', page), { mode: 'same-origin', url: 'https://alef.example/api/camera', origin: 'https://alef.example' });
  assert.equal(resolveBackend('http://127.0.0.1:8790', page).mode, 'loopback');
  assert.equal(resolveBackend('http://localhost:8790/', page).url, 'http://localhost:8790');
  assert.equal(resolveBackend('https://camera.example.org', page).mode, 'remote');
  for (const bad of ['http://camera.example.org', 'javascript:alert(1)', 'ftp://x/y', 'data:text/plain,hi']) assert.equal(resolveBackend(bad, page).mode, 'invalid', bad);
  assert.equal(JSON.parse(read('data/camera/config.json')).backendUrl, '', 'the shipped config must not point anywhere');
});

test('camera: the word list agrees with the shared cases (same file the service tests use) and has no duplicate or sacred entries', () => {
  const { cases } = JSON.parse(read('data/camera/glossary-cases.json'));
  assert.ok(cases.length >= 15);
  for (const c of cases) { const r = glossary.translate(c.he); assert.deepEqual([r.en, r.status], [c.en, c.status], c.he); }
  assert.equal(glossary.translate('חנות אופטיקה').translit, 'chanut optika');
  assert.deepEqual(tokens('קפה 12.50!'), ['קפה', '12.50']);
  const keys = glossaryData.entries.map((e) => e.he);
  assert.equal(new Set(keys).size, keys.length);
  for (const e of glossaryData.entries) {
    assert.ok(e.he && e.en && e.pointed && e.translit, e.he);
    assert.ok(!containsSacredName(e.he) && !containsSacredName(e.pointed), 'the word list never holds the name');
    assert.match(e.en, /^[A-Z]/, `Title Case gloss: ${e.en}`);
  }
  assert.equal(read('data/camera/sign-glossary.json'), read('tools/camera-translate/camera_translate/sign-glossary.json'), 'service copy of the word list is out of date');
});

test('camera: word boxes become right-to-left lines; a line with the name is held and its text is never returned', () => {
  const boxes = [{ text: 'אופטיקה', x: 100, y: 40, w: 180, h: 50 }, { text: 'חנות', x: 300, y: 42, w: 120, h: 48 },
    { text: 'OPEN', x: 100, y: 140, w: 120, h: 40 }, { text: NAME_SKELETON, x: 100, y: 240, w: 120, h: 40 }, { text: 'ברוך', x: 240, y: 240, w: 120, h: 40 },
    { text: 'ספרים', x: 100, y: 340, w: 120, h: 40 }];
  const regs = regionsFromBoxes(boxes, glossary);
  assert.equal(regs.length, 3);                                   // the Latin-only line is left alone
  assert.deepEqual([regs[0].he, regs[0].en, regs[0].translationSource], ['חנות אופטיקה', 'Optical Store', 'word-list']);
  assert.deepEqual(regs[0].box, { x: 100, y: 40, w: 320, h: 50 });
  assert.deepEqual([regs[1].held, regs[1].he, regs[1].en, regs[1].note], [true, null, null, HELD_NOTE]);
  assert.deepEqual([regs[2].he, regs[2].en, regs[2].translationSource], ['ספרים', null, null]);
  assert.ok(!JSON.stringify(regs).includes(NAME_SKELETON));
});

test('camera: a service answer is tidied before use (boxes clamped, name rule re-applied, only a JPEG data URL accepted)', () => {
  const tidy = normaliseResponse({ width: 400, height: 200, image: 'data:image/jpeg;base64,/9j/AA==', notices: ['ok', 7, 'x'.repeat(999)],
    regions: [
      { box: { x: 10, y: 20, w: 100, h: 30 }, he: 'יציאה', en: 'Exit', translationSource: 'machine', drawn: true, extra: '<script>' },
      { box: { x: -50, y: 190, w: 9999, h: 9999 }, he: 'שלום', en: 'Praise Jehovah', drawn: true },
      { box: { x: 0, y: 0, w: 10, h: 10 }, he: `ל${NAME_SKELETON}`, en: 'to the Lord', drawn: true },
      { box: {}, he: 5, en: null, translationSource: 'made-up' }] });
  assert.equal(tidy.regions.length, 4);
  assert.deepEqual(tidy.regions[0], { id: 'r1', box: { x: 10, y: 20, w: 100, h: 30 }, held: false, he: 'יציאה', en: 'Exit', translationSource: 'machine', translit: null, pointed: null, drawn: true });
  assert.deepEqual(tidy.regions[1].box, { x: 0, y: 190, w: 400, h: 10 });
  assert.ok(tidy.regions[1].held && tidy.regions[1].en === null && tidy.regions[1].drawn === false);
  assert.ok(tidy.regions[2].held && tidy.regions[2].he === null);
  assert.deepEqual([tidy.regions[3].he, tidy.regions[3].translationSource], [null, null]);
  assert.equal(tidy.notices.length, 2);
  assert.equal(normaliseResponse({ image: 'data:text/html;base64,PGI+' }).image, null);
  assert.equal(normaliseResponse({ image: 'https://example.org/x.jpg' }).image, null);
  assert.deepEqual([...decodeJpegDataUrl('data:image/jpeg;base64,/9j/AA==')], [0xff, 0xd8, 0xff, 0]);
  assert.equal(decodeJpegDataUrl('data:image/png;base64,AAAA'), null);
  assert.deepEqual(percentBox({ x: 100, y: 50, w: 200, h: 25 }, 400, 200), { left: '25%', top: '25%', width: '50%', height: '12.5%' });
  assert.match(sourceLabel('machine'), /can be wrong/); assert.match(sourceLabel('word-list-near'), /check it/); assert.equal(sourceLabel(null), '');
});

test('camera: English is sized to its box, wraps when long, and flush-right Hebrew becomes flush-left English', () => {
  const measure = (text, size) => text.length * size * 0.55;
  const one = fitText(measure, 'Exit', 300, 80);
  assert.ok(one.fits && one.lines.length === 1 && measure('Exit', one.size) <= 300 * 0.96 && one.size * 1.12 <= 80 * 1.3);
  const long = fitText(measure, 'Ben Yehuda Boulevard Pedestrian Mall', 260, 200);
  assert.ok(long.fits && long.lines.length >= 2);
  assert.ok(Math.max(...long.lines.map((l) => measure(l, long.size))) <= 260 * 0.96);
  assert.equal(fitText(measure, 'Ben Yehuda Boulevard', 30, 10).fits, false);
  assert.deepEqual(wrapWords(['a', 'b', 'c', 'd'], 2), ['a b', 'c d']);
  const menu = [{ id: 'a', box: { x: 300, y: 10, w: 200, h: 40 } }, { id: 'b', box: { x: 400, y: 70, w: 100, h: 40 } }, { id: 'c', box: { x: 50, y: 400, w: 100, h: 40 } }];
  assert.equal(groupBlocks(menu).length, 2);
  const place = chooseAlignment(menu, 600);
  assert.deepEqual(place.get('a'), { align: 'left', box: { x: 300, y: 10, w: 200, h: 40 } });
  assert.deepEqual(place.get('b'), { align: 'left', box: { x: 300, y: 70, w: 200, h: 40 } });
  assert.equal(place.get('c').align, 'center'); assert.ok(place.get('c').box.w > 100);
});

test('camera: sign colours are read from the picture (white letters on blue stay white on blue)', () => {
  const W = 120, H = 60; const data = new Uint8ClampedArray(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4; const letter = y >= 20 && y < 40 && x >= 30 && x < 90 && x % 6 < 3;
    data.set(letter ? [255, 255, 255, 255] : [20, 70, 150, 255], i);
  }
  const c = boxColours(data, W, H, { x: 30, y: 20, w: 60, h: 20 });
  assert.deepEqual(c.bg, [20, 70, 150]); assert.deepEqual(c.fg, [255, 255, 255]);
  assert.ok(contrastRatio(c.fg, c.bg) > 4.5);
  const flat = boxColours(new Uint8ClampedArray(W * H * 4).fill(240), W, H, { x: 30, y: 20, w: 60, h: 20 });
  assert.deepEqual(flat.fg, [17, 17, 17]);
});

test('camera: the client posts one JPEG to /translate-image without credentials and maps failures to plain messages', async () => {
  const calls = [];
  const ok = async (url, init) => { calls.push({ url, init }); return { ok: true, status: 200, json: async () => ({ width: 100, height: 50, image: 'data:image/jpeg;base64,/9j/AA==', regions: [{ box: { x: 1, y: 2, w: 30, h: 10 }, he: 'סגור', en: 'Closed', translationSource: 'word-list', drawn: true }] }) }; };
  const photo = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' });
  const r = await translateViaService('https://camera.example.org', photo, ok);
  assert.equal(calls[0].url, 'https://camera.example.org/translate-image');
  assert.deepEqual([calls[0].init.method, calls[0].init.credentials, calls[0].init.headers['Content-Type'], calls[0].init.body], ['POST', 'omit', 'image/jpeg', photo]);
  assert.equal(r.regions[0].en, 'Closed'); assert.equal(r.blob.type, 'image/jpeg'); assert.equal(r.blob.size, 4);
  const kind = async (f) => { try { await translateViaService('https://x.example', photo, f); } catch (e) { assert.ok(e instanceof ServiceError); return e.kind; } return 'no error'; };
  assert.equal(await kind(async () => { throw new TypeError('Failed to fetch'); }), 'offline');
  assert.equal(await kind(async () => ({ ok: false, status: 429 })), 'busy');
  assert.equal(await kind(async () => ({ ok: false, status: 413 })), 'rejected');
  assert.equal(await kind(async () => ({ ok: false, status: 503 })), 'failed');
  assert.equal(await kind(async () => ({ ok: true, status: 200, json: async () => { throw new Error('html'); } })), 'failed');
  assert.equal((await loadConfig(async () => ({ ok: false }), 'https://alef.example/')).mode, 'none');
  assert.equal((await loadConfig(async () => { throw new Error('offline'); }, 'https://alef.example/')).mode, 'none');
  assert.equal((await loadConfig(async () => ({ ok: true, json: async () => ({ backendUrl: '/api/camera' }) }), 'https://alef.example/')).mode, 'same-origin');
});

test('camera: route is registered, lazy, and kept out of the first-install precache', () => {
  const route = ROUTES.find((r) => r.name === 'camera');
  assert.deepEqual([route.pattern, route.module, route.title], ['/camera', '../camera/camera.view.js', 'Camera Translator']);
  assert.equal(matchRoute('#/camera').route.name, 'camera');
  for (const f of ['src/camera/camera.view.js', 'src/camera/camera-model.js', 'src/camera/camera-client.js', 'src/camera/on-device.js', 'data/camera/sign-glossary.json', 'data/camera/config.json']) {
    assert.ok(existsSync(new URL(`../${f}`, import.meta.url)), f); assert.ok(isOnDemand(f), `${f} must be on demand`);
  }
  const m = computeManifest();
  assert.ok(!m.files.some((f) => /^(src|data)\/camera\//.test(f)));
  assert.ok(m.onDemand.includes('src/camera/camera.view.js'));
  for (const eager of ['src/app.js', 'src/shell/router.js', 'src/shell/home.view.js']) assert.ok(!/from '\.\.?\/.*camera/.test(read(eager)), `${eager} must not import the camera code up front`);
});

test('camera: view source keeps the page rules (no inline script, no HTML strings, plain wording, notices present)', () => {
  const files = ['src/camera/camera.view.js', 'src/camera/camera-model.js', 'src/camera/camera-client.js', 'src/camera/on-device.js'];
  for (const f of files) {
    const src = read(f);
    assert.ok(!/innerHTML|outerHTML|insertAdjacentHTML|document\.write|\beval\(|new Function|<script/i.test(src), `${f}: no HTML strings or script injection`);
    assert.ok(!/https?:\/\/(?!127\.0\.0\.1|localhost)[a-z]/i.test(src.replace(/\/\/.*$/gm, '')), `${f}: no hard-coded outside address`);
    assert.ok(!/localStorage|sessionStorage|indexedDB/.test(src), `${f}: photos and results are not stored`);
    assert.ok(!src.includes(NAME_SKELETON), `${f}: the name is never written out`);
  }
  const view = read('src/camera/camera.view.js');
  for (const s of ['Camera Translator', 'Take A Photo', 'Choose A Photo', 'Show The Original', 'Hear The Hebrew', 'NOT_SET_UP_NOTICE', 'SEND_NOTICE', 'speechSafeText', "imageOrientation: 'from-image'"]) assert.ok(view.includes(s), s);
  assert.match(view, /Location and camera details are removed/);
});
