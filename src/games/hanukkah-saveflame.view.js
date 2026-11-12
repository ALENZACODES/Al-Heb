// Save the Flame: guess the Hebrew word one letter at a time before the candle burns down. Each wrong letter burns
// the candle a little; the clue is the English meaning. A letter with a final form opens both (מ opens ם too).
import { bareLetters, pickSeeded, ALPHABET, FINAL_TO_BASE } from './arcade.model.js';
import { mountHanukkahArcade, spellable, clusters } from './hanukkah-shell.js';

export const STORE_KEY = 'games.hanukkah-saveflame.v1';

/** Pure: the base letter for a guess or a word letter (finals fold to their base). */
export const baseOf = (ch) => FINAL_TO_BASE[ch] || ch;
/** Pure: is the word solved with these guessed base letters? */
export const solved = (word, guessed) => [...bareLetters(word)].every((ch) => guessed.has(baseOf(ch)));

const spec = {
  id: 'hanukkah-saveflame', title: 'Save the Flame', titleHe: 'לֶהָבָה',
  blurb: 'A Hanukkah word is hidden letter by letter. Guess its letters before the candle burns down. Every right letter keeps the flame going.',
  howTo: ['Read the clue: what the word means.', 'Tap a letter (or type it on a Hebrew keyboard). Right letters appear in the word, right to left.', 'A wrong letter burns the candle down a little.', 'Solve the words before the candle is gone.'],
  levels: [
    { name: 'Three words, tall candle, with how to say it', words: 3, burns: 8, translit: true },
    { name: 'Three words, with how to say it', words: 3, burns: 7, translit: true },
    { name: 'Four words', words: 4, burns: 6, translit: false },
    { name: 'Four longer words', words: 4, burns: 6, translit: false, min: 4 },
    { name: 'Five words, short candle', words: 5, burns: 5, translit: false, min: 4 },
  ],
  par: (l, cfg) => cfg.words * 15,
  seconds: (l, cfg) => 60 + cfg.words * 30,
};

function setup(A, data) {
  const cfg = A.cfg, rnd = A.rnd, h = A.h;
  const pool = spellable(data).filter((w) => bareLetters(w.he).length >= (cfg.min || 2));
  const round = pickSeeded(pool, cfg.words, rnd);
  let i = 0, done = false, word = null, guessed = new Set(), burns = 0;
  const meter = h('div', { class: 'hk-candle-meter', role: 'img' });
  const flame = h('span', { class: 'hk-flame', 'aria-hidden': 'true', style: 'width:1.4rem;height:1.8rem' });
  const slots = h('div', { class: 'hk-slots', role: 'status', 'aria-live': 'off' });
  const keys = h('div', { class: 'hk-keys', role: 'group', 'aria-label': 'Hebrew letters' });
  const clue = h('p', { class: 'arc-prompt' });
  function paintCandle() {
    const left = Math.max(0, cfg.burns - burns);
    meter.style.height = `${Math.max(0.4, 8 * left / cfg.burns)}rem`;
    meter.setAttribute('aria-label', `Candle: ${left} of ${cfg.burns} left`);
  }
  function paintWord() {
    // pointed clusters revealed when their letter is guessed; blanks otherwise
    const cl = clusters(word.he);
    slots.replaceChildren(...cl.map((c) => h('span', { lang: 'he' }, guessed.has(baseOf([...bareLetters(c)][0])) ? c : ' ')));
    slots.setAttribute('aria-label', 'The word: ' + cl.map((c) => (guessed.has(baseOf([...bareLetters(c)][0])) ? bareLetters(c) : 'blank')).join(', '));
  }
  function guess(ch) {
    if (done || !word || guessed.has(ch)) return;
    guessed.add(ch);
    const btn = keys.querySelector(`[data-l="${ch}"]`);
    if (btn) btn.disabled = true;
    const hit = [...bareLetters(word.he)].some((x) => baseOf(x) === ch);
    if (hit) {
      btn?.classList.add('is-good'); A.sfx('pop'); paintWord();
      if (solved(word.he, guessed)) {
        A.addScore(10 + (cfg.burns - burns) * 2); A.sfx('success'); A.sayWord(word);
        A.announce(`Saved! ${word.translit}: ${word.en}.`);
        slots.replaceChildren(A.heSpan(word.he, 'he hk-he'));
        setTimeout(next, A.quiet ? 400 : 1100);
      } else A.announce(`Yes, ${ch} is in the word.`);
    } else {
      btn?.classList.add('is-bad'); burns++; A.sfx('miss'); paintCandle();
      if (burns >= cfg.burns) {
        A.announce(`The candle burned down. The word was ${word.translit}: ${word.en}.`);
        slots.replaceChildren(A.heSpan(word.he, 'he hk-he'));
        if (A.miss()) { done = true; return; }
        setTimeout(next, A.quiet ? 400 : 1300);
      } else A.announce(`No ${ch}. ${cfg.burns - burns} left on the candle.`);
    }
  }
  function next() {
    if (done) return;
    if (i >= round.length) { done = true; A.finish({ won: true }); return; }
    word = round[i++]; guessed = new Set(); burns = 0;
    clue.replaceChildren(`Word ${i} of ${round.length}: `, h('strong', {}, word.en), cfg.translit ? ` (say it: ${word.translit})` : '');
    keys.replaceChildren(...ALPHABET.map((ch) => h('button', { type: 'button', class: 'btn secondary', 'data-l': ch, lang: 'he', 'aria-label': `Letter ${ch}`, onclick: () => guess(ch) }, ch)));
    paintCandle(); paintWord();
    A.announce(`New word: ${word.en}. ${[...bareLetters(word.he)].length} letters.`);
  }
  A.setLives(2);
  A.keys((k) => { const ch = baseOf(String(k)); if (ALPHABET.includes(ch)) { guess(ch); return true; } return false; });
  A.board.replaceChildren(clue, h('div', { style: 'text-align:center' }, flame, meter), slots, keys);
  next();
}

export const mount = mountHanukkahArcade(spec, setup);
