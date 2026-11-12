// H3 cram sessions, H4 leeches, H5 mastery states: pure rules and the real Review screen (fake DOM).
import test from 'node:test';
import assert from 'node:assert/strict';
import { waitFor } from './helpers/waitfor.js';
class Node_ {
  constructor(tag) { this.tag = tag; this.children = []; this.attrs = {}; this.listeners = {}; this.parent = null; this.nodeType = 1; this.className = ''; this.hidden = false; const self = this; this.classList = { add: (c) => { self.className += ' ' + c; }, toggle: () => true }; }
  setAttribute(k, v) { this.attrs[k] = v; if (k === 'hidden') this.hidden = true; }
  getAttribute(k) { return this.attrs[k]; }
  removeAttribute(k) { delete this.attrs[k]; if (k === 'hidden') this.hidden = false; }
  addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }
  append(...c) { for (const x of c) { this.children.push(x); if (x && x.parent !== undefined) x.parent = this; } }
  replaceChildren(...c) { this.children = []; this.append(...c.map((x) => (x == null ? { nodeType: 3, data: String(x), parent: undefined } : x))); }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter((x) => x !== this); }
  focus() {} scrollIntoView() {}
  set textContent(v) { this.children = [{ nodeType: 3, data: String(v), parent: undefined }]; }
  get text() { return this.children.map((c) => (c.nodeType === 3 ? c.data : c.hidden ? '' : c.text)).join(''); }
  find(pred, out = []) { if (pred(this)) out.push(this); for (const c of this.children) if (c.nodeType === 1) c.find(pred, out); return out; }
  querySelector(sel) { const m = /^\w+$/.test(sel) ? sel : null; return m ? this.find((n) => n.tag === m)[0] || null : null; }
  async click() { if (this.disabled || this.attrs.disabled !== undefined) return; for (const f of this.listeners.click || []) await f({}); }
  set disabled(v) { this._d = v; } get disabled() { return !!this._d; }
}
const docListeners = {};
globalThis.document = { createElement: (t) => new Node_(t), createTextNode: (d) => ({ nodeType: 3, data: String(d), parent: undefined }),
  addEventListener: (t, f) => { (docListeners[t] ||= new Set()).add(f); }, removeEventListener: (t, f) => docListeners[t]?.delete(f) };
const key = async (k) => { for (const f of [...(docListeners.keydown || [])]) await f({ key: k, preventDefault() {}, target: { tagName: 'BODY' } }); };
const memStore = (init = {}) => { const m = { ...init }; return { get: (k) => m[k], set: (k, v) => { m[k] = v; }, m }; };
const until = (n, re) => waitFor(() => re.test(n.text), { message: `text ${re} never appeared` });
const btn = (root, re) => root.find((n) => n.tag === 'button' && re.test((n.attrs['aria-label'] || '') + n.text))[0];
const opts = (root) => root.find((n) => n.tag === 'button' && n.attrs['data-opt'] !== undefined);


const T5 = await import('../src/platform/srs-tools.js');
const { mountReview } = await import('../src/curriculum/review.view.js');
const D = 86400000;
const card = (id, o = {}) => ({ id, kind: 'letter', state: 'review', stability: 5, difficulty: 5, reps: 3, lapses: 0, lastReview: Date.now() - 2 * D, due: Date.now() + 3 * D, ...o });
const ctxFor = (store) => ({ store, route() {}, t: (k) => k, settings: { get: (k) => ({ congregation: 'sephardi' }[k]) }, audio: { play: async () => ({ source: 'tts-fallback' }) } });

test('mastery states follow the stated thresholds; leeches count lapses or logged misses', () => {
  assert.equal(T5.masteryOf({ state: 'new', lastReview: null }), 'new');
  assert.equal(T5.masteryOf(card('a', { state: 'relearning', stability: 40 })), 'learning');
  assert.equal(T5.masteryOf(card('a', { stability: 6.9 })), 'learning');
  assert.equal(T5.masteryOf(card('a', { stability: 7 })), 'known');
  assert.equal(T5.masteryOf(card('a', { stability: 30 })), 'mastered');
  assert.deepEqual(T5.cardLabel({ id: 'letter:bet' }), { kind: 'letter', label: 'bet' });
  assert.equal(T5.isLeech(card('a', { lapses: 4 })), false);
  assert.equal(T5.isLeech(card('a', { lapses: 5 })), true);
  assert.equal(T5.isLeech(card('a', { log: [204001, 204011, 204021, 204031, 204041] })), true, 'five Again answers in the log');
});

test('cram: sized by minutes and pace, due first then leeches then lowest recall under 85%', () => {
  const now = Date.now();
  const cards = {
    d2: card('d2', { due: now - 2 * D }), d1: card('d1', { due: now - D }),
    weak: card('weak', { stability: 0.5, lastReview: now - 3 * D }), leech: card('leech', { lapses: 6 }), strong: card('strong', { stability: 100, lastReview: now - D }),
    n: { id: 'n', state: 'new', due: now - D, lastReview: null },
  };
  const q = T5.cramQueue(cards, now, 1, 12);
  assert.equal(q.size, 5);
  assert.deepEqual(q.ids, ['d2', 'd1', 'leech', 'weak']);
  assert.equal(q.due, 2); assert.equal(q.weak, 2);
  assert.deepEqual(T5.cramQueue(cards, now, 1, 30).ids, ['d2', 'd1'], 'two cards fit in one minute at 30 seconds a card');
  assert.deepEqual(T5.paceOf(null), { seconds: T5.DEFAULT_SECONDS, measured: false, n: 0 });
  let p = null; for (let i = 0; i < T5.PACE_MIN; i++) p = T5.addPace(p, i === 0 ? 999 : 8);
  const pace = T5.paceOf(p); assert.equal(pace.measured, true); assert.ok(pace.seconds < 15, 'one card left open is clamped at 120 s');
});

test('Review with minutes: cram note, due and weak cards; a leech comes the other way round; the pace is recorded', async () => {
  const now = Date.now();
  const store = memStore({ 'srs.cards': {
    'letter:bet': card('letter:bet', { due: now - D }),
    'letter:shin': card('letter:shin', { lapses: 6 }),
    'letter:tav': card('letter:tav', { stability: 100, lastReview: now - D }),
  } });
  const root = new Node_('div'); const un = mountReview(root, ctxFor(store), { minutes: 1 });
  await until(root, /Card 1 of 2/);
  assert.match(root.text, /Cram for 1 minutes: 2 cards, at an estimated 12 seconds a card/);
  assert.doesNotMatch(root.text, /missed 6 times/, 'the due card comes first, in its normal way');
  await btn(root, /^Show answer/).click();
  await btn(root, /Good/).click();
  await until(root, /Card 2 of 2/);
  assert.match(root.text, /A different way for a card you have missed 6 times: read the answer, recall the Hebrew/);
  await btn(root, /^Show answer/).click();
  assert.match(root.text, /ש/, 'the Hebrew is on the answer side');
  await btn(root, /Good/).click();
  await waitFor(() => store.m['review.pace']?.n === 2, { message: 'pace not recorded' });
  un();
});

test('Cram and Mastery Map pages render from the stored cards', async () => {
  const { N, tick, memStore: ms } = await import('./torahread.fakedom.js');
  const store = ms(); store.m['srs.cards'] = { 'letter:bet': card('letter:bet', { due: Date.now() - D }), 'letter:shin': card('letter:shin', { stability: 40 }) };
  const C = await import('../src/platform/cram.view.js'); let root = new N('main'); C.mount(root, { store }); await tick(5);
  assert.match(root.textContent, /an estimate of 12 seconds a card/);
  assert.ok(root.all((n) => n.tag === 'a').some((a) => a.attrs.href === '#/learn?review=1&minutes=10'));
  const M = await import('../src/platform/mastery.view.js'); root = new N('main'); M.mount(root, { store }); await tick(5);
  assert.match(root.textContent, /New: 0\. Learning: 1\. Known: 0\. Mastered: 1\. Total: 2\./);
  assert.match(root.textContent, /bet \(letter\)/);
  assert.equal(root.queryAll('h1').length, 1);
});
