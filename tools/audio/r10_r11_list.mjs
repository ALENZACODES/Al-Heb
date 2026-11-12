#!/usr/bin/env node
// Job list (tools/audio/fill-list-r10-r11.json) for .github/workflows/fill-clips.yml:
//   R-10  the four Moses pages (book63 pages 8, 9, 11, 12) that say אֱלֹהִים, read as written ("Elohim"), exactly as the Torah
//         clips do (tools/torah/audio/fix_shard.py spoken(): only the four-letter name is rewritten). Same voices and method as the
//         book's other pages (data/audio/manifest-book63.json: Noa he-IL-Wavenet-A, Ari he-IL-Wavenet-B, speaking rate 0.82). A page
//         with the four-letter name in any form is never listed.
//   R-11  the service prayer lines still in WaveNet after fill-clips run 2, and the prayer lines held after run 3, in Chirp 3 HD
//         (owner rule: prayer lines in Chirp HD). Several takes per line (three Chirp 3 HD voices per narrator, rates 0.85 to 1.0,
//         words apart); the best take that at most one of the three reviewers hears a word off in is kept (mode "pass").
//         The four clergy-list clips (prefixed divine-name forms) are never listed.
//   node tools/audio/r10_r11_list.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { estimate, heldReason } from './fill_list.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const J = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
const jsonl = (glob) => fs.readdirSync(path.join(ROOT, 'docs/audio/fill')).filter((f) => glob.test(f))
  .flatMap((f) => fs.readFileSync(path.join(ROOT, 'docs/audio/fill', f), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)));
const TETRA = /י[֑-ׇ]*ה[֑-ׇ]*ו[֑-ׇ]*ה/;
export const OUT = 'tools/audio/fill-list-r10-r11.json';
export const CHIRP = { m: ['he-IL-Chirp3-HD-Charon', 'he-IL-Chirp3-HD-Orus', 'he-IL-Chirp3-HD-Fenrir'], f: ['he-IL-Chirp3-HD-Kore', 'he-IL-Chirp3-HD-Aoede', 'he-IL-Chirp3-HD-Leda'] };
const BOOK = { m: 'he-IL-Wavenet-B', f: 'he-IL-Wavenet-A' };

export function chirpTakes(v) {
  const [a, b, c] = CHIRP[v];
  const n = (x) => x.split('-').pop().toLowerCase();
  return [
    { name: `${n(a)}-1.0`, voice: a, rate: 1.0 }, { name: `${n(a)}-apart-0.9`, voice: a, rate: 0.9, apart: true }, { name: `${n(a)}-0.85`, voice: a, rate: 0.85 },
    { name: `${n(b)}-1.0`, voice: b, rate: 1.0 }, { name: `${n(b)}-0.9`, voice: b, rate: 0.9 }, { name: `${n(c)}-1.0`, voice: c, rate: 1.0 },
  ];
}

export function main() {
  const rows = [], held = [];
  const book = J('data/books/book63.json');
  for (const p of book.pages.filter((x) => x.audioHeld === 'divine-name')) {
    if (TETRA.test(p.he)) { held.push({ page: p.n, why: 'the four-letter name: not voiced' }); continue; }
    for (const v of ['m', 'f']) rows.push({ path: `audio/${v}/israeli/book/book63-p${String(p.n).padStart(2, '0')}.mp3`, text: p.he, voice: v, family: 'wavenet', mode: 'new',
      takes: [{ name: 'wavenet-0.82', voice: BOOK[v], rate: 0.82 }] });
  }
  const run2Kept = jsonl(/^fill-r2-\d+\.jsonl$/).filter((r) => r.decision === 'kept').map((r) => r.path);
  const run3Held = jsonl(/^fill-r3-\d+\.jsonl$/).filter((r) => r.held).map((r) => r.path);
  const all = [J('data/audio/manifest.json')].flat();
  const byPath = new Map(all.map((e) => [e.path, e]));
  for (const p of [...new Set([...run2Kept, ...run3Held])].sort()) {
    const e = byPath.get(p);
    if (!e) throw new Error(`${p}: not in the manifest`);
    if (heldReason(e)) { held.push({ path: p, why: heldReason(e) }); continue; }
    if (TETRA.test(e.text)) { held.push({ path: p, why: 'the four-letter name' }); continue; }
    rows.push({ path: p, text: e.text, voice: e.voice, family: 'chirp', mode: 'pass', takes: chirpTakes(e.voice) });
  }
  const book8 = estimate(rows.filter((r) => r.mode === 'new'));
  const chirp = rows.filter((r) => r.mode === 'pass');
  const chars = chirp.reduce((n, r) => n + [...r.text].length * r.takes.length, 0);
  const stt = chirp.reduce((n, r) => n + r.takes.length * Math.max(1, Math.ceil([...r.text].length / 12 / 15)), 0) * 0.006;
  const est = { book: book8, chirp: { rows: chirp.length, chars, ttsUsd: +(chars * 30 / 1e6).toFixed(2), sttUsd: +stt.toFixed(2), worstCaseUsd: +(chars * 30 / 1e6 + stt).toFixed(2) } };
  fs.writeFileSync(path.join(ROOT, OUT), JSON.stringify({ schema: 'alef-fill-list/1', mode: 'r10-r11', estimate: est, rows, held }, null, 1) + '\n');
  console.log(`${OUT}: ${rows.length} rows (${rows.length - chirp.length} book, ${chirp.length} Chirp), ${held.length} held; ${JSON.stringify(est)}`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
