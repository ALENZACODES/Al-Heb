// Café Counter: an order card says what you want; the barista or waiter speaks, and you choose your line. The talk
// branches with the card (cake or no cake, card or cash, water or wine) and with the place (counter or table).
// Every line is the app's own: the café and restaurant dialogues, the phrasebook and the register ladder.
import { mountArcade } from './arcade.js';
import { pick, options, sample } from './g4-core.js';
import { begin, withBank, host, heItem, say, grade, numberKeys, buttons, draftNote } from './g4-ui.js';

export const STORE_KEY = 'games.g4-cafe.v1';
const DRINKS = ['c.hafuch', 'c.espresso', 'c.black', 'c.milk', 'c.mint', 'c.coldwater'];
const LINES = ['c.takeaway', 'c.cake', 'c.nothanks', 'c.card', 'c.cash', 'c.receipt', 'r.fortwo', 'r.schnitzel', 'r.veg', 'r.water', 'f.beer', 'f.wine', 'r.bill', ...DRINKS];

/**
 * One customer's order as a list of turns: { them: key of what the server says, want: your right line, card: English for
 * the order card, stiff?: a correct but stiff line also accepted for fewer points }. Branches follow the card.
 */
export function makeOrder(rnd = Math.random, { table = false, tone = false } = {}) {
  const r = () => rnd();
  if (!table) {
    const noa = r() < 0.5, drink = DRINKS[Math.floor(r() * DRINKS.length)], cake = r() < 0.5, card = r() < 0.5;
    const turns = [{ them: noa ? 'c.whatlike' : 'c.help', want: drink, card: null, stiff: !noa && tone && drink === 'c.hafuch' ? 'c.stiff' : null },
      { them: 'c.herego', want: 'c.takeaway' },
      { them: 'c.anything', want: cake ? 'c.cake' : 'c.nothanks' },
      { them: cake ? 'c.price48' : null, want: card ? 'c.card' : 'c.cash' }];
    if (tone) turns.push({ them: 'c.sure', want: 'c.receipt' });
    return { who: noa ? 'noa' : 'ari', place: 'At the counter, to take away', drink, cake, card, turns };
  }
  const veg = r() < 0.5, drink = ['r.water', 'f.beer', 'f.wine'][Math.floor(r() * 3)];
  return { who: 'ari', place: 'At a restaurant table, for two', veg, drink,
    turns: [{ them: 'r.howmany', want: 'r.fortwo' }, { them: 'r.menu', want: veg ? 'r.veg' : 'r.schnitzel' }, { them: 'r.drink', want: drink }, { them: null, want: 'r.bill' }] };
}
/** The order card in English, built from the order. */
export function cardLines(o, B) {
  if (o.turns[0].them === 'r.howmany') return [`Table for two. You are Ari.`, o.veg ? 'You are vegetarian: tell the waiter.' : 'You want the schnitzel and a salad.', `To drink: ${B.get(o.drink).en.replace(/[.,]? ?please\.?$/i, '').toLowerCase()}.`, 'Then ask for the bill.'];
  return [`You are ${o.who === 'noa' ? 'Noa' : 'Ari'}, taking it away.`, `${B.get(o.drink).en}.`, o.cake ? 'A cake too.' : 'Nothing else.', o.card ? 'Pay by card.' : 'Pay in cash.', ...(o.turns.length > 4 ? ['Ask for a receipt.'] : [])];
}

const spec = {
  id: 'g4-cafe', title: 'Café Counter', titleHe: 'קָפֶה',
  blurb: 'An order card tells you what you want. The barista or the waiter talks, you answer. Short and friendly is how Israelis order: "efshar hafuch?" works better than a long speech, and a pushy "yalla, quickly" works worst.',
  howTo: ['Read your order card, then answer each line. Press 1 to 5 or tap.', 'Level 1 shows the English of every answer; level 2 shows how it sounds.', 'Level 3 brings the restaurant table and a rude option to avoid; a stiff but correct line earns fewer points.', 'Levels 4 and 5: Hebrew only; at level 5 the card hides after a few seconds.'],
  levels: [
    { name: 'Coffee to go', table: false, choices: 3, en: true, tr: true },
    { name: 'Counter or table', table: 'mix', choices: 3, tr: true },
    { name: 'Mind your tone', table: 'mix', choices: 4, tone: true },
    { name: 'Hebrew only', table: 'mix', choices: 5, tone: true },
    { name: 'From memory', table: 'mix', choices: 5, tone: true, hide: true },
  ],
  par: () => 4 * 4 * 10,
  seconds: (l) => (l === 5 ? 120 : 180),
  needsWords: false, needsLetters: false,
};

function setup(A) {
  const T = begin(A), cfg = A.cfg, rnd = A.rnd;
  const card = A.h('div', { class: 'g4-scene', 'aria-label': 'Your order card' }), talk = A.h('div'), area = A.h('div');
  A.board.replaceChildren(host(A, 'rimon', 'Your card says what you want. Answer the server.'), card, talk, area,
    draftNote(A, 'Lines from the app\'s café and restaurant dialogues, phrasebook and register ladder. Not yet checked by a native speaker.'));
  numberKeys(A, () => area.querySelector('.arc-choices'));
  withBank(A, T, (B) => {
    pick(B, LINES, 'c.help', 'c.whatlike', 'c.herego', 'c.anything', 'c.price48', 'c.sure', 'c.rude', 'c.stiff', 'r.howmany', 'r.menu', 'r.drink', 'r.moment');
    const orders = Array.from({ length: 4 }, (_, i) => makeOrder(rnd, { table: cfg.table === 'mix' ? i % 2 === 1 : cfg.table, tone: !!cfg.tone }));
    let o = 0, t = 0;
    const show = () => {
      const ord = orders[o];
      card.replaceChildren(A.h('p', { class: 'arc-prompt' }, `Customer ${o + 1} of ${orders.length}: ${ord.place}`), A.h('ul', {}, ...cardLines(ord, B).map((x) => A.h('li', {}, x))));
      if (cfg.hide) T.later(4500, () => { if (orders[o] === ord) card.replaceChildren(A.h('p', { class: 'arc-prompt' }, `Customer ${o + 1}: the card is turned over. Answer from memory.`)); });
    };
    const step = () => {
      if (o >= orders.length) { T.end({ won: true }); return; }
      const ord = orders[o];
      if (t === 0) show();
      if (t >= ord.turns.length) {
        talk.replaceChildren(host(A, ord.who, ord.turns[0].them === 'r.howmany' ? 'Sure, one moment.' : 'Thanks! Done.'), ord.turns[0].them === 'r.howmany' ? heItem(A, B.get('r.moment'), { en: !!cfg.en }) : null);
        o += 1; t = 0; area.replaceChildren(); T.later(900, step); return;
      }
      const turn = ord.turns[t];
      talk.replaceChildren(turn.them ? A.h('p', { class: 'g4-scene' }, A.h('strong', {}, 'They say: '), heItem(A, B.get(turn.them), { tr: !!cfg.tr, en: !!cfg.en })) : A.h('p', { class: 'arc-prompt' }, 'Your turn to speak first.'));
      const twins = ['c.coldwater', 'r.water'];
      const pool = LINES.filter((k) => k !== turn.want && !(twins.includes(k) && twins.includes(turn.want)));
      const extra = [turn.stiff, cfg.tone && t === 0 && !ord.turns[0].them?.startsWith('r.') ? 'c.rude' : null].filter(Boolean);
      const opts = options(turn.want, [...extra, ...sample(pool, 8, rnd)], cfg.choices, rnd);
      if (turn.stiff && !opts.includes(turn.stiff)) opts[opts.findIndex((x) => x !== turn.want)] = turn.stiff;
      area.replaceChildren(buttons(A, opts, (k) => heItem(A, B.get(k), { tr: !!cfg.tr, en: !!cfg.en }), (k) => {
        if (k === turn.stiff) { A.addScore(4); A.announce('Correct, but stiff: Israelis keep it short. "Efshar hafuch?" sounds natural.'); }
        else if (k === 'c.rude') { grade(A, false, { wrong: 'Too pushy: "yalla, quickly" to someone serving you sounds rude.' }); return false; }
        else if (!grade(A, k === turn.want, { right: `Good: ${B.get(k).en}`, wrong: `That says "${B.get(k).en}". Check your card.` })) return false;
        say(A, B.get(turn.want)); t += 1; T.later(600, step);
        return true;
      }, { label: 'What you say' }));
    };
    step();
  });
}

export const mount = mountArcade(spec, setup);
