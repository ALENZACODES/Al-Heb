// Ending Grid: small Hebrew words take the person as an ending: shel-i (mine), l-i (to me), it-i (with me), ot-i (me).
// Fill the table: each column is one little word, each row a person. Pick a tile from the tray, then its cell.
import { mountArcade } from './arcade.js';
import { loadG3, shuffle, sharedPersons } from './g3-core.js';
import { begin, grade, heText } from './g3-ui.js';

export const STORE_KEY = 'games.g3-grid.v1';
const GRIDS = 2;
const spec = {
  id: 'g3-grid', title: 'Ending Grid', titleHe: 'לוּחַ',
  blurb: 'Words like shel (of), le (to), im (with) and et (the object marker) do not stand before "me" or "him": the person becomes an ending. Down a column the ending changes with the person; across a row the same ending sits on different words. Fill the table and the pattern shows itself.',
  howTo: ['Tap a tile in the tray, then the empty cell where it belongs.', 'Each row is a person, each column a word. The filled cells are your clues.', 'A wrong cell costs points; the tile stays picked so you can try again.', 'Two tables per round.'],
  levels: [
    { name: 'Mine and to me', cols: ['shel', 'le'], rows: ['1sg', '3msg', '3fsg', '1pl'], empty: 0.5 },
    { name: 'Add "you"', cols: ['shel', 'le'], rows: null, empty: 0.5 },
    { name: 'With me too', cols: ['shel', 'le', 'im'], rows: null, empty: 0.5 },
    { name: 'Four words', cols: ['shel', 'le', 'im', 'et'], rows: null, empty: 0.5 },
    { name: 'Nearly empty', cols: ['le', 'im', 'et', 'el'], rows: null, empty: 0.8 },
  ],
  par: (l, cfg) => GRIDS * 10 * Math.round(cfg.cols.length * (cfg.rows ? cfg.rows.length : 6) * cfg.empty),
  seconds: () => 240,
  needsWords: false, needsLetters: false,
};
/** The cells of one table: [{ person, prep, he, empty }], with `share` of them empty (at least one per column). */
export function gridCells(preps, persons, share, rnd = Math.random) {
  const cells = persons.flatMap((person) => preps.map((p) => ({ person, prep: p.key, he: p.forms[person].he, empty: false })));
  const k = Math.max(preps.length, Math.round(cells.length * share));
  for (const c of shuffle(cells, rnd).slice(0, k)) c.empty = true;
  return cells;
}

function setup(A) {
  const { T, big, prompt, area } = begin(A, 'noa', 'Rows are people, columns are words.',
    'Endings are copied from the app\'s word lists and phrasebook (data/games/g3/suffixes.json). Not reviewed by a teacher.');
  big.textContent = '';
  const cfg = A.cfg, rnd = A.rnd;
  let suf = null, g = 0, picked = null, left = 0;
  const table = () => {
    const preps = cfg.cols.map((k) => suf.preps.find((p) => p.key === k));
    const persons = cfg.rows || sharedPersons(preps).slice(0, 6);
    const cells = gridCells(preps, persons, cfg.empty, rnd);
    left = cells.filter((c) => c.empty).length; picked = null;
    const grid = A.h('div', { class: 'g3-grid', role: 'grid', 'aria-label': 'Endings table', style: `grid-template-columns:repeat(${preps.length + 1},minmax(4.5rem,1fr))` });
    const head = [A.h('span', { class: 'g3-cell is-head' }, ''), ...preps.map((p) => A.h('span', { class: 'g3-cell is-head', role: 'columnheader' }, heText(A, p.he), A.h('small', { style: 'display:block' }, p.en)))];
    const body = persons.flatMap((person) => [A.h('span', { class: 'g3-cell is-head', role: 'rowheader' }, suf.personEn[person]), ...preps.map((p) => {
      const c = cells.find((x) => x.person === person && x.prep === p.key);
      if (!c.empty) return A.h('span', { class: 'g3-cell is-filled', lang: 'he', dir: 'rtl' }, c.he);
      const b = A.h('button', { type: 'button', class: 'g3-cell', 'aria-label': `${p.he} for ${suf.personEn[person]}, empty`, onclick: () => place(c, b) }, '?');
      return b;
    })]);
    grid.replaceChildren(...head, ...body);
    const tray = A.h('div', { class: 'arc-choices', role: 'group', 'aria-label': 'Tiles' });
    const tiles = shuffle(cells.filter((c) => c.empty), rnd).map((c) => {
      const t = A.h('button', { type: 'button', class: 'arc-choice', lang: 'he', dir: 'rtl', 'aria-pressed': 'false', onclick: () => { for (const x of tray.querySelectorAll('button')) x.setAttribute('aria-pressed', 'false'); picked = { c, t }; t.setAttribute('aria-pressed', 'true'); A.announce(`${c.he} picked. Now tap its cell.`); } }, c.he);
      return t;
    });
    tray.replaceChildren(...tiles);
    prompt.textContent = `Table ${g} of ${GRIDS}: ${left} cells to fill.`;
    area.replaceChildren(grid, tray);
  };
  const place = (cell, b) => {
    if (!picked || !T.live()) { A.announce('Pick a tile from the tray first.'); return; }
    const fits = picked.c.he === cell.he;
    if (fits) {
      b.textContent = cell.he; b.disabled = true; b.classList.add('is-filled'); b.setAttribute('aria-label', `${cell.he}, ${suf.personEn[cell.person]}`);
      picked.t.disabled = true; picked.t.setAttribute('aria-pressed', 'false'); picked = null; left -= 1;
      grade(A, true, { right: `${cell.he}: ${suf.preps.find((p) => p.key === cell.prep).en}, ${suf.personEn[cell.person]}.` });
      prompt.textContent = `Table ${g} of ${GRIDS}: ${left} cells to fill.`;
      if (!left) { if (g >= GRIDS) T.end({ won: true }); else T.later(800, () => { g += 1; table(); }); }
    } else grade(A, false, { wrong: `${picked.c.he} does not go there. Check the row (the person) and the column (the word).` });
  };
  loadG3(A.ctx, 'suffixes').then((d) => { if (!T.live()) return; suf = d; g = 1; table(); })
    .catch(() => A.announce('The table did not load. Check the connection and press Start again.'));
}

export const mount = mountArcade(spec, setup);
