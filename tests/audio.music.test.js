import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createMusicController, musicContextFor } from '../src/audio/music.js';
import { MUSIC_TRACKS } from '../src/listen/catalog.js';
import { OPPOSITE_PAIRS } from '../src/img/opposites.js';

function fakeAudio() {
  const made = [];
  const make = (url) => {
    const listeners = {};
    const node = {
      url, paused: true, volume: 1, loop: false,
      addEventListener(type, fn) { (listeners[type] ||= []).push(fn); },
      fire(type) { for (const fn of listeners[type] || []) fn(); },
      play() { this.paused = false; this.fire('playing'); return Promise.resolve(); },
      pause() { this.paused = true; },
    };
    made.push(node);
    return node;
  };
  return { make, made };
}

function controller(extra = {}) {
  const media = fakeAudio();
  let stored = null;
  const music = createMusicController({
    makeAudio: media.make,
    readPrefs: () => stored,
    writePrefs: (p) => { stored = { ...p }; },
    policy: { allowsMusic: () => true, snapshot: () => ({}), quiet: () => false },
    ...extra,
  });
  return { media, music, stored: () => stored };
}

test('game music stays off until enabled, then pauses for speech and refuses sacred routes', () => {
  const { media, music } = controller();
  assert.equal(music.snapshot().phase, 'off');
  assert.equal(music.snapshot().want, false);
  music.setContext(musicContextFor({ name: 'tugowar', owner: 'games' }));
  assert.equal(media.made.length, 0, 'opening a game does not start music');
  assert.equal(music.enable(), true);
  assert.equal(music.snapshot().phase, 'playing');
  assert.equal(media.made[0].loop, true);
  assert.match(media.made[0].url, /night_at_the_beach\.ogg$/);
  music.setSpeech(true);
  assert.equal(media.made[0].paused, true);
  assert.equal(music.snapshot().phase, 'paused');
  music.setSpeech(false);
  assert.equal(media.made[0].paused, false);
  music.setContext(musicContextFor({ name: 'listen-shelf', owner: 'listen' }));
  assert.equal(media.made[0].paused, true);
  assert.equal(music.snapshot().phase, 'blocked');
  music.setContext(musicContextFor({ name: 'read', owner: 'lane5' }));
  assert.equal(music.snapshot().sacred, true);
  music.enable();
  assert.equal(music.snapshot().phase, 'blocked');
  assert.equal(media.made.filter((n) => n.paused === false).length, 0);
});

test('mute, volume and a missing file are honest', async () => {
  const { media, music } = controller();
  music.setContext({ game: true });
  music.enable();
  music.mute(true);
  assert.equal(media.made[0].paused, true);
  music.mute(false);
  assert.equal(media.made[0].paused, false);
  music.volume(0);
  assert.equal(media.made[0].paused, true);
  music.volume(0.5);
  assert.equal(media.made.at(-1).volume, 0.5);
  const refused = controller({
    makeAudio(url) {
      const node = media.make(url);
      node.play = () => Promise.reject(new Error('no'));
      return node;
    },
  });
  refused.music.setContext({ game: true });
  refused.music.enable();
  await Promise.resolve();
  assert.equal(refused.music.snapshot().phase, 'rejected');
  const lost = controller();
  lost.music.setContext({ game: true });
  lost.music.enable();
  lost.media.made[0].fire('error');
  assert.equal(lost.music.snapshot().phase, 'missing');
  assert.match(lost.music.snapshot().error, /not available/);
  assert.equal(MUSIC_TRACKS.length, 3);
});

test('game music controls stay in the page and off until turned on', () => {
  const src = readFileSync(new URL('../src/audio/music-bar.js', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /position:\s*sticky|inset-block-end:\s*0|z-index:\s*4/);
  assert.match(src, /position:\s*static/);
  assert.match(src, /Play music/);
  assert.match(src, /data-music="mute"/);
  assert.match(src, /data-music="track"/);
  assert.match(src, /data-music="volume"/);
  assert.match(src, /Off until turned on; never plays during prayer or sacred listening/);
  assert.doesNotMatch(src, /Optional secular music/);
  assert.deepEqual(OPPOSITE_PAIRS.map((p) => p.id), ['OPP_expensive_cheap', 'OPP_expensive_cheap', 'OPP_near_far']);
});

test('a saved opt-in stays on and still does not play during the quiet minute', () => {
  const stored = { want: true, muted: false, volume: 0.4, trackId: 'night_at_the_beach' };
  const { media, music } = controller({
    readPrefs: () => stored,
    policy: { allowsMusic: () => false, snapshot: () => ({ quiet: true }), quiet: () => true },
  });
  music.usePrefs({ readPrefs: () => stored, writePrefs: () => {} });
  music.setContext(musicContextFor({ name: 'pinball', owner: 'games' }));
  assert.equal(music.snapshot().want, true);
  assert.equal(music.snapshot().armed, true);
  assert.equal(music.snapshot().phase, 'paused');
  assert.equal(media.made.length, 0);
});

test('calm mode and audio-free keep the bed off', () => {
  const { media, music } = controller();
  music.setContext(musicContextFor({ name: 'pinball', owner: 'games' }, { calm: true }));
  music.enable();
  assert.equal(music.snapshot().phase, 'blocked');
  assert.equal(media.made.length, 0);
});

test('the game bar offers the live-composed styles plus the Kenney loops, each with a unique id', async () => {
  const { GAME_TRACKS } = await import('../src/audio/music.js');
  const { SYNTH_STYLES } = await import('../src/audio/synth-music.js');
  assert.ok(SYNTH_STYLES.length >= 12);
  assert.equal(GAME_TRACKS.length, SYNTH_STYLES.length + MUSIC_TRACKS.length);
  assert.equal(new Set(GAME_TRACKS.map((t) => t.id)).size, GAME_TRACKS.length);
  for (const st of SYNTH_STYLES) { assert.ok(st.bpm > 40 && st.bpm < 200, st.id); assert.ok(st.scale.length >= 5 && st.prog.length >= 4, st.id); }
});
