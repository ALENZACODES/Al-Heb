// Scoring helpers for the Talk held-out files. Used by tools/talk/nmt/score.mjs and tests/talk.nmt.test.js.
import { translationMatchScore } from '../../../src/talk/talk.model.js';

const OPEN = [[/\bcan't\b/g, 'can not'], [/\bcannot\b/g, 'can not'], [/\bwon't\b/g, 'will not'], [/\blet's\b/g, 'let us'], [/n't\b/g, ' not'], [/\bi'm\b/g, 'i am'],
  [/'re\b/g, ' are'], [/'ve\b/g, ' have'], [/'ll\b/g, ' will'], [/'d\b/g, ' would'], [/'s\b/g, ' is']];
/** English with contractions opened ("where's" and "where is" compare equal). The same rule is applied to both sides. */
export function openContractions(s) {
  let t = String(s || '').toLowerCase().replace(/[’‘`]/g, "'");
  for (const [re, to] of OPEN) t = t.replace(re, to);
  return t;
}

/** strict: the house score against the first-choice reference. */
export const strictScore = (hyp, sample) => translationMatchScore(hyp, sample.reference);
/** accepted: the best house score over the reference and the other correct wordings, with English contractions opened. */
export function acceptedScore(hyp, sample) {
  const en = sample.direction === 'he-en';
  const fix = (x) => (en ? openContractions(x) : x);
  return Math.max(...[sample.reference, ...(sample.accept || [])].map((r) => translationMatchScore(fix(hyp), fix(r))));
}

export function summarize(rows) {
  const mean = (xs) => (xs.length ? Number(((100 * xs.reduce((a, b) => a + b, 0)) / xs.length).toFixed(1)) : null);
  const of = (sel) => { const r = rows.filter(sel); return { lines: r.length, strict: mean(r.map((x) => x.strict)), accepted: mean(r.map((x) => x.accepted)), exact: r.filter((x) => x.accepted === 1).length, refused: r.filter((x) => !x.ok).length }; };
  const by = {}; for (const r of rows) by[r.method] = (by[r.method] || 0) + 1;
  return { all: of(() => true), 'en-he': of((x) => x.direction === 'en-he'), 'he-en': of((x) => x.direction === 'he-en'), byMethod: by };
}
