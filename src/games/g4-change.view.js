// Exact Change: you run the kiosk till. A customer buys a few things and pays with a note; give the change in shekel
// coins and notes. Exact change scores; the fewest coins and notes scores best. Prices are made up for the game.
import { mountArcade } from './arcade.js';
import { pick, sample, makeChange, total, noteFor, DENOMS, isNote } from './g4-core.js';
import { begin, withBank, host, heItem, heText, say, grade, draftNote, roundKeys } from './g4-ui.js';

export const STORE_KEY = 'games.g4-change.v1';
const ROUNDS = 8;
/** Game prices in whole shekels (not real prices). */
export const GOODS = Object.freeze({ 'f.bread': 7, 'f.milk': 6, 'f.eggs': 12, 'f.cheese': 18, 'f.olives': 15, 'f.tomato': 4, 'f.cucumber': 3, 'f.fruit': 9,
  'f.pita': 2, 'f.hummus': 14, 'f.falafel': 16, 'f.coffee': 12, 'f.cake': 22, 'f.juice': 9, 'f.water': 5, 'f.lemonade': 8 });

/** One sale: items, the price, the note paid with (always more than the price), the change due. */
export function makeSale(count, rnd = Math.random, minNote = 20) {
  for (let i = 0; i < 50; i++) {
    const items = sample(Object.keys(GOODS), count, rnd);
    const price = total(items.map((k) => GOODS[k]));
    const paid = Math.max(minNote, noteFor(price + 1));
    if (paid > price) return { items, price, paid, change: paid - price };
  }
  return { items: ['f.pita'], price: 2, paid: 20, change: 18 };
}

const spec = {
  id: 'g4-change', title: 'Exact Change', titleHe: 'עוֹדֶף',
  blurb: 'Israel uses shekel coins of 1, 2, 5 and 10 and notes of 20, 50, 100 and 200. A customer pays with a note; count out the odef, the change. Exact change scores, and the fewest coins and notes scores best.',
  howTo: ['Read what the customer bought and the note they paid with.', 'Tap coins and notes from the till to make the change. A coin that makes it too much is not taken.', 'Press Give change when it is exact. Backspace takes the last coin back.', 'Levels 3 to 5 have two or three things to add up first.'],
  levels: [
    { name: 'One item, a 20 note', count: 1, note: 20, en: true },
    { name: 'One item, a 50 note', count: 1, note: 50, en: true },
    { name: 'Two items', count: 2, note: 20 },
    { name: 'Three items, bigger notes', count: 3, note: 50 },
    { name: 'Hebrew only, quick', count: 3, note: 100, he: true },
  ],
  par: () => ROUNDS * 10,
  seconds: (l) => (l === 5 ? 120 : 180),
  needsWords: false, needsLetters: false,
};

function setup(A) {
  const T = begin(A), cfg = A.cfg, rnd = A.rnd;
  const sale = A.h('div', { class: 'g4-scene' }), tray = A.h('div', { class: 'g4-tray', 'aria-live': 'polite', 'aria-label': 'Change on the counter' });
  const till = A.h('div', { class: 'g4-tray', role: 'group', 'aria-label': 'Till' }), act = A.h('div', { class: 'row' }), sum = A.h('p', { class: 'arc-prompt' });
  A.board.replaceChildren(host(A, 'ari', 'Count out the change, please.'), sale, sum, tray, till, act, draftNote(A, 'Item names from the app\'s lessons and phrasebook. Prices are made up for the game.'));
  withBank(A, T, (B) => {
    pick(B, Object.keys(GOODS), 'm.change', 'm.shekel');
    let n = 0, s = null, given = [];
    const redraw = () => {
      sum.textContent = (cfg.count === 1 ? `Change due: ₪${s.change}. ` : 'Work out the change. ') + `On the counter: ₪${total(given)}.`;
      tray.replaceChildren(...(given.length ? given.map((v) => A.h('span', { class: 'g4-chip' }, `₪${v}`)) : [A.h('span', { class: 'muted' }, 'nothing yet')]));
    };
    const add = (v) => {
      if (total(given) + v > s.change) { grade(A, false, { wrong: cfg.count === 1 ? `₪${v} would be too much: ₪${s.change - total(given)} left to give.` : `₪${v} would be too much.` }); return; }
      given.push(v); A.sfx('drop'); redraw();
    };
    const giveBtn = A.h('button', { type: 'button', class: 'btn', onclick: () => {
      if (total(given) !== s.change) { A.announce(cfg.count === 1 ? `Not yet: ₪${s.change - total(given)} still to give.` : 'Not yet: the customer is owed more.'); return; }
      const best = makeChange(s.change).length;
      grade(A, true, { right: given.length <= best ? `Exact, and the fewest coins and notes (${best}).` : `Exact. It can be done with ${best} coins and notes.`, points: given.length <= best ? 10 : 6 });
      say(A, B.get('m.change'));
      giveBtn.disabled = true; T.later(700, next);
    } }, 'Give change');
    const undo = A.h('button', { type: 'button', class: 'btn secondary', onclick: () => { given.pop(); redraw(); } }, 'Take back');
    act.replaceChildren(giveBtn, undo);
    roundKeys(A, (k, e) => { if (e?.key === 'Backspace') { undo.click(); return true; } if (k === 'enter') { giveBtn.click(); return true; } return false; });
    const next = () => {
      if (n >= ROUNDS) { T.end({ won: true }); return; }
      n += 1; given = []; giveBtn.disabled = false;
      s = makeSale(cfg.count, rnd, cfg.note);
      sale.replaceChildren(A.h('p', { class: 'arc-prompt' }, `Customer ${n} of ${ROUNDS}`),
        A.h('ul', { class: 'g4-route' }, ...s.items.map((k) => A.h('li', {}, heItem(A, B.get(k), { en: !!cfg.en }), ` ₪${GOODS[k]}`))),
        A.h('p', {}, cfg.count > 1 ? `Add it up, then: ` : '', `paid with a ₪${s.paid} note. `, heText(A, B.get('m.change').he), '?'));
      till.replaceChildren(...DENOMS.filter((v) => v < s.paid).reverse().map((v) => A.h('button', { type: 'button', class: isNote(v) ? 'g4-note' : 'g4-coin', 'aria-label': `${v} shekel ${isNote(v) ? 'note' : 'coin'}`, onclick: () => add(v) }, `₪${v}`)));
      redraw();
    };
    next();
  });
}

export const mount = mountArcade(spec, setup);
