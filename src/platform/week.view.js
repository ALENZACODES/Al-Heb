// H6 + H7 + J3 My Week (#/my-week) and T10 Year in review (#/my-year): the weekly report (the last 7 days ending today),
// the learner's own weekly goals, and a year retrospective with a shareable picture card drawn on this device.
// Nothing is sent anywhere; Share uses the device's own share sheet when it has one.
import { h } from '../shell/ui.js';
import { readSnapshot } from '../progress/model.js';
import { weeklySummary, weeklySentences } from '../progress/weekly.js';
import { GOALS_KEY, GOAL_CHOICES, GOAL_LABEL, cleanGoals, goalProgress, xpThisWeek, booksThisWeek, cardLines, totalsOf, drawCard, yearSummary, yearCardLines } from './week.js';

function yearModeOf(ctx) {
  if (ctx?.year === true || ctx?.route === 'my-year') return true;
  try { return /(?:^|#)\/my-year(?:\?|$)/.test(String(globalThis.location?.hash || '')); } catch { return false; }
}

export function mount(root, ctx, now = () => Date.now()) {
  const store = ctx?.store;
  const get = (k, f) => { try { return store?.get?.(k, f) ?? f; } catch { return f; } };
  const yearMode = yearModeOf(ctx);
  const status = h('p', { role: 'status', class: 'muted' });
  const body = h('div', {});
  root.append(h('section', { class: 'card', 'aria-labelledby': 'view-title' }, h('h1', { id: 'view-title', tabindex: '-1' }, yearMode ? 'My Year' : 'My Week'), body, status));
  let goals = cleanGoals(get(GOALS_KEY, null));

  function week() {
    const s = store ? readSnapshot(store) : null;
    const t = now();
    const w = s ? weeklySummary(s, t) : null;
    if (!w) return null;
    return { ...w, xp: xpThisWeek(get('retention.v1', null), t), books: booksThisWeek(get('books.v1', null), t), totals: totalsOf(s.completed, get('books.v1', null)) };
  }
  function year() {
    const s = store ? readSnapshot(store) : null;
    const t = now();
    return yearSummary({
      completed: s?.completed || {},
      books: get('books.v1', null),
      retention: get('retention.v1', null),
      vocab: s?.vocab || {},
      cards: s?.cards || {},
      arcade: get('games.arcade.v1', null),
      streak: s?.streak || {},
    }, t);
  }
  function renderYear() {
    const y = year();
    if (!y || y.empty) {
      body.replaceChildren(h('p', {}, 'Your year will show here once there is progress on this device this year.'), h('p', {}, h('a', { href: '#/my-week' }, 'Back to My Week')));
      return;
    }
    const lines = yearCardLines(y);
    const canvas = h('canvas', { width: '1080', height: '1080', class: 'wk-card', role: 'img', 'aria-label': `Shareable card: ${lines.join('. ')}.`, style: 'max-width:100%;height:auto;border-radius:12px' });
    try { const g = canvas.getContext?.('2d'); if (g) drawCard(g, lines, { title: 'Aleph: My Year' }); } catch { /* no canvas: the text above says the same */ }
    const facts = [
      `${y.lessons} lesson${y.lessons === 1 ? '' : 's'} finished`,
      `${y.xp} XP earned`,
      `${y.books} little book${y.books === 1 ? '' : 's'} finished`,
      `${y.wordsAtLeast ? 'At least ' : ''}${y.words} new word${y.words === 1 ? '' : 's'}`,
      y.streakBest ? `Best streak on this device: ${y.streakBest} day${y.streakBest === 1 ? '' : 's'}` : null,
      y.firstLesson ? `First lesson this year: ${y.firstLesson}` : null,
      y.firstBook ? `First little book this year: ${y.firstBook}` : null,
      y.favoriteGame ? `Most-played game on this device: ${y.favoriteGame.title}` : null,
    ].filter(Boolean);
    body.replaceChildren(
      h('p', {}, `${y.year} on this device, ${y.from} to ${y.to}. Every number comes from your own progress. The weekly report still covers seven days.`),
      h('h2', {}, 'This Year'),
      h('ul', {}, ...facts.map((x) => h('li', {}, x))),
      h('h2', {}, 'Share Card'),
      h('p', {}, 'A picture of this year made on this device. Download it or share it yourself; Aleph sends nothing.'),
      canvas,
      h('p', {}, h('button', { type: 'button', class: 'btn', onclick: () => save(canvas, false, true) }, 'Download the picture'), ' ', h('button', { type: 'button', class: 'btn secondary', onclick: () => save(canvas, true, true) }, 'Share')),
      h('p', {}, h('a', { href: '#/my-week' }, 'Back to My Week')));
  }
  function render() {
    if (yearMode) { renderYear(); return; }
    const w = week();
    if (!w) { body.replaceChildren(h('p', {}, 'Your week will show here once there is progress on this device.')); return; }
    const ws = weeklySentences(w);
    const prog = goalProgress(goals, w);
    const select = (key) => {
      const id = `wk-goal-${key}`;
      return h('p', {}, h('label', { for: id }, `Weekly ${GOAL_LABEL[key]} goal `),
        h('select', { id, onchange: (e) => { const v = Number(e.target.value) || null; goals = cleanGoals({ ...goals, [key]: v }); try { store?.set?.(GOALS_KEY, goals); } catch { /* best effort */ } status.textContent = v ? `Weekly ${GOAL_LABEL[key]} goal set to ${v}.` : `No weekly ${GOAL_LABEL[key]} goal.`; render(); } },
          h('option', { value: '', selected: goals[key] ? null : '' }, 'No goal'), ...GOAL_CHOICES[key].map((v) => h('option', { value: String(v), selected: goals[key] === v ? '' : null }, String(v)))));
    };
    const canvas = h('canvas', { width: '1080', height: '1080', class: 'wk-card', role: 'img', 'aria-label': `Shareable card: ${cardLines(w, w.totals).join('. ')}.`, style: 'max-width:100%;height:auto;border-radius:12px' });
    try { const g = canvas.getContext?.('2d'); if (g) drawCard(g, cardLines(w, w.totals)); } catch { /* no canvas: the text above says the same */ }
    body.replaceChildren(
      h('p', {}, `The last 7 days, ${w.from} to ${w.to}. Every number comes from your own progress on this device.`),
      h('h2', {}, 'This Week'),
      h('ul', {}, ...[ws.days, ws.minutes, `${w.lessons} lesson${w.lessons === 1 ? '' : 's'} finished`, `${w.xp} XP earned`, ws.reviews, ws.words, `${w.books} little book${w.books === 1 ? '' : 's'} finished`, ws.reads, ws.streak, ws.rest].filter(Boolean).map((x) => h('li', {}, x))),
      h('h2', {}, 'My Goals'),
      h('p', {}, 'Set your own weekly goals. Aleph does not set them for you, and nothing happens if you miss one.'),
      ...Object.keys(GOAL_CHOICES).map(select),
      prog.length ? h('ul', {}, ...prog.map((p) => h('li', {}, `${GOAL_LABEL[p.key][0].toUpperCase() + GOAL_LABEL[p.key].slice(1)}: ${p.atLeast ? 'at least ' : ''}${p.have} of ${p.goal}${p.done ? ', reached' : ''}.`, p.atLeast ? h('span', { class: 'muted' }, ' Minutes are counted from days that reached the daily goal, so the true number may be higher.') : null))) : h('p', { class: 'muted' }, 'No weekly goals set.'),
      h('p', {}, h('a', { href: '#/my-year' }, 'See your year in review')),
      h('h2', {}, 'Share Card'),
      h('p', {}, 'A picture of this week made on this device. Download it or share it yourself; Aleph sends nothing.'),
      canvas,
      h('p', {}, h('button', { type: 'button', class: 'btn', onclick: () => save(canvas, false) }, 'Download the picture'), ' ', h('button', { type: 'button', class: 'btn secondary', onclick: () => save(canvas, true) }, 'Share')));
  }
  function save(canvas, share, yearCard = false) {
    if (typeof canvas.toBlob !== 'function') { status.textContent = 'This browser cannot make the picture.'; return; }
    canvas.toBlob(async (blob) => {
      if (!blob) { status.textContent = 'The picture could not be made.'; return; }
      const name = yearCard ? `aleph-year-${new Date(now()).getFullYear()}.png` : `aleph-week-${new Date(now()).toISOString().slice(0, 10)}.png`;
      try {
        const file = new File([blob], name, { type: 'image/png' });
        if (share && navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: yearCard ? 'My year in Aleph' : 'My week in Aleph' }); status.textContent = 'Shared.'; return; }
      } catch { /* fall back to a download */ }
      const url = URL.createObjectURL(blob); const a = h('a', { href: url, download: name }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      status.textContent = share ? 'This device has no share sheet for pictures, so the picture was downloaded instead.' : 'Picture downloaded.';
    }, 'image/png');
  }
  render();
  return () => {};
}
