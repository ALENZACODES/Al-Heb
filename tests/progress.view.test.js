import test from 'node:test';
import assert from 'node:assert/strict';

// Minimal fake DOM (checks view logic, NOT real browser rendering or print layout).
class Node_ {
  constructor(tag) { this.tag = tag; this.children = []; this.attrs = {}; this.listeners = {}; this.parent = null; this.nodeType = 1; this.className = ''; }
  setAttribute(k, v) { this.attrs[k] = v; if (k === 'class') this.className = v; }
  getAttribute(k) { return this.attrs[k]; }
  addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }
  append(...c) { for (let x of c) { if (typeof x === 'string' || x == null) x = { nodeType: 3, data: String(x), parent: undefined }; this.children.push(x); if (x && x.parent !== undefined) x.parent = this; } }
  replaceChildren(...c) { this.children = []; this.append(...c); }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter((x) => x !== this); }
  focus() {}
  get text() { return this.children.map((c) => (c.nodeType === 3 ? c.data : c.text)).join(''); }
  find(pred, out = []) { if (pred(this)) out.push(this); for (const c of this.children) if (c.nodeType === 1) c.find(pred, out); return out; }
  querySelector(sel) { const id = sel.startsWith('#') ? sel.slice(1) : null; return this.find((n) => (id ? n.attrs.id === id : sel === 'p[role=status]' ? n.tag === 'p' && n.attrs.role === 'status' : false))[0] || null; }
  async click() { for (const f of this.listeners.click || []) await f({}); }
}
globalThis.document = { createElement: (t) => new Node_(t), createTextNode: (d) => ({ nodeType: 3, data: String(d), parent: undefined }) };

const { mount } = await import('../src/progress/progress.view.js');
test('seeded progress shows readable words without null text', async () => {
  const root = new Node_('div');
  const completed = Object.fromEntries(Array.from({length:24}, (_,i)=>['r'+String(i+1).padStart(2,'0'),1]));
  const values = {'curriculum.progress': {completed}};
  const un = await mount(root, {store:{get:(key, fallback)=>values[key] ?? fallback, set:(key,value)=>{values[key]=value;}}});
  assert.match(root.text, /Words you can sound out/);
  assert.doesNotMatch(root.text, /null|undefined/);
  un();
});
