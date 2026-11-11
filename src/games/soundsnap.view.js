// Sound Snap: a letter name is called (recorded clip when one exists, always written too).
// Letters pop up in holes; tap the called one before it hides. Reaction game, whack-a-mole style.
import { mountArcade, makeGrid, randInt } from './arcade.js';
import { pickSeeded } from './arcade.model.js';

export const STORE_KEY = 'games.soundsnap.v1';

const spec = {
  id: 'soundsnap', title: 'Sound Snap', titleHe: 'שְׁמַע וְלַחֵץ',
  blurb: 'A letter is called by name. Letters pop up in the holes; tap the one you heard before it sinks back. Each level calls faster and adds look-alikes.',
  howTo: ['Read (and, where a recording exists, hear) the letter name at the top.', 'Letters appear in the holes for a moment. Tap the one that matches.', 'Tapping a wrong letter costs a point; letting the right one sink costs a life (from your first tap on).', 'Fifteen correct taps finish the level.'],
  levels: [
    { name: '6 letters, slow', holes: 6, letters: 6, show: 3500, goal: 12 },
    { name: '9 letters', holes: 9, letters: 9, show: 3000, goal: 14 },
    { name: 'Look-alikes mixed in', holes: 9, letters: 12, show: 2600, goal: 15, confuse: true },
    { name: 'All 22 letters', holes: 12, letters: 22, show: 2200, goal: 16 },
    { name: 'All 27 shapes, fast', holes: 12, letters: 27, show: 1800, goal: 18, finals: true },
  ],
  par: (l, cfg) => cfg.goal * 10,
  seconds: (l, cfg) => 90,
  needsWords: false,
};

function setup(A) {
  const cfg = A.cfg, rnd = A.rnd;
  const pool = pickSeeded(cfg.finals ? A.letters : A.letters.filter((x) => !x.isFinal), cfg.letters, rnd);
  if (!pool.length) { A.announce('Letter data did not load.'); return; }
  const cols = cfg.holes <= 6 ? 3 : cfg.holes <= 9 ? 3 : 4;
  const rows = Math.ceil(cfg.holes / cols);
  let called = null, hits = 0, up = new Map(), tick = 0;
  // M-13: no heart is lost before the learner's first tap. A round left untouched used to end 'Out of lives' with no input.
  let engaged = false;
  const call = A.h('p', { class: 'arc-prompt' });
  const { el, cells } = makeGrid(rows, cols, { label: 'Holes', onCell: (r, c, cell) => tap(r * cols + c, cell) });
  A.board.replaceChildren(call, el);
  A.setLives(3);
  const newCall = () => {
    called = pool[randInt(rnd, pool.length)];
    call.replaceChildren(`Find: ${called.name} `, A.heSpan(called.nameHe || '', 'he muted'));
    A.sayLetter(called);
  };
  const draw = () => {
    for (let i = 0; i < cfg.holes; i++) { const cell = cells[Math.floor(i / cols)][i % cols]; const u = up.get(i); cell.textContent = u ? u.letter.he : '·'; cell.className = 'arc-cell' + (u ? '' : ' is-blank'); cell.setAttribute('aria-label', u ? `Hole ${i + 1}: ${u.letter.name}` : `Hole ${i + 1}, empty`); }
  };
  const popOne = () => {
    const free = [...Array(cfg.holes).keys()].filter((i) => !up.has(i));
    if (!free.length) return;
    const i = free[randInt(rnd, free.length)];
    const wantTarget = ![...up.values()].some((u) => u.letter.id === called.id) && rnd() < 0.5;
    let letter = wantTarget ? called : pool[randInt(rnd, pool.length)];
    if (cfg.confuse && !wantTarget && called.confusableWith.length && rnd() < 0.5) letter = A.letters.find((x) => x.id === called.confusableWith[randInt(rnd, called.confusableWith.length)]) || letter;
    up.set(i, { letter, until: tick + Math.max(2, Math.round(cfg.show / 350)) });
  };
  const tap = (i) => {
    engaged = true;
    const u = up.get(i); if (!u) return;
    if (u.letter.id === called.id) { hits++; A.addScore(10); A.sfx('pop'); up.delete(i); A.announce(`${called.name}! ${cfg.goal - hits} to go.`); if (hits >= cfg.goal) { draw(); A.finish({ won: true }); return; } newCall(); }
    else { A.addScore(-2); A.sfx('error_soft'); A.announce(`That was ${u.letter.name}, not ${called.name}.`); up.delete(i); }
    if (A.quiet) ensureTarget();
    draw();
  };
  const ensureTarget = () => {
    while (up.size < 4) popOne();
    if (![...up.values()].some((u) => u.letter.id === called.id)) { const i = [...up.keys()][randInt(rnd, up.size)]; up.set(i, { letter: called, until: Infinity }); }
    for (const u of up.values()) u.until = Infinity;
  };
  const step = () => {
    tick++;
    for (const [i, u] of [...up]) if (u.until <= tick) { if (u.letter.id === called.id) {
      if (!engaged) A.announce(`${called.name} sank back. Tap ${called.name} when it pops up; no heart is lost until your first tap.`);
      else { A.announce(`${called.name} sank back.`); if (A.miss()) { draw(); return; } }
    } up.delete(i); }
    if (up.size < Math.min(cfg.holes, 3 + A.level)) popOne();
    draw();
  };
  newCall();
  draw();
  if (!A.quiet) A.loop(step, 350);
  else { ensureTarget(); draw(); A.announce('Calm mode: letters stay up until you tap one.'); }
}

export const mount = mountArcade(spec, setup);
