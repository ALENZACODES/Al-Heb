/**
 * Time budget (#/time-budget), PREVIEW. An honest comparison of the lesson time ALEF contains with a planning range of hours.
 * The range is a planning figure, not a promise: this repo does not source it, and lesson time is the authors' estimate (never measured).
 * Review time, listening and speaking with other people are not counted anywhere. The meter shows the share of ALEF's own lesson minutes
 * you have completed (lessons marked done in curriculum.progress); it reads that store key and writes nothing.
 * ctx extras for tests: ctx.lessonsData = [lesson, ...].
 */
import { el, storeGet, PROGRESS_KEY } from '../curriculum/dom.js';
import { loadJSON } from '../curriculum/data.js';
import { timeTotals, budget, DEFAULT_RANGE } from './model.js';

export const NOTE = 'Preview. The hours range below is a planning figure whose source is not in this project, so treat it as unverified. Lesson minutes are the authors\' estimates, never measured on a learner. This page does not predict when you will reach any level.';
const PER_WEEK = [2, 5, 10];

/** @param {HTMLElement} root @param {any} ctx @returns {() => void} unmount */
export function mount(root, ctx) {
  const wrap = el('section', { class: 'alef-timebudget', 'aria-labelledby': 'tb-title' });
  const h1 = el('h1', { id: 'tb-title', tabindex: '-1' }, 'Time budget');
  const body = el('div', { class: 'tb-body' });
  const status = el('p', { role: 'status', 'aria-live': 'polite', class: 'tb-status' });
  wrap.append(h1, el('p', { class: 'tb-draft' }, NOTE), body, status);
  root.append(wrap);
  let alive = true, lessons = [], completed = {}, perWeek = 5;
  const btn = (label, onclick, extra = {}) => el('button', { class: 'btn secondary', type: 'button', style: 'min-height:44px;min-width:44px', onclick, ...extra }, label);
  function render() {
    const t = timeTotals(lessons, completed), b = budget(t, DEFAULT_RANGE, perWeek), pct = t.totalMinutes ? Math.round((t.doneMinutes / t.totalMinutes) * 100) : 0;
    const meter = el('progress', { id: 'tb-meter', max: '100', value: String(pct), 'aria-label': `Lesson time completed: ${pct} percent` }, `${pct}%`);
    body.replaceChildren(
      el('h2', {}, 'What ALEF contains'),
      el('p', {}, `${t.lessons} lessons, about ${b.lessonHours} hours of estimated lesson time.`),
      el('h2', {}, 'Your lesson time so far'), el('p', {}, el('label', { for: 'tb-meter' }, `${t.doneLessons} of ${t.lessons} lessons completed, about ${b.doneHours} of ${b.lessonHours} hours (${pct}%): `), meter),
      el('h2', {}, `Against a planning range of ${DEFAULT_RANGE.low} to ${DEFAULT_RANGE.high} hours`),
      el('p', {}, `The written lessons are about ${b.lessonShareOfHigh}% to ${b.lessonShareOfLow}% of that range. The rest, at least ${b.gapHoursLow} to ${b.gapHoursHigh} hours, would have to come from review, listening, reading real text and speaking with people, none of which this page can measure.`),
      el('p', { id: 'tb-pw' }, 'Hours you could study per week'),
      el('div', { role: 'group', 'aria-labelledby': 'tb-pw' }, ...PER_WEEK.map((h) => btn(`${h} hours`, () => { perWeek = h; render(); status.textContent = `${h} hours a week chosen.`; }, { 'aria-pressed': String(perWeek === h) }))),
      el('p', {}, `At ${perWeek} hours a week, ${DEFAULT_RANGE.low} to ${DEFAULT_RANGE.high} hours is about ${Math.ceil(Math.max(0, DEFAULT_RANGE.low - b.doneHours) / perWeek)} to ${Math.ceil(Math.max(0, DEFAULT_RANGE.high - b.doneHours) / perWeek)} weeks of study from where you are, counting only the lesson hours you have done. This is arithmetic on a planning range, not a forecast.`),
      el('p', {}, el('a', { href: '#/syllabus' }, 'See every lesson and its goals')));
  }
  (async () => {
    try {
      lessons = ctx?.lessonsData || (await loadJSON('data/curriculum/lessons.json')).lessons;
      completed = (await storeGet(ctx, PROGRESS_KEY, { completed: {} })).completed || {};
      if (alive) { render(); status.textContent = 'Time budget ready.'; }
    } catch { if (alive) body.replaceChildren(el('p', { role: 'alert' }, 'The lesson list could not be loaded. Reload; nothing was lost.')); }
  })();
  return () => { alive = false; wrap.children = []; if (typeof wrap.remove === 'function') wrap.remove(); else root.replaceChildren?.(); };
}
