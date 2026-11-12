// Lane games-books, ideas D1 to D5 and D9: one games catalogue counted once, the counts module total, skill filters,
// played / mastered state, best and last scores on cards, level requirements and the recommended game, the daily seeded
// challenge (one counted attempt, share text), tournament runs and the weekly board, and practice links. Logic and wiring only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { environment, memStore, calm, fetchFn, wait, buttons, byText, src } from './gb.env.js';
import { allGames, gameTotals, SECTIONS, SKILLS, PRACTICE } from '../src/games/library.catalog.js';
import { GAMES_ALL, gamesProgress, TOTALS } from '../src/lib/counts.js';
import { computeTotals } from '../tools/counts/build-counts.mjs';
import { matchRoute } from '../src/shell/router.js';
import { noteScore, recordScore, gameState, scoreLine, SCORES_KEY } from '../src/games/scores.js';
import { createSession } from '../src/games/engine.js';
import { saveBest } from '../src/games/hanukkah-shell.js';
import { levelProgress, recommendNext, LEVELS9, GAMES_FOR_NEXT } from '../src/games/levels.js';
import { noteDaily, dailyGameId, dailyRun, shareText, DAILY_KEY } from '../src/games/daily.js';
import { weekKey, weekGames, startRun, noteRound, nextGameId, leaderboard, TOURNEY_KEY } from '../src/games/tournament.js';
import { roundMode, afterRound } from '../src/games/round-extras.js';
import { ARCADE_IDS } from '../src/games/arcade.catalog.js';
import { filterGames, statesFor } from '../src/games/library.view.js';
import { h } from '../src/shell/ui.js';

const games = allGames();

test('D1: every game on the hub is in one catalogue once, and the counts module shows the same total', async () => {
  const ids = games.map((g) => g.id);
  assert.equal(new Set(ids).size, ids.length, 'no game counted twice');
  assert.equal(GAMES_ALL.total, games.length, 'counts.generated.js is current (node tools/counts/build-counts.mjs)');
  assert.deepEqual(TOTALS.games, gameTotals(games));
  assert.deepEqual((await computeTotals()).games, gameTotals(games));
  assert.ok(games.length > 67, 'more than the old 9-level header count');
  for (const s of SECTIONS) assert.ok(games.some((g) => g.section === s.id), `section ${s.id} has games`);
  for (const g of games) {
    assert.ok(matchRoute('#/' + g.id).route, `${g.id} has a route`);
    assert.ok(g.skills.length && g.skills.every((k) => SKILLS.some(([id]) => id === k)), `${g.id} skills`);
    assert.ok(g.level >= 1 && g.level <= g.ladder);
  }
  // the hub links to the library and states the one total
  const hub = src('src/games/games.view.js');
  assert.match(hub, /GAMES_ALL\.total/); assert.match(hub, /#\/game-library/); assert.match(hub, /hubSummary\(items\)/);
});

test('D9: every card names what it practises and links to a real route', () => {
  for (const g of games) { assert.ok(g.practice?.href && g.practice.label, g.id); assert.ok(matchRoute(g.practice.href).route, `${g.id} -> ${g.practice.href}`); }
  for (const p of Object.values(PRACTICE)) assert.ok(matchRoute(p.href).route, p.href);
});

test('D4: the ledger keeps best and last; the shared savers write it; the card line says both', () => {
  let led = noteScore({}, 'tugowar', 40, 2, 1);
  led = noteScore(led, 'tugowar', 25, 3, 2);
  assert.deepEqual(led.tugowar, { best: 40, last: 25, lastAt: 2, plays: 2, bestStars: 3 });
  assert.equal(scoreLine(gameState({ best: 40, plays: 2 }, led.tugowar)), 'Best 40 · Last 25');
  assert.equal(scoreLine(gameState(null, null)), '');
  const { store, mem } = memStore();
  const s = createSession({ store, storeKey: 'games.tugowar.v1', par: 1 }); s.answer(true); s.saveBest();
  assert.equal(mem.get(SCORES_KEY).tugowar.last, s.score);
  saveBest({ store }, 'games.hanukkah-pairs.v1', 17, 2);
  assert.equal(mem.get(SCORES_KEY)['hanukkah-pairs'].last, 17);
  assert.match(src('src/games/arcade.js'), /afterRound\(h, ctx, \{ id: spec\.id, level, score, stars, daily/);
  assert.equal(recordScore({ get() { throw new Error('x'); } }, 'a', 1), null, 'never throws');
});

test('D1: played and mastered follow the stated rule', () => {
  assert.equal(gameState(null, null).played, false);
  assert.equal(gameState({ best: 10, plays: 1, lastStars: 2 }).mastered, false);
  assert.equal(gameState({ best: 10, plays: 1, lastStars: 3 }).mastered, true, 'one-round game: a three-star round');
  const lv = (s) => ({ best: 1, stars: s, plays: 1 });
  assert.equal(gameState({ plays: 5, best: 9, levels: { 1: lv(3), 2: lv(3), 3: lv(3), 4: lv(3), 5: lv(2) } }).mastered, false);
  assert.equal(gameState({ plays: 5, best: 9, levels: { 1: lv(3), 2: lv(3), 3: lv(3), 4: lv(3), 5: lv(3) } }).mastered, true);
  assert.deepEqual(gamesProgress({ a: { played: true, mastered: true }, b: { played: true }, c: {} }), { played: 2, mastered: 1 });
  const states = { [games[0].id]: { played: true, mastered: false } };
  assert.equal(filterGames(games, states, { state: 'played' }).length, 1);
  assert.equal(filterGames(games, states, { state: 'new' }).length, games.length - 1);
  assert.ok(filterGames(games, {}, { skill: 'listening' }).every((g) => g.skills.includes('listening')));
});

test('D2: each of the nine levels states its requirement; the recommendation follows the lowest unmet level', () => {
  assert.equal(LEVELS9.length, 9);
  for (const L of LEVELS9.slice(0, 8)) assert.match(L.requirement, new RegExp(`one star or more in ${GAMES_FOR_NEXT} level ${L.level} games`));
  const none = recommendNext(games, {});
  assert.equal(none.level, 1); assert.equal(none.game.ladder, 9);
  const l1 = games.filter((g) => g.ladder === 9 && g.level === 1);
  const states = Object.fromEntries(l1.slice(0, 2).map((g) => [g.id, { played: true, stars: 1 }]));
  assert.ok(levelProgress(games, states)[0].met);
  assert.equal(recommendNext(games, states).level, 2);
  const allMet = Object.fromEntries(games.filter((g) => g.ladder === 9).map((g) => [g.id, { played: true, stars: 3, mastered: true }]));
  assert.equal(recommendNext(games, allMet), null);
});

test('D3: one seeded game a day; only the first finished round of today\'s game counts; the share text names only the result', () => {
  const day = '2026-11-12', id = dailyGameId(day);
  assert.ok(ARCADE_IDS.includes(id)); assert.equal(dailyGameId(day), id, 'deterministic');
  const a = noteDaily({}, { day, id, level: 2, score: 90, stars: 2, at: 1 });
  assert.equal(a.counted, true);
  const b = noteDaily(a.record, { day, id, level: 2, score: 150, stars: 3, at: 2 });
  assert.equal(b.counted, false); assert.equal(b.reason, 'already'); assert.equal(b.record[day].score, 90);
  const other = ARCADE_IDS.find((x) => x !== id);
  assert.equal(noteDaily({}, { day, id: other, level: 1, score: 5 }).reason, 'other-game');
  assert.equal(dailyRun({ '2026-11-11': {}, '2026-11-12': {} }, day), 2);
  assert.equal(dailyRun({ '2026-11-10': {} }, day), 0);
  assert.match(shareText({ day, title: 'Letter Chomp', level: 1, score: 120, stars: 2 }), /^Aleph daily challenge, 2026-11-12: Letter Chomp, level 1\. 120 points ★★☆\./);
  // ?daily=1 now turns the daily board on (the hub has always linked it)
  assert.equal(roundMode({ query: { daily: '1' } }, id).daily, true);
  assert.match(src('src/games/arcade.js'), /let daily = mode\.daily/);
});

test('D3/D5: afterRound records the daily score once and steps a tournament run; nothing else is touched', () => {
  environment();
  const { store, mem } = memStore();
  const now = new Date(2026, 10, 12, 10).getTime(), day = '2026-11-12', id = dailyGameId(day);
  const n1 = afterRound(h, { store }, { id, level: 1, score: 50, stars: 2, daily: true, tournament: false, week: weekKey(new Date(now)), now });
  assert.equal(mem.get(DAILY_KEY)[day].score, 50);
  assert.ok(n1.length && n1[0].textContent.includes('daily challenge score'));
  afterRound(h, { store }, { id, level: 1, score: 99, stars: 3, daily: true, tournament: false, week: '', now });
  assert.equal(mem.get(DAILY_KEY)[day].score, 50, 'second round is practice');
  const week = weekKey(new Date(now));
  mem.set(TOURNEY_KEY, startRun(null, week, now));
  const first = nextGameId(mem.get(TOURNEY_KEY), week);
  assert.equal(roundMode({ store, query: { tournament: '1' } }, first, new Date(now)).tournament, true);
  assert.equal(roundMode({ store, query: { tournament: '1' } }, 'not-the-game', new Date(now)).tournament, false);
  afterRound(h, { store }, { id: first, level: 1, score: 30, stars: 1, daily: false, tournament: true, week, now });
  assert.deepEqual(mem.get(TOURNEY_KEY).run.scores, [30]);
});

test('D5: five distinct games a week, the same all week; a run adds up; the board lists this week\'s runs, best first', () => {
  assert.equal(weekKey(new Date(2026, 10, 12)), '2026-W46');
  assert.equal(weekKey(new Date(2026, 0, 1)), '2026-W01');
  const g = weekGames('2026-W46');
  assert.equal(g.length, 5); assert.equal(new Set(g).size, 5); assert.deepEqual(weekGames('2026-W46'), g);
  assert.ok(g.every((id) => ARCADE_IDS.includes(id)));
  let t = startRun(null, '2026-W46', 0);
  for (const [i, id] of g.entries()) { const out = noteRound(t, '2026-W46', id, 10 * (i + 1), i); t = out.state; if (i === 4) { assert.equal(out.done, true); assert.equal(out.total, 150); } }
  assert.equal(t.run, null);
  t = startRun(t, '2026-W46', 9);
  for (const id of g) t = noteRound(t, '2026-W46', id, 40, 10).state;
  assert.equal(noteRound(t, '2026-W46', g[0], 999).counted, false, 'no open run');
  assert.deepEqual(leaderboard(t, '2026-W46').map((r) => r.total), [200, 150]);
  assert.deepEqual(leaderboard(t, '2026-W47'), []);
});

test('D1/D2/D3/D5: the library and tournament pages mount, filter and show the total from the counts module', async () => {
  const env = environment();
  const { store } = memStore({ 'games.tugowar.v1': { best: 40, plays: 1, lastStars: 3 }, [SCORES_KEY]: { tugowar: { best: 40, last: 30, plays: 1, bestStars: 3 } } });
  const lib = await import('../src/games/library.view.js');
  lib.mount(env.root, { store, settings: calm });
  const text = env.root.textContent;
  assert.match(text, new RegExp(`${GAMES_ALL.total} games, each counted once`));
  assert.match(text, /On this device: 1 played, 1 mastered/);
  assert.match(text, /Recommended next:/); assert.match(text, /Daily Challenge/);
  assert.equal(env.root.querySelectorAll('li.gb-card').length, GAMES_ALL.total);
  byText(env.root, /^Mastered$/).click();
  assert.equal(env.root.querySelectorAll('li.gb-card').length, 1);
  assert.match(env.root.querySelector('li.gb-card').textContent, /Best 40 · Last 30/);
  byText(env.root, /^Listening/).click();
  assert.equal(env.root.querySelectorAll('li.gb-card').length, 0);
  assert.deepEqual(Object.keys(statesFor({ store }, games)).length, games.length);
  const env2 = environment();
  const tv = await import('../src/games/tournament.view.js');
  const m2 = memStore();
  tv.mount(env2.root, { store: m2.store });
  byText(env2.root, /Start this week's run/).click();
  assert.ok(m2.mem.get(TOURNEY_KEY).run);
  assert.match(env2.root.textContent, /Play game 1:/);
});

test('D4/D9: the games page decorates played cards with the score and adds practice links', async () => {
  const env = environment();
  const { store } = memStore({ 'games.tugowar.v1': { best: 40, plays: 2, lastStars: 1 }, [SCORES_KEY]: { tugowar: { best: 40, last: 12, plays: 2 } } });
  const hub = await import('../src/games/games.view.js');
  hub.mount(env.root, { store, settings: calm, fetchFn });
  await wait(() => env.root.querySelectorAll('.gb-practice').length > 20);
  const tile = env.root.querySelectorAll('a.wf-level-tile').find((a) => a.getAttribute('href') === '#/tugowar');
  assert.match(tile.textContent, /Played Best 40 · Last 12/);
  assert.ok(env.root.querySelectorAll('a').some((a) => a.getAttribute('href') === '#/game-library'));
  assert.ok(env.root.querySelectorAll('a').some((a) => a.getAttribute('href') === '#/rootbuilder'), 'the new games have a hub section');
  void buttons;
});
