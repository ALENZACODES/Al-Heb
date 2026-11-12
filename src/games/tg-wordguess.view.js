// Six Tries: guess a hidden Hebrew word from the app's word list. After each guess every tile says whether the letter
// is in the right place, somewhere else in the word, or not in it. Letters only, no vowel points, read right to left.
import { mountArcade } from './arcade.js';
import { loadData, bare, toBase, scoreGuess, withFinal, betterMark, shuffle, ALPHABET } from './tg-core.js';
import { host, track, draftNote, ensureStyle, roundKeys } from './tg-ui.js';

export const STORE_KEY = 'games.tg-wordguess.v1';
const WORDS = 3;
const SYM = { hit: '✓', near: '↔', miss: '·' };
const SAY = { hit: 'right place', near: 'in the word, other place', miss: 'not in the word' };

const spec = {
  id: 'tg-wordguess', title: 'Six Tries', titleHe: 'נַחֵשׁ',
  blurb: 'A hidden Hebrew word, written without vowel points. Type a real word of the same length. Each tile then shows ✓ for the right letter in the right place, ↔ for a letter that is in the word somewhere else, and · for a letter that is not in it.',
  howTo: ['Type with a Hebrew keyboard or tap the letters, then press Enter (or the Check button).', 'Guesses must be words from the app\'s word list. A final letter counts as its plain form.', 'Three words a round. Fewer tries, more points.', 'Levels 1 to 3 show the meaning as a clue; levels 4 and 5 show it after the third try.'],
  levels: [
    { name: 'Three letters, seven tries, clue', len: 3, tries: 7, clue: 'always' },
    { name: 'Three letters, six tries', len: 3, tries: 6, clue: 'always' },
    { name: 'Four letters, clue', len: 4, tries: 6, clue: 'always' },
    { name: 'Four letters', len: 4, tries: 6, clue: 'late' },
    { name: 'Five letters', len: 5, tries: 6, clue: 'late' },
  ],
  par: () => WORDS * 20,
  timed: false,
  needsWords: false, needsLetters: false,
};

/** Answer words and the accepted spellings for a length, from data/games/tg/wordguess.json (built from the app's word list). */
export function answerPool(data, len) { return (data?.answers?.[len] || []).filter((w) => bare(w.he).length === len); }
export function dictionary(data, len) { return new Set(String(data?.dictionary?.[len] || '').split(' ').filter(Boolean).map((w) => [...w].map(toBase).join(''))); }

function setup(A) {
  ensureStyle();
  const T = track(A), cfg = A.cfg, rnd = A.rnd;
  const prompt = A.h('p', { class: 'arc-prompt' });
  const clue = A.h('p', { class: 'muted' });
  const rowsEl = A.h('div', { class: 'tg-rows', role: 'list', 'aria-label': 'Your guesses' });
  const keysEl = A.h('div', { class: 'tg-keys', role: 'group', 'aria-label': 'Hebrew letters' });
  const actions = A.h('div', { class: 'row' });
  A.board.replaceChildren(host(A, 'ari', 'A hidden word. Six tries.'), prompt, clue, rowsEl, keysEl, actions,
    draftNote(A, 'Words come from the app\'s word list (meanings from its dictionary source).'));
  let answers = [], dict = new Set(), wi = 0, guesses = [], typed = [], keyMarks = {}, answer = null;
  const target = () => [...bare(answer.he)].map(toBase);
  const tile = (ch, mark) => A.h('span', { class: `tg-tile ${mark || ''}`, role: 'img', 'aria-label': mark ? `${ch}, ${SAY[mark]}` : ch || 'empty' },
    ch || '', mark ? A.h('span', { class: 'tg-sym', 'aria-hidden': 'true' }, SYM[mark]) : null);
  const draw = () => {
    const rows = guesses.map((g) => A.h('div', { class: 'tg-row', role: 'listitem', lang: 'he', dir: 'rtl' }, ...g.letters.map((c, i) => tile(c, g.marks[i]))));
    if (guesses.length < cfg.tries && answer) rows.push(A.h('div', { class: 'tg-row', role: 'listitem', lang: 'he', dir: 'rtl', 'aria-label': 'Your guess so far' }, ...Array.from({ length: cfg.len }, (_, i) => tile(typed[i] || ''))));
    rowsEl.replaceChildren(...rows);
    for (const b of keysEl.querySelectorAll('button')) { const m = keyMarks[b.dataset?.k || b.getAttribute('data-k')]; b.className = 'btn secondary ' + (m || ''); }
    const showClue = cfg.clue === 'always' || guesses.length >= 3;
    clue.textContent = answer && showClue ? `Clue: ${answer.en.split(/[;,(]/)[0].trim()}` : 'Clue after your third try.';
  };
  const type = (ch) => { if (!answer) return; if (ch === null) typed.pop(); else if (typed.length < cfg.len) typed.push(toBase(ch)); draw(); };
  const submit = () => {
    if (!answer) return;
    if (typed.length < cfg.len) { A.announce(`The word has ${cfg.len} letters.`); return; }
    const word = typed.join('');
    if (!dict.has(word)) { A.announce(`${withFinal(word)} is not in the word list. Try another word.`); A.sfx('miss'); return; }
    const marks = scoreGuess(word, target().join(''));
    guesses.push({ letters: [...withFinal(word)], marks });
    typed.forEach((c, i) => { keyMarks[c] = betterMark(keyMarks[c], marks[i]); });
    typed = [];
    A.announce(`${withFinal(word)}: ` + marks.map((m, i) => `${[...withFinal(word)][i]} ${SAY[m]}`).join(', ') + '.');
    if (marks.every((m) => m === 'hit')) { solved(true); return; }
    A.sfx('drop');
    if (guesses.length >= cfg.tries) { solved(false); return; }
    A.slip(); // M-03: a wrong guess (the last one fails the word through A.miss instead)
    draw();
  };
  const solved = (ok) => {
    const left = cfg.tries - guesses.length;
    if (ok) { A.addScore(10 + left * 3); A.sfx('success'); } else { A.miss(); A.sfx('miss'); }
    A.announce(`${ok ? 'Solved' : 'Out of tries'}: ${answer.he}, ${answer.translit}, "${answer.en}".`);
    A.sayWord(answer);
    draw();
    keysEl.replaceChildren();
    actions.replaceChildren(A.h('button', { type: 'button', class: 'btn', onclick: () => nextWord() }, wi >= WORDS ? 'See results' : 'Next word'));
    actions.querySelector('button')?.focus?.();
  };
  const nextWord = () => {
    if (wi >= WORDS || !answers.length) { T.end({ won: true }); return; }
    answer = answers[wi++]; guesses = []; typed = []; keyMarks = {};
    prompt.textContent = `Word ${wi} of ${WORDS}: ${cfg.len} letters, ${cfg.tries} tries.`;
    keysEl.replaceChildren(...ALPHABET.map((c) => A.h('button', { type: 'button', class: 'btn secondary', 'data-k': c, lang: 'he', onclick: () => type(c) }, c)),
      A.h('button', { type: 'button', class: 'btn secondary', 'aria-label': 'Delete a letter', onclick: () => type(null) }, '⌫'));
    actions.replaceChildren(A.h('button', { type: 'button', class: 'btn', onclick: submit }, 'Check'));
    draw();
  };
  roundKeys(A, (k, e) => {
    const key = e?.key || '';
    if (/^[א-ת]$/.test(key)) { type(key); return true; }
    if (key === 'Backspace') { type(null); return true; }
    if (k === 'enter' && answer && keysEl.childNodes.length) { submit(); return true; }
    return false;
  });
  loadData(A.ctx, 'data/games/tg/wordguess.json').then((d) => {
    if (!T.live()) return;
    dict = dictionary(d, cfg.len);
    answers = shuffle(answerPool(d, cfg.len), rnd).slice(0, WORDS);
    nextWord();
  }).catch(() => A.announce('The word list did not load. Check the connection and press Start again.'));
}

export const mount = mountArcade(spec, setup);
