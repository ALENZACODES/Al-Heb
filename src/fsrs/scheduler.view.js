/**
 * Scheduler preview (#/scheduler), PREVIEW. Shows what the published FSRS-6 formulas (src/fsrs/fsrs6.js) would do: pick the answer to a
 * new card, pick a target recall, and see the days until each next review if every later answer is the same. That preview does NOT
 * change your real reviews (they use src/curriculum/srs.js) and stores nothing; its weights are published defaults. Above it, src/platform/scheduler-live.js
 * shows the live scheduler's real state and offers the on-device fit (H1, H2), which writes store key srs.fit only when a button is pressed.
 * ctx extras for tests: none.
 */
import { el } from '../curriculum/dom.js';
import { onDueDays, intervalsFor } from './fsrs6.js';

export const NOTE = 'The FSRS-6 table below is a preview and explanation only: your real reviews use Aleph\'s own scheduler (shown first, with its real state on this device), nothing here changes them and nothing is saved. The table\'s numbers come from the published default settings of the FSRS-6 method, not from your own review history.';
const NAMES = [['Again', 1], ['Hard', 2], ['Good', 3], ['Easy', 4]];
const TARGETS = [0.8, 0.85, 0.9, 0.95];
const LEN = 8;

/** @param {HTMLElement} root @param {any} ctx @returns {() => void} unmount */
export function mount(root, ctx) {
  const wrap = el('section', { class: 'alef-scheduler', 'aria-labelledby': 'sc-title' });
  const h1 = el('h1', { id: 'sc-title', tabindex: '-1' }, 'How reviews could be spaced');
  const ctl = el('div', { class: 'sc-ctl' }), out = el('div', { class: 'sc-out' });
  const status = el('p', { role: 'status', 'aria-live': 'polite', class: 'sc-status' });
  const live = el('div', { class: 'sc-live-slot' });
  wrap.append(h1, live, el('h2', {}, 'Preview: The FSRS-6 Method'), el('p', { class: 'sc-draft' }, NOTE), ctl, out, status);
  root.append(wrap);
  let alive = true, first = 3, later = 3, target = 0.9;
  // H1 + H2 (lane platform): the live scheduler's state and the on-device fit, loaded on demand.
  import('../platform/scheduler-live.js').then((m) => m.liveSection(ctx, status)).then((sec) => { if (alive) live.replaceChildren(sec); })
    .catch(() => { if (alive) live.replaceChildren(el('p', {}, 'Your own review figures did not load. Open this page again while online.')); });
  const btn = (label, onclick, extra = {}) => el('button', { class: 'btn secondary', type: 'button', style: 'min-height:44px;min-width:44px', onclick, ...extra }, label);
  const group = (id, label, items, cur, set) => el('div', {}, el('p', { id }, label),
    el('div', { role: 'group', 'aria-labelledby': id }, ...items.map(([text, v]) => btn(text, () => { set(v); render(); status.textContent = `${label} ${text}.`; }, { 'aria-pressed': String(cur === v) }))));
  function render() {
    ctl.replaceChildren(
      group('sc-first', 'Your answer the first time you see a card', NAMES, first, (v) => { first = v; }),
      group('sc-later', 'Your answer every later time', NAMES, later, (v) => { later = v; }),
      group('sc-target', 'How much you want to remember when a card comes back', TARGETS.map((t) => [`${Math.round(t * 100)}%`, t]), target, (v) => { target = v; }));
    const rows = onDueDays([first, ...Array(LEN - 1).fill(later)], target);
    const same = intervalsFor(null, 0, target);
    const now = NAMES.map(([n, g]) => `${n}: ${same[g]} day${same[g] === 1 ? '' : 's'}`).join(', ');
    out.replaceChildren(
      el('p', {}, `Right after the first look at a new card, the next review would be in: ${now}.`),
      el('div', { role: 'region', 'aria-label': 'Review schedule table, scrolls sideways on narrow screens', tabindex: '0', style: 'overflow-x:auto;max-width:100%' }, el('table', { class: 'sc-table' }, el('caption', {}, `Each review is made on the day it is due. First answer ${NAMES[first - 1][0]}, then ${NAMES[later - 1][0]} every time.`),
        el('thead', {}, el('tr', {}, ...['Review', 'Gap (days)', 'Next in (days)', 'Stability', 'Difficulty'].map((h) => el('th', { scope: 'col' }, h)))),
        el('tbody', {}, ...rows.map((r, i) => el('tr', {}, el('th', { scope: 'row' }, String(i + 1)), el('td', {}, String(r.gapDays)), el('td', {}, String(r.scheduledDays)), el('td', {}, r.stability.toFixed(1)), el('td', {}, r.difficulty.toFixed(1))))))),
      el('p', {}, 'Gap is the days since the last review. Stability is the number of days after which the chance of remembering has fallen to 90%. Difficulty is a per-card number the method updates after every answer.'));
  }
  render();
  return () => { alive = false; wrap.children = []; if (typeof wrap.remove === 'function') wrap.remove(); else root.replaceChildren?.(); };
}
