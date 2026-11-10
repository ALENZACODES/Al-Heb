// Proposed new test (item 35). Copy to tests/backup.refusals.test.js to use it. It adds cases the existing backup and store-safety tests do not name:
// empty, truncated and wrong-shape files are refused, and a refused restore leaves every stored key byte-for-byte unchanged.
// It does not touch a browser, so the cancelled file picker and the offline cache after "delete all" still need the manual cases in 35-backup-manual-cases.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore, createMemoryStorage } from '../src/store.js';

const mk = () => createStore({ storage: createMemoryStorage() });
function seeded() {
  const s = mk();
  s.set('settings', { voice: 'f', onboarded: true });
  s.set('curriculum.progress', { completed: ['r01'] });
  s.set('srs.cards', { 'c:alef': { due: 5, reps: 1 } });
  return s;
}
const snapshot = (s) => JSON.stringify(['settings', 'curriculum.progress', 'srs.cards'].map((k) => s.get(k)));
const good = () => seeded().exportJSON();

const BAD = {
  'empty text': '',
  'only spaces': '   \n ',
  'truncated export': good().slice(0, Math.floor(good().length / 2)),
  'a JSON array': '[1,2,3]',
  'JSON null': 'null',
  'another app': JSON.stringify({ app: 'other', schema: 1, data: { a: 1 } }),
  'data is an array': JSON.stringify({ app: 'alef', schema: 1, data: [] }),
  'schema is text': JSON.stringify({ app: 'alef', schema: 'one', data: {} }),
  'schema zero': JSON.stringify({ app: 'alef', schema: 0, data: {} }),
};

for (const [name, text] of Object.entries(BAD)) {
  test(`refused restore (${name}): preview says no, a forced import says no, and nothing stored changes`, () => {
    const s = seeded(); const before = snapshot(s);
    const info = s.previewImport(text, { mode: 'replace' });
    assert.equal(info.ok, false, 'preview must refuse');
    assert.ok(typeof info.error === 'string' && info.error.length > 0, 'a reason is given');
    const res = s.importData(text, { mode: 'replace' });
    assert.equal(res.ok, false, 'import must refuse');
    assert.equal(snapshot(s), before, 'stored data is unchanged');
  });
}

test('a valid backup previewed twice and never confirmed changes nothing (the Cancel button path)', () => {
  const s = mk(); s.set('settings', { voice: 'm' });
  const before = JSON.stringify(s.get('settings'));
  const other = good();
  assert.equal(s.previewImport(other, { mode: 'replace' }).ok, true);
  assert.equal(s.previewImport(other, { mode: 'replace' }).ok, true);
  assert.equal(JSON.stringify(s.get('settings')), before);
  assert.equal(s.get('srs.cards'), undefined);
});
