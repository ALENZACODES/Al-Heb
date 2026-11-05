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
