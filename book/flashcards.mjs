#!/usr/bin/env node
// Printable "Mnemonic flashcards": 27 cut-out cards (2.5 x 3.5 in, 3 x 3 per sheet) on US Letter and A4.
//   node book/flashcards.mjs [--out book/out] [--host HOST]  ->  alef-mnemonic-flashcards-letter.pdf, alef-mnemonic-flashcards-a4.pdf (+ .html)
// Page order: instructions, then for each sheet of 9 cards one FRONT page and one BACK page. Backs are column-mirrored so that
// printing double-sided with "flip on LONG edge" puts every back behind its front. Front = the letter (print + cursive) and its name;
// back = picture (placeholder until the image run is done, Hebrew outline overlaid as vector), shape, sound, story, look-alike, anchor word.
// Text comes from data/letters/mnemonics.json read at build time (see cards.mjs). Nothing here writes Hebrew.
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createImgResolver } from './img.js';
import { overlaySvg, glyphFor, loadLettersJson } from '../tools/images/overlay.mjs';
import { mnemonicCards, mnemonicStatus } from './cards.mjs';
import { ROOT, readJson } from './content.mjs';
import { fontFaces, renderPdf } from './build.mjs';

export const PAPERS = { letter: { w: 8.5, h: 11, label: 'US Letter' }, a4: { w: 8.2677, h: 11.6929, label: 'A4' } };
const CARD_W = 2.5, CARD_H = 3.5, COLS = 3, ROWS = 3;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const he = (s, cls = '') => `<span class="he ${cls}" lang="he" dir="rtl">${s}</span>`;

const CSS = `
:root{--cream:#F6F1E7;--blue:#1F3A5F;--red:#B0373B;--olive:#6B7F3A;--gold:#D9A441;--ink:#2B2B2B;
--he-font:"Noto Serif Hebrew","Frank Ruhl Libre","FreeSerif",serif;--cursive-font:"Gveret Levin","Noto Serif Hebrew",serif;--ui-font:"Liberation Sans","DejaVu Sans",Helvetica,Arial,sans-serif}
*{box-sizing:border-box}html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;font:9pt/1.35 var(--ui-font);color:var(--ink)}
.he{font-family:var(--he-font);direction:rtl;unicode-bidi:isolate}.he-cursive{font-family:var(--cursive-font)!important}
.page{width:var(--pw);height:var(--ph);break-after:page;position:relative;overflow:hidden}
.page:last-child{break-after:auto}
.sheet{position:absolute;left:calc((var(--pw) - ${COLS * CARD_W}in)/2);top:calc((var(--ph) - ${ROWS * CARD_H}in)/2);display:grid;grid-template-columns:repeat(${COLS},${CARD_W}in);grid-template-rows:repeat(${ROWS},${CARD_H}in)}
.card{width:${CARD_W}in;height:${CARD_H}in;outline:.5pt dashed #999;outline-offset:0;padding:.09in;position:relative;overflow:hidden;background:#fff}
.card.blank{outline:none}
.front{background:var(--cream);display:flex;flex-direction:column;align-items:center;justify-content:space-between;text-align:center}
.front .nn{align-self:flex-start;font-size:7pt;color:#888}
.front .big{font-size:96pt;line-height:1.15;color:var(--blue);display:block}
.front .cur{font-size:54pt;line-height:1.35;color:var(--red);display:block}
.front .nm{font:bold 13pt var(--ui-font);color:var(--blue)}
.front .sd{font:8.5pt var(--ui-font);color:#555;margin-top:2pt}
.front .tag{font:6pt var(--ui-font);color:#999;letter-spacing:.06em;text-transform:uppercase}
.back{font:7.5pt/1.26 var(--ui-font);border:0}
.back .pic{width:1.2in;height:1.2in;float:left;margin:0 .07in .02in 0;border:.8pt solid var(--gold);border-radius:5pt;overflow:hidden}
.back .pic svg{width:100%;height:100%;display:block}
.back h3{margin:0;font:bold 10pt var(--ui-font);color:var(--blue)}
.back .sn{color:#555;font-size:6.5pt;margin-bottom:2pt}
.back p{margin:0 0 2pt}.back b{color:var(--olive);font-size:6.4pt;text-transform:uppercase;letter-spacing:.04em}
.back p.warn b{color:var(--red)}
.back .anchor{clear:both;border-top:.5pt solid #e5dfd0;padding-top:2pt;margin-top:2pt;display:flex;align-items:center;gap:5pt}
.back .anchor .he{font-size:17pt;line-height:1.5;color:var(--blue)}.back .anchor i{color:var(--red);font-style:normal;font-weight:bold;font-size:8pt}
.back .foot{position:absolute;left:.09in;right:.09in;bottom:.05in;font-size:5pt;color:#aaa;text-align:center}
.info{padding:.8in 1in;font:10.5pt/1.5 var(--ui-font)}.info h1{font:bold 24pt var(--ui-font);color:var(--blue);margin:0 0 .15in}
.info li{margin:0 0 5pt}.info .flag{border:1.5pt solid var(--red);color:var(--red);padding:5pt 9pt;border-radius:5pt;font-weight:bold;display:inline-block;margin:.1in 0}
`;

/** @param {'letter'|'a4'} paper */
export function buildFlashcardsHtml(paper = 'letter', o = {}) {
  const P = PAPERS[paper]; if (!P) throw new Error(`unknown paper ${paper}`);
  const outDir = join(ROOT, o.out ?? 'book/out');
  const lettersJson = loadLettersJson();
  const idx = readJson('assets/img/index.json');
  const R = createImgResolver({ base: relative(outDir, join(ROOT, 'assets/img')) || '.', files: idx?.files || [] });
  const cards = mnemonicCards();
  const st = mnemonicStatus();
  const front = (c) => `<div class="card front"><span class="nn">${c.nn} / 27</span><div>${he(glyphFor(c.id, lettersJson), 'big')}${he(glyphFor(c.id, lettersJson), 'he-cursive cur')}</div><div><div class="nm">${esc(c.name)}</div><div class="sd">${esc(c.sound.split(/\s*[;(]|,\s+like|\s+like\s/)[0])}</div></div><span class="tag">ALEF &middot; print and cursive</span></div>`;
  const back = (c) => `<div class="card back"><div class="pic">${overlaySvg({ id: c.id, state: 'outline', imageHref: R.src(c.stem), size: 600, lettersJson, title: c.stem })}</div>
<h3>${esc(c.name)}</h3><div class="sn">${c.nn} / 27</div>
<p><b>Shape</b> ${esc(c.shape)}</p><p><b>Sound</b> ${esc(c.sound)}</p><p><b>Story</b> ${esc(c.story)}</p><p class="warn"><b>Look-alike</b> ${esc(c.lookalike)}</p>
<div class="anchor">${he(esc(c.word))}<span><i>${esc(c.wordSound)}</i><br/>${esc(c.wordMeaning)}</span></div><div class="foot">${st.draft ? 'draft hook, not checked by a Hebrew teacher' : ''}</div></div>`;
  const sheets = [];
  for (let i = 0; i < cards.length; i += COLS * ROWS) {
    const chunk = cards.slice(i, i + COLS * ROWS);
    const cell = (arr, fn, k) => (arr[k] ? fn(arr[k]) : '<div class="card blank"></div>');
    const padded = Array.from({ length: COLS * ROWS }, (_, k) => chunk[k] ?? null);
    const fr = padded.map((c) => (c ? front(c) : '<div class="card blank"></div>')).join('');
    // mirror each row of the back page so flip-on-long-edge duplex lines every back up behind its front
    const bk = []; for (let r = 0; r < ROWS; r++) for (let col = COLS - 1; col >= 0; col--) { const c = padded[r * COLS + col]; bk.push(c ? back(c) : '<div class="card blank"></div>'); }
    sheets.push(`<div class="page"><div class="sheet">${fr}</div></div><div class="page"><div class="sheet">${bk.join('')}</div></div>`);
  }
  const info = `<div class="page info"><h1>Mnemonic flashcards</h1><p>27 cut-out cards, one per letter (22 letters and 5 final forms). Front: the letter in print and in Israeli handwriting. Back: a picture to hang the letter on, its shape, its sound, a short story, the look-alike to watch out for, and a pointed anchor word.</p>
<ol><li>Print on <b>${P.label}</b> paper at <b>100% / actual size</b> (turn off "fit to page"). Each card is ${CARD_W} x ${CARD_H} in.</li><li>Print <b>double-sided, flip on the LONG edge</b>. Pages alternate front, back; the backs are mirrored so each back lands behind its front.</li><li>Cut along the dashed lines (3 x 3 cards per sheet). Use card stock if you can. If your printer is out of register by a few millimetres, trim the cards slightly smaller.</li><li>Shuffle, look at the front, say the name and the sound, flip to check, and sort the cards you missed into a second pile.</li></ol>
<div class="flag">DRAFT${st.draft ? ': hooks and anchor words not checked by a Hebrew teacher' : ''}</div>
<p>Pictures: every illustration is still a labelled placeholder (the image run has not happened). The faint outlined letter is real vector type. The memory hooks are teaching aids, not etymology: the letter-name meanings are real Hebrew words, but the claim that each letter was originally a drawing of that object is only a popular story.</p>
<p>Text source: data/letters/mnemonics.json at build time. Fonts: Noto Serif Hebrew and Gveret Levin (SIL OFL 1.1).</p></div>`;
  const css = `:root{--pw:${P.w}in;--ph:${P.h}in}@page{size:${P.w}in ${P.h}in;margin:0}${CSS}`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/><title>ALEF mnemonic flashcards (${P.label})</title><style>${fontFaces(outDir)}\n${css}</style></head><body>${info}${sheets.join('')}</body></html>`;
}

export async function main(argv = process.argv.slice(2)) {
  let out = 'book/out';
  for (let i = 0; i < argv.length; i++) { if (argv[i] === '--out') out = argv[++i]; else throw new Error(`unknown option ${argv[i]}`); }
  const dir = join(ROOT, out); mkdirSync(dir, { recursive: true });
  for (const paper of Object.keys(PAPERS)) {
    const html = join(dir, `alef-mnemonic-flashcards-${paper}.html`), pdf = join(dir, `alef-mnemonic-flashcards-${paper}.pdf`);
    writeFileSync(html, buildFlashcardsHtml(paper, { out }));
    await renderPdf(html, pdf);
    console.log('wrote', relative(ROOT, pdf));
  }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch((e) => { console.error(e); process.exit(1); });
