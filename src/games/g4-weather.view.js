// Pack for the Weather: read a Hebrew forecast (hot, rain, wind, snow...), then decide item by item: pack it or leave it.
// Weather and clothing words come from the weather and beach lessons and the word list.
import { mountArcade } from './arcade.js';
import { pick, sample, shuffle, stripPoints } from './g4-core.js';
import { begin, withBank, host, heItem, heText, say, grade, draftNote, roundKeys } from './g4-ui.js';

export const STORE_KEY = 'games.g4-weather.v1';
const ROUNDS = 6;
/** What each kind of weather calls for. */
export const NEEDS = Object.freeze({
  'w.hot': ['w.hat', 'w.water'], 'w.sun': ['w.hat'], 'w.cold': ['w.coat', 'w.sweater'], 'w.rain': ['w.coat'],
  'w.snow': ['w.coat', 'w.glove', 'w.scarf'], 'w.wind': ['w.scarf'], 'w.humid': ['w.water'], 'w.sea': ['w.towel'],
});
export const ITEMS = Object.freeze(['w.hat', 'w.water', 'w.coat', 'w.sweater', 'w.glove', 'w.scarf', 'w.towel']);
/** Weather that can share a day without contradicting itself. */
const DAYS = [['w.hot', 'w.sun'], ['w.hot', 'w.humid'], ['w.cold', 'w.rain'], ['w.cold', 'w.wind'], ['w.snow', 'w.cold'], ['w.sun', 'w.sea'], ['w.rain', 'w.wind'], ['w.hot', 'w.sea'], ['w.sun'], ['w.rain'], ['w.cold'], ['w.wind']];
const TEMP = { 'w.hot': [30, 38], 'w.cold': [3, 11], 'w.snow': [-2, 2], 'w.sun': [22, 29], 'w.rain': [9, 16], 'w.wind': [12, 18], 'w.humid': [28, 33], 'w.sea': [27, 32] };

/** Everything the forecast calls for. */
export const packList = (days) => [...new Set(days.flat().flatMap((w) => NEEDS[w] || []))];
/** A forecast of n days (each day one or two kinds of weather) with a temperature that fits. */
export function forecast(nDays, perDay, rnd = Math.random) {
  return sample(DAYS.filter((d) => d.length <= perDay), nDays, rnd).map((d) => {
    const lo = Math.max(...d.map((w) => TEMP[w][0])), hi = Math.min(...d.map((w) => TEMP[w][1]));
    return { weather: d, temp: Math.round(lo + rnd() * Math.max(0, hi - lo)) };
  });
}

const spec = {
  id: 'g4-weather', title: 'Pack for the Weather', titleHe: 'מֶזֶג אֲוִיר',
  blurb: 'Israel can be hot and humid on the coast, windy in the hills and snowy on Mount Hermon in the same week. Read the forecast, then pack or leave each thing as it comes past.',
  howTo: ['Read the forecast for the trip.', 'Each thing comes up one at a time: press Pack (or P) if the forecast needs it, Leave (or L) if not.', 'Levels 1 and 2 show the English of the weather; from level 3 the trip is two or three days.', 'Level 5 prints the forecast without vowel points.'],
  levels: [
    { name: 'One kind of weather', days: 1, per: 1, en: true },
    { name: 'Two kinds at once', days: 1, per: 2, en: true },
    { name: 'A two-day trip', days: 2, per: 2 },
    { name: 'Three days', days: 3, per: 2 },
    { name: 'Bare forecast', days: 3, per: 2, plain: true },
  ],
  par: (l) => ROUNDS * ITEMS.length * 10 - (l < 3 ? 60 : 0),
  seconds: (l) => (l >= 4 ? 200 : 160),
  needsWords: false, needsLetters: false,
};

function setup(A) {
  const T = begin(A), cfg = A.cfg, rnd = A.rnd;
  const card = A.h('div', { class: 'g4-scene' }), bag = A.h('p', { class: 'g4-chips', 'aria-live': 'polite' }), area = A.h('div');
  A.board.replaceChildren(host(A, 'noa', 'What do we pack?'), card, area, bag, draftNote(A, 'Weather and clothing words from the app\'s lessons and word lists. Not yet checked by a native speaker.'));
  withBank(A, T, (B) => {
    pick(B, Object.keys(NEEDS), ITEMS, 'w.weather', 'day.today', 'day.tomorrow');
    const w = (k) => heText(A, cfg.plain ? stripPoints(B.get(k).he) : B.get(k).he);
    let n = 0, queue = [], want = [], packed = [];
    const ask = () => {
      if (!queue.length) { T.later(600, next); return; }
      const k = queue.shift();
      const it = B.get(k);
      const decide = (pack) => {
        const need = want.includes(k);
        const ok = grade(A, pack === need, { right: pack ? `Packed: ${it.en}.` : `Left: no ${it.en} needed.`, wrong: need ? `You will want the ${it.en}.` : `No need for the ${it.en}.`, points: 10 });
        if (need) { packed.push(k); bag.replaceChildren('In the bag: ', ...packed.map((x) => A.h('span', { class: 'g4-chip' }, heItem(A, B.get(x))))); }
        if (ok && need) say(A, it);
        ask();
      };
      area.replaceChildren(A.h('p', { class: 'arc-prompt' }, 'Pack this?'), A.h('p', {}, heItem(A, it, { en: true })),
        A.h('div', { class: 'row' }, A.h('button', { type: 'button', class: 'btn', onclick: () => decide(true) }, 'Pack'), A.h('button', { type: 'button', class: 'btn secondary', onclick: () => decide(false) }, 'Leave')));
    };
    roundKeys(A, (k) => { const b = [...area.querySelectorAll('button')]; if (k === 'p' && b[0]) { b[0].click(); return true; } if (k === 'l' && b[1]) { b[1].click(); return true; } return false; });
    const next = () => {
      if (n >= ROUNDS) { T.end({ won: true }); return; }
      n += 1;
      const days = forecast(cfg.days, cfg.per, rnd);
      want = packList(days.map((d) => d.weather)); packed = []; bag.textContent = '';
      queue = shuffle(ITEMS, rnd);
      const dayLabel = (i) => (i === 0 ? w('day.today') : i === 1 ? w('day.tomorrow') : A.h('span', {}, 'Day 3'));
      card.replaceChildren(A.h('p', { class: 'arc-prompt' }, `Trip ${n} of ${ROUNDS}: `, w('w.weather')),
        A.h('table', { class: 'g4-board' }, A.h('tbody', {}, ...days.map((d, i) => A.h('tr', {}, A.h('td', {}, dayLabel(i)),
          A.h('td', {}, ...d.weather.flatMap((x, j) => [j ? ' · ' : '', cfg.en ? heItem(A, B.get(x), { en: true }) : w(x)])), A.h('td', {}, `${d.temp}°`))))));
      ask();
    };
    next();
  });
}

export const mount = mountArcade(spec, setup);
