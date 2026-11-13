// together lane: the six pages on a fake DOM. Each page works end to end with stand-in storage, and Home is one tap away.
import test from 'node:test';
import assert from 'node:assert/strict';
import { install, newRoot, El, tick } from './wordtrace.fakedom.js';
import { createStore, createMemoryStorage } from '../src/store.js';

const doc = install();
const toNode = (c) => (typeof c === 'string' ? doc.createTextNode(c) : c);
El.prototype.append = function (...k) { for (const c of k) this.appendChild(toNode(c)); };
El.prototype.replaceChildren = function (...k) { for (const c of [...this.childNodes]) this.removeChild(c); this.append(...k.filter((x) => x != null)); };

const { ROUTES } = await import('../src/shell/router.js');
const { TOGETHER_ROUTES } = await import('../src/shell/together-routes.js');
const { readReg, GUEST } = await import('../src/shell/profile-slots.js');
const profiles = await import('../src/together/profiles.view.js');
const hall = await import('../src/together/hall.view.js');
const challenge = await import('../src/together/challenge.view.js');
const buddy = await import('../src/together/buddy.view.js');
const gift = await import('../src/together/gift.view.js');
const ratings = await import('../src/together/ratings.view.js');
const { readCode } = await import('../src/together/challenge.js');
const { ARCADE_GAMES } = await import('../src/games/arcade.catalog.js');

const T = new Date('2026-11-11T10:00:00').getTime();
const BASE = 'https://alef-review.onrender.com/';
const mk = (s = createMemoryStorage()) => ({ s, store: createStore({ storage: s, window: null }) });
const set = (root, id, value) => { root.querySelector(`#${id}`).value = value; };
const hrefs = (root) => root.querySelectorAll('a').map((a) => a.getAttribute('href'));
const said = (root, id) => root.querySelector(`#${id}`).textContent;

test('six routes, each with a lazy page under src/together, a menu label, and Home one tap away', async () => {
  assert.deepEqual(TOGETHER_ROUTES.map((r) => r.name), ['profiles', 'study-hall', 'friend-challenge', 'buddy', 'gift', 'ratings']);
  for (const r of TOGETHER_ROUTES) { assert.ok(ROUTES.includes(r)); assert.match(r.module, /^\.\.\/together\/[a-z]+\.view\.js$/); assert.equal(r.optional, true); }
  const { s, store } = mk();
  for (const [view, ctx] of [[profiles, { storage: s, store }], [hall, { storage: s, store }], [challenge, { storage: s, store }], [buddy, { storage: s, store }], [gift, { storage: s, store, lessons: [{ id: 'r01', title: 'One' }] }], [ratings, { storage: s, store, lessons: [], books: [] }]]) {
    const root = newRoot(doc); view.mount(root, ctx); await tick(20);
    assert.ok(hrefs(root).includes('#/'), 'Home link');
    assert.ok(root.querySelector('#view-title').textContent.length > 3);
  }
});

test('Profiles: add a second learner, switch to them (the app reloads), and their page starts empty', async () => {
  const { s, store } = mk();
  store.set('curriculum.progress', { completed: { r01: T } });
  let reloads = 0;
  const root = newRoot(doc); profiles.mount(root, { storage: s, store, now: T, reload: () => reloads++ });
  assert.match(root.textContent, /Learner 1 \(in use\)/); assert.match(root.textContent, /1 lesson finished/);
  assert.equal(root.querySelector('[data-pf-use]'), null, 'nothing to switch to yet');
  root.querySelector('#pf-add').click();
  assert.equal(said(root, 'pf-status'), 'Type a name.');
  set(root, 'pf-new-name', 'Dana'); root.querySelector('#pf-add').click();
  assert.match(said(root, 'pf-status'), /^Added\./);
  const use = root.querySelector('[data-pf-use=p2]');
  assert.equal(use.textContent, 'Switch To Dana');
  use.click();
  assert.equal(reloads, 1); assert.equal(readReg(s).active, 'p2');
  assert.equal(s.getItem('alef:curriculum.progress'), null);
  // deleting takes two presses and is never offered for the profile in use
  const again = newRoot(doc); profiles.mount(again, { storage: s, store, now: T, reload: () => reloads++ });
  assert.equal(again.querySelector('[data-pf-delete=p2]'), null);
  const del = again.querySelector('[data-pf-delete=p1]');
  del.click(); assert.equal(del.textContent, 'Delete Now'); assert.equal(readReg(s).list.length, 2);
  del.click(); assert.equal(readReg(s).list.length, 1); assert.match(said(again, 'pf-status'), /Learner 1 was deleted/);
});

test('Profiles: a guest session says what it is, ends with two presses and keeps nothing; or is kept under a new name', async () => {
  const { s, store } = mk();
  store.set('settings', { voice: 'f' });
  let reloads = 0;
  const ctx = { storage: s, store, now: Date.now(), reload: () => reloads++ };
  const root = newRoot(doc); profiles.mount(root, ctx);
  assert.match(root.textContent, /nothing is kept unless you choose to keep it/);
  root.querySelector('#pf-guest-start').click();
  assert.equal(readReg(s).active, GUEST); assert.equal(reloads, 1);
  createStore({ storage: s, window: null }).set('settings', { voice: 'm' });
  const g = newRoot(doc); profiles.mount(g, ctx);
  assert.match(g.querySelector('#pf-guest-open').textContent, /A guest session is open/);
  assert.equal(g.querySelector('#pf-add'), null, 'no profile changes during a guest session');
  const end = g.querySelector('#pf-guest-end');
  end.click(); assert.equal(readReg(s).active, GUEST, 'one press ends nothing');
  end.click(); assert.equal(readReg(s).active, 'p1'); assert.deepEqual(JSON.parse(s.getItem('alef:settings')), { voice: 'f' });
  // keep it instead
  root.querySelector('#pf-guest-start').click();
  const k = newRoot(doc); profiles.mount(k, ctx);
  set(k, 'pf-keep-name', 'Noam'); k.querySelector('#pf-guest-keep').click();
  assert.deepEqual(readReg(s).list.map((p) => p.name), ['Learner 1', 'Noam']); assert.equal(readReg(s).active, 'p2');
  // a browser that is not keeping data
  const none = newRoot(doc); profiles.mount(none, { storage: s, store: { persistent: false } });
  assert.match(none.textContent, /profiles cannot be used/);
});

test('Study Hall: everyone on the device on one board, the shared goal, and no ranking in Calm mode', async () => {
  const { s, store } = mk();
  store.set('curriculum.progress', { completed: { r01: T - 3600000, r02: T - 7200000 } }); store.set('retention.v1', { xp: { days: { '2026-11-10': 30 } } });
  const { addProfile, useProfile } = await import('../src/together/household.js');
  addProfile('Dana', s, T); useProfile('p2', s);
  const dana = createStore({ storage: s, window: null });
  dana.set('retention.v1', { xp: { days: { '2026-11-11': 80 } } }); dana.set('curriculum.progress', { completed: { r01: T - 60000 } });
  const root = newRoot(doc); hall.mount(root, { storage: s, store: dana, now: T, settings: { get: () => false } });
  const rows = root.querySelector('#sh-board').querySelectorAll('tr').slice(1).map((tr) => tr.textContent);
  assert.match(rows[0], /^1Dana \(you\)801/); assert.match(rows[1], /^2Learner 1302/);
  assert.match(root.querySelector('#sh-goal-text').textContent, /No shared goal is set/);
  const sel = root.querySelector('#sh-goal'); sel.value = '5'; sel.dispatch('change', { target: sel });
  assert.equal(root.querySelector('#sh-goal-text').textContent, '3 of 5 lessons this week, together. 2 to go.');
  assert.match(root.querySelector('#sh-feed').textContent, /Dana finished lesson r01, today\./);
  assert.match(root.querySelector('#sh-ach').textContent, /Learner 1: 1 lesson finished/);
  const calm = newRoot(doc); hall.mount(calm, { storage: s, store: dana, now: T, settings: { get: (k) => k === 'calmMode' } });
  assert.match(calm.textContent, /Calm mode is on, so nobody is ranked/);
  assert.ok(!calm.querySelector('#sh-board').textContent.includes('Place'));
  const alone = mk(); const a = newRoot(doc); hall.mount(a, { storage: alone.s, store: alone.store, now: T });
  assert.match(a.querySelector('#sh-alone').textContent, /Only one person learns on this device so far/);
});

test('Challenge A Friend: make a code and play it; a friend\'s code with a score lands in the list with the score to beat', async () => {
  const { s, store } = mk();
  const root = newRoot(doc); challenge.mount(root, { storage: s, store, now: T, base: BASE, random: () => 0.25 });
  set(root, 'ch-game', 'letterchomp'); set(root, 'ch-level', '2');
  root.querySelector('#ch-make').click();
  const code = root.querySelector('#ch-new-code').textContent;
  const c = readCode(code);
  assert.deepEqual([c.ok, c.game, c.level, c.score], [true, 'letterchomp', 2, null]);
  assert.equal(root.querySelector('#ch-play-new').getAttribute('href'), `#/letterchomp?challenge=${code.replace(/-/g, '')}&level=2`);
  assert.equal(root.querySelectorAll('[data-board]').length, 1);
  // the other device: a code that carries Dana's score, opened from a link
  const other = mk(); const { makeCode } = await import('../src/together/challenge.js');
  const r2 = newRoot(doc); challenge.mount(r2, { storage: other.s, store: other.store, now: T, base: BASE, query: { c: makeCode(c, 340).replace(/-/g, ''), n: 'Dana' } });
  set(r2, 'ch-code', makeCode(c, 340)); set(r2, 'ch-from', 'Dana'); r2.querySelector('#ch-open').click();
  assert.match(said(r2, 'ch-status'), /Letter Chomp, level 2\. Score to beat: 340\./);
  const card = r2.querySelector('[data-board]');
  assert.match(card.textContent, /Dana/); assert.match(card.textContent, /340/);
  assert.ok(hrefs(card).includes(`#/letterchomp?challenge=${code.replace(/-/g, '')}&level=2`));
  set(r2, 'ch-code', 'ABCD-EFGH-J'); r2.querySelector('#ch-open').click();
  assert.match(said(r2, 'ch-status'), /typing mistake|does not have/);
});

test('Buddy Pairing: make an update on one device, open its link on the other, and the buddy appears with their numbers', async () => {
  const a = mk(), b = mk();
  a.store.set('curriculum.progress', { completed: { r01: T, r02: T, r03: T } });
  const ra = newRoot(doc); buddy.mount(ra, { storage: a.s, store: a.store, now: T, base: BASE });
  set(ra, 'bd-name', 'Avi'); ra.querySelector('#bd-make').click();
  const link = ra.querySelector('#bd-link').textContent;
  assert.ok(link.startsWith(`${BASE}#/buddy?b=`));
  assert.match(ra.querySelector('#bd-out').textContent, /3 lessons, 3 this week/);
  assert.ok(ra.querySelector('img'), 'a QR code is offered');
  const rb = newRoot(doc); buddy.mount(rb, { storage: b.s, store: b.store, now: T + 5, query: { b: link.split('b=')[1] } });
  assert.match(said(rb, 'bd-status'), /Avi is now your buddy\..*Send them your update too\./);
  assert.match(rb.querySelector('#bd-list').textContent, /Avi: 0-day streak, 3 lessons, 3 this week\. Sent today\./);
  set(rb, 'bd-paste', 'nonsense'); rb.querySelector('#bd-open').click();
  assert.match(said(rb, 'bd-status'), /not a buddy update/);
  // the buddy shows in the Study Hall of that device too
  const hb = newRoot(doc); hall.mount(hb, { storage: b.s, store: b.store, now: T + 5 });
  assert.match(hb.querySelector('#sh-buddies').textContent, /Avi: 0-day streak, 3 lessons/);
});

test('Gift A Lesson: make a gift, open its link on another device, and the steps are the lesson then the games, with the note', async () => {
  const lessons = [{ id: 'r01', title: 'Shin and Bet' }, { id: 'r02', title: 'Tav' }];
  const { s, store } = mk();
  const root = newRoot(doc); gift.mount(root, { storage: s, store, lessons, base: BASE }); await tick(20);
  set(root, 'gf-lesson', 'r02'); set(root, 'gf-game-1', ARCADE_GAMES[0].id); set(root, 'gf-game-2', ''); set(root, 'gf-game-3', '');
  set(root, 'gf-from', 'Savta'); set(root, 'gf-note-in', 'Start here!');
  root.querySelector('#gf-make').click();
  const link = root.querySelector('#gf-link').textContent;
  assert.ok(link.startsWith(`${BASE}#/gift?g=`));
  const r2 = newRoot(doc); gift.mount(r2, { lessons, query: { g: link.split('g=')[1] } }); await tick(20);
  assert.equal(r2.querySelector('#gf-opened-h').textContent, 'A Gift From Savta');
  assert.equal(r2.querySelector('#gf-note').textContent, 'Start here!');
  assert.deepEqual(r2.querySelector('#gf-steps').querySelectorAll('a').map((a) => [a.textContent, a.getAttribute('href')]), [['Lesson: Tav', '#/learn?lesson=r02'], [`Game: ${ARCADE_GAMES[0].title}`, `#/${ARCADE_GAMES[0].id}`]]);
  const bad = newRoot(doc); gift.mount(bad, { lessons, query: { g: 'junk' } }); await tick(20);
  assert.match(said(bad, 'gf-status'), /not a gift from Aleph/);
  assert.ok(bad.querySelector('#gf-make'), 'the page falls back to the form');
});

test('My Ratings: what the learner has tried can be rated, the stars are saved in their own profile, and five stars bring suggestions', async () => {
  const { s, store } = mk();
  store.set('curriculum.progress', { completed: { r01: T } }); store.set('games.scores.v1', { [ARCADE_GAMES[0].id]: { best: 10 } });
  const lessons = [{ id: 'r01', title: 'Shin and Bet' }, { id: 'r02', title: 'Tav' }];
  const root = newRoot(doc); ratings.mount(root, { storage: s, store, now: T, lessons, books: [{ id: 'book1', title: 'The Monkey' }] }); await tick(20);
  assert.equal(root.querySelectorAll('[data-rate]').length, 2, 'the finished lesson and the played game; no book yet');
  assert.match(root.querySelector('#rt-none').textContent, /Give something 5 stars/);
  const five = () => root.querySelectorAll('button').filter((b) => b.getAttribute('aria-label') === `${ARCADE_GAMES[0].title}: 5 stars`)[0];
  five().click(); await tick(5);
  assert.equal(store.get('ratings.v1').items[`game:${ARCADE_GAMES[0].id}`].stars, 5);
  assert.match(said(root, 'rt-status'), /Saved ✓ .*: 5 stars\./);
  assert.equal(five().getAttribute('aria-pressed'), 'true');
  assert.ok(root.querySelector('#rt-suggest').querySelectorAll('li').length > 0);
  root.querySelectorAll('button').filter((b) => b.getAttribute('aria-label') === 'r01: Shin and Bet: 5 stars')[0].click(); await tick(5);
  assert.match(root.querySelector('#rt-suggest').textContent, /r02: Tav\. The next lesson after one you gave 5 stars\./);
  const empty = mk(); const e = newRoot(doc); ratings.mount(e, { storage: empty.s, store: empty.store, lessons, books: [] }); await tick(20);
  assert.match(e.querySelector('#rt-empty').textContent, /Nothing to rate yet/);
});
