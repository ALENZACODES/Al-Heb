import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createAudio } from '../src/audio/player.js';

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
    if (e.status === 'missing' && hasIsraeli) { assert.deepEqual(e.equivalentTo, ['israeli'], e.path); standIns += 1; }
    else assert.equal(e.equivalentTo, undefined, e.path);
  }
  assert.ok(standIns >= 500, `stand-ins: ${standIns}`);
  const missingWords = words.filter((e) => e.status === 'missing');
  assert.ok(missingWords.length > 2000);
  assert.ok(missingWords.filter((e) => e.equivalentTo?.[0] === 'israeli').length > 1400);
  for (const e of words.filter((e) => e.status !== 'missing')) assert.equal(e.equivalentTo, undefined, e.path);
});

test('player: with the Sephardi setting, shin, bet and oseh-shalom play the Israeli file and the result names that tradition', () => {
  class El { constructor(url) { this.url = url; } play() { return Promise.resolve(); } pause() {} }
  const rows = man.filter((e) => (e.kind === 'letter' && ['shin', 'bet'].includes(e.id)) || (e.kind === 'prayer' && e.id === 'oseh-shalom'));
  for (const voice of ['m', 'f']) {
    const audio = createAudio({ settings: { voice, congregation: 'sephardi' }, manifest: rows, AudioCtor: El, speech: null, UtteranceCtor: null });
    for (const [kind, id] of [['letter', 'shin'], ['letter', 'bet'], ['prayer', 'oseh-shalom']]) {
      const r = audio.status(kind, id);
      assert.equal(r.source, 'file', `${voice} ${kind} ${id}`);
      assert.equal(r.fileTradition, 'israeli');
      assert.equal(r.path, `audio/${voice}/israeli/${kind}/${id}.mp3`);
      assert.ok(existsSync(r.path), r.path);
    }
  }
});
