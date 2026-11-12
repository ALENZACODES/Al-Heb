// Arcade model: pure, testable logic shared by the arcade games (no DOM).
// Scores, badges, daily challenge seeds, level unlocks and the "come back" loop.

export const ARCADE_KEY = 'games.arcade.v1';
export const LEVELS = [1, 2, 3, 4, 5];

/** Deterministic PRNG (mulberry32) so a daily challenge is the same board for everyone that day. */
export function seededRandom(seed) {
  let a = (seed >>> 0) || 1;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Local calendar day as YYYY-MM-DD. */
export function dayKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Integer seed from a string (game id + day). */
export function seedFrom(text) {
  let h = 2166136261;
  for (const ch of String(text)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** Stars for one round: 0 to 3 against a par. */
export function starsFor(score, par) {
  if (par <= 0) return score > 0 ? 3 : 0;
  if (score >= par) return 3;
  if (score >= Math.ceil(par * 0.66)) return 2;
  if (score >= Math.ceil(par * 0.33)) return 1;
  return 0;
}

/** Days between two day keys (b - a). */
export function daysBetween(a, b) {
  const [ay, am, ad] = String(a).split('-').map(Number), [by, bm, bd] = String(b).split('-').map(Number);
  if (![ay, am, ad, by, bm, bd].every(Number.isFinite)) return NaN;
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
}

export const BADGES = Object.freeze({
  'first-play': 'First play',
  'bronze': 'Bronze: one star on a level',
  'silver': 'Silver: two stars on a level',
  'gold': 'Gold: three stars on a level',
  'perfect': 'Perfect: a round with no wrong answers or guesses', // M-03: wrong guesses count too (see applyResult)
  'level-5': 'Summit: finished level 5',
  'all-gold': 'Scholar: three stars on every level',
  'marathon': 'Marathon: ten rounds in this game',
  'daily': 'Daily: finished a daily challenge',
  'streak-3': 'Three days in a row',
  'streak-7': 'Seven days in a row',
  'streak-30': 'Thirty days in a row',
  'comeback': 'Comeback: beat your own best',
});

/** M-03: a round with no failed item and no wrong answer or guess on the way (missing values count as 0). */
export const wrongCount = (result) => (Number(result?.misses) || 0) + (Number(result?.slips) || 0);
export const isPerfect = (result) => wrongCount(result) === 0;
/** Results-card line for a round's mistakes (M-03: says what the Perfect badge measures). */
export const mistakesLine = (result, par) => {
  const n = wrongCount(result);
  return `${n ? `${n} mistake${n === 1 ? '' : 's'} (wrong answers and guesses)` : 'No mistakes, not even a wrong guess'} · par for three stars is ${par}`;
};

/** Empty per-game record. */
export function emptyRecord() {
  return { version: 1, best: 0, plays: 0, lastStars: 0, levels: {}, earned: [], unlocked: 1, daily: {} };
}

/**
 * Apply a finished round to a game record. Pure: returns { record, newBadges, beatBest, unlockedNow }.
 * result = { level, score, par, misses, slips, timeMs, daily (bool), day (YYYY-MM-DD) }
 * misses = failed items (A.miss); slips = wrong answers or guesses that did not fail the item (A.slip). M-03: Perfect needs both at 0.
 */
export function applyResult(previous, result) {
  const rec = { ...emptyRecord(), ...(previous || {}) };
  rec.levels = { ...(rec.levels || {}) }; rec.earned = [...(rec.earned || rec.badges || [])]; rec.daily = { ...(rec.daily || {}) };
  const level = Math.min(5, Math.max(1, Number(result.level) || 1));
  const score = Math.max(0, Math.floor(Number(result.score) || 0));
  const stars = starsFor(score, Number(result.par) || 0);
  const newBadges = [];
  const earn = (b) => { if (!rec.earned.includes(b)) { rec.earned.push(b); newBadges.push(b); } };
  const beatBest = rec.plays > 0 && score > rec.best;
  rec.plays += 1;
  rec.best = Math.max(rec.best, score);
  rec.lastStars = stars;
  const lv = rec.levels[level] || { best: 0, stars: 0, plays: 0, bestTimeMs: 0 };
  lv.plays += 1; lv.best = Math.max(lv.best, score); lv.stars = Math.max(lv.stars, stars);
  if (Number(result.timeMs) > 0 && stars === 3) lv.bestTimeMs = lv.bestTimeMs ? Math.min(lv.bestTimeMs, Number(result.timeMs)) : Number(result.timeMs);
  rec.levels[level] = lv;
  let unlockedNow = 0;
  if (stars >= 1 && level < 5 && (rec.unlocked || 1) <= level) { rec.unlocked = level + 1; unlockedNow = level + 1; }
  earn('first-play');
  if (stars >= 1) earn('bronze'); if (stars >= 2) earn('silver'); if (stars >= 3) earn('gold');
  if (stars >= 1 && isPerfect(result)) earn('perfect');
  if (level === 5 && stars >= 1) earn('level-5');
  if (LEVELS.every((l) => (rec.levels[l]?.stars || 0) >= 3)) earn('all-gold');
  if (rec.plays >= 10) earn('marathon');
  if (beatBest) earn('comeback');
  if (result.daily && result.day) {
    rec.daily[result.day] = Math.max(rec.daily[result.day] || 0, score);
    earn('daily');
  }
  return { record: rec, newBadges, beatBest, unlockedNow, stars };
}

/**
 * Cross-game record: daily streak, totals. Pure.
 * arcade = { version, lastDay, streak, bestStreak, totalRounds, totalBadges, perGame: {id: {rounds, badges}} }
 */
export function applyArcade(previous, { gameId, day, badgesEarned = 0 }) {
  const a = { version: 1, lastDay: '', streak: 0, bestStreak: 0, totalRounds: 0, totalBadges: 0, perGame: {}, ...(previous || {}) };
  a.perGame = { ...(a.perGame || {}) };
  const newBadges = [];
  if (a.lastDay !== day) {
    const gap = a.lastDay ? daysBetween(a.lastDay, day) : NaN;
    a.streak = gap === 1 ? a.streak + 1 : 1;
    a.lastDay = day;
    a.bestStreak = Math.max(a.bestStreak, a.streak);
  }
  a.totalRounds += 1;
  a.totalBadges += badgesEarned;
  const g = a.perGame[gameId] || { rounds: 0, badges: 0 };
  g.rounds += 1; g.badges += badgesEarned; a.perGame[gameId] = g;
  if (a.streak >= 3) newBadges.push('streak-3');
  if (a.streak >= 7) newBadges.push('streak-7');
  if (a.streak >= 30) newBadges.push('streak-30');
  return { arcade: a, streakBadges: newBadges };
}

/** Which arcade game is today's featured one: rotates through the list by day. */
export function gameOfTheDay(ids, day = dayKey()) {
  if (!ids?.length) return null;
  return ids[seedFrom(day) % ids.length];
}

/** Honest "beat your best" line for the results card. */
export function bestLine(score, previousBest) {
  if (!previousBest) return 'Your first score here. Beat it next time.';
  if (score > previousBest) return `New best! ${score - previousBest} more than your old best of ${previousBest}.`;
  if (score === previousBest) return `Tied your best of ${previousBest}.`;
  return `${previousBest - score} short of your best (${previousBest}). One more go?`;
}

/** Strip vowel points and cantillation for grid play: letters only. */
export function bareLetters(he) {
  return String(he).replace(/[֑-ׇ]/g, '').replace(/[^א-ת]/g, '');
}

/** Final-form letter to its base letter (for matching). */
export const FINAL_TO_BASE = Object.freeze({ 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' });
export const BASE_TO_FINAL = Object.freeze({ 'כ': 'ך', 'מ': 'ם', 'נ': 'ן', 'פ': 'ף', 'צ': 'ץ' });
export const ALPHABET = Object.freeze([...'אבגדהוזחטיכלמנסעפצקרשת']);

/** The 27 shapes as they appear in words (22 base letters and the 5 finals). */
export const ALL_SHAPES = Object.freeze([...ALPHABET, ...Object.values(BASE_TO_FINAL)]);

/** Pick n distinct items with a seeded or default rng. */
export function pickSeeded(arr, n, rnd = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, Math.max(0, Math.min(n, a.length)));
}

/** Words whose bare letters are within [min,max] long; optional theme filter. */
export function wordsOfLength(words, min, max, theme = null) {
  return words.filter((w) => { const n = bareLetters(w.he).length; return n >= min && n <= max && (!theme || w.theme === theme); });
}

/**
 * Place words into a square grid for a word search. Returns { grid, placed:[{word, cells}] }.
 * Hebrew runs right-to-left: the word's first letter has the largest column index. Fill is random letters.
 */
export function buildWordSearch(words, size, rnd = Math.random, allowDiagonal = false) {
  const grid = Array.from({ length: size }, () => Array(size).fill(''));
  const placed = [];
  const dirs = [[0, -1], [1, 0]]; if (allowDiagonal) dirs.push([1, -1]);
  for (const w of words) {
    const letters = [...bareLetters(w.he)];
    if (!letters.length || letters.length > size) continue;
    let done = false;
    for (let tries = 0; tries < 80 && !done; tries++) {
      const [dr, dc] = dirs[Math.floor(rnd() * dirs.length)];
      const r0 = Math.floor(rnd() * (dr ? size - letters.length + 1 : size));
      const c0 = dc ? letters.length - 1 + Math.floor(rnd() * (size - letters.length + 1)) : Math.floor(rnd() * size);
      const cells = letters.map((_, i) => [r0 + dr * i, c0 + dc * i]);
      if (cells.every(([r, c], i) => r >= 0 && r < size && c >= 0 && c < size && (grid[r][c] === '' || grid[r][c] === letters[i]))) {
        cells.forEach(([r, c], i) => { grid[r][c] = letters[i]; });
        placed.push({ word: w, cells });
        done = true;
      }
    }
  }
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (!grid[r][c]) grid[r][c] = ALPHABET[Math.floor(rnd() * ALPHABET.length)];
  return { grid, placed };
}

/**
 * Tiny crossword builder: first word across (right-to-left), later words down crossing a shared letter.
 * Returns { cells: Map "r,c" -> letter, entries:[{word, dir:'across'|'down', r, c, len}] , rows, cols }.
 */
export function buildCrossword(words, rnd = Math.random, maxEntries = 6) {
  const cells = new Map();
  const entries = [];
  const key = (r, c) => `${r},${c}`;
  const pool = words.map((w) => ({ w, letters: [...bareLetters(w.he)] })).filter((x) => x.letters.length >= 2 && x.letters.length <= 7);
  if (!pool.length) return { cells, entries, rows: 0, cols: 0 };
  const first = pool.shift();
  first.letters.forEach((ch, i) => cells.set(key(0, first.letters.length - 1 - i), ch));
  entries.push({ word: first.w, dir: 'across', r: 0, c: first.letters.length - 1, len: first.letters.length });
  const fits = (letters, r, c, dir) => {
    for (let i = 0; i < letters.length; i++) {
      const rr = dir === 'down' ? r + i : r, cc = dir === 'down' ? c : c - i;
      const have = cells.get(key(rr, cc));
      if (have !== undefined && have !== letters[i]) return false;
      if (have === undefined) {
        // no touching parallel words
        const n = dir === 'down' ? [[rr, cc - 1], [rr, cc + 1]] : [[rr - 1, cc], [rr + 1, cc]];
        if (n.some(([a, b]) => cells.has(key(a, b)))) return false;
      }
    }
    const before = dir === 'down' ? [r - 1, c] : [r, c + 1], after = dir === 'down' ? [r + letters.length, c] : [r, c - letters.length];
    return !cells.has(key(...before)) && !cells.has(key(...after));
  };
  for (const cand of pool) {
    if (entries.length >= maxEntries) break;
    const anchors = [...cells.entries()].sort(() => rnd() - 0.5);
    let placedOne = false;
    for (const [k, ch] of anchors) {
      const [r, c] = k.split(',').map(Number);
      const idx = cand.letters.indexOf(ch);
      if (idx < 0) continue;
      const dirAt = entries.find((e) => e.dir === 'across' && e.r === r && c <= e.c && c > e.c - e.len) ? 'down' : 'across';
      const r0 = dirAt === 'down' ? r - idx : r, c0 = dirAt === 'down' ? c : c + idx;
      if (fits(cand.letters, r0, c0, dirAt)) {
        cand.letters.forEach((l, i) => cells.set(key(dirAt === 'down' ? r0 + i : r0, dirAt === 'down' ? c0 : c0 - i), l));
        entries.push({ word: cand.w, dir: dirAt, r: r0, c: c0, len: cand.letters.length });
        placedOne = true; break;
      }
    }
    if (!placedOne) continue;
  }
  let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
  for (const k of cells.keys()) { const [r, c] = k.split(',').map(Number); minR = Math.min(minR, r); maxR = Math.max(maxR, r); minC = Math.min(minC, c); maxC = Math.max(maxC, c); }
  const shifted = new Map();
  for (const [k, v] of cells) { const [r, c] = k.split(',').map(Number); shifted.set(key(r - minR, c - minC), v); }
  for (const e of entries) { e.r -= minR; e.c -= minC; }
  return { cells: shifted, entries, rows: maxR - minR + 1, cols: maxC - minC + 1 };
}

/** Build a letter maze (odd size) with recursive backtracking; 1 = wall, 0 = open. Deterministic with rnd. */
export function buildMaze(size, rnd = Math.random) {
  const n = size % 2 ? size : size + 1;
  const g = Array.from({ length: n }, () => Array(n).fill(1));
  const carve = (r, c) => {
    g[r][c] = 0;
    const dirs = [[0, 2], [0, -2], [2, 0], [-2, 0]].sort(() => rnd() - 0.5);
    for (const [dr, dc] of dirs) {
      const rr = r + dr, cc = c + dc;
      if (rr > 0 && rr < n - 1 && cc > 0 && cc < n - 1 && g[rr][cc] === 1) { g[r + dr / 2][c + dc / 2] = 0; carve(rr, cc); }
    }
  };
  carve(1, 1);
  // a few extra openings so chases have loops
  for (let i = 0; i < n; i++) { const r = 1 + 2 * Math.floor(rnd() * ((n - 1) / 2)), c = 2 + 2 * Math.floor(rnd() * ((n - 3) / 2)); if (r < n - 1 && c < n - 1) g[r][c] = 0; }
  return g;
}

/** Breadth-first next step from (r,c) toward target on an open grid; null when unreachable. */
export function nextStepToward(grid, from, to) {
  const n = grid.length, key = (r, c) => r * n + c;
  if (from[0] === to[0] && from[1] === to[1]) return null;
  const prev = new Map([[key(...from), -1]]);
  const q = [from];
  while (q.length) {
    const [r, c] = q.shift();
    for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const rr = r + dr, cc = c + dc;
      if (rr < 0 || cc < 0 || rr >= n || cc >= n || grid[rr][cc] === 1 || prev.has(key(rr, cc))) continue;
      prev.set(key(rr, cc), key(r, c));
      if (rr === to[0] && cc === to[1]) {
        let cur = key(rr, cc), back = prev.get(cur);
        while (back !== key(...from)) { cur = back; back = prev.get(cur); }
        return [Math.floor(cur / n), cur % n];
      }
      q.push([rr, cc]);
    }
  }
  return null;
}
