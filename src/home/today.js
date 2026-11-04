// Home "Today" card (DRAFT, untested with learners). The pure model is buildToday(); renderToday() builds the DOM with ui.h.
// Read-only on other modules' stores: it is handed the already-loaded values (curriculum progress, SRS due count, streak,
// firstday.progress, onboarding.v1, placement.v1) and never writes. Every link is guarded by hasRoute.
import { h } from '../shell/ui.js';

export const FIRSTDAY_PROGRESS_KEY = 'firstday.progress';
export const ONBOARDING_KEY = 'onboarding.v1';
export const PLACEMENT_KEY = 'placement.v1';

/**
 * @param {{completedIds:string[], lessons:any[], goal?:string, dueCount?:number, streak?:{count:number,activeToday?:boolean},
 *   firstday?:any, onboarding?:any, placement?:any, hasRoute?:(n:string)=>boolean, available?:(done:Set<string>,track:string)=>any[]}} o
 */
export function buildToday(o) {
  const ok = (n) => (typeof o.hasRoute === 'function' ? !!o.hasRoute(n) : n === 'learn');
  const done = new Set(o.completedIds || []);
  const goal = o.goal || 'read';
  const tracks = goal === 'israel' ? ['israel'] : goal === 'both' ? ['read', 'israel'] : ['read'];
  const avail = o.available || ((d, tr) => (o.lessons || []).filter((l) => l.track === tr && !d.has(l.id) && (l.prerequisites || []).every((p) => d.has(p))));
  const nexts = tracks.map((tr) => avail(done, tr)[0]).filter(Boolean);
  const dueCount = Math.max(0, Number(o.dueCount) || 0);
  const streak = { count: o.streak?.count || 0, activeToday: !!o.streak?.activeToday };
  const firstRun = done.size === 0 && !o.firstday?.done;

  const lessonHref = (id) => '#/learn?lesson=' + encodeURIComponent(id);
  let primary = null;
  if (firstRun) {
    const start = o.onboarding?.start === '/placement' ? 'placement' : 'firstday';
    const placed = start === 'placement' && typeof o.placement?.result?.lesson === 'string' && (o.lessons || []).some((l) => l.id === o.placement.result.lesson) ? o.placement.result.lesson : null;
    if (placed && ok('learn')) primary = { href: lessonHref(placed), label: `Continue: lesson ${placed}`, kind: 'lesson' };
    else if (ok(start)) primary = start === 'placement' ? { href: '#/placement', label: 'Continue: placement check', kind: 'placement' } : { href: '#/firstday', label: 'Continue: your first 10 minutes', kind: 'firstday' };
    else if (ok('firstday')) primary = { href: '#/firstday', label: 'Continue: your first 10 minutes', kind: 'firstday' };
    else if (ok('learn') && nexts[0]) primary = { href: lessonHref(nexts[0].id), label: 'Continue: ' + nexts[0].title, kind: 'lesson' };
  } else if (nexts[0] && ok('learn')) primary = { href: lessonHref(nexts[0].id), label: 'Continue: ' + nexts[0].title, kind: 'lesson' };
  else if (dueCount > 0 && ok('learn')) primary = { href: '#/learn?review=1', label: 'Continue: review due cards', kind: 'review' };
  else if (ok('learn')) primary = { href: '#/learn', label: 'Continue: open Learn', kind: 'learn' };

  return {
    state: firstRun ? 'first-run' : 'learning', firstRun, primary,
    lessons: ok('learn') ? nexts.map((l) => ({ id: l.id, title: l.title, href: lessonHref(l.id) })) : [],
    allDone: !firstRun && nexts.length === 0,
    due: { count: dueCount, href: dueCount > 0 && ok('learn') ? '#/learn?review=1' : null },
    streak,
    morning: ok('morning') ? { href: '#/morning' } : null,
  };
}

/** @param {(k:string,v?:any)=>string} t */
export function renderToday(today, t) {
  const dueText = today.due.count === 0 ? t('home.due.none') : t(today.due.count === 1 ? 'home.due.count.one' : 'home.due.count', { n: today.due.count });
  const streakText = today.streak.count > 0
    ? [h('strong', {}, `${today.streak.count} day${today.streak.count === 1 ? '' : 's'}`), today.streak.activeToday ? ' and counting. Done for today.' : '. Learn something today to keep it.']
    : ['No streak yet. Finish a lesson or review a card to start one.'];
  const lessonNodes = today.firstRun
    ? [h('p', {}, 'Welcome. Start with your first 10 minutes: five letters, two vowels, three real words.')]
    : today.allDone ? [h('p', {}, 'All lessons in your track are complete. Use Review to keep them fresh.')]
    : today.lessons.map((l) => h('p', { class: 'next-lesson' }, 'Next lesson: ', h('a', { href: l.href }, l.title)));
  return h('section', { class: 'card today', id: 'home-today', 'aria-labelledby': 'h-today', 'data-state': today.state },
    h('h2', { id: 'h-today' }, t('home.today')),
    ...lessonNodes,
    h('p', { id: 'today-due' }, today.due.href ? h('a', { href: today.due.href }, dueText) : dueText),
    h('p', { id: 'today-streak' }, h('span', { class: 'muted' }, t('home.streak') + ': '), ...streakText),
    today.morning ? h('p', {}, h('a', { href: today.morning.href, id: 'today-morning' }, "Today's morning verse")) : null,
    today.primary ? h('p', {}, h('a', { class: 'btn', id: 'today-continue', href: today.primary.href }, today.primary.label)) : null);
}
