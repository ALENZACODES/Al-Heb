// H1 scheduler transparency and H2 fitted weights on the device.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { review, newCard, retrievability, activeParams, INIT_S, MS_DAY, LOG_MAX } from '../src/curriculum/srs.js';
import { schedulerState, decodeLog, bucketOf, BUCKETS } from '../src/platform/sched-state.js';
import { fit, evaluate, histories, fitRecord, MIN_REVIEWS, DEFAULTS } from '../src/platform/fit.js';

const D = MS_DAY;

test('every review is logged on the card as day*10+rating, capped', () => {
  let c = newCard({ id: 'a', now: 0 });
  for (let i = 0; i < LOG_MAX + 5; i++) c = review(c, 3, i * 2 * D, DEFAULTS);
  assert.equal(c.log.length, LOG_MAX);
  assert.deepEqual(decodeLog(c).at(-1), { day: (LOG_MAX + 4) * 2, rating: 3 });
});

test('fitted parameters change scheduling only when passed or saved as active; defaults otherwise', () => {
  activeParams(null); // Node: no saved fit
  const a = review(newCard({ now: 0 }), 3, 0);
  assert.equal(a.stability, INIT_S[2]);
  const b = review(newCard({ now: 0 }), 3, 0, { init: [1, 2, 9, 20], grow: 1 });
  assert.equal(b.stability, 9);
  activeParams({ active: true, init: [1, 2, 7, 20], grow: 2 });
  assert.equal(review(newCard({ now: 0 }), 3, 0).stability, 7);
  activeParams(null);
});

test('scheduler state: states, interval buckets, due today and tomorrow, estimate and measured recall', () => {
  const now = Date.UTC(2026, 10, 12, 12); // TZ=UTC in the suite
  const rev = (id, last, due, stability, log) => ({ id, state: 'review', stability, difficulty: 5, reps: 2, lapses: 0, lastReview: last, due, log });
  const decks = {
    'srs.cards': {
      n1: { id: 'n1', state: 'new', due: now - 1, lastReview: null },
      r1: rev('r1', now - 3 * D, now - 1000, 3, [204010 + 3, 204030 + 3, 204040 + 1]), // 2 later reviews a day+ apart, one forgotten
      r2: rev('r2', now - D, now + 6 * 3600e3, 5, []), // due later today (UTC)
      r3: rev('r3', now, now + 20 * 3600e3, 5, []), // tomorrow
    },
    'srs.vocab': [{ id: 'l1', state: 'relearning', stability: 0.5, lastReview: now - 60e3, due: now + 540e3 }],
    'israel.cards': { junk: 5 },
  };
  const s = schedulerState(decks, now);
  assert.equal(s.total, 5);
  assert.deepEqual(s.byState, { new: 1, learning: 1, review: 3 });
  assert.equal(s.newWaiting, 1);
  assert.equal(s.dueNow, 1);
  assert.equal(s.dueToday, 2 + 1, 'overdue, later today and the relearning card');
  assert.equal(s.dueTomorrow, 1);
  assert.equal(s.buckets.reduce((a, b) => a + b.n, 0), 4);
  assert.equal(s.measured.n, 2); assert.equal(s.measured.recalled, 1); assert.equal(s.measured.rate, 0.5);
  const exp = (retrievability(3, 3) + retrievability(1, 5) + retrievability(0, 5)) / 3;
  assert.ok(Math.abs(s.estimate - exp) < 1e-12);
  assert.equal(bucketOf(0.2), 0); assert.equal(bucketOf(3), 2); assert.equal(bucketOf(400), BUCKETS.length - 1);
  assert.equal(schedulerState({}, now).estimate, null);
});

// Deterministic simulated learner whose memory follows the scheduler's own form with known parameters.
function simulate(truth, cards = 120, reviewsPerCard = 6, seed = 7) {
  let x = seed; const rnd = () => ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648);
  const deck = {};
  for (let k = 0; k < cards; k++) {
    let c = newCard({ id: 'c' + k, now: 0 }), day = 20000 + (k % 30);
    const r0 = 1 + Math.floor(rnd() * 4);
    c = review(c, r0, day * D, truth);
    for (let i = 1; i < reviewsPerCard; i++) {
      const gap = Math.max(1, Math.round(c.stability * (0.5 + rnd() * 2.5)));
      day += gap;
      const p = retrievability((day * D - c.lastReview) / D, c.stability);
      const g = rnd() < p ? (rnd() < 0.2 ? 4 : 3) : 1;
      c = review(c, g, day * D, truth);
    }
    deck[c.id] = c;
  }
  return { 'srs.cards': deck };
}

test('fit: too little history keeps the defaults and says how much is needed', () => {
  const r = fit(histories(simulate({ init: [1, 2, 5, 12], grow: 1.5 }, 10, 4)));
  assert.equal(r.enough, false);
  assert.ok(r.n < MIN_REVIEWS);
  const rec = fitRecord(r, 1, true);
  assert.equal(rec.active, false, 'never active without enough history');
  assert.deepEqual(rec.init, [...INIT_S]);
});

test('fit: recovers parameters closer to the truth than the defaults and lowers the loss on the same reviews', () => {
  const truth = { init: [1.5, 3, 7, 16], grow: 1.8 };
  const hs = histories(simulate(truth, 160, 7));
  const r = fit(hs);
  assert.equal(r.enough, true);
  assert.ok(r.better && r.lossFitted < r.lossDefault, `fitted ${r.lossFitted} vs default ${r.lossDefault}`);
  const err = (p) => p.init.reduce((a, v, i) => a + Math.abs(Math.log(v / truth.init[i])), 0) + Math.abs(Math.log(p.grow / truth.grow));
  assert.ok(err(r.params) < err(DEFAULTS), `fitted error ${err(r.params)} vs default ${err(DEFAULTS)}`);
  for (let i = 1; i < 4; i++) assert.ok(r.params.init[i] >= r.params.init[i - 1], 'Again <= Hard <= Good <= Easy');
  const rec = fitRecord(r, 5, true);
  assert.equal(rec.active, true);
  assert.equal(evaluate(hs, r.params).n, r.n);
});

test('the scheduler page shows the real state and the fit, with honest labels; the method is documented', () => {
  const v = readFileSync(new URL('../src/fsrs/scheduler.view.js', import.meta.url), 'utf8');
  assert.match(v, /platform\/scheduler-live\.js/);
  const live = readFileSync(new URL('../src/platform/scheduler-live.js', import.meta.url), 'utf8');
  assert.match(live, /the scheduler's own estimate/i);
  assert.match(live, /not enough review history yet/i);
  const doc = readFileSync(new URL('../docs/srs/FITTED-WEIGHTS.md', import.meta.url), 'utf8');
  assert.match(doc, /log loss/i);
  assert.match(doc, /MIN_REVIEWS|300 reviews/);
});

test('scheduler page mounted with cards: live section, honest "not enough history" state, still one status region, nothing stored', async () => {
  const { N, tick, memStore } = await import('./torahread.fakedom.js');
  const V = await import('../src/fsrs/scheduler.view.js');
  const store = memStore();
  let c = newCard({ id: 'x', now: 0 }); c = review(c, 3, Date.now() - 2 * D, DEFAULTS);
  store.m['srs.cards'] = { x: c };
  const root = new N('main'); const un = V.mount(root, { store }); await tick(80);
  assert.match(root.textContent, /Your Reviews Now/);
  assert.match(root.textContent, /1 card on this device/);
  assert.match(root.textContent, /Not enough review history yet: 0 of 300 reviews/);
  assert.equal(root.queryAll('[role="status"]').length, 1);
  assert.equal(root.queryAll('h1').length, 1);
  assert.deepEqual(Object.keys(store.m), ['srs.cards'], 'opening the page stores nothing');
  un();
});
