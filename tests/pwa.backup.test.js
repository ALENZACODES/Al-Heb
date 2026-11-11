// Progress protection: backup inspection (dry run), the store round trip it protects, and the persistence request. No browser needed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectBackup, requestPersistence, storageStatus } from '../src/shell/backup.js';
import { createStore, createMemoryStorage, SCHEMA_VERSION } from '../src/store.js';

const mk = () => createStore({ storage: createMemoryStorage() });
function seeded() {
  const s = mk();
  s.set('settings', { voice: 'm', congregation: 'ashkenazi', onboarded: true });
  s.set('curriculum.progress', { completed: ['r01', 'r02'] });
  s.set('srs.cards', { 'c:alef': { due: 123, reps: 2 } });
  s.set('letters.progress', { alef: { print: { perfect: true } } });
  return s;
}

test('export then import on a fresh store restores every key exactly (the "cleared site data, restore from file" path)', () => {
  const a = seeded(); const json = a.exportJSON();
  const b = mk(); const res = b.importData(json, { mode: 'replace' });
  assert.equal(res.ok, true);
  for (const k of ['settings', 'curriculum.progress', 'srs.cards', 'letters.progress']) assert.deepEqual(b.get(k), a.get(k), k);
});
test('restore replaces what is on the device now (so Settings asks first)', () => {
  const a = seeded(); const b = mk(); b.set('settings', { voice: 'f' }); b.set('extra.key', 1);
  b.importData(a.exportJSON(), { mode: 'replace' });
  assert.equal(b.get('extra.key'), undefined); assert.equal(b.get('settings').voice, 'm');
});
test('inspectBackup: a valid export is accepted and described without changing anything', () => {
  const a = seeded(); const info = inspectBackup(a.exportJSON());
  assert.equal(info.ok, true); assert.ok(info.items >= 4); assert.equal(info.schema, SCHEMA_VERSION); assert.match(info.exportedAt, /^\d{4}-\d\d-\d\d/);
  assert.ok(info.keys.includes('srs.cards'));
});
test('inspectBackup agrees with store.importData on bad files, and a rejected restore leaves the store untouched', () => {
  const store = seeded(); const before = store.exportJSON();
  const bad = ['not json', '{}', '[]', 'null', JSON.stringify({ app: 'other', schema: 1, data: {} }), JSON.stringify({ app: 'alef', schema: 1, data: [] }),
    JSON.stringify({ app: 'alef', data: {} }), JSON.stringify({ app: 'alef', schema: 0, data: {} }), JSON.stringify({ app: 'alef', schema: 99, data: {} })];
  for (const text of bad) {
    const info = inspectBackup(text); assert.equal(info.ok, false, text); assert.ok(info.error.length > 5);
    assert.equal(store.importData(text, { mode: 'replace' }).ok, false, text);
  }
  const strip = (j) => JSON.stringify(JSON.parse(j).data);
  assert.equal(strip(store.exportJSON()), strip(before), 'progress unchanged after every rejected restore');
});
test('a newer-schema backup is refused with a message that says to update the app', () => {
  const r = inspectBackup(JSON.stringify({ app: 'alef', schema: SCHEMA_VERSION + 1, data: {} })); assert.equal(r.ok, false); assert.match(r.error, /newer Aleph/);
});
test('requestPersistence: not supported -> reported, never throws', async () => {
  assert.deepEqual(await requestPersistence({}), { supported: false, persisted: null, granted: null });
  assert.deepEqual(await requestPersistence(undefined === 1 ? 1 : { storage: {} }), { supported: false, persisted: null, granted: null });
});
test('requestPersistence: granted, refused, already persisted (no second prompt), and a throwing API', async () => {
  let calls = 0;
  assert.deepEqual(await requestPersistence({ storage: { persist: async () => { calls++; return true; }, persisted: async () => false } }), { supported: true, persisted: true, granted: true });
  assert.deepEqual(await requestPersistence({ storage: { persist: async () => false, persisted: async () => false } }), { supported: true, persisted: false, granted: false });
  calls = 0;
  assert.equal((await requestPersistence({ storage: { persist: async () => { calls++; return true; }, persisted: async () => true } })).persisted, true); assert.equal(calls, 0, 'persist() not called when already persistent');
  const r = await requestPersistence({ storage: { persist: async () => { throw new Error('denied'); } } }); assert.equal(r.supported, true); assert.equal(r.granted, null);
});
test('storageStatus reports persisted and usage, and tolerates missing pieces', async () => {
  assert.deepEqual(await storageStatus({}), { supported: false, persisted: null, usage: null, quota: null });
  const s = await storageStatus({ storage: { persist: () => {}, persisted: async () => false, estimate: async () => ({ usage: 10, quota: 100 }) } });
  assert.deepEqual(s, { supported: true, persisted: false, usage: 10, quota: 100 });
  const t = await storageStatus({ storage: { persist: () => {}, estimate: async () => { throw new Error('x'); } } }); assert.equal(t.usage, null);
});
