#!/usr/bin/env node
// Derived pronunciation data built on build_variants.mjs (same rules, same status: rule-generated, not verified
// by a native speaker, no audio exists).
//
//   node tools/pronunciation/build_derived.mjs          writes data/pronunciation/derived/*
//   node tools/pronunciation/build_derived.mjs --dry    counts only
//
// Files (data/pronunciation/derived/):
//   _syllables-NNN.json   per record, per word: pointed syllables, per-tradition IPA syllables, stressed syllable index
//   _ssml-NNN.json        per record, per tradition: an SSML <speak> string with IPA <phoneme> elements
//   ssml-profile.json     small (runtime-safe): per-tradition language tag, engine notes, escaping and ph conventions
//   index.json            small (runtime-safe): shard list, counts, stress-rule table
// Bulk shards start with "_" so tools/build-precache.mjs does not install them; every shard is <= 2,000 records
// and < SHARD_BYTES bytes.

import { writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { speechText } from '../../src/shell/names.js';
import { buildAll, renderWord, loadStressData, ROOT, TRADITIONS, STATUS, RULES_VERSION, SHARD_SIZE } from './build_variants.mjs';

export const DERIVED_DIR = join(ROOT, 'data', 'pronunciation', 'derived');
export const SHARD_BYTES = 190000;
export const LANG = { israeli: 'he-IL', sephardi: 'he-IL', ashkenazi: 'he-IL' };

const xml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
/** IPA for the ph attribute: syllable dots removed, stress marks kept. */
export const phOf = (ipa) => ipa.replace(/\./g, '');
const isPlain = (s) => !/[֐-׿]/.test(s);

let stressCtx = null;
/**
 * SSML for one record and tradition. Words without IPA (unpointed) stay as plain text.
 * Every word goes through speechText() (src/shell/names.js) first, so the written four-letter name (bare, in a maqaf
 * compound or prefixed) never appears in the SSML: both the inner text and the ph attribute are for the spoken substitute.
 */
export function ssmlFor(rendered, trad) {
  const parts = rendered.perWord.map((w) => {
    const spoken = speechText(w.he);
    let ipa = w.ipa[trad];
    if (spoken !== w.he) { // re-render the substitute so the ph matches the spoken form (prefix letters kept)
      stressCtx ??= { stress: loadStressData() };
      ipa = renderWord(spoken, stressCtx).variants[trad].ipa;
    }
    return ipa ? `<phoneme alphabet="ipa" ph="${xml(phOf(ipa))}">${xml(spoken)}</phoneme>` : xml(spoken);
  });
  return `<speak version="1.1" xml:lang="${LANG[trad]}">${parts.join(' ')}</speak>`;
}

export function buildDerived() {
  const built = buildAll();
  const rules = [];
  const ruleId = (r) => { let i = rules.indexOf(r); if (i < 0) { rules.push(r); i = rules.length - 1; } return i; };
  const syl = []; const ssml = [];
  for (const rec of built.records) {
    const r = built.rendered.get(rec.id);
    const words = r.perWord.map((w) => {
      const o = { h: w.he, s: w.syllables };
      if (w.syllables.length) {
        o.st = TRADITIONS.map((t) => w.stress[t].syllable - 1);
        o.sr = TRADITIONS.map((t) => ruleId(w.stress[t].rule));
        o.p = TRADITIONS.map((t) => w.ipa[t].replace(/ˈ/g, '').split('.'));
      }
      return o;
    });
    syl.push({ i: rec.id, w: words });
    ssml.push({ i: rec.id, ssml: Object.fromEntries(TRADITIONS.map((t) => [t, ssmlFor(r, t)])) });
  }
  const header = (name, part, parts, count) => ({ schemaVersion: 1, rulesVersion: RULES_VERSION, proofread: false, status: STATUS, name, part, parts, traditions: TRADITIONS, count });
  const shard = (name, list) => {
    const chunks = []; let cur = []; let bytes = 0;
    for (const x of list) {
      const b = Buffer.byteLength(JSON.stringify(x)) + 4;
      if (cur.length && (cur.length >= SHARD_SIZE || bytes + b > SHARD_BYTES - 1500)) { chunks.push(cur); cur = []; bytes = 0; }
      cur.push(x); bytes += b;
    }
    if (cur.length) chunks.push(cur);
    return chunks.map((recs, k) => ({ file: `_${name}-${String(k + 1).padStart(3, '0')}.json`, head: header(name, k + 1, chunks.length, recs.length), records: recs }));
  };
  const shards = [...shard('syllables', syl), ...shard('ssml', ssml)];
  const index = {
    schemaVersion: 1, rulesVersion: RULES_VERSION, proofread: false, status: STATUS,
    description: 'Derived from data/pronunciation/variants (see docs/pronunciation/DERIVED.md and SSML.md). Syllable record: {i: record id, w: [{h: pointed word, s: syllables, st: [stressed syllable index (0-based) in traditions order], sr: [index into stressRules], p: [IPA syllables per tradition, stress mark removed]}]}. A word without niqqud has no s/st/sr/p.',
    traditions: TRADITIONS,
    counts: { records: built.records.length, words: syl.reduce((n, r) => n + r.w.length, 0) },
    stressRules: rules,
    shards: shards.map((s) => ({ file: s.file, kind: s.head.name, count: s.head.count, first: s.records[0].i })),
  };
  const profile = {
    schemaVersion: 1, proofread: false, status: STATUS,
    description: 'How the SSML strings in the _ssml shards are built and what is known about using them. NOT tested against any engine.',
    format: { root: '<speak version="1.1" xml:lang="he-IL">', word: '<phoneme alphabet="ipa" ph="IPA">pointed Hebrew</phoneme>', separator: 'one space between words; maqaf also becomes a space', escaping: '& < > " are XML-escaped', ph: 'IPA with syllable dots removed, primary stress mark ˈ kept before the stressed syllable' },
    traditions: {
      israeli: { lang: 'he-IL', ipaInventory: 'b v ɡ d h z χ t j k l m n s p f ts ʁ ʃ + a e i o u; no ʔ or ʕ written; stress final unless a listed exception', browser: 'the only tradition a stock he-IL browser voice approximates; use the pointed Hebrew text, not the IPA' },
      sephardi: { lang: 'he-IL', ipaInventory: 'adds ʔ (aleph), ħ (het), ʕ (ayin), trilled r, x; no length marks', browser: 'no browser voice is known to do this; the he-IL voice will read it as Israeli. Needs a recording or an engine that honours IPA' },
      ashkenazi: { lang: 'he-IL', ipaInventory: 'adds ɔ (kamatz), ej (tzere), oj (cholam), s for tav without dagesh, x, r, ə final; penultimate stress', browser: 'no browser voice is known to do this; same caveat as Sephardi' },
    },
    engines: 'The Web Speech API (speechSynthesis) generally takes plain text and ignores SSML markup, so the phoneme elements are for server-side engines or a future TTS lane that documents <phoneme alphabet="ipa">. Which engines accept he-IL with IPA, and whether they honour ħ ʕ ɔ, has NOT been checked here.',
    fallbackText: 'For the Web Speech API pass `words[].h` joined by spaces (pointed Hebrew) with lang he-IL, Israeli tradition only.',
    warnings: ['Phoneme strings are rule output, not verified by a native speaker.', 'An engine that silently ignores unknown IPA will read the Hebrew text in its own way: compare against the recording before relying on it.'],
  };
  return { built, shards, index, profile };
}

export function derivedFiles(d) {
  const files = new Map();
  for (const s of d.shards) {
    const { records, ...head } = s;
    const h = JSON.stringify(s.head, null, 1);
    files.set(s.file, h.slice(0, -2) + ',\n "records": [\n' + s.records.map((r) => '  ' + JSON.stringify(r)).join(',\n') + '\n ]\n}\n');
  }
  files.set('index.json', JSON.stringify(d.index, null, 1) + '\n');
  files.set('ssml-profile.json', JSON.stringify(d.profile, null, 1) + '\n');
  return files;
}

export function writeDerived(dir = DERIVED_DIR) {
  const d = buildDerived();
  mkdirSync(dir, { recursive: true });
  for (const f of readdirSync(dir)) if (/^_(syllables|ssml)-\d+\.json$/.test(f)) unlinkSync(join(dir, f));
  for (const [f, text] of derivedFiles(d)) writeFileSync(join(dir, f), text);
  return d;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const d = process.argv.includes('--dry') ? buildDerived() : writeDerived();
  const by = {};
  for (const s of d.shards) by[s.head.name] = (by[s.head.name] ?? 0) + 1;
  console.log(JSON.stringify({ records: d.index.counts.records, words: d.index.counts.words, shardFiles: by, stressRules: d.index.stressRules.length }));
}
