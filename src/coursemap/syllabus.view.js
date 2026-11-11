/**
 * Syllabus and can-do goals (#/syllabus), PREVIEW and DRAFT. Every lesson with its authors' goals, grouped by track, in course order:
 * the Reading track by Krav Maga style rank (White belt · P0 .. Black belt · E5), the Israel track by stage.
 * Generated at run time from data/curriculum/lessons.json and belts.json (the same data as docs/curriculum/SYLLABUS.md).
 * Goals are the authors' draft goals, shown word for word; they are not reviewed and are not a promise that you will reach a level.
 * ctx extras for tests: ctx.lessonsData = [lesson, ...], ctx.beltsData = belts.json object.
 */
import { el } from '../curriculum/dom.js';
import { loadJSON } from '../curriculum/data.js';
import { mixed } from '../hebrewtext/mixed.js';
import { syllabus, intermediateSplit } from './model.js';
import { resolveRanks, rankBadge } from '../curriculum/ranks.js';
import { LESSONS, SCOPE } from '../lib/counts.js';

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
      const belts = ctx?.beltsData || (await loadJSON('data/curriculum/belts.json').catch(() => null));
      if (!alive) return;
      const tracks = syllabus(lessons, belts), sp = intermediateSplit(lessons); let n = 0;
      const rankById = new Map((belts ? resolveRanks(belts, lessons) : []).map((r) => [r.id, r]));
      const intro = el('p', { class: 'sy-split' }, `Lessons are listed in course order. The Reading track uses Krav Maga style belts: White, Yellow, Orange, Green, Blue, Brown and Black, with rank patches P (Practitioner), G (Graduate) and E (Expert). Each rank is the next run of lessons, and you earn it only by finishing them. The ${sp.total} I- (Intermediate) lessons are split: ${sp.read} on the Reading track (Black belt, E ranks) and ${sp.israel} on the Israel track (Stage 3).`);
      body.replaceChildren(intro, ...tracks.map((t, ti) => el('section', { 'aria-labelledby': `sy-t${ti}` }, el('h2', { id: `sy-t${ti}` }, t.label), el('p', { class: 'sy-track-note' }, t.note),
        ...t.levels.map((lv, li) => el('section', { 'aria-labelledby': `sy-t${ti}l${li}`, 'data-rank': lv.rank || null },
          el('h3', { id: `sy-t${ti}l${li}` }, lv.rank && rankById.get(lv.rank) ? rankBadge(el, rankById.get(lv.rank)) : lv.label,
            `: ${lv.lessons.length} lesson${lv.lessons.length === 1 ? '' : 's'}${lv.range ? ` (${lv.range}${lv.intermediate ? ', Intermediate reading' : ''})` : lv.intermediateCount ? ` (includes ${lv.intermediateCount} I- lessons)` : ''}, about ${lv.minutes} minutes`),
          lv.gate ? el('p', { class: 'sy-gate' }, 'Goal of the rank: ', ...mixed(lv.gate)) : null,
          el('ul', {}, ...lv.lessons.map((l) => { n++; return el('li', {}, el('strong', {}, l.id), ' ', ...mixed(l.title), ` (about ${l.minutes} min)`,
            l.goals.length ? el('ul', { 'aria-label': `Goals of ${l.id}` }, ...l.goals.map((g) => el('li', {}, ...mixed(g)))) : null); })))))));
      status.textContent = `${n} lessons listed: the whole course (${LESSONS.reading} ${SCOPE.reading}, ${LESSONS.israel} ${SCOPE.israel}). The ten-week study plan uses ${LESSONS.core} of them.`;
    } catch { if (alive) body.replaceChildren(el('p', { role: 'alert' }, 'The lesson list could not be loaded. Reload; nothing was lost.')); }
  })();
  return () => { alive = false; wrap.children = []; if (typeof wrap.remove === 'function') wrap.remove(); else root.replaceChildren?.(); };
}
