// Lesson page "Why? Remember it" and first-day step "Why?": where the memory chain has an entry for the letter, the old mnemonics story
// (and the lesson page's old anchor word) are not printed; shape, sound and look-alike stay. With no chain, or a chain without the letter, the old text stays.
// Same rule as the letters atlas and trace views. Fake DOM: checks view logic, not browser rendering.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { waitFor } from './helpers/waitfor.js';

const rd = (p) => JSON.parse(fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8'));
class Txt { constructor(d) { this.nodeType = 3; this.data = String(d); this.parent = null; } get textContent() { return this.data; } }
class El {
  constructor(tag) { this.tag = tag; this.nodeType = 1; this.children = []; this.attrs = {}; this.className = ''; this.parent = null; this.classList = { add() {}, remove() {}, toggle() {}, contains: () => false }; this.style = {}; this._text = ''; this.hidden = false; this.disabled = false; }
  setAttribute(k, v) { this.attrs[k] = String(v); if (k === 'class') this.className = String(v); } getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; } removeAttribute(k) { delete this.attrs[k]; }
  addEventListener() {} removeEventListener() {} focus() {} blur() {}
  append(...c) { for (const x of c) { const n = x != null && x.nodeType ? x : new Txt(x); n.parent = this; this.children.push(n); } }
  appendChild(c) { this.append(c); return c; }
  replaceChildren(...c) { this.children = []; this.append(...c); }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter((x) => x !== this); }
  after(...c) { const p = this.parent; if (!p) return; const i = p.children.indexOf(this); const ns = c.map((x) => (x.nodeType ? x : new Txt(x))); ns.forEach((n) => { n.parent = p; }); p.children.splice(i + 1, 0, ...ns); }
  replaceWith(n) { const p = this.parent; if (!p) return; n.parent = p; p.children[p.children.indexOf(this)] = n; }
  contains(n) { for (let x = n; x; x = x.parent) if (x === this) return true; return false; }
  set textContent(v) { this.children = []; this._text = String(v); } get textContent() { return this._text + this.children.map((c) => c.textContent).join(''); }
  find(pred, out = []) { if (pred(this)) out.push(this); for (const c of this.children) if (c.nodeType === 1) c.find(pred, out); return out; }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
  querySelectorAll(sel) { // one simple selector: tag, .class, #id, [attr] or [attr="v"]
    const m = /^(?:\[([\w-]+)(?:="?([^"\]]*)"?)?\]|\.([\w-]+)(?: (\w+))?|#([\w-]+)|(\w+))$/.exec(sel); if (!m) return [];
    const hasCls = (n, c) => n.className.split(/\s+/).includes(c);
    if (m[1]) return this.find((n) => n !== this && m[1] in n.attrs && (m[2] === undefined || n.attrs[m[1]] === m[2]));
    if (m[3]) return this.find((n) => n !== this && hasCls(n, m[3])); // ".fd-why p" is handled below
    if (m[5]) return this.find((n) => n !== this && n.attrs.id === m[5]);
    return this.find((n) => n !== this && n.tag === m[6]);
  }
}
// ".fd-why p": first paragraph under the element with that class
const origQSA = El.prototype.querySelectorAll;
El.prototype.querySelectorAll = function (sel) {
  const m = /^\.([\w-]+) (\w+)$/.exec(sel);
  if (!m) return origQSA.call(this, sel);
  return origQSA.call(this, '.' + m[1]).flatMap((h) => h.find((n) => n !== h && n.tag === m[2]));
};
globalThis.document = { createElement: (t) => new El(t), createTextNode: (d) => new Txt(d), activeElement: null, addEventListener() {}, removeEventListener() {} };
globalThis.window = { requestAnimationFrame: (f) => setTimeout(f, 0) };

const chainRaw = rd('data/letters/memory-chain.json');
const mn = new Map(rd('data/letters/mnemonics.json').letters.map((m) => [m.id, m]));
const { loadContent } = await import('../src/curriculum/content.js');
const content = await loadContent();

// ---------- lesson page ----------
const { mountLesson } = await import('../src/curriculum/lesson.view.js');
const lessonCtx = { store: { get: () => undefined, set() {}, remove() {} }, t: (k) => k, settings: { get: (k) => ({ congregation: 'sephardi' }[k]) }, query: { lesson: 'r01' } };
const openLesson = async () => {
  const root = new El('div'); const off = mountLesson(root, lessonCtx, 'r01');
  const det = await waitFor(() => root.find((n) => n.tag === 'details' && n.className === 'card alef-why')[0], { message: 'memory hooks details' });
  const txt = det.textContent; off(); return txt;
};
test('lesson page: letters with a chain entry hide the old story and anchor word, keep shape and look-alike; no chain keeps them all', async () => {
  for (const id of ['shin', 'bet']) assert.ok(content.chain.get(id), id + ' has a chain entry in the data');
  const saved = new Map(content.chain);
  try {
    const withChain = await openLesson();
    for (const id of ['shin', 'bet']) {
      const m = mn.get(id);
      assert.ok(m.story.length > 20 && m.wordMeaning, id + ' fixture has an old story');
      assert.ok(!withChain.includes(m.story), id + ' old story hidden');
      assert.ok(!withChain.includes('Anchor word') && !withChain.includes(`"${m.wordMeaning}")`), id + ' old anchor word hidden');
      assert.ok(withChain.includes(m.shape), id + ' shape stays');
      if (m.lookalike) assert.ok(withChain.includes(m.lookalike), id + ' look-alike stays');
    }
    content.chain.clear();
    const without = await openLesson();
    for (const id of ['shin', 'bet']) { const m = mn.get(id); assert.ok(without.includes(m.story), id + ' without a chain the old story stays'); assert.ok(without.includes(`"${m.wordMeaning}")`), id + ' old word stays'); }
    content.chain.clear(); content.chain.set('shin', saved.get('shin')); // a chain without bet: only bet keeps its old text
    const part = await openLesson();
    assert.ok(!part.includes(mn.get('shin').story) && part.includes(mn.get('bet').story), 'per letter, not all or nothing');
  } finally { content.chain.clear(); for (const [k, v] of saved) content.chain.set(k, v); }
});

// ---------- first-day step ----------
const { mount } = await import('../src/firstday/firstday.view.js');
const FL = await import('../src/firstday/loader.js');
const [first10, ladder, onramp] = [await FL.loadFirst10(), await FL.loadLadder(), await FL.loadOnramp()];
const step0 = onramp.steps[0]; const old = mn.get(step0.letter);
const openFirst = async (memoryChain) => {
  const root = new El('div'); const firstdayData = { first10, ladder, onramp, content }; if (memoryChain !== undefined) firstdayData.memoryChain = memoryChain;
  const un = mount(root, { firstdayData, settings: { get: (k) => ({ congregation: 'sephardi' }[k]) } });
  await waitFor(() => root.find((n) => n.className === 'fd-why')[0], { message: 'Why? details' });
  return { root, un, why: () => root.find((n) => n.className === 'fd-why')[0].textContent };
};
test('first-day step: Why? hides the old story when the chain has the letter; no chain, or a chain without the letter, keeps it', async () => {
  assert.equal(step0.kind, 'letter'); assert.ok(old?.story && old.shape);
  assert.ok(chainRaw.letters.some((e) => e.id === step0.letter));
  const a = await openFirst(chainRaw); assert.ok(!a.why().includes(old.story), 'old story hidden'); assert.ok(a.why().includes(old.shape), 'shape stays'); a.un();
  const b = await openFirst(null); assert.ok(b.why().includes(old.story), 'chain unavailable: old story stays'); b.un();
  const c = await openFirst({ letters: [] }); assert.ok(c.why().includes(old.story), 'chain without this letter: old story stays'); c.un();
});
test('first-day step: while the chain file is still loading the old story is not printed; if it arrives without the letter the story is added once', async () => {
  const realFetch = globalThis.fetch; let body = { letters: [] };
  globalThis.fetch = async () => { await new Promise((r) => setTimeout(r, 60)); return { ok: true, json: async () => body }; };
  try {
    const a = await openFirst(undefined);
    assert.ok(!a.why().includes(old.story), 'not printed before the chain is known');
    await waitFor(() => a.why().includes(old.story), { message: 'story added after an entry-less chain arrived' });
    assert.equal(a.root.querySelectorAll('[data-old-story]').length, 1, 'added once');
    a.un();
  } finally { globalThis.fetch = realFetch; }
});
