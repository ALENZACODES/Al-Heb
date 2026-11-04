import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createStore, createMemoryStorage } from '../src/store.js';
import * as M from '../src/progress/model.js';
import { cleanMilestones, evaluateMilestones, updateMilestones, milestoneRows } from '../src/progress/milestones.js';
import { recordMilestones, PROGRESS_KEYS, exportProgress, importProgress } from '../src/progress/store.js';
import { loadProgressData } from '../src/progress/data.js';

const D = await loadProgressData();
const fake = () => createStore({ storage: createMemoryStorage() });
const noon = (iso) => new Date(iso + 'T12:00:00').getTime();
const T = noon('2026-11-10');
const readIds = D.lessons.filter((l) => l.track === 'read').map((l) => l.id);
const lessons = (st, ids) => st.set('curriculum.progress', { completed: Object.fromEntries(ids.map((i) => [i, T])) });
const evalFor = (st) => { const s = M.readSnapshot(st); return evaluateMilestones(s, D, M.makeContext(s, D, T)); };
const by = (evals) => Object.fromEntries(evals.map((e) => [e.id, e]));
const wordCards = (n, reps = 1) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`vocab:${i}`, { id: `vocab:${i}`, tier: 500, state: 'learning', reps, lapses: 0, stability: 1, lastReview: T }]));
const siddur = D.registry.find((e) => e.category === 'siddur'), torah = D.registry.find((e) => e.category === 'torah');
const rd = (textId, at) => ({ textId, lineId: textId, words: 6, ms: 9000, stumbled: 0, stumbledIdx: [], at });

test('data file: five certificate-free milestones, valid kinds, hash links, draft status, no badge or level wording', () => {
  const j = JSON.parse(readFileSync(new URL('../data/progress/personal-milestones.json', import.meta.url), 'utf8'));
  assert.match(j.status, /draft/);
  assert.deepEqual(j.milestones.map((m) => m.id), ['words-100', 'prayer-read', 'siddur-25', 'siddur-50', 'siddur-75']);
  for (const m of j.milestones) { assert.ok(['words', 'prayerRead', 'coverage'].includes(m.kind)); assert.match(m.href, /^#\//); }
  assert.deepEqual(j.milestones.filter((m) => m.kind === 'coverage').map((m) => m.pct), [25, 50, 75]);
  assert.doesNotMatch(JSON.stringify(j), /certificate (of|for)|badge|level \d|fluent/i);
  assert.ok(siddur && torah, 'registry has siddur and torah texts for the prayer-read tests');
});

test('fresh learner: nothing reached, every milestone measurable and at zero', () => {
  const e = evalFor(fake());
  assert.equal(e.length, 5); assert.ok(e.every((x) => !x.done && x.have === 0 && x.datedAt === null));
});

test('first 100 words: 99 started is short, 100 reaches it, a card never reviewed does not count, word cards from lessons do', () => {
  assert.deepEqual([by(evalFor(Object.assign(fake(), {})))['words-100'].done], [false]);
  const mk = (n, extra = {}) => { const st = fake(); st.set('srs.vocab', { ...wordCards(n), ...extra }); return by(evalFor(st))['words-100']; };
  let w = mk(99); assert.deepEqual([w.done, w.have, w.need], [false, 99, 100]);
  w = mk(100); assert.deepEqual([w.done, w.have], [true, 100]);
  w = mk(99, { 'vocab:x': { id: 'vocab:x', tier: 500, state: 'new', reps: 0, lapses: 0 } }); assert.equal(w.done, false);
  const st = fake(); st.set('srs.vocab', wordCards(98)); st.set('srs.cards', { 'word:r03:1': { id: 'word:r03:1', reps: 2 }, 'word:r03:2': { id: 'word:r03:2', reps: 1 }, 'letter:bet': { id: 'letter:bet', reps: 9 } });
  assert.equal(by(evalFor(st))['words-100'].done, true); // 98 + 2 lesson words; the letter card is not a word
  assert.equal(mk(150).have, 100, 'have is capped at the target');
});

test('first prayer read: needs a timed read of a siddur text; a Torah text does not count; the earliest read dates it', () => {
  const mk = (reads) => { const st = fake(); st.set('timedread.v1', { v: 1, reads }); return by(evalFor(st))['prayer-read']; };
  assert.equal(mk([]).done, false);
  assert.equal(mk([rd(torah.id, T)]).done, false);
  assert.equal(mk([rd('no-such-text', T)]).done, false);
  const p = mk([rd(`${siddur.id}#2`, T), rd(siddur.id, T - 5 * 86400000)]);
  assert.equal(p.done, true); assert.equal(p.datedAt, T - 5 * 86400000); // line ids "entry#n" resolve to the entry
});

test('siddur coverage 25 / 50 / 75: each flips at its threshold, the best service decides, and have is the percent', () => {
  const none = by(evalFor(fake()));
  assert.deepEqual(['siddur-25', 'siddur-50', 'siddur-75'].map((id) => none[id].done), [false, false, false]);
  const st = fake(); lessons(st, readIds);
  const s = M.readSnapshot(st), c = M.makeContext(s, D, T);
  const best = Math.max(...M.siddurCoverageAll(s, D, c).map((x) => x.pct));
  const full = by(evaluateMilestones(s, D, c));
  for (const [id, pct] of [['siddur-25', 25], ['siddur-50', 50], ['siddur-75', 75]]) { assert.equal(full[id].done, best >= pct, id); assert.equal(full[id].have, Math.min(best, pct)); assert.equal(full[id].need, pct); }
  assert.ok(best >= 25, 'the whole read track must open at least a quarter of one service');
  // partial: find a prefix of lessons whose best coverage sits between thresholds
  let seen = new Set();
  for (let n = 1; n <= readIds.length; n++) { const s2 = fake(); lessons(s2, readIds.slice(0, n)); const sn = M.readSnapshot(s2); const b = Math.max(...M.siddurCoverageAll(sn, D, M.makeContext(sn, D, T)).map((x) => x.pct)); const e = by(evalFor(s2)); assert.equal(e['siddur-25'].done, b >= 25); assert.equal(e['siddur-75'].done, b >= 75); seen.add(b >= 75 ? 3 : b >= 50 ? 2 : b >= 25 ? 1 : 0); }
  assert.ok(seen.has(0) && seen.size >= 2, 'thresholds are crossed one at a time as lessons are completed');
});

test('updateMilestones: new ones get a date, dated evidence wins over "noticed", an achieved one is never removed or re-dated', () => {
  const ev = (o) => [{ id: 'a', label: 'A', href: '#/', kind: 'words', done: true, have: 1, need: 1, datedAt: null, ...o }, { id: 'b', label: 'B', href: '#/', kind: 'prayerRead', done: true, have: 1, need: 1, datedAt: T - 3 * 86400000 }, { id: 'c', label: 'C', href: '#/', kind: 'coverage', done: false, have: 0, need: 25, datedAt: null }];
  const r1 = updateMilestones(null, ev(), T);
  assert.deepEqual(r1.newly, ['a', 'b']);
  assert.deepEqual(r1.state.achieved.a, { at: T, day: '2026-11-10', basis: 'noticed' });
  assert.deepEqual(r1.state.achieved.b, { at: T - 3 * 86400000, day: '2026-11-07', basis: 'dated' });
  assert.equal(r1.state.achieved.c, undefined);
  const later = noon('2026-12-01');
  const r2 = updateMilestones(r1.state, ev({ done: false }), later); // a dipped: still achieved, same date
  assert.deepEqual(r2.newly, []); assert.deepEqual(r2.state.achieved, r1.state.achieved);
  const r3 = updateMilestones(r2.state, [{ ...ev()[2], done: true }], later);
  assert.deepEqual(r3.newly, ['c']); assert.equal(r3.state.achieved.c.day, '2026-12-01'); assert.equal(r3.state.achieved.a.day, '2026-11-10');
  const future = updateMilestones(null, [{ ...ev()[1], datedAt: T + 9 * 86400000 }], T); // a timestamp from the future is not trusted
  assert.deepEqual(future.state.achieved.b, { at: T, day: '2026-11-10', basis: 'noticed' });
});

test('cleanMilestones tolerates anything and drops malformed entries', () => {
  for (const v of [null, undefined, 'x', 5, [], { achieved: 'no' }, { achieved: [] }]) assert.deepEqual(cleanMilestones(v), { v: 1, achieved: {} });
  const c = cleanMilestones({ achieved: { ok: { at: T, day: '2026-11-10', basis: 'dated' }, odd: { at: T, day: '2026-11-10', basis: 'zzz' }, noDay: { at: T }, badDay: { at: T, day: '10/11/2026' }, noAt: { day: '2026-11-10' }, nul: null } });
  assert.deepEqual(Object.keys(c.achieved).sort(), ['odd', 'ok']); assert.equal(c.achieved.odd.basis, 'noticed');
});

test('recordMilestones writes only when something is new, under progress.milestones.v1, and the file travels with the progress backup', () => {
  const st = fake(); lessons(st, readIds);
  const writes = []; st.subscribe((k) => writes.push(k));
  const e = evalFor(st);
  const first = recordMilestones(st, e, T); assert.ok(first.newly.includes('siddur-25'));
  assert.deepEqual(writes, ['progress.milestones.v1']);
  assert.equal(recordMilestones(st, e, T + 1000).newly.length, 0); assert.equal(writes.length, 1, 'nothing new: no write');
  const kept = st.get('progress.milestones.v1').achieved['siddur-25'];
  recordMilestones(st, e, noon('2027-01-01')); assert.deepEqual(st.get('progress.milestones.v1').achieved['siddur-25'], kept);
  assert.ok(PROGRESS_KEYS.includes('progress.milestones.v1'));
  const dst = fake(); assert.equal(importProgress(dst, JSON.stringify(exportProgress(st, T))).ok, true);
  assert.deepEqual(dst.get('progress.milestones.v1'), st.get('progress.milestones.v1'));
});

test('milestoneRows: date text says "first noticed" unless a stored timestamp dated it; unmet rows have no date', () => {
  const st = fake(); st.set('timedread.v1', { v: 1, reads: [rd(siddur.id, noon('2026-11-03'))] }); lessons(st, readIds);
  const e = evalFor(st), stored = updateMilestones(null, e, T).state;
  const rows = Object.fromEntries(milestoneRows(e, stored).map((r) => [r.id, r]));
  assert.equal(rows['prayer-read'].dateText, '2026-11-03'); assert.equal(rows['prayer-read'].basis, 'dated');
  assert.equal(rows['siddur-25'].dateText, 'first noticed 2026-11-10');
  assert.equal(rows['words-100'].achieved, false); assert.equal(rows['words-100'].dateText, null);
});

test('without the data file nothing is listed and nothing is written', () => {
  const st = fake(); const s = M.readSnapshot(st);
  assert.deepEqual(evaluateMilestones(s, { ...D, personal: null }, M.makeContext(s, D, T)), []);
});
