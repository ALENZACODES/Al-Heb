import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore, createMemoryStorage } from '../src/store.js';
import * as M from '../src/progress/model.js';
import { weakReport, MAX_WEAK } from '../src/progress/weak.js';
import { loadProgressData } from '../src/progress/data.js';

const D = await loadProgressData();
const T = new Date('2026-11-10T12:00:00').getTime();
const fake = () => createStore({ storage: createMemoryStorage() });
const readIds = D.lessons.filter((l) => l.track === 'read').map((l) => l.id);
const report = (seed, o) => { const st = fake(); seed(st); const s = M.readSnapshot(st); return weakReport(s, D, M.makeContext(s, D, T), o); };
const card = (id, o) => [id, { id, kind: 'word', state: 'review', stability: 3, reps: 3, lapses: 0, lastReview: T, ...o }];
const ent = (m, perfect = 0) => ({ completions: 2, perfect, bestMistakes: m, last: '2026-11-01T00:00:00.000Z' });
const attempt = (he, heard, o = {}) => ({ at: T, kind: 'say', set: 's', itemId: 'i', he, mode: 'asr', outcome: 'miss', heard, ...o });
const read = (o) => ({ textId: 'shema-1', lineId: 'shema-1', words: 6, ms: 9000, stumbled: 0, stumbledIdx: [], at: T, ...o });
const subjects = (r) => r.map((x) => x.subject);

test('empty store: no rows, and a throwing store does not throw', () => {
  assert.deepEqual(report(() => {}), []);
  assert.doesNotThrow(() => weakReport(M.readSnapshot({ get() { throw new Error('x'); } }), D, { read: { lines: [] } }));
});

test('tracing: only a never-clean letter whose best run had 2+ slips appears, scored by that best run', () => {
  const r = report((st) => st.set('letters.progress', { bet: { print: ent(3) }, dalet: { print: ent(1) }, resh: { print: ent(4, 1) }, tav: { print: { completions: 0, perfect: 0, bestMistakes: null } }, mem: { print: ent(5), cursive: ent(2) } }));
  assert.deepEqual(subjects(r), ['letter:bet', 'letter:mem']); // dalet: 1 slip is normal; resh: has a clean run; tav: never finished
  assert.equal(r[0].score, 3); assert.equal(r[1].score, 2);
  assert.match(r[0].detail, /best tracing run still had 3 slips/); assert.match(r[0].next, /Trace it again, slowly/);
  assert.equal(r[0].href, '#/letters/bet');
});

test('vocabulary: lapses group by topic, a topic needs 2+ slips, and the text names the topic, not a word', () => {
  const r = report((st) => st.set('srs.vocab', Object.fromEntries([
    card('vocab:1', { tier: 500, topic: 'food-drink', lapses: 1 }), card('vocab:2', { tier: 500, topic: 'food-drink', lapses: 2 }),
    card('vocab:3', { tier: 500, topic: 'time-numbers', lapses: 1 }), card('vocab:4', { tier: 500, topic: 'body-health', lapses: 0 }),
    card('vocab:5', { tier: 1000, lapses: 2 })])));
  assert.deepEqual(subjects(r), ['vocab:food-drink', 'vocab:the first 1,000 words']);
  assert.equal(r[0].label, 'Words: food drink'); assert.equal(r[0].score, 3); assert.match(r[0].detail, /2 word cards slipped, 3 slips in all/);
  assert.match(r[0].next, /Review your food drink words/); assert.equal(r[0].href, '#/vocab');
});

test('speaking: only sounds with 3+ tries and a miss; the recognizer caveat appears for Say it evidence; drills carry none', () => {
  const say = [attempt('בבב', 'פפפ'), attempt('בבב', 'בבב', { outcome: 'match' })]; // bet class: 6 letters, 3 misses
  const drills = Array.from({ length: 4 }, (_, i) => ({ at: T, kind: 'pair', contrast: 'het-khaf', correct: i === 0 }));
  const r = report((st) => st.set('speak.v1', { v: 1, attempts: [...say, ...drills], mode: 'auto' }));
  const ids = subjects(r);
  assert.ok(ids.includes('sound:bet-vet') && ids.includes('sound:het-khaf'));
  const bet = r.find((x) => x.subject === 'sound:bet-vet'), het = r.find((x) => x.subject === 'sound:het-khaf');
  assert.match(bet.detail, /Missed 3 of 6 tries in speaking practice \(the browser's speech recognition may be part of the reason\)/);
  assert.doesNotMatch(het.detail, /recognition/); assert.equal(het.score, 3);
  assert.equal(bet.href, '#/speak'); assert.match(bet.next, /Say it round, or a sound drill/);
  assert.deepEqual(report((st) => st.set('speak.v1', { v: 1, attempts: [attempt('בב', 'פפ')] })), [], 'two tries are not enough evidence');
});

test('placement: missed letters, signs and phrases get their own row, other items one grouped row; correct answers add nothing', () => {
  const phrase = D.registry.find((e) => e.category === 'siddur');
  const r = report((st) => st.set('placement.v1', { v: 1, at: T, answers: [
    { id: 'letter:bet', correct: false }, { id: 'letter:alef', correct: true }, { id: 'vowel:kamatz', correct: false },
    { id: `phrase:${phrase.id}`, correct: false }, { id: 'word:x', correct: false }, { id: 'syllable:y', correct: false, picked: null }, null, { correct: false }] }));
  assert.deepEqual(subjects(r).sort(), ['letter:bet', 'placement:other', `phrase:${phrase.id}`, 'vowel:kamatz'].sort());
  assert.equal(r.find((x) => x.subject === 'placement:other').score, 2);
  assert.equal(r.find((x) => x.subject === 'vowel:kamatz').label, 'Sign: Kamatz'); assert.equal(r.find((x) => x.subject === 'vowel:kamatz').href, '#/vowelboard');
  assert.equal(r.find((x) => x.subject === `phrase:${phrase.id}`).href, `#/read/${encodeURIComponent(phrase.id)}`);
});

test('timed reads: a word marked in 2+ reads of a line shows as that Hebrew word; one stumble is noise', () => {
  const line = M.readableNow(M.readSnapshot(fake()), D).lines.find((l) => l.id === 'shema-1');
  const reads = [read({ stumbled: 2, stumbledIdx: [1, 3] }), read({ stumbled: 1, stumbledIdx: [1] }), read({ stumbled: 1, stumbledIdx: [2] })];
  const r = report((st) => st.set('timedread.v1', { v: 1, reads }));
  assert.equal(r.length, 1);
  assert.equal(r[0].subject, 'word:shema-1:1'); assert.equal(r[0].he, true); assert.equal(r[0].score, 2);
  assert.match(r[0].detail, /marked this word as a stumble in 2 of your 3 timed reads of .*\(self-reported\)/i);
  assert.equal(r[0].href, '#/timedread'); assert.match(r[0].next, /aloud again, slowly, then time one more read/);
  assert.ok(line && r[0].label.length > 0);
  assert.deepEqual(report((st) => st.set('timedread.v1', { v: 1, reads: [read({ stumbled: 1, stumbledIdx: [1] })] })), []);
  assert.deepEqual(report((st) => st.set('timedread.v1', { v: 1, reads: [read({ textId: 'gone', stumbled: 1, stumbledIdx: [0] }), read({ textId: 'gone', stumbled: 1, stumbledIdx: [0] })] })), [], 'a text that no longer exists is skipped');
});

test('same subject from several sources merges into one row with summed score and the strongest source\'s next step', () => {
  const r = report((st) => {
    st.set('letters.progress', { bet: { print: ent(2) } });
    st.set('srs.cards', Object.fromEntries([card('letter:bet', { kind: 'letter', lapses: 3 })]));
    st.set('placement.v1', { v: 1, answers: [{ id: 'letter:bet', correct: false }] });
  });
  assert.equal(r.length, 1); assert.equal(r[0].subject, 'letter:bet');
  assert.deepEqual([...r[0].sources].sort(), ['placement', 'srs', 'tracing']); assert.equal(r[0].score, 6);
  assert.match(r[0].detail, /Slipped 3 times in review; Your best tracing run still had 2 slips; Missed in the placement check/);
});

test('pairs, pronunciation misses and letter slips from the older report are kept; "words" rows are replaced by topic rows', () => {
  const r = report((st) => {
    st.set('curriculum.pairs', { 'bet|kaf': { errors: 4, trials: 9 } });
    st.set('pron.misses', [{ screen: 'vowelboard', tag: 'kamatz', ts: T }, { screen: 'vowelboard', tag: 'kamatz', ts: T }]);
    st.set('srs.cards', Object.fromEntries([card('word:r03:1', { lapses: 5 })]));
  });
  assert.deepEqual(subjects(r), ['vocab:lesson words', 'pair:bet|kaf', 'miss:vowelboard|kamatz']); // 5 slips, 4 mixed-up rounds, 2 misses
  assert.match(r[1].next, /Play Spot It on these two letters/);
});

test('ranked by score, capped at 10 by default and by max; ties break by source then subject', () => {
  const cards = Object.fromEntries(Array.from({ length: 14 }, (_, i) => card(`letter:l${String(i).padStart(2, '0')}`, { kind: 'letter', lapses: 14 - i })));
  const r = report((st) => st.set('srs.cards', cards));
  assert.equal(MAX_WEAK, 10); assert.equal(r.length, 10);
  assert.deepEqual(r.map((x) => x.score), [14, 13, 12, 11, 10, 9, 8, 7, 6, 5]);
  assert.equal(report((st) => st.set('srs.cards', cards), { max: 3 }).length, 3);
  const ties = report((st) => st.set('srs.cards', Object.fromEntries([card('letter:b', { kind: 'letter', lapses: 2 }), card('letter:a', { kind: 'letter', lapses: 2 })])));
  assert.deepEqual(subjects(ties), ['letter:a', 'letter:b']);
});

test('links are guarded by hasRoute: a missing route falls back to a route that exists, never to a dead link', () => {
  const seed = (st) => {
    st.set('letters.progress', { bet: { print: ent(3) } });
    st.set('srs.vocab', Object.fromEntries([card('vocab:1', { topic: 'food-drink', lapses: 3 })]));
    st.set('speak.v1', { v: 1, attempts: Array.from({ length: 4 }, () => ({ at: T, kind: 'pair', contrast: 'resh', correct: false })) });
    st.set('timedread.v1', { v: 1, reads: [read({ stumbled: 1, stumbledIdx: [0] }), read({ stumbled: 1, stumbledIdx: [0] })] });
    st.set('curriculum.pairs', { 'bet|kaf': { errors: 2, trials: 5 } });
  };
  const all = report(seed);
  assert.equal(all.find((x) => x.subject === 'letter:bet').href, '#/letters/bet');
  const none = report(seed, { has: () => false });
  const hrefs = Object.fromEntries(none.map((x) => [x.subject, x.href]));
  assert.equal(hrefs['letter:bet'], '#/learn?review=1'); assert.equal(hrefs['vocab:food-drink'], '#/learn?review=1'); assert.equal(hrefs['sound:resh'], '#/learn?review=1');
  assert.equal(hrefs['pair:bet|kaf'], '#/learn?review=1'); assert.match(none.find((x) => x.subject === 'pair:bet|kaf').next, /review cards/);
  assert.equal(hrefs['word:shema-1:0'], '#/learn?review=1', 'neither timedread nor read exists');
  const noTimed = report(seed, { has: (n) => n !== 'timedread' });
  assert.match(noTimed.find((x) => x.subject === 'word:shema-1:0').href, /^#\/read\/shema-1/, 'falls back to the Read screen when only timedread is absent');
  const onlySounds = report(seed, { has: (n) => n === 'sounds' });
  assert.equal(onlySounds.find((x) => x.subject === 'sound:resh').href, '#/sounds', 'speak missing, sounds present');
  for (const x of all.concat(none)) assert.match(x.href, /^#\//);
});

test('no row claims fluency or ability', () => {
  const r = report((st) => { st.set('letters.progress', { bet: { print: ent(3) } }); st.set('speak.v1', { v: 1, attempts: [attempt('בבב', 'פפפ')] }); });
  for (const x of r) assert.doesNotMatch(`${x.label} ${x.detail} ${x.next}`, /fluen|cannot read|can read|master/i);
});
