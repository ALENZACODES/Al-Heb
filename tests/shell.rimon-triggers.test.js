// Rimon trigger map (src/shell/rimon-triggers.js): pure logic with fixed dates and records.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TRIGGERS, QUIET_DAYS, QUIET_ROUTES, stillPath, holidaysOn, dayContext, seasonTrigger, dateTrigger, greetingCandidates,
  routeTrigger, routeParams, createAnswerTracker, ANSWER_WINDOW_MS, streakChangeTrigger, labChangeTrigger, labStreak,
  booksChangeTrigger, awardsChangeTrigger, lessonsChangeTrigger, breakTrigger, pickStill, alreadySeen, presentSet, lineFor, crossed, presentFiles } from '../src/shell/rimon-triggers.js';
import { STILL_IDS } from '../src/shell/rimon-stills.generated.js';
import { candleLighting, havdalah, parseISO, fromHebrew, isoDate } from '../src/curriculum/calendar.js';

const all = (ids = STILL_IDS) => new Set(Object.values(ids).flat());
const TORONTO = { lat: 43.6532, lon: -79.3832 };

test('still paths are data/images/rimon/rimon-NNN.webp', () => {
  const files = presentFiles({ files: { a007: 'v2/rimon-007-starting-line', a008: '../../etc/passwd', b001: 'v2/rimon-001-x' } });
  assert.deepEqual(files, { a007: 'v2/rimon-007-starting-line' }, 'only well-formed catalogue entries are kept');
  assert.equal(stillPath('a007', files), 'data/images/rimon/v2/rimon-007-starting-line.webp');
  assert.equal(stillPath('a007'), 'data/images/rimon/rimon-a007.webp', 'no file name listed: a plain name that is never present');
  assert.equal(stillPath('a999', files), 'data/images/rimon/rimon-a999.webp');
  assert.equal(stillPath('025b'), 'data/images/rimon/rimon-025b.webp');
});

test('festival days from the app calendar, plus Rosh Chodesh, Lag BaOmer, Tu B\'Av and festival eves', () => {
  assert.deepEqual(holidaysOn('2026-11-10'), ['rosh-chodesh']); // Rosh Chodesh Kislev 5787
  assert.deepEqual(holidaysOn('2026-12-05'), ['hanukkah']);
  assert.deepEqual(holidaysOn('2027-03-23'), ['purim']);
  assert.deepEqual(holidaysOn('2027-04-21'), ['erev-festival']); // the day before Pesach
  assert.deepEqual(holidaysOn(isoDate(fromHebrew({ year: 5787, month: 'iyar', day: 18 }))), ['lag-baomer']);
  assert.deepEqual(holidaysOn(isoDate(fromHebrew({ year: 5787, month: 'av', day: 15 }))), ['tu-bav']);
  assert.deepEqual(holidaysOn('2026-11-13'), []);
});

test('quiet days: Yom HaShoah, Yom HaZikaron and Tisha B\'Av; prayer and Torah screens are quiet routes', () => {
  assert.deepEqual([...QUIET_DAYS].sort(), ['tisha-bav', 'yom-hashoah', 'yom-hazikaron']);
  assert.equal(dayContext(new Date(2027, 4, 4, 12)).quiet, true); // Yom HaShoah 5787
  assert.equal(dayContext(new Date(2027, 4, 11, 12)).quiet, true); // Yom HaZikaron
  assert.equal(dayContext(new Date(2027, 7, 12, 12)).quiet, true); // Tisha B'Av
  assert.equal(dayContext(new Date(2027, 4, 12, 12)).quiet, false); // Yom HaAtzmaut is a celebration
  for (const r of ['torahread', 'service', 'morning', 'trope']) assert.ok(QUIET_ROUTES.includes(r));
  for (const r of QUIET_ROUTES) assert.equal(routeTrigger(r, dayContext(new Date(2026, 10, 10, 12))), null, r);
});

test('Shabbat states without a location: erev Friday daytime, evening from 6 pm, day on Saturday, havdalah from 8 pm', () => {
  assert.equal(dayContext(new Date(2026, 10, 13, 9)).shabbat, null);
  assert.equal(dayContext(new Date(2026, 10, 13, 12)).shabbat, 'erev');
  assert.equal(dayContext(new Date(2026, 10, 13, 19)).shabbat, 'evening');
  assert.equal(dayContext(new Date(2026, 10, 14, 13)).shabbat, 'day');
  assert.equal(dayContext(new Date(2026, 10, 14, 21)).shabbat, 'havdalah');
  assert.equal(dayContext(new Date(2026, 10, 15, 9)).shabbat, null);
});

test('Shabbat states with a location follow candle lighting and havdalah', () => {
  const c = candleLighting(parseISO('2026-11-13'), TORONTO).candles.getTime();
  assert.equal(dayContext(new Date(c - 60000), { loc: TORONTO }).shabbat, 'erev');
  assert.equal(dayContext(new Date(c + 60000), { loc: TORONTO }).shabbat, 'evening');
  const hv = havdalah(parseISO('2026-11-14'), TORONTO).havdalah.getTime();
  assert.equal(dayContext(new Date(hv - 60000), { loc: TORONTO }).shabbat, 'day');
  assert.equal(dayContext(new Date(hv + 60000), { loc: TORONTO }).shabbat, 'havdalah');
});

test('season and day pages pick the festival, else Shabbat', () => {
  assert.equal(seasonTrigger(dayContext(new Date(2026, 11, 7, 12))), 'holiday.hanukkah');
  assert.equal(seasonTrigger(dayContext(new Date(2026, 10, 14, 12))), 'shabbat.day');
  assert.equal(seasonTrigger(dayContext(new Date(2026, 10, 12, 12))), null); // an ordinary Thursday (Rosh Chodesh Kislev is the 10th and 11th)
  assert.equal(dateTrigger('2027-03-23'), 'holiday.purim');
  assert.equal(dateTrigger('2026-11-14'), 'shabbat.day');
  assert.equal(dateTrigger('2026-11-12'), null);
  assert.equal(dateTrigger('not-a-date'), null);
});

test('screens map to their still; params come from the hash', () => {
  const ctx = dayContext(new Date(2026, 10, 12, 12));
  assert.deepEqual(routeParams('labgame', '#/lab/hunt'), { game: 'hunt' });
  assert.equal(routeTrigger('labgame', ctx, {}, '#/lab/hunt'), 'lab.drill.hunt');
  assert.equal(routeTrigger('labgame', ctx, {}, '#/lab/nope'), 'lab.home');
  assert.equal(routeTrigger('awards', ctx, { badges: 0 }), 'awards.empty');
  assert.equal(routeTrigger('awards', ctx, { badges: 3 }), 'awards.gallery');
  assert.equal(routeTrigger('festival', ctx, {}, '#/festivals/purim'), 'holiday.purim');
  assert.equal(routeTrigger('day', ctx, {}, '#/day/2026-12-05'), 'holiday.hanukkah');
  assert.equal(routeTrigger('progress', dayContext(new Date(2026, 10, 14, 12))), 'shabbat.rest');
  assert.equal(routeTrigger('progress', ctx), 'progress.home');
  assert.equal(routeTrigger('calendar', ctx), 'calendar.home');
  assert.equal(routeTrigger('home', ctx), null);
  assert.equal(routeTrigger('nosuchroute', ctx), null);
});

test('Home greeting order: first visit, back after a week, festival, streak worries, then time of day', () => {
  const fri = dayContext(new Date(2026, 10, 13, 19)), tue = dayContext(new Date(2026, 10, 10, 20)), wed = dayContext(new Date(2026, 10, 12, 8));
  assert.deepEqual(greetingCandidates(wed, { firstVisit: true }).slice(0, 1), ['greet.first']);
  assert.equal(greetingCandidates(wed, { daysAway: 9 })[0], 'greet.back');
  assert.equal(greetingCandidates(fri, {})[0], 'shabbat.evening');
  assert.equal(greetingCandidates(tue, {})[0], 'holiday.rosh-chodesh');
  const atRisk = greetingCandidates(dayContext(new Date(2026, 10, 12, 20)), { streak: { count: 4, activeToday: false, restToday: false } });
  assert.deepEqual(atRisk, ['streak.atrisk', 'greet.evening']);
  assert.deepEqual(greetingCandidates(wed, {}), ['greet.morning']);
  assert.equal(greetingCandidates(dayContext(new Date(2026, 10, 15, 9)), {})[0], 'greet.week'); // Sunday morning
  const lost = greetingCandidates(wed, { streak: { count: 0, broken: true, best: 5 } });
  assert.equal(lost[0], 'streak.lost');
});

test('answer tracker: echoes of one answer count once; runs of right and wrong answers pick the still', () => {
  const tr = createAnswerTracker(); let t = 0;
  const one = (...actions) => { const out = []; for (const a of actions) { const r = tr.feed(a, t); if (r) out.push(r); t += 5; } t += 1000; return out; };
  // the session, the sound effect and the exercise all report the same answer
  one('correct', 'bounce'); assert.equal(tr.flush(), 'answer.correct');
  one('correct', 'bounce'); assert.equal(tr.flush(), 'answer.correct');
  one('correct', 'wink'); assert.equal(tr.flush(), 'answer.correct.streak3');
  one('bounce'); tr.flush(); one('highfive', 'correct'); assert.equal(tr.flush(), 'answer.correct.streak5');
  one('wrong', 'sad'); assert.equal(tr.flush(), 'answer.wrong');
  one('sad'); assert.equal(tr.flush(), 'answer.wrong.repeat');
  one('wrong'); assert.equal(tr.flush(), 'answer.wrong.many');
  one('correct'); assert.equal(tr.flush(), 'answer.comeback');
  // a late echo inside the window after the answer was counted is ignored
  tr.feed('bounce', t); tr.flush(); assert.equal(tr.feed('bounce', t + ANSWER_WINDOW_MS - 10), null); assert.equal(tr.flush(), null);
  // other actions never count as answers
  assert.equal(tr.feed('nervous', t + 5000), null); assert.equal(tr.pending, false);
  const ten = createAnswerTracker(); let r = null; for (let i = 0; i < 10; i++) { ten.feed('correct', i * 1000); r = ten.flush(); }
  assert.equal(r, 'answer.correct.streak10');
});

test('streak changes: milestones, a restart, a late save and the daily goal', () => {
  assert.equal(streakChangeTrigger({ count: 6, activeToday: false, best: 6 }, { count: 7, activeToday: true, best: 7 }, 12), 'streak.day.7');
  assert.equal(streakChangeTrigger({ count: 6, activeToday: false, best: 40 }, { count: 7, activeToday: true, best: 40 }, 12), 'goal.reached', 'a rebuilt streak does not replay old milestones');
  assert.equal(streakChangeTrigger(null, { count: 1, activeToday: true, best: 1 }, 12), 'streak.day.1');
  assert.equal(streakChangeTrigger({ count: 0, activeToday: false, best: 9 }, { count: 1, activeToday: true, best: 9 }, 12), 'streak.restart');
  assert.equal(streakChangeTrigger({ count: 4, activeToday: false }, { count: 5, activeToday: true, best: 5 }, 21), 'streak.saved');
  assert.equal(streakChangeTrigger({ count: 4, activeToday: false }, { count: 5, activeToday: true, best: 5 }, 12), 'goal.reached');
  assert.equal(streakChangeTrigger({ count: 5, activeToday: true }, { count: 5, activeToday: true }, 12), null);
  assert.equal(crossed([1, 3, 7], 2, 8), 7);
});

test('Brain Lab, books, badges and lessons: store changes become the right moment', () => {
  const day = '2026-11-10';
  const s0 = { games: {}, workouts: {} };
  const s1 = { games: { hunt: { best: 40, plays: 1, lastMax: 2 } }, workouts: { [day]: { done: ['hunt'] } } };
  assert.deepEqual(labChangeTrigger(s0, s1, day), { trigger: 'first.lab' });
  const s2 = { games: { hunt: { best: 55, plays: 2, lastMax: 2 } }, workouts: { [day]: { done: ['hunt'] } } };
  assert.deepEqual(labChangeTrigger(s1, s2, day), { trigger: 'lab.result.best' });
  const s3 = { games: { ...s2.games, matrix: { best: 10, plays: 1, lastMax: 1 } }, workouts: { [day]: { done: ['hunt', 'matrix'] } } };
  assert.deepEqual(labChangeTrigger(s2, s3, day), { trigger: 'lab.result.good' });
  const s4 = { games: { ...s3.games, gematria: { best: 5, plays: 1 } }, workouts: { [day]: { done: ['hunt', 'matrix', 'gematria'] } } };
  assert.deepEqual(labChangeTrigger(s3, s4, day), { trigger: 'lab.workout.done' });
  const three = { workouts: { '2026-11-08': { done: [1, 2, 3] }, '2026-11-09': { done: [1, 2, 3] }, [day]: { done: [1, 2, 3] } } };
  assert.equal(labStreak(three, day), 3);
  assert.equal(labChangeTrigger(s0, s0, day), null);
  assert.deepEqual(booksChangeTrigger({}, { b1: 1 }), { trigger: 'first.book', n: 1 });
  assert.deepEqual(booksChangeTrigger({ a: 1, b: 1, c: 1, d: 1 }, { a: 1, b: 1, c: 1, d: 1, e: 1 }), { trigger: 'books.milestone', n: 5 });
  assert.deepEqual(booksChangeTrigger({ a: 1 }, { a: 1, b: 1 }), { trigger: 'book.finished', n: 2 });
  assert.equal(awardsChangeTrigger({ awards: {} }, { awards: { x: 1 } }), 'first.badge');
  assert.equal(awardsChangeTrigger({ awards: { x: 1 } }, { awards: { x: 1, y: 1 } }), 'award.new');
  assert.equal(awardsChangeTrigger({ awards: { x: 1 } }, { awards: { x: 1 } }), null);
  const done = (n) => ({ completed: Object.fromEntries(Array.from({ length: n }, (_, i) => [`l${i}`, i])) });
  assert.equal(lessonsChangeTrigger(done(9), done(10)), 'lessons.10');
  assert.equal(lessonsChangeTrigger(done(10), done(11)), null);
});

test('breaks: water at 30 minutes, a stretch at 60, a snack at 90, each once', () => {
  const shown = new Set();
  assert.equal(breakTrigger(29 * 60000, shown), null);
  assert.equal(breakTrigger(30 * 60000, shown), 'idle.water'); shown.add('idle.water');
  assert.equal(breakTrigger(61 * 60000, shown), 'idle.break'); shown.add('idle.break');
  assert.equal(breakTrigger(95 * 60000, shown), 'idle.snack'); shown.add('idle.snack');
  assert.equal(breakTrigger(200 * 60000, shown), null);
});

test('picking: only drawings that exist, fallbacks when a trigger has none, a new drawing each time or one per day', () => {
  const ids = { 'answer.correct': [18, 19, 20], 'answer.correct.streak10': [28], 'answer.correct.streak5': [27], 'lab.home': [135, 136], 'lab.drill.hunt': [137] };
  const now = new Date(2026, 10, 10, 12);
  assert.equal(pickStill('answer.correct', { present: new Set(), ids, now }), null);
  const counters = new Map(), present = new Set([18, 19, 20, 27]);
  const seen = [0, 1, 2, 3].map(() => pickStill('answer.correct', { present, ids, now, counters }).id);
  assert.equal(new Set(seen.slice(0, 3)).size, 3, 'cycles through the three');
  assert.equal(seen[3], seen[0]);
  assert.deepEqual(pickStill('answer.correct.streak10', { present, ids, now, counters }), { id: 27, trigger: 'answer.correct.streak5' });
  assert.deepEqual(pickStill('lab.drill.hunt', { present: new Set([135, 136]), ids, now }).trigger, 'lab.home');
  const a = pickStill('lab.home', { present: new Set([135, 136]), ids, now, counters }).id, b = pickStill('lab.home', { present: new Set([135, 136]), ids, now, counters }).id;
  assert.equal(a, b, 'page stills hold for the day');
  // every real trigger finds a drawing once all 200 exist
  for (const t of Object.keys(TRIGGERS)) assert.ok(pickStill(t, { present: all(), now }), t);
});

test('once rules and present.json parsing', () => {
  assert.equal(alreadySeen('first.correct', { 'first.correct': true }, '2026-11-10'), true);
  assert.equal(alreadySeen('streak.atrisk', { 'streak.atrisk': '2026-11-09' }, '2026-11-10'), false);
  assert.equal(alreadySeen('streak.atrisk', { 'streak.atrisk': '2026-11-10' }, '2026-11-10'), true);
  assert.equal(alreadySeen('answer.correct', { 'answer.correct': true }, '2026-11-10'), false);
  assert.deepEqual([...presentSet({ ids: ['023', '025b', 'a007', 'a007', 7, 'x', 'b001', '1234', '../x'] })], ['023', '025b', 'a007']);
  assert.deepEqual([...presentSet(null)], []);
  assert.deepEqual(lineFor('lab.streak', { n: 7 }), { en: '7 days of Brain Lab in a row!' });
  assert.equal(lineFor('answer.correct'), null);
});

test('Hebrew in the lines is pointed; English lines are short enough for a bubble', () => {
  for (const [t, def] of Object.entries(TRIGGERS)) {
    if (!def.line) continue;
    assert.ok(def.line.en.length <= 90, `${t} line is ${def.line.en.length} chars`);
    if (def.line.he) { assert.match(def.line.he, /[א-ת]/, t); assert.match(def.line.he, /[ְ-ּ]/, `${t} Hebrew is not pointed`); }
    assert.doesNotMatch(def.line.en, /\*|AI\b/, t);
  }
});

test('a screen that says Rimon stays away is a quiet route (Ask the Torah, the Torah and prayer screens)', async () => {
  const fs = await import('node:fs');
  const { ROUTES } = await import('../src/shell/router.js');
  assert.ok(QUIET_ROUTES.includes('ask'));
  for (const r of ROUTES) {
    if (!r.module) continue;
    const file = new URL(r.module.replace(/^\.\.\//, '../src/').replace(/^\.\//, '../src/shell/'), import.meta.url);
    let head = ''; try { head = fs.readFileSync(file, 'utf8').slice(0, 3000); } catch { continue; }
    if (/Rimon (does not|doesn't|never) (appear|show)/i.test(head)) assert.ok(QUIET_ROUTES.includes(r.name), `${r.name} (${r.module}) says Rimon stays away but is not quiet`);
  }
});

test("the owner's streak rule: Friday, Saturday, Yom Tov and its eve never break a streak in Rimon's eyes either", async () => {
  const { freeRestDays } = await import('../src/shell/rimon-triggers.js');
  const { projectStreak, STREAK_V } = await import('../src/curriculum/streak.js');
  const rec = { v: STREAK_V, count: 5, best: 5, last: '2026-11-12', frozenDates: [], mode: 'reform' }; // last studied Thursday
  const at = (d, iso) => projectStreak(rec, d, freeRestDays(rec, iso));
  const fri = at(new Date(2026, 10, 13, 19), '2026-11-13');
  assert.equal(fri.restToday, true, 'Friday evening is a rest day: no "streak at risk"');
  assert.ok(!greetingCandidates({ iso: '2026-11-13', hour: 19, weekday: 5, holidays: [], shabbat: 'evening' }, { streak: fri }).includes('streak.atrisk'));
  const sat = at(new Date(2026, 10, 14, 22), '2026-11-14');
  assert.equal(sat.count, 5); assert.ok(!sat.broken, 'Saturday night after a missed Friday: still 5');
  assert.equal(at(new Date(2026, 10, 15, 10), '2026-11-15').count, 5, 'Sunday after Friday and Saturday off: still 5');
  assert.ok(at(new Date(2026, 10, 17, 10), '2026-11-17').broken, 'a missed Sunday and Monday still break it');
});

test('with retention running, a break is retention\'s news (freezes, repair), not a second "streaks start again"', () => {
  const ctx = { iso: '2026-11-17', hour: 10, weekday: 2, holidays: [], shabbat: null };
  const st = { broken: true, best: 6, count: 0 };
  assert.ok(greetingCandidates(ctx, { streak: st }).includes('streak.lost'));
  assert.ok(!greetingCandidates(ctx, { streak: st, retention: true }).includes('streak.lost'));
});
