// Read-only look at practice-game records the games already save.
// A play count is a finished game session on this device. It is not a lesson result,
// not a win, and not evidence that a word was learned. Wrong answers can still end a game
// and increment plays (src/games/engine.js saveBest). This module only reads.

import { projectStreak } from '../curriculum/streak.js';

/** Keep in step with each game's STORE_KEY. Tests compare these strings to the game files. */
export const GAME_STORE_KEYS = Object.freeze([
  { key: 'games.tugowar.v1', title: 'Antonym Tug-of-War', file: 'src/games/tugowar.view.js', href: '#/tugowar', code: 'tug' },
  { key: 'games.vowelcatcher.v1', title: 'Vowel Catcher', file: 'src/games/vowelcatcher.view.js', href: '#/vowelcatcher', code: 'vowel' },
  { key: 'games.pinball.v1', title: 'The Hebrew Pinball Bouncer', file: 'src/games/pinball.view.js', href: '#/pinball', code: 'pin' },
  { key: 'games.prefixblast.v1', title: 'Bubble Pop Prefix Blast', file: 'src/games/prefixblast.view.js', href: '#/prefixblast', code: 'prefix' },
  { key: 'games.memorypalace.v1', title: 'The Memory Palace Courtyard', file: 'src/games/memorypalace.view.js', href: '#/memorypalace', code: 'palace' },
]);

function playsOf(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return 0;
  const n = raw.plays;
  if (!Number.isInteger(n) || n < 1) return 0;
  return n;
}

/**
 * @param {{get?: Function}|null|undefined} store
 * @returns {{sessions:{key:string,title:string,plays:number}[], anyPlay:boolean, returned:boolean, readErrors:string[]}}
 */
export function observeGames(store) {
  const sessions = [];
  const readErrors = [];
  for (const game of GAME_STORE_KEYS) {
    let raw;
    try { raw = store && typeof store.get === 'function' ? store.get(game.key, null) : null; }
    catch { readErrors.push(game.key); continue; }
    const plays = playsOf(raw);
    if (plays > 0) sessions.push({ key: game.key, title: game.title, plays, code: game.code, href: game.href });
  }
  return {
    sessions,
    anyPlay: sessions.length > 0,
    returned: sessions.some((s) => s.plays >= 2),
    readErrors,
  };
}

/** Keep in step with DAILY_GOALS in src/home/today.js. */
export const DAILY_GOAL_STEPS = Object.freeze([5, 10, 15, 20, 30]);

/**
 * Read-only look at the streak record (store key "streak", owned by
 * src/curriculum/streak.js) and the learner's daily goal. Everything here is
 * what the streak engine itself counted: engaged seconds, completed days,
 * frozen rest days. Nothing is self-reported on the Awards page.
 * @param {{get?: Function}|null|undefined} store
 * @param {number|Date} now
 */
export function observeStreak(store, now) {
  let raw = null, goalRaw = null, readError = false;
  try { raw = store && typeof store.get === 'function' ? store.get('streak', null) : null; } catch { readError = true; }
  try { goalRaw = store && typeof store.get === 'function' ? store.get('onboarding.v1.dailyGoal', null) : null; } catch { readError = true; }
  const proj = projectStreak(raw, now);
  const goalMinutes = DAILY_GOAL_STEPS.includes(goalRaw) ? goalRaw : 5;
  return {
    best: proj.best,
    count: proj.count,
    anyDay: proj.best > 0 || !!proj.last,
    goalMinutes,
    goalMet: proj.todaySeconds >= goalMinutes * 60,
    readError,
  };
}
