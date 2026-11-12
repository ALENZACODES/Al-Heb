// Week Planner: fit the week's errands into the Israeli week. The bank shuts on Friday, buses stop for Shabbat, the
// Shabbat meal is on Friday night. Each day has room for only so much, and a choice that leaves a later errand with
// no day at all does not count: plan ahead.
import { mountArcade } from './arcade.js';
import { pick, sample, stripPoints, DAY_KEYS, DAY_EN } from './g4-core.js';
import { begin, withBank, host, heItem, heText, grade, draftNote, numberKeys } from './g4-ui.js';

export const STORE_KEY = 'games.g4-week.v1';
const WEEKDAYS = [0, 1, 2, 3, 4];
/** Errands: English task, a Hebrew word for the place or thing, the days it can happen, and why. */
export const ERRANDS = Object.freeze([
  { id: 'bank', en: 'Sign papers at the bank', key: 's.bank', days: WEEKDAYS, why: 'Banks open Sunday to Thursday.' },
  { id: 'post', en: 'Send a parcel', key: 's.post', days: [0, 1, 2, 3, 4, 5], why: 'The post office opens Sunday to Friday morning.' },
  { id: 'dinner', en: 'Shabbat dinner at friends', key: 'day.fri', days: [5], why: 'The Shabbat meal is on Friday evening.' },
  { id: 'bus', en: 'Bus trip to the north', key: 's.bus', days: [0, 1, 2, 3, 4, 5], why: 'Most buses do not run on Shabbat.' },
  { id: 'bread', en: 'Buy bread for Shabbat', key: 's.bakery', days: [4, 5], why: 'Bread for Shabbat is bought on Thursday or Friday.' },
  { id: 'beach', en: 'Beach day with friends who are free on Shabbat', key: 's.beach', days: [6], why: 'Your friends are free on Shabbat.' },
  { id: 'doctor', en: 'See the doctor', key: 'ph.doctor', days: WEEKDAYS, why: 'The clinic sees people Sunday to Thursday.' },
  { id: 'market', en: 'Big shop at the market', key: 's.market', days: [0, 1, 2, 3, 4, 5], why: 'The market is shut on Shabbat.' },
  { id: 'meeting', en: 'A work meeting', key: 'p.meeting', days: WEEKDAYS, why: 'The working week is Sunday to Thursday.' },
  { id: 'pharmacy', en: 'Collect a prescription', key: 's.pharmacy', days: [0, 1, 2, 3, 4, 5], why: 'The pharmacy is shut on Shabbat.' },
]);

/** Can the errands all be placed, given what each day already holds? (Small backtracking search.) */
export function feasible(errands, load, cap, blocked = []) {
  if (!errands.length) return true;
  const [e, ...rest] = errands;
  for (const d of e.days) {
    if (blocked.includes(d) || load[d] >= cap) continue;
    load[d] += 1;
    const ok = feasible(rest, load, cap, blocked);
    load[d] -= 1;
    if (ok) return true;
  }
  return false;
}
/** A week to plan: errands, busy days, capacity; always solvable. */
export function makeWeek(count, cap, busy, rnd = Math.random) {
  for (let i = 0; i < 200; i++) {
    const errands = sample(ERRANDS, count, rnd);
    const blocked = sample([0, 1, 2, 3, 4], busy, rnd);
    if (feasible(errands, Array(7).fill(0), cap, blocked)) return { errands, blocked, cap };
  }
  return { errands: ERRANDS.slice(0, 3), blocked: [], cap: 2 };
}
/** Placing errand i on day d: 'closed' (wrong day), 'busy', 'full', 'stuck' (later errands could not fit) or 'ok'. */
export function place(week, load, i, d) {
  const e = week.errands[i];
  if (!e.days.includes(d)) return 'closed';
  if (week.blocked.includes(d)) return 'busy';
  if (load[d] >= week.cap) return 'full';
  const l2 = [...load]; l2[d] += 1;
  return feasible(week.errands.slice(i + 1), l2, week.cap, week.blocked) ? 'ok' : 'stuck';
}

const spec = {
  id: 'g4-week', title: 'Week Planner', titleHe: 'שָׁבוּעַ',
  blurb: 'The Israeli week starts on Sunday. Friday is a short day before Shabbat, and on Shabbat most offices, shops and buses stop. Put each errand on a day it can happen, without leaving a later errand nowhere to go.',
  howTo: ['An errand comes up with the days it can happen. Tap a day of the week (keys 1 to 7, Sunday first).', 'Grey days are taken by work. Each day holds only so many errands.', 'A choice that leaves a later errand with no possible day does not count: look ahead.', 'From level 2 the days are in Hebrew only; level 5 prints them without vowels.'],
  levels: [
    { name: 'Four errands, English days', count: 4, cap: 2, busy: 0, en: true },
    { name: 'Hebrew days', count: 4, cap: 2, busy: 1 },
    { name: 'A busier week', count: 5, cap: 2, busy: 2 },
    { name: 'One errand a day', count: 5, cap: 1, busy: 1 },
    { name: 'Full week, bare days', count: 6, cap: 1, busy: 1, plain: true },
  ],
  par: (l) => 3 * spec.levels[l - 1].count * 10,
  seconds: (l) => 60 + spec.levels[l - 1].count * 30,
  needsWords: false, needsLetters: false,
};

function setup(A) {
  const T = begin(A), cfg = A.cfg, rnd = A.rnd;
  const task = A.h('div', { class: 'g4-scene' }), grid = A.h('div', { class: 'g4-week arc-choices', role: 'group', 'aria-label': 'Days of the week, Sunday first' });
  A.board.replaceChildren(host(A, 'ari', 'Let\'s plan the week before Shabbat sneaks up.'), task, grid, draftNote(A, 'Day words from the app\'s lessons, word lists and calendar (Friday is shown as erev Shabbat). Opening days are the usual pattern; real ones vary.'));
  numberKeys(A, () => grid);
  withBank(A, T, (B) => {
    pick(B, DAY_KEYS, ERRANDS.map((e) => e.key));
    const day = (d) => heText(A, cfg.plain ? stripPoints(B.get(DAY_KEYS[d]).he) : B.get(DAY_KEYS[d]).he);
    let weeks = 0, week = null, load = null, i = 0, placed = null;
    const draw = () => {
      const e = week.errands[i];
      if (!e) task.replaceChildren(A.h('p', { class: 'arc-prompt' }, `Week ${weeks} of 3: all planned.`));
      else task.replaceChildren(A.h('p', { class: 'arc-prompt' }, `Week ${weeks} of 3 · errand ${i + 1} of ${week.errands.length}${week.cap === 1 ? ' · one errand a day' : ' · two errands a day'}`),
        A.h('p', {}, A.h('strong', {}, e.en), ' ', heItem(A, B.get(e.key))),
        A.h('p', { class: 'g4-chips' }, 'Can be done on: ', ...e.days.map((d) => A.h('span', { class: 'g4-chip' }, day(d)))),
        A.h('p', { class: 'muted' }, e.why));
      grid.replaceChildren(...DAY_KEYS.map((_, d) => {
        const busy = week.blocked.includes(d);
        return A.h('button', { type: 'button', class: 'g4-day', onclick: () => choose(d), 'aria-label': `${DAY_EN[d]}${busy ? ', busy with work' : ''}, ${placed[d].length} planned` },
          day(d), cfg.en ? A.h('small', { lang: 'en' }, DAY_EN[d]) : null, busy ? A.h('small', {}, 'work') : null,
          ...placed[d].map((x) => A.h('small', { lang: 'en' }, '• ' + x.en.split(' ').slice(0, 3).join(' '))));
      }));
    };
    const choose = (d) => {
      const res = place(week, load, i, d);
      const msg = { closed: `Not on that day: ${week.errands[i].why}`, busy: 'You are at work all that day.', full: 'That day is already full.', stuck: 'That fits, but then a later errand would have no day left. Look ahead.' };
      if (!grade(A, res === 'ok', { right: `Planned for ${DAY_EN[d]}.`, wrong: msg[res] })) return;
      load[d] += 1; placed[d].push(week.errands[i]); i += 1;
      if (i >= week.errands.length) { draw(); for (const b of grid.querySelectorAll('button')) b.disabled = true; A.announce('Week planned!'); T.later(900, next); return; }
      draw();
    };
    const next = () => {
      if (weeks >= 3) { T.end({ won: true }); return; }
      weeks += 1; week = makeWeek(cfg.count, cfg.cap, cfg.busy, rnd); load = Array(7).fill(0); i = 0; placed = Array.from({ length: 7 }, () => []);
      draw();
    };
    next();
  });
}

export const mount = mountArcade(spec, setup);
