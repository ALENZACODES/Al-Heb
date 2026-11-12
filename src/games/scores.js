// @ts-check
// Personal bests and last scores for every game (D4), and the played / mastered state the games library shows (D1).
// Each game already keeps its own record in games.<id>.v1 ({ best, plays, lastStars } and, for arcade games, stars per level).
// This module adds one small ledger, games.scores.v1, written by the three shared score savers (src/games/arcade.js,
// src/games/engine.js createSession, src/games/hanukkah-shell.js), so a card can show the LAST score as well as the best.
// Pure apart from the store helpers at the bottom (which never throw). No DOM.

export const SCORES_KEY = 'games.scores.v1';
const MAX_GAMES = 400;
const nat = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Math.floor(Number(v)) : 0);
const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});

/** The ledger after one finished round. Pure. { [id]: { best, last, lastAt, plays, bestStars } } */
export function noteScore(prev, id, score, stars = 0, now = Date.now()) {
  const led = { ...obj(prev) };
  if (typeof id !== 'string' || !id) return led;
  const s = nat(score), st = Math.min(3, nat(stars));
  const was = obj(led[id]);
  led[id] = { best: Math.max(nat(was.best), s), last: s, lastAt: Number(now) || 0, plays: nat(was.plays) + 1, bestStars: Math.max(nat(was.bestStars), st) };
  const ids = Object.keys(led);
  if (ids.length > MAX_GAMES) { ids.sort((a, b) => (led[a].lastAt || 0) - (led[b].lastAt || 0)); for (const k of ids.slice(0, ids.length - MAX_GAMES)) delete led[k]; }
  return led;
}

/** Write one finished round to the ledger. Never throws; returns the new entry or null. */
export function recordScore(store, id, score, stars = 0, now = Date.now()) {
  try {
    const led = noteScore(store?.get?.(SCORES_KEY), id, score, stars, now);
    store?.set?.(SCORES_KEY, led);
    return led[id] || null;
  } catch { return null; }
}

export const MASTERED_RULE = 'Mastered means three stars on every level of a game with levels, or a three-star round in a game without levels.';

/**
 * One game's state for a card. rec = games.<id>.v1 (any of the shapes the games write), entry = its ledger entry.
 * @returns {{played:boolean, mastered:boolean, best:number, last:number|null, plays:number, stars:number}}
 */
export function gameState(rec, entry) {
  const r = obj(rec), e = obj(entry);
  const levels = obj(r.levels);
  const levelIds = Object.keys(levels);
  const plays = Math.max(nat(r.plays), nat(e.plays), nat(r.rounds));
  const best = Math.max(nat(r.best), nat(e.best));
  // a game with levels: the arcade shell keeps stars for each of its five levels
  const allLevels = levelIds.length > 0 && [1, 2, 3, 4, 5].every((l) => nat(obj(levels[l]).stars) >= 3);
  const earnedAll = Array.isArray(r.earned) && r.earned.includes('all-gold');
  const single = levelIds.length === 0 && (nat(e.bestStars) >= 3 || nat(r.lastStars) >= 3);
  const played = plays > 0 || best > 0 || (Array.isArray(r.found) && r.found.length > 0);
  // stars: the most stars this game has given in any one round (any level), for the level ladder's requirements (src/games/levels.js)
  const stars = Math.min(3, Math.max(nat(e.bestStars), nat(r.lastStars), ...levelIds.map((l) => nat(obj(levels[l]).stars))));
  return { played, mastered: played && (allLevels || earnedAll || single), best, last: e.last == null ? null : nat(e.last), plays, stars };
}

/** "Best 120 · Last 80", "Best 40", or "" when the game has never been played. */
export function scoreLine(st) {
  if (!st || !st.played) return '';
  const parts = [];
  if (st.best > 0) parts.push(`Best ${st.best}`);
  if (st.last != null) parts.push(`Last ${st.last}`);
  if (!parts.length) parts.push('Played');
  return parts.join(' · ');
}

/** Read one game's state from the store. Never throws. */
export function readGameState(store, id, ledger) {
  let rec = null, led = ledger;
  try { rec = store?.get?.(`games.${id}.v1`) || null; } catch { rec = null; }
  if (led === undefined) { try { led = store?.get?.(SCORES_KEY) || {}; } catch { led = {}; } }
  return gameState(rec, obj(led)[id]);
}
