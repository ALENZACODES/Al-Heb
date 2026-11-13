// Example-sentence sweep: takes an example off an entry when the sentence illustrates a different word.
//
//   node tools/vocab/hold_examples.mjs --sweep <example-sweep.json> [--dry-run]
//   node tools/vocab/apply_corrections.mjs
//
// The sweep list comes from the tools repo (ALENZACODES/alef-tools, packages/morph/review/example-sweep.json, written
// by packages/morph/scripts/sweep_examples.py): every example of data/vocab/words.json read in its own sentence, with
// a verdict. For each "hold" this adds one entry to data/vocab/corrections.json: field "example", the whole example
// in `old`, null in `new`, and the reason. apply_corrections.mjs then removes it from words.json and the pack files,
// the same way the earlier example removals were made. Nothing else about the entry is touched (no pointing, gloss,
// part of speech, gender, forms or root), and no sentence is written to replace a held one. A held example is not
// lost: it stays in corrections.json and can be put back by deleting its entry and restoring `old`.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const SWEEP_TAG = 'example sweep, 12 Nov 2026';
const KIND = { NOUN: 'a noun', PROPN: 'a name', VERB: 'a verb', AUX: 'a helping verb', ADJ: 'an adjective', ADV: 'an adverb', ADP: 'a preposition', PRON: 'a pronoun', CCONJ: 'a linking word', SCONJ: 'a linking word', NUM: 'a number', DET: 'a pointing word', INTJ: 'an exclamation' };
const ENTRY_KIND = { noun: 'a noun', verb: 'a verb', adj: 'an adjective', adv: 'an adverb', prep: 'a preposition', pron: 'a pronoun', conj: 'a linking word', num: 'a number', intj: 'an exclamation', det: 'a pointing word' };

/** The reason line for one held example. @param {any} row a sweep row with verdict "hold" */
export function reasonFor(row) {
  const word = `"${row.match}"`;
  const tail = ` Held, not replaced (${SWEEP_TAG}).`;
  if (row.why === 'used-as-a-name') return `in this sentence ${word} is a name, not this word.${tail}`;
  if (row.why === 'other-word') return `in this sentence ${word} is read as another word (dictionary form ${row.modelLemma}), not this entry.${tail}`;
  const is = KIND[row.modelPos] || 'another kind of word', want = ENTRY_KIND[row.pos] || 'a different kind of word';
  return `in this sentence ${word} is read as ${is}; this entry is ${want}.${tail}`;
}

/** @returns {{added:any[], skipped:{id:string, why:string}[]}} */
export function planHolds(sweep, words, corrections) {
  const byId = new Map(words.map((w) => [w.id, w]));
  const has = new Set(corrections.filter((c) => c.field === 'example').map((c) => c.id));
  const added = [], skipped = [];
  for (const row of sweep.rows) {
    if (row.verdict !== 'hold') continue;
    const w = byId.get(row.id);
    if (!w || !w.example) { skipped.push({ id: row.id, why: 'no example on the entry now' }); continue; }
    if (has.has(row.id)) { skipped.push({ id: row.id, why: 'already has an example correction' }); continue; }
    if (String(w.example.match ?? '').normalize('NFC').replace(/[֑-ֽֿ-ׇ]/g, '') !== row.match) { skipped.push({ id: row.id, why: 'the example changed since the sweep' }); continue; }
    added.push({ id: row.id, field: 'example', old: w.example, new: null, reason: reasonFor(row) });
  }
  return { added, skipped };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg = (n) => { const i = process.argv.indexOf(n); return i < 0 ? null : process.argv[i + 1]; };
  const sweepPath = arg('--sweep');
  if (!sweepPath) { console.error('usage: hold_examples.mjs --sweep <example-sweep.json> [--dry-run]'); process.exit(2); }
  const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  const sweep = JSON.parse(fs.readFileSync(sweepPath, 'utf8'));
  const spec = read('data/vocab/corrections.json');
  const { added, skipped } = planHolds(sweep, read('data/vocab/words.json').words, spec.corrections);
  console.log(`${added.length} examples to hold, ${skipped.length} skipped${skipped.length ? ` (${[...new Set(skipped.map((s) => s.why))].join('; ')})` : ''}`);
  if (process.argv.includes('--dry-run') || !added.length) process.exit(0);
  spec.corrections.push(...added);
  spec.counts.examples = spec.corrections.filter((c) => c.field === 'example').length;
  spec.exampleSweep = { date: '2026-11-12', model: sweep.model, revision: sweep.revision, examplesRead: sweep.examples, held: added.length, tool: 'tools/vocab/hold_examples.mjs', list: 'alef-tools packages/morph/review/example-sweep.json' };
  fs.writeFileSync(path.join(ROOT, 'data/vocab/corrections.json'), JSON.stringify(spec, null, 1) + '\n');
}
