#!/usr/bin/env node
// Scores Talk on a held-out file with the shipped code and the shipped translation pack (no network, no npm dependency).
//   node tools/talk/nmt/score.mjs tests/fixtures/talk.heldout.json [--mode hybrid|model|phrases] [--beams 2] [--out file.json] [-v]
//                                 [--hq <packs dir>] [--no-memory]
// --hq: Hebrew to English lines go to the high-quality pack in <packs dir>/he-en-hq (it is not carried by the site; see alef-tools).
// --no-memory: leave out the sentence memory (data/talk/tm), to see what it adds. chrF is given beside the house scores.
// hybrid: stored lines first, the pack for the rest (what the screen does once the pack is on the device).
// model: every line through the pack.  phrases: stored lines only (what the screen does without the pack).
import { readFileSync, writeFileSync } from 'node:fs';
import { loadEngine } from '../../../src/talk/data.js';
import { translateLine } from '../../../src/talk/hybrid.js';
import { finishLine } from '../../../src/talk/nmt/postedit.js';
import { detectDirection } from '../../../src/talk/talk.model.js';
import { loadDirection, loadPackFrom, fileMemory } from './node-runtime.mjs';
import { translateUrl } from '../../../src/talk/nmt/tools.js';
const { chrF } = await import(translateUrl('scoring.js'));
import { strictScore, acceptedScore, summarize } from './scoring.mjs';

const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(n); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const mode = flag('--mode', 'hybrid'); const beams = Number(flag('--beams', '2')); const outFile = flag('--out', ''); const hq = flag('--hq', '');
const noMemory = args.includes('--no-memory'); if (noMemory) args.splice(args.indexOf('--no-memory'), 1);
const verbose = args.includes('-v'); const file = args.find((a) => !a.startsWith('-'));
if (!file) { console.error('usage: score.mjs <fixture.json> [--mode hybrid|model|phrases] [--beams n] [--out file] [-v]'); process.exit(2); }

const fixture = JSON.parse(readFileSync(file, 'utf8'));
const engine = await loadEngine(); await engine.loadDictionary();
let terms = null; try { terms = JSON.parse(readFileSync(new URL('../../../data/talk/terms.json', import.meta.url), 'utf8')); } catch { /* optional */ }
const loaded = {};
const pack = mode === 'phrases' ? null : { ready: () => true, translate: async (d, t) => (loaded[d] ||= await (hq && d === 'he-en' ? loadPackFrom(hq, 'he-en-hq') : loadDirection(d))).translate(t, { beams }) };
const memory = mode === 'hybrid' && !noMemory ? await fileMemory() : null;
const rows = []; const t0 = Date.now();
for (const s of fixture.samples) {
  let r;
  if (mode === 'model') { const d = s.direction || detectDirection(s.source); r = { ok: true, direction: d, method: 'model', translation: finishLine(await pack.translate(d, s.source), s.source, d, terms) }; }
  else r = await translateLine(engine, pack, s.source, { direction: s.direction, terms, memory });
  const hyp = r.ok ? r.translation : '';
  const row = { id: s.id, direction: s.direction, source: s.source, translation: hyp, ok: !!r.ok, method: r.method, strict: r.ok ? Number(strictScore(hyp, s).toFixed(4)) : 0, accepted: r.ok ? Number(acceptedScore(hyp, s).toFixed(4)) : 0 };
  rows.push(row);
  if (verbose && row.accepted < 1) console.log(`${row.accepted.toFixed(2)}  ${s.id}  ${s.source}  =>  ${hyp || '(refused)'}  | ref: ${s.reference}  | ${r.method}`);
}
const refOf = new Map(fixture.samples.map((x) => [x.id, x.reference]));
const chr = (sel) => { const r = rows.filter(sel); return r.length ? Number(chrF(r.map((x) => ({ hyp: x.translation, ref: refOf.get(x.id) }))).toFixed(1)) : null; };
const sum = { file, mode, beams, pack: hq ? 'he-en-hq for Hebrew to English' : 'ordinary', memory: !!memory, ...summarize(rows), chrF: { all: chr(() => true), 'en-he': chr((x) => x.direction === 'en-he'), 'he-en': chr((x) => x.direction === 'he-en') }, secondsPerLine: Number(((Date.now() - t0) / 1000 / rows.length).toFixed(2)) };
console.log(JSON.stringify(sum));
if (outFile) writeFileSync(outFile, JSON.stringify({ schema: 'alef.talk.heldout.results.v1', summary: sum, rows }, null, 1) + '\n');
