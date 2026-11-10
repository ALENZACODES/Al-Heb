// The Home Today card and the "Your week" plan must recommend the same lessons (one shared rule, src/home/nextlesson.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildToday } from '../src/home/today.js';
import { buildPlan, answerLetters } from '../src/onboarding/model.js';
import { lessonQueue } from '../src/home/nextlesson.js';

const lessons = JSON.parse(await readFile(new URL('../data/curriculum/lessons.json', import.meta.url), 'utf8')).lessons;
const plans = JSON.parse(await readFile(new URL('../data/onboarding/plans.json', import.meta.url), 'utf8'));
const hasRoute = () => true;
const lessonOf = (href) => (href.match(/lesson=([\w-]+)/) || [])[1];

for (const goal of ['read', 'israel', 'both']) {
  test(`simulated 7 days, goal ${goal}: plan day k lesson equals the Today lesson after k-1 finished lessons`, () => {
    const rec = answerLetters(null, 'none', '2026-11-09T00:00:00Z');
    const completed = [];
    // the learner finishes one lesson a day and, from day 3, keeps a few cards due; the plan is re-read each day
    for (let day = 1; day <= 7; day++) {
      const today = buildToday({ completedIds: completed, lessons, goal, hasRoute, dueCount: day > 2 ? 4 : 0, streak: { count: day - 1, best: day - 1 }, firstday: { done: true } });
      const plan = buildPlan({ record: { ...rec, minutesPerDay: 10 }, lessons, plans, hasRoute, completed, goal });
      const planned = plan.days.map((d) => d.items.find((i) => i.kind === 'lesson')?.href).filter(Boolean).map(lessonOf);
      assert.equal(planned[0], lessonOf(today.primary.href), `day ${day}: plan day 1 vs Today`);
      assert.equal(planned.length, 7, 'a lesson on every plan day');
      // and the plan's later days equal the Today card after finishing the earlier ones
      const sim = [...completed];
      for (let k = 0; k < 7; k++) {
        const t = buildToday({ completedIds: sim, lessons, goal, hasRoute, dueCount: 0, streak: { count: 1, best: 1 }, firstday: { done: true } });
        assert.equal(planned[k], lessonOf(t.primary.href), `day ${day}, plan day ${k + 1}`);
        sim.push(planned[k]);
      }
      completed.push(planned[0]);
    }
  });
}

test('lessonQueue never lists a lesson twice or one whose prerequisites are unmet in the simulated order', () => {
  const q = lessonQueue({ lessons, completed: [], goal: 'read', limit: 30 });
  const seen = new Set();
  for (const l of q) { assert.ok(!seen.has(l.id)); assert.ok((l.prerequisites || []).every((p) => seen.has(p))); seen.add(l.id); }
});
