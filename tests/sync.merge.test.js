// Lane 4 (12 Nov): merging progress from another of the learner's own devices. Points plan #3 / #18, audit C-06.
// The merge never loses or duplicates anything: cards keep the later review, lessons keep the earliest completion,
// streak and XP unite by day, gems unite their ledger. Two devices with interleaved progress are simulated end to end
// through the real lesson, review, XP and gem code.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore, createMemoryStorage } from '../src/store.js';
import { mergeAll, mergeCard, mergeCards, mergeCompleted, mergeStreak, mergeRetention, mergeChecks, mergeValue, ruleFor, stable, DEVICE_KEYS } from '../src/sync/merge.js';
import { movePackage, readIncoming, applyMerge, previewMerge, dumpStore } from '../src/sync/move.js';
import { saveQuickCheck, rateCard } from '../src/curriculum/actions.js';
import { byId } from '../src/curriculum/lessons.js';
import { normalize } from '../src/retention/state.js';
import { award } from '../src/retention/xp.js';
import { earn, spend } from '../src/retention/gems.js';
import { review, newCard } from '../src/curriculum/srs.js';

const DAY = 86400000;
const T0 = Date.UTC(2026, 10, 2, 15); // 2 November 2026, afternoon
const mk = () => createStore({ storage: createMemoryStorage(), window: null });
const clone = (v) => JSON.parse(JSON.stringify(v));

// ---------- unit rules ----------
test('cards: the later review keeps its scheduling state; days and firstReview unite; due is the latest; reps never go down', () => {
  const base = review(newCard({ id: 'letter:alef', now: T0 }), 3, T0);
  const a = review(base, 3, T0 + 2 * DAY); // device A reviewed on day 3
  const b = review(base, 1, T0 + 4 * DAY); // device B reviewed later, on day 5, and missed it
  const m = mergeCard(a, b);
  assert.equal(m.lastReview, b.lastReview); assert.equal(m.state, b.state); assert.equal(m.stability, b.stability);
  assert.deepEqual(m.days, ['2026-11-02', '2026-11-04', '2026-11-06']);
  assert.equal(m.firstReview, T0);
  assert.equal(m.due, Math.max(a.due, b.due));
  assert.equal(m.reps, 2);
  assert.deepEqual(mergeCard(b, a), m, 'the same card comes out whichever device merges');
  const old = { ...a, firstReview: null }; delete old.days; // a card graded before the history was kept
  assert.equal(mergeCard(old, b).firstReview, T0);
});

test('card collections: union by id, a list-shaped srs.vocab stays a list, nothing is duplicated', () => {
  const c1 = { id: 'v1', due: 5, reps: 1, lastReview: 1 }, c2 = { id: 'v2', due: 9, reps: 1, lastReview: 2 };
  const m = mergeCards({ v1: c1 }, { v1: { ...c1, reps: 2, lastReview: 3, due: 7 }, v2: c2 });
  assert.deepEqual(Object.keys(m).sort(), ['v1', 'v2']); assert.equal(m.v1.reps, 2); assert.equal(m.v1.due, 7);
  const asList = mergeCards([c1], [c1, c2]);
  assert.ok(Array.isArray(asList)); assert.equal(asList.length, 2);
});

test('lessons completed: union, earliest time; other fields are kept', () => {
  const m = mergeCompleted({ completed: { r01: 300, r02: 500 }, note: 'a' }, { completed: { r01: 100, r03: 900 }, extra: 1 });
  assert.deepEqual(m.completed, { r01: 100, r02: 500, r03: 900 });
  assert.equal(m.note, 'a'); assert.equal(m.extra, 1);
});

test('check results: attempts unite by time and the earliest pass is kept', () => {
  const a = { r01: { pass: { at: 50, right: 3, of: 4 }, tries: [{ at: 10, right: 1, of: 4 }, { at: 50, right: 3, of: 4 }] } };
  const b = { r01: { pass: { at: 40, right: 4, of: 4 }, tries: [{ at: 10, right: 1, of: 4 }, { at: 40, right: 4, of: 4 }] }, r02: { pass: null, tries: [{ at: 70, right: 0, of: 3 }] } };
  const m = mergeChecks(a, b);
  assert.deepEqual(m.r01.pass, { at: 40, right: 4, of: 4 });
  assert.deepEqual(m.r01.tries.map((t) => t.at), [10, 40, 50]);
  assert.deepEqual(m.r02, b.r02);
});

test('streak: days unite and the chain is recounted across both devices; best never goes down', () => {
  // A did 1-3 November, B did 4-5 November (B started fresh), with a rest day declared on B for 6 November
  const a = { v: 2, count: 3, best: 3, last: '2026-11-03', doneDates: ['2026-11-01', '2026-11-02', '2026-11-03'], frozenDates: [], todayDate: '2026-11-03', todaySeconds: 400 };
  const b = { v: 2, count: 2, best: 2, last: '2026-11-05', doneDates: ['2026-11-04', '2026-11-05'], frozenDates: ['2026-11-06'], todayDate: '2026-11-05', todaySeconds: 310 };
  const m = mergeStreak(a, b);
  assert.equal(m.count, 5); assert.equal(m.best, 5); assert.equal(m.last, '2026-11-05');
  assert.deepEqual(m.frozenDates, ['2026-11-06']); assert.equal(m.todayDate, '2026-11-05'); assert.equal(m.todaySeconds, 310);
  assert.deepEqual(mergeStreak(b, a).count, 5);
  // a gap that neither device covered still breaks the chain
  const c = { ...b, doneDates: ['2026-11-05'], count: 1, last: '2026-11-05' };
  assert.equal(mergeStreak(a, c).count, 1); assert.equal(mergeStreak(a, c).best, 3);
  // old records without day lists: the chains meet when A's last day is the day before B's first
  assert.equal(mergeStreak({ count: 2, best: 2, last: '2026-11-02' }, { count: 1, best: 1, last: '2026-11-03' }).count, 3);
});

test('XP: union by day with the larger figure per day; the total moves by what this device gains', () => {
  const a = normalize({ xp: { total: 70, days: { '2026-11-01': 30, '2026-11-02': 40 } } }, T0);
  const b = normalize({ xp: { total: 75, days: { '2026-11-02': 50, '2026-11-03': 25 } } }, T0);
  const m = mergeRetention(a, b);
  assert.deepEqual(m.xp.days, { '2026-11-01': 30, '2026-11-02': 50, '2026-11-03': 25 });
  assert.equal(m.xp.total, 105);
  assert.equal(mergeRetention(m, b).xp.total, 105, 'merging the same file again adds nothing');
});

test('gems: the ledger unites entry by entry; the balance moves only by entries this device had not seen', () => {
  let shared = normalize({}, T0); shared = earn(shared, 50, 'first', T0);
  let a = earn(shared, 10, 'goal', T0 + DAY); a = spend(a, 20, 'buy-freeze', T0 + DAY + 1).rec;
  const b = earn(shared, 2, 'accuracy', T0 + 2 * DAY);
  const ab = mergeRetention(a, b), ba = mergeRetention(b, a);
  assert.equal(ab.gems.balance, 50 + 10 - 20 + 2); assert.equal(ba.gems.balance, ab.gems.balance);
  assert.equal(ab.gems.ledger.length, 4);
  assert.deepEqual(stable(ab.gems.ledger), stable(ba.gems.ledger));
  assert.equal(mergeRetention(ab, b).gems.balance, ab.gems.balance, 'idempotent');
  // two identical entries on the other device and one here: one of them is new (a multiset, not a set)
  const twice = earn(earn(shared, 5, 'quest', T0 + 5 * DAY), 5, 'quest', T0 + 5 * DAY), once = earn(shared, 5, 'quest', T0 + 5 * DAY);
  const m2 = mergeRetention(once, twice); assert.equal(m2.gems.balance, twice.gems.balance); assert.equal(m2.gems.ledger.length, twice.gems.ledger.length);
  assert.equal(ab.installId, a.installId, 'this device keeps its own install id');
});

test('keys: device keys never move, preferences keep this device, unknown keys unite without loss', () => {
  for (const k of DEVICE_KEYS) assert.equal(ruleFor(k), 'device');
  const r = mergeAll({ settings: { congregation: 'sephardi' }, 'install.v1': { x: 1 } }, { settings: { congregation: 'ashkenazi', theme: 'dark' }, 'install.v1': { x: 2 }, 'games.x.v1': { best: 4 } });
  assert.deepEqual(r.data.settings, { congregation: 'sephardi', theme: 'dark' });
  assert.ok(!('install.v1' in r.data)); assert.deepEqual(r.skipped, ['install.v1']); assert.deepEqual(r.added, ['games.x.v1']);
  assert.deepEqual(mergeValue('games.x.v1', { best: 7, seen: ['a'] }, { best: 4, seen: ['b', 'a'] }), { best: 7, seen: ['a', 'b'] });
  assert.ok(!Object.hasOwn(mergeAll({}, JSON.parse('{"__proto__":{"x":1}}')).data, '__proto__'));
});

// ---------- two devices, interleaved, through the real code ----------
const ctxOf = (store) => ({ store });
async function pass(store, id, now) {
  const qs = (byId[id].words || []).slice(0, 4).map((w, i) => ({ id: `q${i}`, cardId: `word:${id}:${i}`, cardKind: 'word' }));
  const results = Object.fromEntries(qs.map((q, i) => [q.id, i !== 3])); // all but the fourth right on the first try: passes
  const r = await saveQuickCheck(ctxOf(store), byId[id], qs, results, now);
  assert.equal(r.completed, true, `${id} passed`);
}
function payXp(store, id, amount, now) { store.set('retention.v1', award(normalize(store.get('retention.v1'), now), { awardId: id, amount, now }).rec); }
function gem(store, n, why, now) { store.set('retention.v1', earn(normalize(store.get('retention.v1'), now), n, why, now)); }
function moveInto(from, to) {
  const file = JSON.parse(JSON.stringify(movePackage(from)));
  const inc = readIncoming(to, file); assert.ok(inc.ok, inc.error);
  const r = applyMerge(to, inc.data); assert.ok(r.ok, r.error);
  return r;
}
const progressKeys = ['srs.cards', 'curriculum.progress', 'lesson.checks.v1', 'streak'];

test('two devices with interleaved progress: both end with everything, nothing is lost or counted twice, and moving again changes nothing', async () => {
  const A = mk(), B = mk();
  A.set('settings', { congregation: 'sephardi' }); B.set('settings', { congregation: 'israeli' });
  // day 1, phone (A): first lesson, then the learner moves to the tablet (B)
  await pass(A, 'r01', T0); payXp(A, 'lesson:r01', 20, T0); gem(A, 50, 'first', T0);
  moveInto(A, B);
  assert.deepEqual(clone(B.get('curriculum.progress')), clone(A.get('curriculum.progress')));
  assert.equal(B.get('settings').congregation, 'israeli', 'the tablet keeps its own settings');
  // day 2: phone does lesson 2; tablet reviews lesson 1's cards
  await pass(A, 'r02', T0 + DAY); payXp(A, 'lesson:r02', 20, T0 + DAY); gem(A, 10, 'quest', T0 + DAY);
  await rateCard(ctxOf(B), 'word:r01:0', 3, T0 + DAY + 3600e3); payXp(B, 'review:1', 5, T0 + DAY + 3600e3);
  // day 3: tablet does lesson 3 and a check that does not pass; phone reviews the same card later in the day
  await pass(B, 'r03', T0 + 2 * DAY); payXp(B, 'lesson:r03', 20, T0 + 2 * DAY); gem(B, 2, 'accuracy', T0 + 2 * DAY);
  await saveQuickCheck(ctxOf(B), byId.r04, [{ id: 'q0', cardId: 'word:r04:0', cardKind: 'word' }, { id: 'q1', cardId: 'word:r04:1', cardKind: 'word' }], { q0: false, q1: false }, T0 + 2 * DAY + 60e3);
  await rateCard(ctxOf(A), 'word:r01:0', 1, T0 + 2 * DAY + 7200e3);
  const beforeA = dumpStore(A), beforeB = dumpStore(B);

  moveInto(B, A); moveInto(A, B);
  for (const k of progressKeys) assert.equal(stable(A.get(k)), stable(B.get(k)), `${k} agrees on both devices`);
  const done = A.get('curriculum.progress').completed;
  assert.deepEqual(Object.keys(done).sort(), ['r01', 'r02', 'r03']);
  assert.equal(done.r01, T0); assert.equal(done.r02, T0 + DAY); assert.equal(done.r03, T0 + 2 * DAY);
  // every card from either device is there once, and the shared card kept the later review (the phone's, day 3)
  const cards = A.get('srs.cards');
  for (const id of [...Object.keys(beforeA['srs.cards']), ...Object.keys(beforeB['srs.cards'])]) assert.ok(cards[id], id);
  assert.equal(Object.keys(cards).length, new Set([...Object.keys(beforeA['srs.cards']), ...Object.keys(beforeB['srs.cards'])]).size);
  assert.equal(cards['word:r01:0'].lastReview, T0 + 2 * DAY + 7200e3);
  assert.deepEqual(cards['word:r01:0'].days, ['2026-11-02', '2026-11-03', '2026-11-04']);
  assert.equal(cards['word:r01:0'].firstReview, T0);
  // the check that did not pass is kept as an attempt, with no pass
  assert.equal(A.get('lesson.checks.v1').r04.pass, null); assert.equal(A.get('lesson.checks.v1').r04.tries.length, 1);
  const p2 = A.get('lesson.checks.v1').r02.pass; assert.equal(p2.at, T0 + DAY); assert.ok(p2.right >= 1 && p2.right <= p2.of);
  // streak: day 1 and 2 on the phone, day 3 on the tablet -> 3 days
  assert.equal(A.get('streak').count, 3); assert.equal(B.get('streak').count, 3);
  // XP by day, gems by ledger, on both devices
  const ra = A.get('retention.v1'), rb = B.get('retention.v1');
  assert.deepEqual(ra.xp.days, rb.xp.days);
  assert.deepEqual(ra.xp.days, { '2026-11-02': 20, '2026-11-03': 20, '2026-11-04': 20 }, 'on 3 November the phone has 20 and the tablet 5: the larger figure is kept');
  assert.equal(ra.xp.total, 60);
  // every gem entry from either device once; the balance is the sum of the united ledger (nothing was spent)
  const entries = new Set([...beforeA['retention.v1'].gems.ledger, ...beforeB['retention.v1'].gems.ledger].map((e) => `${e.at}|${e.d}|${e.why}`));
  assert.equal(ra.gems.ledger.length, entries.size); assert.equal(stable(ra.gems.ledger), stable(rb.gems.ledger));
  const sum = [...entries].reduce((t, k) => t + Number(k.split('|')[1]), 0);
  assert.equal(ra.gems.balance, sum); assert.equal(rb.gems.balance, sum);
  // settings did not move over each other
  assert.equal(A.get('settings').congregation, 'sephardi'); assert.equal(B.get('settings').congregation, 'israeli');
  // moving again: nothing to write
  assert.equal(moveInto(A, B).written, 0); assert.equal(moveInto(B, A).written, 0);
});

test('import never deletes: a smaller, older file merges into a device with more progress and removes nothing', async () => {
  const A = mk(); await pass(A, 'r01', T0);
  const old = movePackage(A);
  await pass(A, 'r02', T0 + DAY);
  const keys = A.keys().sort(), before = dumpStore(A);
  const pv = previewMerge(A, readIncoming(A, old).data);
  assert.equal(Object.keys(pv.data).length, 0);
  moveInto({ keys: () => Object.keys(old.data), get: (k) => old.data[k], schema: 1 }, A);
  assert.deepEqual(A.keys().sort(), keys); assert.equal(stable(dumpStore(A)), stable(before));
});

test('the merge in day 3 above: XP figure for 2026-11-03 keeps the larger device total', () => {
  // explicit restatement of the spec choice (union by day, max per day): two devices each earning on one day are not added
  const m = mergeRetention(normalize({ xp: { total: 20, days: { '2026-11-03': 20 } } }, T0), normalize({ xp: { total: 5, days: { '2026-11-03': 5 } } }, T0));
  assert.equal(m.xp.days['2026-11-03'], 20); assert.equal(m.xp.total, 20);
});
