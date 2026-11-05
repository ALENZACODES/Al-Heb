#!/usr/bin/env node
// Known-word coverage report. Usage:
//   node tools/knownwords/check.mjs --dialogues [--level A1|A2|B1|B2] [--min 0.9]   every dialogue in data/curriculum/dialogues.json against the vocabulary list
//   node tools/knownwords/check.mjs --file path.txt --level A2 [--min 0.95]          any UTF-8 text file
// With --level omitted, dialogues use their own `level` field. Exit code 1 when any text is below --min (default: no gate).
// Reads repo data only; writes nothing; invents no Hebrew. See docs/research/B2-known-words.md.
import { readFileSync } from 'node:fs';
import { knownSet, validate, similar, dialogueText, LEVELS } from '../../src/knownwords/validate.js';

const arg = (n) => { const i = process.argv.indexOf(n); return i < 0 ? null : (process.argv[i + 1] ?? true); };
const rel = (p) => new URL('../../' + p, import.meta.url);
const rows = JSON.parse(readFileSync(rel('data/vocab/words.json'), 'utf8')).words;
const min = arg('--min') ? Number(arg('--min')) : null, forced = arg('--level');
if (forced && !LEVELS.includes(forced)) { console.error(`--level must be one of ${LEVELS.join(', ')}`); process.exit(2); }
const sets = {}; const setFor = (lv) => (sets[lv] ??= knownSet(rows, { maxLevel: lv }));
const jobs = [];
if (arg('--dialogues')) for (const d of JSON.parse(readFileSync(rel('data/curriculum/dialogues.json'), 'utf8')).dialogues) jobs.push({ name: d.id, level: forced || d.level, text: dialogueText(d) });
if (arg('--file')) jobs.push({ name: String(arg('--file')), level: forced || 'A1', text: readFileSync(String(arg('--file')), 'utf8') });
if (!jobs.length) { console.error('give --dialogues or --file <path>'); process.exit(2); }
let below = 0;
for (const j of jobs) {
  if (!LEVELS.includes(j.level)) { console.log(`${j.name}: level "${j.level}" is not A1-B2, skipped`); continue; }
  const k = setFor(j.level), r = validate(j.text, k);
  const bad = min != null && r.coverage < min; if (bad) below++;
  console.log(`${j.name} [${j.level}] words ${r.total}, listed ${r.exact}, by prefix ${r.prefix}, not listed ${r.total - r.exact - r.prefix}, coverage ${(r.coverage * 100).toFixed(1)}%${bad ? '  BELOW ' + min : ''}`);
  for (const u of r.unknown.slice(0, 12)) { const s = similar(u.word, k); console.log(`    ${u.word} x${u.count}${s.length ? '  (similar spelling, may be unrelated: ' + s.join(' ') + ')' : ''}`); }
}
console.log(`${jobs.length} text(s) checked, ${below} below the gate`);
process.exit(below ? 1 : 0);
