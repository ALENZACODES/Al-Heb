import { test } from 'node:test';
import assert from 'node:assert/strict';
import { waitFor } from './helpers/waitfor.js';
import { createAudio, normalizeId, PLAYBACK_TRADITION, playbackTradition } from '../src/audio/player.js';
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

test('another tradition is used when the manifest marks it equivalent; Ashkenazi and Sephardi play the Israeli file by rule', async () => {
  const withEq = [e('f', 'ashkenazi', 'letter', 'bet', 'missing', { equivalentTo: ['israeli'] }), e('f', 'israeli', 'letter', 'bet', 'recorded')];
  let { audio } = make(withEq, { voice: 'f', congregation: 'ashkenazi' });
  let r = await audio.play('letter', 'bet');
  assert.equal(r.source, 'file'); assert.equal(r.fileTradition, 'israeli');
  const noEq = [e('f', 'ashkenazi', 'letter', 'bet'), e('f', 'israeli', 'letter', 'bet', 'recorded')];
  ({ audio } = make(noEq, { voice: 'f', congregation: 'ashkenazi' }));
  r = await audio.play('letter', 'bet');
  assert.equal(r.source, 'file'); assert.equal(r.fileTradition, 'israeli'); assert.equal(r.tradition, 'ashkenazi');
});

test('the Sephardi setting plays the Israeli file of the same voice for every kind, never the retired Sephardi file (owner decision 2026-11-07)', async () => {
  assert.deepEqual(PLAYBACK_TRADITION, { israeli: 'israeli', sephardi: 'israeli', ashkenazi: 'israeli' });
  assert.equal(playbackTradition('sephardi'), 'israeli'); assert.equal(playbackTradition('ashkenazi'), 'israeli'); assert.equal(playbackTradition('x'), 'x');
  const m = [];
  for (const kind of ['letter', 'vowel', 'syllable', 'word', 'line', 'prayer']) m.push(e('f', 'sephardi', kind, 'k1', 'tts'), e('f', 'israeli', kind, 'k1', 'tts'), e('m', 'israeli', kind, 'k1', 'tts'));
  const { audio, speech } = make(m, { voice: 'f', congregation: 'sephardi' });
  for (const kind of ['letter', 'vowel', 'syllable', 'word', 'line', 'prayer']) {
    const r = await audio.play(kind, 'k1');
    assert.equal(r.source, 'file', kind); assert.equal(r.path, `audio/f/israeli/${kind}/k1.mp3`, kind);
    assert.equal(r.voice, 'f'); assert.equal(r.tradition, 'sephardi', 'the result keeps the learner setting'); assert.equal(r.fileTradition, 'israeli'); assert.equal(r.via, 'tradition');
  }
  assert.ok(FakeAudio.log.every((u) => u.includes('/israeli/')), 'no Sephardi file was opened');
  assert.equal(speech.spoken.length, 0);
  // a Sephardi row whose Israeli counterpart is missing is NOT played either; the device voice (Israeli) may speak instead
  const only = make([e('f', 'sephardi', 'word', 'lone', 'tts'), e('f', 'israeli', 'word', 'lone', 'missing')], { voice: 'f', congregation: 'sephardi' });
  const r = only.audio.status('word', 'lone');
  assert.notEqual(r.source, 'file'); assert.notEqual(r.reason, 'tts-pronunciation-mismatch', 'the Sephardi setting plays Israeli by rule, so the Israeli device voice is not a mismatch');
});

test('tradition override per call', async () => {
  const { audio } = make([e('m', 'israeli', 'word', 'x', 'recorded'), e('m', 'ashkenazi', 'word', 'x', 'recorded')], { voice: 'm', congregation: 'israeli' });
  const r = await audio.play('word', 'x', { tradition: 'ashkenazi' });
  assert.equal(r.source, 'file'); assert.equal(r.tradition, 'ashkenazi'); assert.equal(r.fileTradition, 'israeli');
});

test('tts fallback uses he-IL and pointed text for israeli', async () => {
  const { audio, speech } = make([e('m', 'israeli', 'letter', 'bet')], { voice: 'm', congregation: 'israeli' });
  const r = await audio.play('letter', 'bet');
  assert.equal(r.source, 'tts-fallback'); assert.equal(r.mismatch, false);
  assert.deepEqual(speech.spoken, [{ text: 'בֵּית', lang: 'he-IL' }]);
});

test('Ashkenazi plays Israeli sound by rule, so the Israeli device voice is no mismatch', async () => {
  const m = [e('m', 'ashkenazi', 'word', 'x')];
  let { audio } = make(m, { voice: 'm', congregation: 'ashkenazi' });
  let r = await audio.play('word', 'x');
  assert.equal(r.source, 'tts-fallback'); assert.equal(r.mismatch, false);
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
  await waitFor(() => release, { message: "first clip started playing" });
  audio.stop();
  const rs = await p;
  assert.equal(rs.length, 1); assert.ok(speech.cancelled >= 1); void release;
});

test('normalizeId matches the tool-side normalizer', () => {
  for (const s of ['Num 6:24', 'bet-a', 'A_B', ' x/y ']) assert.equal(normalizeId(s), toolNormalize(s));
});

// ---- one id mapping: lesson-word id <-> vocab id (manifest `vocabId`, data/curriculum/word-vocab-map.json)
test('a clip recorded under the lesson-word id r01-w1 resolves for its vocab id (synthetic manifest)', async () => {
  const m = [e('m', 'israeli', 'word', 'r01-w1', 'recorded', { vocabId: 'h842147e5' }), e('m', 'israeli', 'word', 'h842147e5')];
  const { audio, speech } = make(m, { voice: 'm', congregation: 'ashkenazi' });
  assert.equal(audio.has('word', 'h842147e5'), true);
  assert.equal(audio.has('word', 'r01-w1'), true);
  const r = await audio.play('word', 'h842147e5');
  assert.equal(r.source, 'file'); assert.equal(r.viaId, 'r01-w1'); assert.equal(r.id, 'h842147e5');
  assert.deepEqual(FakeAudio.log, ['/app/audio/m/israeli/word/r01-w1.mp3']);
  assert.equal(speech.spoken.length, 0);
});

test('a clip recorded under the vocab id resolves for the lesson-word id, and for a second lesson word with the same vocab id', () => {
  const m = [e('m', 'israeli', 'word', 'r02-w1', 'missing', { vocabId: 'h0eb811da' }), e('m', 'israeli', 'word', 'r04-w1', 'missing', { vocabId: 'h0eb811da' }),
    e('m', 'israeli', 'word', 'h0eb811da', 'recorded')];
  const { audio } = make(m, { voice: 'm', congregation: 'israeli' });
  assert.equal(audio.status('word', 'r02-w1').url, '/app/audio/m/israeli/word/h0eb811da.mp3');
  assert.equal(audio.status('word', 'r04-w1').viaId, 'h0eb811da');
});

test('the exact id wins over a linked id; voice and tradition are never crossed by a link; links added by extend() work', () => {
  const m = [e('m', 'israeli', 'word', 'r01-w1', 'recorded', { vocabId: 'hx' }), e('m', 'israeli', 'word', 'hx', 'recorded'),
    e('f', 'israeli', 'word', 'r01-w1', 'recorded', { vocabId: 'hx' }), e('m', 'ashkenazi', 'word', 'hx')];
  const { audio } = make(m, { voice: 'm', congregation: 'israeli' });
  assert.equal(audio.status('word', 'hx').path, 'audio/m/israeli/word/hx.mp3'); assert.equal(audio.status('word', 'hx').viaId, undefined);
  assert.equal(audio.has('word', 'hx', { tradition: 'ashkenazi' }), true); // Ashkenazi plays the Israeli file (rule); its own row is not used
  assert.equal(audio.status('word', 'hx', { voice: 'f' }).path, 'audio/f/israeli/word/r01-w1.mp3'); // woman's file, not the man's
  const late = make([e('m', 'israeli', 'word', 'hy', 'recorded')], { voice: 'm', congregation: 'israeli' }).audio;
  assert.equal(late.has('word', 'r09-w1'), false);
  late.extend([e('m', 'israeli', 'word', 'r09-w1', 'missing', { vocabId: 'hy' })]);
  assert.equal(late.has('word', 'r09-w1'), true);
});

test('real manifest: every lesson word with a vocab id carries it, and that vocab id has an entry for every voice and tradition it is expected in', async () => {
  const { readFileSync } = await import('node:fs');
  const { loadManifestFull } = await import('../tools/audio/manifest_io.mjs');
  const man = loadManifestFull();
  const map = JSON.parse(readFileSync(new URL('../data/curriculum/word-vocab-map.json', import.meta.url), 'utf8')).map;
  const byKey = new Map(man.map((x) => [`${x.voice}|${x.tradition}|${x.kind}|${x.id}`, x]));
  let n = 0;
  for (const [k, vid] of Object.entries(map)) {
    const [lid, i] = k.split(':'); const w = byKey.get(`m|israeli|word|${normalizeId(`${lid}-w${i}`)}`);
    if (!w) continue; // lesson not in the manifest
    n++; assert.equal(w.vocabId, vid, k);
    for (const v of ['m', 'f']) assert.ok(byKey.has(`${v}|israeli|word|${vid}`), `${v} israeli word/${vid}`);
  }
  assert.equal(n, Object.keys(map).length); assert.ok(n > 500, `checked ${n}`);
  // wiring: pretend r01-w1 was recorded; the vocab id then resolves
  const rec = man.filter((x) => x.kind === 'word' && ['r01-w1', map['r01:1']].includes(x.id)).map((x) => (x.id === 'r01-w1' ? { ...x, status: 'recorded' } : x));
  const { audio } = make(rec, { voice: 'm', congregation: 'israeli' });
  assert.equal(audio.has('word', map['r01:1']), true);
});

test('failed clip file with only a non-Hebrew browser voice: no "browser voice" claim', async () => {
  const m = [e('m', 'israeli', 'letter', 'bet', 'recorded')];
  const { audio, speech } = make(m, { voice: 'm', congregation: 'israeli' }, { speech: fakeSpeech([{ lang: 'en-US' }]) });
  FakeAudio.failUrls.add('/app/audio/m/israeli/letter/bet.mp3');
  const r = await audio.play('letter', 'bet');
  assert.equal(r.source, 'none'); assert.equal(r.reason, 'no-hebrew-browser-voice'); assert.equal(r.fileError, 'file-error');
  assert.equal(speech.spoken.length, 0);
  const ok = make(m, { voice: 'm', congregation: 'israeli' }, { speech: fakeSpeech([{ lang: 'he-IL' }]) });
  FakeAudio.failUrls.add('/app/audio/m/israeli/letter/bet.mp3');
  assert.equal((await ok.audio.play('letter', 'bet')).source, 'tts-fallback');
});

test('TTS fails closed on Latin spellings of the divine name', async () => {
  const { audio, speech } = make(
    [e('m', 'israeli', 'word', 'xname', 'missing', { text: 'Yahweh' })],
    { voice: 'm', congregation: 'israeli' },
  );
  const r = await audio.play('word', 'xname', { text: 'Yahweh' });
  assert.equal(r.source, 'none');
  assert.equal(r.reason, 'unresolved-liturgical-name');
  assert.equal(speech.spoken.length, 0);
});
