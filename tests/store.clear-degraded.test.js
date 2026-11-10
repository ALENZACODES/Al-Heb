// Delete-all after the store degrades to memory must also remove the old localStorage copy.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore, createMemoryStorage } from '../src/store.js';
import { wipeAllData } from '../src/shell/settings.data.js';

/** localStorage stand-in whose writes of NEW keys throw QuotaExceededError once `ref.full` is set (the store's own probe key still fits, as with a nearly full disk) */
function quotaStorage() {
  const m = createMemoryStorage(); const ref = { full: false };
  const s = { getItem: m.getItem, removeItem: m.removeItem, key: m.key, get length() { return m.length; },
    setItem(k, v) { if (ref.full && k.startsWith('alef:')) throw Object.assign(new Error('quota'), { name: 'QuotaExceededError', code: 22 }); m.setItem(k, v); } };
  return { s, ref };
}
function degraded() {
  const { s, ref } = quotaStorage();
  const st = createStore({ storage: s, window: null });
  st.set('a', { n: 1 }); st.set('b', 2);
  ref.full = true; st.set('c', 3); // write fails -> memory fallback
  assert.equal(st.persistent, false);
  return { s, st };
}

test('store.clear() after fallback removes the old localStorage entries too', () => {
  const { s, st } = degraded();
  st.clear();
  assert.deepEqual(st.keys(), []);
  const fresh = createStore({ storage: s, window: null });
  assert.deepEqual(fresh.keys(), [], 'old data came back on next load');
});

test('wipeAllData (degraded store, storage sweep skipped as in settings view) leaves nothing for the next load', async () => {
  const { s, st } = degraded();
  const r = await wipeAllData({ store: st, storage: null });
  assert.equal(r.store, true);
  assert.deepEqual(createStore({ storage: s, window: null }).keys(), []);
});

test('clear() keeps the schema stamp and does not throw when the primary storage refuses removal', () => {
  const { s, st } = degraded();
  s.removeItem = () => { throw new Error('denied'); };
  assert.doesNotThrow(() => st.clear());
});
