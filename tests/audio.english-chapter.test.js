import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAudio } from '../src/audio/player.js';
const kind = 'torah-chapter-en', id = 'torah-en-genesis-1';
const row = (voice, extra = {}) => ({ kind, id, voice, tradition: 'english', status: 'tts', source: 'paid-cloud', provider: 'google', text: 'In the beginning', path: `audio/${voice}/english/${kind}/${id}.mp3`, ...extra });

test('chapter speed changes live without restarting or changing pitch', async () => {
  let media, starts = 0;
  const events = [];
  class Audio { constructor() { media = this; this.currentTime = 15; } play() { starts++; this.onplaying(); } pause() {} }
  const audio = createAudio({ settings: { voice: 'm' }, manifest: [row('m')], AudioCtor: Audio });
  const playing = audio.play(kind, id, { tradition: 'english', rate: 0.75, onMedia: e => events.push(e) });
  assert.equal(media.playbackRate, 0.75);
  assert.equal(audio.setPlaybackRate(1.25), 1.25);
  assert.equal(media.playbackRate, 1.25);
  assert.equal(media.currentTime, 15); assert.equal(starts, 1); assert.equal(media.preservesPitch, true);
  assert.equal(events.at(-1).rate, 1.25);
  assert.equal(audio.setPlaybackRate(9), 1.5);
  audio.stop(); await playing;
  assert.equal(audio.setPlaybackRate(1), null);
});
function player(manifest, voice, fail = false) {
  const played = [], spoken = [];
  class Audio { constructor(url) { played.push(url); } play() { queueMicrotask(() => fail ? this.onerror() : this.onended()); } pause() {} }
  const audio = createAudio({ settings: { voice, congregation: 'ashkenazi' }, manifest, AudioCtor: Audio,
    speech: { getVoices: () => [{ lang: 'he-IL' }], speak(u) { spoken.push(u); u.onend(); } },
    UtteranceCtor: class { constructor(text) { this.text = text; } }, allowMismatchedTts: true });
  return { audio, played, spoken };
}
for (const voice of ['m', 'f']) {
  test(`English chapter uses exact ${voice} recording through real player`, async () => {
    const { audio, played, spoken } = player([row('m'), row('f')], voice);
    assert.equal(audio.has(kind, id, { tradition: 'english' }), true);
    const r = await audio.play(kind, id, { tradition: 'english' });
    assert.equal(r.source, 'file'); assert.equal(r.ended, true); assert.equal(r.tradition, 'english');
    assert.deepEqual(played, [row(voice).path]); assert.deepEqual(spoken, []);
  });
  test(`missing English ${voice} never swaps voice, equivalent Hebrew, or browser language`, async () => {
    const rows = [row(voice, { status: 'missing', equivalentTo: ['israeli'] }), row(voice === 'm' ? 'f' : 'm'), row(voice, { tradition: 'israeli', scope: 'israeli-only' })];
    const { audio, played, spoken } = player(rows, voice);
    const r = await audio.play(kind, id, { tradition: 'english', text: 'English text', allowMismatchedTts: true });
    assert.equal(r.source, 'none'); assert.equal(r.reason, 'english-recording-unavailable');
    assert.equal(audio.has(kind, id, { tradition: 'english' }), false);
    assert.deepEqual(played, []); assert.deepEqual(spoken, []);
  });
  test(`failed English ${voice} file never falls back to Hebrew browser speech`, async () => {
    const { audio, played, spoken } = player([row(voice), row(voice, { tradition: 'israeli', scope: 'israeli-only' })], voice, true);
    const r = await audio.play(kind, id, { tradition: 'english', allowMismatchedTts: true });
    assert.equal(r.source, 'none'); assert.equal(r.fileError, 'file-error');
    assert.equal(r.reason, 'english-recording-unavailable'); assert.equal(r.tradition, 'english');
    assert.deepEqual(played, [row(voice).path]); assert.deepEqual(spoken, []);
  });
}
test('English tradition stays invalid for ordinary Hebrew items', () => {
  const { audio } = player([], 'm');
  assert.equal(audio.status('word', 'x', { tradition: 'english' }).reason, 'invalid-tradition');
});

test('English synthetic labels never claim Israeli Hebrew or respelling', async () => {
  const { fileLabel, traditionCaption } = await import('../src/shell/audio-labels.js');
  for (const status of ['tts', 'synthetic-unreviewed', 'synthetic-reviewed']) {
    const label = fileLabel(status, 'english', 'paid-cloud');
    assert.match(label, /Synthetic English voice/); assert.doesNotMatch(label, /Israeli|Hebrew|respelling/);
  }
  assert.equal(traditionCaption('english'), 'English');
});
