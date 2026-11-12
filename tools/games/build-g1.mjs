#!/usr/bin/env node
// Builds data/games/g1/words.json for the letters-and-sounds games (src/games/g1-*.view.js).
// Nothing Hebrew is typed here: every word record is copied from data/vocab/words.json, and the syllable split and the
// shva verdicts are worked out by the app's own engines (src/pronunciation/syllables.js and shva.js). tests/games.g1.test.js
// re-runs both engines and checks every copy, so a change in the word list or the engines shows up as a failing test.
// Run: node tools/games/build-g1.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chipsFor } from '../../src/pronunciation/syllables.js';
import { classifyShvas } from '../../src/pronunciation/shva.js';
import { parseWord } from '../../src/pronunciation/hebrew.js';
import { findName } from '../../src/shell/names.js';
import { letterClusters } from '../../src/games/tg-core.js';

const root = fileURLToPath(new URL('../..', import.meta.url));
const LIMIT = 600;
/** Letters and the vowel points, dagesh and shin/sin dots; nothing else (no trope, meteg, maqaf or spaces). */
const PLAIN_POINTED = /^[א-תְ-ׇּׁׂ]+$/;
const POINT = /[ְ-ׇֻ]/;

/** The shva verdicts both rule sets agree on: [cluster index, 'na' | 'nach', rule]. */
export function agreedShvas(he) {
  const c = parseWord(he);
  const basic = classifyShvas(c, { level: 1 }), full = classifyShvas(c, { level: 2 });
  const out = [];
  for (const [i, v] of basic) { const w = full.get(i); if (w && w.na === v.na && !w.heuristic) out.push([i, v.na ? 'na' : 'nach', w.rule]); }
  return { agreed: out, all: basic.size };
}
/** Syllables from the app's syllabifier, kept only when they join back to the word exactly. */
export function syllablesOf(he) {
  const r = chipsFor(he);
  const syl = r.ok ? r.syllables.map((s) => s.he) : [];
  return syl.join('') === he ? syl : null;
}

export function pickWords(all, limit = LIMIT) {
  const ok = all.filter((x) => x.kind === 'word' && x.flags?.needsReview === false && !x.flags?.hidden && ['A1', 'A2'].includes(x.level)
    && PLAIN_POINTED.test(x.he) && POINT.test(x.he) && !/\b(god|lord|deity|idol)\b/i.test(x.en) && x.translit
    && findName(x.he).length === 0 && x.he.replace(/[^א-ת]/g, '').length >= 2 && x.he.replace(/[^א-ת]/g, '').length <= 7);
  ok.sort((a, b) => (a.frequencyRank || 1e9) - (b.frequencyRank || 1e9));
  const seen = new Set(), out = [];
  for (const x of ok) {
    if (seen.has(x.he)) continue;
    seen.add(x.he);
    const rec = { id: x.id, he: x.he, translit: x.translit, en: x.en };
    const syl = syllablesOf(x.he);
    if (syl) rec.syl = syl.map((p) => letterClusters(p).length); // letters per syllable (fragments are not stored as text)
    const s = agreedShvas(x.he);
    if (s.all) { rec.shva = s.agreed; if (s.agreed.length < s.all) rec.shvaOpen = s.all - s.agreed.length; }
    out.push(rec);
    if (out.length >= limit) break;
  }
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const src = JSON.parse(readFileSync(root + 'data/vocab/words.json', 'utf8'));
  const words = pickWords(src.words);
  mkdirSync(root + 'data/games/g1', { recursive: true });
  const out = {
    schema: 'alef-g1-words/1',
    note: 'Built by tools/games/build-g1.mjs from data/vocab/words.json: single pointed words, needsReview false, level A1 or A2, 2 to 7 letters, the most frequent first; id, he, translit and en are copied unchanged. syl: letters per syllable, from src/pronunciation/syllables.js (chipsFor), kept only when the syllables join back to the word; the games cut the word by these counts. shva: [letter index, na or nach, rule] for each shva where the basic and the full rule sets of src/pronunciation/shva.js agree and the verdict does not rest on a guessed stress; shvaOpen counts the shvas left out. Review: the syllable splits and shva verdicts are rule-based and not checked by a native speaker.',
    count: words.length,
    words,
  };
  writeFileSync(root + 'data/games/g1/words.json', JSON.stringify(out) + '\n');
  console.log(`data/games/g1/words.json: ${words.length} words, ${words.filter((w) => w.syl).length} with syllables, ${words.filter((w) => w.shva?.length).length} with a settled shva`);
}
