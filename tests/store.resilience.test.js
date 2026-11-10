import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore, createMemoryStorage } from '../src/store.js';

test('denied localStorage getter falls back without preventing app startup', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('SecurityError'); } });
  try { const store = createStore(); store.set('progress', 7); assert.equal(store.get('progress'), 7); assert.equal(store.persistent, false); }
  finally { if (previous) Object.defineProperty(globalThis, 'localStorage', previous); else delete globalThis.localStorage; }
});

test('quota-full storage remains readable and exportable on startup', () => {
  const disk = createMemoryStorage();
  disk.setItem('alef:progress', JSON.stringify({ completed: 42 }));
  disk.setItem('other:private', 'ignore');
  const full = { ...disk, get length() { return disk.length; }, setItem() { throw new Error('QuotaExceededError'); } };
  const store = createStore({ storage: full });
  assert.deepEqual(store.get('progress'), { completed: 42 });
  assert.equal(store.persistent, false);
  assert.deepEqual(Object.keys(store.exportData().data), ['progress']);
  store.set('next', 43);
  assert.equal(store.get('next'), 43);
});

test('unserialisable restore input cannot erase existing progress', () => {
  const store = createStore({ storage: createMemoryStorage() }); store.set('progress', 42);
  const cyclic = {}; cyclic.self = cyclic;
  assert.equal(store.importData({ app: 'alef', schema: 1, data: cyclic }).ok, false);
  assert.equal(store.get('progress'), 42);
});

test('a backup with a __proto__ key is refused whole and changes no prototype', () => {
  const store = createStore({ storage: createMemoryStorage() }); store.set('progress', 7);
  const r = store.importData('{"app":"alef","schema":1,"data":{"__proto__":{"completed":42}}}');
  assert.equal(r.ok, false); assert.match(r.error, /invalid key name/);
  assert.equal(store.get('progress'), 7, 'existing progress kept');
  assert.equal(Object.hasOwn(store.exportData().data, '__proto__'), false);
  assert.equal(store.exportData().data.completed, undefined);
  assert.equal(/** @type {any} */ ({}).completed, undefined, 'Object.prototype untouched');
});

test('oversized restore rolls back disk progress rather than succeeding only in memory', () => {
  const disk = createMemoryStorage();
  const limited = { ...disk, get length() { return disk.length; }, setItem(k, value) { if (value.length > 100) throw new Error('QuotaExceededError'); disk.setItem(k, value); } };
  const store = createStore({ storage: limited }); store.set('progress', 42);
  const result = store.importData({ app: 'alef', schema: 1, data: { first: 1, oversized: 'x'.repeat(101) } });
  assert.equal(result.ok, false); assert.equal(store.get('progress'), 42);
  assert.equal(store.get('first'), undefined); assert.equal(store.persistent, true);
  assert.equal(createStore({ storage: limited }).get('progress'), 42);
});

test('failed rollback flags recovery and preserves original progress for immediate export', async () => {
  const disk = createMemoryStorage(); let blocked = false;
  const storage = { ...disk, get length() { return disk.length; }, setItem(k, v) { if (k === 'alef:new') blocked = true; if (blocked) throw new Error('denied'); disk.setItem(k, v); } };
  const store = createStore({ storage }); store.set('progress', 42);
  const result = store.importData({ app: 'alef', schema: 1, data: { new: 1 } });
  assert.equal(result.ok, false); assert.equal(result.recoveryRequired, true);
  assert.equal(store.persistent, false); assert.equal(store.get('progress'), 42);
  assert.equal(JSON.parse(store.exportJSON()).data.progress, 42);
  const { restoreFailureMessage } = await import('../src/shell/settings.view.js');
  const message = restoreFailureMessage(result);
  assert.match(message, /Download a backup now/); assert.match(message, /before closing or reloading/);
  assert.doesNotMatch(message, /was not changed/);
});
