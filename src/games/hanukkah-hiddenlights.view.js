// Hidden Lights: Hanukkah words hide in a grid of letters, written right to left or top to bottom (diagonals later).
// Tap a word's first letter, then its last. The list gives each word's meaning; found words light up.
import { makeGrid } from './arcade.js';
import { buildWordSearch, bareLetters, pickSeeded } from './arcade.model.js';
import { mountHanukkahArcade, spellable } from './hanukkah-shell.js';

export const STORE_KEY = 'games.hanukkah-hiddenlights.v1';

const spec = {
  id: 'hanukkah-hiddenlights', title: 'Hidden Lights', titleHe: 'אוֹר',
  blurb: 'Hanukkah words hide in the letter grid. Find them all. The list shows what each one means; tap a word in the list to see it with its vowels.',
  howTo: ['Tap the first letter of a word, then its last. Hebrew runs right to left; some words run top to bottom.', 'Level 4 adds diagonals.', 'Found words light up and are crossed off the list.', 'Later levels list only the English: find the Hebrew yourself.'],
  levels: [
    { name: '6 x 6, four words', size: 6, words: 4, max: 5, showHe: true },
    { name: '7 x 7, five words', size: 7, words: 5, max: 6, showHe: true },
    { name: '7 x 7, English list only', size: 7, words: 5, max: 6, showHe: false },
    { name: '8 x 8, diagonals', size: 8, words: 6, max: 7, showHe: false, diagonal: true },
    { name: '9 x 9, seven words', size: 9, words: 7, max: 8, showHe: false, diagonal: true },
  ],
  par: (l, cfg) => cfg.words * 15,
  seconds: (l) => 110 + l * 20,
};

function setup(A, data) {
  const cfg = A.cfg, rnd = A.rnd, h = A.h;
  const pool = spellable(data).filter((w) => { const n = bareLetters(w.he).length; return n >= 2 && n <= cfg.max; });
  // one entry per spelling, so two words can never claim the same run of letters
  const seen = new Set(); const unique = pool.filter((w) => { const k = bareLetters(w.he); if (seen.has(k)) return false; seen.add(k); return true; });
  const { grid, placed } = buildWordSearch(pickSeeded(unique, cfg.words, rnd), cfg.size, rnd, !!cfg.diagonal);
  if (!placed.length) { A.announce('Could not build a grid. Try again.'); return; }
  const found = new Set();
  let first = null;
  const { el, cells } = makeGrid(cfg.size, cfg.size, { label: 'Letter grid', onCell: (r, c) => tap(r, c) });
  grid.forEach((row, r) => row.forEach((ch, c) => { cells[r][c].textContent = ch; cells[r][c].setAttribute('aria-label', `row ${r + 1}, column ${c + 1} from the right: ${ch}`); }));
  const list = h('ul', { class: 'arc-choices', style: 'list-style:none;padding:0', 'aria-label': 'Words to find' });
  const items = new Map();
  for (const p of placed) {
    const btn = h('button', { type: 'button', class: 'arc-choice', style: 'font-size:1rem', onclick: () => { A.sayWord(p.word); A.announce(`${p.word.en}: ${found.has(p.word.key) || cfg.showHe ? p.word.translit : 'find it in the grid'}.`); } },
      cfg.showHe ? A.heSpan(p.word.he) : null, ` ${p.word.en}`);
    const li = h('li', {}, btn);
    items.set(p.word.key, { li, btn }); list.append(li);
  }
  A.board.replaceChildren(h('p', { class: 'arc-prompt' }, `${placed.length} words hidden. Tap the first letter, then the last.`), el, list);
  const same = (a, b) => a[0] === b[0] && a[1] === b[1];
  function tap(r, c) {
    if (!first) { first = [r, c]; cells[r][c].classList.add('is-selected'); return; }
    const a = first; cells[a[0]][a[1]].classList.remove('is-selected'); first = null;
    const hit = placed.find((p) => !found.has(p.word.key) && ((same(p.cells[0], a) && same(p.cells.at(-1), [r, c])) || (same(p.cells[0], [r, c]) && same(p.cells.at(-1), a))));
    if (!hit) { A.addScore(-1); A.sfx('error_soft'); A.miss(); A.announce('No word between those two letters.'); return; }
    found.add(hit.word.key);
    for (const [x, y] of hit.cells) cells[x][y].classList.add('is-found');
    const it = items.get(hit.word.key); it.li.style.textDecoration = 'line-through'; it.li.style.opacity = '.7';
    if (!cfg.showHe) it.btn.prepend(A.heSpan(hit.word.he));
    A.addScore(15); A.sfx('success'); A.sayWord(hit.word);
    A.announce(`${hit.word.translit}, ${hit.word.en}. ${placed.length - found.size} left.`);
    if (found.size === placed.length) { A.addScore(15); A.finish({ won: true }); }
  }
}

export const mount = mountHanukkahArcade(spec, setup);
