// Same Sound Pairs: every tile is face up. Each sound on the board is written two ways: patach and kamatz, holam and
// holam with a vav, kubutz and shuruk, or two letters that sound alike (samekh and sin, tet and tav). Find the partners.
// Built from the app's syllable tables (src/games/syllables.js); Israeli sounds.
import { mountArcade } from './arcade.js';
import { pairsBoard } from './g1-core.js';
import { host, track, grade, draftNote, ensureStyle, he, markButton, loadSyllables, saySyllable } from './g1-ui.js';

export const STORE_KEY = 'games.g1-soundpairs.v1';

const spec = {
  id: 'g1-soundpairs', title: 'Same Sound Pairs', titleHe: 'צֶמֶד',
  blurb: 'Hebrew often has two ways to write the same sound. All the tiles are face up: find the two that sound the same. Early boards pair vowel spellings; later boards pair letters that sound alike.',
  howTo: ['Tap a tile, then the tile that sounds the same.', 'A right pair locks and tells you why they match. A wrong pair costs a point.', 'Tab moves between tiles; Enter or Space picks one.', 'Levels 3 to 5 bring letter twins: samekh and sin, tet and tav, qof and kaf, vav and vet, chet and khaf.'],
  levels: [
    { name: 'Three vowel pairs', pairs: 3, mode: 'vowel', boards: 3 },
    { name: 'Four vowel pairs', pairs: 4, mode: 'vowel', boards: 3 },
    { name: 'Letter twins', pairs: 4, mode: 'letter', boards: 3 },
    { name: 'Five pairs, mixed', pairs: 5, mode: 'mixed', boards: 3 },
    { name: 'Six pairs, mixed', pairs: 6, mode: 'mixed', boards: 3 },
  ],
  par: (l, cfg) => cfg.pairs * cfg.boards * 10,
  seconds: (l, cfg) => 20 + cfg.pairs * cfg.boards * 8,
  needsWords: false, needsLetters: false,
};

function setup(A) {
  ensureStyle();
  const T = track(A), cfg = A.cfg, rnd = A.rnd;
  const prompt = A.h('p', { class: 'arc-prompt' });
  const grid = A.h('div', {});
  A.board.replaceChildren(host(A, 'noa', 'Two spellings, one sound. Find the partners.'), prompt, grid,
    draftNote(A, 'Israeli sounds. In Ashkenazi reading some of these pairs sound different (kamatz and patach, tav without a dot).'));
  let syllables = [], n = 0;
  const board = () => {
    if (!T.live()) return;
    if (n >= cfg.boards) { T.end({ won: true }); return; }
    n += 1;
    const tiles = pairsBoard(cfg.pairs, cfg.mode, rnd);
    let picked = null, left = cfg.pairs;
    prompt.textContent = `Board ${n} of ${cfg.boards}: ${left} pairs to find.`;
    grid.replaceChildren(A.h('div', { class: 'g1-row g1-rtl', role: 'group', 'aria-label': 'Tiles' }, ...tiles.map((t, k) => {
      const b = A.h('button', { type: 'button', class: 'g1-card', 'aria-label': `Tile ${k + 1}: ${t.he}` }, he(A, t.he));
      b.addEventListener('click', () => {
        if (b.disabled) return;
        if (!picked || picked.b === b) { picked?.b.classList.remove('is-picked'); picked = picked?.b === b ? null : { b, t }; if (picked) b.classList.add('is-picked'); saySyllable(A, syllables, t.he); return; }
        const ok = picked.t.key === t.key;
        picked.b.classList.remove('is-picked');
        if (ok) {
          for (const x of [picked.b, b]) { x.disabled = true; markButton(A, x, true); }
          left -= 1;
          grade(A, true, { right: `Both say “${t.tr}”: ${t.why}.` });
          prompt.textContent = `Board ${n} of ${cfg.boards}: ${left} pairs to find.`;
          if (!left) { A.addScore(10); T.later(700, board); }
        } else grade(A, false, { wrong: `${picked.t.he} says “${picked.t.tr}”, ${t.he} says “${t.tr}”.` });
        picked = null;
      });
      return b;
    })));
  };
  loadSyllables(A.ctx).then((s) => { syllables = s; }).catch(() => {});
  board();
}

export const mount = mountArcade(spec, setup);
