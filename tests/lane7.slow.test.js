// D-30: lessons offer a "Slow" button beside Listen for words and prayer lines. Normal speed stays the default.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

class N {
  constructor(tag) { this.tag = tag; this.nodeType = 1; this.children = []; this.attrs = {}; this.listeners = {}; this.className = ''; this.dataset = {}; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return this.attrs[k]; }
  addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }
  append(...c) { for (const x of c) this.children.push(typeof x === 'string' ? { nodeType: 3, data: x } : x); }
  querySelector() { return this.children.find((c) => c.nodeType === 1) || null; }
  set textContent(v) { this.children = [{ nodeType: 3, data: String(v) }]; }
  get textContent() { return this.children.map((c) => (c.nodeType === 3 ? c.data : c.textContent)).join(''); }
  async click() { for (const f of this.listeners.click || []) await f({ target: this }); }
}
globalThis.document = { createElement: (t) => new N(t), createTextNode: (d) => ({ nodeType: 3, data: String(d) }) };

const { slowButton, playButton } = await import('../src/curriculum/audio-ui.js');
const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('D-30: the Slow button plays the same clip once at the slow speed; Listen keeps the normal speed', async () => {
  const calls = [];
  const audio = { status: () => ({ source: 'file', entryStatus: 'tts' }), play: async (kind, id, o) => { calls.push({ kind, id, o }); return { source: 'file', entryStatus: 'tts' }; } };
  const note = new N('p');
  const slow = slowButton({ audio }, 'word', 'r01-w1', 'Listen to he returned', note);
  assert.equal(slow.tag, 'button');
  assert.equal(slow.attrs['aria-label'], 'Listen to he returned, slowly');
  assert.match(slow.textContent, /Slow$/);
  await slow.click();
  assert.deepEqual(calls[0], { kind: 'word', id: 'r01-w1', o: { rate: 'slow', noEcho: true } });
  assert.match(note.textContent, /^Slow speed\./);
  const listen = playButton({ audio }, 'word', 'r01-w1', 'Listen to he returned', note);
  await listen.click();
  assert.deepEqual(calls[1].o, {}, 'Listen passes no rate: the learner\'s normal speed applies');
});

test('D-30: no Slow button without a clip, or when the learner uses no audio', () => {
  const none = { status: () => ({ source: 'none', reason: 'no-clip' }), play: async () => ({ source: 'none' }) };
  assert.equal(slowButton({ audio: none }, 'word', 'x', 'Listen', null), null);
  const ok = { status: () => ({ source: 'file' }), play: async () => ({ source: 'file' }) };
  assert.equal(slowButton({ audio: ok, settings: { get: (k) => (k === 'audioFree' ? true : undefined) } }, 'word', 'x', 'Listen', null), null);
});

test('D-30: lesson words and prayer lines carry the Slow button (full lesson page and step-by-step parts)', () => {
  for (const f of ['src/curriculum/lesson.view.js', 'src/curriculum/lesson.parts.js']) {
    const s = read(f);
    assert.match(s, /slowButton\(ctx, "word", wordAudioId\(lesson\.id, i \+ 1\)/, f);
    assert.match(s, /slowButton\(ctx, "line"/, f);
  }
});
