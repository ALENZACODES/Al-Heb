// Brain Lab: pure logic (no DOM). Short timed drills in the spirit of brain-training apps, built on Aleph's own letters,
// sounds, prayers, numbers and calendar. Every drill adjusts its difficulty as you play (a staircase), scores speed and
// accuracy, and feeds one of five skill scores. Scores compare you with your own past games only: there is no population data.
import { findName } from '../shell/names.js';
/** True when a word holds the four-letter divine name (alone, with a prefix, or inside a maqaf compound). */
export const hasDivineName = (w) => findName(String(w ?? '')).length > 0;

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

export const CLASSIC_GAMES = Object.freeze([
  { id: 'hunt', title: 'Letter Hunt', titleHe: 'צַיַּד אוֹתִיּוֹת', skill: 'attention', pack: 'classic', seconds: SESSION_SECONDS, blurb: 'Tap every copy of the target letter. Look-alikes are hiding in the grid.' },
  { id: 'matrix', title: 'Letter Matrix', titleHe: 'מַטְרִיצָה', skill: 'memory', pack: 'classic', seconds: SESSION_SECONDS, blurb: 'Letters flash on the grid, then hide. Tap every place the target letter was.' },
  { id: 'soundmatch', title: 'Sound Match', titleHe: 'הַתְאָמַת צְלִיל', skill: 'speed', pack: 'classic', seconds: SESSION_SECONDS, blurb: 'Hear a syllable and tap the one you heard, before time runs out.' },
  { id: 'siddurflash', title: 'Siddur Flash', titleHe: 'סִדּוּר בָּזָק', skill: 'speed', pack: 'classic', seconds: SESSION_SECONDS, blurb: 'Prayer words flash one at a time. Tap the moment your word appears.' },
  { id: 'switch', title: 'Rule Switch', titleHe: 'הַחְלָפַת כְּלָל', skill: 'flexibility', pack: 'classic', seconds: SESSION_SECONDS, blurb: 'The question keeps changing: does it have a dot, or is it an end-of-word letter?' },
  { id: 'gematria', title: 'Gematria', titleHe: 'גִּימַטְרִיָּה', skill: 'problem', pack: 'classic', seconds: SESSION_SECONDS, blurb: 'Every letter is a number. Tap letters that add up to the target.' },
  { id: 'countup', title: 'Count Up', titleHe: 'סְפִירָה', skill: 'speed', pack: 'classic', seconds: SESSION_SECONDS, blurb: 'Hebrew number words, shuffled. Tap them from smallest to largest.' },
  { id: 'numberear', title: 'Number Ear', titleHe: 'אֹזֶן לְמִסְפָּרִים', skill: 'attention', pack: 'classic', seconds: SESSION_SECONDS, blurb: 'Hear or read a Hebrew number and tap the matching digits.' },
  { id: 'calendar', title: 'Calendar Puzzle', titleHe: 'חִידַת לוּחַ', skill: 'memory', pack: 'classic', seconds: SESSION_SECONDS, blurb: 'Hebrew months and holy days: which day falls when?' },
  { id: 'pattern', title: 'Letter Pattern', titleHe: 'תַּבְנִית', skill: 'problem', pack: 'classic', seconds: SESSION_SECONDS, blurb: 'Three letters, in order. Tap every word that carries them.' },
]);

/** 75-second Lumosity-style 3D studio games (2026-11-10). */
export const STUDIO_SECONDS = 75;
export const STUDIO_GAMES = Object.freeze([
  { id: 'wordburst', title: 'Word Burst', titleHe: 'פְּרִיצַת מִלָּה', skill: 'attention', pack: 'studio', seconds: STUDIO_SECONDS, blurb: 'Find every copy of the target Hebrew word. The right tile bursts.' },
  { id: 'migration', title: 'Migration Birds', titleHe: 'צִפּוֹרֵי נְדִידָה', skill: 'speed', pack: 'studio', seconds: STUDIO_SECONDS, blurb: 'A flock flies past. Tap the bird with the highest Hebrew number, before they speed up.' },
  { id: 'starsearch', title: 'Star Search', titleHe: 'חִפּוּשׂ כּוֹכָבִים', skill: 'attention', pack: 'studio', seconds: STUDIO_SECONDS, blurb: 'Spot the odd star out: a different letter, vowel or shape.' },
  { id: 'rootforge', title: 'Root Forge', titleHe: 'בִּנְיַן שֹׁרֶשׁ', skill: 'problem', pack: 'studio', seconds: STUDIO_SECONDS, blurb: 'A three-letter root and a meaning. Build the matching word from letter tiles.' },
  { id: 'letterseq', title: 'Letter Sequence', titleHe: 'סֵדֶר הָאוֹתִיּוֹת', skill: 'problem', pack: 'studio', seconds: STUDIO_SECONDS, blurb: 'A pattern in the aleph-bet. Tap the letter that comes next.' },
  { id: 'speedmatch', title: 'Speed Match', titleHe: 'הַתְאָמָה מְהִירָה', skill: 'flexibility', pack: 'studio', seconds: STUDIO_SECONDS, blurb: 'A new letter or syllable appears. Is it the same as the last one? The rule can change.' },
  { id: 'letterspan', title: 'Letter Span', titleHe: 'זִכְרוֹן רֶצֶף', skill: 'memory', pack: 'studio', seconds: STUDIO_SECONDS, blurb: 'Letters flash, then hide. Tap them back in the same order.' },
  { id: 'vowelrain', title: 'Vowel Storm', titleHe: 'סַעֲרַת נִקּוּד', skill: 'speed', pack: 'studio', seconds: STUDIO_SECONDS, blurb: 'Syllables tumble through a 3D sky. Tap every one that carries the target vowel sound.' },
  { id: 'tileturn', title: 'Tile Turn', titleHe: 'סִבּוּב אוֹת', skill: 'flexibility', pack: 'studio', seconds: STUDIO_SECONDS, blurb: 'A letter tile is turned in space. Tap the letter it really is.' },
  { id: 'pathword', title: 'Path Word', titleHe: 'נְתִיב מִלָּה', skill: 'problem', pack: 'studio', seconds: STUDIO_SECONDS, blurb: 'Trace a path through neighbouring tiles to spell a real Hebrew word.' },
  { id: 'echo', title: 'Echo Hunt', titleHe: 'צַיַּד הֵד', skill: 'attention', pack: 'studio', seconds: STUDIO_SECONDS, listening: true, blurb: 'Listen to a recorded Hebrew word and tap the one you heard. With sound off, read its sound instead.' },
]);

/** Six games for the Hebrew a beginner needs in synagogue and in Israel (added 2026-11-10), 45 seconds each. */
export const LIFE_GAMES = Object.freeze([
  // Added 2026-11-10: six games that each teach one thing a beginner needs in synagogue or in Israel.
  { id: 'twins', title: 'Sound Twins', titleHe: 'תְּאוֹמֵי צְלִיל', skill: 'speed', pack: 'life', seconds: SESSION_SECONDS, added: '2026-11-10', teaches: 'Letters that look different but sound the same',
    blurb: 'Letters flash one at a time. Does this one make the same sound as the one before? Watch for twins like ט and תּ.' },
  { id: 'rain', title: 'Vowel Rain', titleHe: 'גֶּשֶׁם תְּנוּעוֹת', skill: 'speed', pack: 'life', seconds: SESSION_SECONDS, added: '2026-11-10', teaches: 'Reading the vowel signs fast',
    blurb: 'Syllables fall from the sky. Tap the vowel sound before each one lands.' },
  { id: 'middle', title: 'Middle Letter', titleHe: 'הָאוֹת בָּאֶמְצַע', skill: 'attention', pack: 'life', seconds: SESSION_SECONDS, added: '2026-11-10', teaches: 'Telling look-alike letters apart in a crowd',
    blurb: 'A row of letters. Name only the one in the middle, even when its neighbours try to trick you.' },
  { id: 'taxi', title: 'Taxi Turns', titleHe: 'יָמִינָה אוֹ שְׂמֹאלָה', skill: 'flexibility', pack: 'life', seconds: SESSION_SECONDS, added: '2026-11-10', teaches: 'Right, left and straight on, for taxis and directions in Israel',
    blurb: 'Tell the driver where to go. Follow the Hebrew word, or the side of the road the sign is on, as the rule changes.' },
  { id: 'cafe', title: 'Café Order', titleHe: 'בֵּית קָפֶה', skill: 'memory', pack: 'life', seconds: SESSION_SECONDS, added: '2026-11-10', teaches: 'Ordering food and drink in Hebrew',
    blurb: 'Noa and Ari order in Hebrew. Remember the order, then bring it from the menu in the same order.' },
  { id: 'chain', title: 'Prayer Chain', titleHe: 'שַׁרְשֶׁרֶת תְּפִלָּה', skill: 'memory', pack: 'life', seconds: SESSION_SECONDS, added: '2026-11-10', teaches: 'The order of the words in the blessings and prayers',
    blurb: 'A blessing starts. Tap its next words in order, the way the congregation says them.' },
]);

export const GAMES = Object.freeze([...CLASSIC_GAMES, ...LIFE_GAMES, ...STUDIO_GAMES]);
/** Today's workout draws from the 45-second games (the classic drills and the synagogue-and-Israel games), so its length stays about three minutes. */
export const WORKOUT_GAMES = Object.freeze([...CLASSIC_GAMES, ...LIFE_GAMES]);
export const GAME_IDS = Object.freeze(GAMES.map((g) => g.id));
export const gameById = (id) => GAMES.find((g) => g.id === id) || null;
/** Studio combo bonus: from three right in a row, 5 points per step of the run (capped at 8 steps) times a level factor. */
export function comboBonus(run, level = 1) {
  if (!Number.isFinite(run) || run < 3) return 0;
  const steps = Math.min(8, run - 2);
  return steps * 5 * (1 + Math.floor(Math.max(1, level) / 4));
}
/** HUD label for a run: empty below three, then ×3, ×4 ... with a flame from eight. */
export const comboLabel = (run) => (run >= 3 ? `${run >= 8 ? '🔥 ' : ''}Combo ×${run}` : '');
/** Session length for one drill; classic games stay at 45 seconds, studio games at 75. */
export function sessionSeconds(gameId) {
  const n = gameById(gameId)?.seconds;
  return Number.isFinite(n) && n > 0 ? n : SESSION_SECONDS;
}
/** A game shows a "New" mark until it has been played once. */
export const isNewGame = (g, state) => !!g?.added && !readState(state).games[g.id];
/**
 * The letter drawn on a game's round token when its picture is not in the app yet (tokens: LAB_v2_<id> in the image index).
 * Real type, so it reads at 56 px and needs no download.
 */
export const GLYPHS = Object.freeze({ hunt: 'צ', matrix: 'מ', soundmatch: 'בָּ', siddurflash: 'שׁ', switch: 'כּ', gematria: 'א', countup: 'ג', numberear: 'ה', calendar: 'ל', pattern: 'כתב',
  twins: 'טת', rain: 'אֻ', middle: 'בכב', taxi: '⇄', cafe: 'קָפֶה', chain: 'בָּרוּךְ',
  wordburst: 'מִלָּה', migration: 'י״ב', starsearch: '★', rootforge: 'שׁרשׁ', letterseq: 'אבג', speedmatch: '=', letterspan: 'אבגד', vowelrain: 'אִ', tileturn: '↻', pathword: 'נתיב', echo: '♪' });

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
  // Today's three stay on the original 45-second set, so the workout length does not jump.
  const order = shuffle(WORKOUT_GAMES, rnd).sort((a, b) => (lastPlayed(a.id) < lastPlayed(b.id) ? -1 : lastPlayed(a.id) > lastPlayed(b.id) ? 1 : 0));
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

// ---------- Helpers for the games added 2026-11-10 (pure, tested) ----------

/** The learner's tradition for sound questions: 'israeli' (default), 'sephardi' or 'ashkenazi'. */
export const normTradition = (v) => (v === 'sephardi' || v === 'ashkenazi' ? v : 'israeli');

/**
 * Stars for a finished game: one for any right answer, two at 75% right, three at 90% right with level 4 or higher reached.
 * Shown on the results card; nothing else depends on them.
 */
export function starsFor(summary) {
  if (!summary?.correct) return 0;
  if (summary.accuracy >= 90 && summary.maxLevel >= 4) return 3;
  return summary.accuracy >= 75 ? 2 : 1;
}

/** Up to `max` distinct items a game showed (by Hebrew text), newest last; for the "Hebrew you met" list on the results card. */
export function uniqueMet(items, max = 8) {
  const seen = new Map();
  for (const it of items || []) if (it?.he) { seen.delete(it.he); seen.set(it.he, it); }
  return [...seen.values()].slice(-max);
}

// Sound Twins ---------------------------------------------------------------------------------------------------------------
/** Same sound in this tradition (cards from data/lab/words.json). */
export const sameSound = (a, b, trad) => !!a && !!b && a.sound?.[normTradition(trad)] === b.sound?.[normTradition(trad)];
/** How far back the comparison reaches: the card before (levels 1 to 6), or the one two before (7 and up). */
export const twinsBack = (level) => (level >= 7 ? 2 : 1);
/**
 * The next card. About half the time it sounds the same as the card `back` places earlier. From level 3 a "same" card is
 * usually a twin (another letter with that sound), from level 4 a "different" card is often the same letter with or
 * without its dot, so the eye cannot win without the sound. Finals join from level 5.
 * @returns {{card:object, same:boolean|null}} same is null while there are not enough cards to compare yet.
 */
export function twinsNext(history, cards, level, trad, rnd = Math.random) {
  const t = normTradition(trad);
  const pool = cards.filter((c) => level >= 5 || !/-final/.test(c.letter));
  const back = twinsBack(level);
  // From level 3, fresh cards are mostly letters that HAVE a twin, so the next comparison can be one.
  const twinned = pool.filter((c) => pool.some((o) => o.id !== c.id && sameSound(o, c, t)));
  const fresh = (list) => { const tw = list.filter((c) => twinned.includes(c)); return level >= 3 && tw.length && rnd() < 0.7 ? tw[randInt(rnd, tw.length)] : list[randInt(rnd, list.length)]; };
  const ref = history.length >= back ? history[history.length - back] : null;
  if (!ref) return { card: fresh(pool), same: null };
  const wantSame = rnd() < 0.5;
  const twins = pool.filter((c) => c.id !== ref.id && sameSound(c, ref, t));
  if (wantSame) {
    const card = level >= 3 && twins.length && rnd() < 0.85 ? twins[randInt(rnd, twins.length)] : (pool.find((c) => c.id === ref.id) || ref);
    return { card, same: true };
  }
  const diff = pool.filter((c) => !sameSound(c, ref, t));
  const near = diff.filter((c) => c.letter === ref.letter);
  const card = level >= 4 && near.length && rnd() < 0.4 ? near[randInt(rnd, near.length)] : fresh(diff);
  return { card, same: false };
}

// Vowel Rain -----------------------------------------------------------------------------------------------------------------
export const VOWEL_KEYS = Object.freeze(['a', 'e', 'i', 'o', 'u']);
/** Drops that can fall at this level in this tradition (a sign that reads as a glide there, such as tzere in Ashkenazi, is left out). */
export const rainPool = (vowels, level, trad) => vowels.filter((v) => v.from <= level && v.sound?.[normTradition(trad)]);
/** Buttons for this tradition: the vowel sounds at least one drop can have. */
export const rainKeys = (vowels, trad) => VOWEL_KEYS.filter((k) => vowels.some((v) => v.sound?.[normTradition(trad)] === k));
/** Fall time in ms: about 4.2 s at level 1 down to 1.6 s at level 12. */
export const rainFallMs = (level) => Math.max(1600, 4400 - level * 235);

// Middle Letter --------------------------------------------------------------------------------------------------------------
/**
 * A row of letters with the target in the middle. From level 2 about half the rows are "tricky": the neighbours are a
 * look-alike of the middle letter (Bet among Kafs). Options: the target plus look-alikes first, then others, shuffled.
 * letters: [{id, he, name, confusableWith, isFinal}]
 */
export function middleTrial(letters, level, rnd = Math.random) {
  const pool = letters.filter((l) => level >= 6 || !l.isFinal);
  const withTwins = pool.filter((l) => l.confusableWith.some((id) => pool.some((p) => p.id === id)));
  const from = level >= 2 && withTwins.length && rnd() < 0.7 ? withTwins : pool;
  const target = from[randInt(rnd, from.length)];
  const twins = target.confusableWith.map((id) => pool.find((l) => l.id === id)).filter(Boolean);
  const tricky = level >= 2 && twins.length > 0 && rnd() < 0.5;
  const side = level <= 5 ? 2 : 3;
  const flank = tricky ? twins[randInt(rnd, twins.length)] : target;
  const row = [...Array(side).fill(flank), target, ...Array(side).fill(flank)];
  const n = level <= 2 ? 2 : level <= 6 ? 3 : 4;
  const others = shuffle(pool.filter((l) => l.id !== target.id && !twins.includes(l)), rnd);
  const opts = [target, ...shuffle(twins, rnd), ...others].slice(0, n);
  return { row, mid: side, target, tricky, options: shuffle(opts, rnd) };
}

// Taxi Turns -----------------------------------------------------------------------------------------------------------------
export const DIRS = Object.freeze(['left', 'straight', 'right']);
/**
 * One instruction. The word says a way to go; the sign stands on the left, middle or right of the road. Rule 'word': go
 * where the word says. Rule 'side': go to the side the sign is on (middle = straight on). Levels 1 to 3 always use the word
 * rule; from level 4 the rule switches more often as the level climbs. Straight on joins at level 3, the longer phrases
 * ("turn right") at level 7. memo keeps the rule between rounds.
 */
export function taxiTrial(dirs, level, rnd = Math.random, memo = {}) {
  const tier = level >= 7 ? 3 : level >= 3 ? 2 : 1;
  const words = dirs.filter((d) => d.tier <= tier);
  const word = words[randInt(rnd, words.length)];
  const sides = tier >= 2 ? DIRS : ['left', 'right'];
  const conflict = rnd() < 0.6;
  const side = conflict ? sides.filter((x) => x !== word.dir)[randInt(rnd, sides.length - 1)] : word.dir;
  let rule = 'word';
  if (level >= 4) { const pSwitch = Math.min(0.55, 0.2 + (level - 4) * 0.05); rule = memo.rule && rnd() > pSwitch ? memo.rule : (rnd() < 0.5 ? 'word' : 'side'); }
  memo.rule = rule;
  return { word, side, rule, answer: rule === 'word' ? word.dir : side, keys: tier >= 2 ? DIRS : ['left', 'right'] };
}

// Café Order -----------------------------------------------------------------------------------------------------------------
/** How many things an order holds: 2 at level 1, one more every second level, 6 at most. */
export const cafeSize = (level) => Math.min(6, 2 + Math.floor((level - 1) / 2));
/**
 * An order and the menu to bring it from. Levels 1 to 4 order from the short everyday words; from level 6 the menu holds
 * look-alike orders (black coffee next to coffee with milk), so the Hebrew has to be read, not guessed.
 */
export function cafeOrder(items, level, rnd = Math.random) {
  const pool = items.filter((x) => level >= 5 || x.tier === 1);
  const k = Math.min(cafeSize(level), pool.length);
  const order = sample(pool, k, rnd);
  const menuSize = Math.min(pool.length, 9, k + 2 + Math.floor(level / 3));
  const firstWord = (x) => x.he.split(' ')[0];
  const near = level >= 6 ? pool.filter((x) => !order.includes(x) && order.some((o) => firstWord(o) === firstWord(x))) : [];
  const rest = shuffle(pool.filter((x) => !order.includes(x) && !near.includes(x)), rnd);
  return { order, menu: shuffle([...order, ...near, ...rest].slice(0, menuSize), rnd) };
}

// Prayer Chain ---------------------------------------------------------------------------------------------------------------
/**
 * Prayers the games leave out. Mourner's Kaddish is said for the dead; it is studied in the reader with its recording, not
 * raced or scored. (A choice made for the games, open to the owner's review: docs/games/BRAIN-LAB.md.)
 */
export const NOT_A_GAME = Object.freeze(new Set(['kaddish-1']));
/** Hebrew text without vowel points or cantillation, for comparing two words. */
export const bare = (w) => String(w).normalize('NFD').replace(/[֑-ׇ]/g, '').replace(/[^א-ת]/g, '');
/**
 * A stretch of a blessing or prayer to rebuild. The first words are given; then the learner picks each next word from a
 * few choices. The four-letter divine name is never a choice and never a target: it is filled in, shown in gold, and the
 * chain carries on past it (the app's divine-name convention, src/shell/names.js). Distractors come from other prayers at
 * low levels and from the same prayer higher up; a distractor never reads the same as the right word.
 * lines: [{id, title, en, words}] (words as lineWords() splits them).
 * @returns {{line, given:string[], steps:{word:string, fixed:boolean, options:string[]}[]}}
 */
export function chainTrial(lines, level, rnd = Math.random) {
  const steps = Math.min(6, 2 + Math.floor(level / 3));
  const fit = lines.filter((l) => l.words.length >= steps + 2);
  const easy = fit.filter((l) => l.words.length <= 16);
  const pool = level <= 3 && easy.length ? easy : fit;
  const line = pool[randInt(rnd, pool.length)];
  const maxStart = Math.max(0, line.words.length - steps - 1);
  const start = level <= 4 ? 0 : randInt(rnd, Math.min(maxStart, 2 + level) + 1);
  const givenCount = level <= 2 ? 2 : 1;
  const given = line.words.slice(start, start + givenCount);
  const targets = line.words.slice(start + givenCount, start + givenCount + steps);
  const n = level <= 2 ? 2 : level <= 5 ? 3 : 4;
  const others = lines.filter((l) => l !== line).flatMap((l) => l.words);
  const sameLine = line.words;
  const used = new Set();
  const out = targets.map((word) => {
    if (hasDivineName(word)) return { word, fixed: true, options: [] };
    const from = level >= 6 ? [...sameLine, ...others] : others;
    const cands = [];
    for (const w of shuffle(from, rnd)) {
      if (cands.length >= n - 1) break;
      const b = bare(w);
      if (!b || b === bare(word) || hasDivineName(w) || cands.some((c) => bare(c) === b) || used.has(b)) continue;
      cands.push(w);
    }
    for (const c of cands) used.add(bare(c));
    return { word, fixed: false, options: shuffle([word, ...cands], rnd) };
  });
  return { line, given, steps: out };
}

/**
 * Recordings of the word-family words (data/lab/words.json familyClips), shared by Letter Pattern and the studio word games.
 * Each row is [wordId, k, id]: k 'w' a word clip and 'l' a line clip the player already knows, 'd' a dictionary file
 * (dict-<id>) whose Ari and Noa rows must be handed to the player (ctx.audio.extend), because games do not load the dictionary list.
 */
export function familyClipRows(list, heById) {
  const clips = new Map(), extra = [];
  for (const row of list || []) {
    const [wid, k, cid] = row || [];
    if (!wid || !cid) continue;
    if (k === 'd') {
      const id = `dict-${cid}`;
      clips.set(wid, { kind: 'word', id });
      for (const v of ['m', 'f']) extra.push({ path: `audio/${v}/israeli/dictionary/${id}.mp3`, voice: v, tradition: 'israeli', kind: 'word', id, text: heById?.get?.(wid) || '', status: 'tts' });
    } else clips.set(wid, { kind: k === 'l' ? 'line' : 'word', id: cid });
  }
  return { clips, extra };
}

const POINTS = /[֑-ֻֽ-׀׃-ׇ]/g; // vowels and cantillation; keeps the dagesh and the shin and sin dots
/**
 * The traditions that say a syllable's consonant the way the Israeli recording does (data/lab/words.json cards, from
 * data/pronunciation/consonants.json). A syllable recording plays only for these, as in Sound Twins: a Sephardi learner
 * never hears an Israeli חַ as if it were theirs.
 */
export function syllableTraditions(he, cards) {
  let base = String(he || '').replace(POINTS, '');
  if (base.length > 1) base = base.replace(/\u05d5\u05bc?$/, ''); // a shuruk or full cholam vav is the vowel, not the consonant
  const card = (cards || []).find((c) => c.he === base);
  if (!card?.sound) return ['israeli'];
  return ['israeli', 'sephardi', 'ashkenazi'].filter((t) => card.sound[t] === card.sound.israeli);
}

/** The syllables a listening question may ask for: those the learner's tradition says the Israeli way (all of them if none). */
export function askableSyllables(all, tradition) {
  const t = normTradition(tradition);
  const ok = (all || []).filter((s) => (s.says || ['israeli']).includes(t));
  return ok.length ? ok : (all || []);
}
