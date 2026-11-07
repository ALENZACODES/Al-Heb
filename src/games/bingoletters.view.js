// Letter Bingo: Ari calls letters and sounds; mark them on your card. A full row, column or diagonal is bingo.
// Level 1 calls letters by name; later levels call syllables and whole words and you mark the first letter.
import { mountArcade, makeGrid, randInt } from './arcade.js';
import { allSyllables } from './syllables.js';
import { bareLetters, pickSeeded } from './arcade.model.js';

export const STORE_KEY = 'games.bingoletters.v1';

const spec = {
  id: 'bingoletters', title: 'Letter Bingo', titleHe: 'בִּינְגוֹ',
  blurb: 'Ari calls, you mark. Letters by name at first; then syllables; then whole words where you mark the letter they start with. Three in a row is bingo.',
  howTo: ['A call appears at the top (and plays where a recording exists).', 'Tap the matching square on your card.', 'A wrong square costs a point. A missed call is called again later.', 'Complete a row, a column or a diagonal to win the card.'],
  levels: [
    { name: '3 x 3, letter names', size: 3, mode: 'name', calls: 14 },
    { name: '4 x 4, letter names', size: 4, mode: 'name', calls: 20 },
    { name: '3 x 3, syllables', size: 3, mode: 'syllable', calls: 14 },
    { name: '4 x 4, first letter of a word', size: 4, mode: 'word', calls: 20 },
    { name: '5 x 5, mixed calls', size: 5, mode: 'mixed', calls: 28 },
  ],
  par: (l, cfg) => cfg.size * 10 + 20,
  seconds: (l, cfg) => 100 + cfg.size * 10,
};

function setup(A) {
  const cfg = A.cfg, rnd = A.rnd, n = cfg.size;
  const base = A.letters.filter((x) => !x.isFinal);
  const card = pickSeeded(base, n * n, rnd);
  const marked = new Set();
  let calls = 0, current = null;
  const call = A.h('p', { class: 'arc-prompt' });
  const host = A.h('div', { class: 'arc-host' }, A.cast('ari-caller', 'Ari calling the letters'), call);
  const { el, cells } = makeGrid(n, n, { label: 'Bingo card', onCell: (r, c, cell) => mark(r * n + c, cell) });
  card.forEach((l, i) => { const cell = cells[Math.floor(i / n)][i % n]; cell.textContent = l.he; cell.setAttribute('aria-label', l.name); });
  A.board.replaceChildren(host, el);
  const syls = allSyllables();
  const nextCall = () => {
    if (calls >= cfg.calls) { A.announce('Out of calls. No bingo this time.'); A.finish({ reason: 'done' }); return; }
    calls++;
    const unmarked = card.filter((_, i) => !marked.has(i));
    const letter = unmarked[randInt(rnd, unmarked.length)];
    const mode = cfg.mode === 'mixed' ? ['name', 'syllable', 'word'][randInt(rnd, 3)] : cfg.mode;
    if (mode === 'syllable') {
      const s = syls.find((x) => x.consonant.name === letter.id || x.consonant.name === letter.name.toLowerCase()) || syls.find((x) => x.consonant.he.replace(/ּ/g, '') === letter.he);
      current = { letter, text: s ? `Syllable "${s.tr}"` : `Letter ${letter.name}`, he: s ? s.he : letter.he };
    } else if (mode === 'word') {
      const w = A.words.filter((x) => bareLetters(x.he)[0] === letter.he);
      const pickW = w.length ? w[randInt(rnd, w.length)] : null;
      current = pickW ? { letter, text: `First letter of "${pickW.translit}" (${pickW.en})`, he: pickW.he, word: pickW } : { letter, text: `Letter ${letter.name}`, he: letter.he };
    } else current = { letter, text: `Letter ${letter.name}`, he: letter.nameHe || letter.he };
    call.replaceChildren(`${current.text} `, A.heSpan(current.he, 'he muted'), ` · call ${calls} of ${cfg.calls}`);
    if (current.word) A.sayWord(current.word); else A.sayLetter(letter);
  };
  const lines = () => { const L = []; for (let i = 0; i < n; i++) { L.push([...Array(n).keys()].map((j) => i * n + j)); L.push([...Array(n).keys()].map((j) => j * n + i)); } L.push([...Array(n).keys()].map((i) => i * n + i)); L.push([...Array(n).keys()].map((i) => i * n + (n - 1 - i))); return L; };
  const mark = (i, cell) => {
    if (marked.has(i) || !current) return;
    if (card[i].id === current.letter.id) {
      marked.add(i); cell.classList.add('is-found'); A.addScore(10); A.sfx('select');
      if (lines().some((line) => line.every((k) => marked.has(k)))) { A.addScore(30); A.sfx('success'); A.announce('Bingo!'); A.finish({ won: true }); return; }
      nextCall();
    } else { A.addScore(-2); A.sfx('error_soft'); A.miss(); A.announce(`That is ${card[i].name}. The call was ${current.letter.name}.`); }
  };
  A.setLives(0);
  nextCall();
}

export const mount = mountArcade(spec, setup);
