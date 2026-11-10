#!/usr/bin/env node
// Recording script for human-audio donors: the first 1,000 words, one CSV per tradition, with the EXACT rule-generated
// variant to read aloud.   node tools/pronunciation/recording_script.mjs [--dry]
//   -> docs/voices/recording-script-israeli.csv, -sephardi.csv, -ashkenazi.csv
//
// Which 1,000 words and in what order: the 1,000 entries of data/vocab/deck-order.json (the learner deck) when that
// file exists, ordered by data/vocab/frequency.json corpusRank (occurrence counts in the project's own Hebrew text;
// ties and zero-count words follow the main frequencyRank, as that file defines). If deck-order.json is missing the
// 1,000 best-ranked single-word entries of frequency.json are used instead.
//
// Every value is rule output from build_variants.mjs, NOT verified by a native speaker. A donor who knows the word
// is read differently in their tradition must say so in `donor_note`; the row is then a review item, not an error.

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAll, ROOT, TRADITIONS } from './build_variants.mjs';

export const COUNT = 1000;
export const OUT_DIR = join(ROOT, 'docs', 'voices');
export const csvName = (t) => `recording-script-${t}.csv`;
export const COLUMNS = ['order', 'id', 'pointed_hebrew', 'read_aloud', 'ipa', 'stressed_syllable', 'syllables', 'stress_rule', 'gloss', 'pos', 'corpus_count', 'check', 'donor_note', 'take_ok'];

const CHECK = {
  'divine-name': 'divine name: read as Adonai',
  'possible-segolate': 'stress unsure: segolate-shaped word read with final stress by default',
  'ipa-differs-from-words.json': 'rule IPA differs from the older words.json ipa',
  'words-ipa-syllable-count-differs': 'older words.json ipa could not be aligned',
  'vav-cholam-consonantal': 'vav read as consonant + o: confirm',
  'alef-vav-mater-repaired': 'vav after alef read as a vowel letter: confirm',
  'kamatz-katan-before-chataf': 'kamatz read as o by rule: confirm',
  'kamatz-katan-list': 'kamatz katan (o) from the short list: confirm',
  'he-patach-no-mappiq': 'final he with patach read with sounded he: confirm',
  'shva-heuristic-L3': 'shva after a long vowel read as vocal by heuristic: confirm',
  'words-ipa-colloquial-shva-drop': 'careful reading shown; everyday speech drops a shva: read the careful form',
  'unpointed': 'no niqqud in the source: do not record until pointed',
};
const csv = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };

/** Choose and order the 1,000 ids. */
export function chooseIds() {
  const freq = JSON.parse(readFileSync(join(ROOT, 'data/vocab/frequency.json'), 'utf8')).entries;
  const rank = new Map(freq.map((e, i) => [e.id, { rank: e.corpusRank, total: e.total, i }]));
  const deckFile = join(ROOT, 'data/vocab/deck-order.json');
  let ids; let source;
  if (existsSync(deckFile)) {
    ids = JSON.parse(readFileSync(deckFile, 'utf8')).entries.map((e) => e.id).slice(0, COUNT);
    source = 'deck-order.json ordered by frequency.json corpusRank';
  } else {
    ids = freq.map((e) => e.id); source = 'frequency.json corpusRank (deck-order.json absent)';
  }
  const deckPos = new Map(ids.map((id, i) => [id, i]));
  ids = ids.filter((id) => rank.has(id)).sort((a, b) => rank.get(a).rank - rank.get(b).rank || deckPos.get(a) - deckPos.get(b));
  return { ids, rank, source };
}

export function buildScripts() {
  const built = buildAll();
  const byId = new Map(built.records.map((r) => [r.id, r]));
  const words = new Map(JSON.parse(readFileSync(join(ROOT, 'data/vocab/words.json'), 'utf8')).words.map((w) => [w.id, w]));
  const { ids: all, rank, source } = chooseIds();
  const ids = [];
  for (const id of all) { const r = byId.get(id); if (r && r.source === 'vocab' && r.kind === 'word' && !r.flags.includes('unpointed')) ids.push(id); if (ids.length >= COUNT) break; }
  const files = {};
  for (const t of TRADITIONS) {
    const ti = TRADITIONS.indexOf(t);
    const rows = [COLUMNS];
    ids.forEach((id, k) => {
      const rec = byId.get(id); const w = words.get(id); const r = built.rendered.get(id);
      const pw = r.perWord[0];
      const v = rec.variants[t];
      const st = pw.stress[t].syllable;
      const syls = pw.syllables.map((s, i) => (i === st - 1 ? `[${s}]` : s)).join(' ');
      const checks = rec.flags.map((f) => CHECK[f]).filter(Boolean);
      if (t === 'ashkenazi' && rec.flags.includes('ashk-final-kamatz-reduced')) checks.push('final kamatz-he read as a short unstressed vowel (eh)');
      rows.push([k + 1, id, rec.he, v.simple, v.ipa, `${st} of ${pw.syllables.length}`, syls, pw.stress[t].rule, w.en, w.pos ?? '', rank.get(id).total, checks.join('; '), '', '']);
    });
    files[csvName(t)] = rows.map((row) => row.map(csv).join(',')).join('\n') + '\n';
  }
  return { files, count: ids.length, source };
}

export function writeScripts(dir = OUT_DIR) {
  const s = buildScripts();
  mkdirSync(dir, { recursive: true });
  for (const [f, text] of Object.entries(s.files)) writeFileSync(join(dir, f), text);
  return s;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const s = process.argv.includes('--dry') ? buildScripts() : writeScripts();
  console.log(JSON.stringify({ rows: s.count, source: s.source, files: Object.keys(s.files) }));
}
