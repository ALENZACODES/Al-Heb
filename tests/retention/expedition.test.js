import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaults, normalize } from '../../src/retention/state.js';
import { earn } from '../../src/retention/gems.js';
import { EXPEDITION, EXPEDITION_POOL, expeditionOn, ensureExpedition, expeditionProgress, expeditionView } from '../../src/retention/quests.js';
import { unlockedBy } from '../../src/retention/xp.js';
import { T } from './_helpers.js';

const MON = T('2026-11-09T10:00'); // Monday
const fresh = (lessons = 4, now = MON) => {
  const r = defaults(now, 'install-exp');
  r.lessonsFinished = lessons;
  return r;
};

test('expeditions stay off before 4 finished lessons, and calm mode keeps them off', () => {
  assert.equal(EXPEDITION.unlockLessons, 4);
  assert.equal(EXPEDITION.length, 7);
  assert.equal(EXPEDITION.gems, 40);
  assert.deepEqual(EXPEDITION_POOL.map((x) => x.id), ['blessing', 'market']);
  assert.equal(expeditionOn(fresh(3)), false);
  assert.equal(expeditionView(fresh(3), MON).on, false);
  const r = fresh(3);
  assert.equal(ensureExpedition(r, MON).expedition, null);
  assert.equal(expeditionOn(fresh(4), { calm: true }), false);
  assert.equal(expeditionOn(fresh(4)), true);
});

test('the first journey is 7 days to your first blessing, with a 7-stop map', () => {
  const r = ensureExpedition(fresh(4), MON);
  assert.equal(r.expedition.id, 'blessing');
  assert.equal(r.expedition.start, '2026-11-09');
  const v = expeditionView(r, MON);
  assert.equal(v.on, true);
  assert.equal(v.title, '7 days to your first blessing');
  assert.equal(v.stops.length, 7);
  assert.equal(v.stops[0].day, '2026-11-09');
  assert.equal(v.stops[0].state, 'today');
  assert.equal(v.stops[5].day, '2026-11-14'); // Saturday
  assert.equal(v.stops[5].state, 'rest');
  assert.equal(v.need, 'Today: finish a lesson.');
  assert.equal(v.needCount, 6);
  assert.equal(v.doneCount, 0);
  assert.match(v.text, /Rest days are on the map/);
});

test('a blessing stop needs a finished lesson; reviews alone do not count', () => {
  let r = ensureExpedition(fresh(4), MON);
  const review = expeditionProgress(r, { review: 5 }, MON);
  assert.equal(review.done, false);
  assert.equal(review.rec.expedition.stops['2026-11-09'], undefined);
  const lesson = expeditionProgress(r, { lesson: 1 }, MON);
  assert.equal(lesson.rec.expedition.stops['2026-11-09'], 'done');
  assert.equal(expeditionView(lesson.rec, MON).stops[0].state, 'done');
  assert.equal(expeditionView(lesson.rec, MON).need, "Today's stop is done.");
});

test('a market stop can be a lesson or 5 reviews, but not 4 reviews', () => {
  const start = ensureExpedition(fresh(4), MON);
  start.expedition.id = 'market';
  start.expedition.finished = ['blessing'];
  assert.equal(expeditionProgress(start, { review: 4 }, MON).rec.expedition.stops['2026-11-09'], undefined);
  const reviews = expeditionProgress(start, { review: 5 }, MON);
  assert.equal(reviews.rec.expedition.stops['2026-11-09'], 'done');
  const byLesson = expeditionProgress(start, { lesson: 1 }, MON);
  assert.equal(byLesson.rec.expedition.stops['2026-11-09'], 'done');
});

test('a missed weekday is marked as not this day, with no scolding and no gems taken', () => {
  let r = ensureExpedition(fresh(4), MON);
  r = expeditionProgress(r, { lesson: 1 }, MON).rec; // Monday done
  const wed = T('2026-11-11T10:00');
  const v = expeditionView(r, wed);
  const tue = v.stops.find((s) => s.day === '2026-11-10');
  assert.equal(tue.state, 'miss');
  assert.equal(v.need, 'Today: finish a lesson.');
  assert.doesNotMatch(v.need + v.text + v.title, /fail|broke|missed|forgot|behind|late/i);
  assert.equal(r.gems.balance, 0);
});

test('finishing every study day pays 40 gems once, and a rest day is not required', () => {
  let r = earn(fresh(4), 10, 'goal', MON);
  const days = ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-15'];
  let last = null;
  for (const d of days) {
    const t = T(`${d}T10:00`);
    last = expeditionProgress(r, { lesson: 1 }, t);
    r = last.rec;
  }
  assert.equal(last.done, true);
  assert.equal(last.gems, 40);
  assert.equal(last.title, '7 days to your first blessing');
  assert.equal(r.expedition.paid, true);
  assert.deepEqual(r.expedition.finished, ['blessing']);
  assert.equal(r.gems.balance, 10 + 40);
  assert.match(expeditionView(r, T('2026-11-15T10:00')).need, /Journey complete/);
  const again = expeditionProgress(r, { lesson: 1 }, T('2026-11-15T12:00'));
  assert.equal(again.done, false);
  assert.equal(again.rec.gems.balance, 50);
});

test('after the seven days end, a new journey starts: a week in the market', () => {
  let r = fresh(4);
  r.expedition = { id: 'blessing', start: '2026-11-02', stops: {}, review: 0, reviewDay: null, paid: true, finished: ['blessing'] };
  const nextMon = T('2026-11-09T10:00');
  r = ensureExpedition(r, nextMon);
  assert.equal(r.expedition.id, 'market');
  assert.equal(r.expedition.start, '2026-11-09');
  assert.equal(r.expedition.paid, false);
  assert.deepEqual(r.expedition.finished, ['blessing']);
  assert.equal(expeditionView(r, nextMon).title, 'A week in the market');
  assert.match(expeditionView(r, nextMon).need, /lesson or review 5/);
});

test('normalize keeps a well-formed expedition and drops unknown ids and stop states', () => {
  const r = normalize({
    v: 1,
    expedition: { id: 'neon', start: '2026-11-09', stops: { '2026-11-09': 'done', '2026-11-10': 'boom', 'bad': 'done' }, paid: true, finished: ['blessing', 'secret'], review: 3, reviewDay: '2026-11-09' },
  }, MON);
  assert.equal(r.expedition.id, 'blessing');
  assert.deepEqual(r.expedition.stops, { '2026-11-09': 'done' });
  assert.equal(r.expedition.paid, true);
  assert.deepEqual(r.expedition.finished, ['blessing']);
});

test('unlockedBy announces expeditions at 4 finished lessons', () => {
  const r = fresh(6);
  assert.deepEqual(unlockedBy(r, 3, 4), ['expeditions']);
  assert.deepEqual(unlockedBy(r, 1, 2), ['quests']);
});
