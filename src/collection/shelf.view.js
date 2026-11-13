// S10 Reading Shelf (#/shelf): every text in progress in one place, each with "Continue reading". Little books carry the page
// the book reader last recorded; other texts carry the place they were last opened at. Kept on this device only.
import { h } from '../shell/ui.js';
import { read } from './model.js';
import { VISITS_KEY, readingShelf } from './diary.js';
import { tryJSON, ago, LINKS } from './shared.js';

export async function mount(root, ctx, env = {}) {
  const now = (env.now || (() => Date.now()))();
  const index = await tryJSON('../../data/books/index.json', env.loadJSON);
  const books = (index?.books || []).map((b) => ({ id: b.id, title: b.titleEn || b.titleTranslit || b.id, pages: b.pageCount }));
  const shelf = readingShelf(await read(ctx?.store, VISITS_KEY), await read(ctx?.store, 'books.v1', {}), books);
  const row = (r, verb) => h('li', {}, h('a', { class: 'btn', href: r.href, 'aria-label': `${verb}: ${r.title}` }, verb), ' ', h('strong', {}, r.title), h('span', { class: 'muted' }, ` ${[r.group, r.place, ago(r.at, now)].filter(Boolean).join(', ')}`));
  root.append(h('section', { class: 'card', 'aria-labelledby': 'view-title' }, h('h1', { id: 'view-title', tabindex: '-1' }, 'Reading Shelf'),
    h('p', {}, 'Everything you are reading, gathered from the little books, the Torah readers, the services and the library. Newest first.'),
    h('h2', {}, 'In Progress'),
    shelf.inProgress.length ? h('ul', { 'data-role': 'in-progress' }, ...shelf.inProgress.map((r) => row(r, 'Continue reading')))
      : h('p', {}, 'Nothing in progress yet. Open a ', h('a', { href: '#/books' }, 'little book'), ', the ', h('a', { href: '#/torahreader' }, 'Torah reader'), ' or a ', h('a', { href: '#/service' }, 'service'), ' and it will be waiting here.'),
    shelf.finished.length ? h('h2', {}, 'Finished') : null,
    shelf.finished.length ? h('ul', { 'data-role': 'finished' }, ...shelf.finished.map((r) => row(r, 'Read again'))) : null,
    h('p', { class: 'muted' }, 'A little book remembers its page. Other texts open where their own page keeps your place.'),
    h('p', { class: 'muted' }, ...LINKS.filter(([href]) => href !== '#/shelf').flatMap(([href, label], i) => [i ? ' · ' : '', h('a', { href }, label)]))));
  return () => {};
}
