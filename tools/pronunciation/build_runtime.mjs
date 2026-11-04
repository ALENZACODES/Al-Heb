#!/usr/bin/env node
// Offline lookup data for the "Compare traditions" view (src/pronunciation/compare.view.js).
//   node tools/pronunciation/build_runtime.mjs [--dry]
// -> data/pronunciation/runtime/{index.json, reasons.json, picks.json, lookup-NN.json}
// One entry per distinct pointed word found in data/vocab/words.json, the phrasebook and the corpus registry, keyed by
// wordKey() (accents removed, NFD). Entry: [ipaIsraeli, ipaSephardi, ipaAshkenazi, respellingIsraeliSephardi, respellingAshkenazi, codes, stressRuleIds].
// All values are rule-generated from the niqqud text (build_variants.mjs) and have not been checked by a native speaker.
// Shards are hash-assigned (shardOf) and each stays under SHARD_BYTES. These files are NOT underscore-prefixed: the view needs them offline.

import { writeFileSync, mkdirSync, readdirSync, unlinkSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAll, ROOT, TRADITIONS, STATUS, RULES_VERSION } from './build_variants.mjs';
import { wordKey, shardOf, shardFile, NOTICE } from '../../src/pronunciation/compare.model.js';
import { parseWord } from '../../src/pronunciation/hebrew.js';

export const RUNTIME_DIR = join(ROOT, 'data', 'pronunciation', 'runtime');
export const SHARD_BYTES = 150000;
const BUDGET = 130000; // target per shard, leaves headroom for hash imbalance

export const CODES = {
  ka: { text: 'Kamatz (ָ): a in Israeli and Sephardi, but [ɔ] ("o" as in "saw") in Ashkenazi.' },
  ko: { text: 'Short o (kamatz katan or chataf-kamatz): [o] in Israeli, [ɔ] in Sephardi and Ashkenazi. The difference is small.' },
  tz: { text: 'Tzere (ֵ): a plain e in Israeli and Sephardi, but "ay" [ej] in Ashkenazi.' },
  ho: { text: 'Cholam (ֹ): o in Israeli and Sephardi, but "oy" [oj] in the Polish-style Ashkenazi reading used here (other Ashkenazi readings differ and are not shown).' },
  tv: { text: 'Tav without a dagesh (ת): t in Israeli and Sephardi, but s in Ashkenazi (shabbat / shabbos).' },
  ch: { text: 'Het (ח): [χ] in Israeli, a deeper throat sound [ħ] in Sephardi, [x] in Ashkenazi.' },
  kh: { text: 'Khaf without a dagesh (כ / ך): [χ] in Israeli, [x] in Sephardi and Ashkenazi.' },
  ay: { text: 'Ayin (ע): silent in Israeli and Ashkenazi, a throat sound [ʕ] in Sephardi.' },
  al: { text: 'Alef (א) that carries a vowel: silent in Israeli and Ashkenazi, a glottal stop [ʔ] in Sephardi.' },
  re: { text: 'Resh (ר): a back-of-the-throat [ʁ] in Israeli, a front rolled or tapped r in Sephardi and Ashkenazi.' },
  sv: { text: 'Spoken shva: e in Israeli and Sephardi, a short [ə] in Ashkenazi.' },
  fr: { text: 'Final kamatz + he (or alef) when the word is not stressed on it: an open [a] in Israeli and Sephardi, a short [ə] ("eh") in Ashkenazi.' },
  dn: { text: 'The four-letter divine name is read as Adonai in all three traditions (Adonoy in Ashkenazi).' },
};

const has = (s, c) => s.includes(c);
export function codesFor(he, v) {
  const cl = parseWord(he);
  const I = v.israeli.ipa; const S = v.sephardi.ipa; const A = v.ashkenazi.ipa;
  const idx = (ipa) => ipa.split('.').findIndex((x) => x.includes('ˈ'));
  const codes = [];
  if (cl.map((c) => c.ch).join('') === 'יהוה') codes.push('dn');
  if (cl.some((c) => c.vowel === 'kamatz') && has(I, 'a') && has(A, 'ɔ')) codes.push('ka');
  if (has(S, 'ɔ') && !has(I, 'ɔ') && has(I, 'o')) codes.push('ko');
  if (cl.some((c) => c.vowel === 'tzere') && has(A, 'ej')) codes.push('tz');
  if (cl.some((c) => c.vowel === 'cholam') && has(A, 'oj')) codes.push('ho');
  if (cl.some((c) => c.ch === 'ת' && !c.dagesh) && has(A, 's')) codes.push('tv');
  if (cl.some((c) => c.ch === 'ח') && has(S, 'ħ')) codes.push('ch');
  if (cl.some((c) => (c.ch === 'כ' || c.ch === 'ך') && !c.dagesh) && has(I, 'χ')) codes.push('kh');
  if (cl.some((c) => c.ch === 'ע') && has(S, 'ʕ')) codes.push('ay');
  if (cl.some((c) => c.ch === 'א' && c.vowel) && has(S, 'ʔ')) codes.push('al');
  if (cl.some((c) => c.ch === 'ר') && has(I, 'ʁ') && has(S, 'r')) codes.push('re');
  const finalReduced = A.endsWith('ə') && I.endsWith('a');
  if (finalReduced) codes.push('fr');
  if (has(A.slice(0, -1), 'ə')) codes.push('sv');
  if (idx(I) !== idx(A) || idx(I) !== idx(S)) codes.push('st');
  const order = Object.keys(CODES).concat('st');
  return codes.sort((a, b) => order.indexOf(a) - order.indexOf(b));
}

/** Plain-English label for a stress rule string from build_variants.mjs. */
export function ruleLabel(r) {
  if (/^default milra|^milra/.test(r)) return 'last syllable, the usual default';
  if (/^default penultimate/.test(r)) return 'next-to-last syllable, the usual Ashkenazi default';
  if (/^monosyllable/.test(r)) return 'one-syllable word';
  if (/^final \(no full-vowel/.test(r)) return 'last syllable, because the one before it has only a reduced vowel';
  if (/furtive/.test(r)) return 'furtive patach is never stressed';
  if (/prayerwords/.test(r)) return 'stress listed for this prayer word, unreviewed';
  if (/stress\.json|STRESS_EXCEPTIONS/.test(r)) return 'listed stress exception, unreviewed';
  if (/words\.json ipa/.test(r)) return 'stress taken from the older word-list pronunciation, unreviewed';
  return 'rule';
}

export function buildRuntime() {
  const built = buildAll();
  const ruleList = new Set();
  for (const r of built.rendered.values()) for (const w of r.perWord) for (const t of TRADITIONS) if (w.syllables.length) ruleList.add(w.stress[t].rule);
  const stressRules = [...ruleList].sort();
  const words = new Map();
  for (const r of built.rendered.values()) {
    for (const w of r.perWord) {
      if (!w.syllables.length) continue; // unpointed: nothing to show
      const key = wordKey(w.he);
      const entry = [w.ipa.israeli, w.ipa.sephardi, w.ipa.ashkenazi, w.simple.israeli, w.simple.ashkenazi,
        codesFor(w.he, { israeli: { ipa: w.ipa.israeli }, sephardi: { ipa: w.ipa.sephardi }, ashkenazi: { ipa: w.ipa.ashkenazi } }).join(' '),
        TRADITIONS.map((t) => stressRules.indexOf(w.stress[t].rule).toString(36)).join('')];
      const prev = words.get(key);
      if (prev && JSON.stringify(prev.entry) !== JSON.stringify(entry)) throw new Error('conflicting renderings for ' + w.he);
      if (!prev) words.set(key, { he: w.he, entry });
    }
  }
  const keys = [...words.keys()].sort();
  const total = keys.reduce((n, k) => n + Buffer.byteLength(JSON.stringify([k, words.get(k).entry])) + 2, 0);
  let n = Math.max(1, Math.ceil(total / BUDGET));
  let shards;
  for (;; n++) {
    shards = Array.from({ length: n }, () => ({}));
    for (const k of keys) shards[shardOf(k, n)][k] = words.get(k).entry;
    const sizes = shards.map((s) => Buffer.byteLength(JSON.stringify({ w: s })));
    if (Math.max(...sizes) < SHARD_BYTES - 5000) break;
  }
  const files = new Map();
  shards.forEach((s, i) => {
    const body = Object.keys(s).sort().map((k) => ' ' + JSON.stringify(k) + ':' + JSON.stringify(s[k])).join(',\n');
    files.set(shardFile(i), `{"shard":${i},"of":${n},"w":{\n${body}\n}}\n`);
  });
  // picks: the ten prayer words, then the first 40 deck words, then four corpus/phrase lines
  const picks = [];
  const prayer = JSON.parse(readFileSync(join(ROOT, 'data/pronunciation/prayerwords.json'), 'utf8')).words;
  for (const p of prayer) picks.push({ he: p.he, gloss: p.gloss });
  const deck = JSON.parse(readFileSync(join(ROOT, 'data/vocab/deck-order.json'), 'utf8')).entries.slice(0, 40);
  for (const d of deck) if (words.has(wordKey(d.he)) && !picks.some((p) => wordKey(p.he) === wordKey(d.he))) picks.push({ he: d.he, gloss: d.en });
  for (const id of ['greetings-03', 'shema-1', 'bless-priestly-1']) { const r = built.records.find((x) => x.id === id); if (r) picks.push({ he: r.he, gloss: r.en ?? '' }); }
  const meta = { schemaVersion: 1, rulesVersion: RULES_VERSION, proofread: false, status: STATUS, notice: NOTICE };
  files.set('reasons.json', JSON.stringify({ ...meta, description: 'Sentences for "what differs and why", keyed by the code stored in each lookup entry. Sources: docs/pronunciation/VARIANTS.md.', codes: CODES, stressRules: stressRules.map(ruleLabel), stressRulesRaw: stressRules, stressSummary: 'Israeli and Sephardi: final syllable unless a listed exception; Ashkenazi: next-to-last syllable by default' }, null, 1) + '\n');
  files.set('picks.json', JSON.stringify({ ...meta, picks: picks.map((p) => ({ he: p.he.normalize('NFC'), gloss: String(p.gloss ?? '').slice(0, 60) })) }, null, 1) + '\n');
  files.set('index.json', JSON.stringify({ ...meta, description: 'Lookup shards for the Compare traditions view. Entry: [ipaIsraeli, ipaSephardi, ipaAshkenazi, respelling Israeli+Sephardi, respelling Ashkenazi, codes, stressRuleIds]. Shard = shardOf(wordKey(word), shards) in src/pronunciation/compare.model.js.', shards: n, words: keys.length, files: shards.map((_, i) => shardFile(i)) }, null, 1) + '\n');
  return { files, words: keys.length, shards: n, total };
}

export function writeRuntime(dir = RUNTIME_DIR) {
  const r = buildRuntime();
  mkdirSync(dir, { recursive: true });
  for (const f of readdirSync(dir)) if (/^lookup-\d+\.json$/.test(f)) unlinkSync(join(dir, f));
  for (const [f, text] of r.files) writeFileSync(join(dir, f), text);
  return r;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const r = process.argv.includes('--dry') ? buildRuntime() : writeRuntime();
  console.log(JSON.stringify({ words: r.words, shards: r.shards, sizes: [...r.files].map(([f, t]) => `${f}:${Buffer.byteLength(t)}`) }));
}
