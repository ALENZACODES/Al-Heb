#!/usr/bin/env node
// Printable practice workbooks (A4 + US Letter PDFs) in the style of a hand-made notebook: one ruled row per letter with a tick box,
// number, English name (gematria) and a long line of repetitions that fades solid -> grey -> dotted -> blank. Hebrew is right-to-left, so the
// first (model) glyph is at the RIGHT end and the repetitions run leftward.
//
// Usage: node tools/letters/workbook.mjs [--html-only] [--mnemonics]
//   --mnemonics also builds the '-mnemonics' editions: each letter row gets a one-line memory-hook caption from data/letters/mnemonics.json.
// Output: docs/workbook/alef-workbook-<print|cursive>-<a4|letter>.pdf (+ html/ sources, manifest.json), copied to assets/workbook/.
// Dev tooling: needs Playwright (Chromium) only for the PDF step; buildModel()/buildHtml() are pure and unit-tested.
// Fonts (SIL OFL 1.1): Frank Ruhl Libre = print, Gveret Levin = cursive (ktav yad). Stroke-order pages come from data/letters/letters.json (DRAFT).
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const readJson = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export const PAPERS = { a4: { w: 210, h: 297, css: 'A4', label: 'A4' }, letter: { w: 215.9, h: 279.4, css: '8.5in 11in', label: 'US Letter' } };
export const SCRIPTS = { print: { print: true, family: 'WB-Print', label: 'Print', file: 'frankruhllibre-FrankRuhlLibre[wght].ttf' }, cursive: { family: 'WB-Cursive', label: 'Cursive (ktav yad)', file: 'gveretlevin-GveretLevin-Regular.ttf' } };

const MARK = { dagesh: 'ּ', shin: 'ׁ', sin: 'ׂ' };
const SOFIT = { 'kaf-final': 'Kaf sofit', 'mem-final': 'Mem sofit', 'nun-final': 'Nun sofit', 'pe-final': 'Pe sofit', 'tsadi-final': 'Tsadi sofit' };
// rows with two sounds: [id, base-row label, glyph, ipa] then variant row
const TWO_SOUNDS = {
  bet: { hard: ['Bet', 'ב' + MARK.dagesh, 'b'], soft: ['Vet', 'ב', 'v'] },
  kaf: { hard: ['Kaf', 'כ' + MARK.dagesh, 'k'], soft: ['Khaf', 'כ', 'χ'] },
  pe: { hard: ['Pe', 'פ' + MARK.dagesh, 'p'], soft: ['Fe', 'פ', 'f'] },
  shin: { hard: ['Shin', 'ש' + MARK.shin, 'ʃ'], soft: ['Sin', 'ש' + MARK.sin, 's'] }
};
const GROUPS = [
  ['alef', 'bet', 'gimel', 'dalet', 'he', 'vav', 'zayin', 'chet', 'tet'],
  ['yod', 'kaf', 'lamed', 'mem', 'nun', 'samekh', 'ayin', 'pe', 'tsadi'],
  ['qof', 'resh', 'shin', 'tav', 'kaf-final', 'mem-final', 'nun-final', 'pe-final', 'tsadi-final']
];
const VOWEL_ROWS = ['kamatz', 'patach', 'tzere', 'segol', 'chirik', 'cholam', 'kubutz', 'shuruk'];
const SYL_CONSONANTS = ['ב', 'ל', 'מ', 'ר', 'ת'];
const NIQQUD_RE = /[֑-ׇ]/g;

/** Pure data model of the workbook (no layout). */
export function buildModel(script, opts = {}) {
  const letters = readJson('data/letters/letters.json');
  const byId = Object.fromEntries(letters.map((l) => [l.id, l]));
  const conf = readJson('data/letters/confusables.json');
  const niq = Object.fromEntries(readJson('data/pronunciation/niqqud.json').records.map((r) => [r.id, r]));
  const lessons = readJson('data/curriculum/lessons.json').lessons;

  const mnAll = opts.mnemonics ? readJson('data/letters/mnemonics.json') : null;
  const capOf = (row) => {
    if (!mnAll) return undefined;
    const m = row.kind === 'variant' ? mnAll.variants.find((v) => v.parent === row.letterId) : mnAll.letters.find((x) => x.id === row.letterId);
    return m && m.caption;
  };
  const alphaIndex = Object.fromEntries(letters.map((l, i) => [l.id, i + 1]));
  const letterRows = [];
  for (const l of letters) {
    const num = alphaIndex[l.id];
    const common = { letterId: l.id, number: String(num), gematria: l.gematria, gematriaIsConvention: !!l.gematriaIsConvention };
    if (TWO_SOUNDS[l.id]) {
      const t = TWO_SOUNDS[l.id];
      letterRows.push({ ...common, kind: 'letter', label: t.hard[0], glyph: t.hard[1], ipa: t.hard[2] });
      letterRows.push({ ...common, kind: 'variant', number: num + 'b', label: t.soft[0], glyph: t.soft[1], ipa: t.soft[2] });
    } else {
      letterRows.push({ ...common, kind: 'letter', label: SOFIT[l.id] || l.name, glyph: l.he, ipa: l.sound.ipa });
    }
  }

  if (mnAll) for (const r of letterRows) r.caption = capOf(r);

  const sections = GROUPS.map((ids, gi) => ({
    index: gi + 1, ids, title: `Letters ${gi * 9 + 1}-${gi * 9 + 9}: ${ids.map((i) => byId[i].name).join(', ')}`,
    rows: letterRows.filter((r) => ids.includes(r.letterId))
  }));

  const sets = conf.sets.concat(script === 'cursive' ? conf.cursiveExtra : []);
  const confRows = sets.map((s) => {
    const cells = s.marks ? s.marks.map((m) => 'ש' + (m === 'shin-dot' ? MARK.shin : MARK.sin)) : s.letters.map((id) => byId[id].he);
    const names = s.marks ? ['Shin', 'Sin'] : s.letters.map((id) => SOFIT[id] || byId[id].name);
    return { kind: 'confusable', id: s.id, label: names.join(' / '), hint: s.hint, cells };
  });

  const sylRows = VOWEL_ROWS.map((vid) => {
    const r = niq[vid];
    const cp = (r.codepoints || []).map((c) => String.fromCodePoint(parseInt(c.replace('U+', ''), 16))).join('');
    const mark = vid === 'shuruk' ? 'וּ' : cp; // shuruk = vav + dagesh after the consonant
    return { kind: 'syllable', id: vid, label: `${r.israeliQuality} - ${vid}`, sound: r.english.israeli, ipa: r.ipa.israeli, cells: SYL_CONSONANTS.map((c) => c + mark) };
  });

  const seen = new Set(); const wordRows = [];
  outer: for (const les of lessons) for (const w of les.words || []) {
    const base = w.he.replace(NIQQUD_RE, '');
    if (seen.has(w.he) || !w.en || base.length > 6 || base.length < 2 || !/[ְ-ׇ]/.test(w.he) || !/^[֐-׿]+$/.test(w.he)) continue;
    seen.add(w.he); wordRows.push({ kind: 'word', he: w.he, en: w.en, lesson: les.id });
    if (wordRows.length >= 24) break outer;
  }
  return { script, mnemonics: !!mnAll, letters: letters.length, letterRows, sections, confRows, sylRows, wordRows, groups: GROUPS };
}

// ---------------------------------------------------------------- SVG pieces
const GREY = '#b4b4b4';
/** tier: 'solid' | 'grey' | 'dotted' | 'blank' */
function cellText(txt, cx, base, size, family, tier) {
  if (tier === 'blank') return '';
  const common = `x="${cx.toFixed(1)}" y="${base}" text-anchor="middle" font-family="${family}" font-size="${size}" direction="rtl"`;
  if (tier === 'solid') return `<text ${common} fill="#000">${esc(txt)}</text>`;
  if (tier === 'grey') return `<text ${common} fill="${GREY}">${esc(txt)}</text>`;
  return `<text ${common} fill="none" stroke="#444" stroke-width="0.7" stroke-dasharray="1.1 1.9">${esc(txt)}</text>`;
}

/** One tracing strip: cells[i] is drawn at cell i counted from the RIGHT. tierOf(i) picks the fade. */
export function traceStrip({ cells, n = 20, family, tierOf, size = 50, height = 74, base = 54 }) {
  const pitch = 1000 / n; const parts = [];
  parts.push(`<line x1="0" y1="${base}" x2="1000" y2="${base}" stroke="#7a8" stroke-width="0.8"/>`);
  parts.push(`<line x1="0" y1="${base - size * 0.62}" x2="1000" y2="${base - size * 0.62}" stroke="#cdd" stroke-width="0.5" stroke-dasharray="3 3"/>`);
  for (let i = 0; i < n; i++) parts.push(cellText(cells[i % cells.length], 1000 - (i + 0.5) * pitch, base, size, family, tierOf(i)));
  return `<svg class="strip" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 ${height}" data-cells="${n}">${parts.join('')}</svg>`;
}
const letterTier = (i) => (i === 0 ? 'solid' : i <= 5 ? 'grey' : i <= 11 ? 'dotted' : 'blank');
const cycleTier = (len) => { const L = len * Math.ceil(4 / len); return (i) => (i < L ? 'solid' : i < 2 * L ? 'grey' : i < 3 * L ? 'dotted' : 'blank'); };

function strokeOrderCell(letter, script) {
  const b = letter[script];
  const parts = [`<rect x="3" y="3" width="994" height="994" fill="#fff" stroke="#888" stroke-width="5"/>`];
  if (b.outline) parts.push(`<path d="${b.outline}" fill="#e6e6e6"/>`);
  b.strokes.forEach((s, i) => {
    const m = s.median; const e = m[m.length - 1];
    let k = m.length - 1; while (k > 0 && Math.hypot(m[k][0] - e[0], m[k][1] - e[1]) < 45) k--;
    const a = Math.atan2(e[1] - m[k][1], e[0] - m[k][0]); const L = 55;
    const p1 = [e[0] - L * Math.cos(a - 0.5), e[1] - L * Math.sin(a - 0.5)], p2 = [e[0] - L * Math.cos(a + 0.5), e[1] - L * Math.sin(a + 0.5)];
    parts.push(`<path d="${s.path}" fill="none" stroke="#111" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>`);
    parts.push(`<polygon points="${e[0]},${e[1]} ${p1[0].toFixed(0)},${p1[1].toFixed(0)} ${p2[0].toFixed(0)},${p2[1].toFixed(0)}" fill="#111"/>`);
    parts.push(`<circle cx="${m[0][0]}" cy="${m[0][1]}" r="38" fill="#fff" stroke="#111" stroke-width="8"/><text x="${m[0][0]}" y="${m[0][1] + 18}" text-anchor="middle" font-size="52" font-weight="bold" font-family="sans-serif">${i + 1}</text>`);
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" class="so" role="img" aria-label="${esc(letter.name)} stroke order">${parts.join('')}</svg>`;
}

// ---------------------------------------------------------------- HTML
function rowHtml(r, S) {
  const g = r.gematria !== undefined ? `(${r.gematria}${r.gematriaIsConvention ? '*' : ''})` : '';
  const attrs = r.kind === 'letter' ? `data-letter-row="${r.letterId}"` : `data-variant-row="${r.letterId}"`;
  return `<div class="row" ${attrs}><div class="rh"><span class="box" aria-label="tick when done"></span><span class="num">${esc(r.number)}</span><span class="nm">${esc(r.label)} <span class="g">${g}</span></span>${r.caption ? `<span class="cap">${esc(r.caption)}</span>` : ''}<span class="ipa">/${esc(r.ipa)}/</span></div>${traceStrip({ cells: [r.glyph], family: S.family, tierOf: letterTier, size: S.print ? 62 : 48, base: 58, height: 80 })}</div>`;
}
function confHtml(r, S) {
  return `<div class="row conf" data-confusable="${esc(r.id)}"><div class="rh"><span class="box"></span><span class="nm">${esc(r.label)}</span><span class="hint">${esc(r.hint)}</span></div>${traceStrip({ cells: r.cells, family: S.family, tierOf: cycleTier(r.cells.length), size: S.print ? 58 : 46, base: 58, height: 80 })}</div>`;
}
function sylHtml(r, S) {
  const wide = r.id === 'shuruk'; // consonant + vav + dagesh is two letters wide: fewer cells
  const strip = traceStrip({ cells: r.cells, n: wide ? 10 : 20, family: 'WB-Print', tierOf: wide ? (i) => (i < 5 ? 'solid' : 'dotted') : cycleTier(r.cells.length), size: wide ? 56 : 58, base: 60, height: 84 });
  return `<div class="row syl" data-syllable="${esc(r.id)}"><div class="rh"><span class="box"></span><span class="nm">${esc(r.label)}</span><span class="hint">${esc(r.sound)} ${esc(r.ipa)}</span></div>${strip}</div>`;
}
function wordHtml(r, i, S) {
  const base = r.he.replace(NIQQUD_RE, '').length; const size = Math.min(58, Math.round(200 / (base * 0.62 + 0.4)));
  const cell = (k, tier) => cellText(r.he, 1000 - (k + 0.5) * 250, 62, size, 'WB-Print', tier);
  const svg = `<svg class="strip" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 86"><line x1="0" y1="62" x2="1000" y2="62" stroke="#7a8" stroke-width="0.8"/>${cell(0, 'solid')}${cell(1, 'dotted')}</svg>`;
  return `<div class="row word" data-word="${esc(r.he)}"><div class="rh"><span class="box"></span><span class="num">${i + 1}</span><span class="nm">${esc(r.en)}</span></div>${svg}<div class="translit"><span>sounds like:</span><i></i></div></div>`;
}

const CSS = (paper, S) => `
@font-face{font-family:WB-Print;src:url("../../../assets/fonts/${SCRIPTS.print.file}")}
@font-face{font-family:WB-Cursive;src:url("../../../assets/fonts/${SCRIPTS.cursive.file}")}
@page{size:${paper.css};margin:0}
*{box-sizing:border-box}
body{margin:0;font-family:system-ui,"Helvetica Neue",Arial,sans-serif;color:#000;background:#fff}
.page{width:${paper.w}mm;height:${paper.h - 0.6}mm;padding:11mm 14mm 9mm;page-break-after:always;overflow:hidden;position:relative}
.page:last-child{page-break-after:auto}
.hd{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:.4mm solid #000;padding-bottom:1.5mm;margin-bottom:3mm;font-size:9pt}
.hd b{font-size:11pt}.hd .fields{display:flex;gap:6mm}.hd .fields span{display:inline-block;min-width:26mm;border-bottom:.3mm solid #000;text-align:left}
.ft{position:absolute;left:14mm;right:14mm;bottom:5mm;font-size:6.5pt;color:#444;display:flex;justify-content:space-between}
.row{height:21.5mm;break-inside:avoid}
.row.conf,.row.syl{height:22.5mm}.row.word{height:27.5mm}
.rh{display:flex;align-items:center;gap:2.2mm;height:5.6mm;font-size:9.5pt;direction:ltr}
.box{width:4mm;height:4mm;border:.4mm solid #000;display:inline-block;flex:none}
.cap{flex:1;min-width:0;margin-left:2mm;font-size:7pt;font-style:italic;color:#333;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.num{font-weight:bold;min-width:6mm}.g{color:#444;font-size:8.5pt}.ipa{margin-left:auto;color:#444;font-size:8pt}
.hint{margin-left:2mm;font-size:6.8pt;line-height:1.15;color:#333;max-width:125mm}
.row.conf .rh,.row.syl .rh{height:auto;min-height:7mm}
.strip{display:block;width:100%;height:auto}
.translit{display:flex;gap:2mm;align-items:flex-end;font-size:7.5pt;color:#444;height:5mm}.translit i{flex:1;border-bottom:.3mm solid #7a8;height:3mm}
h1{font-size:24pt;margin:0 0 2mm}h2{font-size:13pt;margin:4mm 0 1.5mm}p,li{font-size:9.5pt;line-height:1.35}
.notice{border:.5mm solid #000;padding:2.5mm 3mm;margin:4mm 0;font-size:9pt}
.so-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:5mm;direction:rtl}
.so-cell{direction:ltr;text-align:center;font-size:9pt}.so-cell svg{width:100%;height:auto;aspect-ratio:1/1;display:block}.so-cell .he{font-family:${S.family};font-size:20pt;direction:rtl}
.chart{display:grid;grid-template-columns:repeat(9,1fr);gap:2mm;direction:rtl;margin-top:2mm}
.chart div{border:.3mm solid #000;text-align:center;padding:1mm 0;direction:ltr}.chart .he{font-family:${S.family};font-size:17pt;line-height:1.1;direction:rtl;display:block}
.chart small{font-size:6.5pt;display:block}.chart .dots{letter-spacing:.8mm;font-size:9pt}
`;

function pageShell({ paper, S, title, body, n, total, fields = true }) {
  return `<section class="page" data-page="${n}"><div class="hd"><span><b>ALEF</b> &middot; ${esc(S.label)} workbook &middot; ${esc(title)}</span>${fields ? '<span class="fields">No. <span>&nbsp;</span> Date <span>&nbsp;</span></span>' : ''}</div>${body}<div class="ft"><span>DRAFT: stroke order not yet reviewed by a native teacher. Fonts: Frank Ruhl Libre / Gveret Levin (SIL OFL 1.1).</span><span>${n} / ${total}</span></div></section>`;
}

/** Full HTML + page list. @param {'print'|'cursive'} script @param {'a4'|'letter'} paperId */
export function buildHtml(script, paperId, opts = {}) {
  const paper = PAPERS[paperId]; const S = SCRIPTS[script]; const model = buildModel(script, opts);
  const letters = readJson('data/letters/letters.json'); const byId = Object.fromEntries(letters.map((l) => [l.id, l]));
  const usable = paper.h - 11 - 9 - 14 - 6; // page minus paddings, header, footer
  const per = (h) => Math.max(1, Math.floor(usable / h));
  const pages = []; // {kind,title,body}
  const chunk = (arr, k) => { const o = []; for (let i = 0; i < arr.length; i += k) o.push(arr.slice(i, i + k)); return o; };

  // front page
  const chart = model.letterRows.filter((r) => r.kind === 'letter').map((r) => `<div><span class="he">${esc(r.glyph)}</span><small>${esc(r.number)}. ${esc(r.label)}</small><span class="dots">&#9711;&#9711;&#9711;</span></div>`).join('');
  pages.push({ kind: 'front', title: 'Start here', fields: true, body: `<h1>Learn to write the Hebrew letters</h1>
<p>Hebrew is written and read from <b>right to left</b>. In every practice row, the first (black) model letter is at the <b>right</b>: trace it, then keep writing to the left. The letters fade from solid grey, to dotted, to empty, so you finish by writing on your own.</p>
<h2>How to use this workbook</h2>
<ol><li>Look at the stroke-order page at the start of each section. The numbers show the order; the arrow shows where each stroke ends.</li>
<li>In each row, trace the grey and dotted letters, then fill the empty space.</li>
<li>Tick the box at the left of the row when you can write that letter <b>3 times without looking</b> at the model.</li>
<li>Colour in one circle in the progress chart below each time you do that (three circles per letter).</li></ol>
<div class="notice"><b>DRAFT:</b> stroke order not yet reviewed by a native teacher. The numbered strokes in this workbook were computed from fonts and checked only against one outside reference; if your teacher shows a different order, follow your teacher. ${script === 'cursive' ? 'Cursive shapes come from the font Gveret Levin (Israeli handwriting style); real handwriting also joins and varies.' : 'Print stroke order is a proposal; Israeli schools may teach print letters mainly for reading.'}</div>
<h2>My progress (27 letters, right to left)</h2><div class="chart">${chart}</div>
${opts.mnemonics ? '<div class="notice"><b>Memory hooks (DRAFT):</b> the italic line on each row is a sound-alike memory trick, not the history of the letter, and has not been checked by a Hebrew teacher.</div>' : ''}<p style="font-size:7.5pt;margin-top:3mm">* The values 500-900 for the five final (sofit) letters are a widely used convention, not confirmed by a source consulted here. Gematria = the number value of a letter. Letters with two sounds (Bet/Vet, Kaf/Khaf, Pe/Fe, Shin/Sin) have two rows; the row marked "b" is the second sound.</p>` });

  // sections: stroke order page + row page(s)
  model.sections.forEach((sec) => {
    const cells = sec.ids.map((id) => { const l = byId[id]; return `<div class="so-cell"><span class="he">${esc(l.he)}</span> <b>${esc(SOFIT[id] || l.name)}</b>${strokeOrderCell(l, script)}<span>${l[script].strokes.length} stroke${l[script].strokes.length > 1 ? 's' : ''}</span></div>`; }).join('');
    pages.push({ kind: 'strokeorder', title: `Section ${sec.index}: stroke order`, fields: false, body: `<h2>${esc(sec.title)}</h2><p>Circle with a number = where each stroke starts; arrowhead = where it ends. <b>Draft order, not teacher-reviewed.</b></p><div class="so-grid">${cells}</div>` });
    chunk(sec.rows, per(21.5)).forEach((rows) => pages.push({ kind: 'letters', title: `Section ${sec.index}: practice`, fields: true, body: rows.map((r) => rowHtml(r, S)).join('') }));
  });
  chunk(model.confRows, per(22.5)).forEach((rows, i) => pages.push({ kind: 'confusables', title: 'Look-alike letters', fields: true, body: (i === 0 ? '<p>Letters that are easy to mix up. Trace a whole set in a row, then write the set from memory.</p>' : '') + rows.map((r) => confHtml(r, S)).join('') }));
  pages.push({ kind: 'syllables', title: 'Letter + vowel', fields: true, body: '<p>A consonant plus a vowel mark makes a syllable. Write the vowel marks small and exactly under (or above) the letter. Models use the print font so the marks are clear.</p>' + model.sylRows.map((r) => sylHtml(r, S)).join('') });
  chunk(model.wordRows, per(27.5)).forEach((rows, i) => pages.push({ kind: 'words', title: 'Words', fields: true, body: (i === 0 ? '<p>Copy the word, then write it again in the blank space. Write how it sounds on the last line.</p>' : '') + rows.map((r, j) => wordHtml(r, i * per(27.5) + j, S)).join('') }));

  const total = pages.length;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>ALEF ${esc(S.label)} workbook (${paper.label})</title><style>${CSS(paper, S)}</style></head><body>${pages.map((p, i) => pageShell({ paper, S, title: p.title, body: p.body, n: i + 1, total, fields: p.fields })).join('')}</body></html>`;
  return { html, pages: pages.map((p) => p.kind), pageCount: total, model };
}

// ---------------------------------------------------------------- build (PDF)
async function main() {
  const htmlOnly = process.argv.includes('--html-only');
  const withMn = process.argv.includes('--mnemonics');
  const outDir = join(root, 'docs', 'workbook'); const htmlDir = join(outDir, 'html'); const assetDir = join(root, 'assets', 'workbook');
  mkdirSync(htmlDir, { recursive: true }); mkdirSync(assetDir, { recursive: true });
  let chromium = null;
  if (!htmlOnly) {
    const require = createRequire(import.meta.url);
    try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/usr/lib/node_modules/playwright')); }
  }
  const browser = chromium ? await chromium.launch() : null;
  const files = [];
  const editions = withMn ? [false, true] : [false];
  for (const mnem of editions) for (const script of Object.keys(SCRIPTS)) for (const paperId of Object.keys(PAPERS)) {
    const { html, pages, pageCount } = buildHtml(script, paperId, { mnemonics: mnem });
    const name = `alef-workbook-${script}-${paperId}${mnem ? '-mnemonics' : ''}`;
    const hp = join(htmlDir, name + '.html'); writeFileSync(hp, html);
    const entry = { id: name, script, mnemonics: mnem, paper: PAPERS[paperId].label, pages: pageCount, pageKinds: pages, html: `html/${name}.html` };
    if (browser) {
      const page = await browser.newPage();
      await page.goto(pathToFileURL(hp).href); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(300);
      const pdf = join(outDir, name + '.pdf');
      await page.pdf({ path: pdf, preferCSSPageSize: true, printBackground: false });
      await page.close();
      copyFileSync(pdf, join(assetDir, name + '.pdf'));
      entry.pdf = `${name}.pdf`; entry.bytes = statSync(pdf).size;
    }
    files.push(entry);
  }
  if (browser) await browser.close();
  const manifest = { generated: new Date().toISOString().slice(0, 10), status: 'DRAFT: stroke order not reviewed by a native teacher', fonts: 'Frank Ruhl Libre, Gveret Levin (SIL OFL 1.1)', files };
  writeFileSync(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 1));
  if (browser) writeFileSync(join(assetDir, 'manifest.json'), JSON.stringify({ ...manifest, files: files.map((f) => ({ ...f, html: undefined })) }, null, 1));
  for (const f of files) console.log(f.id, f.pages + ' pages', f.bytes ? Math.round(f.bytes / 1024) + ' KB' : '(html only)');
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
