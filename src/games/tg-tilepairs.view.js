// Tile Pairs: a stacked tile board. A tile can be taken when nothing sits on it and one side is open.
// Match a letter with its name (later its Hebrew name, look-alikes and finals, and its number) to clear the stack.
import { mountArcade } from './arcade.js';
import { LETTER_VALUES, shuffle } from './tg-core.js';
import { host, track, grade, draftNote, ensureStyle } from './tg-ui.js';

export const STORE_KEY = 'games.tg-tilepairs.v1';

/** Board shapes: [layer, rows, cols, rowOffset, colOffset]. Upper layers sit on the middle tiles below. */
const SHAPES = {
  small: [[0, 4, 4, 0, 0]],
  mid: [[0, 4, 5, 0, 0], [1, 2, 2, 1, 1.5]],
  big: [[0, 4, 6, 0, 0], [1, 2, 2, 1, 2]],
};
const spec = {
  id: 'tg-tilepairs', title: 'Tile Pairs', titleHe: 'זוּג',
  blurb: 'Tiles are stacked in layers. Take two tiles that belong together to clear them: a letter and its name, a final letter and its name, a letter and its number. You can only take a tile that has nothing on top and an open side.',
  howTo: ['Tap a free tile, then its partner. Grey tiles are blocked: something sits on them, or both sides are taken.', 'Tab moves between free tiles; Enter or Space picks one.', 'No moves left? The tiles reshuffle by themselves.'],
  levels: [
    { name: 'Letters and names', pairs: 8, face: 'name', shape: 'small', set: 'first' },
    { name: 'Twelve pairs, two layers', pairs: 12, face: 'name', shape: 'mid', set: 'all' },
    { name: 'Hebrew letter names', pairs: 12, face: 'nameHe', shape: 'mid', set: 'all' },
    { name: 'Look-alikes and finals', pairs: 12, face: 'name', shape: 'mid', set: 'tricky' },
    { name: 'Letters and numbers', pairs: 14, face: 'value', shape: 'big', set: 'base' },
  ],
  par: (l, cfg) => cfg.pairs * 10,
  seconds: (l, cfg) => 60 + cfg.pairs * 9,
  needsWords: false,
};

/** Positions for a shape: [{ layer, r, c }]. */
export function positions(shape) {
  const out = [];
  for (const [layer, rows, cols, ro, co] of SHAPES[shape]) for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) out.push({ layer, r: r + ro, c: c + co });
  return out;
}
/** A tile is free when no tile on the layer above overlaps it and its left or right neighbour on its own layer is gone. */
export function isFree(tile, tiles) {
  const live = tiles.filter((t) => !t.gone && t !== tile);
  if (live.some((t) => t.layer === tile.layer + 1 && Math.abs(t.r - tile.r) < 1 && Math.abs(t.c - tile.c) < 1)) return false;
  const left = live.some((t) => t.layer === tile.layer && t.r === tile.r && t.c === tile.c - 1);
  const right = live.some((t) => t.layer === tile.layer && t.r === tile.r && t.c === tile.c + 1);
  return !(left && right);
}
export const hasMove = (tiles) => {
  const free = tiles.filter((t) => !t.gone && isFree(t, tiles));
  return free.some((a) => free.some((b) => a !== b && a.pair === b.pair));
};

const TRICKY = ['ב', 'כ', 'ד', 'ר', 'ה', 'ח', 'ו', 'ז', 'ט', 'ס', 'ע', 'צ', 'ך', 'ם', 'ן', 'ף', 'ץ', 'ג', 'נ'];
function pickLetters(letters, set, n, rnd) {
  const base = letters.filter((l) => !l.isFinal);
  if (set === 'first') return base.slice(0, n);
  if (set === 'tricky') return shuffle(letters.filter((l) => TRICKY.includes(l.he)), rnd).slice(0, n);
  if (set === 'base') return shuffle(base, rnd).slice(0, n);
  return shuffle(base, rnd).slice(0, n);
}

function setup(A) {
  ensureStyle();
  const T = track(A), cfg = A.cfg, rnd = A.rnd;
  const W = 3.3, H = 3.7;
  const pos = positions(cfg.shape);
  const cols = Math.max(...pos.map((p) => p.c)) + 1, rows = Math.max(...pos.map((p) => p.r)) + 1;
  const stage = A.h('div', { class: 'tg-stack', role: 'group', 'aria-label': 'Tile stack', style: `position:relative;inline-size:${cols * W + 0.6}rem;block-size:${rows * H + 0.6}rem;margin:.5rem auto;max-inline-size:100%` });
  const prompt = A.h('p', { class: 'arc-prompt' });
  A.board.replaceChildren(host(A, 'rimon', 'Two that belong together. Take them off the top.'), prompt, stage,
    draftNote(A, 'Letter names follow the app\'s letter list. Values are the standard ones.'));
  const chosen = pickLetters(A.letters, cfg.set, cfg.pairs, rnd);
  if (chosen.length < 2) { A.announce('The letters did not load. Press Start again.'); return; }
  const faceOf = (l) => (cfg.face === 'value' ? String(LETTER_VALUES[l.he] || '') : cfg.face === 'nameHe' ? l.nameHe : l.name);
  const faces = chosen.flatMap((l, i) => [{ pair: i, text: l.he, he: true, letter: l }, { pair: i, text: faceOf(l), he: cfg.face === 'nameHe', letter: l }]);
  const tiles = shuffle(pos, rnd).slice(0, faces.length).map((p, i) => ({ ...p, ...faces[i], gone: false, el: null }));
  let picked = null, cleared = 0;
  const label = (t) => (t.he && t.text === t.letter.he ? `letter ${t.letter.name}` : t.text);
  const draw = () => {
    for (const t of tiles) {
      if (t.gone) { t.el?.remove(); continue; }
      if (!t.el) {
        t.el = A.h('button', { type: 'button', class: 'arc-choice tg-tile-btn', style: `position:absolute;inline-size:${W - 0.25}rem;block-size:${H - 0.25}rem;padding:0;font-size:${t.text.length > 4 ? '.85' : '1.5'}rem;inset-inline-start:${t.c * W + t.layer * 0.3}rem;inset-block-start:${t.r * H - t.layer * 0.3 + 0.3}rem;z-index:${t.layer + 1}` },
          A.h('span', t.he ? { lang: 'he', dir: 'rtl' } : {}, t.text));
        t.el.addEventListener('click', () => pick(t));
        stage.append(t.el);
      }
      const free = isFree(t, tiles);
      t.el.disabled = !free;
      t.el.setAttribute('aria-label', `${label(t)}${t.layer ? ', upper layer' : ''}${free ? '' : ', blocked'}${picked === t ? ', picked' : ''}`);
      t.el.classList.toggle('is-good', picked === t);
    }
    prompt.textContent = `${cleared} of ${chosen.length} pairs cleared.`;
  };
  const reshuffle = () => {
    const live = tiles.filter((t) => !t.gone);
    // Two tiles stacked one on the other can never both be free: lay what is left flat on the bottom layer first.
    if (live.some((t) => t.layer > 0) && live.length <= 4) live.forEach((t, i) => { t.layer = 0; t.r = 0; t.c = i; t.el?.remove(); t.el = null; });
    for (let guard = 0; guard < 60 && !hasMove(tiles); guard++) {
      const mixed = shuffle(live.map(({ pair, text, he, letter }) => ({ pair, text, he, letter })), rnd);
      live.forEach((t, i) => { Object.assign(t, mixed[i]); t.el?.remove(); t.el = null; });
    }
    A.announce('No pairs were free, so the tiles were reshuffled.');
  };
  const pick = (t) => {
    if (t.gone || !isFree(t, tiles)) return;
    if (!picked || picked === t) { picked = picked === t ? null : t; draw(); return; }
    if (picked.pair === t.pair) {
      picked.gone = true; t.gone = true; cleared += 1; picked = null;
      grade(A, true, { right: `${t.letter.he} and ${faceOf(t.letter)}: a pair.` });
      if (t.letter && cfg.face !== 'value') A.sayLetter(t.letter);
      if (cleared === chosen.length) { draw(); A.addScore(20); T.end({ won: true }); return; }
      if (!hasMove(tiles)) reshuffle();
    } else {
      grade(A, false, { wrong: `${label(picked)} and ${label(t)} are not a pair.` });
      picked = null;
    }
    draw();
  };
  if (!hasMove(tiles)) reshuffle();
  draw();
}

export const mount = mountArcade(spec, setup);
