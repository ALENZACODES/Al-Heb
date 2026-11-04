// Stage 5.3: learning-order deck for the first 1,000 words -> data/vocab/deck-order.json
//
//   node tools/vocab/deck_order.mjs          writes data/vocab/deck-order.json
//   node tools/vocab/deck_order.mjs --dry    prints the summary only
//
// THE RULE (also written into the output file):
//  1. Eligible: kind "word" in words.json with a known part of speech, a frequencyRank, and the first
//     record for each (pointed form, POS). Words whose gloss is dictionary-ese (lintGloss) stay in, because
//     the commonest function words have them, and carry the flag gloss-machine so the gloss gets fixed
//     before learners see it.
//  2. Priority = effective frequencyRank (lower first). Frequency is counted per spelling, so when several
//     records share one unpointed spelling only the best-ranked keeps its rank; the others are pushed back
//     (rank x 3) and carry the flag homograph. Ties: corpusRank from data/vocab/frequency.json, then id.
//     Frequency decides WHICH words are taught first; the balance rules only limit crowding.
//  3. Selection (greedy, in priority order, until 1,000): accept a word only while its theme is under
//     its theme quota AND its part-of-speech group is under its POS quota. Theme = words.json topic (21).
//     Theme quota = round(1000 * sqrt(size) / sum(sqrt(size))) + 10% slack (square root keeps small
//     themes visible without letting them displace the commonest words). POS group quotas (of 1,000):
//     noun 400, verb 250, adj 120, function words (adv prep pron conj particle det num intj) 230,
//     each with 10% slack. Quotas are caps, not floors. If the pass ends short of 1,000 (a group runs out
//     of words), the remaining slots are filled by priority ignoring the caps (counted in `relaxed`).
//  4. Order: the selected words are scheduled by stride: the k-th word of theme T (by priority) gets
//     time (k + 0.5) / n_T, where n_T is T's selected count; words are sorted by that time, ties by
//     priority. So every theme is spread evenly through the order and, inside a theme, the commonest
//     word comes first. The result is cut into 10 blocks of 100 for the review deck.
// words.json is only read.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT } from './frequency.mjs';
import { lintGloss } from './review_pack.mjs';

export const DECK_PATH = 'data/vocab/deck-order.json';
export const DECK_SIZE = 1000;
export const POS_GROUPS = { noun: 'noun', verb: 'verb', adj: 'adj' };
export const POS_QUOTA = { noun: 400, verb: 250, adj: 120, function: 230 };
export const SLACK = 1.1;
export const posGroup = (pos) => POS_GROUPS[pos] || 'function';

export function eligible(words) {
  const seen = new Set(); const out = []; const firstOfSpelling = new Map();
  for (const w of words.slice().sort((a, b) => (a.frequencyRank ?? 1e9) - (b.frequencyRank ?? 1e9) || (a.id < b.id ? -1 : 1))) {
    if (w.flags && w.flags.hidden) continue; // suppressed by a correction (offensive gloss pending review)
    if (w.kind !== 'word' || !w.pos || w.pos === 'unknown' || w.pos === 'phrase' || w.frequencyRank == null) continue;
    const key = w.he + '|' + w.pos;
    if (seen.has(key)) continue;
    seen.add(key);
    const first = firstOfSpelling.get(w.heUnpointed);
    if (first === undefined) firstOfSpelling.set(w.heUnpointed, w.id);
    out.push({ ...w, _eff: first === undefined ? w.frequencyRank : w.frequencyRank * 3, _flags: [...(first === undefined ? [] : ['homograph']), ...(lintGloss(w.en) ? ['gloss-machine'] : [])] });
  }
  return out;
}

export function themeQuotas(words, size = DECK_SIZE) {
  const n = {}; for (const w of words) n[w.topic] = (n[w.topic] || 0) + 1;
  const sum = Object.values(n).reduce((a, v) => a + Math.sqrt(v), 0);
  return Object.fromEntries(Object.entries(n).sort().map(([t, v]) => [t, Math.round(size * Math.sqrt(v) / sum)]));
}

export function buildDeck(root = ROOT, size = DECK_SIZE) {
  const rj = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
  const all = rj('data/vocab/words.json').words;
  const corpusRank = new Map(rj('data/vocab/frequency.json').entries.map((e) => [e.id, e.corpusRank]));
  const pool = eligible(all).sort((a, b) => a._eff - b._eff || (corpusRank.get(a.id) ?? 1e9) - (corpusRank.get(b.id) ?? 1e9) || (a.id < b.id ? -1 : 1));
  const tq = themeQuotas(pool, size);
  const themeCap = (t) => Math.ceil(tq[t] * SLACK);
  const posCap = (g) => Math.ceil(POS_QUOTA[g] * SLACK * size / 1000);
  const chosen = []; const taken = new Set(); const tc = {}; const pc = {};
  for (const w of pool) {
    if (chosen.length >= size) break;
    const g = posGroup(w.pos);
    if ((tc[w.topic] || 0) >= themeCap(w.topic) || (pc[g] || 0) >= posCap(g)) continue;
    chosen.push(w); taken.add(w.id); tc[w.topic] = (tc[w.topic] || 0) + 1; pc[g] = (pc[g] || 0) + 1;
  }
  let relaxed = 0;
  for (const w of pool) {
    if (chosen.length >= size) break;
    if (taken.has(w.id)) continue;
    chosen.push(w); taken.add(w.id); relaxed++;
  }
  // stride schedule over themes
  const byTheme = {}; for (const w of chosen) (byTheme[w.topic] ||= []).push(w);
  const time = new Map();
  for (const [t, list] of Object.entries(byTheme)) list.sort((a, b) => a._eff - b._eff || (a.id < b.id ? -1 : 1)).forEach((w, k) => time.set(w.id, (k + 0.5) / list.length));
  const ordered = chosen.slice().sort((a, b) => time.get(a.id) - time.get(b.id) || a._eff - b._eff || (a.id < b.id ? -1 : 1));

  const themeOfPack = new Map();
  const tdir = path.join(root, 'data/vocab/themes');
  if (fs.existsSync(tdir)) for (const f of fs.readdirSync(tdir).filter((x) => x.endsWith('.json') && x !== 'index.json')) for (const w of JSON.parse(fs.readFileSync(path.join(tdir, f), 'utf8')).words) themeOfPack.set(w.id, f.replace(/\.json$/, ''));
  const entries = ordered.map((w, i) => ({ pos: i + 1, block: Math.floor(i / 100) + 1, id: w.id, he: w.he, en: w.en, partOfSpeech: w.pos, posGroup: posGroup(w.pos), theme: w.topic, themePack: themeOfPack.get(w.id) ?? null, frequencyRank: w.frequencyRank, effectiveRank: w._eff, corpusRank: corpusRank.get(w.id) ?? null, flags: w._flags }));
  const countBy = (k) => entries.reduce((a, e) => (a[e[k]] = (a[e[k]] || 0) + 1, a), {});
  return {
    schema: 'alef-vocab-deck-order/1',
    generated: new Date().toISOString().slice(0, 10),
    rule: 'See the header of tools/vocab/deck_order.mjs: eligible words by frequencyRank (later senses of a shared spelling x3), themes capped at sqrt-share quotas (+10%), parts of speech capped at noun 400 / verb 250 / adj 120 / function 230 (+10%), shortfall filled by priority, then stride-scheduled across themes so each theme is spread evenly and its commonest word comes first. Not native-reviewed; frequency is per spelling so a rare homograph can rank high.',
    size: entries.length, relaxed,
    quotas: { theme: tq, pos: POS_QUOTA, slack: SLACK },
    counts: { theme: countBy('theme'), posGroup: countBy('posGroup'), partOfSpeech: countBy('partOfSpeech') },
    entries,
  };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const out = buildDeck();
  if (!process.argv.includes('--dry')) fs.writeFileSync(path.join(ROOT, DECK_PATH), JSON.stringify(out) + '\n');
  console.log(`deck: ${out.size} words, ${out.relaxed} filled past quotas`);
  console.log('pos groups ' + JSON.stringify(out.counts.posGroup));
  console.log('themes ' + JSON.stringify(out.counts.theme));
  console.log('first 8: ' + out.entries.slice(0, 8).map((e) => `${e.he}(${e.theme})`).join(' '));
}
