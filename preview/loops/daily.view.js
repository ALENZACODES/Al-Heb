// #/daily (preview): today's goal ring, practice rhythm, three small quests, the week in a few gentle sentences, and a
// progress section with a calendar heatmap that has a text alternative. Local only: nothing is sent anywhere, nothing
// autoplays, nothing asks for permission. Draft, not tried with learners or on a device.
import { h } from '../../src/shell/ui.js';
import { streakVisible, quietNow } from '../../src/shell/comfort.js';
import { GOALS, load, save, withGoal, withQuests } from './store.js';
import { refresh, buildModel, describe, applyRepair, dayKey } from './sync.js';
import { ringSVG } from './points.js';
import { CSS as BADGE_CSS, loadCatalog, settle, newBadgeNode, shelfNode, copyText } from './badges.view.js';
import { ensureStyle } from './celebrate.js';

export const CSS = `
.lp { display: grid; gap: var(--gap, 1rem); max-inline-size: 100%; overflow-wrap: anywhere; }
.lp h2 { margin-block: 0 .5rem; font-size: 1.2rem; }
.lp .lp-row { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; }
.lp .btn { min-block-size: var(--tap, 48px); min-inline-size: var(--tap, 48px); white-space: normal; }
.lp .lp-ring { color: var(--accent); display: block; }
.lp ul { margin: 0; padding-inline-start: 1.25rem; }
.lp li + li { margin-block-start: .4rem; }
.lp summary { min-block-size: var(--tap, 48px); display: flex; align-items: center; cursor: pointer; font-weight: 600; }
.lp-heat { display: grid; grid-auto-flow: column; grid-template-rows: repeat(7, 1.1rem); gap: 3px; overflow-x: auto; padding-block: .25rem; }
.lp-cell { inline-size: 1.1rem; block-size: 1.1rem; font-size: .6rem; line-height: 1.1rem; text-align: center; border: 1px solid var(--border); border-radius: 3px; box-sizing: border-box; }
.lp-cell[data-level="1"] { background: color-mix(in srgb, var(--accent) 25%, transparent); border-style: dotted; }
.lp-cell[data-level="2"] { background: color-mix(in srgb, var(--accent) 55%, transparent); }
.lp-cell[data-level="3"] { background: var(--accent); color: var(--accent-fg); border-width: 2px; }
.lp-cell[data-level="none"] { border-color: transparent; }
.lp table { border-collapse: collapse; inline-size: 100%; }
.lp th, .lp td { text-align: start; padding: .3rem .4rem; border-top: 1px solid var(--border); font-weight: normal; }
.lp progress { inline-size: 6rem; block-size: .8rem; accent-color: var(--accent); }
` + BADGE_CSS;

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

export function mount(root, ctx) {
  const store = ctx && ctx.store;
  const now = () => (ctx && typeof ctx.now === 'function' ? ctx.now() : Date.now());
  const status = h('p', { class: 'muted', role: 'status', 'aria-live': 'polite' });
  const main = h('div', { class: 'lp' });
  const newHost = h('div', {}), badgeHost = h('div', {});
  let catalog = null, catalogTried = false;
  const style = h('style', {}); style.textContent = CSS;
  root.replaceChildren(style, h('h1', { id: 'view-title', tabindex: '-1' }, 'Daily goal and quests'),
    h('p', { class: 'muted' }, 'A gentle daily layer on top of your lessons. Everything here is kept on this device only, nothing is sent anywhere, and nothing here ever stops you from learning. Draft: not tried with learners yet.'), status, newHost, main);

  function render(focusId) {
    const { rec, snap } = refresh(store);
    const m = buildModel(rec, snap, now());
    const d = describe(m);
    const showRhythm = streakVisible(ctx);

    // goal
    const ringHost = h('span', {}); ringHost.innerHTML = ringSVG(m.points, m.goal);
    const goalCard = h('section', { class: 'card', 'aria-labelledby': 'lp-h-goal' }, h('h2', { id: 'lp-h-goal' }, 'Today'),
      h('div', { class: 'lp-row' }, ringHost, h('div', {}, h('p', { id: 'lp-ring-text', style: 'font-weight:600;margin:0' }, m.ring.text), h('p', { style: 'margin:.25rem 0 0' }, m.goalLine))),
      h('div', { class: 'lp-row', role: 'group', 'aria-label': 'Daily goal in points' }, ...GOALS.map((g) => h('button', { type: 'button', class: g === m.goal ? 'btn' : 'btn secondary', 'data-goal': String(g), 'aria-pressed': String(g === m.goal),
        onclick: () => { save(store, withGoal(load(store), g)); status.textContent = `Daily goal set to ${g} points.`; render('lp-goal-' + g); }, id: 'lp-goal-' + g }, `${g} points`))));

    // rhythm
    const rh = m.rhythm;
    const rhythmCard = showRhythm ? h('section', { class: 'card', 'aria-labelledby': 'lp-h-rhythm' }, h('h2', { id: 'lp-h-rhythm' }, 'Practice rhythm'),
      h('p', {}, m.rhythmLine), h('p', { class: 'muted' }, `Best run: ${plural(rh.best, 'day', 'days')}. Every 5th practice day earns a rest day (up to 3 banked), used for you on a day off. No cost, no timer.`),
      m.repair.length ? h('button', { type: 'button', class: 'btn', id: 'lp-repair', onclick: () => { save(store, applyRepair(load(store), snap, now())); status.textContent = 'Your earlier run is back. It was free, and you can do this any time.'; render('lp-h-rhythm'); } }, 'Bring my earlier run back (free)') : null) : null;

    // quests
    const questCard = h('section', { class: 'card', 'aria-labelledby': 'lp-h-quests' }, h('h2', { id: 'lp-h-quests' }, 'Small quests'),
      m.quests ? h('div', {}, h('p', {}, m.questLine), h('ul', {}, ...m.questList.map((q) => h('li', { 'data-quest': q.id, 'data-done': String(q.done) },
        `${q.done ? 'Done: ' : ''}${q.text} (${q.have} of ${q.need}) `, h('progress', { max: String(q.need), value: String(q.have), 'aria-label': q.text })))),
        h('p', { class: 'muted' }, 'They change every day, give no prizes and cost nothing to skip.')) : h('p', {}, 'Quests are hidden.'),
      h('button', { type: 'button', class: 'btn secondary', id: 'lp-quests-toggle', onclick: () => { save(store, withQuests(load(store), !m.quests)); status.textContent = m.quests ? 'Quests hidden.' : 'Quests shown.'; render('lp-quests-toggle'); } }, m.quests ? 'Hide quests' : 'Show quests'));

    // week
    const weekCard = h('section', { class: 'card', 'aria-labelledby': 'lp-h-week' }, h('h2', { id: 'lp-h-week' }, 'Your week'), ...m.week.sentences.map((s) => h('p', {}, s)));

    // progress + heatmap
    const cells = m.heat.flat().map((c) => (c ? h('span', { class: 'lp-cell', 'data-level': String(c.level), 'aria-hidden': 'true', title: `${c.iso}: ${c.points} points` }, String(c.level)) : h('span', { class: 'lp-cell', 'data-level': 'none', 'aria-hidden': 'true' })));
    const progressCard = h('section', { class: 'card', 'aria-labelledby': 'lp-h-progress' }, h('h2', { id: 'lp-h-progress' }, 'Your progress'),
      h('ul', {}, h('li', { 'data-stat': 'letters' }, d.letters), h('li', { 'data-stat': 'words' }, d.words), h('li', { 'data-stat': 'minutes' }, d.minutes), h('li', { 'data-stat': 'accuracy' }, d.accuracy)),
      h('p', { class: 'muted' }, 'These are read from your own review cards and lesson records. Reviews and minutes are lower bounds, because a card keeps only its latest review time.'),
      h('h3', { id: 'lp-h-heat' }, 'Calendar'),
      h('p', { id: 'lp-heat-text' }, d.heat),
      h('div', { class: 'lp-heat', 'aria-hidden': 'true' }, ...cells),
      h('p', { class: 'muted' }, 'Level 0 none, 1 some, 2 a practice day, 3 daily goal reached.'),
      h('details', {}, h('summary', {}, 'Show the calendar as a table'),
        h('table', {}, h('caption', {}, 'Points per week, newest first'), h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Week starting'), h('th', { scope: 'col' }, 'Points'), h('th', { scope: 'col' }, 'Practice days'), h('th', { scope: 'col' }, 'Each day (month-day: points)'))),
          h('tbody', {}, ...d.heatRows.map((r) => h('tr', {}, h('th', { scope: 'row' }, r.from), h('td', {}, String(r.points)), h('td', {}, String(r.days)), h('td', {}, r.detail)))))));

    main.replaceChildren(...[goalCard, rhythmCard, questCard, weekCard, badgeHost, progressCard].filter(Boolean));
    renderBadges();
    if (focusId) { const el = root.querySelector ? root.querySelector('#' + focusId) : null; if (el && el.focus) el.focus(); }
  }
  function renderBadges() {
    if (!catalog) { badgeHost.replaceChildren(catalogTried ? h('section', { class: 'card' }, h('h2', {}, 'Badges'), h('p', {}, 'The badge list could not be read right now. Your badges are kept on this device and will show next time.')) : h('section', { class: 'card' }, h('h2', {}, 'Badges'), h('p', { class: 'muted' }, 'Loading badges.'))); return; }
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    const s = settle(store, catalog, now(), { offline });
    if (!s) { badgeHost.replaceChildren(); return; }
    badgeHost.replaceChildren(shelfNode(h, s, { onCopy: async (text) => { status.textContent = (await copyText(text)) ? 'Badge summary copied.' : 'Copying is not available here. The text is in the box above, so you can select and copy it.'; } }));
    const soundOn = !!(ctx && ctx.settings && ctx.settings.get && ctx.settings.get('soundEffects') === true);
    const { node, plan } = newBadgeNode(h, s, { quiet: quietNow(ctx && ctx.settings), soundOn });
    if (node) {
      ensureStyle(globalThis.document); newHost.replaceChildren(node);
      if (plan.sound && ctx && ctx.sfx && typeof ctx.sfx.play === 'function') { try { ctx.sfx.play(plan.sound); } catch { /* no sound is fine */ } }
    }
  }
  render();
  loadCatalog(ctx).then((c) => { catalog = c; catalogTried = true; renderBadges(); }).catch(() => { catalogTried = true; renderBadges(); });
  return () => {};
}
