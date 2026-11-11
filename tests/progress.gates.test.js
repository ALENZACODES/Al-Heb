// Every gate kind evaluate() knows, crossed at its threshold (one short, at, beyond), plus belt and milestone state transitions.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore, createMemoryStorage } from '../src/store.js';
import * as M from '../src/progress/model.js';
import { loadProgressData } from '../src/progress/data.js';

const D = await loadProgressData();
const T = new Date('2026-11-10T12:00:00').getTime();
const fake = () => createStore({ storage: createMemoryStorage() });
const readIds = D.lessons.filter((l) => l.track === 'read').map((l) => l.id);
const ilIds = D.lessons.filter((l) => l.track === 'israel').map((l) => l.id);
const ctx = (seed = () => {}) => { const st = fake(); seed(st); return M.makeContext(M.readSnapshot(st), D, T); };
const lessons = (st, ids) => st.set('curriculum.progress', { completed: Object.fromEntries(ids.map((i) => [i, T])) });
const ev = (g, c) => M.evaluate(g, c);
const expectNum = (r, done, have, need) => { assert.equal(r.measurable, true); assert.deepEqual([r.done, r.have, r.need], [done, have, need]); };
/** First n lessons of the read track whose union teaches at least `k` letters. */
const lessonsForLetters = (k) => { const seen = new Set(); for (let i = 0; i < readIds.length; i++) { D.lessons.find((l) => l.id === readIds[i]).letters.forEach((x) => seen.add(x)); if (seen.size >= k) return readIds.slice(0, i + 1); } return readIds; };

// ---------- letters ----------
test('letters (count): one short, exactly, beyond', () => {
  const need = 9, ids = lessonsForLetters(need);
  const under = ctx((st) => lessons(st, ids.slice(0, -1)));
  const r0 = ev({ kind: 'letters', count: need }, under); assert.equal(r0.done, false); assert.ok(r0.have < need);
  const at = ctx((st) => lessons(st, ids)); const r1 = ev({ kind: 'letters', count: need }, at); assert.equal(r1.done, true); assert.equal(r1.have, need);
  const over = ctx((st) => lessons(st, readIds)); expectNum(ev({ kind: 'letters', count: need }, over), true, need, need); // have is capped at need
});
test('letters (ids): tracing counts, a lesson counts, missing one id fails', () => {
  const g = { kind: 'letters', ids: ['shin', 'bet', 'tav'] };
  expectNum(ev(g, ctx()), false, 0, 3);
  expectNum(ev(g, ctx((st) => lessons(st, ['r01']))), false, 2, 3); // r01 teaches shin and bet
  expectNum(ev(g, ctx((st) => { lessons(st, ['r01']); st.set('letters.progress', { tav: { print: { completions: 1 } } }); })), true, 3, 3);
  expectNum(ev(g, ctx((st) => st.set('letters.progress', { tav: { print: { completions: 0 } } }))), false, 0, 3); // unfinished tracing is nothing
});
// ---------- signs ----------
test('signs (ids and count): tracing never teaches a sign; lessons do', () => {
  const g = { kind: 'signs', ids: ['kamatz', 'patach', 'dagesh'] };
  expectNum(ev(g, ctx((st) => st.set('letters.progress', { bet: { print: { completions: 3 } } }))), false, 0, 3);
  expectNum(ev(g, ctx((st) => lessons(st, ['r01']))), false, 2, 3); // kamatz, patach
  expectNum(ev(g, ctx((st) => lessons(st, ['r01', 'r02']))), true, 3, 3); // + dagesh
  const c = ctx((st) => lessons(st, ['r01', 'r02']));
  const n = c.know.signs.size;
  expectNum(ev({ kind: 'signs', count: n + 1 }, c), false, n, n + 1); expectNum(ev({ kind: 'signs', count: n }, c), true, n, n);
});
// ---------- decode / decodeWords ----------
test('decodeWords: Shabbat needs shin, bet, tav, patach, kamatz, dagesh, shin-dot; Shalom adds lamed, mem-final, vav, cholam', () => {
  const g = { kind: 'decodeWords', words: ['שַׁבָּת', 'שָׁלוֹם'] };
  expectNum(ev(g, ctx((st) => lessons(st, ['r01']))), false, 0, 2);
  expectNum(ev(g, ctx((st) => lessons(st, ['r01', 'r02']))), false, 1, 2);
  expectNum(ev(g, ctx((st) => lessons(st, ['r01', 'r02', 'r03']))), true, 2, 2);
});
test('decode (registry entries): a text flips to done only when every line is fully decodable; unknown id never passes', () => {
  const g = { kind: 'decode', entries: ['bless-priestly-1'] };
  expectNum(ev(g, ctx()), false, 0, 1);
  const needed = M.readableNow(M.readSnapshot(fake()), D).lines.find((l) => l.entryId === 'bless-priestly-1').missing;
  assert.ok(needed.length > 1);
  // find the first prefix of the read track that decodes it, and check the prefix one shorter does not
  let n = 1; while (n <= readIds.length && !ev(g, ctx((st) => lessons(st, readIds.slice(0, n)))).done) n++;
  assert.ok(n <= readIds.length, 'the read track decodes it eventually');
  expectNum(ev(g, ctx((st) => lessons(st, readIds.slice(0, n - 1)))), false, 0, 1);
  expectNum(ev(g, ctx((st) => lessons(st, readIds.slice(0, n)))), true, 1, 1);
  expectNum(ev({ kind: 'decode', entries: ['no-such-text'] }, ctx((st) => lessons(st, readIds))), false, 0, 1);
  expectNum(ev({ kind: 'decode', entries: ['bless-priestly-1', 'bless-priestly-2', 'bless-priestly-3'] }, ctx((st) => lessons(st, readIds))), true, 3, 3);
});
// ---------- checkpoint ----------
test('checkpoint: 79% fails, 80% passes, an empty result is not a try, the stage must match', () => {
  const g = { kind: 'checkpoint', stage: 2 };
  expectNum(ev(g, ctx((st) => st.set('curriculum.checkpoints', { 2: { right: 79, total: 100 } }))), false, 0, 1);
  expectNum(ev(g, ctx((st) => st.set('curriculum.checkpoints', { 2: { right: 80, total: 100 } }))), true, 1, 1);
  expectNum(ev(g, ctx((st) => st.set('curriculum.checkpoints', { 2: { right: 0, total: 0 } }))), false, 0, 1);
  expectNum(ev(g, ctx((st) => st.set('curriculum.checkpoints', { 1: { right: 10, total: 10 }, 3: { right: 10, total: 10 } }))), false, 0, 1);
});
// ---------- lessonsThrough / lessonRange ----------
test('lessonsThrough: every lesson up to and including the target; later lessons do not count; order matters not', () => {
  const g = { kind: 'lessonsThrough', track: 'israel', through: 'il03' };
  expectNum(ev(g, ctx()), false, 0, 3);
  expectNum(ev(g, ctx((st) => lessons(st, ['il01', 'il03']))), false, 2, 3);
  expectNum(ev(g, ctx((st) => lessons(st, ['il03', 'il02', 'il01', 'il09']))), true, 3, 3);
  expectNum(ev({ kind: 'lessonsThrough', track: 'read', through: 'r02' }, ctx((st) => lessons(st, ilIds))), false, 0, 2); // wrong track
});
test('lessonRange: exact ids', () => {
  const g = { kind: 'lessonRange', ids: M.expandRange('r01-r03') };
  expectNum(ev(g, ctx((st) => lessons(st, ['r01', 'r02']))), false, 2, 3);
  expectNum(ev(g, ctx((st) => lessons(st, ['r01', 'r02', 'r03']))), true, 3, 3);
});
// ---------- srsMature ----------
test('srsMature: counts mature lesson cards plus mature vocab cards; stability 20 is learning, 21 is mature', () => {
  const card = (id, stability, extra = {}) => [id, { id, state: 'review', reps: 3, stability, lastReview: T, ...extra }];
  const g = { kind: 'srsMature', count: 3 };
  expectNum(ev(g, ctx((st) => st.set('srs.cards', Object.fromEntries([card('a', 20), card('b', 20), card('c', 20)])))), false, 0, 3);
  expectNum(ev(g, ctx((st) => st.set('srs.cards', Object.fromEntries([card('a', 21), card('b', 21), card('c', 20)])))), false, 2, 3);
  expectNum(ev(g, ctx((st) => { st.set('srs.cards', Object.fromEntries([card('a', 21), card('b', 21)])); st.set('srs.vocab', Object.fromEntries([card('v', 21, { tier: 500 })])); })), true, 3, 3);
  expectNum(ev(g, ctx((st) => st.set('srs.cards', Object.fromEntries([card('a', 50, { state: 'learning' }), card('b', 21), card('c', 21), card('d', 21)])))), true, 3, 3); // capped; learning state is not mature
});
// ---------- spotit ----------
test('spotit: below the minimum rounds it is unmet with a note; then the clean-round bound must reach the target', () => {
  const g = { kind: 'spotit', accuracy: 0.85 }, min = D.milestones.settings.spotItMinTrials;
  let r = ev(g, ctx((st) => st.set('curriculum.pairs', { 'bet|kaf': { trials: min - 1, errors: 0 } })));
  assert.equal(r.done, false); assert.equal(r.have, 0); assert.equal(r.need, 85); assert.match(r.note, new RegExp(`needs ${min} Spot It rounds`));
  r = ev(g, ctx((st) => st.set('curriculum.pairs', { 'bet|kaf': { trials: min, errors: 0 } }))); assert.equal(r.done, true); assert.equal(r.have, 100); assert.equal(r.note, null);
  r = ev(g, ctx((st) => st.set('curriculum.pairs', { 'bet|kaf': { trials: 20, errors: 3 } }))); assert.equal(r.done, true); assert.equal(r.have, 85);
  r = ev(g, ctx((st) => st.set('curriculum.pairs', { 'bet|kaf': { trials: 20, errors: 4 } }))); assert.equal(r.done, false); assert.equal(r.have, 80);
  r = ev(g, ctx((st) => st.set('curriculum.pairs', { 'bet|kaf': { trials: 10, errors: 1 }, 'dalet|resh': { trials: 10, errors: 1 } }))); assert.equal(r.done, true); // pooled: 18/20
});
// ---------- loanwords / vocabBand / phrases ----------
test('loanwords: only cards marked knew count', () => {
  const g = { kind: 'loanwords', count: 2 };
  expectNum(ev(g, ctx((st) => st.set('curriculum.loanwords', { a: { knew: true, at: T }, b: { knew: false, at: T } }))), false, 1, 2);
  expectNum(ev(g, ctx((st) => st.set('curriculum.loanwords', { a: { knew: true, at: T }, b: { knew: true, at: T }, c: null }))), true, 2, 2);
});
test('vocabBand: cards of the band with at least one review; other bands do not help', () => {
  const g = { kind: 'vocabBand', band: 500, started: 2 };
  const v = (id, tier, reps) => [id, { id, tier, reps, state: reps ? 'learning' : 'new', stability: 1 }];
  expectNum(ev(g, ctx((st) => st.set('srs.vocab', Object.fromEntries([v('a', 500, 1), v('b', 500, 0), v('c', 1000, 5)])))), false, 1, 2);
  expectNum(ev(g, ctx((st) => st.set('srs.vocab', Object.fromEntries([v('a', 500, 1), v('b', 500, 2), v('c', 1000, 5)])))), true, 2, 2);
  expectNum(ev({ kind: 'vocabBand', band: 2000, started: 1 }, ctx((st) => st.set('srs.vocab', Object.fromEntries([v('a', 500, 1)])))), false, 0, 1);
});
test('phrases: readable phrasebook phrases, which need the alphabet', () => {
  const c0 = ctx(); expectNum(ev({ kind: 'phrases', count: 1 }, c0), false, 0, 1);
  const c1 = ctx((st) => lessons(st, readIds)); const n = c1.read.phraseFull.length; assert.ok(n > 10);
  expectNum(ev({ kind: 'phrases', count: n }, c1), true, n, n); expectNum(ev({ kind: 'phrases', count: n + 1 }, c1), false, n, n + 1);
});
// ---------- timedRead ----------
const grey = D.gates.gates.G5[0], black = D.gates.gates.E5[0]; // timed-read skill checks of Brown belt G5 and Black belt E5
const rd = (o = {}) => ({ textId: 'shema-1', lineId: 'shema-1', words: 10, ms: 8000, stumbled: 0, stumbledIdx: [], at: T, ...o }); // 75 clean wpm
const withReads = (reads) => ctx((st) => st.set('timedread.v1', { v: 1, reads }));
test('timedRead: 0, 1, 2 reads are short of 3; the third qualifying read of the same text passes', () => {
  assert.equal(grey.minReads, 3);
  let r = ev(grey, ctx()); assert.deepEqual([r.done, r.have, r.need, r.measurable], [false, 0, 3, true]); assert.match(r.note, /needs 3 timed reads of one text with 8\+ words/);
  r = ev(grey, withReads([rd()])); assert.deepEqual([r.done, r.have], [false, 1]); assert.match(r.note, /1 of 3 reads of shema-1/);
  r = ev(grey, withReads([rd(), rd()])); assert.deepEqual([r.done, r.have], [false, 2]);
  r = ev(grey, withReads([rd(), rd(), rd()])); assert.deepEqual([r.done, r.have], [true, 3]); assert.match(r.note, /self-reported: shema-1, median 75 wpm/);
});
test('timedRead: reads of different texts never add up', () => {
  const r = ev(grey, withReads([rd(), rd({ textId: 'avot-1' }), rd({ textId: 'aleinu-1' })]));
  assert.equal(r.done, false); assert.equal(r.have, 1);
});
test('timedRead: median clean wpm one under the target fails, at the target passes (grey 70)', () => {
  const ms = (wpm, words = 10) => Math.round((words / wpm) * 60000);
  assert.equal(ev(grey, withReads([rd({ ms: ms(69) }), rd({ ms: ms(69) }), rd({ ms: ms(69) })])).done, false);
  assert.equal(ev(grey, withReads([rd({ ms: ms(70) }), rd({ ms: ms(70) }), rd({ ms: ms(70) })])).done, true);
  // the median decides: one slow read among fast ones does not block
  assert.equal(ev(grey, withReads([rd({ ms: ms(20) }), rd({ ms: ms(80) }), rd({ ms: ms(80) })])).done, true);
  assert.equal(ev(grey, withReads([rd({ ms: ms(20) }), rd({ ms: ms(20) }), rd({ ms: ms(80) })])).done, false);
  const r = ev(grey, withReads([rd({ ms: ms(60) }), rd({ ms: ms(60) }), rd({ ms: ms(60) })]));
  assert.match(r.note, /median 60 wpm and 100% clean on shema-1; target 70 wpm and 90%/);
});
test('timedRead: accuracy one stumble over the line fails; stumbles also slow the clean wpm', () => {
  // 20 words in 12 s = 100 wpm; 2 stumbles = 90% clean (ok), 3 = 85% (fails grey's 0.9)
  const w = (stumbled) => rd({ words: 20, ms: 12000, stumbled, stumbledIdx: Array.from({ length: stumbled }, (_, i) => i) });
  assert.equal(ev(grey, withReads([w(2), w(2), w(2)])).done, true);
  assert.equal(ev(grey, withReads([w(3), w(3), w(3)])).done, false);
  assert.equal(ev(black, withReads([w(1), w(1), w(1)])).done, true); // 95% clean, 95 wpm, 20 >= 12 words
  assert.equal(ev(black, withReads([w(2), w(2), w(2)])).done, false); // 90% < 95%
});
test('timedRead: reads shorter than minWords are ignored; black needs 12-word reads', () => {
  assert.equal(grey.minWords, 8); assert.equal(black.minWords, 12);
  const w7 = rd({ words: 7, ms: 5000 }), w8 = rd({ words: 8, ms: 5000 }); // 84 and 96 wpm: both fast enough, only length differs
  assert.equal(ev(grey, withReads([w7, w7, w7])).done, false); assert.equal(ev(grey, withReads([w7, w7, w7])).have, 0);
  assert.equal(ev(grey, withReads([w8, w8, w8])).done, true);
  const fast = rd({ words: 11, ms: 6000 }); // 110 wpm but too short for black
  assert.equal(ev(black, withReads([fast, fast, fast])).done, false); assert.equal(ev(black, withReads([fast, fast, fast])).have, 0);
  const ok = rd({ words: 12, ms: 8000 }); // 90 wpm
  assert.equal(ev(black, withReads([ok, ok, ok])).done, true);
});
test('timedRead: only the last 5 reads of a text count, so an old fast run is forgotten and a new fast run restores it', () => {
  const slow = rd({ ms: 20000 }), fast = rd({ ms: 6000 }); // 30 and 100 wpm
  assert.equal(ev(grey, withReads([fast, fast, fast])).done, true);
  assert.equal(ev(grey, withReads([fast, fast, fast, slow, slow, slow, slow, slow])).done, false); // window = 5 slow reads
  assert.equal(ev(grey, withReads([fast, fast, fast, slow, slow, slow, slow, slow, fast, fast, fast])).done, true); // last 5: slow, slow, fast, fast, fast
});
test('timedRead: corrupt or absent state counts as no reads', () => {
  for (const v of [null, undefined, 'x', { v: 1, reads: 'nope' }, { v: 1, reads: [{ textId: 'a' }, null, { textId: 'shema-1', words: 10, ms: 8000, stumbled: 11, at: T }] }]) {
    const r = ev(grey, ctx((st) => st.set('timedread.v1', v))); assert.equal(r.done, false); assert.equal(r.have, 0);
  }
});
// ---------- unmeasured / unknown ----------
test('unmeasured and unknown kinds are never done and never measurable', () => {
  for (const g of [{ kind: 'unmeasured' }, { kind: 'nonsense' }, {}]) assert.deepEqual(ev(g, ctx((st) => lessons(st, readIds))), { done: false, have: 0, need: 1, measurable: false });
});

// ---------- rank state transitions (Krav Maga style belts: earned only by finishing lessons, in order) ----------
test('rank states: later -> current -> earned as lessons are finished; one current rank at a time; skill checks never decide', () => {
  const states = (c) => Object.fromEntries(M.evaluateBelts(D, c).map((b) => [b.id, b.state]));
  const s0 = states(ctx()); assert.equal(s0.P0, 'current'); assert.ok(Object.values(s0).filter((x) => x === 'current').length === 1); assert.equal(s0.P1, 'later');
  const p0 = M.evaluateBelts(D, ctx())[0].lessons;
  assert.deepEqual(p0, ['r01', 'r02', 'r03', 'r04']);
  const s1 = states(ctx((st) => lessons(st, p0))); assert.equal(s1.P0, 'earned'); assert.equal(s1.P1, 'current');
  // every reading lesson done, no checkpoints, no timed reads: every rank is earned (skill checks are information only)
  const s2 = states(ctx((st) => lessons(st, D.lessons.filter((l) => l.track === 'read').map((l) => l.id))));
  assert.ok(Object.values(s2).every((x) => x === 'earned'), JSON.stringify(s2));
  // r01..r51 only: G5 earned, E1 current (the Intermediate reading lessons are its lessons), E2.. later
  const rOnly = readIds.filter((id) => /^r\d+$/.test(id));
  const s3 = states(ctx((st) => lessons(st, rOnly))); assert.equal(s3.G5, 'earned'); assert.equal(s3.E1, 'current'); assert.equal(s3.E5, 'later');
  // a gap holds back every later rank even when their lessons are done
  const s4 = states(ctx((st) => lessons(st, readIds.filter((id) => id !== 'r10')))); assert.equal(s4.P1, 'earned'); assert.equal(s4.P2, 'current'); assert.equal(s4.G5, 'later');
  // the timed-read checks still evaluate on the ranks they belong to
  const b = Object.fromEntries(M.evaluateBelts(D, ctx((st) => st.set('timedread.v1', { v: 1, reads: [rd(), rd(), rd()] }))).map((x) => [x.id, x]));
  assert.equal(b.G5.checks.find((g) => g.kind === 'timedRead').done, true); assert.equal(b.G5.state, 'later');
});
test('milestone path: later -> next -> done moves one step at a time, and a later milestone met early is done without changing "next"', () => {
  const st = fake();
  const status = () => Object.fromEntries(M.evaluatePath('read', D, M.makeContext(M.readSnapshot(st), D, T)).items.map((m) => [m.id, m.status]));
  let s = status(); assert.equal(s['rd-words'], 'next'); assert.equal(s['rd-l9'], 'later');
  lessons(st, ['r01', 'r02', 'r03']); s = status(); assert.equal(s['rd-words'], 'done'); assert.equal(s['rd-l9'], 'next');
  st.set('curriculum.checkpoints', { 1: { right: 8, total: 10 } }); s = status(); assert.equal(s['rd-cp1'], 'done'); assert.equal(s['rd-l9'], 'next'); // met out of order
  lessons(st, lessonsForLetters(9)); s = status(); assert.equal(s['rd-l9'], 'done'); assert.equal(s['rd-cp1'], 'done'); assert.equal(s['rd-bless1'], 'next');
});
