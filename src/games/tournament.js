// @ts-check
// Tournament mode (D5): five arcade games in a row at level 1, one combined score, and a weekly leaderboard of the runs played
// ON THIS DEVICE (there is no server and no one else's score is ever shown). The five games are picked from the arcade list
// with a seed from the week, so they are the same five all week; each board is seeded from the game and the week as well.
// Pure: no DOM, no clock (the week and times are passed in).
import { ARCADE_GAMES } from './arcade.catalog.js';
import { seededRandom, seedFrom, pickSeeded } from './arcade.model.js';

export const TOURNEY_KEY = 'games.tournament.v1';
export const TOURNEY_GAMES = 5;
export const TOURNEY_LEVEL = 1;
const KEEP_RUNS = 60;
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
const nat = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Math.floor(Number(v)) : 0);

/** ISO week of a local date: '2026-W46'. */
export function weekKey(d = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const wd = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - wd);
  const y = t.getUTCFullYear();
  const w = Math.ceil(((t.getTime() - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7);
  return `${y}-W${String(w).padStart(2, '0')}`;
}

/** The week's five games (arcade games that run in the shared arcade shell), in play order. */
export function weekGames(week, games = ARCADE_GAMES, n = TOURNEY_GAMES) {
  return pickSeeded(games.map((g) => g.id), n, seededRandom(seedFrom(`tournament|${week}`)));
}

export const emptyTourney = () => ({ version: 1, run: null, runs: [] });
const norm = (s) => { const t = { ...emptyTourney(), ...obj(s) }; t.runs = Array.isArray(t.runs) ? t.runs.filter((r) => r && typeof r.week === 'string') : []; return t; };

/** Start (or restart) this week's run. */
export function startRun(state, week, now = 0) {
  const t = norm(state);
  return { ...t, run: { week, games: weekGames(week), scores: [], startedAt: Number(now) || 0 } };
}

/** The game the open run is waiting for, or null. A run left over from another week is not open. */
export function nextGameId(state, week) {
  const r = norm(state).run;
  if (!r || r.week !== week || r.scores.length >= r.games.length) return null;
  return r.games[r.scores.length];
}

/**
 * A finished round of the run's next game. Other games and other weeks change nothing.
 * @returns {{state:any, counted:boolean, step:number, done:boolean, total:number}}
 */
export function noteRound(state, week, id, score, now = 0) {
  const t = norm(state);
  const r = t.run;
  if (!r || nextGameId(t, week) !== id) return { state: t, counted: false, step: r ? r.scores.length : 0, done: false, total: r ? r.scores.reduce((a, b) => a + b, 0) : 0 };
  const scores = [...r.scores, nat(score)];
  const total = scores.reduce((a, b) => a + b, 0);
  if (scores.length < r.games.length) return { state: { ...t, run: { ...r, scores } }, counted: true, step: scores.length, done: false, total };
  const runs = [...t.runs, { week, games: r.games, scores, total, at: Number(now) || 0 }].slice(-KEEP_RUNS);
  return { state: { ...t, run: null, runs }, counted: true, step: scores.length, done: true, total };
}

/** This week's finished runs on this device, best first (ties: earlier run first), at most `n`. */
export function leaderboard(state, week, n = 10) {
  return norm(state).runs.filter((r) => r.week === week).sort((a, b) => b.total - a.total || a.at - b.at).slice(0, n);
}

/** Text for sharing a finished run. */
export function tourneyShareText({ week, total, scores, titles }) {
  return `Aleph tournament, week ${week}: ${total} points over ${scores.length} games (${scores.map((s, i) => `${titles[i] || 'game ' + (i + 1)} ${s}`).join(', ')}).`;
}
