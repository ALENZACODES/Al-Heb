// @ts-check
// Sixty-Second Sprint (D7): one minute of "what does this word mean?" from the learner's own lesson words, with a combo
// multiplier for a run of right answers. Words come from the lessons finished on this device (curriculum.progress), most
// recent first; with fewer than MIN_WORDS there, the first reading lessons' words fill the pool and the screen says so.
// (The existing five-minute Word Sprint, #/sprint, is a separate SRS review and is unchanged.) Pure: no DOM, no clock.
export const STORE_KEY = 'games.sprint60.v1';
export const SPRINT_SECONDS = 60;
export const MIN_WORDS = 8;
export const MAX_MULT = 4;
const plain = (s) => String(s ?? '').normalize('NFD').replace(/[֑-ׇ]/g, '').normalize('NFC');

/**
 * The word pool. lessons: data/curriculum/lessons.json lessons; completed: { lessonId: time }.
 * @returns {{words:{he:string,en:string,lesson:string,n:number}[], fromLessons:string[], filled:boolean}}
 */
export function lessonPool(lessons, completed, max = 40) {
  const done = Object.entries(completed && typeof completed === 'object' ? completed : {})
    .map(([id, t]) => [id, typeof t === 'string' ? Date.parse(t) : Number(t)]).sort((a, b) => (b[1] || 0) - (a[1] || 0)).map(([id]) => id);
  const byId = new Map((lessons || []).map((l) => [l.id, l]));
  const words = [], seen = new Set(), used = [];
  const take = (l) => {
    let any = false;
    (l?.words || []).forEach((w, i) => {
      const k = plain(w.he);
      if (!w.he || !w.en || seen.has(k) || words.length >= max) return;
      seen.add(k); words.push({ he: w.he, en: w.en, lesson: l.id, n: i + 1 }); any = true; // n: the word's place in its lesson (clip id <lesson>-w<n>)
    });
    if (any) used.push(l.id);
  };
  for (const id of done) take(byId.get(id));
  const filled = words.length < MIN_WORDS;
  if (filled) for (const l of (lessons || []).filter((x) => x.track === 'read')) { if (words.length >= MIN_WORDS) break; take(l); }
  return { words, fromLessons: used, filled };
}

/** Distinct English meanings only, so two choices never read the same. */
export function question(pool, rnd, last = '') {
  const words = pool.filter((w) => w.he !== last);
  const target = words[Math.floor(rnd() * words.length)];
  const decoys = [];
  for (const w of [...pool].sort(() => rnd() - 0.5)) { if (decoys.length >= 3) break; if (w.en !== target.en && !decoys.some((d) => d.en === w.en)) decoys.push(w); }
  const options = [target, ...decoys].sort(() => rnd() - 0.5);
  return { target, options };
}

/** Score after one answer: right adds 10 x the multiplier (1 + one step per three right in a row, up to MAX_MULT). */
export function answer(state, ok) {
  const s = { score: 0, streak: 0, right: 0, wrong: 0, bestStreak: 0, ...(state || {}) };
  if (!ok) return { ...s, streak: 0, wrong: s.wrong + 1, mult: 1, gained: 0 };
  const streak = s.streak + 1, mult = multiplier(streak), gained = 10 * mult;
  return { ...s, streak, right: s.right + 1, score: s.score + gained, bestStreak: Math.max(s.bestStreak, streak), mult, gained };
}
export const multiplier = (streak) => Math.min(MAX_MULT, 1 + Math.floor(Math.max(0, streak - 1) / 3));
/** Stars: right answers in the minute. */
export const starsFor = (right) => (right >= 20 ? 3 : right >= 12 ? 2 : right >= 6 ? 1 : 0);
