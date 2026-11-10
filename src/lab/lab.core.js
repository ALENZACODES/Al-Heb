// Brain Lab: pure logic (no DOM). Short timed drills in the spirit of brain-training apps, built on Aleph's own letters,
// sounds, prayers, numbers and calendar. Every drill adjusts its difficulty as you play (a staircase), scores speed and
// accuracy, and feeds one of five skill scores. Scores compare you with your own past games only: there is no population data.

export const STORE_KEY = 'lab.v1';
export const SESSION_SECONDS = 45;
export const MAX_LEVEL = 12;

export const SKILLS = Object.freeze([
  { id: 'speed', name: 'Speed', he: 'מְהִירוּת', blurb: 'Reading and hearing Hebrew fast' },
  { id: 'memory', name: 'Memory', he: 'זִכָּרוֹן', blurb: 'Holding letters, places and dates in mind' },
  { id: 'attention', name: 'Attention', he: 'קֶשֶׁב', blurb: 'Picking the right letter or number out of a crowd' },
  { id: 'flexibility', name: 'Flexibility', he: 'גְּמִישׁוּת', blurb: 'Switching rules without slowing down' },
  { id: 'problem', name: 'Problem Solving', he: 'פְּתִירָה', blurb: 'Letter values and letter patterns' },
]);

export const GAMES = Object.freeze([
  { id: 'hunt', title: 'Letter Hunt', titleHe: 'צַיַּד אוֹתִיּוֹת', skill: 'attention', blurb: 'Tap every copy of the target letter. Look-alikes are hiding in the grid.' },
  { id: 'matrix', title: 'Letter Matrix', titleHe: 'מַטְרִיצָה', skill: 'memory', blurb: 'Letters flash on the grid, then hide. Tap every place the target letter was.' },
  { id: 'soundmatch', title: 'Sound Match', titleHe: 'הַתְאָמַת צְלִיל', skill: 'speed', blurb: 'Hear a syllable and tap the one you heard, before time runs out.' },
  { id: 'siddurflash', title: 'Siddur Flash', titleHe: 'סִדּוּר בָּזָק', skill: 'speed', blurb: 'Prayer words flash one at a time. Tap the moment your word appears.' },
  { id: 'switch', title: 'Rule Switch', titleHe: 'הַחְלָפַת כְּלָל', skill: 'flexibility', blurb: 'The question keeps changing: does it have a dot, or is it an end-of-word letter?' },
  { id: 'gematria', title: 'Gematria', titleHe: 'גִּימַטְרִיָּה', skill: 'problem', blurb: 'Every letter is a number. Tap letters that add up to the target.' },
  { id: 'countup', title: 'Count Up', titleHe: 'סְפִירָה', skill: 'speed', blurb: 'Hebrew number words, shuffled. Tap them from smallest to largest.' },
  { id: 'numberear', title: 'Number Ear', titleHe: 'אֹזֶן לְמִסְפָּרִים', skill: 'attention', blurb: 'Hear or read a Hebrew number and tap the matching digits.' },
  { id: 'calendar', title: 'Calendar Puzzle', titleHe: 'חִידַת לוּחַ', skill: 'memory', blurb: 'Hebrew months and holy days: which day falls when?' },
  { id: 'pattern', title: 'Letter Pattern', titleHe: 'תַּבְנִית', skill: 'problem', blurb: 'Three letters, in order. Tap every word that carries them.' },
]);
export const GAME_IDS = Object.freeze(GAMES.map((g) => g.id));
export const gameById = (id) => GAMES.find((g) => g.id === id) || null;

/** Small seeded generator (mulberry32) so a day's workout and test runs are repeatable. */
export function seeded(seed) {
  let a = typeof seed === 'number' ? seed >>> 0 : hash(String(seed));
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
export const randInt = (rnd, n) => Math.floor(rnd() * n);
export function shuffle(arr, rnd = Math.random) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = randInt(rnd, i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
export function sample(arr, n, rnd = Math.random) { return shuffle(arr, rnd).slice(0, Math.max(0, n)); }

/** Local day key YYYY-MM-DD. */
export function dayKey(d = new Date()) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }

/**
 * Today's workout: three games from three different skills, the same all day, a different mix tomorrow.
 * A game played least recently is preferred, so every drill comes round.
 */
export function dailyWorkout(day, state = emptyState()) {
  const rnd = seeded('workout:' + day);
  const lastPlayed = (id) => state.games[id]?.history?.at(-1)?.d || '';
  const order = shuffle(GAMES, rnd).sort((a, b) => (lastPlayed(a.id) < lastPlayed(b.id) ? -1 : lastPlayed(a.id) > lastPlayed(b.id) ? 1 : 0));
  const out = [], used = new Set();
  for (const g of order) { if (used.has(g.skill)) continue; out.push(g.id); used.add(g.skill); if (out.length === 3) break; }
  return out;
}

/**
 * Staircase: two right in a row moves up a level, a miss moves down one. Levels run 1..MAX_LEVEL.
 * @returns {{level:number, streak:number}}
 */
export function step({ level, streak }, ok) {
  if (ok) { const s = streak + 1; return s >= 2 ? { level: Math.min(MAX_LEVEL, level + 1), streak: 0 } : { level, streak: s }; }
  return { level: Math.max(1, level - 1), streak: 0 };
}

/** Points for one trial: 10 per level when right, plus up to 10 for speed against the trial's par time. Misses score 0. */
export function trialPoints(ok, level, ms, parMs) {
  if (!ok) return 0;
  const speed = parMs > 0 && Number.isFinite(ms) ? Math.max(0, Math.min(10, Math.round(10 * (1 - ms / (2 * parMs)) + 5))) : 0;
  return 10 * level + speed;
}

/** Where a new session starts: one below the highest level reached last time, never below 1. */
export function startLevel(gameState) { return Math.max(1, Math.min(MAX_LEVEL, (gameState?.lastMax || 1) - 1)); }

/** Summary of a finished session from its trials [{ok, ms, level, pts}]. */
export function summarize(trials) {
  const n = trials.length, right = trials.filter((t) => t.ok);
  const score = trials.reduce((a, t) => a + (t.pts || 0), 0);
  const rts = right.map((t) => t.ms).filter(Number.isFinite);
  return {
    score, trials: n, correct: right.length,
    accuracy: n ? Math.round((100 * right.length) / n) : 0,
    maxLevel: trials.reduce((a, t) => Math.max(a, t.level || 1), 1),
    avgMs: rts.length ? Math.round(rts.reduce((a, b) => a + b, 0) / rts.length) : null,
  };
}

export function emptyState() { return { games: {}, workouts: {} }; }
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const num = (v, d) => (Number.isFinite(v) ? v : d);
/**
 * Defensive read of the stored record. Every game record comes back with a history array and numbers for best, plays and
 * lastMax, and every workout day with a done array, so a partial, older or hand-edited record cannot break the Brain Lab page
 * (a game record without its history used to stop the whole page from drawing).
 */
export function readState(raw) {
  const s = isObj(raw) ? raw : {};
  const games = {};
  for (const [id, g] of Object.entries(isObj(s.games) ? s.games : {})) {
    if (!isObj(g)) continue;
    const history = Array.isArray(g.history) ? g.history.filter(isObj) : [];
    games[id] = { ...g, best: num(g.best, 0), plays: num(g.plays, history.length), lastMax: num(g.lastMax, 1), history };
  }
  const workouts = {};
  for (const [day, w] of Object.entries(isObj(s.workouts) ? s.workouts : {})) workouts[day] = { ...(isObj(w) ? w : {}), done: Array.isArray(w?.done) ? w.done.filter((x) => typeof x === 'string') : [] };
  return { games, workouts };
}

/** Pure: state after a finished session. Keeps the last 30 sessions per game. */
export function recordSession(state, gameId, summary, day) {
  const st = readState(state);
  const prev = st.games[gameId] || { best: 0, plays: 0, lastMax: 1, history: [] };
  const history = [...(prev.history || []), { d: day, s: summary.score, a: summary.accuracy, l: summary.maxLevel, ms: summary.avgMs }].slice(-30);
  const games = { ...st.games, [gameId]: { best: Math.max(prev.best || 0, summary.score), plays: (prev.plays || 0) + 1, lastMax: summary.maxLevel, history } };
  const w = st.workouts[day] || { done: [] };
  const workouts = { ...st.workouts, [day]: { done: [...new Set([...(w.done || []), gameId])] } };
  // keep two weeks of workout days
  const keep = Object.keys(workouts).sort().slice(-14);
  return { games, workouts: Object.fromEntries(keep.map((k) => [k, workouts[k]])) };
}

/** How many of today's three are done. */
export function workoutProgress(state, day, plan = dailyWorkout(day, state)) {
  const done = new Set(readState(state).workouts[day]?.done || []);
  return { plan, done: plan.filter((id) => done.has(id)), complete: plan.every((id) => done.has(id)) };
}

/** Days in a row (ending today or yesterday) on which the whole workout was finished. */
export function workoutStreak(state, today, planFor = (d) => dailyWorkout(d, state)) {
  const ws = readState(state).workouts;
  const full = (d) => { const done = new Set(ws[d]?.done || []); return planFor(d).every((id) => done.has(id)) || (ws[d]?.done || []).length >= 3; };
  const prevDay = (d) => { const [y, m, dd] = d.split('-').map(Number); return dayKey(new Date(y, m - 1, dd - 1)); };
  let d = full(today) ? today : prevDay(today), n = 0;
  while (ws[d] && full(d)) { n++; d = prevDay(d); }
  return n;
}

/**
 * Skill score for one skill: the average of each of its games' recent form (mean of the last five sessions), scaled so
 * a first game sits near 100. It moves up as you get faster and reach higher levels. Null until a game of that skill is played.
 */
export function skillScore(state, skillId) {
  const st = readState(state);
  const vals = GAMES.filter((g) => g.skill === skillId).map((g) => {
    const h = st.games[g.id]?.history || [];
    if (!h.length) return null;
    const recent = h.slice(-5);
    return recent.reduce((a, x) => a + (x.s || 0), 0) / recent.length;
  }).filter((v) => v != null);
  if (!vals.length) return null;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

/** Overall Aleph brain score: mean of the skill scores played so far. */
export function overallScore(state) {
  const s = SKILLS.map((k) => skillScore(state, k.id)).filter((v) => v != null);
  return s.length ? Math.round(s.reduce((a, b) => a + b, 0) / s.length) : null;
}

/** One line comparing this session with the one before it (or a first-game line). */
export function comparison(prevHistory, summary) {
  const prev = (prevHistory || []).at(-1);
  if (!prev) return 'First game played. Your next score will be compared with this one.';
  const diff = summary.score - (prev.s || 0);
  if (diff > 0) return `${diff} points more than last time.`;
  if (diff < 0) return `${-diff} points fewer than last time. Short games swing; keep going.`;
  return 'The same score as last time.';
}

// ---------- Game helpers (pure, tested) ----------

/** Hebrew final forms to their regular letters, for letter-pattern matching. */
const FINALS = { 'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ' };
/** Consonants only (no vowel marks, no dagesh, no punctuation), finals folded to regular forms. */
export function consonants(he) { return [...String(he).normalize('NFD').replace(/[֑-ׇ]/g, '')].filter((c) => /[א-ת]/.test(c)).map((c) => FINALS[c] || c).join(''); }
/** Does `word` contain the root letters in this order (not necessarily side by side)? */
export function hasPattern(word, rootLetters) {
  const w = consonants(word), r = consonants(rootLetters);
  let i = 0; for (const c of w) if (c === r[i]) i++;
  return r.length > 0 && i === r.length;
}

/**
 * Gematria puzzle for a level: a target number and a set of letter tiles that holds at least one way to make it.
 * letters: [{he, gematria}] (no finals). Higher levels use bigger numbers and need more letters.
 */
export function gematriaPuzzle(letters, level, rnd = Math.random) {
  const base = letters.filter((l) => !/-final$/.test(l.id || '') && l.gematria > 0);
  const maxVal = level <= 2 ? 10 : level <= 4 ? 50 : level <= 7 ? 100 : 400;
  const parts = level <= 2 ? 2 : level <= 7 ? (rnd() < 0.5 ? 2 : 3) : 3;
  const pool = base.filter((l) => l.gematria <= maxVal);
  const pick = sample(pool, parts, rnd);
  const target = pick.reduce((a, l) => a + l.gematria, 0);
  const extra = Math.min(pool.length - parts, 3 + Math.min(5, level));
  const others = sample(pool.filter((l) => !pick.includes(l)), extra, rnd);
  return { target, tiles: shuffle([...pick, ...others], rnd), solution: pick };
}

/** Choices for a multiple-choice trial: the answer plus `n - 1` distinct distractors, shuffled. */
export function choices(answer, pool, n, rnd = Math.random, same = (a, b) => a === b) {
  const others = sample(pool.filter((x) => !same(x, answer)), n - 1, rnd);
  return shuffle([answer, ...others], rnd);
}

/** Split a pointed Hebrew line into display words (maqaf-joined words stay together; trailing marks dropped). */
export function lineWords(he) {
  return String(he).replace(/[׃.,;:!?]/g, '').split(/\s+/).map((w) => w.trim()).filter(Boolean);
}
