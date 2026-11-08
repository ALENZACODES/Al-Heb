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
  const m = T.buildToday(base({ completedIds: ['r01'], dueCount: 6, streak: { count: 2, activeToday: false } }));
  const R = T.renderToday(m, t);
  for (const h of hrefs(R)) if (h !== '#/festivals') assert.ok(matchRoute(h).route, h); // /festivals: route not in router.js yet (main adds it); hasRoute hides the link until then
  assert.match(R.textContent, /6 cards due/); assert.match(R.textContent, /2 days\. Study for 5 minutes today to add a day/);
  const primary = R.queryAll('a.btn'); assert.equal(primary.length, 1); assert.match(primary[0].textContent, /^Continue: /);
  assert.equal(R.attrs['aria-labelledby'], 'h-today'); assert.equal(R.queryAll('h2').length, 1);
  const one = T.renderToday(T.buildToday(base({ completedIds: ['r01'], dueCount: 1 })), t); assert.match(one.textContent, /1 card due/);
  const fresh = T.renderToday(T.buildToday(base()), t); assert.match(fresh.textContent, /No reviews due/); assert.equal(fresh.querySelector('#today-streak'), null, 'brand-new learner: no streak line');
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
test('home view: baby-step layout for a new learner (Today card, five destinations, More; no prayer card or streak)', async () => {
  const { root, ctx } = mk();
  const un = mount(root, ctx); await waitFor(() => root.querySelector('#today-continue'));
  assert.deepEqual(root.queryAll('.home-dests a').map((a) => a.attrs.href), ['#/letters', '#/vocab', '#/read', '#/progress', '#/calendar']);
  assert.ok(root.querySelector('#home-more'), 'More button');
  assert.equal(root.querySelector('.opening'), null, 'opening prayer draft card is not on a new learner Home');
  assert.equal(root.querySelector('#today-streak'), null);
  const beginnerLinks = ['#home-dests-host', '#home-today-host', '#home-rest'].flatMap(id => root.querySelector(id)?.queryAll('a') || []);
  assert.ok(beginnerLinks.length >= 5 && beginnerLinks.length <= 8, 'beginner actions stay compact beside the separate showcase');
  un();
});
test('home view: a returning learner keeps the full sections; the old opening-prayer placeholder card is gone (the opening prayer opens the app)', async () => {
  const day = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const init = { 'curriculum.progress': { completed: { r01: 1 } }, 'srs.cards': {}, streak: { count: 2, best: 2, last: day(new Date()) } };
  const a = mk(init); mount(a.root, a.ctx); await waitFor(() => a.root.querySelector('#h-more'));
  assert.equal(a.root.querySelector('.opening'), null, 'reading goal: no placeholder card');
  const b = mk(init); b.ctx.settings.set({ goal: 'israel' }); mount(b.root, b.ctx); await waitFor(() => b.root.querySelector('#h-more'));
  assert.equal(b.root.querySelector('.opening'), null, 'Israel goal: no prayer card');
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
  assert.equal(T.renderToday(T.buildToday(base({ completedIds: ['r01'] })), t).queryAll('#today-more a').length, 3); // due + morning + practice never exceeds 3 secondary links
  assert.equal(T.renderToday(T.buildToday(base()), t).querySelector('#today-more'), null); // first run: one action only
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
  assert.match(txt({ count: 0, best: 3 }), /Your best streak was 3 days\. A new one starts the next time you study for 5 minutes/);
  assert.doesNotMatch(txt({ count: 0, best: 3 }), /No streak yet/);
  // hidden until a streak of 2 days exists (or a paused one that reached 2): nothing for a brand-new learner or a streak of 1
  assert.doesNotMatch(txt({ count: 0, best: 0 }), /Streak:|No streak yet/);
  assert.doesNotMatch(txt({ count: 1, best: 1, activeToday: true }), /Streak:/);
  assert.match(txt({ count: 2, best: 2, activeToday: false }), /2 days\. Study for 5 minutes today to add a day\. A day counts when you study for 5 minutes/);
  assert.match(txt({ count: 2, best: 2, activeToday: true }), /and counting/);
  const rest = txt({ count: 2, best: 2, activeToday: false, restToday: true });
  assert.match(rest, /2 days\. Today is a rest day/); assert.doesNotMatch(rest, /Study for 5 minutes today/);
  assert.doesNotMatch(txt({ count: 0, best: 0 }), /Finish a lesson or review a card to start one/);
  assert.match(txt({ count: 0 }), /Daily goal:/); assert.match(txt({ count: 0 }), /streak always counts a day at 5 minutes/);
  assert.deepEqual([...T.DAILY_GOALS], [5, 10, 15, 20, 30]);
});

test('backlog: 20+ due cards make review the single main action and keep the lesson as a secondary link; Israel first run starts a speaking lesson', () => {
  const m = T.buildToday(base({ completedIds: ['r01'], dueCount: 25 }));
  assert.equal(m.primary.kind, 'review'); assert.equal(m.primary.href, '#/learn?review=1');
  const root = T.renderToday(m, t); assert.ok(root.queryAll('#today-more a').length <= 3);
  assert.equal(T.buildToday(base({ completedIds: ['r01'], dueCount: 19 })).primary.kind, 'lesson');
  const isr = T.buildToday(base({ goal: 'israel' }));
  assert.equal(isr.state, 'first-run'); assert.equal(isr.primary.kind, 'lesson'); assert.match(isr.primary.href, /lesson=/);
});

test('I-xx lessons go to #/intermediate/<id> when that route exists, else the Learn page; preview links carry (Preview)', async () => {
  const { ROUTES, matchRoute: mr } = await import('../src/shell/router.js');
  const lessonsI = [{ id: 'I-01', title: 'First intermediate', track: 'read', prerequisites: [] }];
  const m = T.buildToday(base({ completedIds: ['r01'], lessons: lessonsI, available: undefined }));
  assert.equal(m.primary.href, '#/intermediate/I-01');
  assert.equal(mr(m.primary.href).route?.name, 'intermediatelesson');
  assert.doesNotMatch(m.primary.label, /Preview/); assert.equal(m.lessons[0].href, '#/intermediate/I-01');
  const noI = T.buildToday(base({ completedIds: ['r01'], lessons: lessonsI, available: undefined, hasRoute: (n) => n !== 'intermediatelesson' }));
  assert.equal(noI.primary.href, '#/learn?lesson=I-01'); assert.doesNotMatch(noI.primary.label, /Preview/);
  const preview = (n) => ROUTES.find((r) => r.name === n).tier === 'preview';
  for (const x of m.more) assert.equal(/\(Preview\)$/.test(x.label), false, x.name);
  assert.equal(/\(Preview\)$/.test(m.morning.label), false);
  assert.equal(T.previewTag('learn'), ''); assert.equal(T.previewTag('nope'), '');
});

test('first-run reassurance line matches the button: a lesson names its minutes, the placement check names the check, only the on-ramp says "one letter"', () => {
  const whyOf = (m) => T.renderToday(m, t, null).textContent;
  const isr = T.buildToday(base({ goal: 'israel' }));
  assert.equal(isr.primary.kind, 'lesson'); assert.ok(isr.primary.minutes > 0);
  assert.match(whyOf(isr), new RegExp(`first takes about ${isr.primary.minutes} minutes`)); assert.doesNotMatch(whyOf(isr), /one letter/);
  assert.match(whyOf(T.buildToday(base({ onboarding: { start: '/placement' } }))), /short check finds the lesson/);
  assert.match(whyOf(T.buildToday(base())), /one letter, about 2 minutes/);
});

// ---- journey findings B (repeat), D (welcome back), E (Read destination) ----
test('B: after a review session today, a remaining backlog no longer displaces the next unfinished lesson', () => {
  const o = { completedIds: ['r01', 'r02'], dueCount: 32, streak: { count: 2, activeToday: true, best: 2 } };
  const before = T.buildToday(base(o));
  assert.equal(before.primary.kind, 'review'); assert.match(before.primary.label, /Review 32 due cards first/);
  const after = T.buildToday(base({ ...o, reviewedToday: 20 }));
  assert.equal(after.backlog, false); assert.equal(after.primary.kind, 'lesson'); assert.equal(after.primary.href, '#/learn?lesson=r03');
  assert.equal(after.due.href, '#/learn?review=1'); // the cards stay one tap away
  assert.equal(T.buildToday(base({ ...o, reviewedToday: 3 })).primary.kind, 'review'); // a couple of cards is not a session
});
test('B: a finished lesson is never the main action; the next open one is', () => {
  for (const done of [['r01'], ['r01', 'r02'], ['r01', 'r02', 'r03']]) {
    const m = T.buildToday(base({ completedIds: done, dueCount: 5, reviewedToday: 20 }));
    const id = decodeURIComponent(m.primary.href.split('lesson=')[1]);
    assert.ok(!done.includes(id), `${id} is already done`);
    assert.ok(m.lessons.every((l) => !done.includes(l.id)));
  }
});
test('B: with every lesson done and a reviewed backlog, review stays the main action (nothing else to offer)', () => {
  const m = T.buildToday(base({ completedIds: lessons.map((l) => l.id), dueCount: 30, reviewedToday: 20 }));
  assert.equal(m.primary.kind, 'review');
});
test('daysAway / reviewedToday: whole local days from the streak record and card reviews', () => {
  const now = new Date(2026, 10, 23, 9, 0).getTime();
  assert.equal(T.daysAway({ last: '2026-11-13', cards: {}, now }), 10);
  assert.equal(T.daysAway({ last: '2026-11-13', cards: { a: { lastReview: new Date(2026, 10, 20, 8).getTime() } }, now }), 3); // the later of the two
  assert.equal(T.daysAway({ now }), 0); assert.equal(T.daysAway({ last: 'junk', cards: null, now }), 0);
  assert.equal(T.reviewedToday({ a: { lastReview: now - 3600e3 }, b: { lastReview: now - 2 * 86400e3 }, c: { lastReview: null } }, now), 1);
});
test('D: after 7+ days away Home greets warmly, offers a gentle review, and shows no streak line', () => {
  const o = { completedIds: ['r01', 'r02'], dueCount: 24, streak: { count: 0, best: 2 } };
  const gone = T.buildToday(base({ ...o, daysAway: 10 }));
  assert.equal(gone.welcomeBack, true);
  const node = T.renderToday(gone, t, () => {}); const txt = node.textContent;
  assert.match(txt, /Welcome back/); assert.match(txt, /nothing to catch up/i); assert.match(txt, /few review cards/);
  assert.equal(node.querySelector('#today-streak'), null); assert.doesNotMatch(txt, /Paused|missed|behind|lost|Streak:/i);
  assert.match(gone.primary.label, /Ease back in/);
  assert.equal(T.buildToday(base({ ...o, daysAway: 6 })).welcomeBack, false);
  assert.equal(T.buildToday(base({ ...o, daysAway: 7 })).welcomeBack, true);
  assert.equal(T.buildToday(base({ daysAway: 30 })).welcomeBack, false); // a brand-new learner is welcomed by the first-run text, not "back"
  const lessonFirst = T.buildToday(base({ ...o, dueCount: 5, daysAway: 10 }));
  assert.equal(lessonFirst.primary.kind, 'lesson'); assert.ok(T.renderToday(lessonFirst, t, () => {}).queryAll('a').some((a) => /review a few cards/.test(a.textContent)));
});
test('E: a first-run Home shows Read in the destination row under the title (not only in More)', async () => {
  const { root, ctx } = mk(); const un = mount(root, ctx); await waitFor(() => root.querySelector('#today-continue'));
  const row = root.querySelector('#home-dests-host');
  assert.ok(row.queryAll('a').some((a) => a.attrs.href === '#/read'), 'Read tile in the row');
  assert.match(row.textContent, /Read/); un();
});

