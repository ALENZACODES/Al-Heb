import './_helpers.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { T } from './_helpers.js';
import { yomTovDates } from '../../src/curriculum/streak.js';
import { defaults } from '../../src/retention/state.js';
import { addDaysISO, localAt, weekdayOf } from '../../src/retention/clock.js';
import { isQuiet, isRestQuiet, quietRanges, restNow } from '../../src/retention/quiet.js';
import { MESSAGES, byTier } from '../../src/retention/messages.js';
import { NOTIFY, logSession, typicalMinute, daysAway, tierFor, pickMessage, nextFire, plan, mayShow, recordSent, shouldAsk, answerAsk, setReminders, planFile, createScheduler } from '../../src/retention/notify.js';

const sess = (...starts) => starts.map((s) => ({ s: T(s), e: T(s) + 600000 }));
const opted = (o = {}) => { const r = defaults(T('2026-11-01T10:00'), 'install-1'); r.notify.optedIn = true; r.lessonsFinished = 4; Object.assign(r, o); return r; };

test('quiet: Friday 18:00 to Saturday 21:00, and nights', () => {
  assert.equal(isQuiet(T('2026-11-13T17:59')), false);
  assert.equal(isQuiet(T('2026-11-13T18:00')), true);
  assert.equal(isQuiet(T('2026-11-14T12:00')), true);
  assert.equal(isQuiet(T('2026-11-14T20:59')), true);
  assert.equal(isQuiet(T('2026-11-14T21:00')), true, 'Saturday 21:00 is night quiet');
  assert.equal(isRestQuiet(T('2026-11-14T21:00')), false);
  assert.equal(isQuiet(T('2026-11-15T07:59')), true);
  assert.equal(isQuiet(T('2026-11-15T08:00')), false);
  assert.equal(restNow(T('2026-11-14T12:00')), 'shabbat'); assert.equal(restNow(T('2026-11-11T12:00')), null);
});
test('quiet: with a city, the existing candle-lighting helper widens the window (the wider one wins)', () => {
  const toronto = { lat: 43.65, lon: -79.38, tz: 'America/Toronto' }, fri5pm = T('2026-12-11T17:00');
  assert.equal(isQuiet(fri5pm), false); assert.equal(isQuiet(fri5pm, { loc: toronto }), true, 'candles are lit before 17:00 in December');
  assert.equal(isQuiet(T('2026-06-12T18:30'), { loc: toronto }), true, 'the fixed 18:00 rule still holds when sunset is late');
});
test('quiet: Yom Tov from 18:00 on the eve to 21:00 on the day', () => {
  const yt = [...yomTovDates('2027-01-01', '2027-12-31', 'reform')].find((d) => [2, 3, 4].includes(weekdayOf(d)) && !yomTovDates('2027-01-01', '2027-12-31', 'reform').has(addDaysISO(d, -1)));
  assert.ok(yt);
  const eve = addDaysISO(yt, -1);
  assert.equal(isQuiet(localAt(eve, 17 * 60 + 59)), false); assert.equal(isQuiet(localAt(eve, 18 * 60)), true);
  assert.equal(isQuiet(localAt(yt, 12 * 60)), true); assert.equal(isRestQuiet(localAt(yt, 20 * 60 + 59)), true);
  assert.equal(restNow(localAt(yt, 12 * 60)), 'yomtov');
  const ranges = quietRanges(localAt(eve, 12 * 60), localAt(addDaysISO(yt, 1), 12 * 60));
  const span = ranges.find(([s, e]) => s <= localAt(yt, 12 * 60) && e > localAt(yt, 12 * 60));
  assert.equal(span[0], localAt(eve, 18 * 60), 'eve 18:00 through the night and the day is one merged range');
  assert.equal(span[1], localAt(addDaysISO(yt, 1), 8 * 60));
});
test('personal timing: the hour the learner usually studies', () => {
  const now = T('2026-11-10T12:00');
  assert.equal(typicalMinute([], now), 19 * 60);
  assert.equal(typicalMinute(sess('2026-11-09T21:30'), now), 21 * 60 + 30, 'fewer than 3 sessions: the last one');
  assert.equal(typicalMinute(sess('2026-11-03T07:10', '2026-11-04T07:20', '2026-11-05T07:40'), now), 7 * 60 + 15);
  assert.equal(typicalMinute(sess('2026-11-03T07:10', '2026-11-07T19:05', '2026-11-08T19:20', '2026-11-09T19:10'), now), 19 * 60 + 15);
  assert.equal(typicalMinute(sess('2026-09-01T07:10', '2026-09-02T07:10', '2026-09-03T07:10'), now), 19 * 60, 'older than 28 days is ignored');
});
test('next reminder: about a day later, moved past Shabbat, never on a session day, clamped to 08:00', () => {
  const thu = opted({ sessions: sess('2026-11-12T19:05') });
  assert.equal(nextFire(thu, T('2026-11-12T20:00')), T('2026-11-15T19:05'), 'Friday 18:35 and Saturday are quiet: Sunday');
  const tue = opted({ sessions: sess('2026-11-10T19:05') });
  assert.equal(nextFire(tue, T('2026-11-10T20:00')), T('2026-11-11T18:35'));
  const early = opted({ sessions: sess('2026-11-03T07:10', '2026-11-04T07:20', '2026-11-05T07:40') });
  assert.equal(new Date(nextFire(early, T('2026-11-05T12:00'))).getHours(), 8);
  assert.equal(nextFire(opted(), T('2026-11-10T20:00')), null, 'no session yet, nothing to plan');
  // daylight saving: the Sunday the clocks spring forward still fires at 19:00 on the wall clock
  const dst = opted({ sessions: sess('2026-03-05T19:00', '2026-03-04T19:00', '2026-03-03T19:00') });
  dst.sessions.sort((a, b) => a.s - b.s);
  const f = new Date(nextFire(dst, T('2026-03-07T22:00')));
  assert.deepEqual([f.getDay(), f.getHours(), f.getMinutes()], [0, 19, 15]);
});
test('tone ladder: kind never roasts; playful does from day 5; silence after day 14', () => {
  for (let d = 0; d <= 30; d++) assert.notEqual(tierFor(d, 'kind'), 'R');
  assert.deepEqual([1, 2, 3, 4, 5, 7].map((d) => tierFor(d, 'kind')), ['E', 'E', 'D', 'D', 'D', 'D']);
  assert.deepEqual([1, 3, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((d) => tierFor(d, 'playful')), ['E', 'D', 'R', 'R', 'R', null, null, 'D', null, null, 'S09', null]);
  assert.equal(tierFor(0, 'playful'), null);
});
test('days away skip Shabbat rest days', () => {
  const r = opted({ sessions: sess('2026-11-12T19:00') });
  assert.equal(daysAway(r, T('2026-11-12T22:00')), 0);
  assert.equal(daysAway(r, T('2026-11-15T10:00')), 1, 'Friday and Saturday do not count');
  assert.equal(daysAway(r, T('2026-11-17T10:00')), 3);
});
test('catalogue: 73 lines (24 encourage, 20 gentle, 20 roast, 9 situational), unique ids', () => {
  assert.equal(MESSAGES.length, 73); assert.ok(MESSAGES.length >= 60);
  assert.deepEqual(['E', 'D', 'R', 'S'].map((t) => byTier(t).length), [24, 20, 20, 9]);
  assert.equal(new Set(MESSAGES.map((m) => m.id)).size, 73);
});
test('copy rules: no pronouns for Rimon, no tool names, nothing about faith, no line names the day of rest', () => {
  for (const m of MESSAGES) {
    assert.doesNotMatch(m.body, /\b(he|him|his|she|her|hers)\b/i, m.id);
    assert.doesNotMatch(m.body, /\b(AI|artificial|algorithm|smart|GPT|\u0043hatGPT|\u0043laude|Gemini|Copilot|LLM|bot)\b/i, m.id);
    assert.doesNotMatch(m.body, /\b(God|G-d|pray|prayer|sin|shul|synagogue|rabbi|Torah|kosher)\b/i, m.id);
    assert.doesNotMatch(m.body, /shabbat|sabbath/i, m.id);
    assert.doesNotMatch(m.body, /\b(stupid|dumb|lazy|fat|ugly|loser|shame|ashamed|hate|idiot)\b/i, m.id);
    if (/shavua|chag|shalom/i.test(m.body)) assert.ok(['S01', 'S02', 'S09'].includes(m.id), m.id);
    assert.ok(m.body.length <= 110, m.id);
  }
});
test('rotation: no repeat within the last 10, {n} needs a streak, {next} needs a title, installs start at different lines', () => {
  let sent = [];
  for (let i = 0; i < 40; i++) { const m = pickMessage({ tier: 'E', sent, installId: 'abc', n: 5 }); assert.ok(m); assert.ok(!sent.slice(-10).some((s) => s.id === m.id), `repeat ${m.id}`); sent.push({ id: m.id, at: i }); }
  assert.ok(new Set(sent.map((s) => s.id)).size >= 20);
  sent = [];
  for (let i = 0; i < 24; i++) { const m = pickMessage({ tier: 'E', sent, installId: 'abc', n: 1 }); assert.doesNotMatch(m.body, /\{n\}|1-day/); sent.push({ id: m.id, at: i }); }
  for (let i = 0; i < 20; i++) { const m = pickMessage({ tier: 'D', sent, installId: 'abc', n: 0 }); assert.notEqual(m.id, 'D09'); sent.push({ id: m.id, at: i }); }
  assert.match(pickMessage({ tier: 'D', sent: byTier('D').filter((m) => m.id !== 'D09').slice(-10).map((m) => ({ id: m.id, at: 0 })), installId: 'x', next: 'Shin and Bet' }).body, /./);
  const firsts = new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((id) => pickMessage({ tier: 'E', installId: id, n: 5 }).id));
  assert.ok(firsts.size > 1);
  assert.equal(pickMessage({ tier: 'S04', n: 6 }).body, 'Your 6-day streak would love one lesson before bed.');
});
test('plan: opt-in only; escalates with days away; one line a day; roast only for Playful Rimon', () => {
  const base = { sessions: sess('2026-11-02T19:00') };
  assert.deepEqual(plan(Object.assign(opted(base), { notify: { ...opted().notify, optedIn: false } }), {}, T('2026-11-03T09:00')), []);
  const d1 = plan(opted(base), { count: 0 }, T('2026-11-03T09:00'));
  assert.equal(d1.length, 1); assert.match(d1[0].id, /^E/); assert.equal(d1[0].title, 'Rimon'); assert.equal(d1[0].fireAt, T('2026-11-03T18:30'));
  assert.match(plan(opted(base), { count: 0 }, T('2026-11-05T09:00'))[0].id, /^D/);
  const playful = opted(base); playful.notify.tone = 'playful';
  const mon = { sessions: sess('2026-11-02T19:00') };
  assert.match(plan(Object.assign(opted(mon), { notify: { ...playful.notify } }), { count: 0 }, T('2026-11-10T09:00'))[0].id, /^R/, 'day 6 away (Friday and Saturday not counted), playful');
  assert.match(plan(opted(mon), { count: 0 }, T('2026-11-10T09:00'))[0].id, /^D/, 'same day, kind');
  const sentToday = recordSent(opted(base), 'E01', T('2026-11-03T10:00'));
  assert.ok(plan(sentToday, { count: 0 }, T('2026-11-03T11:00')).every((e) => e.fireAt > T('2026-11-03T23:59')), 'already sent today');
  const stopped = recordSent(opted(base), 'S09', T('2026-11-03T10:00'));
  assert.equal(stopped.notify.stopped, true); assert.deepEqual(plan(stopped, {}, T('2026-11-04T09:00')), []);
  assert.equal(logSession(stopped, T('2026-11-05T09:00')).notify.stopped, false, 'coming back turns reminders on again');
});
test('plan: first line after Shabbat is the Sunday greeting; the streak saver is 20:00', () => {
  const r = opted({ sessions: sess('2026-11-12T19:05') });
  assert.equal(plan(r, { count: 0 }, T('2026-11-12T20:00'))[0].id, 'S01');
  const saver = opted({ sessions: sess('2026-11-09T12:00') }); saver.notify.tone = 'playful';
  const p = plan(saver, { count: 5, activeToday: false }, T('2026-11-10T13:00'));
  assert.ok(p.some((e) => e.id === 'S04' && e.fireAt === T('2026-11-10T20:00')));
  assert.ok(!plan(saver, { count: 5, activeToday: true }, T('2026-11-10T13:00')).some((e) => e.id === 'S04'));
  const kind = opted({ sessions: sess('2026-11-09T12:00') });
  assert.ok(!plan(kind, { count: 5, activeToday: false }, T('2026-11-10T13:00')).some((e) => e.id === 'S04'), 'kind tone waits for a 7-day streak');
  assert.ok(!plan(saver, { count: 5, activeToday: false }, T('2026-11-13T13:00')).some((e) => e.id === 'S04'), 'never on Friday night');
});
test('nothing is shown during Shabbat, at night, late, or after a session today', () => {
  const r = opted({ sessions: sess('2026-11-12T19:05') }), e = { fireAt: T('2026-11-13T19:00'), id: 'E01' };
  assert.equal(mayShow(r, e, T('2026-11-13T19:00')), false, 'Friday 19:00');
  const ok = { fireAt: T('2026-11-16T19:00'), id: 'E01' };
  assert.equal(mayShow(r, ok, T('2026-11-16T19:01')), true);
  assert.equal(mayShow(r, ok, T('2026-11-16T19:20')), false, 'more than 10 minutes late');
  assert.equal(mayShow(r, ok, T('2026-11-16T19:01'), { calm: true }), false);
  assert.equal(mayShow(logSession(r, T('2026-11-16T09:00')), ok, T('2026-11-16T19:01')), false, 'already studied today');
  assert.equal(mayShow(setReminders(r, false), ok, T('2026-11-16T19:01')), false);
});
test('opt-in: asked only after a finished lesson, at most twice, 3 lessons apart, never in calm mode', () => {
  const r = defaults(T('2026-11-01T10:00'), 'i');
  assert.equal(shouldAsk(r), false);
  r.lessonsFinished = 1; assert.equal(shouldAsk(r), true); assert.equal(shouldAsk(r, { calm: true }), false);
  let a = answerAsk(r, 'later'); assert.equal(shouldAsk(a), false);
  a.lessonsFinished = 4; assert.equal(shouldAsk(a), true);
  a = answerAsk(a, 'later'); a.lessonsFinished = 20; assert.equal(shouldAsk(a), false, 'two asks at most');
  const yes = answerAsk(r, 'yes', 'playful'); assert.deepEqual([yes.notify.optedIn, yes.notify.tone, shouldAsk(yes)], [true, 'playful', false]);
  const no = answerAsk(r, 'denied'); assert.deepEqual([no.notify.denied, shouldAsk(no)], [true, false]);
});
test('scheduler: fires through the page timer, records the line, and stays silent on Friday night', async () => {
  const run = async (startAt, fireAtClock) => {
    let rec = opted({ sessions: sess('2026-11-09T19:00') }), clock = T(startAt); const timers = [], shown = [];
    const s = createScheduler({ load: () => rec, save: (fn) => { rec = fn(rec) || rec; }, streak: () => ({ count: 0, activeToday: false }), show: async (title, body, o) => { shown.push({ title, body, o }); },
      opt: () => ({}), now: () => clock, setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; }, clearTimeout: () => {}, g: {} });
    const next = s.arm();
    clock = T(fireAtClock); await timers.at(-1).fn();
    s.stop();
    return { next, shown, rec, timers };
  };
  const tue = await run('2026-11-10T09:00', '2026-11-10T18:30');
  assert.equal(tue.next.fireAt, T('2026-11-10T18:30')); assert.ok(tue.timers[0].ms <= NOTIFY.maxTimerMs);
  assert.equal(tue.shown.length, 1); assert.equal(tue.shown[0].title, 'Rimon'); assert.equal(tue.shown[0].o.icon, 'assets/icons/icon-192.png');
  assert.equal(tue.rec.notify.sent.length, 1);
  const fri = await run('2026-11-13T09:00', '2026-11-13T19:00');
  assert.equal(fri.shown.length, 0, 'Friday 19:00: nothing');
});
test('the plan file for the service worker carries quiet ranges that include Shabbat', () => {
  const r = opted({ sessions: sess('2026-11-12T19:05') }), now = T('2026-11-12T20:00');
  const file = planFile(r, plan(r, {}, now), now);
  assert.equal(file.v, 1); assert.equal(file.lastSessionAt, T('2026-11-12T19:05'));
  assert.ok(file.quiet.some(([s, e]) => s <= T('2026-11-13T18:00') && e >= T('2026-11-14T21:00')));
});
