// River Hop: cross the river on stepping stones. Each row of stones holds syllables; the syllable to hop to is called
// by its sound ("mo", "shi"). You can only reach the stones next to the one you stand on, and the stones beside the
// right one share its letter or its vowel. Syllables from the app's table (data/lab/syllables.json); Israeli sounds.
import { mountArcade } from './arcade.js';
import { shuffle } from './g1-core.js';
import { host, track, grade, draftNote, ensureStyle, he, loadSyllables, saySyllable } from './g1-ui.js';

export const STORE_KEY = 'games.g1-riverhop.v1';

const spec = {
  id: 'g1-riverhop', title: 'River Hop', titleHe: 'קָפַץ',
  blurb: 'Rimon has to cross the river. Each hop is called by its sound: find that syllable on a stone you can reach (the row ahead, straight on or one step to the side). The stones around it look and sound close, so read carefully.',
  howTo: ['Read the sound called at the top.', 'Tap the stone in the next row that says it. Only the stones you can reach are open.', 'A wrong stone costs a point; Rimon stays put.', 'Later rivers are longer and wider, with closer look-alikes.'],
  levels: [
    { name: 'Narrow river', rows: 4, cols: 3, rivers: 3, close: false },
    { name: 'Longer river', rows: 5, cols: 3, rivers: 3, close: true },
    { name: 'Wide river', rows: 5, cols: 4, rivers: 3, close: true },
    { name: 'Long and wide', rows: 6, cols: 4, rivers: 3, close: true },
    { name: 'The great river', rows: 7, cols: 5, rivers: 3, close: true },
  ],
  par: (l, cfg) => cfg.rows * cfg.rivers * 10,
  seconds: (l, cfg) => 20 + cfg.rows * cfg.rivers * 8,
  needsWords: false, needsLetters: false,
};

/**
 * A river: rows of stones, each row with one right stone (path[r] is its column, a step of at most one from the row
 * before) and look-alike stones whose sound is different. Every stone in a row has a different sound.
 */
export function makeRiver(syllables, rows, cols, close, rnd = Math.random) {
  const path = [Math.floor(rnd() * cols)];
  while (path.length < rows) { const c = path[path.length - 1] + Math.floor(rnd() * 3) - 1; path.push(Math.max(0, Math.min(cols - 1, c))); }
  const grid = path.map((col) => {
    const want = syllables[Math.floor(rnd() * syllables.length)];
    const near = syllables.filter((s) => s.tr !== want.tr && (s.letter === want.letter || s.vowel === want.vowel));
    const pool = shuffle(close ? near : syllables.filter((s) => s.tr !== want.tr), rnd);
    const row = [], used = new Set([want.tr]);
    for (const s of pool) { if (row.length >= cols - 1) break; if (!used.has(s.tr)) { used.add(s.tr); row.push(s); } }
    row.splice(col, 0, want);
    return row;
  });
  return { path, grid };
}
export const reachable = (from, col) => from === null || Math.abs(from - col) <= 1;

function setup(A) {
  ensureStyle();
  const T = track(A), cfg = A.cfg, rnd = A.rnd;
  const prompt = A.h('p', { class: 'arc-prompt' });
  const riverEl = A.h('div', { class: 'g1-river', style: `--cols:${cfg.cols}` });
  A.board.replaceChildren(host(A, 'rimon-fly', 'Wish me luck. Call the stones!'), prompt, riverEl,
    draftNote(A, 'The far bank is at the top. Israeli sounds.'));
  let syllables = [], n = 0;
  const river = () => {
    if (!T.live()) return;
    if (n >= cfg.rivers) { T.end({ won: true }); return; }
    n += 1;
    const { path, grid } = makeRiver(syllables, cfg.rows, cfg.cols, cfg.close, rnd);
    let row = 0, at = null;
    const draw = () => {
      const want = grid[row]?.[path[row]];
      prompt.textContent = want ? `River ${n} of ${cfg.rivers}, hop ${row + 1} of ${cfg.rows}: hop to “${want.tr}”.` : `River ${n} crossed!`;
      riverEl.replaceChildren(A.h('p', { class: 'muted' }, 'Far bank'), ...grid.map((stones, r) => ({ stones, r })).reverse().map(({ stones, r }) =>
        A.h('div', { class: 'g1-river-row', role: 'group', 'aria-label': `Row ${r + 1}` }, ...stones.map((s, c) => {
          const here = r === row - 1 && c === at;
          const b = A.h('button', { type: 'button', class: `g1-stone${here ? ' is-here' : ''}`, 'aria-label': here ? `${s.he}, Rimon is here` : s.he }, he(A, s.he));
          if (r !== row || !reachable(at, c)) b.disabled = true;
          b.addEventListener('click', () => hop(r, c, s, b));
          return b;
        }))), A.h('p', { class: 'muted' }, 'Near bank'));
    };
    const hop = (r, c, s, b) => {
      if (b.disabled || r !== row) return;
      if (c === path[row]) {
        grade(A, true, { right: `Hop! “${s.tr}”.` });
        saySyllable(A, syllables, s.he);
        at = c; row += 1;
        if (row >= cfg.rows) { A.addScore(15); draw(); A.announce(`Across river ${n}!`); T.later(800, river); return; }
        draw();
      } else grade(A, false, { wrong: `That stone says “${s.tr}”.` });
    };
    draw();
  };
  loadSyllables(A.ctx).then((s) => { syllables = s; river(); })
    .catch(() => A.announce('The syllables did not load. Check the connection and press Start again.'));
}

export const mount = mountArcade(spec, setup);
