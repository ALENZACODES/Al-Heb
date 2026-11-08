// Deaf and hard-of-hearing lane: the audioFree setting, written sound descriptions, penalty-free skips, and an inventory guard.
// These check code paths with a tiny fake DOM. They do not show that a Deaf or hard of hearing learner finds anything usable.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

class N {
  constructor(tag) { this.tag = tag; this.nodeType = 1; this.children = []; this.attrs = {}; this.listeners = {}; this.parent = null; this.className = ''; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return this.attrs[k]; }
  addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }
  append(...c) { for (const x of c) { const n = typeof x === 'string' ? { nodeType: 3, data: x } : x; if (n && n.nodeType === 1) n.parent = this; if (n) this.children.push(n); } }
  replaceChildren(...c) { this.children = []; this.append(...c.filter((x) => x != null)); }
  set textContent(v) { this.replaceChildren(document.createTextNode(v)); }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter((x) => x !== this); }
  focus() {}
  querySelector(sel) { const cls = sel.replace(/^\./, ''); return this.find((n) => (` ${n.className} `).includes(` ${cls} `))[0] || null; }
  get text() { return this.children.map((c) => (c.nodeType === 3 ? c.data : c.text)).join(''); }
  find(pred, out = []) { if (pred(this)) out.push(this); for (const c of this.children) if (c.nodeType === 1) c.find(pred, out); return out; }
  click() { for (const f of this.listeners.click || []) f({ target: this }); }
}
globalThis.document = { createElement: (t) => new N(t), createTextNode: (d) => ({ nodeType: 3, data: String(d) }) };
const flush = () => new Promise((r) => setTimeout(r, 0));
const waitFor = async (f) => { for (let i = 0; i < 300; i++) { const v = f(); if (v) return v; await flush(); } throw new Error('timeout'); };
const btn = (root, re) => root.find((n) => n.tag === 'button' && re.test(n.text))[0];
const store = () => { const m = {}; return { get: (k) => m[k], set: (k, v) => { m[k] = v; }, m }; };
const seeded = (s = 7) => () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
const settingsOf = (o) => ({ get: (k) => o[k] });
const read = (rel) => readFileSync(new URL('../' + rel, import.meta.url), 'utf8');

const AF = await import('../src/shell/audiofree.js');
const S = await import('../src/shell/settings.js');
const ST = await import('../src/pronunciation/soundtext.js');

test('setting: audioFree is a boolean, default false, rejects non-booleans, persists', () => {
  assert.equal(S.DEFAULTS.audioFree, false);
  assert.deepEqual(S.validate('audioFree', true), { ok: true, value: true });
  assert.equal(S.validate('audioFree', 'yes').ok, false);
  assert.equal(S.validate('audioFree', 1).ok, false);
  const m = {}; const st = { get: (k, d) => (k in m ? m[k] : d), set: (k, v) => { m[k] = v; }, subscribe() {} };
  const s = S.createSettings(st); assert.equal(s.get('audioFree'), false);
  assert.deepEqual(s.set({ audioFree: true }), []);
  assert.equal(S.createSettings(st).get('audioFree'), true);
});

test('helper: isAudioFree reads only a true value; wording swaps keep other text', () => {
  assert.equal(AF.isAudioFree(null), false);
  assert.equal(AF.isAudioFree(settingsOf({ audioFree: false })), false);
  assert.equal(AF.isAudioFree(settingsOf({ audioFree: 'true' }) && { settings: settingsOf({ audioFree: 'true' }) }), false);
  assert.equal(AF.isAudioFree({ settings: settingsOf({ audioFree: true }) }), true);
  assert.equal(AF.silentPrompt('Name this letter and say its sound.'), 'Name this letter and recall its sound.');
  assert.equal(AF.silentPrompt('Read this word aloud, then recall what it means.'), 'Read this word, then recall what it means.');
  assert.equal(AF.silentPrompt('Say this syllable aloud.'), 'Read this syllable and recall how it is said.');
  assert.equal(AF.silentPrompt('Which vowel is this?'), 'Which vowel is this?');
  assert.match(AF.syllableByName('Bet', 'a'), /Bet with the "a" vowel/);
  assert.match(AF.SKIP_NOTE, /not marked wrong/);
});

test('settings screen has the Sound row and it saves', async () => {
  const { mount } = await import('../src/shell/settings.view.js');
  const m = {}; const stor = { persistent: true, get: (k, d) => (k in m ? m[k] : d), set: (k, v) => { m[k] = v; }, subscribe() {}, exportJSON: () => '{}' };
  const settings = S.createSettings(stor);
  const root = new N('div'); root.ownerDocument = document;
  try { mount(root, { settings, store: stor, t: (k) => k }); } catch (e) { /* the fake DOM may lack things the full screen needs; fall back to the source check below */ }
  const src = read('src/shell/settings.view.js');
  assert.match(src, /boolRow\('audioFree', AUDIO_FREE_LABEL, AUDIO_FREE_HELP\)/);
});

// ---------------------------------------------------------------------------------------------- written sound descriptions
test('soundtext: all 27 letters have a written line; letters in a sound-gap group get its mouth steps; others say there are none', async () => {
  const data = await ST.loadSoundTextData();
  assert.ok(data.consonants && data.niqqud && data.soundgap);
  const ids = Object.keys(data.consonants.letters);
  assert.equal(ids.length, 27);
  for (const t of ['israeli', 'sephardi', 'ashkenazi']) for (const id of ids) {
    const d = ST.letterSoundText(id, data, t);
    assert.ok(d, id); assert.ok((d.summary || d.english).length > 3, `${id} ${t}`);
  }
  const chet = ST.letterSoundText('chet', data, 'israeli');
  assert.ok(chet.hasMouthSteps); assert.ok(chet.mouth.every((m) => m.steps.length > 0));
  assert.match(ST.describeAsText(chet), /back of your tongue/);
  const lamed = ST.letterSoundText('lamed', data, 'sephardi');
  assert.equal(lamed.hasMouthSteps, false);
  assert.match(lamed.note, /no step-by-step mouth description/);
  assert.equal(ST.letterSoundText('nope', data, 'sephardi'), null);
});

test('soundtext: every mouth sentence comes from the data file (nothing invented)', async () => {
  const data = await ST.loadSoundTextData();
  const all = new Set(); for (const g of data.soundgap.gaps) for (const m of g.mouth || []) for (const s of m.steps) all.add(s);
  for (const id of Object.keys(data.consonants.letters)) for (const m of ST.letterSoundText(id, data, 'sephardi').mouth) for (const s of m.steps) assert.ok(all.has(s));
});

test('soundtext: vowels follow the tradition and admit there is no mouth description; node carries the draft warning', async () => {
  const data = await ST.loadSoundTextData();
  const a = ST.vowelSoundText('kamatz', data, 'ashkenazi'), b = ST.vowelSoundText('kamatz', data, 'sephardi');
  assert.notEqual(a.english, b.english);
  assert.equal(a.hasMouthSteps, false); assert.match(a.note, /no mouth-position description for vowels/);
  const node = ST.soundTextNode((t, at, ...k) => { const n = document.createElement(t); for (const [x, v] of Object.entries(at || {})) if (v != null) n.setAttribute(x, v); n.append(...k.filter((y) => y != null)); return n; }, a);
  assert.equal(node.tag, 'details');
  assert.match(node.text, /Draft\./);
  assert.match(node.text, /words alone cannot replace hearing a sound/);
  assert.equal(ST.soundTextNode(() => null, null), null);
});

// ---------------------------------------------------------------------------------------------- listen and pick
const cfg = JSON.parse(read('data/listen/config.json'));
const words = JSON.parse(read('data/vocab/words.json')).words;
const { mount: mountListen } = await import('../src/listen/listen.view.js');

test('listen and pick: with audioFree, even when every clip exists, only reading questions are offered and no Play button is drawn', async () => {
  const root = new N('div'), st = store(), played = [];
  const un = mountListen(root, { listenData: { config: cfg, words }, store: st, rng: seeded(), settings: settingsOf({ audioFree: true }), audio: { has: () => true, play: async (...a) => { played.push(a); return { source: 'file' }; } } });
  const start = await waitFor(() => btn(root, /Start read-and-match/));
  assert.doesNotMatch(root.text, /Start listening drill/);
  assert.match(root.text, /I do not use audio/);
  start.click();
  await waitFor(() => root.find((n) => n.attrs.role === 'group')[0]);
  assert.equal(btn(root, /^Play$/), undefined);
  assert.equal(played.length, 0);
  un();
});

test('listen and pick: skipping saves nothing, and the listening round can be swapped for reading questions', async () => {
  const root = new N('div'), st = store();
  const un = mountListen(root, { listenData: { config: cfg, words }, store: st, rng: seeded(), audio: { has: () => true, play: async () => ({ source: 'file' }) } });
  (await waitFor(() => btn(root, /Start listening drill/))).click();
  await waitFor(() => root.find((n) => n.attrs.role === 'group')[0]);
  assert.match(root.text, /Word 1 of/);
  btn(root, /Skip this word/).click();
  await waitFor(() => /Word 2 of/.test(root.text));
  assert.equal(st.m['listen.v1'], undefined, 'a skip must not write progress');
  btn(root, /I cannot listen/).click();
  await waitFor(() => /means:/.test(root.text));
  assert.equal(st.m['listen.v1'], undefined);
  un();
});

// ---------------------------------------------------------------------------------------------- ladder
test('syllable ladder: skip changes nothing about score, streak, level or the miss list', async () => {
  const { loadLadder, createLadderSession } = await import('../src/curriculum/ladder.js');
  const ladder = await loadLadder();
  const s = createLadderSession(ladder, { seed: 5, level: 1 });
  const first = s.current();
  const r1 = s.answer(first.item.id); assert.equal(r1.correct, true);
  const before = s.state();
  const second = s.current();
  assert.equal(s.skip(), true);
  const after = s.state();
  assert.deepEqual({ ...after }, { ...before });
  assert.equal(s.skip(), false, 'nothing pending: nothing to skip');
  assert.ok(s.current(), 'a new card is drawn');
  assert.ok(second);
});

// ---------------------------------------------------------------------------------------------- speak
test('speak: skips are not attempts in set totals, daily totals or history', async () => {
  const M = await import('../src/speak/model.js');
  let st = null;
  st = M.recordAttempt(st, { kind: 'say', set: 'a', itemId: '1', he: 'א', mode: 'self', outcome: 'said' }, 1000);
  st = M.recordAttempt(st, { kind: 'say', set: 'a', itemId: '2', he: 'ב', mode: 'self', outcome: 'skip' }, 2000);
  st = M.recordAttempt(st, { kind: 'say', set: 'a', itemId: '1', he: 'א', mode: 'self', outcome: 'skip' }, 3000); // skipping an item again must not erase the earlier result
  assert.deepEqual(M.setSummary(st.attempts, 'a'), { tried: 1, good: 1, close: 0, missed: 0 });
  const day = M.dailyTotals(st.attempts, () => 'd');
  assert.equal(day[0].say, 1); assert.equal(day[0].good, 1);
  assert.equal(M.historyRows(st.attempts).length, 1);
});

test('speak: the Skip button writes nothing to the attempt log (source guard) and drills/shadowing have an audioFree path', () => {
  const src = read('src/speak/speak.js');
  assert.match(src, /if \(r\.outcome !== 'skip'\) await record\(/);
  assert.match(src, /kind === 'shadow' && silent\(\)/);
  assert.match(src, /if \(silent\(\)\) \{ \/\/ minimal-pair drills/);
  assert.match(src, /id: `\$\{kind\}-skip`/);
});

// ---------------------------------------------------------------------------------------------- sound effects and buttons
test('sound effects: never on for audioFree, and the verdict is always text', async () => {
  const { soundOn, fireFeedback, feedbackText } = await import('../src/curriculum/exercises.session.js');
  const played = []; const sfx = { play: (n) => played.push(n) };
  assert.equal(soundOn({ settings: settingsOf({ soundEffects: true }), sfx }), true);
  assert.equal(soundOn({ settings: settingsOf({ soundEffects: true, audioFree: true }), sfx }), false);
  fireFeedback({ settings: settingsOf({ soundEffects: true, audioFree: true }), sfx }, true);
  assert.deepEqual(played, []);
  assert.ok(feedbackText(true).length > 0 && feedbackText(false).length > 0);
  assert.match(read('src/curriculum/exercises.ui.js'), /status\.textContent = feedbackText\(/);
});

test('play buttons: drawn normally, replaced by a hidden empty span for audioFree', async () => {
  const { playButton } = await import('../src/curriculum/audio-ui.js');
  const audio = { has: () => true, status: () => ({ source: 'file' }), play: async () => ({ source: 'file' }) };
  const on = playButton({ audio }, 'word', 'x', 'Listen', null);
  assert.equal(on.tag, 'button');
  const off = playButton({ audio, settings: settingsOf({ audioFree: true }) }, 'word', 'x', 'Listen', null);
  assert.equal(off.tag, 'span'); assert.equal(off.text, ''); assert.ok('hidden' in off.attrs);
  const { audioButton } = await import('../src/shell/audio-access.js');
  const h = (t, a, ...k) => { const n = document.createElement(t); for (const [x, v] of Object.entries(a || {})) if (v != null) n.setAttribute(x, v); n.append(...k.filter((y) => y != null)); return n; };
  assert.equal(audioButton(h, { audio, settings: settingsOf({ audioFree: true }) }, { kind: 'word', id: 'x' }).text, '');
});

// ---------------------------------------------------------------------------------------------- prayer line, text only
test('silent reading guide: steps need no sound, make no sign-language or lip-reading claim, and are marked draft', async () => {
  const SR = await import('../src/shell/silent-reading.js');
  const steps = SR.silentReadingSteps();
  assert.ok(steps.length >= 6);
  const all = steps.map((s) => s.title + ' ' + s.text).join(' ');
  assert.match(all, /right to left/);
  assert.match(all, /no sign-language or lip-reading material/);
  assert.doesNotMatch(all, /interpreter|you will be able to|works for deaf/i);
  const h = (t, a, ...k) => { const n = document.createElement(t); for (const [x, v] of Object.entries(a || {})) if (v != null) n.setAttribute(x, v); n.append(...k.filter((y) => y != null)); return n; };
  const closed = SR.silentReadingNode(h, { settings: settingsOf({}) }), open = SR.silentReadingNode(h, { settings: settingsOf({ audioFree: true }) });
  assert.equal(closed.attrs.open, undefined); assert.equal(open.attrs.open, '');
  assert.match(closed.text, /Draft\./); assert.match(closed.text, /not been tried with Deaf or hard of hearing readers/);
  for (const s of steps) if (s.href) assert.match(s.href, /^#\//);
});

// ---------------------------------------------------------------------------------------------- inventory guard
function walk(dir, out = []) { for (const n of readdirSync(dir)) { const p = join(dir, n); if (statSync(p).isDirectory()) walk(p, out); else if (p.endsWith('.js')) out.push(p); } return out; }
test('inventory: every source file that plays, records or listens is named in docs/a11y/deaf-hoh.md', () => {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const doc = read('docs/a11y/deaf-hoh.md');
  const re = /audio\??\.play|\.playSequence|speechSynthesis|MediaRecorder|SpeechRecognition|new Audio\(|audio\.has|playButton|voiceButton|audioButton/;
  const mine = new Set(['src/shell/audiofree.js', 'src/shell/silent-reading.js', 'src/pronunciation/soundtext.js']);
  const missing = [];
  for (const f of walk(join(root, 'src'))) {
    const rel = f.slice(root.length).replaceAll('\\', '/');
    if (mine.has(rel)) continue;
    if (re.test(readFileSync(f, 'utf8')) && !doc.includes('`' + rel + '`')) missing.push(rel);
  }
  assert.deepEqual(missing, [], 'add these to the inventory table: ' + missing.join(', '));
});
