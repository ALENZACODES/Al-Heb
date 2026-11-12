// Jumbled Jars: the letters of a Hanukkah word spilled out of the jar. Tap them back in order, right to left.
// The clue is the English meaning (and, early on, how to say it). Final letters keep their final shape.
import { bareLetters, pickSeeded } from './arcade.model.js';
import { mountHanukkahArcade, spellable } from './hanukkah-shell.js';
import { shuffled } from './engine.js';

export const STORE_KEY = 'games.hanukkah-jumble.v1';

/** Pure: shuffle the letters so the jumble never reads as the word itself (when the word has two different letters). */
export function jumble(letters, rnd = Math.random) {
  if (new Set(letters).size < 2) return [...letters];
  for (let i = 0; i < 20; i++) { const s = shuffled(letters, rnd); if (s.join('') !== letters.join('')) return s; }
  return [...letters].reverse();
}

const spec = {
  id: 'hanukkah-jumble', title: 'Jumbled Jars', titleHe: 'פַּךְ',
  blurb: 'Rimon knocked over the oil jars and the letters spilled out. Put each Hanukkah word back together, right to left.',
  howTo: ['Read the clue: the meaning in English.', 'Tap the letters in order; the first letter goes on the right.', 'Undo takes back the last letter.', 'Eight words a round. A wrong word costs a life.'],
  levels: [
    { name: 'Short words, with how to say it', min: 2, max: 3, translit: true },
    { name: 'Up to four letters, with how to say it', min: 3, max: 4, translit: true },
    { name: 'Four or five letters', min: 4, max: 5, translit: false },
    { name: 'Five or six letters', min: 5, max: 6, translit: false },
    { name: 'The longest words', min: 6, max: 9, translit: false },
  ],
  par: () => 80,
  seconds: (l) => 90 + l * 15,
};

function setup(A, data) {
  const cfg = A.cfg, rnd = A.rnd, h = A.h;
  let pool = spellable(data).filter((w) => { const n = bareLetters(w.he).length; return n >= cfg.min && n <= cfg.max; });
  if (pool.length < 4) pool = spellable(data).filter((w) => bareLetters(w.he).length <= cfg.max);
  const round = pickSeeded(pool, 8, rnd);
  let i = 0, done = false;
  A.setLives(3);
  function next() {
    if (done) return;
    if (i >= round.length) { done = true; A.finish({ won: true }); return; }
    const w = round[i++];
    const target = [...bareLetters(w.he)];
    const tiles = jumble(target, rnd).map((ch, k) => ({ ch, k }));
    const built = [];
    const slots = h('div', { class: 'hk-slots', 'aria-label': 'Your word so far', role: 'status', 'aria-live': 'off' });
    const keys = h('div', { class: 'hk-keys', role: 'group', 'aria-label': 'Spilled letters' });
    const paint = () => {
      slots.replaceChildren(...target.map((_, k) => h('span', { lang: 'he' }, built[k]?.ch || ' ')));
      slots.setAttribute('aria-label', built.length ? `Your word so far: ${built.map((t) => t.ch).join('')}` : 'Your word so far: empty');
      keys.replaceChildren(...tiles.map((t) => h('button', { type: 'button', class: 'btn secondary', lang: 'he', disabled: built.includes(t) || undefined, 'aria-label': `Letter ${t.ch}`, onclick: () => add(t) }, t.ch)));
    };
    function add(t) {
      if (done || built.includes(t)) return;
      built.push(t); A.sfx('click'); paint();
      if (built.length < target.length) { try { keys.querySelector('button:not([disabled])')?.focus?.(); } catch { /* ignore */ } return; }
      if (built.map((x) => x.ch).join('') === target.join('')) {
        A.addScore(10); A.sfx('success'); A.sayWord(w);
        A.announce(`Yes: ${w.translit}, ${w.en}.`);
        A.board.querySelector('.hk-solved')?.replaceChildren(A.heSpan(w.he, 'he hk-he'), ` ${w.translit} · ${w.en}`);
        setTimeout(next, A.quiet ? 300 : 900);
      } else {
        A.sfx('miss'); A.announce(`Not quite. It is ${target.join('')}, ${w.translit}.`);
        if (A.miss()) { done = true; return; }
        built.length = 0; setTimeout(() => { if (!done) paint(); }, A.quiet ? 0 : 700);
      }
    }
    const undo = h('button', { type: 'button', class: 'btn secondary', onclick: () => { built.pop(); paint(); } }, 'Undo');
    A.board.replaceChildren(
      h('p', { class: 'arc-prompt' }, `Jar ${i} of ${round.length}: `, h('strong', {}, w.en), cfg.translit ? ` (say it: ${w.translit})` : ''),
      slots, keys, h('div', { class: 'hk-row' }, undo), h('p', { class: 'hk-solved' }));
    paint();
    try { keys.querySelector('button')?.focus?.(); } catch { /* ignore */ }
  }
  next();
}

export const mount = mountHanukkahArcade(spec, setup);
