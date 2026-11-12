// Reading Tools drills: pure question builders. No DOM, no network. Every answer is read from data the app already holds:
//   B4 sh'va detective: verdicts and rule texts from src/pronunciation/shva.js (the app's own rule set, level 2), on the words of
//      data/games/g1/words.json and data/nikkudfade/reading-set.json. Verdicts that rest on a guessed stress (rule L3) are left out.
//   B5 final forms and dagesh: the five final-form pairs and the sounds in data/letters/letters.json; the "pick" and "type" items
//      blank one letter of a real word from the same word lists, and the answer is the letter the word is spelled with.
//   G7 stress: data/readlab/stress-words.json (stress from the word list's IPA). A word without IPA stress may be drilled only with
//      the app's computed stress, and every such item says "computed".
import { parseWord, LETTER_ID } from '../pronunciation/hebrew.js';
import { classifyShvas, SHVA_RULES } from '../pronunciation/shva.js';
import { chipsFor } from '../pronunciation/syllables.js';
import { letterClusters } from '../games/tg-core.js';
import { hasDivineName } from './words.js';

/** Seeded generator (mulberry32), so tests can fix the order. */
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export const shuffle = (a, r) => { const x = a.slice(); for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };
export const SET_SIZE = 20;

/** Words from the app's word lists: one pointed word each, no four-letter name, deduplicated by spelling. */
export function wordPool(...lists) {
  const seen = new Set(), out = [];
  for (const list of lists) for (const w of list?.words || list?.items || []) {
    if (!w || !w.he || !w.en || /\s|־/.test(w.he) || hasDivineName(w.he) || seen.has(w.he)) continue;
    seen.add(w.he); out.push({ id: w.id, he: w.he, translit: w.translit || '', en: String(w.en).split(/[;(]/)[0].trim() });
  }
  return out;
}

// ---------- B4: sh'va detective ----------
const RULE = Object.fromEntries(SHVA_RULES.map((r) => [r.id, r]));
/** The rules the drill uses, stated once: the implemented rules except the stress-guess one. */
export const SHVA_DRILL_RULES = Object.freeze(SHVA_RULES.filter((r) => r.status === 'implemented'));
/** Rules the app has not implemented, listed so the learner knows the drill does not cover them. */
export const SHVA_NOT_COVERED = Object.freeze(SHVA_RULES.filter((r) => r.status !== 'implemented'));
/** Plain names for the two answers. */
export const SHVA_ANSWERS = Object.freeze([{ id: 'na', label: 'Said (sh\'va na)' }, { id: 'nach', label: 'Silent (sh\'va nach)' }]);

/** Every settled sh'va in a word: [{at, na, rule}], heuristic verdicts left out. */
export function shvaVerdicts(he) {
  const out = [];
  for (const [i, v] of classifyShvas(parseWord(he), { level: 2 })) if (!v.heuristic && RULE[v.rule]?.status === 'implemented') out.push({ at: i, na: v.na, rule: v.rule });
  return out;
}
/** All drill items over a pool: one item per sh'va. */
export function shvaItems(pool) {
  const out = [];
  for (const w of pool) for (const v of shvaVerdicts(w.he)) out.push({ ...w, key: `${w.he}|${v.at}`, at: v.at, answer: v.na ? 'na' : 'nach', rule: v.rule, ruleText: RULE[v.rule].text });
  return out;
}
/**
 * A set of `size` items, rare rules first so every rule the pool holds appears (round-robin over rules), then shuffled.
 * @returns {any[]}
 */
export function shvaSet(items, { size = SET_SIZE, seed = 1 } = {}) {
  const r = rng(seed);
  const by = new Map();
  for (const it of shuffle(items, r)) { if (!by.has(it.rule)) by.set(it.rule, []); by.get(it.rule).push(it); }
  const rules = [...by.keys()].sort((a, b) => by.get(a).length - by.get(b).length);
  const out = [], used = new Set();
  for (let k = 0; out.length < size && k < size * rules.length; k++) {
    const list = by.get(rules[k % rules.length]);
    while (list.length && used.has(list[0].he)) list.shift();
    if (list.length) { const it = list.shift(); used.add(it.he); out.push(it); }
  }
  return shuffle(out, r);
}
/** The word split into letter clusters, with the asked one marked. */
export const shvaDisplay = (item) => letterClusters(item.he).map((c, i) => ({ text: c.text, mark: i === item.at }));

// ---------- B5: final forms and dagesh ----------
export const DAGESH_LETTERS = Object.freeze(['bet', 'kaf', 'pe']);
/** Clip ids in the audio list for each dagesh pair: with the dot, without it. */
export const DAGESH_CLIPS = Object.freeze({ bet: ['bet', 'vet'], kaf: ['kaf', 'khaf'], pe: ['pe', 'fe'] });
const DAGESH = 'ּ';
/** The five final-form pairs and the three dagesh letters, from letters.json. */
export function formCards(letters) {
  const L = new Map((letters?.letters || letters || []).map((l) => [l.id, l]));
  const finals = [...L.values()].filter((l) => l.finalOf && L.has(l.finalOf)).map((f) => ({ kind: 'final', id: f.id, base: L.get(f.finalOf), final: f }));
  const dagesh = DAGESH_LETTERS.filter((id) => L.has(id)).map((id) => ({ kind: 'dagesh', id, letter: L.get(id), withDot: L.get(id).he + DAGESH, without: L.get(id).he, clips: DAGESH_CLIPS[id] }));
  return { finals, dagesh };
}
/**
 * "Pick it" and "type it" items: a real word with one letter blanked. For finals: a word ending in a final form, or using the base
 * form inside the word. For dagesh: a word with bet, kaf or pe, with or without the dot. The answer is the word's own spelling.
 */
export function formItems(pool, cards) {
  const finalIds = new Map(cards.finals.map((c) => [c.final.he, c]));
  const baseIds = new Map(cards.finals.map((c) => [c.base.he, c]));
  const items = [];
  for (const w of pool) {
    const cl = letterClusters(w.he);
    cl.forEach((c, i) => {
      if (finalIds.has(c.base) && i === cl.length - 1) items.push({ ...w, kind: 'final', at: i, answer: c.base, card: finalIds.get(c.base), where: 'end' });
      else if (baseIds.has(c.base) && i < cl.length - 1) items.push({ ...w, kind: 'final', at: i, answer: c.base, card: baseIds.get(c.base), where: 'inside' });
      const id = LETTER_ID[c.base];
      if (DAGESH_LETTERS.includes(id)) items.push({ ...w, kind: 'dagesh', at: i, answer: c.text.includes(DAGESH) ? 'dot' : 'nodot', letterId: id });
    });
  }
  return items;
}
/** The word as letter clusters, with the asked cluster replaced by a gap. */
export function blanked(item) {
  return letterClusters(item.he).map((c, i) => (i === item.at ? { text: '_', gap: true } : { text: c.text, gap: false }));
}
export function formSet(items, kind, { size = SET_SIZE, seed = 1 } = {}) {
  const r = rng(seed);
  const pool = items.filter((i) => i.kind === kind);
  // balance the two answers (end/inside or dot/no dot) as far as the pool allows, one item per word
  const groups = new Map();
  for (const it of shuffle(pool, r)) { const k = it.kind === 'final' ? `${it.card.id}|${it.where}` : `${it.letterId}|${it.answer}`; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(it); }
  const keys = shuffle([...groups.keys()], r), out = [], used = new Set();
  for (let k = 0; out.length < size && k < size * keys.length; k++) {
    const list = groups.get(keys[k % keys.length]);
    while (list.length && used.has(list[0].he)) list.shift();
    if (list.length) { const it = list.shift(); used.add(it.he); out.push(it); }
  }
  return shuffle(out, r);
}
/** The letter tiles for "type it": the five base forms and the five final forms. */
export const formTiles = (cards) => cards.finals.flatMap((c) => [c.base.he, c.final.he]);

// ---------- G7: stress ----------
/**
 * Stress items. Words from stress-words.json carry the IPA stress (source 'ipa'). `computed` (opt in) adds words from the pool
 * that have no IPA stress, with the app's default rule, labelled 'computed'.
 */
export function stressItems(stressFile, { pool = [], computed = false } = {}) {
  const out = (stressFile?.words || []).filter((w) => w && Array.isArray(w.syllables) && w.syllables.length >= 2 && Number.isInteger(w.stress))
    .map((w) => ({ id: w.id, he: w.he, translit: w.translit, en: w.en, syllables: w.syllables, stress: w.stress, source: 'ipa', computedStress: w.computed, ipa: w.ipa }));
  if (computed) {
    const have = new Set(out.map((w) => w.he));
    for (const w of pool) {
      if (have.has(w.he)) continue;
      const c = chipsFor(w.he);
      if (!c.ok || c.syllables.length < 2 || c.syllables.map((s) => s.he).join('') !== w.he) continue;
      out.push({ id: w.id, he: w.he, translit: w.translit, en: w.en, syllables: c.syllables.map((s) => s.he), stress: c.stressIndex, source: 'computed', rule: c.stressRule });
    }
  }
  return out;
}
export function stressSet(items, { size = 10, seed = 1, source = 'ipa' } = {}) {
  return shuffle(items.filter((i) => source === 'any' || i.source === source), rng(seed)).slice(0, size);
}
export const STRESS_SOURCE_TEXT = Object.freeze({
  ipa: 'Stress from the word list\'s pronunciation key (a dictionary source, not checked by a teacher).',
  computed: 'Computed: the app\'s own rule (most words stress the last syllable, with a short list of exceptions). Not taken from a dictionary.',
});

// ---------- B2/B3: syllable clips ----------
/** The five vowel signs the syllable clips use (src/curriculum/ladder.js FAMILY_SIGN): patach, segol, chirik, cholam, kubutz. */
const SYL_SIGN = { a: 'ַ', e: 'ֶ', i: 'ִ', o: 'ֹ', u: 'ֻ' };
const DOTTED = new Set(['bet', 'kaf', 'pe']);
/**
 * The syllable clip id for a syllable, when its spelling is exactly one of the clip spellings (one letter and one of the five
 * signs, as src/curriculum/ladder.js syllableGlyph writes them). Otherwise null: the app has no clip for that syllable.
 */
export function syllableClipId(he) {
  const s = String(he ?? '').normalize('NFC');
  for (const [ch, id] of Object.entries(LETTER_ID)) {
    if (id.endsWith('-final')) continue;
    for (const [fam, sign] of Object.entries(SYL_SIGN)) {
      const glyph = (ch + (DOTTED.has(id) ? DAGESH : '') + (id === 'shin' ? 'ׁ' : '') + sign).normalize('NFC');
      if (glyph === s) return `${id}-${fam}`;
    }
  }
  return null;
}
