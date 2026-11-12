/**
 * C3 mixed review and C7 the daily set (pure, no DOM, no store). Questions are the lessons' own quick-check questions
 * (src/curriculum/exercises.session.js buildChoiceQuestions), picked by review-card id, so nothing new is written here.
 *  - weakestCards: reviewed cards the learner gets wrong most (lapses), then the ones most likely forgotten now (retrievability).
 *  - dailySet: due cards (up to 5) + one new item from the next open lesson + one game round (Spot It on a taught letter).
 * Only letter and word cards have questions; vowel, syllable, line and memory cards stay in the normal Review.
 */
import { buildChoiceQuestions } from '../curriculum/exercises.session.js';
import { cardRetrievability, due as dueSorted } from '../curriculum/srs.js';

const A_ID = /^I-\d{2}$/;
const questionable = (id) => /^letter:[^:]+$/.test(id) || /^word:[^:]+:\d+$/.test(id);

/** Reviewed letter/word cards, weakest first. @returns {object[]} */
export function weakestCards(cards, now, n = 8) {
  const list = Object.values(cards || {}).filter((c) => c && questionable(String(c.id)) && c.state !== 'new' && c.lastReview != null);
  return list.map((c) => ({ c, r: cardRetrievability(c, now) }))
    .sort((a, b) => (b.c.lapses || 0) - (a.c.lapses || 0) || a.r - b.r || (b.c.difficulty || 0) - (a.c.difficulty || 0) || String(a.c.id).localeCompare(String(b.c.id)))
    .slice(0, n).map((x) => x.c);
}
/** Due letter/word cards, most overdue first. */
export const dueQuestionable = (cards, now, n = 5) => dueSorted(Object.values(cards || {}).filter((c) => c && questionable(String(c.id))), now).slice(0, n);

/** The lesson a card's question comes from: a word card names it; a letter card comes from the first lesson that teaches the letter. */
export function sourceLesson(cardId, lessons) {
  const w = /^word:([^:]+):\d+$/.exec(cardId);
  if (w) return lessons.find((l) => l.id === w[1]) || null;
  const m = /^letter:(.+)$/.exec(cardId);
  return m ? lessons.find((l) => (l.letters || []).includes(m[1])) || null : null;
}

/**
 * One question per card id, in the given order (cards with no question are skipped). For letters the "which letter is this"
 * question is used. content = loadContent() result; tradition = the learner's congregation setting.
 */
export function questionsForCards(cardIds, lessons, content, { tradition = 'sephardi' } = {}) {
  const wordPool = lessons.filter((l) => !A_ID.test(l.id)).flatMap((l) => l.words || []);
  const cache = new Map(), out = [];
  for (const id of cardIds) {
    const l = sourceLesson(id, lessons); if (!l) continue;
    if (!cache.has(l.id)) cache.set(l.id, buildChoiceQuestions(l, { ...content, wordPool }, { seed: 1 + lessons.indexOf(l), tradition }));
    const q = cache.get(l.id).find((x) => x.cardId === id && x.kind !== 'letter-sound') || cache.get(l.id).find((x) => x.cardId === id);
    if (q && !out.some((x) => x.id === q.id)) out.push({ ...q, from: l.id });
  }
  return out;
}

/** The first lesson in course order that is open and not done (reading path first, as on Home). */
export function nextOpenLesson(lessons, completed = {}) {
  const done = new Set(Object.keys(completed || {}).filter((k) => completed[k]));
  const open = (l) => !done.has(l.id) && (l.prerequisites || []).every((p) => done.has(p));
  return lessons.find((l) => l.track === 'read' && open(l)) || lessons.find(open) || null;
}

/**
 * C7: the day's set. { due: question[], fresh: question|null (from the next open lesson; not saved to review cards),
 * game: { href, label }|null, total }.
 */
export function dailySet({ cards = {}, completed = {}, lessons, content, now, tradition }) {
  const due = questionsForCards(dueQuestionable(cards, now, 5).map((c) => c.id), lessons, content, { tradition });
  const next = nextOpenLesson(lessons, completed);
  let fresh = null;
  if (next) {
    const qs = buildChoiceQuestions(next, { ...content, wordPool: lessons.filter((l) => !A_ID.test(l.id)).flatMap((l) => l.words || []) }, { seed: 1 + lessons.indexOf(next), tradition });
    const q = qs.find((x) => !cards[x.cardId] && x.kind !== 'letter-sound') || null;
    if (q) fresh = { ...q, id: `${q.id}-new`, from: next.id, fresh: true };
  }
  const taught = new Set(lessons.filter((l) => completed[l.id]).flatMap((l) => l.letters || []));
  const letter = [...due.map((q) => /^letter:(.+)$/.exec(q.cardId)?.[1]).filter(Boolean), ...taught][0] || null;
  const name = letter ? content.letters?.get?.(letter)?.name || letter : null;
  const game = letter ? { href: `#/spotit/${encodeURIComponent(letter)}`, label: `Spot It: ${name}` } : null;
  return { due, fresh, game, next: next ? { id: next.id, title: next.title } : null, total: due.length + (fresh ? 1 : 0) };
}

/** Review-card outcomes for answered questions (fresh items are never saved). */
export const outcomesFor = (questions, results) => questions.filter((q) => !q.fresh && q.cardId && q.id in (results || {})).map((q) => ({ id: q.cardId, kind: q.cardKind || 'word', good: !!results[q.id], create: false }));
