// Home "Today" card (DRAFT, untested with learners). The pure model is buildToday(); renderToday() builds the DOM with ui.h.
// Read-only on other modules' stores: it is handed the already-loaded values (curriculum progress, SRS due count, streak,
// firstday.progress, onboarding.v1, placement.v1) and never writes. Every link is guarded by hasRoute.
import { h } from '../shell/ui.js';
import { openStart } from '../placement/model.js';

export const FIRSTDAY_PROGRESS_KEY = 'firstday.progress';
export const ONBOARDING_KEY = 'onboarding.v1';
export const PLACEMENT_KEY = 'placement.v1';
/** Study goal in minutes (number). Written by onboarding (minutes a day) and by the Today card buttons; read by the Today card. It is NOT the
 *  streak rule: the streak engine counts a day at a fixed 5 minutes (GOAL_SECONDS in src/curriculum/streak.js, also read by Progress, the
 *  morning card and the evening rescue), so this goal is a personal target only and is not passed to createEngagement. */
export const DAILY_GOAL_KEY = 'onboarding.v1.dailyGoal';
export const DAILY_GOALS = Object.freeze([5, 10, 15, 20, 30]);
export const normalizeDailyGoal = (v) => (DAILY_GOALS.includes(v) ? v : 5); // 5 = GOAL_SECONDS (300 s), the current default
/** Read-only practice keys: a non-empty record means the learner has tried it. Festivals keeps no store key, so it counts as untried. */
export const PRACTICE_KEYS = Object.freeze({ speak: 'speak.v1', typing: 'typing.v1', compare: 'compare.v1' });
const MORE = [['speak', '/speak', 'Say it'], ['typing', '/typing', 'Typing'], ['festivals', '/festivals', 'Festivals'], ['compare', '/compare', 'Compare traditions']];
const tried = (v) => !!v && typeof v === 'object' && Object.keys(v).length > 0;

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
  const streak = { count: o.streak?.count || 0, activeToday: !!o.streak?.activeToday, best: Math.max(o.streak?.best || 0, o.streak?.count || 0) };
  const triedBy = { speak: tried(o.speak), typing: tried(o.typing), compare: tried(o.compare), festivals: false };
  const more = MORE.filter(([n]) => ok(n)).sort((a, b) => Number(triedBy[a[0]]) - Number(triedBy[b[0]])).slice(0, 3).map(([n, p, label]) => ({ name: n, href: '#' + p, label }));
  const firstRun = done.size === 0 && !o.firstday?.done;

  const lessonHref = (id) => '#/learn?lesson=' + encodeURIComponent(id);
  let primary = null;
  if (firstRun) {
    const start = o.onboarding?.start === '/placement' ? 'placement' : 'firstday';
    // Only ever an open lesson: the placed lesson if its prerequisites are done, else the first open read lesson (placement completes nothing).
    const wanted = start === 'placement' && typeof o.placement?.result?.lesson === 'string' ? o.placement.result.lesson : null;
    const placed = wanted && (o.lessons || []).some((l) => l.id === wanted) ? openStart(o.lessons, done, wanted).id : null;
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
    dailyGoal: normalizeDailyGoal(o.dailyGoal), more,
    morning: ok('morning') ? { href: '#/morning' } : null,
  };
}

/** @param {(k:string,v?:any)=>string} t */
export function renderToday(today, t, onGoal) {
  const dueText = today.due.count === 0 ? t('home.due.none') : t(today.due.count === 1 ? 'home.due.count.one' : 'home.due.count', { n: today.due.count });
  const RULE = 'A day counts after 5 minutes of study on a lesson, review or practice screen (the timer pauses after a minute without a tap).';
  const days = (n) => `${n} day${n === 1 ? '' : 's'}`;
  const streakText = today.streak.count > 0
    ? [h('strong', {}, days(today.streak.count)), today.streak.activeToday ? ' and counting. Today\'s 5 minutes are done.' : `. Today is not counted yet. ${RULE}`]
    : today.streak.best > 0
      ? [`Paused. Your best streak was ${days(today.streak.best)}. A new one starts when you finish a counted day. ${RULE}`]
      : [`No streak yet. ${RULE}`];
  const lessonNodes = today.firstRun
    ? [h('p', {}, 'Welcome. Start with your first 10 minutes: five letters, two vowels, three real words.')]
    : today.allDone ? [h('p', {}, 'All lessons in your track are complete. Use Review to keep them fresh.')]
    : today.lessons.map((l) => h('p', { class: 'next-lesson' }, 'Next lesson: ', h('a', { href: l.href }, l.title)));
  return h('section', { class: 'card today', id: 'home-today', 'aria-labelledby': 'h-today', 'data-state': today.state },
    h('h2', { id: 'h-today' }, t('home.today')),
    ...lessonNodes,
    h('p', { id: 'today-due' }, today.due.href ? h('a', { href: today.due.href }, dueText) : dueText),
    h('p', { id: 'today-streak' }, h('span', { class: 'muted' }, t('home.streak') + ': '), ...streakText),
    h('div', { id: 'today-goal', role: 'group', 'aria-labelledby': 'today-goal-l' }, h('span', { id: 'today-goal-l', class: 'muted' }, 'Study goal: '),
      ...DAILY_GOALS.map((m) => h('button', { type: 'button', class: m === today.dailyGoal ? 'btn' : 'btn secondary', 'data-goal': String(m), 'aria-pressed': String(m === today.dailyGoal), onclick: () => onGoal && onGoal(m) }, `${m} min`)),
      h('span', { class: 'muted small' }, ' Your own target. The streak always counts a day at 5 minutes.')),
    today.more.length ? h('p', { id: 'today-more' }, h('span', { class: 'muted' }, 'More practice: '), ...today.more.flatMap((m, i) => [i ? ' · ' : '', h('a', { href: m.href }, m.label)])) : null,
    today.morning ? h('p', {}, h('a', { href: today.morning.href, id: 'today-morning' }, "Today's morning verse")) : null,
    today.primary ? h('p', {}, h('a', { class: 'btn', id: 'today-continue', href: today.primary.href }, today.primary.label)) : null);
}
