// @ts-check
// Reading Challenges (#/reading-challenge, E9): pick a goal of little books for this month or this week; the tracker counts the
// books finished in that period (read to the end with the story question answered). Everything stays on this device.
import { h, heSpan } from '../shell/ui.js';
import { CHALLENGE_KEY, GOAL_SIZES, PERIODS, setGoal, challengeProgress } from './challenge.js';

const fetchJson = async (ctx, url) => { const r = await (ctx?.fetchFn ?? fetch)(url); return r && r.ok !== false ? r.json() : null; };

export async function mount(root, ctx) {
  const now = () => (ctx?.now ? ctx.now().getTime() : Date.now());
  const wrap = h('article', { class: 'card book-challenge' }, h('h1', { id: 'view-title', tabindex: '-1' }, 'Reading Challenges'));
  const body = h('div', {}, h('p', { class: 'muted', role: 'status' }, 'Loading the bookshelf…'));
  const status = h('p', { class: 'muted', role: 'status', 'aria-live': 'polite' }, '');
  wrap.append(h('p', {}, 'Choose how many little books to read, this month or this week. A book counts when you read it to the last page and answer its one story question.'), body, status,
    h('p', {}, h('a', { href: '#/books' }, '← Little books')));
  root.replaceChildren(wrap);
  const shelf = await fetchJson(ctx, 'data/books/index.json').catch(() => null);
  const books = Array.isArray(shelf?.books) ? shelf.books : [];
  if (!books.length) { body.replaceChildren(h('p', {}, 'The bookshelf could not be loaded just now.')); return () => {}; }
  let rec = {}, places = {};
  try { rec = (await ctx?.store?.get?.(CHALLENGE_KEY)) || {}; } catch { rec = {}; }
  try { places = (await ctx?.store?.get?.('books.v1')) || {}; } catch { places = {}; }
  let n = rec?.goal?.n || 3, period = rec?.goal?.period || 'month';
  function paint() {
    const p = challengeProgress(rec, books, places, now());
    const title = (id) => books.find((b) => b.id === id);
    body.replaceChildren(
      p ? h('section', { class: 'card', 'aria-labelledby': 'rc-now' },
        h('h2', { id: 'rc-now' }, `Your Challenge: ${p.n} ${p.n === 1 ? 'Book' : 'Books'} ${p.period === 'week' ? 'This Week' : 'This Month'}`),
        h('p', {}, p.text),
        h('p', {}, h('span', { role: 'progressbar', 'aria-label': 'Books toward the challenge', 'aria-valuemin': '0', 'aria-valuemax': String(p.n), 'aria-valuenow': String(Math.min(p.done, p.n)), class: 'wf-track' },
          h('span', { class: 'wf-track-fill', style: `width:${Math.min(100, Math.round((100 * p.done) / p.n))}%` }))),
        p.finished.length ? h('ul', {}, ...p.finished.map((id) => { const b = title(id); return h('li', {}, ...(b ? [heSpan(b.titleHe), ` ${b.titleEn}`] : [id])); })) : h('p', { class: 'muted' }, 'No book finished in this period yet.'),
        p.met ? null : h('p', {}, h('a', { class: 'btn', href: '#/books' }, 'Pick a book'))) : h('p', {}, 'No challenge yet. Choose one below.'),
      h('section', { class: 'card', 'aria-labelledby': 'rc-set' },
        h('h2', { id: 'rc-set' }, p ? 'Change the Challenge' : 'Set a Challenge'),
        h('div', { class: 'row', role: 'group', 'aria-label': 'How many books' }, ...GOAL_SIZES.map((x) => h('button', { type: 'button', class: 'btn secondary', 'aria-pressed': n === x, onclick: () => { n = x; paint(); } }, `${x} ${x === 1 ? 'book' : 'books'}`))),
        h('div', { class: 'row', role: 'group', 'aria-label': 'When' }, ...Object.entries(PERIODS).map(([k, label]) => h('button', { type: 'button', class: 'btn secondary', 'aria-pressed': period === k, onclick: () => { period = k; paint(); } }, label))),
        h('button', { type: 'button', class: 'btn', onclick: async () => {
          rec = setGoal(rec, n, period, now());
          try { await ctx?.store?.set?.(CHALLENGE_KEY, rec); status.textContent = `Challenge set: ${n} ${n === 1 ? 'book' : 'books'} ${PERIODS[period]}.`; }
          catch { status.textContent = 'The challenge could not be saved on this device.'; }
          paint();
        } }, 'Save this challenge')));
  }
  paint();
  return () => {};
}
