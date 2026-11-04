import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

class N {
  constructor(tag) { this.tag = tag; this.nodeType = 1; this.children = []; this.attrs = {}; this.listeners = {}; this.parent = null; this.className = ''; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return this.attrs[k]; }
  addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }
  append(...c) { for (const x of c) { if (x && x.nodeType === 1) x.parent = this; this.children.push(x); } }
  replaceChildren(...c) { this.children = []; this.append(...c.filter((x) => x != null)); }
  set textContent(v) { this.replaceChildren(document.createTextNode(v)); }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter((x) => x !== this); }
  focus() {}
  get text() { return this.children.map((c) => (c.nodeType === 3 ? c.data : c.text)).join(''); }
  find(pred, out = []) { if (pred(this)) out.push(this); for (const c of this.children) if (c.nodeType === 1) c.find(pred, out); return out; }
  click() { for (const f of this.listeners.click || []) f({ target: this }); }
}
globalThis.document = { createElement: (t) => new N(t), createTextNode: (d) => ({ nodeType: 3, data: String(d) }) };
const flush = () => new Promise((r) => setTimeout(r, 0));
const waitFor = async (f) => { for (let i = 0; i < 200; i++) { const v = f(); if (v) return v; await flush(); } throw new Error('timeout'); };
const btn = (root, re) => root.find((n) => n.tag === 'button' && re.test(n.text))[0];
const store = () => { const m = {}; return { get: (k) => m[k], set: (k, v) => { m[k] = v; }, m }; };
const seeded = (s = 7) => () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };

const { mount } = await import('../src/listen/listen.view.js');
const model = await import('../src/listen/model.js');
const cfg = JSON.parse(readFileSync(new URL('../data/listen/config.json', import.meta.url), 'utf8'));
const words = JSON.parse(readFileSync(new URL('../data/vocab/words.json', import.meta.url), 'utf8')).words;

test('pool and questions: 4 distinct look-alike choices containing the answer', () => {
  const pool = model.buildPool(words, cfg);
  assert.ok(pool.length > 100);
  const qs = model.buildRound(pool, pool, cfg, seeded(), 'read', {});
  assert.equal(qs.length, cfg.rounds);
  for (const q of qs) {
    assert.equal(q.choices.length, 4);
    assert.equal(new Set(q.choices.map((c) => c.he)).size, 4);
    assert.ok(q.choices.some((c) => c.he === q.answer));
  }
});

test('normState tolerates junk and applyAnswer tracks misses', () => {
  assert.deepEqual(model.normState('x'), model.emptyState());
  let s = model.applyAnswer(null, 'a', false, 5);
  assert.equal(s.missed.a, 1);
  s = model.applyAnswer(s, 'a', true, 6);
  assert.equal(s.missed.a, undefined); assert.equal(s.correct, 1);
});

test('no-audio path: honest notice, read-and-match, saves to listen.v1', async () => {
  const root = new N('div'), st = store(), played = [];
  const un = mount(root, { listenData: { config: cfg, words }, store: st, rng: seeded(), audio: { has: () => false, play: (...a) => played.push(a) } });
  const start = await waitFor(() => btn(root, /Start read-and-match/));
  assert.match(root.text, /Audio not recorded yet/);
  assert.match(root.text, /Draft/);
  assert.doesNotMatch(root.text, /Start listening drill/);
  start.click();
  const opts = await waitFor(() => root.find((n) => n.attrs.role === 'group')[0]);
  assert.match(root.text, /means:/);
  assert.equal(opts.children.length, 4);
  for (const b of opts.children) assert.equal(b.tag, 'button');
  opts.children[0].click();
  await waitFor(() => st.m['listen.v1']);
  assert.equal(st.m['listen.v1'].answered, 1);
  assert.equal(played.length, 0);
  await waitFor(() => btn(root, /Next word/));
  un();
});

test('audio path: plays the word and offers 4 written choices', async () => {
  const root = new N('div'), st = store(), played = [];
  const un = mount(root, { listenData: { config: cfg, words }, store: st, rng: seeded(), audio: { has: () => true, play: async (...a) => { played.push(a); return { source: 'file' }; } } });
  (await waitFor(() => btn(root, /Start listening drill/))).click();
  const opts = await waitFor(() => root.find((n) => n.attrs.role === 'group')[0]);
  assert.equal(opts.children.length, 4);
  assert.equal(played.length, 1); assert.equal(played[0][0], 'word');
  assert.ok(btn(root, /^Play$/));
  assert.doesNotMatch(root.text, /Audio not recorded yet/);
  un();
});
