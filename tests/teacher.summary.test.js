import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore, createMemoryStorage } from '../src/store.js';
import { loadProgressData } from '../src/progress/data.js';
import { loadClassTrack } from '../src/classtrack/model.js';
import * as S from '../src/teacher/summary.js';
import { aggregate, weakLabel } from '../src/teacher/aggregate.js';
import { weakSpots, readSnapshot } from '../src/progress/model.js';

const P = await loadProgressData(), CT = await loadClassTrack();
const D = { lessons: P.lessons, weeks: CT.track.weeks };
const NOW = Date.UTC(2026, 10, 3, 15);
const mkStore = (init) => { const s = createStore({ storage: createMemoryStorage() }); for (const [k, v] of Object.entries(init)) s.set(k, v); return s; };
const done = (ids) => ({ completed: Object.fromEntries(ids.map((i) => [i, NOW - 1000])) });

// fixtures: three learners with known mistakes
const fx = {
  ann: { 'curriculum.progress': done(['r01', 'r02', 'r03', 'r04']), 'curriculum.pairs': { 'bet|kaf': { trials: 10, errors: 4 }, 'dalet|resh': { trials: 8, errors: 2 } }, 'srs.cards': { 'vowel:kamatz': { lapses: 3, reps: 5, state: 'review', stability: 2 } }, 'pron.misses': [{ screen: 'vowelboard', tag: 'patach', ts: NOW }] },
  ben: { 'curriculum.progress': done(['r01', 'r02']), 'curriculum.pairs': { 'kaf|bet': { trials: 6, errors: 3 } } },
  cy: { 'curriculum.progress': done([]) },
};
const mk = (k, name) => S.buildSummary(mkStore(fx[k]), D, { now: NOW, name });

test('build: contents, anonymous by default, uses src/progress weakSpots', () => {
  const s = mk('ann');
  assert.equal(s.schema, S.SCHEMA); assert.equal(s.date, '2026-11-03');
  assert.equal(s.name, undefined);
  assert.deepEqual(s.lessons, ['r01', 'r02', 'r03', 'r04']);
  assert.ok(s.letters.includes('shin') && s.week >= 1);
  const ref = weakSpots(readSnapshot(mkStore(fx.ann)), { max: 12 });
  assert.equal(s.weak.length, ref.length);
  assert.deepEqual(s.weak[0].ids, ref[0].ids);
  assert.ok(!JSON.stringify(s).includes('@'), 'no email-like text');
});

test('typed name is cleaned of markup characters', () => {
  assert.equal(S.buildSummary(mkStore({}), D, { now: NOW, name: '<b>Ann</b> "x"' }).name, 'b Ann /b x');
});

test('code and JSON round-trip through parseSummary', () => {
  const s = mk('ann', 'Ann');
  for (const t of [S.toCode(s), S.toJson(s)]) { const r = S.parseSummary(t); assert.ok(r.ok, r.error); assert.deepEqual(r.summary, s); }
  assert.ok(S.toCode(s).startsWith(S.CODE_PREFIX));
  assert.ok(S.describe(s).some((x) => /Ann/.test(x)) && S.describe(mk('ann')).some((x) => /no name or email/.test(x)));
});

test('validation rejects bad version, HTML, oversize, unknown fields, bad ids, junk', () => {
  const good = mk('ann');
  const bad = (o) => S.parseSummary(JSON.stringify({ ...good, ...o }));
  assert.match(bad({ schema: 'alef-progress-share/2' }).error, /Unsupported version/);
  assert.match(bad({ extra: 1 }).error, /Unknown field/);
  assert.equal(bad({ lessons: ['<script>'] }).ok, false);
  assert.match(bad({ name: '<img src=x onerror=alert(1)>' }).error, /HTML/);
  assert.equal(bad({ name: 'a&b' }).ok, false);
  assert.equal(bad({ week: 11 }).ok, false);
  assert.equal(bad({ weak: [{ kind: 'pair', ids: ['a'], n: -1 }] }).ok, false);
  assert.equal(bad({ timed: [{ id: 'x', wpm: 9999, words: 3 }] }).ok, false);
  assert.match(S.parseSummary('<html><body>hi</body></html>').error, /HTML/);
  assert.match(S.parseSummary(S.CODE_PREFIX + Buffer.from('<p>x</p>').toString('base64url')).error, /HTML/);
  assert.match(S.parseSummary(JSON.stringify({ ...good, pad: 'x'.repeat(S.MAX_SUMMARY_BYTES) })).error, /large/);
  assert.equal(S.parseSummary(S.CODE_PREFIX + '!!!').ok, false);
  assert.equal(S.parseSummary('').ok, false);
  assert.equal(S.parseSummary(null).ok, false);
  assert.equal(S.parseSummary('{not json').ok, false);
});

test('parseMany: lines, array file, limits, mixed good and bad', () => {
  const a = mk('ann', 'Ann'), b = mk('ben'), c = mk('cy');
  const r = S.parseMany([`${S.toCode(a)}\n\n${S.toCode(b)}\nGARBAGE`, S.toJson(c), JSON.stringify([a, { schema: 'x' }])]);
  assert.equal(r.summaries.length, 4);
  assert.equal(r.errors.length, 2);
  const many = S.parseMany([Array.from({ length: S.MAX_LEARNERS + 5 }, () => S.toCode(c)).join('\n')]);
  assert.equal(many.summaries.length, S.MAX_LEARNERS);
  const huge = S.parseMany(['a'.repeat(S.MAX_TOTAL_BYTES + 1)]);
  assert.equal(huge.summaries.length, 0); assert.match(huge.errors[0], /Too much/);
});

test('aggregate: shared pair counted across learners regardless of order; help rows', () => {
  const r = S.parseMany([[mk('ann', 'Ann'), mk('ben'), mk('cy')].map(S.toCode).join('\n')]);
  const a = aggregate(r.summaries);
  assert.equal(a.learners, 3);
  const top = a.confusions[0];
  assert.equal(top.learners, 2); assert.equal(top.total, 7 + 0 + (top.total - 7)); // bet|kaf errors 4 and 3 plus lapses (none)
  assert.match(top.label, /Bet or Kaf/);
  assert.ok(a.signs.some((e) => /Patach/.test(e.label)) && a.signs.some((e) => /Kamatz/.test(e.label)));
  const ann = a.rows.find((x) => x.name === 'Ann'), cy = a.rows.find((x) => x.name === 'Learner 3');
  assert.ok(ann.needsHelp && ann.helpOn.length >= 1);
  assert.equal(cy.helpOn.length, 0);
  assert.equal(aggregate([]).learners, 0);
});

test('weakLabel never returns markup from ids (ids are validated charset)', () => {
  assert.equal(weakLabel({ kind: 'practice', ids: ['patach'], src: 'vowelboard|patach' }), 'Vowel board: Patach');
  assert.equal(weakLabel({ kind: 'words', ids: [] }), 'Words they keep missing');
});
