/**
 * Cumulative confusable-group checkpoint (pure). Draws only letters the learner has been taught, grouped by the look-alike
 * sets in data/letters/confusables.json. Wrong answers are sent back to the SRS as lapses; right answers as good reviews.
 */
import { rng, shuffled } from "./spotit.js";
import { newCard, review } from "./srs.js";
import { letterCardId } from "./progress.js";

export const PASS_RATIO = 0.8;
/** Alphabet thirds by number of letters taught: checkpoints at 9, 18 and all 27 (finals included in the count). */
export const STAGES = [9, 18, 27];
export const stageFor = (taughtCount) => STAGES.filter((n) => taughtCount >= n).length;

/** Sets with at least two taught letters, narrowed to the taught letters. */
export function eligibleSets(taught, confusables) {
  const ok = new Set(taught);
  return (confusables?.sets || []).map((s) => ({ id: s.id, hint: s.hint, letters: s.letters.filter((l) => ok.has(l)) })).filter((s) => s.letters.length >= 2);
}

/**
 * @param {{taught:Iterable<string>, confusables:object, names:(id:string)=>string, glyph:(id:string)=>string, seed?:number}} o
 * @returns {{id:string, type:"pick-glyph"|"pick-name", setId:string, targetId:string, options:string[], answer:string}[]}
 *   One question per taught letter per set; every option is a taught letter from the same set.
 */
export function buildCheckpoint({ taught, confusables, seed = 1 }) {
  const rand = rng(seed), out = [];
  let n = 0;
  for (const set of eligibleSets(taught, confusables)) {
    for (const target of shuffled(set.letters, rand)) {
      out.push({ id: `q${++n}`, type: n % 2 ? "pick-glyph" : "pick-name", setId: set.id, targetId: target, options: shuffled(set.letters, rand), answer: target });
    }
  }
  return shuffled(out, rand);
}

/** @param {{answer:string,setId:string,targetId:string,id:string}[]} qs  @param {Record<string,string>} answers question id -> chosen letter id */
export function gradeCheckpoint(qs, answers) {
  const bySet = {}, wrong = [];
  let right = 0;
  for (const q of qs) {
    const s = (bySet[q.setId] ||= { right: 0, total: 0 });
    s.total++;
    if (answers[q.id] === q.answer) { s.right++; right++; } else wrong.push(q);
  }
  const total = qs.length;
  const weakSets = Object.entries(bySet).filter(([, s]) => s.right / s.total < PASS_RATIO).map(([id]) => id);
  return { right, total, ratio: total ? right / total : 0, passed: total > 0 && right / total >= PASS_RATIO, bySet, weakSets,
    wrongLetters: [...new Set(wrong.map((q) => q.targetId))], wrongPairs: wrong.map((q) => q.setId) };
}

/** Return a new cards object with SRS updates: wrong -> rating 1 (Again), right -> rating 3 (Good). Does not mutate. */
export function applyCheckpointToCards(cards, qs, answers, now) {
  const out = { ...cards };
  for (const q of qs) {
    const id = letterCardId(q.targetId), good = answers[q.id] === q.answer;
    if (!out[id]) { if (good) continue; out[id] = newCard({ id, kind: "letter", now }); }
    out[id] = review(out[id], good ? 3 : 1, now);
  }
  return out;
}

/** Spot It / checkpoint misses: lapse the listed letters' cards (creating missing cards). Does not mutate. */
export function lapseLetters(cards, letterIds, now) {
  const out = { ...cards };
  for (const l of new Set(letterIds)) {
    const id = letterCardId(l);
    out[id] = review(out[id] || newCard({ id, kind: "letter", now }), 1, now);
  }
  return out;
}
