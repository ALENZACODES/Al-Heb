// Phrase batch: schema, exact audio mapping, and the browse screen.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadManifestFull } from '../tools/audio/manifest_io.mjs';
import { genderedForms } from '../src/curriculum/gender.js';
import {
  TRADITIONS, VOICES, SPEEDS, hasPointedHebrew, pickClip, buildPhrases, auditPhrase, cellClip,
  clipSpeed, coverageMarkdown, loadPhraseScreen, playPhraseClip, playbackCall, PLAYBACK_CONTRACT_LANDED, nfc,
} from '../src/phrases/model.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));

const screen = await loadPhraseScreen();
const { phrases } = screen;
const manifest = loadManifestFull();
const byPath = new Map(manifest.map((e) => [e.path, e]));

test('batch is a modest id list: 30 to 80 phrases, no copied Hebrew, known sources only', () => {
  const batch = read('data/phrases/batch1.json');
  assert.equal(batch.schema, 'alef-phrases/1');
  assert.ok(phrases.length >= 30 && phrases.length <= 80, phrases.length);
  assert.equal(phrases.length, batch.entries.length);
  const ids = new Set();
  for (const ref of batch.entries) {
    assert.equal(JSON.stringify(ref).includes('"he"'), false);
    assert.ok(!ids.has(ref.id));
    ids.add(ref.id);
    assert.ok(['phrasebook', 'gender-paradigm'].includes(ref.source), ref.source);
    assert.ok(batch.categories.some((c) => c.id === ref.category), ref.category);
  }
  assert.deepEqual([...new Set(phrases.map((p) => p.category))].sort(), ['directions', 'goodbyes', 'greetings', 'help', 'shopping', 'thanks']);
  assert.ok(phrases.some((p) => p.source.kind === 'gender-paradigm'));
  assert.equal(phrases.some((p) => p.source.kind === 'dialogue'), false);
});

test('every phrase has pointed Hebrew, English, a source review status, and valid tradition and gender slots', () => {
  const book = new Map(read('data/corpus/phrasebook.json').entries.map((e) => [e.id, e]));
  const genderFile = read('data/curriculum/gender-pairs.json');
  for (const phrase of phrases) {
    assert.equal(auditPhrase(phrase).join('; '), '');
    assert.ok(phrase.en.length > 1, phrase.id);
    assert.match(phrase.review, /native-speaker-needed:|draft-needs-native-review/);
    assert.equal(/human-reviewed|native-reviewed|synthetic-reviewed/.test(phrase.review), false, phrase.review);
    if (phrase.source.kind === 'phrasebook') {
      const src = book.get(phrase.source.id);
      assert.equal(phrase.en, src.en.trim());
      assert.equal(phrase.review, src.review);
      const shared = phrase.forms.find((f) => f.key === 'same');
      if (shared) assert.equal(shared.translit, (src.translit || '').trim() || null);
      for (const g of ['m', 'f']) {
        const form = phrase.forms.find((f) => f.key === g);
        if (!form) continue;
        assert.equal(form.he, src.forms[g].he);
        assert.equal(form.translit, (src.forms[g].translit || '').trim() || null);
      }
    } else {
      const par = genderFile.paradigms.find((p) => p.id === phrase.source.id);
      assert.equal(phrase.review, genderFile.status);
      assert.equal(phrase.en, par.en.trim());
      const composed = genderedForms(par);
      assert.equal(phrase.forms.length, composed.length);
      for (const form of phrase.forms) {
        const hit = composed.find((c) => c.speaker === form.speaker && c.addressee === form.addressee);
        assert.equal(form.he, hit.he);
        assert.equal(form.translit, hit.translit);
      }
    }
    for (const form of phrase.forms) {
      assert.equal(hasPointedHebrew(form.he), true, phrase.id);
      for (const tradition of TRADITIONS) for (const voice of VOICES) for (const speed of SPEEDS) {
        const clip = form.audio[tradition][voice][speed];
        if (!clip) continue;
        assert.ok(TRADITIONS.includes(clip.tradition));
        assert.ok(VOICES.includes(clip.voice));
        assert.ok(SPEEDS.includes(clip.speed));
      }
    }
  }
});

test('every mapped clip exists, and matches the catalogue row for that exact text, tradition, and voice', () => {
  let mapped = 0;
  for (const phrase of phrases) for (const form of phrase.forms) {
    for (const tradition of TRADITIONS) for (const voice of VOICES) for (const speed of SPEEDS) {
      const clip = form.audio[tradition][voice][speed];
      if (!clip) continue;
      mapped += 1;
      const row = byPath.get(clip.path);
      assert.ok(row, `catalogue row ${clip.path}`);
      assert.equal(fs.existsSync(path.join(root, clip.path)), true, clip.path);
      assert.equal(nfc(row.text), nfc(form.he), `${phrase.id} ${clip.path}`);
      assert.equal(row.tradition, tradition);
      assert.equal(row.voice, voice);
      assert.equal(clip.tradition, tradition);
      assert.equal(clip.voice, voice);
      assert.equal(clip.status, row.status);
      assert.equal(clip.source, row.source);
      assert.equal(clipSpeed(row), speed);
      assert.equal(row.equivalentTo, undefined, 'mapping must not depend on a stand-in tradition');
      assert.equal(/[֐-׿]/.test(row.text), true);
      assert.notEqual(nfc(row.text), nfc(phrase.en));
      const ownId = phrase.source.kind === 'phrasebook'
        ? (form.key === 'same' ? phrase.source.id : `${phrase.source.id}-${form.key}`)
        : null;
      assert.equal(clip.id, ownId, `${phrase.id} must not use another item's id`);
    }
  }
  assert.ok(mapped > 0, 'the batch should map the phrasebook clips that already exist');
});

test('a mapping that crosses text, tradition, gender, or speed fails the audit', () => {
  const phrase = structuredClone(phrases.find((p) => p.id === 'pb-greetings-03'));
  const slot = phrase.forms[0].audio.israeli.f;
  assert.ok(slot.normal);
  assert.equal(slot.slow, null);
  slot.normal.text = 'שָׁלוֹם';
  assert.match(auditPhrase(phrase).join(' '), /text cross/);
  slot.normal.text = phrase.forms[0].he;
  slot.normal.tradition = 'ashkenazi';
  assert.match(auditPhrase(phrase).join(' '), /tradition cross/);
  slot.normal.tradition = 'israeli';
  slot.normal.voice = 'm';
  assert.match(auditPhrase(phrase).join(' '), /gender cross/);
  slot.normal.voice = 'f';
  slot.slow = { ...slot.normal, speed: 'slow' };
  assert.match(auditPhrase(phrase).join(' '), /speed cross/);
});

test('no slot borrows another tradition, another voice, a near-match, a missing row, or a normal clip as slow', () => {
  const he = 'בֹּקֶר טוֹב';
  const near = 'בֹּקֶר טוב';
  assert.notEqual(nfc(he), nfc(near));
  const rows = [
    { path: 'audio/m/israeli/line/x.mp3', voice: 'm', tradition: 'israeli', kind: 'line', id: 'x', text: he, status: 'tts', source: 'paid-cloud', group: 'phrasebook' },
    { path: 'audio/m/sephardi/line/x.mp3', voice: 'm', tradition: 'sephardi', kind: 'line', id: 'x', text: he, status: 'missing', source: 'none', equivalentTo: ['israeli'] },
    { path: 'audio/m/ashkenazi/line/near.mp3', voice: 'm', tradition: 'ashkenazi', kind: 'line', id: 'near', text: near, status: 'tts', source: 'paid-cloud', group: 'phrasebook' },
    { path: 'audio/f/israeli/line/en.mp3', voice: 'f', tradition: 'israeli', kind: 'line', id: 'en', text: 'good morning', status: 'tts', source: 'paid-cloud', lang: 'en' },
    { path: 'audio/m/israeli/line/ar.mp3', voice: 'm', tradition: 'israeli', kind: 'line', id: 'ar', text: he, status: 'tts', source: 'paid-cloud', lang: 'ar' },
    { path: 'audio/m/israeli/line/x-slow.mp3', voice: 'm', tradition: 'israeli', kind: 'line', id: 'x-slow', text: he, status: 'tts', source: 'paid-cloud', speed: 'slow' },
  ];
  const ask = (tradition, voice, speed, exactId = 'x') => pickClip(he, rows, { tradition, voice, speed, exactId });
  assert.equal(ask('sephardi', 'm', 'normal'), null);
  assert.equal(ask('ashkenazi', 'm', 'normal'), null);
  assert.equal(ask('israeli', 'f', 'normal'), null);
  assert.equal(ask('israeli', 'm', 'normal', 'other-word'), null);
  assert.equal(ask('israeli', 'm', 'normal').id, 'x');
  assert.equal(ask('israeli', 'm', 'slow', 'x-slow').id, 'x-slow');
  assert.equal(ask('israeli', 'm', 'slow', 'x-slow').path.includes('x-slow'), true);
  assert.equal(ask('israeli', 'm', 'slow'), null);
  for (const phrase of phrases) for (const form of phrase.forms) {
    for (const tradition of TRADITIONS) for (const voice of VOICES) {
      const slow = form.audio[tradition][voice].slow;
      const normal = form.audio[tradition][voice].normal;
      if (slow && normal) assert.notEqual(slow.path, normal.path);
      if (slow) assert.equal(slow.speed, 'slow');
    }
  }
  assert.equal(phrases.some((p) => p.forms.some((f) => TRADITIONS.some((t) => VOICES.some((v) => f.audio[t][v].slow)))), false);
});

test('gendered forms keep their own text, and the role-play line has no clip in any cell', () => {
  const how = phrases.find((p) => p.id === 'pb-greetings-11');
  const man = how.forms.find((f) => f.key === 'm');
  const woman = how.forms.find((f) => f.key === 'f');
  assert.notEqual(nfc(man.he), nfc(woman.he));
  for (const tradition of TRADITIONS) for (const voice of VOICES) {
    for (const speed of SPEEDS) {
      const a = man.audio[tradition][voice][speed];
      const b = woman.audio[tradition][voice][speed];
      if (a) assert.equal(nfc(a.text), nfc(man.he));
      if (b) assert.equal(nfc(b.text), nfc(woman.he));
      if (a && b) assert.notEqual(a.path, b.path);
    }
  }
  assert.equal(man.audio.israeli.m.normal.id, 'greetings-11-m');
  assert.equal(woman.audio.israeli.f.normal.id, 'greetings-11-f');
  const role = phrases.find((p) => p.id === 'role-gpar-04');
  assert.equal(role.forms.length, 4);
  for (const form of role.forms) for (const tradition of TRADITIONS) for (const voice of VOICES) for (const speed of SPEEDS) {
    assert.equal(form.audio[tradition][voice][speed], null);
  }
  assert.equal(cellClip(role, 'israeli', 'f', 'normal'), null);
});

test('only the phrase id is mapped; the same spelling under another id is not a substitute', () => {
  const morning = phrases.find((p) => p.id === 'pb-greetings-03');
  const clip = morning.forms[0].audio.israeli.f.normal;
  assert.equal(clip.group, 'phrasebook');
  assert.equal(clip.id, 'greetings-03');
  assert.equal(clip.kind, 'line');
  assert.equal(clip.status, 'tts');
  assert.equal(morning.forms[0].audio.sephardi.f.normal, null);
  assert.equal(morning.forms[0].audio.ashkenazi.m.normal, null);
  const hello = phrases.find((p) => p.id === 'pb-greetings-01');
  assert.equal(hello.forms[0].audio.sephardi.m.normal, null);
  assert.equal(hello.forms[0].audio.ashkenazi.f.normal, null);
  assert.equal(hello.forms[0].audio.israeli.m.normal.id, 'greetings-01');
  assert.equal(hello.forms[0].audio.israeli.m.normal.group, 'phrasebook');
});

test('coverage markdown matches the cells', () => {
  const md = coverageMarkdown(phrases);
  const file = fs.readFileSync(path.join(root, 'data/phrases/COVERAGE.md'), 'utf8');
  assert.equal(file, md);
  assert.match(md, /not every Hebrew phrase/i);
  assert.match(md, /Slow recordings in this batch: \*\*0\*\*/);
  assert.match(md, /No line is marked human-reviewed or native-reviewed/);
  const n = phrases.length;
  for (const tradition of TRADITIONS) for (const voice of VOICES) {
    let normal = 0;
    for (const phrase of phrases) if (cellClip(phrase, tradition, voice, 'normal')) normal += 1;
    assert.match(md, new RegExp(`\\| ${normal} \\| 0 \\| ${n - normal} \\|`));
  }
});

test('playback adapter: exact id, voice, tradition, and rate; no call until the contract lands; substitutes and missing clips stay unavailable', async () => {
  assert.equal(PLAYBACK_CONTRACT_LANDED, false);
  const clip = phrases.find((p) => p.id === 'pb-greetings-03').forms[0].audio.israeli.f.normal;
  const request = { kind: clip.kind, id: clip.id, voice: 'f', tradition: 'israeli', rate: 'normal' };
  assert.deepEqual(playbackCall(request), {
    kind: 'line', id: 'greetings-03', options: { voice: 'f', tradition: 'israeli', rate: 'normal' },
  });
  assert.equal(playbackCall({ ...request, rate: 'slow' }).options.rate, 'slow');
  assert.equal(playbackCall(null), null);

  let calls = 0;
  const current = { audio: { play() { calls += 1; return { source: 'tts-fallback' }; } } };
  const blocked = await playPhraseClip(current, request);
  assert.equal(calls, 0);
  assert.equal(blocked.unavailable, true);
  assert.equal(blocked.reason, 'playback-contract-not-landed');
  assert.deepEqual(blocked.call.options, { voice: 'f', tradition: 'israeli', rate: 'normal' });

  const seen = [];
  const ready = {
    audio: { async play(kind, id, options) { seen.push({ kind, id, options }); return { source: 'file', via: 'exact', voice: options.voice, tradition: options.tradition, ended: true }; } },
  };
  const ok = await playPhraseClip(ready, { ...request, rate: 'slow' }, { contractLanded: true });
  assert.equal(ok.source, 'file');
  assert.deepEqual(seen[0], { kind: 'line', id: 'greetings-03', options: { voice: 'f', tradition: 'israeli', rate: 'slow' } });

  const wrongVoice = { audio: { async play(_k, _id, options) { return { source: 'file', via: 'exact', voice: 'm', tradition: options.tradition }; } } };
  assert.equal((await playPhraseClip(wrongVoice, request, { contractLanded: true })).reason, 'not-exact');

  const wrongTradition = { audio: { async play() { return { source: 'file', via: 'exact', voice: 'f', fileTradition: 'israeli' }; } } };
  const tradition = await playPhraseClip(wrongTradition, { ...request, tradition: 'sephardi' }, { contractLanded: true });
  assert.equal(tradition.reason, 'not-exact');
  assert.equal(tradition.call.options.tradition, 'sephardi');

  const device = { audio: { async play() { return { source: 'tts-fallback' }; } } };
  assert.equal((await playPhraseClip(device, request, { contractLanded: true })).unavailable, true);

  const missing = await playPhraseClip(ready, null, { contractLanded: true });
  assert.equal(missing.reason, 'no-exact-clip');
  assert.equal(seen.length, 1);
});

class N {
  constructor(tag) { this.tag = tag; this.nodeType = 1; this.children = []; this.attrs = {}; this.listeners = {}; this.parent = null; this.className = ''; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return this.attrs[k]; }
  addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }
  append(...c) { for (const x of c) this.#add(x); }
  #add(x) {
    if (x == null || x === false) return;
    const n = typeof x === 'string' || typeof x === 'number' ? { nodeType: 3, data: String(x) } : x;
    if (n && n.nodeType === 1) n.parent = this;
    this.children.push(n);
  }
  replaceChildren(...c) { this.children = []; this.append(...c); }
  set textContent(v) { this.children = [{ nodeType: 3, data: String(v) }]; }
  get textContent() { return this.children.map((c) => (c.nodeType === 3 ? c.data : c.textContent || '')).join(''); }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter((x) => x !== this); }
  focus() {}
  find(pred, out = []) { if (pred(this)) out.push(this); for (const c of this.children) if (c.nodeType === 1 && c.find) c.find(pred, out); return out; }
  click() { for (const f of this.listeners.click || []) f({ target: this }); }
}
globalThis.document = { createElement: (t) => new N(t), createTextNode: (d) => ({ nodeType: 3, data: String(d) }) };

test('phrase list and a phrase page show the pointed line, the meaning, and an honest audio state', async () => {
  const { mount } = await import('../src/phrases/phrases.view.js');
  const root = new N('main');
  const un = mount(root, { query: {}, settings: { get: (k) => (k === 'voice' ? 'f' : 'sephardi') } });
  let list = '';
  for (let i = 0; i < 50 && !list.includes('good morning'); i++) { await new Promise((r) => setTimeout(r, 20)); list = root.textContent; }
  assert.match(list, /Common phrases and sentences/);
  assert.match(list, /not every Hebrew phrase/i);
  assert.match(list, /good morning/);
  assert.match(list, /No audio yet/);
  const greetings = root.find((n) => n.tag === 'button' && n.attrs['data-category'] === 'greetings')[0];
  greetings.click();
  assert.match(root.textContent, /Greetings/);
  assert.equal(root.textContent.includes('how much does it cost'), false);
  un();

  const detail = new N('main');
  const un2 = mount(detail, { params: { id: 'pb-greetings-03' }, query: { tradition: 'israeli', voice: 'f' }, settings: { get: () => undefined } });
  let text = '';
  for (let i = 0; i < 50 && !text.includes('Listen'); i++) { await new Promise((r) => setTimeout(r, 20)); text = detail.textContent; }
  assert.match(text, /good morning/);
  assert.match(text, /בֹּקֶר טוֹב/);
  assert.match(text, /Audio unavailable/);
  assert.match(text, /Slow recording: not available/);
  assert.match(text, /not a recorded teacher/i);
  assert.equal(detail.find((n) => n.attrs && n.attrs['data-clip-id'] === 'greetings-03').length, 1);
  assert.equal(/Ari|Noa|Rimon/.test(text), false);
  detail.find((n) => n.attrs && n.attrs['data-act'] === 'listen')[0].click();
  await new Promise((r) => setTimeout(r, 20));
  assert.match(detail.textContent, /Audio unavailable/);
  const hide = detail.find((n) => n.attrs && n.attrs['data-act'] === 'meaning')[0];
  hide.click();
  assert.equal(detail.textContent.includes('good morning'), false);
  assert.match(detail.textContent, /Meaning hidden/);
  hide.click();
  assert.match(detail.textContent, /good morning/);
  un2();

  const none = new N('main');
  const un3 = mount(none, { params: { id: 'role-gpar-04' }, query: { tradition: 'israeli', voice: 'f' }, settings: { get: () => undefined } });
  let gap = '';
  for (let i = 0; i < 50 && !gap.includes('No audio yet'); i++) { await new Promise((r) => setTimeout(r, 20)); gap = none.textContent; }
  assert.match(gap, /Can I help you/);
  assert.match(gap, /No audio yet/);
  assert.equal(none.find((n) => n.tag === 'button' && n.textContent === 'Listen').length, 0);
  assert.match(gap, /Slow recording: not available/);
  un3();
});
