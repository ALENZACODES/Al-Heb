// Lane 3: sounds view + model tests. There is no DOM library available (zero dependencies), so the view
// runs against a minimal fake DOM defined below. This proves the logic (rendering, tradition switching,
// audio call, settings binding, unmount); it does NOT prove real-browser layout, focus rings or screen-reader
// behaviour.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { mount } from '../src/pronunciation/sounds.view.js';
import { describeSign, normalizeTradition, soundChangingLetters, pairFormFor } from '../src/pronunciation/sounds.model.js';

const load = (f) => JSON.parse(fs.readFileSync(new URL(`../data/pronunciation/${f}.json`, import.meta.url), 'utf8'));
const data = { niqqud: load('niqqud'), consonants: load('consonants'), drills: load('drills'), easy: load('easy') };

class Node_ { constructor() { this.children = []; this.parent = null; } }
class Text_ extends Node_ { constructor(d) { super(); this.nodeType = 3; this.data = d; } get textContent() { return this.data; } }
class El extends Node_ {
  constructor(tag, doc) { super(); this.nodeType = 1; this.tagName = tag.toUpperCase(); this.attrs = {}; this.listeners = {}; this.ownerDocument = doc; this.checked = false; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return this.attrs[k] ?? null; }
  append(...kids) { for (const k of kids) { if (typeof k === 'string') this.children.push(new Text_(k)); else { k.parent = this; this.children.push(k); } } }
  replaceChildren(...kids) { this.children = []; this.append(...kids); }
  addEventListener(t, f) { (this.listeners[t] ??= new Set()).add(f); }
  removeEventListener(t, f) { this.listeners[t]?.delete(f); }
  dispatch(t) { for (const f of [...(this.listeners[t] ?? [])]) f({ target: this }); }
  get textContent() { return this.children.map((c) => c.textContent).join(''); }
  set textContent(v) { this.children = [new Text_(String(v))]; }
}
class Doc { createElement(t) { return new El(t, this); } createTextNode(s) { return new Text_(s); } }
const walk = (n, f) => { f(n); for (const c of n.children ?? []) walk(c, f); };
const all = (n, pred) => { const r = []; walk(n, (x) => { if (x.nodeType === 1 && pred(x)) r.push(x); }); return r; };
import { waitFor } from './helpers/waitfor.js';
const tick = () => new Promise((r) => setTimeout(r, 0));
const loaded = (root, extra = () => true) => waitFor(() => root.children.length > 0 && !/Loading/.test(root.textContent) && extra(), { message: 'view never finished loading' });

function makeCtx(congregation = 'sephardi') {
  const played = [];
  const sets = [];
  const subs = new Set();
  const settings = { congregation, set(k, v) { sets.push([k, v]); this.congregation = v; }, subscribe(fn) { subs.add(fn); return () => subs.delete(fn); } };
  return { ctx: { settings, audio: { play: (k, id) => played.push([k, id]) }, t: (k) => k, pronunciationData: data }, played, sets, subs, settings };
}

test('model: describeSign follows the tradition and inherits for variants', () => {
  const kamatz = data.niqqud.records.find((r) => r.id === 'kamatz');
  assert.equal(describeSign(kamatz, 'israeli').ipa, '[a]');
  assert.equal(describeSign(kamatz, 'ashkenazi').ipa, '[ɔ]');
  assert.match(describeSign(kamatz, 'ashkenazi').english, /saw/);
  assert.match(describeSign(kamatz, 'sephardi').americanSynagogue, /father/);
  assert.equal(describeSign(kamatz, 'israeli').americanSynagogue, '');
  const kk = kamatz.variants.find((v) => v.id === 'kamatz-katan');
  assert.equal(describeSign(kk, 'israeli', kamatz).ipa, '[o̞]');
  const malei = kamatz.variants.find((v) => v.id === 'kamatz-malei');
  const d = describeSign(malei, 'ashkenazi', kamatz);
  assert.equal(d.ipa, '[ɔ]'); assert.equal(d.inherited, true);
  assert.equal(normalizeTradition('bogus'), 'israeli');
});

test('model: sound-changing letters and pair forms per tradition', () => {
  const tav = soundChangingLetters(data.consonants, 'ashkenazi').find((l) => l.id === 'tav');
  assert.match(tav.ipa, /\[s\]/);
  const p = data.drills.pairs.find((x) => x.id === 'shabbat');
  assert.equal(pairFormFor(p, 'sephardi'), 'Shabbat');
  assert.equal(pairFormFor(p, 'ashkenazi'), 'Shabbos');
});

test('view: renders 15 playable signs, a 3-way switcher, easy facts and drills', async () => {
  const doc = new Doc(); const root = doc.createElement('div');
  const { ctx } = makeCtx();
  const unmount = mount(root, ctx);
  assert.equal(typeof unmount, 'function');
  await loaded(root, () => all(root, (e) => e.tagName === 'BUTTON' && e.attrs.class === 'sign').length === 15);
  assert.equal(all(root, (e) => e.tagName === 'BUTTON' && e.attrs.class === 'sign').length, 15);
  assert.equal(all(root, (e) => e.tagName === 'INPUT' && e.attrs.type === 'radio').length, 3);
  assert.equal(all(root, (e) => e.tagName === 'FIELDSET').length, 1);
  assert.equal(all(root, (e) => e.tagName === 'LEGEND').length, 1);
  assert.ok(all(root, (e) => e.tagName === 'DETAILS').length >= data.drills.drills.length);
  assert.ok(root.textContent.includes('five-vowel system'));
  assert.ok(all(root, (e) => e.tagName === 'A' && e.attrs.href.startsWith('https://')).length >= 7); // cited facts link out
  unmount();
});

test('view: every Hebrew span is dir=rtl lang=he and contains only Hebrew-block text', async () => {
  const doc = new Doc(); const root = doc.createElement('div');
  mount(root, makeCtx().ctx); await loaded(root);
  const spans = all(root, (e) => e.attrs.lang === 'he');
  assert.ok(spans.length > 30);
  for (const s of spans) {
    assert.equal(s.attrs.dir, 'rtl');
    assert.ok([...s.textContent].every((c) => c >= '֐' && c <= '׿'), s.textContent);
  }
});

test('view: tapping a sign calls ctx.audio.play("vowel", id)', async () => {
  const doc = new Doc(); const root = doc.createElement('div');
  const { ctx, played } = makeCtx();
  mount(root, ctx); await loaded(root);
  const btns = all(root, (e) => e.attrs.class === 'sign');
  btns[0].dispatch('click');
  assert.deepEqual(played, [['vowel', 'kamatz']]);
  btns.at(-1).dispatch('click');
  assert.deepEqual(played.at(-1), ['vowel', 'sin-dot']);
  assert.ok(btns.every((b) => b.attrs['aria-label'] && b.attrs.type === 'button'));
});

test('view: works with no audio in ctx', async () => {
  const doc = new Doc(); const root = doc.createElement('div');
  const { ctx } = makeCtx(); delete ctx.audio;
  mount(root, ctx); await loaded(root);
  assert.doesNotThrow(() => all(root, (e) => e.attrs.class === 'sign')[0].dispatch('click'));
});

test('view: switching tradition writes settings.congregation and updates IPA live', async () => {
  const doc = new Doc(); const root = doc.createElement('div');
  const { ctx, sets, settings } = makeCtx('israeli');
  mount(root, ctx); await loaded(root);
  const firstCard = () => all(root, (e) => e.tagName === 'LI' && e.parent?.attrs.class === 'vowel-grid')[0].textContent;
  assert.ok(firstCard().includes('[a]'));
  const ashk = all(root, (e) => e.tagName === 'INPUT' && e.attrs.value === 'ashkenazi')[0];
  ashk.checked = true; ashk.dispatch('change');
  assert.deepEqual(sets.at(-1), ['congregation', 'ashkenazi']);
  assert.equal(settings.congregation, 'ashkenazi');
  assert.ok(firstCard().includes('[ɔ]'));
  assert.ok(firstCard().includes('saw'));
  // radios reflect the state
  assert.equal(all(root, (e) => e.tagName === 'INPUT' && e.attrs.value === 'israeli')[0].checked, false);
  // pairs table highlights the Ashkenazi column
  assert.ok(all(root, (e) => e.attrs.class === 'current').some((e) => e.textContent === 'Shabbos'));
});

test('view: Sephardi shows the American-synagogue line; initial radio follows settings.congregation', async () => {
  const doc = new Doc(); const root = doc.createElement('div');
  mount(root, makeCtx('sephardi').ctx); await loaded(root);
  assert.equal(all(root, (e) => e.tagName === 'INPUT' && e.attrs.value === 'sephardi')[0].checked, true);
  assert.ok(root.textContent.includes('In an American synagogue'));
});

test('view: follows external changes of the congregation setting and unsubscribes on unmount', async () => {
  const doc = new Doc(); const root = doc.createElement('div');
  const { ctx, subs, settings } = makeCtx('israeli');
  const unmount = mount(root, ctx); await loaded(root);
  assert.equal(subs.size, 1);
  settings.congregation = 'ashkenazi'; for (const f of subs) f();
  assert.equal(all(root, (e) => e.tagName === 'INPUT' && e.attrs.value === 'ashkenazi')[0].checked, true);
  unmount();
  assert.equal(subs.size, 0);
  assert.equal(root.children.length, 0);
});

test('view: unmount before data arrives is safe; missing data shows an alert', async () => {
  const doc = new Doc(); const root = doc.createElement('div');
  const un = mount(root, makeCtx().ctx); un(); await tick();
  assert.equal(root.children.length, 0);
  const root2 = doc.createElement('div');
  const failing = { settings: {}, pronunciationData: undefined };
  const orig = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: false, status: 404 });
  try { mount(root2, failing); await waitFor(() => all(root2, (e) => e.attrs.role === 'alert').length === 1, { message: 'no load-failure alert' }); } finally { globalThis.fetch = orig; }
  assert.equal(all(root2, (e) => e.attrs.role === 'alert').length, 1);
});
