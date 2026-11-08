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

test('app-wide rule: a long utterance is spoken as pieces with the same language and voice; onend fires once, at the end', async () => {
  const { installSpeechChunker, MAX } = await import('../src/shell/speech-chunker.js');
  const native = [];
  class U { constructor(t) { this.text = t; } }
  const speech = { speak(u) { native.push(u); } };
  assert.equal(installSpeechChunker(speech, U), true);
  let ended = 0;
  const long = new U('בְּרֵאשִׁית בָּרָא אֱלֹהִים, '.repeat(12)); long.lang = 'he-IL'; long.rate = 0.8; long.onend = () => { ended += 1; };
  speech.speak(long);
  assert.ok(native.length >= 2, 'split');
  for (const p of native) { assert.ok(p.text.length <= MAX + 1); assert.equal(p.lang, 'he-IL'); assert.equal(p.rate, 0.8); }
  native.slice(0, -1).forEach((p) => p.onend?.()); assert.equal(ended, 0);
  native.at(-1).onend(); assert.equal(ended, 1);
  const short = new U('Shalom.'); speech.speak(short); assert.equal(native.at(-1), short, 'short text is untouched');
});
