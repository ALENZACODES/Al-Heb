import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { N } from './torahread.fakedom.js';
N.prototype.remove = function remove() { if (this.parent) this.parent.children = this.parent.children.filter((c) => c !== this); };
globalThis.document.head = new N('head'); globalThis.document.getElementById = (id) => globalThis.document.head.querySelector('#' + id);
const { celebrationPlan, celebrationNode, ensureStyle, CSS, FADE_MS } = await import('../preview/loops/celebrate.js');
const { mount } = await import('../preview/loops/daily.view.js');
const { lessonFinished } = await import('../preview/loops/hook.js');
const { syncRecord, refresh, noteLesson, buildModel, applyRepair, LOOPS_KEY } = await import('../preview/loops/sync.js');
const { h } = await import('../src/shell/ui.js');
const { readSnapshot } = await import('../src/progress/model.js');
const { mergeDay, load } = await import('../preview/loops/store.js');
const { addDaysISO } = await import('../src/curriculum/streak.js');

const NOW = new Date('2026-11-10T12:00:00').getTime(), T = '2026-11-10';
const memStore = (init = {}) => { const m = { ...init }; return { m, get: (k, d) => (k in m ? m[k] : d), set: (k, v) => { m[k] = JSON.parse(JSON.stringify(v)); } }; };
const ctxOf = (store, settings = {}) => ({ store, now: () => NOW, settings: { get: (k) => settings[k] } });

test('celebration plan: plain lines, goal crossing noted, no motion when quiet, no sound by default', () => {
  const p = celebrationPlan({ quiet: false, before: 12, after: 22, goal: 20, rhythmLine: 'Day 3.' });
  assert.equal(p.headline, 'Daily goal reached'); assert.equal(p.motion, 'fade'); assert.equal(p.sound, null);
  assert.match(p.lines[0], /added 10 points: 22 of 20/); assert.equal(p.lines.at(-1), 'Day 3.'); assert.ok(p.announce.startsWith('Daily goal reached.'));
  const q = celebrationPlan({ quiet: true, before: 0, after: 10, goal: 20, soundOn: true }); assert.equal(q.motion, 'none'); assert.equal(q.sound, null, 'quiet wins over the sound setting');
  assert.equal(q.headline, 'Lesson finished');
  assert.equal(celebrationPlan({ quiet: false, before: 0, after: 10, goal: 20, soundOn: true }).sound, 'done');
  assert.equal(celebrationPlan({ quiet: false, before: 0, after: 10, goal: 20 }).sound, null);
  assert.match(celebrationPlan({ quiet: false, before: 30, after: 30, goal: 20 }).lines[0], /You have 30 of 20 points/);
});
test('celebration style: one slow fade played once, switched off for reduced motion and calm mode, nothing that flashes', () => {
  assert.match(CSS, /animation: lp-fade 600ms ease-out 1;/); assert.equal(FADE_MS, 600);
  assert.match(CSS, /prefers-reduced-motion: reduce\) \{ \.lp-cele \{ animation: none !important/); assert.match(CSS, /\[data-calm\] \.lp-cele \{ animation: none !important/);
  assert.doesNotMatch(CSS, /infinite|blink|flash|steps\(|@keyframes (?!lp-fade)/); assert.equal((CSS.match(/@keyframes/g) || []).length, 1);
  const node = celebrationNode(h, celebrationPlan({ quiet: true, before: 0, after: 10, goal: 20 }));
  assert.equal(node.attrs.role, 'status'); assert.equal(node.attrs['aria-live'], 'polite'); assert.equal(node.attrs['data-motion'], 'none');
  ensureStyle(globalThis.document); ensureStyle(globalThis.document);
  assert.equal(globalThis.document.head.queryAll('style').length, 1, 'style added once');
});

test('hook: a finished lesson is recorded once per lesson, points go up, and the card is returned without moving focus', () => {
  const store = memStore(); globalThis.__focus = null;
  const node = lessonFinished(ctxOf(store), { lessonId: 'I-01', now: NOW });
  assert.match(node.textContent, /Lesson finished/); assert.match(node.textContent, /added 10 points: 10 of 20/); assert.equal(globalThis.__focus, null);
  assert.deepEqual(load(store).days[T].lessons, ['I-01']);
  const again = lessonFinished(ctxOf(store), { lessonId: 'I-01', now: NOW });
  assert.match(again.textContent, /You have 10 of 20 points/, 'the same lesson twice in a day adds nothing');
  const second = lessonFinished(ctxOf(store), { lessonId: 'I-02', now: NOW });
  assert.match(second.textContent, /Daily goal reached/);
  assert.equal(lessonFinished(ctxOf(store), {}), null); assert.equal(lessonFinished(null, { lessonId: 'x' }), null);
});
test('hook: calm mode removes motion and the rhythm line; the system reduced-motion choice also quiets it', () => {
  const calm = lessonFinished(ctxOf(memStore(), { calmMode: true }), { lessonId: 'I-01', now: NOW });
  assert.equal(calm.attrs['data-motion'], 'none'); assert.doesNotMatch(calm.textContent, /rhythm/i);
  globalThis.matchMedia = () => ({ matches: true });
  const rm = lessonFinished(ctxOf(memStore()), { lessonId: 'I-01', now: NOW });
  delete globalThis.matchMedia; assert.equal(rm.attrs['data-motion'], 'none');
  const plain = lessonFinished(ctxOf(memStore()), { lessonId: 'I-01', now: NOW }); assert.equal(plain.attrs['data-motion'], 'fade');
});
test('hook: sound plays only when the sound setting is on, a player exists and nothing is quiet', () => {
  const calls = []; const sfx = { play: (n) => calls.push(n) };
  lessonFinished({ ...ctxOf(memStore()), sfx }, { lessonId: 'a', now: NOW }); assert.deepEqual(calls, []);
  lessonFinished({ ...ctxOf(memStore(), { soundEffects: true }), sfx }, { lessonId: 'a', now: NOW }); assert.deepEqual(calls, ['done']);
  lessonFinished({ ...ctxOf(memStore(), { soundEffects: true, calmMode: true }), sfx }, { lessonId: 'a', now: NOW }); assert.deepEqual(calls, ['done']);
});

test('sync: other screens\' records are merged once, never lowered, and a throwing store does not break refresh', () => {
  const at = NOW - 3600000;
  const store = memStore({ 'curriculum.progress': { completed: { r01: at } }, 'srs.cards': { 'letter:alef': { id: 'letter:alef', state: 'review', reps: 2, lapses: 0, lastReview: at } } });
  const a = refresh(store); assert.equal(a.rec.days[T].lessons[0], 'r01'); assert.equal(a.rec.days[T].r, 1);
  const before = JSON.stringify(store.m[LOOPS_KEY]); refresh(store); assert.equal(JSON.stringify(store.m[LOOPS_KEY]), before, 'second sync writes the same record');
  const bad = { get() { throw new Error('x'); }, set() { throw new Error('y'); } };
  assert.doesNotThrow(() => refresh(bad)); assert.doesNotThrow(() => noteLesson(bad, 'x', NOW));
  assert.equal(syncRecord(null, null).changed, false);
});
test('sync: the older engaged-time streak counts a day here too, and declared rest covers a gap for free', () => {
  const snap = { streak: { doneDates: ['2026-11-07', '2026-11-08'], frozenDates: [] }, rest: ['2026-11-09'] };
  const m = buildModel(null, snap, NOW);
  assert.equal(m.rhythm.count, 2); assert.deepEqual(m.rhythm.restUsed, []);
  const withRest = buildModel(mergeDay(null, T, { lessons: ['a'] }), snap, NOW); assert.equal(withRest.rhythm.count, 3);
});
test('sync: a free repair covers the gap and restores the earlier run', () => {
  let rec = null; for (const d of ['2026-11-01', '2026-11-02', '2026-11-03', T]) rec = mergeDay(rec, d, { lessons: ['L' + d] });
  const before = buildModel(rec, {}, NOW); assert.equal(before.rhythm.count, 1); assert.equal(before.repair.length, 6);
  const fixed = applyRepair(rec, {}, NOW); const after = buildModel(fixed, {}, NOW);
  assert.equal(after.rhythm.count, 4); assert.deepEqual(after.repair, []); assert.equal(applyRepair(fixed, {}, NOW).repairs.length, fixed.repairs.length);
});

test('page: shows goal ring text, rhythm, three quests, week sentences, stats, and a heatmap with a text alternative', () => {
  const store = memStore(); const root = new N('div');
  for (const [i, d] of ['2026-11-08', '2026-11-09', T].entries()) store.set('loops.v1', mergeDay(store.get('loops.v1', null), d, { lessons: ['L' + i] }));
  mount(root, ctxOf(store));
  assert.equal(root.querySelector('h1').attrs.id, 'view-title'); assert.equal(root.queryAll('h1').length, 1);
  assert.match(root.querySelector('#lp-ring-text').textContent, /10 of 20 points today/);
  assert.equal(root.queryAll('[data-quest]').length, 3);
  assert.match(root.textContent, /Practice rhythm/); assert.match(root.textContent, /Day 3 of your rhythm/);
  assert.match(root.querySelector('#lp-heat-text').textContent, /Last 26 weeks: 3 practice days/);
  const cells = root.queryAll('.lp-cell'); assert.ok(cells.length > 150); assert.ok(cells.every((c) => c.attrs['aria-hidden'] === 'true'));
  assert.equal(root.queryAll('table').length, 1); assert.ok(root.queryAll('th').length > 4);
  assert.equal(root.queryAll('[data-stat]').length, 4);
  assert.equal(root.queryAll('[role="status"]').length, 1);
});
test('page: goal buttons are real buttons with pressed state, change the goal, and announce it', async () => {
  const store = memStore(); const root = new N('div'); mount(root, ctxOf(store));
  const btns = root.queryAll('button[data-goal]'); assert.deepEqual(btns.map((b) => b.attrs['data-goal']), ['10', '20', '30', '50']);
  assert.equal(root.querySelector('#lp-goal-20').attrs['aria-pressed'], 'true');
  await root.querySelector('#lp-goal-30').click();
  assert.equal(load(store).goal, 30); assert.equal(root.querySelector('#lp-goal-30').attrs['aria-pressed'], 'true');
  assert.match(root.querySelector('[role="status"]').textContent, /Daily goal set to 30 points/);
});
test('page: quests can be hidden and shown again; calm mode hides the rhythm card but keeps the goal', async () => {
  const store = memStore(); const root = new N('div'); mount(root, ctxOf(store));
  await root.querySelector('#lp-quests-toggle').click(); assert.equal(root.queryAll('[data-quest]').length, 0); assert.match(root.textContent, /Quests are hidden/);
  await root.querySelector('#lp-quests-toggle').click(); assert.equal(root.queryAll('[data-quest]').length, 3);
  const r2 = new N('div'); mount(r2, ctxOf(memStore(), { calmMode: true })); assert.doesNotMatch(r2.textContent, /Practice rhythm/); assert.match(r2.textContent, /points today/);
});
test('page: the repair button appears only when a gap can be repaired, is free, and brings the run back', async () => {
  const store = memStore(); let rec = null; for (const d of ['2026-11-01', '2026-11-02', '2026-11-03', T]) rec = mergeDay(rec, d, { lessons: ['L' + d] }); store.set('loops.v1', rec);
  const root = new N('div'); mount(root, ctxOf(store));
  const b = root.querySelector('#lp-repair'); assert.ok(b); assert.match(b.textContent, /free/);
  await b.click(); assert.equal(root.querySelector('#lp-repair'), null); assert.match(root.textContent, /Day 4 of your rhythm/);
  assert.match(root.querySelector('[role="status"]').textContent, /It was free/);
});
test('page: an empty store renders a calm first screen without errors', () => {
  const root = new N('div'); assert.doesNotThrow(() => mount(root, ctxOf(memStore())));
  assert.match(root.textContent, /0 of 20 points today/); assert.match(root.textContent, /starts with your first practice day/); assert.match(root.textContent, /No review answers yet/);
  assert.doesNotThrow(() => mount(new N('div'), { store: null, settings: null }));
});

// ---- safety: copy, network, routes, privacy ----
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(ROOT, 'preview/loops');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js'));
const codeOf = (f) => fs.readFileSync(path.join(dir, f), 'utf8');
test('copy: no loss-shaming or pressure wording anywhere in the loops modules', () => {
  const banned = /\b(you lost|lose your|losing|lost your|broke(n)?|ruin|fail(ed|ure)?|shame|disappoint|don'?t give up|last chance|running out|hurry|expire[sd]?|behind|slacking|lazy|streak (is )?(at risk|in danger)|only \d+ (hours|minutes) left|miss(ed)?)\b/i;
  for (const f of files) {
    const text = codeOf(f).split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
    const strings = [...text.matchAll(/(["'`])((?:\\.|(?!\1).)+)\1/g)].map((m) => m[2]).filter((s) => /\s/.test(s));
    for (const s of strings) assert.doesNotMatch(s, banned, `${f}: ${s}`);
  }
});
test('copy: no exclamation marks in learner-facing sentences', () => {
  for (const f of files) for (const m of codeOf(f).matchAll(/(["'`])([A-Z][^"'`\n]{12,})\1/g)) assert.doesNotMatch(m[2], /!(?!=)/, `${f}: ${m[2]}`);
});
test('local only: the loops modules contain no network call, no cookie, no timer and no autoplay', () => {
  for (const f of files) {
    const text = codeOf(f).split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
    assert.doesNotMatch(text, /\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource|document\.cookie|indexedDB|setInterval|setTimeout|Notification|requestPermission|\.play\s*\(\)|autoplay|new Audio/, f);
  }
});
test('targets: every button in the page uses the shared btn class (48 px tap size) and the css sets the minimum', () => {
  const src = codeOf('daily.view.js');
  assert.match(src, /\.lp \.btn \{ min-block-size: var\(--tap, 48px\); min-inline-size: var\(--tap, 48px\)/);
  for (const m of src.matchAll(/h\('button', \{[^}]*class: ([^,]+),/g)) assert.match(m[1], /btn/);
  assert.match(src, /summary \{ min-block-size: var\(--tap, 48px\)/);
});
test('routes: /daily is one preview route outside the first install, v0 stays at 19, and the key is registered everywhere', async () => {
  const { ROUTES, matchRoute } = await import('../src/shell/router.js');
  assert.equal(ROUTES.filter((r) => r.tier === 'v0').length, 19); const r = ROUTES.find((x) => x.name === 'daily');
  assert.equal(r.tier, 'preview'); assert.equal(matchRoute('#/daily').route.name, 'daily'); assert.ok(fs.existsSync(path.resolve(ROOT, 'src/shell', r.module)));
  const { computeManifest } = await import('../tools/build-precache.mjs'); const m = computeManifest(ROOT);
  assert.ok(![...m.files, ...m.onDemand].some((f) => f.startsWith('preview/')), 'preview/loops is not in the precache lists');
  const { STORE_KEYS } = await import('../src/shell/privacy.view.js'); assert.ok(STORE_KEYS.some((x) => x[0] === 'loops.v1' && fs.readFileSync(path.join(ROOT, x[2]), 'utf8').includes('loops.v1')));
  const { PROGRESS_KEYS } = await import('../src/progress/store.js'); assert.ok(PROGRESS_KEYS.includes('loops.v1'));
  const { EXTRAS } = await import('../tools/deploy/make-dist.mjs'); assert.ok(EXTRAS.some(([p]) => p === 'preview/loops'));
  assert.ok(readSnapshot(memStore()) && true);
});
test('hook wiring: the intermediate lesson summary loads the card on demand, only for a finished lesson', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src/curriculum/intermediate.view.js'), 'utf8');
  assert.match(src, /if \(all\) import\("\.\.\/\.\.\/preview\/loops\/hook\.js"\)/); assert.doesNotMatch(src, /^import .*preview\/loops/m);
});
test('badge wiring: the daily page loads the badge module on demand, only when the page mounts', () => {
  const src = fs.readFileSync(path.join(ROOT, 'preview/loops/daily.view.js'), 'utf8');
  assert.match(src, /import\('\.\/badges\.view\.js'\)/); assert.doesNotMatch(src, /^import .*badges\.view\.js/m);
});
