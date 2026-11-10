// Letters page "Remember it": with a memory-chain entry the old mnemonics story, sound anchor and word are not shown (the card is the one story); shape and look-alike stay.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const rd = (p) => JSON.parse(fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8'));
test('trace view: Remember it hides the old story when the chain has the letter, keeps shape and look-alike; no chain keeps all', async () => {
  class Txt { constructor(d) { this.nodeType = 3; this.data = String(d); } get textContent() { return this.data; } }
  class El {
    constructor(tag) { this.tag = tag; this.nodeType = 1; this.children = []; this.attrs = {}; this.className = ''; this.classList = { add() {}, remove() {}, toggle() {}, contains() { return false; } }; this.style = {}; this._text = ''; }
    setAttribute(k, v) { this.attrs[k] = String(v); } getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
    addEventListener() {} removeEventListener() {}
    appendChild(c) { this.children.push(c); return c; }
    set textContent(v) { this.children = []; this._text = String(v); } get textContent() { return this._text + this.children.map((c) => c.textContent).join(''); }
    find(pred, out = []) { if (pred(this)) out.push(this); for (const c of this.children) if (c.nodeType === 1) c.find(pred, out); return out; }
    querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
    querySelectorAll(sel) { return this.find((n) => n.tag === sel); }
  }
  globalThis.document = { createElement: (t) => new El(t), createTextNode: (d) => new Txt(d) };
  globalThis.window = { requestAnimationFrame: (f) => setTimeout(f, 0) };
  const { mount } = await import('../src/letters/trace.view.js');
  const mnemonics = rd('data/letters/mnemonics.json'); const chain = rd('data/letters/memory-chain.json');
  const base = { letters: rd('data/letters/letters.json'), mnemonics, confusables: null, keyboard: null, interference: null, consonants: null };
  const store = { get: (k, d) => d, set() {} };
  const open = async (id, memoryChain) => {
    const root = new El('div'); const un = mount(root, { ...base, memoryChain, settings: { script: 'print' }, params: { id }, store });
    for (let i = 0; i < 50 && /Loading/.test(root.textContent); i++) await new Promise((r) => setTimeout(r, 10));
    const det = root.find((n) => n.tag === 'details' && n.className === 'remember')[0]; const txt = det ? det.textContent : ''; un(); return txt;
  };
  for (const id of ['mem', 'tav', 'kaf-final', 'yod']) {
    const m = mnemonics.letters.find((x) => x.id === id);
    const withChain = await open(id, chain); const without = await open(id, null);
    assert.ok(withChain.includes(m.shape) && withChain.includes(m.lookalike), id + ' keeps shape and look-alike');
    assert.ok(!withChain.includes(m.story), id + ' old story hidden'); assert.ok(!withChain.includes(m.wordMeaning + ')'), id + ' old word hidden');
    assert.ok(without.includes(m.story), id + ' without a chain the old text stays');
  }
});
