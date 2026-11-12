// Siddur Mend: a well-known prayer line with some of its words swapped around. Tap two words to swap them back; a word in
// its right place gets a double border and the words "in place". Mend the line in as few swaps as you can. Lines are
// the first lines of the app's prayer texts, with the divine name shown as ה׳ (never voiced).
import { mountG5, host, track, draftNote, heText, button, lock } from './g5-ui.js';
import { loadData, g5Data, shuffle, tokens, scramble, placed, fewestSwaps } from './g5-core.js';

export const STORE_KEY = 'games.g5-mend.v1';

const spec = {
  id: 'g5-mend', title: 'Siddur Mend', titleHe: 'תְּפִלָּה',
  blurb: 'Some words of a well-known prayer line have swapped places. Swap them back, two at a time, until the line reads as it does in the siddur.',
  howTo: ['Tap a word, then another word: they swap places.', 'A word in its right place is marked "in place".', 'Each swap that puts words back scores; finishing in the fewest swaps scores a bonus.', 'If a line takes far too many swaps, it mends itself and the next one comes.'],
  levels: [
    { name: 'Short lines, one swap, with English', maxWords: 6, swaps: 1, lines: 5, english: true },
    { name: 'Two swaps, with English', maxWords: 7, swaps: 2, lines: 5, english: true },
    { name: 'Longer lines', maxWords: 8, swaps: 2, lines: 5, english: false },
    { name: 'Three swaps', maxWords: 9, swaps: 3, lines: 5, english: false },
    { name: 'The long ones', maxWords: 12, minWords: 7, swaps: 4, lines: 5, english: false },
  ],
  par: (l, cfg) => cfg.lines * (cfg.swaps * 6 + 10),
  seconds: (l, cfg) => 40 + cfg.lines * (12 + cfg.swaps * 8),
};

/** The lines that fit a level: word counts between min and max. */
export const linesFor = (lines, cfg) => lines.filter((x) => { const n = tokens(x.he).length; return n <= cfg.maxWords && n >= (cfg.minWords || 3); });

function setup(A) {
  const T = track(A), cfg = A.cfg, rnd = A.rnd;
  const prompt = A.h('p', { class: 'arc-prompt', 'aria-live': 'polite' });
  const row = A.h('div', { class: 'g5-line', role: 'group', 'aria-label': 'The line, right to left' });
  const hint = A.h('p', { class: 'muted' });
  const after = A.h('p', { class: 'muted', 'aria-live': 'polite' });
  A.board.replaceChildren(host(A, 'noa', 'Swap the words back into place.'), prompt, row, hint, after,
    draftNote(A, 'First lines of the app\'s prayer texts (Hebrew from the corpus registry). The divine name is shown as ה׳ and never said aloud.'));
  loadData(A.ctx, g5Data('siddur')).then((d) => {
    if (!T.live()) return;
    const pool = shuffle(linesFor(d.lines, cfg), rnd);
    const chosen = pool.slice(0, cfg.lines);
    while (chosen.length < cfg.lines) chosen.push(...pool.slice(0, cfg.lines - chosen.length));
    let li = 0;
    const next = () => {
      if (li >= chosen.length) { T.end({ won: true }); return; }
      const ln = chosen[li++];
      const words = tokens(ln.he);
      const order = scramble(words.length, Math.min(cfg.swaps, words.length - 1), rnd, (w, i) => words[w] === words[i]);
      const best = fewestSwaps(words, order);
      const cap = best * 4 + 6;
      let first = -1, used = 0;
      prompt.textContent = `Line ${li} of ${chosen.length}: ${ln.title}.`;
      hint.textContent = cfg.english && ln.english ? ln.english : '';
      after.textContent = `It can be mended in ${best} swap${best === 1 ? '' : 's'}.`;
      const draw = () => {
        row.replaceChildren(...order.map((w, i) => {
          const home = words[w] === words[i];
          return button(A, A.h('span', {}, heText(A, words[w]), home ? A.h('small', {}, A.h('span', { 'aria-hidden': 'true' }, ' ✓'), A.h('span', { class: 'visually-hidden' }, ' (in place)')) : null), () => tap(i), 'btn secondary' + (home ? ' is-home' : ''), { 'aria-pressed': String(i === first) });
        }));
      };
      const tap = (i) => {
        if (first < 0) { first = i; A.sfx('select'); draw(); return; }
        if (first === i) { first = -1; draw(); return; }
        const before = placed(words, order);
        [order[first], order[i]] = [order[i], order[first]];
        first = -1; used += 1;
        const gain = placed(words, order) - before;
        if (gain > 0) { A.addScore(3 * gain); A.sfx('click'); } else { A.addScore(-1); }
        if (placed(words, order) === words.length) {
          const bonus = used <= best ? 10 : 4;
          A.addScore(bonus); A.sfx('success'); A.announce(`Mended in ${used} swap${used === 1 ? '' : 's'}${used <= best ? ', the fewest possible' : ''}.`);
          draw(); lock(row); after.textContent = ln.english || ''; T.later(1300, next); return;
        }
        if (used >= cap) {
          A.miss(); A.announce('That one mends itself. On to the next line.');
          order.sort((a, b) => a - b); draw(); lock(row); T.later(1500, next); return;
        }
        draw();
      };
      draw();
    };
    next();
  }).catch(() => A.announce('The lines did not load. Check the connection and press Start again.'));
}

export const mount = mountG5(spec, setup);
