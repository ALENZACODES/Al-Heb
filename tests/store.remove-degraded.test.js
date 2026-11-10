// store.remove(key) after the store degrades to memory must also remove the old localStorage copy.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore, createMemoryStorage } from '../src/store.js';

/** localStorage stand-in whose writes of NEW keys throw QuotaExceededError once `ref.full` is set */
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

test('store.remove(key) after fallback removes the old localStorage entry too, and only that key', () => {
  const { s, st } = degraded();
  st.remove('a');
  assert.equal(st.get('a'), undefined);
  const fresh = createStore({ storage: s, window: null });
  assert.equal(fresh.get('a'), undefined, 'removed key came back on next load');
  assert.equal(fresh.get('b'), 2, 'other keys must be untouched');
});

test('set(key, undefined) on a degraded store also removes the old copy', () => {
  const { s, st } = degraded();
  st.set('b', undefined);
  assert.equal(createStore({ storage: s, window: null }).get('b'), undefined);
});

test('remove() does not throw when the primary storage refuses removal', () => {
  const { s, st } = degraded();
  s.removeItem = () => { throw new Error('denied'); };
  assert.doesNotThrow(() => st.remove('a'));
  assert.equal(st.get('a'), undefined);
});
