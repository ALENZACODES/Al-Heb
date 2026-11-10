// Letter Chomp: a maze chase. Eat every copy of the target letter; its look-alikes are poison;
// two erasers wander the maze and cost a life on contact. Original take on the maze-chase genre.
import { mountArcade, makeGrid, randInt } from './arcade.js';
import { buildMaze, nextStepToward, pickSeeded } from './arcade.model.js';

export const STORE_KEY = 'games.letterchomp.v1';

const spec = {
  id: 'letterchomp', title: 'Letter Chomp', titleHe: 'אוֹכֵל אוֹתִיּוֹת',
  blurb: 'Rimon the pomegranate is loose in a maze of letters. Eat every copy of the letter shown at the top; its look-alikes are poison. Erasers roam the corridors.',
  howTo: ['Move with the arrow keys, W A S D, the pad below, or by tapping the side of the maze you want to go.', 'Eat only the target letter. A look-alike costs points and a life.', 'When the erasers touch you, you lose a life. Three lives per round.', 'Clear every target letter to finish the level.'],
  levels: [
    { name: 'Aleph to He', size: 9, targets: 5, decoys: 3, erasers: 1, speed: 1000, letters: ['alef', 'bet', 'gimel', 'dalet', 'he'] },
    { name: 'Vav to Yod', size: 9, targets: 6, decoys: 4, erasers: 1, speed: 880, letters: ['vav', 'zayin', 'chet', 'tet', 'yod'] },
    { name: 'Kaf to Ayin', size: 11, targets: 7, decoys: 5, erasers: 2, speed: 780, letters: ['kaf', 'lamed', 'mem', 'nun', 'samekh', 'ayin'] },
    { name: 'Pe to Tav', size: 11, targets: 8, decoys: 6, erasers: 2, speed: 680, letters: ['pe', 'tsadi', 'qof', 'resh', 'shin', 'tav'] },
    { name: 'Finals too', size: 13, targets: 9, decoys: 7, erasers: 3, speed: 600, letters: null },
  ],
  par: (l, cfg) => cfg.targets * 10,
  seconds: (l, cfg) => 90 + l * 15,
  needsWords: false,
};

function setup(A) {
  const cfg = A.cfg, rnd = A.rnd;
  const pool = cfg.letters ? A.letters.filter((x) => cfg.letters.includes(x.id)) : A.letters;
  if (!pool.length) { A.announce('Letter data did not load.'); return; }
  const target = pool[randInt(rnd, pool.length)];
  const decoyPool = A.letters.filter((x) => x.id !== target.id && (target.confusableWith.includes(x.id) || x.confusableWith.includes(target.id)));
  const decoys = decoyPool.length ? decoyPool : A.letters.filter((x) => x.id !== target.id);
  const maze = buildMaze(cfg.size, rnd);
  const n = maze.length;
  const open = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (!maze[r][c] && !(r === 1 && c === 1)) open.push([r, c]);
  const spots = pickSeeded(open, cfg.targets + cfg.decoys + cfg.erasers, rnd);
  const items = new Map();
  spots.slice(0, cfg.targets).forEach(([r, c]) => items.set(`${r},${c}`, { kind: 'target', letter: target }));
  spots.slice(cfg.targets, cfg.targets + cfg.decoys).forEach(([r, c]) => items.set(`${r},${c}`, { kind: 'decoy', letter: decoys[randInt(rnd, decoys.length)] }));
  const erasers = spots.slice(cfg.targets + cfg.decoys).map(([r, c]) => ({ r, c }));
  let player = { r: 1, c: 1 }, remaining = cfg.targets, dir = null;
  A.setLives(3);
  const { el, cells } = makeGrid(n, n, { label: 'Maze' });
  const head = A.h('p', { class: 'arc-prompt' }, 'Eat every ', A.heSpan(target.he, 'he arc-glyph'), ` (${target.name}). Poison: look-alikes.`);
  A.board.replaceChildren(head, el);
  A.sayLetter(target);
  const draw = () => {
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const cell = cells[r][c];
      cell.className = 'arc-cell' + (maze[r][c] ? ' is-wall' : '');
      const it = items.get(`${r},${c}`);
      cell.textContent = it ? it.letter.he : '';
      if (it?.kind === 'target') cell.classList.add('is-target');
    }
    for (const e of erasers) { cells[e.r][e.c].classList.add('is-chaser'); cells[e.r][e.c].textContent = '✕'; }
    cells[player.r][player.c].classList.add('is-player'); cells[player.r][player.c].replaceChildren(A.cast('rimon-face', 'Rimon', 'arc-sprite-inline'), '●');
  };
  const move = (d) => {
    if (!d) return;
    const [dr, dc] = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] }[d];
    const rr = player.r + dr, cc = player.c + dc;
    if (rr < 0 || cc < 0 || rr >= n || cc >= n || maze[rr][cc]) { dir = null; return; }
    player = { r: rr, c: cc };
    const key = `${rr},${cc}`;
    const it = items.get(key);
    if (it) {
      items.delete(key);
      if (it.kind === 'target') { remaining--; A.addScore(10); A.sfx('collect'); A.announce(`${target.name}! ${remaining} left.`); }
      else { A.addScore(-5); A.sfx('miss'); A.announce(`Poison: that was ${it.letter.name}, a look-alike of ${target.name}.`); if (A.miss()) return; }
    }
    if (remaining === 0) { draw(); A.finish({ won: true }); return; }
  };
  const step = () => {
    move(dir);
    for (const e of erasers) {
      const nxt = rnd() < 0.7 ? nextStepToward(maze, [e.r, e.c], [player.r, player.c]) : null;
      if (nxt) { e.r = nxt[0]; e.c = nxt[1]; }
      else {
        const opts = [[0, 1], [0, -1], [1, 0], [-1, 0]].map(([a, b]) => [e.r + a, e.c + b]).filter(([a, b]) => a >= 0 && b >= 0 && a < n && b < n && !maze[a][b]);
        if (opts.length) { const [a, b] = opts[randInt(rnd, opts.length)]; e.r = a; e.c = b; }
      }
      if (e.r === player.r && e.c === player.c) { A.sfx('error'); A.announce('An eraser caught Rimon.'); player = { r: 1, c: 1 }; if (A.miss()) { draw(); return; } }
    }
    draw();
  };
  A.dpad((d) => { dir = d; if (A.quiet) { step(); } });
  draw();
  if (!A.quiet) A.loop(step, cfg.speed);
  else A.announce('Calm mode: the maze moves one step per tap or key press.');
}

export const mount = mountArcade(spec, setup);
