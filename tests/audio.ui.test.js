import test from 'node:test';
import assert from 'node:assert/strict';
import { describePlay, reasonText } from '../src/curriculum/audio-ui.js';

test('describePlay: a failed play shows human wording, never the raw code', () => {
  assert.equal(describePlay({ ok: false, error: 'speech-error' }), 'No sound: the browser voice reported an error.');
  assert.equal(describePlay({ ok: false, reason: 'no-hebrew-browser-voice' }), 'No sound: your browser has no Hebrew voice installed.');
  assert.doesNotMatch(describePlay({ ok: false, error: 'speech-error' }), /speech-error/);
});
test('describePlay: unknown code passes through, empty result says unavailable', () => {
  assert.equal(describePlay({ ok: false, error: 'weird' }), 'No sound: weird.');
  assert.equal(describePlay({ ok: false }), 'No sound: unavailable.');
  assert.equal(reasonText(undefined), 'unavailable');
});

test('describePlay: a synthetic clip is never described as a recorded file; a human recording still is', () => {
  const syn = describePlay({ source: 'file', entryStatus: 'synthetic-unreviewed', entrySource: 'outside-synthetic', tradition: 'israeli' });
  assert.doesNotMatch(syn, /recorded file/i);
  assert.match(syn, /computer-made/);
  assert.doesNotMatch(syn, /Recorded by a human/);
  assert.equal(describePlay({ source: 'file', entryStatus: 'recorded', tradition: 'israeli' }), 'Playing a recorded file.');
});

test('How this works: the sound paragraph does not deny that synthetic clips exist', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../src/shell/how.view.js', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /no synthetic voice files exist/);
});

test('Offline page: mentions the synthetic clips and does not claim they are saved', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../src/shell/offline.view.js', import.meta.url), 'utf8');
  assert.match(src, /synthetic voice/);
  assert.doesNotMatch(src, /clips are saved for offline/);
});
