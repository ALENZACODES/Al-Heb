// Shuk Haggle: ask the price, push it down with the lines Israelis use at the market, and buy before the seller
// loses patience. Friendly moves keep the seller sweet; a rude one ends the deal. Prices are made up for the game.
import { mountArcade } from './arcade.js';
import { pick, sample, clamp } from './g4-core.js';
import { begin, withBank, host, heItem, say, grade, draftNote, numberKeys } from './g4-ui.js';

export const STORE_KEY = 'games.g4-shuk.v1';
export const GOODS = Object.freeze({ 'f.tomato': 12, 'f.cucumber': 10, 'f.olives': 40, 'f.cheese': 60, 'f.fruit': 20, 'f.cabbage': 8, 'f.eggs': 30, 'f.fish': 70 });
/** Moves: the line you say and what it does. */
export const MOVES = Object.freeze({
  ask: { keys: ['m.howmuch', 'm.kilo'], en: 'Ask the price' },
  bit: { keys: ['m.bitexp', 'm.expensive'], en: 'Say it is (a bit) expensive' },
  price: { keys: ['m.makeprice', 'm.bargainnatural', 'm.discount'], en: 'Ask for a better price' },
  two: { keys: ['m.iftwo'], en: 'Offer to take two' },
  taste: { keys: ['m.taste'], en: 'Ask to taste' },
  walk: { keys: ['m.politeno'], en: 'Walk away politely' },
  rude: { keys: ['m.bargainoff'], en: 'Call it robbery' },
  buy: { keys: ['m.illtake'], en: 'Take it' },
});

/** The seller: pure, so the rules are tested. state { asked, price, start, patience, tasted, qty, two }. Returns { state, said, done, bought }. */
export function haggle(st, move, rnd = Math.random) {
  const s = { ...st };
  if (!s.asked && !['ask', 'taste', 'buy'].includes(move)) return { state: { ...s, patience: s.patience - 1 }, said: 'The seller frowns: ask the price first.', done: s.patience - 1 <= 0, bought: false };
  switch (move) {
    case 'ask': s.asked = true; return { state: s, said: `₪${s.price} a kilo.`, done: false };
    case 'taste': if (s.tasted) { s.patience -= 1; return { state: s, said: 'You already tasted. The seller sighs.', done: s.patience <= 0 }; }
      s.tasted = true; s.patience += 1; return { state: s, said: 'You taste it. The seller smiles: good, right?', done: false };
    case 'bit': s.price = Math.max(s.floor, Math.round(s.price * 0.9)); s.patience -= 1; return { state: s, said: `Fine, ₪${s.price}.`, done: s.patience <= 0 };
    case 'price': s.price = Math.max(s.floor, Math.round(s.price * (s.patience >= 2 ? 0.85 : 0.95))); s.patience -= 1; return { state: s, said: `For you, ₪${s.price}.`, done: s.patience <= 0 };
    case 'two': if (s.two) { s.patience -= 1; return { state: s, said: 'Two you said already.', done: s.patience <= 0 }; }
      s.two = true; s.price = Math.max(s.floor, Math.round(s.price * 0.8)); return { state: s, said: `Two kilos? ₪${s.price} each.`, done: false };
    case 'walk': if (s.patience >= 1 && rnd() < 0.6) { s.price = Math.max(s.floor, Math.round(s.price * 0.8)); s.patience = 1; return { state: s, said: `Wait, wait! ₪${s.price}, last price.`, done: false }; }
      return { state: s, said: 'The seller lets you go.', done: true, bought: false };
    case 'rude': s.patience = 0; return { state: s, said: 'The seller turns away. No sale.', done: true, bought: false };
    case 'buy': return { state: s, said: 'Sold!', done: true, bought: true };
    default: return { state: s, said: '', done: false };
  }
}
/** Points for a purchase: more for a bigger saving; taking two when you needed one costs you. */
export function points(st, bought) {
  if (!bought) return 0;
  const saved = (st.start - st.price) / st.start;
  return clamp(Math.round(4 + saved * 40) - (st.two && st.qty === 1 ? 6 : 0), 1, 20);
}

const spec = {
  id: 'g4-shuk', title: 'Shuk Haggle', titleHe: 'שׁוּק',
  blurb: 'At the shuk the first price is an opening move. Ask, say it is a bit expensive, ask for a better price, taste, or walk away politely and see if the seller calls you back. Each push costs patience; rudeness ends the deal.',
  howTo: ['Ask the price first. Then choose what to say (number keys 1 to 8 work too).', 'Each push lowers the price but uses up the seller\'s patience (the hearts on the stall).', 'Tasting adds patience once. Walking away may bring a last price, or may not.', 'Buy before patience runs out. Offering to take two only pays when your list says two.'],
  levels: [
    { name: 'A patient seller, English help', items: 3, patience: 4, en: true },
    { name: 'Hebrew with sounds', items: 3, patience: 3, tr: true },
    { name: 'Hebrew only, mind your manners', items: 4, patience: 3, rude: true },
    { name: 'Buying two', items: 4, patience: 3, rude: true, two: true },
    { name: 'A tough seller', items: 5, patience: 2, rude: true, two: true },
  ],
  par: (l) => spec.levels[l - 1].items * 14,
  seconds: (l) => 60 + spec.levels[l - 1].items * 35,
  needsWords: false, needsLetters: false,
};

function setup(A) {
  const T = begin(A), cfg = A.cfg, rnd = A.rnd;
  const stall = A.h('div', { class: 'g4-scene' }), seller = A.h('p', { 'aria-live': 'polite' }), area = A.h('div', { class: 'arc-choices', role: 'group', 'aria-label': 'What you say' });
  A.board.replaceChildren(host(A, 'ari', 'My list for the shuk. Let\'s bargain!'), stall, seller, area, draftNote(A, 'Lines from the app\'s phrasebook, register ladder and scenarios. Not yet checked by a native speaker. Prices are made up.'));
  numberKeys(A, () => area);
  withBank(A, T, (B) => {
    pick(B, Object.keys(GOODS), Object.values(MOVES).flatMap((m) => m.keys));
    const list = sample(Object.keys(GOODS), cfg.items, rnd).map((k, i) => ({ k, qty: cfg.two && i % 2 === 1 ? 2 : 1 }));
    let i = -1, st = null;
    const meter = () => A.h('span', { 'aria-label': `Patience ${Math.max(0, st.patience)}` }, ' Patience: ', '♥'.repeat(Math.max(0, st.patience)) || 'none');
    const draw = () => {
      const it = list[i];
      stall.replaceChildren(A.h('p', { class: 'arc-prompt' }, `Stall ${i + 1} of ${list.length}: `, heItem(A, B.get(it.k), { en: true }), it.qty === 2 ? ' · your list says two kilos' : ''),
        A.h('p', {}, st.asked ? `Price now: ₪${st.price} a kilo.` : 'Price: not asked yet.', meter()));
      const moves = Object.keys(MOVES).filter((m) => (m !== 'rude' || cfg.rude) && (m !== 'two' || cfg.two));
      area.replaceChildren(...moves.map((m) => {
        const key = MOVES[m].keys[Math.floor(rnd() * MOVES[m].keys.length)];
        return A.h('button', { type: 'button', class: 'arc-choice', onclick: () => act(m, key) }, heItem(A, B.get(key), { tr: !!cfg.tr, en: !!cfg.en }));
      }));
    };
    const act = (m, key) => {
      const out = haggle(st, m, rnd);
      st = out.state; seller.textContent = `Seller: ${out.said}${out.done && !out.bought && st.patience <= 0 && m !== 'rude' ? ' And that is enough haggling: no sale.' : ''}`;
      if (m === 'rude') grade(A, false, { wrong: 'Calling it robbery ends the deal at any stall.' });
      else say(A, B.get(key));
      if (out.done) {
        const pts = points(st, out.bought);
        if (out.bought) grade(A, true, { right: `Bought at ₪${st.price}, down from ₪${st.start}.`, points: pts });
        else if (m !== 'rude') grade(A, false, { wrong: 'No sale here.' });
        area.replaceChildren(); T.later(900, next); return;
      }
      draw();
    };
    const next = () => {
      i += 1;
      if (i >= list.length) { T.end({ won: true }); return; }
      const start = Math.round(GOODS[list[i].k] * (1 + rnd() * 0.3));
      st = { asked: false, price: start, start, floor: Math.round(start * 0.55), patience: cfg.patience, tasted: false, qty: list[i].qty, two: false };
      seller.textContent = 'Seller: Shalom! Everything fresh!';
      draw();
    };
    next();
  });
}

export const mount = mountArcade(spec, setup);
