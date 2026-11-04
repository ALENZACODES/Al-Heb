import test from 'node:test';
import assert from 'node:assert/strict';
import { waitFor } from './helpers/waitfor.js';
import { N, tick, memStore } from './torahread.fakedom.js'; // fake DOM: checks view logic, not browser rendering
const T = await import('../src/home/today.js');
const { lessons, available } = await import('../src/curriculum/lessons.js');
const { mount } = await import('../src/shell/home.view.js');
const { matchRoute } = await import('../src/shell/router.js');
const { createSettings } = await import('../src/shell/settings.js');
const { t } = await import('../src/shell/i18n.js');

const all = () => true;
const base = (o = {}) => ({ completedIds: [], lessons, available, goal: 'read', dueCount: 0, streak: { count: 0 }, hasRoute: all, ...o });
const hrefs = (root) => root.queryAll('a').map((a) => a.attrs.href);

test('first run: no lessons done -> Continue points at /firstday, morning link present, no due link', () => {
  const m = T.buildToday(base());
  assert.equal(m.state, 'first-run'); assert.equal(m.primary.href, '#/firstday'); assert.equal(m.due.href, null);
  assert.equal(m.morning.href, '#/morning');
});
test('first run after the placement route was chosen: Continue goes to the check, or to its recommended lesson', () => {
  assert.equal(T.buildToday(base({ onboarding: { start: '/placement' } })).primary.href, '#/placement');
  assert.equal(T.buildToday(base({ onboarding: { start: '/placement' }, placement: { result: { lesson: 'r07' } } })).primary.href, '#/learn?lesson=r01'); // r07 is locked: the card points at the open lesson
  assert.equal(T.buildToday(base({ completedIds: [], onboarding: { start: '/placement' }, placement: { result: { lesson: 'r01' } } })).primary.href, '#/learn?lesson=r01');
  assert.equal(T.buildToday(base({ onboarding: { start: '/placement' }, placement: { result: { lesson: 'zzz' } } })).primary.href, '#/placement');
});
test('finished first 10 minutes with no lesson yet is not first-run: Continue is the first lesson', () => {
  const m = T.buildToday(base({ firstday: { done: true } }));
  assert.equal(m.state, 'learning'); assert.equal(m.primary.href, '#/learn?lesson=r01');
});
test('learning: next lesson comes from progress; both goal gives two lessons; Continue targets the first', () => {
  const m = T.buildToday(base({ completedIds: ['r01'], dueCount: 6, streak: { count: 3, activeToday: true } }));
  assert.equal(m.lessons[0].id, 'r02'); assert.equal(m.primary.href, '#/learn?lesson=r02');
  assert.equal(m.due.count, 6); assert.equal(m.due.href, '#/learn?review=1'); assert.equal(m.streak.count, 3);
  const both = T.buildToday(base({ completedIds: ['r01'], goal: 'both' }));
  assert.ok(both.lessons.length >= 1 && both.lessons.every((l) => l.href.startsWith('#/learn?lesson=')));
});
test('everything done: Continue falls back to review when cards are due, else to Learn', () => {
  const ids = lessons.map((l) => l.id);
  const m = T.buildToday(base({ completedIds: ids, dueCount: 2 }));
  assert.equal(m.allDone, true); assert.equal(m.primary.href, '#/learn?review=1');
  assert.equal(T.buildToday(base({ completedIds: ids })).primary.href, '#/learn');
});
test('hasRoute guards every link: no morning link, no firstday link, no learn links when the route is absent', () => {
  const noMorning = T.buildToday(base({ hasRoute: (n) => n !== 'morning' }));
  assert.equal(noMorning.morning, null);
  const noFirst = T.buildToday(base({ hasRoute: (n) => n === 'learn' }));
  assert.equal(noFirst.primary.href, '#/learn?lesson=r01');
  const none = T.buildToday(base({ completedIds: ['r01'], dueCount: 3, hasRoute: () => false }));
  assert.equal(none.primary, null); assert.equal(none.due.href, null); assert.deepEqual(none.lessons, []); assert.equal(none.morning, null);
  const R = T.renderToday(none, t); assert.deepEqual(hrefs(R), []);
});
test('render: every href is a real route, one primary button with text, due/streak wording kept for the smoke check', () => {
  const m = T.buildToday(base({ completedIds: ['r01'], dueCount: 6, streak: { count: 1, activeToday: false } }));
  const R = T.renderToday(m, t);
  for (const h of hrefs(R)) if (h !== '#/festivals') assert.ok(matchRoute(h).route, h); // /festivals: route not in router.js yet (main adds it); hasRoute hides the link until then
  assert.match(R.textContent, /6 cards due/); assert.match(R.textContent, /1 day\. Today is not counted yet/);
  const primary = R.queryAll('a.btn'); assert.equal(primary.length, 1); assert.match(primary[0].textContent, /^Continue: /);
  assert.equal(R.attrs['aria-labelledby'], 'h-today'); assert.equal(R.queryAll('h2').length, 1);
  const one = T.renderToday(T.buildToday(base({ completedIds: ['r01'], dueCount: 1 })), t); assert.match(one.textContent, /1 card due/);
  const fresh = T.renderToday(T.buildToday(base()), t); assert.match(fresh.textContent, /No reviews due/); assert.match(fresh.textContent, /No streak yet/);
  assert.equal(fresh.queryAll('a.btn')[0].attrs.href, '#/firstday');
});

const mk = (init = {}) => {
  const root = new N('div'); const store = memStore(); Object.assign(store.m, JSON.parse(JSON.stringify(init)));
  const sstore = memStore(); const settings = createSettings(sstore);
  return { root, store, ctx: { store, settings, t, hasRoute: all, route() {}, installPrompt: { available: () => false } } };
};
test('home view: first run shows Today with Continue -> #/firstday; existing sections remain; stores are not written', async () => {
  const { root, store, ctx } = mk(); const before = JSON.stringify(store.m);
  const un = mount(root, ctx); await waitFor(() => root.querySelector('#today-continue'));
  const host = root.querySelector('#home-today-host');
  assert.equal(host.queryAll('#today-continue')[0].attrs.href, '#/firstday');
  assert.equal(root.queryAll('h1').length, 1);
  assert.ok(root.queryAll('nav').length >= 1 && root.querySelector('#h-quick'));
  assert.equal(JSON.stringify(store.m), before, 'mounting Home writes nothing');
  un();
});
test('daily goal: defaults to 5, offers 5/10/15/20/30, click writes only onboarding.v1.dailyGoal and keeps focus', async () => {
  assert.equal(T.buildToday(base()).dailyGoal, 5); assert.equal(T.buildToday(base({ dailyGoal: 15 })).dailyGoal, 15); assert.equal(T.buildToday(base({ dailyGoal: 7 })).dailyGoal, 5);
  const { root, store, ctx } = mk(); const before = JSON.stringify(store.m);
  mount(root, ctx); await waitFor(() => root.querySelector('#today-goal'));
  assert.deepEqual(root.queryAll('[data-goal]').map((b) => b.attrs['data-goal']), ['5', '10', '15', '20', '30']);
  assert.equal(root.querySelector('[data-goal="5"]').attrs['aria-pressed'], 'true');
  root.querySelector('[data-goal="15"]').attrs.onclick?.() ?? root.querySelector('[data-goal="15"]').click?.();
  await waitFor(() => store.m[T.DAILY_GOAL_KEY] === 15, { message: "store.m[T.DAILY_GOAL_KEY] === 15" });
  assert.equal(store.m[T.DAILY_GOAL_KEY], 15); assert.equal(root.querySelector('[data-goal="15"]').attrs['aria-pressed'], 'true');
  const after = JSON.parse(JSON.stringify(store.m)); delete after[T.DAILY_GOAL_KEY]; assert.equal(JSON.stringify(after), before);
});
test('more practice: at most 3 links, only existing routes, untried first, festivals never tracked', () => {
  assert.deepEqual(T.buildToday(base()).more.map((m) => m.name), ['speak', 'typing', 'festivals']);
  assert.deepEqual(T.buildToday(base({ speak: { a: 1 }, typing: { b: 1 } })).more.map((m) => m.name), ['festivals', 'compare', 'speak']);
  assert.deepEqual(T.buildToday(base({ hasRoute: (n) => n === 'learn' || n === 'compare' })).more.map((m) => m.href), ['#/compare']);
  assert.deepEqual(T.buildToday(base({ hasRoute: (n) => n === 'learn' })).more, []);
  assert.equal(T.renderToday(T.buildToday(base({ hasRoute: (n) => n === 'learn' })), t).querySelector('#today-more'), null);
  assert.equal(T.renderToday(T.buildToday(base()), t).queryAll('#today-more a').length, 3);
  assert.equal(T.buildToday(base({ speak: {} })).more[0].name, 'speak'); // empty record is untried
});
test('home view: with progress it shows due count, streak and the next lesson', async () => {
  const day = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const { root, ctx } = mk({ 'curriculum.progress': { completed: { r01: 1 } }, 'srs.cards': {}, streak: { count: 2, best: 2, last: day(new Date()) } });
  mount(root, ctx); await waitFor(() => root.querySelector('#today-continue'));
  const c = root.querySelector('#today-continue'); assert.equal(c.attrs.href, '#/learn?lesson=r02');
  assert.match(root.querySelector('#today-streak').textContent, /2 days/);
  assert.match(root.querySelector('#today-due').textContent, /No reviews due/);
});
test('first-run Today card never points at a locked placed lesson (r13 case) and says the plain lesson id only when open', () => {
  const locked = lessons.find((l) => l.track === 'read' && l.prerequisites.length && l.id !== 'r01');
  const m = T.buildToday(base({ onboarding: { start: '/placement' }, placement: { result: { lesson: locked.id } } }));
  assert.equal(m.primary.href, '#/learn?lesson=r01');
  const open = T.buildToday(base({ onboarding: { start: '/placement' }, placement: { result: { lesson: 'r01' } } }));
  assert.equal(open.primary.href, '#/learn?lesson=r01');
});
test('streak copy states the real 5-minute rule; a paused streak shows the best; goal is labelled as study goal', () => {
  const txt = (streak) => T.renderToday(T.buildToday(base({ completedIds: ['r01'], streak })), t).textContent;
  assert.match(txt({ count: 0, best: 3 }), /Paused\. Your best streak was 3 days/);
  assert.doesNotMatch(txt({ count: 0, best: 3 }), /No streak yet/);
  assert.match(txt({ count: 0, best: 0 }), /No streak yet\. A day counts after 5 minutes/);
  assert.match(txt({ count: 2, best: 2, activeToday: false }), /2 days\. Today is not counted yet\. A day counts after 5 minutes/);
  assert.match(txt({ count: 2, best: 2, activeToday: true }), /and counting/);
  assert.doesNotMatch(txt({ count: 0, best: 0 }), /Finish a lesson or review a card to start one/);
  assert.match(txt({ count: 0 }), /Study goal:/); assert.match(txt({ count: 0 }), /streak always counts a day at 5 minutes/);
  assert.deepEqual([...T.DAILY_GOALS], [5, 10, 15, 20, 30]);
});
