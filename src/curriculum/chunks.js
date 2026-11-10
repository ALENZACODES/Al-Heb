// Short sessions and "pick up where you left off" for lessons. Pure functions; the lesson page does the drawing and saving.
//
// A lesson is cut into small parts. A teaching part holds up to CHUNK_ITEMS things to look at (letters, vowel marks, words, prayer lines, in lesson order).
// A check part holds up to CHUNK_QUESTIONS of the lesson's quick-check questions. Your place is saved after every part, and after every
// answer in the quick check, under one store key (RESUME_KEY). Nothing is lost when you leave: the lesson opens at the same part, and the
// questions you already answered stay answered.
//
// How long a part takes was not timed with learners. Parts are small by count (a few items), not by a clock.

export const RESUME_KEY = 'lesson.resume.v1';
export const CHUNK_ITEMS = 3;
export const CHUNK_QUESTIONS = 3;
const MAX_KEPT = 40; // resume records kept at once (oldest dropped); each is tiny

/** @param {{letters?:string[], vowels?:string[], words?:any[], prayerLines?:string[]}} lesson */
export function teachItems(lesson) {
  return [
    ...(lesson?.letters || []).map((id) => ({ t: 'letter', id })),
    ...(lesson?.vowels || []).map((id) => ({ t: 'vowel', id })),
    ...(lesson?.words || []).map((_, i) => ({ t: 'word', i })),
    ...(lesson?.prayerLines || []).map((id) => ({ t: 'line', id })),
  ];
}
/** @returns {({kind:'teach', items:any[]}|{kind:'check', ids:string[]})[]} */
export function planChunks(lesson, questionIds = [], { items = CHUNK_ITEMS, questions = CHUNK_QUESTIONS } = {}) {
  const out = [];
  const all = teachItems(lesson);
  for (let i = 0; i < all.length; i += Math.max(1, items)) out.push({ kind: 'teach', items: all.slice(i, i + Math.max(1, items)) });
  for (let i = 0; i < questionIds.length; i += Math.max(1, questions)) out.push({ kind: 'check', ids: questionIds.slice(i, i + Math.max(1, questions)) });
  return out;
}

const isId = (s) => typeof s === 'string' && s.length > 0 && s.length < 80;
/** Read any stored value as a well-formed map. Never throws. @returns {Record<string,{chunk:number, results:Record<string,boolean>, at:number}>} */
export function sanitizeResume(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const [id, r] of Object.entries(raw)) {
    if (!isId(id) || !r || typeof r !== 'object') continue;
    const results = {};
    if (r.results && typeof r.results === 'object') for (const [q, v] of Object.entries(r.results)) if (isId(q) && typeof v === 'boolean') results[q] = v;
    out[id] = { chunk: Number.isInteger(r.chunk) && r.chunk >= 0 ? r.chunk : 0, results, at: Number.isFinite(r.at) ? r.at : 0 };
  }
  return out;
}
/** The saved place for one lesson, kept only for question ids that still exist. `planLength` clamps the part number. */
export function getResume(raw, lessonId, { questionIds = null, planLength = Infinity } = {}) {
  const r = sanitizeResume(raw)[lessonId];
  if (!r) return { chunk: 0, results: {}, at: 0, found: false };
  const results = {};
  for (const [q, v] of Object.entries(r.results)) if (!questionIds || questionIds.includes(q)) results[q] = v;
  return { chunk: Math.max(0, Math.min(r.chunk, planLength - 1)), results, at: r.at, found: true };
}
/** A new map with this lesson's place updated. `patch` may hold chunk, results and replaceResults (results are merged, unless replaceResults is true). */
export function setResume(raw, lessonId, patch, now = Date.now()) {
  const all = sanitizeResume(raw), cur = all[lessonId] || { chunk: 0, results: {}, at: 0 };
  all[lessonId] = { chunk: patch.chunk ?? cur.chunk, results: patch.replaceResults ? { ...(patch.results || {}) } : { ...cur.results, ...(patch.results || {}) }, at: now };
  const ids = Object.keys(all);
  if (ids.length > MAX_KEPT) for (const id of ids.sort((a, b) => all[a].at - all[b].at).slice(0, ids.length - MAX_KEPT)) delete all[id];
  return all;
}
export function clearResume(raw, lessonId) { const all = sanitizeResume(raw); delete all[lessonId]; return all; }

/** Summary numbers from first-try results (same shape the quiz returns). */
export function statsFromResults(results, questionIds) {
  const ids = Object.keys(results), right = ids.filter((k) => results[k]).length;
  return { answered: ids.length, right, missed: ids.filter((k) => !results[k]), skipped: questionIds.filter((q) => !(q in results)), retried: 0, retriedRight: 0, accuracy: ids.length ? right / ids.length : null };
}
