// @ts-check
// Aleph lane 2: look-alike warnings. A hint is returned ONLY after a wrong answer, and only when the
// tapped letter really is one that gets confused with the target. Correct answers and unrelated
// mistakes return null, so the warning never appears before the learner has made the mistake.

/** @param {string} a @param {string} b */
export const pairKey = (a, b) => [a, b].sort().join('|');

/**
 * @param {string} targetId the letter the learner was asked for
 * @param {string} tappedId the letter the learner actually chose
 * @param {{pairs?: Record<string,string>}|null} interference data/letters/interference.json
 * @param {{sets?: Array<{id:string, letters:string[], hint:string}>}|null} confusables data/letters/confusables.json
 * @returns {null | {key:string, hint:string, source:'pair'|'set'}}
 */
export function warningAfterWrongTap(targetId, tappedId, interference, confusables) {
  if (!targetId || !tappedId || targetId === tappedId) return null; // correct tap: never warn
  const key = pairKey(targetId, tappedId);
  const pair = interference && interference.pairs && interference.pairs[key];
  if (pair) return { key, hint: pair, source: 'pair' };
  const set = ((confusables && confusables.sets) || []).find((s) => s.letters.includes(targetId) && s.letters.includes(tappedId));
  if (set) return { key, hint: set.hint, source: 'set' };
  return null;
}
