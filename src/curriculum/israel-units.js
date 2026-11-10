/**
 * Practical units for the Israel track (data/curriculum/israel-units.json). Pure helpers, no DOM, tested in Node.
 * A unit groups existing lessons by situation; its review, listening and speaking drills are built only from those
 * lessons' own words, word clips and exercises, so no Hebrew is created here.
 */
import { wordAudioId } from "./progress.js";

export const STORE_KEY = "israelUnits.v1"; // { reviews: { [unitId]: { step, last } } }

/** Old #/israel-units ids → the live Practical unit that now carries that situation. */
export const PRACTICAL_BY_ISRAEL = {
  u01: "pu-greetings",
  u02: "pu-fillers",
  u03: "pu-numbers",
  u04: "pu-cafe",
  u05: "pu-shop",
  u06: "pu-directions",
  u07: "pu-time",
  u08: "pu-verbs-now",
  u09: "pu-family",
  u10: "pu-health",
  u11: "pu-home",
  u12: "pu-weather",
  u13: "pu-decide",
};

/** Hash path for the live Practical course (list, or a mapped unit). */
export const practicalHref = (israelUnitId) => {
  const dest = PRACTICAL_BY_ISRAEL[israelUnitId];
  return dest ? `#/practical/${dest}` : "#/practical";
};


export const lessonsOf = (unit) => [...unit.core, ...unit.more];
export const unitForLesson = (data, id) => data.units.find((u) => lessonsOf(u).includes(id)) || null;

/** Lesson link: beginner lessons open in the lesson page, B1 lessons in the intermediate player. */
export const lessonHref = (id) => (/^I-\d{2}$/.test(id) ? `#/intermediate/${id}` : `#/learn?lesson=${id}`);

/** completed: { [lessonId]: ms }. Core done means the unit's review schedule can start. */
export function unitStatus(unit, completed = {}) {
  const ids = lessonsOf(unit), done = ids.filter((id) => completed[id]);
  const coreDone = unit.core.every((id) => completed[id]);
  const coreDoneAt = coreDone ? Math.max(...unit.core.map((id) => completed[id])) : null;
  return { total: ids.length, done: done.length, coreDone, coreDoneAt };
}

/**
 * Spaced unit review: first due reviewDays[0] days after the core lessons are finished, then each next gap after the
 * last review. step = number of reviews done. Returns { state: 'locked'|'waiting'|'due'|'complete', dueAt }.
 */
export function reviewDue(unit, completed, reviewLog = {}, now = Date.now(), days = [1, 3, 7, 14, 30]) {
  const st = unitStatus(unit, completed);
  if (!st.coreDone) return { state: "locked", dueAt: null, step: 0 };
  const rec = reviewLog[unit.id] || { step: 0, last: null };
  if (rec.step >= days.length) return { state: "complete", dueAt: null, step: rec.step };
  const from = rec.step === 0 ? st.coreDoneAt : rec.last;
  const dueAt = from + days[rec.step] * 86400000;
  return { state: now >= dueAt ? "due" : "waiting", dueAt, step: rec.step };
}

/** Record one finished unit review (returns a new log; the caller stores it). */
export const recordReview = (reviewLog = {}, unitId, now = Date.now()) =>
  ({ ...reviewLog, [unitId]: { step: (reviewLog[unitId]?.step || 0) + 1, last: now } });

/** Every lesson word of the unit, with its clip id. byId: lesson id -> lesson. */
export function reviewItems(unit, byId) {
  return lessonsOf(unit).flatMap((lid) => (byId[lid]?.words || []).map((w, i) => ({ lessonId: lid, he: w.he, en: w.en, audioId: wordAudioId(lid, i + 1) })));
}

/** Deterministic shuffle (mulberry32) so tests and a session agree. */
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function shuffle(xs, r) { const a = xs.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

/**
 * Listening drill: hear a word's clip, pick its meaning from three. Options are other words of the same unit with a
 * different gloss, so the right answer is never duplicated.
 */
export function listeningRound(items, size = 6, seed = 1) {
  const r = rng(seed), pool = shuffle(items.filter((x) => x.en), r);
  const out = [];
  for (const it of pool) {
    if (out.length >= size) break;
    const others = shuffle(pool.filter((x) => x.en !== it.en), r).reduce((acc, x) => (acc.some((y) => y.en === x.en) ? acc : [...acc, x]), []).slice(0, 2);
    if (others.length < 2) continue;
    const options = shuffle([it.en, ...others.map((x) => x.en)], r);
    out.push({ audioId: it.audioId, he: it.he, options, answer: options.indexOf(it.en) });
  }
  return out;
}

/**
 * Speaking drill: an English cue, the learner says the Hebrew aloud, then checks it. From B1 lessons: their respond
 * exercises (cue + answer). From beginner lessons: their words (say the Hebrew for the gloss), with the word clip.
 */
export function speakingDrills(unit, byId, max = 8) {
  const out = [];
  for (const lid of unit.more) for (const e of byId[lid]?.exercises || []) {
    if (e.type === "respond" && e.answer?.he) out.push({ from: e.id, cue: e.cue, he: e.answer.he, en: e.answer.en, audioId: null });
  }
  for (const lid of unit.core) (byId[lid]?.words || []).forEach((w, i) => out.push({ from: `${lid}-w${i + 1}`, cue: `Say it in Hebrew: ${w.en}`, he: w.he, en: w.en, audioId: wordAudioId(lid, i + 1) }));
  // Alternate the two sources so a short session has both, beginner words first.
  const words = out.filter((x) => x.audioId), resp = out.filter((x) => !x.audioId), mixed = [];
  for (let i = 0; mixed.length < max && (i < words.length || i < resp.length); i++) { if (words[i]) mixed.push(words[i]); if (resp[i] && mixed.length < max) mixed.push(resp[i]); }
  return mixed;
}
