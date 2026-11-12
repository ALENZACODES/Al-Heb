// H5 Mastery Map (#/mastery): every review card on this device in one of four states (src/platform/srs-tools.js masteryOf), by section,
// filterable. Counts and chips come from the stored cards only.
import { h } from '../shell/ui.js';
import { DECKS, cardsOf } from './sched-state.js';
import { masteryOf, cardLabel, STATES, KNOWN_DAYS, MASTERED_DAYS, isLeech, missesOf } from './srs-tools.js';

const SHOW = 60; // chips shown per state before "Show all"

export function mount(root, ctx) {
  const decks = DECKS.map(([key, label]) => { let v = {}; try { v = ctx?.store?.get?.(key, {}); } catch { /* none */ } return { key, label, cards: cardsOf(v) }; });
  const status = h('p', { role: 'status', class: 'muted' });
  const body = h('div', {});
  let deck = 'all', state = 'all';
  const pick = (label, cur, opts, set) => h('div', { role: 'group', 'aria-label': label, class: 'row' }, ...opts.map(([v, text]) =>
    h('button', { type: 'button', class: 'btn secondary', 'aria-pressed': String(cur === v), onclick: () => { set(v); render(); status.textContent = `${label}: ${text}.`; } }, text)));
  function render() {
    const cards = decks.filter((d) => deck === 'all' || d.key === deck).flatMap((d) => d.cards);
    const by = Object.fromEntries(STATES.map(([s]) => [s, []]));
    for (const c of cards) by[masteryOf(c)].push(c);
    const kids = [
      pick('Section', deck, [['all', 'All sections'], ...decks.filter((d) => d.cards.length).map((d) => [d.key, d.label])], (v) => { deck = v; }),
      pick('State', state, [['all', 'All states'], ...STATES], (v) => { state = v; }),
      h('p', {}, cards.length ? STATES.map(([s, l]) => `${l}: ${by[s].length}`).join('. ') + `. Total: ${cards.length}.` : 'No review cards on this device yet. They appear after your first lesson or dictionary review.'),
    ];
    for (const [s, l] of STATES) {
      if (state !== 'all' && state !== s) continue;
      const list = by[s].sort((a, b) => String(a.id).localeCompare(String(b.id)));
      if (!list.length) continue;
      const ul = h('ul', { class: 'alef-mastery-chips', 'data-state': s });
      const fill = (n) => ul.replaceChildren(...list.slice(0, n).map((c) => { const { kind, label } = cardLabel(c); return h('li', {}, `${label} (${kind})`, isLeech(c) ? h('span', { class: 'menu-tag' }, ` missed ${missesOf(c)} times`) : null); }));
      fill(SHOW);
      const more = list.length > SHOW ? h('button', { type: 'button', class: 'btn secondary', onclick: () => { fill(list.length); more.remove(); status.textContent = `All ${list.length} ${l.toLowerCase()} cards shown.`; } }, `Show all ${list.length}`) : null;
      kids.push(h('section', { 'aria-label': l }, h('h2', {}, `${l} (${list.length})`), ul, more));
    }
    body.replaceChildren(...kids);
  }
  root.append(h('section', { class: 'card', 'aria-labelledby': 'view-title' },
    h('h1', { id: 'view-title', tabindex: '-1' }, 'Mastery Map'),
    h('p', {}, `Every review card on this device. New: never answered. Learning: missed the last time, or it lasts under ${KNOWN_DAYS} days. Known: the scheduler expects you to remember it for ${KNOWN_DAYS} to ${MASTERED_DAYS - 1} days. Mastered: ${MASTERED_DAYS} days or more. These are Aleph's own thresholds on the scheduler's numbers, not a test result.`),
    status, body, h('p', {}, h('a', { class: 'btn secondary', href: '#/cram' }, 'Cram the weak ones'), ' ', h('a', { class: 'btn secondary', href: '#/scheduler' }, 'How reviews are spaced'))));
  render();
  return () => {};
}
