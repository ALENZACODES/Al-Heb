// Word Search: find the hidden words in the grid. Tap the first letter, then the last; Hebrew runs right to left
// and down. Every word has its meaning in the list; tap a list entry to hear it.
import { mountArcade, makeGrid } from './arcade.js';
import { buildWordSearch, wordsOfLength, pickSeeded } from './arcade.model.js';

export const STORE_KEY = 'games.wordsearch.v1';

const spec = {
  id: 'wordsearch', title: 'Word Search', titleHe: 'חִפּוּשׂ מִלִּים',
  blurb: 'Words hide in the grid, written right to left or straight down. Find them all. The list shows each word with its meaning; tap a word in the list to hear it.',
  howTo: ['Tap the first letter of a word, then its last letter. The run between them is checked.', 'Hebrew words run right to left; some run top to bottom. Level 4 adds diagonals.', 'Found words stay lit and get crossed off the list.', 'Find every word to finish; the clock sets your bonus.'],
  levels: [
    { name: '6 x 6, four words', size: 6, words: 4, min: 2, max: 4 },
    { name: '7 x 7, five words', size: 7, words: 5, min: 3, max: 5 },
    { name: '8 x 8, six words', size: 8, words: 6, min: 3, max: 6 },
    { name: '9 x 9, with diagonals', size: 9, words: 7, min: 3, max: 6, diagonal: true },
    { name: '10 x 10, eight words, one theme', size: 10, words: 8, min: 3, max: 7, diagonal: true, theme: true },
  ],
  par: (l, cfg) => cfg.words * 15,
  seconds: (l, cfg) => 120 + l * 20,
};

function setup(A) {
  const cfg = A.cfg, rnd = A.rnd;
  let pool = wordsOfLength(A.words, cfg.min, cfg.max);
  if (cfg.theme) { const themes = [...new Set(pool.map((w) => w.theme))]; const t = themes[Math.floor(rnd() * themes.length)]; const tp = pool.filter((w) => w.theme === t); if (tp.length >= cfg.words) pool = tp; }
  const chosen = pickSeeded(pool, cfg.words, rnd);
  const { grid, placed } = buildWordSearch(chosen, cfg.size, rnd, !!cfg.diagonal);
  if (!placed.length) { A.announce('Could not build a grid.'); return; }
  const found = new Set();
  let first = null;
  const { el, cells } = makeGrid(cfg.size, cfg.size, { label: 'Word search grid', onCell: (r, c) => tap(r, c) });
  grid.forEach((row, r) => row.forEach((ch, c) => { cells[r][c].textContent = ch; cells[r][c].setAttribute('aria-label', `row ${r + 1} column ${c + 1}: ${ch}`); }));
  const list = A.h('ul', { class: 'arc-choices', style: 'list-style:none;padding:0', 'aria-label': 'Words to find' });
  const items = new Map();
  for (const p of placed) {
    const li = A.h('li', {}, A.h('button', { type: 'button', class: 'arc-choice', style: 'font-size:1rem', onclick: () => { A.sayWord(p.word); A.announce(`${p.word.he}: ${p.word.en}`); } }, A.heSpan(p.word.he), ` ${p.word.en}`));
    items.set(p.word.id, li); list.append(li);
  }
  A.board.replaceChildren(A.h('p', { class: 'arc-prompt' }, `${placed.length} words hidden. Tap first letter, then last.`), el, list);
  const tap = (r, c) => {
    if (!first) { first = [r, c]; cells[r][c].classList.add('is-selected'); return; }
    const [r0, c0] = first; cells[r0][c0].classList.remove('is-selected'); first = null;
    const hit = placed.find((p) => !found.has(p.word.id) && ((p.cells[0][0] === r0 && p.cells[0][1] === c0 && p.cells.at(-1)[0] === r && p.cells.at(-1)[1] === c) || (p.cells[0][0] === r && p.cells[0][1] === c && p.cells.at(-1)[0] === r0 && p.cells.at(-1)[1] === c0)));
    if (hit) {
      found.add(hit.word.id); for (const [a, b] of hit.cells) cells[a][b].classList.add('is-found');
      const li = items.get(hit.word.id); li.style.textDecoration = 'line-through'; li.style.opacity = '.6';
      A.addScore(15); A.sfx('success'); A.announce(`${hit.word.he}, ${hit.word.en}. ${placed.length - found.size} left.`); A.sayWord(hit.word);
      if (found.size === placed.length) { A.addScore(20); A.finish({ won: true }); }
    } else { A.addScore(-1); A.sfx('error_soft'); A.miss(); A.announce('No word between those two squares.'); }
  };
  A.setLives(0);
}

export const mount = mountArcade(spec, setup);
