// Rimon stage (src/shell/rimon-stage.js) on a fake DOM: which still appears, where, and when nothing must happen.
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mountRimonStage, SEEN_KEY } from '../src/shell/rimon-stage.js';
import { STILL_IDS } from '../src/shell/rimon-stills.generated.js';
import { fileStem } from '../tools/images/rimon/stills.mjs';
import { createDocument, createWindow, createStore, ev, flush } from './rimon.fakedom.js';

const ALL = Object.values(STILL_IDS).flat();
const live = [];
afterEach(() => { for (const st of live.splice(0)) st.destroy(); }); // a failed assertion must not leave timers running
const FILES = Object.fromEntries(Array.from({ length: 200 }, (_, i) => [`a${String(i + 1).padStart(3, '0')}`, fileStem(i + 1)])); // as present.json lists them
const BY_FILE = Object.fromEntries(Object.entries(FILES).map(([id, f]) => [f, id]));
/** Still id from a URL: v2/rimon-007-starting-line.webp -> 'a007'; rimon-023.webp -> '023'. */
const num = (src) => { const m = String(src).match(/rimon\/(v2\/rimon-\d{3}-[a-z0-9-]+|rimon-[a-z0-9]+)\.webp/); if (!m) return null; return m[1].startsWith('v2/') ? BY_FILE[m[1]] ?? null : m[1].slice(6); };

function setup({ present = ALL, store = createStore(), date = new Date(2026, 10, 12, 14), route = 'home', hash = '#/' } = {}) {
  const doc = createDocument(), win = createWindow();
  win.location.hash = hash;
  const main = doc.createElement('main'); main.id = 'main'; doc.body.append(main);
  const h1 = doc.createElement('h1'); h1.textContent = 'Title'; main.append(h1);
  doc.body.dataset.route = route; doc.body.dataset.ready = '1';
  const calls = [];
  const companion = { showStill: (src, o = {}) => { calls.push({ id: src ? num(src) : null, ms: o.ms || 0, line: o.line || null }); return true; }, clearPose: () => calls.push({ clear: true }) };
  let clock = date;
  const stage = mountRimonStage({ store, companion, doc, win, present: { ids: [...present], files: FILES }, now: () => clock, loadImage: async (src) => !/missing/.test(src) });
  live.push(stage);
  return { doc, win, main, h1, store, stage, calls, setNow: (d) => { clock = d; }, ready: () => { doc.dispatchEvent(ev('alef:ready')); return flush(5); } };
}

test('no drawings yet: no stills, no DOM changes, no store writes', async () => {
  const s = setup({ present: [] });
  await s.stage.ready; await s.ready();
  s.doc.dispatchEvent(ev('alef:rimon', { action: 'correct' })); await flush(150);
  s.store.set('awards.v1', { awards: { a: 1 } }); await flush(5);
  assert.deepEqual(s.calls, []);
  assert.equal(s.doc.querySelector('.rimon-toast'), null);
  assert.equal(s.doc.querySelector('.rimon-hero'), null);
  s.stage.destroy();
});

test('a missing present.json is the same as no drawings', async () => {
  const doc = createDocument(), win = createWindow(), store = createStore();
  const stage = mountRimonStage({ store, companion: { showStill: () => { throw new Error('must not be called'); } }, doc, win, fetchJson: async () => { throw new Error('404'); } });
  live.push(stage);
  assert.equal(await stage.ready, false);
  assert.equal(stage.present.size, 0);
  stage.destroy();
});

test('Home: the first visit gets the hello still with its line, once', async () => {
  const s = setup();
  await s.stage.ready; await flush(5);
  assert.ok(STILL_IDS['greet.first'].includes(s.calls[0].id), 'greet.first');
  assert.match(s.calls[0].line.en, /I'm Rimon/);
  const seen = s.store.get(SEEN_KEY);
  assert.equal(seen['greet.first'], true); assert.equal(seen.firstDay, '2026-11-12');
  s.calls.length = 0; await s.ready();
  assert.ok(!STILL_IDS['greet.first'].includes(s.calls[0]?.id), 'hello is not repeated');
  s.stage.destroy();
});

test('Home on a festival: Rimon greets with the festival still; a veteran never gets the newcomer hello', async () => {
  const store = createStore({ 'curriculum.progress': { completed: { l1: 1 } } });
  const s = setup({ store, date: new Date(2027, 2, 23, 10) }); // Purim 5787
  await s.stage.ready; await flush(5);
  assert.ok(STILL_IDS['holiday.purim'].includes(s.calls[0].id), `got ${s.calls[0].id}`);
  assert.equal(s.calls[0].line.en, 'Happy Purim!');
  s.stage.destroy();
});

test('quiet day: nothing at all on Yom HaShoah, and the body is marked so CSS hides the companion', async () => {
  const s = setup({ date: new Date(2027, 4, 4, 10) });
  await s.stage.ready; await s.ready();
  s.doc.dispatchEvent(ev('alef:rimon', { action: 'correct' })); await flush(150);
  assert.equal(s.doc.body.dataset.rimonQuiet, 'day');
  assert.deepEqual(s.calls, []);
  s.stage.destroy();
});

test('quiet route: no stills on the Torah reader', async () => {
  const s = setup({ route: 'torahread' });
  await s.stage.ready; await s.ready();
  assert.equal(s.doc.body.dataset.rimonQuiet, 'route');
  assert.deepEqual(s.calls, []);
  s.stage.destroy();
});

test('screens: Rimon is dressed for the Brain Lab drill, with its line the first time that day', async () => {
  const store = createStore({ 'curriculum.progress': { completed: { l1: 1 } } });
  const s = setup({ store, route: 'labgame', hash: '#/lab/gematria' });
  await s.stage.ready; await flush(5);
  assert.deepEqual(s.calls.map((c) => c.id), STILL_IDS['lab.drill.gematria']);
  assert.equal(s.calls[0].ms, 0, 'a page still stays for the whole screen');
  s.doc.body.dataset.route = 'lab'; s.calls.length = 0; await s.ready();
  assert.ok(STILL_IDS['lab.home'].includes(s.calls[0].id));
  assert.match(s.calls[0].line.en, /drills/);
  s.calls.length = 0; await s.ready();
  assert.equal(s.calls[0].line, null, 'the line is said once a day');
  s.stage.destroy();
});

test('page not found and a broken screen get a large Rimon under the heading; the corner one steps aside', async () => {
  const s = setup({ route: 'notfound', store: createStore({ 'curriculum.progress': { completed: { l1: 1 } } }) });
  await s.stage.ready; await flush(5);
  const fig = s.doc.querySelector('.rimon-hero');
  assert.ok(fig && s.h1.nextSibling === fig);
  assert.ok(STILL_IDS['error.notfound'].includes(num(fig.querySelector('img').src)));
  assert.match(fig.textContent, /isn't here/);
  assert.equal(s.doc.body.dataset.rimonHero, 'error.notfound');
  s.main.replaceChildren(); const card = s.doc.createElement('section'); card.className = 'card alef-unavailable'; const h = s.doc.createElement('h1'); card.append(h); s.main.append(card);
  s.doc.body.dataset.route = 'learn'; await s.ready();
  assert.equal(s.doc.body.dataset.rimonHero, 'error.view');
  assert.ok(STILL_IDS['error.view'].includes(num(card.querySelector('.rimon-hero').querySelector('img').src)));
  s.stage.destroy();
});

test('answers: echoes merge into one pose; the first answers of a new learner get their own stills', async () => {
  const s = setup({ route: 'learn' });
  await s.stage.ready; await flush(5); s.calls.length = 0;
  s.doc.dispatchEvent(ev('alef:rimon', { action: 'correct' })); s.doc.dispatchEvent(ev('alef:rimon', { action: 'bounce' }));
  await flush(160);
  assert.equal(s.calls.length, 1);
  assert.ok(STILL_IDS['first.correct'].includes(s.calls[0].id), 'first.correct'); assert.ok(s.calls[0].ms > 0);
  const t0 = new Date(2026, 10, 12, 14).getTime();
  s.setNow(new Date(t0 + 5000)); s.doc.dispatchEvent(ev('alef:rimon', { action: 'correct' })); await flush(160);
  assert.ok(STILL_IDS['answer.correct'].includes(s.calls[1].id), 'then the ordinary right-answer stills');
  s.setNow(new Date(t0 + 10000)); s.doc.dispatchEvent(ev('alef:rimon', { action: 'wrong' })); await flush(160);
  assert.ok(STILL_IDS['first.mistake'].includes(s.calls[2].id), 'first.mistake');
  s.setNow(new Date(t0 + 15000)); s.doc.dispatchEvent(ev('alef:rimon', { action: 'nervous' })); await flush(10);
  assert.ok(STILL_IDS['game.timelow'].includes(s.calls[3].id), 'game.timelow');
  s.stage.destroy();
});

test('store changes: a streak milestone, a first badge and a finished book each bring a card at the bottom', async () => {
  const store = createStore({ streak: { count: 6, best: 6, last: '2026-11-11' }, 'curriculum.progress': { completed: { l1: 1 } } });
  const s = setup({ store, route: 'learn' });
  await s.stage.ready; await flush(5);
  store.set('streak', { count: 7, best: 7, last: '2026-11-12' }); await flush(5);
  let t = s.doc.querySelector('.rimon-toast');
  assert.ok(t); assert.equal(t.dataset.rimonTrigger, 'streak.day.7');
  assert.ok(STILL_IDS['streak.day.7'].includes(num(t.querySelector('img').src)));
  assert.match(t.textContent, /whole week/);
  assert.equal(s.doc.body.dataset.rimonToast, 'streak.day.7', 'the companion steps aside while the card shows');
  t.querySelector('.rimon-toast-x').dispatchEvent(ev('click'));
  assert.equal(s.doc.querySelector('.rimon-toast'), null);
  assert.equal(s.doc.body.dataset.rimonToast, undefined);
  store.set('awards.v1', { awards: { 'word-builder': 1 } }); await flush(450);
  t = s.doc.querySelector('.rimon-toast'); assert.equal(t?.dataset.rimonTrigger, 'first.badge');
  assert.equal(store.get(SEEN_KEY)['first.badge'], true);
  s.stage.destroy();
});

test('marked pictures: lesson complete swaps by accuracy (first lesson ever gets its own), and goes back if the file fails', async () => {
  const store = createStore({ 'curriculum.progress': { completed: { l1: 1, l2: 2 } } });
  const s = setup({ store, route: 'learn' });
  await s.stage.ready;
  const img = s.doc.createElement('img'); img.setAttribute('src', 'assets/img/gen/MASCOT_rimon.800.webp'); img.setAttribute('data-rimon-still', 'lesson.complete.perfect'); s.main.append(img);
  s.stage._test.scan();
  assert.ok(STILL_IDS['lesson.complete.perfect'].includes(num(img.src)));
  assert.equal(img.dataset.rimonFallback, 'assets/img/gen/MASCOT_rimon.800.webp');
  assert.equal(s.doc.body.dataset.rimonInpage, '1', 'a Rimon picture in the page sends the corner one away');
  img.remove(); s.stage._test.scan();
  assert.equal(s.doc.body.dataset.rimonInpage, undefined, 'and he comes back when it is gone');
  s.main.append(img);
  img.dispatchEvent(ev('error'));
  assert.equal(img.src, 'assets/img/gen/MASCOT_rimon.800.webp');
  const fresh = setup({ route: 'learn' }); await fresh.stage.ready;
  const im2 = fresh.doc.createElement('img'); im2.setAttribute('src', 'x.webp'); im2.setAttribute('data-rimon-still', 'lesson.complete.great'); fresh.main.append(im2);
  fresh.stage._test.scan();
  assert.ok(STILL_IDS['first.lesson'].includes(num(im2.src)), 'first.lesson');
  s.stage.destroy(); fresh.stage.destroy();
});

test('slots: the onboarding slot follows the step and empties when Rimon is hidden', async () => {
  const store = createStore();
  const s = setup({ store, route: 'welcome' });
  await s.stage.ready;
  const slot = s.doc.createElement('div'); slot.setAttribute('data-rimon-slot', 'onboarding.letters'); s.main.append(slot);
  s.stage._test.scan();
  assert.ok(STILL_IDS['onboarding.letters'].includes(num(slot.querySelector('img').src)), 'onboarding.letters');
  assert.match(slot.textContent, /Shalom/);
  slot.setAttribute('data-rimon-slot', 'onboarding.minutes'); s.stage._test.scan();
  assert.ok(STILL_IDS['onboarding.minutes'].includes(num(slot.querySelector('img').src)), 'onboarding.minutes');
  store.set('rimon.dismissed', true);
  slot.setAttribute('data-rimon-slot', 'onboarding.plan'); s.stage._test.scan();
  assert.equal(slot.childNodes.length, 0);
  s.stage.destroy();
});

test('idle: a fidget after 45 seconds, at most three, sleep after 3 minutes; activity wakes him', async () => {
  const s = setup({ route: 'learn', store: createStore({ 'curriculum.progress': { completed: { l1: 1 } } }) });
  await s.stage.ready; await flush(5); s.calls.length = 0;
  const t0 = new Date(2026, 10, 12, 14).getTime();
  s.stage._test.lastActivity = t0;
  for (let sec = 5; sec <= 175; sec += 5) { s.setNow(new Date(t0 + sec * 1000)); s.stage._test.tick(); }
  await flush(5);
  const fidgets = s.calls.filter((c) => STILL_IDS['idle.fidget'].includes(c.id));
  assert.equal(fidgets.length, 3);
  s.setNow(new Date(t0 + 181000)); s.stage._test.tick(); await flush(5);
  assert.ok(STILL_IDS['idle.sleep'].includes(s.calls.at(-1).id), 'idle.sleep');
  s.doc.dispatchEvent(ev('pointerdown'));
  assert.equal(s.calls.at(-1).clear, true);
  s.stage.destroy();
});

test('offline and back online each get a card; Hide Rimon silences every card', async () => {
  const store = createStore({ 'curriculum.progress': { completed: { l1: 1 } } });
  const s = setup({ store, route: 'learn' });
  await s.stage.ready; await flush(5);
  s.win.dispatch('offline'); await flush(5);
  assert.equal(s.doc.querySelector('.rimon-toast')?.dataset.rimonTrigger, 'offline.lost');
  s.doc.querySelector('.rimon-toast-x').dispatchEvent(ev('click'));
  s.win.dispatch('online'); await flush(450);
  assert.equal(s.doc.querySelector('.rimon-toast')?.dataset.rimonTrigger, 'offline.back');
  s.doc.querySelector('.rimon-toast-x').dispatchEvent(ev('click'));
  store.set('rimon.dismissed', true);
  s.win.dispatch('offline'); await flush(450);
  assert.equal(s.doc.querySelector('.rimon-toast'), null);
  s.stage.destroy();
});

test('lesson complete without a mark: the celebration picture is found and matched to the score', async () => {
  const s = setup({ route: 'learn', store: createStore({ 'curriculum.progress': { completed: { l1: 1, l2: 2, l3: 3 } } }) });
  await s.stage.ready;
  s.doc.dispatchEvent(ev('alef:celebrate', { kind: 'lesson', accuracy: 0.95 }));
  const img = s.doc.createElement('img'); img.className = 'alef-celebrate-rimon'; img.setAttribute('src', 'm.webp'); s.main.append(img);
  s.stage._test.scan();
  assert.equal(img.getAttribute('data-rimon-still'), 'lesson.complete.perfect');
  assert.ok(STILL_IDS['lesson.complete.perfect'].includes(num(img.src)));
});

test('the shared showRimon hook can ask the stage: URLs for a situation, none on a quiet day or when hidden', async () => {
  const s = setup({ route: 'learn' });
  await s.stage.ready;
  const [u] = s.stage.urlsForSituation('correct');
  assert.ok(STILL_IDS['answer.correct'].includes(num(u)));
  assert.equal(s.stage.urlsForSituation('no-such-situation'), null, 'unknown situation: the hook uses its own map');
  assert.deepEqual(s.stage.urlsForSituation('home'), [], 'Home already has Rimon greeting in the page: no second one');
  s.store.set('rimon.dismissed', true);
  assert.deepEqual(s.stage.urlsForSituation('correct'), []);
  const q = setup({ route: 'learn', date: new Date(2027, 7, 12, 10) }); // Tisha B'Av
  await q.stage.ready;
  assert.deepEqual(q.stage.urlsForSituation('correct'), []);
});

test('quiet-day rules are carried by the stage itself (no stylesheet edit needed)', async () => {
  const { QUIET_CSS } = await import('../src/shell/rimon-stage.js');
  for (const sel of ['.rimon-companion', '.rimon-bubble', '.rimon-toast', '.rimon-hero', '.rimon-moment']) assert.ok(QUIET_CSS.includes(`body[data-rimon-quiet] ${sel}`), sel);
  // on a day of mourning every Rimon picture goes, including the animated one inside pages and the floating one
  for (const sel of ['img[data-rimon-still]', 'img.alef-celebrate-rimon', '.rimon-inline', '.alef-rimon-spot']) assert.ok(QUIET_CSS.includes(`body[data-rimon-quiet=day] ${sel}`), sel);
});

test('living with the shared showRimon hook: its slots and marks are left alone, and its floating Rimon answers instead of the corner one', async () => {
  const s = setup({ route: 'welcome', store: createStore({ 'curriculum.progress': { completed: { l1: 1 } } }) });
  await s.stage.ready; await flush(5);
  const slot = s.doc.createElement('div'); slot.setAttribute('data-rimon-slot', 'welcome'); const theirs = s.doc.createElement('img'); slot.append(theirs); s.main.append(slot);
  const mark = s.doc.createElement('img'); mark.setAttribute('data-rimon-still', 'correct'); mark.setAttribute('src', 'x.webp'); s.main.append(mark);
  s.stage._test.scan();
  assert.equal(slot.firstChild, theirs, 'their slot keeps its picture');
  assert.equal(mark.getAttribute('src'), 'x.webp');
  s.calls.length = 0;
  const spot = s.doc.createElement('div'); spot.className = 'alef-rimon-spot'; s.doc.body.append(spot);
  s.setNow(new Date(2026, 10, 12, 14, 5)); s.doc.dispatchEvent(ev('alef:rimon', { action: 'correct' })); await flush(160);
  assert.equal(s.calls.length, 0, 'no second Rimon');
  spot.remove();
  s.setNow(new Date(2026, 10, 12, 14, 6)); s.doc.dispatchEvent(ev('alef:rimon', { action: 'correct' })); await flush(160);
  assert.equal(s.calls.length, 1);
});
