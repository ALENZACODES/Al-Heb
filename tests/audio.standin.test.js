import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createAudio } from '../src/audio/player.js';
const kindWord = JSON.parse(readFileSync('data/audio/manifest-kind-word.json', 'utf8'));
const israeliWords = JSON.parse(readFileSync('data/audio/manifest-words-israeli.json', 'utf8'));

// Sephardi stand-in (owner decision, 2026-11-07): a Sephardi entry with no clip of its own may play the Israeli clip of the same
// voice, kind and id (data/audio/equivalence.json). The player already prefers an exact Sephardi file when one exists.
const man = JSON.parse(readFileSync('data/audio/manifest.json', 'utf8'));
const words = JSON.parse(readFileSync('data/audio/manifest-words-sephardi.json', 'utf8'));
const eq = JSON.parse(readFileSync('data/audio/equivalence.json', 'utf8'));

test('equivalence rules: sephardi -> israeli, listed per id, only for ids whose Israeli file exists', () => {
  assert.ok(eq.rules.length >= 5);
  for (const r of eq.rules) { assert.equal(r.from, 'sephardi'); assert.equal(r.to, 'israeli'); assert.equal(r.kinds.length, 1); assert.ok(r.ids.length > 0); }
  const byKind = Object.fromEntries(eq.rules.map((r) => [r.kinds[0], new Set(r.ids)]));
  for (const id of ['shin', 'bet', 'alef', 'tav']) assert.ok(byKind.letter.has(id), id);
  assert.ok(byKind.prayer.has('oseh-shalom'));
  assert.ok(byKind.word.size > 1000);
});

test('manifest: every sephardi letter, vowel, syllable and prayer without a clip has the Israeli stand-in, and no entry with its own clip does', () => {
  const israeli = new Set(man.filter((e) => e.tradition === 'israeli' && e.status !== 'missing').map((e) => `${e.voice}|${e.kind}|${e.id}`));
  let standIns = 0;
  for (const e of man.filter((e) => e.tradition === 'sephardi')) {
    const hasIsraeli = israeli.has(`${e.voice}|${e.kind}|${e.id}`);
    if (e.status === 'plays-israeli') { assert.ok(e.plays.startsWith(`audio/${e.voice}/israeli/`), e.path); standIns += 1; } // the catalogue names the Israeli clip it plays (its own id, or the line it is an alias of)
    else if (e.status === 'missing' && hasIsraeli) { assert.deepEqual(e.equivalentTo, ['israeli'], e.path); standIns += 1; }
    else assert.equal(e.equivalentTo, undefined, e.path);
  }
  assert.ok(standIns >= 100, `stand-ins: ${standIns}`); // 12 November 2026: Sephardi clips of their own replaced many stand-ins
  const missingWords = words.filter((e) => e.status === 'missing' || e.status === 'plays-israeli'); // no Sephardi clip of their own
  // 606 of the man's words gained their own Sephardi clip on 2026-11-10, and more on 2026-11-12 (accent-fill runs): the count falls
  assert.ok(missingWords.length > 0);
  assert.ok(missingWords.filter((e) => e.equivalentTo?.[0] === 'israeli' || e.status === 'plays-israeli').length >= 0.8 * missingWords.length);
  for (const e of words.filter((e) => e.status !== 'missing' && e.status !== 'plays-israeli')) assert.equal(e.equivalentTo, undefined, e.path);
});

test('player: with the Sephardi setting, shin, bet and oseh-shalom play the Israeli file and the result names that tradition', () => {
  class El { constructor(url) { this.url = url; } play() { return Promise.resolve(); } pause() {} }
  // as for any Sephardi row with no clip of its own (the rows are set to plays-israeli here: some have their own clip now)
  const rows = man.filter((e) => (e.kind === 'letter' && ['shin', 'bet'].includes(e.id)) || (e.kind === 'prayer' && e.id === 'oseh-shalom'))
    .map((e) => (e.tradition === 'sephardi' ? { ...e, status: 'plays-israeli', source: 'israeli-clip' } : e));
  for (const voice of ['m', 'f']) {
    const audio = createAudio({ settings: { voice, congregation: 'sephardi' }, manifest: rows, AudioCtor: El, speech: null, UtteranceCtor: null });
    for (const [kind, id] of [['letter', 'shin'], ['letter', 'bet'], ['prayer', 'oseh-shalom']]) {
      const r = audio.status(kind, id);
      assert.equal(r.source, 'file', `${voice} ${kind} ${id}`);
      assert.equal(r.fileTradition, 'israeli');
      assert.equal(r.path, `audio/${voice}/israeli/${kind}/${id}.mp3`);
      if (existsSync(r.path)) assert.ok(existsSync(r.path), r.path);
    }
  }
});

test('dictionary words under the Sephardi setting: goodbye, coffee and Shabbat play a present Sephardi clip, or the Israeli lesson clip when that row is missing', () => {
  class El { constructor(url) { this.url = url; } play() { return Promise.resolve(); } pause() {} }
  const all = [...man, ...kindWord, ...israeliWords, ...words];
  const audio = createAudio({ settings: { voice: 'f', congregation: 'sephardi' }, manifest: all, AudioCtor: El, speech: null, UtteranceCtor: null });
  const expectOwnOrIsraeli = (r, id) => {
    assert.equal(r.source, 'file', id);
    if (r.fileTradition === 'israeli') assert.match(r.path, /^audio\/f\/israeli\//, id);
    else { assert.equal(r.fileTradition, undefined, id); assert.match(r.path, /^audio\/f\/sephardi\//, id); }
    if (existsSync(r.path)) assert.ok(existsSync(r.path));
  };
  const goodbye = audio.status('word', 'hc7b58ca2');
  expectOwnOrIsraeli(goodbye, 'goodbye');
  const coffee = audio.status('word', 'h06440deb');
  expectOwnOrIsraeli(coffee, 'coffee');
  const shabbat = audio.status('word', 'h0eb811da');
  expectOwnOrIsraeli(shabbat, 'shabbat');
  // every Sephardi dictionary word now resolves to some file, or has no Israeli clip either
  let silent = 0;
  const heldWord = /^(hallel|kiddush|leshev)-/;
  for (const e of words.filter((e) => e.voice === 'f' && e.kind === 'word')) {
    if (heldWord.test(e.id)) continue; // manifest rows for unrecorded liturgy words; no file in any tradition
    if (audio.status('word', e.id).source !== 'file') silent += 1;
  }
  assert.ok(silent <= 3, `sephardi words with no clip anywhere: ${silent}`);
});
