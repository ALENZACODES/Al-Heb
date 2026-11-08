import test from 'node:test';
import assert from 'node:assert/strict';
import { chunkText, speakEnglish, stopEnglish } from '../src/shell/speak-english.js';

test('long English is split into short pieces at sentence and clause breaks, nothing lost', () => {
  const t = 'The LORD bless thee, and keep thee: The LORD make his face shine upon thee, and be gracious unto thee: The LORD lift up his countenance upon thee, and give thee peace. ' + 'And they shall put my name upon the children of Israel; and I will bless them.';
  const p = chunkText(t, 60);
  assert.ok(p.length >= 4);
  for (const x of p) assert.ok(x.length <= 61, x);
  assert.equal(p.join(' ').replace(/\s+/g, ' '), t.replace(/\s+/g, ' ').trim());
});

test('pieces are spoken one after another, each starting when the last ends; stop ends it', async () => {
  const spoken = [];
  class U { constructor(t) { this.text = t; } }
  const speech = { getVoices: () => [{ lang: 'en-US', localService: true }], speaking: false, paused: false, cancel() {}, speak(u) { spoken.push(u.text); queueMicrotask(() => u.onend?.()); } };
  const ok = await speakEnglish('One. Two. Three.', { speech, Utterance: U });
  assert.equal(ok, true); assert.deepEqual(spoken, ['One.', 'Two.', 'Three.']);
  const slow = { ...speech, speak(u) { spoken.push(u.text); } };
  const p = speakEnglish('Four. Five.', { speech: slow, Utterance: U }); stopEnglish(slow);
  assert.equal(await p, false);
});
