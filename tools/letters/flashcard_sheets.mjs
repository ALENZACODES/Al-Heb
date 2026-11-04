#!/usr/bin/env node
// Vocabulary flashcard sheets, A4 + US Letter: the 5,000-word list (data/vocab/vocab5000.json) as cut-out cards, 12 per page (3 x 4),
// grouped by theme from data/vocab/themes/*.json when the word's pointed form is in a theme set (theme order = index.json/file order);
// words in no theme go to a final "Other words" group. Within a group, most frequent first. Each group starts on a new page.
// Card: pointed Hebrew (large), transliteration (theme data, else src/pronunciation/transliterate.js, marked *), short English gloss, rank.
// Nothing is invented: Hebrew, glosses and ranks come from the vocab data. A lighter variant (first 1,000 words) is built with --light.
// Usage: node tools/letters/flashcard_sheets.mjs [--html-only] [--light]
// Output: docs/workbook/alef-flashcards-<a4|letter>.pdf (all 5,000) or alef-flashcards-light-<a4|letter>.pdf (--light)
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { readJson, root, esc, baseCss, wrapHtml, buildEditions } from './firstday_pages.mjs';
import { PAPERS } from './workbook.mjs';
import { transliterate } from '../../src/pronunciation/transliterate.js';

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

/** @param {'a4'|'letter'} paperId */
export function buildFlashcardHtml(paperId, opts = {}) {
  const paper = PAPERS[paperId]; const model = buildFlashcardModel(opts); const plan = pagePlan(model);
  const css = baseCss(paper) + `
@font-face{font-family:WB-Alef;src:url("../../../assets/fonts/alef-Alef-Regular.ttf")}
body{font-family:"Liberation Sans","DejaVu Sans",Arial,sans-serif}.page{padding:9mm 10mm 8mm}.hd{margin-bottom:2mm}
.grid12{display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(4,1fr);height:${paper.h - 0.6 - 9 - 8 - 14}mm;border-left:.3mm dashed #666;border-top:.3mm dashed #666}
.card{border-right:.3mm dashed #666;border-bottom:.3mm dashed #666;display:flex;flex-direction:column;align-items:center;justify-content:center;position:relative;padding:2mm 3mm;text-align:center;overflow:hidden}
.cw{font-family:WB-Alef;font-size:27pt;line-height:1.3}.tl{font-size:10pt;color:#222;margin-top:1mm}.en{font-size:9.5pt;margin-top:.8mm;line-height:1.2}.rk{position:absolute;top:1.2mm;left:2mm;font-size:6.5pt;color:#666}
.ft{bottom:3.5mm}.cut{font-size:6.5pt;color:#555}
`;
  const first = { kind: 'front', title: 'Start here', fields: false, body: `<h1>Vocabulary flashcards</h1><p>${model.total.toLocaleString('en-US')} common Hebrew words as cut-out cards, 12 per page, most frequent first inside each theme. ${model.themed.toLocaleString('en-US')} words are grouped by theme (data/vocab/themes); the rest are in the last group.</p>
<h2>How to use</h2><ol><li>Print single-sided at 100% (Actual size) on card or plain paper and cut along the dashed lines.</li><li>Read the Hebrew aloud, then turn to the meaning: the transliteration and English are on the card to check yourself, or fold or cover them.</li><li>Sort into "know" and "learning" piles. The small number is the word's frequency rank.</li></ol>
<div class="notice"><b>${esc(CARD_DRAFT)}</b> Transliteration marked * is machine-made (Israeli, siddur style). Glosses show only the first senses. A word's pointing is taken from the vocab data and may need correction.</div>
<h2>Groups</h2><table style="font-size:9pt;border-collapse:collapse">${model.groups.map((g) => `<tr><td style="padding:.5mm 6mm .5mm 0">${esc(g.title)}</td><td>${g.cards.length.toLocaleString('en-US')} cards</td></tr>`).join('')}</table>` };
  const pages = [first].concat(plan.map((p, i) => ({ kind: 'cards', title: `${p.group.title}: cards ${p.from + 1}-${p.from + p.cards.length} of ${p.group.cards.length}`, fields: false, body: `<div class="grid12">${p.cards.map(card).join('')}</div>` })));
  const html = wrapHtml({ title: `ALEF vocabulary flashcards (${paper.label})`, css, pages, set: 'Flashcards', draft: CARD_DRAFT, fonts: 'Hebrew font: Alef (SIL OFL 1.1), a static font so the PDF stays small.' });
  return { html, pages: pages.map((p) => p.kind), pageCount: pages.length, model };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const light = process.argv.includes('--light');
  await buildEditions({ builder: (p) => buildFlashcardHtml(p, light ? { limit: 1000 } : {}), name: light ? 'alef-flashcards-light' : 'alef-flashcards', kind: light ? 'flashcards-light' : 'flashcards', label: light ? 'Flashcards (first 1,000 words)' : 'Flashcards (5,000 words)', htmlOnly: process.argv.includes('--html-only') });
}
