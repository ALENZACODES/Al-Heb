// Appends 'ipa' corrections to data/vocab/corrections.json for the first-500 words whose stored Wiktionary `ipa` is for a
// different reading than the pointed form (docs/vocab/FIRST-500-CHECK.md section 5, docs/pronunciation/DOUBLING-POLICY.md).
//   node tools/vocab/ipa_rule_corrections.mjs [--dry]
// The new value is the Israeli IPA of the repo's own builder (tools/pronunciation/build_variants.mjs renderWord), computed with the
// stress marks that are copied from words.json ipa switched off, so a wrong stored stress mark cannot leak into the replacement.
// Then run: node tools/vocab/apply_corrections.mjs (writes words.json, the pack copies), and rebuild the pronunciation data.
// Ranks are the 23 listed in FIRST-500-CHECK.md; each is re-checked here and skipped if the stored ipa already equals the rule output.
import fs from 'node:fs';
import path from 'node:path';
import { renderWord, loadStressData } from '../pronunciation/build_variants.mjs';
import { ROOT } from './frequency.mjs';
import { CORRECTIONS_PATH } from './apply_corrections.mjs';

export const IPA_RANKS = [34, 50, 61, 72, 86, 104, 217, 223, 227, 229, 231, 237, 248, 289, 307, 312, 313, 348, 399, 409, 410, 483, 496];

// Segolates are stressed on the first syllable (milel); the default rule would give a final stress. Own knowledge, needs-native-review.
// Kept here (not in stress.json) so the syllable-chip word list, which must contain every stress.json exception, is not affected.
const SEGOLATES = ['דֶּרֶךְ', 'זֶרַע'];

export function ruleIpa(he, stress) {
  const k = he.normalize('NFD');
  if (SEGOLATES.some((x) => x.normalize('NFD') === k)) stress = { ...stress, milel: new Map([...stress.milel, [k, { fromEnd: -2, rule: 'segolate (ipa_rule_corrections.mjs)' }]]) };
  return '/' + renderWord(he.replace(/־/g, ''), { stress }).variants.israeli.ipa + '/';
}

export function ipaCorrections(root = ROOT) {
  const words = JSON.parse(fs.readFileSync(path.join(root, 'data/vocab/words.json'), 'utf8')).words;
  const stress = loadStressData(); stress.fromIpa = new Map();
  const out = [];
  for (const rank of IPA_RANKS) {
    const w = words.find((x) => x.frequencyRank === rank);
    if (!w || !w.ipa) continue;
    const nu = ruleIpa(w.he, stress);
    if (nu === w.ipa) continue;
    out.push({ id: w.id, field: 'ipa', old: w.ipa, new: nu, reason: `rank ${rank}: the stored ipa is for a different reading than the pointed form ${w.he}; replaced by the Israeli IPA of the rule builder (build_variants.mjs renderWord, stored stress marks ignored). Rule-generated, needs-native-review` });
  }
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  const target = path.join(ROOT, CORRECTIONS_PATH);
  const spec = JSON.parse(fs.readFileSync(target, 'utf8'));
  const have = new Set(spec.corrections.map((c) => c.id + c.field));
  const add = ipaCorrections().filter((c) => !have.has(c.id + c.field));
  if (process.argv.includes('--dry')) { for (const c of add) console.log(c.id, c.old, '->', c.new); console.log(add.length, 'to add'); process.exit(0); }
  spec.corrections.push(...add);
  spec.counts.ipa = spec.corrections.filter((c) => c.field === 'ipa').length;
  fs.writeFileSync(target, JSON.stringify(spec, null, 1) + '\n');
  console.log('appended', add.length);
}
