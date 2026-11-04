#!/usr/bin/env node
// Minimal pairs from EXISTING vocab only -> data/speak/minimal-pairs.json
//
//   node tools/pronunciation/build_minimal_pairs.mjs         writes the file
//   node tools/pronunciation/build_minimal_pairs.mjs --dry   prints counts
//
// A pair is two different words.json entries (single pointed words, different glosses) whose letter-by-letter
// pointing is identical except for ONE feature at ONE position (e.g. dagesh on a bet, the dot on a shin).
// Whether the pair can be HEARD in a tradition is computed from the rule-generated IPA in build_variants.mjs
// (stress and syllable dots ignored); it is stated per pair and per tradition. All of it is rule-generated and
// has not been checked by a native speaker; the pointing of the source words is the only authority.

import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { parseWord, stripTaamim } from '../../src/pronunciation/hebrew.js';
import { buildAll, ROOT, TRADITIONS } from './build_variants.mjs';

export const OUT = join(ROOT, 'data', 'speak', 'minimal-pairs.json');
export const MAX_PER_CONTRAST = 40;

const MARK = { shva: 'ְ', 'chataf-segol': 'ֱ', 'chataf-patach': 'ֲ', 'chataf-kamatz': 'ֳ', chirik: 'ִ', tzere: 'ֵ', segol: 'ֶ', patach: 'ַ', kamatz: 'ָ', cholam: 'ֹ', kubutz: 'ֻ', 'kamatz-katan': 'ׇ' };
const tok = (c, { letter = true, dagesh = true, dot = true, vowel = true } = {}) =>
  (letter ? c.ch : '?') + (dot && c.dot ? (c.dot === 'shin' ? 'ׁ' : 'ׂ') : '') + (dagesh && c.dagesh ? 'ּ' : '') + (vowel && c.vowel ? MARK[c.vowel] : '');
const FOLD = { ך: 'כ', ם: 'מ', ן: 'נ', ף: 'פ', ץ: 'צ' };

/**
 * Contrast definitions. `value(c)` returns the feature value of cluster c, or null when c is not eligible;
 * `mask` says which parts of the cluster are NOT part of the key (the feature itself).
 * `heard` is the textbook statement per tradition (from data/pronunciation/consonants.json and niqqud.json).
 */
export const CONTRASTS = [
  { id: 'bet-vet', title: 'Bet or vet', feature: 'dagesh on ב', mask: { dagesh: false }, value: (c) => (c.ch === 'ב' ? (c.dagesh ? 'b' : 'v') : null),
    heard: { israeli: 'b with the dot, v without', sephardi: 'b with the dot, v without (Spanish-Portuguese [b~β] not generated)', ashkenazi: 'b with the dot, v without' } },
  { id: 'kaf-khaf', title: 'Kaf or khaf', feature: 'dagesh on כ / ך', mask: { dagesh: false, letter: false }, value: (c) => (c.ch === 'כ' || c.ch === 'ך' ? (c.dagesh ? 'k' : 'kh') : null), fold: true,
    heard: { israeli: 'k with the dot, throaty kh [χ] without', sephardi: 'k with the dot, [x] without', ashkenazi: 'k with the dot, [x] without' } },
  { id: 'pe-fe', title: 'Pe or fe', feature: 'dagesh on פ / ף', mask: { dagesh: false, letter: false }, value: (c) => (c.ch === 'פ' || c.ch === 'ף' ? (c.dagesh ? 'p' : 'f') : null), fold: true,
    heard: { israeli: 'p with the dot, f without', sephardi: 'p with the dot, f without', ashkenazi: 'p with the dot, f without' } },
  { id: 'shin-sin', title: 'Shin or sin', feature: 'dot on ש', mask: { dot: false }, value: (c) => (c.ch === 'ש' && c.dot ? c.dot : null),
    heard: { israeli: 'sh [ʃ] with the right dot, s with the left dot', sephardi: 'same', ashkenazi: 'same' } },
  { id: 'het-khaf', title: 'Het or khaf', feature: 'ח vs כ / ך (no dagesh)', mask: { letter: false }, value: (c) => (c.ch === 'ח' && !c.dagesh ? 'het' : (c.ch === 'כ' || c.ch === 'ך') && !c.dagesh ? 'khaf' : null), fold: true,
    heard: { israeli: 'NOT audible: both are [χ] (merged)', sephardi: 'het is pharyngeal [ħ], khaf is velar [x]; only for speakers who keep the pharyngeal', ashkenazi: 'NOT audible: both are [x] (pharyngeal het is "seldom observed in practice")' } },
  { id: 'tav-sav', title: 'Tav or sav (dagesh on ת)', feature: 'dagesh on ת', mask: { dagesh: false }, value: (c) => (c.ch === 'ת' ? (c.dagesh ? 'tav' : 'sav') : null),
    heard: { israeli: 'NOT audible: both [t]', sephardi: 'NOT audible: both [t] (θ / d communities not generated)', ashkenazi: 't with the dot, s without the dot' } },
  { id: 'alef-ayin', title: 'Alef or ayin', feature: 'א vs ע', mask: { letter: false }, value: (c) => ((c.ch === 'א' || c.ch === 'ע') && !c.dagesh ? (c.ch === 'א' ? 'alef' : 'ayin') : null), fold: true,
    heard: { israeli: 'NOT audible: both silent or a glottal stop', sephardi: 'alef is a glottal stop [ʔ], ayin is pharyngeal [ʕ]', ashkenazi: 'NOT audible: both silent' } },
  { id: 'kamatz-patach', title: 'Kamatz or patach', feature: 'ָ vs ַ', mask: { vowel: false }, value: (c) => (c.vowel === 'kamatz' ? 'kamatz' : c.vowel === 'patach' ? 'patach' : null),
    heard: { israeli: 'NOT audible: both [a]', sephardi: 'NOT audible: both [a] (length not generated)', ashkenazi: 'kamatz [ɔ] (o as in "saw"), patach [a]' } },
  { id: 'tzere-segol', title: 'Tzere or segol', feature: 'ֵ vs ֶ', mask: { vowel: false }, value: (c) => (c.vowel === 'tzere' ? 'tzere' : c.vowel === 'segol' ? 'segol' : null),
    heard: { israeli: 'NOT audible: both [e]', sephardi: 'NOT audible: both [e] (length not generated)', ashkenazi: 'tzere [ej] ("ay"), segol [e]' } },
];

const STOP = new Set(['that', 'this', 'with', 'from', 'have', 'been', 'used', 'into', 'there', 'their', 'which', 'something', 'someone', 'about']);
const senseWords = (en) => new Set(String(en).toLowerCase().split(/[^a-z]+/).filter((x) => x.length >= 4 && !STOP.has(x)));
/** Glosses that share a content word are treated as spelling variants of one sense, not as a minimal pair. */
const sharesSense = (a, b) => { const A = senseWords(a); for (const w of senseWords(b)) if (A.has(w)) return true; return false; };
const strip = (ipa) => ipa.replace(/[ˈ.]/g, '');

function clusterKey(clusters, i, def) {
  return clusters.map((c, k) => {
    if (k !== i) return tok(c);
    const m = def.mask;
    return tok(c, { letter: m.letter !== false, dagesh: m.dagesh !== false, dot: m.dot !== false, vowel: m.vowel !== false });
  }).join('|');
}

export function buildPairs() {
  const built = buildAll();
  const words = JSON.parse(readFileSync(join(ROOT, 'data/vocab/words.json'), 'utf8')).words;
  const info = new Map(words.map((w) => [w.id, w]));
  const cand = [];
  for (const rec of built.records) {
    if (rec.source !== 'vocab' || rec.kind !== 'word') continue;
    const r = built.rendered.get(rec.id);
    if (r.perWord.length !== 1 || rec.flags.includes('unpointed') || rec.flags.includes('divine-name') || rec.flags.includes('kamatz-katan-list')) continue;
    const w = info.get(rec.id);
    if (!w || !w.en) continue;
    cand.push({ rec, w, clusters: parseWord(stripTaamim(w.he)) });
  }
  const contrasts = [];
  const counts = {};
  for (const def of CONTRASTS) {
    /** key -> value -> [cand] */
    const groups = new Map();
    for (const c of cand) {
      c.clusters.forEach((cl, i) => {
        const v = def.value(cl);
        if (v === null) return;
        const k = i + ':' + clusterKey(c.clusters, i, def);
        if (!groups.has(k)) groups.set(k, new Map());
        const g = groups.get(k);
        if (!g.has(v)) g.set(v, []);
        g.get(v).push({ ...c, pos: i, value: v });
      });
    }
    const pairs = [];
    const seen = new Set();
    for (const [k, g] of groups) {
      const vals = [...g.keys()].sort();
      for (let x = 0; x < vals.length; x++) for (let y = x + 1; y < vals.length; y++) {
        const byRank = (arr) => arr.slice().sort((p, q) => p.w.frequencyRank - q.w.frequencyRank || (p.w.id < q.w.id ? -1 : 1));
        for (const A of byRank(g.get(vals[x]))) for (const B of byRank(g.get(vals[y]))) {
          if (A.w.id === B.w.id || A.w.he === B.w.he || A.w.en === B.w.en || sharesSense(A.w.en, B.w.en)) continue;
          const id = [A.w.id, B.w.id].sort().join('+');
          if (seen.has(id)) continue; seen.add(id);
          const audible = {};
          for (const t of TRADITIONS) audible[t] = strip(A.rec.variants[t].ipa) !== strip(B.rec.variants[t].ipa);
          if (!Object.values(audible).some(Boolean)) continue;
          pairs.push({ a: A, b: B, audible, rank: A.w.frequencyRank + B.w.frequencyRank, id });
        }
      }
    }
    pairs.sort((p, q) => p.rank - q.rank || (p.id < q.id ? -1 : 1));
    counts[def.id] = pairs.length;
    // diversity: a word appears in at most 2 shown pairs per contrast
    const used = new Map(); const shownPairs = [];
    for (const p of pairs) {
      if ((used.get(p.a.w.id) ?? 0) >= 2 || (used.get(p.b.w.id) ?? 0) >= 2) continue;
      used.set(p.a.w.id, (used.get(p.a.w.id) ?? 0) + 1); used.set(p.b.w.id, (used.get(p.b.w.id) ?? 0) + 1);
      shownPairs.push(p);
      if (shownPairs.length >= MAX_PER_CONTRAST) break;
    }
    const side = (x) => ({ id: x.w.id, he: x.w.he.normalize('NFC'), en: x.w.en, is: x.value, ipa: TRADITIONS.map((t) => x.rec.variants[t].ipa), simple: TRADITIONS.map((t) => x.rec.variants[t].simple) });
    contrasts.push({
      id: def.id, title: def.title, feature: def.feature, heard: def.heard, available: pairs.length,
      pairs: shownPairs.map((p) => ({ a: side(p.a), b: side(p.b), audible: TRADITIONS.map((t) => p.audible[t]) })),
    });
  }
  const out = {
    schema: 'alef-minimal-pairs/1',
    proofread: false,
    note: 'Rule-generated from the niqqud text of existing data/vocab/words.json entries; not verified by a native speaker; no recordings exist. A pair is two single words whose pointing differs at one position only. ipa, simple and audible are arrays in the order given by `traditions`; audible[i] is true when the rule-generated IPA differs (stress ignored) in that tradition, so a pair can be a real minimal pair in one tradition and a homophone pair in another. Pairs are the most frequent available (words.json frequencyRank sum), capped per contrast; `available` is the uncapped count. Glosses are from words.json and may not distinguish homographs.',
    traditions: TRADITIONS,
    contrasts,
  };
  return { out, counts };
}

/** Header and contrast fields indented, one pair per line. */
export function minimalPairsJson(out) {
  const { contrasts, ...head } = out;
  const cs = contrasts.map((c) => { const { pairs, ...ch } = c; return JSON.stringify(ch).slice(0, -1) + ',"pairs":[\n' + pairs.map((p) => '   ' + JSON.stringify(p)).join(',\n') + '\n  ]}'; });
  return JSON.stringify(head, null, 1).slice(0, -2) + ',\n "contrasts": [\n  ' + cs.join(',\n  ') + '\n ]\n}\n';
}

export function writeMinimalPairs() {
  const { out, counts } = buildPairs();
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, minimalPairsJson(out));
  return { out, counts };
}

import { fileURLToPath } from 'node:url';
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { out, counts } = process.argv.includes('--dry') ? buildPairs() : writeMinimalPairs();
  console.log(JSON.stringify({ shown: Object.fromEntries(out.contrasts.map((c) => [c.id, c.pairs.length])), available: counts }));
}
