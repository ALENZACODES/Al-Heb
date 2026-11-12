// Clue After Clue: one of the cards is the secret word. Clues arrive one at a time: its topic, its length, its first
// letter, its gender, its last letter, and last of all its meaning. Guess as early as you dare; an early guess is worth more.
// At level 5 the meaning never comes: the other clues are enough.
import { mountArcade } from './arcade.js';
import { clueBoard } from './g2-core.js';
import { start, host, grade, draftNote, word, say, he } from './g2-ui.js';

export const STORE_KEY = 'games.g2-clues.v1';
const ROUNDS = 6;

const spec = {
  id: 'g2-clues', title: 'Clue After Clue', titleHe: 'רֶמֶז',
  blurb: 'One card hides the secret word. Ask for clues one by one and tap the card as soon as you are sure: the fewer clues, the more points.',
  howTo: ['Press "Next clue" to see another clue.', 'Tap the card you think is the secret word. A wrong card is a miss and turns over.', 'Points: 20 with one clue, 4 fewer for each extra clue.', 'Level 5 never gives the meaning; the other clues settle it.'],
  levels: [
    { name: 'Six cards, with English', cards: 6, en: true, tr: true, meaning: true },
    { name: 'Nine cards', cards: 9, en: false, tr: true, meaning: true },
    { name: 'Nine cards, Hebrew only', cards: 9, en: false, tr: false, meaning: true },
    { name: 'Twelve cards', cards: 12, en: false, tr: false, meaning: true },
    { name: 'No meaning clue', cards: 9, en: false, tr: true, meaning: false },
  ],
  par: () => ROUNDS * 12,
  seconds: () => 180,
  needsWords: false, needsLetters: false,
};

function setup(A) {
  const cfg = A.cfg, rnd = A.rnd;
  const prompt = A.h('p', { class: 'arc-prompt' });
  const clueList = A.h('ol', { class: 'g2-clues', 'aria-label': 'Clues so far', 'aria-live': 'polite' });
  const nextClue = A.h('button', { type: 'button', class: 'btn secondary' }, 'Next clue');
  const grid = A.h('div', { class: 'g2-grid', role: 'group', 'aria-label': 'Cards', style: 'grid-template-columns:repeat(3,auto)' });
  const after = A.h('p', { class: 'muted', 'aria-live': 'polite' });
  A.board.replaceChildren(host(A, 'ari', 'I am thinking of one of these words…'), prompt, clueList, A.h('div', { class: 'g2-row' }, nextClue), grid, after,
    draftNote(A, 'Words, topics and genders come from the app\'s word lists. A native reader has not checked them yet.'));
  start(A, (D, T) => {
    let n = 0, board = null, shown = 0;
    const showClues = () => {
      clueList.replaceChildren(...board.clues.slice(0, shown).map((c) => A.h('li', {}, c.text, c.he ? ' ' : null, c.he ? he(A, c.he) : null)));
      nextClue.disabled = shown >= board.clues.length;
    };
    nextClue.addEventListener('click', () => { if (board && shown < board.clues.length) { shown += 1; showClues(); } });
    const next = () => {
      after.textContent = '';
      if (n >= ROUNDS) { T.end({ won: true }); return; }
      n += 1; shown = 1;
      board = clueBoard(D, cfg.cards, rnd, { meaning: cfg.meaning });
      prompt.textContent = `Word ${n} of ${ROUNDS}: which card is it?`;
      showClues();
      const t = board.target;
      grid.replaceChildren(...board.cards.map((w) => {
        const b = A.h('button', { type: 'button', class: 'arc-choice' }, word(A, w, { en: cfg.en, tr: cfg.tr }));
        b.addEventListener('click', () => {
          if (b.disabled) return;
          const ok = w === t;
          grade(A, ok, { points: Math.max(4, 20 - 4 * (shown - 1)), right: `Yes: ${t.he} (${t.en}), found with ${shown} clue${shown === 1 ? '' : 's'}.`, wrong: `Not ${w.he} (${w.en}).` });
          if (!ok) { b.classList.add('is-bad'); b.disabled = true; return; }
          for (const x of grid.querySelectorAll('button')) x.disabled = true;
          nextClue.disabled = true; say(A, t);
          after.textContent = `${t.he}${t.tr ? ` (${t.tr})` : ''} = ${t.en}`;
          T.later(1100, next);
        });
        return b;
      }));
    };
    next();
  });
}

export const mount = mountArcade(spec, setup);
