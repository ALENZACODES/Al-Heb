// Letter Twins: concentration. Flip two cards; a pair is a letter and its match
// (its name, its final form, or its sound, by level). Fewest flips wins.
import { mountArcade, randInt } from './arcade.js';
import { pickSeeded, BASE_TO_FINAL } from './arcade.model.js';

export const STORE_KEY = 'games.lettertwins.v1';

const spec = {
  id: 'lettertwins', title: 'Letter Twins', titleHe: 'תְּאוֹמִים',
  blurb: 'Face-down cards. Turn two; if they belong together they stay open. Pairs are a letter and its name, then its final form, then its sound.',
  howTo: ['Tap a card to turn it, then tap a second card.', 'A match stays open and scores. A miss turns both back.', 'Level 1 pairs a letter with its name, level 3 with its final form, level 5 with its sound in English.', 'Clear the board to finish; fewer flips means more stars.'],
  levels: [
    { name: 'Letter + name', pairs: 4, mode: 'name' },
    { name: 'Letter + name, bigger', pairs: 6, mode: 'name' },
    { name: 'Letter + final form', pairs: 5, mode: 'final' },
    { name: 'Letter + sound', pairs: 6, mode: 'sound' },
    { name: 'Mixed, 8 pairs', pairs: 8, mode: 'mixed' },
  ],
  par: (l, cfg) => cfg.pairs * 10,
  seconds: (l, cfg) => 60 + cfg.pairs * 10,
  needsWords: false,
};

function setup(A) {
  const cfg = A.cfg, rnd = A.rnd;
  const base = A.letters.filter((x) => !x.isFinal);
  let picked;
  if (cfg.mode === 'final') picked = pickSeeded(base.filter((x) => BASE_TO_FINAL[x.he]), cfg.pairs, rnd);
  else picked = pickSeeded(base, cfg.pairs, rnd);
  const cards = [];
  picked.forEach((letter, i) => {
    const mode = cfg.mode === 'mixed' ? ['name', 'final', 'sound'][i % 3] : cfg.mode;
    const partner = mode === 'final' && BASE_TO_FINAL[letter.he] ? { text: BASE_TO_FINAL[letter.he], he: true, hint: 'final form' }
      : mode === 'sound' ? { text: letter.sound.split(/[;,(]/)[0].trim() || letter.name, he: false, hint: 'sound' }
        : { text: letter.name, he: false, hint: 'name' };
    cards.push({ pair: i, text: letter.he, he: true, letter }, { pair: i, ...partner, letter });
  });
  const deck = cards.sort(() => rnd() - 0.5);
  let open = [], matched = 0, flips = 0, lock = false;
  const grid = A.h('div', { class: 'arc-choices', role: 'group', 'aria-label': 'Cards' });
  const buttons = deck.map((card, i) => {
    const b = A.h('button', { type: 'button', class: 'arc-choice arc-card', 'aria-label': 'Face-down card', style: 'min-width:4.2rem;min-height:3.6rem' }, '?');
    b.addEventListener('click', () => {
      if (lock || open.includes(i) || b.disabled) return;
      flips++;
      b.replaceChildren(card.he ? A.heSpan(card.text) : card.text); b.setAttribute('aria-label', card.he ? `Hebrew ${card.text}` : card.text);
      open.push(i);
      if (card.he && card.text.length === 1) A.sayLetter(card.letter);
      if (open.length === 2) {
        const [a, c] = open.map((k) => deck[k]);
        if (a.pair === c.pair) {
          matched++; A.addScore(Math.max(4, 12 - Math.floor(flips / cfg.pairs))); A.sfx('success');
          for (const k of open) { buttons[k].disabled = true; buttons[k].classList.add('is-good'); }
          A.announce(`${a.letter.name}: a pair. ${cfg.pairs - matched} to go.`);
          open = [];
          if (matched === cfg.pairs) A.finish({ won: true });
        } else {
          lock = true; A.sfx('miss'); A.miss();
          const delay = A.quiet ? 0 : 700;
          setTimeout(() => { for (const k of open) { buttons[k].textContent = '?'; buttons[k].setAttribute('aria-label', 'Face-down card'); } open = []; lock = false; }, delay);
        }
      }
    });
    grid.append(b);
    return b;
  });
  A.board.replaceChildren(A.h('p', { class: 'arc-prompt' }, `${cfg.pairs} pairs. Find each letter's ${cfg.mode === 'mixed' ? 'name, final form or sound' : cfg.mode === 'final' ? 'final form' : cfg.mode}.`), grid);
}

export const mount = mountArcade(spec, setup);
