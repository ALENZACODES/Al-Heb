// Topic Trail: cross the grid from the right-hand edge to the left-hand edge, stepping only on words of the topic.
// Each step goes to a stone next to your last one (up, down, left or right). Higher levels hide extra topic stones
// that lead to dead ends; step back to try another way.
import { mountArcade } from './arcade.js';
import { trailPath, adjacent, shuffle } from './g2-core.js';
import { start, host, grade, draftNote, word, topicName, say } from './g2-ui.js';

export const STORE_KEY = 'games.g2-trail.v1';
const BOARDS = 3;

const spec = {
  id: 'g2-trail', title: 'Topic Trail', titleHe: 'דֶּרֶךְ',
  blurb: 'A river of word stones. Cross from right to left stepping only on words of the topic; the wrong stone sinks.',
  howTo: ['Start on a topic word in the right-hand column.', 'Each next stone must touch your last one: up, down, left or right.', 'A stone from another topic is a miss. "Step back" undoes your last step.', 'Reach the left-hand column to cross. Three crossings make a round.'],
  levels: [
    { name: 'Small river, with English', rows: 4, cols: 4, en: true, tr: false, decoys: 0 },
    { name: 'Wider river', rows: 4, cols: 5, en: false, tr: true, decoys: 0 },
    { name: 'Hebrew only', rows: 5, cols: 5, en: false, tr: false, decoys: 1 },
    { name: 'Dead ends', rows: 5, cols: 5, en: false, tr: false, decoys: 3 },
    { name: 'Big river', rows: 5, cols: 6, en: false, tr: false, decoys: 4 },
  ],
  par: (l, cfg) => BOARDS * (cfg.cols + 2) * 4,
  seconds: () => 180,
  needsWords: false, needsLetters: false,
};

/** A board: cells[r][c] = word; path = the guaranteed crossing. Off-path cells hold other topics, plus a few decoy topic words. */
export function trailBoard(D, target, rows, cols, decoys, rnd = Math.random) {
  const path = trailPath(rows, cols, rnd);
  const onPath = new Set(path.map(([r, c]) => `${r},${c}`));
  const mine = shuffle(D.items(target), rnd);
  const others = shuffle(D.ids.filter((x) => x !== target).flatMap((id) => D.items(id)), rnd);
  const cells = Array.from({ length: rows }, () => Array(cols).fill(null));
  path.forEach(([r, c], i) => { cells[r][c] = mine[i % mine.length]; });
  const free = shuffle([...Array(rows * cols).keys()].map((i) => [Math.floor(i / cols), i % cols]).filter(([r, c]) => !onPath.has(`${r},${c}`)), rnd);
  let m = path.length, o = 0;
  free.forEach(([r, c], i) => { cells[r][c] = i < decoys && mine[m] ? mine[m++] : others[o++ % others.length]; });
  return { cells, path };
}

function setup(A) {
  const cfg = A.cfg, rnd = A.rnd;
  const prompt = A.h('p', { class: 'arc-prompt' });
  const grid = A.h('div', { class: 'g2-grid', role: 'group', 'aria-label': 'The river: the first column is on the right', style: `grid-template-columns:repeat(${cfg.cols},auto)` });
  const back = A.h('button', { type: 'button', class: 'btn secondary' }, 'Step back');
  const after = A.h('p', { class: 'muted', 'aria-live': 'polite' });
  A.board.replaceChildren(host(A, 'noa', 'Only the topic stones hold you up.'), prompt, grid, A.h('div', { class: 'g2-row' }, back), after,
    draftNote(A, 'Words and topics come from the app\'s word lists. A native reader has not checked them yet.'));
  start(A, (D, T) => {
    let b = 0, steps = [], target = null, board = null, buttons = [], earned = new Set();
    const draw = () => {
      for (const row of buttons) for (const x of row) x.classList.remove('is-path');
      for (const [r, c] of steps) buttons[r][c].classList.add('is-path');
      back.disabled = !steps.length;
    };
    back.addEventListener('click', () => { if (steps.length) { steps.pop(); draw(); A.announce('Stepped back.'); } });
    const tap = (r, c, btn) => {
      const w = board.cells[r][c];
      if (!T.live() || btn.disabled) return;
      if (steps.some(([y, x]) => y === r && x === c)) { A.announce('You are already on that stone.'); return; }
      const last = steps[steps.length - 1];
      if (!last && c !== 0) { A.announce('Start in the right-hand column.'); return; }
      if (last && !adjacent(last, [r, c])) { A.announce('Step to a stone next to your last one.'); return; }
      const ok = w.topic === target;
      const fresh = !earned.has(`${r},${c}`); // a stone scores once, even after stepping back
      if (ok && !fresh) { steps.push([r, c]); draw(); A.announce(`${w.he} (${w.en}).`); if (c === cfg.cols - 1) across(); return; }
      if (ok) earned.add(`${r},${c}`);
      grade(A, ok, { points: 4, right: `${w.he} (${w.en}).`, wrong: `${w.he} (${w.en}) is not in ${D.topics[target].title}. It sinks.` });
      if (!ok) { btn.disabled = true; btn.classList.add('is-bad'); return; }
      steps.push([r, c]); draw(); say(A, w);
      if (c === cfg.cols - 1) across();
    };
    const across = () => { A.addScore(10); A.announce('Across!'); for (const row of buttons) for (const x of row) x.disabled = true; back.disabled = true; T.later(800, next); };
    const next = () => {
      if (b >= BOARDS) { T.end({ won: true }); return; }
      b += 1; steps = []; earned = new Set();
      target = shuffle(D.ids.filter((id) => D.items(id).length >= cfg.cols + cfg.rows + cfg.decoys), rnd)[0];
      board = trailBoard(D, target, cfg.rows, cfg.cols, cfg.decoys, rnd);
      prompt.replaceChildren(`Crossing ${b} of ${BOARDS}: step only on `, topicName(A, D, target), '.');
      buttons = board.cells.map((row, r) => row.map((w, c) => {
        const btn = A.h('button', { type: 'button', class: 'arc-choice' }, word(A, w, { en: cfg.en, tr: cfg.tr }));
        btn.addEventListener('click', () => tap(r, c, btn));
        return btn;
      }));
      grid.replaceChildren(...buttons.flat());
      after.textContent = '';
      draw();
    };
    next();
  });
}

export const mount = mountArcade(spec, setup);
