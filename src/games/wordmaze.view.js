// Word Maze: every corridor square carries a letter. Walk Rimon from the entrance so that the letters you
// step on, in order, spell the target word. Step on the wrong letter and you slide back to the start.
import { mountArcade, makeGrid, randInt } from './arcade.js';
import { buildMaze, bareLetters, wordsOfLength, ALPHABET, pickSeeded } from './arcade.model.js';

export const STORE_KEY = 'games.wordmaze.v1';

const spec = {
  id: 'wordmaze', title: 'Word Maze', titleHe: 'מָבוֹךְ מִלִּים',
  blurb: 'A maze whose floor is paved with letters. Walk Rimon along a path that spells the word, letter by letter. Other letters are dead ends: step on one and you are back at the door.',
  howTo: ['The word and its meaning are at the top; the next letter you need is underlined.', 'Move with the keys, the pad, or by tapping the side of the maze.', 'Step only on the next letter of the word. Any other lettered square sends you back.', 'Three words per level; longer words and bigger mazes as you climb.'],
  levels: [
    { name: '3-letter words', size: 7, min: 3, max: 3, words: 3 },
    { name: '3 to 4 letters', size: 9, min: 3, max: 4, words: 3 },
    { name: '4 letters', size: 9, min: 4, max: 4, words: 3 },
    { name: '4 to 5 letters', size: 11, min: 4, max: 5, words: 3 },
    { name: '5 to 6 letters, big maze', size: 13, min: 5, max: 6, words: 4 },
  ],
  par: (l, cfg) => cfg.words * 25,
  seconds: (l, cfg) => 120 + l * 15,
};

function setup(A) {
  const cfg = A.cfg, rnd = A.rnd;
  const bank = wordsOfLength(A.words, cfg.min, cfg.max);
  if (bank.length < cfg.words) { A.announce('Not enough words of this length.'); return; }
  const queue = pickSeeded(bank, cfg.words, rnd);
  let k = 0, word = null, letters = [], idx = 0, maze = [], n = 0, tiles = new Map(), player = [1, 1], gridApi = null;
  const prompt = A.h('p', { class: 'arc-prompt' });
  const holder = A.h('div');
  A.board.replaceChildren(prompt, holder);
  const carvePath = () => {
    // Lay the word along a real corridor path from the entrance using a random walk that prefers unvisited squares.
    let cur = [1, 1]; const path = [cur]; const seen = new Set(['1,1']);
    for (let i = 1; i < letters.length; i++) {
      const opts = [[0, 1], [0, -1], [1, 0], [-1, 0]].map(([a, b]) => [cur[0] + a, cur[1] + b]).filter(([r, c]) => r > 0 && c > 0 && r < n - 1 && c < n - 1 && !maze[r][c] && !seen.has(`${r},${c}`));
      if (!opts.length) return null;
      cur = opts[randInt(rnd, opts.length)]; seen.add(`${cur[0]},${cur[1]}`); path.push(cur);
    }
    return path;
  };
  const newWord = () => {
    word = queue[k++]; letters = [...bareLetters(word.he)]; idx = 0;
    for (let tries = 0; tries < 30; tries++) {
      maze = buildMaze(cfg.size, rnd); n = maze.length;
      const path = carvePath();
      if (!path) continue;
      tiles = new Map();
      path.forEach(([r, c], i) => tiles.set(`${r},${c}`, letters[i]));
      for (let r = 1; r < n - 1; r++) for (let c = 1; c < n - 1; c++) if (!maze[r][c] && !tiles.has(`${r},${c}`) && rnd() < 0.5) tiles.set(`${r},${c}`, ALPHABET[randInt(rnd, ALPHABET.length)]);
      break;
    }
    player = [1, 1]; idx = 1; // standing on the first letter already
    gridApi = makeGrid(n, n, { label: 'Letter maze' });
    holder.replaceChildren(gridApi.el);
    A.sayWord(word);
    draw();
  };
  const draw = () => {
    prompt.replaceChildren(`Spell `, ...letters.map((ch, i) => A.h('span', { lang: 'he', dir: 'rtl', style: i < idx ? 'opacity:.5' : i === idx ? 'font-weight:700;text-decoration:underline' : '' }, ch)), ` · ${word.translit} · ${word.en} · word ${k} of ${queue.length}`);
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) { const cell = gridApi.cells[r][c]; cell.className = 'arc-cell' + (maze[r][c] ? ' is-wall' : ''); cell.textContent = tiles.get(`${r},${c}`) || ''; }
    const [pr, pc] = player; gridApi.cells[pr][pc].classList.add('is-player'); gridApi.cells[pr][pc].replaceChildren(A.cast('rimon-face', 'Rimon', 'arc-sprite-inline'), tiles.get(`${pr},${pc}`) || '●');
  };
  const move = (d) => {
    const [dr, dc] = { up: [-1, 0], down: [1, 0], left: [0, 1], right: [0, -1] }[d];
    const r = player[0] + dr, c = player[1] + dc;
    if (r < 0 || c < 0 || r >= n || c >= n || maze[r][c]) return;
    player = [r, c];
    const ch = tiles.get(`${r},${c}`);
    if (ch !== undefined) {
      if (ch === letters[idx]) { idx++; A.addScore(5); A.sfx('tick'); if (idx >= letters.length) { A.addScore(20); A.sfx('success'); A.announce(`${word.he}: ${word.en}!`); if (k >= queue.length) { draw(); A.finish({ won: true }); return; } newWord(); return; } }
      else { A.addScore(-3); A.sfx('miss'); A.miss(); A.announce(`${ch} is not the next letter. Back to the door.`); player = [1, 1]; idx = 1; }
    }
    draw();
  };
  A.dpad(move);
  A.setLives(0);
  newWord();
}

export const mount = mountArcade(spec, setup);
