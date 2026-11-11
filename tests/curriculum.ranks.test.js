// Krav Maga style belts and rank patches (data/curriculum/belts.json + src/curriculum/ranks.js).
// The ladder is the IKMF-style chart: White P0; Yellow P1 P2; Orange P3 P4; Green P5 G1; Blue G2 G3; Brown G4 G5; Black E1..E5.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolveRanks, rankStates, rankSummary, rankByLesson, rangeText, rankLabel, rankA11y, rankBadge, lessonLevelLabel } from '../src/curriculum/ranks.js';

const rd = (p) => JSON.parse(readFileSync(new URL('../' + p, import.meta.url), 'utf8'));
const BELTS = rd('data/curriculum/belts.json');
const LESSONS = rd('data/curriculum/lessons.json').lessons;
const RANKS = resolveRanks(BELTS, LESSONS);

test('the ladder matches the chart: 7 belts, 16 ranks, patches and stripes per belt as drawn', () => {
  assert.deepEqual(BELTS.belts.map((b) => b.name), ['White', 'Yellow', 'Orange', 'Green', 'Blue', 'Brown', 'Black']);
  assert.deepEqual(RANKS.map((r) => `${r.belt}:${r.id}`), [
    'white:P0', 'yellow:P1', 'yellow:P2', 'orange:P3', 'orange:P4', 'green:P5', 'green:G1',
    'blue:G2', 'blue:G3', 'brown:G4', 'brown:G5', 'black:E1', 'black:E2', 'black:E3', 'black:E4', 'black:E5']);
  for (const r of RANKS) { assert.equal(r.id, r.patch + r.stripes); assert.ok(['P', 'G', 'E'].includes(r.patch)); }
  assert.deepEqual(BELTS.patches.P.name, 'Practitioner'); assert.deepEqual(BELTS.patches.G.name, 'Graduate'); assert.deepEqual(BELTS.patches.E.name, 'Expert');
  // no old Aleph Champ colours left
  assert.ok(!/"(red|purple|grey)"/.test(JSON.stringify(BELTS.belts)));
});

test('S-14: ranks follow course order; each is a contiguous ascending run; together they cover the Reading track once', () => {
  const order = LESSONS.filter((l) => l.track === 'read').map((l) => l.id);
  assert.deepEqual(RANKS.flatMap((r) => r.lessons), order);
  let at = 0;
  for (const r of RANKS) { assert.ok(r.lessons.length > 0, r.id); assert.equal(order.indexOf(r.lessons[0]), at, r.id); at += r.lessons.length; }
  // within the beginner lessons the numbers only go up, rank after rank
  const rNums = RANKS.flatMap((r) => r.lessons).filter((id) => /^r\d+$/.test(id)).map((id) => +id.slice(1));
  assert.deepEqual(rNums, [...rNums].sort((a, b) => a - b));
  assert.equal(RANKS[0].lessons[0], 'r01'); assert.equal(RANKS.find((r) => r.id === 'G5').lessons.at(-1), 'r51');
  // the Black belt E ranks are the 20 Intermediate reading lessons; the other 30 I- lessons are on the Israel track and have no rank
  const eIds = RANKS.filter((r) => r.patch === 'E').flatMap((r) => r.lessons);
  assert.equal(eIds.length, 20); assert.ok(eIds.every((id) => /^I-\d+$/.test(id)));
  const byLesson = rankByLesson(RANKS);
  for (const l of LESSONS.filter((x) => x.track === 'israel')) assert.equal(byLesson.get(l.id), undefined, l.id);
  assert.equal(LESSONS.filter((l) => /^I-\d+$/.test(l.id) && l.track === 'israel').length, 30);
});

test('rank table (lesson ranges) as shipped', () => {
  assert.deepEqual(Object.fromEntries(RANKS.map((r) => [r.id, r.range])), {
    P0: 'r01–r04', P1: 'r05–r09', P2: 'r10–r14', P3: 'r15–r19', P4: 'r20–r24', P5: 'r25–r27', G1: 'r28–r31', G2: 'r32–r35',
    G3: 'r36–r41', G4: 'r42–r47', G5: 'r48–r51', E1: 'I-01–I-04', E2: 'I-05–I-07', E3: 'I-08–I-10', E4: 'I-26–I-30', E5: 'I-31–I-35' });
});

test('labels: belt colour plus patch in text; accessible description names colour, patch and stripes', () => {
  const p2 = RANKS.find((r) => r.id === 'P2');
  assert.equal(p2.label, 'Yellow belt · P2'); assert.equal(rankLabel(p2), 'Yellow belt · P2');
  assert.equal(rankA11y(p2), 'Yellow belt, Practitioner 2: yellow P patch with 2 stripes');
  assert.equal(RANKS[0].label, 'White belt · P0'); assert.match(RANKS[0].a11y, /no stripes/);
  assert.equal(RANKS.find((r) => r.id === 'G1').label, 'Green belt · G1');
  assert.match(RANKS.find((r) => r.id === 'E5').a11y, /Black belt, Expert 5: red E patch with 5 stripes/);
  assert.equal(lessonLevelLabel({ id: 'r12', level: 'yellow' }, rankByLesson(RANKS)), 'Yellow belt · P2');
  assert.equal(lessonLevelLabel({ id: 'I-11', level: 'B1' }, rankByLesson(RANKS)), 'Stage 3');
  assert.equal(rangeText(['I-09', 'I-10', 'I-26', 'I-27']), 'I-09–I-10, I-26–I-27');
  assert.equal(rangeText(['r05']), 'r05');
});

test('earning: only by finishing lessons, and only in order', () => {
  const ids = (k) => RANKS.slice(0, k).flatMap((r) => r.lessons);
  const st = (done) => Object.fromEntries(rankStates(RANKS, done).map((r) => [r.id, r.state]));
  let s = st(new Set());
  assert.equal(s.P0, 'current'); assert.ok(RANKS.slice(1).every((r) => s[r.id] === 'later'));
  s = st(new Set(['r01', 'r02', 'r03'])); assert.equal(s.P0, 'current', 'three of four lessons is not the rank');
  s = st(new Set(ids(1))); assert.equal(s.P0, 'earned'); assert.equal(s.P1, 'current');
  // finishing a later rank's lessons does not earn it while an earlier rank is open
  s = st(new Set([...ids(1), ...RANKS[2].lessons])); assert.equal(s.P1, 'current'); assert.equal(s.P2, 'later');
  // object form ({id: ms}) and array form are accepted
  const obj = Object.fromEntries(ids(3).map((id) => [id, 1]));
  assert.equal(st(obj).P2, 'earned'); assert.equal(st(ids(3)).P3, 'current');
  const all = rankSummary(RANKS, new Set(ids(RANKS.length)));
  assert.equal(all.highest.id, 'E5'); assert.equal(all.current, null); assert.equal(all.earnedCount, 16);
  const none = rankSummary(RANKS, {}); assert.equal(none.highest, null); assert.equal(none.current.id, 'P0');
});

test('a broken range is loud', () => {
  assert.throws(() => resolveRanks({ ...BELTS, ranks: [{ id: 'P0', belt: 'white', patch: 'P', stripes: 0, from: 'r09', to: 'r01' }] }, LESSONS), /P0/);
  assert.throws(() => resolveRanks({ ...BELTS, ranks: [{ id: 'P0', belt: 'white', patch: 'P', stripes: 0, from: 'r01', to: 'il03' }] }, LESSONS), /P0/);
});

test('rankBadge: visible text label, aria-hidden belt and patch, stripes drawn per rank', () => {
  const h = (tag, attrs, ...kids) => ({ tag, attrs, kids: kids.filter((k) => k != null) });
  const g3 = rankBadge(h, RANKS.find((r) => r.id === 'G3'));
  assert.equal(g3.attrs['data-belt'], 'blue'); assert.equal(g3.attrs['data-patch'], 'G'); assert.match(g3.attrs.title, /Blue belt, Graduate 3/);
  const [belt, patch, text] = g3.kids;
  assert.equal(belt.attrs['aria-hidden'], 'true'); assert.equal(patch.attrs['aria-hidden'], 'true'); assert.equal(patch.attrs['data-letter'], 'G');
  assert.equal(patch.kids.filter((k) => k.attrs.class === 'alef-rank-stripe').length, 3);
  assert.deepEqual(text.kids, ['Blue belt · G3']);
  const hidden = rankBadge(h, RANKS[0], { text: null });
  assert.equal(hidden.kids[2].attrs.class, 'visually-hidden'); assert.match(hidden.kids[2].kids[0], /White belt/);
});

test('CSS: every belt has a colour; white and black belts keep a visible outline in light and dark themes', () => {
  const css = readFileSync(new URL('../assets/css/learn.css', import.meta.url), 'utf8');
  for (const b of BELTS.belts) assert.match(css, new RegExp(`\\.alef-rank\\[data-belt="${b.id}"\\]\\s*\\{\\s*--belt:`), b.id);
  assert.match(css, /\.alef-rank-belt\s*\{[^}]*border:\s*1\.5px solid var\(--belt-edge\)/);
  assert.match(css, /prefers-color-scheme: dark[^\n]*\.alef-rank\s*\{\s*--belt-edge:/);
  assert.match(css, /:root\[data-theme="dark"\] \.alef-rank/);
  assert.match(css, /\.alef-rank-patch::before\s*\{\s*content: attr\(data-letter\)/);
  for (const p of ['G', 'E']) assert.match(css, new RegExp(`\\.alef-rank\\[data-patch="${p}"\\] \\.alef-rank-patch`));
});

test('skill checks and timed-read checks are keyed by real rank ids; speed targets live on ranks', () => {
  const ids = new Set(RANKS.map((r) => r.id));
  for (const k of Object.keys(rd('data/progress/belt-gates.json').gates)) assert.ok(ids.has(k), k);
  for (const [k, gs] of Object.entries(rd('data/timedread/gates.json').gates)) { assert.ok(ids.has(k), k); for (const g of gs) assert.equal(g.minWpm, RANKS.find((r) => r.id === k).wpmTarget); }
});
