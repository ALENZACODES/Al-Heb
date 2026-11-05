// Course map: syllabus + time budget are derived from data/curriculum/lessons.json.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { syllabus, timeTotals, budget, toMarkdown, DEFAULT_RANGE, levelName } from '../src/coursemap/model.js';
import { N, tick, btn, memStore } from './torahread.fakedom.js';

const rd = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const LESSONS = JSON.parse(rd('data/curriculum/lessons.json')).lessons;
const mk = (id, track, level, estMinutes, goals = ['g']) => ({ id, track, level, title: 't' + id, estMinutes, goals });

test('syllabus: every lesson appears exactly once, grouped by track and ordered by belt; goals are copied verbatim', () => {
  const s = syllabus(LESSONS), ids = s.flatMap((t) => t.levels.flatMap((l) => l.lessons.map((x) => x.id)));
  assert.equal(ids.length, LESSONS.length); assert.equal(new Set(ids).size, LESSONS.length);
  const first = s.find((t) => t.track === 'read').levels.map((l) => l.level);
  assert.deepEqual(first.slice(0, 3), ['white', 'yellow', 'orange']);
  const r01 = s.flatMap((t) => t.levels.flatMap((l) => l.lessons)).find((x) => x.id === 'r01');
  assert.deepEqual(r01.goals, LESSONS.find((l) => l.id === 'r01').goals);
  assert.ok(s.every((t) => t.label && t.levels.every((l) => l.label && l.minutes >= 0)));
});
test('timeTotals: sums estMinutes, counts only known completed ids, ignores lessons without minutes', () => {
  const ls = [mk('a', 'read', 'white', 20), mk('b', 'read', 'white', 30), mk('c', 'read', 'white', undefined)];
  const t = timeTotals(ls, { a: 1, zzz: 2 });
  assert.deepEqual(t, { lessons: 3, doneLessons: 1, totalMinutes: 50, doneMinutes: 20, remainingMinutes: 30 });
  assert.equal(timeTotals(ls).doneLessons, 0); assert.equal(timeTotals(ls, null).doneMinutes, 0);
  const all = timeTotals(LESSONS); assert.equal(all.lessons, 125); assert.equal(all.totalMinutes, LESSONS.reduce((a, l) => a + l.estMinutes, 0));
});
test('budget: arithmetic on the range, never negative, weeks only when hours per week is given; bad range throws', () => {
  const t = { lessons: 1, doneLessons: 0, totalMinutes: 6000, doneMinutes: 1200, remainingMinutes: 4800 };
  const b = budget(t, { low: 400, high: 600 }, 5);
  assert.equal(b.lessonHours, 100); assert.equal(b.doneHours, 20); assert.equal(b.lessonShareOfLow, 25); assert.equal(b.lessonShareOfHigh, 17);
  assert.equal(b.gapHoursLow, 300); assert.equal(b.gapHoursHigh, 500); assert.equal(b.weeksLow, 76); assert.equal(b.weeksHigh, 116);
  assert.equal(budget(t).weeksLow, undefined);
  assert.equal(budget({ ...t, totalMinutes: 60000 }, { low: 400, high: 600 }).gapHoursLow, 0);
  assert.throws(() => budget(t, { low: 0, high: 5 })); assert.throws(() => budget(t, { low: 9, high: 5 }));
  const real = budget(timeTotals(LESSONS)); assert.equal(real.lessonHours, 55.4); assert.ok(real.lessonShareOfLow < 20, 'the written lessons are a small part of the range');
  assert.deepEqual(DEFAULT_RANGE, { low: 400, high: 600 });
});
test('levelName: belts get "belt", israel codes use course-stage names', () => { assert.equal(levelName('white'), 'White belt'); assert.equal(levelName('A2'), 'Stage 2'); assert.equal(levelName('A1'), 'Stage 1'); assert.equal(levelName('B1'), 'Stage 3'); assert.equal(levelName('intermediate'), 'Intermediate'); });
test('docs/curriculum/SYLLABUS.md equals the generator output (stale file fails; fix with node tools/syllabus/build.mjs)', () => {
  assert.equal(rd('docs/curriculum/SYLLABUS.md'), toMarkdown(LESSONS) + '\n');
  const r = spawnSync('node', ['tools/syllabus/build.mjs', '--check'], { cwd: new URL('..', import.meta.url).pathname, encoding: 'utf8' }); assert.equal(r.status, 0, r.stderr);
});
test('syllabus view lists every lesson once with its goals and marks Hebrew runs lang=he', async () => {
  const V = await import('../src/coursemap/syllabus.view.js');
  const root = new N('main'), un = V.mount(root, { lessonsData: LESSONS }); await tick();
  assert.match(root.queryAll('[role="status"]')[0].textContent, /^125 lessons listed/);
  assert.equal(root.queryAll('strong').length, 125);
  assert.equal(root.queryAll('h1').length, 1); assert.ok(root.queryAll('h2').length >= 2);
  const he = root.all((n) => /[֐-׿]/.test(n.children.filter((c) => c.nodeType === 3).map((c) => c.data).join('')));
  const inData = LESSONS.flatMap((l) => [l.title, ...l.goals]).filter((g) => /[\u0590-\u05FF]/.test(g)).length;
  assert.ok(he.length >= inData && inData > 0, `${he.length} Hebrew nodes for ${inData} strings`); for (const n of he) assert.ok(n.attrs.lang === 'he' && n.attrs.dir === 'rtl');
  un();
});
test('time budget view: meter follows completed lessons from the store, hours choice updates the weeks, store is only read', async () => {
  const V = await import('../src/coursemap/timebudget.view.js');
  const store = memStore(); store.m['curriculum.progress'] = { completed: { r01: 1, r02: 2 } }; const before = JSON.stringify(store.m);
  const root = new N('main'), un = V.mount(root, { lessonsData: LESSONS, store }); await tick();
  assert.match(root.textContent, /2 of 125 lessons completed, about 0\.7 of 55\.4 hours \(1%\)/);
  assert.match(root.textContent, /400 to 600 hours/); assert.match(root.textContent, /unverified/);
  const m = root.queryAll('progress')[0]; assert.equal(m.attrs.value, '1'); assert.match(m.attrs['aria-label'], /1 percent/);
  const w5 = root.textContent.match(/At 5 hours a week.*?(\d+) to (\d+) weeks/); assert.ok(w5);
  await btn(root, /^10 hours/).click(); const w10 = root.textContent.match(/At 10 hours a week.*?(\d+) to (\d+) weeks/); assert.ok(w10 && Number(w10[1]) < Number(w5[1]));
  assert.equal(JSON.stringify(store.m), before); un();
});
test('time budget view with no progress store still renders (0 completed)', async () => {
  const V = await import('../src/coursemap/timebudget.view.js'); const root = new N('main'), un = V.mount(root, { lessonsData: LESSONS }); await tick();
  assert.match(root.textContent, /0 of 125 lessons completed/); un();
});
