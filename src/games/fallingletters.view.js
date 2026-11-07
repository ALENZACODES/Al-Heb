// Falling Letters: letters drop one at a time into a well of columns. Steer each one into the column
// that spells the target word, right to left. Wrong columns pile up junk; a full column ends the round.
// Original take on the falling-block genre, built around spelling.
import { mountArcade, makeGrid, randInt } from './arcade.js';
import { bareLetters, wordsOfLength, ALPHABET } from './arcade.model.js';

export const STORE_KEY = 'games.fallingletters.v1';

const spec = {
  id: 'fallingletters', title: 'Falling Letters', titleHe: 'אוֹתִיּוֹת נוֹפְלוֹת',
  blurb: 'Letters fall into the well. Steer each one into its place so the bottom row spells the word, right to left. Junk letters pile up; keep the well from filling.',
  howTo: ['The word to spell is shown with its meaning. Hebrew runs right to left, so the first letter goes in the rightmost slot.', 'Move the falling letter left or right; press down or tap below to drop it faster.', 'A letter the word does not need is junk: drop it in a spare column.', 'Spell the word to score; three words finish the level.'],
  levels: [
    { name: '2-letter words', min: 2, max: 2, cols: 4, rows: 6, speed: 1000, junk: 0.2, words: 3 },
    { name: '3-letter words', min: 3, max: 3, cols: 5, rows: 6, speed: 900, junk: 0.3, words: 3 },
    { name: '4-letter words', min: 4, max: 4, cols: 6, rows: 7, speed: 800, junk: 0.35, words: 3 },
    { name: '5-letter words', min: 5, max: 5, cols: 7, rows: 7, speed: 700, junk: 0.4, words: 3 },
    { name: 'Mixed, fast', min: 3, max: 6, cols: 8, rows: 8, speed: 550, junk: 0.45, words: 4 },
  ],
  par: (l, cfg) => cfg.words * 30,
  seconds: (l, cfg) => 90 + l * 10,
};

function setup(A) {
  const cfg = A.cfg, rnd = A.rnd;
  const bank = wordsOfLength(A.words, cfg.min, cfg.max);
  if (bank.length < cfg.words) { A.announce('Not enough words of this length in the word bank.'); return; }
  const queue = [...bank].sort(() => rnd() - 0.5).slice(0, cfg.words);
  let wordIdx = 0, word = null, letters = [], need = [], placed = [];
  const well = Array.from({ length: cfg.rows }, () => Array(cfg.cols).fill(''));
  const { el, cells } = makeGrid(cfg.rows, cfg.cols, { label: 'The well' });
  const prompt = A.h('p', { class: 'arc-prompt' });
  const slots = A.h('div', { class: 'arc-word-slots', 'aria-label': 'Letters placed so far' });
  A.board.replaceChildren(prompt, slots, el);
  let fall = null; // { letter, r, c, junk }
  const startWord = () => {
    word = queue[wordIdx]; letters = [...bareLetters(word.he)]; need = [...letters]; placed = [];
    for (const row of well) row.fill('');
    prompt.replaceChildren('Spell ', A.heSpan(word.he), ` · ${word.translit} · ${word.en}`);
    A.sayWord(word);
    drawSlots();
    spawn();
  };
  const drawSlots = () => { slots.replaceChildren(...letters.map((ch, i) => A.h('span', {}, placed[i] || ' '))); };
  const spawn = () => {
    const junk = rnd() < cfg.junk;
    const letter = junk ? ALPHABET[randInt(rnd, ALPHABET.length)] : need[0];
    fall = { letter, r: 0, c: Math.floor(cfg.cols / 2), junk: junk && !need.includes(letter) };
    draw();
  };
  const draw = () => {
    for (let r = 0; r < cfg.rows; r++) for (let c = 0; c < cfg.cols; c++) {
      const cell = cells[r][c]; cell.className = 'arc-cell'; cell.textContent = well[r][c];
      if (well[r][c] && r === cfg.rows - 1 && c >= cfg.cols - letters.length) cell.classList.add('is-good');
    }
    if (fall) { const cell = cells[fall.r][fall.c]; cell.textContent = fall.letter; cell.classList.add('is-player'); }
  };
  const land = () => {
    const r = fall.r, c = fall.c;
    well[r][c] = fall.letter;
    // the bottom row's rightmost slots are the word's slots: slot i (0 = first letter) is column cols-1-i
    const slot = cfg.cols - 1 - c;
    if (r === cfg.rows - 1 && slot >= 0 && slot < letters.length) {
      if (fall.letter === letters[slot] && !placed[slot]) {
        placed[slot] = fall.letter; need.splice(need.indexOf(fall.letter), 1); A.addScore(10); A.sfx('drop'); drawSlots();
        if (placed.filter(Boolean).length === letters.length) {
          A.addScore(20); A.sfx('success'); A.announce(`${word.translit}, ${word.en}. Word complete!`);
          wordIdx++;
          if (wordIdx >= queue.length) { fall = null; draw(); A.finish({ won: true }); return; }
          startWord(); return;
        }
      } else if (!fall.junk) { A.addScore(-5); A.sfx('miss'); A.miss(); well[r][c] = ''; A.announce('Wrong slot. The letter is lost; it will fall again.'); }
    } else if (!fall.junk) {
      // a needed letter landed somewhere else: it is lost and comes back later
      well[r][c] = ''; A.addScore(-3); A.sfx('miss'); A.miss(); A.announce('That letter was needed. It comes back.');
    }
    if (well[0].some(Boolean) || well.every((row) => row.every(Boolean))) { fall = null; draw(); A.announce('The well is full.'); A.finish({ reason: 'lives' }); return; }
    spawn();
  };
  const canMove = (r, c) => r >= 0 && r < cfg.rows && c >= 0 && c < cfg.cols && !well[r][c];
  const step = () => {
    if (!fall) return;
    if (canMove(fall.r + 1, fall.c)) { fall.r++; draw(); } else land();
  };
  A.dpad((d) => {
    if (!fall) return;
    if (d === 'left' && canMove(fall.r, fall.c - 1)) fall.c--;
    else if (d === 'right' && canMove(fall.r, fall.c + 1)) fall.c++;
    else if (d === 'down') { while (canMove(fall.r + 1, fall.c)) fall.r++; land(); return; }
    else if (d === 'up' && A.quiet) step();
    draw();
  });
  A.setLives(5);
  startWord();
  if (!A.quiet) A.loop(step, cfg.speed);
  else A.announce('Calm mode: the letter falls one row each time you press up, or drops with down.');
}

export const mount = mountArcade(spec, setup);
