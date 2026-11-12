/**
 * #/app-rules (I8, H8, I6, I7): hearts, streak, minutes and the pass mark, each stated once. Every line is built from the constants the
 * code enforces (src/coursemap/rules.js), so this page and the code cannot disagree. ?section=hearts|streak|minutes|pass scrolls there.
 */
import { el } from '../curriculum/dom.js';
import { allRules } from './rules.js';

/** @param {HTMLElement} root @param {any} ctx */
export function mount(root, ctx) {
  const wrap = el('section', { class: 'alef-rules', 'aria-labelledby': 'view-title' });
  const h1 = el('h1', { id: 'view-title', tabindex: '-1' }, 'How Hearts, Streaks, Minutes and Passing Work');
  const sections = allRules();
  const nav = el('p', { class: 'row' }, ...sections.map((s) => el('a', { class: 'btn secondary', href: `#/app-rules?section=${s.id}` }, s.title)));
  wrap.append(h1, el('p', { class: 'muted' }, 'Each rule is written here once. The Shop, the Daily page and every lesson follow these same rules.'), nav,
    ...sections.map((s) => el('section', { class: 'card', id: `rules-${s.id}`, 'data-rules': s.id, 'aria-labelledby': `rules-h-${s.id}` },
      el('h2', { id: `rules-h-${s.id}`, tabindex: '-1' }, s.title),
      el('ul', {}, ...s.lines.map((t) => el('li', {}, t))),
      s.table ? el('table', { class: 'alef-rules-table' },
        el('caption', {}, 'Pass mark by number of questions'),
        el('thead', {}, el('tr', {}, el('th', { scope: 'col' }, 'Questions'), el('th', { scope: 'col' }, 'Right on the first try'), el('th', { scope: 'col' }, 'Share'))),
        el('tbody', {}, ...s.table.map((r) => el('tr', {}, el('td', {}, String(r.n)), el('td', {}, `${r.need} of ${r.n}`), el('td', {}, `${r.pct}%`))))) : null)));
  root.append(wrap);
  const want = ctx?.query?.section;
  if (want) { const h = sections.some((s) => s.id === want) ? globalThis.document?.getElementById?.(`rules-h-${want}`) : null; try { h?.focus?.(); h?.scrollIntoView?.({ block: 'start' }); } catch { /* optional */ } }
  return () => wrap.remove();
}
