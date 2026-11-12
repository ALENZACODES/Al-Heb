#!/usr/bin/env node
// D-07: catalogue rows for the gender pairs, the role-play paradigms and the Israel dialogues, which had no audio entries,
// and the job list that records them (tools/audio/fill-list-d07.json, for .github/workflows/fill-clips.yml).
//   - gender pairs   data/curriculum/gender-pairs.json pairs[]      word/<id>-m and word/<id>-f   (src/curriculum/gender.view.js)
//   - role-plays     data/curriculum/gender-pairs.json paradigms[]  word/<id>-<speaker><addressee> for the four role pairs
//                    (src/curriculum/gender.view.js "Role-play"; src/phrases/model.js for the phrase cards made from them)
//   - dialogues      data/curriculum/dialogues.json lines[]         line/<line id>                (src/curriculum/dialogues.view.js)
// Every row is Israeli, both voices (Ari m, Noa f), scope israeli-only (conversational Modern Hebrew; the Sephardi and Ashkenazi
// settings play the Israeli clip). Recorded in the Israeli WaveNet pair. D-12: the Shin sound clip is listed from the pointed שׁ
// (shin dot), not a bare ש, and is re-recorded from it (it replaces the clip only where no reviewer hears it as worse).
// A text that contains a divine name is never listed: it would be held for the owner.
//   node tools/audio/d07_rows.mjs           add the rows that are not there yet (each manifest keeps its layout) and write the job list
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { composeParadigm } from '../../src/curriculum/gender.js';
import { layoutOf, write } from './plays_israeli.mjs';
import { estimate } from './fill_list.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const J = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const NAME = /י[ְ-ּ]*ה[ְ-ּ]*ו[ְ-ּ]*ה|יְיָ|(^|[^א-ת])ה[׳']|אֱלֹה|אֲדֹנָי|יָהּ|שַׁדַּי/;
export const OUT = 'tools/audio/fill-list-d07.json';
const SHIN = 'שׁ';

export function d07Items(root = ROOT) {
  const g = JSON.parse(fs.readFileSync(path.join(root, 'data/curriculum/gender-pairs.json'), 'utf8'));
  const d = JSON.parse(fs.readFileSync(path.join(root, 'data/curriculum/dialogues.json'), 'utf8'));
  const items = [];
  for (const p of g.pairs) for (const f of ['m', 'f']) items.push({ kind: 'word', id: `${p.id}-${f}`, text: p.forms[f].he, english: p.en, phonetic: p.forms[f].translit, group: 'gender-pair' });
  for (const par of g.paradigms) for (const s of ['m', 'f']) for (const a of ['m', 'f']) {
    const c = composeParadigm(par, s, a);
    items.push({ kind: 'word', id: `${par.id}-${s}${a}`, text: c.he, english: par.en, phonetic: c.translit, group: 'gender-paradigm' });
  }
  for (const x of d.dialogues) for (const l of x.lines) items.push({ kind: 'line', id: l.id, text: l.he, english: l.en, phonetic: l.translit, group: 'dialogue-line' });
  return items;
}

export function main() {
  const items = d07Items();
  const held = items.filter((i) => NAME.test(i.text)).map((i) => ({ id: i.id, why: 'divine name: held for the owner' }));
  const files = { word: 'data/audio/manifest-kind-word.json', line: 'data/audio/manifest.json' };
  const texts = {}, lists = {};
  for (const [k, rel] of Object.entries(files)) { texts[k] = fs.readFileSync(path.join(ROOT, rel), 'utf8'); lists[k] = JSON.parse(texts[k]); }
  const have = new Set(Object.values(lists).flat().map((e) => e.path));
  let added = 0;
  for (const i of items) for (const voice of ['m', 'f']) {
    const p = `audio/${voice}/israeli/${i.kind}/${i.id}.mp3`;
    if (have.has(p)) continue;
    lists[i.kind].push({ path: p, voice, tradition: 'israeli', kind: i.kind, id: i.id, text: i.text, status: 'missing', source: 'none', group: i.group, english: i.english, phonetic: i.phonetic, scope: 'israeli-only' });
    added++;
  }
  // D-12: the Shin sound rows (and the Dot Tile row that plays them) carry the pointed shin, not a bare ש.
  let shin = 0;
  for (const e of lists.line) if ((e.id === 'shin-sound' && e.kind === 'letter') || (e.id === 'dot-shin-sin-0' && e.kind === 'syllable')) { if (e.text !== SHIN) { e.text = SHIN; shin++; } }
  for (const [k, rel] of Object.entries(files)) { const out = write(lists[k], layoutOf(texts[k])); if (out !== texts[k]) fs.writeFileSync(path.join(ROOT, rel), out); }
  const heldIds = new Set(held.map((h) => h.id));
  const rows = [];
  for (const i of items) if (!heldIds.has(i.id)) for (const voice of ['m', 'f']) {
    const p = `audio/${voice}/israeli/${i.kind}/${i.id}.mp3`;
    if (!fs.existsSync(path.join(ROOT, p))) rows.push({ path: p, text: i.text, voice, family: 'wavenet', mode: 'new' });
  }
  for (const voice of ['m', 'f']) rows.push({ path: `audio/${voice}/israeli/letter/shin-sound.mp3`, text: SHIN, voice, family: 'wavenet', mode: 'replace' });
  const est = estimate(rows);
  fs.writeFileSync(path.join(ROOT, OUT), JSON.stringify({ schema: 'alef-fill-list/1', mode: 'd07', estimate: est, rows, held }, null, 1) + '\n');
  console.log(`manifest rows added: ${added}; shin rows re-pointed: ${shin}; ${OUT}: ${rows.length} rows, ${held.length} held; ${JSON.stringify(est)}`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
