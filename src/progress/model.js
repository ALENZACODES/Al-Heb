// @ts-check
// Aleph Progress: pure computations over a store snapshot. No DOM, no fetch, no clock (callers pass `now`).
// Everything here is derived from data other lanes already write; nothing is estimated that was not measured.
import { BASE_LETTER_IDS, FINAL_LETTER_IDS, MARK_IDS } from '../corpus/normalize.js';
import { projectStreak } from '../curriculum/streak.js';
import { timedReadGate } from '../timedread/gate.js';
import { cleanState as cleanTimedReads, median, cleanWpm, accuracy as readAccuracy } from '../timedread/model.js';
import { coverage as siddurCoverageOf, FOLLOW_IDS, ORDER_IDS } from '../service/model.js';
import { unpointedScore } from '../firstday/model.js';
import { gradeLines, gradeWords, knownSet, entriesDecodable, wordsDecodable, unlockers, missingIn } from './decode.js';

export const ALL_LETTERS = [...BASE_LETTER_IDS, ...FINAL_LETTER_IDS];
export const ALL_SIGNS = MARK_IDS;
const DAY = 86400000;
/** Checkpoint pass ratio. Kept equal to src/curriculum/checkpoint.js PASS_RATIO (a test asserts it). */
export const PASS_RATIO = 0.8;

// ---------- snapshot -----------------------------------------------------------------------------------------

export const KEYS = Object.freeze({
  completed: 'curriculum.progress', cards: 'srs.cards', vocab: 'srs.vocab', streak: 'streak', traced: 'letters.progress',
  pairs: 'curriculum.pairs', checkpoints: 'curriculum.checkpoints', loanwords: 'curriculum.loanwords', ladder: 'curriculum.ladder',
  misses: 'pron.misses', state: 'progress.state',
  timedRead: 'timedread.v1', servicePrefs: 'service.prefs', firstday: 'firstday.progress', firstdayLadder: 'firstday.ladder',
  speak: 'speak.v1', placement: 'placement.v1', milestones: 'progress.milestones.v1',
  loops: 'loops.v1',
});

const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
function cardMap(v) { // srs.vocab may be a map or (older) an array of cards
  if (Array.isArray(v)) return Object.fromEntries(v.filter((x) => x && x.id).map((x) => [x.id, x]));
  return obj(v);
}

/** Read everything Progress needs from a store (sync get/set). Missing or corrupt values become empty. @param {{get:Function}} store */
export function readSnapshot(store) {
  const g = (k, f) => { try { const v = store.get(k, f); return v == null ? f : v; } catch { return f; } };
  const state = obj(g(KEYS.state, {}));
  return {
    completed: obj(obj(g(KEYS.completed, {})).completed),
    cards: cardMap(g(KEYS.cards, {})),
    vocab: cardMap(g(KEYS.vocab, {})),
    streak: obj(g(KEYS.streak, {})),
    traced: obj(g(KEYS.traced, {})),
    pairs: obj(g(KEYS.pairs, {})),
    checkpoints: obj(g(KEYS.checkpoints, {})),
    loanwords: obj(g(KEYS.loanwords, {})),
    ladder: obj(g(KEYS.ladder, {})),
    misses: Array.isArray(g(KEYS.misses, [])) ? g(KEYS.misses, []) : [],
    timedRead: g(KEYS.timedRead, null), // raw 'timedread.v1'; the timed-read lane cleans it (cleanState) wherever it is read
    servicePrefs: obj(g(KEYS.servicePrefs, {})),
    speak: g(KEYS.speak, null), // raw 'speak.v1'; src/speak/model.js coerceState cleans it where it is read
    placement: obj(g(KEYS.placement, {})), // {v, at, answers:[{id, correct, picked}], result}
    milestonesStore: obj(g(KEYS.milestones, {})), // {v:1, achieved:{id:{at, day, basis}}}; cleaned by milestones.js
    firstday: obj(g(KEYS.firstday, {})), // {step, readWords[], checkCorrect, done} written by the first-day lane
    firstdayLadder: obj(g(KEYS.firstdayLadder, {})), // {n, answers:{n:boolean}, hinted:{n:true}} written by the first-day ladder
    rest: Array.isArray(state.rest) ? state.rest.filter((d) => typeof d === 'string') : [],
    goal: state.goal && typeof state.goal === 'object' ? state.goal : null,
  };
}

/** @typedef {ReturnType<typeof readSnapshot>} Snapshot */

// ---------- days, streak, goal -------------------------------------------------------------------------------

/** Local calendar day key "YYYY-MM-DD". @param {number|Date} t */
export function dayKey(t) {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const dayNum = (key) => { const [y, m, d] = key.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / DAY); };
const keyOfNum = (n) => new Date(n * DAY).toISOString().slice(0, 10);
/** @param {string} key @param {number} delta days */
export const addDays = (key, delta) => keyOfNum(dayNum(key) + delta);

/**
 * Days on which the learner did something, rebuilt from timestamps already in the store (lesson completions, last card
 * reviews, tracing, checkpoints, loanword marks, ladder, pronunciation practice) plus lane 1's streak record.
 * Card stores keep only each card's LAST review, so older days are only known through the streak record: a limitation.
 * @param {Snapshot} s @returns {Set<string>}
 */
export function activityDays(s) {
  const days = new Set();
  const add = (t) => { const n = typeof t === 'string' ? Date.parse(t) : Number(t); if (Number.isFinite(n) && n > 0) days.add(dayKey(n)); };
  for (const t of Object.values(s.completed)) add(t);
  for (const c of [...Object.values(s.cards), ...Object.values(s.vocab)]) if (c && c.lastReview) add(c.lastReview);
  for (const r of Object.values(s.traced)) for (const e of Object.values(obj(r))) add(e && e.last);
  for (const c of Object.values(s.checkpoints)) add(c && c.at);
  for (const c of Object.values(s.loanwords)) add(c && c.at);
  add(s.ladder && s.ladder.at);
  for (const m of s.misses) add(m && m.ts);
  const st = s.streak;
  if (st && typeof st.last === 'string' && /^\d{4}-\d\d-\d\d$/.test(st.last)) {
    const n = Math.max(1, Math.min(Number(st.count) || 1, 400));
    for (let i = 0; i < n; i++) days.add(addDays(st.last, -i));
  }
  return days;
}

/**
 * Streak that rest days do not break. Counts days with activity, walking back from today. A rest day neither adds to the
 * count nor ends it. An empty today does not end it either (the day is not over). Two empty days in a row (not rest) end it.
 * @param {Snapshot} s @param {number|Date} now
 * @returns {{count:number, best:number, activeToday:boolean, restToday:boolean}}
 */
export function streakInfo(s, now) {
  // v2 records belong to the engaged-time engine: one shared projection, the same one Home uses (src/curriculum/streak.js)
  if (s.streak && s.streak.v === 2) { const p = projectStreak(s.streak, now, s.rest); return { count: p.count, best: p.best, activeToday: p.activeToday, restToday: p.restToday }; }
  const act = activityDays(s), rest = new Set(s.rest);
  const today = dayKey(now);
  const activeToday = act.has(today), restToday = rest.has(today);
  let count = 0, cur = activeToday || restToday ? today : addDays(today, -1);
  if (!activeToday && !restToday && !act.has(cur) && !rest.has(cur)) return { count: 0, best: bestRun(act, rest, s), activeToday, restToday };
  for (let guard = 0; guard < 4000; guard++) {
    if (act.has(cur)) count++;
    else if (!rest.has(cur)) break;
    cur = addDays(cur, -1);
  }
  return { count, best: Math.max(count, bestRun(act, rest, s)), activeToday, restToday };
}
function bestRun(act, rest, s) {
  const all = [...act, ...rest].map(dayNum).sort((a, b) => a - b);
  let best = 0, run = 0, prev = null;
  for (const n of all) {
    const isAct = act.has(keyOfNum(n));
    if (prev !== null && n - prev > 1) run = 0;
    if (isAct) run++;
    best = Math.max(best, run); prev = n;
  }
  return Math.max(best, Number(s.streak && s.streak.best) || 0);
}

/**
 * Gentle daily goal in CARDS (distinct cards reviewed today). A lesson completed today also meets it.
 * There is no minutes goal: the app does not time sessions, and a guessed number would be invented.
 * @param {Snapshot} s @param {number|Date} now @param {{kind:string,target:number}} [dflt]
 */
export function goalInfo(s, now, dflt = { kind: 'cards', target: 10 }) {
  const today = dayKey(now);
  const target = s.goal && Number.isInteger(s.goal.target) && s.goal.target > 0 ? s.goal.target : dflt.target;
  const reviewed = new Set();
  for (const [id, c] of [...Object.entries(s.cards), ...Object.entries(s.vocab)]) if (c && c.lastReview && dayKey(c.lastReview) === today) reviewed.add(id);
  const lessonsToday = Object.values(s.completed).filter((t) => dayKey(Number(t)) === today).length;
  const cards = reviewed.size;
  return { kind: 'cards', target, cards, lessonsToday, met: cards >= target || lessonsToday > 0 };
}

/** New persisted state after toggling a rest day. Pure. @param {Snapshot} s @param {string} key @param {boolean} on */
export function withRestDay(s, key, on) {
  const rest = new Set(s.rest);
  if (on) rest.add(key); else rest.delete(key);
  return { rest: [...rest].sort().slice(-90), goal: s.goal };
}
/** @param {Snapshot} s @param {number} target */
export function withGoal(s, target) { return { rest: s.rest.slice(-90), goal: { kind: 'cards', target } }; }

// ---------- knowledge: letters, signs, lessons ---------------------------------------------------------------

/** Letters and signs the lessons have taught (completed lessons only). @param {Snapshot} s @param {Array<{id:string,letters:string[],vowels:string[]}>} lessons */
export function taughtBy(s, lessons) {
  const letters = new Set(), signs = new Set();
  for (const l of lessons) if (s.completed[l.id]) { l.letters.forEach((x) => letters.add(x)); l.vowels.forEach((x) => signs.add(x)); }
  return { letters, signs };
}

/** Letter ids with at least one finished tracing (either script). @param {Snapshot} s */
export function tracedLetters(s) {
  return new Set(Object.entries(s.traced).filter(([, r]) => Object.values(obj(r)).some((e) => e && e.completions > 0)).map(([id]) => id));
}

/** Letters the learner "knows" = taught by a completed lesson OR traced. Signs come from lessons only. */
export function knowledge(s, lessons) {
  const t = taughtBy(s, lessons), tr = tracedLetters(s);
  const letters = new Set([...t.letters, ...tr].filter((x) => ALL_LETTERS.includes(x)));
  return { letters, signs: t.signs, tracedOnly: [...tr].filter((x) => !t.letters.has(x)), taughtLetters: t.letters, traced: tr };
}

/** @param {Snapshot} s @param {Array<{id:string,track:string}>} lessons */
export function lessonCounts(s, lessons) {
  const per = (track) => { const all = lessons.filter((l) => l.track === track); return { done: all.filter((l) => s.completed[l.id]).length, total: all.length }; };
  return { read: per('read'), israel: per('israel') };
}

// ---------- SRS, vocab, Spot It, checkpoints -----------------------------------------------------------------

/**
 * Card maturity. new = never reviewed; mature = in review with stability >= matureDays (Anki's "21 days" convention);
 * everything else is learning. @param {Record<string,any>} cards
 */
export function srsMaturity(cards, matureDays = 21) {
  const out = { new: 0, learning: 0, mature: 0, total: 0, lapses: 0 };
  for (const c of Object.values(cards)) {
    if (!c) continue;
    out.total++; out.lapses += Number(c.lapses) || 0;
    if (c.state === 'new' || !c.reps) out.new++;
    else if (c.state === 'review' && c.stability >= matureDays) out.mature++;
    else out.learning++;
  }
  return out;
}

export const VOCAB_BANDS = [500, 1000, 2000, 5000];
/** Vocabulary cards per tier band. "Working in" = highest band with at least `startedMin` cards that were reviewed at least once. */
export function vocabBands(vocab, { startedMin = 10, matureDays = 21 } = {}) {
  const bands = VOCAB_BANDS.map((band) => ({ band, added: 0, started: 0, mature: 0 }));
  for (const c of Object.values(vocab)) {
    const b = bands.find((x) => x.band === c?.tier);
    if (!b) continue;
    b.added++;
    if (c.reps > 0) b.started++;
    if (c.state === 'review' && c.stability >= matureDays) b.mature++;
  }
  const reached = bands.filter((b) => b.started >= startedMin).map((b) => b.band).pop() ?? null;
  return { bands, reached, started: bands.reduce((n, b) => n + b.started, 0), added: bands.reduce((n, b) => n + b.added, 0) };
}

/**
 * Spot It across all letter pairs. Each stored pair has trials (rounds in which that decoy was present) and errors (wrong taps).
 * Several errors can fall in one round, so 1 - errors/trials is a LOWER bound on the share of clean rounds.
 */
export function spotItStats(pairs) {
  let trials = 0, errors = 0;
  for (const p of Object.values(pairs)) { trials += Number(p?.trials) || 0; errors += Number(p?.errors) || 0; }
  return { trials, errors, cleanAtLeast: trials ? Math.max(0, 1 - Math.min(errors, trials) / trials) : null };
}

/** Checkpoint stages passed (ratio >= PASS_RATIO). Stage n = checkpoint taken once n x 9 letters were taught. */
export function checkpointStats(cp) {
  const passed = [], tried = [];
  for (const [stage, r] of Object.entries(cp)) {
    const n = Number(stage); if (!r || !(r.total > 0) || !Number.isFinite(n)) continue;
    tried.push(n); if (r.right / r.total >= PASS_RATIO) passed.push(n);
  }
  return { passed: passed.sort((a, b) => a - b), tried: tried.sort((a, b) => a - b), best: passed.length ? Math.max(...passed) : 0 };
}

// ---------- decodability summary -----------------------------------------------------------------------------

/** @param {Snapshot} s @param {{lessons:any[], registry:any[], phrases:any[], gates:any}} d */
export function readableNow(s, d) {
  const k = knowledge(s, d.lessons);
  const nameKnown = !!s.completed[d.gates.nameLesson];
  const known = knownSet([...k.letters], [...k.signs], nameKnown);
  const lines = gradeLines(d.registry, known);
  const words = gradeWords(lines, known);
  const phrases = (d.phrases || []).map((p) => ({ id: p.id, he: p.he, en: p.en, missing: [...new Set(String(p.he).split(/[\s־]+/).flatMap((w) => missingIn(w, known)))].sort() }));
  const phraseFull = phrases.filter((p) => p.missing.length === 0 && p.he);
  const phraseAlmost = phrases.filter((p) => p.missing.length === 1);
  return {
    known, lines,
    linesFull: lines.filter((l) => l.status === 'full'), linesAlmost: lines.filter((l) => l.status === 'almost'),
    words, unlockers: unlockers(lines), phraseFull, phraseAlmost, phraseTotal: phrases.length,
    entriesFull: d.registry.filter((e) => entriesDecodable(d.registry, [e.id], known)).map((e) => e.id),
  };
}

/** Which lesson first teaches a letter or sign (null if none; the Name is taught in `nameLesson`). */
export function teacherLesson(id, lessons, nameLesson) {
  if (id === '@name') return nameLesson;
  return lessons.find((l) => l.track === 'read' && (l.letters.includes(id) || l.vowels.includes(id)))?.id ?? null;
}

// ---------- gates, belts, milestones -------------------------------------------------------------------------

/** "r10-r19" -> ids; null -> []. */
export function expandRange(range) {
  const m = /^([a-z]+)(\d+)-([a-z]+)(\d+)$/.exec(String(range ?? ''));
  if (!m || m[1] !== m[3]) return [];
  const w = m[2].length, out = [];
  for (let i = Number(m[2]); i <= Number(m[4]); i++) out.push(m[1] + String(i).padStart(w, '0'));
  return out;
}

/**
 * Evaluate one gate/milestone. Returns {done, have, need, measurable}. `ctx` = {s, lessons, know, read, registry, cp, spot, srs, vocab, loan}.
 * @param {any} g @param {any} c
 */
export function evaluate(g, c) {
  const num = (have, need) => ({ done: have >= need, have: Math.min(have, need), need, measurable: true });
  switch (g.kind) {
    case 'letters': return g.ids ? num(g.ids.filter((i) => c.know.letters.has(i)).length, g.ids.length) : num(c.know.letters.size, g.count);
    case 'signs': return g.ids ? num(g.ids.filter((i) => c.know.signs.has(i)).length, g.ids.length) : num(c.know.signs.size, g.count);
    case 'decode': { const n = g.entries.filter((e) => entriesDecodable(c.registry, [e], c.read.known)).length; return num(n, g.entries.length); }
    case 'decodeWords': { const n = g.words.filter((w) => wordsDecodable([w], c.read.known)).length; return num(n, g.words.length); }
    case 'checkpoint': return num(c.cp.passed.includes(g.stage) ? 1 : 0, 1);
    case 'lessonsThrough': {
      const ids = c.lessons.filter((l) => l.track === g.track).map((l) => l.id);
      const upto = ids.slice(0, ids.indexOf(g.through) + 1);
      return num(upto.filter((i) => c.s.completed[i]).length, upto.length);
    }
    case 'lessonRange': return num(g.ids.filter((i) => c.s.completed[i]).length, g.ids.length);
    case 'srsMature': return num(c.srs.mature + c.vocab.bands.reduce((n, b) => n + b.mature, 0), g.count);
    case 'spotit': {
      const sp = c.spot; const enough = sp.trials >= (c.settings.spotItMinTrials ?? 10);
      const ok = enough && sp.cleanAtLeast >= g.accuracy;
      return { done: ok, have: enough ? Math.round(sp.cleanAtLeast * 100) : 0, need: Math.round(g.accuracy * 100), measurable: true, note: enough ? null : `needs ${c.settings.spotItMinTrials ?? 10} Spot It rounds first` };
    }
    case 'loanwords': return num(Object.values(c.s.loanwords).filter((x) => x && x.knew).length, g.count);
    case 'vocabBand': return num(c.vocab.bands.find((b) => b.band === g.band)?.started ?? 0, g.started);
    case 'phrases': return num(c.read.phraseFull.length, g.count);
    case 'timedRead': return timedReadGate(g, c.timedRead); // self-reported reads under 'timedread.v1'; one text, never mixed
    case 'unmeasured': return { done: false, have: 0, need: 1, measurable: false };
    default: return { done: false, have: 0, need: 1, measurable: false };
  }
}

/** Build the shared evaluation context once. @param {Snapshot} s @param {any} d */
export function makeContext(s, d, now = Date.now()) {
  const settings = d.milestones.settings;
  return {
    s, lessons: d.lessons, registry: d.registry, settings,
    know: knowledge(s, d.lessons), read: readableNow(s, d),
    cp: checkpointStats(s.checkpoints), spot: spotItStats(s.pairs),
    srs: srsMaturity(s.cards, settings.matureStabilityDays),
    vocab: vocabBands(s.vocab, { startedMin: settings.vocabBandStartedMin, matureDays: settings.matureStabilityDays }),
    timedRead: s.timedRead ?? null,
    now,
  };
}

// ---------- timed reads (self-reported) ----------------------------------------------------------------------

/**
 * Summary of the learner's stored timed reads: how many, how many texts, and the median clean wpm / accuracy of the
 * text with the most reads (last `window` reads of that one text; texts are never mixed). Self-reported numbers.
 * @param {any} raw value of 'timedread.v1' @returns {{reads:number, texts:number, best:null|{textId:string, reads:number, medianWpm:number, medianAccuracy:number}}}
 */
export function timedReadSummary(raw, window = 5) {
  const reads = cleanTimedReads(raw).reads;
  const by = new Map();
  for (const r of reads) (by.get(r.textId) || by.set(r.textId, []).get(r.textId)).push(r);
  let best = null;
  for (const [textId, rs] of by) {
    if (best && rs.length <= best.reads) continue;
    const last = rs.slice(-window);
    best = { textId, reads: rs.length, medianWpm: Math.round(/** @type {number} */ (median(last.map(cleanWpm)))), medianAccuracy: /** @type {number} */ (median(last.map(readAccuracy))) };
  }
  return { reads: reads.length, texts: by.size, best };
}

// ---------- siddur coverage (service lane) -------------------------------------------------------------------

/** The service the learner follows: their saved choice on the Service screen, else Shabbat morning (the Service screen's own default). */
export function preferredService(s) {
  const o = s.servicePrefs && s.servicePrefs.order;
  return FOLLOW_IDS.includes(o) ? o : 'shabbat-morning';
}

/**
 * Siddur coverage for one service, computed by the service lane's coverage() over Progress's graded lines.
 * Returns null when the orders file is absent. pct is rounded down (never claims more than is true).
 * @param {Snapshot} s @param {{orders?:any}} d @param {{read:{lines:any[], known:Set<string>}}} c @param {string} [orderId]
 */
export function siddurCoverage(s, d, c, orderId = preferredService(s)) {
  const order = d.orders && d.orders.orders ? d.orders.orders[orderId] : null;
  if (!order) return null;
  const cv = siddurCoverageOf(order, c.read.lines, c.read.known);
  return { orderId, title: order.title, pct: cv.pct, full: cv.full, lines: cv.lines, almost: cv.almost, wordsPct: cv.wordsPct, textsFull: cv.textsFull, texts: cv.texts, gaps: cv.gaps };
}

/** Coverage for every service that has an order, in ORDER_IDS order. */
export function siddurCoverageAll(s, d, c) {
  return ORDER_IDS.map((id) => siddurCoverage(s, d, c, id)).filter((x) => x !== null);
}

/** Path for one goal: milestones in order with done / current ("next") / later. */
export function evaluatePath(goalKey, d, c) {
  const path = d.milestones.paths[goalKey];
  if (!path) return null;
  let nextSeen = false;
  const items = path.milestones.map((m) => {
    const r = evaluate(m, c);
    const status = r.done ? 'done' : !nextSeen ? (nextSeen = true, 'next') : 'later';
    return { id: m.id, label: m.label, href: m.href, ...r, status };
  });
  return { goal: goalKey, title: path.title, items, done: items.filter((i) => i.done).length, total: items.length };
}

/** Belts with Aleph-specific gates. state: earned | ready (only unmeasurable gates left) | current | later. */
export function evaluateBelts(d, c) {
  let currentSeen = false;
  return d.belts.belts.map((b) => {
    const ids = expandRange(b.lessons);
    const gates = [];
    if (ids.length) { const r = evaluate({ kind: 'lessonRange', ids }, c); gates.push({ label: `Lessons ${b.lessons}`, kind: 'lessonRange', ...r }); }
    for (const g of d.gates.gates[b.id] || []) gates.push({ label: g.label, kind: g.kind, ...evaluate(g, c) });
    const measurable = gates.filter((g) => g.measurable), unmeasured = gates.filter((g) => !g.measurable);
    const allMet = measurable.length > 0 && measurable.every((g) => g.done);
    const state = allMet && unmeasured.length === 0 ? 'earned' : allMet ? 'ready' : !currentSeen ? 'current' : 'later';
    if (state === 'current' || state === 'ready') currentSeen = true;
    return { id: b.id, name: b.name, gate: b.gate, speedNote: b.wpmTarget ? 'Speed target not measured here' : null, gates, state, metCount: measurable.filter((g) => g.done).length, measurableCount: measurable.length };
  });
}

// ---------- weak spots ---------------------------------------------------------------------------------------

/**
 * Confusable pairs and signs the learner misses most. Sources: Spot It pair log (curriculum.pairs), SRS lapses on letter
 * and vowel cards, and pronunciation practice misses (pron.misses). Returns rows best-first with a link target.
 * `has(name)` says whether a route exists in this build (ctx.hasRoute); links fall back to Learn review.
 * @param {Snapshot} s @param {{max?:number, has?:(name:string)=>boolean}} [o]
 */
export function weakSpots(s, { max = 6, has = () => true } = {}) {
  const lapsesOf = (id) => Number(s.cards[id]?.lapses) || 0;
  const go = (name, href) => (has(name) ? href : '#/learn?review=1');
  /** @type {Array<{key:string,kind:string,label:string,detail:string,score:number,href:string,ids:string[]}>} */
  const rows = [];
  const usedLetters = new Set();
  for (const [key, p] of Object.entries(s.pairs)) {
    const errors = Number(p?.errors) || 0, trials = Number(p?.trials) || 0;
    const [a, b] = key.split('|');
    if (!a || !b || errors < 1) continue;
    const lap = lapsesOf('letter:' + a) + lapsesOf('letter:' + b);
    usedLetters.add(a); usedLetters.add(b);
    rows.push({ key: 'pair:' + key, kind: 'pair', label: `${niceId(a)} or ${niceId(b)}`, detail: `Mixed up ${errors} time${errors === 1 ? '' : 's'} in ${trials} Spot It round${trials === 1 ? '' : 's'}${lap ? `; ${lap} review slip${lap === 1 ? '' : 's'}` : ''}`, score: errors + lap, href: go('spotit', `#/spotit/${encodeURIComponent(a)}`), ids: [a, b] });
  }
  for (const [id, c] of Object.entries(s.cards)) {
    const lap = Number(c?.lapses) || 0;
    if (lap < 1) continue;
    const m = /^(letter|vowel):(.+)$/.exec(id);
    if (!m || (m[1] === 'letter' && usedLetters.has(m[2]))) continue;
    rows.push({ key: id, kind: m[1], label: `${m[1] === 'letter' ? 'Letter' : 'Sign'}: ${niceId(m[2])}`, detail: `Slipped ${lap} time${lap === 1 ? '' : 's'} in review`,
      score: lap, href: m[1] === 'letter' ? go('spotit', `#/spotit/${encodeURIComponent(m[2])}`) : go('vowelboard', '#/vowelboard'), ids: [m[2]] });
  }
  const bySource = new Map();
  for (const m of s.misses) { if (!m || !m.screen) continue; const k = `${m.screen}|${m.tag}`; bySource.set(k, (bySource.get(k) || 0) + 1); }
  const SCREENS = { vowelboard: ['Vowel board', 'vowelboard', '#/vowelboard'], niqquddial: ['Vowel-point dial', 'niqquddial', '#/niqquddial'], dottile: ['Dot tiles', 'dottile', '#/dottile'], syllablechips: ['Syllable chips', 'syllablechips', '#/syllablechips'] };
  for (const [k, n] of bySource) {
    const [screen, tag] = k.split('|'); const sc = SCREENS[screen]; if (!sc) continue;
    rows.push({ key: 'miss:' + k, kind: 'practice', label: `${sc[0]}: ${niceId(tag)}`, detail: `Missed ${n} time${n === 1 ? '' : 's'}`, score: n, href: go(sc[1], sc[2]), ids: [tag] });
  }
  const wordLapses = Object.entries({ ...s.cards, ...s.vocab }).filter(([id, c]) => /^(word:|vocab:)/.test(id) && (Number(c?.lapses) || 0) >= 2);
  if (wordLapses.length) rows.push({ key: 'words', kind: 'words', label: 'Words you keep missing', detail: `${wordLapses.length} word card${wordLapses.length === 1 ? '' : 's'} slipped twice or more`, score: wordLapses.reduce((n, [, c]) => n + c.lapses, 0), href: '#/learn?review=1', ids: [] });
  return rows.sort((a, b) => b.score - a.score || a.key.localeCompare(b.key)).slice(0, max);
}

/** "mem-final" -> "Mem (final)"; "shin-dot" -> "Shin dot"; others capitalised. */
export function niceId(id) {
  const s = String(id ?? '');
  if (s.endsWith('-final')) return cap(s.slice(0, -6)) + ' (final)';
  return cap(s.replace(/-/g, ' '));
}
const cap = (x) => x.charAt(0).toUpperCase() + x.slice(1);

// ---------- "What can I read now?" (one summary over every lane) ------------------------------------------------

/**
 * First-day lane: words marked read in the first 10 minutes and the pointed-to-unpointed ladder score. Self-reported.
 * @param {Snapshot} s @param {{ladder?:any}} d
 */
export function firstDayInfo(s, d) {
  const readWords = Array.isArray(s.firstday.readWords) ? s.firstday.readWords.filter((w) => typeof w === 'string') : [];
  const answers = obj(s.firstdayLadder.answers);
  const steps = d.ladder && Array.isArray(d.ladder.steps) ? d.ladder.steps.length : 0;
  const ladder = steps ? unpointedScore(d.ladder, answers) : { right: 0, total: 0, pct: 0 };
  const answered = Object.values(answers).filter((v) => typeof v === 'boolean').length;
  return { started: readWords.length > 0 || answered > 0 || Number(s.firstday.step) > 0, readWords, done: s.firstday.done === true, ladder: { ...ladder, answered, steps, at: Number.isInteger(s.firstdayLadder.n) ? s.firstdayLadder.n : 0 } };
}

/**
 * Rows for the unified "What can I read now?" panel: letters and signs, lines and words, vocabulary cards, timed reads,
 * siddur coverage, first day. Each row: {id, label, value, detail, href, have, need|null, measured:'taught'|'self'}.
 * 'taught' = derived from completed lessons and tracing; 'self' = the learner's own report. Nothing is a fluency score.
 * @param {Snapshot} s @param {any} d @param {ReturnType<typeof makeContext>} c
 */
export function readNowSummary(s, d, c) {
  const k = c.know, r = c.read, v = c.vocab, tr = timedReadSummary(c.timedRead), sc = siddurCoverage(s, d, c), fd = firstDayInfo(s, d);
  const rows = [
    { id: 'letters', label: 'Letters and signs met', value: `${k.letters.size} of ${ALL_LETTERS.length} letters, ${k.signs.size} of ${ALL_SIGNS.length} signs`, detail: 'From completed lessons and finished tracing.', href: '#/learn', have: k.letters.size + k.signs.size, need: ALL_LETTERS.length + ALL_SIGNS.length, measured: 'taught' },
    { id: 'lines', label: 'Prayer and Torah lines using practised signs', value: `${r.linesFull.length} of ${r.lines.length} lines, ${r.words.full.length.toLocaleString('en-US')} words`, detail: `${r.linesAlmost.length} more ${r.linesAlmost.length === 1 ? 'line is' : 'lines are'} one sign away. Every letter and sign in them has been taught; this is not a fluency check.`, href: '#/read', have: r.linesFull.length, need: r.lines.length, measured: 'taught' },
    { id: 'vocab', label: 'Vocabulary cards', value: v.started ? `${v.started} started, ${v.bands.reduce((n, b) => n + b.mature, 0)} mature${v.reached ? `, working in the first ${v.reached.toLocaleString('en-US')}` : ''}` : 'none started', detail: 'Cards you have reviewed at least once; mature means the scheduler expects you to keep them for 21 days or more.', href: '#/vocab', have: v.started, need: null, measured: 'taught' },
    { id: 'timedread', label: 'Timed read-alouds', value: tr.reads ? `${tr.reads} ${tr.reads === 1 ? 'read' : 'reads'} of ${tr.texts} ${tr.texts === 1 ? 'text' : 'texts'}${tr.best ? `, about ${tr.best.medianWpm} clean words a minute on ${tr.best.textId}` : ''}` : 'none yet', detail: 'Self-reported: you time the read and mark the words that tripped you; the app keeps only the clock.', href: '#/timedread', have: tr.reads, need: null, measured: 'self' },
  ];
  if (sc) rows.push({ id: 'siddur', label: `Siddur coverage, ${sc.title}`, value: `${sc.pct}% of the lines Aleph holds`, detail: `${sc.full} of ${sc.lines} lines use only letters and signs you have been taught; ${sc.gaps} ${sc.gaps === 1 ? 'part' : 'parts'} of a typical service ${sc.gaps === 1 ? 'is' : 'are'} not in Aleph yet.`, href: '#/service', have: sc.full, need: sc.lines, measured: 'taught' });
  rows.push({ id: 'firstday', label: 'First 10 minutes and the unpointed ladder', value: !fd.started ? 'not started' : `${fd.readWords.length} first-day ${fd.readWords.length === 1 ? 'word' : 'words'} marked read${fd.ladder.steps ? `; ladder ${fd.ladder.right} of ${fd.ladder.total} unpointed words marked read` : ''}`, detail: 'Self-reported: you said whether you read each word. A hinted word never counts as read unpointed.', href: fd.ladder.answered ? '#/firstday/ladder' : '#/firstday', have: fd.readWords.length + fd.ladder.right, need: null, measured: 'self' });
  return rows;
}
