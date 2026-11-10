#!/usr/bin/env node
// Runs the Talk engine exactly as the screen does, from the command line, so a speech review can score the shipped engine:
// synthesize a line, transcribe it with any recogniser, then pass the transcript through this tool.
// No network, no keys: it reads the same data files the site serves.
//
//   node tools/talk/translate.mjs "Where is the hotel?"                 one line (direction by script)
//   node tools/talk/translate.mjs --direction he-en "איפה המלון?"
//   node tools/talk/translate.mjs --jsonl < lines.jsonl > out.jsonl     many lines; each input line is
//        {"id":"enhe-01","direction":"en-he","text":"Hello.","reference":"שלום."}   (direction, reference optional)
//   node tools/talk/translate.mjs --score tests/fixtures/talk.fresh3.json           score a fixture file
//   options: --speaker m|f   --no-dictionary
//
// Output per line: id, direction, text, translation, ok, method, confidence, note, and score when a reference is given.
// Score: 1 on an exact match after normalizing, else 1 minus the word error rate against the reference; a refusal scores 0.
import { readFileSync } from 'node:fs';
import { loadEngine } from '../../src/talk/data.js';
import { translationMatchScore } from '../../src/talk/talk.model.js';

const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); if (i < 0) return null; const v = args[i + 1]; args.splice(i, 2); return v; };
const has = (name) => { const i = args.indexOf(name); if (i < 0) return false; args.splice(i, 1); return true; };
const direction = flag('--direction') || 'auto';
const speaker = flag('--speaker') || '';
const scoreFile = flag('--score');
const jsonl = has('--jsonl');
const noDict = has('--no-dictionary');

const engine = await loadEngine();
if (!noDict) await engine.loadDictionary();

function run(item) {
  const r = engine.translate(String(item.text ?? item.source ?? ''), { direction: item.direction || direction, speaker: /** @type {any} */ (item.speaker || speaker) });
  const out = { id: item.id, direction: r.direction, text: r.source, translation: r.translation, ok: r.ok, held: !!r.held, method: r.method, confidence: r.confidence, note: r.note || '' };
  if (item.reference !== undefined) Object.assign(out, { reference: item.reference, score: r.ok ? Number(translationMatchScore(r.translation, item.reference).toFixed(4)) : 0 });
  return out;
}

function summary(rows) {
  const scored = rows.filter((r) => r.score !== undefined);
  const by = {};
  for (const r of rows) by[r.method] = (by[r.method] || 0) + 1;
  const total = scored.reduce((a, r) => a + r.score, 0);
  return { lines: rows.length, scored: scored.length, score: scored.length ? Number(((100 * total) / scored.length).toFixed(2)) : null, refused: rows.filter((r) => !r.ok).length, byMethod: by };
}

if (scoreFile) {
  const rows = JSON.parse(readFileSync(scoreFile, 'utf8')).samples.map((s) => run({ id: s.id, direction: s.direction, text: s.source, reference: s.reference }));
  for (const r of rows) if (r.score < 1) console.log(`${r.score.toFixed(2)}  ${r.id}  ${r.text}  =>  ${r.translation || '(refused)'}  | ref: ${r.reference}  | ${r.method}`);
  console.log(JSON.stringify(summary(rows)));
} else if (jsonl) {
  const rows = readFileSync(0, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => run(JSON.parse(l)));
  for (const r of rows) console.log(JSON.stringify(r));
  console.error(JSON.stringify(summary(rows)));
} else if (args.length) {
  console.log(JSON.stringify(run({ id: 'line', text: args.join(' ') }), null, 1));
} else {
  console.error('usage: node tools/talk/translate.mjs "line" | --jsonl < lines.jsonl | --score file.json   (see the header of this file)');
  process.exit(2);
}
