// Brain Lab clip holds: recordings that failed 2 of 3 transcription checks are not played by Brain Lab (data/lab/clip-holds.json).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { hasLabClip, playLabClip } from '../src/lab/lab.holds.js';

const holds = JSON.parse(readFileSync('data/lab/clip-holds.json', 'utf8'));

test('every held path is a real recording that stays in the app for other screens', () => {
  assert.ok(Array.isArray(holds.paths) && holds.paths.length > 0);
  assert.equal(new Set(holds.paths).size, holds.paths.length);
  for (const p of holds.paths) { assert.match(p, /^audio\/[mf]\/israeli\/(syllable|word|line)\/[^/]+\.mp3$/, p); assert.ok(existsSync(p), p); }
});

const fakeCtx = (path) => ({ audio: { status: () => ({ source: 'file', path }), play: async () => ({ source: 'file' }) } });

test('a held file counts as no recording; any other file plays as before', async () => {
  const held = new Set(holds.paths);
  const heldPath = holds.paths[0];
  assert.equal(hasLabClip(fakeCtx(heldPath), held, 'syllable', 'x'), false);
  assert.equal(await playLabClip(fakeCtx(heldPath), held, 'syllable', 'x'), false);
  assert.equal(hasLabClip(fakeCtx('audio/m/israeli/word/ha664d093.mp3'), held, 'word', 'ha664d093'), true);
  assert.equal(await playLabClip(fakeCtx('audio/m/israeli/word/ha664d093.mp3'), held, 'word', 'ha664d093'), true);
  assert.equal(hasLabClip(fakeCtx(heldPath), null, 'syllable', 'x'), true, 'no hold list means nothing is held');
  assert.equal(hasLabClip({ audio: { status: () => ({ source: 'tts-fallback' }) } }, held, 'word', 'x'), false);
});
