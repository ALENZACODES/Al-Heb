import test from 'node:test';
import assert from 'node:assert/strict';

// Minimal fake DOM for src/speak/check.js (view logic only; no browser API is touched).
class N {
  constructor(tag) { this.tag = tag; this.nodeType = 1; this.children = []; this.attrs = {}; this.listeners = {}; this.className = ''; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  removeAttribute(k) { delete this.attrs[k]; }
  addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }
  append(...c) { this.children.push(...c); }
  replaceChildren(...c) { this.children = c.filter((x) => x != null); }
  set textContent(v) { this.children = [{ nodeType: 3, data: String(v) }]; }
  get text() { return this.children.map((c) => (c.nodeType === 3 ? c.data : c.text)).join(''); }
  find(pred, out = []) { if (pred(this)) out.push(this); for (const c of this.children) if (c.nodeType === 1) c.find(pred, out); return out; }
  click() { for (const f of this.listeners.click || []) f({}); }
}
globalThis.document = { createElement: (t) => new N(t), createTextNode: (d) => ({ nodeType: 3, data: String(d) }) };
const flush = () => new Promise((r) => setTimeout(r, 0));
const waitFor = async (f) => { for (let i = 0; i < 100; i++) { const v = f(); if (v) return v; await flush(); } throw new Error('timed out'); };

const C = await import('../src/speak/check.js');
function fakeRec(script) {
  return class { start() { const r = script.shift(); setTimeout(() => { if (r.error) return this.onerror?.({ error: r.error }); const res = r.alternatives.map((t) => ({ transcript: t })); this.onresult?.({ results: [res] }); this.onend?.(); }, 0); } abort() {} };
}
const on = { recognition: true, recording: false, secure: true };
const off = { recognition: false, recording: false, secure: true };

test('checkIntro: says plainly when this browser cannot score, and what the score measures when it can', () => {
  assert.match(C.checkIntro(off), /No score in this browser: it has no speech recognition \(Firefox/);
  assert.match(C.checkIntro(on), /does not measure your accent/);
});
test('checkControl: no recognizer = no button and no score', () => {
  assert.equal(C.checkControl('שָׁלוֹם', { caps: off }), null);
});
test('checkControl: listens, then shows a score and each word with its status in words', async () => {
  const Ctor = fakeRec([{ alternatives: ['בוקר טוב'] }, { alternatives: ['בוקר'] }, { error: 'not-allowed' }]);
  const node = C.checkControl('בֹּקֶר טוֹב', { caps: on, Ctor, id: 'x1' });
  const b = node.find((n) => n.tag === 'button')[0];
  assert.equal(b.attrs['data-check'], 'x1');
  b.click();
  await waitFor(() => /Score/.test(node.text));
  assert.match(node.text, /Score 100%: 2 of 2 words recognized/);
  assert.equal(node.find((n) => n.attrs['data-status'] === 'hit').length, 2);
  b.click();
  await waitFor(() => /Score 50%/.test(node.text));
  assert.match(node.text, /טוֹב - not heard/);
  b.click();
  await waitFor(() => /not allowed/.test(node.text));
  assert.doesNotMatch(node.text, /Score/, 'a refused microphone shows no score');
});
