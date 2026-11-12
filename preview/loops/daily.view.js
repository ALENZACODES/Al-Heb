// #/daily (preview): today's goal ring, practice rhythm, three small quests, the week in a few gentle sentences, and a
// progress section with a calendar heatmap that has a text alternative. Local only: nothing is sent anywhere, nothing
// autoplays, nothing asks for permission. Draft, not tried with learners or on a device.
import { h } from '../../src/shell/ui.js';
import { streakVisible, quietNow } from '../../src/shell/comfort.js';
import { load, save, withQuests } from './store.js';
import { refresh, buildModel, describe } from './sync.js';
import { ringSVG } from './points.js';
import { ensureStyle } from './celebrate.js';
// The daily goal, the streak and its free restore, and the week's review cards are the app's own numbers from src/lib/counts.js
// (the same values Home, the shop and Progress show). Only the calendar below counts activity points, and it says so.
import { KEYS, XP_GOALS, xpGoal, streakNow, repairOffer, reviewCardsThisWeek, read as readCounts, daysText, SCOPE, activityText } from '../../src/lib/counts.js';
import { save as saveRetention, load as loadRetention } from '../../src/retention/state.js';
import { setGoal } from '../../src/retention/xp.js';
import { repairStreak } from '../../src/retention/streak.js';
import { streakShort } from '../../src/coursemap/rules.js'; // H8: the one streak rule, shared with the Shop and #/app-rules

export const CSS = `
.lp { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--gap, 1rem); max-inline-size: 100%; overflow-wrap: anywhere; }
.lp > * { min-inline-size: 0; }
.lp h2 { margin-block: 0 .5rem; font-size: 1.2rem; }
.lp .lp-row { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; }
.lp .btn { min-block-size: var(--tap, 48px); min-inline-size: var(--tap, 48px); white-space: normal; }
.lp .lp-ring { color: var(--accent); display: block; }
.lp ul { margin: 0; padding-inline-start: 1.25rem; }
.lp li + li { margin-block-start: .4rem; }
.lp summary { min-block-size: var(--tap, 48px); display: flex; align-items: center; cursor: pointer; font-weight: 600; }
.lp-heat { max-inline-size: 100%; display: grid; grid-auto-flow: column; grid-template-rows: repeat(7, 1.1rem); gap: 3px; overflow-x: auto; padding-block: .25rem; }
.lp-cell { inline-size: 1.1rem; block-size: 1.1rem; font-size: .6rem; line-height: 1.1rem; text-align: center; border: 1px solid var(--border); border-radius: 3px; box-sizing: border-box; }
.lp-cell[data-level="1"] { background: color-mix(in srgb, var(--accent) 25%, var(--card)); color: var(--fg); border-style: dotted; }
.lp-cell[data-level="2"] { background: color-mix(in srgb, var(--accent) 85%, var(--card)); color: var(--accent-fg); }
.lp-cell[data-level="3"] { background: var(--accent); color: var(--accent-fg); border-width: 2px; }
.lp-cell[data-level="none"] { border-color: transparent; }
.lp table { border-collapse: collapse; inline-size: 100%; }
.lp th, .lp td { text-align: start; padding: .3rem .4rem; border-top: 1px solid var(--border); font-weight: normal; }
.lp progress { inline-size: 6rem; block-size: .8rem; accent-color: var(--accent); }
`;


export function mount(root, ctx) {
  const store = ctx && ctx.store;
  const now = () => (ctx && typeof ctx.now === 'function' ? ctx.now() : Date.now());
  const status = h('p', { class: 'muted', role: 'status', 'aria-live': 'polite' });
  const main = h('div', { class: 'lp' });
  const newHost = h('div', {}), badgeHost = h('div', {});
  let catalog = null, catalogTried = false, badges = null;
  const style = h('style', {}); style.textContent = CSS;
  root.replaceChildren(style, h('h1', { id: 'view-title', tabindex: '-1' }, 'Daily goal and quests'),
    h('p', { class: 'muted' }, 'A gentle daily layer on top of your lessons. Everything here is kept on this device only, nothing is sent anywhere, and nothing here ever stops you from learning.'), status, newHost, main);

  function render(focusId) {
    const { rec, snap } = refresh(store);
    const m = buildModel(rec, snap, now());
    const d = describe(m);
    const showRhythm = streakVisible(ctx);
    const c = readCounts(store), t = now();
    const xp = xpGoal(c.retention, t), st = streakNow(c.streak, t, c.rest), offer = repairOffer(c.retention, c.streak, t);

    // goal: XP today against the daily XP goal, the same value and goal as Home's ring (src/lib/counts.js xpGoal)
    // the sentence beside the ring says the same, so a screen reader reads the ring once, as text
    const ringHost = h('span', { 'aria-hidden': 'true' }); ringHost.innerHTML = ringSVG(xp.xp, xp.goal).replace(/points today/, 'XP today');
    const goalCard = h('section', { class: 'card', 'aria-labelledby': 'lp-h-goal' }, h('h2', { id: 'lp-h-goal' }, 'Today'),
      h('div', { class: 'lp-row' }, ringHost, h('div', {}, h('p', { id: 'lp-ring-text', style: 'font-weight:600;margin:0', 'data-xp': String(xp.xp) }, xp.text), h('p', { style: 'margin:.25rem 0 0' }, xp.done ? 'Anything more is a bonus, never a requirement.' : `${xp.goal - xp.xp} XP to today's goal. One lesson is 10 XP. Any amount helps.`))),
      h('div', { class: 'lp-row', role: 'group', 'aria-label': 'Daily XP goal' }, ...XP_GOALS.map((g) => h('button', { type: 'button', class: g === xp.goal ? 'btn' : 'btn secondary', 'data-goal': String(g), 'aria-pressed': String(g === xp.goal),
        onclick: () => { saveRetention(store, (r) => setGoal(r, g), now()); status.textContent = `Daily goal set to ${g} XP.`; render('lp-goal-' + g); }, id: 'lp-goal-' + g }, `${g} XP`))));

    // streak: the one streak (the streak record), and the one restore rule: free, offered only while the streak is broken
    const rhythmCard = showRhythm ? h('section', { class: 'card', 'aria-labelledby': 'lp-h-rhythm' }, h('h2', { id: 'lp-h-rhythm' }, 'Your streak'),
      h('p', {}, st.count > 0 ? `${daysText(st.count)} in a row${st.activeToday ? ', including today' : st.restToday ? ' (resting today)' : ''}.` : st.best > 0 ? 'No streak running today. A new one starts the next time you study for 5 minutes.' : 'No streak yet. Five minutes of study starts one.'),
      h('p', { class: 'muted', 'data-rule': 'streak' }, `Best streak: ${daysText(st.best)}. ${streakShort().join(' ')} `, h('a', { href: '#/app-rules?section=streak' }, 'Streak rules')),
      offer ? h('button', { type: 'button', class: 'btn', id: 'lp-repair', onclick: () => {
        const out = repairStreak(store.get(KEYS.streak), loadRetention(store, now()), now());
        if (out.ok) { store.set(KEYS.streak, out.streak); saveRetention(store, () => out.rec, now()); status.textContent = `Your ${offer.prev}-day streak is back. It was free.`; }
        else status.textContent = 'The restore window has closed.';
        render('lp-h-rhythm');
      } }, offer.text) : null) : null;

    // quests
    const questCard = h('section', { class: 'card', 'aria-labelledby': 'lp-h-quests' }, h('h2', { id: 'lp-h-quests' }, 'Small quests'),
      m.quests ? h('div', {}, h('p', {}, m.questLine), h('ul', {}, ...m.questList.map((q) => h('li', { 'data-quest': q.id, 'data-done': String(q.done) },
        `${q.done ? 'Done: ' : ''}${q.text} (${q.have} of ${q.need}) `, h('progress', { max: String(q.need), value: String(q.have), 'aria-label': q.text })))),
        h('p', { class: 'muted' }, 'They change every day, give no prizes and cost nothing to skip.')) : h('p', {}, 'Quests are hidden.'),
      h('button', { type: 'button', class: 'btn secondary', id: 'lp-quests-toggle', onclick: () => { save(store, withQuests(load(store), !m.quests)); status.textContent = m.quests ? 'Quests hidden.' : 'Quests shown.'; render('lp-quests-toggle'); } }, m.quests ? 'Hide quests' : 'Show quests'));

    // week
    // review cards this week: src/lib/counts.js, the same floor Progress shows; the rest of the week line is activity points
    const wkCards = reviewCardsThisWeek(c.cards, c.vocab, t);
    const weekCard = h('section', { class: 'card', 'aria-labelledby': 'lp-h-week' }, h('h2', { id: 'lp-h-week' }, 'Your week'),
      ...m.week.sentences.map((s) => h('p', {}, s.replace(/\b(\d+) review cards?\b/, wkCards === 1 ? '1 review card' : `${wkCards} review cards`).replace(/\bearned (\d+) points?\b/, (x, n) => `earned ${activityText(Number(n))}`))),
      h('p', { class: 'muted small' }, `Review cards: different cards reviewed in the last 7 days (a floor, the same count as Progress). Points here are ${SCOPE.activityPoints}.`));

    // progress + heatmap
    const cells = m.heat.flat().map((c) => (c ? h('span', { class: 'lp-cell', 'data-level': String(c.level), 'aria-hidden': 'true', title: `${c.iso}: ${activityText(c.points)}` }, String(c.level)) : h('span', { class: 'lp-cell', 'data-level': 'none', 'aria-hidden': 'true' })));
    const progressCard = h('section', { class: 'card', 'aria-labelledby': 'lp-h-progress' }, h('h2', { id: 'lp-h-progress' }, 'Your progress'),
      h('ul', {}, h('li', { 'data-stat': 'letters' }, d.letters), h('li', { 'data-stat': 'words' }, d.words), h('li', { 'data-stat': 'minutes' }, d.minutes), h('li', { 'data-stat': 'accuracy' }, d.accuracy)),
      h('p', { class: 'muted' }, 'These are read from your own review cards and lesson records. Reviews and minutes are lower bounds, because a card keeps only its latest review time.'),
      h('h3', { id: 'lp-h-heat' }, 'Calendar'),
      h('p', { id: 'lp-heat-text' }, d.heat),
      h('div', { class: 'lp-heat', 'aria-hidden': 'true', tabindex: '-1' }, ...cells),
      h('p', { class: 'muted' }, `Level 0 none, 1 some, 2 a practice day, 3 ${m.goal} or more activity points. The calendar counts ${SCOPE.activityPoints}.`),
      h('details', {}, h('summary', {}, 'Show the calendar as a table'),
        h('div', { class: 'table-wrap', role: 'region', 'aria-label': 'Activity points per week, newest first', tabindex: '0' }, h('table', {}, h('caption', {}, 'Activity points per week, newest first'), h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Week starting'), h('th', { scope: 'col' }, 'Activity points'), h('th', { scope: 'col' }, 'Practice days'), h('th', { scope: 'col' }, 'Each day (month-day: activity points)'))),
          h('tbody', {}, ...d.heatRows.map((r) => h('tr', {}, h('th', { scope: 'row' }, r.from), h('td', {}, String(r.points)), h('td', {}, String(r.days)), h('td', {}, r.detail))))))));

    main.replaceChildren(...[goalCard, rhythmCard, questCard, weekCard, badgeHost, progressCard].filter(Boolean));
    renderBadges();
    // the newest weeks are on the right; start the sideways scroll there so today is in view
    const heatEl = root.querySelector ? root.querySelector('.lp-heat') : null; if (heatEl && typeof heatEl.scrollWidth === 'number') heatEl.scrollLeft = heatEl.scrollWidth;
    if (focusId) { const el = root.querySelector ? root.querySelector('#' + focusId) : null; if (el && el.focus) el.focus(); }
  }
  function renderBadges() {
    if (!badges || !catalog) { badgeHost.replaceChildren(catalogTried ? h('section', { class: 'card' }, h('h2', {}, 'Badges'), h('p', {}, 'The badge list could not be read right now. Your badges are kept on this device and will show next time.')) : h('section', { class: 'card' }, h('h2', {}, 'Badges'), h('p', { class: 'muted' }, 'Loading badges.'))); return; }
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    const s = badges.settle(store, catalog, now(), { offline });
    if (!s) { badgeHost.replaceChildren(); return; }
    badgeHost.replaceChildren(badges.shelfNode(h, s, { onCopy: async (text) => { status.textContent = (await badges.copyText(text)) ? 'Badge summary copied.' : 'Copying is not available here. The text is in the box above, so you can select and copy it.'; } }));
    const soundOn = !!(ctx && ctx.settings && ctx.settings.get && ctx.settings.get('soundEffects') === true);
    const { node, plan } = badges.newBadgeNode(h, s, { quiet: quietNow(ctx && ctx.settings), soundOn, level: 2 });
    if (node) {
      ensureStyle(globalThis.document); newHost.replaceChildren(node);
      if (plan.sound && ctx && ctx.sfx && typeof ctx.sfx.play === 'function') { try { ctx.sfx.play(plan.sound); } catch { /* no sound is fine */ } }
    }
  }
  render();
  // The badge module and its catalogue load on demand when this page mounts, so opening any
  // other page never pulls them in. The badge styles arrive with the module. If the module or
  // the catalogue cannot be read, the page says so calmly and nothing throws.
  import('./badges.view.js').then((m) => { badges = m; style.textContent += m.CSS; return m.loadCatalog(ctx); }).then((c) => { catalog = c; catalogTried = true; renderBadges(); }).catch(() => { catalogTried = true; renderBadges(); });
  return () => {};
}
