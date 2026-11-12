// Sevivon Slide: a sliding-tile puzzle. The tiles are the letters of a Hanukkah word; slide them until the word reads in
// order, right to left and top to bottom, with the gap in the last place (bottom left). Boards are made by sliding from
// the solved board, so every puzzle can be solved.
import { bareLetters, pickSeeded } from './arcade.model.js';
import { mountHanukkahArcade, spellable } from './hanukkah-shell.js';

export const STORE_KEY = 'games.hanukkah-slide.v1';

/** Pure: cells adjacent to index i on a rows x cols board. */
export function neighbours(i, rows, cols) {
  const r = Math.floor(i / cols), c = i % cols, out = [];
  if (r > 0) out.push(i - cols); if (r < rows - 1) out.push(i + cols);
  if (c > 0) out.push(i - 1); if (c < cols - 1) out.push(i + 1);
  return out;
}
/** Pure: a scrambled board reached by `moves` random slides from the solved one (null is the gap). Never returns solved. */
export function scramble(tiles, rows, cols, moves, rnd = Math.random) {
  const board = [...tiles, null];
  let gap = board.length - 1, prev = -1;
  for (let m = 0; m < moves || isSolved(board); m++) {
    const opts = neighbours(gap, rows, cols).filter((x) => x !== prev);
    const pick = opts[Math.floor(rnd() * opts.length)];
    [board[gap], board[pick]] = [board[pick], board[gap]]; prev = gap; gap = pick;
    if (m > moves + 200) break;
  }
  return board;
}
/** Pure: solved when tile k sits at index k and the gap is last. Tiles carry their home index. */
export function isSolved(board) { return board.every((t, i) => (i === board.length - 1 ? t === null : t?.home === i)); }
/** Pure: slide tile at index i into the gap if they touch. Returns true when it moved. */
export function slide(board, i, rows, cols) {
  const gap = board.indexOf(null);
  if (!neighbours(gap, rows, cols).includes(i)) return false;
  [board[gap], board[i]] = [board[i], board[gap]];
  return true;
}

const spec = {
  id: 'hanukkah-slide', title: 'Sevivon Slide', titleHe: 'סְבִיבוֹן',
  blurb: 'The letters of a Hanukkah word are mixed up on a sliding board. Slide them back so the word reads right to left, top row first.',
  howTo: ['Tap a letter next to the gap to slide it in (or use the arrow keys to slide a letter into the gap).', 'The word starts at the top right and reads right to left, then on to the next row.', 'The gap ends in the bottom left corner.', 'Fewer slides means more points.'],
  levels: [
    { name: '2 x 2, three letters', rows: 2, cols: 2, len: 3, moves: 8, puzzles: 2 },
    { name: '2 x 3, five letters', rows: 2, cols: 3, len: 5, moves: 14, puzzles: 2 },
    { name: '2 x 3, well mixed', rows: 2, cols: 3, len: 5, moves: 40, puzzles: 2 },
    { name: '2 x 4, seven letters', rows: 2, cols: 4, len: 7, moves: 24, puzzles: 1 },
    { name: '2 x 4, well mixed', rows: 2, cols: 4, len: 7, moves: 60, puzzles: 1 },
  ],
  par: (l, cfg) => cfg.puzzles * 30,
  seconds: (l, cfg) => 90 + cfg.len * 20 * cfg.puzzles,
};

function setup(A, data) {
  const cfg = A.cfg, rnd = A.rnd, h = A.h;
  const pool = spellable(data).filter((w) => bareLetters(w.he).length === cfg.len);
  const round = pickSeeded(pool, cfg.puzzles, rnd);
  if (!round.length) { A.announce('No word of the right length. Try another level.'); return; }
  let p = 0, done = false, board, word, slides = 0;
  const grid = h('div', { class: 'hk-slide', role: 'group', 'aria-label': 'Sliding board', style: `grid-template-columns:repeat(${cfg.cols},4rem)` });
  const clue = h('p', { class: 'arc-prompt' });
  function paint() {
    grid.replaceChildren(...board.map((t, i) => (t
      ? h('button', { type: 'button', lang: 'he', 'aria-label': `Letter ${t.ch}, row ${Math.floor(i / cfg.cols) + 1}, place ${(i % cfg.cols) + 1} from the right`, onclick: () => move(i) }, t.ch)
      : h('button', { type: 'button', class: 'is-blank', disabled: true, 'aria-label': `Gap, row ${Math.floor(i / cfg.cols) + 1}, place ${(i % cfg.cols) + 1} from the right` }, ''))));
  }
  function move(i) {
    if (done || !slide(board, i, cfg.rows, cfg.cols)) { A.sfx('error_soft'); return; }
    slides++; A.sfx('click'); paint();
    if (isSolved(board)) {
      A.addScore(Math.max(8, 30 - Math.max(0, slides - cfg.moves / 2))); A.sfx('success'); A.sayWord(word);
      A.announce(`Solved in ${slides} slides: ${word.translit}, ${word.en}.`);
      clue.replaceChildren(A.heSpan(word.he, 'he hk-he'), ` ${word.translit} · ${word.en}`);
      setTimeout(next, A.quiet ? 400 : 1200);
    } else {
      try { grid.children[i]?.focus?.(); } catch { /* ignore */ }
    }
  }
  function next() {
    if (done) return;
    if (p >= round.length) { done = true; A.finish({ won: true }); return; }
    word = round[p++]; slides = 0;
    const tiles = [...bareLetters(word.he)].map((ch, home) => ({ ch, home }));
    board = scramble(tiles, cfg.rows, cfg.cols, cfg.moves, rnd);
    clue.replaceChildren(`Puzzle ${p} of ${round.length}: `, h('strong', {}, word.en), ` (${word.translit})`);
    paint();
    A.announce(`Slide the letters of ${word.translit}, ${word.en}, into order.`);
  }
  // arrows: slide the letter on that side of the gap into it (the board is right to left, so "left" means the next column)
  A.keys((k) => {
    if (!board) return false;
    const gap = board.indexOf(null), r = Math.floor(gap / cfg.cols), c = gap % cfg.cols;
    const from = k === 'up' ? (r < cfg.rows - 1 ? gap + cfg.cols : -1) : k === 'down' ? (r > 0 ? gap - cfg.cols : -1)
      : k === 'left' ? (c > 0 ? gap - 1 : -1) : k === 'right' ? (c < cfg.cols - 1 ? gap + 1 : -1) : -2;
    if (from === -2) return false;
    if (from >= 0) move(from);
    return true;
  });
  A.board.replaceChildren(clue, grid);
  next();
}

export const mount = mountHanukkahArcade(spec, setup);
