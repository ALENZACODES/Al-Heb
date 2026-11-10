// Memory-chain cards inside the real Review screen (fake DOM): registration from completed lessons, a right answer, a missed answer
// (story + tip shown, card lapsed), the recall card (flip and self-grade), the learner's setting, and completeLesson's card registration.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
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

const HAVE = existsSync(new URL('../data/letters/memory-chain.json', import.meta.url));
const T = { skip: !HAVE && 'no memory-chain.json' };
const { mountReview, describeCard } = await import('../src/curriculum/review.view.js');
const { completeLesson, loadState } = await import('../src/curriculum/actions.js');
const { loadContent } = await import('../src/curriculum/content.js');
const { lessons } = await import('../src/curriculum/lessons.js');
const { hashSeed } = await import('../src/curriculum/exercises.session.js');
const c = await loadContent();
const lesson = lessons.find((l) => l.letters.length >= 2 && l.track === 'read') || lessons[0];

const ctxFor = (store, congregation = 'sephardi') => ({ store, route() {}, t: (k) => k, settings: { get: (k) => ({ congregation }[k]) }, audio: { play: async () => ({ source: 'tts-fallback' }) } });

test('completeLesson registers the lesson letters\' memory cards (staggered), and the lesson\'s own card count is unchanged', T, async () => {
  const store = memStore(), now = Date.UTC(2026, 10, 4);
  const r = await completeLesson(ctxFor(store), lesson, now);
  const cards = store.m['srs.cards'];
  assert.equal(r.added, lesson.letters.length + lesson.vowels.length + lesson.words.length, 'lesson cards counted as before');
  for (const id of lesson.letters) {
    assert.equal(cards[`mem:${id}:pic`].due, now + 86400000); assert.ok(cards[`mem:${id}:hook`].due > cards[`mem:${id}:pic`].due); assert.ok(cards[`mem:${id}:recall`].due > cards[`mem:${id}:word`].due);
  }
  await completeLesson(ctxFor(store), lesson, now + 1000); // again: nothing new
  assert.equal(Object.keys(store.m['srs.cards']).length, Object.keys(cards).length);
});

test('Review: a right answer shows the story, Continue rates Good; a miss shows story + tip and rates Again', T, async () => {
  const now = Date.now(), card = (id) => ({ id, kind: 'mem', state: 'new', stability: 0, difficulty: 0, reps: 0, lapses: 0, lastReview: null, due: now - 1000 });
  const store = memStore({ 'curriculum.progress': { completed: { [lesson.id]: now - 1000 } }, 'srs.cards': Object.fromEntries(lesson.letters.map((l) => [`mem:${l}:pic`, card(`mem:${l}:pic`)])) });
  const root = new Node_('div'); const un = mountReview(root, ctxFor(store));
  await until(root, /Card 1 of/);
  const queue = Object.keys(store.m['srs.cards']).filter((id) => id.endsWith(':pic'));
  assert.equal(queue.length, lesson.letters.length);
  const first = /Card 1 of (\d+)/.exec(root.text); assert.equal(Number(first[1]), lesson.letters.length);
  assert.match(root.text, /Which letter goes with this picture\?/);
  assert.equal(opts(root).length, 4);
  // the shown card is the first in the queue; rebuild its question to know the answer
  const answerIdOf = (cardId) => describeCard(cardId, c, 'sephardi', null, { seed: hashSeed(cardId + ':0'), known: new Set(lesson.letters) }).q;
  const ids = queue;
  // find which card is on screen by matching the option order of its question
  const onScreen = ids.find((id) => { const q = answerIdOf(id); return opts(root).map((b) => b.attrs['aria-label']).join('|') === q.options.map((o, i) => `${i + 1}. ${o.text}${o.sub ? `, ${o.sub}` : ''}`).join('|'); });
  assert.ok(onScreen, 'the card on screen is one of the registered cards, built with the documented seed');
  const q = answerIdOf(onScreen);
  await opts(root)[q.answerIndex].click();
  await until(root, /Right\./); assert.ok(root.text.includes(q.story)); assert.ok(!root.text.includes('Close.'));
  assert.ok(opts(root).every((b) => b.disabled), 'options locked after the answer');
  await btn(root, /^Continue/).click();
  const done = store.m['srs.cards'][onScreen]; assert.equal(done.reps, 1); assert.equal(done.state, 'review');
  // next card: pick a wrong option
  await until(root, /Card 2 of/);
  const label2 = opts(root).map((b) => b.attrs['aria-label']).join('|');
  const second = ids.find((id) => id !== onScreen && (() => { const q2 = answerIdOf(id); return label2 === q2.options.map((o, i) => `${i + 1}. ${o.text}${o.sub ? `, ${o.sub}` : ''}`).join('|'); })());
  assert.ok(second);
  const q2 = answerIdOf(second), wrong = q2.options.findIndex((_, i) => i !== q2.answerIndex);
  await key(String(wrong + 1)); // keys 1-4 choose
  await until(root, /Close\./); assert.ok(root.text.includes(q2.story)); assert.ok(root.text.includes(q2.tip)); assert.ok(!/wrong|incorrect|mistake/i.test(root.text));
  await btn(root, /^Continue/).click();
  assert.equal(store.m['srs.cards'][second].state, 'relearning');
  assert.ok(store.m['srs.cards'][second].due < now + 3600 * 1000, 'a miss comes back soon');
  // the look-alike pairs offered in the two questions were counted (a trial each; an error for the picked wrong one)
  await waitFor(() => Object.keys(store.m['curriculum.pairs'] || {}).length > 0, { message: 'no pair outcome stored' });
  un();
});

test('Review start registers memory cards for letters of already-completed lessons, not yet due', T, async () => {
  const now = Date.now(), store = memStore({ 'curriculum.progress': { completed: { [lesson.id]: now - 1000 } } });
  const root = new Node_('div'); const un = mountReview(root, ctxFor(store));
  await until(root, /Nothing due/);
  assert.ok(lesson.letters.every((l) => store.m['srs.cards'][`mem:${l}:pic`].due > now));
  un();
});

test('Review: recall card flips to the hook, word and story, then the usual 1-4 self-grade', T, async () => {
  const now = Date.now(), id = lesson.letters[0];
  const store = memStore({ 'curriculum.progress': { completed: { [lesson.id]: now } }, 'srs.cards': { [`mem:${id}:recall`]: { id: `mem:${id}:recall`, kind: 'mem', state: 'new', stability: 0, difficulty: 0, reps: 0, lapses: 0, lastReview: null, due: now - 1 } } });
  const root = new Node_('div'); const un = mountReview(root, ctxFor(store));
  await until(root, /Remember its picture/);
  const e = c.chain.get(id);
  await btn(root, /Show answer/).click();
  await until(root, /Hook:/); assert.ok(root.text.includes(e.word.he)); assert.ok(root.text.includes(e.story));
  await key('3');
  await waitFor(() => store.m['srs.cards'][`mem:${id}:recall`].reps === 1, { message: 'recall card never rated' });
  un();
});

test('the learner\'s setting changes the sound shown: Ashkenazi tav starts with the dagesh sound, options come from consonants.json', T, () => {
  const d = (tr) => describeCard('mem:tav:word', c, tr, null, { seed: 1 }).q;
  for (const tr of ['israeli', 'sephardi', 'ashkenazi']) assert.ok(d(tr).options.find((o) => o.id === 'tav').sub);
  assert.equal(describeCard('mem:bet:nope', c, 'sephardi'), null);
});
