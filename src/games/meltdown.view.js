// Meltdown: a word-guessing game. Noa holds an ice pop on a hot Tel Aviv day. Guess the letters of the
// hidden word; every wrong letter melts the pop one step. Save it before it drips away.
import { mountArcade, randInt } from './arcade.js';
import { bareLetters, wordsOfLength, ALPHABET, pickSeeded } from './arcade.model.js';

export const STORE_KEY = 'games.meltdown.v1';

const STAGES = ['🍧', '🍧', '🍨', '🍨', '💧', '💧', '🫗'];

const spec = {
  id: 'meltdown', title: 'Meltdown', titleHe: 'הַקַּרְטִיב נָמֵס',
  blurb: 'Noa has an ice pop and it is hot. A Hebrew word hides behind the dashes; guess its letters. Each wrong letter melts the pop a step. The meaning is your clue.',
  howTo: ['Read the meaning (and the sound, on easy levels).', 'Tap a letter on the keyboard. Right letters fill the dashes, right to left.', 'Wrong letters melt the ice pop. Six wrong and it is a puddle.', 'Five words per round. Letters you already tried go grey.'],
  levels: [
    { name: 'Short words, with sound', min: 2, max: 3, words: 5, hint: true, melt: 6 },
    { name: '3 to 4 letters, with sound', min: 3, max: 4, words: 5, hint: true, melt: 6 },
    { name: '3 to 4 letters, meaning only', min: 3, max: 4, words: 5, hint: false, melt: 6 },
    { name: '4 to 5 letters', min: 4, max: 5, words: 6, hint: false, melt: 5 },
    { name: 'Long words, fast melt', min: 5, max: 7, words: 6, hint: false, melt: 4 },
  ],
  par: (l, cfg) => cfg.words * 20,
  seconds: (l, cfg) => 150,
};

function setup(A) {
  const cfg = A.cfg, rnd = A.rnd;
  const bank = wordsOfLength(A.words, cfg.min, cfg.max);
  if (bank.length < cfg.words) { A.announce('Not enough words of this length.'); return; }
  const queue = pickSeeded(bank, cfg.words, rnd);
  let k = 0, word = null, letters = [], found = new Set(), wrong = 0;
  const ice = A.h('div', { class: 'arc-ice', 'aria-hidden': 'true' });
  const host = A.h('div', { class: 'arc-host' }, A.cast('noa-icepop', 'Noa holding an ice pop'), ice);
  const clue = A.h('p', { class: 'arc-prompt' });
  const dashes = A.h('div', { class: 'arc-word-slots', 'aria-label': 'The hidden word' });
  const melt = A.h('p', { class: 'muted arc-prompt', role: 'status' });
  const keys = A.h('div', { class: 'arc-keyboard', role: 'group', 'aria-label': 'Letters' });
  A.board.replaceChildren(host, clue, dashes, melt, keys);
  const drawWord = () => dashes.replaceChildren(...letters.map((ch) => A.h('span', {}, found.has(ch) ? ch : ' ')));
  const drawIce = () => { ice.textContent = STAGES[Math.min(STAGES.length - 1, Math.round((wrong / cfg.melt) * (STAGES.length - 1)))]; melt.textContent = `${cfg.melt - wrong} wrong guess${cfg.melt - wrong === 1 ? '' : 'es'} left before the pop melts.`; };
  const next = () => {
    if (k >= queue.length) { A.finish({ won: true }); return; }
    word = queue[k++]; letters = [...bareLetters(word.he)]; found = new Set(); wrong = 0;
    clue.replaceChildren(`${word.en}${cfg.hint ? ` · sounds like "${word.translit}"` : ''} · word ${k} of ${queue.length}`);
    const rows = [ALPHABET.slice(0, 8), ALPHABET.slice(8, 15), ALPHABET.slice(15)];
    keys.replaceChildren(...rows.map((row) => A.h('div', { class: 'arc-keyrow' }, ...row.map((ch) => A.h('button', { type: 'button', class: 'arc-key', lang: 'he', dir: 'rtl', onclick: (e) => guess(ch, e.currentTarget) }, ch)))));
    drawWord(); drawIce();
    if (cfg.hint) A.sayWord(word);
  };
  const guess = (ch, btn) => {
    if (btn.disabled) return;
    btn.disabled = true;
    if (letters.includes(ch)) {
      found.add(ch); btn.classList.add('is-good'); A.sfx('tick'); drawWord();
      if (letters.every((l) => found.has(l))) { const pts = 10 + (cfg.melt - wrong) * 3; A.addScore(pts); A.sfx('success'); A.announce(`${word.he}, ${word.en}. Saved with ${cfg.melt - wrong} to spare.`); A.sayWord(word); next(); }
    } else {
      wrong++; btn.classList.add('is-bad'); A.sfx('miss'); A.miss(); drawIce();
      if (wrong >= cfg.melt) { A.announce(`Melted. The word was ${word.he}, ${word.en}.`); A.addScore(-5); for (const l of letters) found.add(l); drawWord(); setTimeout(next, A.quiet ? 0 : 900); }
    }
  };
  A.keys((k2, e) => { if (/^[א-ת]$/.test(e.key)) { const b = [...keys.querySelectorAll('button')].find((x) => x.textContent === e.key); if (b) { b.click(); return true; } } return false; });
  A.setLives(0);
  next();
}

export const mount = mountArcade(spec, setup);
