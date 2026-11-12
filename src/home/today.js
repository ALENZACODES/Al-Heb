// Home "Today" card (DRAFT, untested with learners). The pure model is buildToday(); renderToday() builds the DOM with ui.h.
// Read-only on other modules' stores: it is handed the already-loaded values (curriculum progress, SRS due count, streak,
// firstday.progress, onboarding.v1, placement.v1) and never writes. Every link is guarded by hasRoute.
import { plain } from '../shell/plain-copy.js';
import { h } from '../shell/ui.js';
import { openStart, placedOut } from '../placement/start.js';
import { ROUTES } from '../shell/router.js';
import { tierOf } from '../shell/nav-model.js';
import { nextPerTrack } from './nextlesson.js';
import { DAILY_GOALS, normalizeDailyGoal, reviewedToday as countReviewedToday, daysText } from '../lib/counts.js';
export { DAILY_GOALS, normalizeDailyGoal };

export const FIRSTDAY_PROGRESS_KEY = 'firstday.progress';
export const ONBOARDING_KEY = 'onboarding.v1';
export const PLACEMENT_KEY = 'placement.v1';
/** Study goal in minutes (number). Written by onboarding (minutes a day) and by the Today card buttons; read by the Today card. It is NOT the
 *  streak rule: the streak engine counts a day at a fixed 5 minutes (GOAL_SECONDS in src/curriculum/streak.js, also read by Progress, the
 *  morning card and the evening rescue), so this goal is a personal target only and is not passed to createEngagement. */
export const DAILY_GOAL_KEY = 'onboarding.v1.dailyGoal';
/** Read-only practice keys: a non-empty record means the learner has tried it. Festivals keeps no store key, so it counts as untried. */
export const PRACTICE_KEYS = Object.freeze({ speak: 'speak.v1', typing: 'typing.v1', compare: 'compare.v1' });
const MORE = [['speak', '/speak', 'Say it'], ['typing', '/typing', 'Typing'], ['festivals', '/festivals', 'Festivals'], ['compare', '/compare', 'Compare pronunciations']];
/** ' (Preview)' for a route that is not v0 (docs/v0/SCOPE.md), else ''. Links on the card to such routes carry it. */
export const previewTag = (name) => { void name; return ''; };
const tried = (v) => !!v && typeof v === 'object' && Object.keys(v).length > 0;
export const ONRAMP_WINS = 5;
/** A learner is "welcomed back" after this many whole days without any study. */
export const WELCOME_BACK_DAYS = 7;
/** A review session (20 cards) done today this far counts as "reviewed today": a backlog then stops being the main action. */
export const REVIEWED_ENOUGH = 10;
const localDay = (ms) => { const d = new Date(ms); return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000; };
/** Whole local days since the learner last studied: the later of the streak record's `last` (YYYY-MM-DD) and the newest card review. 0 when unknown. */
export function daysAway({ last, cards, now = Date.now() } = {}) {
  let latest = null;
  if (typeof last === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(last)) latest = Date.parse(last + 'T00:00:00Z') / 86400000;
  for (const c of Object.values(cards || {})) if (c && Number.isFinite(c.lastReview)) latest = Math.max(latest ?? -Infinity, localDay(c.lastReview));
  return latest == null ? 0 : Math.max(0, localDay(now) - latest);
}
/** How many cards were rated today (local day). */
export function reviewedToday(cards, now = Date.now()) { return countReviewedToday(cards, now); } // src/lib/counts.js
/** Label of the first-day button from the firstday.progress record: the very first step is named, later ones count the wins. */
export function onrampLabel(fd) {
  const wins = Array.isArray(fd?.wins) ? fd.wins.length : 0;
  if (!wins) return 'Learn your first letter: Shin (2 min)';
  const n = fd?.next && typeof fd.next === 'object' ? fd.next : null;
  if (n?.title) return `Continue: step ${n.n || wins + 1} of ${ONRAMP_WINS}, ${n.title} (${n.minutes || 2} min)`;
  return `Continue: your first 10 minutes (${wins} of ${ONRAMP_WINS} wins)`;
}

/**
 * @param {{completedIds:string[], lessons:any[], goal?:string, dueCount?:number, streak?:{count:number,activeToday?:boolean},
 *   firstday?:any, onboarding?:any, placement?:any, hasRoute?:(n:string)=>boolean, available?:(done:Set<string>,track:string)=>any[]}} o
 */
export function buildToday(o) {
  const ok = (n) => (typeof o.hasRoute === 'function' ? !!o.hasRoute(n) : n === 'learn');
  const done = new Set(o.completedIds || []);
  const goal = o.goal || 'read';
  // Lane 6 (#17): an applied placement result sticks. The read lessons before it are skipped over when picking the next lesson (not completed).
  const skip = placedOut(o.lessons, o.placement);
  const nextDone = skip.length ? new Set([...done, ...skip]) : done;
  const nexts = nextPerTrack({ lessons: o.lessons, done: nextDone, goal, available: o.available }); // shared with the week plan (nextlesson.js)
  const dueCount = Math.max(0, Number(o.dueCount) || 0);
  const streak = { count: o.streak?.count || 0, activeToday: !!o.streak?.activeToday, restToday: !!o.streak?.restToday, best: Math.max(o.streak?.best || 0, o.streak?.count || 0) };
  const triedBy = { speak: tried(o.speak), typing: tried(o.typing), compare: tried(o.compare), festivals: false };
  const more = MORE.filter(([n]) => ok(n)).sort((a, b) => Number(triedBy[a[0]]) - Number(triedBy[b[0]])).slice(0, 3).map(([n, p, label]) => ({ name: n, href: '#' + p, label: label + previewTag(n) }));
  // first run ends when something was done: a lesson, the first 10 minutes, or any counted study time (a learner who only reads texts is not new)
  const firstRun = done.size === 0 && !o.firstday?.done && !((o.streak?.best || 0) > 0 || (o.streak?.count || 0) > 0);
  const BACKLOG = 20; // this many due cards: review comes before a new lesson (the lesson stays one tap away as a secondary link)
  // a review session already done today (cap 20 cards, "Again" cards come back in minutes) must not keep the card on "Review N first":
  // the next unfinished lesson becomes the main action and the remaining cards stay one tap away as a secondary link
  const reviewedEnough = Math.max(0, Number(o.reviewedToday) || 0) >= REVIEWED_ENOUGH && !!nexts[0];
  const backlog = dueCount >= BACKLOG && ok('learn') && !reviewedEnough;
  const welcomeBack = !firstRun && Math.max(0, Number(o.daysAway) || 0) >= WELCOME_BACK_DAYS;

  // intermediate lessons (I-xx) live on their own route, not on the Learn page
  const isInter = (id) => /^I-\d+$/.test(id) && ok('intermediatelesson');
  const lessonHref = (id) => (isInter(id) ? '#/intermediate/' + encodeURIComponent(id) : '#/learn?lesson=' + encodeURIComponent(id));
  const tag = (id) => (isInter(id) ? previewTag('intermediatelesson') : '');
  const onramp = { href: '#/firstday', label: onrampLabel(o.firstday), kind: 'firstday' };
  // a lesson that has an on-ramp (lessons.json `onramp`, r01) is started one baby step at a time, never on its full page; learners who
  // took the placement check said they know some letters, so they keep the full lesson page
  const rampFor = (id) => ((o.lessons || []).find((l) => l.id === id)?.onramp && !o.firstday?.done && o.onboarding?.start !== '/placement' && ok('firstday') ? onramp : null);
  let primary = null;
  if (firstRun && goal === 'israel' && nexts[0] && ok('learn')) primary = { href: lessonHref(nexts[0].id), label: 'Start: ' + nexts[0].title + tag(nexts[0].id), kind: 'lesson', minutes: Number(nexts[0].estMinutes) || 0 };
  else if (firstRun) {
    const start = o.onboarding?.start === '/placement' ? 'placement' : 'firstday';
    // Only ever an open lesson: the placed lesson if its prerequisites are done, else the first open read lesson (placement completes nothing).
    const wanted = start === 'placement' && typeof o.placement?.result?.lesson === 'string' ? o.placement.result.lesson : null;
    const placed = wanted && (o.lessons || []).some((l) => l.id === wanted) ? openStart(o.lessons, nextDone, wanted).id : null;
    if (placed && ok('learn')) primary = rampFor(placed) || { href: lessonHref(placed), label: `Continue: lesson ${placed}${tag(placed)}`, kind: 'lesson', minutes: Number((o.lessons || []).find((l) => l.id === placed)?.estMinutes) || 0 };
    else if (ok(start)) primary = start === 'placement' ? { href: '#/placement', label: 'Continue: placement check' + previewTag('placement'), kind: 'placement' } : onramp;
    else if (ok('firstday')) primary = onramp;
    else if (ok('learn') && nexts[0]) primary = { href: lessonHref(nexts[0].id), label: 'Continue: ' + nexts[0].title + tag(nexts[0].id), kind: 'lesson' };
  } else if (backlog) primary = { href: '#/learn?review=1', label: welcomeBack ? 'Ease back in: review some due cards' : `Review ${dueCount} due cards first`, kind: 'review' };
  else if (nexts[0] && ok('learn')) primary = rampFor(nexts[0].id) || { href: lessonHref(nexts[0].id), label: 'Continue: ' + nexts[0].title + tag(nexts[0].id), kind: 'lesson' };
  else if (dueCount > 0 && ok('learn')) primary = { href: '#/learn?review=1', label: 'Continue: review due cards', kind: 'review' };
  else if (ok('learn')) primary = { href: '#/learn', label: 'Continue: open Learn', kind: 'learn' };

  return {
    state: firstRun ? 'first-run' : 'learning', firstRun, primary, backlog, welcomeBack,
    away: firstRun ? 0 : Math.max(0, Number(o.daysAway) || 0), // whole days since the last study day (a short gap gets a friendly hello, 7+ the welcome-back path)
    onramp: { wins: Array.isArray(o.firstday?.wins) ? Math.min(ONRAMP_WINS, o.firstday.wins.length) : 0, total: ONRAMP_WINS },
    lessons: ok('learn') ? nexts.map((l) => ({ id: l.id, title: l.title, href: lessonHref(l.id), tag: tag(l.id) })) : [],
    allDone: !firstRun && nexts.length === 0,
    due: { count: dueCount, href: dueCount > 0 && ok('learn') ? '#/learn?review=1' : null },
    streak,
    dailyGoal: normalizeDailyGoal(o.dailyGoal), more,
    morning: ok('morning') ? { href: '#/morning', label: "Today's morning verse" + previewTag('morning') } : null,
  };
}

/** @param {(k:string,v?:any)=>string} t @param {{showStreak?:boolean, calm?:boolean}} [opts] showStreak false hides the streak line; calm shows only the next step and tucks the rest under one "More choices" button */
export function renderToday(today, t, onGoal, opts = {}) {
  const calm = opts.calm === true, showStreak = opts.showStreak !== false && !calm;
  const dueText = today.due.count === 0 ? t('home.due.none') : t(today.due.count === 1 ? 'home.due.count.one' : 'home.due.count', { n: today.due.count });
  const RULE = plain('streakRule');
  const days = daysText;
  const streakText = today.streak.count > 0
    ? [h('strong', {}, days(today.streak.count)), today.streak.activeToday ? ' and counting. Today\'s 5 minutes are done.' : today.streak.restToday ? '. Today is a rest day: your streak is safe, nothing is needed today.' : `. Please keep your streak going. You're doing awesome! Study for 5 minutes today to add a day. ${RULE}`]
    : today.streak.best > 0
      ? today.streak.restToday ? [`Today is a rest day. Your best streak was ${days(today.streak.best)}. A new one starts the next time you study for 5 minutes.`] : [`Your best streak was ${days(today.streak.best)}. A new one starts the next time you study for 5 minutes. ${RULE}`]
      : [`No streak yet. ${RULE}`];
  const away = !today.firstRun && today.streak.count === 0 && today.streak.best > 0;
  const why = today.welcomeBack ? (today.due.count > 0 ? plain('welcomeBackDue') : 'Welcome back. Nothing to catch up on: start with the next step below.')
    : today.primary?.kind === 'firstday' && today.onramp.wins > 0 ? `${today.onramp.wins} of ${today.onramp.total} wins so far. The next step is about 2 minutes.`
    : today.firstRun && today.primary?.kind === 'lesson' ? (today.primary.minutes ? `Welcome. One lesson at a time: the first takes about ${today.primary.minutes} minutes.` : 'Welcome. One lesson at a time. Start with the one below.')
    : today.firstRun && today.primary?.kind === 'placement' ? 'Welcome. A short check finds the lesson to start from.'
    : today.firstRun ? 'Welcome. One small step at a time: the first is one letter, about 2 minutes.'
    : away && !today.backlog ? 'Welcome back. No need to catch up: start with the next step below.'
    : !today.firstRun && (today.away || 0) >= 2 && !today.backlog && today.primary ? 'Good to see you again. Pick up right where you left off.'
    : today.backlog ? `${today.due.count} cards are waiting. Reviewing them first keeps what you learned.`
    : today.allDone ? 'All lessons in your track are complete. Use Review to keep them fresh.'
    : today.primary?.kind === 'lesson' ? 'Your next lesson is ready.' : today.primary ? 'Pick up where you left off.' : '';
  // At most 3 secondary links: due cards (when not already the main action), the lesson a backlog displaces, the morning verse, then practice.
  const sec = [];
  if (today.due.href && today.primary?.kind !== 'review') sec.push(h('a', { href: today.due.href }, today.welcomeBack ? 'Ease in: review a few cards (' + dueText + ')' : dueText));
  if (today.backlog && today.lessons[0]) sec.push(h('a', { href: today.lessons[0].href, class: 'next-lesson-link' }, 'Next lesson: ' + today.lessons[0].title + (today.lessons[0].tag || '')));
  if (today.morning && !today.firstRun) sec.push(h('a', { href: today.morning.href, id: 'today-morning' }, today.morning.label));
  const room = 3 - sec.length;
  const moreLinks = today.firstRun ? [] : today.more.slice(0, Math.max(0, room));
  return h('section', { class: 'card today', id: 'home-today', 'aria-labelledby': 'h-today', 'data-state': today.state },
    h('h2', { id: 'h-today' }, t('home.today')),
    why ? h('p', { class: 'today-why' }, why) : null,
    today.primary ? h('p', { class: 'today-main' }, h('a', { class: 'btn', id: 'today-continue', href: today.primary.href, style: 'display:block;text-align:center;font-size:1.15rem;padding:0.9rem 1rem;font-weight:700' }, today.primary.label)) : null,
    h('p', { id: 'today-due', class: 'muted' }, today.due.count === 0 ? dueText : (today.primary?.kind === 'review' ? dueText : '')),
    !calm && (sec.length || moreLinks.length) ? h('p', { id: 'today-more', class: 'today-secondary' }, ...[...sec, ...moreLinks.map((m) => h('a', { href: m.href }, m.label))].flatMap((n, i) => [i ? ' \u00b7 ' : '', n])) : null,
    // the streak line stays hidden until there is something to say: a streak of 2 or more days (or a paused one that reached 2)
    showStreak && !today.welcomeBack && (today.streak.count >= 2 || today.streak.best >= 2 || (today.streak.count === 1 && !today.streak.activeToday && !today.streak.restToday)) ? h('p', { id: 'today-streak', role: 'status', 'aria-live': 'polite' }, h('span', { class: 'muted' }, t('home.streak') + ': '), ...streakText) : null,
    calm ? h('details', { id: 'today-calm-more' }, h('summary', { class: 'muted small' }, 'More choices'),
      sec.length || today.more.length ? h('p', { id: 'today-more', class: 'today-secondary' }, ...[...sec, ...today.more.slice(0, Math.max(0, 3 - sec.length)).map((m) => h('a', { href: m.href }, m.label))].flatMap((n, i) => [i ? ' \u00b7 ' : '', n])) : null) : null,
    calm ? null : h('details', { id: 'today-goal-box' }, h('summary', { class: 'muted small' }, `Daily goal: ${today.dailyGoal} min`),
      h('div', { id: 'today-goal', role: 'group', 'aria-labelledby': 'today-goal-l' }, h('span', { id: 'today-goal-l', class: 'muted' }, 'Daily goal: '),
        ...DAILY_GOALS.map((m) => h('button', { type: 'button', class: m === today.dailyGoal ? 'btn' : 'btn secondary', 'data-goal': String(m), 'aria-pressed': String(m === today.dailyGoal), onclick: () => onGoal && onGoal(m) }, `${m} min`)),
        h('span', { class: 'muted small' }, showStreak ? ' Your own target. The streak always counts a day at 5 minutes.' : ' Your own target.'))));
}
