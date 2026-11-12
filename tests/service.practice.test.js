// Prayer Practice (#/prayer-practice, CODER-100 F3 F4 F5 F7 F8 F9): model rules and the page in a fake DOM (view logic, not browser rendering).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { N, memStore } from './torahread.fakedom.js';
import { waitFor } from './helpers/waitfor.js';
import { loadCorpus } from '../src/corpus/corpus.js';
import { loadJSON } from '../src/curriculum/data.js';
import { loadServiceData, coverage, ORDER_IDS } from '../src/service/model.js';
import { gradeLines } from '../src/progress/decode.js';
import { TOTALS, serviceRing, serviceTotals } from '../src/lib/counts.js';
import * as P from '../src/service/practice.model.js';
import { matchRoute } from '../src/shell/router.js';

const S = await loadServiceData({ loadCorpus });
const gaps = await loadJSON('data/corpus/gaps.json');
const POINTS = /[\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7]/; // points and cantillation (maqaf and sof pasuq are punctuation)
const NAME = /י[֑-ׇ]*ה[֑-ׇ]*ו[֑-ׇ]*ה/;
const { mount } = await import('../src/service/practice.view.js');
const NOW = new Date('2026-11-12T15:00:00Z');
const settings = { get: (k) => ({ congregation: 'sephardi' })[k] };
const mk = (init = {}, query = {}, audio) => { const root = new N('div'); const store = memStore(); for (const [k, v] of Object.entries(init)) store.set(k, v); return { root, store, ctx: { store, settings, audio, query, now: () => NOW } }; };
const fileAudio = (has = () => true) => ({ status: (k, id) => ({ source: has(k, id) ? 'file' : 'none' }), play: () => Promise.resolve({ ok: true }) });

test('F8: service totals come from the counts module and agree with the Service coverage (lines, words, prayers)', () => {
  const none = new Set();
  const lines = gradeLines(S.registry, none);
  for (const id of ORDER_IDS) {
    const t = serviceTotals(id), c = coverage(S.orders.orders[id], lines, none);
    assert.equal(t.lines, c.lines, `${id} lines`); assert.equal(t.words, c.words, `${id} words`); assert.equal(t.prayers, c.texts, `${id} prayers`);
    assert.equal(t.gaps, S.orders.orders[id].gaps.length);
    assert.equal(P.serviceLines(S.orders, id, S.byId).length, t.lines, 'line tutor covers every line');
    assert.equal(P.serviceDeck(S.orders, id, S.byId).length, t.words, 'word deck has every counted word');
  }
  assert.deepEqual(Object.keys(TOTALS.service).sort(), [...ORDER_IDS].sort());
});

test('F8: the ring is the mean of three capped shares, rounded down; a line card or Companion mark counts as followed', () => {
  const t = serviceTotals('friday-night');
  assert.equal(serviceRing('friday-night', null, null, null).pct, 0);
  const lines = Object.fromEntries(Array.from({ length: t.lines + 5 }, (_, i) => [`x${i}`, '2026-11-12']));
  const r = serviceRing('friday-night', { lines: { 'friday-night': lines } }, { practised: { 'candle-shabbat': '2026-11-12' } }, { 'line:hamotzi': {} }, S.orders.orders['friday-night'].items.map((x) => x.id));
  assert.equal(r.lines.have, t.lines, 'capped at the total');
  assert.equal(r.prayers.have, 2);
  assert.equal(r.pct, Math.floor(((1 + 0 + 2 / t.prayers) / 3) * 100));
  assert.equal(serviceRing('no-such', {}, {}, {}), null);
});

test('F3: line tutor lines come from the registry in service order; word numbers run across a text; English per line only when it lines up', () => {
  const L = P.serviceLines(S.orders, 'shabbat-morning', S.byId);
  const first = S.orders.orders['shabbat-morning'].items[0].id;
  assert.equal(L[0].entryId, first);
  for (const l of L) {
    assert.ok(S.byId.get(l.entryId).he.includes(l.he), 'line copied verbatim');
    assert.doesNotMatch(l.shown, NAME); assert.doesNotMatch(l.plain, NAME);
    assert.doesNotMatch(l.plain, POINTS, 'no vowel points in the plain line');
  }
  const multi = L.filter((l) => l.of > 1);
  assert.ok(multi.length > 0);
  const byText = new Map(); for (const l of multi) (byText.get(l.entryId) ?? byText.set(l.entryId, []).get(l.entryId)).push(...l.words.map((w) => w.n));
  for (const ns of byText.values()) assert.deepEqual(ns, ns.map((_, i) => i + 1), 'word clip numbers run across the whole text');
  assert.equal(multi[0].clip.id, `${multi[0].entryId}-l${multi[0].n}`);
});

test('F4/F7: record updates are pure and normalised; ladder auto-counts follow from the Companion or the tutor', () => {
  let r = P.normalizePractice({ junk: 1, lines: { a: { k: 'bad' } } });
  assert.deepEqual(r, { v: 1, lines: {}, words: {}, ladder: {} });
  r = P.withWord(r, 'friday-night', 'w1', true, '2026-11-12');
  assert.equal(r.words['friday-night'].w1, '2026-11-12');
  r = P.withWord(r, 'friday-night', 'w1', false, '2026-11-12');
  assert.equal(r.words['friday-night'], undefined);
  r = P.withStage(r, 'shema-1', 'vowels', true, '2026-11-12');
  let L = P.ladderOf(r, 'shema-1', new Set());
  assert.deepEqual(L.stages.map((s) => s.done), [false, false, true, false]);
  assert.equal(L.next, 'hear');
  L = P.ladderOf(r, 'shema-1', new Set(['shema-1']));
  assert.equal(L.stages[1].auto, true);
  r = P.withLine(r, 'friday-night', 'shema-1', '2026-11-12');
  assert.equal(P.ladderOf(r, 'shema-1', new Set(), ['shema-1'], 'friday-night').stages[1].done, true);
  assert.equal(P.withStage(r, 'shema-1', 'nonsense', true, '2026-11-12').ladder['shema-1'].nonsense, undefined);
});

test('F5: roadmap places every gap of the order once, with the gap list\'s own wording; nothing invented', () => {
  for (const id of ORDER_IDS) {
    const g = P.roadmap(S.orders, id, S.byId, S.guide, gaps);
    const c = P.roadmapCounts(g);
    assert.equal(c.held, S.orders.orders[id].items.length);
    assert.equal(c.notYet, S.orders.orders[id].gaps.length);
    const names = new Map(gaps.gaps.map((x) => [x.id, x.name]));
    for (const grp of g) for (const x of grp.notYet) assert.equal(x.name, names.get(x.id));
  }
});

test('F9/F2: festival skeleton is the guide\'s list; other festivals\' inserts are left out; high holidays are an honest gap', () => {
  const sk = P.festivalSkeleton(S.guide, gaps, S.byId, 'festivals');
  const occ = S.guide.otherOccasions.find((x) => x.id === 'festivals');
  assert.deepEqual(sk.held.map((x) => x.id), occ.prayers.filter((x) => S.byId.has(x)));
  assert.deepEqual(sk.notYet.map((x) => x.id), occ.gaps);
  const sukkot = P.festivalSkeleton(S.guide, gaps, S.byId, 'festivals', 'sukkot').held.map((x) => x.id);
  assert.ok(sukkot.includes('kiddush-festival-sukkot') && sukkot.includes('leshev-basukkah'));
  assert.ok(!sukkot.includes('kiddush-festival-pesach'));
  assert.equal(P.holidayPlan({ id: 'yom-kippur' }, S.guide, gaps, S.byId).kind, 'gap');
  assert.equal(P.holidayPlan({ id: 'purim' }, S.guide, gaps, S.byId).kind, 'none');
  assert.equal(P.holidayPlan({ id: 'hanukkah' }, S.guide, gaps, S.byId).skeleton.id, 'hanukkah');
  for (const x of sk.held) assert.doesNotMatch(x.he, NAME);
});

test('F10: countdown in whole minutes, rounded down; past is said plainly', () => {
  const t0 = Date.parse('2026-11-13T21:00:00Z');
  assert.equal(P.countdown(t0, t0 - (26 * 60 + 5) * 60000 - 30000).text, 'Candle lighting in 1 day, 2 hours, 5 minutes.');
  assert.equal(P.countdown(t0, t0 - 30000).text, 'Candle lighting in less than a minute.');
  assert.equal(P.countdown(t0, t0 + 1).past, true);
});

test('page: route, ring, line tutor marks lines and moves on, transliteration toggle, name never shown', async () => {
  assert.equal(matchRoute('#/prayer-practice').route.name, 'prayer-practice');
  const { root, ctx, store } = mk({}, { order: 'friday-night' }, fileAudio());
  const un = await mount(root, ctx);
  await waitFor(() => root.querySelector('#pp-line'));
  assert.match(root.querySelector('[data-ring]').attrs['data-ring'], /^friday-night:0$/);
  assert.match(root.textContent, /Lines read: 0 of 32/);
  assert.match(root.textContent, /Words known: 0 of 303/);
  assert.match(root.textContent, /Prayers followed: 0 of 17/);
  assert.match(root.querySelector('#pp-line-h').textContent, /Candle blessing/);
  assert.ok(root.queryAll('.pp-w').length > 0, 'word buttons where clips exist');
  assert.doesNotMatch(root.textContent, NAME);
  await root.querySelector('#pp-read').click();
  assert.deepEqual(Object.keys(store.m['service.practice'].lines['friday-night']), ['candle-shabbat']);
  assert.match(root.querySelector('#pp-line-h').textContent, /Welcoming Shabbat/, 'moved to the next line');
  assert.match(root.textContent, /Lines read: 1 of 32/);
  assert.ok(root.querySelector('.pp-tr'));
  await root.querySelector('#pp-tr').click();
  assert.equal(root.querySelector('.pp-tr'), null);
  assert.match(root.textContent, /does not listen to you or grade/);
  un();
});

test('page: word deck counts known words against the agreed total and can put a word back', async () => {
  const { root, ctx, store } = mk({}, { order: 'weekday-morning', mode: 'words' });
  await mount(root, ctx);
  await waitFor(() => root.querySelector('#pp-deck-card'));
  assert.equal(root.querySelector('[data-words]').attrs['data-words'], '0/353');
  await root.querySelector('#pp-reveal').click();
  await root.querySelector('#pp-know').click();
  assert.equal(root.querySelector('[data-words]').attrs['data-words'], '1/353');
  assert.equal(Object.keys(store.m['service.practice'].words['weekday-morning']).length, 1);
  assert.match(root.textContent, /Words known: 1 of 353/, 'the ring reads the same number');
  await root.querySelector('[data-unmark]').click();
  assert.equal(root.querySelector('[data-words]').attrs['data-words'], '0/353');
});

test('page: fluency ladder, roadmap and festivals tabs', async () => {
  const { root, ctx, store } = mk({ 'service.companion': { v: 1, practised: { 'shema-1': '2026-11-10' } } }, { order: 'shabbat-morning', mode: 'ladder' });
  await mount(root, ctx);
  await waitFor(() => root.querySelector('.pp-ladder'));
  assert.equal(root.querySelector('[data-prayer="shema-1"]').attrs['data-steps'], '1/4');
  await root.querySelector('[data-open="shema-1"]').click();
  assert.ok(root.querySelector('[data-plain]'));
  assert.doesNotMatch(root.querySelector('[data-plain]').textContent, POINTS);
  await root.querySelector('[data-mark="plain"]').click();
  assert.ok(store.m['service.practice'].ladder['shema-1'].plain);
  await root.querySelector('#pp-tab-roadmap').click();
  assert.match(root.textContent, /Not in Aleph yet: /);
  assert.ok(root.queryAll('[data-not-yet]').length === S.orders.orders['shabbat-morning'].gaps.length);
  await root.querySelector('#pp-tab-festivals').click();
  assert.ok(root.querySelector('[data-skeleton="festivals"]'));
  assert.ok(root.queryAll('[data-holiday]').length > 0, 'coming holidays from the calendar');
  assert.match(root.textContent, /festival Amidah is one of the parts not in Aleph yet/);
});

test('copyright and name: no pointed Hebrew typed into the new files; no page numbers', () => {
  for (const f of ['src/service/practice.model.js', 'src/service/practice.view.js']) {
    const s = readFileSync(new URL('../' + f, import.meta.url), 'utf8');
    assert.doesNotMatch(s.replace(/\/\/.*$/gm, ''), /[ְ-ּ]/, `${f}: no pointed Hebrew typed in`);
    assert.doesNotMatch(s, NAME);
  }
});
