/** #/benchmarks (C10): the rank goals of the reading path with proven / unproven state, computed on this device. See benchmarks.js. */
import { el, storeGet } from '../curriculum/dom.js';
import { loadJSON } from '../curriculum/data.js';
import { loadState } from '../curriculum/state.js';
import { CHECKS_KEY } from '../curriculum/passmark.js';
import { benchmarkMap, summary, SOURCE_NOTE, STATE_TEXT } from './benchmarks.js';
import { lessonLink } from './map.js';

/** @param {HTMLElement} root @param {any} ctx */
export function mount(root, ctx) {
  let alive = true;
  const wrap = el('section', { class: 'alef-benchmarks', 'aria-labelledby': 'view-title' });
  const h1 = el('h1', { id: 'view-title', tabindex: '-1' }, 'Benchmark Map');
  const body = el('div', {}, el('p', {}, 'Loading...'));
  wrap.append(h1, el('p', { class: 'draft-flag', role: 'note' }, SOURCE_NOTE), body); root.append(wrap);
  (async () => {
    try {
      const [belts, idx, st, checks] = await Promise.all([loadJSON('data/curriculum/belts.json'), loadJSON('data/curriculum/lessons-index.json'), loadState(ctx), storeGet(ctx, CHECKS_KEY, {})]);
      if (!alive) return;
      const map = benchmarkMap(belts, idx.lessons, st.completed, checks);
      body.replaceChildren(el('p', { role: 'status' }, summary(map)),
        el('ol', { class: 'alef-bench-list' }, ...map.map((b) => el('li', { 'data-bench': b.id, 'data-state': b.state, class: 'card' },
          el('h2', {}, b.label), el('p', {}, b.gate),
          el('p', {}, el('strong', {}, STATE_TEXT[b.state]), `. Lessons ${b.lessons[0]} to ${b.lessons.at(-1)}: ${b.done} of ${b.lessons.length} done, ${b.proven} with a passed check on record.`),
          b.state === 'proven' ? null : el('a', { class: 'btn secondary', href: lessonLink(b.lessons.find((id) => !checks?.[id]?.pass) || b.lessons[0]) }, 'Next lesson for this goal')))));
    } catch { if (alive) body.replaceChildren(el('p', { role: 'alert' }, 'The benchmark map could not be loaded. Reload; nothing was lost.')); }
  })();
  return () => { alive = false; wrap.remove(); };
}
