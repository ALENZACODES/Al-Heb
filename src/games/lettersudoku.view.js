// Letter Sudoku: a 4 x 4 (then 6 x 6) grid where every row, column and box holds each letter once.
// The letters are the ones beginners confuse most, so filling the grid is also telling them apart.
import { mountArcade, makeGrid, randInt } from './arcade.js';
import { pickSeeded } from './arcade.model.js';

export const STORE_KEY = 'games.lettersudoku.v1';

const spec = {
  id: 'lettersudoku', title: 'Letter Sudoku', titleHe: 'סוּדוֹקוּ',
  blurb: 'Sudoku with letters instead of numbers. Each row, each column and each box must hold every letter exactly once. The letter sets are the look-alikes beginners mix up, so you learn them by placing them.',
  howTo: ['Tap an empty square, then tap a letter from the row below to place it.', 'A letter already in that row, column or box is refused and shown in red for a moment.', 'Fill every square to finish. Fewer refused moves means more stars.', 'Level 1 is 4 x 4 with four letters; level 3 moves to 6 x 6.'],
  levels: [
    { name: '4 x 4, bet kaf dalet resh', size: 4, box: [2, 2], letters: ['ב', 'כ', 'ד', 'ר'], blanks: 6 },
    { name: '4 x 4, he chet tav vav', size: 4, box: [2, 2], letters: ['ה', 'ח', 'ת', 'ו'], blanks: 8 },
    { name: '6 x 6, six letters', size: 6, box: [2, 3], letters: ['ב', 'כ', 'פ', 'ד', 'ר', 'ך'], blanks: 16 },
    { name: '6 x 6, harder', size: 6, box: [2, 3], letters: ['ג', 'נ', 'ס', 'ם', 'ט', 'מ'], blanks: 20 },
    { name: '6 x 6, sparse', size: 6, box: [2, 3], letters: ['ע', 'צ', 'ז', 'ו', 'ן', 'י'], blanks: 24 },
  ],
  par: (l, cfg) => cfg.blanks * 10,
  seconds: (l, cfg) => 240 + l * 60,
  needsWords: false, needsLetters: false,
};

/** A solved grid by shuffling a base pattern (rows within bands, columns within stacks, and symbols). */
function solvedGrid(n, [bh, bw], symbols, rnd) {
  const base = Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => ((r % bh) * bw + Math.floor(r / bh) + c) % n));
  const perm = pickSeeded([...Array(n).keys()], n, rnd);
  const bands = pickSeeded([...Array(n / bh).keys()], n / bh, rnd).flatMap((b) => pickSeeded([...Array(bh).keys()], bh, rnd).map((i) => b * bh + i));
  const stacks = pickSeeded([...Array(n / bw).keys()], n / bw, rnd).flatMap((s) => pickSeeded([...Array(bw).keys()], bw, rnd).map((i) => s * bw + i));
  return bands.map((r) => stacks.map((c) => symbols[perm[base[r][c]]]));
}

function setup(A) {
  const cfg = A.cfg, rnd = A.rnd, n = cfg.size, [bh, bw] = cfg.box;
  const solution = solvedGrid(n, cfg.box, cfg.letters, rnd);
  const grid = solution.map((row) => [...row]);
  const blanks = pickSeeded([...Array(n * n).keys()], cfg.blanks, rnd);
  for (const i of blanks) grid[Math.floor(i / n)][i % n] = '';
  const fixed = grid.map((row) => row.map((v) => !!v));
  let sel = null, filled = 0;
  const { el, cells } = makeGrid(n, n, { label: 'Sudoku grid', onCell: (r, c) => { if (fixed[r][c]) return; sel = [r, c]; draw(); } });
  const pad = A.h('div', { class: 'arc-choices', role: 'group', 'aria-label': 'Letters to place' }, ...cfg.letters.map((ch) => A.h('button', { type: 'button', class: 'arc-choice', lang: 'he', dir: 'rtl', onclick: () => place(ch) }, ch)),
    A.h('button', { type: 'button', class: 'arc-choice', 'aria-label': 'Clear square', onclick: () => place('') }, '⌫'));
  A.board.replaceChildren(A.h('p', { class: 'arc-prompt' }, `Boxes are ${bh} by ${bw}. Tap a square, then a letter.`), el, pad);
  const draw = () => {
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const cell = cells[r][c]; cell.className = 'arc-cell' + (fixed[r][c] ? ' is-fixed' : '') + ((Math.floor(r / bh) + Math.floor(c / bw)) % 2 ? ' is-found' : '');
      cell.textContent = grid[r][c]; cell.setAttribute('aria-label', `row ${r + 1} column ${c + 1}${grid[r][c] ? ': ' + grid[r][c] : ', empty'}`);
    }
    if (sel) cells[sel[0]][sel[1]].classList.add('is-selected');
  };
  const conflicts = (r, c, ch) => {
    for (let i = 0; i < n; i++) { if (i !== c && grid[r][i] === ch) return `row ${r + 1}`; if (i !== r && grid[i][c] === ch) return `column ${c + 1}`; }
    const r0 = Math.floor(r / bh) * bh, c0 = Math.floor(c / bw) * bw;
    for (let i = r0; i < r0 + bh; i++) for (let j = c0; j < c0 + bw; j++) if ((i !== r || j !== c) && grid[i][j] === ch) return 'that box';
    return null;
  };
  const place = (ch) => {
    if (!sel) { A.announce('Tap an empty square first.'); return; }
    const [r, c] = sel;
    if (!ch) { if (grid[r][c]) filled--; grid[r][c] = ''; draw(); return; }
    const why = conflicts(r, c, ch);
    if (why) { A.addScore(-2); A.sfx('error_soft'); A.miss(); cells[r][c].classList.add('is-bad'); setTimeout(() => cells[r][c].classList.remove('is-bad'), A.quiet ? 0 : 500); A.announce(`${ch} is already in ${why}.`); return; }
    if (!grid[r][c]) filled++;
    grid[r][c] = ch; A.addScore(10); A.sfx('tick'); draw();
    if (filled >= cfg.blanks && grid.every((row, i) => row.every((v, j) => v === solution[i][j]))) { A.addScore(30); A.finish({ won: true }); }
    else if (filled >= cfg.blanks) A.announce('Every square is filled but something is off. Check the rows and columns.');
  };
  A.keys((k, e) => { if (cfg.letters.includes(e.key)) { place(e.key); return true; } return false; });
  A.setLives(0);
  draw();
}

export const mount = mountArcade(spec, setup);
