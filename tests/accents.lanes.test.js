// Accent lane, second rollout: listen, torah reader, speak (read aloud / shadow, Listen status), tradition quiz.
// Each view is mounted with the real settings object for israeli, sephardi and ashkenazi. Audio is the real player (src/audio/player.js)
// over a fake manifest in which ONLY the Ashkenazi clip exists, so the labels are checked against real player results.
// Fake DOM: proves view logic, not browser rendering. Typing is not covered: it shows Hebrew letters and drills only and reads no setting.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { waitFor } from './helpers/waitfor.js';
import { createSettings } from '../src/shell/settings.js';
import { createAudio } from '../src/audio/player.js';
import { respell, audioNote, playLine, LABELS } from '../src/pronunciation/forTradition.js';

// One fake element that serves every view here (atlas/trace/speak use globalThis.document, traditions uses root.ownerDocument).
class Txt { constructor(d) { this.nodeType = 3; this.data = String(d); this.parent = null; } get textContent() { return this.data; } get text() { return this.data; } }
class El {
  constructor(tag, doc) { this.tag = tag; this.tagName = tag.toUpperCase(); this.nodeType = 1; this.children = []; this.attrs = {}; this.listeners = {}; this.parent = null; this.className = ''; this.value = ''; this.checked = false; this.ownerDocument = doc; this.classList = { add: () => {}, remove: () => {}, toggle: () => {}, contains: () => false }; this.style = {}; this._text = ''; }
  setAttribute(k, v) { this.attrs[k] = String(v); } getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; } removeAttribute(k) { delete this.attrs[k]; }
  addEventListener(t, f) { (this.listeners[t] ??= new Set()).add(f); } removeEventListener(t, f) { this.listeners[t]?.delete(f); }
  _norm(x) { return x == null ? null : (typeof x === 'object' && x.nodeType ? x : new Txt(x)); }
  append(...c) { for (const x of c) { const n = this._norm(x); if (!n) continue; n.parent = this; this.children.push(n); } }
  appendChild(c) { this.append(c); return c; } prepend(...c) { for (const x of c.reverse()) { const n = this._norm(x); if (n) { n.parent = this; this.children.unshift(n); } } }
  replaceChildren(...c) { this.children = []; this.append(...c); }
  replaceWith(n) { if (this.parent) { const i = this.parent.children.indexOf(this); this.parent.children[i] = n; n.parent = this.parent; } }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter((x) => x !== this); }
  contains(n) { return n === this || this.children.some((c) => c.nodeType === 1 && c.contains(n)); }
  set textContent(v) { this.children = []; this._text = String(v); } get textContent() { return this._text + this.children.map((c) => c.textContent).join(''); } get text() { return this.textContent; }
  focus() { globalThis.__focus = this; }
  find(pred, out = []) { if (pred(this)) out.push(this); for (const c of this.children) if (c.nodeType === 1) c.find(pred, out); return out; }
  querySelector(sel) { return this.find((n) => (sel.startsWith('#') ? n.attrs.id === sel.slice(1) : sel.startsWith('.') ? String(n.attrs.class || '').split(/\s+/).includes(sel.slice(1)) : n.tag === sel))[0] || null; }
  querySelectorAll(sel) { return this.find((n) => (sel.startsWith('#') ? n.attrs.id === sel.slice(1) : sel.startsWith('.') ? String(n.attrs.class || '').split(/\s+/).includes(sel.slice(1)) : n.tag === sel)); }
  dispatch(t, ev = {}) { for (const f of [...(this.listeners[t] ?? [])]) f({ target: this, preventDefault() {}, ...ev }); }
  click() { return this.dispatch('click'); }
}
const doc = { createElement: (t) => new El(t, doc), createTextNode: (d) => new Txt(d) };
globalThis.document = doc; globalThis.window = { scrollY: 0, scrollTo() {}, requestAnimationFrame: (f) => setTimeout(f, 0) };
const newRoot = () => new El('div', doc);
const byId = (root, id) => root.find((n) => n.attrs.id === id)[0];
const bt = (root, re) => root.find((n) => n.tag === 'button' && re.test(n.textContent))[0];
const memStore = () => { const m = {}; return { m, get: (k, d) => (k in m ? m[k] : d), set: (k, v) => { m[k] = JSON.parse(JSON.stringify(v)); } }; };
const settingsWith = (congregation) => { const s = createSettings(memStore()); s.set({ congregation }); return s; };
const TRADS = ['israeli', 'sephardi', 'ashkenazi'];
const rd = (p) => JSON.parse(fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8'));

// Real player, manifest built per request: only the Ashkenazi male clip is "recorded"; Israeli and Sephardi have text but no file.
function audioFor(congregation) {
  const settings = { voice: 'm', congregation };
  const mk = (kind, id) => createAudio({
    settings, AudioCtor: class { constructor(u) { this.url = u; } play() { setTimeout(() => this.onended?.(), 0); } pause() {} },
    speech: { speak(u) { setTimeout(() => u.onend?.(), 0); }, cancel() {}, getVoices: () => [{ lang: 'he-IL' }] }, UtteranceCtor: class { constructor(t) { this.text = t; } },
    manifest: [{ voice: 'm', tradition: 'ashkenazi', kind, id, status: 'recorded', path: 'a/x.mp3', text: 'שלום' }, { voice: 'm', tradition: 'sephardi', kind, id, status: 'missing', text: 'שלום' }, { voice: 'm', tradition: 'israeli', kind, id, status: 'missing', text: 'שלום' }] });
  return { has: (k, i) => mk(k, i).has(k, i), play: (k, i, o) => mk(k, i).play(k, i, o), stop() {} };
}

test('playLine: one honest sentence per player result, for each tradition', () => {
  assert.match(playLine({ source: 'file', entryStatus: 'recorded' }, 'ashkenazi', 'this word'), /Recorded by a human reader/);
  assert.match(playLine({ source: 'file', entryStatus: 'tts' }, 'israeli'), /Synthetic voice/);
  assert.match(playLine({ source: 'file', entryStatus: 'recorded', fileTradition: 'israeli' }, 'sephardi'), /Israeli reading, used here as a stand-in for Sephardi/);
  assert.match(playLine({ source: 'tts-fallback' }, 'israeli'), /not a person\. It speaks Israeli Hebrew and may ignore/);
  for (const t of ['sephardi', 'ashkenazi']) {
    assert.match(playLine({ source: 'tts-fallback' }, t), new RegExp(`Israeli Hebrew, not ${LABELS[t]}`));
    assert.equal(playLine({ source: 'none', reason: 'tts-pronunciation-mismatch' }, t), `Not played: ${audioNote(t)}`);
  }
  assert.match(playLine({ source: 'none', reason: 'no-speech-synthesis' }, 'israeli'), /No audio .*no-speech-synthesis/);
});

// ---- torah reader ---------------------------------------------------------------------------------------------------------------
test('torah reader: respelling and the Hear-it label follow the tradition; only the Ashkenazi clip is called a recording', async () => {
  const { mount } = await import('../src/torahreader/torahreader.view.js');
  const out = {};
  for (const t of TRADS) {
    const root = newRoot(); const un = mount(root, { store: memStore(), settings: settingsWith(t), audio: audioFor(t), clock: { setInterval: () => 1, clearInterval() {} } });
    await un.ready;
    root.find((n) => n.tag === 'button' && n.attrs.lang === 'he')[0].click();
    const detail = () => root.find((n) => /Say it \(/.test(n.textContent) && n.tag === 'p')[0]?.textContent;
    await waitFor(detail);
    assert.match(detail(), new RegExp(`Say it \\(${t} tradition\\)`));
    const hear = root.find((n) => n.tag === 'button' && /Hear it/.test(n.textContent))[0]; hear.click();
    const st = () => root.find((n) => n.attrs.role === 'status').map((n) => n.textContent).join(' ');
    await waitFor(() => /Playing|Not played|No audio/.test(st()));
    out[t] = { say: detail().replace(/^.*: /, ''), status: st() };
    un();
  }
  assert.match(out.ashkenazi.status, /Recorded by a human reader/);
  assert.match(out.sephardi.status, /No Sephardi recording yet: the device voice speaks Israeli Hebrew/);
  assert.match(out.israeli.status, /browser voice: a computer voice, not a person\. It speaks Israeli Hebrew and may ignore/);
  for (const t of ['sephardi', 'israeli']) assert.doesNotMatch(out[t].status, /Recorded by a human/);
  assert.notEqual(out.ashkenazi.say, out.israeli.say, 'respelling differs for Ashkenazi on the first word');
  assert.equal(out.israeli.say, out.sephardi.say, 'Israeli and Sephardi respell alike (stated in PLAN.md)');
});

// ---- listen ---------------------------------------------------------------------------------------------------------------------
test('listen: clip count and honesty notes follow the tradition (clips exist for Ashkenazi only)', async () => {
  const { mount } = await import('../src/listen/listen.view.js');
  const { buildPool } = await import('../src/listen/model.js');
  const cfg = rd('data/listen/config.json'), words = rd('data/vocab/words.json').words;
  const pool = buildPool(words, cfg);
  // one audio object whose manifest knows every pooled word, Ashkenazi clip only
  const audioAll = (congregation) => {
    const settings = { voice: 'm', congregation };
    const manifest = pool.flatMap((w) => [{ voice: 'm', tradition: 'ashkenazi', kind: 'word', id: w.id, status: 'recorded', path: `a/${w.id}.mp3`, text: w.he }, { voice: 'm', tradition: 'sephardi', kind: 'word', id: w.id, status: 'missing', text: w.he }, { voice: 'm', tradition: 'israeli', kind: 'word', id: w.id, status: 'missing', text: w.he }]);
    return createAudio({ settings, manifest, AudioCtor: class { constructor(u) { this.u = u; } play() { setTimeout(() => this.onended?.(), 0); } pause() {} }, speech: null, UtteranceCtor: null });
  };
  const open = async (t) => {
    const root = newRoot(); const st = memStore();
    const un = mount(root, { listenData: { config: cfg, words }, store: st, rng: () => 0.4, settings: settingsWith(t), audio: audioAll(t) });
    await waitFor(() => /Start/.test(root.textContent)); return { root, un };
  };
  const a = await open('ashkenazi');
  assert.match(a.root.textContent, /words have audio for your Ashkenazi setting/);
  bt(a.root, /Start listening drill/).click();
  const status = () => a.root.find((n) => n.attrs.role === 'status').map((n) => n.textContent).join(' ');
  await waitFor(() => /Playing this word/.test(status()));
  assert.match(status(), /Recorded by a human reader/); a.un();
  for (const t of ['sephardi', 'israeli']) {
    const r = await open(t);
    assert.match(r.root.textContent, /Audio not recorded yet/); assert.doesNotMatch(r.root.textContent, /words have audio/);
    if (t === 'sephardi') assert.match(r.root.textContent, /No Sephardi recording yet: the device voice speaks Israeli Hebrew/);
    else assert.doesNotMatch(r.root.textContent, /recording yet: the device voice/);
    r.un();
  }
});

// ---- speak: read aloud and shadow -----------------------------------------------------------------------------------------------
test('speak read aloud and shadowing: respelling line, setting line and Listen note follow the tradition', async () => {
  const L = await import('../src/speak/loader.js');
  const { mount } = await import('../src/speak/speak.js');
  const sets = await L.loadSetsIndex();
  const data = { sets, setItems: {}, pairs: await L.loadPairs(), traditionPairs: await L.loadTraditionPairs(), prayers: await L.loadPrayers() };
  const seen = {};
  for (const tab of ['read', 'shadow']) for (const t of TRADS) {
    const root = newRoot(); const m = {};
    const spoken = []; const synth = { cancel() {}, speak(u) { spoken.push(u); setTimeout(() => u.onend?.(), 0); }, getVoices: () => [{ lang: 'he-IL' }] };
    const un = mount(root, { store: { get: (k) => m[k], set: (k, v) => { m[k] = v; } }, clock: { now: () => 1_800_000_000_000 }, rng: () => 0.5, query: { tab }, settings: settingsWith(t), t: (k) => k,
      speak: { data, RecognitionCtor: null, MediaRecorderCtor: null, getUserMedia: null, synth, UtteranceCtor: class { constructor(x) { this.text = x; } }, dayKey: (x) => new Date(x).toISOString().slice(0, 10) } });
    await waitFor(() => byId(root, `${tab}-start`)); byId(root, `${tab}-start`).click();
    await waitFor(() => byId(root, `${tab}-respell`));
    const line = byId(root, `${tab}-line`).textContent.replace(/\s+/g, ' ').trim();
    const rs = byId(root, `${tab}-respell`).textContent;
    assert.equal(rs.replace(/\s+/g, ' ').trim(), respell(line, t).replace(/\s+/g, ' ').trim(), `${tab}/${t}`);
    assert.ok(rs.length > 0);
    assert.match(byId(root, `${tab}-setting`).textContent, new RegExp(`Your setting: ${LABELS[t]}`));
    assert.equal(/rule-generated/.test(byId(root, `${tab}-setting`).textContent), t !== 'israeli');
    byId(root, `${tab}-listen`).click();
    const st = () => root.find((n) => n.attrs.role === 'status').map((n) => n.textContent).join(' ');
    await waitFor(() => /Played the browser/.test(st()));
    if (t === 'israeli') assert.doesNotMatch(st(), /recording yet/); else assert.ok(st().includes(audioNote(t)), st());
    (seen[tab] ??= {})[t] = rs; un();
  }
  for (const tab of ['read', 'shadow']) { assert.equal(seen[tab].israeli, seen[tab].sephardi); }
  assert.ok(seen.read.ashkenazi !== seen.read.israeli, 'the first line of the default prayer respells differently in Ashkenazi');
});

// ---- tradition quiz -------------------------------------------------------------------------------------------------------------
test('tradition quiz: names the learner setting, says it has no audio, and marks their tradition in the answer list', async () => {
  const { mount } = await import('../src/pronunciation/tradquiz.view.js');
  const D = 'data/pronunciation/runtime/';
  const quiz = rd(D + 'quiz-pool.json'), reasons = rd(D + 'reasons.json');
  for (const t of TRADS) {
    const root = newRoot(); const mem = {};
    const un = mount(root, { compareData: { quiz, reasons }, store: { get: (k) => mem[k], set: (k, v) => { mem[k] = v; } }, rng: () => 0.3, settings: settingsWith(t) });
    await waitFor(() => byId(root, 'tq-setting'));
    assert.match(byId(root, 'tq-setting').textContent, new RegExp(`Your setting is ${LABELS[t]}`));
    assert.match(byId(root, 'tq-setting').textContent, /no audio for any tradition/);
    root.find((n) => n.attrs['data-act'] === 'start')[0].click();
    root.find((n) => n.attrs['data-option'])[0].click();
    const mine = root.find((n) => n.attrs['data-mine'] === '1');
    assert.equal(mine.length, 1); assert.match(mine[0].textContent, new RegExp(`^${t === 'israeli' ? 'Modern Israeli' : LABELS[t]} \\(your setting\\)`));
    assert.equal(root.find((n) => /\(your setting\)/.test(n.textContent) && n.tag === 'li').length, 1);
    un();
  }
});
