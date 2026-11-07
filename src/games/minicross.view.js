// Mini Crossword: a small grid built from the word bank. English clues, Hebrew answers, typed with the
// on-screen keyboard. Across runs right to left; down runs top to bottom.
import { mountArcade } from './arcade.js';
import { buildCrossword, wordsOfLength, pickSeeded, ALPHABET, FINAL_TO_BASE } from './arcade.model.js';

export const STORE_KEY = 'games.minicross.v1';

const spec = {
  id: 'minicross', title: 'Mini Crossword', titleHe: 'תַּשְׁבֵּץ',
  blurb: 'A small crossword from the word bank. Clues in English, answers in Hebrew. Across words read right to left, down words top to bottom.',
  howTo: ['Tap a clue, or a square, to select a word.', 'Type with the Hebrew keyboard below; letters fill right to left (across) or downward (down).', 'A finished word turns green when every letter is right. Check shows wrong letters in red for a small cost.', 'Fill the whole grid to finish.'],
  levels: [
    { name: '3 words, short', words: 3, min: 2, max: 4 },
    { name: '4 words', words: 4, min: 3, max: 5 },
    { name: '5 words, with sounds', words: 5, min: 3, max: 5, hint: true },
    { name: '6 words', words: 6, min: 3, max: 6 },
    { name: '7 words, no sounds', words: 7, min: 3, max: 7 },
  ],
  par: (l, cfg) => cfg.words * 20,
  seconds: (l, cfg) => 180 + l * 30,
};

function setup(A) {
  const cfg = A.cfg, rnd = A.rnd;
  const pool = pickSeeded(wordsOfLength(A.words, cfg.min, cfg.max), 40, rnd);
  const cw = buildCrossword(pool, rnd, cfg.words);
  if (cw.entries.length < 2) { A.announce('Could not build a crossword from these words. Try again.'); return; }
  const typed = new Map();
  let active = cw.entries[0], cursor = 0;
  const key = (r, c) => `${r},${c}`;
  const grid = A.h('div', { class: 'arc-grid', role: 'grid', 'aria-label': 'Crossword', style: `grid-template-columns: repeat(${cw.cols}, var(--arc-cell))` });
  const cellEls = new Map();
  for (let r = 0; r < cw.rows; r++) for (let c = 0; c < cw.cols; c++) {
    const k = key(r, c), inGrid = cw.cells.has(k);
    const el = inGrid ? A.h('button', { type: 'button', class: 'arc-cell', lang: 'he', dir: 'rtl', onclick: () => selectAt(r, c) }) : A.h('span', { class: 'arc-cell is-blank', 'aria-hidden': 'true' });
    cellEls.set(k, el); grid.append(el);
  }
  const clues = A.h('div', {});
  const kb = A.h('div', { class: 'arc-keyboard', role: 'group', 'aria-label': 'Hebrew keyboard' });
  const rows = [ALPHABET.slice(0, 8), ALPHABET.slice(8, 15), ALPHABET.slice(15)];
  kb.replaceChildren(...rows.map((row) => A.h('div', { class: 'arc-keyrow' }, ...row.map((ch) => A.h('button', { type: 'button', class: 'arc-key', lang: 'he', dir: 'rtl', onclick: () => type(ch) }, ch)))),
    A.h('div', { class: 'arc-keyrow' }, A.h('button', { type: 'button', class: 'arc-key', style: 'min-width:4rem', onclick: () => type(null) }, '⌫'), A.h('button', { type: 'button', class: 'arc-key', style: 'min-width:5rem', onclick: () => check() }, 'Check')));
  A.board.replaceChildren(grid, clues, kb);
  const cellsOf = (e) => [...Array(e.len).keys()].map((i) => e.dir === 'down' ? [e.r + i, e.c] : [e.r, e.c - i]);
  const draw = () => {
    for (const [k, el] of cellEls) { if (!cw.cells.has(k)) continue; el.className = 'arc-cell'; el.textContent = typed.get(k) || ''; }
    for (const e of cw.entries) if (isSolved(e)) for (const [r, c] of cellsOf(e)) cellEls.get(key(r, c)).classList.add('is-good');
    const ac = cellsOf(active); ac.forEach(([r, c]) => cellEls.get(key(r, c)).classList.add('is-selected'));
    const cur = ac[Math.min(cursor, ac.length - 1)]; cellEls.get(key(...cur)).classList.add('is-target');
    clues.replaceChildren(...['across', 'down'].map((dir) => A.h('div', {}, A.h('strong', {}, dir === 'across' ? 'Across (right to left)' : 'Down'), A.h('ul', { style: 'margin:.2rem 0 .5rem 1rem' }, ...cw.entries.filter((e) => e.dir === dir).map((e) => A.h('li', {}, A.h('button', { type: 'button', class: 'arc-choice', style: 'font-size:.95rem;min-height:40px' + (e === active ? ';outline:2px solid var(--accent,#2a6)' : '') + (isSolved(e) ? ';opacity:.6;text-decoration:line-through' : ''), onclick: () => { active = e; cursor = 0; draw(); if (cfg.hint) A.sayWord(e.word); } }, `${e.en || e.word.en} (${e.len})${cfg.hint ? ` · "${e.word.translit}"` : ''}`)))))));
  };
  const isSolved = (e) => cellsOf(e).every(([r, c], i) => { const want = cw.cells.get(key(r, c)); const have = typed.get(key(r, c)); return have && (have === want || FINAL_TO_BASE[have] === want || FINAL_TO_BASE[want] === have); });
  const selectAt = (r, c) => { const here = cw.entries.filter((e) => cellsOf(e).some(([a, b]) => a === r && b === c)); if (!here.length) return; active = here.includes(active) && here.length > 1 ? here[(here.indexOf(active) + 1) % here.length] : here[0]; cursor = cellsOf(active).findIndex(([a, b]) => a === r && b === c); draw(); };
  let solvedCount = 0;
  const type = (ch) => {
    const ac = cellsOf(active);
    if (ch === null) { cursor = Math.max(0, cursor - 1); typed.delete(key(...ac[cursor])); draw(); return; }
    typed.set(key(...ac[Math.min(cursor, ac.length - 1)]), ch); cursor = Math.min(ac.length, cursor + 1);
    const now = cw.entries.filter(isSolved).length;
    if (now > solvedCount) { A.addScore(20 * (now - solvedCount)); A.sfx('success'); const e = cw.entries.find((x) => isSolved(x) && x !== active) || active; A.announce(`${active.word.he}: ${active.word.en}.`); A.sayWord(active.word); solvedCount = now; }
    draw();
    if (solvedCount === cw.entries.length) { A.addScore(20); A.finish({ won: true }); }
  };
  const check = () => { let wrong = 0; for (const [k, el] of cellEls) { if (!cw.cells.has(k) || !typed.has(k)) continue; const want = cw.cells.get(k), have = typed.get(k); if (!(have === want || FINAL_TO_BASE[have] === want || FINAL_TO_BASE[want] === have)) { el.classList.add('is-bad'); wrong++; } } A.addScore(-2); A.miss(); A.announce(wrong ? `${wrong} wrong letter${wrong === 1 ? '' : 's'} marked.` : 'Everything typed so far is right.'); };
  A.keys((k2, e) => { if (/^[א-ת]$/.test(e.key)) { type(e.key); return true; } if (e.key === 'Backspace') { type(null); return true; } return false; });
  A.setLives(0);
  draw();
}

export const mount = mountArcade(spec, setup);
