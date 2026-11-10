// Corpus API for the Read screen's Torah-service guide and per-prayer metadata (round 4).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCorpus, createCorpus } from '../src/corpus/corpus.js';

const c = await loadCorpus();

test('guide(): 13 ordered sections, every linked prayer and gap resolves through the API the view uses', () => {
  const g = c.guide();
  assert.ok(g && g.sections.length === 13);
  assert.deepEqual(g.sections.map((s) => s.order), g.sections.map((_, i) => i + 1));
  for (const s of g.sections) {
    for (const p of s.prayers) assert.ok(c.getText(p.id), `${s.id}: ${p.id}`);
    for (const id of s.gaps || []) assert.ok(c.gap(id)?.name, `${s.id}: gap ${id}`);
  }
  for (const o of g.otherOccasions) for (const id of o.prayers) assert.ok(c.getText(id), `${o.id}: ${id}`);
});

test('prayerMeta(): present for every registry record, by id or alias; null for unknown ids', () => {
  for (const t of c.allTexts()) assert.ok(c.prayerMeta(t.id), t.id);
  assert.equal(c.prayerMeta('no-such-prayer'), null);
  assert.equal(c.prayerMeta('ein-kamocha')?.clergyReviewed, false);
});

test('createCorpus without extras: guide() is null, prayerMeta() null, gap() null (reader degrades, does not throw)', () => {
  const x = createCorpus({ entries: [{ id: 'a' }] }, { entries: [] });
  assert.equal(x.guide(), null); assert.equal(x.prayerMeta('a'), null); assert.equal(x.gap('g'), null);
});

test('all added liturgy is unproofread; nothing is typed from memory', () => {
  const t = c.allTexts();
  assert.ok(t.every((r) => r.proofread === false));
  assert.ok(t.every((r) => r.typedFromMemory === false));
});
