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
const { mount, DRAFT, RECOGNIZER_NOTE } = await import('../src/speak/speak.js');
const L = await import('../src/speak/loader.js');
const sets = await L.loadSetsIndex();
const pairs = await L.loadPairs();
const setItems = Object.fromEntries(await Promise.all(sets.map(async (s) => [s.id, await L.loadSet(s.id)])));
const data = { sets, setItems, pairs };

async function boot(extra = {}) {
  const r = new N('div'), store = memStore(extra.store);
  const s = extra.synth || fakeSynth();
  const ctx = { store, clock: { now: () => extra.now || 1_800_000_000_000 }, rng: seeded(), query: extra.query || {}, audio: extra.audio, settings: { get: () => undefined }, t: (k) => k,
    speak: { data, RecognitionCtor: extra.Rec ?? null, MediaRecorderCtor: extra.MR ?? null, getUserMedia: extra.getUserMedia ?? null, URL: extra.URL, BlobCtor: extra.BlobCtor, synth: s.synth, UtteranceCtor: s.U, dayKey: (t) => new Date(t).toISOString().slice(0, 10) } };
  const unmount = mount(r, ctx);
  await waitFor(() => byId(r, extra.query?.tab === 'drills' ? 'drill-start' : extra.query?.tab === 'history' ? 'speak-history-h' : 'speak-start'));
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
  assert.ok(idx.sets.filter((s) => s.pack.startsWith('survival-')).length === 12);
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
  assert.equal(root.find((n) => n.tag === 'option').length, 60);
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
  const { Rec, made } = fakeRecognition([{ alternatives: ['שלום'] }, { alternatives: ['תודה'] }, { error: 'not-allowed' }]);
  const { root, store } = await boot({ Rec, query: { set: 'speak-survival-greetings-1' } });
  const set = setItems['speak-survival-greetings-1'];
  const shalom = set.items.findIndex((i) => M.normalizeHe(i.he) === 'שלומ');
  assert.ok(shalom >= 0, 'greetings set has shalom');
  byId(root, 'speak-start').click();
  await waitFor(() => byId(root, 'speak-mic'));
  for (let i = 0; i < shalom; i++) { byId(root, 'speak-skip').click(); await waitFor(() => byId(root, 'speak-next')); byId(root, 'speak-next').click(); await waitFor(() => byId(root, 'speak-mic') && !byId(root, 'speak-next')); }
  byId(root, 'speak-mic').click();
  assert.match(statusText(root), /Listening/);
  await waitFor(() => byId(root, 'speak-next'));
  assert.equal(made[0].lang, 'he-IL');
  assert.match(byId(root, 'speak-verdict').text, /matched the target/); assert.match(byId(root, 'speak-verdict').text, /unverified for Hebrew/);
  let a = store.m['speak.v1'].attempts.at(-1);
  assert.equal(a.outcome, 'match'); assert.equal(a.mode, 'asr'); assert.equal(a.heard, 'שלום');
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
  byId(root, 'drill-start').click();
  await waitFor(() => byId(root, 'drill-q'));
  const mark = root.find((n) => n.className === 'mark')[0];
  assert.ok(mark); assert.equal(mark.text, '?'); assert.match(root.text, /Hint: /);
  assert.doesNotMatch(root.find((n) => n.attrs.lang === 'he')[0].text, /[ְ-ׇ]/);
  assert.match(root.text, /spelling check, not a listening one/);
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
test('tabs: three section links, current one marked; unmount stops everything without throwing', async () => {
  const { root, unmount } = await boot();
  const links = root.find((n) => n.tag === 'a' && n.attrs['data-tab']);
  assert.deepEqual(links.map((l) => l.attrs.href), ['#/speak', '#/speak?tab=drills', '#/speak?tab=history']);
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
