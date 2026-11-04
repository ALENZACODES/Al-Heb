#!/usr/bin/env node
// Dev tooling: agreement between Dicta Nakdan and the project phrasebook's own pointing (30 phrases, public project-owned text only).
// The phrasebook pointing is itself flagged "native-speaker-needed", so this measures AGREEMENT, not correctness.
// Calls the live Dicta endpoint ~30 times with a 400 ms gap. Usage: node tools/ocr-bench/nakdan-eval.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { createNakdanVowelizer } from '../../src/photo/engines/web.js';
import { stripMarks, tokenise } from '../../src/photo/hebrew.js';
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const pb = JSON.parse(readFileSync(join(root, 'data/corpus/phrasebook.json'), 'utf8')).entries.filter((e) => e.pointed !== false);
const sample = pb.filter((_, i) => i % Math.floor(pb.length / 30) === 0).slice(0, 30);
const v = createNakdanVowelizer({});
const norm = (s) => s.normalize('NFD').replace(/[ֽ֑-֯]/g, '').replace(/[ׁׂ]/g, '').split('').sort().join(''); // order-insensitive per word, ignore shin/sin dot & taamim
const wordNorm = (w) => w.normalize('NFC').replace(/[ֽ֑-֯]/g, '');
let words = 0, exact = 0, ms = []; const rows = [];
for (const e of sample) {
  const un = stripMarks(e.he).replace(/[?!.,]/g, '');
  const t0 = performance.now(); let out; try { out = await v.vowelize(un); } catch (err) { out = `<error ${err.message}>`; }
  ms.push(performance.now() - t0);
  const ref = tokenise(e.he.replace(/[?!.,]/g, '')), hyp = tokenise(out);
  ref.forEach((w, i) => { words++; if (hyp[i] && norm(hyp[i]) === norm(w)) exact++; });
  rows.push({ id: e.id, input: un, nakdan: out, phrasebook: e.he });
  await new Promise((r) => setTimeout(r, 400));
}
ms.sort((a, b) => a - b);
const res = { phrases: sample.length, words, wordsAgree: exact, agreementPct: Math.round((1000 * exact) / words) / 10, msMedian: Math.round(ms[ms.length >> 1]), msMax: Math.round(ms[ms.length - 1]), rows };
writeFileSync(join(root, 'data/photo/_benchmark/nakdan-agreement.json'), JSON.stringify(res, null, 1));
console.log({ ...res, rows: undefined });
for (const r of rows.filter((r) => norm(r.nakdan) !== norm(r.phrasebook)).slice(0, 12)) console.log(r.input, '| nakdan:', r.nakdan, '| phrasebook:', r.phrasebook);
