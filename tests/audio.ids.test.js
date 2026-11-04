// Reconciles manifest ids with what the app actually asks the player for (patterns copied from the view modules; a change there must be mirrored in build_manifest.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createAudio, normalizeId } from '../src/audio/player.js';

const R = (p) => JSON.parse(fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8'));
const manifest = R('data/audio/manifest.json');
const idx = new Map(manifest.map((e) => [`${e.voice}|${e.tradition}|${e.kind}|${e.id}`, e]));
const lessons = R('data/curriculum/lessons.json').lessons;
const registry = R('data/corpus/registry.json').entries;
const phrasebook = R('data/corpus/phrasebook.json').entries;
const mnem = R('data/letters/mnemonics.json').letters;
const letters = R('data/letters/letters.json');
const niqqud = R('data/pronunciation/niqqud.json').records;
const TRADS = ['israeli', 'sephardi', 'ashkenazi'];
const has = (voice, trad, kind, id) => idx.has(`${voice}|${trad}|${kind}|${normalizeId(id)}`);
const israeliOnly = (kind, id) => idx.get(`m|israeli|${kind}|${normalizeId(id)}`)?.scope === 'israeli-only';
/** assert that (kind,id) is playable-by-id for the voices and the traditions the player will look in */
function need(kind, id, why) {
  for (const v of ['m', 'f']) for (const t of (israeliOnly(kind, id) ? ['israeli'] : TRADS)) assert.ok(has(v, t, kind, id), `${why}: missing ${v}/${t}/${kind}/${id}`);
}

test('ids are stable under the player normaliser', () => {
  for (const e of manifest) assert.equal(normalizeId(e.id), e.id, e.id);
});

test('letters: all 27 letters.json ids and the 4 variant forms have a name clip; 26 isolated sounds', () => {
  for (const l of letters) need('letter', l.id, 'trace.view plays letter.id');
  for (const id of ['vet', 'khaf', 'fe', 'sin']) need('letter', id, 'variant form');
  for (const l of letters.slice(0, 22)) need('letter', `${l.id}-sound`, 'isolated sound');
  for (const id of ['vet', 'khaf', 'fe', 'sin']) need('letter', `${id}-sound`, 'variant sound');
});

test('vowels: every niqqud.json id and every id used by a lesson has a vowel clip', () => {
  for (const r of niqqud) need('vowel', r.id, 'niqqud.json');
  for (const l of lessons) for (const v of l.vowels) need('vowel', v, `lesson ${l.id}`);
  for (const l of lessons) for (const id of l.letters) need('letter', id, `lesson ${l.id}`);
});

test('lesson words: kind word, id <lessonId>-w<n> (progress.js wordAudioId), every word of every lesson', () => {
  let n = 0;
  for (const l of lessons) l.words.forEach((w, i) => { need('word', `${l.id}-w${i + 1}`, `lesson ${l.id}`); n++; });
  assert.equal(n, lessons.reduce((a, l) => a + l.words.length, 0));
  assert.ok(n >= 300);
  // text equals the lesson's pointed word
  const l0 = lessons[0]; assert.equal(idx.get(`m|israeli|word|${l0.id}-w1`).text, l0.words[0].he);
});

test('lesson prayer lines: kind line, id <recordId> or <recordId>-l1 (lesson.view.js)', () => {
  const byId = new Map(registry.map((r) => [r.id, r]));
  for (const l of lessons) for (const pid of l.prayerLines) {
    const r = byId.get(pid); assert.ok(r, `lesson ${l.id} cites unknown corpus id ${pid}`);
    need('line', r.lines > 1 ? `${pid}-l1` : pid, `lesson ${l.id}`);
  }
});

test('corpus reader: every line and word id as read.view.js requests them', () => {
  for (const r of registry) {
    const lines = r.he.split('\n'); let wi = 0;
    lines.forEach((line, li) => {
      need('line', lines.length === 1 ? r.id : `${r.id}-l${li + 1}`, 'reader line');
      for (const w of line.split(/\s+/).filter((x) => /[א-ת]/.test(x))) { wi++; need('word', `${r.id}-w${wi}`, 'reader word'); }
    });
  }
});

test('phrasebook: kind by whitespace of the displayed form, id <id> or <id>-m/-f; israeli-only scope', () => {
  for (const p of phrasebook) {
    if (p.gendered) for (const g of ['m', 'f']) {
      const he = p.forms[g].he; const kind = /\s/.test(he) ? 'line' : 'word';
      need(kind, `${p.id}-${g}`, 'phrasebook gendered');
      assert.equal(idx.get(`m|israeli|${kind}|${p.id}-${g}`).text, he);
    } else need(/\s/.test(p.he) ? 'line' : 'word', p.id, 'phrasebook');
  }
  const pbEntries = manifest.filter((e) => e.group === 'phrasebook');
  assert.ok(pbEntries.length >= 2 * 250 - 0 && pbEntries.every((e) => e.tradition === 'israeli' && e.scope === 'israeli-only'));
});

test('mnemonic anchor words: kind word, id anchor-<letterId>, text equals mnemonics.json', () => {
  assert.equal(mnem.length, 27);
  for (const m of mnem) { need('word', `anchor-${m.id}`, 'mnemonics'); assert.equal(idx.get(`m|israeli|word|anchor-${m.id}`).text, m.word); }
});

test('every manifest entry has a group; required groups all populated; no group lacks the israeli-only scope when it should have it', () => {
  const groups = new Set(manifest.map((e) => e.group));
  for (const g of ['letter', 'letter-final', 'letter-variant', 'letter-sound', 'letter-variant-sound', 'niqqud', 'syllable', 'anchor-word', 'lesson-word', 'phrasebook', 'prayer-line', 'prayer-word', 'prayer-whole']) assert.ok(groups.has(g), g);
  assert.ok(manifest.every((e) => typeof e.group === 'string'));
  assert.ok(manifest.filter((e) => e.scope === 'israeli-only').every((e) => ['phrasebook', 'anchor-word', 'lesson-word'].includes(e.group)));
});

test('player + real manifest: phrasebook ignores congregation (plays the israeli file); read-track words still refuse mismatched TTS', async () => {
  const m = manifest.map((e) => (e.path === 'audio/f/israeli/word/anchor-alef.mp3' ? { ...e, status: 'recorded' } : e));
  class A { constructor(u) { this.u = u; } play() { queueMicrotask(() => this.onended?.()); return Promise.resolve(); } pause() {} }
  const speech = { getVoices: () => [], speak(u) { queueMicrotask(() => u.onend?.()); }, cancel() {} };
  const audio = createAudio({ settings: { voice: 'f', congregation: 'ashkenazi' }, manifest: m, AudioCtor: A, speech, UtteranceCtor: class { constructor(t) { this.text = t; } } });
  const p = audio.status('word', 'anchor-alef');
  assert.equal(p.source, 'file'); assert.equal(p.tradition, 'israeli'); assert.equal(p.path, 'audio/f/israeli/word/anchor-alef.mp3');
  const readWord = lessons.find((l) => l.track === 'read').id + '-w1';
  assert.equal(audio.status('word', readWord).reason, 'tts-pronunciation-mismatch');
  // israel-only item with congregation=ashkenazi falls back to israeli TTS (not refused) when no file
  const q = audio.status('word', 'anchor-bet');
  assert.equal(q.source, 'tts-fallback'); assert.equal(q.mismatch, false);
});

test('player alias: one-line prayer record resolves to its line clip only when that file exists', () => {
  const rec = manifest.find((e) => e.kind === 'prayer' && e.aliasOf && e.voice === 'm' && e.tradition === 'israeli');
  assert.ok(rec, 'at least one alias entry');
  const target = rec.aliasOf.split('/');
  const m = manifest.map((e) => (e.voice === 'm' && e.tradition === 'israeli' && e.kind === target[0] && e.id === target[1] ? { ...e, status: 'recorded' } : e));
  const a = createAudio({ settings: { voice: 'm', congregation: 'israeli' }, manifest: m, AudioCtor: function () {}, speech: null });
  const s = a.status('prayer', rec.id);
  assert.equal(s.source, 'file'); assert.equal(s.via, 'alias'); assert.match(s.path, new RegExp(`/${target[0]}/${target[1]}\\.mp3$`));
  const none = createAudio({ settings: { voice: 'm', congregation: 'israeli' }, manifest, AudioCtor: function () {}, speech: null });
  assert.notEqual(none.status('prayer', rec.id).source, 'file');
});
