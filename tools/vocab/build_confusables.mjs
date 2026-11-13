// Confusing pairs (vocabulary systems P6): words a learner mixes up, found by rule over the word list. Nothing is hand-picked.
//
//   node tools/vocab/build_confusables.mjs            writes data/vocab/confusables.json
//   node tools/vocab/build_confusables.mjs --check    exits 1 when the file is stale
//
// Three kinds of pair, each from data/vocab/words.json only:
//   look   the spellings without vowel marks differ by one letter (אח / אח־ר is not one; דבר / דבש is), or by two neighbours swapped
//   sound  the "sounds like" spellings are the same or one sound apart, while the Hebrew letters differ
//   same   the letters are the same and the vowel marks differ (two words that look alike in unpointed print)
// A pair is dropped when the two entries mean the same thing in English, when either is hidden or more than one word, and when both
// come from one family (a word and its own feminine or plural is not a confusion). The most common words come first; a word joins at
// most MAX_PER_WORD pairs of a kind, and each kind is cut at MAX_PER_KIND, so the file stays small enough to fetch on one tap.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { lintString } from '../hebrew-lint/lint.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const OUT = 'data/vocab/confusables.json';
export const MAX_PER_KIND = 400, MAX_PER_WORD = 2, MAX_RANK = 4000;

const FINAL = { ך: 'כ', ם: 'מ', ן: 'נ', ף: 'פ', ץ: 'צ' };
/** Letters only, final forms folded, so that מלך and מלכ compare letter by letter. */
export const letters = (s) => [...String(s || '').normalize('NFC')].filter((c) => c >= 'א' && c <= 'ת').map((c) => FINAL[c] || c).join('');
/** Letter shapes that are mistaken for each other on the page. A look pair on one of these sorts ahead of other one-letter pairs. */
export const SHAPES = ['בכ', 'דר', 'הח', 'חת', 'הת', 'וז', 'ונ', 'וי', 'גנ', 'סמ', 'עצ', 'טמ', 'כנ', 'זנ', 'שע'];
const shapeAlike = (a, b) => SHAPES.some((p) => p.includes(a) && p.includes(b));
/** "Sounds like" spelling reduced to sounds: lower case, no marks, kh and ch as one sound, tz as one sound, doubled letters once. */
export const sounds = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[^a-z]/g, '').replace(/kh|ch/g, 'x').replace(/tz|ts/g, 'c').replace(/sh/g, 'S').replace(/(.)\1+/g, '$1');

/** One substitution or one swap of neighbours between two strings of equal length; returns what differs, or null. */
export function oneApart(a, b) {
  if (a.length !== b.length || a === b) return null;
  const d = []; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d.push(i);
  if (d.length === 1) return { type: 'letter', at: d[0], a: a[d[0]], b: b[d[0]] };
  if (d.length === 2 && d[1] === d[0] + 1 && a[d[0]] === b[d[1]] && a[d[1]] === b[d[0]]) return { type: 'swap', at: d[0], a: a.slice(d[0], d[1] + 1), b: b.slice(d[0], d[1] + 1) };
  return null;
}
/** One sound apart, also allowing one sound added or dropped. */
export function soundApart(a, b) {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 1) return null;
  if (a.length === b.length) { let d = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++; return d === 1 ? 1 : null; }
  const [s, l] = a.length < b.length ? [a, b] : [b, a];
  let i = 0; while (i < s.length && s[i] === l[i]) i++;
  return s.slice(i) === l.slice(i + 1) ? 1 : null;
}

const meaning = (w) => new Set([w.en, ...(w.alt || [])].join(',').toLowerCase().replace(/\([^)]*\)/g, ' ').split(/[,;/]/).map((s) => s.trim().replace(/^(to|a|an|the) /, '')).filter(Boolean));
const sameMeaning = (a, b) => { const x = meaning(a); for (const m of meaning(b)) if (x.has(m)) return true; return false; };
const rank = (w) => (Number.isFinite(w.frequencyRank) ? w.frequencyRank : 99999);

const ID = { look: 'l', sound: 's', same: 'v' };
const NAME = new Set(['יהוה', 'יהוי']);

export function eligible(w) {
  return w.kind === 'word' && !NAME.has(letters(w.heUnpointed || w.he)) && !lintString(w.he).some((f) => f.rule === 'conflicting-marks') && !(w.flags && w.flags.hidden) && !/[\s־]/.test(w.he.trim()) && rank(w) <= MAX_RANK && letters(w.heUnpointed || w.he).length >= 2 && !!w.en && !!w.translit;
}

/** @returns {{schema:string, source:string, rule:string, counts:Record<string,number>, words:Record<string,any>, pairs:any[]}} */
export function build(words) {
  const pool = words.filter(eligible).map((w) => ({ w, L: letters(w.heUnpointed || w.he), S: sounds(w.translit), r: rank(w) })).sort((a, b) => a.r - b.r || (a.w.id < b.w.id ? -1 : 1));
  const found = { look: [], sound: [], same: [] };
  const ok = (x, y) => x.w.id !== y.w.id && !sameMeaning(x.w, y.w) && !(x.w.root && x.w.root === y.w.root) && x.w.he !== y.w.he;
  const score = (x, y) => Math.max(x.r, y.r);
  // same letters, different vowel marks
  const byL = new Map(); for (const x of pool) { if (!byL.has(x.L)) byL.set(x.L, []); byL.get(x.L).push(x); }
  for (const g of byL.values()) for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) if (ok(g[i], g[j])) found.same.push({ x: g[i], y: g[j], s: score(g[i], g[j]) });
  // one letter apart: bucket by the spelling with one position blanked, so the pool is not compared all against all
  const seen = new Set(), key = (x, y) => (x.w.id < y.w.id ? x.w.id + y.w.id : y.w.id + x.w.id);
  const blank = new Map();
  for (const x of pool) { if (x.L.length < 3) continue; for (let i = 0; i < x.L.length; i++) { const k = x.L.slice(0, i) + '_' + x.L.slice(i + 1); if (!blank.has(k)) blank.set(k, []); blank.get(k).push(x); } }
  for (const g of blank.values()) for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) {
    const x = g[i], y = g[j], d = oneApart(x.L, y.L);
    if (!d || !ok(x, y) || seen.has(key(x, y))) continue;
    seen.add(key(x, y));
    found.look.push({ x, y, s: score(x, y) - (shapeAlike(d.a, d.b) ? 5000 : 0), diff: d });
  }
  const sorted = new Map(); for (const x of pool) { if (x.L.length < 3) continue; const k = [...x.L].sort().join(''); if (!sorted.has(k)) sorted.set(k, []); sorted.get(k).push(x); }
  for (const g of sorted.values()) for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) {
    const x = g[i], y = g[j], d = oneApart(x.L, y.L);
    if (!d || d.type !== 'swap' || !ok(x, y) || seen.has(key(x, y))) continue;
    seen.add(key(x, y)); found.look.push({ x, y, s: score(x, y), diff: d });
  }
  // sound alike: same sounds, or one sound apart for words of four sounds or more, and not already the same letters
  const byS = new Map(); for (const x of pool) { if (x.S.length < 2) continue; if (!byS.has(x.S)) byS.set(x.S, []); byS.get(x.S).push(x); }
  for (const g of byS.values()) for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) if (ok(g[i], g[j]) && g[i].L !== g[j].L) found.sound.push({ x: g[i], y: g[j], s: score(g[i], g[j]) - 5000, diff: { type: 'same-sound' } });
  const sblank = new Map();
  for (const x of pool) { if (x.S.length < 4) continue; for (let i = 0; i < x.S.length; i++) { const k = x.S.slice(0, i) + '_' + x.S.slice(i + 1); if (!sblank.has(k)) sblank.set(k, []); sblank.get(k).push(x); } }
  const sseen = new Set();
  for (const g of sblank.values()) for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) {
    const x = g[i], y = g[j];
    if (x.S.length !== y.S.length || x.S === y.S || x.L === y.L || !ok(x, y) || sseen.has(key(x, y)) || seen.has(key(x, y))) continue;
    sseen.add(key(x, y)); found.sound.push({ x, y, s: score(x, y), diff: { type: 'near-sound' } });
  }
  const pairs = [], used = {};
  for (const kind of ['look', 'sound', 'same']) {
    const per = new Map(); let n = 0;
    for (const p of found[kind].sort((a, b) => a.s - b.s || (key(a.x, a.y) < key(b.x, b.y) ? -1 : 1))) {
      if (n >= MAX_PER_KIND) break;
      if ((per.get(p.x.w.id) || 0) >= MAX_PER_WORD || (per.get(p.y.w.id) || 0) >= MAX_PER_WORD) continue;
      per.set(p.x.w.id, (per.get(p.x.w.id) || 0) + 1); per.set(p.y.w.id, (per.get(p.y.w.id) || 0) + 1);
      const row = { id: `${ID[kind]}${String(n + 1).padStart(3, '0')}`, kind, a: p.x.w.id, b: p.y.w.id };
      if (p.diff && p.diff.a) row.differs = [p.diff.a, p.diff.b];
      if (p.diff && p.diff.type === 'swap') row.swap = true;
      if (p.diff && p.diff.type === 'same-sound') row.sameSound = true;
      pairs.push(row); used[p.x.w.id] = p.x.w; used[p.y.w.id] = p.y.w; n++;
    }
  }
  const mini = {};
  for (const id of Object.keys(used).sort()) { const w = used[id]; mini[id] = { he: w.he, translit: w.translit, en: w.en, pos: w.pos, rank: w.frequencyRank }; }
  const counts = { pairs: pairs.length, words: Object.keys(mini).length };
  for (const k of ['look', 'sound', 'same']) counts[k] = pairs.filter((p) => p.kind === k).length;
  return { schema: 'alef.vocab.confusables/1', source: 'data/vocab/words.json', rule: 'tools/vocab/build_confusables.mjs: pairs are found by rule (spelling one letter apart, sounds the same or one sound apart, same letters with different vowel marks). Nobody picked or checked them by hand.', counts, words: mini, pairs };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const words = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/vocab/words.json'), 'utf8')).words;
  const text = JSON.stringify(build(words)) + '\n';
  const file = path.join(ROOT, OUT);
  if (process.argv.includes('--check')) { const cur = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''; if (cur !== text) { console.error(`${OUT} is stale: run node tools/vocab/build_confusables.mjs`); process.exit(1); } console.log(`${OUT} is current`); } else { fs.writeFileSync(file, text); console.log(`${OUT}: ${JSON.stringify(JSON.parse(text).counts)}, ${text.length} bytes`); }
}
