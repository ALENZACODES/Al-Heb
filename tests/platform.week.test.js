// H6 weekly report, H7 learner-set weekly goals, J3 shareable card (drawn locally).
import test from 'node:test';
import assert from 'node:assert/strict';
import { xpThisWeek, booksThisWeek, cleanGoals, goalProgress, cardLines, drawCard, GOALS_KEY } from '../src/platform/week.js';
import { dayKey } from '../src/progress/model.js';

const now = Date.UTC(2026, 10, 12, 12), D = 86400000;

test('XP and books in the last 7 days come from the stored records', () => {
  const ret = { xp: { days: { [dayKey(now)]: 20, [dayKey(now - 6 * D)]: 5, [dayKey(now - 7 * D)]: 100 } } };
  assert.equal(xpThisWeek(ret, now), 25);
  assert.equal(xpThisWeek(null, now), 0);
  assert.equal(booksThisWeek({ b1: { finishedAt: now - D }, b2: { finishedAt: now - 9 * D }, b3: { page: 2 } }, now), 1);
});

test('goals: only offered choices are kept, progress says reached and marks minutes as a lower bound', () => {
  assert.deepEqual(cleanGoals({ xp: 100, minutes: 37, lessons: 3, other: 9 }), { xp: 100, minutes: null, lessons: 3 });
  const p = goalProgress({ xp: 100, minutes: 30, lessons: 3 }, { xp: 120, minutesAtLeast: 10, lessons: 1 });
  assert.deepEqual(p.map((x) => [x.key, x.have, x.done, x.atLeast]), [['xp', 120, true, false], ['minutes', 10, false, true], ['lessons', 1, false, false]]);
  assert.deepEqual(goalProgress({}, { xp: 1 }), []);
});

test('the share card text comes from the week and the totals; drawing uses only the 2D context', () => {
  const lines = cardLines({ to: '2026-11-12', streak: { count: 1 }, lessons: 2, xp: 1500, cardsReviewed: 1 }, { lessons: 7, books: 0 });
  assert.deepEqual(lines, ['Week ending 2026-11-12', 'Streak: 1 day', 'This week: 2 lessons, 1,500 XP, 1 card reviewed', 'Lessons finished in all: 7', 'Little books finished: 0']);
  const calls = []; const g = new Proxy({}, { get: (_, k) => (k in _ ? _[k] : (...a) => calls.push([k, ...a])), set: (o, k, v) => { o[k] = v; return true; } });
  drawCard(g, lines);
  const texts = calls.filter((c) => c[0] === 'fillText').map((c) => c[1]);
  assert.ok(lines.every((l) => texts.includes(l)));
});

test('My Week page: report, goals saved to the store, card with a text alternative', async () => {
  const { N, tick, memStore } = await import('./torahread.fakedom.js');
  const V = await import('../src/platform/week.view.js');
  const store = memStore();
  store.m['curriculum.progress'] = { completed: { r01: now - D } };
  store.m['retention.v1'] = { xp: { days: { [dayKey(now)]: 30 } } };
  const root = new N('main'); V.mount(root, { store }, () => now); await tick(5);
  assert.match(root.textContent, /1 lesson finished/);
  assert.match(root.textContent, /30 XP earned/);
  assert.match(root.textContent, /No weekly goals set/);
  const sel = root.all((n) => n.tag === 'select' && n.attrs.id === 'wk-goal-xp')[0];
  assert.ok(root.queryAll('label').some((l) => l.attrs.for === 'wk-goal-xp'));
  await sel.listeners?.change?.[0]?.({ target: { value: '50' } }) ?? sel.attrs.onchange?.({ target: { value: '50' } });
  assert.deepEqual(store.m[GOALS_KEY], { xp: 50, minutes: null, lessons: null });
  const canvas = root.all((n) => n.tag === 'canvas')[0];
  assert.match(canvas.attrs['aria-label'], /Shareable card: Week ending/);
});
