#!/usr/bin/env node
// Read-aloud practice sheets, A4 + US Letter, 30 pages: the Siddur phrases a learner meets first (Shema, Priestly Blessing, Kiddush,
// HaMotzi, Modeh Ani, Adon Olam, Ein Kamocha) as large pointed text, taken VERBATIM from data/corpus/registry.json (no Hebrew is written
// here). Each page shows a few short phrases with three pronunciation boxes (Israeli | Sephardi | Ashkenazi) made by
// src/pronunciation/transliterate.js (siddur scheme) and three tick circles for "read it aloud 3 times".
// A phrase is a run of at most 4 words cut from a registry line at word boundaries; the cut is the sheet's, not the tradition's.
// NOTE: "Ein Keloheinu" is not in data/corpus (see data/corpus/gaps.json); the Ein Kamocha trio (the Torah-ark lines) stands in for it.
// Usage: node tools/letters/readaloud_sheets.mjs [--html-only]   Output: docs/workbook/alef-readaloud-<a4|letter>.pdf (+ html/)
import { fileURLToPath } from 'node:url';
import { readJson, esc, baseCss, wrapHtml, buildEditions } from './firstday_pages.mjs';
import { transliterate } from '../../src/pronunciation/transliterate.js';
import { consonantFeatures, drills } from '../../book/content.mjs';

export const READ_DRAFT = 'DRAFT: texts verbatim from data/corpus but not proofread; transliteration is machine-made, not checked by a native speaker.';
export const TRADITIONS = [['israeli', 'Israeli'], ['sephardi', 'Sephardi'], ['ashkenazi', 'Ashkenazi']];
export const WORDS_PER_PHRASE = 4; export const PHRASES_PER_PAGE = 3;
/** Groups in learning order; ids are registry ids. */
export const GROUPS = [
  { key: 'shema', title: 'The Shema', ids: ['shema-1'], overview: false },
  { key: 'priestly', title: 'The Priestly Blessing', ids: ['bless-priestly-1', 'bless-priestly-2', 'bless-priestly-3'], overview: true },
  { key: 'kiddush', title: 'Kiddush', ids: ['kiddush-wine-1', 'kiddush-shabbat-eve', 'kiddush-gen-2-1-3'], overview: true },
  { key: 'hamotzi', title: 'HaMotzi (the blessing over bread)', ids: ['hamotzi'], overview: true },
  { key: 'modeh', title: 'Modeh Ani', ids: ['modeh-ani-1'], overview: true },
  { key: 'adon', title: 'Adon Olam', ids: ['adon-olam-1'], overview: true },
  { key: 'einkamocha', title: 'Ein Kamocha (Torah-ark lines; Ein Keloheinu is not in the corpus)', ids: ['ein-kamocha', 'malchutcha', 'adonai-oz'], overview: true }
];
const tr = (he, t) => transliterate(he, { scheme: 'siddur', tradition: t });

/** Cut one registry line into phrases of at most `max` words, as even as possible. */
export function splitLine(line, max = WORDS_PER_PHRASE) {
  const w = line.trim().split(/\s+/); const n = Math.ceil(w.length / max); const out = []; let i = 0;
  for (let k = 0; k < n; k++) { const take = Math.ceil((w.length - i) / (n - k)); out.push(w.slice(i, i + take).join(' ')); i += take; }
  return out;
}

/** Pure model: groups with their entries (verbatim), phrases and pronunciations; plus the page plan. */
export function buildReadAloudModel() {
  const raw = readJson('data/corpus/registry.json'); const reg = Array.isArray(raw) ? raw : raw.entries;
  const byId = new Map(reg.map((e) => [e.id, e]));
  const groups = GROUPS.map((g) => {
    const entries = g.ids.map((id) => { const e = byId.get(id); if (!e) throw new Error('registry id missing: ' + id); return e; });
    const phrases = [];
    for (const e of entries) e.he.split('\n').forEach((line, li) => splitLine(line).forEach((he) => phrases.push({ he, entry: e.id, line: li + 1, say: Object.fromEntries(TRADITIONS.map(([t]) => [t, tr(he, t)])) })));
    return { ...g, entries, phrases };
  });
  return { groups, pages: planPages(groups) };
}
/** Page plan: front, then per group an overview (if wanted) and its phrase pages, then the tradition cheat sheet. */
export function planPages(groups) {
  const p = [{ kind: 'front' }];
  for (const g of groups) {
    if (g.overview) p.push({ kind: 'overview', group: g.key });
    for (let i = 0; i < g.phrases.length; i += PHRASES_PER_PAGE) p.push({ kind: 'phrases', group: g.key, from: i, to: Math.min(i + PHRASES_PER_PAGE, g.phrases.length) });
  }
  p.push({ kind: 'cheatsheet' });
  return p;
}

function phraseBlock(ph, n) {
  return `<div class="ph" data-phrase="${esc(ph.entry)}-${ph.line}-${n}"><div class="phtop"><span class="pn">${n}</span><span class="he print big">${esc(ph.he)}</span></div><div class="boxes">${TRADITIONS.map(([t, label]) => `<div class="pb" data-tradition="${t}"><small>${label}</small><span>${esc(ph.say[t])}</span></div>`).join('')}<div class="tick"><small>Read aloud</small><span>&#9711; &#9711; &#9711;</span></div></div></div>`;
}
function overviewBody(g) {
  return `<p>Read the whole text once, right to left, line by line. Then practise it in short phrases on the next pages.</p>${g.entries.map((e) => `<div class="ov"><div class="small"><b>${esc(e.title)}</b> ${esc(e.ref || '')} &middot; status: ${esc(e.status)}, proofread: ${e.proofread ? 'yes' : 'no'}${e.nusach ? ', text tradition: ' + esc(e.nusach) : ''}</div><div class="he print ovt">${esc(e.he).replace(/\n/g, '<br/>')}</div></div>`).join('')}`;
}

/** @param {'a4'|'letter'} paperId */
export function buildReadAloudHtml(paperId) {
  const { PAPERS } = PAPER_REF; const paper = PAPERS[paperId]; const m = buildReadAloudModel();
  const css = baseCss(paper) + `
.big{font-size:30pt;line-height:1.25}.ph{height:${paperId === 'a4' ? 70 : 66}mm;border-top:.3mm solid #000;padding-top:2mm;break-inside:avoid}
.phtop{display:flex;gap:4mm;align-items:center;justify-content:flex-end;min-height:22mm}.phtop .big{text-align:right}.pn{font-weight:bold;font-size:11pt;margin-left:2mm;order:2}
.boxes{display:grid;grid-template-columns:1fr 1fr 1fr .62fr;gap:2.5mm;margin-top:3mm}.pb,.tick{border:.4mm solid #000;padding:1.5mm 2mm;min-height:19mm;font-size:11.5pt;line-height:1.3}.pb small,.tick small{display:block;font-size:7pt;color:#444;text-transform:uppercase;letter-spacing:.04em}.tick span{font-size:13pt;letter-spacing:.8mm}
.ov{margin:3mm 0;border-top:.3mm solid #000;padding-top:2mm}.ovt{font-size:${paperId === 'a4' ? 19 : 18}pt;line-height:1.55;text-align:right}
table.t{border-collapse:collapse;width:100%;font-size:9pt}.t td,.t th{border-bottom:.2mm solid #999;padding:1mm 1.5mm;text-align:left;vertical-align:top}.t .he{font-size:15pt}
`;
  const pages = [];
  const byKey = Object.fromEntries(m.groups.map((g) => [g.key, g]));
  const total = m.pages.length;
  m.pages.forEach((p, i) => {
    if (p.kind === 'front') pages.push({ kind: 'front', title: 'Start here', body: `<h1>Read the Siddur aloud</h1>
<p>${total} pages of the short texts you meet first. Each page gives a few phrases in large pointed type, taken word for word from the course's text collection, and three boxes that show how the phrase sounds in the <b>Israeli</b>, <b>Sephardi</b> and <b>Ashkenazi</b> ways of reading.</p>
<h2>How to practise</h2><ol><li>Read the Hebrew from the <b>right</b>. Say it aloud, slowly, before you look at a box.</li><li>Check yourself against the box for the tradition you are learning; the other boxes show what you may hear in other communities.</li><li>Colour a circle each time you read the phrase aloud without stopping. Three circles, then move on.</li></ol>
<h2>What is in this set</h2><table class="t"><tbody>${m.groups.map((g) => `<tr><td><b>${esc(g.title)}</b></td><td>${g.phrases.length} phrases</td></tr>`).join('')}</tbody></table>
<div class="notice"><b>${esc(READ_DRAFT)}</b> The divine name is written as in the sources and read aloud as &ldquo;Adonai&rdquo; (&ldquo;Adonoy&rdquo; in the Ashkenazi box). Israeli and Sephardi boxes are usually identical because the Latin spelling does not show their differences. Phrases are cut at word boundaries by this sheet, not by the tradition. <b>Ein Keloheinu</b> is not yet in the course's text collection; the Ein Kamocha lines (said when the ark is opened) are included instead. Customs and wording differ by community: follow your own prayer book and teacher.</div>` });
    else if (p.kind === 'overview') { const g = byKey[p.group]; pages.push({ kind: 'overview', title: `${g.title}: the whole text`, body: overviewBody(g) }); }
    else if (p.kind === 'phrases') { const g = byKey[p.group]; pages.push({ kind: 'phrases', title: `${g.title}: phrases ${p.from + 1}-${p.to} of ${g.phrases.length}`, body: g.phrases.slice(p.from, p.to).map((ph, k) => phraseBlock(ph, p.from + k + 1)).join('') }); }
    else {
      const f = consonantFeatures(); const d = drills();
      pages.push({ kind: 'cheatsheet', title: 'Three ways of reading', body: `<h2>Where the three traditions part</h2><ul>${f.map((x) => `<li>${esc(x.summary)}</li>`).join('')}</ul>
<h2>Same word, two traditions</h2><table class="t"><thead><tr><th>Hebrew</th><th>Meaning</th><th>Israeli</th><th>Ashkenazi</th></tr></thead><tbody>${(d.pairs || []).slice(0, 12).map((x) => `<tr><td class="he print">${esc(x.he)}</td><td>${esc(x.gloss)}</td><td>${esc(x.israeli)}</td><td>${esc(x.ashkenazi)}</td></tr>`).join('')}</tbody></table>
<p class="small">From data/pronunciation (drafts, not reviewed by a native speaker).</p>` });
    }
  });
  const html = wrapHtml({ title: `ALEF read-aloud practice (${paper.label})`, css, pages: pages.map((p) => ({ ...p, fields: true })), set: 'Read aloud', draft: READ_DRAFT });
  return { html, pages: pages.map((p) => p.kind), pageCount: pages.length, model: m };
}
import * as PAPER_REF from './workbook.mjs';

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await buildEditions({ builder: buildReadAloudHtml, name: 'alef-readaloud', kind: 'readaloud', label: 'Read-aloud practice', htmlOnly: process.argv.includes('--html-only') });
}
