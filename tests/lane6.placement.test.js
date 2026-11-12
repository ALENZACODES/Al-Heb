// Lane 6 (12 Nov 2026, round 2): placement as the front door, points plan #17 (code parts): unpointed items, a 10-minute cap,
// a result that sets the starting lesson and sticks (Home's Today card and the Learn lock), and the install-size move.
import test from 'node:test';
import assert from 'node:assert/strict';
const M = await import('../src/placement/model.js');
const S = await import('../src/placement/start.js');
const { loadPlacementData } = await import('../src/placement/loader.js');
const T = await import('../src/home/today.js');
const { lessons, available } = await import('../src/curriculum/lessons.js');
const { findName } = await import('../src/shell/names.js');
const P = await loadPlacementData();
const items = M.buildItems(P.data, P.config);

test('unpointed items: marks removed in code from the vocabulary file, unique spellings, asked last at the reading-without-help lesson', () => {
  const u = items.filter((i) => i.cat === 'unpointed');
  assert.equal(u.length, P.config.counts.unpointed);
  const spell = new Map(); for (const w of P.data.words) if (w.he) spell.set(M.unpoint(w.he), (spell.get(M.unpoint(w.he)) || 0) + 1);
  for (const i of u) {
    const w = P.data.words.find((x) => x.he === i.pointed);
    assert.ok(w, i.id); assert.equal(i.he, M.unpoint(w.he)); assert.notEqual(i.he, i.pointed);
    assert.equal(spell.get(i.he), 1, `${i.id}: no other word has this spelling`);
    assert.equal(i.lesson, P.config.lessonCaps.unpointed); assert.ok(!findName(i.pointed).length);
    assert.equal(i.options.filter((o) => o.correct).length, 1); assert.equal(i.options.find((o) => o.correct).label, w.en);
  }
  const capRank = M.lessonOrder(P.data.lessons).order.get(P.config.lessonCaps.unpointed);
  assert.ok(u.every((i) => i.rank === capRank));
  assert.ok(items.filter((i) => i.rank > capRank).every((i) => i.cat === 'phrases'), 'only the later prayer phrases come after the unpointed words');
  assert.equal(P.data.lessons.find((l) => l.id === P.config.lessonCaps.unpointed).title, 'Reading with no help: unpointed words you already know');
});

test('about 10 minutes: the cap is in the config and timeUp stops the check', () => {
  assert.equal(P.config.maxMinutes, 10);
  assert.equal(M.timeUp(0, 9 * 60000, P.config), false);
  assert.equal(M.timeUp(0, 10 * 60000, P.config), true);
  assert.equal(M.timeUp(0, 1e9, {}), false);
});

test('placedOut: only an applied result skips lessons, and only the read lessons before it', () => {
  assert.deepEqual(S.placedOut(lessons, null), []);
  assert.deepEqual(S.placedOut(lessons, { result: { lesson: 'r05', start: 'r05' } }), []);
  assert.deepEqual(S.placedOut(lessons, { result: { lesson: 'r05', start: 'r05', applied: true } }), ['r01', 'r02', 'r03', 'r04']);
  assert.deepEqual(S.placedOut(lessons, { result: { start: 'r01', applied: true } }), []);
});

test('Home Today card: an applied placement result is the start, and stays the start after its first lesson is done', () => {
  const all = () => true;
  const base = (o = {}) => ({ completedIds: [], lessons, available, goal: 'read', dueCount: 0, streak: { count: 0 }, hasRoute: all, onboarding: { start: '/placement' }, ...o });
  const applied = { result: { lesson: 'r12', start: 'r12', applied: true } };
  assert.equal(T.buildToday(base({ placement: applied })).primary.href, '#/learn?lesson=r12');
  assert.equal(T.buildToday(base({ placement: { result: { lesson: 'r12' } } })).primary.href, '#/learn?lesson=r01', 'an older, unapplied result keeps the old rule');
  const later = T.buildToday(base({ placement: applied, completedIds: ['r12'] }));
  assert.equal(later.lessons[0].id, 'r13', 'after the placed lesson, Today goes on from there, not back to r01');
});

// ---------- view on a minimal fake DOM ----------
class N {
  constructor(tag) { this.tag = tag; this.nodeType = 1; this.children = []; this.attrs = {}; this.listeners = {}; this.className = ''; this.hidden = false; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }
  append(...c) { this.children.push(...c); }
  replaceChildren(...c) { this.children = []; this.append(...c.filter((x) => x != null)); }
  set textContent(v) { this.children = [{ nodeType: 3, data: String(v) }]; }
  remove() {} focus() {}
  get text() { return this.children.map((c) => (c.nodeType === 3 ? c.data : c.text)).join(''); }
  find(pred, out = []) { if (pred(this)) out.push(this); for (const c of this.children) if (c.nodeType === 1) c.find(pred, out); return out; }
  async click() { for (const f of this.listeners.click || []) await f({}); }
}
globalThis.document = { createElement: (t) => new N(t), createTextNode: (d) => ({ nodeType: 3, data: String(d) }) };
const flush = () => new Promise((r) => setTimeout(r, 0));
const waitFor = async (f) => { for (let i = 0; i < 300; i++) { const v = f(); if (v) return v; await flush(); } throw new Error('timeout'); };
const find = (r, pred) => r.find(pred)[0];

async function run({ query = {}, clockStep = 0, answer = () => true } = {}) {
  const { mount } = await import('../src/placement/placement.view.js');
  const m = {}; let t = 0;
  const store = { get: (k) => m[k], set: (k, v) => { m[k] = v; } };
  const root = new N('div');
  const un = mount(root, { store, placementData: P, query, clock: { now: () => (t += clockStep) } });
  await (await waitFor(() => find(root, (n) => n.attrs.id === 'placement-start'))).click();
  for (let guard = 0; guard < 30 && !find(root, (n) => n.attrs.id === 'placement-go'); guard++) {
    const he = find(root, (n) => n.attrs.lang === 'he').text;
    const item = items.find((i) => i.he === he);
    const pick = answer(item) ? item.options.find((o) => o.correct).label : item.options.find((o) => !o.correct).label;
    await find(root, (n) => n.tag === 'button' && n.text === pick).click();
    await find(root, (n) => n.attrs.id === 'placement-next').click();
    await flush();
  }
  await waitFor(() => find(root, (n) => n.attrs.id === 'placement-go'));
  return { root, m, un };
}

test('view: from the welcome flow it is "Find Your Level", says about 10 minutes, applies the result and opens the lesson', async () => {
  const { root, m, un } = await run({ query: { from: 'welcome' }, answer: (i) => i.rank < 15 });
  assert.match(find(root, (n) => n.tag === 'h1').text, /Find Your Level/);
  const rec = m['placement.v1'];
  assert.equal(rec.result.applied, true); assert.equal(typeof rec.result.start, 'string');
  assert.ok(m['curriculum.unlocked'][rec.result.start], 'the placed lesson is opened');
  assert.equal(m['curriculum.progress'], undefined, 'nothing is marked as done');
  assert.equal(find(root, (n) => n.attrs.id === 'placement-go').attrs.href, '#/learn?lesson=' + rec.result.start);
  assert.ok(find(root, (n) => n.attrs.id === 'placement-week'));
  await find(root, (n) => n.attrs.id === 'placement-undo').click();
  assert.equal(m['placement.v1'].result.applied, false);
  un();
});

test('view: the check stops at 10 minutes', async () => {
  const { root, m, un } = await run({ clockStep: 3 * 60000 });
  assert.ok(m['placement.v1'].answers.length < items.length);
  assert.equal(m['placement.v1'].result.stoppedForTime, true);
  assert.match(root.text, /stopped at 10 minutes/);
  un();
});

test('install size: the placement page code is fetched on demand; Home’s part and the config stay installed', async () => {
  const { isOnDemand } = await import('../tools/build-precache.mjs');
  for (const f of ['src/placement/placement.view.js', 'src/placement/model.js', 'src/placement/loader.js', 'src/bridge/bridge.view.js', 'src/bridge/model.js', 'src/trope/families.js', 'src/trope/practice.view.js']) assert.ok(isOnDemand(f), f);
  for (const f of ['src/placement/start.js', 'data/placement/config.json', 'src/onboarding/model.js']) assert.ok(!isOnDemand(f), f);
  const { readFileSync } = await import('node:fs');
  const ob = readFileSync(new URL('../src/onboarding/model.js', import.meta.url), 'utf8');
  assert.ok(!/placement\/model\.js/.test(ob), 'the installed onboarding model does not pull in the on-demand placement model');
});
