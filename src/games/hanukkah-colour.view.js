// Colour by Letter: a Hanukkah picture (a candle, a dreidel, a coin, the oil jar, a hanukkiah) is drawn as squares, and each
// square shows a Hebrew letter. The key says which colour goes with which letter. Pick a colour, then paint every square
// with its letter. Later levels use letters that look alike (ב and כ, ד and ר, ה and ח, ו and ז).
import { pickSeeded } from './arcade.model.js';
import { mountHanukkahArcade, byKey } from './hanukkah-shell.js';

export const STORE_KEY = 'games.hanukkah-colour.v1';

// '.' is background; each other character is one colour region.
export const PICTURES = Object.freeze({
  candle: { en: 'a candle', rows: ['.a.', '.b.', 'ccc', 'ccc', 'ccc', 'ccc', 'ddd'] },
  dreidel: { en: 'a dreidel', rows: ['..a..', '..a..', 'bbbbb', 'bcccb', 'bcccb', '.bbb.', '..d..'] },
  coin: { en: 'a gelt coin', rows: ['.aaa.', 'abbba', 'abcba', 'abbba', '.aaa.'] },
  jar: { en: 'the jar of oil', rows: ['.aaa.', '..b..', '.ccc.', 'ccccc', 'cdddc', '.ccc.'] },
  hanukkiah: { en: 'a hanukkiah', rows: ['....a....', 'aaaabaaaa', 'bbbbcbbbb', 'ddddddddd', '...ddd...'] },
});
// colours: key, swatch, and the word for it (a key in data/games/hanukkah/words.json)
const COLOURS = [
  { word: 'kachol', css: '#3b6fd8' }, { word: 'tzahov', css: '#f2cf3c' }, { word: 'katom', css: '#f08a24' },
  { word: 'lavan', css: '#f7f5ee' }, { word: 'zahav', css: '#c9a23a' },
];
const EASY = [...'אבגדלמנשת'];
const LOOKALIKE_PAIRS = [['ב', 'כ'], ['ד', 'ר'], ['ה', 'ח'], ['ו', 'ז'], ['ג', 'נ']];

/** Pure: regions (letters a, b, c ...) used by a picture, in order. */
export function regionsOf(pic) { return [...new Set(pic.rows.join('').replace(/\./g, ''))].sort(); }
/** Pure: give each region a distinct Hebrew letter. lookalike puts confusable letters side by side. */
export function assignLetters(regions, lookalike, rnd = Math.random) {
  const pool = lookalike ? pickSeeded(LOOKALIKE_PAIRS, Math.ceil(regions.length / 2), rnd).flat() : pickSeeded(EASY, regions.length, rnd);
  return Object.fromEntries(regions.map((r, i) => [r, pool[i]]));
}

const spec = {
  id: 'hanukkah-colour', title: 'Colour by Letter', titleHe: 'צֶבַע',
  blurb: 'Paint a Hanukkah picture by reading its letters. The key matches each letter to a colour. Pick a colour, then paint every square that has its letter.',
  howTo: ['Look at the key: each colour has one letter.', 'Pick a colour, then tap each square with that letter.', 'A square with a different letter stays as it is: read again.', 'Finish the picture to end the round. Later levels mix letters that look alike.'],
  levels: [
    { name: 'A candle, letter names in the key', pic: 'candle', names: true },
    { name: 'A dreidel', pic: 'dreidel', names: true },
    { name: 'A gelt coin, look-alike letters', pic: 'coin', lookalike: true },
    { name: 'The jar of oil, look-alikes', pic: 'jar', lookalike: true },
    { name: 'A hanukkiah, colour names in Hebrew only', pic: 'hanukkiah', lookalike: true, hebrewOnly: true },
  ],
  par: (l, cfg) => PICTURES[cfg.pic].rows.join('').replace(/\./g, '').length * 2,
  seconds: (l, cfg) => 60 + PICTURES[cfg.pic].rows.join('').replace(/\./g, '').length * 4,
};

const LETTER_NAMES = { 'א': 'Aleph', 'ב': 'Bet', 'ג': 'Gimel', 'ד': 'Dalet', 'ה': 'Hey', 'ו': 'Vav', 'ז': 'Zayin', 'ח': 'Chet', 'כ': 'Kaf', 'ל': 'Lamed', 'מ': 'Mem', 'נ': 'Nun', 'ר': 'Resh', 'ש': 'Shin', 'ת': 'Tav' };

function setup(A, data) {
  const cfg = A.cfg, rnd = A.rnd, h = A.h;
  const words = byKey(data);
  const pic = PICTURES[cfg.pic];
  const regions = regionsOf(pic);
  const letters = assignLetters(regions, !!cfg.lookalike, rnd);
  const colours = pickSeeded(COLOURS, regions.length, rnd);
  const colourOf = Object.fromEntries(regions.map((r, i) => [r, colours[i]]));
  let chosen = null, left = 0, done = false;
  const swatches = h('div', { class: 'hk-swatches', role: 'group', 'aria-label': 'Colour key' });
  const swBtns = regions.map((r) => {
    const c = colourOf[r], w = words.get(c.word);
    const b = h('button', { type: 'button', class: 'hk-swatch', 'aria-pressed': false, style: `background:${c.css}`, onclick: () => pick(r, b) },
      h('span', { lang: 'he', dir: 'rtl', style: 'font-size:1.6rem;display:block' }, letters[r]),
      cfg.names ? h('span', { style: 'display:block;font-size:.8rem' }, LETTER_NAMES[letters[r]] || '') : null,
      A.heSpan(w.he), cfg.hebrewOnly ? null : h('span', { style: 'display:block;font-size:.8rem' }, `${w.translit} · ${w.en}`));
    b.setAttribute('aria-label', `${cfg.hebrewOnly ? w.translit : w.en} for the letter ${letters[r]}${cfg.names ? ` (${LETTER_NAMES[letters[r]]})` : ''}`);
    swatches.append(b);
    return b;
  });
  function pick(r, b) { chosen = r; for (const x of swBtns) x.setAttribute('aria-pressed', String(x === b)); A.sfx('select'); A.announce(`Painting with ${words.get(colourOf[r].word).translit}. Tap the squares with ${letters[r]}.`); }
  const cols = pic.rows[0].length;
  const grid = h('div', { class: 'arc-grid', role: 'group', 'aria-label': `Picture of ${pic.en}`, style: `grid-template-columns:repeat(${cols},var(--arc-cell));direction:ltr;--arc-cell:2.4rem` });
  pic.rows.forEach((row, ri) => [...row].forEach((ch, ci) => {
    if (ch === '.') { grid.append(h('span', { class: 'arc-cell', 'aria-hidden': 'true', style: 'visibility:hidden' })); return; }
    left++;
    const cell = h('button', { type: 'button', class: 'arc-cell', lang: 'he', 'aria-label': `Row ${ri + 1}, square ${ci + 1}: letter ${letters[ch]}, not painted`, onclick: () => paint(cell, ch, ri, ci) }, letters[ch]);
    grid.append(cell);
  }));
  function paint(cell, region, ri, ci) {
    if (done || cell.dataset?.painted === '1' || cell.getAttribute('data-painted') === '1') return;
    if (!chosen) { A.announce('Pick a colour from the key first.'); return; }
    if (chosen !== region) { A.addScore(-1); A.sfx('error_soft'); A.miss(); A.announce(`This square is ${letters[region]}, not ${letters[chosen]}. Read it again.`); return; }
    cell.setAttribute('data-painted', '1'); cell.style.background = colourOf[region].css; cell.style.color = '#1d2b1a';
    cell.setAttribute('aria-label', `Row ${ri + 1}, square ${ci + 1}: letter ${letters[region]}, painted ${words.get(colourOf[region].word).en}`);
    A.addScore(2); A.sfx('pop'); left--;
    if (!left) { done = true; A.announce(`The picture is done: ${pic.en}.`); A.finish({ won: true }); }
  }
  A.board.replaceChildren(h('p', { class: 'arc-prompt' }, `Paint ${pic.en}. `, A.heSpan(words.get('tzeva').he), ` ${words.get('tzeva').translit}: colour.`), swatches, grid);
}

export const mount = mountHanukkahArcade(spec, setup);
