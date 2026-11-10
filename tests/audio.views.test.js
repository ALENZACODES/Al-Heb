// Views that moved onto the shared audioButton (src/shell/audio-access.js): fake DOM + fake audio/speech, no browser.
// What this proves: a clip still plays through ctx.audio.play; with no clip a he-IL device voice is offered with the honest
// device label; with no usable voice there is one "No audio yet" line and no button. It does not prove real sound.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { waitFor } from './helpers/waitfor.js';

class Node_ {
  constructor(tag) { this.tag = tag; this.nodeType = 1; this.children = []; this.attrs = {}; this.listeners = {}; this.className = ''; this.style = {}; this._text = null; }
  setAttribute(k, v) { this.attrs[k] = String(v); if (k === 'class') this.className = String(v); }
  getAttribute(k) { return this.attrs[k] ?? null; }
  addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }
  removeEventListener() {}
  append(...c) { for (const x of c) this.children.push(typeof x === 'string' ? { nodeType: 3, data: x } : x); }
  appendChild(c) { this.append(c); return c; }
  replaceChildren(...c) { this.children = []; this._text = null; this.append(...c.filter((x) => x != null)); }
  get id() { return this.attrs.id; }
  get textContent() { return this._text ?? this.children.map((c) => (c.nodeType === 3 ? c.data : c.textContent)).join(''); }
  set textContent(v) { this._text = String(v); this.children = []; }
  find(p, out = []) { if (p(this)) out.push(this); for (const c of this.children) if (c.nodeType === 1) c.find(p, out); return out; }
  querySelectorAll(sel) { const m = /^\.([\w-]+)$/.exec(sel); const cls = m && m[1]; return cls ? this.find((n) => (n.className || '').split(/\s+/).includes(cls)) : []; }
  querySelector(sel) { const m = /^#([\w-]+)$/.exec(sel); return m ? this.find((n) => n.attrs.id === m[1])[0] || null : this.querySelectorAll(sel)[0] || null; }
  focus() {} scrollIntoView() {}
  async click() { for (const f of this.listeners.click || []) await f({ target: this, preventDefault() {} }); }
}
globalThis.document = { head: new Node_('head'), createElement: (t) => new Node_(t), createElementNS: (n, t) => new Node_(t), createTextNode: (d) => ({ nodeType: 3, data: String(d) }), getElementById: () => null };
const realFetch = globalThis.fetch;
globalThis.fetch = async (u) => { const url = String(u); if (!url.startsWith('file:')) return realFetch(u); try { const t = fs.readFileSync(new URL(url), 'utf8'); return { ok: true, status: 200, json: async () => JSON.parse(t), text: async () => t }; } catch { return { ok: false, status: 404 }; } };

const DEVICE = /device voice/;
const audios = (calls) => ({
  file: { status: () => ({ source: 'file', entryStatus: 'recorded' }), play: async (k, id, o) => { calls.push([k, id, o && o.text]); return { source: 'file' }; } },
  device: { status: () => ({ source: 'tts-fallback' }), play: async (k, id, o) => { calls.push([k, id, o && o.text]); return { source: 'tts-fallback' }; } },
  none: { status: () => ({ source: 'none', reason: 'no-speech-synthesis' }), play: async () => ({ source: 'none' }) },
});
const store = () => { const m = {}; return { get: (k, d) => (k in m ? m[k] : d), set: (k, v) => { m[k] = v; } }; };

test('morning: Modeh Ani gets a file button, a labelled device-voice button, or one No audio yet line', async () => {
  const { mount } = await import('../src/morning/morning.view.js');
  const calls = [];
  for (const [level, expectState] of [['file', 'file'], ['device', 'device'], ['none', null]]) {
    const root = new Node_('div');
    await mount(root, { store: store(), settings: { get: () => 'm' }, audio: audios(calls)[level], now: () => new Date(2026, 10, 10, 9, 0) });
    const btns = root.find((n) => n.tag === 'button' && n.getAttribute('data-audio') === 'line/modeh-ani-1');
    if (!expectState) { assert.equal(btns.length, 0); assert.match(root.textContent, /No audio yet/); continue; }
    assert.equal(btns.length, 1, level); assert.equal(btns[0].getAttribute('data-audio-state'), expectState);
    if (level === 'device') { assert.match(btns[0].getAttribute('aria-label'), DEVICE); assert.ok(!/sephardi|ashkenazi/i.test(btns[0].getAttribute('aria-label'))); }
    const before = calls.length; await btns[0].click();
    assert.equal(calls.length, before + 1); assert.equal(calls.at(-1)[1], 'modeh-ani-1'); assert.match(calls.at(-1)[2], /^מוֹדֶה/);
  }
});

test('corpus read: Play line uses the shared button (file plays the same id, device voice is labelled and gets the shown text, none says No audio yet)', async () => {
  const { mount } = await import('../src/corpus/read.view.js');
  const calls = [];
  for (const level of ['file', 'device', 'none']) {
    const root = new Node_('div');
    await mount(root, { store: store(), settings: { get: () => 'israeli', congregation: 'israeli' }, audio: audios(calls)[level], params: { textId: 'shema-1' }, query: {} });
    const btns = root.find((n) => n.tag === 'button' && /^line\//.test(n.getAttribute('data-audio') || ''));
    if (level === 'none') { assert.equal(btns.length, 0); assert.match(root.textContent, /No audio yet/); continue; }
    assert.ok(btns.length >= 1, level); assert.equal(btns[0].getAttribute('data-audio-state'), level);
    if (level === 'device') assert.match(btns[0].getAttribute('aria-label'), DEVICE);
    const before = calls.length; await btns[0].click();
    assert.equal(calls.length, before + 1); assert.equal(calls.at(-1)[0], 'line'); assert.match(calls.at(-1)[2], /[א-ת]/);
  }
});

test('torah reading words: Hear it is the shared button, speaks the shown pointed word, and the four-letter name goes through the spoken-form rule', async () => {
  const { renderWords } = await import('../src/torahread/words.view.js');
  const course = { words30: { totals: { tokens: 10 }, method: 'm', words: [{ rank: 1, count: 3, unpointed: 'את', pointed: 'אֵת', gloss: 'direct object marker', others: [] }] } };
  const calls = [];
  for (const level of ['file', 'device', 'none']) {
    const host = new Node_('div');
    renderWords(host, { ctx: { audio: audios(calls)[level] }, course, translit: () => '' });
    (host.find((n) => n.tag === 'button' && /^1\./.test(n.textContent))[0]).click();
    const btns = host.find((n) => n.tag === 'button' && n.getAttribute('data-audio') === 'word/torahread-word-01');
    if (level === 'none') { assert.equal(btns.length, 0); assert.match(host.textContent, /No audio yet/); continue; }
    assert.equal(btns.length, 1, level); assert.equal(btns[0].getAttribute('data-audio-state'), level);
    if (level === 'device') assert.match(btns[0].getAttribute('aria-label'), DEVICE);
    const before = calls.length; await btns[0].click();
    assert.equal(calls.length, before + 1); assert.equal(calls.at(-1)[1], 'torahread-word-01'); assert.match(calls.at(-1)[2], /אֵת/);
  }
});
