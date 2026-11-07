import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createAudio, clipPlaybackRate } from '../src/audio/player.js';
import { createShellAudio, playbackLine } from '../src/shell/audio.js';
import { loadManifestFull } from '../tools/audio/manifest_io.mjs';

class El {
  static log = [];
  constructor(url) { this.url = url; this.playbackRate = 1; El.log.push(this); }
  play() { queueMicrotask(() => { this.onplaying?.(); this.onended?.(); }); return Promise.resolve(); }
  pause() { this.paused = true; }
}
function speech(voices) {
  const s = { spoken: [], getVoices: () => voices, speak(u) { s.spoken.push(u); queueMicrotask(() => { u.onstart?.(); u.onend?.(); }); }, cancel() { s.cancelled = true; } };
  return s;
}
const row = (voice, tradition, id, status = 'tts') => ({
  path: `audio/${voice}/${tradition}/letter/${id}.mp3`, voice, tradition, kind: 'letter', id, text: 'אָלֶף', status, source: 'paid-cloud',
});

test('clip rate is only normal or 0.7', () => {
  assert.equal(clipPlaybackRate('normal'), 1);
  assert.equal(clipPlaybackRate('slow'), 0.7);
  assert.equal(clipPlaybackRate(0.7), 0.7);
  assert.equal(clipPlaybackRate(2), 1);
  assert.equal(clipPlaybackRate(undefined), 1);
});

test('an exact woman Sephardi file is the one that plays, not the man Israeli file', async () => {
  El.log = [];
  const manifest = [row('f', 'sephardi', 'alef'), row('m', 'israeli', 'alef')];
  const audio = createAudio({ settings: { voice: 'f', congregation: 'sephardi', clipRate: 'slow' }, manifest, AudioCtor: El, speech: speech([]), UtteranceCtor: class { constructor(t) { this.text = t; } } });
  const events = [];
  const r = await audio.play('letter', 'alef', { onMedia: (e) => events.push(e.type) });
  assert.equal(r.source, 'file');
  assert.equal(r.voice, 'f');
  assert.equal(r.tradition, 'sephardi');
  assert.equal(r.rate, 0.7);
  assert.equal(El.log[0].url, 'audio/f/sephardi/letter/alef.mp3');
  assert.equal(El.log[0].playbackRate, 0.7);
  assert.deepEqual(events, ['playing', 'ended']);
  assert.equal(audio.status('letter', 'alef', { voice: 'm', tradition: 'israeli' }).voice, 'm');
});

test('a missing file and a rejected play do not speak Dutch, and stop interrupts', async () => {
  class Fail extends El { play() { queueMicrotask(() => this.onerror?.()); return Promise.resolve(); } }
  const synth = speech([{ lang: 'nl-NL' }]);
  const audio = createAudio({ settings: { voice: 'm', congregation: 'israeli', clipRate: 'normal' }, manifest: [row('m', 'israeli', 'alef')], AudioCtor: Fail, speech: synth, UtteranceCtor: class { constructor(t) { this.text = t; } } });
  const r = await audio.play('letter', 'alef');
  assert.equal(r.source, 'none');
  assert.equal(r.fileError, 'file-error');
  assert.equal(synth.spoken.length, 0);
  class Hang extends El { play() { this.playing = true; return new Promise(() => {}); } }
  const hung = createAudio({ settings: { voice: 'f', congregation: 'ashkenazi' }, manifest: [row('f', 'ashkenazi', 'alef', 'recorded')], AudioCtor: Hang, speech: speech([]), UtteranceCtor: class {} });
  const pending = hung.play('letter', 'alef');
  await new Promise((res) => setTimeout(res, 0));
  const stopped = hung.stop();
  const done = await pending;
  assert.equal(stopped.interrupted, true);
  assert.equal(done.stopped, true);
});

test('the sound line comes from playing, ended, and stopped, not from the click', () => {
  const plan = { source: 'file', voice: 'f', tradition: 'sephardi', entryStatus: 'tts', entrySource: 'paid-cloud' };
  assert.match(playbackLine({ type: 'playing', rate: 0.7, ...plan }).text, /Playing:.*woman, Sephardi.*0\.7×/);
  assert.equal(playbackLine({ type: 'ended' }).text, 'Sound finished.');
  assert.match(playbackLine({ type: 'error' }).text, /did not load/);
  assert.equal(playbackLine({ type: 'stopped' }).text, 'Sound stopped.');
});

test('shell play reports the media event for an exact man Israeli clip at normal speed', async () => {
  const seen = [];
  const audio = createShellAudio({
    settings: { get: (k) => ({ voice: 'm', congregation: 'israeli', clipRate: 'normal' })[k] },
    manifest: [row('m', 'israeli', 'alef')],
    createAudio: (o) => createAudio({ ...o, AudioCtor: El, speech: speech([{ lang: 'he-IL' }]), UtteranceCtor: class { constructor(t) { this.text = t; } } }),
  });
  audio.subscribe((s) => seen.push(s.text));
  const r = await audio.play('letter', 'alef');
  assert.equal(r.source, 'file');
  assert.equal(r.ended, true);
  assert.match(seen.at(-1), /Sound finished/);
  assert.match(seen.join('\n'), /Playing:.*man, Israeli.*Normal speed/);
});

test('local manifest: exact files that exist are not reported as another tradition', () => {
  const man = loadManifestFull();
  const tally = {};
  for (const e of man) {
    const key = `${e.voice}|${e.tradition}`;
    tally[key] ??= { present: 0, missing: 0, onDisk: 0 };
    if (e.status === 'missing') tally[key].missing += 1;
    else { tally[key].present += 1; if (e.path && existsSync(e.path)) tally[key].onDisk += 1; }
  }
  assert.ok(tally['f|israeli'].onDisk > 0, 'woman Israeli exact files exist locally');
  assert.ok(tally['m|israeli'].onDisk > 0, 'man Israeli exact files exist locally');
  assert.equal(tally['f|sephardi'].onDisk >= 1, true);
  assert.equal(existsSync('audio/m/sephardi/letter/alef.mp3'), false);
  assert.equal(existsSync('audio/f/israeli/letter/alef.mp3'), true);
  assert.equal(existsSync('audio/m/israeli/line/bless-priestly-1.mp3'), true);
  // This is the local tree only. It is not a count of https://alef-review.onrender.com.
  assert.ok(Object.values(tally).some((t) => t.missing > t.present));
});
