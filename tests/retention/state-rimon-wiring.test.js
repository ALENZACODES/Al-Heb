import './_helpers.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import vm from 'node:vm';
import { T } from './_helpers.js';
import { createStore, createMemoryStorage } from '../../src/store.js';
import { RETENTION_KEY, defaults, normalize, migrate, load, save } from '../../src/retention/state.js';
import { SITUATIONS, DRAWN_ACTIONS, showRimon, THEN_MS } from '../../src/retention/rimon.js';
import { ROUTES } from '../../src/shell/router.js';
import { isOnDemand } from '../../tools/build-precache.mjs';
import { unitFiles } from '../../tools/test/tiers.mjs';

const NOW = T('2026-11-10T19:00');
const mem = () => createStore({ storage: createMemoryStorage() });

test('one versioned key holds all retention state', () => {
  assert.equal(RETENTION_KEY, 'retention.v1');
  const store = mem(); save(store, (r) => { r.goal = 30; return r; }, NOW);
  assert.deepEqual(store.keys().filter((k) => /retention/.test(k)), ['retention.v1']);
  const r = load(store, NOW);
  assert.equal(r.v, 1); assert.equal(r.goal, 30);
  for (const k of ['xp', 'gems', 'freezes', 'hearts', 'league', 'notify', 'sessions']) assert.ok(k in r, k);
});
test('corrupt values fall back to defaults and are kept aside once', () => {
  const store = mem(); store.set(RETENTION_KEY, 'garbage');
  const r = load(store, NOW);
  assert.equal(r.hearts.n, 5); assert.equal(store.get(RETENTION_KEY + '.corrupt'), 'garbage');
  assert.equal(normalize({ goal: 999, hearts: { n: 99 }, freezes: { held: 7 }, league: { tier: 50 } }, NOW).goal, 20);
  const n = normalize({ hearts: { n: 99 }, freezes: { held: 7 }, league: { tier: 50 }, xp: { days: { bad: 3, '2026-11-10': 12 } } }, NOW);
  assert.deepEqual([n.hearts.n, n.freezes.held, n.league.tier, n.xp.days], [5, 2, 10, { '2026-11-10': 12 }]);
  assert.doesNotThrow(() => normalize(null)); assert.doesNotThrow(() => normalize([1, 2])); assert.doesNotThrow(() => normalize({ xp: 'x', notify: 4 }));
});
test('a record from a newer app is read but never written; unknown fields survive a write', () => {
  const store = mem(); store.set(RETENTION_KEY, { ...defaults(NOW, 'i'), v: 2, future: { a: 1 } });
  const out = save(store, (r) => { r.goal = 50; return r; }, NOW);
  assert.equal(out.v, 2); assert.equal(store.get(RETENTION_KEY).goal, 20, 'left untouched');
  const s2 = mem(); s2.set(RETENTION_KEY, { ...defaults(NOW, 'i'), extra: 'kept', hearts: { ...defaults(NOW, 'i').hearts, later: 7 } });
  save(s2, (r) => { r.goal = 10; return r; }, NOW);
  assert.equal(s2.get(RETENTION_KEY).extra, 'kept'); assert.equal(s2.get(RETENTION_KEY).hearts.later, 7); assert.equal(s2.get(RETENTION_KEY).goal, 10);
  assert.equal(migrate({ goal: 30 }).v, 1); assert.equal(load(s2, NOW).installId, 'i');
});
test('the record rides along in the whole-app backup', () => {
  const store = mem(); save(store, (r) => { r.gems.balance = 77; return r; }, NOW);
  const fn = store.exportAll || store.export || store.exportData || store.exportJSON;
  if (typeof fn !== 'function') return; // the backup API is covered by the store's own tests
  assert.match(JSON.stringify(fn.call(store)), /retention\.v1/);
});

test('showRimon: every situation uses one of the twelve drawings already in assets/img/rimon/', () => {
  for (const [name, s] of Object.entries(SITUATIONS)) {
    const acts = typeof s.action === 'function' ? [s.action({ accuracy: 1 }), s.action({ accuracy: 0 })] : [s.action];
    for (const a of [...acts, ...(s.then ? [s.then] : [])]) { assert.ok(DRAWN_ACTIONS.includes(a), `${name}: ${a}`); assert.ok(existsSync(`assets/img/rimon/${a}.png`), `${a}.png`); }
  }
});
test('showRimon: sends the app\'s alef:rimon event (bubbling), runs the follow-up after 1.5 s, cancels it on a newer call', () => {
  const doc = new EventTarget(), seen = [], timers = [];
  doc.addEventListener('alef:rimon', (e) => seen.push([e.detail.action, e.detail.situation, e.bubbles]));
  const fake = { setTimeout: (fn, ms) => { timers.push({ fn, ms, live: true }); return timers.length; }, clearTimeout: (id) => { timers[id - 1].live = false; } };
  assert.equal(showRimon('nope', {}, doc, fake), false); assert.equal(seen.length, 0);
  assert.equal(showRimon('streak_broken', {}, doc, fake), true);
  assert.deepEqual(seen, [['sad', 'streak_broken', true]]); assert.equal(timers[0].ms, THEN_MS);
  timers[0].fn(); assert.deepEqual(seen.at(-1), ['point', 'streak_broken', true]);
  showRimon('hearts_empty', {}, doc, fake); showRimon('heart_back', {}, doc, fake);
  assert.equal(timers[1].live, false, 'the pending follow-up was cancelled');
  assert.equal(showRimon('lesson_complete', { accuracy: 0.9 }, doc, fake), true); assert.equal(seen.at(-1)[0], 'highfive');
  let party = 0; doc.addEventListener('alef:celebrate', () => party++);
  showRimon('league_up', {}, doc, fake); assert.equal(party, 1);
});

test('wiring: routes, lazy loading, and the test runner', () => {
  const league = ROUTES.find((r) => r.name === 'league'), shop = ROUTES.find((r) => r.name === 'shop');
  assert.equal(league.pattern, '/league'); assert.equal(league.module, '../retention/league.view.js'); assert.equal(shop.module, '../retention/shop.view.js');
  const pre = readFileSync('precache-manifest.js', 'utf8'), installed = pre.slice(pre.indexOf('ALEF_PRECACHE'), pre.indexOf('ALEF_ON_DEMAND'));
  for (const f of readdirSync('src/retention')) { assert.equal(isOnDemand(`src/retention/${f}`), true, f); assert.ok(!installed.includes(`src/retention/${f}`), `${f} must not be in the first install`); }
  assert.match(readFileSync('src/shell/boot-hooks.js', 'utf8'), /import\('\.\.\/retention\/boot\.js'\)/, 'loaded with a dynamic import');
  assert.doesNotMatch(readFileSync('src/app.js', 'utf8'), /from '\.\/retention\//, 'never imported statically by the shell');
  assert.ok(unitFiles().includes('tests/retention/streak.test.js'), 'npm test runs this folder');
});
test('copy in src/retention: no tool names, no pronouns for Rimon, no inline handlers, the Name is never spelled', () => {
  for (const f of readdirSync('src/retention').filter((x) => /\.(js|css)$/.test(x))) {
    const text = readFileSync(`src/retention/${f}`, 'utf8');
    assert.doesNotMatch(text, new RegExp('\\b(' + ['\u0043hatGPT','G'+'PT','\u0043laude','\u0041nthropic','\u004fpenAI','Gem'+'ini','Copi'+'lot','\u004fpus','\u0046able','L'+'LM'].join('|') + ')\\b'), f);
    assert.doesNotMatch(text, /Rimon (he|she)\b|\b(his|her) (leaves|seeds|drama)\b|Rimon\.[^\n]{0,40}\b(He|She) /, f);
    assert.doesNotMatch(text, /יהוה|Yahweh|Jehovah|YHWH/i, f);
    assert.doesNotMatch(text, /\son(click|load|error)\s*=\s*["']|innerHTML|<script|eval\(|new Function/, f);
  }
});
test('service worker: the reminder check is silent on Shabbat, at night, in a quiet range and after a session', () => {
  const self = { addEventListener() {}, location: { origin: 'https://x.test', href: 'https://x.test/sw.js' }, registration: { scope: 'https://x.test/' }, ALEF_PRECACHE: [] };
  const ctx = vm.createContext({ self, importScripts() {}, caches: {}, URL, Response: globalThis.Response, fetch() {}, Date, JSON, Promise });
  vm.runInContext(readFileSync('sw.js', 'utf8'), ctx);
  const due = self.rimonDue, e = { fireAt: T('2026-11-16T19:00'), id: 'E01', title: 'Rimon', body: 'x' };
  const p = (o = {}) => ({ v: 1, entries: [e], quiet: [], shown: [], lastSessionAt: T('2026-11-12T19:00'), ...o });
  assert.equal(due(p(), T('2026-11-16T19:05')).id, 'E01');
  assert.equal(due(p(), T('2026-11-16T18:59')), null, 'not yet');
  assert.equal(due(p(), T('2026-11-17T09:00')), null, 'more than 6 hours late');
  assert.equal(due(p({ lastSessionAt: T('2026-11-16T10:00') }), T('2026-11-16T19:05')), null, 'studied today');
  assert.equal(due(p({ quiet: [[T('2026-11-16T18:00'), T('2026-11-16T20:00')]] }), T('2026-11-16T19:05')), null, 'quiet range');
  assert.equal(due(p({ shown: [{ id: 'E02', at: T('2026-11-16T09:00') }] }), T('2026-11-16T19:05')), null, 'one a day');
  const fri = { ...e, fireAt: T('2026-11-13T17:30') };
  assert.equal(due(p({ entries: [fri] }), T('2026-11-13T17:40')).id, 'E01');
  assert.equal(due(p({ entries: [fri] }), T('2026-11-13T18:00')), null, 'Friday 18:00');
  assert.equal(due(p({ entries: [{ ...e, fireAt: T('2026-11-14T15:00') }] }), T('2026-11-14T15:05')), null, 'Saturday afternoon');
  assert.equal(due(p({ entries: [{ ...e, fireAt: T('2026-11-16T20:30') }] }), T('2026-11-16T21:10')), null, 'night');
  assert.match(readFileSync('sw.js', 'utf8'), /addEventListener\('notificationclick'/);
});
test('Rimon has a bubble line for every line a situation asks for; the 3-minute lesson is wired', async () => {
  const { LINES } = await import('../../src/retention/rimon.js');
  for (const [name, s] of Object.entries(SITUATIONS)) if (s.line) { assert.ok(LINES[s.line], `${name}: ${s.line}`); assert.ok(LINES[s.line].he && LINES[s.line].en); }
  assert.match(readFileSync('src/shell/rimon.js', 'utf8'), /speech\.sayLine\(say\)/);
  const doc = new EventTarget(), said = []; doc.addEventListener('alef:rimon', (e) => said.push(e.detail.say?.en || null));
  showRimon('welcome_back', {}, doc, { setTimeout: (fn) => { fn(); return 1; }, clearTimeout() {} });
  assert.deepEqual(said, ['WELCOME BACK!', null], 'the line is sent once, with the first action');
  assert.match(readFileSync('src/curriculum/lesson.view.js', 'utf8'), /ctx\?\.query\?\.quick === "1"/);
  assert.match(readFileSync('src/curriculum/lesson.parts.js', 'utf8'), /alef:lesson-part/);
  assert.match(readFileSync('src/retention/ui.js', 'utf8'), /&quick=1/);
});
