import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { waitFor } from './helpers/waitfor.js';
const tiles = (r) => r.find(n => n.tag === 'button' && n.attrs['data-tile']);

// Minimal fake DOM: checks view logic (31 tiles, audio calls, warning only after a wrong tap), NOT browser rendering.
class El {
  constructor(tag) { this.tag = tag; this.children = []; this.attrs = {}; this.listeners = {}; this.className = ''; this.nodeType = 1; this._text = ''; }
  setAttribute(k, v) { this.attrs[k] = v; } getAttribute(k) { return this.attrs[k]; }
  addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }
  appendChild(c) { this.children.push(c); return c; }
  set textContent(v) { this.children = []; this._text = v; } get textContent() { return this.text; }
  get text() { return this._text + this.children.map(c => (c.nodeType === 3 ? c.data : c.text)).join(''); }
  find(pred, out = []) { if (pred(this)) out.push(this); for (const c of this.children) if (c.nodeType === 1) c.find(pred, out); return out; }
  async click() { for (const f of this.listeners.click || []) await f({}); }
}
globalThis.document = { createElement: t => new El(t), createTextNode: d => ({ nodeType: 3, data: String(d) }) };
globalThis.URL = URL;
const tick = () => new Promise(r => setTimeout(r, 5));
const rd = (p) => JSON.parse(readFileSync(new URL('../data/letters/' + p, import.meta.url)));
const data = { letters: rd('letters.json'), mnemonics: rd('mnemonics.json'), confusables: rd('confusables.json'), interference: rd('interference.json') };
const { mount, buildTiles } = await import('../src/letters/atlas.view.js');
const body = (root) => root.find(n => n.tag === 'style').reduce((t, st) => t.replace(st.text, ''), root.text);
const tile = (root, id) => root.find(n => n.attrs['data-tile'] === id)[0];

test('buildTiles: 31 tiles, variants right after their parent, 5 finals', () => {
  const tiles = buildTiles(data.letters, data.mnemonics);
  assert.equal(tiles.length, 31);
  const ids = tiles.map(t => t.id);
  assert.equal(ids[ids.indexOf('bet') + 1], 'vet'); assert.equal(ids[ids.indexOf('kaf') + 1], 'khaf');
  assert.equal(ids[ids.indexOf('pe') + 1], 'fe'); assert.equal(ids[ids.indexOf('shin') + 1], 'sin');
  assert.equal(tiles.filter(t => t.kind === 'final').length, 5);
  for (const t of tiles) { assert.ok(t.ipa, t.id + ' ipa'); assert.ok(t.mn && t.mn.story, t.id + ' mnemonic'); }
  assert.equal(tiles.find(t => t.id === 'sin').glyph, 'שׂ');
});

test('atlas view: renders 31 tiles, tapping one calls ctx.audio.play with its sound id and shows its story', async () => {
  const root = new El('div'); const played = [];
  const audio = { play: async (kind, id) => { played.push([kind, id]); return { source: 'file' }; } };
  const un = mount(root, { ...data, audio, t: k => k });
  await waitFor(() => tiles(root).length === 31, { message: "31 tiles rendered" });
  assert.equal(root.find(n => n.tag === 'button' && n.attrs['data-tile']).length, 31);
  await tile(root, 'nun').click();
  assert.deepEqual(played[0], ['letter', 'nun-sound']);
  assert.match(body(root), /cat curled up asleep in a box/);
  await tile(root, 'sin').click();
  assert.deepEqual(played[1], ['letter', 'sin-sound']);
  await tile(root, 'nun-final').click();
  assert.deepEqual(played[2], ['letter', 'nun-final']);
  un();
});

test('atlas view: honest status when audio has no clip, and when audio is absent', async () => {
  const r1 = new El('div'); mount(r1, { ...data, audio: { play: async () => ({ source: 'none' }) }, t: (k) => k });
  await waitFor(() => tiles(r1).length > 0, { message: "atlas rendered" }); await tile(r1, 'vet').click();
  assert.match(body(r1), /No audio for this one yet/);
  const r2 = new El('div'); mount(r2, { ...data }); await waitFor(() => tiles(r2).length > 0, { message: "atlas rendered" }); await tile(r2, 'alef').click();
  assert.match(body(r2), /Audio is not available/);
});

test('atlas quiz: look-alike warning appears only AFTER a wrong tap on a real look-alike', async () => {
  const root = new El('div'); const orig = Math.random;
  Math.random = () => (data.letters.findIndex(l => l.id === 'dalet')) / 31 + 0.001; // pool excludes variants; pick dalet below
  try {
    mount(root, { ...data, audio: { play: async () => ({ source: 'file' }) }, t: k => k });
    await waitFor(() => root.find(n => n.tag === 'button' && /atlas.quizOn|Quiz me/.test(n.text)).length > 0, { message: "quiz button rendered" });
    const startBtn = root.find(n => n.tag === 'button' && /atlas.quizOn|Quiz me/.test(n.text))[0];
    await startBtn.click();
    assert.ok(!/Look-alike:/.test(body(root)), 'no warning before any tap');
    const m = body(root).match(/Find: (\w[\w ]*?)\s/); assert.ok(m);
    const targetName = body(root).slice(body(root).indexOf('Find: ') + 6).split(/\s{2}|\//)[0].trim();
    const target = buildTiles(data.letters, data.mnemonics).find(t => t.name === targetName);
    assert.ok(target, 'target tile ' + targetName);
    // an unrelated wrong tap (lamed vs anything unrelated): no look-alike box
    const unrelated = buildTiles(data.letters, data.mnemonics).find(t => t.kind !== 'variant' && t.id !== target.id && !['bet','kaf','pe','gimel','nun','dalet','resh','kaf-final','vav','zayin','nun-final','yod','he','chet','tav','samekh','mem-final','tsadi','ayin','pe-final','tsadi-final','mem','qof','shin'].includes(t.id));
    if (unrelated) { await tile(root, unrelated.id).click(); assert.ok(!/Look-alike:/.test(body(root))); }
    // a real look-alike wrong tap shows the hint
    const pairs = { dalet: 'resh', resh: 'dalet', bet: 'kaf', kaf: 'bet', he: 'chet', chet: 'he', tav: 'he', gimel: 'nun', nun: 'gimel', vav: 'zayin', zayin: 'vav', pe: 'kaf', 'kaf-final': 'resh', samekh: 'mem-final', 'mem-final': 'samekh', tsadi: 'ayin', ayin: 'tsadi', yod: 'vav', 'nun-final': 'vav', qof: 'kaf', 'pe-final': 'tsadi-final', 'tsadi-final': 'pe-final', mem: 'mem-final' };
    const wrong = pairs[target.id];
    assert.ok(wrong, 'a look-alike exists for ' + target.id);
    await tile(root, wrong).click();
    assert.match(body(root), /Look-alike:/);
    // correct tap clears the warning
    await tile(root, target.id).click();
    assert.ok(!/Look-alike:/.test(body(root)));
    assert.match(body(root), /Good!/);
  } finally { Math.random = orig; }
});

test('buildTiles: slash IPA is kept for Israeli and dropped (not invented) where the tradition record does not start with the same symbol', () => {
  const cons = rd('../pronunciation/consonants.json');
  const ipaOf = (tradition, id) => buildTiles(data.letters, data.mnemonics, { consonants: cons, tradition }).find(t => t.id === id).ipa;
  assert.equal(ipaOf('israeli', 'resh'), 'ʁ'); assert.equal(ipaOf('israeli', 'chet'), 'χ');
  for (const t of ['sephardi', 'ashkenazi']) for (const id of ['resh', 'ayin']) assert.equal(ipaOf(t, id), '', t + ' ' + id);
  assert.equal(ipaOf('sephardi', 'chet'), ''); assert.equal(ipaOf('ashkenazi', 'tav'), ''); assert.equal(ipaOf('sephardi', 'tav'), 't');
  assert.equal(ipaOf('ashkenazi', 'nun'), 'n'); assert.equal(ipaOf('ashkenazi', 'khaf'), '');
});

test('atlas view: where the memory chain has an entry the old mnemonics story and word are hidden; variants show the parent card and a note; no chain keeps the old text', async () => {
  const chain = rd('memory-chain.json');
  const root = new El('div'); const un = mount(root, { ...data, memoryChain: chain, t: (k, f) => f ?? k });
  await waitFor(() => tiles(root).length === 31, { message: '31 tiles' });
  await tile(root, 'kaf').click();
  const kaf = data.mnemonics.letters.find((x) => x.id === 'kaf');
  assert.equal(root.find((n) => n.attrs['data-memory-card'] === 'kaf').length, 1);
  assert.ok(!body(root).includes(kaf.story), 'old kaf story not shown'); assert.ok(!root.find((n) => n.tag === 'button' && /Another picture/.test(n.text)).length);
  assert.ok(body(root).includes(kaf.shape) || !kaf.shape, 'shape line kept');
  for (const [v, parent] of [['vet', 'bet'], ['khaf', 'kaf'], ['fe', 'pe'], ['sin', 'shin']]) {
    await tile(root, v).click();
    assert.equal(root.find((n) => n.attrs['data-memory-card'] === parent).length, 1, v + ' shows ' + parent + ' card');
    assert.equal(root.find((n) => n.attrs['data-variant-note'] === v).length, 1, v + ' note');
    assert.ok(!body(root).includes(data.mnemonics.variants.find((x) => x.id === v).story), v + ' old story hidden');
  }
  un();
  const r2 = new El('div'); const u2 = mount(r2, { ...data, memoryChain: null, t: (k, f) => f ?? k });
  await waitFor(() => tiles(r2).length === 31, { message: 'tiles, no chain' }); await tile(r2, 'kaf').click();
  assert.ok(body(r2).includes(data.mnemonics.letters.find((x) => x.id === 'kaf').story)); u2();
});

test('atlas view: Hear buttons are the shared audio button (file plays, device voice is labelled, no voice says No audio yet)', async () => {
  for (const [source, state] of [['file', 'file'], ['tts-fallback', 'device'], ['none', null]]) {
    const root = new El('div'); const played = [];
    const audio = { status: () => ({ source, reason: 'no-speech-synthesis' }), play: async (kind, id) => { played.push([kind, id]); return { source }; } };
    const un = mount(root, { ...data, audio, t: k => k });
    await waitFor(() => tiles(root).length === 31, { message: "31 tiles rendered" });
    await tile(root, 'nun').click(); played.length = 0;
    const hear = root.find(n => n.tag === 'button' && n.attrs['data-audio'] === 'letter/nun-sound');
    if (!state) { assert.equal(hear.length, 0); assert.match(body(root), /No audio yet/); un(); continue; }
    assert.equal(hear.length, 1, source); assert.equal(hear[0].attrs['data-audio-state'], state);
    if (state === 'device') assert.match(hear[0].attrs['aria-label'], /Device voice, not a recorded teacher; Israeli-style only/);
    await hear[0].click(); assert.deepEqual(played[0], ['letter', 'nun-sound']);
    un();
  }
});
