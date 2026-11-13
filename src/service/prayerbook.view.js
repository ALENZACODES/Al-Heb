// My Prayer Book (#/my-prayer-book, idea N4): pick the prayers you have learned, put them in your own order, and print the book
// with your progress marks. mount(root, ctx) -> unmount. ctx: { store, settings?, serviceData? (tests) }.
// Lazy route (src/service/ is on demand). Reads only the app's own data: registry texts by id and the three service orders.
// Printing uses the browser's own print dialog (which can also save a PDF); a print stylesheet hides the app around the book.
import { h, heSpan } from '../shell/ui.js';
import { uiEnglish } from '../shell/names.js';
import { congregationOf } from '../pronunciation/forTradition.js';
import { loadCorpus } from '../corpus/corpus.js';
import { readSnapshot } from '../progress/model.js';
import { SERVICE_KEYS } from '../lib/counts.js';
import { loadServiceData } from './model.js';
import { practisedIds } from './companion.model.js';
import { normalizePractice } from './practice.model.js';
import { MYBOOK_KEY, MAX_TITLE, MARKS_NOTE, SOURCE_NOTE, SERVICE_NAMES, normaliseBook, catalogue, choices, add, remove, move, setTitle, setOption, pages, marksText, missingIds } from './prayerbook.model.js';

const CSS = `
.mpb{display:grid;gap:var(--gap,1rem);max-inline-size:44rem;margin-inline:auto;overflow-wrap:anywhere}
.mpb *{box-sizing:border-box;max-inline-size:100%}
.mpb .btn,.mpb input[type=text]{min-block-size:var(--tap,48px);font:inherit}
.mpb input[type=text]{inline-size:100%;padding:.4rem .6rem;border:2px solid var(--border,#999);border-radius:8px;background:var(--card,#fff);color:inherit}
.mpb ul.mpb-list,.mpb ol.mpb-order{list-style:none;margin:0;padding:0;display:grid;gap:.5rem}
.mpb ul.mpb-list li,.mpb ol.mpb-order li{border:1px solid var(--border,#999);border-radius:10px;padding:.5rem .75rem}
.mpb .mpb-row{display:flex;flex-wrap:wrap;gap:.4rem;align-items:center}
.mpb .muted{font-size:.9rem;color:var(--muted,#555)}
.mpb-book{border:2px solid #b8962e;border-radius:12px;padding:1rem}
.mpb-book h2{text-align:center;margin-block:0 .25rem}
.mpb-book section{margin-block:1rem;break-inside:avoid}
.mpb-book h3{margin-block:.25rem;font-size:1.1rem}
.mpb-book .mpb-he{font-family:var(--font-he,serif);font-size:1.8rem;line-height:1.8;unicode-bidi:isolate;margin:0}
.mpb-book .mpb-tr{font-style:italic;margin:0}
.mpb-book .mpb-en{margin:0 0 .5rem}
.mpb-book .mpb-marks{font-size:.85rem;border-block-start:1px solid #999;padding-block-start:.25rem}
@media print{
  body *{visibility:hidden}
  .mpb-book,.mpb-book *{visibility:visible}
  .mpb-book{position:absolute;inset-inline-start:0;inset-block-start:0;inline-size:100%;max-inline-size:none;border:0;color:#000;background:#fff}
  .mpb-noprint{display:none!important}
}`;
const storeGet = async (store, key, fallback) => { try { const v = store?.get ? await store.get(key) : undefined; return v == null ? fallback : v; } catch { return fallback; } };

export async function mount(root, ctx) {
  let alive = true;
  const store = ctx?.store;
  const style = h('style', {}); style.textContent = CSS;
  const main = h('div', { class: 'mpb' });
  const status = h('p', { role: 'status', 'aria-live': 'polite', class: 'muted mpb-noprint' }, 'Loading the prayers…');
  root.replaceChildren(style, h('h1', { id: 'view-title', tabindex: '-1', class: 'mpb-noprint' }, 'My Prayer Book'), main);
  main.replaceChildren(status);
  let S;
  try { S = ctx?.serviceData || await loadServiceData({ loadCorpus }); } catch {
    if (alive) main.replaceChildren(h('p', { role: 'alert' }, 'The prayers did not load. Check the connection and open this page again.'));
    return () => { alive = false; };
  }
  if (!alive) return () => {};
  const tradition = congregationOf(ctx?.settings);
  const cat = catalogue(S.orders, S.byId);
  const rec = normalizePractice(await storeGet(store, SERVICE_KEYS.practice, null));
  const companion = await storeGet(store, SERVICE_KEYS.companion, {});
  const cards = (() => { try { return readSnapshot(store).cards; } catch { return {}; } })();
  const followed = practisedIds(cards, companion);
  let book = normaliseBook(await storeGet(store, MYBOOK_KEY, null));
  let all = false;
  if (!alive) return () => {};
  const say = (t) => { status.textContent = t; };
  const save = (next, msg) => { book = next; try { store?.set?.(MYBOOK_KEY, book); say(msg); } catch { say('This change could not be saved on this device.'); } paint(); };
  const titleOf = (id) => cat.find((c) => c.id === id)?.title || id;

  function picker() {
    const list = choices(cat, book, rec, followed, all);
    return h('section', { class: 'mpb-noprint', 'aria-labelledby': 'mpb-h-pick' },
      h('h2', { id: 'mpb-h-pick' }, '1. Pick Your Prayers'),
      h('p', {}, all ? `All ${cat.length} prayers Aleph holds for its services.` : 'The prayers you have marked at least one step for in Prayer Practice or the Shabbat Companion.'),
      !all && !list.length ? h('p', { id: 'mpb-empty' }, 'Nothing is marked yet. Practise a prayer in ', h('a', { href: '#/prayer-practice' }, 'Prayer Practice'), ' and it will appear here, or show every prayer and pick from those.') : null,
      h('p', {}, h('button', { type: 'button', class: 'btn secondary', id: 'mpb-all', 'aria-pressed': all, onclick: () => { all = !all; paint(); say(all ? 'Showing every prayer.' : 'Showing the prayers you have marked.'); } }, 'Show Every Prayer')),
      h('ul', { class: 'mpb-list' }, ...list.map((c) => h('li', { 'data-id': c.id },
        h('div', { class: 'mpb-row' }, h('strong', {}, c.title),
          h('button', { type: 'button', class: c.picked ? 'btn secondary' : 'btn', 'data-pick': c.id, 'aria-pressed': c.picked, 'aria-label': c.picked ? `Take ${c.title} out of my book` : `Add ${c.title} to my book`,
            onclick: () => save(c.picked ? remove(book, c.id) : add(book, c.id), c.picked ? `${c.title} taken out.` : `${c.title} added.`) }, c.picked ? 'In My Book' : 'Add')),
        h('div', { class: 'muted' }, c.services.map((s) => SERVICE_NAMES[s] || s).join(', '), ` · ${c.progress.done} of ${c.progress.of} steps marked`)))),
      h('p', { class: 'muted' }, MARKS_NOTE));
  }

  function order() {
    const gone = missingIds(book, cat);
    return h('section', { class: 'mpb-noprint', 'aria-labelledby': 'mpb-h-order' },
      h('h2', { id: 'mpb-h-order' }, '2. Put Them in Order'),
      book.ids.length ? null : h('p', {}, 'Your book is empty. Add a prayer above.'),
      h('ol', { class: 'mpb-order' }, ...book.ids.filter((id) => !gone.includes(id)).map((id, i, arr) => h('li', { 'data-id': id }, h('div', { class: 'mpb-row' },
        h('span', {}, `${i + 1}. `, h('strong', {}, titleOf(id))),
        h('button', { type: 'button', class: 'btn secondary', 'data-up': id, disabled: i === 0 || undefined, 'aria-label': `Move ${titleOf(id)} earlier`, onclick: () => save(move(book, id, -1), `${titleOf(id)} moved earlier.`) }, 'Earlier'),
        h('button', { type: 'button', class: 'btn secondary', 'data-down': id, disabled: i === arr.length - 1 || undefined, 'aria-label': `Move ${titleOf(id)} later`, onclick: () => save(move(book, id, 1), `${titleOf(id)} moved later.`) }, 'Later'),
        h('button', { type: 'button', class: 'btn secondary', 'data-remove': id, 'aria-label': `Take ${titleOf(id)} out of my book`, onclick: () => save(remove(book, id), `${titleOf(id)} taken out.`) }, 'Take Out'))))));
  }

  function options() {
    const titleIn = h('input', { type: 'text', id: 'mpb-title', maxlength: String(MAX_TITLE), value: book.title });
    const check = (key, label) => h('label', { class: 'mpb-row' }, h('input', { type: 'checkbox', 'data-opt': key, checked: book[key] || undefined, onchange: (e) => save(setOption(book, key, !!e.target.checked), 'Saved.') }), ` ${label}`);
    return h('section', { class: 'mpb-noprint', 'aria-labelledby': 'mpb-h-print' },
      h('h2', { id: 'mpb-h-print' }, '3. Print It'),
      h('label', { for: 'mpb-title' }, 'Name on the cover'), titleIn,
      h('p', {}, h('button', { type: 'button', class: 'btn secondary', id: 'mpb-save-title', onclick: () => save(setTitle(book, String(titleIn.value ?? titleIn.getAttribute('value') ?? '')), 'Name saved.') }, 'Save the Name')),
      check('showTranslit', 'Show how to say each line'), check('showEnglish', 'Show the English'), check('showMarks', 'Show my progress marks'),
      h('p', {}, h('button', { type: 'button', class: 'btn', id: 'mpb-print', disabled: book.ids.length ? undefined : true,
        onclick: () => { try { if (typeof globalThis.print === 'function') globalThis.print(); else say('This browser has no print dialog.'); } catch { say('The print dialog did not open.'); } } }, 'Print My Prayer Book')),
      h('p', { class: 'muted' }, 'In the print dialog you can also choose Save as PDF. The book below is what will print.'));
  }

  function bookNode() {
    const ps = pages(book, cat, S.byId, rec, followed, tradition);
    return h('article', { class: 'mpb-book', 'aria-label': book.title },
      h('h2', {}, book.title),
      h('p', { class: 'muted', style: 'text-align:center' }, `${ps.length} ${ps.length === 1 ? 'prayer' : 'prayers'}`),
      ...ps.map((p) => h('section', { 'data-page': p.id },
        h('h3', {}, `${p.n}. ${p.title}`),
        ...p.lines.flatMap((l) => [
          h('p', { class: 'mpb-he' }, heSpan(l.he)),
          book.showTranslit && l.translit ? h('p', { class: 'mpb-tr' }, l.translit) : null,
          book.showEnglish && l.english ? h('p', { class: 'mpb-en' }, uiEnglish(ctx, l.english)) : null]),
        book.showEnglish && p.englishWhole ? h('p', { class: 'mpb-en' }, uiEnglish(ctx, p.englishWhole)) : null,
        book.showMarks ? h('p', { class: 'mpb-marks' }, marksText(p.progress)) : null)),
      book.showMarks && ps.length ? h('p', { class: 'muted' }, MARKS_NOTE) : null,
      h('p', { class: 'muted' }, SOURCE_NOTE));
  }

  function paint() {
    if (!alive) return;
    main.replaceChildren(
      h('p', { class: 'mpb-noprint' }, 'Build a small prayer book of your own from the prayers you have learned. It is saved on this device.'),
      picker(), order(), options(), status, bookNode());
  }
  say('');
  paint();
  return () => { alive = false; };
}
