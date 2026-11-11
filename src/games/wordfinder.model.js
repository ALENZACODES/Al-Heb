// Level 1: pure, testable selection for learners who have never met Hebrew.
import { shuffled } from './engine.js';

export const STORE_KEY = 'games.wordfinder.v1';
export const TOPIC_FIRST = 'first';
export const TOPIC_ALL = 'all';
export const ROUND_SIZE = 5;

export function assertWordBank(raw) {
  const words = raw?.words;
  if (!Array.isArray(words) || words.length !== 240 || raw.count !== 240 || raw.starterCount !== 24) {
    throw new Error('Beginner word bank is missing or incomplete');
  }
  const ids = new Set(), texts = new Set();
  for (const w of words) {
    if (typeof w?.id !== 'string' || !w.id || typeof w.he !== 'string' ||
        !/[\u05D0-\u05EA]/u.test(w.he) || !/[\u05B0-\u05C7]/u.test(w.he) ||
        typeof w.en !== 'string' || !w.en.trim() || typeof w.translit !== 'string' ||
        !w.translit.trim() || typeof w.use !== 'string' || !w.use.trim() ||
        typeof w.theme !== 'string' || !w.theme.trim() || ids.has(w.id) || texts.has(w.he)) {
      throw new Error('Beginner word bank has invalid or repeated entries');
    }
    ids.add(w.id); texts.add(w.he);
  }
  return words;
}

export function recordFound(previous, wordId, bank) {
  const allowed = new Set(bank.map((w) => w.id));
  const seen = new Set(Array.isArray(previous?.found) ? previous.found.filter((id) => allowed.has(id)) : []);
  if (allowed.has(wordId)) seen.add(wordId);
  return { version: 1, found: [...seen], rounds: Math.max(0, Number(previous?.rounds) || 0) };
}

export function nextRound(words, progress = {}, topic = TOPIC_FIRST, count = ROUND_SIZE, rng = Math.random) {
  const pool = topic === TOPIC_FIRST ? words.slice(0, 24) :
    topic === TOPIC_ALL ? words : words.filter((w) => w.theme === topic);
  if (!pool.length) return [];
  const known = new Set(progress?.found || []);
  const newWords = pool.filter((w) => !known.has(w.id));
  const review = pool.filter((w) => known.has(w.id));
  return [...newWords.slice(0, count), ...shuffled(review, rng).slice(0, Math.max(0, count - newWords.length))];
}

export function choiceWords(words, correct, count = 3, rng = Math.random) {
  const n = Math.max(2, Math.min(4, count));
  const different = (w) => w.id !== correct.id && w.he !== correct.he && w.en !== correct.en;
  const sameTopic = shuffled(words.filter((w) => different(w) && w.theme === correct.theme), rng);
  const others = shuffled(words.filter((w) => different(w) && w.theme !== correct.theme), rng);
  return shuffled([correct, ...[...sameTopic, ...others].slice(0, n - 1)], rng);
}

export const LEVEL_DESCRIPTIONS = Object.freeze([
  'Never learned Hebrew? Start with shapes, sounds, everyday words.',
  'Recognise letters, names and their vowel marks.',
  'Match short words and meaning with help.',
  'Read short phrases and familiar patterns.',
  'Understand common words in context.',
  'Build sentences and respond with less help.',
  'Practice everyday dialogues and listening.',
  'Explore roots, patterns and tricky word forms.',
  'Stretch with fast, complex Hebrew challenges.',
]);
