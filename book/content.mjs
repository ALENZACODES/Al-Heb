// Data-derived book content (pure functions over data/*.json). Nothing here invents Hebrew: every Hebrew string
// comes from data/corpus, data/curriculum, data/letters or data/pronunciation.
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transliterate } from '../src/pronunciation/transliterate.js';
import { LETTERS } from '../tools/images/spec.mjs';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const readJson = (p) => { const f = join(ROOT, p); if (!existsSync(f)) return null; try { return JSON.parse(readFileSync(f, 'utf8')); } catch { return null; } };

const FINAL = { 'kaf-final': 'ך', 'mem-final': 'ם', 'nun-final': 'ן', 'pe-final': 'ף', 'tsadi-final': 'ץ' };
const BASE = { alef: 'א', bet: 'ב', gimel: 'ג', dalet: 'ד', he: 'ה', vav: 'ו', zayin: 'ז', chet: 'ח', tet: 'ט', yod: 'י', kaf: 'כ', lamed: 'ל', mem: 'מ', nun: 'נ', samekh: 'ס', ayin: 'ע', pe: 'פ', tsadi: 'צ', qof: 'ק', resh: 'ר', shin: 'ש', tav: 'ת' };
export const skeleton = (s) => s.replace(/[֑-ׇ]/g, '');
const norm = (s) => String(s).toLowerCase().replace(/[^a-z]/g, '');
const POINTED = /[ְ-ּ]/;

/** Every standalone pointed word (no spaces) in phrasebook + lesson words, with gloss and transliteration. */
export function wordPool() {
  const pool = new Map();
  const add = (he, en, tr, src, curated) => {
    const h = he.replace(/[?!.,׃\s]+$/g, '');
    if (!h || /\s/.test(h) || !POINTED.test(h) || skeleton(h) === 'יהוה') return;
    if (pool.has(h)) return;
    const translit = tr || transliterate(h, { scheme: 'siddur', tradition: 'israeli' });
    pool.set(h, { he: h, en, translit, source: src, curated: !!tr });
  };
  for (const e of readJson('data/corpus/phrasebook.json')?.entries ?? []) add(e.he, e.en, e.translit, `phrasebook:${e.id}`, true);
  for (const l of readJson('data/curriculum/lessons.json')?.lessons ?? []) for (const w of l.words ?? []) add(w.he, w.en, w.translit, `lessons:${l.id}`, false);
  return [...pool.values()];
}

const WEAK_GLOSS = /^(and|to|the|in|from|of|for|with|he|she|it|they|you|we)\b/i;
/** Pick up to n words that start with the letter (or END with it, for the five final forms). */
export function vocabFor(id, pool = wordPool(), n = 3) {
  const L = LETTERS.find((x) => x.id === id);
  const fin = FINAL[id];
  const ch = fin ?? BASE[id];
  const specTr = (L?.vocab ?? []).map((v) => norm(v[1].split(';')[0]));
  const specEn = (L?.vocab ?? []).map((v) => v[0].toLowerCase().split(' ')[0]);
  const cands = pool.filter((w) => { const s = skeleton(w.he); return fin ? s.endsWith(ch) : s.startsWith(ch); });
  const picIdx = (w) => specTr.findIndex((t, i) => (t && norm(w.translit).startsWith(t)) || (specEn[i].length > 2 && w.en.toLowerCase().split(/[ \/;,]+/).includes(specEn[i])));
  const isPic = (w) => picIdx(w) >= 0;
  const score = (w) => {
    let s = 0;
    if (isPic(w)) s += 10;
    if (w.curated) s += 3;
    if (WEAK_GLOSS.test(w.en)) s -= 3;
    if (skeleton(w.he).length > 6) s -= 2;
    if (/[;\/(]/.test(w.en)) s -= 1;
    return s - skeleton(w.he).length * 0.01;
  };
  const picked = [];
  for (const w of cands.sort((a, b) => score(b) - score(a))) {
    if (picked.some((p) => skeleton(p.he) === skeleton(w.he))) continue;
    picked.push({ ...w, matchesPicture: isPic(w), pictureIndex: picIdx(w) });
    if (picked.length === n) break;
  }
  return picked;
}

const TRAD = { israeli: 'Israeli', sephardi: 'Sephardi', ashkenazi: 'Ashkenazi' };
export function firstSentences(s, max = 230) {
  if (!s) return '';
  if (s.length <= max) return s;
  const parts = s.match(/[^.]+\.?/g) ?? [s]; let out = '';
  for (const p of parts) { if ((out + p).length > max && out) break; out += p; }
  return out.trim();
}
/** Sound explanation for a letter from data/pronunciation/consonants.json. */
export function soundFor(id) {
  const c = readJson('data/pronunciation/consonants.json')?.letters?.[id];
  if (!c) return null;
  const lines = [];
  const variants = (c.variants ?? []).map((v) => `${v.condition}: ${v.english.israeli}`);
  const other = ['sephardi', 'ashkenazi'].filter((t) => c.english[t] && c.english[t] !== c.english.israeli).map((t) => `${TRAD[t]}: ${c.english[t]}`);
  return { main: c.english.israeli, ipa: c.ipa, variants, other, notes: cleanNote(c.notes, 230), verified: c.verified !== false };
}

/** Sentence-bounded note text for print; drops sentences that point at repo internals (src/..., lane N). */
export function cleanNote(s, max = 300) {
  const parts = (String(s ?? '').match(/[^.]+\.?\s*/g) ?? []).filter((x) => !/src\/|\blane[- ]?\d|\.js\b|TODO/i.test(x));
  let out = '';
  for (const p of parts) { if ((out + p).length > max && out) break; out += p; }
  return out.trim();
}
export function vowelRecords() { return readJson('data/pronunciation/niqqud.json')?.records ?? []; }
export function drills() { return readJson('data/pronunciation/drills.json') ?? {}; }
export function consonantFeatures() { return readJson('data/pronunciation/consonants.json')?.features ?? []; }
export function registryEntries() { const r = readJson('data/corpus/registry.json'); return Array.isArray(r) ? r : r?.entries ?? []; }
export function phrasebook() { return readJson('data/corpus/phrasebook.json') ?? { situations: [], entries: [] }; }
export const SITUATION_TITLES = { greetings: 'Greetings', politeness: 'Politeness', fillers: 'Fillers and slang', cafe: 'Cafe and food', shop: 'Shopping', taxi: 'Taxi and transport', directions: 'Directions', numbers: 'Numbers', 'small-talk': 'Small talk', help: 'Help' };

/** The 5,000-word frequency list (data/vocab/vocab5000.json): pointed headword + short gloss, in frequency order. Nothing is written here; the 3 unpointed entries fall back to the bare lemma. */
export function vocab5000() {
  const d = readJson('data/vocab/vocab5000.json');
  const short = (g) => { const t = String(g ?? '').replace(/\s+/g, ' ').trim(); if (t.length <= 52) return t; const cut = t.slice(0, 52); const i = Math.max(cut.lastIndexOf(','), cut.lastIndexOf(';')); return (i > 20 ? cut.slice(0, i) : cut.replace(/\s+\S*$/, '')) + '\u2026'; };
  return (d?.entries ?? []).map((e) => ({ rank: e.rank, he: e.pointed || e.lemma, gloss: short(e.gloss), pos: e.pos, tier: e.tier }));
}
