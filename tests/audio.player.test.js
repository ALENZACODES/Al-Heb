import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAudio, normalizeId } from '../src/audio/player.js';
import { normalizeId as toolNormalize } from '../tools/audio/hebrew_data.mjs';

class FakeAudio {
  static log = []; static failUrls = new Set();
  constructor(url) { this.url = url; FakeAudio.log.push(url); }
  play() { queueMicrotask(() => (FakeAudio.failUrls.has(this.url) ? this.onerror?.() : this.onended?.())); return Promise.resolve(); }
  pause() { this.paused = true; }
}
function fakeSpeech(voices = []) {
  const s = { spoken: [], cancelled: 0, getVoices: () => voices,
    speak(u) { s.spoken.push({ text: u.text, lang: u.lang }); queueMicrotask(() => u.onend?.()); }, cancel() { s.cancelled++; } };
  return s;
}
class FakeUtterance { constructor(t) { this.text = t; } }
const e = (voice, tradition, kind, id, status = 'missing', extra = {}) =>
  ({ path: `audio/${voice}/${tradition}/${kind}/${id}.mp3`, voice, tradition, kind, id, text: 'בֵּית', status, source: 'x', ...extra });
function make(manifest, settings, extra = {}) {
  FakeAudio.log = []; FakeAudio.failUrls = new Set();
  const speech = extra.speech === undefined ? fakeSpeech() : extra.speech;
  const audio = createAudio({ settings, manifest, basePath: '/app/', AudioCtor: FakeAudio, speech, UtteranceCtor: FakeUtterance, wait: async () => {}, ...extra.opts });
  return { audio, speech };
}

test('exact file wins and reports source file', async () => {
  const { audio, speech } = make([e('m', 'israeli', 'letter', 'bet', 'recorded')], { voice: 'm', congregation: 'israeli' });
  const r = await audio.play('letter', 'bet');
  assert.equal(r.source, 'file'); assert.equal(r.via, 'exact');
  assert.deepEqual(FakeAudio.log, ['/app/audio/m/israeli/letter/bet.mp3']);
  assert.equal(speech.spoken.length, 0);
  assert.equal(audio.has('letter', 'bet'), true);
});

test('never swaps man for woman: only female file exists, male requested -> tts-fallback, not the f file', async () => {
  const { audio } = make([e('m', 'israeli', 'letter', 'bet'), e('f', 'israeli', 'letter', 'bet', 'recorded')], { voice: 'm', congregation: 'israeli' });
  const r = await audio.play('letter', 'bet');
  assert.equal(r.source, 'tts-fallback'); assert.equal(r.voiceGuaranteed, false);
  assert.deepEqual(FakeAudio.log, []);
  assert.equal(audio.has('letter', 'bet'), false);
});

test('other tradition is used only when manifest marks it equivalent', async () => {
  const withEq = [e('f', 'sephardi', 'letter', 'bet', 'missing', { equivalentTo: ['israeli'] }), e('f', 'israeli', 'letter', 'bet', 'recorded')];
  let { audio } = make(withEq, { voice: 'f', congregation: 'sephardi' });
  let r = await audio.play('letter', 'bet');
  assert.equal(r.source, 'file'); assert.equal(r.via, 'equivalent'); assert.equal(r.fileTradition, 'israeli');
  const noEq = [e('f', 'sephardi', 'letter', 'bet'), e('f', 'israeli', 'letter', 'bet', 'recorded')];
  ({ audio } = make(noEq, { voice: 'f', congregation: 'sephardi' }));
  r = await audio.play('letter', 'bet');
  assert.notEqual(r.source, 'file');
});

test('tradition override per call', async () => {
  const { audio } = make([e('m', 'israeli', 'word', 'x'), e('m', 'ashkenazi', 'word', 'x', 'recorded')], { voice: 'm', congregation: 'israeli' });
  const r = await audio.play('word', 'x', { tradition: 'ashkenazi' });
  assert.equal(r.source, 'file'); assert.equal(r.tradition, 'ashkenazi');
});

test('tts fallback uses he-IL and pointed text for israeli', async () => {
  const { audio, speech } = make([e('m', 'israeli', 'letter', 'bet')], { voice: 'm', congregation: 'israeli' });
  const r = await audio.play('letter', 'bet');
  assert.equal(r.source, 'tts-fallback'); assert.equal(r.mismatch, false);
  assert.deepEqual(speech.spoken, [{ text: 'בֵּית', lang: 'he-IL' }]);
});

test('no TTS for ashkenazi by default (would be wrong pronunciation); allowed when opted in and flagged', async () => {
  const m = [e('m', 'ashkenazi', 'word', 'x')];
  let { audio } = make(m, { voice: 'm', congregation: 'ashkenazi' });
  let r = await audio.play('word', 'x');
  assert.equal(r.source, 'none'); assert.equal(r.reason, 'tts-pronunciation-mismatch');
  ({ audio } = make(m, { voice: 'm', congregation: 'ashkenazi' }, { opts: { allowMismatchedTts: true } }));
  r = await audio.play('word', 'x');
  assert.equal(r.source, 'tts-fallback'); assert.equal(r.mismatch, true);
});

test('none when no speech synthesis, no Hebrew browser voice, unknown item, or bad voice', async () => {
  const m = [e('m', 'israeli', 'letter', 'bet')];
  let { audio } = make(m, { voice: 'm' }, { speech: null });
  assert.deepEqual([(await audio.play('letter', 'bet')).source, (await audio.play('letter', 'bet')).reason], ['none', 'no-speech-synthesis']);
  ({ audio } = make(m, { voice: 'm' }, { speech: fakeSpeech([{ lang: 'en-US' }]) }));
  assert.equal((await audio.play('letter', 'bet')).reason, 'no-hebrew-browser-voice');
  ({ audio } = make(m, { voice: 'm' }));
  assert.equal((await audio.play('letter', 'nope')).reason, 'unknown-item');
  ({ audio } = make(m, { voice: 'x' }));
  assert.equal((await audio.play('letter', 'bet')).reason, 'invalid-voice');
});

test('hebrew browser voice present -> fallback allowed', async () => {
  const { audio } = make([e('m', 'israeli', 'letter', 'bet')], { voice: 'm' }, { speech: fakeSpeech([{ lang: 'he-IL' }]) });
  assert.equal((await audio.play('letter', 'bet')).source, 'tts-fallback');
});

test('file that fails to load falls back to TTS and reports it', async () => {
  const { audio, speech } = make([e('m', 'israeli', 'letter', 'bet', 'recorded')], { voice: 'm' });
  FakeAudio.failUrls.add('/app/audio/m/israeli/letter/bet.mp3');
  const r = await audio.play('letter', 'bet');
  assert.equal(r.source, 'tts-fallback'); assert.equal(r.fileError, 'file-error');
  assert.equal(speech.spoken.length, 1);
});

test('status() predicts without playing; reads settings live', async () => {
  const settings = { voice: 'm', congregation: 'israeli' };
  const { audio } = make([e('m', 'israeli', 'letter', 'bet', 'recorded'), e('f', 'israeli', 'letter', 'bet')], settings);
  assert.equal(audio.status('letter', 'bet').source, 'file');
  settings.voice = 'f';
  assert.equal(audio.status('letter', 'bet').source, 'tts-fallback');
  assert.deepEqual(FakeAudio.log, []);
});

test('playSequence plays in order, waits gapMs between items, accepts tuples', async () => {
  const waits = [];
  const m = ['a', 'b', 'c'].map((id) => e('m', 'israeli', 'syllable', id, 'recorded'));
  FakeAudio.log = [];
  const audio = createAudio({ settings: { voice: 'm' }, manifest: m, AudioCtor: FakeAudio, speech: fakeSpeech(), UtteranceCtor: FakeUtterance, wait: async (ms) => waits.push(ms) });
  const rs = await audio.playSequence([['syllable', 'a'], { kind: 'syllable', id: 'b' }, ['syllable', 'c']], { gapMs: 400 });
  assert.deepEqual(rs.map((r) => r.source), ['file', 'file', 'file']);
  assert.deepEqual(FakeAudio.log.map((u) => u.split('/').pop()), ['a.mp3', 'b.mp3', 'c.mp3']);
  assert.deepEqual(waits, [400, 400]);
});

test('stop() cancels a running sequence and speech', async () => {
  let release;
  class SlowAudio extends FakeAudio { play() { return new Promise((r) => { release = r; }); } }
  const m = ['a', 'b'].map((id) => e('m', 'israeli', 'syllable', id, 'recorded'));
  const speech = fakeSpeech();
  const audio = createAudio({ settings: { voice: 'm' }, manifest: m, AudioCtor: SlowAudio, speech, UtteranceCtor: FakeUtterance, wait: async () => {} });
  const p = audio.playSequence([['syllable', 'a'], ['syllable', 'b']]);
  await new Promise((r) => setTimeout(r, 5));
  audio.stop();
  const rs = await p;
  assert.equal(rs.length, 1); assert.ok(speech.cancelled >= 1); void release;
});

test('normalizeId matches the tool-side normalizer', () => {
  for (const s of ['Num 6:24', 'bet-a', 'A_B', ' x/y ']) assert.equal(normalizeId(s), toolNormalize(s));
});
