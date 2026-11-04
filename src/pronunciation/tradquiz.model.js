// @ts-check
// Pure model for "Which tradition is this?" (tradquiz.view.js). Questions come from data/pronunciation/runtime/quiz-pool.json
// (words whose traditions differ, built from the difference codes). Everything is rule-generated and unverified by a native speaker.
import { TRADITIONS, TRADITION_LABELS } from './compare.model.js';

export const QUIZ_KEY = 'pron.quiz.v1';
export const QUESTIONS = 10;
export const ISRAELI_OR_SEPHARDI = 'israeli-or-sephardi';
export const NOTE = 'This is an eye quiz. There are no recordings and no browser voice for the Sephardi or Ashkenazi readings, so nothing here can be tested by ear. The readings are rule-generated from the pointed text and have not been checked by a native speaker.';

/** @typedef {{h:string,g:string,i:string[],s:string[],c:string,t:number}} PoolWord */
/**
 * @param {PoolWord[]} pool
 * @param {() => number} rng
 * @param {number} [n]
 */
export function buildQuiz(pool, rng, n = QUESTIONS) {
  const idx = pool.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
  const qs = [];
  for (const k of idx) {
    const w = pool[k];
    const respellOk = w.s[0] !== w.s[1];
    const tripleOk = w.t === 1;
    if (!respellOk && !tripleOk) continue;
    // mode "ipa": three answers, the IPA tells them apart; mode "respelling": Ashkenazi vs the other two
    const mode = tripleOk && (!respellOk || rng() < 0.5) ? 'ipa' : 'respelling';
    const shown = TRADITIONS[Math.floor(rng() * 3)];
    const ti = TRADITIONS.indexOf(shown);
    const answer = mode === 'ipa' ? shown : shown === 'ashkenazi' ? 'ashkenazi' : ISRAELI_OR_SEPHARDI;
    qs.push({ word: w, mode, shown, answer, text: mode === 'ipa' ? w.i[ti] : w.s[shown === 'ashkenazi' ? 1 : 0], options: mode === 'ipa' ? [...TRADITIONS] : [ISRAELI_OR_SEPHARDI, 'ashkenazi'] });
    if (qs.length >= n) break;
  }
  return qs;
}

export const optionLabel = (o) => (o === ISRAELI_OR_SEPHARDI ? 'Israeli or Sephardi (the respelling is the same)' : TRADITION_LABELS[o]);
export const isCorrect = (q, choice) => choice === q.answer;

/**
 * Update the stored record after a finished round.
 * @param {any} prev  stored value or undefined
 * @param {{ok:boolean, codes:string[]}[]} results
 */
export function applyRound(prev, results) {
  const p = prev && typeof prev === 'object' ? prev : {};
  const score = results.filter((r) => r.ok).length;
  const byCode = { ...(p.byCode || {}) };
  for (const r of results) for (const c of r.codes) { const o = byCode[c] || { right: 0, seen: 0 }; byCode[c] = { right: o.right + (r.ok ? 1 : 0), seen: o.seen + 1 }; }
  return { rounds: (p.rounds || 0) + 1, best: Math.max(p.best || 0, score), last: { score, total: results.length }, byCode };
}
/** Codes with the lowest right-rate (seen at least twice), worst first. */
export function weakCodes(stored, codeNames = {}) {
  const by = stored?.byCode || {};
  return Object.entries(by).filter(([, v]) => v.seen >= 2).map(([c, v]) => ({ code: c, rate: v.right / v.seen, seen: v.seen })).filter((x) => x.rate < 1 && codeNames[x.code]).sort((a, b) => a.rate - b.rate || (a.code < b.code ? -1 : 1)).slice(0, 3);
}
