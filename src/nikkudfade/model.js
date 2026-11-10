// Nikkud-fade engine: pure logic, no DOM, no network. A per-learner schedule decides, word by word, whether vowel points are shown.
//   Stage 1 full points -> stage 2 points only on NEW or LOOK-ALIKE (homograph) words -> stage 3 no points, tap to reveal.
// The engine only ever REMOVES points from a pointed form that came from the vocabulary data; it never adds or invents any.
// "Read" is self-reported by the learner (nothing is machine-graded). A word read after tapping reveal is recorded as aided.
// Store key: nikkudfade.v1 (see STORE_KEY). Defaults live in data/nikkudfade/schedule.json (DEFAULT_SCHEDULE mirrors them for tests).

import { rng } from '../curriculum/spotit.js'; // shared mulberry32 (same algorithm), so there is one copy in the repo

export const STORE_KEY = 'nikkudfade.v1';
export const STAGES = Object.freeze([1, 2, 3]);
export const DEFAULT_SCHEDULE = Object.freeze({ newAfter: 3, window: 10, advanceMaxHintRate: 0.2, demoteMinHintRate: 0.6, minReadsPerStage: 10, sessionSize: 8 });

// Points = vowel points, dagesh/rafe, shin and sin dots, cantillation marks, qamats qatan. Maqaf (U+05BE) is punctuation and is kept.
const POINTS = /[֑-ׇֽֿׁׂׅׄ]/g;
export const stripPoints = (s) => String(s ?? '').replace(POINTS, '');
export const hasPoints = (s) => /[֑-ׇֽֿׁׂׅׄ]/.test(String(s ?? ''));

export const defaultState = () => ({ v: 1, stage: 1, auto: true, words: {}, recent: [], stageReads: 0, changes: [] });

const num = (x, d = 0) => (Number.isFinite(x) && x >= 0 ? Math.floor(x) : d);
/** Accepts anything read back from storage and returns a valid state (never throws). */
export function normalizeState(raw) {
  const s = defaultState();
  if (!raw || typeof raw !== 'object') return s;
  if (STAGES.includes(raw.stage)) s.stage = raw.stage;
  s.auto = raw.auto !== false;
  if (raw.words && typeof raw.words === 'object') {
    for (const [id, w] of Object.entries(raw.words).slice(0, 5000)) {
      if (w && typeof w === 'object') s.words[id] = { seen: num(w.seen), aided: num(w.aided) };
    }
  }
  if (Array.isArray(raw.recent)) s.recent = raw.recent.slice(-50).map((x) => (x ? 1 : 0));
  s.stageReads = num(raw.stageReads);
  if (Array.isArray(raw.changes)) s.changes = raw.changes.slice(-20).filter((c) => c && STAGES.includes(c.from) && STAGES.includes(c.to)).map((c) => ({ from: c.from, to: c.to, why: String(c.why || '').slice(0, 20), at: num(c.at) }));
  return s;
}

export const seenCount = (state, id) => state.words[id]?.seen || 0;
export const isNewWord = (state, id, sched = DEFAULT_SCHEDULE) => seenCount(state, id) < sched.newAfter;

/**
 * Should this word show its points right now, and why? item = {id, he, ambiguous}.
 * @returns {{pointed:boolean, reason:'full'|'new'|'ambiguous'|'faded'}}
 */
export function pointsDecision(state, item, sched = DEFAULT_SCHEDULE) {
  if (state.stage === 1) return { pointed: true, reason: 'full' };
  if (state.stage === 2) {
    if (item.ambiguous) return { pointed: true, reason: 'ambiguous' };
    if (isNewWord(state, item.id, sched)) return { pointed: true, reason: 'new' };
  }
  return { pointed: false, reason: 'faded' };
}

/** Text to show. `revealed` (tap-to-reveal) shows the stored pointed form without changing the schedule decision. */
export function display(state, item, { revealed = false, sched = DEFAULT_SCHEDULE } = {}) {
  const d = pointsDecision(state, item, sched);
  const pointed = d.pointed || revealed;
  return { text: pointed ? item.he : stripPoints(item.he), pointed, reason: d.reason, revealed: revealed && !d.pointed };
}

const rate = (recent) => (recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : 0);
/** 'advance' | 'demote' | 'stay' from the recent window of reads (1 = aided). Only stages 2 and 3 can be judged on aided reads. */
export function judge(state, sched = DEFAULT_SCHEDULE) {
  if (!state.auto) return 'stay';
  const win = state.recent.slice(-sched.window);
  if (win.length < sched.window) return 'stay';
  const r = rate(win);
  if (state.stage < 3 && state.stageReads >= sched.minReadsPerStage && r <= sched.advanceMaxHintRate) return 'advance';
  if (state.stage > 1 && r >= sched.demoteMinHintRate) return 'demote';
  return 'stay';
}

const changeTo = (state, to, why, at) => ({ ...state, stage: to, stageReads: 0, recent: [], changes: [...state.changes, { from: state.stage, to, why, at }].slice(-20) });

/** Record one self-reported read. `aided` = the learner tapped reveal first. Auto mode may move the stage. */
export function recordRead(state, id, { aided = false, now = 0, sched = DEFAULT_SCHEDULE } = {}) {
  const w = state.words[id] || { seen: 0, aided: 0 };
  let s = { ...state, words: { ...state.words, [id]: { seen: w.seen + 1, aided: w.aided + (aided ? 1 : 0) } }, recent: [...state.recent, aided ? 1 : 0].slice(-50), stageReads: state.stageReads + 1 };
  const j = judge(s, sched);
  if (j === 'advance') s = changeTo(s, s.stage + 1, 'advance', now);
  else if (j === 'demote') s = changeTo(s, s.stage - 1, 'demote', now);
  return s;
}

/** Learner picks a stage. Turns auto off so the schedule never overrides the choice; setAuto(true) hands control back. */
export function setStage(state, stage, now = 0) {
  if (!STAGES.includes(stage)) return state;
  const s = { ...state, auto: false };
  return stage === state.stage ? s : changeTo(s, stage, 'manual', now);
}
export const setAuto = (state, on) => ({ ...state, auto: !!on });

export { rng };

/** A session: least-seen words first (ties shuffled), at most `size`. */
export function pickSession(items, state, { size = DEFAULT_SCHEDULE.sessionSize, seed = 1 } = {}) {
  const r = rng(seed);
  return items.map((it) => ({ it, k: seenCount(state, it.id) + r() * 0.5 })).sort((a, b) => a.k - b.k).slice(0, size).map((x) => x.it);
}

export function summary(state, items = [], sched = DEFAULT_SCHEDULE) {
  const total = Object.values(state.words).reduce((a, w) => a + w.seen, 0);
  const aided = Object.values(state.words).reduce((a, w) => a + w.aided, 0);
  const known = items.filter((i) => !isNewWord(state, i.id, sched)).length;
  return { stage: state.stage, auto: state.auto, reads: total, aided, unaided: total - aided, wordsSeen: Object.keys(state.words).length, wordsPastNew: known, recentAidedRate: state.recent.length ? Math.round(rate(state.recent.slice(-DEFAULT_SCHEDULE.window)) * 100) : null };
}

/** Structural check of a reading-set file; returns a list of problems (empty = fine). */
export function checkReadingSet(set) {
  const bad = [];
  if (!set || !Array.isArray(set.items) || !set.items.length) return ['no items'];
  const ids = new Set();
  for (const it of set.items) {
    if (!it.id || ids.has(it.id)) bad.push(`duplicate or missing id ${it.id}`); ids.add(it.id);
    if (!hasPoints(it.he)) bad.push(`${it.id}: he has no points`);
    if (stripPoints(it.he) !== it.unpointed) bad.push(`${it.id}: unpointed does not match`);
    if (typeof it.ambiguous !== 'boolean') bad.push(`${it.id}: ambiguous flag missing`);
  }
  return bad;
}

/** Highest lesson number the learner has completed (curriculum.progress.completed keys like "r08"), plus one, never below the first-release path (10). */
export function lessonReached(progress, floor = 10) {
  let top = 0;
  for (const k of Object.keys((progress && progress.completed) || {})) { const m = /^r(\d+)$/.exec(k); if (m) top = Math.max(top, Number(m[1])); }
  return Math.max(floor, top + 1);
}
/** Items whose lesson (item.unlock, a number or null) is within reach. Items with no lesson number are kept out unless `all`. */
export const filterByLesson = (items, reached, all = false) => (all ? items : items.filter((i) => Number.isFinite(i.unlock) && i.unlock <= reached));

/** For a look-alike item: the word's own sound and its rival's sound, in a seeded order. null when there is no rival or the two respellings are identical. */
export function soundChoices(item, seed = 1) {
  if (!item.ambiguous || !item.rival || !item.rival.translit || item.rival.translit === item.translit) return null;
  const opts = [{ id: 'own', label: item.translit }, { id: 'rival', label: item.rival.translit }];
  return rng(seed)() < 0.5 ? opts : opts.reverse();
}
export const gradeSound = (id) => id === 'own';

/** Look-alike lookup for any vocabulary id (data/nikkudfade/homographs.json): returns {he, translit, id} or null. Lets other screens flag words outside the 240-word set. */
export const ambiguousFor = (homographs, id) => (homographs && homographs.ids && homographs.ids[id]) || null;
