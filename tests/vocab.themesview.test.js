import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// Minimal fake DOM (checks view logic, NOT browser rendering).
class N {
  constructor(tag) { this.tag = tag; this.children = []; this.attrs = {}; this.listeners = {}; this.parent = null; this.nodeType = 1; this.className = ''; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return this.attrs[k]; }
  removeAttribute(k) { delete this.attrs[k]; }
  addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }
  append(...c) { for (const x of c) { this.children.push(x); if (x && x.parent !== undefined) x.parent = this; } }
  replaceChildren(...c) { this.children = []; this.append(...c.filter((x) => x != null)); }
  set textContent(v) { this.replaceChildren(document.createTextNode(v)); }
  get textContent() { return this.text; }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter((x) => x !== this); }
  focus() { globalThis.__focus = this; }
  get text() { return this.children.map((c) => (c.nodeType === 3 ? c.data : c.text)).join(''); }
  find(pred, out = []) { if (pred(this)) out.push(this); for (const c of this.children) if (c.nodeType === 1) c.find(pred, out); return out; }
  async fire(type, ev = {}) { for (const f of this.listeners[type] || []) await f({ target: this, preventDefault() {}, ...ev }); }
  click() { return this.fire('click'); }
}
globalThis.document = { createElement: (t) => new N(t), createTextNode: (d) => ({ nodeType: 3, data: String(d), parent: undefined }) };
import { waitFor } from './helpers/waitfor.js';
const tick = (ms = 60) => new Promise((r) => setTimeout(r, ms));
const memStore = () => { const m = {}; return { get: (k) => m[k], set: (k, v) => { m[k] = v; }, m }; };

const { mount, sendPack, bridgeKey, STORE_KEY, SENSE_NOTE } = await import('../src/vocab/themes.view.js');
const { ATTRIBUTION, DRAFT_NOTICE } = await import('../src/vocab/vocab.view.js');
const index = JSON.parse(fs.readFileSync(new URL('../data/vocab/themes/index.json', import.meta.url), 'utf8'));
const readPack = (id) => JSON.parse(fs.readFileSync(new URL(`../data/vocab/themes/${id}.json`, import.meta.url), 'utf8'));

const setup = async (extra = {}) => {
  const root = new N('div'); const store = memStore(); const played = [];
  const audio = { has: (k, id) => k === 'word' && (extra.recorded || []).includes(id), play: async (k, id) => { played.push(id); return { source: 'file', entryStatus: 'recorded' }; }, stop() {} };
  const ctx = { store, query: extra.query || {}, audio, now: () => 1_700_000_000_000, settings: { get() {} } };
  const un = mount(root, ctx);
  await waitFor(() => root.find((n) => n.attrs['data-pack'] || n.attrs['data-action'] === 'send' || (n.tag === 'li' && n.attrs['data-id'])).length > 0, { message: "root.find((n) => n.attrs['data-pack'] || n.attrs['data-action'] === 'send' || (n.tag === 'li' && n.attrs['data-id'])).length > 0" });
  return { root, store, ctx, un, played };
};
const buttons = (root) => root.find((n) => n.tag === 'button');
const byText = (root, re) => buttons(root).find((b) => re.test(b.text));

test('lists all 40 packs as real buttons, with the draft notice and CC BY-SA attribution', async () => {
  const { root } = await setup();
  const packs = buttons(root).filter((b) => b.attrs['data-pack']);
  assert.equal(packs.length, 40);
  assert.deepEqual(packs.map((b) => b.attrs['data-pack']), index.themes.map((t) => t.id));
  for (const b of packs) assert.equal(b.attrs.type, 'button');
  assert.ok(root.text.includes(DRAFT_NOTICE));
  assert.ok(root.text.includes(ATTRIBUTION));
  assert.match(root.text, /Tatoeba contributors \(CC BY 2\.0 FR\)/);
  assert.equal(root.find((n) => n.tag === 'a' && n.attrs.href === '#/credits').length, 1);
  assert.equal(root.find((n) => n.tag === 'h1').length, 1);
});

test('opening a pack lists its words with a listen button each and the verbatim example when present', async () => {
  const { root, played } = await setup({ recorded: [readPack('food-drink-set01').words[0].id] });
  await root.find((n) => n.attrs['data-pack'] === 'food-drink-set01')[0].click();
  const pack = readPack('food-drink-set01');
  await waitFor(() => root.find((n) => n.tag === 'li' && n.attrs['data-id']).length === pack.words.length, { message: "root.find((n) => n.tag === 'li' && n.attrs['data-id']).length === pack.words.length" });
  const lis = root.find((n) => n.tag === 'li' && n.attrs['data-id']);
  assert.equal(lis.length, pack.words.length);
  pack.words.forEach((w, i) => {
    const li = lis[i];
    assert.equal(li.attrs['data-id'], w.id);
    assert.ok(li.text.includes(w.he) && li.text.includes(w.en));
    assert.ok(li.find((n) => n.tag === 'button' && /Listen/.test(n.text)).length === 1);
    if (w.example) { assert.ok(li.text.includes(w.example.he), 'verbatim example shown'); assert.ok(li.text.includes(SENSE_NOTE)); }
    else assert.ok(/No example line/.test(li.text));
  });
  assert.ok(lis[0].text.includes('Listen') && !/computer voice/.test(lis[0].find((n) => n.tag === 'button')[0].text), 'recorded word is not labelled computer voice');
  await lis[0].find((n) => n.tag === 'button')[0].click();
  await waitFor(() => played.length > 0, { message: "played.length > 0" });
  assert.deepEqual(played, [pack.words[0].id], 'ctx.audio.play was used');
});

test('send to my review deck: adds vocab SRS cards once, reports what it skipped, remembers in vocab.themes.v1', async () => {
  const { root, store } = await setup({ query: { pack: 'food-drink-set01' } });
  const send = root.find((n) => n.attrs['data-action'] === 'send')[0];
  assert.ok(send && send.tag === 'button');
  await send.click(); await waitFor(() => Object.keys(store.m['srs.vocab'] || {}).length > 20 && root.find((n) => n.attrs.role === 'status' && /added/.test(n.text)).length > 0, { message: "Object.keys(store.m['srs.vocab'] || {}).length > 20 && root.find((n) => n.attrs.role === 'status' && /added/.test(n.text)).length > 0" });
  const cards = store.m['srs.vocab'];
  assert.ok(cards && Object.keys(cards).length > 20, 'cards were created');
  for (const [id, c] of Object.entries(cards)) { assert.ok(id.startsWith('vocab:')); assert.equal(c.id, id); assert.equal(c.state, 'new'); assert.equal(c.kind, 'word'); }
  const msg = root.find((n) => n.attrs.role === 'status' && n.attrs['aria-live'] === 'polite' && /added/.test(n.text))[0];
  assert.match(msg.text, /(\d+) cards? added to your review deck\. (\d+) already there\. (\d+) not in the 5,000-word review list/);
  const first = Object.keys(cards).length;
  assert.equal(store.m[STORE_KEY].v, 1);
  assert.equal(STORE_KEY, 'vocab.themes.v1');
  assert.equal(store.m[STORE_KEY].sent['food-drink-set01'].added, first);
  await send.click(); await waitFor(() => store.m[STORE_KEY].sent['food-drink-set01'].added === 0, { message: "store.m[STORE_KEY].sent['food-drink-set01'].added === 0" });
  assert.equal(Object.keys(store.m['srs.vocab']).length, first, 'second send adds nothing');
  assert.equal(store.m[STORE_KEY].sent['food-drink-set01'].added, 0);
  assert.equal(store.m[STORE_KEY].sent['food-drink-set01'].existing, first);
});

test('keyboard: Escape returns to the pack list and focus goes to the heading', async () => {
  const { root } = await setup({ query: { pack: 'small-words-set01' } });
  assert.ok(root.find((n) => n.attrs['data-id']).length > 0);
  const wrap = root.find((n) => n.tag === 'section')[0];
  await wrap.fire('keydown', { key: 'Escape' });
  assert.equal(buttons(root).filter((b) => b.attrs['data-pack']).length, 40);
  assert.equal(globalThis.__focus.tag, 'h1');
  const h1 = root.find((n) => n.tag === 'h1')[0];
  assert.equal(h1.attrs.tabindex, '-1');
});

test('unmount removes the view; an unknown ?pack falls back to the list', async () => {
  const a = await setup({ query: { pack: 'nope' } });
  assert.equal(buttons(a.root).filter((b) => b.attrs['data-pack']).length, 40);
  a.un();
  assert.equal(a.root.find((n) => n.tag === 'section').length, 0);
});

test('sendPack matches by pointed form + part of speech and never touches input', () => {
  const entries = [{ id: 'v1', pointed: 'לֶחֶם', lemma: 'לחם', pos: 'noun', tier: 500, topic: 'Food' }];
  const words = [{ he: 'לֶחֶם', pos: 'noun' }, { he: 'לֶחֶם', pos: 'verb' }, { he: 'זָרוּק', pos: 'adj' }];
  const cards = { 'vocab:v9': { id: 'vocab:v9' } };
  const frozen = JSON.stringify(cards);
  const r = sendPack(cards, words, entries, 5);
  assert.equal(r.added, 1); assert.equal(r.skipped, 2); assert.equal(r.existing, 0);
  assert.equal(r.cards['vocab:v1'].topic, 'Food');
  assert.equal(JSON.stringify(cards), frozen);
  assert.equal(sendPack(r.cards, words, entries, 6).existing, 1);
  assert.equal(bridgeKey('a', 'noun'), 'a|noun');
});

test('a theme-pack word flagged hidden (flags.hidden or "hidden" in a flags array) never renders', async () => {
  const pack = readPack('food-drink-set01');
  const w0 = { ...pack.words[0], id: 'hidden-obj', flags: { hidden: true } };
  const w1 = { ...pack.words[1], id: 'hidden-arr', flags: ['hidden'] };
  const packs = { 'food-drink-set01': { ...pack, words: [w0, w1, ...pack.words.slice(2)] } };
  const root = new N('div');
  mount(root, { store: memStore(), query: {}, audio: { has: () => false, play: async () => ({}), stop() {} }, now: () => 1, settings: { get() {} }, themesData: { index, packs } });
  await waitFor(() => root.find((n) => n.attrs['data-pack']).length > 0, { message: 'list' });
  await root.find((n) => n.attrs['data-pack'] === 'food-drink-set01')[0].click();
  await waitFor(() => root.find((n) => n.tag === 'li' && n.attrs['data-id']).length === pack.words.length - 2, { message: 'two hidden words dropped' });
  const ids = root.find((n) => n.tag === 'li' && n.attrs['data-id']).map((n) => n.attrs['data-id']);
  assert.ok(!ids.includes('hidden-obj') && !ids.includes('hidden-arr'));
});
