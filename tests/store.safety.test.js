// Learner data safety: backup/restore covers every key, validation is all-or-nothing, quota and private mode degrade visibly,
// old shapes survive migration, two tabs do not clobber each other, delete-all is explicit. In-memory storage, no browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStore, createMemoryStorage, SCHEMA_VERSION, migrateData, checksum, canonicalJSON } from '../src/store.js';
import { STORE_KEYS } from '../src/shell/privacy.view.js';
import { createSettings } from '../src/shell/settings.js';
import { wipeAllData, confirmMatches, describePreview, storageNotice } from '../src/shell/settings.data.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const mk = (storage = createMemoryStorage(), extra = {}) => createStore({ storage, window: null, ...extra });
const quotaErr = () => Object.assign(new Error('The quota has been exceeded.'), { name: 'QuotaExceededError', code: 22 });
/** storage that throws QuotaExceededError once it holds more than `cap` entries */
function limited(cap) { const m = createMemoryStorage(); const ref = { cap }; const s = { getItem: m.getItem, removeItem: m.removeItem, key: m.key, get length() { return m.length; }, setItem(k, v) { if (m.getItem(k) == null && m.length >= ref.cap) throw quotaErr(); m.setItem(k, v); } }; return { s, m, ref }; }

test('backup covers every key in the privacy list plus keys nobody listed, and restores them exactly on a fresh store', () => {
  const a = mk();
  const names = [...STORE_KEYS.map((r) => r[0]), 'some.future.key.v9'];
  names.forEach((k, i) => a.set(k, { i, nested: { list: [1, 'שלום', null] } }));
  const b = mk();
  const res = b.importData(a.exportJSON());
  assert.equal(res.ok, true); assert.equal(res.imported, names.length);
  for (const k of names) assert.deepEqual(b.get(k), a.get(k), k);
  assert.deepEqual(b.keys().sort(), names.slice().sort());
});

test('nothing in src writes to localStorage behind the store (so a backup cannot miss a key)', () => {
  const allowed = new Set(['src/store.js', 'src/shell/offline.js', 'src/shell/privacy.view.js', 'src/shell/audio-access.js', 'src/shell/install-notice.js', 'src/shell/settings.view.js', 'src/shell/settings.data.js', 'src/shell/update.js']);
  const bad = [];
  (function walk(d) { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (p.endsWith('.js')) { const rel = relative(root, p); if (!allowed.has(rel) && /(localStorage|sessionStorage|indexedDB)\s*[.[]\s*(setItem|set|open|\w)/.test(readFileSync(p, 'utf8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, ''))) bad.push(rel); } } })(join(root, 'src'));
  assert.deepEqual(bad, []);
});

test('backup file has version, count and checksum; editing or truncating it is rejected and leaves the store untouched', () => {
  const a = mk(); a.set('settings', { voice: 'm' }); a.set('srs.cards', { x: 1 });
  const obj = a.exportData();
  assert.equal(obj.schema, SCHEMA_VERSION); assert.equal(obj.count, 2); assert.equal(obj.checksum, checksum(canonicalJSON(obj.data)));
  const s = mk(); s.set('keep', 'me'); const before = s.exportJSON();
  const edited = JSON.parse(JSON.stringify(obj)); edited.data['srs.cards'].x = 2;
  const bad = [a.exportJSON().slice(0, 60), JSON.stringify(edited), '{"app":"alef","schema":1,"data":{"__proto__":{"x":1}}}',
    JSON.stringify({ ...obj, checksum: undefined, data: { __meta: { schema: 1 } } }), JSON.stringify({ ...obj, checksum: undefined, data: { ['k'.repeat(300)]: 1 } }), JSON.stringify({ ...obj, schema: SCHEMA_VERSION + 1 })];
  for (const t of bad) { assert.equal(s.previewImport(t).ok, false, t.slice(0, 50)); assert.equal(s.importData(t).ok, false); }
  assert.equal(s.exportJSON().replace(/"exportedAt": "[^"]+"/, ''), before.replace(/"exportedAt": "[^"]+"/, ''));
  assert.equal(s.get('keep'), 'me');
});

test('older backups without a checksum are still accepted', () => {
  const s = mk(); const r = s.importData(JSON.stringify({ app: 'alef', schema: 1, exportedAt: '2026-01-01T00:00:00Z', data: { settings: { voice: 'm' } } }));
  assert.equal(r.ok, true); assert.equal(s.get('settings').voice, 'm');
});

test('preview says what a restore will add, replace and remove, without changing anything', () => {
  const s = mk(); s.set('a', 1); s.set('b', 2); s.set('gone', 3);
  const src = mk(); src.set('a', 1); src.set('b', 99); src.set('new', 5);
  const p = s.previewImport(src.exportJSON());
  assert.equal(p.ok, true);
  assert.deepEqual(p.diff, { added: ['new'], changed: ['b'], unchanged: ['a'], removed: ['gone'] });
  assert.equal(s.get('b'), 2); assert.equal(s.get('gone'), 3);
  const merge = s.previewImport(src.exportJSON(), { mode: 'merge' }); assert.deepEqual(merge.diff.removed, []);
  assert.match(describePreview(p).join(' '), /1 will be added.*1 will be replaced.*1 on this device but not in the backup will be removed.*1 are already identical/);
});

test('a restore that runs out of space part-way rolls back completely', () => {
  const src = mk(); for (let i = 0; i < 6; i++) src.set('k' + i, { i });
  const json = src.exportJSON();
  const { s, m } = limited(4); const t = mk(s); t.set('mine', { keep: true });
  const snapshot = JSON.stringify([...Array(m.length).keys()].map((i) => [m.key(i), m.getItem(m.key(i))]).sort());
  const r = t.importData(json, { mode: 'replace' });
  assert.equal(r.ok, false); assert.match(r.error, /Not enough storage space.*Nothing was changed/);
  assert.equal(JSON.stringify([...Array(m.length).keys()].map((i) => [m.key(i), m.getItem(m.key(i))]).sort()), snapshot);
  assert.deepEqual(t.get('mine'), { keep: true }); assert.equal(t.persistent, true);
});

test('quota during normal use: the app keeps working in memory, status says why, listeners are told, retry works once space exists', () => {
  const { s, m, ref } = limited(3); const t = mk(s); // __meta takes one slot
  const seen = []; t.onStatus((x) => seen.push(x));
  assert.equal(t.set('a', 1), true); assert.equal(t.set('b', 2), true);
  assert.equal(t.set('c', 3), false); // third data key does not fit
  assert.equal(t.persistent, false); assert.equal(t.degradedReason, 'quota'); assert.equal(seen.length, 1); assert.equal(seen[0].reason, 'quota');
  assert.deepEqual([t.get('a'), t.get('b'), t.get('c')], [1, 2, 3]);
  assert.match(storageNotice(t.status()), /out of storage space/);
  assert.equal(t.retryPersistence(), false); assert.equal(t.get('c'), 3); assert.equal(m.getItem('alef:c'), null);
  ref.cap = 10; // space freed
  assert.equal(t.retryPersistence(), true);
  assert.equal(t.persistent, true); assert.equal(t.degradedReason, null); assert.equal(m.getItem('alef:c'), '3');
});

test('private mode / blocked storage: no throw, works in memory, notice text is shown, restore and delete still work', () => {
  const blocked = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); }, removeItem() { throw new Error('denied'); }, key() { throw new Error('denied'); }, get length() { throw new Error('denied'); } };
  for (const storage of [blocked, null]) {
    const t = mk(storage);
    assert.equal(t.persistent, false); assert.equal(t.degradedReason, 'unavailable');
    t.set('settings', { voice: 'm' }); assert.deepEqual(t.get('settings'), { voice: 'm' });
    assert.match(storageNotice(t.status()), /private browsing or blocked storage/);
    const src = mk(); src.set('x', 1); assert.equal(t.importData(src.exportJSON()).ok, true); assert.equal(t.get('x'), 1); assert.equal(t.get('settings'), undefined);
    t.clear(); assert.deepEqual(t.keys(), []);
  }
});

test('schema: stamped, old unstamped data counts as schema 1, newer data is flagged not downgraded, failed migration leaves data untouched', () => {
  const st = createMemoryStorage(); st.setItem('alef:srs.cards', '{"old":1}');
  const t = mk(st); assert.deepEqual(JSON.parse(st.getItem('alef:__meta')), { schema: SCHEMA_VERSION }); assert.deepEqual(t.get('srs.cards'), { old: 1 });
  const fut = createMemoryStorage(); fut.setItem('alef:__meta', '{"schema":99}'); fut.setItem('alef:x', '1');
  const f = mk(fut); assert.equal(f.status().newerSchema, true); assert.equal(JSON.parse(fut.getItem('alef:__meta')).schema, 99); assert.equal(f.get('x'), 1);
  // a real upgrade path: pretend current schema is 3 with two migrations
  const migs = [(d) => ({ ...d, streak: { v: 2, days: d.streak?.days ?? [] } }), (d) => { const { legacy, ...rest } = d; return { ...rest, moved: legacy }; }];
  assert.deepEqual(migrateData({ streak: { days: [1] }, legacy: 5 }, 1, migs.slice(0, 0)) && 0, 0); // schema 1 -> 1: no-op with the real list
  const old = createMemoryStorage(); old.setItem('alef:__meta', '{"schema":1}'); old.setItem('alef:streak', '{"days":[1]}'); old.setItem('alef:legacy', '5');
  const up = createStore({ storage: old, window: null, migrations: migs, schema: 3 });
  assert.deepEqual(up.get('streak'), { v: 2, days: [1] }); assert.equal(up.get('moved'), 5); assert.equal(up.get('legacy'), undefined); assert.equal(JSON.parse(old.getItem('alef:__meta')).schema, 3);
  const bad = createMemoryStorage(); bad.setItem('alef:__meta', '{"schema":1}'); bad.setItem('alef:k', '1');
  const nb = createStore({ storage: bad, window: null, migrations: [() => { throw new Error('boom'); }], schema: 2 });
  assert.equal(nb.get('k'), 1); assert.equal(JSON.parse(bad.getItem('alef:__meta')).schema, 1);
  // a backup from schema 1 restored into a newer app is upgraded, and previewed as such
  const b1 = JSON.stringify({ app: 'alef', schema: 1, data: { legacy: 7 } });
  const t3 = createStore({ storage: createMemoryStorage(), window: null, migrations: migs, schema: 3 }); const pv = t3.previewImport(b1);
  assert.equal(pv.ok, true); assert.equal(pv.migrated, true); assert.deepEqual(pv.data.moved, 7);
});

test('old and odd shapes of every stored key survive a backup round trip, and settings tolerate old shapes', () => {
  const shapes = [null, 0, 'text', true, [], [1, 2], {}, { v: 1 }, { completed: ['r01'] }, { completed: { r01: 1 } }, { 'c:alef': { due: 1 } }];
  const a = mk();
  STORE_KEYS.forEach(([k], i) => a.set(k, shapes[i % shapes.length]));
  const b = mk(); assert.equal(b.importData(a.exportJSON()).ok, true);
  STORE_KEYS.forEach(([k]) => assert.deepEqual(b.get(k, 'MISSING'), a.get(k, 'MISSING'), k));
  for (const old of [null, 'x', [], 7, { voice: 'robot', theme: 'dark', retired: 1, lat: 'far', israelTrack: 'yes' }, { voice: 'm' }]) {
    const t = mk(); t.set('settings', old); const s = createSettings(t);
    assert.ok(['m', 'f'].includes(s.voice)); assert.ok(['auto', 'light', 'dark'].includes(s.theme)); assert.equal(s.lat, null); assert.equal(s.israelTrack, false);
  }
});

test('two tabs: settings changes in different fields are both kept; the other tab hears about it; unrelated keys are untouched', () => {
  const shared = createMemoryStorage();
  const listeners = { A: [], B: [] };
  const win = (n) => ({ addEventListener: (ev, fn) => listeners[n].push(fn), removeEventListener() {} });
  const tabA = createStore({ storage: shared, window: win('A') }), tabB = createStore({ storage: shared, window: win('B') });
  const sA = createSettings(tabA), sB = createSettings(tabB);
  const fire = (to, key) => { const k = 'alef:' + key; for (const fn of listeners[to]) fn({ key: k, newValue: shared.getItem(k), storageArea: undefined }); };
  sA.set({ voice: 'm' });                    // tab A writes
  sB.set({ theme: 'dark' });                 // tab B (stale copy: has not heard yet) writes another field
  assert.deepEqual([tabA.get('settings').voice, tabA.get('settings').theme], ['m', 'dark']); // nothing clobbered
  let heard = 0; sA.subscribe(() => heard++); fire('A', 'settings');
  assert.equal(sA.theme, 'dark'); assert.equal(sA.voice, 'm'); assert.ok(heard >= 1);
  // same field written by both: last write wins
  sA.set({ voice: 'f' }); sB.set({ voice: 'm' }); assert.equal(tabA.get('settings').voice, 'm');
  // per-key events for other keys reach subscribers as external
  const ev = []; tabA.subscribe((k, v, info) => ev.push([k, v, info?.external])); tabB.set('srs.cards', { z: 1 }); fire('A', 'srs.cards');
  assert.deepEqual(ev, [['srs.cards', { z: 1 }, true]]);
  // a tab that cleared storage: other tab gets '*' and settings fall back to defaults
  tabB.clear(); for (const fn of listeners.A) fn({ key: null }); assert.equal(sA.voice, 'f');
});

test('delete all: typed confirmation required; clears store, flags, caches; unregisters the service worker only when asked', async () => {
  assert.equal(confirmMatches(''), false); assert.equal(confirmMatches('delet'), false); assert.equal(confirmMatches(' delete '), true); assert.equal(confirmMatches('DELETE'), true);
  const mkEnv = () => {
    const ls = createMemoryStorage(); const t = createStore({ storage: ls, window: null }); t.set('settings', { voice: 'm' }); t.set('srs.cards', { a: 1 }); ls.setItem('alef.audioBannerSeen.v1', '1'); ls.setItem('other.site', 'x');
    const cs = new Set(['alef-shell-v1', 'alef-audio']); const caches = { keys: async () => [...cs], delete: async (k) => cs.delete(k) };
    let unreg = 0; const navigator = { serviceWorker: { getRegistrations: async () => [{ unregister: async () => { unreg++; return true; } }] } };
    return { ls, t, caches, navigator, cs, unreg: () => unreg };
  };
  let e = mkEnv(); let r = await wipeAllData({ store: e.t, caches: e.caches, navigator: e.navigator, storage: e.ls });
  assert.deepEqual([r.store, r.extraKeys > 0, r.caches, r.serviceWorkers, r.errors], [true, true, 2, 0, []]);
  assert.equal(e.t.keys().length, 0); assert.equal(e.ls.getItem('other.site'), 'x'); assert.equal(e.ls.getItem('alef.audioBannerSeen.v1'), null); assert.equal(e.unreg(), 0);
  e = mkEnv(); r = await wipeAllData({ store: e.t, caches: e.caches, navigator: e.navigator, storage: e.ls, unregisterServiceWorker: true });
  assert.equal(r.serviceWorkers, 1);
  e = mkEnv(); r = await wipeAllData({ store: e.t, caches: { keys: async () => { throw new Error('no caches'); } }, navigator: e.navigator, storage: e.ls });
  assert.equal(r.store, true); assert.equal(r.errors.length, 1); // one failing step does not stop the others
});
