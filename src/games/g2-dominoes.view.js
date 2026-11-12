// Opposite Dominoes: the open end of the line shows a word. Play the tile with that word's opposite by tapping the
// matching half; the tile's other half becomes the new open end. At level 5 tiles can lie either way round.
// The opposite pairs are copied from the Antonym Tug-of-War bank (src/games/tugowar.bank.js).
import { mountArcade } from './arcade.js';
import { dominoHand, oppositeMap, shuffle } from './g2-core.js';
import { start, host, grade, draftNote, word, he } from './g2-ui.js';

export const STORE_KEY = 'games.g2-dominoes.v1';
const MOVES = 8;

const spec = {
  id: 'g2-dominoes', title: 'Opposite Dominoes', titleHe: 'הֶפֶךְ',
  blurb: 'Big meets small, hot meets cold. Match each open end with its opposite and keep the domino line growing.',
  howTo: ['Look at the open end of the line.', 'In your hand, tap the half of a tile that is its opposite.', 'The other half of that tile becomes the new open end.', 'A wrong half is a miss. At level 5 the matching half can be on either side.'],
  levels: [
    { name: 'With English', hand: 3, en: true, tr: true },
    { name: 'Transliteration', hand: 3, en: false, tr: true },
    { name: 'Four tiles', hand: 4, en: false, tr: false },
    { name: 'Five tiles', hand: 5, en: false, tr: false },
    { name: 'Tiles either way round', hand: 5, en: false, tr: false, flip: true },
  ],
  par: () => MOVES * 10,
  seconds: () => 150,
  needsWords: false, needsLetters: false,
};

function setup(A) {
  const cfg = A.cfg, rnd = A.rnd;
  const prompt = A.h('p', { class: 'arc-prompt' });
  const line = A.h('ol', { class: 'tg-line', 'aria-label': 'The domino line' });
  const open = A.h('div', { class: 'g2-big' });
  const hand = A.h('div', { class: 'g2-row', role: 'group', 'aria-label': 'Your tiles' });
  const after = A.h('p', { class: 'muted', 'aria-live': 'polite' });
  A.board.replaceChildren(host(A, 'rimon', 'Find the opposite of the open end.'), prompt, line, open, hand, after,
    draftNote(A, 'Opposite pairs from the Antonym Tug-of-War bank. A native reader has not checked them yet.'));
  start(A, (D, T) => {
    const pairs = D.sets.opposites || [];
    const opp = oppositeMap(pairs);
    let n = 0, openWord = shuffle([...opp.values()], rnd)[0].word;
    const show = (w) => word(A, w, { en: cfg.en, tr: cfg.tr });
    const turn = () => {
      if (n >= MOVES) { T.end({ won: true }); return; }
      n += 1;
      prompt.textContent = `Move ${n} of ${MOVES}: tap the opposite of the open end.`;
      open.replaceChildren(A.h('small', {}, 'Open end: '), show(openWord));
      const tiles = dominoHand(pairs, openWord.he, cfg.hand, rnd, cfg.flip);
      hand.replaceChildren(...tiles.map((t) => A.h('div', { class: 'g2-tile', role: 'group', 'aria-label': 'Tile' }, ...t.halves.map((half, i) => {
        const b = A.h('button', { type: 'button', class: 'arc-choice' }, show(half));
        b.addEventListener('click', () => {
          if (b.disabled) return;
          const ok = t.match === i;
          grade(A, ok, { right: `${half.he} (${half.en}) is the opposite of ${openWord.he} (${openWord.en}).`, wrong: `${half.he} means "${half.en}". The opposite of ${openWord.he} is ${opp.get(openWord.he).opp.he}.` });
          if (!ok) { b.classList.add('is-bad'); b.disabled = true; return; }
          const other = t.halves[1 - i];
          line.append(A.h('li', {}, he(A, openWord.he), ' ↔ ', he(A, half.he)));
          after.textContent = `${openWord.he} = ${openWord.en} · ${half.he} = ${half.en}. New open end: ${other.he} (${other.en}).`;
          openWord = other;
          for (const x of hand.querySelectorAll('button')) x.disabled = true;
          T.later(700, turn);
        });
        return b;
      }))));
    };
    turn();
  });
}

export const mount = mountArcade(spec, setup);
