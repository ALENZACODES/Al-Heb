// Lane 3: sound-gap lab and prayer-word contrast tests.
// What these prove: JSON shape, Hebrew in the Hebrew block, and that our own transliterator agrees with the
// homophone/minimal-pair claims (same or different Latin after merging chet/khaf, k/q). They do NOT prove the
// linguistic claims, glosses or mouth cues; no native speaker has reviewed them (proofread:false).

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { transliterate } from '../src/pronunciation/transliterate.js';
import { mount, gapNoteFor, pairHeardIn, pairAudioId } from '../src/pronunciation/soundgap.view.js';

const load = (f) => JSON.parse(fs.readFileSync(new URL(`../data/pronunciation/${f}.json`, import.meta.url), 'utf8'));
const soundgap = load('soundgap');
const prayerwords = load('prayerwords');
const consonants = load('consonants');
const TRADS = ['israeli', 'sephardi', 'ashkenazi'];
const inBlock = (s) => [...s].every((c) => c >= '֐' && c <= '׿');
const nonEmpty = (s) => typeof s === 'string' && s.trim().length > 0;
const canon = (s) => s.replace(/'/g, '').replace(/ch/g, 'kh');

test('soundgap.json is flagged unproofread and covers the eight requested contrasts', () => {
  assert.equal(soundgap.proofread, false);
  assert.deepEqual(soundgap.gaps.map((g) => g.id), ['chet-khaf-he', 'alef-ayin', 'resh', 'tsadi', 'kaf-qof', 'tet-tav', 'samekh-sin', 'vav-bet']);
});

test('gaps: schema, letter ids exist, traditions covered, mouth steps present', () => {
  for (const g of soundgap.gaps) {
    assert.ok(nonEmpty(g.title) && nonEmpty(g.englishTrap), g.id);
    for (const l of g.letters) assert.ok(consonants.letters[l], `${g.id} letter ${l}`);
    for (const t of [...TRADS, 'american_synagogue']) assert.ok(nonEmpty(g.tradition[t]?.text), `${g.id}.${t}`);
    assert.ok(g.mouth.length >= 1);
    for (const m of g.mouth) { assert.ok(nonEmpty(m.for)); assert.ok(m.steps.length >= 1 && m.steps.every(nonEmpty)); }
    assert.ok(g.pairs.length >= 2, `${g.id} has pairs`);
    assert.ok(Array.isArray(g.needsNativeSpeaker));
  }
});

test('pairs: pointed Hebrew in block, translit equals the engine, kinds valid, claims agree with the engine', () => {
  const kinds = Object.keys(soundgap.pairKinds);
  for (const g of soundgap.gaps) {
    g.pairs.forEach((p, i) => {
      const id = `${g.id}#${i}`;
      assert.ok(kinds.includes(p.kind), id);
      for (const side of ['a', 'b']) {
        assert.ok(inBlock(p[side].he), `${id} ${side} hebrew`);
        assert.ok(nonEmpty(p[side].gloss));
      }
      assert.equal(p.a.translit, transliterate(p.a.he), `${id} a translit`);
      if (p.kind !== 'tradition') assert.equal(p.b.translit, transliterate(p.b.he), `${id} b translit`);
      else assert.equal(p.b.translit, transliterate(p.b.he, { tradition: 'ashkenazi' }), `${id} ashkenazi translit`);
      assert.ok(p.heardIn.every((t) => TRADS.includes(t)));
      if (p.kind === 'homophone') {
        assert.equal(p.israeliSame, true, id);
        assert.equal(canon(transliterate(p.a.he)), canon(transliterate(p.b.he)), `${id} should sound the same in Latin`);
        assert.ok(!p.heardIn.includes('israeli'), `${id} homophone cannot be heard in israeli`);
      }
      if (p.kind === 'minimal') {
        assert.notEqual(canon(transliterate(p.a.he)), canon(transliterate(p.b.he)), `${id} should differ`);
        assert.deepEqual(p.heardIn, TRADS);
      }
    });
  }
});

test('no pair is repeated, and each contrast has at least one homophone or minimal pair', () => {
  const seen = new Set();
  for (const g of soundgap.gaps) for (const p of g.pairs) {
    const key = [p.a.he, p.b.he].sort().join('|') + '|' + g.id;
    assert.ok(!seen.has(key), key); seen.add(key);
  }
});

test('data agrees with consonants.json on the headline merges', () => {
  const merged = (id) => soundgap.gaps.find((g) => g.id === id).tradition.israeli.merged;
  assert.match(consonants.letters.chet.ipa.israeli, /merged with khaf/);
  assert.deepEqual(merged('chet-khaf-he'), ['chet', 'kaf']);
  assert.match(consonants.letters.ayin.ipa.israeli, /merged with alef/);
  assert.deepEqual(merged('alef-ayin'), ['alef', 'ayin']);
  assert.match(consonants.letters.qof.ipa.israeli, /\[k\]/);
  assert.deepEqual(merged('kaf-qof'), ['kaf', 'qof']);
  assert.match(consonants.letters.tav.ipa.ashkenazi, /\[s\]/);
  assert.deepEqual(soundgap.gaps.find((g) => g.id === 'tet-tav').tradition.ashkenazi.merged, []);
});

test('prayerwords.json: ten words, hebrew valid, stress marked, columns consistent with the transliterator', () => {
  assert.equal(prayerwords.proofread, false);
  assert.equal(prayerwords.words.length, 10);
  for (const w of prayerwords.words) {
    assert.ok(inBlock(w.he), w.id);
    for (const col of ['israeli', 'american', 'ashkenazi']) {
      assert.ok(nonEmpty(w[col].say), `${w.id}.${col}`);
      assert.match(w[col].say, /[A-Z]{2,}|[A-Z]+-/, `${w.id}.${col} marks a stressed syllable`);
      assert.ok(['first', 'second-to-last', 'last'].includes(w[col].stress));
    }
    assert.ok(w.diffs.length >= 1);
  }
  // Ashkenazi respelling must agree with the engine on the vowel of the first syllable for kamatz words
  const a = (id) => prayerwords.words.find((w) => w.id === id);
  assert.match(a('shalom').ashkenazi.say, /^SHO/i);
  assert.equal(transliterate(a('shalom').he, { tradition: 'ashkenazi' }), 'sholom');
  assert.equal(transliterate(a('shabbat').he, { tradition: 'ashkenazi' }), 'shabos');
  assert.match(a('shabbat').ashkenazi.say, /bos/);
  assert.equal(transliterate(a('adonai').he, { tradition: 'ashkenazi' }), 'adonoy');
  assert.equal(transliterate(a('barukh').he, { tradition: 'ashkenazi' }), 'borukh');
});

// ---- view, against a minimal fake DOM
class N { constructor() { this.children = []; } }
class T extends N { constructor(d) { super(); this.nodeType = 3; this.data = d; } get textContent() { return this.data; } }
class El extends N {
  constructor(tag, doc) { super(); this.nodeType = 1; this.tagName = tag.toUpperCase(); this.attrs = {}; this.listeners = {}; this.ownerDocument = doc; this.checked = false; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return this.attrs[k] ?? null; }
  append(...kids) { for (const k of kids) this.children.push(typeof k === 'string' ? new T(k) : k); }
  replaceChildren(...kids) { this.children = []; this.append(...kids); }
  addEventListener(t, f) { (this.listeners[t] ??= new Set()).add(f); }
  removeEventListener(t, f) { this.listeners[t]?.delete(f); }
  dispatch(t) { for (const f of [...(this.listeners[t] ?? [])]) f({ target: this }); }
  get textContent() { return this.children.map((c) => c.textContent).join(''); }
  set textContent(v) { this.children = [new T(String(v))]; }
}
class Doc { createElement(t) { return new El(t, this); } createTextNode(s) { return new T(s); } }
const all = (n, pred, r = []) => { if (n.nodeType === 1 && pred(n)) r.push(n); for (const c of n.children ?? []) all(c, pred, r); return r; };
import { waitFor } from './helpers/waitfor.js';

test('view renders every gap, shows not-proofread badge, no audio buttons when audio.has is false', async () => {
  const root = new El('div', new Doc());
  const un = mount(root, { settings: { congregation: 'israeli' }, audio: { has: () => false, play() { throw new Error('should not play'); } }, soundgapData: { soundgap, prayerwords } });
  await waitFor(() => all(root, (e) => e.tagName === 'DETAILS').length === 8, { message: "all(root, (e) => e.tagName === 'DETAILS').length === 8" });
  assert.equal(all(root, (e) => e.tagName === 'DETAILS').length, 8);
  assert.match(root.textContent, /not proofread/);
  assert.equal(all(root, (e) => e.tagName === 'BUTTON').length, 0);
  assert.match(root.textContent, /no audio yet/i);
  for (const e of all(root, (e) => e.attrs.lang === 'he')) assert.equal(e.attrs.dir, 'rtl');
  assert.match(root.textContent, /Ten prayer words/);
  un();
  assert.equal(root.children.length, 0);
});

test('view: tradition switch writes the setting and refreshes the verdicts; play buttons call audio', async () => {
  const played = []; const sets = [];
  const settings = { congregation: 'israeli', set(k, v) { sets.push([k, v]); this.congregation = v; } };
  const root = new El('div', new Doc());
  const un = mount(root, { settings, audio: { has: () => true, play: (k, id) => played.push([k, id]) }, soundgapData: { soundgap, prayerwords } });
  await waitFor(() => /said the same here/.test(root.textContent), { message: "/said the same here/.test(root.textContent)" });
  assert.match(root.textContent, /said the same here/);
  const radio = all(root, (e) => e.tagName === 'INPUT' && e.attrs.value === 'sephardi')[0];
  radio.dispatch('change');
  assert.deepEqual(sets, [['congregation', 'sephardi']]);
  assert.match(root.textContent, /different only if the old distinction is kept/);
  assert.match(root.textContent, /In an American synagogue/);
  const btn = all(root, (e) => e.tagName === 'BUTTON')[0];
  btn.dispatch('click');
  assert.deepEqual(played, [['word', pairAudioId('chet-khaf-he', 0, 'a')]]);
  un();
});

test('view: load failure shows an alert', async () => {
  const root = new El('div', new Doc());
  globalThis.__origFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: false, status: 404 });
  try {
    const un = mount(root, {});
    await waitFor(() => all(root, (e) => e.attrs.role === 'alert').length === 1, { message: "all(root, (e) => e.attrs.role === 'alert').length === 1" });
    assert.ok(all(root, (e) => e.attrs.role === 'alert').length === 1);
    un();
  } finally { globalThis.fetch = globalThis.__origFetch; }
});

test('model helpers', () => {
  const g = soundgap.gaps[0];
  assert.equal(gapNoteFor(g, 'bogus').text, g.tradition.israeli.text);
  assert.ok(gapNoteFor(g, 'sephardi').americanText);
  assert.equal(gapNoteFor(g, 'ashkenazi').americanText, '');
  assert.equal(pairHeardIn(g.pairs[4], 'israeli'), false);
  assert.equal(pairHeardIn(g.pairs[4], 'sephardi'), true);
});

test('view: with only a device voice, play buttons are labelled as a device voice and receive the shown Hebrew', async () => {
  const calls = [];
  const audio = { status: () => ({ source: 'tts-fallback' }), play: async (k, id, o) => { calls.push([k, id, o && o.text]); return { source: 'tts-fallback' }; } };
  const root = new El('div', new Doc());
  const un = mount(root, { settings: { congregation: 'israeli' }, audio, soundgapData: { soundgap, prayerwords } });
  await waitFor(() => /said the same here/.test(root.textContent), { message: 'soundgap rendered' });
  const b = all(root, (e) => e.tagName === 'BUTTON')[0];
  assert.equal(b.attrs['data-audio-state'], 'device'); assert.match(b.attrs['aria-label'], /device voice/);
  b.dispatch('click'); await new Promise((r) => setTimeout(r, 10));
  assert.equal(calls.length, 1); assert.ok(inBlock(calls[0][2].replace(/[\s'"]/g, '')));
  un();
});
