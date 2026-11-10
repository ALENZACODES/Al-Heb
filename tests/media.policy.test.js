import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMediaPolicy, QUIET_MS, feedbackName } from '../src/audio/policy.js';
import { sfx, SFX_FILES } from '../src/audio/sfx.js';
import { createMusicController } from '../src/audio/music.js';
import { LISTEN_ITEMS, HELD_FILE, itemsOn } from '../src/listen/catalog.js';
import { createShelfPlayer } from '../src/listen/player.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

test('the first minute blocks music and effects, and a win does not play them yet', () => {
  let t = 0;
  const policy = createMediaPolicy({ now: () => t });
  assert.equal(policy.quiet(), true);
  assert.equal(policy.allowsSfx(), false);
  assert.equal(policy.allowsMusic(), false);
  policy.observe('success');
  assert.equal(policy.snapshot().won, true);
  assert.equal(policy.allowsSfx(), false);
  t = QUIET_MS;
  assert.equal(policy.quiet(), false);
  assert.equal(policy.allowsSfx(), true);
  policy.setSpeech(true);
  assert.equal(policy.allowsSfx(), false);
  assert.equal(policy.allowsMusic(), false);
  policy.clearSpeech();
  policy.setCantorial(true);
  assert.equal(policy.allowsMusic(), false);
  policy.setCantorial(false);
  policy.setRoute('listen-shelf');
  assert.equal(policy.allowsSfx(), false);
  assert.equal(feedbackName('error'), 'miss');
  assert.equal(feedbackName('whoosh'), null);
});

test('the shared effect player stays muted until a win and the quiet minute are both over', () => {
  const before = sfx.play('success');
  assert.equal(before, false);
  const harsh = sfx.play('error');
  assert.equal(harsh, false);
  assert.equal(sfx.play('click'), false);
  assert.ok(existsSync(join(root, 'audio/sfx/ui', SFX_FILES.success)));
  assert.equal(readdirSync(join(root, 'audio/sfx/ui')).filter((n) => n.endsWith('.mp3')).length, 30);
});

test('sacred shelf does not loop, score, or invent read-along timings', () => {
  const made = [];
  const player = createShelfPlayer({
    makeAudio(url) {
      const node = { url, paused: true, loop: false, play() { this.paused = false; return Promise.resolve(); }, pause() { this.paused = true; }, load() {}, remove() {}, setAttribute() {}, addEventListener() {} };
      made.push(node);
      return node;
    },
  });
  player.play(LISTEN_ITEMS[0]);
  assert.equal(made[0].loop, false);
  player.stop();
  assert.equal(made.length, 1);
  const folk = LISTEN_ITEMS.find((row) => row.id === 'cc_chad_gadya_traditional');
  assert.equal(folk.tradition, 'Unknown');
  assert.equal(folk.kind, 'folk');
  assert.equal(itemsOn('sephardi').length, 0);
  assert.equal(itemsOn('israeli').length, 0);
  assert.ok(LISTEN_ITEMS.filter((row) => row.kind === 'cantorial').every((row) => row.historical));
  assert.ok(LISTEN_ITEMS.every((row) => !row.timings && !row.transcript));
  assert.equal(existsSync(join(root, 'audio/listen', HELD_FILE)), false);
});

test('music stays off during the opening minute', () => {
  const music = createMusicController({ makeAudio: () => { throw new Error('should not play'); } });
  music.setContext({ game: true });
  assert.equal(music.enable(), false);
});

test('exploratory ideas stay unbuilt: no three-mouth drill, no stress metronome, no timed read-along', () => {
  assert.equal(LISTEN_ITEMS.some((row) => row.timings), false);
  assert.equal(feedbackName('tick'), null);
});

test('game action sounds play by name once the media rules allow effects, and never rattle', async () => {
  const { createGameSfx, ACTION_GAP_MS } = await import('../src/audio/sfx.js');
  let t = 0; const played = []; const twins = []; const moves = [];
  const policy = createMediaPolicy({ now: () => t });
  const raw = { enter: () => () => {}, play: (n) => { played.push(n); return true; }, pause() {}, mute() {}, volume: (v) => v, preload() {}, enabled: () => true };
  const game = createGameSfx({ raw, policy, twin: (k) => twins.push(k), react: (m) => moves.push(m), now: () => t });
  assert.equal(game.play('whoosh'), false, 'nothing in the first minute');
  t = QUIET_MS;
  assert.equal(game.play('whoosh'), false, 'nothing before a first win');
  assert.equal(game.play('success'), true);
  assert.deepEqual(played, ['success']);
  t += 1000;
  assert.equal(game.play('whoosh'), true);
  assert.equal(game.play('whoosh'), false, 'the same sound does not repeat at once');
  assert.equal(game.play('tick'), true, 'a different sound may follow straight away');
  t += ACTION_GAP_MS;
  assert.equal(game.play('whoosh'), true);
  assert.equal(game.play('error_soft'), true);
  assert.equal(game.play('not-a-sound'), false);
  assert.deepEqual(played, ['success', 'whoosh', 'tick', 'whoosh', 'miss']);
  assert.deepEqual(twins, ['success', 'miss'], 'only feedback writes the status line');
  assert.deepEqual(moves, ['bounce', 'sad'], 'only feedback moves Rimon');
  policy.setSpeech(true);
  t += 1000;
  assert.equal(game.play('pop'), false, 'silent while a voice is speaking');
  policy.clearSpeech(); policy.setRoute('listen-shelf');
  assert.equal(game.play('pop'), false, 'silent on prayer screens');
});
