import { h, heSpan } from './ui.js';
import { showcaseNode } from './showcase.js';
import { ROUTES } from './router.js';
import { PREVIEW_HIDDEN } from './nav-model.js';
import { tHe } from './i18n.js';
import { calmOn, streakVisible } from './comfort.js';
import { buildToday, renderToday, daysAway, reviewedToday, previewTag, FIRSTDAY_PROGRESS_KEY, ONBOARDING_KEY, PLACEMENT_KEY, DAILY_GOAL_KEY, PRACTICE_KEYS } from '../home/today.js';

async function tryImport(paths) {
  for (const p of paths) { try { return await import(new URL(p, import.meta.url).href); } catch { /* try next */ } }
  return null;
}

export const QUICK = [['letters', '#/letters'], ['sounds', '#/sounds'], ['read', '#/read'], ['scan', '#/scan'], ['calendar', '#/calendar'], ['workbook', '#/workbook'], ['light', '#/light']];

export function mount(root, ctx) {
  const { settings, store, t } = ctx;
  let alive = true;
  const todayHost = h('div', { id: 'home-today-host' }, h('section', { class: 'card today', 'aria-labelledby': 'h-today' }, h('h2', { id: 'h-today' }, t('home.today')), h('p', { class: 'muted' }, t('home.today.none'))));

  // Baby-step Home (docs/v0/SCOPE.md): a new learner sees the Today card, five destinations and a More button, nothing else.
  // Everything below the Today card is drawn by renderRest() once the Today model says whether this is a first run.
  const restHost = h('div', { class: 'stack', id: 'home-rest' });
  const DESTS = [['letters', 'letters', 'Letters'], ['vocab', 'vocab', 'Dictionary'], ['read', 'read', 'Read'], ['progress', 'progress', 'Progress'], ['calendar', 'calendar', 'Calendar']];
  const openMenu = (e) => { e?.stopPropagation?.(); /* the shell closes the sheet on any outside click, including this one */ const b2 = globalThis.document?.getElementById?.('more-btn'); if (b2) b2.click(); else if (ctx.route) ctx.route('/settings'); };
  // A beginner sees the five destinations (Letters first) in one short row directly under the title, ABOVE the Today card, so Letters is on the
  // first screen of a phone (at 375x667 the old "Go to" card started at y=570 and its first tile at y=621, under the tab bar).
  const destHost = h('div', { id: 'home-dests-host' });
  const babyDests = () => h('nav', { 'aria-labelledby': 'h-quick' }, h('h2', { id: 'h-quick', class: 'visually-hidden' }, t('home.quick')),
    h('ul', { class: 'tiles home-dests', style: 'grid-template-columns:repeat(auto-fit,minmax(min(4.5rem,100%),1fr));gap:.5rem;margin:0;padding:0' },
      ...DESTS.filter(([n]) => ctx.hasRoute?.(n) ?? false).map(([n, route, label]) => {
        const pre = previewTag(n);
        return h('li', {}, h('a', { class: 'tile', href: '#/' + route, style: 'padding-inline:.25rem;min-block-size:3rem' }, h('span', {}, label), pre ? ' ' : null, pre ? h('span', { class: 'muted small' }, 'Preview') : null));
      })));
  const babyRest = () => [
    h('p', {}, h('button', { class: 'btn secondary', type: 'button', id: 'home-more', 'aria-controls': 'nav-more', onclick: openMenu }, 'More'))];
  const fullRest = () => {
    return [
    ctx.hasRoute?.('progress') ? h('p', {}, h('a', { class: 'btn secondary', href: '#/progress' }, 'See your progress')) : null,
    h('nav', { class: 'card', 'aria-labelledby': 'h-quick' }, h('h2', { id: 'h-quick' }, t('home.quick')),
      // U-19: no destination twice on one screen — the quick wall skips any
      // target the five-destination row above already shows (Letters, Read
      // and Calendar used to appear in both, reading as duplicate tiles).
      h('ul', { class: 'tiles' }, ...QUICK.filter(([, href]) => !DESTS.some(([, r]) => '#/' + r === href)).map(([k, href]) => h('li', {}, h('a', { class: 'tile', href }, h('span', {}, t('nav.' + k)), tHe('nav.' + k) ? heSpan(tHe('nav.' + k)) : null))),
        // optional views from other lanes: only listed when their file exists in this build
        ...ROUTES.filter((r) => r.optional && r.quick && !r.group && !PREVIEW_HIDDEN.has(r.name) && (ctx.hasRoute?.(r.name) ?? false)).map((r) => h('li', {}, h('a', { class: 'tile', href: '#' + r.pattern }, h('span', {}, t(r.quick))))))),
    ROUTES.some((r) => r.group === 'learn' && r.quick && !r.pattern.includes(':') && !PREVIEW_HIDDEN.has(r.name) && ctx.hasRoute?.(r.name))
      ? h('nav', { class: 'card', 'aria-labelledby': 'h-more' }, h('details', { id: 'home-more-box' }, h('summary', {}, h('h2', { id: 'h-more', style: 'display:inline;margin:0' }, t('home.more'))), h('p', { class: 'muted' }, t('home.more.hint')),
        h('ul', { class: 'tiles' }, ...ROUTES.filter((r) => r.group === 'learn' && r.quick && !r.pattern.includes(':') && !PREVIEW_HIDDEN.has(r.name) && ctx.hasRoute?.(r.name)).map((r) => h('li', {}, h('a', { class: 'tile', href: '#' + r.pattern }, h('span', {}, t(r.quick)), tHe(r.quick) ? heSpan(tHe(r.quick)) : null))))))
      : null,
    h('section', { class: 'card', 'aria-labelledby': 'h-ref' }, h('h2', { id: 'h-ref' }, t('home.reflect')),
      h('a', { class: 'btn secondary', href: '#/calendar' }, t('home.reflect.link'))),
    h('p', {}, h('a', { href: '#/how' }, t('home.how'))),
    ctx.installPrompt?.available() ? h('button', { class: 'btn', type: 'button', onclick: () => ctx.installPrompt.prompt() }, t('home.install')) : null];
  };
  // Calm mode shows the Today card and one "More" button, like a first visit: one thing at a time.
  const renderRest = (firstRun) => { const short = firstRun || calmOn(ctx); destHost.replaceChildren(...(short && !calmOn(ctx) ? [babyDests()] : [])); restHost.replaceChildren(...(short ? babyRest() : fullRest()).filter(Boolean)); };
  renderRest(true); // until the Today model says otherwise, show the short layout (never a flash of 60 tiles)

  // Says the daily-goal choice out loud. It lives outside todayHost because the Today card is redrawn on every choice, and a live region that is
  // replaced is not announced. It is empty until a goal button is pressed, and it claims nothing about saving (the store write is best effort).
  const backupHost = h('div', { id: 'home-backup-host' }); // backup reminder after meaningful progress (src/shell/backup-reminder.js)
  const goalStatus = h('p', { id: 'today-goal-status', class: 'visually-hidden', role: 'status', 'aria-live': 'polite' });
  const header = h('header', {}, h('h1', { id: 'view-title', tabindex: '-1' }, h('span', {}, t('app.name')), ' ', heSpan('אלף')), h('p', { class: 'muted' }, t('app.tagline')));
  const showcase = showcaseNode(ctx);
  root.replaceChildren(h('div', { class: 'stack' },
    header, showcase, destHost, todayHost, backupHost, goalStatus, restHost,
    h('footer', { class: 'site-footer' }, h('p', {}, 'Made by John Khan · © 2026 John Khan. All rights reserved.'))));

  // Lane 1 data (fetch-based loaders; modules shared with the Learn screen). Best effort: a missing module leaves the placeholder.
  // The Today card only reads other modules' stores (curriculum progress, SRS cards, streak, firstday.progress, onboarding.v1, placement.v1).
  (async () => {
    const [cur, act, srs] = await Promise.all([tryImport(['../curriculum/lessons.js']), tryImport(['../curriculum/state.js']), tryImport(['../curriculum/srs.js'])]);
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
      firstday, onboarding, placement, hasRoute: ctx.hasRoute, daysAway: daysAway({ last: st.rawStreak?.last, cards: st.cards }), reviewedToday: reviewedToday(st.cards), dailyGoal: goalNow, speak, typing, compare,
      });
      renderRest(today.firstRun);
      // Streak flame under the title (Duolingo-style), only when there is a streak and the learner has not hidden streaks.
      header.querySelector?.('.alef-streak-flame')?.remove?.();
      if (streakVisible(ctx) && today.streak.count > 0) header.append(h('p', { class: 'alef-streak-flame', 'data-streak-slot': 'home' }, h('span', { class: 'alef-flame', 'aria-hidden': 'true' }, '🔥'), h('strong', {}, `${today.streak.count}-day streak`), today.streak.activeToday ? ' · today counts' : ' · keep it lit today'));
      // A returning learner sees their next step first: the Today card moves up under the title, and the hero's
      // "Start your first 10 minutes" (already done) gives way to it. A first visit keeps the showcase on top.
      if (!today.firstRun) {
        const box = header.parentNode;
        if (box && typeof box.insertBefore === 'function' && header.nextSibling !== todayHost) box.insertBefore(todayHost, showcase);
        const first = showcase.querySelector?.('.show-btn[href="#/firstday"]'); if (first) { first.hidden = true; first.setAttribute('hidden', ''); }
      }
      todayHost.replaceChildren(renderToday(today, t, (m) => { goalNow = m; try { store.set(DAILY_GOAL_KEY, m); } catch { /* best effort */ } const wasOpen = todayHost.querySelector('#today-goal-box')?.open === true; draw(); const box = todayHost.querySelector('#today-goal-box'); if (box && wasOpen) box.open = true; /* the redraw makes a new, closed <details>; a hidden button cannot take focus */ const b = todayHost.querySelector(`[data-goal="${m}"]`); b?.focus?.(); goalStatus.textContent = `Daily goal: ${m} minutes.`; }, { calm: calmOn(ctx), showStreak: streakVisible(ctx) }));
    };
    draw();
    // backup reminder: only once there is real progress to lose, never claiming a backup happened by itself
    const completed = Object.keys(st.completed || {}).length;
    // reminderDue() is always false below FIRST_AT completed lessons, so the module is fetched only once there is some progress
    if (completed > 0) {
      const B = await import('./backup-reminder.js');
      const record = await get(B.REMINDER_KEY);
      if (alive && B.reminderDue({ completed, record, now: Date.now() })) {
        backupHost.replaceChildren(B.reminderNode(h, { completed, record, onSnooze: () => { try { store.set(B.REMINDER_KEY, B.snoozed(record, Date.now())); } catch { /* best effort */ } } }));
      }
    }
  })();
  return () => { alive = false; };
}
