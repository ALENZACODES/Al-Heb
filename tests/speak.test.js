import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Fake DOM (checks view logic, not browser rendering) + fake recognizer/recorder/synthesis. No browser API is touched.
class N {
  constructor(tag) { this.tag = tag; this.nodeType = 1; this.children = []; this.attrs = {}; this.listeners = {}; this.parent = null; this.className = ''; this.value = ''; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return this.attrs[k]; }
  removeAttribute(k) { delete this.attrs[k]; }
  addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }
  append(...c) { for (const x of c) { if (x && x.nodeType === 1) x.parent = this; this.children.push(x); } }
  replaceChildren(...c) { this.children = []; this.append(...c.filter((x) => x != null)); }
  replaceWith(n) { if (this.parent) { const i = this.parent.children.indexOf(this); this.parent.children[i] = n; n.parent = this.parent; } }
  set textContent(v) { this.replaceChildren(document.createTextNode(v)); }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter((x) => x !== this); }
  focus() { globalThis.__focus = this; }
  get text() { return this.children.map((c) => (c.nodeType === 3 ? c.data : c.text)).join(''); }
  find(pred, out = []) { if (pred(this)) out.push(this); for (const c of this.children) if (c.nodeType === 1) c.find(pred, out); return out; }
  querySelector(sel) { return this.find((n) => n.attrs.id === sel.slice(1))[0] || null; }
  fire(type, ev = {}) { for (const f of this.listeners[type] || []) f({ target: this, preventDefault() {}, ...ev }); }
  click() { return this.fire('click'); }
}
globalThis.document = { createElement: (t) => new N(t), createTextNode: (d) => ({ nodeType: 3, data: String(d), parent: null }) };
const flush = () => new Promise((r) => setTimeout(r, 0));
const waitFor = async (f) => { for (let i = 0; i < 200; i++) { const v = f(); if (v) return v; await flush(); } throw new Error('timed out waiting'); };
const memStore = (init = {}) => { const m = { ...init }; return { get: (k) => m[k], set: (k, v) => { m[k] = v; }, m }; };
const seeded = (seed = 3) => () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const byId = (root, id) => root.find((n) => n.attrs.id === id)[0];
const btn = (root, re) => root.find((n) => n.tag === 'button' && re.test(n.text))[0];
const statusText = (root) => root.find((n) => n.attrs.role === 'status')[0].text;
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const rd = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));

/** Fake SpeechRecognition: each instance answers with the next scripted result ({alternatives} or {error}). */
function fakeRecognition(script) {
  const made = [];
  class Rec {
    constructor() { made.push(this); this.started = false; }
    start() {
      this.started = true;
      const r = script.shift() || { error: 'no-speech' };
      setTimeout(() => {
        if (r.error) { this.onerror?.({ error: r.error }); return; }
        const res = r.alternatives.map((t) => ({ transcript: t })); res.length = r.alternatives.length;
        this.onresult?.({ results: [res] }); this.onend?.();
      }, 0);
    }
    abort() { this.onend?.(); }
  }
  return { Rec, made };
}
function fakeRecorder({ allow = true } = {}) {
  const made = [];
  class MR { constructor(stream) { made.push(this); this.stream = stream; this.mimeType = 'audio/webm'; } start() { this.running = true; } stop() { this.running = false; this.ondataavailable?.({ data: 'chunk' }); setTimeout(() => this.onstop?.(), 0); } }
  const tracks = [{ stopped: 0, stop() { this.stopped++; } }];
  const getUserMedia = async () => { if (!allow) { const e = new Error('denied'); e.name = 'NotAllowedError'; throw e; } return { getTracks: () => tracks }; };
  const urls = { created: [], revoked: [] };
  const URL = { createObjectURL: (b) => { const u = 'blob:fake-' + urls.created.length; urls.created.push(u); return u; }, revokeObjectURL: (u) => urls.revoked.push(u) };
  return { MR, getUserMedia, URL, BlobCtor: class { constructor(parts, o) { this.parts = parts; this.type = o?.type; } }, made, tracks, urls };
}
function fakeSynth() {
  const spoken = [];
  class U { constructor(t) { this.text = t; } }
  const synth = { cancel() {}, speak(u) { spoken.push(u); setTimeout(() => u.onend?.(), 0); }, getVoices: () => [{ lang: 'he-IL' }] };
  return { synth, U, spoken };
}

const M = await import('../src/speak/model.js');
const P = await import('../src/speak/pairs.js');
const R = await import('../src/speak/recognizer.js');
const { mount, DRAFT, RECOGNIZER_NOTE, PRAYER_NOTE, tabFromLocation, TAB_IDS } = await import('../src/speak/speak.js');
const T = await import('../src/speak/tradition.js');
const L = await import('../src/speak/loader.js');
const sets = await L.loadSetsIndex();
const pairs = await L.loadPairs();
const setItems = Object.fromEntries(await Promise.all(sets.map(async (s) => [s.id, await L.loadSet(s.id)])));
const traditionPairs = await L.loadTraditionPairs(), prayerData = await L.loadPrayers();
const data = { sets, setItems, pairs, traditionPairs, prayers: prayerData };

async function boot(extra = {}) {
  const r = new N('div'), store = memStore(extra.store);
  const s = extra.synth || fakeSynth();
  const ctx = { store, clock: { now: () => extra.now || 1_800_000_000_000 }, rng: seeded(), query: extra.query || {}, audio: extra.audio, settings: { get: (k) => (k === 'congregation' ? extra.congregation : undefined) }, t: (k) => k,
    speak: { data, RecognitionCtor: extra.Rec ?? null, MediaRecorderCtor: extra.MR ?? null, getUserMedia: extra.getUserMedia ?? null, URL: extra.URL, BlobCtor: extra.BlobCtor, synth: s.synth, UtteranceCtor: s.U, dayKey: (t) => new Date(t).toISOString().slice(0, 10) } };
  const unmount = mount(r, ctx);
  await waitFor(() => byId(r, { drills: 'drill-start', history: 'speak-history-h', sounds: 'speak-trad', read: 'read-start', shadow: 'shadow-start' }[extra.query?.tab] || 'speak-start'));
  return { root: r, store, ctx, unmount, synth: s };
}

// ---- model ------------------------------------------------------------------------------------------------------------
test('normalizeHe: points, cantillation, maqaf and punctuation go; final letters fold; spaces collapse', () => {
  assert.equal(M.normalizeHe('שָׁלוֹם'), 'שלומ');
  assert.equal(M.normalizeHe('בֹּקֶר־טוֹב!'), 'בקר טוב');
  assert.equal(M.normalizeHe('  לְ־  '), 'ל');
  assert.equal(M.normalizeHe('אֶ֫רֶץ'), 'ארצ');
});
test('compare: exact, full-spelling variant, close, miss, and the best of several alternatives', () => {
  assert.equal(M.compare('שָׁלוֹם', 'שלום').outcome, 'match');
  assert.equal(M.compare('בֹּקֶר טוֹב', 'בוקר טוב').outcome, 'match', 'recognizer full spelling (vav) matches defective pointed spelling');
  const close = M.compare('שָׁלוֹם', 'סלום'); assert.equal(close.outcome, 'close'); assert.ok(close.score >= 0.7);
  assert.equal(M.compare('שָׁלוֹם', 'תודה').outcome, 'miss');
  assert.equal(M.compare('שָׁלוֹם', '').outcome, 'miss');
  const best = M.compare('תּוֹדָה', ['תורה', 'תודה']); assert.equal(best.outcome, 'match'); assert.equal(best.heard, 'תודה');
  assert.equal(M.compare('תּוֹדָה', 'תודה רבה').outcome, 'close', 'target inside a longer utterance counts as close');
});
test('capabilities and pickMode: nothing starts; falls back asr -> record -> self', () => {
  const none = M.capabilities({});
  assert.deepEqual([none.recognition, none.recording, none.synthesis], [false, false, false]);
  assert.equal(M.pickMode(none, 'asr'), 'self');
  const rec = M.capabilities({ webkitSpeechRecognition: class {}, isSecureContext: true });
  assert.equal(rec.recognition, true); assert.equal(M.pickMode(rec, 'auto'), 'asr'); assert.equal(M.pickMode(rec, 'self'), 'self');
  const insecure = M.capabilities({ SpeechRecognition: class {}, isSecureContext: false });
  assert.equal(insecure.recognition, false, 'needs a secure context');
  const r2 = M.capabilities({ MediaRecorder: class {}, navigator: { mediaDevices: { getUserMedia() {} } }, isSecureContext: true });
  assert.equal(M.pickMode(r2, 'auto'), 'record');
});
test('recordAttempt: stores normalized target, caps the list, tolerates damaged state', () => {
  let s = M.recordAttempt(null, { kind: 'say', set: 'x', itemId: 'a', he: 'שָׁלוֹם', mode: 'asr', outcome: 'match', score: 1, heard: 'שלום' }, 5);
  assert.equal(s.attempts.length, 1); assert.equal(s.attempts[0].he, 'שלומ'); assert.equal(s.attempts[0].at, 5);
  s = M.recordAttempt({ attempts: 'junk', mode: 'bogus' }, { outcome: 'said', he: 'x' }, 6);
  assert.equal(s.attempts.length, 1); assert.equal(s.mode, 'auto');
  let big = { attempts: Array.from({ length: M.MAX_ATTEMPTS }, (_, i) => ({ at: i, kind: 'say', outcome: 'said' })) };
  big = M.recordAttempt(big, { outcome: 'said', he: 'x' }, 9999);
  assert.equal(big.attempts.length, M.MAX_ATTEMPTS); assert.equal(big.attempts.at(-1).at, 9999);
});
test('alignLetters and soundReport: misses land on the right letter class; ranked after 3 tries; drills count too', () => {
  const al = M.alignLetters('שָׁלוֹם', 'סלום');
  assert.deepEqual(al.map((x) => x.hit), [false, true, true, true]);
  assert.deepEqual(M.alignLetters('חם', 'ם').map((x) => x.hit), [false, true], 'deletion is a miss on the target letter');
  const attempts = [
    ...[1, 2, 3].map((i) => ({ at: i, kind: 'say', mode: 'asr', he: 'שלומ', heard: 'סלום', outcome: 'close' })),
    { at: 4, kind: 'pair', contrast: 'bet-vet', correct: false }, { at: 5, kind: 'pair', contrast: 'bet-vet', correct: true }, { at: 6, kind: 'pair', contrast: 'bet-vet', correct: false },
    { at: 7, kind: 'say', mode: 'self', he: 'שלומ', outcome: 'said' },
  ];
  const rep = M.soundReport(attempts);
  assert.equal(rep.ranked[0].id, 'shin-sin'); assert.equal(rep.ranked[0].misses, 3); assert.equal(rep.ranked[0].tries, 3);
  const bv = rep.ranked.find((r) => r.id === 'bet-vet'); assert.equal(bv.misses, 2); assert.equal(bv.sources.drill, 3);
  assert.ok(rep.rows.find((r) => r.id === 'other' && r.misses === 0));
  assert.equal(M.soundReport(attempts, { min: 10 }).ranked.length, 0);
  const days = M.dailyTotals(attempts, () => 'd'); assert.deepEqual(days, [{ day: 'd', say: 4, good: 1, drills: 3, drillRight: 1 }]);
});

// ---- recognizer wrappers -------------------------------------------------------------------------------------------------
test('createRecognizer: he-IL, alternatives returned, errors and timeouts reported, unsupported without a constructor', async () => {
  const { Rec, made } = fakeRecognition([{ alternatives: ['שלום', 'שלון'] }, { error: 'not-allowed' }]);
  const r = R.createRecognizer({ Ctor: Rec });
  assert.equal(r.supported, true);
  const a = await r.listen(); assert.deepEqual(a, { ok: true, alternatives: ['שלום', 'שלון'], error: undefined });
  assert.equal(made[0].lang, 'he-IL'); assert.equal(made[0].maxAlternatives, 5); assert.equal(made[0].continuous, false);
  const b = await r.listen(); assert.equal(b.ok, false); assert.equal(b.error, 'not-allowed');
  const slow = R.createRecognizer({ Ctor: class { start() {} abort() {} }, timeoutMs: 5 });
  const c = await slow.listen(); assert.equal(c.error, 'timeout');
  assert.deepEqual(await R.createRecognizer({ Ctor: null }).listen(), { ok: false, error: 'unsupported' });
});
test('createRecorder: a take that reaches maxMs is kept and handed back by the next stop(); it is not dropped', async () => {
  const f = fakeRecorder();
  let fire = null, t = 0;
  const rec = R.createRecorder({ MediaRecorderCtor: f.MR, getUserMedia: f.getUserMedia, URL: f.URL, BlobCtor: f.BlobCtor, maxMs: 6000, now: () => (t += 2000), setTimeout: (fn) => { fire = fn; return 1; }, clearTimeout: () => {} });
  assert.deepEqual(await rec.start(), { ok: true });
  fire(); // the maxMs timer
  await new Promise((r) => setTimeout(r, 5));
  assert.equal(f.tracks[0].stopped, 1, 'microphone released at the limit');
  assert.equal(rec.recording, true, 'the finished take is still waiting to be collected');
  const r = await rec.stop();
  assert.equal(r.ok, true); assert.equal(r.url, 'blob:fake-0'); assert.equal(r.ms, 2000);
  assert.equal(rec.recording, false);
  assert.deepEqual(await rec.stop(), { ok: false, error: 'not-recording' }, 'collected once only');
  // a manual stop before the limit still works, and a new start discards an uncollected take
  assert.deepEqual(await rec.start(), { ok: true }); fire(); await new Promise((r2) => setTimeout(r2, 5));
  assert.deepEqual(await rec.start(), { ok: true }); assert.equal((await rec.stop()).ok, true);
  rec.dispose(); assert.ok(f.urls.revoked.includes('blob:fake-0'));
});
test('createRecorder: records, hands back an object URL, stops tracks, revokes on dispose; permission refusal is reported', async () => {
  const f = fakeRecorder();
  let t = 0;
  const rec = R.createRecorder({ MediaRecorderCtor: f.MR, getUserMedia: f.getUserMedia, URL: f.URL, BlobCtor: f.BlobCtor, now: () => (t += 1500) });
  assert.equal(rec.supported, true);
  assert.deepEqual(await rec.start(), { ok: true }); assert.equal(rec.recording, true);
  const r = await rec.stop(); assert.equal(r.ok, true); assert.equal(r.url, 'blob:fake-0'); assert.equal(r.ms, 1500);
  assert.equal(f.tracks[0].stopped, 1); assert.equal(rec.recording, false);
  rec.dispose(); assert.deepEqual(f.urls.revoked, ['blob:fake-0']);
  const denied = fakeRecorder({ allow: false });
  assert.deepEqual(await R.createRecorder({ MediaRecorderCtor: denied.MR, getUserMedia: denied.getUserMedia, URL: denied.URL }).start(), { ok: false, error: 'not-allowed' });
  assert.equal(R.createRecorder({ MediaRecorderCtor: null, getUserMedia: null }).supported, false);
});
test('createSpeaker: he-IL utterance; unsupported without synthesis', async () => {
  const s = fakeSynth();
  const sp = R.createSpeaker({ synth: s.synth, UtteranceCtor: s.U });
  assert.deepEqual(await sp.speak('שָׁלוֹם'), { ok: true }); assert.equal(s.spoken[0].lang, 'he-IL'); assert.equal(s.spoken[0].text, 'שָׁלוֹם');
  assert.equal((await R.createSpeaker({ synth: null, UtteranceCtor: null }).speak('x')).ok, false);
});

// ---- data ----------------------------------------------------------------------------------------------------------------
test('data/speak: 60 sets by theme, every item copied from words.json (no invented Hebrew), pointed, with transliteration and gloss', () => {
  const idx = rd('data/speak/sets.json');
  assert.equal(idx.count, 60); assert.equal(idx.sets.length, 60); assert.match(idx.note, /not native-reviewed/);
  const files = readdirSync(join(root, 'data/speak/sets')).filter((f) => f.endsWith('.json'));
  assert.equal(files.length, 60);
  const words = new Map(rd('data/vocab/words.json').words.map((w) => [w.id, w]));
  const themes = new Set(), ids = new Set();
  let n = 0;
  for (const s of idx.sets) {
    const set = rd(`data/speak/sets/${s.id}.json`);
    assert.equal(set.id, s.id); assert.ok(!ids.has(s.id)); ids.add(s.id); themes.add(set.theme);
    assert.ok(set.items.length >= 4 && set.items.length <= 12, s.id); assert.equal(set.items.length, s.size);
    for (const it of set.items) {
      const w = words.get(it.id); assert.ok(w, `${s.id}: ${it.id} is in words.json`);
      assert.equal(it.he, w.he); assert.equal(it.translit, w.translit); assert.equal(it.en, w.en);
      assert.match(it.he, /[ְ-ׇ]/, 'pointed'); assert.ok(['word', 'phrase'].includes(it.kind)); n++;
    }
  }
  assert.ok(themes.size >= 20, `themes: ${themes.size}`); assert.ok(n >= 600);
  assert.equal(idx.sets.filter((s) => s.pack.startsWith('survival-')).length, 11, '12 survival packs minus numbers (3 words, below the 4-item floor)');
});
test('data/speak/pairs.json: four contrasts, answers agree with the source niqqud, true pairs are real pairs, het/khaf hides the letter', () => {
  const p = rd('data/speak/pairs.json');
  assert.deepEqual(p.contrasts.map((c) => c.id), ['bet-vet', 'het-khaf', 'kamatz', 'shin-sin']);
  const words = new Map(rd('data/vocab/words.json').words.map((w) => [w.id, w]));
  const perContrast = {};
  for (const it of p.items) {
    const w = words.get(it.id.split(':')[1]); assert.ok(w, it.id); assert.equal(it.he, w.he);
    const slots = P.contrastSlots(it.he, it.contrast); assert.equal(slots.length, 1); assert.equal(slots[0].sound, it.answer); assert.equal(slots[0].i, it.slot);
    assert.ok(it.marked.some((m) => m.mark)); assert.ok(!it.marked.some((m) => /[ְ-ׇ]/.test(m.text)), 'marked display is unpointed');
    if (it.contrast === 'het-khaf') assert.equal(it.marked.find((m) => m.mark).text, '?', 'the letter would give the answer away');
    if (it.type === 'pair') { assert.ok(it.other && it.other.answer !== it.answer); assert.equal(M.normalizeHe(it.he) === M.normalizeHe(it.other.he) || it.contrast === 'het-khaf' || it.contrast === 'kamatz', true); }
    perContrast[it.contrast] = (perContrast[it.contrast] || 0) + 1;
  }
  for (const c of p.contrasts) assert.ok(perContrast[c.id] >= 20, c.id);
  assert.ok(p.items.some((i) => i.type === 'pair' && i.contrast === 'kamatz'));
  assert.ok(p.items.some((i) => i.type === 'pair' && i.contrast === 'shin-sin' && i.he === 'שָׂם'));
  const sounds = p.items.filter((i) => i.contrast === 'bet-vet' && i.type === 'sound');
  assert.equal(sounds.filter((i) => i.answer === 'b').length, sounds.filter((i) => i.answer === 'v').length, 'both sounds equally represented');
  assert.match(p.contrasts.find((c) => c.id === 'het-khaf').note, /sound the same/);
});
test('drillQueue and drillQuestion: ten items, one per pair, pair questions play one of the two words and offer both', () => {
  const q = P.drillQueue(pairs.items, 'kamatz', seeded(), 10);
  assert.equal(q.length, 10);
  const pairIds = q.filter((i) => i.type === 'pair').map((i) => i.pair); assert.equal(new Set(pairIds).size, pairIds.length);
  const pq = P.drillQuestion(q.find((i) => i.type === 'pair'), () => 0.9);
  assert.equal(pq.kind, 'pair'); assert.equal(pq.options.length, 2); assert.ok(pq.options.some((o) => o.id === pq.answer)); assert.equal(pq.play.he, pq.item.other.he);
  const sq = P.drillQuestion(pairs.items.find((i) => i.type === 'sound' && i.contrast === 'bet-vet'), seeded());
  assert.equal(sq.kind, 'sound'); assert.deepEqual(sq.options.map((o) => o.id), ['b', 'v']); assert.equal(sq.answer, sq.item.answer);
});
test('build.mjs is deterministic: rebuilding in memory gives the committed sets', async () => {
  const B = await import('../src/speak/build.mjs');
  const words = rd('data/vocab/words.json').words, packs = rd('data/vocab/packs.json').packs;
  const mt = B.manifestTextMap([rd('data/audio/manifest.json'), rd('data/audio/manifest-words-israeli.json')]);
  const built = B.buildSets({ words, packs, manifestTexts: mt });
  assert.equal(built.length, 60);
  assert.deepEqual(built.map((s) => s.id), rd('data/speak/sets.json').sets.map((s) => s.id));
  assert.deepEqual(built[0].items, rd(`data/speak/sets/${built[0].id}.json`).items);
  assert.equal(P.buildPairs(words, mt).items.length, pairs.items.length);
});

// ---- view: Say it ----------------------------------------------------------------------------------------------------------
test('start screen: draft flag, set select with label, mode radios (only self enabled without APIs), recognizer unverified wording', async () => {
  const { root } = await boot();
  assert.ok(root.text.includes(DRAFT));
  const sel = byId(root, 'speak-set'); assert.equal(sel.tag, 'select');
  assert.ok(root.find((n) => n.tag === 'label' && n.attrs.for === 'speak-set').length);
  assert.equal(root.find((n) => n.tag === 'option').length, 61, '60 sets + today\'s five');
  const radios = root.find((n) => n.tag === 'input' && n.attrs.type === 'radio');
  assert.equal(radios.length, 3);
  assert.equal(radios.find((r) => r.attrs.value === 'self').attrs.checked, '');
  assert.equal(radios.find((r) => r.attrs.value === 'asr').attrs.disabled, '');
  assert.match(root.text, /not available in this browser/);
  assert.match(root.text, /Speech recognition: not available/);
  assert.equal(root.find((n) => n.tag === 'div' && n.listeners.click).length, 0, 'no click handlers on non-buttons');
  assert.ok(root.find((n) => n.tag === 'input' && !root.find((l) => l.tag === 'label' && l.attrs.for === n.attrs.id).length).length === 0, 'every input has a label');
});
test('with a recognizer: asr is the default mode and the privacy/unverified note is shown', async () => {
  const { Rec } = fakeRecognition([]);
  const { root } = await boot({ Rec });
  assert.ok(root.text.includes(RECOGNIZER_NOTE));
  assert.match(RECOGNIZER_NOTE, /not verified/); assert.match(RECOGNIZER_NOTE, /may send the audio/);
  const radios = root.find((n) => n.tag === 'input' && n.attrs.type === 'radio');
  assert.equal(radios.find((r) => r.attrs.value === 'asr').attrs.checked, '');
  assert.equal(radios.find((r) => r.attrs.value === 'asr').attrs.disabled, undefined);
});
test('self mode: listen plays the browser voice (labelled as such), I said it / Not yet are stored, end screen counts', async () => {
  const { root, store, synth } = await boot({ query: { set: 'speak-survival-greetings-1' } });
  byId(root, 'speak-start').click();
  await waitFor(() => byId(root, 'speak-q'));
  const set = setItems['speak-survival-greetings-1'];
  const he = root.find((n) => n.attrs.lang === 'he')[0].text;
  assert.equal(he, set.items[0].he);
  assert.ok(root.text.includes(set.items[0].translit) && root.text.includes(set.items[0].en));
  byId(root, 'speak-listen').click();
  await waitFor(() => /browser's voice/.test(statusText(root)));
  assert.equal(synth.spoken[0].text, set.items[0].he); assert.equal(synth.spoken[0].lang, 'he-IL');
  assert.match(statusText(root), /not a recording/);
  byId(root, 'speak-said').click();
  await waitFor(() => byId(root, 'speak-next'));
  assert.equal(byId(root, 'speak-said').attrs.disabled, '');
  const st = store.m['speak.v1'];
  assert.equal(st.attempts.length, 1); assert.equal(st.attempts[0].outcome, 'said'); assert.equal(st.attempts[0].mode, 'self'); assert.equal(st.attempts[0].set, 'speak-survival-greetings-1');
  assert.equal(st.lastSet, 'speak-survival-greetings-1');
  byId(root, 'speak-next').click();
  await waitFor(() => byId(root, 'speak-notyet'));
  assert.match(root.text, /2 of 12/);
  byId(root, 'speak-notyet').click();
  await waitFor(() => byId(root, 'speak-next'));
  assert.doesNotMatch(root.text, /wrong|fail/i);
  byId(root, 'speak-finish').click();
  await waitFor(() => byId(root, 'speak-again'));
  assert.match(root.text, /You tried 2 items/); assert.match(root.text, /1 said or matched, 0 close, 1 not yet, of 2 tried/);
  assert.match(root.text, /not that a teacher heard you/);
});
test('asr mode: match settles the item; a miss shows what was heard and offers self-judging; mic errors fall back', async () => {
  const set = setItems['speak-survival-greetings-1'];
  const first = M.normalizeHe(set.items[0].he); // the recognizer returns unpointed text: feed it exactly that
  const { Rec, made } = fakeRecognition([{ alternatives: [first] }, { alternatives: ['תודה'] }, { error: 'not-allowed' }]);
  const { root, store } = await boot({ Rec, query: { set: 'speak-survival-greetings-1' } });
  byId(root, 'speak-start').click();
  await waitFor(() => byId(root, 'speak-mic'));
  byId(root, 'speak-mic').click();
  assert.match(statusText(root), /Listening/);
  await waitFor(() => byId(root, 'speak-next'));
  assert.equal(made[0].lang, 'he-IL');
  assert.match(byId(root, 'speak-verdict').text, /matched the target/); assert.match(byId(root, 'speak-verdict').text, /unverified for Hebrew/);
  let a = store.m['speak.v1'].attempts.at(-1);
  assert.equal(a.outcome, 'match'); assert.equal(a.mode, 'asr'); assert.equal(a.heard, first);
  byId(root, 'speak-next').click();
  await waitFor(() => byId(root, 'speak-mic') && !byId(root, 'speak-next'));
  byId(root, 'speak-mic').click();
  await waitFor(() => byId(root, 'speak-next'));
  const v = byId(root, 'speak-verdict').text;
  assert.match(v, /did not match|Close/); assert.ok(v.includes('תודה'), 'shows what the recognizer wrote');
  assert.ok(byId(root, 'speak-said') && byId(root, 'speak-notyet'), 'self-judge offered after a miss');
  assert.equal(byId(root, 'speak-mic').attrs.disabled, undefined, 'can try again');
  byId(root, 'speak-said').click();
  await flush();
  a = store.m['speak.v1'].attempts.at(-1); assert.equal(a.outcome, 'said');
  byId(root, 'speak-next').click();
  await waitFor(() => byId(root, 'speak-mic') && !byId(root, 'speak-next'));
  byId(root, 'speak-mic').click();
  await waitFor(() => byId(root, 'speak-said'));
  assert.match(byId(root, 'speak-verdict').text, /microphone was not allowed/);
});
test('record mode: record, stop, playback element, self-judge; recordings are revoked on unmount', async () => {
  const f = fakeRecorder();
  const { root, store, unmount } = await boot({ MR: f.MR, getUserMedia: f.getUserMedia, URL: f.URL, BlobCtor: f.BlobCtor, query: { set: 'speak-survival-cafe-1' } });
  assert.match(root.text, /Recordings stay in this page/);
  const radios = root.find((n) => n.tag === 'input' && n.attrs.type === 'radio');
  assert.equal(radios.find((r) => r.attrs.value === 'record').attrs.checked, '');
  byId(root, 'speak-start').click();
  await waitFor(() => byId(root, 'speak-record'));
  byId(root, 'speak-record').click();
  await waitFor(() => /Stop recording/.test(byId(root, 'speak-record').text));
  assert.match(statusText(root), /Recording/);
  byId(root, 'speak-record').click();
  await waitFor(() => root.find((n) => n.tag === 'audio').length);
  const audio = root.find((n) => n.tag === 'audio')[0];
  assert.equal(audio.attrs.controls, ''); assert.equal(audio.attrs.src, 'blob:fake-0'); assert.ok(audio.attrs['aria-label']);
  assert.equal(f.tracks[0].stopped, 1, 'microphone released after stop');
  byId(root, 'speak-notyet').click();
  await waitFor(() => byId(root, 'speak-next'));
  assert.equal(store.m['speak.v1'].attempts[0].mode, 'record'); assert.equal(store.m['speak.v1'].attempts[0].outcome, 'notyet');
  unmount();
  assert.deepEqual(f.urls.revoked, ['blob:fake-0']);
});
test('model audio prefers a real clip through ctx.audio when one exists', async () => {
  const played = [];
  const audio = { has: (k, id) => k === 'word' && id === 'greetings-02', play: async (k, id) => { played.push(id); return { source: 'file' }; } };
  const { root } = await boot({ audio, query: { set: 'speak-survival-greetings-1' } });
  byId(root, 'speak-start').click();
  await waitFor(() => byId(root, 'speak-listen'));
  byId(root, 'speak-listen').click();
  await waitFor(() => /recorded clip/.test(statusText(root)));
  assert.deepEqual(played, ['greetings-02']);
});

// ---- view: drills and history -------------------------------------------------------------------------------------------
test('drills: contrast select with note, ten questions, answers stored with contrast and correctness, round summary', async () => {
  const { root, store } = await boot({ query: { tab: 'drills', contrast: 'shin-sin' } });
  assert.equal(byId(root, 'speak-contrast').value, 'shin-sin');
  assert.match(byId(root, 'speak-contrast-note').text, /which side the dot/);
  assert.ok(root.find((n) => n.tag === 'label' && n.attrs.for === 'speak-contrast').length);
  byId(root, 'drill-start').click();
  await waitFor(() => byId(root, 'drill-q'));
  let right = 0;
  for (let i = 0; i < 10; i++) {
    assert.match(root.text, new RegExp(`${i + 1} of 10`));
    const opts = root.find((n) => n.tag === 'button' && n.attrs['data-id']);
    assert.equal(opts.length, 2);
    byId(root, 'drill-listen').click();
    await waitFor(() => /browser's voice/.test(statusText(root)));
    const pick = opts[i % 2]; pick.click();
    await waitFor(() => byId(root, 'drill-next'));
    const a = store.m['speak.v1'].attempts.at(-1);
    assert.equal(a.kind, 'pair'); assert.equal(a.contrast, 'shin-sin'); assert.equal(typeof a.correct, 'boolean');
    if (a.correct) right++;
    assert.match(byId(root, 'drill-verdict').text, a.correct ? /^Right\./ : /^Not this time/);
    assert.match(byId(root, 'drill-verdict').text, /The word was/);
    assert.ok(opts.every((o) => o.attrs.disabled === ''));
    byId(root, 'drill-next').click();
  }
  await waitFor(() => byId(root, 'drill-summary'));
  assert.equal(byId(root, 'drill-summary').text, `Shin or sin (sh / s): ${right} of 10 right this round.`);
  assert.equal(store.m['speak.v1'].attempts.length, 10);
});
test('drills: a sound question shows the unpointed word with the marked letter; het/khaf shows a hint and hides the letter', async () => {
  const { root } = await boot({ query: { tab: 'drills', contrast: 'het-khaf' } });
  assert.match(root.text, /spelling check, not a listening one/);
  byId(root, 'drill-start').click();
  await waitFor(() => byId(root, 'drill-q'));
  const mark = root.find((n) => n.className === 'mark')[0];
  assert.ok(mark); assert.equal(mark.text, '?'); assert.match(root.text, /Hint: /);
  assert.doesNotMatch(root.find((n) => n.attrs.lang === 'he')[0].text, /[ְ-ׇ]/);
});
test('history: empty state, then weakest sounds after 3 tries, by-day table, recent attempts, and a confirmed clear', async () => {
  const empty = await boot({ query: { tab: 'history' } });
  assert.match(empty.root.text, /Nothing yet/);
  const now = 1_800_000_000_000;
  let st = M.emptyState();
  for (let i = 0; i < 3; i++) st = M.recordAttempt(st, { kind: 'say', set: 's', itemId: 'i' + i, he: 'חַיִּים', mode: 'asr', outcome: 'close', score: 0.75, heard: 'איים' }, now + i);
  for (let i = 0; i < 3; i++) st = M.recordAttempt(st, { kind: 'pair', set: 'bet-vet', itemId: 'p' + i, he: 'בֵּן', mode: 'drill', outcome: 'miss', contrast: 'bet-vet', correct: i === 0 }, now + 10 + i);
  const { root, store } = await boot({ query: { tab: 'history' }, store: { 'speak.v1': st } });
  const weakest = byId(root, 'speak-weakest');
  assert.ok(weakest, 'weakest list rendered');
  assert.match(weakest.children[0].text, /^het \/ khaf \(throaty kh\): missed 3 of 3 \(100%\)/);
  assert.match(weakest.text, /bet \/ vet: missed 2 of 3 \(67%\), incl\. drills/);
  assert.match(root.text, /may be its weakness, not yours/);
  const rows = byId(root, 'speak-days').find((n) => n.tag === 'tr'); assert.equal(rows.length, 2);
  assert.match(rows[1].text, /0 of 3/); assert.match(rows[1].text, /1 of 3/);
  assert.equal(byId(root, 'speak-recent').children.length, 6);
  byId(root, 'speak-clear').click();
  assert.ok(byId(root, 'speak-clear-yes'), 'asks before deleting');
  byId(root, 'speak-clear-yes').click();
  await waitFor(() => /Nothing yet/.test(root.text));
  assert.equal(store.m['speak.v1'].attempts.length, 0);
});
test('tabs: six section links, current one marked; unmount stops everything without throwing', async () => {
  const { root, unmount } = await boot();
  const links = root.find((n) => n.tag === 'a' && n.attrs['data-tab']);
  assert.deepEqual(links.map((l) => l.attrs.href), ['#/speak', '#/speak?tab=drills', '#/speak?tab=sounds', '#/speak?tab=read', '#/speak?tab=shadow', '#/speak?tab=history']);
  assert.equal(links[0].attrs['aria-current'], 'page');
  links[1].click();
  await waitFor(() => byId(root, 'drill-start'));
  assert.equal(root.find((n) => n.tag === 'a' && n.attrs['data-tab'] === 'drills')[0].attrs['aria-current'], 'page');
  unmount();
});
test('source hygiene: no build tooling or third-party imports in the runtime module; docs carry the route line and the unverified notice', () => {
  const src = readFileSync(join(root, 'src/speak/speak.js'), 'utf8');
  for (const m of src.matchAll(/from '([^']+)'/g)) assert.ok(m[1].startsWith('.'), m[1]);
  assert.match(src, /lang he-IL|he-IL/);
  const routes = readFileSync(join(root, 'docs/speak/ROUTES.md'), 'utf8');
  assert.match(routes, /pattern: '\/speak', module: '\.\.\/speak\/speak\.js'/);
  const readme = readFileSync(join(root, 'docs/speak/README.md'), 'utf8');
  assert.match(readme, /unverified for Hebrew/i);
});

// ---- stage 5: hash tabs, tradition drill, read-aloud, shadowing -----------------------------------------------------------
test('tabFromLocation: query wins; #/speak/read, #/speak?tab=read and aliases work; unknown falls back to say', () => {
  assert.deepEqual(TAB_IDS, ['say', 'drills', 'sounds', 'read', 'shadow', 'history']);
  assert.equal(tabFromLocation({ tab: 'history' }, '#/speak/read'), 'history');
  assert.equal(tabFromLocation({}, '#/speak/read'), 'read');
  assert.equal(tabFromLocation(undefined, '#/speak?tab=shadow'), 'shadow');
  assert.equal(tabFromLocation({}, '#/speak/tradition'), 'sounds');
  assert.equal(tabFromLocation({ tab: 'shadowing' }, ''), 'shadow');
  assert.equal(tabFromLocation({ tab: 'nope' }, '#/vocab'), 'say');
  assert.equal(tabFromLocation(null, undefined), 'say');
});
test('sources line: Wiktionary credit with a link to the credits screen', async () => {
  const { root, unmount } = await boot();
  assert.match(root.text, /Word meanings: Wiktionary contributors \(CC BY-SA 4\.0\)/);
  assert.equal(root.find((n) => n.tag === 'a' && n.attrs.href === '#/credits').length, 1);
  unmount();
});

test('hash tabs open the right screen without any router entry, and clicking a tab updates the hash without a reload', async () => {
  const calls = [];
  globalThis.location = { hash: '#/speak/read' }; globalThis.history = { replaceState: (a, b, u) => calls.push(u) };
  const r = new N('div'), store = memStore(), s = fakeSynth();
  const unmount = mount(r, { store, clock: { now: () => 1 }, rng: seeded(), query: {}, settings: { get: () => undefined }, speak: { data, RecognitionCtor: null, synth: s.synth, UtteranceCtor: s.U } });
  await waitFor(() => byId(r, 'read-start'));
  assert.equal(r.find((n) => n.tag === 'a' && n.attrs['aria-current'] === 'page')[0].attrs['data-tab'], 'read');
  r.find((n) => n.tag === 'a' && n.attrs['data-tab'] === 'shadow')[0].click();
  await waitFor(() => byId(r, 'shadow-start'));
  assert.deepEqual(calls, ['#/speak?tab=shadow']);
  unmount(); delete globalThis.location; delete globalThis.history;
});
test('tradition summary: kamatz/patach is silent in Israeli and audible in Ashkenazi; shin/sin is audible everywhere; quiz uses audible pairs only', () => {
  const isr = T.traditionSummary(traditionPairs, 'israeli'), ash = T.traditionSummary(traditionPairs, 'ashkenazi');
  const kp = (x) => x.find((c) => c.id === 'kamatz-patach');
  assert.equal(kp(isr).distinct, 0); assert.equal(kp(isr).same, kp(isr).shown);
  assert.equal(kp(ash).distinct, kp(ash).shown); assert.ok(kp(ash).shown >= 20);
  for (const t of T.TRADITIONS) { const ss = T.traditionSummary(traditionPairs, t).find((c) => c.id === 'shin-sin'); assert.equal(ss.distinct, ss.shown); }
  assert.equal(T.tradition('bogus'), 'sephardi');
  const q = T.tradQueue(traditionPairs, 'israeli', seeded(), 50);
  assert.ok(q.length && q.every((i) => i.pair.audible[0]) && !q.some((i) => i.contrast === 'kamatz-patach'));
  const aq = T.tradQuestion(T.tradQueue(traditionPairs, 'ashkenazi', seeded(), 5)[0], () => 0.9);
  assert.equal(aq.options.length, 2); assert.ok(aq.options.some((o) => o.id === aq.answer)); assert.match(aq.play.simple, /\S/);
  const line = T.pairLine(traditionPairs.contrasts.find((c) => c.id === 'kamatz-patach').pairs[0], traditionPairs, 'ashkenazi');
  assert.equal(line.distinct, true); assert.notEqual(line.simple[0], line.simple[1]);
});
test('sounds tab: tradition from Settings, distinct vs same lists, switching tradition changes the counts; quiz cue differs by tradition', async () => {
  const { root, store, synth } = await boot({ query: { tab: 'sounds' }, congregation: 'ashkenazi' });
  const sel = byId(root, 'speak-trad');
  assert.equal(sel.value, 'ashkenazi'); assert.ok(root.find((n) => n.tag === 'label' && n.attrs.for === 'speak-trad').length);
  assert.ok(sel.find((n) => n.tag === 'option' && /your Settings choice/.test(n.text) && n.attrs.value === 'ashkenazi').length);
  assert.match(root.text, /Draft: the pairs were generated by rule/);
  assert.match(root.text, /Kamatz or patach/);
  let sums = root.find((n) => n.className === 'sk-contrast-sum').map((n) => n.text);
  assert.ok(sums.some((t) => /^40 of 40 listed pairs sound different in Ashkenazi; 0 sound the same/.test(t)), sums.join('|'));
  assert.match(root.text, /sound different/); 
  // quiz in Ashkenazi: sound-spelling cue, no browser-voice button
  byId(root, 'trad-start').click();
  await waitFor(() => byId(root, 'trad-q'));
  assert.ok(byId(root, 'trad-cue')); assert.equal(byId(root, 'trad-listen'), undefined);
  assert.match(byId(root, 'trad-cue').text, /Sounds like \(Ashkenazi, by rule\): "/);
  root.find((n) => n.tag === 'button' && n.attrs['data-id'])[0].click();
  await waitFor(() => byId(root, 'trad-next'));
  const a = store.m['speak.v1'].attempts[0];
  assert.equal(a.kind, 'pair'); assert.equal(a.tradition, 'ashkenazi'); assert.equal(typeof a.correct, 'boolean');
  byId(root, 'trad-finish').click();
  await waitFor(() => byId(root, 'trad-summary'));
  assert.match(byId(root, 'trad-summary').text, /of 1 right, in Ashkenazi pronunciation/);
  byId(root, 'trad-again').click();
  await waitFor(() => byId(root, 'speak-trad'));
  byId(root, 'speak-trad').fire('change', { target: { value: 'israeli' } });
  await waitFor(() => root.find((n) => n.className === 'sk-contrast-sum').some((n) => /^0 of 40 listed pairs sound different in Israeli; 40 sound the same/.test(n.text)));
  byId(root, 'trad-start').click();
  await waitFor(() => byId(root, 'trad-q'));
  assert.ok(byId(root, 'trad-listen')); byId(root, 'trad-listen').click();
  await waitFor(() => synth.spoken.length);
  assert.equal(synth.spoken[0].lang, 'he-IL');
});
test('alignWords / compareLine: hits, a dropped word, vav spelling, near words, extra words ignored; best alternative wins', () => {
  const line = 'בָּרְכוּ אֶת יְהוָה הַמְּבֹרָךְ׃';
  const full = M.compareLine(line, 'ברכו את יהוה המבורך');
  assert.equal(full.outcome, 'match', 'full spelling (vav) still matches'); assert.equal(full.hit, 4);
  const dropped = M.alignWords(line, 'ברכו את המברך');
  assert.deepEqual(dropped.map((w) => w.status), ['hit', 'hit', 'miss', 'hit']); assert.equal(dropped[2].heard, null);
  const extra = M.alignWords(line, 'אז ברכו את יהוה המברך בבקשה');
  assert.deepEqual(extra.map((w) => w.status), ['hit', 'hit', 'hit', 'hit']);
  const near = M.alignWords(line, 'ברכו את יהוה המברכים');
  assert.equal(near[3].status, 'near'); assert.equal(M.compareLine(line, 'ברכו את יהוה המברכים').outcome, 'close');
  assert.equal(M.compareLine(line, 'תודה רבה').outcome, 'miss');
  assert.equal(M.compareLine(line, ['תודה רבה', 'ברכו את יהוה המברך']).outcome, 'match');
  assert.equal(M.compareLine(line, '').outcome, 'miss');
  assert.deepEqual(M.wordsOf('כָּל־הָעוֹלָם׃'), ['כל', 'העולמ']);
});
test('attempt fields: rating clamped, tradition and missedWords kept, read heard keeps up to 400 chars; missedWordsReport counts repeats', () => {
  let st = M.recordAttempt(null, { kind: 'shadow', rating: 9, outcome: 'said', he: 'x', tradition: 'israeli' }, 1);
  assert.equal(st.attempts[0].rating, 3); assert.equal(st.attempts[0].tradition, 'israeli');
  st = M.recordAttempt(st, { kind: 'read', outcome: 'close', he: 'x', heard: 'ש'.repeat(500), missedWords: ['יהוה', 'את'] }, 2);
  st = M.recordAttempt(st, { kind: 'read', outcome: 'close', he: 'x', missedWords: ['יהוה'] }, 3);
  assert.equal(st.attempts[1].heard.length, 400);
  assert.deepEqual(M.missedWordsReport(st.attempts), [{ word: 'יהוה', count: 2 }]);
  assert.equal(M.soundReport(st.attempts).total, 0, 'read and shadow attempts are not letter evidence');
});
test('createRecognizer.listen accepts a per-call timeout', async () => {
  const r = R.createRecognizer({ Ctor: class { start() {} abort() {} }, timeoutMs: 60000 });
  assert.equal((await r.listen({ timeoutMs: 5 })).error, 'timeout');
});
test('data/speak/prayers.json: 9 prayers, every line verbatim from the corpus registry, with licence and draft status carried over', () => {
  const pr = rd('data/speak/prayers.json');
  assert.equal(pr.prayers.length, 9); assert.match(pr.note, /NOT proofread/);
  const reg = new Map(rd('data/corpus/registry.json').entries.map((e) => [e.id, e]));
  for (const p of pr.prayers) {
    const e = reg.get(p.id); assert.ok(e, p.id);
    assert.equal(p.lines.join('\n'), e.he.split('\n').map((l) => l.trim()).filter(Boolean).join('\n'));
    assert.equal(p.proofread, false); assert.ok(p.license && p.attribution); assert.ok(p.lines.length >= 1);
    assert.equal(!!p.lineAudio, p.lines.length === 1);
    for (const l of p.lines) assert.match(l, /[ְ-ׇ]/, 'pointed');
  }
  assert.ok(pr.prayers.some((p) => p.lines.length === 2));
});
test('build.mjs only reads data/speak/minimal-pairs.json (it belongs to the pronunciation lane)', () => {
  const src = readFileSync(join(root, 'src/speak/build.mjs'), 'utf8');
  assert.doesNotMatch(src, /writeFileSync\([^)]*minimal-pairs/);
  assert.doesNotMatch(src, /unlinkSync\(join\(root, 'data\/speak\/minimal/);
});

async function startRead(extra = {}, prayerId = 'torah-barchu') {
  const b = await boot({ query: { tab: extra.tab || 'read', prayer: prayerId }, ...extra });
  byId(b.root, `${extra.tab || 'read'}-start`).click();
  await waitFor(() => byId(b.root, `${extra.tab || 'read'}-q`));
  return b;
}
test('read aloud with a recognizer: missed word underlined and listed, stored with missedWords; full match settles; summary', async () => {
  const lines = prayerData.prayers.find((p) => p.id === 'torah-barchu').lines;
  const { Rec } = fakeRecognition([{ alternatives: ['ברכו את המברך'] }, { alternatives: [M.normalizeHe(lines[1])] }]);
  const { root, store } = await startRead({ Rec });
  assert.equal(root.find((n) => n.attrs.lang === 'he')[0].text.replace(/\s+/g, ' ').trim(), lines[0]);
  assert.match(root.text, /line 1 of 2/);
  byId(root, 'read-mic').click();
  assert.match(statusText(root), /Listening/);
  await waitFor(() => byId(root, 'read-next'));
  const miss = root.find((n) => n.className === 'w-miss'); assert.equal(miss.length, 1); assert.equal(miss[0].text, 'יְהוָה');
  assert.equal(root.find((n) => n.attrs['data-status'] === 'hit').length, 3);
  assert.match(byId(root, 'read-verdict').text, /3 of 4 words matched/);
  assert.equal(byId(root, 'read-missed').text.includes('יְהוָה'), true);
  assert.ok(byId(root, 'read-said') && byId(root, 'read-notyet'), 'self-judging offered after a miss');
  assert.match(byId(root, 'read-verdict').text, /unverified for Hebrew/);
  let a = store.m['speak.v1'].attempts.at(-1);
  assert.equal(a.kind, 'read'); assert.equal(a.set, 'torah-barchu'); assert.equal(a.itemId, '0'); assert.equal(a.outcome, 'close'); assert.deepEqual(a.missedWords, ['יהוה']); assert.equal(a.mode, 'asr');
  byId(root, 'read-next').click();
  await waitFor(() => byId(root, 'read-mic') && !byId(root, 'read-next'));
  assert.match(root.text, /line 2 of 2/);
  byId(root, 'read-mic').click();
  await waitFor(() => byId(root, 'read-next'));
  assert.match(byId(root, 'read-verdict').text, /Every word matched/);
  assert.equal(root.find((n) => n.className === 'w-miss').length, 0);
  a = store.m['speak.v1'].attempts.at(-1); assert.equal(a.outcome, 'match'); assert.equal(a.itemId, '1');
  assert.equal(byId(root, 'read-next').text, 'See my results');
  byId(root, 'read-next').click();
  await waitFor(() => byId(root, 'read-summary'));
  assert.match(byId(root, 'read-summary').text, /2 lines tried, 1 read in full/);
});
test('read aloud errors and no recognizer: not-allowed offers self-judging; self mode stores "said" with mode self', async () => {
  const { Rec } = fakeRecognition([{ error: 'not-allowed' }]);
  const a = await startRead({ Rec });
  a.root.find((n) => n.attrs.id === 'read-mic')[0].click();
  await waitFor(() => byId(a.root, 'read-said'));
  assert.match(byId(a.root, 'read-verdict').text, /microphone was not allowed/);
  const b = await startRead({}, 'hamotzi');
  assert.equal(byId(b.root, 'read-mic'), undefined);
  byId(b.root, 'read-said').click();
  await waitFor(() => byId(b.root, 'read-next'));
  const at = b.store.m['speak.v1'].attempts[0];
  assert.equal(at.kind, 'read'); assert.equal(at.mode, 'self'); assert.equal(at.outcome, 'said');
  byId(b.root, 'read-next').click();
  await waitFor(() => byId(b.root, 'read-summary'));
  assert.match(byId(b.root, 'read-summary').text, /1 line tried, 1 read in full/);
});
test('read aloud start screen: prayer select with label, nine prayers, tradition accent warning, draft note', async () => {
  const { root } = await boot({ query: { tab: 'read' } });
  assert.equal(byId(root, 'speak-prayer').find((n) => n.tag === 'option').length, 9);
  assert.ok(root.find((n) => n.tag === 'label' && n.attrs.for === 'speak-prayer').length);
  assert.match(root.text, /Sephardi or Ashkenazi style/); assert.ok(root.text.includes(PRAYER_NOTE));
  assert.equal(root.find((n) => n.tag === 'input' && n.attrs.type === 'radio').length, 3);
});
test('shadowing: listen (browser voice, slow option), rate 1-3, stored with rating; summary averages; clip preferred when it exists', async () => {
  const { root, store, synth } = await startRead({ tab: 'shadow' });
  assert.match(byId(root, 'shadow-howto').text, /rate how close/);
  byId(root, 'shadow-listen').click();
  await waitFor(() => /browser's voice/.test(statusText(root)));
  assert.equal(synth.spoken.length, 1);
  assert.equal(synth.spoken[0].text.trim(), M.spokenPointed(prayerData.prayers.find((p) => p.id === 'torah-barchu').lines[0]), 'the browser voice gets the spoken form of the divine name (Adonai), as the audio manifest does');
  byId(root, 'shadow-slow').click();
  await waitFor(() => synth.spoken.length === 2);
  assert.equal(synth.spoken[1].rate, 0.6);
  await flush(); await flush(); // let the slow playback finish so its status line does not overwrite the rating message
  byId(root, 'shadow-r3').click();
  await waitFor(() => byId(root, 'shadow-next'));
  assert.match(statusText(root), /Rated 3 of 3/);
  assert.equal(byId(root, 'shadow-r1').attrs.disabled, '');
  let a = store.m['speak.v1'].attempts.at(-1);
  assert.deepEqual([a.kind, a.rating, a.outcome, a.mode, a.set], ['shadow', 3, 'said', 'self', 'torah-barchu']);
  byId(root, 'shadow-next').click();
  await waitFor(() => byId(root, 'shadow-r1') && !byId(root, 'shadow-next'));
  byId(root, 'shadow-r1').click();
  await waitFor(() => byId(root, 'shadow-next'));
  a = store.m['speak.v1'].attempts.at(-1); assert.deepEqual([a.rating, a.outcome], [1, 'notyet']);
  byId(root, 'shadow-next').click();
  await waitFor(() => byId(root, 'shadow-summary'));
  assert.match(byId(root, 'shadow-summary').text, /2 lines shadowed, average self-rating 2 of 3/);
  const played = [];
  const audio = { has: (k, id) => k === 'line' && id === 'hamotzi', play: async (k, id) => { played.push([k, id]); return { source: 'file' }; } };
  const c = await startRead({ tab: 'shadow', audio }, 'hamotzi');
  byId(c.root, 'shadow-listen').click();
  await waitFor(() => played.length);
  assert.deepEqual(played, [['line', 'hamotzi']]);
  assert.equal(c.synth.spoken.length, 0, 'no browser voice when a clip exists');
});
test('shadowing with recording: record, playback element, then rating is stored with mode record', async () => {
  const f = fakeRecorder();
  const { root, store } = await startRead({ tab: 'shadow', MR: f.MR, getUserMedia: f.getUserMedia, URL: f.URL, BlobCtor: f.BlobCtor }, 'hamotzi');
  byId(root, 'speak-record').click();
  await waitFor(() => /Stop recording/.test(byId(root, 'speak-record').text));
  byId(root, 'speak-record').click();
  await waitFor(() => root.find((n) => n.tag === 'audio').length);
  byId(root, 'shadow-r2').click();
  await waitFor(() => byId(root, 'shadow-next'));
  const a = store.m['speak.v1'].attempts[0]; assert.deepEqual([a.mode, a.rating], ['record', 2]);
});
test('history lists read and shadow attempts and the words missed most', async () => {
  let st = M.emptyState();
  const now = 1_800_000_000_000;
  st = M.recordAttempt(st, { kind: 'read', set: 'torah-barchu', itemId: '0', he: 'בָּרְכוּ אֶת יְהוָה', mode: 'asr', outcome: 'close', heard: 'ברכו את', missedWords: ['יהוה'] }, now);
  st = M.recordAttempt(st, { kind: 'read', set: 'torah-barchu', itemId: '0', he: 'בָּרְכוּ אֶת יְהוָה', mode: 'asr', outcome: 'close', heard: 'ברכו', missedWords: ['יהוה', 'את'] }, now + 1);
  st = M.recordAttempt(st, { kind: 'shadow', set: 'hamotzi', itemId: '0', he: 'בָּרוּךְ', mode: 'self', outcome: 'said', rating: 3 }, now + 2);
  const { root } = await boot({ query: { tab: 'history' }, store: { 'speak.v1': st } });
  assert.match(byId(root, 'speak-missed-words').text, /missed 2 times/);
  const recent = byId(root, 'speak-recent').text;
  assert.match(recent, /read aloud: close/); assert.match(recent, /shadowing rated 3: said/);
  assert.doesNotMatch(recent, /heard:/, 'long read transcripts are not echoed in the list');
});
test('docs: ROUTES.md lists the sub-pages and nav strings; README covers tradition, read-aloud and shadowing', () => {
  const routes = readFileSync(join(root, 'docs/speak/ROUTES.md'), 'utf8');
  for (const t of ['drills', 'sounds', 'read', 'shadow', 'history']) assert.match(routes, new RegExp(`pattern: '/speak/${t}'`));
  for (const k of ['nav.speak-drills', 'nav.speak-sounds', 'nav.speak-read', 'nav.speak-shadow', 'nav.speak-history']) assert.ok(routes.includes(k), k);
  const readme = readFileSync(join(root, 'docs/speak/README.md'), 'utf8');
  assert.match(readme, /Sounds by tradition/); assert.match(readme, /Read a prayer aloud/); assert.match(readme, /Shadowing/);
});

// ---- daily card ----------------------------------------------------------------------------------------------------------
const D = await import('../src/speak/daily.js');
const poolFor = (date) => D.setsForDay(date, sets.length).flatMap((i) => setItems[sets[i].id].items.map((it) => ({ ...it, set: sets[i].id })));
test('daily: dayKeyLocal, dayNumber and setsForDay rotate by date, wrap, and are deterministic', () => {
  assert.equal(D.dayKeyLocal(new Date(2026, 10, 4, 23, 59).getTime()), '2026-11-04');
  assert.equal(D.dayNumber('1970-01-02'), 1); assert.equal(D.dayNumber('junk'), 0);
  const a = D.setsForDay('2026-11-04', 60), b = D.setsForDay('2026-11-05', 60);
  assert.equal(a.length, 3); assert.deepEqual(a, D.setsForDay('2026-11-04', 60));
  assert.notDeepEqual(a, b); assert.equal(b[0], (a[0] + 3) % 60);
  assert.deepEqual(D.setsForDay('2026-11-04', 2).length, 2); assert.deepEqual(D.setsForDay('2026-11-04', 0), []);
});
test('daily: five distinct pointed items from the pool, no history = rotates by date, never the divine name, stable for a date', () => {
  const c1 = D.buildDailyCard({ date: '2026-11-04', pool: poolFor('2026-11-04') });
  const c2 = D.buildDailyCard({ date: '2026-11-05', pool: poolFor('2026-11-05') });
  assert.equal(c1.kind, 'speak-daily'); assert.equal(c1.items.length, 5); assert.equal(c1.id, 'daily:2026-11-04');
  assert.equal(new Set(c1.items.map((i) => M.normalizeHe(i.he))).size, 5);
  assert.deepEqual(c1, D.buildDailyCard({ date: '2026-11-04', pool: poolFor('2026-11-04') }));
  assert.notDeepEqual(c1.items.map((i) => i.id), c2.items.map((i) => i.id));
  const words = new Map(rd('data/vocab/words.json').words.map((w) => [w.id, w]));
  for (const it of c1.items) { assert.equal(it.he, words.get(it.id).he); assert.match(it.he, /[ְ-ׇ]/); assert.ok(it.reason); }
  assert.deepEqual(c1.progress, { done: 0, total: 5 }); assert.equal(c1.complete, false); assert.equal(c1.weakSounds.length, 0);
  assert.match(c1.note, /not verified for Hebrew|has not verified/); assert.equal(c1.href, '#/speak?daily=1');
  const bad = D.buildDailyCard({ date: '2026-11-04', pool: [{ id: 'x', he: 'יְהוָה', set: 's' }, { id: 'y', he: 'שָׁלוֹם', set: 's' }] });
  assert.deepEqual(bad.items.map((i) => i.id), ['y']);
  assert.deepEqual(D.buildDailyCard({ date: 'd', pool: [] }).items, []);
});
test('daily: weighted to weak sounds (shin/sin misses pull shin words in), "try again" for missed items, recent successes pushed down', () => {
  const pool = [
    { id: 'a', he: 'שָׁלוֹם', translit: 'shalom', en: 'peace', set: 's' }, { id: 'b', he: 'מַיִם', translit: 'mayim', en: 'water', set: 's' },
    { id: 'c', he: 'שָׁנָה', translit: 'shana', en: 'year', set: 's' }, { id: 'd', he: 'דֶּלֶת', translit: 'delet', en: 'door', set: 's' },
    { id: 'e', he: 'סֵפֶר', translit: 'sefer', en: 'book', set: 's' }, { id: 'f', he: 'בַּיִת', translit: 'bayit', en: 'house', set: 's' },
    { id: 'g', he: 'שֻׁלְחָן', translit: 'shulchan', en: 'table', set: 's' }, { id: 'h', he: 'גָּדוֹל', translit: 'gadol', en: 'big', set: 's' },
  ];
  const now = new Date(2026, 10, 4, 9).getTime();
  let st = M.emptyState();
  for (let i = 0; i < 4; i++) st = M.recordAttempt(st, { kind: 'pair', set: 'shin-sin', itemId: 'p' + i, he: 'x', contrast: 'shin-sin', correct: false, outcome: 'miss' }, now - 9e9);
  const card = D.buildDailyCard({ date: '2026-11-04', pool, attempts: st.attempts, n: 3 });
  assert.deepEqual(card.items.map((i) => i.id).sort(), ['a', 'c', 'g'], 'the three shin words');
  assert.ok(card.items.every((i) => /shin \/ sin/.test(i.reason)));
  assert.deepEqual(card.weakSounds, ['shin / sin']);
  st = M.recordAttempt(st, { kind: 'say', set: 'speak-x', itemId: 'd', he: 'דלת', mode: 'self', outcome: 'notyet' }, now - 20 * 3600e3);
  st = M.recordAttempt(st, { kind: 'say', set: 'speak-x', itemId: 'a', he: 'שלומ', mode: 'self', outcome: 'said' }, now - 20 * 3600e3);
  const next = D.buildDailyCard({ date: '2026-11-04', pool, attempts: st.attempts, n: 4 });
  const ids = next.items.map((i) => i.id);
  assert.ok(ids.includes('d') && next.items.find((i) => i.id === 'd').reason === 'try again', 'missed item comes back');
  assert.ok(!ids.includes('a'), 'a word said yesterday or today is pushed down');
});
test('daily: the card is stable through the day (today\'s attempts do not reshuffle it)', () => {
  const pool = poolFor('2026-11-04'), base = D.buildDailyCard({ date: '2026-11-04', pool });
  const today = new Date(2026, 10, 4, 10).getTime();
  let st = M.emptyState();
  for (const i of base.items) st = M.recordAttempt(st, { kind: 'say', set: base.id, itemId: i.id, he: i.he, mode: 'asr', outcome: 'miss', heard: 'xyz' }, today);
  assert.deepEqual(D.buildDailyCard({ date: '2026-11-04', pool, attempts: st.attempts }).items.map((i) => i.id), base.items.map((i) => i.id));
});
test('daily: progress counts today\'s attempts on the daily set; complete when all five are done; skips do not count', () => {
  const card = D.buildDailyCard({ date: '2026-11-04', pool: poolFor('2026-11-04') });
  let st = M.emptyState();
  card.items.slice(0, 2).forEach((i) => { st = M.recordAttempt(st, { kind: 'say', set: card.id, itemId: i.id, he: i.he, mode: 'self', outcome: 'said' }, 5); });
  st = M.recordAttempt(st, { kind: 'say', set: card.id, itemId: card.items[2].id, he: card.items[2].he, mode: 'self', outcome: 'skip' }, 6);
  st = M.recordAttempt(st, { kind: 'say', set: 'daily:2026-11-03', itemId: card.items[3].id, he: card.items[3].he, mode: 'self', outcome: 'said' }, 7);
  assert.deepEqual(D.buildDailyCard({ date: '2026-11-04', pool: poolFor('2026-11-04'), attempts: st.attempts }).progress.done, 2);
  card.items.slice(2).forEach((i) => { st = M.recordAttempt(st, { kind: 'say', set: card.id, itemId: i.id, he: i.he, mode: 'self', outcome: 'match' }, 8); });
  const done = D.buildDailyCard({ date: '2026-11-04', pool: poolFor('2026-11-04'), attempts: st.attempts });
  assert.equal(done.complete, true);
});
test('daily: loadDailyCard / loadDailyCardFromStore use speak.v1 and the real data files; bad store values and missing data are tolerated', async () => {
  const now = new Date(2026, 10, 4, 12).getTime();
  const viaFiles = await D.loadDailyCard({ date: '2026-11-04', state: null });
  assert.equal(viaFiles.items.length, 5);
  assert.deepEqual(viaFiles.items.map((i) => i.id), D.buildDailyCard({ date: '2026-11-04', pool: poolFor('2026-11-04') }).items.map((i) => i.id));
  const fromStore = await D.loadDailyCardFromStore({ store: memStore({ 'speak.v1': { attempts: 'junk' } }) }, now);
  assert.equal(fromStore.date, '2026-11-04'); assert.equal(fromStore.items.length, 5);
  assert.equal((await D.loadDailyCardFromStore({}, now)).items.length, 5);
  assert.equal(await D.loadDailyCard({ date: '2026-11-04', state: null, data: { sets: [{ id: 'nope' }], setItems: {} } }), null);
});
test('daily on the Say it screen: "Today\'s five" option, ?daily=1 preselects it, attempts are stored under daily:<date>, progress shown next time', async () => {
  const { root, store } = await boot({ query: { daily: '1' } });
  assert.match(byId(root, 'speak-set').value, /^daily$/);
  assert.ok(root.find((n) => n.tag === 'option' && /Today's five \(0 of 5 done\)/.test(n.text)).length);
  byId(root, 'speak-start').click();
  await waitFor(() => byId(root, 'speak-q'));
  assert.match(root.text, /today's five: 1 of 5/);
  byId(root, 'speak-said').click();
  await waitFor(() => byId(root, 'speak-next'));
  const a = store.m['speak.v1'].attempts[0];
  assert.match(a.set, /^daily:\d{4}-\d{2}-\d{2}$/); assert.equal(store.m['speak.v1'].lastSet, null, 'daily does not replace the remembered set');
  const again = await boot({ store: { 'speak.v1': store.m['speak.v1'] } });
  assert.ok(again.root.find((n) => n.tag === 'option' && /Today's five \(1 of 5 done\)/.test(n.text)).length);
});
test('docs: daily card model is documented for the home owner', () => {
  const readme = readFileSync(join(root, 'docs/speak/README.md'), 'utf8');
  assert.match(readme, /loadDailyCardFromStore/); assert.match(readme, /buildDailyCard/);
});
test('divine name: a recognizer that wrote what it heard (Adonai) still matches the printed name; the name written out matches too', () => {
  const line = 'בָּרְכוּ אֶת יְהוָה הַמְּבֹרָךְ׃';
  for (const heard of ['ברכו את אדוני המבורך', 'ברכו את יהוה המבורך']) {
    const r = M.compareLine(line, heard);
    assert.equal(r.outcome, 'match', heard); assert.equal(r.words[2].word, 'יהוה', 'the stored word is the printed one');
  }
  assert.equal(M.compare('לַיהוָה', 'לאדוני').outcome, 'match', 'prefixed form');
  assert.equal(M.spokenPointed('אֶת יְהוָה'), 'אֶת אֲדֹנָי');
});
