#!/usr/bin/env node
// DRAFT. Converts the Spanish-style soundtext in data/tts/soundwords.<tradition>.json into an English-reader respelling
// ("a-lef" style input -> "ah-LEF"), for an English-voice text-to-speech. Never listened to, unreviewed; every rule is a
// guess for a native English reader to check. Rule table: docs/tts/ENGLISH-RESPELLING-RULES.md
//
// Usage: node tools/tts/to_english_respelling.mjs [--check] [--out DIR] [--no-caps]
//   writes data/tts/english-respelled.sephardi.csv and .ashkenazi.csv (id,he,soundtext,english,confidence)
//   --check   exit 1 if the files on disk differ from a fresh build
//   --no-caps stressed syllable is not upper-cased (stress then not marked at all)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const TRADITIONS = ['sephardi', 'ashkenazi'];
export const CSV_HEADER = 'id,he,soundtext,english,confidence';

const ACCENTED = { 'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u' };
const VOWEL_TOKEN = { a: 'ah', e: 'eh', i: 'ee', o: 'oh', u: 'oo' };
// Ordered alternatives; the first that matches at the current position wins.
//  gu before e/i = hard g (Spanish spelling) ; ai/ei/oi = diphthong when the i is not followed by another vowel
const TOKEN_RE = /gu(?=[ei])|ai(?![aeiou])|ei(?![aeiou])|oi(?![aeiou])|sh|ts|[a-z]|[^a-z]/g;
const FIXED = { gu: 'gh', ai: 'igh', ei: 'ay', oi: 'oy', sh: 'sh', ts: 'ts', j: 'ch', y: 'y', g: 'g' };
const isVowelLetter = (t) => t.length === 1 && 'aeiou'.includes(t);
const isConsonantToken = (t) => /^[a-z]/.test(t) && !isVowelLetter(t) && !['ai', 'ei', 'oi'].includes(t);

/** One syllable of soundtext (may carry an acute accent and trailing punctuation) -> English respelling. */
export function respellSyllable(syl, { caps = true } = {}) {
  let stressed = false;
  const plain = [...syl].map((c) => (ACCENTED[c] ? ((stressed = true), ACCENTED[c]) : c)).join('').toLowerCase();
  const toks = plain.match(TOKEN_RE) || [];
  let out = '';
  toks.forEach((t, i) => {
    if (isVowelLetter(t)) {
      // e in a closed syllable stays "e" (lef, mel); every other lone vowel is a digraph (ah, oh, ee, oo)
      out += t === 'e' && i + 1 < toks.length && isConsonantToken(toks[i + 1]) ? 'e' : VOWEL_TOKEN[t];
    } else out += FIXED[t] ?? t;
  });
  return stressed && caps ? out.toUpperCase() : out;
}

/** Whole soundtext string (words by space, syllables by hyphen) -> English respelling. Empty stays empty. */
export function respell(soundtext, opts = {}) {
  if (!soundtext) return '';
  return soundtext.split(' ').map((w) => w.split('-').map((s) => respellSyllable(s, opts)).join('-')).join(' ');
}

const csvCell = (v) => (/[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v);

export function buildCsv(items, opts = {}) {
  const rows = items.map((it) => [it.id, it.he, it.soundtext, respell(it.soundtext, opts), it.confidence].map(csvCell).join(','));
  return [CSV_HEADER, ...rows].join('\n') + '\n';
}

export function buildAll({ dataDir = path.join(ROOT, 'data', 'tts'), ...opts } = {}) {
  const out = {};
  for (const t of TRADITIONS) {
    const f = path.join(dataDir, `soundwords.${t}.json`);
    if (!fs.existsSync(f)) throw new Error(`missing input ${path.relative(ROOT, f)}: the respelling tool needs data/tts/soundwords.${t}.json`);
    const src = JSON.parse(fs.readFileSync(f, 'utf8'));
    out[`english-respelled.${t}.csv`] = buildCsv(src.items, opts);
  }
  return out;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const a = process.argv.slice(2);
  const oi = a.indexOf('--out');
  const outDir = oi >= 0 ? path.resolve(a[oi + 1]) : path.join(ROOT, 'data', 'tts');
  const files = buildAll({ caps: !a.includes('--no-caps') });
  let stale = 0;
  for (const [name, text] of Object.entries(files)) {
    const p = path.join(outDir, name);
    if (a.includes('--check')) {
      if (!fs.existsSync(p) || fs.readFileSync(p, 'utf8') !== text) { console.error('stale: ' + name); stale++; }
    } else {
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(p, text);
      console.log('wrote ' + path.relative(ROOT, p) + ' (' + (text.split('\n').length - 2) + ' rows) DRAFT: never listened to, unreviewed');
    }
  }
  process.exit(stale ? 1 : 0);
}
