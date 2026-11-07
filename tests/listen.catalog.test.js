import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { HELD_FILE, LISTEN_ITEMS, MUSIC_TRACKS, SHELVES, itemsOn } from '../src/listen/catalog.js';
import { createShelfPlayer } from '../src/listen/player.js';
import { matchRoute, tierOf } from '../src/shell/router.js';
import { listShipFiles } from '../tools/deploy/make-dist.mjs';
import { computeManifest } from '../tools/build-precache.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sha16 = (rel) => createHash('sha256').update(readFileSync(join(root, rel))).digest('hex').slice(0, 16);

function fakeAudio() {
  const made = [];
  const make = (url) => {
    const listeners = {};
    const node = {
      url, paused: true, volume: 1,
      addEventListener(type, fn) { (listeners[type] ||= []).push(fn); },
      fire(type) { for (const fn of listeners[type] || []) fn(); },
      play() { this.paused = false; this.fire('playing'); return Promise.resolve(); },
      pause() { this.paused = true; this.fire('pause'); },
      load() {},
      removeAttribute() {},
    };
    made.push(node);
    return node;
  };
  return { make, made };
}

test('sacred listen catalogue keeps the held 1929 file out and does not call folk cantorial', () => {
  assert.equal(LISTEN_ITEMS.length, 14);
  assert.equal(LISTEN_ITEMS.filter((row) => row.kind === 'cantorial').length, 7);
  assert.equal(LISTEN_ITEMS.filter((row) => row.kind === 'demonstration').length, 6);
  assert.equal(LISTEN_ITEMS.filter((row) => row.kind === 'folk').length, 1);
  assert.equal(itemsOn('sephardi').length, 0);
  assert.equal(itemsOn('israeli').length, 0);
  const folk = LISTEN_ITEMS.find((row) => row.id === 'cc_chad_gadya_traditional');
  assert.equal(folk.kind, 'folk');
  assert.equal(folk.tradition, 'Unknown');
  assert.equal(folk.shelf, 'folk');
  assert.equal(folk.shareAlike, true);
  for (const row of LISTEN_ITEMS) {
    assert.notEqual(row.file, HELD_FILE);
    assert.ok(row.title && row.performer && row.licence && row.sourceUrl && row.tradition);
    assert.notEqual(row.tradition, 'Sephardi');
    assert.notEqual(row.tradition, 'Israeli');
  }
  const names = readdirSync(join(root, 'audio/listen'));
  assert.ok(!names.includes(HELD_FILE));
  assert.equal(SHELVES.filter((s) => s.empty).map((s) => s.id).join(), 'sephardi,israeli');
});

test('cleared listen and music files match the audit hashes and ship outside the install precache', () => {
  for (const row of LISTEN_ITEMS) assert.equal(sha16(`audio/listen/${row.file}`), row.sha256_16, row.file);
  const asael = LISTEN_ITEMS.find((row) => row.originalFile);
  assert.equal(sha16(`audio/listen/${asael.originalFile}`), asael.sha256_16);
  for (const row of MUSIC_TRACKS) assert.equal(sha16(`audio/music/${row.file}`), row.sha256_16, row.file);
  const ship = listShipFiles();
  const manifest = computeManifest(root);
  for (const row of LISTEN_ITEMS) {
    assert.ok(ship.includes(`audio/listen/${row.file}`), row.file);
    assert.ok(!manifest.files.includes(`audio/listen/${row.file}`));
    assert.ok(!manifest.onDemand.includes(`audio/listen/${row.file}`));
  }
  for (const row of MUSIC_TRACKS) {
    assert.ok(ship.includes(`audio/music/${row.file}`), row.file);
    assert.ok(!manifest.files.includes(`audio/music/${row.file}`));
  }
  assert.ok(existsSync(join(root, 'audio/listen', HELD_FILE)) === false);
});

test('shelf player plays, pauses, reports a missing file, and cleans up', async () => {
  const media = fakeAudio();
  const player = createShelfPlayer({ makeAudio: media.make });
  const seen = [];
  player.subscribe((s) => seen.push(s.phase));
  const item = LISTEN_ITEMS[0];
  player.play(item);
  assert.equal(player.snapshot().phase, 'playing');
  assert.equal(media.made[0].paused, false);
  player.pause();
  assert.equal(player.snapshot().phase, 'paused');
  assert.equal(media.made[0].paused, true);
  const broken = fakeAudio();
  const other = createShelfPlayer({
    makeAudio: (url) => {
      const node = broken.make(url);
      node.play = () => Promise.reject(new Error('refused'));
      return node;
    },
  });
  other.play(item);
  await Promise.resolve();
  assert.equal(other.snapshot().phase, 'rejected');
  const missing = fakeAudio();
  const lost = createShelfPlayer({ makeAudio: missing.make });
  lost.play(item);
  missing.made[0].fire('error');
  assert.equal(lost.snapshot().phase, 'missing');
  lost.stop();
  assert.equal(lost.snapshot().phase, 'idle');
  assert.equal(missing.made[0].paused, true);
});

test('sacred listen is its own preview route', () => {
  const m = matchRoute('#/listen/shelf');
  assert.equal(m.route?.name, 'listen-shelf');
  assert.equal(m.route.module, '../listen/shelf.view.js');
  assert.equal(tierOf(m.route), 'preview');
  assert.notEqual(matchRoute('#/listen').route.name, 'listen-shelf');
});
