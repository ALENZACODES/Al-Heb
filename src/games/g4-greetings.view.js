// Greeting Rush: a moment of the Israeli day appears (a neighbour at 8 a.m., the grocer on Friday afternoon, a sneeze,
// a toast) and you pick what to say, fast. Greetings are the phrasebook's own lines (data/games/g4/bank.json).
import { mountArcade } from './arcade.js';
import { pick, options, sample } from './g4-core.js';
import { begin, withBank, host, heItem, say, grade, numberKeys, buttons, draftNote } from './g4-ui.js';

export const STORE_KEY = 'games.g4-greetings.v1';
const ROUNDS = 10;
const DAYTIME = ['g.morning', 'g.noon', 'g.evening', 'g.night'];

/** Moments: what happens (English), the greeting that fits, the level it joins at, and greetings that would ALSO fit (never offered as wrong). */
export const MOMENTS = Object.freeze([
  { en: 'Sunday, 8 a.m. A neighbour on the stairs.', key: 'g.morning', from: 1 },
  { en: 'Tuesday, 7:30 a.m. The bus driver as you get on.', key: 'g.morning', from: 1 },
  { en: 'Monday, 1 p.m. You walk into the office kitchen.', key: 'g.noon', from: 1 },
  { en: 'Wednesday, 7 p.m. You arrive at a friend\'s dinner.', key: 'g.evening', from: 1 },
  { en: 'Thursday, 11 p.m. Your flatmate is off to bed.', key: 'g.night', from: 1 },
  { en: 'Friday, 2 p.m. Paying at the grocer before Shabbat.', key: 'g.shabbat', from: 2, also: DAYTIME },
  { en: 'Saturday, 9 p.m. Shabbat is over; you meet a friend.', key: 'g.week', from: 2, also: DAYTIME },
  { en: 'Friday, 6 p.m. Guests come in for the Shabbat meal.', key: 'g.shabbat', from: 2, also: [...DAYTIME, 'g.welcomeN'] },
  { en: 'Someone next to you sneezes.', key: 'g.bless', from: 3 },
  { en: 'Your cousin just had a baby.', key: 'g.mazal', from: 3 },
  { en: 'A friend has a job interview tomorrow.', key: 'g.luck', from: 3 },
  { en: 'Everyone raises a glass of wine.', key: 'g.cheers', from: 3, also: [...DAYTIME, 'g.mazal'] },
  { en: 'A friend introduces you to her brother.', key: 'g.nicemeet', from: 3, also: DAYTIME },
  { en: 'One guest arrives at your door.', key: 'g.welcome1', from: 4, also: [...DAYTIME, 'g.nicemeet'] },
  { en: 'A family of five arrives at your door.', key: 'g.welcomeN', from: 4, also: [...DAYTIME, 'g.nicemeet'] },
  { en: 'The first evening of Passover.', key: 'g.chag', from: 4, also: DAYTIME },
  { en: 'Rosh Hashanah, the new year.', key: 'g.newyear', from: 4, also: [...DAYTIME, 'g.chag'] },
  { en: 'The afternoon before Yom Kippur.', key: 'g.sealing', from: 4, also: [...DAYTIME, 'g.newyear', 'g.chag'] },
  { en: 'Leaving a friend you will see again next week.', key: 'g.seeyou', from: 4, also: [...DAYTIME, 'g.week'] },
  { en: 'The cashier hands you your receipt.', key: 'g.thanks', from: 4, also: [...DAYTIME, 'g.seeyou'] },
  { en: 'You bump into someone in a queue.', key: 'g.sorry', from: 5, also: DAYTIME },
]);
/** Every greeting that can be offered as an option. */
export const GREETINGS = Object.freeze([...new Set(MOMENTS.map((m) => m.key))]);

const spec = {
  id: 'g4-greetings', title: 'Greeting Rush', titleHe: 'שָׁלוֹם',
  blurb: 'Israelis greet by the clock and by the calendar: good morning until about noon, Shabbat shalom from Friday afternoon, shavua tov once Shabbat ends. Pick what to say before the moment passes. Quick answers earn a bonus.',
  howTo: ['Read the moment, then tap the greeting or press 1 to 6.', 'Levels 1 and 2 show the English under each greeting; level 3 shows how to say it.', 'Levels 4 and 5 are Hebrew only, with more choices.', 'Answer within three seconds for a speed bonus.'],
  levels: [
    { name: 'Times of day', from: 1, choices: 3, en: true, tr: true },
    { name: 'Shabbat and the week', from: 2, choices: 4, en: true, tr: true },
    { name: 'Wishes and toasts', from: 3, choices: 4, en: false, tr: true },
    { name: 'Guests and holidays', from: 4, choices: 5, en: false, tr: false },
    { name: 'Everything, fast', from: 5, choices: 6, en: false, tr: false },
  ],
  par: () => ROUNDS * 12,
  seconds: (l) => (l === 5 ? 75 : 120),
  needsWords: false, needsLetters: false,
};

/** The moments a level plays: its own new ones first, then earlier ones. */
export function deckFor(level, rnd = Math.random) {
  const pool = MOMENTS.filter((m) => m.from <= level);
  const fresh = pool.filter((m) => m.from === level);
  return [...sample(fresh, Math.min(fresh.length, 5), rnd), ...sample(pool.filter((m) => !fresh.includes(m)), ROUNDS, rnd), ...sample(fresh, ROUNDS, rnd)].slice(0, ROUNDS);
}
/** Wrong options for a moment: greetings that do not also fit. */
export const wrongFor = (m) => GREETINGS.filter((k) => k !== m.key && !(m.also || []).includes(k));
const firstLevel = (k) => Math.min(...MOMENTS.filter((x) => x.key === k).map((x) => x.from));
/** Prefer wrong options the learner has met by this level; fall back to all of them when there are too few. */
export function wrongPool(m, level, need) {
  const all = wrongFor(m), near = all.filter((k) => firstLevel(k) <= Math.max(level, 2));
  return near.length >= need ? near : all;
}

function setup(A) {
  const T = begin(A), cfg = A.cfg, rnd = A.rnd;
  const scene = A.h('div', { class: 'g4-scene' });
  const area = A.h('div');
  A.board.replaceChildren(host(A, 'noa', 'Quick, what do you say?'), scene, area, draftNote(A, 'Greetings from the app\'s phrasebook and lessons. Not yet checked by a native speaker.'));
  numberKeys(A, () => area.querySelector('.arc-choices'));
  withBank(A, T, (B) => {
    const deck = deckFor(A.level, rnd);
    let n = 0, shownAt = 0;
    const next = () => {
      if (n >= deck.length) { T.end({ won: true }); return; }
      const m = deck[n]; n += 1;
      const [ans] = pick(B, m.key);
      scene.replaceChildren(A.h('p', { class: 'arc-prompt' }, `Moment ${n} of ${deck.length}`), A.h('p', {}, A.h('strong', {}, m.en)));
      const opts = options(m.key, wrongPool(m, A.level, cfg.choices - 1), cfg.choices, rnd);
      shownAt = Date.now();
      area.replaceChildren(buttons(A, opts, (k) => heItem(A, B.get(k), { tr: cfg.tr, en: cfg.en }), (k) => {
        const ok = k === m.key;
        const fast = Date.now() - Math.max(shownAt, A.readyAt) < 3000;
        grade(A, ok, { right: `Yes: ${ans.en}.${fast ? ' Quick!' : ''}`, wrong: `Not "${B.get(k).en}" here.`, points: ok && fast ? 14 : 10 });
        if (ok) { say(A, ans); T.later(700, next); }
        return ok;
      }, { label: 'Greetings' }));
    };
    next();
  });
}

export const mount = mountArcade(spec, setup);
