// Songs page and celebration sting: words match the music manifest, the player pauses for speech,
// the sting only plays for a learner with music on and never with speech, prayer or cantorial audio.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ORIGINAL_SONG_TRACKS } from '../src/listen/catalog.js';
import { createShelfPlayer } from '../src/listen/player.js';
import { mediaPolicy } from '../src/audio/policy.js';
import { gameMusic } from '../src/audio/music.js';
import { ROUTES } from '../src/shell/router.js';

const manifest = JSON.parse(readFileSync(new URL('../audio/music/ORIGINAL-MANIFEST.json', import.meta.url), 'utf8'));

function fakeNode(url) {
  const ls = {};
  return {
    url, paused: true, volume: 1,
    addEventListener(t, f) { (ls[t] ||= []).push(f); },
    fire(t) { for (const f of ls[t] || []) f(); },
    play() { this.paused = false; this.fire('playing'); return Promise.resolve(); },
    pause() { this.paused = true; this.fire('pause'); },
    removeAttribute() {}, load() {}, remove() {},
  };
}

test('Songs page: every original song is listed, its words match ORIGINAL-MANIFEST.json, and the route is not sacred', async () => {
  const { SONG_WORDS, SONG_HEBREW } = await import('../src/listen/songs.view.js');
  for (const song of ORIGINAL_SONG_TRACKS) {
    const row = manifest.tracks.find((t) => t.id === song.id);
    assert.ok(row, song.id);
    assert.equal(SONG_WORDS[song.id], row.lyrics, `${song.id}: words differ from the manifest`);
  }
  for (const w of SONG_HEBREW) for (const id of w.songs) assert.ok(new RegExp(w.word, 'i').test(SONG_WORDS[id]), `${w.word} is sung in ${id}`);
  const r = ROUTES.find((x) => x.name === 'songs');
  assert.ok(r && r.owner === 'listen' && r.pattern === '/songs');
  const { SACRED_ROUTES } = await import('../src/listen/catalog.js');
  assert.ok(!SACRED_ROUTES.has('songs'));
});

test('song player: one song at a time, no loop, and a lesson voice pauses it', () => {
  const made = [];
  const player = createShelfPlayer({ base: 'audio/music/', pauseOnSpeech: true, makeAudio: (u) => { const n = fakeNode(u); made.push(n); return n; } });
  player.play(ORIGINAL_SONG_TRACKS[0]);
  assert.match(made[0].url, /audio\/music\/yachad\.mp3$/);
  assert.equal(made[0].loop, false);
  assert.equal(player.snapshot().phase, 'playing');
  mediaPolicy.setSpeech(true);
  assert.equal(made[0].paused, true, 'paused for speech');
  assert.equal(player.snapshot().phase, 'paused');
  mediaPolicy.clearSpeech();
  assert.equal(made[0].paused, true, 'does not restart by itself');
  player.dispose();
});

test('sting: silent without music on; with music on it waits for a cheer line to end, and stops when a voice starts', async () => {
  const { playSting } = await import('../src/audio/sting.js');
  const made = [];
  const make = (u) => { const n = fakeNode(u); made.push(n); return n; };
  const noTimer = { setTimer: () => 0, clearTimer: () => {} };
  assert.equal(playSting({ makeAudio: make, ...noTimer }), false, 'music is off by default');
  mediaPolicy.chooseMusic();
  gameMusic.usePrefs({ readPrefs: () => ({ want: true, volume: 0.3 }) });
  assert.equal(playSting({ makeAudio: make, settings: { get: (k) => k === 'calmMode' } , ...noTimer }), false, 'calm mode keeps it off');
  mediaPolicy.setSpeech(true);
  assert.equal(playSting({ makeAudio: make, pick: (l) => l[0], ...noTimer }), true);
  assert.equal(made.length, 0, 'waits while the cheer line speaks');
  mediaPolicy.clearSpeech();
  assert.equal(made.length, 1);
  assert.match(made[0].url, /audio\/music\/stings\/yachad-sting\.mp3$/);
  assert.equal(made[0].paused, false);
  mediaPolicy.setSpeech(true);
  assert.equal(made[0].paused, true, 'a voice stops it');
  mediaPolicy.clearSpeech();
  mediaPolicy.setRoute('read');
  assert.equal(playSting({ makeAudio: make, ...noTimer }), false, 'never on a prayer route');
  mediaPolicy.setRoute('learn');
  gameMusic.usePrefs({ readPrefs: () => ({ want: false }) });
});
