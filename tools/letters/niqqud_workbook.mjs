#!/usr/bin/env node
// Niqqud (vowel sign) workbook, A4 + US Letter: every record of data/pronunciation/niqqud.json (12 vowel signs plus dagesh, shin dot and
// sin dot), each with its shape on a bet, Israeli sound and IPA, a mark-tracing row, and 6 example words to trace. Example words come only
// from the existing vocabulary: phrasebook + lesson words (book/content.mjs wordPool) first, then the 5,000-word list (data/vocab/vocab5000.json),
// shortest and most frequent first. Nothing is invented; if the data holds fewer than 6 words for a sign the page says so.
//
// Usage: node tools/letters/niqqud_workbook.mjs [--html-only]
// Output: docs/workbook/alef-niqqud-<a4|letter>.pdf (+ html/), copied to assets/workbook/, merged into assets/workbook/manifest.json.
import { fileURLToPath } from 'node:url';
import { traceStrip, PAPERS } from './workbook.mjs';
import { readJson, esc, baseCss, wrapHtml, buildEditions, bigTier, NIQQUD_RE } from './firstday_pages.mjs';
import { wordPool } from '../../book/content.mjs';
import { transliterate } from '../../src/pronunciation/transliterate.js';

export const NIQQUD_DRAFT = 'DRAFT: not reviewed by a Hebrew teacher; Israeli values only; example words from the course data, pointing not teacher-checked.';
export const PER_SIGN = 6;
const cp = (c) => String.fromCodePoint(parseInt(c.replace('U+', ''), 16));
const SYL_CONSONANTS = ['ב', 'ל', 'מ', 'ר', 'ת'];

/** Which words show this sign: a regex over the pointed word. */
export function signMatcher(rec) {
  const marks = rec.codepoints.map(cp);
  if (rec.id === 'shuruk') return /וּ/;
  if (rec.id === 'dagesh') return /[^ו]ּ/; // dagesh in any letter except the shuruk vav
  if (rec.id === 'cholam') return /ֹ/; // cholam chaser and cholam malei (vav + dot) alike
  return new RegExp(marks.join(''));
}

/** Candidate words with gloss + transliteration: curated/lesson pool first, then vocab5000 by rank. */
export function candidateWords() {
  const out = []; const seen = new Set();
  for (const w of wordPool()) { if (!seen.has(w.he)) { seen.add(w.he); out.push({ he: w.he, en: w.en, translit: w.translit, curated: w.curated, source: w.source, rank: 0 }); } }
  const v = readJson('data/vocab/vocab5000.json');
  for (const e of v.entries) {
    const he = e.pointed; if (!he || e.needsPointing || /\s/.test(he) || seen.has(he)) continue;
    seen.add(he);
    const gloss = String(e.gloss || '').split(/[;(]/)[0].trim(); if (!gloss) continue;
    out.push({ he, en: gloss, translit: transliterate(he, { scheme: 'siddur', tradition: 'israeli' }), curated: false, source: 'vocab5000:' + e.rank, rank: e.rank });
  }
  return out;
}

/** Pure model: one section per niqqud record with up to PER_SIGN example words. */
export function buildNiqqudModel() {
  const recs = readJson('data/pronunciation/niqqud.json').records;
  const cands = candidateWords();
  const used = new Set();
  const sections = recs.map((r) => {
    const re = signMatcher(r);
    const bare = (w) => w.he.replace(NIQQUD_RE, '');
    const score = (w) => { const n = bare(w).length; return (w.rank === 0 ? 0 : 1) * 2 + (n < 2 || n > 6 ? 5 : 0) + Math.abs(n - 3) * 0.6 + (used.has(w.he) ? 3 : 0) + (/[;\/]/.test(w.en) ? 0.5 : 0) + Math.log10(1 + w.rank) * 0.4 + (r.id === 'dagesh' && !/[בכפ]ּ/.test(w.he) ? 1.5 : 0) + (w.en.length > 24 ? 1 : 0); };
    const words = []; const bares = new Set();
    for (const w of cands.filter((w) => re.test(w.he) && bare(w).length >= 2 && bare(w).length <= 7).sort((a, b) => score(a) - score(b))) {
      if (bares.has(bare(w))) continue; // one spelling per sign (e.g. two pointings of "I")
      bares.add(bare(w)); words.push(w); if (words.length === PER_SIGN) break;
    }
    for (const w of words) used.add(w.he);
    const mark = r.id === 'shuruk' ? 'וּ' : r.codepoints.map(cp).join('');
    const cells = r.kind === 'vowel' || r.id === 'dagesh' ? SYL_CONSONANTS.map((c) => c + mark) : ['ש' + mark];
    return { id: r.id, kind: r.kind, name: r.name, nameHe: r.nameHe, shape: r.shape, position: r.position, sound: r.english?.israeli ?? '', ipa: r.ipa?.israeli ?? '', quality: r.israeliQuality, notes: r.notes, cells, words: words.map((w) => ({ he: w.he, en: w.en, translit: w.translit, curated: w.curated, source: w.source })) };
  });
  return { sections, perSign: PER_SIGN };
}

function wordRow(w, j) {
  const len = w.he.replace(NIQQUD_RE, '').length; const size = Math.min(62, Math.round(215 / (len * 0.55 + 0.5)));
  return `<div class="row wrow" data-niqqud-word="${esc(w.he)}"><div class="rh"><span class="box"></span><span class="num">${j + 1}</span><span class="nm"><i>${esc(w.translit)}</i>${w.curated ? '' : '*'} &middot; ${esc(w.en)}</span></div>${traceStrip({ cells: [w.he], n: 4, family: 'WB-Print', tierOf: bigTier, size, base: 60, height: 78 })}</div>`;
}
function signBlock(s) {
  const marks = traceStrip({ cells: s.cells, n: s.cells.length === 1 ? 10 : 15, family: 'WB-Print', tierOf: (i) => (i < s.cells.length ? 'solid' : i < 2 * s.cells.length ? 'grey' : 'dotted'), size: 54, base: 58, height: 80 });
  const short = s.words.length < PER_SIGN ? `<span class="small"> Only ${s.words.length} word${s.words.length === 1 ? '' : 's'} with this sign in the course data.</span>` : '';
  return `<div class="sblock" data-niqqud="${esc(s.id)}"><div class="shead"><span class="he print shape">${esc(s.shape)}</span><div class="stxt"><b>${esc(s.name)}</b> ${s.nameHe ? `<span class="he print">${esc(s.nameHe)}</span>` : ''} &middot; <b>${esc(s.sound)}</b> ${esc(s.ipa)}<br/><span class="small">${esc(s.position)}. ${esc(String(s.notes || '').split(/(?<=\.)\s/)[0]).slice(0, 170)}</span>${short}</div></div>
<div class="row mrow"><div class="rh"><span class="box"></span><span class="nm">Write the sign on a letter</span></div>${marks}</div>${s.words.map(wordRow).join('')}</div>`;
}

/** Full HTML + page kinds. One sign per page (6 word rows plus free lines need the whole page on US Letter). @param {'a4'|'letter'} paperId */
export function buildNiqqudHtml(paperId) {
  const paper = PAPERS[paperId]; const model = buildNiqqudModel();
  const css = baseCss(paper) + `
.sblock{break-inside:avoid;margin-bottom:3mm;padding-top:1mm;border-top:.3mm solid #000}
.shead{display:flex;align-items:center;gap:4mm;min-height:16mm;margin-bottom:.5mm}.shape{font-size:30pt;line-height:1;min-width:16mm;text-align:center}.stxt{font-size:9.5pt;line-height:1.3}
.row.mrow{height:21mm}.row.wrow{height:21mm}.rh .nm i{color:#333}
.free{margin-top:2mm}.free .rh{height:6mm}
`;
  const pages = [];
  const n = model.sections.length;
  pages.push({ kind: 'front', title: 'Start here', fields: true, body: `<h1>The vowel signs (niqqud)</h1>
<p>Hebrew letters are consonants; the vowels are small marks under, above or beside them. Prayer books, children's books and this course show the marks; newspapers and street signs do not. This workbook gives each of the ${n} signs in data/pronunciation/niqqud.json a tracing row and ${model.perSign} real words to copy, pronounced the Israeli way.</p>
<h2>How to use it</h2><ol><li>Say the sound in the heading, then trace the sign on the five sample letters (bet, lamed, mem, resh, tav), from the <b>right</b>.</li>
<li>Copy each word: solid, then grey, then dotted, then on your own. Keep the marks small and exactly under (or above) their letter.</li>
<li>Read the word aloud each time you write it. The transliteration is a guide, not a second spelling.</li></ol>
<div class="notice"><b>${esc(NIQQUD_DRAFT)}</b> Words come from the phrasebook, the lesson lists and the 5,000-word list; words marked * carry a machine-made transliteration (Israeli, siddur style) that no native speaker has checked. Sounds are Modern Israeli only: Sephardi and Ashkenazi values differ for several signs (see the pronunciation data).</div>
<h2>Contents</h2><table class="toc">${model.sections.map((s, i) => `<tr><td class="he print">${esc(s.shape)}</td><td>${esc(s.name)}</td><td>${esc(s.sound)}</td><td>page ${i + 2}</td></tr>`).join('')}</table>` });
  const free = `<div class="free"><div class="rh"><span class="box"></span><span class="nm">From memory: write the six words again, right to left, then read them aloud.</span></div>${traceStrip({ cells: [''], n: 1, family: 'WB-Print', tierOf: () => 'blank', size: 62, base: 60, height: 78 })}${traceStrip({ cells: [''], n: 1, family: 'WB-Print', tierOf: () => 'blank', size: 62, base: 60, height: 78 })}</div>`;
  for (const s of model.sections) pages.push({ kind: 'sign', title: s.name, fields: true, body: signBlock(s) + free });
  const html = wrapHtml({ title: `ALEF niqqud workbook (${paper.label})`, css: css + '.toc{font-size:9pt;border-collapse:collapse}.toc td{padding:.6mm 3mm .6mm 0}.toc td.he{font-size:14pt}', pages, set: 'Niqqud', draft: NIQQUD_DRAFT });
  return { html, pages: pages.map((p) => p.kind), pageCount: pages.length, model };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await buildEditions({ builder: buildNiqqudHtml, name: 'alef-niqqud', kind: 'niqqud', label: 'Vowel signs (niqqud)', htmlOnly: process.argv.includes('--html-only') });
}
