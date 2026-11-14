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

import { yearWindow, inYear, yearSummary, yearCardLines } from '../src/platform/week.js';

test('the year window is the civil year through today, and inYear uses civil days', () => {
  const now = Date.UTC(2026, 10, 13, 17);
  assert.deepEqual(yearWindow(now), { year: 2026, from: '2026-01-01', to: '2026-11-13' });
  assert.equal(inYear('2026-03-02', yearWindow(now)), true);
  assert.equal(inYear('2025-12-31', yearWindow(now)), false);
  assert.equal(inYear(Date.UTC(2026, 0, 1, 15), yearWindow(now)), true);
});

test('year in review reports only what the stores can say, including firsts and a most-played game', () => {
  const now = Date.UTC(2026, 10, 13, 17);
  const y = yearSummary({
    completed: { r01: '2026-02-08T12:00:00.000Z', r02: '2026-06-01T12:00:00.000Z', old: '2025-11-01T12:00:00.000Z' },
    books: { b1: { finishedAt: '2026-04-10T12:00:00.000Z' }, b2: { finishedAt: '2025-01-01T12:00:00.000Z' } },
    retention: { xp: { days: { '2026-02-08': 20, '2026-06-01': 15, '2025-12-31': 99 } } },
    vocab: { a: { firstReview: '2026-03-01T12:00:00.000Z' }, b: { firstReview: '2025-03-01T12:00:00.000Z' } },
    cards: { 'word:c': { reps: 1, lastReview: '2026-05-01T12:00:00.000Z' } },
    arcade: { perGame: { meltdown: { rounds: 4 }, 'letter-twins': { rounds: 9 } } },
    streak: { best: 12, count: 2 },
  }, now);
  assert.deepEqual([y.year, y.lessons, y.xp, y.books, y.words, y.wordsAtLeast, y.streakBest], [2026, 2, 35, 1, 2, true, 12]);
  assert.equal(y.firstLesson, '2026-02-08');
  assert.equal(y.firstBook, '2026-04-10');
  assert.deepEqual(y.favoriteGame, { id: 'letter-twins', title: 'Letter Twins', rounds: 9 });
  assert.equal(y.empty, false);
  const lines = yearCardLines(y);
  assert.ok(lines.includes('2026 in Aleph'));
  assert.ok(lines.includes('2 lessons finished'));
  assert.ok(lines.includes('35 XP'));
  assert.ok(lines.includes('1 little book finished'));
  assert.ok(lines.includes('At least 2 new words'));
  assert.ok(lines.includes('Best streak on this device: 12 days'));
  assert.ok(lines.includes('First lesson this year: 2026-02-08'));
  assert.ok(lines.includes('First little book this year: 2026-04-10'));
  assert.ok(lines.includes('Most-played game on this device: Letter Twins'));
  assert.ok(lines.every((l) => !/hardest|shame|AI|artificial/i.test(l)));
});

test('My Year page: year facts, share card, and a way back to My Week', async () => {
  const { N, tick, memStore } = await import('./torahread.fakedom.js');
  const V = await import('../src/platform/week.view.js');
  const store = memStore();
  store.m['curriculum.progress'] = { completed: { r01: Date.UTC(2026, 1, 8) } };
  store.m['retention.v1'] = { xp: { days: { '2026-02-08': 20 } } };
  store.m['books.v1'] = { b1: { finishedAt: Date.UTC(2026, 3, 10) } };
  store.m['games.arcade.v1'] = { perGame: { meltdown: { rounds: 3 } } };
  const root = new N('main'); V.mount(root, { store, route: 'my-year' }, () => Date.UTC(2026, 10, 13, 17)); await tick(5);
  assert.match(root.textContent, /My Year/);
  assert.match(root.textContent, /2026 on this device/);
  assert.match(root.textContent, /1 lesson finished/);
  assert.match(root.textContent, /20 XP earned/);
  assert.match(root.textContent, /1 little book finished/);
  assert.match(root.textContent, /Most-played game on this device: Meltdown/);
  assert.match(root.textContent, /Back to My Week/);
  const canvas = root.all((n) => n.tag === 'canvas')[0];
  assert.match(canvas.attrs['aria-label'], /Shareable card: 2026 in Aleph/);
});
