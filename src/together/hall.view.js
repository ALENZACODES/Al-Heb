// @ts-check
// Study Hall (#/study-hall): the family board (R5), a weekly goal the house shares, what each learner did lately and the
// milestones they have reached (R9), and buddies on other devices (R4). Same device plus files and links; no server.
import { h } from '../shell/ui.js';
import { frame, statusLine } from './ui.js';
import { summaries } from './household.js';
import { board, getGoal, setGoal, goalProgress, activity, achievements, ago, GOAL_CHOICES } from './hall.js';
import { BUDDIES_KEY, buddies } from './buddy.js';

export const COPY = Object.freeze({
  lead: 'Everyone who learns on this device, side by side. These are real people in your home, read from their own profiles here. Nothing is sent anywhere.',
  alone: 'Only one person learns on this device so far. Add a profile for each person and they will all appear here.',
  calm: 'Calm mode is on, so nobody is ranked.',
});

/** @param {HTMLElement} root @param {any} ctx */
export function mount(root, ctx = {}) {
  const s = ctx.storage ?? (() => { try { return globalThis.localStorage; } catch { return null; } })();
  const now = ctx.now ?? Date.now();
  const calm = ctx.settings?.get?.('calmMode') === true;
  const status = statusLine('sh-status');
  const rows = s ? summaries(s, now) : [];
  const ranked = board(rows, { calm });
  const tableEl = h('table', { id: 'sh-board' }, h('caption', {}, 'This week on this device'),
    h('thead', {}, h('tr', {}, ...[calm ? null : 'Place', 'Name', 'XP this week', 'Lessons this week', 'Streak', 'Lessons in all'].filter(Boolean).map((t) => h('th', { scope: 'col' }, t)))),
    h('tbody', {}, ...ranked.map((r) => h('tr', { 'data-row': r.id }, calm ? null : h('td', {}, String(r.place)), h('th', { scope: 'row' }, r.name, r.active ? ' (you)' : ''), h('td', {}, String(r.xpWeek)), h('td', {}, String(r.lessonsWeek)), h('td', {}, r.streak ? `${r.streak} days` : 'none'), h('td', {}, String(r.lessons))))));
  const goalText = h('p', { id: 'sh-goal-text' });
  const goalSel = /** @type {any} */ (h('select', { id: 'sh-goal', onchange: (e) => { setGoal(Number(e.target.value), s); paintGoal(); status.textContent = 'Saved ✓'; } }, ...GOAL_CHOICES.map((g) => h('option', { value: String(g) }, g ? `${g} lessons a week` : 'No shared goal'))));
  function paintGoal() {
    const g = goalProgress(rows, getGoal(s));
    goalSel.value = String(g.goal);
    goalText.textContent = !g.goal ? 'No shared goal is set.' : g.reached ? `Goal reached: ${g.done} of ${g.goal} lessons this week, together.` : `${g.done} of ${g.goal} lessons this week, together. ${g.left} to go.`;
  }
  const feed = activity(rows);
  const ach = achievements(rows);
  let list = []; try { list = buddies(ctx.store?.get?.(BUDDIES_KEY)); } catch { list = []; }
  frame(root, 'Study Hall', h('p', {}, COPY.lead), status,
    rows.length < 2 ? h('p', { id: 'sh-alone' }, COPY.alone, ' ', h('a', { href: '#/profiles' }, 'Profiles')) : null,
    h('section', { 'aria-labelledby': 'sh-board-h' }, h('h2', { id: 'sh-board-h' }, 'Family Board'), calm ? h('p', { class: 'muted' }, COPY.calm) : null, tableEl),
    s ? h('section', { 'aria-labelledby': 'sh-goal-h' }, h('h2', { id: 'sh-goal-h' }, 'Shared Weekly Goal'), goalText, h('label', { class: 'field', for: 'sh-goal' }, 'Our goal', goalSel)) : null,
    h('section', { 'aria-labelledby': 'sh-feed-h' }, h('h2', { id: 'sh-feed-h' }, 'Lately'),
      feed.length ? h('ul', { id: 'sh-feed' }, ...feed.map((a) => h('li', {}, `${a.name} finished lesson ${a.id}, ${ago(a.at, now)}.`))) : h('p', { class: 'muted' }, 'No lessons finished yet.')),
    h('section', { 'aria-labelledby': 'sh-ach-h' }, h('h2', { id: 'sh-ach-h' }, 'Milestones'),
      ach.length ? h('ul', { id: 'sh-ach' }, ...ach.map((a) => h('li', {}, `${a.name}: ${a.lines.join(', ')}.`))) : h('p', { class: 'muted' }, 'Milestones appear here: lessons finished, streaks and awards.')),
    h('section', { 'aria-labelledby': 'sh-buddy-h' }, h('h2', { id: 'sh-buddy-h' }, 'Buddies On Other Devices'),
      list.length ? h('ul', { id: 'sh-buddies' }, ...list.map((b) => h('li', {}, `${b.name}: ${b.latest.streak}-day streak, ${b.latest.lessons} lessons, ${b.latest.lessonsWeek} this week. Sent ${ago(b.latest.at, now)}.`))) : h('p', { class: 'muted' }, 'No buddies yet.'),
      h('p', {}, h('a', { class: 'btn secondary', href: '#/buddy' }, 'Buddy Pairing'))),
    h('p', {}, h('a', { href: '#/profiles' }, 'Profiles'), ' · ', h('a', { href: '#/friend-challenge' }, 'Challenge a friend')));
  if (s) paintGoal();
  return () => {};
}
