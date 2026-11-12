// Spelling Hive: seven letter tiles, one in the middle. Spell words from the hive's word list using only those letters
// (a letter may repeat); every word must use the middle letter. Letters are typed as their plain form; a word that ends
// in kaf, mem, nun, pe or tsadi is shown with its final form once it is found.
import { mountArcade } from './arcade.js';
import { hiveWord, letters, shuffle, toBase } from './g2-core.js';
import { start, host, grade, roundKeys, draftNote, word, say, he } from './g2-ui.js';

export const STORE_KEY = 'games.g2-hive.v1';

const spec = {
  id: 'g2-hive', title: 'Spelling Hive', titleHe: 'דְּבוֹרָה',
  blurb: 'Seven letters in a honeycomb. Spell as many words as you can, always using the letter in the middle. Longer words score more.',
  howTo: ['Tap letters (or type them on a Hebrew keyboard) to spell a word; letters can repeat. Then press Enter.', 'Every word needs the middle letter and at least three letters.', 'Delete takes back a letter; Mix shuffles the outer tiles.', 'Levels 1 and 2 list the meanings of the hidden words as hints.'],
  levels: [
    { name: 'Three words, with hints', goal: 3, hints: 'all' },
    { name: 'Four words, with hints', goal: 4, hints: 'all' },
    { name: 'Five words', goal: 5, hints: 'count' },
    { name: 'Six words', goal: 6, hints: 'count' },
    { name: 'Eight words', goal: 8, hints: 'count' },
  ],
  par: (l, cfg) => cfg.goal * 8,
  seconds: () => 240,
  needsWords: false, needsLetters: false,
};

function setup(A) {
  const cfg = A.cfg, rnd = A.rnd;
  const prompt = A.h('p', { class: 'arc-prompt' });
  const entry = A.h('div', { class: 'g2-entry', lang: 'he', dir: 'rtl', 'aria-live': 'polite' });
  const hive = A.h('div', { class: 'g2-hive', role: 'group', 'aria-label': 'Letter tiles' });
  const del = A.h('button', { type: 'button', class: 'btn secondary' }, 'Delete');
  const enter = A.h('button', { type: 'button', class: 'btn' }, 'Enter');
  const mix = A.h('button', { type: 'button', class: 'btn secondary' }, 'Mix');
  const hints = A.h('p', { class: 'muted' });
  const found = A.h('ul', { class: 'g2-found', 'aria-label': 'Words found' });
  A.board.replaceChildren(host(A, 'rimon', 'Buzz! Use the middle letter every time.'), prompt, entry, hive, A.h('div', { class: 'g2-row' }, del, enter, mix), hints, found,
    draftNote(A, 'The hive words are dictionary entries from the app\'s word lists; some are less common. A native reader has not checked them yet.'));
  start(A, (D, T) => {
    const h = shuffle(D.sets.hives || [], rnd)[0];
    const goal = Math.min(cfg.goal, h.words.length);
    let typed = '', outer = shuffle(h.letters.filter((c) => c !== h.centre), rnd);
    const got = [];
    const showEntry = () => { entry.textContent = typed || ' '; del.disabled = !typed; enter.disabled = typed.length < 3; };
    const tile = (c, centre) => {
      const b = A.h('button', { type: 'button', class: 'arc-choice' + (centre ? ' is-centre' : ''), lang: 'he', dir: 'rtl', 'aria-label': centre ? `${c}, middle letter` : c }, c);
      b.addEventListener('click', () => { if (T.live() && typed.length < 9) { typed += c; showEntry(); } });
      return b;
    };
    const drawHive = () => hive.replaceChildren(...outer.slice(0, 3).map((c) => tile(c, false)), tile(h.centre, true), ...outer.slice(3).map((c) => tile(c, false)));
    const drawHints = () => {
      const left = h.words.filter((w) => !got.includes(w));
      hints.textContent = cfg.hints === 'all'
        ? `Hidden words include: ${left.slice(0, 6).map((w) => `"${w.en}" (${letters(w.he).length} letters)`).join(', ')}.`
        : `${h.words.length - got.length} words still in the hive.`;
      prompt.textContent = `Find ${goal} words: ${got.length} of ${goal} so far. The middle letter is ${h.centre}.`;
    };
    const submit = () => {
      if (!T.live() || typed.length < 3) { A.announce('Words need at least three letters.'); return; }
      if (!typed.includes(h.centre)) { A.announce(`Every word needs the middle letter, ${h.centre}.`); typed = ''; showEntry(); return; }
      const w = hiveWord(h, typed);
      typed = ''; showEntry();
      if (!w) { A.announce('That is not in this hive\'s word list. Try another.'); A.sfx('miss'); return; }
      if (got.includes(w)) { A.announce(`You already have ${w.he}.`); return; }
      got.push(w);
      grade(A, true, { points: letters(w.he).length * 2, right: `${w.he}: ${w.en}.` });
      say(A, w);
      found.append(A.h('li', {}, word(A, w, { en: true })));
      drawHints();
      if (got.length >= goal) { for (const b of [...hive.querySelectorAll('button'), del, enter, mix]) b.disabled = true; T.later(900, () => T.end({ won: true })); }
    };
    del.addEventListener('click', () => { typed = typed.slice(0, -1); showEntry(); });
    enter.addEventListener('click', submit);
    mix.addEventListener('click', () => { outer = shuffle(outer, rnd); drawHive(); });
    roundKeys(A, (k) => {
      if (k === 'enter') { submit(); return true; }
      if (k === 'Backspace') { typed = typed.slice(0, -1); showEntry(); return true; }
      const c = toBase(k); // a Hebrew keyboard types the letters too (a final form counts as its plain letter)
      if (typeof k === 'string' && k.length === 1 && h.letters.includes(c) && typed.length < 9) { typed += c; showEntry(); return true; }
      return false;
    });
    drawHive(); drawHints(); showEntry();
  });
}

export const mount = mountArcade(spec, setup);
