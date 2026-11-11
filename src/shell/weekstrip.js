// The last seven days as a row of marks, Duolingo-style: a flame for a day studied, a candle for Shabbat or a rest day
// (never shown as a miss), a ring for today until it counts, a dot for a day without study. Built from the shared streak
// record through src/lib/counts.js weekDays, the one week-dot model Home, the Morning Verse and Progress share (M-01).
import { h } from './ui.js';
import { weekDays } from '../lib/counts.js';

const SHORT = Object.freeze(['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']);
const LONG = Object.freeze(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);

/** Pure: the seven days with what each one shows and says. */
export function weekModel(raw, now = Date.now(), extraRest, ret) {
  let days;
  try { days = weekDays(raw, ret, now, extraRest); } catch { return []; }
  return days.map((d, i) => {
    const today = i === days.length - 1;
    const state = d.state === 'freeze' || d.state === 'travel' || d.state === 'rest' ? 'frozen' : d.state;
    const said = state === 'done' ? 'studied'
      : d.state === 'freeze' ? 'covered by a streak freeze' : d.state === 'travel' ? 'a travel day'
      : state === 'frozen' ? (d.restKind === 'shabbat' ? 'Shabbat, a rest day' : d.restKind === 'yomtov' ? 'a festival, a rest day' : 'a rest day')
      : today ? 'today, not counted yet' : 'no study';
    return { date: d.date, state, short: SHORT[d.weekday] ?? '', spoken: `${today ? 'Today' : LONG[d.weekday] ?? d.date}: ${said}`, today };
  });
}

/** The strip node. Returns null when there is nothing to show. */
export function weekStripNode(raw, { now = Date.now(), extraRest, ret, label = 'Last 7 days' } = {}) {
  const days = weekModel(raw, now, extraRest, ret);
  if (!days.length) return null;
  return h('ol', { class: 'wk-strip', 'aria-label': label },
    ...days.map((d) => h('li', { class: `wk-day is-${d.state}${d.today ? ' is-now' : ''}`, 'data-date': d.date },
      h('span', { class: 'wk-mark', 'aria-hidden': 'true' }),
      h('span', { class: 'wk-name', 'aria-hidden': 'true' }, d.short),
      h('span', { class: 'visually-hidden' }, d.spoken))));
}
