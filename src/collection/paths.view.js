// S7 Interest Paths (#/paths): pick what you are curious about and get an ordered walk through pages Aleph already has.
// This follows curiosity; My Study Plan follows placement. A step is done when you tick it or have opened its page.
import { h } from '../shell/ui.js';
import { ROUTES } from '../shell/router.js';
import { read, write } from './model.js';
import { VISITS_KEY, PATHS_KEY, pathsFor, pickInterest, markStep } from './diary.js';
import { LINKS } from './shared.js';

export async function mount(root, ctx, env = {}) {
  const store = ctx?.store; const now = env.now || (() => Date.now());
  const routes = (env.routes || ROUTES).filter((r) => r.module && (!ctx?.hasRoute || ctx.hasRoute(r.name)));
  let rec = await read(store, PATHS_KEY); const visits = await read(store, VISITS_KEY);
  const status = h('p', { role: 'status', class: 'muted' }); const body = h('div', {});
  const save = async (next, msg) => { rec = next; status.textContent = (await write(store, PATHS_KEY, rec)) ? msg : 'This could not be saved on this device.'; render(); };
  function render() {
    const all = pathsFor(rec, routes, visits); const picked = all.filter((p) => p.picked);
    body.replaceChildren(...[
      h('fieldset', {}, h('legend', {}, 'What are you interested in?'), ...all.map((p) => h('p', {}, h('label', {}, h('input', { type: 'checkbox', checked: p.picked ? '' : null, 'data-interest': p.id,
        onchange: (e) => save(pickInterest(rec, p.id, e.target.checked), e.target.checked ? `${p.label} path added.` : `${p.label} path put away. Your ticks are kept.`) }), ` ${p.label} `, h('span', { class: 'muted' }, `(${p.total} steps)`))))),
      picked.length ? null : h('p', {}, 'Pick one or more above. Each path is a suggested order; go through it at your own pace.'),
      ...picked.map((p) => h('section', { 'data-path': p.id }, h('h2', {}, p.label),
        h('p', {}, `${p.done} of ${p.total} steps done. `, p.next ? h('a', { class: 'btn', href: p.next.href }, `Next: ${p.next.title}`) : h('strong', {}, 'Path finished.')),
        h('ol', {}, ...p.steps.map((s) => h('li', {}, h('label', {}, h('input', { type: 'checkbox', checked: s.done ? '' : null, disabled: s.opened && !s.ticked ? '' : null, 'aria-label': `Done: ${s.title}`,
          onchange: (e) => save(markStep(rec, p.id, s.route, e.target.checked, now()), e.target.checked ? `${s.title} ticked.` : `${s.title} unticked.`) })), ' ', h('a', { href: s.href }, s.title),
          s.opened && !s.ticked ? h('span', { class: 'muted' }, ' (opened)') : null)))))].filter(Boolean));
  }
  root.append(h('section', { class: 'card', 'aria-labelledby': 'view-title' }, h('h1', { id: 'view-title', tabindex: '-1' }, 'Interest Paths'),
    h('p', {}, 'Follow what you are curious about. Each path is an ordered walk through games, lessons and readings already in Aleph. Your ', h('a', { href: '#/classtrack' }, 'study plan'), ' is separate and unchanged.'),
    body, status,
    h('p', { class: 'muted' }, ...LINKS.filter(([href]) => href !== '#/paths').flatMap(([href, label], i) => [i ? ' · ' : '', h('a', { href }, label)]))));
  render();
  return () => {};
}
