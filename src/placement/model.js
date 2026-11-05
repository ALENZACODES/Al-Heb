// DRAFT, UNREVIEWED placement check model. Pure functions, no DOM. The cutoffs (data/placement/config.json) are untested guesses.
// Items are built only from existing repo data; nothing here writes Hebrew.
export const STORE_KEY = 'placement.v1';
export const CATEGORIES = ['letters', 'vowels', 'syllables', 'words', 'phrases'];

export const seeded = (seed) => () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const shuffle = (a, rng) => { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };

/** Read-track lesson order: { order: id -> index, ids }. */
export function lessonOrder(lessons) {
  const ids = lessons.filter((l) => l.track === 'read').map((l) => l.id);
  return { ids, order: new Map(ids.map((id, i) => [id, i])) };
}
const firstLessonBy = (lessons, pick) => { const m = new Map(); for (const l of lessons) if (l.track === 'read') for (const k of pick(l)) if (!m.has(k)) m.set(k, l.id); return m; };

/** n items spread evenly across a list already sorted by difficulty. */
function spread(list, n) {
  if (list.length <= n) return list.slice();
  const out = [];
  for (let i = 0; i < n; i++) out.push(list[Math.round((i * (list.length - 1)) / (n - 1))]);
  return [...new Set(out)];
}
function options(correct, pool, key, n, rng) {
  const seen = new Set([key(correct)]);
  const wrong = [];
  for (const p of shuffle(pool, rng)) { const k = key(p); if (!k || seen.has(k)) continue; seen.add(k); wrong.push(p); if (wrong.length === n - 1) break; }
  return shuffle([correct, ...wrong], rng).map((o) => ({ id: key(o), label: key(o), correct: o === correct }));
}

/**
 * data = { letters, niqqud (records), lessons, words, registry }. Returns items sorted easiest first (by the read-track lesson
 * that introduces them). Each item: { id, cat, lesson, rank, he, prompt, audio, options[{id,label,correct}] }.
 */
export function buildItems(data, config, rng = seeded(config.seed)) {
  const { order } = lessonOrder(data.lessons);
  const cap = (cat) => order.get(config.lessonCaps[cat]) ?? Infinity;
  const n = config.optionsPerItem;
  const items = [];
  const byRank = (a, b) => a.rank - b.rank;

  const letterLesson = firstLessonBy(data.lessons, (l) => l.letters || []);
  const L = data.letters.filter((x) => letterLesson.has(x.id) && order.get(letterLesson.get(x.id)) <= cap('letters') && x.he && x.name)
    .map((x) => ({ x, lesson: letterLesson.get(x.id), rank: order.get(letterLesson.get(x.id)) })).sort(byRank);
  for (const c of spread(L, config.counts.letters)) {
    items.push({ id: `letter:${c.x.id}`, cat: 'letters', lesson: c.lesson, rank: c.rank, he: c.x.he, prompt: 'What is this letter called?', audio: null,
      options: options(c.x, data.letters.filter((y) => y.name), (y) => y.name, n, rng) });
  }

  const vowelLesson = firstLessonBy(data.lessons, (l) => l.vowels || []);
  const shortName = (r) => String(r.name).split(' (')[0];
  const V = data.niqqud.filter((r) => r.kind === 'vowel' && r.shape && r.name && vowelLesson.has(r.id) && order.get(vowelLesson.get(r.id)) <= cap('vowels'))
    .map((r) => ({ r, lesson: vowelLesson.get(r.id), rank: order.get(vowelLesson.get(r.id)) })).sort(byRank);
  for (const c of spread(V, config.counts.vowels)) {
    items.push({ id: `vowel:${c.r.id}`, cat: 'vowels', lesson: c.lesson, rank: c.rank, he: c.r.shape, prompt: 'What is this vowel sign called?', audio: null,
      options: options(c.r, data.niqqud.filter((r) => r.kind === 'vowel' && r.name), shortName, n, rng) });
  }

  const W = data.words.filter((w) => w.kind === 'word' && /^r\d+$/.test(w.unlockLesson || '') && order.has(w.unlockLesson) && w.he && w.translit && w.en);
  const wordRank = (w) => order.get(w.unlockLesson) * 1e6 + (w.readRank ?? w.frequencyRank ?? 1e5);
  const used = new Set();
  const syl = W.filter((w) => order.get(w.unlockLesson) <= cap('syllables') && w.he.length <= config.syllableMaxChars && /^[a-z]+$/.test(w.translit))
    .map((w) => ({ w, lesson: w.unlockLesson, rank: wordRank(w) })).sort(byRank);
  for (const c of spread(syl, config.counts.syllables)) {
    used.add(c.w.id);
    items.push({ id: `syllable:${c.w.id}`, cat: 'syllables', lesson: c.lesson, rank: order.get(c.lesson), he: c.w.he, prompt: 'How is this read?', audio: { kind: 'word', id: c.w.id },
      options: options(c.w, syl.map((s) => s.w), (w) => w.translit, n, rng) });
  }
  const com = W.filter((w) => !used.has(w.id) && order.get(w.unlockLesson) <= cap('words') && w.level === 'A1' && w.en.length <= config.wordMaxEnglishChars && !/^[A-Z(]/.test(w.en))
    .map((w) => ({ w, lesson: w.unlockLesson, rank: wordRank(w) })).sort(byRank);
  for (const c of spread(com, config.counts.words)) {
    items.push({ id: `word:${c.w.id}`, cat: 'words', lesson: c.lesson, rank: order.get(c.lesson), he: c.w.he, prompt: 'What does this word mean?', audio: { kind: 'word', id: c.w.id },
      options: options(c.w, com.map((s) => s.w), (w) => w.en, n, rng) });
  }

  const prayerLesson = firstLessonBy(data.lessons, (l) => l.prayerLines || []);
  const P = data.registry.filter((e) => e.category === 'siddur' && e.he && e.english && e.he.length <= config.phraseMaxChars)
    .map((e) => ({ e, lesson: prayerLesson.get(e.id) || config.phraseLevelLesson[e.level] })).filter((c) => c.lesson && order.has(c.lesson) && order.get(c.lesson) <= cap('phrases'))
    .map((c) => ({ ...c, rank: order.get(c.lesson) })).sort(byRank);
  for (const c of spread(P, config.counts.phrases)) {
    items.push({ id: `phrase:${c.e.id}`, cat: 'phrases', lesson: c.lesson, rank: c.rank, he: c.e.he, prompt: 'Which English line is this prayer phrase?', audio: { kind: 'prayer', id: c.e.id },
      options: options(c.e, P.map((p) => p.e), (e) => e.english, n, rng) });
  }
  return items.sort((a, b) => a.rank - b.rank || a.id.localeCompare(b.id));
}

// openStart lives in start.js so Home can use it without loading this whole model (see src/home/today.js).
export { openStart } from './start.js';

/** Adaptive stop rule (guess): stop when the window has too many misses, or when every item is answered. */
export function shouldStop(answers, total, stop) {
  if (answers.length >= total) return true;
  if (answers.length < stop.minAsked) return false;
  const recent = answers.slice(-stop.window);
  return recent.filter((a) => !a.correct).length >= stop.maxMissesInWindow;
}
export const nextItem = (items, answers, stop) => (shouldStop(answers, items.length, stop) ? null : items[answers.length] || null);

/**
 * Recommend a starting lesson. answers are in the order asked (= item order). The frontier is the first miss, unless a lone slip
 * (followed by correctAfterMiss correct answers) which is forgiven. No frontier => the read lesson after the hardest item.
 */
export function recommend(items, answers, config, lessons) {
  const { ids, order } = lessonOrder(lessons);
  const byId = new Map(items.map((i) => [i.id, i]));
  const k = config.slipForgiveness.correctAfterMiss;
  let frontier = null;
  for (let i = 0; i < answers.length; i++) {
    if (answers[i].correct) continue;
    const after = answers.slice(i + 1, i + 1 + k);
    if (after.length === k && after.every((a) => a.correct)) continue;
    frontier = byId.get(answers[i].id); break;
  }
  let lesson, reason;
  if (frontier) { lesson = frontier.lesson; reason = `first item you missed (${frontier.cat}) is taught in ${lesson}`; }
  else if (answers.length) {
    const top = Math.max(...answers.map((a) => order.get(byId.get(a.id).lesson)));
    lesson = ids[Math.min(top + 1, ids.length - 1)]; reason = 'no confirmed miss; starting after the hardest item you answered';
  } else { lesson = config.firstLesson; reason = 'no answers'; }
  if (!order.has(lesson)) lesson = config.firstLesson;
  const correct = answers.filter((a) => a.correct).length;
  return { lesson, reason, asked: answers.length, correct, confidence: answers.length < 10 ? 'low' : 'untested', draft: true };
}
