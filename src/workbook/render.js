// Printable workbook: turns a workbook built by ./model.js into pages. The browser's own print dialog prints it or saves it as a PDF;
// the print stylesheet hides the app around it and starts each chapter, letter group and book on a fresh page.
import { h, heSpan } from '../shell/ui.js';

const SVG = 'http://www.w3.org/2000/svg';
const svg = (tag, attrs = {}, ...kids) => { const e = document.createElementNS(SVG, tag); for (const [k, v] of Object.entries(attrs)) if (v != null) e.setAttribute(k, String(v)); e.append(...kids); return e; };

/** Paper sizes the workbook prints on. */
export const PAPER = Object.freeze({ a4: { label: 'A4', css: 'A4' }, letter: { label: 'US Letter', css: 'letter' } });

/** Print stylesheet; `paper` is a PAPER key. */
export function workbookCss(paper = 'a4') {
  const size = (PAPER[paper] || PAPER.a4).css;
  return `
.wb-book{max-inline-size:48rem;margin-inline:auto;color:inherit}
.wb-page{padding:1rem 0}
.wb-book h2{font-size:1.5rem;margin:.2rem 0 .4rem}
.wb-book h3{font-size:1.15rem;margin:.8rem 0 .3rem}
.wb-he{font-family:'Frank Ruhl Libre','Heebo',serif;direction:rtl;unicode-bidi:isolate}
.wb-cover{text-align:center;padding-block:3rem}
.wb-cover .wb-big{font-size:4.5rem;line-height:1.2}
.wb-line{border-block-end:1px solid #999;block-size:2.6rem;margin-block:.2rem .9rem}
.wb-row{display:flex;gap:.4rem;flex-wrap:wrap;direction:rtl;align-items:flex-end}
.wb-box{inline-size:3.8rem;block-size:4rem;border:1px solid #aaa;border-radius:4px;display:grid;place-items:center;font-size:2.4rem;line-height:1;position:relative}
.wb-book .wb-box.wb-he{font-size:3.4rem;line-height:1}
.wb-box::after{content:'';position:absolute;inset-inline:6px;inset-block-end:28%;border-block-end:1px dashed #ccc}
.wb-trace{color:#bdbdbd}
.wb-book .wb-outline{color:transparent;-webkit-text-stroke:1.6px #777;font-size:6.5rem;line-height:1;display:inline-block;padding-inline:.5rem}
.wb-letter{display:grid;grid-template-columns:auto 1fr;gap:.6rem 1rem;align-items:center;border:1px solid #bbb;border-radius:8px;padding:.6rem .8rem;margin-block:.6rem;break-inside:avoid}
.wb-strokes{display:flex;gap:.35rem;direction:ltr;flex-wrap:wrap}
.wb-strokes svg{inline-size:4.2rem;block-size:4.2rem;border:1px solid #ddd;border-radius:4px;background:#fff}
.wb-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(5.2rem,1fr));gap:.4rem;direction:rtl}
.wb-cell{border:1px solid #bbb;border-radius:6px;text-align:center;padding:.2rem .2rem .5rem}
.wb-cell .wb-he{font-size:2.2rem;line-height:1.3;display:block}
.wb-cell .wb-ans{display:block;border-block-end:1px solid #999;block-size:1.2rem;margin:.2rem .4rem 0}
.wb-tiles{display:flex;gap:.3rem;direction:rtl;flex-wrap:wrap}
.wb-tile{border:1px solid #999;border-radius:5px;padding:.05rem .45rem;font-size:1.8rem}
.wb-item{break-inside:avoid;margin-block:.5rem .9rem}
.wb-build{display:grid;grid-template-columns:1fr 1fr;gap:.2rem 1.4rem}
.wb-book .wb-tile.wb-he{font-size:2.4rem}
.wb-book .wb-cell .wb-he{font-size:2.6rem}
.wb-match{inline-size:100%;border-collapse:collapse}
.wb-match td{border:1px solid #bbb;padding:.35rem .5rem;vertical-align:middle}
.wb-match .wb-he{font-size:1.6rem}
.wb-prayer{break-inside:avoid;border-block-end:1px solid #ddd;padding-block:.5rem}
.wb-prayer .wb-he{font-size:1.8rem;line-height:1.7;display:block}
.wb-translit{font-style:italic}
.wb-draw{block-size:9rem;border:1px dashed #999;border-radius:8px;margin-block:.4rem}
.wb-note{font-size:.85rem;opacity:.85}
.wb-key{font-size:.9rem}
.wb-key .wb-he{font-size:1.2rem}
@page{size:${size};margin:14mm}
@media print{
  body *{visibility:hidden}
  .wb-book,.wb-book *{visibility:visible}
  .wb-book{position:absolute;inset-inline-start:0;inset-block-start:0;inline-size:100%;max-inline-size:none;color:#000;background:#fff}
  .wb-noprint{display:none!important}
  .wb-page{break-before:page;padding:0}
  .wb-cover{break-before:auto}
  .wb-book h2,.wb-book h3{break-after:avoid}
}`;
}

/** Stroke-order panels from letters.json strokes (1000-unit box, y down): earlier strokes grey, the current one dark with a start dot. */
export function strokePanels(strokes) {
  if (!strokes?.length) return null;
  const pts = strokes.flatMap((s) => [...String(s.path).matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => +m[0]));
  const xs = pts.filter((_, i) => i % 2 === 0), ys = pts.filter((_, i) => i % 2 === 1);
  const pad = 90, x0 = Math.min(...xs) - pad, y0 = Math.min(...ys) - pad, side = Math.max(Math.max(...xs) - x0, Math.max(...ys) - y0) + pad;
  return h('div', { class: 'wb-strokes', role: 'img', 'aria-label': `Stroke order: ${strokes.length} ${strokes.length === 1 ? 'stroke' : 'strokes'}` },
    ...strokes.map((cur, k) => svg('svg', { viewBox: `${x0} ${y0} ${side} ${side}`, 'aria-hidden': 'true' },
      ...strokes.slice(0, k).map((s) => svg('path', { d: s.path, fill: 'none', stroke: '#bbb', 'stroke-width': 55, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })),
      svg('path', { d: cur.path, fill: 'none', stroke: '#111', 'stroke-width': 55, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
      cur.start ? svg('circle', { cx: cur.start[0], cy: cur.start[1], r: 48, fill: '#c0392b' }) : '',
      cur.start ? svg('text', { x: cur.start[0], y: cur.start[1] + 22, 'text-anchor': 'middle', 'font-size': 64, 'font-family': 'sans-serif', fill: '#fff', 'font-weight': 700 }, String(k + 1)) : '')));
}

const he = (t, cls = '') => heSpan(t, ('he wb-he ' + cls).trim());
const lines = (n) => Array.from({ length: n }, () => h('div', { class: 'wb-line', 'aria-hidden': 'true' }));

function lettersChapter(c) {
  return [h('p', {}, c.intro), ...c.letters.map((l) => h('div', { class: 'wb-letter' },
    h('div', {}, he(l.he, 'wb-outline')),
    h('div', {}, h('h3', {}, `${l.name}`), l.sound ? h('p', { class: 'wb-note' }, l.sound) : null,
      strokePanels(l.strokes) || h('p', { class: 'wb-note' }, 'No stroke guide is stored for this letter yet.'),
      h('div', { class: 'wb-row', 'aria-label': `Trace ${l.name}` }, ...Array.from({ length: 6 }, () => h('span', { class: 'wb-box wb-he wb-trace', lang: 'he' }, l.he))),
      h('div', { class: 'wb-row', 'aria-label': `Write ${l.name}` }, ...Array.from({ length: 6 }, () => h('span', { class: 'wb-box', 'aria-hidden': 'true' }))))))];
}
function vowelsChapter(c) {
  return [h('p', {}, c.intro), ...c.rows.map((r) => h('div', { class: 'wb-item' },
    h('h3', {}, r.name, ' ', he(r.shape)), r.hint ? h('p', { class: 'wb-note' }, r.hint) : null,
    h('div', { class: 'wb-grid' }, ...r.cells.map((x) => h('div', { class: 'wb-cell' }, he(x.he), h('span', { class: 'wb-ans', 'aria-hidden': 'true' }))))))];
}
function buildChapter(c) {
  return [h('p', {}, c.intro), h('div', { class: 'wb-build' }, ...c.items.map((x, i) => h('div', { class: 'wb-item' },
    h('p', {}, h('strong', {}, `${i + 1}. ${x.en}`), ` (${x.count} letters)`),
    h('div', { class: 'wb-tiles', 'aria-label': 'Mixed-up letters' }, ...x.tiles.map((t) => h('span', { class: 'wb-tile wb-he', lang: 'he' }, t))),
    h('div', { class: 'wb-row', 'aria-label': 'Write the word' }, ...Array.from({ length: x.count }, () => h('span', { class: 'wb-box', 'aria-hidden': 'true' }))))))];
}
function matchTable(set, caption) {
  return h('table', { class: 'wb-match' }, h('caption', { class: 'wb-note' }, caption), h('tbody', {},
    ...set.items.map((w, i) => h('tr', {}, h('td', {}, `${w.n}. `, he(w.he), '  ____'), h('td', {}, set.meanings[i] ? `${set.meanings[i].key}. ${set.meanings[i].en}` : '')))));
}
function matchChapter(c) {
  return [h('p', {}, c.intro), ...c.sets.flatMap((s, i) => [h('h3', {}, `Set ${i + 1}`), matchTable(s, 'Hebrew in the first column, meanings in the second'), h('p', { class: 'wb-note' }, 'Copy each word:'), ...lines(Math.min(4, s.items.length))])];
}
function prayersChapter(c) {
  return [h('p', {}, c.intro), h('p', { class: 'wb-note' }, 'Transliteration is computed by the app and not yet checked by a teacher. The divine name is printed as ה׳.'),
    ...c.lines.map((l) => h('div', { class: 'wb-prayer' }, h('p', { class: 'wb-note' }, l.title, l.ref ? ` (${l.ref})` : ''), he(l.he), l.translit ? h('p', { class: 'wb-translit' }, l.translit) : null, l.en ? h('p', { class: 'wb-note' }, l.en) : null, ...lines(1))),
    c.more ? h('p', { class: 'wb-note' }, `${c.more} more lines in this belt's lessons are not printed here, to keep the workbook a size you can use.`) : null];
}
function booksChapter(c) {
  return [h('p', {}, c.intro), ...c.books.map((b, bi) => h('section', { class: bi ? 'wb-page' : '' },
    h('h3', {}, b.titleEn, ' ', he(b.titleHe)), h('p', { class: 'wb-note' }, `${b.level}, ${b.pageCount} pages. Open it in the app: Books, then ${b.titleEn}.`),
    h('p', {}, h('strong', {}, '1. Match each line to its meaning.')), matchTable(b.match, 'Lines from the book'),
    h('p', {}, h('strong', {}, '2. Copy these lines.')), ...b.copy.flatMap((p) => [h('p', {}, he(p.he), `  (page ${p.n})`), ...lines(1)]),
    h('p', {}, h('strong', {}, '3. Which page says this? Write the page number.')), h('ol', {}, ...b.where.map((w) => h('li', {}, `${w.en}  Page ____`))),
    b.hunt ? h('p', {}, h('strong', {}, '4. Word hunt. '), 'How many times is ', he(b.hunt.he), ' in the book? ____') : null,
    b.draw ? h('div', { class: 'wb-item' }, h('p', {}, h('strong', {}, `${b.hunt ? 5 : 4}. Draw it. `), `Read page ${b.draw.n} and draw what it says: `, he(b.draw.he)), h('div', { class: 'wb-draw', 'aria-hidden': 'true' })) : null))];
}
const BODY = { letters: lettersChapter, vowels: vowelsChapter, build: buildChapter, match: matchChapter, prayers: prayersChapter, books: booksChapter };

/**
 * The whole workbook: cover, chapters, answer key.
 * @param {ReturnType<import('./model.js').buildWorkbook>} wb @param {{ status?: string, styleLabel?: string }} [opt]
 */
export function renderWorkbook(wb, opt = {}) {
  const cover = h('section', { class: 'wb-cover' },
    h('p', { class: 'wb-big wb-he', lang: 'he' }, 'אָלֶף'),
    h('h2', {}, `Aleph workbook: ${wb.belt.label}`),
    h('p', {}, `Reading style: ${opt.styleLabel || wb.tradition}.`),
    h('p', {}, 'Name: ______________________   Started: ____________'),
    h('p', {}, `Lessons: ${wb.lessons.map((l) => l.id).join(', ') || 'none'}`),
    h('ol', { class: 'wb-note', style: 'text-align:start;display:inline-block' }, ...wb.chapters.map((c) => h('li', {}, c.title)), wb.key.length ? h('li', {}, 'Answers') : null),
    h('p', { class: 'wb-note' }, opt.status || 'DRAFT: made by the app from its own lessons. Stroke order and transliteration are not yet reviewed by a native teacher.'));
  const chapters = wb.chapters.map((c) => h('section', { class: 'wb-page', 'aria-labelledby': `wb-c-${c.id}` }, h('h2', { id: `wb-c-${c.id}` }, c.title), ...(BODY[c.id]?.(c) || [])));
  const key = wb.key.length ? h('section', { class: 'wb-page wb-key', 'aria-labelledby': 'wb-c-key' }, h('h2', { id: 'wb-c-key' }, 'Answers'),
    ...wb.key.map((k) => h('div', {}, h('h3', {}, k.title), ...k.lines.map((t) => h('p', {}, ...(Array.isArray(t) ? t : [t]).map((x) => (x && typeof x === 'object' ? he(x.he) : x))))))) : null;
  return h('article', { class: 'wb-book', 'aria-label': `Workbook: ${wb.belt.label}` }, cover, ...chapters, key);
}
