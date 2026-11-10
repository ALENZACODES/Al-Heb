#!/usr/bin/env node
// Library article gate: ten checks every article in data/library/articles.json must pass before it ships.
//   node tools/content/check-articles.mjs            (report, exit 1 on any failure)
//   node tools/content/check-articles.mjs --json     (machine-readable report)
// The checks are mechanical. They catch missing sources, copied runs of words, stock machine phrasing and broken Hebrew;
// they do not replace a person reading the article. The one check that needs the internet (each article against the full
// text of its cited pages) lives in tools/content/check-sources.mjs, to be run on a machine with web access.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { titleCase } from '../../src/shell/title-case.js';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
const read = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));

// Phrases that mark text as machine-written or padded. Whole-word, case-insensitive.
export const STOCK_PHRASES = [
  'delve', 'delves', 'tapestry', 'testament to', 'in today\'s', 'it is important to note', 'it\'s important to note', 'it is worth noting',
  'navigate', 'navigating', 'embark', 'realm', 'vibrant', 'unlock', 'moreover', 'furthermore', 'in conclusion', 'plays a crucial role',
  'a myriad of', 'seamless', 'elevate', 'profound', 'journey', 'deep dive', 'nuanced', 'landscape', 'foster', 'underscore', 'underscores',
  'pivotal', 'bustling', 'showcase', 'intricate', 'multifaceted', 'beacon', 'cornerstone', 'resonate', 'resonates', 'ever-evolving',
  'harness', 'let\'s explore', 'whether you\'re', 'rich history', 'timeless', 'in essence', 'at its core', 'serves as a reminder',
  'stands as', 'a blend of', 'dive into', 'treasure trove', 'game-changer', 'paramount', 'meticulous',
];
// Hedged or detached attributions that the house style rules out.
export const HEDGES = ['some say', 'it is said', 'according to some', 'scholars believe', 'experts say', 'many believe', 'it has been said', 'some argue', 'arguably'];

const NIQQUD = /[ְ-ׇּׁׂ]/;
const words = (s) => String(s).toLowerCase().replace(/[“”"'’]/g, "'").match(/[a-z][a-z'\-]*/g) || [];
const sentences = (s) => String(s).split(/(?<=[.!?])\s+(?=[A-Z“"(])/).map((x) => x.trim()).filter(Boolean);
function syllables(w) {
  w = w.replace(/'s$/, '').replace(/[^a-z]/g, '');
  if (w.length <= 3) return 1;
  const v = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '').match(/[aeiouy]{1,2}/g);
  return Math.max(1, v ? v.length : 1);
}
/** Flesch reading ease of plain English text (higher is easier; 60+ is plain English). */
export function flesch(text) {
  const ss = sentences(text), ws = words(text);
  if (!ss.length || !ws.length) return 100;
  const syl = ws.reduce((a, w) => a + syllables(w), 0);
  return Math.round(206.835 - 1.015 * (ws.length / ss.length) - 84.6 * (syl / ws.length));
}
const shingles = (text, n = 7) => { const w = words(text.replace(/“[^”]*”|"[^"]*"/g, ' ')); const out = new Set(); for (let i = 0; i + n <= w.length; i++) out.add(w.slice(i, i + n).join(' ')); return out; };
const bodyOf = (a) => a.sections.flatMap((s) => s.paras).join(' ');
const allText = (a) => [a.title, a.summary, ...a.sections.map((s) => s.heading), bodyOf(a)].join(' ');

/** Run all ten checks. Returns [{id, checks:[{name, ok, detail}]}]. */
export function checkArticles(lib = read('data/library/articles.json'), env = {}) {
  const corpus = env.corpus ?? read('data/corpus/registry.json').entries.map((e) => e.english || '').join(' ');
  const appText = env.appText ?? JSON.stringify(read('data/calendar/days.json'));
  const corpusSh = shingles(corpus), appSh = shingles(appText);
  const arts = lib.articles || [];
  const bySh = new Map();
  for (const a of arts) for (const s of shingles(bodyOf(a))) { if (!bySh.has(s)) bySh.set(s, new Set()); bySh.get(s).add(a.id); }

  return arts.map((a) => {
    const checks = [];
    const add = (name, problems) => checks.push({ name, ok: problems.length === 0, detail: problems.join('; ') });
    const body = bodyOf(a), text = allText(a);

    // 1. Structure and house style: required fields, Title Case title and headings, Aleph spelling
    const p1 = [];
    if (!/^[a-z0-9-]+$/.test(a.id || '')) p1.push('id must be a lowercase slug');
    for (const k of ['title', 'summary', 'sections', 'references', 'terms']) if (!a[k] || (Array.isArray(a[k]) && !a[k].length)) p1.push(`missing ${k}`);
    for (const t of [a.title, ...(a.sections || []).map((s) => s.heading)]) if (t && titleCase(t) !== t) p1.push(`not Title Case: "${t}"`);
    if (/\bAlef\b/.test(text)) p1.push('spell the letter and the app "Aleph"');
    if (!a.tryIt?.href?.startsWith('#/')) p1.push('tryIt needs an in-app link');
    add('structure and house style', p1);

    // 2. References: at least two, from at least two publishers, https, each says what it supports and when it was checked
    const p2 = [], refs = a.references || [];
    if (refs.length < 2) p2.push('needs at least two references');
    if (new Set(refs.map((r) => r.publisher)).size < 2) p2.push('needs at least two different publishers');
    if (!refs.some((r) => ['organization', 'primary', 'academic'].includes(r.kind))) p2.push('needs an organizational, primary or academic source');
    refs.forEach((r, i) => {
      if (!/^https:\/\/[^\s]+\.[^\s]+/.test(r.url || '')) p2.push(`ref ${i}: url must be https`);
      if (!r.title || !r.publisher || !r.supports) p2.push(`ref ${i}: title, publisher and supports are required`);
      if (!r.checked?.date) p2.push(`ref ${i}: record when it was checked`);
      if (/\?\s*no:|TODO|xxx/i.test(`${r.title} ${r.publisher}`)) p2.push(`ref ${i}: placeholder text`);
    });
    add('references', p2);

    // 3. Citations: every section cites, every cited index exists, every reference is used
    const p3 = [], used = new Set();
    (a.sections || []).forEach((s, i) => {
      if (!Array.isArray(s.refs) || !s.refs.length) p3.push(`section ${i + 1} cites nothing`);
      for (const r of s.refs || []) { if (!refs[r]) p3.push(`section ${i + 1} cites missing ref ${r}`); used.add(r); }
    });
    refs.forEach((_, i) => { if (!used.has(i)) p3.push(`ref ${i} is never cited`); });
    add('every section cited', p3);

    // 4. Quotes: at most one, under fifteen words, inside a cited section
    const quotes = body.match(/“[^”]+”|"[^"]+"/g) || [];
    const p4 = [];
    if (quotes.length > 1) p4.push(`${quotes.length} quotations (at most one)`);
    for (const q of quotes) if (words(q).length >= 15) p4.push(`quotation of ${words(q).length} words`);
    add('quotation limits', p4);

    // 5. Original among articles: no run of seven words shared with another article
    const p5 = [];
    for (const s of shingles(body)) { const ids = bySh.get(s); if (ids && ids.size > 1) p5.push(`"${s}" also in ${[...ids].filter((x) => x !== a.id).join(', ')}`); }
    add('original among articles', p5.slice(0, 3));

    // 6. Original against the app's own texts: no seven-word run copied from the prayer translations or the calendar pages
    const p6 = [];
    for (const s of shingles(body)) { if (corpusSh.has(s)) p6.push(`"${s}" is in the prayer translations`); if (appSh.has(s)) p6.push(`"${s}" is in the calendar day pages`); }
    add('original against app texts', p6.slice(0, 3));

    // 7. No stock machine phrasing
    const low = ` ${text.toLowerCase().replace(/[’]/g, "'")} `;
    const p7 = STOCK_PHRASES.filter((ph) => new RegExp(`[^a-z]${ph.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^a-z]`).test(low));
    add('no stock phrasing', p7.map((x) => `"${x}"`));

    // 8. Rhythm of a person writing: varied sentence lengths, no dashes standing in for commas, no run of same openings
    const p8 = [], ss = sentences(body), lens = ss.map((s) => words(s).length);
    const mean = lens.reduce((x, y) => x + y, 0) / (lens.length || 1);
    const sd = Math.sqrt(lens.reduce((x, y) => x + (y - mean) ** 2, 0) / (lens.length || 1));
    if (mean < 7 || mean > 21) p8.push(`average sentence ${mean.toFixed(1)} words (7 to 21)`);
    if (sd < 4) p8.push(`sentence lengths too even (spread ${sd.toFixed(1)}, at least 4)`);
    if (/[—–]/.test(body)) p8.push('dashes in running text');
    if ((body.match(/;/g) || []).length > 3) p8.push('too many semicolons');
    for (let i = 2; i < ss.length; i++) { const f = (s) => words(s)[0]; if (f(ss[i]) && f(ss[i]) === f(ss[i - 1]) && f(ss[i]) === f(ss[i - 2])) p8.push(`three sentences in a row start with "${f(ss[i])}"`); }
    add('human rhythm', p8);

    // 9. Plain English and plain attribution: easy reading, no hedges, no asterisks, at most one exclamation mark
    const p9 = [], fre = flesch(body);
    if (fre < 60) p9.push(`reading ease ${fre} (60 or more)`);
    for (const hg of HEDGES) if (low.includes(` ${hg} `) || low.includes(` ${hg},`)) p9.push(`hedge "${hg}"`);
    if (/\*/.test(text)) p9.push('asterisk');
    if ((body.match(/!/g) || []).length > 1) p9.push('more than one exclamation mark');
    add('plain English', p9);

    // 10. Hebrew terms: pointed Hebrew, a transliteration that appears in the article, an English meaning
    const p10 = [];
    for (const t of a.terms || []) {
      if (!t.he || !/^[֐-׿\s״׳־]+$/.test(t.he)) p10.push(`"${t.he}": Hebrew letters only`);
      else if (!NIQQUD.test(t.he)) p10.push(`"${t.he}": needs vowel marks`);
      if (!t.tr || !t.en) p10.push(`"${t.he}": needs transliteration and meaning`);
      else if (!text.toLowerCase().includes(t.tr.toLowerCase().split(' ')[0])) p10.push(`term "${t.tr}" is not used in the article`);
    }
    add('Hebrew terms', p10);

    return { id: a.id, title: a.title, checks };
  });
}

/** Library-wide: unique ids and no duplicate titles. */
export function checkLibrary(lib = read('data/library/articles.json')) {
  const ids = lib.articles.map((a) => a.id), titles = lib.articles.map((a) => a.title);
  const p = [];
  if (new Set(ids).size !== ids.length) p.push('duplicate ids');
  if (new Set(titles).size !== titles.length) p.push('duplicate titles');
  return p;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const report = checkArticles(), lib = checkLibrary();
  if (process.argv.includes('--json')) { console.log(JSON.stringify({ report, library: lib }, null, 1)); }
  else {
    for (const r of report) {
      const bad = r.checks.filter((c) => !c.ok);
      console.log(`${bad.length ? 'FAIL' : 'pass'}  ${r.id}  (${r.checks.length - bad.length}/${r.checks.length})`);
      for (const c of bad) console.log(`      ${c.name}: ${c.detail}`);
    }
    if (lib.length) console.log('library:', lib.join('; '));
  }
  const failed = report.some((r) => r.checks.some((c) => !c.ok)) || lib.length > 0;
  process.exit(failed ? 1 : 0);
}
