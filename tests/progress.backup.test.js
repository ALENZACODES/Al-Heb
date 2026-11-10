import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore, createMemoryStorage } from '../src/store.js';
import { KEYS } from '../src/progress/model.js';
import { PROGRESS_KEYS, canonicalJSON, checksum, dataChecksum, exportProgress, exportProgressJSON, progressFileName, inspectProgressBackup, importProgress } from '../src/progress/store.js';

const fake = () => createStore({ storage: createMemoryStorage() });
const T = new Date('2026-11-10T12:00:00Z').getTime();
const seeded = () => {
  const st = fake();
  st.set('curriculum.progress', { completed: { r01: T, r02: T } });
  st.set('srs.cards', { 'letter:bet': { id: 'letter:bet', state: 'review', stability: 30, reps: 4, lapses: 1, lastReview: T } });
  st.set('timedread.v1', { v: 1, reads: [{ textId: 'shema-1', lineId: 'shema-1', words: 12, ms: 8000, stumbled: 0, stumbledIdx: [], at: T }] });
  st.set('firstday.ladder', { n: 3, answers: { 13: true }, hinted: {} });
  st.set('progress.state', { rest: ['2026-11-09'], goal: { kind: 'cards', target: 20 } });
  st.set('settings', { onboarded: true, goal: 'read' }); // not a progress key: never exported
  st.set('service.prefs', { order: 'friday-night' });
  return st;
};

test('PROGRESS_KEYS is exactly the set of keys Progress reads', () => {
  assert.deepEqual(PROGRESS_KEYS, [...new Set(Object.values(KEYS))].sort());
  assert.ok(PROGRESS_KEYS.includes('timedread.v1') && PROGRESS_KEYS.includes('firstday.progress') && PROGRESS_KEYS.includes('firstday.ladder') && PROGRESS_KEYS.includes('progress.state'));
  assert.ok(!PROGRESS_KEYS.includes('settings'));
});
test('canonicalJSON sorts keys at every level and is stable under key order; checksum changes with the data', () => {
  assert.equal(canonicalJSON({ b: 1, a: { d: [1, { z: 0, y: null }], c: 'x' } }), '{"a":{"c":"x","d":[1,{"y":null,"z":0}]},"b":1}');
  assert.equal(canonicalJSON({ a: undefined, b: [undefined] }), '{"b":[null]}');
  assert.equal(dataChecksum({ a: 1, b: 2 }), dataChecksum({ b: 2, a: 1 }));
  assert.notEqual(dataChecksum({ a: 1 }), dataChecksum({ a: 2 }));
  assert.match(checksum(''), /^fnv1a-[0-9a-f]{16}$/);
  assert.equal(checksum('abc'), checksum('abc')); assert.notEqual(checksum('abc'), checksum('abd'));
  assert.notEqual(checksum('שָׁלוֹם'), checksum('שלום'));
});
test('export carries only progress keys that exist, a sorted key list, the date and a matching checksum', () => {
  const e = exportProgress(seeded(), T);
  assert.equal(e.app, 'alef'); assert.equal(e.kind, 'alef-progress'); assert.equal(e.schema, 1); assert.equal(e.exportedAt, '2026-11-10T12:00:00.000Z');
  assert.deepEqual(e.keys, ['curriculum.progress', 'firstday.ladder', 'progress.state', 'service.prefs', 'srs.cards', 'timedread.v1']);
  assert.ok(!('settings' in e.data));
  assert.equal(e.checksum, dataChecksum(e.data));
  assert.equal(progressFileName(T), 'alef-progress-2026-11-10.json');
  const j = JSON.parse(exportProgressJSON(seeded(), T));
  assert.deepEqual(j.keys, e.keys); assert.equal(j.checksum, e.checksum);
  assert.deepEqual(exportProgress(fake(), T).keys, []);
  assert.doesNotThrow(() => exportProgress({ get() { throw new Error('x'); } }, T));
});
test('export then import into an empty store round-trips every progress key, byte for byte', () => {
  const text = exportProgressJSON(seeded(), T);
  const dst = fake();
  const r = importProgress(dst, text);
  assert.deepEqual(r, { ok: true, imported: 6, removed: 0, ignored: [] });
  for (const k of PROGRESS_KEYS) assert.deepEqual(dst.get(k, null), seeded().get(k, null), k);
  assert.equal(dst.get('settings', null), null);
  assert.equal(exportProgress(dst, T).checksum, JSON.parse(text).checksum, 'same data, same checksum after import');
});
test('a tampered, truncated or wrong-kind file is refused and nothing is written', () => {
  const src = seeded(), text = exportProgressJSON(src, T);
  const dst = fake(); dst.set('progress.state', { rest: [], goal: { kind: 'cards', target: 5 } });
  const before = JSON.stringify(dst.exportData().data);
  const tampered = text.replace('"target": 20', '"target": 99');
  assert.notEqual(tampered, text);
  let r = importProgress(dst, tampered); assert.equal(r.ok, false); assert.match(r.error, /checksum does not match/);
  r = importProgress(dst, text.slice(0, text.length - 40)); assert.equal(r.ok, false); assert.match(r.error, /not valid JSON/);
  r = importProgress(dst, src.exportJSON()); assert.equal(r.ok, false); assert.match(r.error, /whole-app backup.*Settings/);
  r = importProgress(dst, '[1,2]'); assert.equal(r.ok, false);
  r = importProgress(dst, { app: 'alef', kind: 'alef-progress', schema: 2, data: {}, checksum: dataChecksum({}) }); assert.match(r.error, /newer Aleph/);
  r = importProgress(dst, { app: 'alef', kind: 'alef-progress', schema: 1, data: {} }); assert.match(r.error, /no checksum/);
  r = importProgress(dst, { app: 'alef', kind: 'alef-progress', schema: 1, checksum: 'x' }); assert.match(r.error, /no data block/);
  r = importProgress(dst, { app: 'alef', kind: 'alef-progress', data: {}, checksum: dataChecksum({}) }); assert.match(r.error, /no version/);
  assert.equal(JSON.stringify(dst.exportData().data), before, 'nothing written');
});
test('replace clears progress keys absent from the file; merge keeps them; keys outside the progress set are ignored either way', () => {
  const file = { app: 'alef', kind: 'alef-progress', schema: 1, data: { 'progress.state': { rest: ['2026-11-01'], goal: null }, settings: { onboarded: false }, 'srs.cards': {} } };
  file.checksum = dataChecksum(file.data);
  const ins = inspectProgressBackup(file);
  assert.equal(ins.ok, true); assert.deepEqual(ins.keys, ['progress.state', 'srs.cards']); assert.deepEqual(ins.ignored, ['settings']);
  const a = seeded(); let r = importProgress(a, file);
  assert.deepEqual(r, { ok: true, imported: 2, removed: 4, ignored: ['settings'] });
  assert.equal(a.get('timedread.v1', null), null); assert.equal(a.get('firstday.ladder', null), null);
  assert.deepEqual(a.get('settings'), { onboarded: true, goal: 'read' }, 'settings untouched');
  assert.deepEqual(a.get('progress.state').rest, ['2026-11-01']);
  const b = seeded(); r = importProgress(b, JSON.stringify(file), { mode: 'merge' });
  assert.deepEqual(r, { ok: true, imported: 2, removed: 0, ignored: ['settings'] });
  assert.equal(b.get('timedread.v1').reads.length, 1); assert.deepEqual(b.get('srs.cards'), {});
  const c = { m: {}, get: (k, d) => (k in c.m ? c.m[k] : d), set: (k, v) => { c.m[k] = v; } }; // store without remove(): replace still imports
  assert.equal(importProgress(c, file).ok, true);
});
test('inspect never writes and reports the export date', () => {
  const st = fake(); const text = exportProgressJSON(seeded(), T);
  const r = inspectProgressBackup(text);
  assert.equal(r.ok, true); assert.equal(r.exportedAt, '2026-11-10T12:00:00.000Z'); assert.equal(r.schema, 1);
  assert.deepEqual(st.keys(), []);
  assert.equal(inspectProgressBackup('').ok, false); assert.equal(inspectProgressBackup(null).ok, false); assert.equal(inspectProgressBackup({ app: 'other' }).ok, false);
});
