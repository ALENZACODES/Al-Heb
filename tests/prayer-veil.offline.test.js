import test from 'node:test';
import assert from 'node:assert/strict';
import { canPlayPrayerOffline } from '../src/shell/prayer-veil.js';

test('opening prayer offline: use a saved clip, avoid an uncached network request', async () => {
  assert.equal(await canPlayPrayerOffline('audio/prayer.mp3', { online: false, cache: { match: async () => undefined } }), false);
  assert.equal(await canPlayPrayerOffline('audio/prayer.mp3', { online: false, cache: { match: async () => ({ ok: true }) } }), true);
  assert.equal(await canPlayPrayerOffline('audio/prayer.mp3', { online: false, cache: { match: async () => { throw new Error('denied'); } } }), false);
  assert.equal(await canPlayPrayerOffline('audio/prayer.mp3', { online: true, cache: { match: () => { throw new Error('must not inspect cache online'); } } }), true);
});
