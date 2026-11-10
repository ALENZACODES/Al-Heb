// Vowel Stack: a consonant waits on the stack; a sound is asked for ("ba", "shi", "lo"). Choose the vowel
// mark that makes it. Right answers stack up into a tower; the tower height is the score.
import { mountArcade, choiceRow, randInt } from './arcade.js';
import { CONSONANTS, VOWELS, VOWEL_SOUNDS, syllable } from './syllables.js';
import { pickSeeded } from './arcade.model.js';

export const STORE_KEY = 'games.vowelstack.v1';

const spec = {
  id: 'vowelstack', title: 'Vowel Stack', titleHe: 'עֲרֵמַת נִקּוּד',
  blurb: 'A letter waits at the top. You are asked for a sound: ba, shi, lo. Put the right vowel mark under the letter and the syllable joins the tower. How tall can you build it?',
  howTo: ['Read the sound you need (for example "ba").', 'Tap the vowel mark that makes it. The marks sit under the letter.', 'Right: the syllable stacks on the tower. Wrong: a block falls off.', 'Later levels add look-alike marks (two ways to write a, two ways to write e) and ask by name.'],
  levels: [
    { name: 'a, i, o', sounds: ['a', 'i', 'o'], options: 3, goal: 10, byName: false },
    { name: 'a, e, i, o, u', sounds: ['a', 'e', 'i', 'o', 'u'], options: 4, goal: 12, byName: false },
    { name: 'Two marks per sound', sounds: ['a', 'e', 'i', 'o', 'u'], options: 4, goal: 12, byName: false, allMarks: true },
    { name: 'By mark name', sounds: ['a', 'e', 'i', 'o', 'u'], options: 4, goal: 14, byName: true, allMarks: true },
    { name: 'Tower of 20', sounds: ['a', 'e', 'i', 'o', 'u'], options: 5, goal: 20, byName: true, allMarks: true },
  ],
  par: (l, cfg) => cfg.goal * 10,
  seconds: (l, cfg) => 90,
  needsWords: false, needsLetters: false,
};

function setup(A) {
  const cfg = A.cfg, rnd = A.rnd;
  const marks = cfg.allMarks ? VOWELS.filter((v) => cfg.sounds.includes(v.tr)) : VOWEL_SOUNDS.filter((v) => cfg.sounds.includes(v.tr));
  let height = 0;
  const top = A.h('div', { class: 'arc-big', lang: 'he', dir: 'rtl' });
  const ask = A.h('p', { class: 'arc-prompt' });
  const row = A.h('div');
  const tower = A.h('div', { class: 'arc-stack', 'aria-label': 'Tower of syllables', lang: 'he', dir: 'rtl' });
  A.board.replaceChildren(top, ask, row, tower);
  const next = () => {
    if (height >= cfg.goal) { A.finish({ won: true }); return; }
    const c = CONSONANTS[randInt(rnd, CONSONANTS.length)];
    const v = marks[randInt(rnd, marks.length)];
    const target = syllable(c, v);
    top.textContent = c.he;
    ask.textContent = cfg.byName ? `Make "${target.tr}" with the ${v.name}` : `Make the sound "${target.tr}"`;
    const wrong = pickSeeded(marks.filter((m) => cfg.byName ? m.name !== v.name : m.tr !== v.tr), cfg.options - 1, rnd);
    const opts = pickSeeded([v, ...wrong], cfg.options, rnd);
    row.replaceChildren(choiceRow(opts, (m) => A.h('span', {}, A.heSpan(c.he + m.mark), A.h('small', { style: 'display:block;font-size:.7rem' }, m.name)), (m) => {
      const ok = cfg.byName ? m.name === v.name : m.tr === v.tr;
      if (ok) {
        height++; A.addScore(10); A.sfx('drop');
        tower.append(A.h('span', { class: 'arc-cell is-good', style: 'width:auto;padding:0 .6rem' }, target.he + '  ' + target.tr));
        A.announce(`${target.tr}: ${c.name} with ${v.name}. Tower ${height} high.`);
        next();
      } else { A.addScore(-3); A.sfx('miss'); A.miss(); if (tower.lastChild) tower.lastChild.remove(); height = Math.max(0, height - 1); A.announce(`${m.name} says "${m.tr}". You need "${v.tr}"${cfg.byName ? ` with the ${v.name}` : ''}.`); }
      return ok;
    }, { label: 'Vowel marks' }));
  };
  A.setLives(0);
  next();
}

export const mount = mountArcade(spec, setup);
