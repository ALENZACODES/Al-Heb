// Vocabulary appendix by theme: every word of data/vocab/themes/*-setNN.json (40 files, 21 topics) grouped by topic in file order, with the
// transliteration and gloss from the theme data and, where the data has one, the example line (verbatim from the project corpus and lesson
// text; the theme files say so). Draft: not reviewed by a native speaker. Pure over the data files.
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, readJson } from '../content.mjs';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const VOCAB_ID = 'ch-vocab-app';
/** Print only: cut a long example at a word boundary and end it with an ellipsis (some corpus lines are whole liturgical paragraphs, up to 1,100 characters). The data files keep the full line. */
export const clipAt = (t, n) => { const s = String(t ?? ''); if (s.length <= n * 1.3) return s; const cut = s.slice(0, n).replace(/\s+\S*$/, ''); return (cut || s.slice(0, n)) + '\u2026'; };
export const topicTitle = (t) => t.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());

export function themeModel() {
  const dir = join(ROOT, 'data/vocab/themes'); let files;
  try { files = readdirSync(dir).filter((f) => /-set\d+\.json$/.test(f)).sort(); } catch { return { topics: [], words: 0, withExample: 0 }; }
  const topics = []; const idx = new Map();
  for (const f of files) {
    const t = readJson('data/vocab/themes/' + f); if (!t?.words) continue;
    if (!idx.has(t.topic)) { idx.set(t.topic, { topic: t.topic, title: topicTitle(t.topic), words: [] }); topics.push(idx.get(t.topic)); }
    idx.get(t.topic).words.push(...t.words.map((w) => ({ he: w.he, translit: w.translit, en: w.en, pos: w.pos, example: w.example ? { he: w.example.he, en: w.example.en } : null })));
  }
  return { topics, words: topics.reduce((a, t) => a + t.words.length, 0), withExample: topics.reduce((a, t) => a + t.words.filter((w) => w.example).length, 0) };
}

/** @param {Record<string,number>} pages anchor -> printed page */
export function vocabAppendix(pages = {}) {
  const m = themeModel(); if (!m.topics.length) return { html: '', model: m };
  const pg = (id) => `<span class="pg">${pages[id] ?? '&middot;&middot;&middot;'}</span>`;
  const entry = (w) => `<div class="va"><span class="he vh" lang="he" dir="rtl">${esc(w.he)}</span><span class="vt">${esc(w.translit)}</span><span class="ve">${esc(w.en)}</span>${w.example ? `<div class="vx"><span class="he" lang="he" dir="rtl">${esc(clipAt(w.example.he, 110))}</span><span class="vxe">${esc(clipAt(w.example.en, 130))}</span></div>` : ''}</div>`;
  const html = `<section class="chapter" id="${VOCAB_ID}"><h2>Vocabulary by theme</h2><p class="draft-flag">DRAFT &mdash; not reviewed by a native speaker</p>
<p class="small">${m.words.toLocaleString('en-US')} words in ${m.topics.length} themes (data/vocab/themes), most frequent first inside each theme. ${m.withExample.toLocaleString('en-US')} words carry an example line taken word for word from the project&rsquo;s corpus and lesson text; the sense match is not checked. Lines of more than about 140 characters are cut at a word with an ellipsis in print. Transliteration is rule-generated (Israeli). Word data CC BY-SA 4.0 (Wiktionary, FrequencyWords); see the colophon.</p>
<table class="grid ill"><tbody>${m.topics.map((t) => `<tr><td>${t.words.length}</td><td><a href="#va-${t.topic}" style="display:contents">${esc(t.title)} ${pg('va-' + t.topic)}</a></td></tr>`).join('')}</tbody></table>
${m.topics.map((t) => `<div class="vtheme" id="va-${t.topic}"><h3>${esc(t.title)} <span class="small">(${t.words.length})</span></h3><div class="vcols">${t.words.map(entry).join('')}</div></div>`).join('')}</section>`;
  return { html, model: m };
}

export const VOCAB_CSS = `
.vtheme{break-before:page}.vtheme h3{border-bottom:1pt solid var(--gold,#c9a64b);margin:0 0 4pt}
.vcols{columns:2;column-gap:14pt}.va{break-inside:avoid;display:grid;grid-template-columns:auto 1fr;column-gap:6pt;align-items:baseline;padding:1.4pt 0;border-bottom:.3pt solid #e5dfd0;font:8.2pt/1.25 var(--ui-font)}
.va .vh{font-size:13pt;line-height:1.25;grid-row:span 2;min-width:46pt;text-align:right}.va .vt{font-style:italic;color:#B0373B}.va .ve{grid-column:2;color:#333}.va .vx{grid-column:1 / span 2;font-size:7.2pt;color:#555;padding-left:2pt}.va .vx .he{font-size:10.5pt;display:block;text-align:right;line-height:1.35}.va .vx .vxe{display:block;margin-top:1pt}
`;
