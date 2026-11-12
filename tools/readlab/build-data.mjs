#!/usr/bin/env node
// Builds the two small lookup files the Reading Tools screens (#/readlab) read. Nothing Hebrew is typed here.
//   data/readlab/word-tags.json    pointed spelling -> family letters and verb pattern, copied from data/roots/families.json and
//                                  data/roots/verbs.json (every verb form the data lists, plus every word of a family of 2 or more).
//   data/readlab/stress-words.json words whose stress mark comes from the word list's own IPA (data/vocab/words.json `ipa`, a
//                                  dictionary source, unreviewed). A word is kept only when the app's syllable split
//                                  (src/pronunciation/syllables.js chipsFor) has as many syllables as the IPA has vowels, so the
//                                  stress mark can be placed on a syllable without guessing. The computed stress is kept beside it.
// Run: node tools/readlab/build-data.mjs        (--check: exit 1 when a file is stale)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { wordKey, hasDivineName } from '../../src/readlab/words.js';
import { chipsFor } from '../../src/pronunciation/syllables.js';

const root = fileURLToPath(new URL('../..', import.meta.url));
const rd = (rel) => JSON.parse(readFileSync(root + rel, 'utf8'));
const FORM_KEYS = ['present', 'future', 'infinitive'];
export const STRESS_LIMIT = 900;

export function buildTags(families, verbs) {
  const tags = {};
  const put = (he, rec) => {
    const k = wordKey(he);
    if (!k || hasDivineName(he)) return;
    const cur = tags[k];
    if (!cur) { tags[k] = rec; return; }
    // the same spelling twice: keep what both rows agree on, drop what they disagree on (never pick one silently)
    tags[k] = { ...(cur.f && rec.f && cur.f !== rec.f ? {} : { f: cur.f || rec.f }), ...(cur.b && rec.b && cur.b !== rec.b ? {} : { b: cur.b || rec.b }), id: cur.id };
    if (!tags[k].f) delete tags[k].f;
    if (!tags[k].b) delete tags[k].b;
  };
  for (const fam of families.families || []) for (const w of fam.words || []) put(w.he, { f: fam.root, ...(w.pos === 'verb' && w.binyan ? { b: w.binyan } : {}), id: w.id });
  for (const v of verbs.verbs || []) {
    if (!v.binyan) continue;
    const rec = { ...(v.root ? { f: v.root } : {}), b: v.binyan, id: v.id };
    for (const he of [v.he, ...FORM_KEYS.map((k) => v.forms?.[k])].filter(Boolean)) put(he, rec);
  }
  const keys = Object.keys(tags).filter((k) => tags[k].f || tags[k].b).sort();
  return {
    schema: 1,
    source: 'data/roots/families.json and data/roots/verbs.json (both copied from data/vocab/words.json; unreviewed)',
    rule: 'Key: the pointed spelling with trope, meteg and punctuation removed (src/readlab/words.js wordKey). f = family letters as the Roots page lists them; b = verb pattern of a verb form the data lists. When two rows share a spelling and disagree, the field is left out.',
    count: keys.length,
    tags: Object.fromEntries(keys.map((k) => [k, tags[k]])),
  };
}

const VOWEL = /[aeiouäɐ]/;
/** Vowel nuclei in the phonemic IPA (the part between the first two slashes) and how many come before the stress mark. */
export function ipaStress(ipa) {
  const m = /\/([^/]+)\//.exec(String(ipa ?? ''));
  if (!m || !m[1].includes('ˈ') || (m[1].match(/ˈ/g) || []).length !== 1) return null;
  const s = m[1].replace(/\([^)]*\)/g, '');
  // each vowel letter is its own nucleus (two vowels side by side, as in /hiˈɡia/, are two syllables)
  let nuclei = 0, before = -1;
  for (const c of s) {
    if (c === 'ˈ') before = nuclei;
    else if (VOWEL.test(c)) nuclei += 1;
  }
  return before < 0 ? null : { nuclei, index: before };
}

export function buildStress(words) {
  const ok = (words.words || []).filter((x) => x.kind === 'word' && x.ipa && x.he && !/\s/.test(x.he) && x.translit && x.en && !hasDivineName(x.he)
    && !x.flags?.hidden && !/\b(god|lord|deity|idol)\b/i.test(x.en));
  ok.sort((a, b) => (a.frequencyRank || 1e9) - (b.frequencyRank || 1e9) || (a.id < b.id ? -1 : 1));
  const out = [];
  for (const x of ok) {
    const st = ipaStress(x.ipa);
    if (!st) continue;
    const c = chipsFor(x.he);
    if (!c.ok || c.syllables.length < 2 || c.syllables.length !== st.nuclei) continue;
    if (c.syllables.map((s) => s.he).join('') !== x.he) continue;
    out.push({ id: x.id, he: x.he, translit: x.translit, en: x.en.split(/[;(]/)[0].trim(), ipa: x.ipa, syllables: c.syllables.map((s) => s.he), stress: st.index, computed: c.stressIndex });
    if (out.length >= STRESS_LIMIT) break;
  }
  return {
    schema: 1,
    source: 'data/vocab/words.json (ipa field from its dictionary source; unreviewed)',
    rule: 'stress = the syllable the IPA stress mark (ˈ) falls on, counted by vowels; kept only when the app\'s syllable split has exactly as many syllables as the IPA has vowels. computed = the app\'s own default rule (last syllable, or the stress.json exception list), kept for comparison.',
    count: out.length,
    words: out,
  };
}

const text = (o) => JSON.stringify(o) + '\n';
export function outputs() {
  return {
    'data/readlab/word-tags.json': text(buildTags(rd('data/roots/families.json'), rd('data/roots/verbs.json'))),
    'data/readlab/stress-words.json': text(buildStress(rd('data/vocab/words.json'))),
  };
}

if (import.meta.url === new URL(process.argv[1], 'file://').href || process.argv[1]?.endsWith('build-data.mjs')) {
  const check = process.argv.includes('--check');
  let stale = 0;
  for (const [rel, body] of Object.entries(outputs())) {
    let cur = null; try { cur = readFileSync(root + rel, 'utf8'); } catch { /* new */ }
    if (cur === body) { console.log(`${rel}: current`); continue; }
    if (check) { console.log(`${rel}: STALE`); stale += 1; continue; }
    mkdirSync(root + 'data/readlab', { recursive: true });
    writeFileSync(root + rel, body);
    console.log(`${rel}: written (${body.length} bytes)`);
  }
  if (stale) process.exit(1);
}
