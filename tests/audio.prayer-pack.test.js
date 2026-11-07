import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createAudio } from '../src/audio/player.js';

const read = (p) => JSON.parse(readFileSync(new URL('../' + p, import.meta.url), 'utf8'));
const core = read('data/audio/manifest.json');
const shards = ['israeli', 'sephardi', 'ashkenazi'].flatMap((t) => read(`data/audio/manifest-words-${t}.json`));
const all = [...core, ...shards];
const audio = (voice, tradition) => createAudio({ settings: { voice, congregation: tradition }, manifest: all, AudioCtor: class {}, speech: null });

test('wired prayer and vocab clips resolve to their own files and stay synthetic', () => {
  const cases = [
    ['m', 'sephardi', 'prayer', 'vahavta-2', 'audio/m/sephardi/prayer/vahavta-2.mp3'],
    ['f', 'israeli', 'prayer', 'bank80-00ae83908b7d', 'audio/f/israeli/prayer/bank80-00ae83908b7d.mp3'],
    ['f', 'ashkenazi', 'prayer', 'bank80-00ae83908b7d', 'audio/f/ashkenazi/prayer/bank80-00ae83908b7d.mp3'],
    ['m', 'israeli', 'prayer', 'kaddish-1', 'audio/m/israeli/prayer/kaddish-1.mp3'],
    ['f', 'israeli', 'word', 'v7f64097f', 'audio/f/israeli/word/v7f64097f.mp3'],
    ['f', 'ashkenazi', 'word', 'v92945c3e', 'audio/f/ashkenazi/word/v92945c3e.mp3'],
  ];
  for (const [voice, tradition, kind, id, path] of cases) {
    const hit = audio(voice, tradition).status(kind, id);
    assert.equal(hit.source, 'file', path);
    assert.equal(hit.path, path);
    assert.equal(hit.entryStatus, 'synthetic-unreviewed', path);
    assert.equal(existsSync(new URL('../' + path, import.meta.url)), true, path);
  }
  const verse = core.find((e) => e.id === 'bank80-00ae83908b7d' && e.voice === 'f' && e.tradition === 'israeli');
  assert.equal(verse.group, 'prayer-excerpt');
  assert.equal(verse.excerpt, true);
  assert.equal(verse.phonetic, undefined);
  assert.match(verse.english, /valley of the shadow/);
  const held = audio('f', 'ashkenazi').status('prayer', 'kaddish-1');
  assert.notEqual(held.source, 'file');
  assert.equal(existsSync(new URL('../audio/f/ashkenazi/prayer/kaddish-1.mp3', import.meta.url)), false);
  assert.equal(all.filter((e) => e.status === 'recorded').length, 0);
});
