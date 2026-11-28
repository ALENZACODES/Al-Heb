// Printable workbook page (#/workbook). Top: build a workbook for any belt from the app's own lessons (src/workbook/model.js), in the
// learner's reading style, and print it or save it as a PDF with the browser's print dialog (25 Nov 2026 critique, item 7). Below: the
// letter-tracing PDFs in assets/workbook/ (manifest.json lists them).
import { count } from './plural.js';
import { h } from './ui.js';
import { BELTS, CHAPTERS, buildWorkbook, describe } from '../workbook/model.js';
import { renderWorkbook, workbookCss, PAPER } from '../workbook/render.js';
import { transliterate } from '../pronunciation/transliterate.js';
import { congregationOf } from '../pronunciation/forTradition.js';

const mb = (b) => (b / 1048576).toFixed(1) + ' MB';
const LABEL = { print: 'Print letters', cursive: 'Cursive letters' };
const STYLE_LABEL = { sephardi: 'Sephardi', israeli: 'Israeli', ashkenazi: 'Ashkenazi' };
const PREFS_KEY = 'workbook.prefs';

const getJSON = async (ctx, rel) => { const r = await (ctx?.fetchFn ?? globalThis.fetch)(new URL(rel, import.meta.url)); if (!r || r.ok === false) throw new Error(rel); return r.json(); };

/** The belt the learner is on: the level of their first unfinished lesson on their track (White for a new learner). */
export function currentBelt(lessons, completed = {}, track = 'read') {
  const next = lessons.find((l) => (l.track || 'read') === track && !completed[l.id]);
  return (next && BELTS.some((b) => b.id === next.level) ? next.level : null) || (track === 'israel' ? 'A1' : 'white');
}

export async function mount(root, ctx) {
  let alive = true;
  const style = document.createElement('style'); style.id = 'wb-style'; document.head.append(style);
  let prefs = {}; try { prefs = ctx?.store?.get?.(PREFS_KEY, {}) || {}; } catch { prefs = {}; }
  const savePrefs = () => { try { ctx?.store?.set?.(PREFS_KEY, prefs); } catch { /* prefs are a convenience */ } };

  const status = h('p', { role: 'status', class: 'muted' }, 'Loading the lessons...');
  const builder = h('div', {});
  const preview = h('div', {});
  const pdfList = h('div', {});

  root.replaceChildren(h('article', { class: 'stack' },
    h('section', { class: 'card wb-noprint' },
      h('h1', { id: 'view-title', tabindex: '-1' }, 'Printable workbooks'),
      h('p', {}, 'Make a workbook for any belt: stroke order and tracing for its letters, vowel drills, word building, word meanings, prayer practice in your reading style, and companion pages for the story books. It is built from the same lessons you study here, so it always matches them.'),
      h('p', { class: 'draft-flag', role: 'note' }, 'DRAFT: stroke order and transliteration are made by the app and not yet reviewed by a native teacher.')),
    h('section', { class: 'card wb-noprint', 'aria-labelledby': 'wb-make' }, h('h2', { id: 'wb-make' }, 'Make a workbook'), status, builder),
    preview,
    h('section', { class: 'card wb-noprint', 'aria-labelledby': 'wb-files' }, h('h2', { id: 'wb-files' }, 'Letter-tracing PDFs'),
      h('p', {}, 'Stroke-order guides and tracing pages for the whole alphabet, ready made. Pick the paper size you have: A4 outside North America, US Letter in the US and Canada.'), pdfList),
    h('section', { class: 'card wb-noprint', 'aria-labelledby': 'wb-print' }, h('h2', { id: 'wb-print' }, 'How to print'),
      h('ol', {},
        h('li', {}, 'Press Print workbook (or open a PDF and choose Print). To keep a file, choose "Save as PDF" as the printer.'),
        h('li', {}, 'Set scale to 100% (or "Actual size"). Do not choose "Fit to page", which shrinks the letters and the guide lines.'),
        h('li', {}, 'Print single-sided; black and white is fine. Grey tracing letters should stay light.'),
        h('li', {}, 'Use a pencil or a fine pen, and follow the numbered strokes.')),
      h('p', {}, h('a', { class: 'btn secondary', href: '#/letters' }, 'Trace letters on screen'), ' ', h('a', { class: 'btn secondary', href: '#/worksheet' }, 'One-page worksheet from a lesson')))));

  // Ready-made PDFs (unchanged behaviour).
  getJSON(ctx, '../../assets/workbook/manifest.json').then((m) => {
    if (!alive) return;
    const files = Array.isArray(m?.files) ? m.files : [];
    pdfList.replaceChildren(m?.status ? h('p', { class: 'draft-flag', role: 'note' }, m.status) : '', files.length
      ? h('ul', { class: 'credits', 'aria-label': 'Workbook PDFs' }, ...files.map((f) => h('li', {},
          h('strong', {}, `${LABEL[f.script] ?? f.script}, ${f.paper}${f.mnemonics ? ', with memory hooks' : ''}`),
          h('span', { class: 'block muted' }, `${count(f.pages, 'page')}, ${mb(f.bytes)}`),
          h('a', { class: 'btn', href: new URL('../../assets/workbook/' + f.pdf, import.meta.url).href, download: f.pdf, 'aria-label': `Download PDF: ${LABEL[f.script] ?? f.script} workbook, ${f.paper}${f.mnemonics ? ', with memory hooks' : ''}` }, 'Download PDF'))))
      : h('p', { class: 'muted' }, 'No workbook files are listed in this build.'),
      m?.fonts ? h('p', { class: 'muted' }, 'Fonts: ' + m.fonts + '.') : '',
      h('p', { class: 'muted' }, 'These are large files and are not saved for offline use automatically. Download them while you are online.'));
  }).catch(() => { if (alive) pdfList.replaceChildren(h('p', { class: 'muted', role: 'status' }, 'The PDF list could not be loaded. It may not be available offline: PDFs are not stored for offline use until you open them once.')); });

  let data;
  try {
    const [L, letters, niqqud, registry, shelf] = await Promise.all([
      getJSON(ctx, '../../data/curriculum/lessons.json'), getJSON(ctx, '../../data/letters/letters.json'), getJSON(ctx, '../../data/pronunciation/niqqud.json'),
      getJSON(ctx, '../../data/corpus/registry.json'), getJSON(ctx, '../../data/books/index.json')]);
    data = { lessons: L.lessons || [], letters: Array.isArray(letters) ? letters : letters.letters || [], niqqud: niqqud.records || [], registry: registry.entries || [], books: shelf.books || [] };
  } catch {
    if (alive) status.textContent = 'The lessons did not load. Open this page again while online.';
    return () => { alive = false; style.remove(); };
  }
  if (!alive) return () => {};

  let completed = {}; try { completed = ctx?.store?.get?.('curriculum.progress', {})?.completed || {}; } catch { completed = {}; }
  const goal = ctx?.settings?.goal === 'israel' ? 'israel' : 'read';
  const sel = {
    belt: BELTS.some((b) => b.id === prefs.belt) ? prefs.belt : currentBelt(data.lessons, completed, goal),
    tradition: STYLE_LABEL[prefs.tradition] ? prefs.tradition : congregationOf(ctx?.settings),
    paper: PAPER[prefs.paper] ? prefs.paper : (/^en-(US|CA)\b/.test(globalThis.navigator?.language || '') ? 'letter' : 'a4'),
    chapters: Array.isArray(prefs.chapters) && prefs.chapters.length ? prefs.chapters : CHAPTERS.map((c) => c.id),
    books: ['belt', 'all', 'none'].includes(prefs.books) ? prefs.books : 'belt',
  };
  const bookCache = {};
  const summary = h('p', { class: 'muted', 'aria-live': 'polite' });
  const printBtn = h('button', { type: 'button', class: 'btn', id: 'wb-print-btn', onclick: () => { try { globalThis.print?.(); } catch { summary.textContent = 'This browser cannot print from here. Use its own menu: File, Print.'; } } }, 'Print workbook');

  const select = (id, label, options, value, on) => h('p', {}, h('label', { for: id }, label + ' '),
    h('select', { id, onchange: (e) => on(e.target.value) }, ...options.map(([v, t]) => h('option', { value: v, selected: v === value ? '' : null }, t))));
  const chapterBoxes = h('fieldset', {}, h('legend', {}, 'Chapters'), ...CHAPTERS.map((c) => h('label', { class: 'block' },
    h('input', { type: 'checkbox', value: c.id, checked: sel.chapters.includes(c.id) ? '' : null, onchange: (e) => { sel.chapters = e.target.checked ? [...new Set([...sel.chapters, c.id])] : sel.chapters.filter((x) => x !== c.id); draw(); } }), ' ', c.label)));

  builder.replaceChildren(
    select('wb-belt', 'Belt', BELTS.map((b) => [b.id, b.label + (b.id === currentBelt(data.lessons, completed, b.track) ? ' (where you are)' : '')]), sel.belt, (v) => { sel.belt = v; draw(); }),
    select('wb-style-pick', 'Reading style for transliteration', Object.entries(STYLE_LABEL), sel.tradition, (v) => { sel.tradition = v; draw(); }),
    select('wb-paper', 'Paper', Object.entries(PAPER).map(([k, p]) => [k, p.label]), sel.paper, (v) => { sel.paper = v; draw(); }),
    chapterBoxes,
    select('wb-books', 'Story-book companions', [['belt', 'Books for this belt'], ['all', 'All 63 books (a long workbook)'], ['none', 'No books']], sel.books, (v) => { sel.books = v; draw(); }),
    summary, h('p', {}, printBtn));
  status.textContent = '';

  let seq = 0;
  async function draw() {
    const my = ++seq;
    prefs = { belt: sel.belt, tradition: sel.tradition, paper: sel.paper, chapters: sel.chapters, books: sel.books }; savePrefs();
    style.textContent = workbookCss(sel.paper);
    const belt = BELTS.find((b) => b.id === sel.belt);
    const chapters = sel.books === 'none' ? sel.chapters.filter((c) => c !== 'books') : sel.chapters;
    const ids = !chapters.includes('books') ? [] : sel.books === 'all' ? data.books.map((b) => b.id) : data.books.filter((b) => belt.books.includes(b.level)).map((b) => b.id);
    const missing = ids.filter((id) => !(id in bookCache));
    if (missing.length) {
      summary.textContent = `Loading ${count(missing.length, 'book')}...`; printBtn.disabled = true;
      await Promise.all(missing.map((id) => getJSON(ctx, `../../data/books/${id}.json`).then((b) => { bookCache[id] = b; }).catch(() => { bookCache[id] = null; })));
      if (!alive || my !== seq) return;
    }
    const wb = buildWorkbook(sel.belt, { ...data, bookData: bookCache, bookIds: ids, tradition: sel.tradition, transliterate, chapters });
    summary.textContent = `${belt.label}: ${describe(wb)}.`;
    printBtn.disabled = !wb.chapters.length;
    preview.replaceChildren(wb.chapters.length ? renderWorkbook(wb, { styleLabel: STYLE_LABEL[sel.tradition] }) : h('p', { class: 'card muted wb-noprint' }, 'Nothing to print for this belt with these chapters. Pick another belt or more chapters.'));
  }
  draw();
  return () => { alive = false; try { style.remove(); } catch { /* gone */ } };
}
