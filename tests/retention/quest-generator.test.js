import './_helpers.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { T } from './_helpers.js';
import { defaults } from '../../src/retention/state.js';
import { POOL, dailyQuests, generateQuests, questRung, ensureQuests, questView, questText } from '../../src/retention/quests.js';

const NOW = T('2026-11-10T19:00');
const rec = (o = {}) => Object.assign(defaults(T('2026-11-01T10:00'), 'install-1'), { lessonsFinished: 4 }, o);

test('dailyQuests is unchanged: same three all day, Earn XP first, targets from the original lists', () => {
  const a = dailyQuests('install-1', '2026-11-10');
  assert.deepEqual(a, dailyQuests('install-1', '2026-11-10'));
  assert.equal(a.length, 3); assert.equal(a[0].id, 'xp');
  for (const q of a) assert.ok(POOL.find((p) => p.id === q.id).targets.includes(q.n));
});

test('generateQuests is deterministic, keeps Earn XP first, and uses three different kinds', () => {
  const a = generateQuests(rec(), '2026-11-10');
  assert.deepEqual(a, generateQuests(rec(), '2026-11-10'));
  assert.equal(a.length, 3); assert.equal(a[0].id, 'xp');
  assert.equal(new Set(a.map((q) => q.id)).size, 3);
  for (const q of a) {
    const p = POOL.find((x) => x.id === q.id);
    assert.ok((p.ladder || p.targets).includes(q.n));
  }
});

test('targets step up as the learner finishes more lessons', () => {
  assert.equal(questRung(POOL[0], { lessons: 2 }), 15);
  assert.equal(questRung(POOL[0], { lessons: 8 }), 20);
  assert.equal(questRung(POOL[0], { lessons: 20 }), 30);
  const early = generateQuests(rec({ lessonsFinished: 3 }), '2026-11-10');
  const later = generateQuests(rec({ lessonsFinished: 24 }), '2026-11-10');
  assert.equal(early[0].id, 'xp'); assert.equal(later[0].id, 'xp');
  assert.ok(later[0].n >= early[0].n);
  assert.equal(early[0].n, 15);
  assert.equal(later[0].n, 30);
});

test('a quest finished yesterday can raise today\'s target for the same kind, and variety prefers a different pair', () => {
  const sharp = POOL.find((q) => q.id === 'sharp');
  assert.equal(questRung(sharp, { lessons: 4 }), 1);
  assert.equal(questRung(sharp, { lessons: 4, chained: true }), 2);
  assert.equal(questText({ id: 'sharp', n: 2 }), 'Finish 2 lessons with 90% or better');
  const today = generateQuests(rec({ lessonsFinished: 4 }), '2026-11-11', { yesterday: ['sharp', 'review'] });
  assert.equal(today[0].id, 'xp');
  const ids = today.slice(1).map((q) => q.id);
  assert.ok(!ids.includes('sharp') || today.find((q) => q.id === 'sharp').n === 2);
  assert.ok(!ids.includes('review') || today.find((q) => q.id === 'review').n >= 10);
  // With two finished yesterday and four other non-xp kinds, both of today's companions should be new.
  assert.ok(ids.every((id) => id !== 'sharp' && id !== 'review'), 'variety skips yesterday when it can');
});

test('ensureQuests uses the generator: a new day chains from yesterday\'s finished quests', () => {
  let r = rec({ lessonsFinished: 9 });
  r = ensureQuests(r, NOW);
  assert.equal(r.quests.items.length, 3);
  assert.equal(r.quests.items[0].id, 'xp');
  assert.equal(r.quests.items[0].n, 20);
  r.quests.items = r.quests.items.map((it, i) => (i === 0 ? it : { ...it, paid: true }));
  const next = ensureQuests(r, T('2026-11-11T19:00'));
  const yids = r.quests.items.filter((i) => i.paid).map((i) => i.id);
  const nids = next.quests.items.map((i) => i.id);
  assert.equal(next.quests.day, '2026-11-11');
  assert.equal(next.quests.items[0].n, 20);
  assert.ok(nids.slice(1).every((id) => !yids.includes(id)) || nids.slice(1).some((id) => yids.includes(id) && next.quests.items.find((i) => i.id === id).n > questRung(POOL.find((p) => p.id === id), { lessons: 9 })));
  const rest = questView(rec(), T('2026-11-14T12:00'));
  assert.equal(rest.rest, true);
  assert.equal(rest.items.length, 0);
});
