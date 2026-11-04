import { h, heSpan } from './ui.js';
import { ROUTES } from './router.js';
import { tHe } from './i18n.js';
import { buildToday, renderToday, FIRSTDAY_PROGRESS_KEY, ONBOARDING_KEY, PLACEMENT_KEY, DAILY_GOAL_KEY, PRACTICE_KEYS } from '../home/today.js';

async function tryImport(paths) {
  for (const p of paths) { try { return await import(new URL(p, import.meta.url).href); } catch { /* try next */ } }
  return null;
}

export const QUICK = [['letters', '#/letters'], ['sounds', '#/sounds'], ['read', '#/read'], ['scan', '#/scan'], ['calendar', '#/calendar'], ['workbook', '#/workbook']];

export function mount(root, ctx) {
  const { settings, store, t } = ctx;
  let alive = true;
  const todayHost = h('div', { id: 'home-today-host' }, h('section', { class: 'card today', 'aria-labelledby': 'h-today' }, h('h2', { id: 'h-today' }, t('home.today')), h('p', { class: 'muted' }, t('home.today.none'))));

  root.replaceChildren(h('div', { class: 'stack' },
    h('header', {}, h('h1', { id: 'view-title', tabindex: '-1' }, h('span', {}, t('app.name')), ' ', heSpan('אלף')), h('p', { class: 'muted' }, t('app.tagline'))),
    todayHost,
    h('section', { class: 'card opening', 'aria-labelledby': 'h-open' },
      h('h2', { id: 'h-open' }, t('home.opening.title')),
      h('p', { class: 'draft-flag', role: 'note' }, t('home.opening.draft')),
      h('p', {}, t('home.opening.body')),
      h('a', { class: 'btn secondary', href: '#/read' }, t('home.opening.link'))),
    ctx.hasRoute?.('progress') ? h('p', {}, h('a', { class: 'btn secondary', href: '#/progress' }, 'See your progress')) : null,
    h('nav', { class: 'card', 'aria-labelledby': 'h-quick' }, h('h2', { id: 'h-quick' }, t('home.quick')),
      h('ul', { class: 'tiles' }, ...QUICK.map(([k, href]) => h('li', {}, h('a', { class: 'tile', href }, h('span', {}, t('nav.' + k)), tHe('nav.' + k) ? heSpan(tHe('nav.' + k)) : null))),
        // optional views from other lanes: only listed when their file exists in this build
        ...ROUTES.filter((r) => r.optional && r.quick && !r.group && (ctx.hasRoute?.(r.name) ?? false)).map((r) => h('li', {}, h('a', { class: 'tile', href: '#' + r.pattern }, h('span', {}, t(r.quick))))))),
    ROUTES.some((r) => r.group === 'learn' && r.quick && !r.pattern.includes(':') && ctx.hasRoute?.(r.name))
      ? h('nav', { class: 'card', 'aria-labelledby': 'h-more' }, h('h2', { id: 'h-more' }, t('home.more')), h('p', { class: 'muted' }, t('home.more.hint')),
        h('ul', { class: 'tiles' }, ...ROUTES.filter((r) => r.group === 'learn' && r.quick && !r.pattern.includes(':') && ctx.hasRoute?.(r.name)).map((r) => h('li', {}, h('a', { class: 'tile', href: '#' + r.pattern }, h('span', {}, t(r.quick)), tHe(r.quick) ? heSpan(tHe(r.quick)) : null)))))
      : null,
    h('section', { class: 'card', 'aria-labelledby': 'h-ref' }, h('h2', { id: 'h-ref' }, t('home.reflect')),
      h('a', { class: 'btn secondary', href: '#/calendar' }, t('home.reflect.link'))),
    h('p', {}, h('a', { href: '#/how' }, t('home.how'))),
    ctx.installPrompt?.available() ? h('button', { class: 'btn', type: 'button', onclick: () => ctx.installPrompt.prompt() }, t('home.install')) : null));

  // Lane 1 data (fetch-based loaders; modules shared with the Learn screen). Best effort: a missing module leaves the placeholder.
  // The Today card only reads other modules' stores (curriculum progress, SRS cards, streak, firstday.progress, onboarding.v1, placement.v1).
  (async () => {
    const [cur, act, srs] = await Promise.all([tryImport(['../curriculum/lessons.js']), tryImport(['../curriculum/actions.js']), tryImport(['../curriculum/srs.js'])]);
    if (!alive || !cur?.lessons?.length || !act?.loadState) return;
    const st = await act.loadState(ctx);
    const get = async (k) => { try { const v = await store.get(k); return v ?? null; } catch { return null; } };
    const [firstday, onboarding, placement, dailyGoal, speak, typing, compare] = await Promise.all([get(FIRSTDAY_PROGRESS_KEY), get(ONBOARDING_KEY), get(PLACEMENT_KEY), get(DAILY_GOAL_KEY), get(PRACTICE_KEYS.speak), get(PRACTICE_KEYS.typing), get(PRACTICE_KEYS.compare)]);
    if (!alive) return;
    let goalNow = dailyGoal;
    const draw = () => {
      const today = buildToday({
      completedIds: Object.keys(st.completed), lessons: cur.lessons, goal: settings.get('goal'), available: cur.available,
      dueCount: srs?.due ? srs.due(Object.values(st.cards), new Date()).length : 0, streak: st.streak,
      firstday, onboarding, placement, hasRoute: ctx.hasRoute, dailyGoal: goalNow, speak, typing, compare,
      });
      todayHost.replaceChildren(renderToday(today, t, (m) => { goalNow = m; try { store.set(DAILY_GOAL_KEY, m); } catch { /* best effort */ } draw(); const b = todayHost.querySelector(`[data-goal="${m}"]`); b?.focus?.(); }));
    };
    draw();
  })();
  return () => { alive = false; };
}
