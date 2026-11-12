// Falafel Stand: each customer calls out what goes in the pita, and sometimes what to leave out ("bli", without).
// Fill it exactly: everything asked for, nothing else. From level 4 the order is called once and then you work from memory.
import { mountArcade } from './arcade.js';
import { pick, sample, shuffle, stripPoints } from './g4-core.js';
import { begin, withBank, host, heItem, heText, say, grade, draftNote, numberKeys } from './g4-ui.js';

export const STORE_KEY = 'games.g4-falafel.v1';
const ROUNDS = 6;
export const TOPPINGS = Object.freeze(['f.falafel', 'f.hummus', 'f.salad', 'f.tomato', 'f.cucumber', 'f.cabbage', 'f.egg', 'f.olives']);

/** An order: what goes in, and (from level 3) one thing that must stay out. */
export function makeOrder(size, without, rnd = Math.random) {
  const pickd = sample(TOPPINGS, size + (without ? 1 : 0), rnd);
  return { want: pickd.slice(0, size), not: without ? pickd[size] : null };
}
/** What a tap does: add, already in, asked to leave out, or not ordered. */
export function tapResult(order, inPita, k) {
  if (k === order.not) return 'without';
  if (!order.want.includes(k)) return 'extra';
  return inPita.includes(k) ? 'again' : 'add';
}

const spec = {
  id: 'g4-falafel', title: 'Falafel Stand', titleHe: 'פָלָאפֶל',
  blurb: 'At a falafel stand you say what goes in the pita, and what does not: "bli" means without. Fill each pita exactly as asked. Customers do not wait long.',
  howTo: ['Read the order, then tap each thing to put it in the pita (number keys work too).', 'The pita goes out as soon as everything asked for is in.', 'From level 3 one thing is "bli": leave it out.', 'Levels 4 and 5: the order disappears after a few seconds; level 5 prints it without vowels.'],
  levels: [
    { name: 'Two things, with English', size: 2, en: true },
    { name: 'Three things', size: 3 },
    { name: 'With bli', size: 3, without: true },
    { name: 'From memory', size: 4, without: true, hide: 5000 },
    { name: 'Rush hour', size: 4, without: true, hide: 3500, plain: true },
  ],
  par: (l) => ROUNDS * spec.levels[l - 1].size * 10,
  seconds: (l) => (l >= 4 ? 120 : 150),
  needsWords: false, needsLetters: false,
};

function setup(A) {
  const T = begin(A), cfg = A.cfg, rnd = A.rnd;
  const ticket = A.h('div', { class: 'g4-scene', 'aria-live': 'polite' }), pita = A.h('div', { class: 'g4-pita', 'aria-label': 'In the pita' });
  const stations = A.h('div', { class: 'arc-choices', role: 'group', 'aria-label': 'Toppings' });
  A.board.replaceChildren(host(A, 'ari', 'Next customer! What goes in?'), ticket, pita, stations, draftNote(A, 'Food words from the app\'s phrasebook, lessons and word list. Not yet checked by a native speaker.'));
  numberKeys(A, () => stations);
  withBank(A, T, (B) => {
    pick(B, TOPPINGS, 'f.pita', 'f.without');
    const word = (k, opts = {}) => (cfg.plain ? heText(A, stripPoints(B.get(k).he)) : heItem(A, B.get(k), opts));
    let n = 0, order = null, inPita = [];
    const drawPita = () => pita.replaceChildren(word('f.pita'), ...inPita.map((k) => A.h('span', { class: 'g4-chip' }, word(k))));
    const tap = (k) => {
      if (!order) return;
      const res = tapResult(order, inPita, k);
      if (res === 'again') { A.announce(`${B.get(k).en} is already in.`); return; }
      if (res !== 'add') { grade(A, false, { wrong: res === 'without' ? `They said bli ${B.get(k).en}: without it!` : `Nobody asked for ${B.get(k).en}.` }); return; }
      inPita.push(k); grade(A, true, { right: `${B.get(k).en} in.` }); drawPita();
      if (order.want.every((x) => inPita.includes(x))) { say(A, B.get('f.pita')); A.announce('Served! Next customer.'); order = null; T.later(700, next); }
    };
    stations.replaceChildren(...shuffle(TOPPINGS, rnd).map((k) => A.h('button', { type: 'button', class: 'arc-choice', onclick: () => tap(k) }, word(k, { en: !!cfg.en }))));
    const next = () => {
      if (n >= ROUNDS) { T.end({ won: true }); return; }
      n += 1; inPita = []; drawPita();
      order = makeOrder(cfg.size, cfg.without, rnd);
      const mine = order;
      ticket.replaceChildren(A.h('p', { class: 'arc-prompt' }, `Customer ${n} of ${ROUNDS} wants:`),
        A.h('p', { class: 'g4-chips' }, ...order.want.map((k) => A.h('span', { class: 'g4-chip' }, word(k, { en: !!cfg.en }))),
          order.not ? A.h('span', { class: 'g4-chip g4-no' }, word('f.without'), ' ', word(order.not, { en: !!cfg.en })) : null));
      if (cfg.hide) T.later(cfg.hide, () => { if (order === mine) ticket.replaceChildren(A.h('p', { class: 'arc-prompt' }, `Customer ${n}: the order was called. Fill it from memory.`)); });
    };
    next();
  });
}

export const mount = mountArcade(spec, setup);
