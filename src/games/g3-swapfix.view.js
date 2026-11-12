// Swap Fix: a real line from the lessons has had words swapped. Tap two words to swap them back, in as few swaps as you
// can. Hebrew word order is close to English (who, does, what) but the adjective follows its noun and the little words
// (to, with, of) stand right before the word they belong to.
import { mountArcade } from './arcade.js';
import { loadG3, shuffle, wordsOf, scramble, swapped } from './g3-core.js';
import { begin, grade, wordLine, heText } from './g3-ui.js';

export const STORE_KEY = 'games.g3-swapfix.v1';
const ROUNDS = 6;
const spec = {
  id: 'g3-swapfix', title: 'Swap Fix', titleHe: 'מִשְׁפָּט',
  blurb: 'Hebrew word order is a lot like English: who, then the action, then the rest. Two things are different: the adjective comes after its noun (coffee big, not big coffee), and a question word starts the question without changing the rest. Each line here is from a lesson, with words swapped. Swap them back.',
  howTo: ['Tap a word, then another: they swap places.', 'Fewer swaps, more points. The English shows what the line should say.', 'Level 4 swaps two pairs, level 5 three, and hides the English.'],
  levels: [
    { name: 'Three words, one swap', len: [3, 3], swaps: 1, en: true },
    { name: 'Four words', len: [4, 4], swaps: 1, en: true },
    { name: 'Longer lines', len: [5, 6], swaps: 1, en: true },
    { name: 'Two swaps', len: [4, 6], swaps: 2, en: true },
    { name: 'Three swaps, no English', len: [4, 6], swaps: 3, en: false },
  ],
  par: () => ROUNDS * 14,
  seconds: () => 210,
  needsWords: false, needsLetters: false,
};
/** Points for a fixed line: 14 at the fewest swaps, two fewer for each extra one, never under 4. */
export const swapPoints = (used, least) => Math.max(4, 14 - 2 * Math.max(0, used - least));

function setup(A) {
  const { T, big, prompt, area } = begin(A, 'ari', 'Swap two words at a time.',
    'Lines from the lessons, units, dialogues and phrasebook. The game asks for the line as the app writes it; another order can be good Hebrew too. Not reviewed by a teacher.');
  const cfg = A.cfg, rnd = A.rnd;
  let lines = [], n = 0;
  const next = () => { if (n >= ROUNDS || !lines.length) { T.end({ won: true }); return; } n += 1; ask(lines[(n - 1) % lines.length]); };
  const ask = (line) => {
    const ws = wordsOf(line.he), want = ws.map((x) => x.w), end = ws[ws.length - 1].p;
    let now = scramble(want, cfg.swaps, rnd), picked = -1, used = 0;
    const draw = () => {
      const row = wordLine(A, now, (i, b) => {
        if (!T.live()) return;
        if (picked < 0) { picked = i; b.classList.add('is-picked'); A.sfx('drop'); return; }
        if (picked === i) { picked = -1; b.classList.remove('is-picked'); return; }
        now = swapped(now, picked, i); picked = -1; used += 1;
        if (now.every((w, k) => w === want[k])) {
          grade(A, true, { right: `${line.he} (${line.en}). ${used} swap${used === 1 ? '' : 's'}.`, points: swapPoints(used, cfg.swaps) });
          big.replaceChildren(heText(A, line.he)); area.replaceChildren(); T.later(900, next);
        } else { A.announce(`${now.join(' ')}${end}: not yet.`); draw(); }
      }, { label: 'Words to swap' });
      area.replaceChildren(row);
    };
    big.textContent = '';
    prompt.textContent = `Line ${n} of ${ROUNDS}${cfg.en ? `: "${line.en}"` : ''}. Tap two words to swap them.`;
    draw();
  };
  loadG3(A.ctx, 'sentences').then((d) => {
    if (!T.live()) return;
    const [lo, hi] = cfg.len;
    lines = shuffle(d.order.filter((x) => { const k = wordsOf(x.he).length; return k >= lo && k <= hi; }), rnd);
    next();
  }).catch(() => A.announce('The lines did not load. Check the connection and press Start again.'));
}

export const mount = mountArcade(spec, setup);
