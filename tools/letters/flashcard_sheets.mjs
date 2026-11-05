#!/usr/bin/env node
// Vocabulary flashcard sheets, A4 + US Letter: the 5,000-word list (data/vocab/vocab5000.json) as cut-out cards, 12 per page (3 x 4),
// grouped by theme from data/vocab/themes/*.json when the word's pointed form is in a theme set (theme order = index.json/file order);
// words in no theme go to a final "Other words" group. Within a group, most frequent first. Each group starts on a new page.
// Card: pointed Hebrew (large), transliteration (theme data, else src/pronunciation/transliterate.js, marked *), short English gloss, rank.
// Nothing is invented: Hebrew, glosses and ranks come from the vocab data. A lighter variant (first 1,000 words) is built with --light.
// --letters builds the 27 memory-chain letter cards instead (front: letter + picture; back: hook + example word + gloss), printed double-sided:
// back pages have each row mirrored so a long-edge flip lines the cards up. Data: data/letters/memory-chain.json (see memory_chain_model.mjs).
// Usage: node tools/letters/flashcard_sheets.mjs [--html-only] [--light | --letters]
// Output: docs/workbook/alef-flashcards-<a4|letter>.pdf (all 5,000) or alef-flashcards-light-<a4|letter>.pdf (--light)
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { readJson, root, esc, baseCss, wrapHtml, buildEditions } from './firstday_pages.mjs';
import { PAPERS } from './workbook.mjs';
import { transliterate } from '../../src/pronunciation/transliterate.js';
import { buildChainModel, CHAIN_DRAFT } from './memory_chain_model.mjs';
import { pictureBox, FIXTURE_NOTE } from './memory_chain.mjs';

export const CARDS_PER_PAGE = 12;
export const CARD_DRAFT = 'DRAFT: pointing, glosses and transliteration not reviewed by a Hebrew teacher (CC BY-SA 4.0 word data, see docs/vocab/LICENSES.md).';
const TOPIC_TITLE = (t) => t.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
const short = (g) => { const t = String(g ?? '').replace(/\s+/g, ' ').trim(); if (t.length <= 48) return t; const cut = t.slice(0, 48); const i = Math.max(cut.lastIndexOf(','), cut.lastIndexOf(';')); return (i > 16 ? cut.slice(0, i) : cut.replace(/\s+\S*$/, '')) + '…'; };

/** Pure model. @param {{limit?:number}} opts limit = only the first N ranks (light variant). */
export function buildFlashcardModel({ limit = Infinity } = {}) {
  const entries = readJson('data/vocab/vocab5000.json').entries.filter((e) => e.rank <= limit);
  const themeDir = join(root, 'data/vocab/themes');
  const files = readdirSync(themeDir).filter((f) => /-set\d+\.json$/.test(f)).sort();
  const byHe = new Map(); const order = [];
  for (const f of files) {
    const t = readJson('data/vocab/themes/' + f);
    if (!order.includes(t.topic)) order.push(t.topic);
    for (const w of t.words || []) if (!byHe.has(w.he)) byHe.set(w.he, { topic: t.topic, translit: w.translit, en: w.en });
  }
  const cards = entries.map((e) => {
    const he = e.pointed || e.lemma; const th = byHe.get(he);
    return { rank: e.rank, he, en: th?.en ? short(th.en) : short(e.gloss), translit: th?.translit || transliterate(he, { scheme: 'siddur', tradition: 'israeli' }), generated: !th?.translit, topic: th?.topic || null, pos: e.pos };
  });
  const groups = order.map((t) => ({ key: t, title: TOPIC_TITLE(t), cards: cards.filter((c) => c.topic === t) })).filter((g) => g.cards.length);
  const other = cards.filter((c) => !c.topic); if (other.length) groups.push({ key: 'other', title: 'Other words (not in a theme set)', cards: other });
  return { groups, total: cards.length, themed: cards.length - other.length };
}

export function pagePlan(model) {
  const pages = []; let n = 0;
  for (const g of model.groups) for (let i = 0; i < g.cards.length; i += CARDS_PER_PAGE) { pages.push({ group: g, from: i, cards: g.cards.slice(i, i + CARDS_PER_PAGE), first: i === 0 }); n++; }
  return pages;
}
const card = (c) => `<div class="card" data-rank="${c.rank}"><span class="rk">${c.rank}</span><span class="he print cw">${esc(c.he)}</span><span class="tl">${esc(c.translit)}${c.generated ? '*' : ''}</span><span class="en">${esc(c.en)}</span></div>`;

const CUTGUIDE = '<svg class="gl" aria-hidden="true"><g stroke="#777" stroke-width="0.8"><line x1=".6" y1="0" x2=".6" y2="100%"/><line x1="33.333%" y1="0" x2="33.333%" y2="100%"/><line x1="66.667%" y1="0" x2="66.667%" y2="100%"/><line x1="99.9%" y1="0" x2="99.9%" y2="100%"/><line x1="0" y1=".6" x2="100%" y2=".6"/><line x1="0" y1="25%" x2="100%" y2="25%"/><line x1="0" y1="50%" x2="100%" y2="50%"/><line x1="0" y1="75%" x2="100%" y2="75%"/><line x1="0" y1="99.9%" x2="100%" y2="99.9%"/></g></svg>'; // one vector grid per page (a dashed line is expanded to thousands of tiny rectangles by the PDF writer, ~20 KB per page, so the cut guides are solid hairlines)
/** @param {'a4'|'letter'} paperId */
export function buildFlashcardHtml(paperId, opts = {}) {
  const paper = PAPERS[paperId]; const model = buildFlashcardModel(opts); const plan = pagePlan(model);
  const css = baseCss(paper) + `
@font-face{font-family:WB-Alef;src:url("../../../assets/fonts/alef-Alef-Regular.ttf")}
body{font-family:"Liberation Sans","DejaVu Sans",Arial,sans-serif}.page{padding:9mm 10mm 8mm}.hd{margin-bottom:2mm}
.grid12{display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(4,1fr);height:${paper.h - 0.6 - 9 - 8 - 14}mm;position:relative}.gl{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none}
.card{display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;padding:2mm 3mm;text-align:center;overflow:hidden}
.cw{font-family:WB-Alef;font-size:27pt;line-height:1.3}.tl{font-size:10pt;color:#222;margin-top:1mm}.en{font-size:9.5pt;margin-top:.8mm;line-height:1.2}.rk{position:absolute;top:1.2mm;left:2mm;font-size:6.5pt;color:#666}
.ft{bottom:3.5mm}.cut{font-size:6.5pt;color:#555}
`;
  const first = { kind: 'front', title: 'Start here', fields: false, body: `<h1>Vocabulary flashcards</h1><p>${model.total.toLocaleString('en-US')} common Hebrew words as cut-out cards, 12 per page, most frequent first inside each theme. ${model.themed.toLocaleString('en-US')} words are grouped by theme (data/vocab/themes); the rest are in the last group.</p>
<h2>How to use</h2><ol><li>Print single-sided at 100% (Actual size) on card or plain paper and cut along the grey lines.</li><li>Read the Hebrew aloud, then turn to the meaning: the transliteration and English are on the card to check yourself, or fold or cover them.</li><li>Sort into "know" and "learning" piles. The small number is the word's frequency rank.</li></ol>
<div class="notice"><b>${esc(CARD_DRAFT)}</b> Transliteration marked * is machine-made (Israeli, siddur style). Glosses show only the first senses. A word's pointing is taken from the vocab data and may need correction.</div>
<h2>Groups</h2><table style="font-size:9pt;border-collapse:collapse">${model.groups.map((g) => `<tr><td style="padding:.5mm 6mm .5mm 0">${esc(g.title)}</td><td>${g.cards.length.toLocaleString('en-US')} cards</td></tr>`).join('')}</table>` };
  const pages = [first].concat(plan.map((p, i) => ({ kind: 'cards', title: `${p.group.title}: cards ${p.from + 1}-${p.from + p.cards.length} of ${p.group.cards.length}`, fields: false, body: `<div class="grid12">${CUTGUIDE}${p.cards.map(card).join('')}</div>` })));
  const html = wrapHtml({ title: `ALEF vocabulary flashcards (${paper.label})`, css, pages, set: 'Flashcards', draft: CARD_DRAFT, fonts: 'Hebrew font: Alef (SIL OFL 1.1), a static font so the PDF stays small.' });
  return { html, pages: pages.map((p) => p.kind), pageCount: pages.length, model };
}

/** Letter cards: 27 fronts then their 27 backs, 12 per page; back rows mirrored for a long-edge flip. @param {'a4'|'letter'} paperId */
export function buildLetterCardsHtml(paperId, opts = {}) {
  const paper = PAPERS[paperId]; const m = buildChainModel(opts); const cells = m.cells; const per = CARDS_PER_PAGE;
  const css = baseCss(paper) + `
@font-face{font-family:WB-Alef;src:url("../../../assets/fonts/alef-Alef-Regular.ttf")}
body{font-family:"Liberation Sans","DejaVu Sans",Arial,sans-serif}.page{padding:9mm 10mm 8mm}.hd{margin-bottom:2mm}
.grid12{display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(4,1fr);height:${paper.h - 0.6 - 9 - 8 - 14}mm;border-left:.3mm dashed #666;border-top:.3mm dashed #666}
.card{border-right:.3mm dashed #666;border-bottom:.3mm dashed #666;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;padding:2mm 3mm;text-align:center;overflow:hidden;gap:1mm}
.card.fin{box-shadow:inset 0 0 0 .5mm #000}.card.empty{border-style:none}
.big{font-size:54pt;line-height:1.1}.pic{display:flex;align-items:center;justify-content:center;width:26mm;height:26mm;border:.25mm solid #000;overflow:hidden}.pic img{width:100%;height:100%;filter:grayscale(1) contrast(1.2)}.pic.empty{font-size:7pt;color:#555;border-style:dashed}
.hk{font-size:11pt;font-weight:bold;line-height:1.15}.w{font-size:30pt;line-height:1.2}.gl{font-size:10pt}.rk{position:absolute;top:1.2mm;left:2mm;font-size:6.5pt;color:#444}.sd{position:absolute;bottom:1.2mm;right:2mm;font-size:6pt;color:#444}
`;
  const front = (c) => `<div class="card${c.final ? ' fin' : ''}" data-letter-card="${c.id}" data-side="front"><span class="rk">${c.n} ${esc(c.name)}</span>${pictureBox(c)}<span class="he print big">${esc(c.he)}</span><span class="sd">front</span></div>`;
  const back = (c) => `<div class="card${c.final ? ' fin' : ''}" data-letter-card="${c.id}" data-side="back"><span class="rk">${c.n} ${esc(c.name)}</span><span class="hk">${esc(c.hook)}</span><span class="he print w">${esc(c.word.he || '')}</span><span class="gl">${esc(c.word.gloss || '')}</span><span class="sd">back</span></div>`;
  const chunks = []; for (let i = 0; i < cells.length; i += per) chunks.push(cells.slice(i, i + per));
  const pad = (arr) => arr.concat(Array(per - arr.length).fill(null));
  const mirror = (arr) => { const out = []; for (let r = 0; r < per / 3; r++) out.push(...arr.slice(r * 3, r * 3 + 3).reverse()); return out; };
  const sheet = (arr, fn) => `<div class="grid12">${arr.map((c) => (c ? fn(c) : '<div class="card empty"></div>')).join('')}</div>`;
  const first = { kind: 'front', title: 'Start here', fields: false, body: `<h1>Letter flashcards: the memory chain</h1><p>${cells.length} cut-out cards, 12 per page. Each card has a front (the letter and its picture) and a back (the hook word, an example Hebrew word and what it means). Print single-sided at 100% (Actual size) for two piles, or double-sided with a long-edge flip: back pages are already mirrored so each back lines up behind its front.</p>
<ol><li>Look at the letter and picture, say its sound, then turn the card to check the hook and the word.</li><li>Double-bordered cards are the five final forms (sofit), used only at the end of a word.</li><li>Sort into "know" and "learning" piles.</li></ol>
<div class="notice"><b>${esc(m.fixture ? FIXTURE_NOTE : CHAIN_DRAFT)}</b></div>` };
  const pages = [first];
  chunks.forEach((ch, i) => { pages.push({ kind: 'letter-fronts', title: `Fronts, page ${i + 1} of ${chunks.length}`, fields: false, body: sheet(pad(ch), front) }); pages.push({ kind: 'letter-backs', title: `Backs, page ${i + 1} of ${chunks.length} (mirrored for a long-edge flip)`, fields: false, body: sheet(mirror(pad(ch)), back) }); });
  const html = wrapHtml({ title: `ALEF letter flashcards (${paper.label})`, css, pages, set: 'Letter flashcards', draft: m.fixture ? FIXTURE_NOTE : CHAIN_DRAFT, fonts: 'Fonts: Frank Ruhl Libre (SIL OFL 1.1).' });
  return { html, pages: pages.map((p) => p.kind), pageCount: pages.length, model: m };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const light = process.argv.includes('--light');
  if (process.argv.includes('--letters')) await buildEditions({ builder: (p) => buildLetterCardsHtml(p), name: 'alef-flashcards-letters', kind: 'flashcards-letters', label: 'Letter flashcards (27 cards, memory chain)', htmlOnly: process.argv.includes('--html-only') });
  else   await buildEditions({ builder: (p) => buildFlashcardHtml(p, light ? { limit: 1000 } : {}), name: light ? 'alef-flashcards-light' : 'alef-flashcards', kind: light ? 'flashcards-light' : 'flashcards', label: light ? 'Flashcards (first 1,000 words)' : 'Flashcards (5,000 words)', htmlOnly: process.argv.includes('--html-only') });
}
