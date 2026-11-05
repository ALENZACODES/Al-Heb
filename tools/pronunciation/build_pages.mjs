#!/usr/bin/env node
// Data for the tradition quiz and the rule pages, both built from the lookup data (build_runtime.mjs).
//   node tools/pronunciation/build_pages.mjs [--dry]
// -> data/pronunciation/runtime/quiz-pool.json  (words whose traditions differ, most frequent first)
//    data/pronunciation/runtime/rules.json      (one page of text + 6 examples per rule)
// Rule-generated from the niqqud text; not verified by a native speaker.

import { writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildRuntime, RUNTIME_DIR, CODES } from './build_runtime.mjs';
import { ROOT, STATUS, RULES_VERSION } from './build_variants.mjs';
import { NOTICE, wordKey } from '../../src/pronunciation/compare.model.js';

export const POOL_SIZE = 400;
export const EXAMPLES = 6;
const strip = (s) => s.replace(/[ˈ.]/g, '');
const WIKI = { ash: { label: 'Wikipedia: Ashkenazi Hebrew', url: 'https://en.wikipedia.org/wiki/Ashkenazi_Hebrew' }, sep: { label: 'Wikipedia: Sephardi Hebrew', url: 'https://en.wikipedia.org/wiki/Sephardi_Hebrew' }, mod: { label: 'Wikipedia: Modern Hebrew phonology', url: 'https://en.wikipedia.org/wiki/Modern_Hebrew_phonology' }, kam: { label: 'Wikipedia: Kamatz', url: 'https://en.wikipedia.org/wiki/Kamatz' } };

/** The seven rule pages. `code` links to the difference codes in build_runtime.mjs. */
export const RULES = [
  { id: 'kamatz', code: 'ka', title: 'Kamatz (ָ)', nav: 'Kamatz',
    summary: 'The T-shaped vowel sign under a letter. Israeli and Sephardi readers say [a], like the a in "father". The Ashkenazi reading says [ɔ], like the o in "saw", so בָּרוּךְ is barukh in one and borukh in the other.',
    rows: [['israeli', '[a]', 'ba-RUKH'], ['sephardi', '[a]', 'ba-RUKH'], ['ashkenazi', '[ɔ]', 'BO-rukh']],
    who: 'Rule-generated: the [a] reading is the one used here for Israeli and Sephardi, the [ɔ] reading for Ashkenazi (the rule is "kamatz gadol is generally [ɔ]" in the cited description of Ashkenazi Hebrew). Not checked by a native speaker.',
    limits: 'A few words use a kamatz that is read as a short o in every tradition (kamatz katan, as in כָּל "kol"). Only a short list of such words is recognised here, so other words of that kind are read wrongly.',
    sources: [WIKI.ash, WIKI.sep, WIKI.kam] },
  { id: 'tav', code: 'tv', title: 'Tav without a dot (ת)', nav: 'Tav',
    summary: 'A tav with no dagesh dot is t in the Israeli and Sephardi readings. In the Ashkenazi reading it is s, which is why שַׁבָּת is shabat in one and shabos in the other. A tav with a dot is t in all three.',
    rows: [['israeli', 't', 'shabat'], ['sephardi', 't', 'shabat'], ['ashkenazi', 's', 'shabos']],
    who: 'Rule-generated: Ashkenazi s for a tav without dagesh, as in the cited description ("ungeminated tav is pronounced [s]"). Some Sephardi communities say th or d here; those are not generated.',
    limits: 'The rule needs the dagesh to be written in the pointed text. A word with the dot missing is read with s in the Ashkenazi column.',
    sources: [WIKI.ash, WIKI.sep] },
  { id: 'holam', code: 'ho', title: 'Holam (ֹ)', nav: 'Holam',
    summary: 'The dot above a letter. Israeli and Sephardi readers say a plain o. The Ashkenazi reading used here says "oy" [oj], the Polish and Galician value, so תּוֹרָה is torah in one and toyreh in the other.',
    rows: [['israeli', '[o]', 'to-RA'], ['sephardi', '[o]', 'to-RA'], ['ashkenazi', '[oj]', 'TOY-reh']],
    who: 'Rule-generated: one Ashkenazi value is chosen. Other Ashkenazi communities say o, ey or au; they are not shown. Not checked by a native speaker.',
    limits: 'Only the Polish-style value is generated, so a reader from another Ashkenazi tradition will disagree with the Ashkenazi column.',
    sources: [WIKI.ash, WIKI.sep] },
  { id: 'het', code: 'ch', title: 'Het (ח)', nav: 'Het',
    summary: 'Israeli readers say [χ], a rasp at the back of the mouth, the same as khaf. The Sephardi reading used here is a deeper throat sound [ħ]. The Ashkenazi reading is [x], like khaf.',
    rows: [['israeli', '[χ]', 'like kh in "Bach"'], ['sephardi', '[ħ]', 'breathy, from the throat'], ['ashkenazi', '[x]', 'like kh in "Bach"']],
    who: 'Rule-generated from the cited tables. In practice many Ashkenazi and Sephardi readers say het and khaf alike, and some Sephardi and Mizrahi readers keep the throat sound.',
    limits: 'The difference between [χ] and [x] is too small to hear in most voices; the [ħ] is the audible one.',
    sources: [WIKI.mod, WIKI.sep, WIKI.ash] },
  { id: 'ayin', code: 'ay', title: 'Ayin (ע)', nav: 'Ayin',
    summary: 'Israeli and Ashkenazi readers say nothing for an ayin (it behaves like alef). The Sephardi reading used here keeps a throat sound [ʕ], a squeezed "ah" from deep in the throat.',
    rows: [['israeli', '(silent)', 'no sound'], ['sephardi', '[ʕ]', 'squeezed throat sound'], ['ashkenazi', '(silent)', 'no sound']],
    who: 'Rule-generated: [ʕ] for Sephardi follows the cited description. Spanish-Portuguese communities use a different sound [ŋ] that is not generated.',
    limits: 'A silent ayin still splits the syllables, which the spelled-out respelling shows as an apostrophe.',
    sources: [WIKI.sep, WIKI.ash, WIKI.mod] },
  { id: 'resh', code: 're', title: 'Resh (ר)', nav: 'Resh',
    summary: 'Israeli readers say a back-of-the-throat [ʁ], like the French r. The Sephardi and Ashkenazi readings used here say a front r, rolled or tapped like the Spanish r.',
    rows: [['israeli', '[ʁ]', 'French-style r'], ['sephardi', '[r]', 'rolled or tapped'], ['ashkenazi', '[r]', 'rolled or tapped']],
    who: 'Rule-generated: the Sephardi value follows the cited description. The Ashkenazi value is chosen from "alveolar flap or trill, or uvular by region"; a uvular Ashkenazi reader will disagree.',
    limits: 'The respelling writes r for all three, so only the IPA line shows this difference.',
    sources: [WIKI.sep, WIKI.ash, WIKI.mod] },
  { id: 'stress', code: 'st', title: 'Which syllable is stressed', nav: 'Stress',
    summary: 'Israeli and Sephardi readers stress the last syllable of most words (שַׁבָּת is sha-BAT). The Ashkenazi reading stresses the next-to-last syllable (SHA-bes). Some words are stressed earlier in every tradition, such as מֶלֶךְ (ME-lekh).',
    rows: [['israeli', 'last syllable', 'sha-BAT'], ['sephardi', 'last syllable', 'sha-BAT'], ['ashkenazi', 'next-to-last', 'SHA-bes']],
    who: 'Rule-generated: last-syllable stress is the default and exceptions come only from short existing lists; next-to-last stress is the default for Ashkenazi. Not checked by a native speaker.',
    limits: 'About 240 words that look like two-syllable nouns ending in segol are read with last-syllable stress by default and may be wrong. Prefixed words (וּבְכָל) get an Ashkenazi stress a trained reader would not give.',
    sources: [WIKI.ash, WIKI.sep] },
];

export function buildPages() {
  const rt = buildRuntime();
  const entries = new Map();
  for (const [f, text] of rt.files) if (/^lookup-/.test(f)) for (const [k, e] of Object.entries(JSON.parse(text).w)) entries.set(k, e);
  const words = JSON.parse(readFileSync(join(ROOT, 'data/vocab/words.json'), 'utf8')).words;
  const cand = [];
  for (const w of words) {
    if (w.kind !== 'word' || !w.en || /[\s־]/.test(w.he)) continue;
    const e = entries.get(wordKey(w.he));
    if (!e) continue;
    cand.push({ w, e, rank: w.frequencyRank ?? 1e9 });
  }
  cand.sort((a, b) => a.rank - b.rank || (a.w.id < b.w.id ? -1 : 1));
  const seenHe = new Set();
  const pool = [];
  for (const { w, e } of cand) {
    if (seenHe.has(w.he)) continue;
    const [i, s, a, simIS, simA, codes] = e;
    const tri = new Set([strip(i), strip(s), strip(a)]).size === 3;
    const respell = simIS !== simA;
    if (!tri && !respell) continue;
    seenHe.add(w.he);
    pool.push({ h: w.he.normalize('NFC'), g: w.en.slice(0, 50), i: [i, s, a], s: [simIS, simA], c: codes, t: tri ? 1 : 0 });
    if (pool.length >= POOL_SIZE) break;
  }
  const meta = { schemaVersion: 1, rulesVersion: RULES_VERSION, proofread: false, status: STATUS, notice: NOTICE };
  const quiz = { ...meta, description: 'Words whose traditions differ, most frequent first. h pointed word, g gloss, i [IPA israeli, sephardi, ashkenazi], s [respelling israeli+sephardi, respelling ashkenazi], c difference codes (see reasons.json), t 1 when all three IPA strings differ. Only words with a gloss in data/vocab/words.json; glosses may not fit every sense.', count: pool.length, pool };
  const reasons = JSON.parse(rt.files.get('reasons.json'));
  const pages = RULES.map((r) => {
    const ex = [];
    const usedSimple = new Set(); const usedFirst = new Set();
    for (const { w, e } of cand) {
      const codes = e[5] ? e[5].split(' ') : [];
      if (!codes.includes(r.code)) continue;
      if (usedSimple.has(e[4]) || usedFirst.has(w.he[0])) continue;
      usedSimple.add(e[4]); usedFirst.add(w.he[0]);
      ex.push({ he: w.he.normalize('NFC'), gloss: w.en.slice(0, 40), ipa: [e[0], e[1], e[2]], simple: [e[3], e[4]] });
      if (ex.length >= EXAMPLES) break;
    }
    return { id: r.id, title: r.title, nav: r.nav, summary: r.summary, rows: r.rows, who: r.who, limits: r.limits, sources: r.sources, why: reasons.codes[r.code]?.text ?? '', examples: ex };
  });
  const rules = { ...meta, description: 'One static page per pronunciation rule; examples come from the lookup data (most frequent words that show the rule, one per first letter).', pages };
  return { quiz, rules, rt };
}

export const quizJson = (q) => JSON.stringify({ ...q, pool: undefined }, null, 1).replace(/\n\}$/, ',\n "pool": [\n') + q.pool.map((p) => '  ' + JSON.stringify(p)).join(',\n') + '\n ]\n}\n';
export const rulesJson = (r) => JSON.stringify(r, null, 1) + '\n';

export function writePages() {
  const p = buildPages();
  writeFileSync(join(RUNTIME_DIR, 'quiz-pool.json'), quizJson(p.quiz));
  writeFileSync(join(RUNTIME_DIR, 'rules.json'), rulesJson(p.rules));
  return p;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const p = process.argv.includes('--dry') ? buildPages() : writePages();
  console.log(JSON.stringify({ pool: p.quiz.count, triple: p.quiz.pool.filter((x) => x.t).length, examples: Object.fromEntries(p.rules.pages.map((x) => [x.id, x.examples.length])), quizBytes: Buffer.byteLength(quizJson(p.quiz)) }));
}
