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
  assert.match(media.made[0].url, /night_at_the_beach\.mp3$/);
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

test('the game bar offers the live-composed styles, the arcade loops and the original beds (not the songs), each with a unique id', async () => {
  const { GAME_TRACKS } = await import('../src/audio/music.js');
  const { SYNTH_STYLES } = await import('../src/audio/synth-music.js');
  const { ORIGINAL_MUSIC_TRACKS, ORIGINAL_SONG_TRACKS } = await import('../src/listen/catalog.js');
  assert.ok(SYNTH_STYLES.length >= 12);
  assert.equal(GAME_TRACKS.length, SYNTH_STYLES.length + MUSIC_TRACKS.length + ORIGINAL_MUSIC_TRACKS.length);
  for (const song of ORIGINAL_SONG_TRACKS) assert.ok(!GAME_TRACKS.some((t) => t.id === song.id), `${song.id} is a song: Songs page, not a game bed`);
  const vendor = new RegExp(['kenney','suno','eleven','open'+'ai','google','ai\\b'].join('|'), 'i');
  for (const t of GAME_TRACKS) assert.doesNotMatch(t.group, vendor, 'no vendor name in the bar');
  assert.equal(new Set(GAME_TRACKS.map((t) => t.id)).size, GAME_TRACKS.length);
  for (const st of SYNTH_STYLES) { assert.ok(st.bpm > 40 && st.bpm < 200, st.id); assert.ok(st.scale.length >= 5 && st.prog.length >= 4, st.id); }
});

test('the installed track-name list matches the music engine, so the track list never offers a style the engine lacks', async () => {
  const { SYNTH_STYLE_LIST } = await import('../src/audio/synth-styles.js');
  const { SYNTH_STYLES } = await import('../src/audio/synth-music.js');
  assert.deepEqual(SYNTH_STYLE_LIST.map((s) => [s.id, s.title, s.role]), SYNTH_STYLES.map((s) => [s.id, s.title, s.role]));
});

test('a stand-in node is never appended to the page (body.append would print "[object Object]"); a real element is', () => {
  const appended = [];
  const saved = { Node: globalThis.Node, document: globalThis.document };
  class FakeNode { setAttribute() {} addEventListener() {} play() { return Promise.resolve(); } pause() {} removeAttribute() {} load() {} remove() { appended.splice(appended.indexOf(this), 1); } }
  globalThis.Node = FakeNode;
  globalThis.document = { body: { append: (x) => appended.push(x) } };
  try {
    const plain = createMusicController({ makeAudio: () => ({ addEventListener() {}, play: () => Promise.resolve(), pause() {} }), policy: { allowsMusic: () => true, snapshot: () => ({}), quiet: () => false } });
    plain.setContext({ game: true }); plain.enable();
    assert.equal(appended.length, 0);
    const real = createMusicController({ makeAudio: () => new FakeNode(), tracks: [{ id: 'a', file: 'a.mp3', title: 'A' }, { id: 'b', file: 'b.mp3', title: 'B' }], policy: { allowsMusic: () => true, snapshot: () => ({}), quiet: () => false } });
    real.setContext({ game: true }); real.enable();
    assert.equal(appended.length, 1);
    real.choose('b');
    assert.equal(appended.length, 1, 'switching tracks removes the old element');
  } finally { globalThis.Node = saved.Node; globalThis.document = saved.document; }
});

test('a game suggests its own bed until the learner picks one; the pick is saved and then wins everywhere', async () => {
  const { GAME_TRACKS, SUGGESTED_BED } = await import('../src/audio/music.js');
  const { ROUTES } = await import('../src/shell/router.js');
  for (const [route, id] of Object.entries(SUGGESTED_BED)) {
    assert.ok(GAME_TRACKS.some((t) => t.id === id), `${route}: ${id} is not in the bar`);
    const r = ROUTES.find((x) => x.name === route);
    assert.ok(r && (r.owner === 'games' || r.owner === 'lab'), `${route} is a game or Brain Lab route`);
  }
  const { media, music, stored } = controller({ tracks: GAME_TRACKS });
  music.setContext(musicContextFor({ name: 'shabbatrush', owner: 'games' }));
  music.enable();
  assert.equal(music.snapshot().trackId, 'klezmer-loop-a');
  assert.match(media.made.at(-1).url, /klezmer-loop-a\.mp3$/);
  music.setContext(musicContextFor({ name: 'memorypalace', owner: 'games' }));
  assert.equal(music.snapshot().trackId, 'niggun-calm-loop-a');
  music.choose('night_at_the_beach');
  assert.equal(stored().picked, true);
  music.setContext(musicContextFor({ name: 'shabbatrush', owner: 'games' }));
  assert.equal(music.snapshot().trackId, 'night_at_the_beach', 'a picked track is not overridden');
  assert.equal(musicContextFor({ name: 'labgame', owner: 'lab' }).game, true, 'Brain Lab takes the bed too');
  assert.equal(musicContextFor({ name: 'songs', owner: 'listen' }).game, false);
});

test('the music settings are real settings, so a learner\'s on/off, volume and track survive a reload', async () => {
  const { validate, createSettings } = await import('../src/shell/settings.js');
  for (const [k, v] of [['gameMusic', true], ['gameMusicMuted', false], ['gameMusicVolume', 0.4], ['gameMusicTrack', 'klezmer-loop-a'], ['gameMusicPicked', true]]) assert.equal(validate(k, v).ok, true, k);
  assert.equal(validate('gameMusicVolume', 2).ok, false);
  assert.equal(validate('gameMusicTrack', '<x>').ok, false);
  const m = {}; const st = { get: (k, d) => (k in m ? m[k] : d), set: (k, v) => { m[k] = JSON.parse(JSON.stringify(v)); } };
  const s = createSettings(st);
  assert.deepEqual(s.set({ gameMusic: true, gameMusicTrack: 'niggun-calm-loop-b', gameMusicVolume: 0.3, gameMusicPicked: true }), []);
  assert.equal(createSettings(st).get('gameMusicTrack'), 'niggun-calm-loop-b');
});
