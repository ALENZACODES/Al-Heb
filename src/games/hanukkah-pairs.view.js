// Candle Pairs: a memory game. Face-down candles hide Hanukkah words in Hebrew and their meanings in English;
// turn two at a time and keep the pairs that belong together.
import { mountHanukkahArcade, spellable } from './hanukkah-shell.js';
import { pickSeeded } from './arcade.model.js';
import { shuffled } from './engine.js';

export const STORE_KEY = 'games.hanukkah-pairs.v1';

/** Pure: a shuffled deck of 2n cards, each Hebrew card paired with its English card. */
export function buildPairs(words, n, rnd = Math.random) {
  const chosen = pickSeeded(words, n, rnd);
  return shuffled(chosen.flatMap((w, i) => [{ pair: i, side: 'he', word: w }, { pair: i, side: 'en', word: w }]), rnd);
}

const spec = {
  id: 'hanukkah-pairs', title: 'Candle Pairs', titleHe: 'נֵרוֹת',
  blurb: 'Every candle hides a card: a Hanukkah word in Hebrew, or its meaning in English. Turn two candles; if they match, they stay lit.',
  howTo: ['Tap a candle to turn it, then tap a second one.', 'A Hebrew word and its English meaning make a pair and stay lit.', 'A miss turns both back. Remember where they were.', 'Clear the table; fewer turns means more points.'],
  levels: [
    { name: 'Four pairs, with how to say it', pairs: 4, translit: true },
    { name: 'Six pairs, with how to say it', pairs: 6, translit: true },
    { name: 'Six pairs, Hebrew only', pairs: 6, translit: false },
    { name: 'Eight pairs', pairs: 8, translit: false },
    { name: 'Ten pairs', pairs: 10, translit: false },
  ],
  par: (l, cfg) => cfg.pairs * 10,
  seconds: (l, cfg) => 50 + cfg.pairs * 12,
};

function setup(A, data) {
  const cfg = A.cfg, h = A.h;
  const deck = buildPairs(spellable(data), cfg.pairs, A.rnd);
  let open = [], matched = 0, turns = 0, lock = false;
  const grid = h('div', { class: 'arc-choices', role: 'group', 'aria-label': 'Candles' });
  const face = (card) => (card.side === 'he'
    ? h('span', {}, A.heSpan(card.word.he), cfg.translit ? h('span', { class: 'hk-tr', style: 'display:block;font-size:.8rem' }, card.word.translit) : null)
    : h('span', { style: 'font-size:1rem' }, card.word.en));
  const label = (card) => (card.side === 'he' ? `Hebrew: ${card.word.translit}` : `English: ${card.word.en}`);
  const buttons = deck.map((card, i) => {
    const b = h('button', { type: 'button', class: 'arc-choice arc-card', 'aria-label': 'Unlit candle, face down', style: 'min-width:5rem;min-height:4.2rem' }, '\u{1F56F}️');
    b.addEventListener('click', () => {
      if (lock || b.disabled || open.includes(i)) return;
      b.replaceChildren(face(card)); b.setAttribute('aria-label', label(card));
      open.push(i);
      if (card.side === 'he') A.sayWord(card.word);
      if (open.length < 2) return;
      turns++;
      const [x, y] = open.map((k) => deck[k]);
      if (x.pair === y.pair) {
        matched++; A.addScore(Math.max(4, 14 - Math.floor(turns / 2))); A.sfx('success');
        for (const k of open) { buttons[k].disabled = true; buttons[k].classList.add('is-good'); }
        A.announce(`A pair: ${x.word.translit} means ${x.word.en}. ${cfg.pairs - matched} to go.`);
        open = [];
        if (matched === cfg.pairs) A.finish({ won: true });
      } else {
        lock = true; A.sfx('miss'); A.miss();
        A.announce('Not a pair. They turn back.');
        setTimeout(() => { for (const k of open) { buttons[k].replaceChildren('\u{1F56F}️'); buttons[k].setAttribute('aria-label', 'Unlit candle, face down'); } open = []; lock = false; }, A.quiet ? 300 : 900);
      }
    });
    grid.append(b);
    return b;
  });
  A.board.replaceChildren(h('p', { class: 'arc-prompt' }, `${cfg.pairs} pairs. Match each Hebrew word with its meaning.`), grid);
}

export const mount = mountHanukkahArcade(spec, setup);
