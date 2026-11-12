// The Budget Menu: read a Hebrew menu and order for each diner, course by course: a main, a drink, sometimes dessert.
// Each diner says what they do not eat ("I'm vegetarian", "I'm vegan") and there is a budget for the whole order.
// From level 4 the menu is printed without vowel points, as menus are. Prices are made up for the game.
import { mountArcade } from './arcade.js';
import { pick, sample, stripPoints } from './g4-core.js';
import { begin, withBank, host, heItem, heText, say, grade, draftNote, buttons, numberKeys } from './g4-ui.js';

export const STORE_KEY = 'games.g4-menu.v1';
const DINERS = 5;
/** The menu: course, price, and what is in it (meat, fish, milk, egg). Vegetarian: no meat or fish. Vegan: none of the four. */
export const MENU = Object.freeze({
  'f.hummus': { course: 'main', price: 32, has: [] }, 'f.falafel': { course: 'main', price: 28, has: [] }, 'f.shakshuka': { course: 'main', price: 42, has: ['egg'] },
  'f.salad': { course: 'main', price: 30, has: [] }, 'f.chicken': { course: 'main', price: 58, has: ['meat'] }, 'f.fish': { course: 'main', price: 64, has: ['fish'] },
  'f.pizza': { course: 'main', price: 45, has: ['milk'] },
  'f.coffee': { course: 'drink', price: 12, has: [] }, 'f.lemonade': { course: 'drink', price: 14, has: [] }, 'f.juice': { course: 'drink', price: 16, has: [] },
  'f.beer': { course: 'drink', price: 28, has: [] }, 'f.wine': { course: 'drink', price: 34, has: [] }, 'f.tea': { course: 'drink', price: 10, has: [] },
  'f.cake': { course: 'dessert', price: 26, has: ['milk', 'egg'] }, 'f.fruit': { course: 'dessert', price: 18, has: [] },
});
export const DIETS = Object.freeze({ any: { key: null, no: [] }, veg: { key: 'r.veg', no: ['meat', 'fish'] }, vegan: { key: 'r.vegan', no: ['meat', 'fish', 'milk', 'egg'] } });
const COURSE_EN = { main: 'a main dish', drink: 'a drink', dessert: 'a dessert' };

export const allowed = (k, diet) => !MENU[k].has.some((x) => DIETS[diet].no.includes(x));
const cheapest = (course, diet) => Math.min(...Object.keys(MENU).filter((k) => MENU[k].course === course && allowed(k, diet)).map((k) => MENU[k].price));
/** Is choosing k for this course right: allowed for the diet, and leaves enough money for the courses still to come? */
export function fits(k, diet, left, rest) {
  if (!allowed(k, diet)) return false;
  return MENU[k].price + rest.reduce((s, c) => s + cheapest(c, diet), 0) <= left;
}
/** A diner: diet, courses, and a budget that is enough but not by much (slack shekels over the cheapest order). */
export function makeDiner(level, rnd = Math.random) {
  const diet = level === 1 ? (rnd() < 0.5 ? 'veg' : 'any') : ['any', 'veg', 'vegan'][Math.floor(rnd() * 3)];
  const courses = level >= 4 ? ['main', 'drink', 'dessert'] : ['main', 'drink'];
  const floor = courses.reduce((s, c) => s + cheapest(c, diet), 0);
  return { diet, courses, budget: floor + [40, 25, 20, 15, 10][level - 1] + Math.floor(rnd() * 3) * 5 };
}

const spec = {
  id: 'g4-menu', title: 'The Budget Menu', titleHe: 'תַּפְרִיט',
  blurb: 'Order for each diner from a Hebrew menu: a main and a drink, later dessert too. Respect what they do not eat and keep the bill within their budget. Menus in Israel are printed without vowel points, so the last levels are too.',
  howTo: ['Read who you are ordering for: their budget and what they say about food.', 'Choose a main, then a drink (then dessert). Tap or press 1 to 7.', 'A choice that breaks the diet, or leaves too little money for the rest, does not count.', 'From level 3 the diner speaks only Hebrew; from level 4 the menu has no vowels.'],
  levels: [
    { name: 'Vegetarian or not', en: true },
    { name: 'A tighter budget', en: true },
    { name: 'They tell you in Hebrew' },
    { name: 'Dessert, bare menu', plain: true },
    { name: 'Tight and bare', plain: true },
  ],
  par: (l) => DINERS * (l >= 4 ? 30 : 20),
  seconds: (l) => (l >= 4 ? 240 : 180),
  needsWords: false, needsLetters: false,
};

function setup(A) {
  const T = begin(A), cfg = A.cfg, rnd = A.rnd;
  const who = A.h('div', { class: 'g4-scene' }), bill = A.h('p', { 'aria-live': 'polite' }), area = A.h('div');
  A.board.replaceChildren(host(A, 'noa', 'Who are we ordering for?'), who, area, bill, draftNote(A, 'Food and diet lines from the app\'s phrasebook, lessons and word list. Not yet checked by a native speaker. Prices are made up.'));
  numberKeys(A, () => area.querySelector('.arc-choices'));
  withBank(A, T, (B) => {
    pick(B, Object.keys(MENU), 'r.veg', 'r.vegan', 'm.menu');
    const name = (k) => (cfg.plain ? heText(A, stripPoints(B.get(k).he)) : heItem(A, B.get(k), { en: !!cfg.en }));
    let n = 0, d = null, left = 0, c = 0, chosen = [];
    const course = () => {
      if (c >= d.courses.length) { say(A, B.get(chosen[0])); T.later(900, next); return; }
      const kind = d.courses[c], rest = d.courses.slice(c + 1);
      bill.textContent = `Left to spend: ₪${left}.${chosen.length ? ' Ordered: ' + chosen.map((k) => B.get(k).en).join(', ') + '.' : ''}`;
      const items = sample(Object.keys(MENU).filter((k) => MENU[k].course === kind), 7, rnd);
      area.replaceChildren(A.h('p', { class: 'arc-prompt' }, `Choose ${COURSE_EN[kind]}: `, heText(A, cfg.plain ? stripPoints(B.get('m.menu').he) : B.get('m.menu').he)),
        buttons(A, items, (k) => A.h('span', {}, name(k), ` ₪${MENU[k].price}`), (k) => {
          const diet = !allowed(k, d.diet), money = !diet && !fits(k, d.diet, left, rest);
          if (!grade(A, !diet && !money, { right: `${B.get(k).en}: good.`, wrong: diet ? `Not for this diner: ${B.get(k).en} has ${MENU[k].has.join(' and ')}.` : `Too dear: that leaves too little for the rest.` })) return false;
          left -= MENU[k].price; chosen.push(k); c += 1; T.later(500, course);
          return true;
        }, { label: COURSE_EN[kind] }));
    };
    const next = () => {
      if (n >= DINERS) { T.end({ won: true }); return; }
      n += 1; d = makeDiner(A.level, rnd); left = d.budget; c = 0; chosen = [];
      const says = DIETS[d.diet].key;
      who.replaceChildren(A.h('p', { class: 'arc-prompt' }, `Diner ${n} of ${DINERS} · budget ₪${d.budget} for ${d.courses.length === 3 ? 'a main, a drink and dessert' : 'a main and a drink'}`),
        says ? A.h('p', {}, 'They say: ', heItem(A, B.get(says), { en: !!cfg.en })) : A.h('p', {}, cfg.en ? 'They eat everything.' : 'They say nothing about food: anything goes.'));
      course();
    };
    next();
  });
}

export const mount = mountArcade(spec, setup);
