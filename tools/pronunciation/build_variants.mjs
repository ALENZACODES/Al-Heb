#!/usr/bin/env node
import { speechText } from '../../src/shell/names.js';
// Rule-generated pronunciation variants (Israeli, Sephardi, Ashkenazi) for every vocab word and corpus phrase.
//
//   node tools/pronunciation/build_variants.mjs            writes data/pronunciation/variants/_*.json + _review.csv
//   node tools/pronunciation/build_variants.mjs --dry      builds in memory and prints counts only
//
// Everything here is produced BY RULE from the niqqud text. No recording and no native speaker has checked any
// output. The rules, their sources and their known gaps are documented in docs/pronunciation/VARIANTS.md.
//
// Reused (read-only) from the existing engine:
//   src/pronunciation/hebrew.js        parseWord / stripTaamim (cluster parser)
//   src/pronunciation/shva.js          classifyShvas (shva na / nach, rules B1-B3, L1-L4, X1)
//   src/pronunciation/kamatz-katan.js  kamatzKatanStemStart (U+05C7 + the four-word list)
//   src/pronunciation/transliterate.js transliterate (the Latin "simple" rendering, siddur / ashkenazi-siddur schemes)
//   src/photo/syllabify.js             syllabifyWord (syllables, matres, furtive patach, dagesh kind) driven by lane 3 shva
//   data/pronunciation/stress.json, prayerwords.json, and the stress marks inside data/vocab/words.json ipa fields
//   data/pronunciation/consonants.json + niqqud.json (the IPA values below are taken from those tables)
//
// Output is deterministic: no timestamps, stable record order, fixed JSON formatting.

import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseWord, stripTaamim } from '../../src/pronunciation/hebrew.js';
import { classifyShvas } from '../../src/pronunciation/shva.js';
import { kamatzKatanStemStart } from '../../src/pronunciation/kamatz-katan.js';
import { transliterate } from '../../src/pronunciation/transliterate.js';
import { syllabifyWord, STRESS_EXCEPTIONS, DIVINE_NAME_READING } from '../../src/photo/syllabify.js';

export const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
export const OUT_DIR = join(ROOT, 'data', 'pronunciation', 'variants');
export const SHARD_SIZE = 2000;
export const RULES_VERSION = 1;
export const TRADITIONS = ['israeli', 'sephardi', 'ashkenazi'];
export const STATUS = 'rule-generated from the niqqud text; not verified by a native speaker; no audio exists';

const readJson = (rel) => JSON.parse(readFileSync(join(ROOT, rel), 'utf8'));
const normKey = (s) => stripTaamim(String(s)).normalize('NFD');

// ---------------------------------------------------------------------------------------------------------------
// Sound tables. Every value is copied from data/pronunciation/consonants.json / niqqud.json (broad transcription:
// the Israeli [e̞] [o̞] of niqqud.json are written e o here). Where a table gives alternatives, the choice is named
// in VARIANTS.md (resh, cholam, chet).
// ---------------------------------------------------------------------------------------------------------------
const CONS = {
  //          israeli  sephardi  ashkenazi
  'ג': ['ɡ', 'ɡ', 'ɡ'], 'ד': ['d', 'd', 'd'], 'ה': ['h', 'h', 'h'], 'ו': ['v', 'v', 'v'], 'ז': ['z', 'z', 'z'],
  'ח': ['χ', 'ħ', 'x'], 'ט': ['t', 't', 't'], 'י': ['j', 'j', 'j'], 'ל': ['l', 'l', 'l'], 'מ': ['m', 'm', 'm'],
  'ם': ['m', 'm', 'm'], 'נ': ['n', 'n', 'n'], 'ן': ['n', 'n', 'n'], 'ס': ['s', 's', 's'], 'צ': ['ts', 'ts', 'ts'],
  'ץ': ['ts', 'ts', 'ts'], 'ק': ['k', 'k', 'k'], 'ר': ['ʁ', 'r', 'r'],
};
const KHAF = ['χ', 'x', 'x'];
const AYIN = ['', 'ʕ', ''];
const Aleph = ['', 'ʔ', ''];
const VOWEL = {
  kamatz: ['a', 'a', 'ɔ'], 'kamatz-katan': ['o', 'ɔ', 'ɔ'], patach: ['a', 'a', 'a'],
  tzere: ['e', 'e', 'ej'], segol: ['e', 'e', 'e'], chirik: ['i', 'i', 'i'],
  cholam: ['o', 'o', 'oj'], kubutz: ['u', 'u', 'u'], shuruk: ['u', 'u', 'u'],
  'chataf-patach': ['a', 'a', 'a'], 'chataf-segol': ['e', 'e', 'e'], 'chataf-kamatz': ['o', 'ɔ', 'ɔ'],
  'shva-na': ['e', 'e', 'ə'],
};
const T = { israeli: 0, sephardi: 1, ashkenazi: 2 };

// ---------------------------------------------------------------------------------------------------------------
// Stress data from existing files (loaded once).
// ---------------------------------------------------------------------------------------------------------------
export function loadStressData() {
  const stress = readJson('data/pronunciation/stress.json');
  const prayer = readJson('data/pronunciation/prayerwords.json');
  const words = readJson('data/vocab/words.json');
  /** @type {Map<string,{fromEnd:number, rule:string}>} key = normKey(pointed word) */
  const milel = new Map();
  const STRESS_WORDS = { first: 'first', last: -1, 'second-to-last': -2 };
  // 1. syllabify.js STRESS_EXCEPTIONS (sourced: séfer)
  for (const [he, k] of Object.entries(STRESS_EXCEPTIONS)) milel.set(normKey(he), { fromEnd: k, rule: 'syllabify.js STRESS_EXCEPTIONS' });
  // 2. data/pronunciation/stress.json (own, unreviewed list)
  for (const e of stress.exceptions) milel.set(normKey(e.he), { fromEnd: e.fromEnd, rule: `stress.json (${e.kind})` });
  // 3. prayerwords.json Israeli stress
  const ashk = new Map();
  for (const w of prayer.words) {
    const i = STRESS_WORDS[w.israeli?.stress];
    if (i !== undefined) milel.set(normKey(w.he), { fromEnd: i, rule: 'prayerwords.json (Israeli)' });
    const a = STRESS_WORDS[w.ashkenazi?.stress];
    if (a !== undefined) ashk.set(normKey(w.he), { fromEnd: a, rule: 'prayerwords.json (Ashkenazi, unreviewed)' });
  }
  // 4. stress marks inside the words.json ipa field (only where that IPA has one form and a stress mark)
  const fromIpa = new Map();
  for (const w of words.words) {
    if (!w.ipa || w.kind !== 'word') continue;
    const p = parseIpaStress(w.ipa);
    if (p) fromIpa.set(normKey(w.he), p);
  }
  return { milel, ashk, fromIpa };
}

/** From an existing words.json ipa string: {syllables, fromEnd} or null when it has no single stressed form. */
export function parseIpaStress(ipa) {
  let s = String(ipa).trim();
  if (s.includes(' ') || s.includes('[')) s = s.split(/\s|\[/)[0];
  s = s.replace(/^\/|\/$/g, '').replace(/[()]/g, '');
  if (!s.includes('ˈ')) return null;
  const nuclei = (x) => (x.match(/[aeiouəɔɛ][̀-ͯ]*/g) || []).length;
  // syllable count: '.' and 'ˈ' are boundaries; inside a piece, each vowel letter is one nucleus except a glide
  const pieces = s.split(/[.ˈ]/).filter(Boolean);
  const total = pieces.reduce((n, p) => n + Math.max(1, nuclei(p)), 0);
  const after = s.slice(s.indexOf('ˈ') + 1).split(/[.ˈ]/).filter(Boolean).reduce((n, p) => n + Math.max(1, nuclei(p)), 0);
  if (!total || !after) return null;
  return { syllables: total, fromEnd: -after, cleaned: s };
}

// ---------------------------------------------------------------------------------------------------------------
// One word
// ---------------------------------------------------------------------------------------------------------------
const isHeb = (c) => c >= '֐' && c <= '׿';
const letterOf = (e) => e.letter;
const isVocalic = (e) => !e.mater && !e.silent && !!e.vowel && (e.vowel !== 'shva' || e.shva === 'na');
const isReduced = (e) => isVocalic(e) && (e.vowel === 'shva' || e.vowel.startsWith('chataf'));

/** Head consonant (first vocalic letter) of a syllable. */
const headOf = (syl) => syl.letters.find(isVocalic) ?? syl.letters[0];
const VOWEL_MARK = { shva: 'ְ', 'chataf-segol': 'ֱ', 'chataf-patach': 'ֲ', 'chataf-kamatz': 'ֳ', chirik: 'ִ', tzere: 'ֵ', segol: 'ֶ', patach: 'ַ', kamatz: 'ָ', cholam: 'ֹ', kubutz: 'ֻ', 'kamatz-katan': 'ָ' };
/** Canonical text of one parseWord cluster: letter, shin/sin dot, dagesh, vowel (a list-derived kamatz katan stays a plain kamatz). */
const clusterText = (c) => c.ch + (c.dot === 'shin' ? 'ׁ' : c.dot === 'sin' ? 'ׂ' : '') + (c.dagesh ? 'ּ' : '') + (c.vowel ? VOWEL_MARK[c.vowel] ?? '' : '');
/** Syllable ends in a vowel (every letter after the head is a mater/silent letter). */
function isOpen(syl) {
  const h = syl.letters.indexOf(headOf(syl));
  return syl.letters.slice(h + 1).every((e) => e.mater || e.silent);
}

/** Everyday respelling policy (docs/pronunciation/DOUBLING-POLICY.md): dagesh chazak is NOT written as a doubled letter,
 *  in any tradition, so the Compare lookup agrees with the stored words.json translit. Doubling is only for a scholarly "rules" display. */
export const GEMINATE = false;

/**
 * Render one pointed Hebrew word (no spaces, no maqaf).
 * @param {string} he
 * @param {{stress:ReturnType<typeof loadStressData>}} ctx
 */
export function renderWord(he, ctx) {
  const flags = new Set();
  const notes = [];
  const original = stripTaamim(he);
  const spoken = speechText(original);
  if (spoken !== original) {
    const rendered = renderWord(spoken, ctx);
    // Match the established conventional name respelling used for the bare name.
    rendered.variants.ashkenazi.simple = rendered.variants.ashkenazi.simple.replace(/adoynoy/g, 'adonoy');
    return { ...rendered, he: original, flags: [...new Set([...rendered.flags, 'divine-name'])] };
  }
  const w = original;
  const probe = syllabifyWord(w, { translit: false, exceptions: {}, readDivineName: true });
  const substituted = probe.length > 0 && probe[0].substituted === true;
  const readAs = substituted ? DIVINE_NAME_READING : w;
  if (substituted) flags.add('divine-name');
  if (!probe.length) {
    flags.add('unpointed');
    const simple = transliterate(w, { scheme: 'siddur', geminate: GEMINATE });
    const simpleA = transliterate(w, { scheme: 'ashkenazi-siddur', cholam: 'oy', geminate: GEMINATE });
    return {
      he: w.normalize('NFC'), syllables: [],
      variants: {
        israeli: { ipa: '', simple, stress: null },
        sephardi: { ipa: '', simple, stress: null },
        ashkenazi: { ipa: '', simple: simpleA, stress: null },
      },
      flags: [...flags], notes, colloquial: '',
    };
  }

  // --- kamatz katan on the lane-3 cluster list: U+05C7 (parseWord gives 'kamatz-katan'), the kamatz-katan.js list,
  //     and a kamatz directly before a chataf-kamatz. Done BEFORE the shva rules so that a shva after a kamatz katan
  //     is not mistaken for a shva after a long vowel (exactly what transliterate.js does).
  const clusters = parseWord(readAs);
  const katanAt = new Set();
  clusters.forEach((c, i) => { if (c.vowel === 'kamatz-katan') katanAt.add(i); });
  const stem = kamatzKatanStemStart(readAs);
  if (stem >= 0) {
    for (let i = stem; i < clusters.length; i++) if (clusters[i].vowel === 'kamatz') { clusters[i].vowel = 'kamatz-katan'; katanAt.add(i); flags.add('kamatz-katan-list'); break; }
  }
  for (let i = 0; i < clusters.length; i++) {
    if (clusters[i].vowel !== 'kamatz') continue;
    const next = clusters.slice(i + 1).find((x) => x.vowel);
    if (next && next.vowel === 'chataf-kamatz') { clusters[i].vowel = 'kamatz-katan'; katanAt.add(i); flags.add('kamatz-katan-before-chataf'); }
  }
  // --- shva na / nach from the existing rule engine (shva.js), one verdict per letter position
  const verdicts = classifyShvas(clusters, { level: 2 });
  for (const v of verdicts.values()) if (v.heuristic) flags.add('shva-heuristic-L3');
  const byPosition = ({ index, clusters: base, all }) => {
    const pos = all.indexOf(base[index]);
    const v = pos >= 0 ? verdicts.get(pos) : undefined;
    return v ? (v.na ? 'na' : 'nach') : undefined;
  };
  const raw = syllabifyWord(w, { translit: false, shvaClassifier: byPosition, exceptions: {}, readDivineName: true });
  const letters = raw.flatMap((s) => s.letters);
  letters.forEach((e, i) => { if (katanAt.has(i) && e.vowel === 'kamatz') e.katan = true; });
  // syllabify.js reads a vav-cholam / shuruk after a SILENT alef as a consonant (מְאוֹד -> me.vod); the vav is a vowel
  // letter for the alef (transliterate.js already reads it so). Repair, then regroup syllables (a vocalic letter
  // starts a syllable, exactly syllabify's rule), and merge a vowel-less first syllable (X1 שְׁתַּיִם) into the next.
  for (let i = 1; i < letters.length - 1; i++) {
    const a = letters[i]; const v = letters[i + 1];
    if (a.letter === 'א' && a.silent && v.letter === 'ו' && !v.mater && !v.silent) {
      if (v.vowel === 'cholam' && !v.dagesh) { delete a.silent; a.vowel = 'cholam'; v.mater = true; v.vowel = null; flags.add('alef-vav-mater-repaired'); }
      else if (v.vowel === 'shuruk' || (v.dagesh && !v.vowel)) { delete a.silent; a.vowel = 'shuruk'; v.mater = true; v.vowel = null; delete v.dagesh; flags.add('alef-vav-mater-repaired'); }
    }
  }
  let syls = [];
  letters.forEach((e, i) => { if (isVocalic(e) || !syls.length) syls.push({ letters: [e], idx: [i] }); else { syls[syls.length - 1].letters.push(e); syls[syls.length - 1].idx.push(i); } });
  if (syls.length > 1 && !syls[0].letters.some(isVocalic)) { syls[1] = { letters: [...syls[0].letters, ...syls[1].letters], idx: [...syls[0].idx, ...syls[1].idx] }; syls.shift(); }
  for (const s of syls) s.he = s.idx.map((i) => clusterText(clusters[i])).join('').normalize('NFC');
  const n = syls.length;

  // --- undotted shin, consonantal vav with cholam/dagesh after a vowel
  for (let i = 0; i < letters.length; i++) {
    const e = letters[i];
    if (e.letter === 'ש' && !e.dot) flags.add('shin-undotted');
    if (e.letter === 'ו' && !e.mater && !e.silent && e.vowel === 'cholam') flags.add('vav-cholam-consonantal');
    if (e.letter === 'ו' && !e.mater && e.dagesh && i > 0) flags.add('vav-dagesh-consonantal');
  }

  // --- final he + patach without mappiq (גָּבֹהַ in the source): read as furtive patach on a pronounced he
  {
    const last = letters[letters.length - 1];
    if (last.letter === 'ה' && last.vowel === 'patach' && !last.dagesh && !last.mater && letters.length > 1) { last.furtive = true; flags.add('he-patach-no-mappiq'); }
  }

  /** IPA of every syllable for one tradition (no stress marks). */
  const sylIpa = (trad, { reduceLast = false, dropShvaNa = false } = {}) => syls.map((syl, si) => {
    const t = T[trad];
    let s = '';
    for (let li = 0; li < syl.letters.length; li++) {
      const e = syl.letters[li];
      if (e.mater || e.silent) continue;
      const L = e.letter;
      let c;
      if (L === 'א') c = e.vowel ? Aleph[t] : '';
      else if (L === 'ע') c = AYIN[t];
      else if (L === 'ב') c = e.dagesh ? 'b' : 'v';
      else if (L === 'כ' || L === 'ך') c = e.dagesh ? 'k' : KHAF[t];
      else if (L === 'פ' || L === 'ף') c = e.dagesh ? 'p' : 'f';
      else if (L === 'ש') c = e.dot === 'sin' ? 's' : 'ʃ';
      else if (L === 'ת') c = trad === 'ashkenazi' && !e.dagesh ? 's' : 't';
      else if (L === 'ו' && e.vowel === 'shuruk' && !e.dagesh && li === 0 && si === 0) c = ''; // conjunction וּ
      else if (L === 'ה' && !e.vowel && !e.dagesh) c = ''; // he without a vowel or mappiq is a vowel letter
      else c = CONS[L]?.[t] ?? '';
      if (L === 'י' && !e.vowel && s.endsWith('j')) c = ''; // oj + yod coda (Ashkenazi goy) -> oj
      let v = '';
      if (e.vowel === 'shva') v = e.shva === 'na' && !dropShvaNa ? VOWEL['shva-na'][t] : '';
      else if (e.vowel === 'kamatz') v = VOWEL[e.katan ? 'kamatz-katan' : 'kamatz'][t];
      else if (e.vowel) v = VOWEL[e.vowel]?.[t] ?? '';
      if (reduceLast && si === n - 1 && e === headOf(syl)) v = 'ə';
      s += e.furtive ? v + c : c + v;
    }
    return s;
  });

  // --- stress
  const key = normKey(readAs);
  const furtiveLast = n > 1 && syls[n - 1].letters.some((e) => e.furtive);
  const clamp = (i) => Math.max(0, Math.min(n - 1, i));
  const fromEndToIdx = (k) => (k === 'first' ? 0 : clamp(n + k));
  /** Israeli / Sephardi: milra unless an existing list says otherwise. */
  let isr = { index: n - 1, rule: 'default milra (final)' };
  const ex = ctx.stress.milel.get(key);
  const ip = ctx.stress.fromIpa.get(key);
  let colloquialMatch = false;
  if (ex) isr = { index: fromEndToIdx(ex.fromEnd), rule: ex.rule };
  else if (ip) {
    const theirs = ipaSkeleton(ip.cleaned);
    const mine = ipaSkeleton(sylIpa('israeli').join(''));
    const mineColloquial = ipaSkeleton(sylIpa('israeli', { dropShvaNa: true }).join(''));
    colloquialMatch = theirs !== mine && theirs === mineColloquial;
    const usable = ip.syllables === n || (colloquialMatch && ip.syllables < n && -ip.fromEnd <= n);
    if (usable) {
      if (ip.fromEnd !== -1) isr = { index: fromEndToIdx(ip.fromEnd), rule: colloquialMatch ? 'words.json ipa stress mark (counted from the end; that ipa drops a shva)' : 'words.json ipa stress mark' };
      else isr = { index: n - 1, rule: 'milra (words.json ipa agrees)' };
      if (colloquialMatch) flags.add('words-ipa-colloquial-shva-drop');
    } else { flags.add('words-ipa-syllable-count-differs'); notes.push(`words.json ipa ${ip.cleaned} has ${ip.syllables} syllables, rules give ${n}`); }
  } else if (furtiveLast) isr = { index: n - 2, rule: 'furtive patach never stressed' };
  if (!ex && !ip && n === 2 && headOf(syls[1]).vowel === 'segol' && !isReduced(headOf(syls[0])) && !furtiveLast) flags.add('possible-segolate');
  /** Ashkenazi: prayerwords.json if listed, else penultimate (skipping shva/chataf syllables). */
  let ash;
  const ax = ctx.stress.ashk.get(key);
  if (ax) ash = { index: fromEndToIdx(ax.fromEnd), rule: ax.rule };
  else if (n === 1) ash = { index: 0, rule: 'monosyllable' };
  else {
    let i = n - 2;
    while (i > 0 && isReduced(headOf(syls[i]))) i--;
    if (isReduced(headOf(syls[i]))) ash = { index: n - 1, rule: 'final (no full-vowel syllable before it)' };
    else ash = { index: i, rule: 'default penultimate (Ashkenazi natural register)' };
  }
  const stressFor = { israeli: isr, sephardi: { ...isr }, ashkenazi: ash };

  // --- Ashkenazi final-syllable reduction: unstressed open final syllable written kamatz + he (or silent alef) -> [ə]
  const lastHead = headOf(syls[n - 1]);
  const lastLetter = syls[n - 1].letters[syls[n - 1].letters.length - 1];
  const ashReduce = n > 1 && ash.index !== n - 1 && lastHead.vowel === 'kamatz' && !lastHead.katan && isOpen(syls[n - 1])
    && lastLetter !== lastHead && ((lastLetter.letter === 'ה' && lastLetter.mater) || (lastLetter.letter === 'א' && lastLetter.silent));
  if (ashReduce) flags.add('ashk-final-kamatz-reduced');

  // --- IPA
  const variants = {};
  for (const trad of TRADITIONS) {
    const st = stressFor[trad];
    const pieces = sylIpa(trad, { reduceLast: trad === 'ashkenazi' && ashReduce });
    variants[trad] = { ipa: pieces.map((p, si) => (si === st.index ? 'ˈ' : '') + p).join('.'), simple: '', stress: { syllable: st.index + 1, of: n, rule: st.rule } };
  }

  // --- simple Latin (existing transliterator)
  const simpleIS = transliterate(w, { scheme: 'siddur', geminate: GEMINATE, finalHe: 'show' });
  let simpleA = transliterate(w, { scheme: 'ashkenazi-siddur', cholam: 'oy', geminate: GEMINATE, finalHe: 'show' }).replace(/oyy/g, 'oy');
  if (ashReduce) {
    if (/oh$/.test(simpleA)) simpleA = simpleA.replace(/oh$/, 'eh');
    else if (/o$/.test(simpleA)) simpleA = simpleA.replace(/o$/, 'eh');
    else flags.add('ashk-reduction-latin-not-applied');
  }
  variants.israeli.simple = simpleIS;
  variants.sephardi.simple = simpleIS;
  variants.ashkenazi.simple = simpleA;

  return { he: w.normalize('NFC'), syllables: syls.map((s) => s.he), variants, flags: [...flags].sort(), notes, colloquial: sylIpa('israeli', { dropShvaNa: true }).join('') };
}

// ---------------------------------------------------------------------------------------------------------------
// Running text (phrases, corpus lines): per word, separators kept, sof pasuq / paseq dropped.
// ---------------------------------------------------------------------------------------------------------------
const DROP = /[׃׀]/g;
export function renderText(text, ctx) {
  const clean = stripTaamim(String(text)).replace(DROP, '').replace(/\s+/g, ' ').trim();
  const pieces = clean.split(/(\s+|־)/);
  const per = { israeli: [], sephardi: [], ashkenazi: [] };
  const words = [];
  const flags = new Set();
  const notes = [];
  const colloquial = [];
  for (const p of pieces) {
    if (p === '' ) continue;
    if (/^\s+$/.test(p)) { for (const t of TRADITIONS) per[t].push({ ipa: ' ', simple: ' ' }); continue; }
    if (p === '־') { for (const t of TRADITIONS) per[t].push({ ipa: '-', simple: '-' }); continue; }
    const m = p.match(/^([^֐-׿]*)([֐-׿]+)([^֐-׿]*)$/);
    if (!m) {
      flags.add('non-hebrew-token');
      for (const t of TRADITIONS) per[t].push({ ipa: '', simple: p });
      continue;
    }
    const [, pre, core, post] = m;
    if (pre || post) { if (/[A-Za-z0-9]/.test(pre + post)) flags.add('non-hebrew-chars'); }
    const r = renderWord(core, ctx);
    for (const f of r.flags) flags.add(f);
    notes.push(...r.notes);
    colloquial.push(r.colloquial);
    words.push({ he: r.he, syllables: r.syllables, stress: Object.fromEntries(TRADITIONS.map((t) => [t, r.variants[t].stress])), ipa: Object.fromEntries(TRADITIONS.map((t) => [t, r.variants[t].ipa])), simple: Object.fromEntries(TRADITIONS.map((t) => [t, r.variants[t].simple])) });
    for (const t of TRADITIONS) per[t].push({ ipa: r.variants[t].ipa, simple: pre + r.variants[t].simple + post });
  }
  const variants = {};
  for (const t of TRADITIONS) {
    variants[t] = {
      ipa: per[t].map((x) => x.ipa).join('').replace(/\s+/g, ' ').trim(),
      simple: per[t].map((x) => x.simple).join('').replace(/\s+/g, ' ').trim(),
      stress: words.map((wd) => wd.stress[t]),
    };
  }
  return { he: clean.normalize('NFC'), words: words.map((wd) => ({ he: wd.he, syllables: wd.syllables })), perWord: words, variants, flags: [...flags].sort(), notes, colloquial: colloquial.join(' ') };
}

// ---------------------------------------------------------------------------------------------------------------
// Build everything
// ---------------------------------------------------------------------------------------------------------------
const REVIEW_FLAGS = new Set([
  'unpointed', 'shin-undotted', 'kamatz-katan-before-chataf', 'possible-segolate', 'words-ipa-syllable-count-differs',
  'vav-cholam-consonantal', 'ashk-reduction-latin-not-applied', 'he-patach-no-mappiq', 'non-hebrew-token', 'aramaic',
  'ipa-differs-from-words.json',
]);

/** Normalise an IPA string for a loose comparison with the existing words.json ipa field. */
export function ipaSkeleton(s) {
  let x = String(s);
  if (x.includes(' ') || x.includes('[')) x = x.split(/\s|\[/)[0];
  return x.replace(/^\/|\/$/g, '').replace(/\([aeiouə]\)/g, '').replace(/[()]/g, '')
    .replace(/[ʔʕ.ˈ\u0361\u031e\u0325\u032f-]/g, '')
    .replace(/ə/g, 'e').replace(/ɡ/g, 'g').replace(/ɛ/g, 'e').replace(/ɔ/g, 'o').replace(/r/g, 'ʁ').replace(/ŋ/g, 'n').replace(/ej/g, 'e');
}

export function buildAll() {
  const ctx = { stress: loadStressData() };
  const words = readJson('data/vocab/words.json');
  const phrasebook = readJson('data/corpus/phrasebook.json');
  const registry = readJson('data/corpus/registry.json');
  const records = [];
  const rendered = new Map(); // id -> renderText result (per-word detail for the derived builders; not written to the shards)
  const seen = new Set();
  const push = (r, full) => { if (seen.has(r.id)) throw new Error('duplicate id ' + r.id); seen.add(r.id); records.push(r); rendered.set(r.id, full); };

  for (const w of words.words) {
    const r = w.kind === 'phrase' || /\s|־/.test(w.he) ? renderText(w.he, ctx) : renderText(w.he, ctx);
    const rec = { id: w.id, source: 'vocab', kind: w.kind, he: r.he, en: w.en, variants: r.variants, flags: r.flags };
    if (r.words.length) rec.syllables = r.words.map((x) => x.syllables);
    // loose cross-check against the existing Israeli IPA
    if (w.ipa && w.kind === 'word' && !r.flags.includes('divine-name') && !r.flags.includes('words-ipa-colloquial-shva-drop')) {
      const a = ipaSkeleton(w.ipa); const b = ipaSkeleton(r.variants.israeli.ipa);
      if (a !== b && a === ipaSkeleton(r.colloquial)) rec.flags = [...rec.flags, 'words-ipa-colloquial-shva-drop'].sort();
      else if (a !== b) { rec.flags = [...rec.flags, 'ipa-differs-from-words.json'].sort(); rec.note = `words.json ipa ${w.ipa} vs rules ${r.variants.israeli.ipa}`; }
    }
    if (r.notes.length) rec.note = (rec.note ? rec.note + '; ' : '') + r.notes.join('; ');
    push(rec, r);
  }
  for (const e of phrasebook.entries) {
    const r = renderText(e.he, ctx);
    const rec = { id: e.id, source: 'phrasebook', kind: 'phrase', he: r.he, en: e.en, variants: r.variants, flags: r.flags, syllables: r.words.map((x) => x.syllables) };
    if (r.notes.length) rec.note = r.notes.join('; ');
    push(rec, r);
  }
  for (const e of registry.entries) {
    const lines = e.he.split('\n');
    lines.forEach((line, li) => {
      const r = renderText(line, ctx);
      const flags = e.language === 'aramaic' ? [...r.flags, 'aramaic'].sort() : r.flags;
      const rec = { id: lines.length === 1 ? e.id : `${e.id}-l${li + 1}`, source: 'corpus', kind: 'line', ref: e.ref, he: r.he, en: lines.length === 1 ? e.english : undefined, variants: r.variants, flags, syllables: r.words.map((x) => x.syllables) };
      if (rec.en === undefined) delete rec.en;
      if (r.notes.length) rec.note = r.notes.join('; ');
      push(rec, r);
    });
  }

  // shards
  const vocab = records.filter((r) => r.source === 'vocab');
  const corpus = records.filter((r) => r.source !== 'vocab');
  const shards = [];
  const header = (name, part, parts) => ({
    schemaVersion: 1, rulesVersion: RULES_VERSION, proofread: false, status: STATUS,
    builtFrom: 'the niqqud text of data/vocab/words.json and data/corpus/*.json, by rule', rules: 'docs/pronunciation/VARIANTS.md',
    traditions: TRADITIONS, shard: { name, part, parts },
  });
  const slice = (name, list) => {
    const parts = Math.max(1, Math.ceil(list.length / SHARD_SIZE));
    for (let p = 0; p < parts; p++) {
      const recs = list.slice(p * SHARD_SIZE, (p + 1) * SHARD_SIZE);
      shards.push({ file: `_${name}-${p + 1}.json`, data: { ...header(name, p + 1, parts), count: recs.length, records: recs } });
    }
  };
  slice('vocab', vocab);
  slice('corpus', corpus);
  const flagCounts = {};
  for (const r of records) for (const f of r.flags) flagCounts[f] = (flagCounts[f] || 0) + 1;
  const review = records.filter((r) => r.flags.some((f) => REVIEW_FLAGS.has(f)));
  const index = {
    schemaVersion: 1, rulesVersion: RULES_VERSION, proofread: false, status: STATUS, rules: 'docs/pronunciation/VARIANTS.md',
    counts: { records: records.length, vocab: vocab.length, corpus: corpus.length, review: review.length },
    flags: Object.fromEntries(Object.entries(flagCounts).sort()),
    shards: shards.map((s) => ({ file: s.file, count: s.data.count })),
    review: '_review.csv',
  };
  return { records, rendered, shards, index, review };
}

const csvCell = (s) => { const x = String(s ?? ''); return /[",\n]/.test(x) ? '"' + x.replace(/"/g, '""') + '"' : x; };
export function reviewCsv(review) {
  const rows = [['id', 'source', 'he', 'flags', 'israeli_simple', 'ashkenazi_simple', 'israeli_ipa', 'note']];
  for (const r of review) rows.push([r.id, r.source, r.he, r.flags.filter((f) => REVIEW_FLAGS.has(f)).join(' '), r.variants.israeli.simple, r.variants.ashkenazi.simple, r.variants.israeli.ipa, r.note ?? '']);
  return rows.map((row) => row.map(csvCell).join(',')).join('\n') + '\n';
}

/** Header fields pretty-printed, one record per line (readable diffs, smaller files). */
export function shardJson(data) {
  const { records, ...head } = data;
  const h = JSON.stringify(head, null, 1);
  return h.slice(0, -2) + ',\n "records": [\n' + records.map((r) => '  ' + JSON.stringify(r)).join(',\n') + '\n ]\n}\n';
}

export function writeAll(outDir = OUT_DIR) {
  const built = buildAll();
  mkdirSync(outDir, { recursive: true });
  for (const f of readdirSync(outDir)) if (/^_(vocab|corpus)-\d+\.json$/.test(f)) unlinkSync(join(outDir, f));
  for (const s of built.shards) writeFileSync(join(outDir, s.file), shardJson(s.data));
  writeFileSync(join(outDir, '_index.json'), JSON.stringify(built.index, null, 1) + '\n');
  writeFileSync(join(outDir, '_review.csv'), reviewCsv(built.review));
  return built;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const dry = process.argv.includes('--dry');
  const built = dry ? buildAll() : writeAll();
  console.log(JSON.stringify({ ...built.index.counts, shards: built.shards.map((s) => `${s.file}:${s.data.count}`), flags: built.index.flags }, null, 1));
  if (!dry && !existsSync(join(OUT_DIR, '_index.json'))) process.exitCode = 1;
}
