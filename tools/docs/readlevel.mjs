#!/usr/bin/env node
// Reading-level check for learner-facing English (Flesch-Kincaid grade). No dependencies.
//   node tools/docs/readlevel.mjs                 all v0 route files + i18n strings + lesson data, summary table
//   node tools/docs/readlevel.mjs --strings       also list every string above --max (default 9)
//   node tools/docs/readlevel.mjs --max 8 --jargon   change the per-string limit; list unexplained jargon hits
//   node tools/docs/readlevel.mjs file.js ...     only these files
// A string is taken from source by a small lexer (comments dropped, ${...} replaced by a number). Only strings that look like
// sentences are kept (3+ words, no code characters). It is an audit aid: short strings score noisily, so the per-string
// limit applies to strings of 8+ words and the per-file target (grade 6-7) to the whole text of a file.
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export const V0_FILES = [
  'src/shell/home.view.js', 'src/home/today.js', 'src/onboarding/firstrun.view.js', 'src/onboarding/model.js', 'src/firstday/firstday.view.js',
  'src/curriculum/learn.view.js', 'src/curriculum/lesson.view.js', 'src/curriculum/review.view.js', 'src/curriculum/exercises.ui.js',
  'src/curriculum/exercises.session.js', 'src/curriculum/ex-ui.js', 'src/letters/trace.view.js', 'src/letters/atlas.view.js',
  'src/progress/progress.view.js', 'src/progress/weekly.js', 'src/progress/milestones.js', 'src/shell/settings.view.js', 'src/shell/settings.data.js',
  'src/shell/about.view.js', 'src/shell/credits.view.js', 'src/shell/privacy.view.js', 'src/shell/install.view.js', 'src/shell/offline.view.js',
  'src/shell/search.view.js', 'src/shell/nav.strings.js',
];
export const JARGON = ['belt', 'belts', 'niqqud', 'nikud', 'dagesh', 'tradition', 'traditions', 'congregation', 'srs', 'trope', 'cantillation', 'siddur', 'liturgy',
  'matres', 'shva', 'gloss', 'glosses', 'pointing', 'pointed', 'unpointed', 'transliteration', 'respelling', 'scheduler', 'clergy', 'bundled', 'module', 'latin'];

const WORD = /[A-Za-z][A-Za-z'’-]*/g;
export function syllables(w) {
  w = w.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
  const m = w.match(/[aeiouy]{1,2}/g);
  return Math.max(1, m ? m.length : 1);
}
/** Flesch-Kincaid grade level of a text. Returns {grade, words, sentences}. */
export function fk(text) {
  const words = text.match(WORD) || [];
  if (!words.length) return { grade: 0, words: 0, sentences: 0 };
  const sentences = Math.max(1, (text.match(/[.!?]+(?:\s|$)/g) || []).length);
  const syl = words.reduce((a, w) => a + syllables(w), 0);
  return { grade: 0.39 * (words.length / sentences) + 11.8 * (syl / words.length) - 15.59, words: words.length, sentences };
}

/** String literals of a JS source (comments and regex literals skipped). */
export function extractStrings(src) {
  const out = []; let i = 0, prev = '';
  const n = src.length;
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') { i = src.indexOf('*/', i + 2); i = i < 0 ? n : i + 2; continue; }
    if (c === '"' || c === "'") {
      let j = i + 1, s = '';
      while (j < n && src[j] !== c && src[j] !== '\n') { if (src[j] === '\\') { s += src[j + 1] === 'n' ? ' ' : src[j + 1]; j += 2; } else s += src[j++]; }
      out.push(s); i = j + 1; prev = 'x'; continue;
    }
    if (c === '`') {
      let j = i + 1, s = '';
      while (j < n && src[j] !== '`') {
        if (src[j] === '\\') { s += src[j + 1]; j += 2; }
        else if (src[j] === '$' && src[j + 1] === '{') { let depth = 1; j += 2; while (j < n && depth) { if (src[j] === '{') depth++; else if (src[j] === '}') depth--; j++; } s += '3'; }
        else s += src[j++];
      }
      out.push(s); i = j + 1; prev = 'x'; continue;
    }
    if (c === '/' && /[(,=:\[!&|?{};]|^$/.test(prev)) { // regex literal
      let j = i + 1, cls = false;
      while (j < n && (src[j] !== '/' || cls) && src[j] !== '\n') { if (src[j] === '\\') j++; else if (src[j] === '[') cls = true; else if (src[j] === ']') cls = false; j++; }
      i = j + 1; prev = 'x'; continue;
    }
    if (!/\s/.test(c)) prev = c;
    i++;
  }
  return out;
}
/** Does a literal read like learner-facing prose? */
export function looksLikeProse(s) {
  const t = s.trim();
  if (t.split(/\s+/).length < 3) return false;
  if (/[{};]|=>|<\/?[a-z]|\.m?js\b|\.json\b|^[#./@]|\b(?:px|rem|var\(|aria-|data-)/i.test(t)) return false;
  if (/^[a-z0-9_.:-]+$/.test(t)) return false;
  if (!/^[A-Z"'(“0-9]/.test(t) && !/^[A-Z]/.test(t.replace(/^[^A-Za-z]+/, ''))) return false; // sentences start with a capital
  return (t.match(WORD) || []).length >= 3;
}
const withStop = (s) => (/[.!?:]$/.test(s.trim()) ? s.trim() : s.trim() + '.');

export function fileStrings(path) {
  const src = readFileSync(join(root, path), 'utf8');
  return extractStrings(src).filter(looksLikeProse).map((s) => s.replace(/\s+/g, ' ').trim());
}
export async function i18nStrings() {
  const { en } = await import(pathToFileURL(join(root, 'src/shell/i18n.js')).href);
  await import(pathToFileURL(join(root, 'src/shell/nav.strings.js')).href);
  return Object.entries(en).filter(([, v]) => typeof v === 'string' && (v.match(WORD) || []).length >= 3).map(([k, v]) => [k, v]);
}
export function dataStrings() {
  const out = [];
  const walk = (o, f, keys) => {
    if (Array.isArray(o)) o.forEach((x) => walk(x, f, keys));
    else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { if (typeof v === 'string' && keys.includes(k) && v.split(/\s+/).length >= 3) out.push([f, k, v]); else walk(v, f, keys); }
  };
  const read = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));
  if (existsSync(join(root, 'data/firstday/onramp.json'))) walk(read('data/firstday/onramp.json'), 'data/firstday/onramp.json', ['title', 'action', 'win', 'body', 'preview', 'prompt']);
  if (existsSync(join(root, 'data/curriculum/lessons.json'))) {
    const l = read('data/curriculum/lessons.json'); const ls = (l.lessons || l).filter((x) => /^r(0[1-9]|10)$/.test(x.id));
    walk(ls, 'data/curriculum/lessons.json (r01-r10)', ['title', 'goals']);
  }
  return out;
}
export const jargonIn = (s) => { const w = (s.toLowerCase().match(/[a-z]+/g) || []); return JARGON.filter((j) => w.includes(j)); };

// ------------------------------------------------------------------ CLI
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const args = process.argv.slice(2);
  const flag = (f) => { const i = args.indexOf(f); if (i < 0) return false; args.splice(i, 1); return true; };
  const val = (f, d) => { const i = args.indexOf(f); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return Number(v); };
  const listStrings = flag('--strings'), listJargon = flag('--jargon'), max = val('--max', 9), target = val('--target', 7);
  const files = args.length ? args : V0_FILES;
  const rows = []; const hard = []; const jar = [];
  const add = (label, strs) => {
    if (!strs.length) return;
    const r = fk(strs.map(withStop).join(' '));
    rows.push({ label, strings: strs.length, words: r.words, grade: r.grade });
    for (const s of strs) {
      const f = fk(withStop(s));
      if (f.words >= 8 && f.grade > max) hard.push({ label, grade: f.grade, s });
      const j = jargonIn(s); if (j.length) jar.push({ label, j, s });
    }
  };
  for (const f of files) add(f, fileStrings(f));
  if (!args.length) {
    const ii = await i18nStrings(); add('src/shell/i18n.js (en values)', ii.map(([, v]) => v));
    const byFile = new Map(); for (const [f, , v] of dataStrings()) byFile.set(f, [...(byFile.get(f) || []), v]);
    for (const [f, v] of byFile) add(f, v);
  }
  const pad = (s, n) => String(s).padEnd(n);
  console.log(pad('file', 52), pad('strings', 8), pad('words', 7), 'FK grade');
  for (const r of rows) console.log(pad(r.label, 52), pad(r.strings, 8), pad(r.words, 7), r.grade.toFixed(1) + (r.grade > target ? '  > ' + target : ''));
  const over = rows.filter((r) => r.grade > target).length;
  console.log(`\n${rows.length} sources; ${over} above grade ${target}; ${hard.length} strings of 8+ words above grade ${max}; ${jar.length} strings use a jargon word.`);
  if (listStrings) for (const h of hard.sort((a, b) => b.grade - a.grade)) console.log(`\n[${h.grade.toFixed(1)}] ${h.label}\n  ${h.s}`);
  if (listJargon) for (const j of jar) console.log(`\n[${j.j.join(', ')}] ${j.label}\n  ${j.s}`);
}
