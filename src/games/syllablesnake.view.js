// Syllable Snake: steer the snake to eat the syllables of a word in order. Each correct bite grows the snake;
// a wrong syllable or a wall ends the run. Classic snake, with the word as the trail you leave behind.
import { mountArcade, makeGrid, randInt } from './arcade.js';
import { allSyllables, VOWEL_SOUNDS } from './syllables.js';
import { pickSeeded } from './arcade.model.js';

export const STORE_KEY = 'games.syllablesnake.v1';

const spec = {
  id: 'syllablesnake', title: 'Syllable Snake', titleHe: 'נָחָשׁ',
  blurb: 'Rimon leads a snake of syllables. Steer it to eat the word\'s syllables in order; every bite makes the tail longer. Hit a wall, your own tail, or the wrong syllable and the run ends.',
  howTo: ['The target word is shown at the top, syllable by syllable.', 'Move with the keys, the pad, or by tapping the side of the board.', 'Eat the next syllable in the word. Others are decoys.', 'Each level has longer words and a faster snake.'],
  levels: [
    { name: '2 syllables, slow', size: 9, syl: 2, speed: 700, words: 4 },
    { name: '2 syllables', size: 9, syl: 2, speed: 560, words: 5 },
    { name: '3 syllables', size: 11, syl: 3, speed: 500, words: 5 },
    { name: '3 syllables, fast', size: 11, syl: 3, speed: 420, words: 6 },
    { name: '4 syllables', size: 13, syl: 4, speed: 380, words: 6 },
  ],
  par: (l, cfg) => cfg.words * cfg.syl * 10,
  seconds: (l, cfg) => 100,
  needsWords: false, needsLetters: false,
};

function setup(A) {
  const cfg = A.cfg, rnd = A.rnd, n = cfg.size;
  const cards = allSyllables();
  let snake = [[Math.floor(n / 2), Math.floor(n / 2)]], dir = 'left', pending = 'left';
  let word = [], idx = 0, wordsDone = 0, food = new Map();
  const prompt = A.h('p', { class: 'arc-prompt' });
  const { el, cells } = makeGrid(n, n, { label: 'Snake board', cellClass: 'arc-snake-cell' });
  A.board.replaceChildren(prompt, el);
  const free = () => { const out = []; for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (!snake.some(([a, b]) => a === r && b === c) && !food.has(`${r},${c}`)) out.push([r, c]); return out; };
  const newWord = () => {
    word = pickSeeded(cards, cfg.syl, rnd); idx = 0; food.clear();
    const spots = pickSeeded(free(), cfg.syl + 2, rnd);
    word.forEach((s, i) => { const [r, c] = spots[i]; food.set(`${r},${c}`, { s, i }); });
    const decoys = pickSeeded(cards.filter((c) => !word.includes(c)), 2, rnd);
    decoys.forEach((s, i) => { const [r, c] = spots[cfg.syl + i]; if (spots[cfg.syl + i]) food.set(`${r},${c}`, { s, i: -1 }); });
    showPrompt();
  };
  const showPrompt = () => {
    const spans = word.map((s, i) => A.h('span', { style: i === idx ? 'font-weight:700;text-decoration:underline' : i < idx ? 'opacity:.5' : '', lang: 'he', dir: 'rtl' }, s.he + ' '));
    prompt.replaceChildren('Eat: ', ...spans, ' (' + word.map((s) => s.tr).join('-') + ')');
  };
  const draw = () => {
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) { const cell = cells[r][c]; cell.className = 'arc-cell arc-snake-cell'; const f = food.get(`${r},${c}`); cell.textContent = f ? f.s.he : ''; }
    snake.forEach(([r, c], i) => { cells[r][c].classList.add(i === 0 ? 'is-head' : 'is-snake'); if (i > 0 && word[i - 1] && i - 1 < idx) cells[r][c].textContent = word[i - 1].he; });
  };
  const step = () => {
    dir = pending;
    const [hr, hc] = snake[0];
    const [dr, dc] = { up: [-1, 0], down: [1, 0], left: [0, 1], right: [0, -1] }[dir]; // board is rtl: visual left is +c
    const r = hr + dr, c = hc + dc;
    if (r < 0 || c < 0 || r >= n || c >= n || snake.some(([a, b]) => a === r && b === c)) { A.sfx('error'); A.announce('The snake hit something. Run over.'); draw(); A.finish({ reason: 'lives' }); return; }
    const f = food.get(`${r},${c}`);
    snake.unshift([r, c]);
    if (f) {
      food.delete(`${r},${c}`);
      if (f.i === idx) { idx++; A.addScore(10); A.sfx('collect'); A.announce(`${f.s.tr}.`); if (idx >= word.length) { wordsDone++; A.addScore(15); A.announce(`Word done: ${word.map((s) => s.tr).join('')}.`); if (wordsDone >= cfg.words) { draw(); A.finish({ won: true }); return; } newWord(); } else showPrompt(); }
      else { A.addScore(-5); A.sfx('miss'); snake.pop(); if (A.miss()) { draw(); return; } A.announce(`${f.s.tr} is not next. Next is ${word[idx]?.tr}.`); }
    } else snake.pop();
    draw();
  };
  const opposite = { up: 'down', down: 'up', left: 'right', right: 'left' };
  A.dpad((d) => { if (opposite[d] !== dir || snake.length === 1) pending = d; if (A.quiet) step(); });
  A.setLives(3);
  newWord(); draw();
  if (!A.quiet) A.loop(step, cfg.speed);
  else A.announce('Calm mode: the snake moves one square per press.');
}

export const mount = mountArcade(spec, setup);
