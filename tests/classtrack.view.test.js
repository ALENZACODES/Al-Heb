import test from 'node:test';
import assert from 'node:assert/strict';
import { waitFor } from './helpers/waitfor.js';

// Minimal fake DOM (checks view logic, NOT real browser rendering or print layout).
class Node_ {
  constructor(tag) { this.tag = tag; this.children = []; this.attrs = {}; this.listeners = {}; this.parent = null; this.nodeType = 1; this.className = ''; }
  setAttribute(k, v) { this.attrs[k] = v; if (k === 'class') this.className = v; }
  getAttribute(k) { return this.attrs[k]; }
  addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }
  append(...c) { for (let x of c) { if (typeof x === 'string') x = { nodeType: 3, data: x, parent: undefined }; this.children.push(x); if (x && x.parent !== undefined) x.parent = this; } }
  replaceChildren(...c) { this.children = []; this.append(...c.filter((x) => x != null)); }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter((x) => x !== this); }
  focus() {}
  get text() { return this.children.map((c) => (c.nodeType === 3 ? c.data : c.text)).join(''); }
  find(pred, out = []) { if (pred(this)) out.push(this); for (const c of this.children) if (c.nodeType === 1) c.find(pred, out); return out; }
  querySelector(sel) { const id = sel.startsWith('#') ? sel.slice(1) : null; return this.find((n) => (id ? n.attrs.id === id : sel === 'p[role=status]' ? n.tag === 'p' && n.attrs.role === 'status' : false))[0] || null; }
  async click() { for (const f of this.listeners.click || []) await f({}); }
}
globalThis.document = { createElement: (t) => new Node_(t), createTextNode: (d) => ({ nodeType: 3, data: String(d), parent: undefined }) };
const { mount } = await import('../src/classtrack/classtrack.view.js');
const memStore = (init = {}) => { const m = { ...init }; return { get: async (k, f) => m[k] ?? f, set: async (k, v) => { m[k] = v; }, m }; };
const ready = (root) => waitFor(() => /Draft:/.test(root.text), { message: 'classtrack view never finished rendering' });
const go = async (query = {}, init = {}) => { const root = new Node_('div'); const un = mount(root, { store: memStore(init), query }); await ready(root); return { root, un }; };

test('week list: ten weeks, draft notice, one h1, links to week, handout and teacher plan', async () => {
  const { root, un } = await go();
  assert.match(root.text, /Draft: Aleph's own plan/);
  assert.equal(root.find((n) => n.tag === 'h1').length, 1);
  assert.equal(root.find((n) => n.attrs['data-week']).length, 10);
  const hrefs = root.find((n) => n.tag === 'a').map((a) => a.attrs.href);
  assert.ok(hrefs.includes('#/classtrack/3') && hrefs.includes('#/classtrack/3/handout') && hrefs.includes('#/classtrack/3/teacher'));
  assert.equal(root.find((n) => n.attrs['data-week'] === '1')[0].attrs['data-state'], 'next');
  un();
});

test('progress comes from the store: finishing week 1 core lessons marks it done and week 2 next', async () => {
  const { root } = await go({}, { 'curriculum.progress': { completed: { r01: 1, r02: 1 } } });
  assert.equal(root.find((n) => n.attrs['data-week'] === '1')[0].attrs['data-state'], 'done');
  assert.equal(root.find((n) => n.attrs['data-week'] === '2')[0].attrs['data-state'], 'next');
  assert.match(root.text, /2 of \d+ core lessons finished/);
});

test('week page: lessons link to learn, Hebrew spans are lang=he dir=rtl, can-you list present', async () => {
  const { root } = await go({ week: '8' });
  assert.match(root.text, /Week 8:/);
  assert.ok(root.find((n) => n.tag === 'a' && n.attrs.href === '#/learn?lesson=r25').length >= 1);
  const he = root.find((n) => n.attrs.lang === 'he');
  assert.ok(he.length >= 5 && he.every((n) => n.attrs.dir === 'rtl'));
  assert.match(root.text, /Can you/);
});

test('listen-only weeks show no Hebrew text to read', async () => {
  const { root } = await go({ week: '1' });
  assert.match(root.text, /Listen first/);
  assert.equal(root.find((n) => n.attrs.lang === 'he').length, 0);
});

test('handout: print sheet with checkboxes, a print button and the draft line', async () => {
  const { root } = await go({ week: '4', mode: 'handout' });
  const sheet = root.find((n) => /ct-sheet/.test(n.className));
  assert.equal(sheet.length, 1);
  assert.ok(sheet[0].find((n) => n.className === 'ct-box').length >= 5);
  assert.ok(root.find((n) => n.tag === 'button' && /Print/.test(n.text)).length === 1);
  assert.match(sheet[0].text, /not reviewed by an educator|Draft/);
  const style = root.find((n) => n.tag === 'style')[0];
  assert.match(style.textContent, /@media print/);
  assert.doesNotMatch(style.textContent, /https?:\/\//);
});

test('print button calls window.print when present and is harmless without it', async () => {
  const { root } = await go({ week: '2', mode: 'handout' });
  const btn = root.find((n) => n.tag === 'button')[0];
  await btn.click(); // no window: must not throw
  let n = 0; globalThis.window = { print: () => { n++; } }; await btn.click(); delete globalThis.window;
  assert.equal(n, 1);
});

test('teacher plan: timings total the session, common errors come from sound-gap and hints data', async () => {
  const { root } = await go({ week: '1', mode: 'teacher' });
  const sheet = root.find((n) => /ct-teacher/.test(n.className))[0];
  assert.ok(sheet);
  assert.match(sheet.text, /Timing \(60 minutes\)/);
  assert.match(sheet.text, /Common errors to listen for/);
  assert.match(sheet.text, /direction-slip/);
  assert.match(sheet.text, /Vav|vav|Bet|bet/);
  assert.match(sheet.text, /Self-check/);
});

test('bad week number falls back to the list; a failing store does not crash', async () => {
  const a = await go({ week: '99' }); assert.equal(a.root.find((n) => n.attrs['data-week']).length, 10);
  const root = new Node_('div'); mount(root, { store: { get() { throw new Error('x'); } }, query: {} }); await ready(root);
  assert.equal(root.find((n) => n.attrs['data-week']).length, 10);
});

test('unmount before data loads does not throw', async () => {
  const root = new Node_('div'); const un = mount(root, { store: memStore(), query: {} }); un(); await new Promise((r) => setTimeout(r, 80));
});
