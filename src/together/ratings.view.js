// @ts-check
// My Ratings (#/ratings): the learner's own stars for lessons, games and books, and "more like the ones you rated 5" (R8).
// Kept in this profile on this device. Never sent anywhere, never shown to anyone else.
import { h } from '../shell/ui.js';
import { frame, statusLine } from './ui.js';
import { ARCADE_GAMES } from '../games/arcade.catalog.js';
import { RATINGS_KEY, rate, ratingOf, moreLikeGames, nextAfterFives } from './ratings.js';
import { lessonList, bookList } from './data.js';

export const COPY = Object.freeze({
  lead: 'Give stars to the lessons, games and books you have tried. The stars are for you: they stay in this profile on this device and are never sent or shown to anyone. Aleph uses them to suggest more like the ones you gave 5.',
  empty: 'Nothing to rate yet. Finish a lesson, play a game or read a book, and it appears here.',
  noFives: 'Give something 5 stars and suggestions appear here.',
});

/** @param {HTMLElement} root @param {any} ctx */
export function mount(root, ctx = {}) {
  let alive = true;
  const store = ctx.store; const now = () => ctx.now ?? Date.now();
  const status = statusLine('rt-status');
  const lists = h('div', { id: 'rt-lists', class: 'stack' }, h('p', { class: 'muted' }, 'Loading…'));
  const more = h('div', { id: 'rt-more' });
  const get = (k) => { try { return store?.get?.(k) ?? null; } catch { return null; } };
  frame(root, 'My Ratings', h('p', {}, COPY.lead), status, h('section', { 'aria-labelledby': 'rt-more-h' }, h('h2', { id: 'rt-more-h' }, 'More Like Your 5-Star Picks'), more), lists);

  function starRow(kind, id, title, repaint) {
    const cur = ratingOf(get(RATINGS_KEY), kind, id);
    return h('li', { 'data-rate': `${kind}:${id}` }, h('span', {}, `${title} `),
      ...[1, 2, 3, 4, 5].map((n) => h('button', { type: 'button', class: 'btn secondary rt-star', 'aria-label': `${title}: ${n} ${n === 1 ? 'star' : 'stars'}`, 'aria-pressed': String(n <= cur), onclick: () => {
        try { store?.set?.(RATINGS_KEY, rate(get(RATINGS_KEY), kind, id, cur === n ? 0 : n, now())); } catch { /* storage blocked */ }
        status.textContent = cur === n ? `Rating cleared for ${title}.` : `Saved ✓ ${title}: ${n} ${n === 1 ? 'star' : 'stars'}.`;
        repaint();
      } }, n <= cur ? '★' : '☆')));
  }
  Promise.all([ctx.lessons ? ctx.lessons : lessonList(ctx.readinessFetch).catch(() => []), ctx.books ? ctx.books : bookList(ctx.readinessFetch).catch(() => [])]).then(([lessons, books]) => {
    if (!alive) return;
    const paint = () => {
      const state = get(RATINGS_KEY);
      const done = Object.keys(get('curriculum.progress')?.completed || {}), played = Object.keys(get('games.scores.v1') || {}), read = Object.keys(get('books.v1') || {});
      const has = (kind, id) => ratingOf(state, kind, id) > 0;
      const groups = [
        ['lesson', 'Lessons', lessons.filter((l) => done.includes(l.id) || has('lesson', l.id)).map((l) => [l.id, `${l.id}: ${l.title}`])],
        ['game', 'Games', ARCADE_GAMES.filter((g) => played.includes(g.id) || has('game', g.id)).map((g) => [g.id, g.title])],
        ['book', 'Books', books.filter((b) => read.includes(b.id) || has('book', b.id)).map((b) => [b.id, b.title])],
      ].filter(([, , rows]) => rows.length);
      lists.replaceChildren(...(groups.length ? groups.map(([kind, label, rows]) => h('section', { 'aria-labelledby': `rt-h-${kind}` }, h('h2', { id: `rt-h-${kind}` }, label),
        h('ul', { class: 'rt-list' }, ...rows.map(([id, title]) => starRow(kind, id, title, paint))))) : [h('p', { id: 'rt-empty' }, COPY.empty)]));
      const games = moreLikeGames(state, ARCADE_GAMES, played);
      const nextBooks = nextAfterFives(state, 'book', books.map((b) => b.id)).map((id) => books.find((b) => b.id === id));
      const nextLessons = nextAfterFives(state, 'lesson', lessons.map((l) => l.id)).map((id) => lessons.find((l) => l.id === id));
      const items = [...games.map((g) => h('li', {}, h('a', { href: `#/${g.id}` }, g.title), `. ${g.why}.`)),
        ...nextBooks.map((b) => h('li', {}, h('a', { href: `#/book/${b.id}` }, b.title), '. The next book after one you gave 5 stars.')),
        ...nextLessons.map((l) => h('li', {}, h('a', { href: `#/learn?lesson=${l.id}` }, `${l.id}: ${l.title}`), '. The next lesson after one you gave 5 stars.'))];
      more.replaceChildren(items.length ? h('ul', { id: 'rt-suggest' }, ...items) : h('p', { class: 'muted', id: 'rt-none' }, COPY.noFives));
    };
    paint();
  });
  return () => { alive = false; };
}
