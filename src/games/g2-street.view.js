// Memory Street: every house on the street has a word in its window. Look, then the curtains close: which house had
// the word for "cat"? Level 4 asks for the whole street in order instead.
import { mountArcade } from './arcade.js';
import { pickTopics, deck, shuffle } from './g2-core.js';
import { start, host, grade, draftNote, word, say, orderBoard } from './g2-ui.js';

export const STORE_KEY = 'games.g2-street.v1';
const STREETS = 2;

const spec = {
  id: 'g2-street', title: 'Memory Street', titleHe: 'רְחוֹב',
  blurb: 'Walk down a street where every house shows a word. Remember who lives where; then the curtains close and the questions begin.',
  howTo: ['Study the houses, then press "Close the curtains".', 'Read the clue and tap the house that had that word.', 'Level 4: tap the words in house order, from house 1.', 'More houses, and less help, as the levels climb.'],
  levels: [
    { name: 'Four houses', houses: 4, en: true, tr: true, ask: 'en' },
    { name: 'Five houses', houses: 5, en: true, tr: true, ask: 'en' },
    { name: 'Six houses, Hebrew windows', houses: 6, en: false, tr: true, ask: 'en' },
    { name: 'The street in order', houses: 6, en: false, tr: true, ask: 'order' },
    { name: 'Eight houses, Hebrew clues', houses: 8, en: true, tr: false, ask: 'he' },
  ],
  par: (l, cfg) => STREETS * cfg.houses * 10,
  seconds: () => 180,
  needsWords: false, needsLetters: false,
};

function setup(A) {
  const cfg = A.cfg, rnd = A.rnd;
  const prompt = A.h('p', { class: 'arc-prompt' });
  const clue = A.h('div', { class: 'g2-big' });
  const street = A.h('div', { class: 'g2-houses', role: 'group', 'aria-label': 'Houses' });
  const area = A.h('div');
  const after = A.h('p', { class: 'muted', 'aria-live': 'polite' });
  A.board.replaceChildren(host(A, 'rimon', 'Look closely at every window.'), prompt, clue, street, area, after,
    draftNote(A, 'Words come from the app\'s word lists. A native reader has not checked them yet.'));
  start(A, (D, T) => {
    let s = 0;
    const walk = () => {
      if (s >= STREETS) { T.end({ won: true }); return; }
      s += 1;
      const words = deck(D, pickTopics(D, 3, rnd), cfg.houses, rnd);
      clue.replaceChildren(); after.textContent = '';
      prompt.textContent = `Street ${s} of ${STREETS}: remember the words in the windows.`;
      street.replaceChildren(...words.map((w, i) => A.h('div', { class: 'arc-choice g2-house' }, A.h('small', {}, `House ${i + 1}`), word(A, w, { en: cfg.en, tr: cfg.tr }))));
      const close = A.h('button', { type: 'button', class: 'btn' }, 'Close the curtains');
      close.addEventListener('click', () => (cfg.ask === 'order' ? order(words) : quiz(words)));
      area.replaceChildren(close);
    };
    const quiz = (words) => {
      area.replaceChildren();
      const asks = shuffle(words, rnd);
      let k = 0;
      const houses = words.map((w, i) => {
        const b = A.h('button', { type: 'button', class: 'arc-choice g2-house' }, A.h('small', {}, `House ${i + 1}`), A.h('span', { 'aria-hidden': 'true' }, '?'));
        b.addEventListener('click', () => {
          const cur = asks[k];
          if (!cur || b.disabled) return;
          const ok = w === cur;
          grade(A, ok, { right: `House ${i + 1}: ${w.he} (${w.en}).`, wrong: `Not house ${i + 1}.` });
          if (!ok) { b.classList.add('is-bad'); return; }
          b.disabled = true; b.classList.remove('is-bad'); b.classList.add('is-path');
          b.replaceChildren(A.h('small', {}, `House ${i + 1}`), word(A, w, { en: true }));
          for (const x of houses) x.classList.remove('is-bad');
          say(A, w); k += 1; ask();
        });
        return b;
      });
      street.replaceChildren(...houses);
      const ask = () => {
        if (k >= asks.length) { T.later(700, walk); return; }
        const w = asks[k];
        prompt.textContent = `Question ${k + 1} of ${asks.length}: which house had…`;
        clue.replaceChildren(cfg.ask === 'he' ? word(A, w, {}) : A.h('span', {}, `"${w.en}"`));
      };
      ask();
    };
    const order = (words) => {
      street.replaceChildren(...words.map((w, i) => A.h('div', { class: 'arc-choice g2-house' }, A.h('small', {}, `House ${i + 1}`), A.h('span', { 'aria-hidden': 'true' }, '?'))));
      prompt.textContent = 'Tap the words in house order, from house 1.';
      area.replaceChildren(orderBoard(A, words, {
        rnd, shuffleFn: shuffle, label: 'Words from the windows',
        render: (w, placed) => word(A, w, { en: placed, tr: cfg.tr }),
        onRight: (w, k) => { grade(A, true, { right: `House ${k}: ${w.he} (${w.en}).` }); say(A, w); },
        onWrong: (w) => grade(A, false, { wrong: `${w.he} was not in that house.` }),
        onDone: () => T.later(700, walk),
      }));
    };
    walk();
  });
}

export const mount = mountArcade(spec, setup);
