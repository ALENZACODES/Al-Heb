import test from 'node:test';
import assert from 'node:assert/strict';
import { createSfxController, HOT_SFX, SFX_FILES } from '../src/audio/sfx.js';

const make = () => {
  const nodes = [];
  let settings = { soundEffects: true, calmMode: false, audioFree: false };
  let reduced = false;
  const player = createSfxController({
    makeAudio(src) {
      const a = { src, volume: 0, paused: true, ended: false, preload: '',
        calls: 0, events: {}, load() {},
        addEventListener(k, f) { this.events[k] = f; },
        play() { this.calls++; this.paused = false; return Promise.resolve(); } };
      nodes.push(a);
      return a;
    },
    reducedMotion: () => reduced,
  });
  return { player, nodes,
    connect() { return player.enter({ settings: { get: k => settings[k] } }); },
    update(v) { settings = { ...settings, ...v }; },
    reduce(v) { reduced = v; },
  };
};
test('muted by default, no fetch/preload until effects opt-in', () => {
  const p = make(); p.update({ soundEffects: false });
  p.connect();
  assert.equal(p.player.play('click'), false);
  assert.equal(p.nodes.length, 0);
  p.update({ soundEffects: true });
  assert.equal(p.player.play('click'), true);
  assert.equal(p.nodes.length, HOT_SFX.length);
});
test('hot clips preload once, cold clips are lazy, overlap pools bounded', () => {
  const p = make(); p.connect();
  assert.equal(p.nodes.length, HOT_SFX.length);
  p.player.play('bubble_pop'); p.player.play('bubble_pop'); p.player.play('bubble_pop');
  assert.equal(p.nodes.filter(a => a.src.endsWith('/bubble_pop.mp3')).length, 3);
  p.player.play('bubble_pop');
  assert.equal(p.nodes.filter(a => a.src.endsWith('/bubble_pop.mp3')).length, 3);
  p.player.play('pluck');
  assert.ok(p.nodes.some(a => a.src.endsWith('/pluck.mp3')));
  assert.equal(p.nodes.length, HOT_SFX.length + 3);
});
test('existing mute/calm/audio-free and reduced motion gate every effect', () => {
  const p = make(); p.connect();
  p.player.mute(true); assert.equal(p.player.play('success'), false);
  p.player.mute(false); p.update({ calmMode: true }); assert.equal(p.player.play('success'), false);
  p.update({ calmMode: false, audioFree: true }); assert.equal(p.player.play('success'), false);
  p.update({ audioFree: false }); p.reduce(true); assert.equal(p.player.play('success'), false);
  p.reduce(false); p.update({ soundEffects: false }); assert.equal(p.player.play('success'), false);
  p.update({ soundEffects: true }); assert.equal(p.player.play('success'), true);
});
test('volume clamps and missing/error/unknown files silently no-op', () => {
  const p = make(); p.connect();
  assert.equal(p.player.volume(2), 1);
  assert.equal(p.player.volume(-4), 0);
  assert.equal(p.player.play('click'), false);
  p.player.volume(.25);
  assert.equal(p.player.play('not-an-effect'), false);
  const a = p.nodes.find(n => n.src.endsWith('/click.mp3'));
  a.events.error();
  assert.equal(p.player.play('click'), false);
  assert.ok(Object.hasOwn(SFX_FILES, 'click'));
});
test('unmounted game does not play, and no Audio environment does not throw', () => {
  const p = make(); const leave = p.connect(); leave();
  assert.equal(p.player.play('click'), false);
  const silent = createSfxController({ makeAudio: () => { throw new Error('no audio'); }, reducedMotion: () => false });
  silent.enter({ settings: { get: k => k === 'soundEffects' } });
  assert.equal(silent.play('pop'), false);
});

test('curated Kenney manifest exposes all 30 stable keys without preloading them', () => {
  const expected = [
    'back', 'bubble_pop', 'catch', 'click', 'click_hard', 'click_soft',
    'close', 'collect', 'confirm', 'drop', 'error', 'error_soft',
    'flipper', 'glitch', 'maximize', 'minimize', 'miss', 'open',
    'pluck', 'pop', 'question', 'scroll', 'select', 'select_alt',
    'streak', 'success', 'swoosh', 'tick', 'toggle', 'whoosh',
  ];
  assert.deepEqual(Object.keys(SFX_FILES).sort(), expected.sort());
  assert.equal(HOT_SFX.length, 10);
  assert.ok(HOT_SFX.every((name) => Object.hasOwn(SFX_FILES, name)));
  assert.ok(Object.values(SFX_FILES).every((name) => /^[a-z_]+\\.mp3$/.test(name)));
});
