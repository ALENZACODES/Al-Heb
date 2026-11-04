import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore, createMemoryStorage } from '../src/store.js';

// Minimal fake DOM (checks view logic and escaping, NOT real browser rendering or print layout).
class N {
  constructor(tag) { this.tag = tag; this.children = []; this.attrs = {}; this.listeners = {}; this.nodeType = 1; this.value = ''; this.textContent = ''; }
  setAttribute(k, v) { this.attrs[k] = v; }
  addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }
  append(...c) { for (let x of c) { if (typeof x === 'string') x = { nodeType: 3, data: x }; this.children.push(x); } }
  replaceChildren(...c) { this.children = []; this.append(...c.filter((x) => x != null)); }
  focus() {} select() {}
  get text() { return this.textContent + this.children.map((c) => (c.nodeType === 3 ? c.data : c.text)).join(''); }
  find(p, o = []) { if (p(this)) o.push(this); for (const c of this.children) if (c.nodeType === 1) c.find(p, o); return o; }
  async click() { for (const f of this.listeners.click || []) await f({}); }
}
globalThis.document = { createElement: (t) => new N(t) };
const { mount } = await import('../src/teacher/teacher.view.js');
const S = await import('../src/teacher/summary.js');
const wait = async (f) => { for (let i = 0; i < 300 && !f(); i++) await new Promise((r) => setTimeout(r, 10)); };
const btn = (root, re) => root.find((n) => n.tag === 'button' && re.test(n.text))[0];

test('share page: consent note, export shows what is shared and a valid code, no network used', async () => {
  const store = createStore({ storage: createMemoryStorage() });
  const root = new N('div'); const un = mount(root, { store, query: { mode: 'share' } });
  assert.match(root.text, /Nothing leaves your device until you send it yourself/);
  assert.match(root.text, /Draft/);
  await btn(root, /Export/).click();
  await wait(() => /You are sharing/.test(root.text));
  assert.match(root.text, /no name or email/);
  const ta = root.find((n) => n.tag === 'textarea')[0];
  assert.ok(S.parseSummary(ta.value).ok);
  un();
});

test('class page: pasted learners aggregate; markup and junk are rejected and never become elements', async () => {
  const mk = (name, errors) => S.toCode({ schema: S.SCHEMA, date: '2026-11-03', name, lessons: ['r01'], letters: ['bet'], signs: [], week: 1, weekDone: false, weak: [{ kind: 'pair', ids: ['bet', 'kaf'], n: errors }] });
  const root = new N('div'); mount(root, { query: { mode: 'class' } });
  const ta = root.find((n) => n.tag === 'textarea')[0];
  ta.value = [mk('Ann', 4), mk('Ben', 3), '<script>alert(1)</script>', '{"schema":"alef-progress-share/1","name":"<img onerror=x>"}'].join('\n');
  await btn(root, /Show class summary/).click();
  assert.match(root.text, /Class summary: 2 learners/);
  assert.match(root.text, /Bet or Kaf: 2 of 2 learners, 7 misses/);
  assert.match(root.text, /Who needs help on what/);
  assert.equal(root.find((n) => n.tag === 'table').length, 1);
  assert.match(root.text, /2 problems/);
  assert.equal(root.find((n) => ['script', 'img'].includes(n.tag)).length, 0);
  assert.ok(!/<script/.test(root.text.replace(/Looks like HTML/g, '')));
});

test('no network or HTML-injection APIs in src/teacher', async () => {
  const fs = await import('node:fs');
  for (const f of fs.readdirSync(new URL('../src/teacher/', import.meta.url))) {
    const code = fs.readFileSync(new URL('../src/teacher/' + f, import.meta.url), 'utf8').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
    assert.ok(!/\bfetch\(|XMLHttpRequest|sendBeacon|WebSocket|innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(/.test(code), f);
  }
});
