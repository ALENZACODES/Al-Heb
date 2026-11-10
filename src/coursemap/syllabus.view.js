/**
 * Syllabus and can-do goals (#/syllabus), PREVIEW and DRAFT. Every lesson with its authors' goals, grouped by track and level.
 * Generated at run time from data/curriculum/lessons.json (the same data as docs/curriculum/SYLLABUS.md); nothing is written by hand here.
 * Goals are the authors' draft goals, shown word for word; they are not reviewed and are not a promise that you will reach a level.
 * ctx extras for tests: ctx.lessonsData = [lesson, ...].
 */
import { el } from '../curriculum/dom.js';
import { loadJSON } from '../curriculum/data.js';
import { mixed } from '../hebrewtext/mixed.js';
import { syllabus } from './model.js';

export const NOTE = 'Draft and unreviewed: the goals below are the course authors\' own wording from the lesson data, and no Hebrew teacher has checked them. Minutes are estimates that were never measured on a learner.';

/** @param {HTMLElement} root @param {any} ctx @returns {() => void} unmount */
export function mount(root, ctx) {
  const wrap = el('section', { class: 'alef-syllabus', 'aria-labelledby': 'sy-title' });
  const h1 = el('h1', { id: 'sy-title', tabindex: '-1' }, 'Syllabus and goals');
  const body = el('div', { class: 'sy-body' });
  const status = el('p', { role: 'status', 'aria-live': 'polite', class: 'sy-status' });
  wrap.append(h1, el('p', { class: 'sy-draft' }, NOTE), body, status);
  root.append(wrap);
  let alive = true;
  (async () => {
    try {
      const lessons = ctx?.lessonsData || (await loadJSON('data/curriculum/lessons.json')).lessons;
      if (!alive) return;
      const tracks = syllabus(lessons); let n = 0;
      body.replaceChildren(...tracks.map((t, ti) => el('section', { 'aria-labelledby': `sy-t${ti}` }, el('h2', { id: `sy-t${ti}` }, t.label),
        ...t.levels.map((lv, li) => el('section', { 'aria-labelledby': `sy-t${ti}l${li}` },
          el('h3', { id: `sy-t${ti}l${li}` }, `${lv.label}: ${lv.lessons.length} lesson${lv.lessons.length === 1 ? '' : 's'}, about ${lv.minutes} minutes`),
          el('ul', {}, ...lv.lessons.map((l) => { n++; return el('li', {}, el('strong', {}, l.id), ' ', ...mixed(l.title), ` (about ${l.minutes} min)`,
            l.goals.length ? el('ul', { 'aria-label': `Goals of ${l.id}` }, ...l.goals.map((g) => el('li', {}, ...mixed(g)))) : null); })))))));
      status.textContent = `${n} lessons listed.`;
    } catch { if (alive) body.replaceChildren(el('p', { role: 'alert' }, 'The lesson list could not be loaded. Reload; nothing was lost.')); }
  })();
  return () => { alive = false; wrap.children = []; if (typeof wrap.remove === 'function') wrap.remove(); else root.replaceChildren?.(); };
}
