// @ts-check
// Book completion card (#/book-card/<id>, E8). Shown only for a book this device has recorded as finished (books.v1 finishedAt).
// It says how the finish was checked: the one story question answered (checkedAt), a book too short for a question, or a finish
// recorded before the story question existed. Print it, copy its text, or save it as a picture; nothing is sent anywhere.
import { h, heSpan } from '../shell/ui.js';
import { resolveBookId, shelfNumber } from './order.js';
import { storyCheck } from './check.js';
import { shareBlock } from '../games/sharecard.js';

const fetchJson = async (ctx, url) => { const r = await (ctx?.fetchFn ?? fetch)(url); return r && r.ok !== false ? r.json() : null; };
const dayOf = (t) => { const d = new Date(Number(t)); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };

/** How the finish was checked, in one plain line. Pure. */
export function checkedLine(entry, hasQuestion) {
  if (entry?.checkedAt) return 'Read to the last page, with the story question answered.';
  if (!hasQuestion) return 'Read to the last page (this book is too short for a story question).';
  return 'Read to the last page before the story question was added.';
}

export async function mount(root, ctx) {
  const asked = String(ctx?.query?.id ?? ctx?.params?.id ?? '');
  const shelf = await fetchJson(ctx, 'data/books/index.json').catch(() => null);
  const books = Array.isArray(shelf?.books) ? shelf.books : [];
  const id = resolveBookId(asked, books) || asked;
  const meta = books.find((b) => b.id === id);
  const wrap = h('article', { class: 'card book-completion' });
  root.replaceChildren(wrap);
  if (!meta) { wrap.append(h('h1', { id: 'view-title', tabindex: '-1' }, 'Book Not Found'), h('p', {}, h('a', { href: '#/books' }, '← Little books'))); return () => {}; }
  let entry = null;
  try { entry = ((await ctx?.store?.get?.('books.v1')) || {})[id] || null; } catch { entry = null; }
  if (!entry?.finishedAt) {
    wrap.append(h('h1', { id: 'view-title', tabindex: '-1' }, 'Not Finished Yet'),
      h('p', {}, `This device has not recorded ${meta.titleEn} as finished. Read it to the last page and answer its story question, and its card appears here.`),
      h('p', {}, h('a', { class: 'btn', href: `#/book/${id}` }, `Read ${meta.titleEn}`)));
    return () => {};
  }
  const book = await fetchJson(ctx, `data/books/${id}.json`).catch(() => null);
  const line = checkedLine(entry, !!(book && storyCheck(book)));
  const day = dayOf(entry.finishedAt), num = shelfNumber(id, books);
  wrap.append(
    h('h1', { id: 'view-title', tabindex: '-1' }, 'Book Completion Card'),
    h('section', { class: 'book-card-print', 'aria-label': 'Completion card' },
      h('p', { class: 'muted' }, 'Aleph · Little Books'),
      h('h2', {}, meta.titleEn), h('p', {}, heSpan(meta.titleHe, 'he book-title-he'), ` ${meta.titleTranslit}`),
      h('p', {}, `Book ${num} · ${meta.level} · ${meta.pageCount} pages`),
      h('p', {}, h('strong', {}, `Finished on ${day}.`)), h('p', {}, line)),
    h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn', onclick: () => { try { globalThis.print?.(); } catch { /* no print here */ } } }, 'Print the card')),
    shareBlock(h, { title: 'Aleph Little Books', lines: [meta.titleEn, `Book ${num} · ${meta.level}`, `Finished on ${day}`], text: `I finished "${meta.titleEn}" (${meta.titleTranslit}), book ${num} of Aleph's little Hebrew books, on ${day}. ${line}`, file: `aleph-book-${num}.png` }),
    h('p', {}, h('a', { href: `#/book/${id}` }, '← Back to the book'), ' · ', h('a', { href: '#/books' }, 'All books')));
  return () => {};
}
