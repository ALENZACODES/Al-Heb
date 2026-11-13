import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { planHolds, reasonFor, SWEEP_TAG } from '../tools/vocab/hold_examples.mjs';

// The example sweep (docs/vocab/EXAMPLE-SWEEP.md): an example is taken off an entry, never rewritten, and nothing else on the entry moves.
const read = (rel) => JSON.parse(fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8'));
const words = read('data/vocab/words.json').words;
const spec = read('data/vocab/corrections.json');
const held = spec.corrections.filter((c) => String(c.reason).includes(`(${SWEEP_TAG})`));

test('a hold is planned only for a "hold" row whose example is still the one that was read', () => {
  const list = [{ id: 'a', he: 'חוד', example: { he: 'x', match: 'חוֹד' } }, { id: 'b', he: 'בית', example: { he: 'y', match: 'בית' } }, { id: 'c', he: 'גן' }, { id: 'd', he: 'דג', example: { he: 'z', match: 'דגים' } }];
  const sweep = { rows: [
    { id: 'a', verdict: 'hold', why: 'same-letters-other-part-of-speech', match: 'חוד', modelPos: 'NOUN', pos: 'verb' },
    { id: 'b', verdict: 'keep', why: 'same-word', match: 'בית' },
    { id: 'c', verdict: 'hold', why: 'other-word', match: 'גן', modelLemma: 'הגן' },
    { id: 'd', verdict: 'hold', why: 'other-word', match: 'דג', modelLemma: 'דאג' },
    { id: 'e', verdict: 'hold', why: 'used-as-a-name', match: 'מג' },
  ] };
  const { added, skipped } = planHolds(sweep, list, []);
  assert.deepEqual(added.map((c) => c.id), ['a']);
  assert.deepEqual(added[0], { id: 'a', field: 'example', old: list[0].example, new: null, reason: reasonFor(sweep.rows[0]) });
  assert.deepEqual(skipped.map((s) => s.id), ['c', 'd', 'e']);
  assert.equal(planHolds(sweep, list, [{ id: 'a', field: 'example' }]).added.length, 0, 'an entry with an example correction is left alone');
});

test('reasons are plain sentences that say what was read', () => {
  assert.match(reasonFor({ why: 'used-as-a-name', match: 'מג' }), /^in this sentence "מג" is a name, not this word\. Held, not replaced/);
  assert.match(reasonFor({ why: 'other-word', match: 'יפנים', modelLemma: 'יפני' }), /read as another word \(dictionary form יפני\)/);
  assert.match(reasonFor({ why: 'same-letters-other-part-of-speech', match: 'חוד', modelPos: 'NOUN', pos: 'verb' }), /is read as a noun; this entry is a verb\./);
});

test('every held example is off its entry, kept whole in corrections.json, and replaced by nothing', () => {
  assert.equal(held.length, spec.exampleSweep.held);
  assert.ok(held.length > 1000);
  const byId = new Map(words.map((w) => [w.id, w]));
  for (const c of held) {
    assert.equal(c.field, 'example', c.id);
    assert.equal(c.new, null, c.id);
    assert.ok(c.old && c.old.he && c.old.source, c.id);
    assert.ok(byId.has(c.id), c.id);
    assert.equal(byId.get(c.id).example ?? null, null, `${c.id} still shows an example`);
  }
  assert.equal(new Set(held.map((c) => c.id)).size, held.length, 'one hold per entry');
});

test('the sweep added example holds only: no pointing, gloss, part of speech, gender, forms or root changes', () => {
  const sweepStart = spec.corrections.indexOf(held[0]);
  for (const c of spec.corrections.slice(sweepStart)) assert.equal(c.field, 'example', `${c.id} ${c.field}`);
});
