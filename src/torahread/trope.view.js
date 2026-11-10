// @ts-check
// Short explainer: cantillation (trope) is not taught here, and why. No claims about any community's melodies.
import { el } from './ui.js';

export function renderTrope(host, env) {
  const T = env.course.trope;
  const sec = (title, list) => [el('h3', {}, title), el('ul', {}, ...list.map((t) => el('li', {}, t)))];
  host.append(el('div', { class: 'trd-trope' },
    el('h2', { id: 'trd-sec-h', tabindex: '-1' }, T.title),
    el('p', { role: 'note', class: 'trd-draft' }, 'Draft. Not reviewed by a cantor. This page makes no claims about the melodies of any particular community.'),
    ...sec('What it is', T.whatItIs), ...sec('Why it is not taught here', T.whyNotHere), ...sec('What a beginner can do', T.whatToDo)));
  return () => {};
}
