// The last seven days as a row of marks, Duolingo-style: a flame for a day studied, a candle for Shabbat or a rest day
// (never shown as a miss), a ring for today until it counts, a dot for a day without study. Built from the shared streak
// record (src/curriculum/streak.js weekStrip), so it always agrees with the header flame.
import { h } from './ui.js';
import { weekStrip } from '../curriculum/streak.js';

const SHORT = Object.freeze(['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']);
const LONG = Object.freeze(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);

/** Pure: the seven days with what each one shows and says. */
export function weekModel(raw, now = Date.now(), extraRest) {
  let days;
  try { days = weekStrip(raw, now, extraRest); } catch { return []; }
  return days.map((d, i) => {
    const today = i === days.length - 1;
    const said = d.state === 'done' ? 'studied'
      : d.state === 'frozen' ? (d.restKind === 'shabbat' ? 'Shabbat, a rest day' : d.restKind === 'yomtov' ? 'a festival, a rest day' : 'a rest day')
      : today ? 'today, not counted yet' : 'no study';
    return { date: d.date, state: d.state, short: SHORT[d.weekday] ?? '', spoken: `${today ? 'Today' : LONG[d.weekday] ?? d.date}: ${said}`, today };
  });
}

/** The strip node. Returns null when there is nothing to show. */
export function weekStripNode(raw, { now = Date.now(), extraRest, label = 'Last 7 days' } = {}) {
  const days = weekModel(raw, now, extraRest);
  if (!days.length) return null;
  return h('ol', { class: 'wk-strip', 'aria-label': label },
    ...days.map((d) => h('li', { class: `wk-day is-${d.state}${d.today ? ' is-now' : ''}`, 'data-date': d.date },
      h('span', { class: 'wk-mark', 'aria-hidden': 'true' }),
      h('span', { class: 'wk-name', 'aria-hidden': 'true' }, d.short),
      h('span', { class: 'visually-hidden' }, d.spoken))));
}
