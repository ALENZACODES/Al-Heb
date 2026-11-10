// Word Builder: the meaning and the sound are given; tap the letters in order to build the Hebrew word.
// Extra letters are mixed in. The "builder" game: right to left, one brick at a time.
import { mountArcade, randInt } from './arcade.js';
import { bareLetters, wordsOfLength, ALPHABET, pickSeeded } from './arcade.model.js';

export const STORE_KEY = 'games.wordbuilder.v1';

const spec = {
  id: 'wordbuilder', title: 'Word Builder', titleHe: 'בּוֹנֶה מִלִּים',
  blurb: 'You get the meaning and the sound. Build the Hebrew word from the loose letters, first letter first. Remember: the first letter goes on the right.',
  howTo: ['Read the English and the sound (for example "shalom").', 'Tap the letters in order. The word grows right to left.', 'Spare letters are mixed in; a wrong tap costs a point.', 'Undo with the ⌫ button. Eight words per round.'],
  levels: [
    { name: '2 to 3 letters, 1 spare', min: 2, max: 3, spare: 1, words: 8, showHe: true },
    { name: '3 letters, 2 spares', min: 3, max: 3, spare: 2, words: 8, showHe: true },
    { name: '3 to 4 letters, no peeking', min: 3, max: 4, spare: 2, words: 8, showHe: false },
    { name: '4 to 5 letters', min: 4, max: 5, spare: 3, words: 8, showHe: false },
    { name: 'Up to 6 letters, 4 spares', min: 4, max: 6, spare: 4, words: 10, showHe: false },
  ],
  par: (l, cfg) => cfg.words * 12,
  seconds: (l, cfg) => 100 + l * 10,
};

function setup(A) {
  const cfg = A.cfg, rnd = A.rnd;
  const bank = wordsOfLength(A.words, cfg.min, cfg.max);
  if (bank.length < cfg.words) { A.announce('Not enough words of this length.'); return; }
  const queue = pickSeeded(bank, cfg.words, rnd);
  let k = 0, word = null, letters = [], built = [], tiles = [];
  const clue = A.h('p', { class: 'arc-prompt' });
  const slots = A.h('div', { class: 'arc-word-slots' });
  const tray = A.h('div', { class: 'arc-choices', role: 'group', 'aria-label': 'Loose letters' });
  const undo = A.h('button', { type: 'button', class: 'btn secondary', 'aria-label': 'Undo last letter', onclick: () => { if (!built.length) return; const t = built.pop(); t.disabled = false; drawSlots(); } }, '⌫');
  A.board.replaceChildren(clue, slots, tray, A.h('div', { class: 'row' }, undo));
  const drawSlots = () => slots.replaceChildren(...letters.map((_, i) => A.h('span', {}, built[i]?.textContent || ' ')));
  const next = () => {
    if (k >= queue.length) { A.finish({ won: true }); return; }
    word = queue[k++]; letters = [...bareLetters(word.he)]; built = [];
    clue.replaceChildren(`${word.en} · "${word.translit}"`, cfg.showHe ? A.h('span', { class: 'muted' }, ' · ', A.heSpan(word.he)) : null, ` · ${k} of ${queue.length}`);
    const spares = pickSeeded(ALPHABET.filter((ch) => !letters.includes(ch)), cfg.spare, rnd);
    tiles = pickSeeded([...letters, ...spares], letters.length + spares.length, rnd).map((ch) => {
      const b = A.h('button', { type: 'button', class: 'arc-choice', lang: 'he', dir: 'rtl' }, ch);
      b.addEventListener('click', () => {
        if (b.disabled) return;
        const want = letters[built.length];
        if (ch === want) { b.disabled = true; built.push(b); A.sfx('tick'); drawSlots(); if (built.length === letters.length) { A.addScore(10 + letters.length * 2); A.sfx('success'); A.announce(`${word.he}: ${word.en}.`); A.sayWord(word); next(); } }
        else { A.addScore(-2); A.sfx('error_soft'); A.miss(); A.announce(`Not yet. Letter ${built.length + 1} of ${letters.length}.`); }
      });
      return b;
    });
    tray.replaceChildren(...tiles);
    drawSlots();
    A.sayWord(word);
  };
  A.setLives(0);
  next();
}

export const mount = mountArcade(spec, setup);
