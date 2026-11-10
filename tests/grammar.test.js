import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Fake DOM (checks view logic, not browser layout). Based on tests/wordtrace.fakedom.js with the missing methods added.
class TextNode { constructor(d) { this.nodeType = 3; this.data = d; this.parentNode = null; } get textContent() { return this.data; } }
class El {
  constructor(tag, doc) { this.nodeType = 1; this.tagName = tag.toUpperCase(); this.attrs = {}; this.listeners = {}; this.ownerDocument = doc; this.childNodes = []; this.parentNode = null; this.className = ''; this.hidden = false; }
  get children() { return this.childNodes.filter((c) => c.nodeType === 1); }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return k === 'class' ? (this.className || null) : (k in this.attrs ? this.attrs[k] : null); }
  removeAttribute(k) { delete this.attrs[k]; }
  removeChild(c) { const i = this.childNodes.indexOf(c); if (i >= 0) { this.childNodes.splice(i, 1); c.parentNode = null; } return c; }
  append(...cs) { for (const c of cs) { const n = typeof c === 'string' ? new TextNode(c) : c; if (n.parentNode) n.parentNode.removeChild(n); n.parentNode = this; this.childNodes.push(n); } }
  replaceChildren(...cs) { for (const c of this.childNodes) c.parentNode = null; this.childNodes = []; this.append(...cs); }
  addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }
  click() { for (const f of this.listeners.click || []) f({ type: 'click', target: this, preventDefault() {} }); }
  focus() { this.ownerDocument.activeElement = this; }
  get textContent() { return this.childNodes.map((c) => c.textContent).join(''); }
  set textContent(v) { this.childNodes = v === '' ? [] : [Object.assign(new TextNode(String(v)), { parentNode: this })]; }
  all(pred, out = []) { for (const c of this.children) { if (pred(c)) out.push(c); c.all(pred, out); } return out; }
}
const doc = { activeElement: null, createElement: (t) => new El(t, doc), createTextNode: (s) => new TextNode(String(s)) };
globalThis.document = doc;
import { waitFor } from './helpers/waitfor.js';
const J = (f) => JSON.parse(readFileSync(new URL('../' + f, import.meta.url), 'utf8'));
const data = { words: J('data/vocab/words.json').words, registry: J('data/corpus/registry.json').entries, notes: J('data/grammar/notes.json') };

const { buildTopics, buildQuestions, seededRng, TOPIC_IDS, STORE_KEY, norm, lineTokens } = await import('../src/grammar/model.js');
const { mount } = await import('../src/grammar/grammar.view.js');
const topics = buildTopics(data);
const wordIds = new Set(data.words.map((w) => w.id));
const regById = new Map(data.registry.map((e) => [e.id, e]));
const HEBREW = /[֐-׿]/;

test('six topics, each with a ~150-word explanation and six examples', () => {
  assert.deepEqual(Object.keys(topics), TOPIC_IDS);
  for (const id of TOPIC_IDS) {
    const t = topics[id], n = t.explanation.split(/\s+/).length;
    assert.ok(n >= 125 && n <= 175, `${id}: ${n} words`);
    assert.equal(t.examples.length, 6, id);
    assert.ok(!HEBREW.test(t.explanation), 'no Hebrew typed in the explanation');
    for (const e of t.examples) assert.ok(['rule-based', 'corpus-attested'].includes(e.label), e.id);
  }
});

test('every Hebrew example comes from the data, with an id that resolves', () => {
  for (const id of TOPIC_IDS) for (const e of topics[id].items) {
    assert.ok(HEBREW.test(e.he) || id === 'roots');
    const [kind, rest] = e.id.split(':');
    if (kind === 'word') assert.ok(wordIds.has(rest.replace(/#.*/, '')), e.id);
    else if (kind === 'reg') {
      const [rid, pos] = rest.split('#'); const reg = regById.get(rid); assert.ok(reg, e.id);
      const toks = lineTokens(reg.he);
      if (pos.includes('-')) { const [a, b] = pos.split('-').map(Number); assert.equal(toks.slice(a, b + 1).join(' '), e.he); }
      else assert.ok(toks[Number(pos)].split('־').includes(e.he) || toks[Number(pos)] === e.he, e.id);
    } else if (kind === 'root') assert.ok(e.wordIds.every((w) => wordIds.has(w)));
    else assert.fail('unknown id ' + e.id);
  }
});

test('article, prefix and plural rules hold on the examples', () => {
  for (const e of topics.article.items) assert.ok(norm(e.he).startsWith('ה'));
  const pre = new Set(topics.prefixes.items.map((i) => i.prefix));
  assert.ok(pre.size >= 4);
  for (const e of topics.plurals.items) { const w = data.words.find((x) => x.id === e.wordId); assert.equal(w.forms.plural, e.he); }
  const roots = topics.roots.items; assert.ok(roots.length >= 6);
  for (const r of roots) for (const w of r.family) assert.equal(w.root, r.root);
});

test('six distinct, answerable questions per topic', () => {
  for (const id of TOPIC_IDS) {
    const qs = buildQuestions(topics[id], seededRng(7));
    assert.equal(qs.length, 6, id);
    for (const q of qs) {
      assert.equal(q.options.length, 4); assert.equal(new Set(q.options).size, 4, id + ' options distinct');
      assert.ok(q.answer >= 0 && q.answer < 4);
    }
    assert.equal(new Set(qs.map((q) => q.prompt)).size, 6, id + ' prompts distinct');
    assert.deepEqual(qs.map((q) => q.options[q.answer]), buildQuestions(topics[id], seededRng(7)).map((q) => q.options[q.answer]), 'seeded');
  }
});

function makeStore() { const m = {}; return { m, get: async (k) => m[k], set: async (k, v) => { m[k] = v; } }; }

test('list page links to every topic; unmount removes the view', async () => {
  const root = doc.createElement('div'); const unmount = mount(root, { grammarData: data, query: {}, store: makeStore() });
  await waitFor(() => root.all((n) => n.tagName === 'A').length > 0, { message: "topic links rendered" });
  const links = root.all((n) => n.tagName === 'A');
  assert.deepEqual(links.map((a) => a.getAttribute('href')), TOPIC_IDS.map((i) => '#/grammar/' + i));
  assert.ok(root.textContent.includes('Draft, unreviewed'));
  for (const a of links) assert.match(a.className, /btn/);
  unmount(); assert.equal(root.children.length, 0);
});

test('topic page: notice, labels, Hebrew lang/dir, practice flow saves to grammar.v1', async () => {
  const store = makeStore(); const root = doc.createElement('div');
  const unmount = mount(root, { grammarData: data, query: { topic: 'plurals' }, store, rng: seededRng(5) });
  await waitFor(() => root.textContent.includes('rule-based'), { message: "topic page rendered" });
  assert.ok(root.textContent.includes('Draft, unreviewed') && root.textContent.includes('rule-based'));
  const hes = root.all((n) => n.getAttribute('lang') === 'he'); assert.ok(hes.length >= 6);
  assert.ok(hes.every((n) => n.getAttribute('dir') === 'rtl'));
  assert.equal(doc.activeElement.tagName, 'H1');
  root.all((n) => n.getAttribute('id') === 'gr-start')[0].click();
  for (let i = 0; i < 6; i++) {
    const opts = root.all((n) => n.className.split(' ').includes('gr-opt')); assert.equal(opts.length, 4);
    assert.ok(opts.every((o) => o.tagName === 'BUTTON' && o.getAttribute('type') === 'button' && o.getAttribute('lang') === 'he'));
    opts[0].click();
    const next = root.all((n) => n.getAttribute('id') === 'gr-next')[0]; assert.equal(doc.activeElement, next);
    next.click();
  }
  await waitFor(() => /You got \d of 6/.test(root.textContent), { message: "result summary" });
  assert.match(root.textContent, /You got \d of 6/);
  assert.equal(store.m[STORE_KEY].topics.plurals.attempts, 1);
  unmount();
});

test('unknown topic and failed load show a kind message', async () => {
  const r1 = doc.createElement('div'); mount(r1, { grammarData: data, query: { topic: 'nope' }, store: makeStore() }); await waitFor(() => r1.textContent.includes('no grammar topic'), { message: "r1.textContent.includes('no grammar topic')" });
  assert.ok(r1.textContent.includes('no grammar topic'));
  const r2 = doc.createElement('div'); mount(r2, { grammarData: { get words() { throw new Error('x'); } }, query: {}, store: makeStore() }); await waitFor(() => r2.textContent.includes('could not be loaded'), { message: "r2.textContent.includes('could not be loaded')" });
  assert.ok(r2.textContent.includes('could not be loaded'));
});

test('source: 44px targets', () => {
  const css = readFileSync(new URL('../src/grammar/grammar.view.js', import.meta.url), 'utf8');
  assert.match(css, /min-block-size:var\(--tap,48px\)/); assert.match(css, /min-inline-size:44px/);
});
