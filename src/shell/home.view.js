import { h, heSpan } from './ui.js';
import { ROUTES } from './router.js';
import { tHe } from './i18n.js';

async function tryImport(paths) {
  for (const p of paths) { try { return await import(new URL(p, import.meta.url).href); } catch { /* try next */ } }
  return null;
}

export const QUICK = [['letters', '#/letters'], ['sounds', '#/sounds'], ['read', '#/read'], ['scan', '#/scan'], ['calendar', '#/calendar'], ['workbook', '#/workbook']];

export function mount(root, ctx) {
  const { settings, store, t } = ctx;
  let alive = true;
  const todayBody = h('p', { class: 'muted' }, t('home.today.none'));
  const dueBody = h('p', { class: 'muted' }, t('home.due.none'));
  const streakBody = h('p', { class: 'muted' }, 'No streak yet. Finish a lesson or review a card to start one.');

  root.replaceChildren(h('div', { class: 'stack' },
    h('header', {}, h('h1', { id: 'view-title', tabindex: '-1' }, h('span', {}, t('app.name')), ' ', heSpan('אלף')), h('p', { class: 'muted' }, t('app.tagline'))),
    h('section', { class: 'card opening', 'aria-labelledby': 'h-open' },
      h('h2', { id: 'h-open' }, t('home.opening.title')),
      h('p', { class: 'draft-flag', role: 'note' }, t('home.opening.draft')),
      h('p', {}, t('home.opening.body')),
      h('a', { class: 'btn secondary', href: '#/read' }, t('home.opening.link'))),
    h('section', { class: 'card', 'aria-labelledby': 'h-today' }, h('h2', { id: 'h-today' }, t('home.today')), todayBody),
    h('section', { class: 'card', 'aria-labelledby': 'h-due' }, h('h2', { id: 'h-due' }, t('home.due')), dueBody),
    h('section', { class: 'card', 'aria-labelledby': 'h-streak' }, h('h2', { id: 'h-streak' }, t('home.streak')), streakBody),
    h('nav', { class: 'card', 'aria-labelledby': 'h-quick' }, h('h2', { id: 'h-quick' }, t('home.quick')),
      h('ul', { class: 'tiles' }, ...QUICK.map(([k, href]) => h('li', {}, h('a', { class: 'tile', href }, h('span', {}, t('nav.' + k)), tHe('nav.' + k) ? heSpan(tHe('nav.' + k)) : null))),
        // optional views from other lanes: only listed when their file exists in this build
        ...ROUTES.filter((r) => r.optional && r.quick && !r.group && (ctx.hasRoute?.(r.name) ?? false)).map((r) => h('li', {}, h('a', { class: 'tile', href: '#' + r.pattern }, h('span', {}, t(r.quick))))))),
    ROUTES.some((r) => r.group === 'learn' && ctx.hasRoute?.(r.name))
      ? h('nav', { class: 'card', 'aria-labelledby': 'h-more' }, h('h2', { id: 'h-more' }, t('home.more')), h('p', { class: 'muted' }, t('home.more.hint')),
        h('ul', { class: 'tiles' }, ...ROUTES.filter((r) => r.group === 'learn' && ctx.hasRoute?.(r.name)).map((r) => h('li', {}, h('a', { class: 'tile', href: '#' + r.pattern }, h('span', {}, t(r.quick)), tHe(r.quick) ? heSpan(tHe(r.quick)) : null)))))
      : null,
    h('section', { class: 'card', 'aria-labelledby': 'h-ref' }, h('h2', { id: 'h-ref' }, t('home.reflect')),
      h('a', { class: 'btn secondary', href: '#/calendar' }, t('home.reflect.link'))),
    h('p', {}, h('a', { href: '#/how' }, t('home.how'))),
    ctx.installPrompt?.available() ? h('button', { class: 'btn', type: 'button', onclick: () => ctx.installPrompt.prompt() }, t('home.install')) : null));

  // Lane 1 data (fetch-based loaders; modules shared with the Learn screen). Best effort: a missing module leaves the defaults.
  (async () => {
    const [cur, act, srs] = await Promise.all([tryImport(['../curriculum/lessons.js']), tryImport(['../curriculum/actions.js']), tryImport(['../curriculum/srs.js'])]);
    if (!alive || !cur?.lessons?.length || !act?.loadState) return;
    const st = await act.loadState(ctx);
    if (!alive) return;
    const done = new Set(Object.keys(st.completed));
    const goal = settings.get('goal');
    const tracks = goal === 'israel' ? ['israel'] : goal === 'both' ? ['read', 'israel'] : ['read'];
    const nexts = tracks.map((tr) => cur.available(done, tr)[0]).filter(Boolean);
    if (nexts.length) todayBody.replaceChildren(...nexts.map((l) => h('p', { class: 'next-lesson' }, h('strong', {}, l.title), ' ', h('a', { class: 'btn', href: `#/learn?lesson=${encodeURIComponent(l.id)}` }, t('home.today.start')))));
    else todayBody.replaceChildren(h('p', {}, 'All lessons in your track are complete. Use Review to keep them fresh.'));
    const n = srs?.due ? srs.due(Object.values(st.cards), new Date()).length : 0;
    if (n > 0) dueBody.replaceChildren(h('a', { class: 'btn', href: '#/learn?review=1' }, t(n === 1 ? 'home.due.count.one' : 'home.due.count', { n })));
    if (st.streak.count > 0) streakBody.replaceChildren(h('strong', {}, `${st.streak.count} day${st.streak.count === 1 ? '' : 's'}`), st.streak.activeToday ? ' and counting. Done for today.' : '. Learn something today to keep it.');
  })();
  return () => { alive = false; };
}
