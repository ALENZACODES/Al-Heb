/**
 * C2 objective cards and C8 honest lesson metadata (pure model + small DOM builders that take `el`, so the lesson page can load
 * this on demand). Goals are the authors' draft goals, shown word for word. "What you proved" lists only what the quick check
 * actually asked and the learner got right on the first try; it never claims a goal the check does not test.
 * The record line is computed on this device from lesson.checks.v1 (the newest 10 tries per lesson) and is shown only when
 * there is history.
 */
import { passMark, passPercent, passed } from '../curriculum/passmark.js';

const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;
const KIND = { 'letter-name': 'letter', 'letter-sound': 'letter', 'word-meaning': 'word' };

/** What the quick check covers: distinct letters and words it asks about. */
export function coverage(questions) {
  const letters = new Set(), words = new Set();
  for (const q of questions || []) { const k = KIND[q.kind]; if (k === 'letter') letters.add(q.cardId || q.id); else if (k === 'word') words.add(q.cardId || q.id); }
  return { letters: letters.size, words: words.size, questions: (questions || []).length };
}

/** The opening card's data. */
export function objectivesBefore(lesson, questions) {
  const n = (questions || []).length, cov = coverage(questions);
  const parts = [cov.letters ? plural(cov.letters, 'letter') : '', cov.words ? plural(cov.words, 'word') : ''].filter(Boolean);
  return {
    goals: Array.isArray(lesson?.goals) ? lesson.goals.slice() : [],
    checks: n ? `The quick check asks ${plural(n, 'question')}${parts.length ? ` about ${parts.join(' and ')}` : ''}. To pass: ${passMark(n)} of ${n} right on the first try (${passPercent(n)}%).` : 'This lesson has no quick check yet, so nothing can be proved here yet.',
  };
}

/** The closing card's data: only what was asked and right on the first try. */
export function provedAfter(questions, results) {
  const qs = questions || [], r = results || {}, n = qs.length;
  const right = qs.filter((q) => r[q.id] === true);
  const letterNames = [...new Set(right.filter((q) => KIND[q.kind] === 'letter').map((q) => (q.kind === 'letter-name' ? q.options[q.answerIndex].text : q.why.replace(/^.* is (.+)\.$/, '$1'))))];
  const words = [...new Set(right.filter((q) => q.kind === 'word-meaning').map((q) => `${q.promptHe} (${q.options[q.answerIndex].text})`))];
  return { right: right.length, of: n, need: passMark(n), pct: passPercent(n), passed: passed(right.length, n), letterNames, words };
}

const median = (xs) => { const a = xs.slice().sort((x, y) => x - y), m = a.length >> 1; return a.length ? (a.length % 2 ? a[m] : Math.round((a[m - 1] + a[m]) / 2)) : null; };
const clock = (ms) => { const s = Math.round(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

/**
 * C8: the learner's own record for one lesson, or null when there is none. tries = newest 10 ({at,right,of,ms?}).
 * passRate = share of those tries that passed; medianMs only from tries that carry a time (older tries have none).
 */
export function lessonRecord(checks, id) {
  const r = checks && typeof checks === 'object' ? checks[id] : null;
  const tries = Array.isArray(r?.tries) ? r.tries.filter((t) => t && Number.isFinite(t.right) && Number.isFinite(t.of) && t.of > 0) : [];
  if (!tries.length) return null;
  const passes = tries.filter((t) => passed(t.right, t.of)).length;
  const times = tries.map((t) => t.ms).filter((x) => Number.isFinite(x) && x > 0);
  return { tries: tries.length, passes, passRate: Math.round((passes / tries.length) * 100), medianMs: median(times), timed: times.length };
}
/** One plain line for the record, or '' when there is no history. */
export function recordText(rec) {
  if (!rec) return '';
  const base = `Your record on this device: ${plural(rec.tries, 'try', 'tries')}${rec.tries >= 10 ? ' (the newest 10)' : ''}, ${rec.passes} passed (${rec.passRate}%).`;
  return rec.medianMs ? `${base} Median time for a check: ${clock(rec.medianMs)}${rec.timed < rec.tries ? ` (from the ${plural(rec.timed, 'try', 'tries')} that were timed)` : ''}.` : base;
}

/** "What You Will Learn" card. */
export function objectiveCard(el, lesson, questions, rec) {
  const o = objectivesBefore(lesson, questions), line = recordText(rec);
  return el('section', { class: 'card alef-objectives', 'aria-labelledby': 'obj-will-learn', 'data-objectives': 'before' },
    el('h2', { id: 'obj-will-learn' }, 'What You Will Learn'),
    o.goals.length ? el('ul', {}, ...o.goals.map((g) => el('li', {}, g))) : null,
    o.goals.length ? el('p', { class: 'muted' }, "These are the course authors' draft goals; no teacher has reviewed them yet.") : null,
    el('p', {}, o.checks),
    line ? el('p', { class: 'muted', 'data-record': '' }, line) : null,
    el('p', { class: 'small' }, el('a', { href: '#/course-map' }, 'Where this lesson sits in the course map')));
}
/** "What You Proved" card for the end of a passed check (or "Not proved yet" below the pass mark). */
export function provedCard(el, questions, results) {
  const p = provedAfter(questions, results);
  const line = `${p.right} of ${p.of} right on the first try. The pass mark is ${p.need} of ${p.of} (${p.pct}%).`;
  return el('section', { class: 'card alef-objectives', 'aria-labelledby': 'obj-proved', 'data-objectives': 'after', 'data-passed': String(p.passed) },
    el('h2', { id: 'obj-proved' }, p.passed ? 'What You Proved' : 'Not Proved Yet'),
    el('p', {}, line),
    p.passed && p.letterNames.length ? el('p', {}, `Letters you got right on the first try: ${p.letterNames.join(', ')}.`) : null,
    p.passed && p.words.length ? el('p', {}, `Words you read right on the first try: ${p.words.join(', ')}.`) : null,
    el('p', { class: 'muted' }, p.passed ? 'The check tests the letters and words above. It does not test every goal of the lesson.' : 'Below the pass mark nothing is marked as proved. Your review cards were still updated.'));
}
