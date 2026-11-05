#!/usr/bin/env node
// Reading-level check for UI copy. Usage: node tools/a11y/readability.mjs [--json]
// Compares the wording before the plain-language pass (tests/fixtures/plain-language-before.json) with the current wording
// (src/shell/plain-copy.js) for the same string ids. Numbers: average sentence length in words, share of long words (7+ letters),
// and a Flesch-Kincaid grade estimate. The syllable count is a simple rule-of-thumb guess, so the grade is only a rough guide.
// It is a word-counting script. It is not a test with readers, and it does not measure the whole app.
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));

export function sentences(text) {
  return String(text ?? '').split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter((s) => /[A-Za-z]/.test(s));
}
export function wordsOf(text) { return (String(text ?? '').match(/[A-Za-z][A-Za-z'’-]*/g) || []); }
/** Rule-of-thumb English syllable count (at least 1 per word). */
export function syllables(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const g = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '').match(/[aeiouy]{1,2}/g);
  return Math.max(1, g ? g.length : 1);
}
export function measure(text) {
  const ss = sentences(text), ws = wordsOf(text);
  const n = ws.length, s = Math.max(1, ss.length);
  const syl = ws.reduce((a, w) => a + syllables(w), 0);
  const long = ws.filter((w) => w.replace(/[^A-Za-z]/g, '').length >= 7).length;
  const avgSentence = n / s, sylPerWord = n ? syl / n : 0;
  return { sentences: ss.length, words: n, avgSentence: +avgSentence.toFixed(1), longWordPct: n ? +(100 * long / n).toFixed(1) : 0,
    grade: n ? +(0.39 * avgSentence + 11.8 * sylPerWord - 15.59).toFixed(1) : 0 };
}
/** @returns {{rows:{id:string,before:any,after:any}[], before:any, after:any}} */
export async function compare() {
  const before = JSON.parse(readFileSync(root + 'tests/fixtures/plain-language-before.json', 'utf8'));
  const { PLAIN, plain } = await import(pathToFileURL(root + 'src/shell/plain-copy.js').href);
  const rows = [];
  for (const id of Object.keys(before)) {
    if (id.startsWith('_')) continue;
    rows.push({ id, beforeText: before[id], afterText: plain(id, { n: 3, word: 'DELETE' }), before: measure(before[id]), after: measure(plain(id, { n: 3, word: 'DELETE' })) });
  }
  const sum = (key) => measure(rows.map((r) => r[key]).join(' '));
  // whole-set numbers are per string (mean of the rows), so one long string does not hide the rest
  const mean = (k, f) => +(rows.reduce((a, r) => a + r[k][f], 0) / rows.length).toFixed(1);
  const agg = (k) => ({ strings: rows.length, avgSentence: mean(k, 'avgSentence'), longWordPct: mean(k, 'longWordPct'), grade: mean(k, 'grade'), words: rows.reduce((a, r) => a + r[k].words, 0) });
  void sum; void PLAIN;
  return { rows, before: agg('before'), after: agg('after') };
}
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const r = await compare();
  if (process.argv.includes('--json')) console.log(JSON.stringify(r, null, 2));
  else {
    console.log('id'.padEnd(18), 'words', 'sent-len', 'long%', 'grade');
    for (const x of r.rows) console.log(x.id.padEnd(18), `${x.before.words}->${x.after.words}`.padEnd(8), `${x.before.avgSentence}->${x.after.avgSentence}`.padEnd(11), `${x.before.longWordPct}->${x.after.longWordPct}`.padEnd(11), `${x.before.grade}->${x.after.grade}`);
    console.log('\nMean per string  before:', JSON.stringify(r.before)); console.log('Mean per string  after: ', JSON.stringify(r.after));
  }
}
