// Scramble: the letters of a word are shuffled; put them back in order. Noa gives the meaning and, on easy
// levels, the sound. A classic anagram game with a shuffle button and a one-letter hint.
import { mountArcade } from './arcade.js';
import { bareLetters, wordsOfLength, pickSeeded } from './arcade.model.js';

export const STORE_KEY = 'games.scramble.v1';

const spec = {
  id: 'scramble', title: 'Scramble', titleHe: 'בִּלְבּוּל',
  blurb: 'The letters of a Hebrew word have been shaken loose. Noa tells you the meaning; you put the letters back in order, first letter on the right.',
  howTo: ['Read the meaning (and the sound on levels 1 and 2).', 'Tap the loose letters in order. Tap a placed letter to send it back.', 'Hint reveals the next letter for a few points. Shuffle rearranges the loose tiles.', 'Eight words per round; longer words as you climb.'],
  levels: [
    { name: '3 letters, with sound', min: 3, max: 3, words: 8, hint: true },
    { name: '3 to 4 letters, with sound', min: 3, max: 4, words: 8, hint: true },
    { name: '4 letters', min: 4, max: 4, words: 8, hint: false },
    { name: '4 to 5 letters', min: 4, max: 5, words: 8, hint: false },
    { name: '5 to 7 letters', min: 5, max: 7, words: 8, hint: false },
  ],
  par: (l, cfg) => cfg.words * 15,
  seconds: (l, cfg) => 120 + l * 15,
};

function setup(A) {
  const cfg = A.cfg, rnd = A.rnd;
  const bank = wordsOfLength(A.words, cfg.min, cfg.max);
  if (bank.length < cfg.words) { A.announce('Not enough words of this length.'); return; }
  const queue = pickSeeded(bank, cfg.words, rnd);
  let k = 0, word = null, letters = [], loose = [], placed = [], hints = 0;
  const host = A.h('div', { class: 'arc-host' }, A.cast('noa-hint', 'Noa'), A.h('p', { class: 'arc-prompt' }));
  const clue = host.lastChild;
  const slots = A.h('div', { class: 'arc-word-slots', 'aria-label': 'Your answer' });
  const tray = A.h('div', { class: 'arc-choices', role: 'group', 'aria-label': 'Loose letters' });
  const actions = A.h('div', { class: 'row' },
    A.h('button', { type: 'button', class: 'btn secondary', onclick: () => { loose = pickSeeded(loose, loose.length, rnd); drawTray(); } }, 'Shuffle'),
    A.h('button', { type: 'button', class: 'btn secondary', onclick: () => hint() }, 'Hint (−4)'));
  A.board.replaceChildren(host, slots, tray, actions);
  const drawSlots = () => slots.replaceChildren(...letters.map((_, i) => A.h('button', { type: 'button', class: 'arc-choice', style: 'min-width:2.4rem;border-bottom:3px solid currentColor;border-radius:6px 6px 0 0', lang: 'he', dir: 'rtl', 'aria-label': placed[i] ? `placed ${placed[i]}, tap to remove` : `empty slot ${i + 1}`, onclick: () => { if (placed[i] !== undefined) { loose.push(placed[i]); placed.splice(i, 1); drawAll(); } } }, placed[i] || ' ')));
  const drawTray = () => tray.replaceChildren(...loose.map((ch, i) => A.h('button', { type: 'button', class: 'arc-choice', lang: 'he', dir: 'rtl', onclick: () => place(i) }, ch)));
  const drawAll = () => { drawSlots(); drawTray(); };
  const next = () => {
    if (k >= queue.length) { A.finish({ won: true }); return; }
    word = queue[k++]; letters = [...bareLetters(word.he)]; placed = []; hints = 0;
    do { loose = pickSeeded(letters, letters.length, rnd); } while (letters.length > 2 && loose.join('') === letters.join(''));
    clue.textContent = `${word.en}${cfg.hint ? ` · "${word.translit}"` : ''} · ${k} of ${queue.length}`;
    if (cfg.hint) A.sayWord(word);
    drawAll();
  };
  const place = (i) => {
    placed.push(loose[i]); loose.splice(i, 1); A.sfx('click_soft'); drawAll();
    if (placed.length === letters.length) {
      if (placed.join('') === letters.join('')) { A.addScore(Math.max(5, 15 - hints * 4)); A.sfx('success'); A.announce(`${word.he}: ${word.en}.`); A.sayWord(word); next(); }
      else { A.addScore(-3); A.sfx('miss'); A.miss(); A.announce('Not the word. Tap letters to send them back.'); }
    }
  };
  const hint = () => { const i = placed.length; if (i >= letters.length) return; const want = letters[i]; const j = loose.indexOf(want); if (j < 0) { A.announce('Remove a wrong letter first.'); return; } hints++; A.addScore(-4); A.announce(`Letter ${i + 1} is ${want}.`); place(j); };
  A.setLives(0);
  next();
}

export const mount = mountArcade(spec, setup);
