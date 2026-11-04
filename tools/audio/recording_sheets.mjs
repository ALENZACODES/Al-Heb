#!/usr/bin/env node
// DRAFT. Printable per-session script sheets (HTML, large pointed Hebrew, checkboxes) for donors.
//   node tools/audio/recording_sheets.mjs                       print counts only
//   node tools/audio/recording_sheets.mjs --write               write docs/voices/recording/sheets/<tradition>-<voice>/session-NN.html (+ index.html), israeli + ashkenazi
//   node tools/audio/recording_sheets.mjs --write --tradition sephardi   (blocked: no Sephardi decision yet, see docs/voices/kit/README.md)
//   options: --per-sheet N (default 40 lines, about 15 to 20 minutes at 120-180 lines/hour)
// Uses the PRIORITY subset from recording_needs.mjs. Nothing here contacts or recruits anyone.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generate, PRIORITY_LABELS, LINES_PER_HOUR } from './recording_needs.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const SHEET_DIR = 'docs/voices/recording/sheets';
export const DEFAULT_PER_SHEET = 40;
export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export const TRADITION_NOTES = {
  israeli: 'Read as modern Israeli Hebrew: kamatz and patach both sound "a"; tzere and segol both "e"; cholam "o"; kubutz and shuruk "u". Stress is usually on the last syllable. Say the vowel under each letter exactly as pointed, do not guess from memory.',
  ashkenazi: 'Read in YOUR community\'s Ashkenazi liturgical pronunciation, one dialect throughout (your director will confirm which). Typical features: kamatz "o" (Lithuanian) or similar, cholam "oy" or "ey" by dialect, tav without a dagesh "s", stress on the next-to-last syllable. If a word could go two ways, read it the way you would in synagogue and tell the director.',
  sephardi: 'DRAFT. No Sephardi reading rules have been decided yet. Wait for the director.',
};

/** Split rows into sessions of at most `per` lines, never mixing priority groups inside a sheet unless the group is short. Order is preserved. */
export function chunk(rows, per = DEFAULT_PER_SHEET) {
  const out = [];
  for (let i = 0; i < rows.length; i += per) out.push(rows.slice(i, i + per));
  return out;
}

export function sheetHtml({ tradition, voice, n, total, rows }) {
  const mins = (a, b) => `${Math.round(rows.length / b * 60)} to ${Math.round(rows.length / a * 60)}`;
  const body = rows.map((r, i) => `<tr><td class="n">${i + 1}</td><td class="cb"><span class="box"></span></td><td class="he" lang="he" dir="rtl">${esc(r.text_niqqud)}</td><td class="tr">${esc(r.transliteration)}<br><span class="id">${esc(r.id)} &middot; ${esc(r.kind)}</span></td><td class="cb"><span class="box"></span><div class="lb">retake</div></td></tr>`).join('\n');
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>DRAFT ALEF recording sheet ${esc(tradition)}-${esc(voice)} session ${n}</title>
<style>
body{font-family:Georgia,serif;margin:1.2cm;color:#000}
.draft{border:2px solid #b00;color:#b00;padding:.3em .6em;font:bold 12pt sans-serif}
h1{font:bold 16pt sans-serif;margin:.5em 0 .2em}
.meta{font:11pt sans-serif;margin:.3em 0}.meta span{display:inline-block;min-width:7cm;border-bottom:1px solid #000;margin-right:1em}
.note{font:10.5pt sans-serif;margin:.5em 0;padding:.4em .6em;background:#f2f2f2}
table{border-collapse:collapse;width:100%}td{border-bottom:1px solid #999;padding:.25em .4em;vertical-align:middle}
.n{font:10pt sans-serif;width:1.2cm;color:#555}.he{font-family:"SBL Hebrew","Ezra SIL","Frank Ruehl CLM","David CLM","Times New Roman",serif;font-size:34pt;line-height:1.5;text-align:right;width:45%}
.tr{font:11pt sans-serif;color:#333}.id{font-size:8pt;color:#777}.cb{width:2cm;text-align:center}.box{display:inline-block;width:.6cm;height:.6cm;border:1.5px solid #000}.lb{font:8pt sans-serif;color:#555}
tr{page-break-inside:avoid}
@media print{body{margin:1cm}}
</style></head><body>
<div class="draft">DRAFT. Not yet reviewed by a director or a lawyer. Do not record until the donor rights grant (docs/voices/donor-rights-grant.html) is signed.</div>
<h1>ALEF recording sheet: ${esc(tradition)} / voice ${esc(voice)} / session ${n} of ${total}</h1>
<p class="meta">Donor name: <span>&nbsp;</span> Date: <span>&nbsp;</span></p>
<p class="meta">Lines on this sheet: ${rows.length}. Estimated time: ${mins(LINES_PER_HOUR.low, LINES_PER_HOUR.high)} minutes (assumption of ${LINES_PER_HOUR.low} to ${LINES_PER_HOUR.high} lines per hour, not measured).</p>
<p class="note"><b>How to read:</b> ${esc(TRADITION_NOTES[tradition] || '')}<br><b>Each line:</b> pause one second, say it once at a calm, even pace, pause again. Tick the first box when you have recorded it. If you stumble, say nothing, wait two seconds, say it again, and tick "retake". Phone about 20 cm from your mouth, quiet room. Record 10 seconds of silence before the first line and after the last.</p>
<table>
${body}
</table>
<p class="meta">Donor initials: <span>&nbsp;</span> Session file name(s): <span>&nbsp;</span></p>
</body></html>
`;
}

export function indexHtml(tradition, voice, sheets) {
  const items = sheets.map((s, i) => `<li><a href="session-${String(i + 1).padStart(2, '0')}.html">Session ${i + 1}</a>: ${s.length} lines, first priority group ${esc(PRIORITY_LABELS[s[0].priority] || '')}</li>`).join('\n');
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>DRAFT ${esc(tradition)}-${esc(voice)} sheets</title></head><body><p><b>DRAFT.</b></p><h1>${esc(tradition)} / ${esc(voice)}: ${sheets.length} session sheets</h1><ul>\n${items}\n</ul></body></html>\n`;
}

export function buildSheets(rows, tradition, voice, per = DEFAULT_PER_SHEET) {
  const mine = rows.filter((r) => r.tradition === tradition && r.voice === voice && r.priority < 9);
  const sheets = chunk(mine, per);
  const files = {};
  sheets.forEach((s, i) => { files[`session-${String(i + 1).padStart(2, '0')}.html`] = sheetHtml({ tradition, voice, n: i + 1, total: sheets.length, rows: s }); });
  files['index.html'] = indexHtml(tradition, voice, sheets);
  return { sheets, files };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
  const per = Number(opt('--per-sheet', DEFAULT_PER_SHEET));
  const tr = opt('--tradition', null);
  const traditions = tr ? [tr] : ['israeli', 'ashkenazi'];
  const { rows } = generate();
  for (const t of traditions) for (const v of ['m', 'f']) {
    const { sheets, files } = buildSheets(rows, t, v, per);
    if (args.includes('--write')) {
      const dir = path.join(ROOT, SHEET_DIR, `${t}-${v}`);
      fs.mkdirSync(dir, { recursive: true });
      for (const [f, c] of Object.entries(files)) fs.writeFileSync(path.join(dir, f), c);
    }
    console.log(`${t}-${v}: ${sheets.length} sheets, ${sheets.reduce((a, s) => a + s.length, 0)} lines`);
  }
}
