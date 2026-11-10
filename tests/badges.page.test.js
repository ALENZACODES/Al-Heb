import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { N, tick } from './torahread.fakedom.js';
N.prototype.remove = function remove() { if (this.parent) this.parent.children = this.parent.children.filter((c) => c !== this); };
globalThis.document.head = new N('head'); globalThis.document.getElementById = (id) => globalThis.document.head.querySelector('#' + id);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'preview/loops/badges.catalog.json'), 'utf8'));
const { mount } = await import('../preview/loops/daily.view.js');
const { lessonFinished } = await import('../preview/loops/hook.js');
const V = await import('../preview/loops/badges.view.js');
const { load } = await import('../preview/loops/store.js');
const { h } = await import('../src/shell/ui.js');

const NOW = new Date('2026-11-10T12:00:00').getTime(), T = '2026-11-10';
const memStore = (init = {}) => { const m = { ...init }; return { m, get: (k, d) => (k in m ? m[k] : d), set: (k, v) => { m[k] = JSON.parse(JSON.stringify(v)); } }; };
const ctxOf = (store, settings = {}, extra = {}) => ({ store, now: () => NOW, badgeCatalog: catalog, settings: { get: (k) => settings[k] }, ...extra });
const at = NOW - 3600000;
const seeded = () => memStore({
  'timedread.v1': { v: 1, reads: [{ textId: 'shema-vahavta', lineId: 'shema-vahavta', words: 30, ms: 20000, stumbled: 0, stumbledIdx: [], at }] },
  'srs.cards': Object.fromEntries(['alef', 'bet', 'gimel', 'dalet', 'he'].map((id) => [`letter:${id}`, { id: `letter:${id}`, state: 'review', reps: 2, lapses: 0, lastReview: at }])),
});

test('page: a new badge shows as one calm status card with art, level words and the way it was earned; the shelf lists earned and next', async () => {
  const root = new N('div'); mount(root, ctxOf(seeded())); await tick();
  const cards = root.queryAll('[data-badges="new"]'); assert.equal(cards.length, 1);
  const c = cards[0]; assert.equal(c.attrs.role, 'status'); assert.equal(c.attrs['aria-live'], 'polite'); assert.equal(c.attrs['data-motion'], 'fade');
  assert.match(c.textContent, /Letters: the alphabet: First \(5\)/); assert.match(c.textContent, /answered 5 of the 22 base letters/);
  assert.match(c.textContent, /more (badge is|badges are) on your shelf below/, 'only a few cards at once; the rest are on the shelf');
  assert.ok(root.queryAll('.bd-new span').every((s) => /<svg /.test(s.innerHTML) && /<title/.test(s.innerHTML)));
  const shelf = root.querySelector('#lp-badges'); assert.ok(shelf);
  const hiddenEarned = shelf.queryAll('[data-badge]').filter((x) => catalog.badges.find((b) => b.id === x.attrs['data-badge']).hidden).length;
  assert.equal(shelf.queryAll('[data-badge]').length, catalog.badges.filter((b) => !b.hidden).length + hiddenEarned);
  const lb = root.querySelector('[data-badge="letters-base"]'); assert.equal(lb.attrs['data-level'], '1');
  assert.match(lb.textContent, /Next: Steady at 10 letters\. You are at 5\./);
  const nothing = root.querySelector('[data-badge="rhythm-long"]'); assert.match(nothing.textContent, /Next: First at 30 days\. You are at \d+\./); assert.doesNotMatch(nothing.textContent, /Earned/);
  assert.equal(root.querySelector('[data-badge="quiet-return"]'), null, 'hidden badges are not listed before they are earned');
  assert.match(root.querySelector('#bd-tier-line').textContent, /Tier: Newcomer/);
  assert.equal(root.queryAll('button').filter((b) => !/btn/.test(b.className)).length, 0, 'every button uses the shared tap-size class');
});
test('page: the card is shown once; the next visit lists the badge on the shelf only, and the earned date is kept', async () => {
  const store = seeded(); const r1 = new N('div'); mount(r1, ctxOf(store)); await tick();
  const first = JSON.stringify(load(store).badges.earned);
  const r2 = new N('div'); mount(r2, ctxOf(store)); await tick();
  assert.equal(r2.queryAll('[data-badges="new"]').length, 0); assert.equal(JSON.stringify(load(store).badges.earned), first);
  assert.equal(load(store).badges.earned['letters-base'][1], T);
});
test('page: calm mode and reduced motion give no motion; sound is off by default and silent when quiet', async () => {
  const play = []; const sfx = { play: (n) => play.push(n) };
  const calm = new N('div'); mount(calm, ctxOf(seeded(), { calmMode: true, soundEffects: true }, { sfx })); await tick();
  assert.equal(calm.querySelector('[data-badges="new"]').attrs['data-motion'], 'none'); assert.deepEqual(play, []);
  globalThis.matchMedia = () => ({ matches: true }); const rm = new N('div'); mount(rm, ctxOf(seeded())); await tick(); delete globalThis.matchMedia;
  assert.equal(rm.querySelector('[data-badges="new"]').attrs['data-motion'], 'none');
  mount(new N('div'), ctxOf(seeded(), {}, { sfx })); await tick(); assert.deepEqual(play, [], 'no sound unless the sound setting is on');
  mount(new N('div'), ctxOf(seeded(), { soundEffects: true }, { sfx })); await tick(); assert.deepEqual(play, ['done']);
});
test('page: the catalogue is read on demand; if it cannot be read the page says so calmly and nothing throws', async () => {
  let asked = 0; const f = async (u) => { asked++; assert.match(String(u), /badges\.catalog\.json$/); return { ok: true, json: async () => catalog }; };
  const root = new N('div'); const ctx = { ...ctxOf(seeded()), fetch: f }; delete ctx.badgeCatalog; mount(root, ctx); assert.match(root.textContent, /Loading badges/); await tick();
  assert.equal(asked, 1); assert.ok(root.querySelector('#lp-badges'));
  const bad = new N('div'); const c2 = { ...ctxOf(memStore()), fetch: async () => { throw new Error('offline'); } }; delete c2.badgeCatalog;
  assert.doesNotThrow(() => mount(bad, c2)); await tick(); assert.match(bad.textContent, /could not be read right now/); assert.match(bad.textContent, /0 of 20 points today/, 'the rest of the page still works');
  const c3 = { ...ctxOf(memStore()), fetch: async () => ({ ok: false }) }; delete c3.badgeCatalog; assert.equal(await V.loadCatalog(c3), null);
});
test('page: sharing is a plain-text summary in a read-only box with a copy button; nothing is uploaded', async () => {
  const root = new N('div'); mount(root, ctxOf(seeded())); await tick();
  const ta = root.querySelector('#bd-text'); assert.ok('readonly' in ta.attrs); assert.match(ta.textContent, /^My Hebrew course badges\nTier: Newcomer\n- Letters: the alphabet: First \(5\)/);
  assert.equal(root.queryAll('input[type="file"]').length, 0);
  assert.equal(await V.copyText('x', { clipboard: { writeText: async (t) => { assert.equal(t, 'x'); } } }), true);
  assert.equal(await V.copyText('x', {}), false); assert.equal(await V.copyText('x', { clipboard: { writeText: async () => { throw new Error('no'); } } }), false);
});
test('settle: used offline is recorded once per day and earns the offline badge; a throwing store does not break anything', () => {
  const store = memStore(); const s = V.settle(store, catalog, NOW, { offline: true }); assert.deepEqual(load(store).badges.offlineDays, [T]);
  assert.equal(load(store).badges.earned.offline[1], T); assert.ok(s.unseen.some((u) => u.id === 'offline'));
  V.settle(store, catalog, NOW, { offline: true }); assert.deepEqual(load(store).badges.offlineDays, [T]);
  assert.equal(V.settle(store, null, NOW), null);
  const bad = { get() { throw new Error('x'); }, set() { throw new Error('y'); } }; assert.doesNotThrow(() => V.settle(bad, catalog, NOW, { offline: true }));
});
test('settle: many badges at once show at most three cards and the rest on the shelf, all marked as announced', () => {
  const store = memStore({ 'timedread.v1': { v: 1, reads: Array.from({ length: 60 }, (_, i) => ({ textId: 't' + (i % 25), lineId: 'x', words: 10, ms: 9000, stumbled: 0, stumbledIdx: [], at })) } });
  const s = V.settle(store, catalog, NOW); assert.equal(s.unseen.length, 3); assert.ok(s.unseenMore > 0);
  const again = V.settle(store, catalog, NOW); assert.equal(again.unseen.length, 0); assert.equal(again.unseenMore, 0);
});
test('hook: a badge earned by a finished lesson is added as its own calm card; the lesson card is unchanged', async () => {
  const store = seeded(); const parent = new N('div');
  const node = lessonFinished(ctxOf(store), { lessonId: 'I-01', now: NOW }); parent.append(node); await tick();
  assert.match(node.textContent, /Lesson finished|Daily goal reached/); const cards = parent.queryAll('[data-badges="new"]'); assert.equal(cards.length, 1); assert.equal(cards[0].attrs.role, 'status');
  const again = lessonFinished(ctxOf(store), { lessonId: 'I-02', now: NOW }); const p2 = new N('div'); p2.append(again); await tick();
  assert.equal(p2.queryAll('[data-badges="new"]').length, 0);
});
test('card builder: nothing to say gives no card', () => {
  const s = { catalog, unseen: [], unseenMore: 0, tierUp: null }; assert.equal(V.newBadgeNode(h, s).node, null);
});

// ---- safety: copy, storage, install size ----
const BANNED = /\b(you lost|lose your|losing|lost your|broke(n)?|ruin|fail(ed|ure)?|shame|disappoint|don'?t give up|last chance|running out|hurry|expire[sd]?|behind|slack(ing)?|lazy|at risk|in danger|hours left|minutes left|miss(ed|ing)?|only \d+|streak (is )?(at risk|in danger)|keep it alive|before it|don'?t break|bonus|prize|reward|unlock|buy|pay|cost|purchase|rank(ed|ing)?|leaderboard|compete|beat)\b/i;
test('copy: the catalogue, tier lines and view text have no loss-shaming, pressure, shopping or ranking words and no exclamation marks', () => {
  const strings = [];
  for (const b of catalog.badges) strings.push(b.name, b.hint, b.unit, ...b.earn);
  for (const t of catalog.tiers) strings.push(t.name, t.line);
  for (const f of catalog.families) strings.push(f.name);
  strings.push(catalog.status);
  for (const s of strings) { assert.doesNotMatch(s, BANNED, s); assert.doesNotMatch(s, /!/, s); }
  const code = ['badges.view.js', 'badges.js', 'badges.art.js'].map((f) => fs.readFileSync(path.join(ROOT, 'preview/loops', f), 'utf8').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n')).join('\n');
  const lits = [...code.matchAll(/(["'`])((?:\\.|(?!\1).)+)\1/g)].map((m) => m[2]).filter((s) => /\s/.test(s) && /^[A-Z]/.test(s) && !/[{}=;<>]/.test(s));
  assert.ok(lits.length > 15);
  for (const s of lits) assert.doesNotMatch(s.replace(/Badges are earned, never lost, never bought and never compared with anyone\./, ''), BANNED, s);
});
test('copy: earn texts on tries count tries, not accuracy', () => {
  for (const id of ['listen-tries', 'speak-tries']) for (const t of catalog.badges.find((b) => b.id === id).earn) assert.match(t, /counts? tries, not/);
});
test('storage: badges live in loops.v1, which is registered in the privacy table and both backups, and the privacy row names them', async () => {
  const { STORE_KEYS } = await import('../src/shell/privacy.view.js'); const row = STORE_KEYS.find((x) => x[0] === 'loops.v1');
  assert.ok(row); assert.match(row[1], /your badges/); assert.ok(fs.readFileSync(path.join(ROOT, row[2]), 'utf8').includes('badges'));
  const { PROGRESS_KEYS } = await import('../src/progress/store.js'); assert.ok(PROGRESS_KEYS.includes('loops.v1'));
  const store = seeded(); V.settle(store, catalog, NOW); assert.ok(Object.keys(store.m).includes('loops.v1') && store.m['loops.v1'].badges.earned['letters-base']);
  assert.equal(Object.keys(store.m).filter((k) => /badge/i.test(k)).length, 0, 'no new storage key');
});
test('install size: the catalogue and badge modules are outside the first-install and on-demand download lists; nothing under src/ gained a badge import', async () => {
  const { computeManifest } = await import('../tools/build-precache.mjs'); const m = computeManifest(ROOT);
  assert.ok(![...m.files, ...m.onDemand].some((f) => /badges/.test(f)), 'badge files are not precached');
  const hits = []; const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.js$/.test(e.name) && /badges\./.test(fs.readFileSync(p, 'utf8'))) hits.push(path.relative(ROOT, p)); } };
  walk(path.join(ROOT, 'src')); assert.deepEqual(hits, []);
  const { EXTRAS } = await import('../tools/deploy/make-dist.mjs'); assert.ok(EXTRAS.some(([p]) => p === 'preview/loops'), 'the host build already ships the loops folder, including the catalogue');
});
