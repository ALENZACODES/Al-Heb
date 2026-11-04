/**
 * Adapter for the intermediate lessons (I-01..I-50) registered in data/curriculum/lessons.json.
 * Those lessons carry an `exercises` array (types: recall, produce, match, order, respond, gender, dialogue, fade, spot,
 * register; see docs/curriculum/INTERMEDIATE.md). The lesson page does not play exercises; this module is the pure,
 * DOM-free layer a player would use: presentation helpers, grading and the mapping to SRS cards and routes.
 * Nothing here stores anything. Content is draft and unreviewed.
 */
import { byId } from "./lessons.js";
import { rng, shuffled } from "./spotit.js";
import { wordCardId, lineCardId } from "./progress.js";

export const EXERCISE_TYPES = ["recall", "produce", "match", "order", "respond", "gender", "dialogue", "fade", "spot", "register"];
/** Types the learner marks themselves (they say the answer aloud). Everything else is graded here. */
export const SELF_RATED = new Set(["recall", "respond", "gender", "dialogue", "fade"]);

export const isIntermediateId = (id) => /^I-\d{2}$/.test(String(id));
export const exercisesOf = (lessonId) => byId[lessonId]?.exercises || [];

const TAAM = /[֑-ֽֿׅ֯ׄ]/g;
const PUNCT = /[,.?!:;"'()׃׀…]+$/g;
/** Comparison key: NFC, cantillation removed, trailing punctuation dropped. Pointing is kept on purpose. */
export const heKey = (s) => String(s).normalize("NFC").replace(TAAM, "").replace(PUNCT, "").trim();

/** Whitespace tokens of an `order` exercise's Hebrew line (what the learner re-orders). */
export const orderTokens = (ex) => ex.he.split(/\s+/).filter(Boolean);

/** Shuffled tokens for an `order` exercise, never equal to the right order when a different order exists. */
export function orderPuzzle(ex, seed = 1) {
  const right = orderTokens(ex);
  if (new Set(right.map(heKey)).size < 2) return right;
  const rand = rng(seed);
  let out = shuffled(right, rand);
  for (let i = 0; i < 20 && out.every((t, k) => heKey(t) === heKey(right[k])); i++) out = shuffled(right, rand);
  return out;
}

/** Options for `produce` in a deterministic shuffled order: [{ text, correct }]. */
export function produceOptions(ex, seed = 1) {
  return shuffled(ex.options.map((text, i) => ({ text, correct: i === ex.answer })), rng(seed));
}

/** Left and right columns for `match`, the right column shuffled: { left:[he], right:[en] }. */
export function matchColumns(ex, seed = 1) {
  return { left: ex.pairs.map((p) => p.he), right: shuffled(ex.pairs.map((p) => p.en), rng(seed)) };
}

/**
 * Grade a response. Returns { correct: boolean|null, selfRated: boolean }.
 *   produce   response = chosen option text
 *   match     response = { [he]: en }  (all pairs must be right)
 *   order     response = array of tokens
 *   spot      response = chosen token
 *   register  response = chosen register id
 *   self-rated types: response = rating 1-4 (3 and 4 count as correct), as in srs.js
 */
export function gradeExercise(ex, response) {
  switch (ex.type) {
    case "produce": return { correct: heKey(response ?? "") === heKey(ex.options[ex.answer]), selfRated: false };
    case "match": return { correct: ex.pairs.every((p) => response && response[p.he] === p.en), selfRated: false };
    case "order": {
      const right = orderTokens(ex);
      return { correct: Array.isArray(response) && response.length === right.length && response.every((t, i) => heKey(t) === heKey(right[i])), selfRated: false };
    }
    case "spot": return { correct: heKey(response ?? "") === heKey(ex.target), selfRated: false };
    case "register": return { correct: response === ex.answer, selfRated: false };
    default: return { correct: Number(response) >= 3, selfRated: true };
  }
}

/** Where an exercise can be practised in an existing screen, or null when it needs the lesson player. */
export function exerciseRoute(ex) {
  if (ex.type === "fade") return `#/learn?fade=${encodeURIComponent(ex.line)}`;
  return null;
}

/**
 * SRS outcomes ({ id, kind, good, create }) for applyOutcomesToCards, from results [{ id, correct }]. Only exercises that
 * name something with a card produce an outcome: `recall` and `produce` hits on a lesson word (word card), `fade`
 * (line card). Everything else is practice only.
 */
export function outcomesFor(lesson, results) {
  const byEx = Object.fromEntries((lesson.exercises || []).map((e) => [e.id, e]));
  const wordIndex = (he) => lesson.words.findIndex((w) => heKey(w.he) === heKey(he));
  const out = [];
  for (const r of results) {
    const ex = byEx[r.id];
    if (!ex) continue;
    if (ex.type === "fade") out.push({ id: lineCardId(ex.line), kind: "prayerLine", good: !!r.correct, create: true });
    else {
      const he = ex.type === "recall" ? ex.he : ex.type === "produce" ? ex.options[ex.answer] : null;
      const i = he == null ? -1 : wordIndex(he);
      if (i >= 0) out.push({ id: wordCardId(lesson.id, i + 1), kind: "word", good: !!r.correct });
    }
  }
  return out;
}
