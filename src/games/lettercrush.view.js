// Letter Crush: a match-three board of letters. Swap two neighbouring tiles to line up three of the same letter;
// they clear and new tiles fall in. Lining up a whole word from the target list pays five times as much.
import { mountArcade, makeGrid, randInt } from './arcade.js';
import { bareLetters, wordsOfLength, pickSeeded } from './arcade.model.js';

export const STORE_KEY = 'games.lettercrush.v1';

const spec = {
  id: 'lettercrush', title: 'Letter Crush', titleHe: 'רִסּוּק אוֹתִיּוֹת',
  blurb: 'Swap two neighbouring tiles to line up three of the same letter and clear them. Spell one of the target words in a row (right to left) for a big bonus. Reach the score goal before the moves run out.',
  howTo: ['Tap a tile, then a neighbour, to swap them. Only swaps that make a line are kept.', 'Three or more of one letter in a row or column clear and new letters drop in.', 'The target words are listed; make one appear in a row for a bonus.', 'You have a limited number of moves per level.'],
  levels: [
    { name: '6 x 6, four letters', size: 6, letters: 4, moves: 20, goal: 150, words: 2, min: 2, max: 3 },
    { name: '7 x 7, five letters', size: 7, letters: 5, moves: 22, goal: 220, words: 2, min: 2, max: 3 },
    { name: '7 x 7, six letters', size: 7, letters: 6, moves: 24, goal: 280, words: 3, min: 3, max: 3 },
    { name: '8 x 8, seven letters', size: 8, letters: 7, moves: 26, goal: 340, words: 3, min: 3, max: 4 },
    { name: '8 x 8, eight letters, 24 moves', size: 8, letters: 8, moves: 24, goal: 400, words: 3, min: 3, max: 4 },
  ],
  par: (l, cfg) => cfg.goal,
  seconds: (l, cfg) => 240,
};

function setup(A) {
  const cfg = A.cfg, rnd = A.rnd, n = cfg.size;
  // Letters come from the target words so word lines are possible.
  const targets = pickSeeded(wordsOfLength(A.words, cfg.min, cfg.max), cfg.words, rnd);
  let alphabet = [...new Set(targets.flatMap((w) => [...bareLetters(w.he)]))];
  const extra = pickSeeded([...'אבגדהוזחטיכלמנסעפצקרשת'].filter((c) => !alphabet.includes(c)), Math.max(0, cfg.letters - alphabet.length), rnd);
  alphabet = [...alphabet, ...extra].slice(0, Math.max(cfg.letters, alphabet.length));
  const board = Array.from({ length: n }, () => Array.from({ length: n }, () => alphabet[randInt(rnd, alphabet.length)]));
  let moves = cfg.moves, sel = null;
  const prompt = A.h('p', { class: 'arc-prompt' });
  const list = A.h('p', { class: 'arc-prompt', lang: 'he', dir: 'rtl' }, ...targets.map((w) => A.h('span', { class: 'arc-badge', style: 'margin:0 .2rem;background:var(--card,#eee);color:inherit;border:1px solid var(--line,#8886)' }, `${w.he} (${w.en})`)));
  const { el, cells } = makeGrid(n, n, { label: 'Letter board', onCell: (r, c) => tap(r, c) });
  A.board.replaceChildren(prompt, list, el);
  const draw = () => { for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) { const cell = cells[r][c]; cell.className = 'arc-cell'; cell.textContent = board[r][c]; } if (sel) cells[sel[0]][sel[1]].classList.add('is-selected'); prompt.textContent = `Moves left: ${moves} · goal ${cfg.goal}`; };
  const findMatches = () => {
    const hit = new Set(); let wordBonus = 0;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      for (const [dr, dc] of [[0, 1], [1, 0]]) {
        let k = 1; while (r + dr * k < n && c + dc * k < n && board[r + dr * k][c + dc * k] === board[r][c]) k++;
        if (k >= 3) for (let i = 0; i < k; i++) hit.add(`${r + dr * i},${c + dc * i}`);
      }
      // word lines, read right to left along the row (columns descend)
      for (const w of targets) {
        const L = [...bareLetters(w.he)];
        if (c - (L.length - 1) >= 0 && L.every((ch, i) => board[r][c - i] === ch)) { for (let i = 0; i < L.length; i++) hit.add(`${r},${c - i}`); wordBonus += L.length * 25; A.announce(`${w.he} (${w.en}) in a row!`); A.sayWord(w); }
      }
    }
    return { hit, wordBonus };
  };
  const collapse = (hit) => {
    for (const k of hit) { const [r, c] = k.split(',').map(Number); board[r][c] = null; }
    for (let c = 0; c < n; c++) { const col = []; for (let r = n - 1; r >= 0; r--) if (board[r][c]) col.push(board[r][c]); for (let r = n - 1; r >= 0; r--) board[r][c] = col[n - 1 - r] ?? alphabet[randInt(rnd, alphabet.length)]; }
  };
  const resolve = () => { let total = 0, chains = 0; for (;;) { const { hit, wordBonus } = findMatches(); if (!hit.size) break; chains++; total += hit.size * 5 * chains + wordBonus; collapse(hit); } return total; };
  const tap = (r, c) => {
    if (moves <= 0) return;
    if (!sel) { sel = [r, c]; draw(); return; }
    const [r0, c0] = sel; sel = null;
    if (Math.abs(r0 - r) + Math.abs(c0 - c) !== 1) { draw(); return; }
    [board[r0][c0], board[r][c]] = [board[r][c], board[r0][c0]];
    const { hit } = findMatches();
    if (!hit.size) { [board[r0][c0], board[r][c]] = [board[r][c], board[r0][c0]]; A.sfx('error_soft'); A.announce('No line there. Swapped back.'); draw(); return; }
    moves--; const pts = resolve(); A.addScore(pts); A.sfx(pts >= 60 ? 'streak' : 'pop'); draw();
    if (A.score >= cfg.goal) { A.finish({ won: true }); return; }
    if (moves <= 0) { A.announce('Out of moves.'); A.finish({ reason: 'done' }); }
  };
  resolve(); // clear any starting lines without scoring
  A.setLives(0);
  draw();
}

export const mount = mountArcade(spec, setup);
