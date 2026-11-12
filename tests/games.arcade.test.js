// The arcade: pure model logic, and every one of the thirty games mounting and starting a round in the fake DOM.
// Logic and wiring checks only; nothing here is visual QA or a claim about the Hebrew.
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { Doc, El } from './wordtrace.fakedom.js';
import { matchRoute, tierOf } from '../src/shell/router.js';
import { ARCADE_GAMES } from '../src/games/arcade.catalog.js';
import { TG_GAMES } from '../src/games/tg-catalog.js';
import { applyResult, applyArcade, starsFor, buildWordSearch, buildCrossword, buildMaze, nextStepToward, seededRandom, dayKey, bestLine, bareLetters, gameOfTheDay, daysBetween } from '../src/games/arcade.model.js';
import { STORE_KEYS } from '../src/shell/privacy.view.js';
import { NAV_EN } from '../src/shell/nav.strings.js';
import { SECTION_ROUTES } from '../src/shell/nav-model.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const json = (p) => JSON.parse(readFileSync(root + p, 'utf8'));
const words = json('data/games/firstwords.json').words;

test('catalogue: thirty games, unique ids, each with a view file, a preview route, a label, a section, a store key and a privacy row', () => {
  assert.equal(ARCADE_GAMES.length, 30 + TG_GAMES.length); // thirty arcade games plus the Torah and Hebrew games
  assert.equal(new Set(ARCADE_GAMES.map((g) => g.id)).size, ARCADE_GAMES.length);
  const listed = new Set(STORE_KEYS.map((r) => r[0]));
  const inSection = new Set(Object.values(SECTION_ROUTES).flat());
  for (const g of ARCADE_GAMES) {
    assert.ok(existsSync(`${root}src/games/${g.id}.view.js`), g.id);
    const { route } = matchRoute('#/' + g.id);
    assert.equal(route?.name, g.id); assert.equal(tierOf(route), 'preview'); assert.equal(route.owner, 'games');
    assert.ok(NAV_EN['nav.route.' + g.id], 'label ' + g.id);
    assert.ok(inSection.has(g.id), 'section ' + g.id);
    assert.ok(listed.has(`games.${g.id}.v1`), 'privacy row ' + g.id);
    assert.ok(g.level >= 1 && g.level <= 5);
  }
  assert.ok(listed.has('games.arcade.v1'));
});

test('scores: stars, badges, unlocks and the comeback line', () => {
  assert.equal(starsFor(100, 100), 3); assert.equal(starsFor(66, 100), 2); assert.equal(starsFor(33, 100), 1); assert.equal(starsFor(5, 100), 0);
  let out = applyResult(null, { level: 1, score: 50, par: 100, misses: 0, timeMs: 30000 });
  assert.deepEqual(out.newBadges.sort(), ['bronze', 'first-play', 'perfect'].sort());
  assert.equal(out.unlockedNow, 2); assert.equal(out.record.unlocked, 2); assert.equal(out.record.levels[1].stars, 1);
  out = applyResult(out.record, { level: 1, score: 10, par: 100, misses: 3 });
  assert.equal(out.record.best, 50); assert.equal(out.beatBest, false); assert.equal(out.unlockedNow, 0);
  out = applyResult(out.record, { level: 1, score: 120, par: 100, misses: 1, daily: true, day: '2026-11-07' });
  assert.ok(out.newBadges.includes('gold') && out.newBadges.includes('comeback') && out.newBadges.includes('daily'));
  assert.equal(out.record.daily['2026-11-07'], 120);
  for (let l = 2; l <= 5; l++) out = applyResult(out.record, { level: l, score: 100, par: 100, misses: 0 });
  assert.ok(out.record.earned.includes('all-gold') && out.record.earned.includes('level-5'));
  for (let i = 0; i < 4; i++) out = applyResult(out.record, { level: 1, score: 1, par: 100 });
  assert.ok(out.record.earned.includes('marathon'));
  assert.match(bestLine(60, 50), /New best! 10 more/); assert.match(bestLine(40, 50), /10 short/); assert.match(bestLine(5, 0), /first score/);
});

test('arcade streak: consecutive days count, a gap resets, totals accumulate', () => {
  let a = applyArcade(null, { gameId: 'x', day: '2026-11-05', badgesEarned: 2 }).arcade;
  a = applyArcade(a, { gameId: 'x', day: '2026-11-05', badgesEarned: 0 }).arcade; assert.equal(a.streak, 1);
  a = applyArcade(a, { gameId: 'y', day: '2026-11-06' }).arcade; assert.equal(a.streak, 2);
  const r = applyArcade(a, { gameId: 'y', day: '2026-11-07' }); assert.equal(r.arcade.streak, 3); assert.deepEqual(r.streakBadges, ['streak-3']);
  a = applyArcade(r.arcade, { gameId: 'y', day: '2026-11-09' }).arcade; assert.equal(a.streak, 1); assert.equal(a.bestStreak, 3);
  assert.equal(a.totalRounds, 5); assert.equal(a.totalBadges, 2); assert.equal(a.perGame.y.rounds, 3);
  assert.equal(daysBetween('2026-02-28', '2026-03-01'), 1);
  assert.ok(ARCADE_GAMES.some((g) => g.id === gameOfTheDay(ARCADE_GAMES.map((g) => g.id), dayKey())));
});

test('boards: seeded rng repeats, word search places every word, crossword crosses, maze connects', () => {
  const a = seededRandom(42), b = seededRandom(42);
  assert.equal(a(), b());
  const pick = words.filter((w) => bareLetters(w.he).length >= 2 && bareLetters(w.he).length <= 4).slice(0, 5);
  const ws = buildWordSearch(pick, 7, seededRandom(7));
  assert.equal(ws.placed.length, 5);
  for (const p of ws.placed) p.cells.forEach(([r, c], i) => assert.equal(ws.grid[r][c], bareLetters(p.word.he)[i]));
  const cw = buildCrossword(words.filter((w) => bareLetters(w.he).length >= 3 && bareLetters(w.he).length <= 5).slice(0, 40), seededRandom(3), 6);
  assert.ok(cw.entries.length >= 2, 'at least two crossing entries');
  assert.ok(cw.entries.some((e) => e.dir === 'down'));
  const maze = buildMaze(9, seededRandom(1));
  assert.equal(maze[1][1], 0);
  const open = []; for (let r = 0; r < maze.length; r++) for (let c = 0; c < maze.length; c++) if (!maze[r][c] && !(r === 1 && c === 1)) open.push([r, c]);
  for (const cell of open.slice(0, 10)) assert.ok(nextStepToward(maze, [1, 1], cell), 'reachable ' + cell);
});

function environment() {
  const doc = new Doc(); globalThis.document = doc;
  El.prototype.append = function (...nodes) { for (const n of nodes) if (n != null) this.appendChild(typeof n === 'object' ? n : doc.createTextNode(String(n))); };
  El.prototype.replaceChildren = function (...nodes) { this.textContent = ''; this.append(...nodes); };
  El.prototype.remove = function () { this.parentNode?.removeChild(this); };
  El.prototype.closest = function () { return null; };
  Object.defineProperty(El.prototype, 'lastChild', { configurable: true, get() { return this.childNodes[this.childNodes.length - 1] || null; } });
  Object.defineProperty(El.prototype, 'classList', { configurable: true, get() {
    const el = this; const list = () => (el.className || '').split(/\s+/).filter(Boolean);
    return { add: (...c) => { el.className = [...new Set([...list(), ...c])].join(' '); }, remove: (...c) => { el.className = list().filter((x) => !c.includes(x)).join(' '); }, contains: (c) => list().includes(c), toggle: (c) => { list().includes(c) ? el.className = list().filter((x) => x !== c).join(' ') : el.className = [...list(), c].join(' '); } };
  } });
  Object.defineProperty(El.prototype, 'isConnected', { configurable: true, get: () => true });
  const listeners = new Map(), frames = new Map(); let frameId = 0;
  globalThis.window = { addEventListener: (k, f) => listeners.set(k, f), removeEventListener: (k, f) => { if (listeners.get(k) === f) listeners.delete(k); } };
  globalThis.requestAnimationFrame = (f) => { frames.set(++frameId, f); return frameId; };
  globalThis.cancelAnimationFrame = (id) => frames.delete(id);
  return { root: doc.createElement('main'), frames, listeners, step(t = 5000) { const batch = [...frames.values()]; frames.clear(); for (const f of batch) f(t); } };
}
const fetchFn = async (url) => { const p = String(url).startsWith('file:') ? fileURLToPath(url) : String(url); return { ok: existsSync(p), status: existsSync(p) ? 200 : 404, json: async () => JSON.parse(readFileSync(p, 'utf8')) }; };
const settings = { get: (k) => (k === 'soundEffects' ? false : undefined) };
const flush = async (f) => { for (let n = 0; n < 300 && !f(); n++) await new Promise((r) => setTimeout(r, 5)); assert.ok(f(), 'view became ready'); };

for (const g of ARCADE_GAMES) {
  test(`${g.id}: mounts, starts level 1, shows a board, keys are wired, unmount removes the key listener; STORE_KEY matches`, async () => {
    const mod = await import(`../src/games/${g.id}.view.js`);
    assert.equal(mod.STORE_KEY, `games.${g.id}.v1`);
    const env = environment();
    const mem = new Map(); const store = { get: (k) => mem.get(k), set: (k, v) => mem.set(k, v) };
    const stop = await mod.mount(env.root, { store, settings, fetchFn, images: { resolve: () => null }, audio: null, route: { query: {} } });
    await flush(() => env.root.querySelector('.arc-start'));
    assert.equal(env.root.querySelector('h1').textContent.startsWith(g.title), true);
    assert.equal(env.root.querySelectorAll('.arc-level').length, 5);
    assert.equal(env.root.querySelectorAll('.arc-level').filter((b) => b.getAttribute('disabled') !== null).length, 4, 'levels 2 to 5 start locked');
    env.root.querySelector('.arc-start').click();
    await flush(() => env.root.querySelector('.arc-board').childNodes.length > 0);
    assert.ok(env.listeners.has('keydown'), 'keyboard handler registered');
    env.step(); env.step();
    const board = env.root.querySelector('.arc-board');
    await flush(() => board.textContent.trim().length > 0 || board.querySelectorAll('button').length > 0);
    stop();
    assert.ok(!env.listeners.has('keydown'), 'keyboard handler removed on unmount');
  });
}

test('arcade data files are valid: mitzvot lists have the traditional counts; extra lists are non-empty', () => {
  const m = json('data/games/mitzvot.json');
  assert.equal(m.noahide.length, 7); assert.equal(m.ten.length, 10); assert.equal(m.mitzvot.length, 48);
  assert.equal(m.mitzvot.filter((x) => x.kind === 'positive').length, 24); assert.equal(m.mitzvot.filter((x) => x.kind === 'negative').length, 24);
  for (const x of [...m.noahide, ...m.ten, ...m.mitzvot]) assert.match(x.he, /[ְ-ׇ]/, 'pointed: ' + x.he);
  const e = json('data/games/arcade-extra.json');
  assert.ok(e.gender.m.length >= 40 && e.gender.f.length >= 40); assert.ok(e.plurals.length >= 40); assert.ok(e.sentences.length >= 40);
  for (const p of e.plurals) assert.match(bareLetters(p.plural), /(ים|ות)$/, p.he);
});
