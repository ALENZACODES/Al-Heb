// Where Am I? A few things you can see around you, in Hebrew: a pot, an oven, a fork. Name the place.
// Fewer clues and more places to choose from as the levels climb; level 4 shows the clues one at a time.
import { mountArcade, choiceRow } from './arcade.js';
import { shuffle, options } from './g2-core.js';
import { start, host, grade, numberKeys, draftNote, word, say } from './g2-ui.js';

export const STORE_KEY = 'games.g2-whereami.v1';
const ROUNDS = 8;

const spec = {
  id: 'g2-whereami', title: 'Where Am I?', titleHe: 'אֵיפֹה',
  blurb: 'A cow, a sheep and a farmer: you must be on a farm. Read what is around you and name the place.',
  howTo: ['Read the things you can see, then tap the place (or press its number).', 'A wrong place is a miss; the clues stay.', 'Level 4: ask for clues one at a time; the fewer you need, the more points.', 'Level 5: a single clue, Hebrew only.'],
  levels: [
    { name: 'Four clues, with English', clues: 4, choices: 3, en: true, tr: true },
    { name: 'Three clues', clues: 3, choices: 4, en: false, tr: true },
    { name: 'Two clues, Hebrew only', clues: 2, choices: 4, en: false, tr: false },
    { name: 'One clue at a time', clues: 4, choices: 5, en: false, tr: false, drip: true },
    { name: 'A single clue', clues: 1, choices: 6, en: false, tr: false },
  ],
  par: () => ROUNDS * 10,
  seconds: () => 150,
  needsWords: false, needsLetters: false,
};

function setup(A) {
  const cfg = A.cfg, rnd = A.rnd;
  const prompt = A.h('p', { class: 'arc-prompt' });
  const list = A.h('ul', { class: 'g2-found', 'aria-label': 'What you can see' });
  const more = A.h('button', { type: 'button', class: 'btn secondary' }, 'Another clue');
  const area = A.h('div');
  const after = A.h('p', { class: 'muted', 'aria-live': 'polite' });
  A.board.replaceChildren(host(A, 'noa', 'Look around. Where are we?'), prompt, list, A.h('div', { class: 'g2-row' }, more), area, after,
    draftNote(A, 'Words come from the app\'s word lists; which things go with which place is the game\'s own choice. A native reader has not checked the words yet.'));
  numberKeys(A, () => area.querySelector('.arc-choices'));
  start(A, (D, T) => {
    const places = D.sets.places || [];
    const order = shuffle(places, rnd);
    let n = 0, shown = 0, clues = [];
    more.hidden = !cfg.drip;
    const showClues = () => {
      list.replaceChildren(...clues.slice(0, shown).map((he) => A.h('li', {}, word(A, D.word(he), { en: cfg.en, tr: cfg.tr }))));
      more.disabled = !cfg.drip || shown >= clues.length;
    };
    more.addEventListener('click', () => { if (shown < clues.length) { shown += 1; showClues(); } });
    const next = () => {
      after.textContent = '';
      if (n >= ROUNDS) { T.end({ won: true }); return; }
      const p = order[n % order.length]; n += 1;
      clues = shuffle(p.clues, rnd).slice(0, cfg.clues);
      shown = cfg.drip ? 1 : clues.length;
      prompt.textContent = `Place ${n} of ${ROUNDS}: where are you?`;
      showClues();
      const answer = D.word(p.place);
      const pool = places.map((x) => D.word(x.place));
      area.replaceChildren(choiceRow(options(answer, pool, cfg.choices, rnd, (w) => w.he), (w) => word(A, w, { en: cfg.en, tr: cfg.tr }), (w) => {
        const ok = w.he === answer.he;
        const points = cfg.drip ? Math.max(4, 16 - 4 * (shown - 1)) : 10;
        grade(A, ok, { points, right: `${answer.he} (${answer.en}).`, wrong: `Not ${w.he} (${w.en}).` });
        if (ok) {
          more.disabled = true; say(A, answer);
          after.textContent = `${answer.he} = ${answer.en}: ` + p.clues.map((he) => `${he} = ${D.word(he).en}`).join(' · ');
          T.later(1200, next);
        }
        return ok;
      }, { label: 'Places' }));
    };
    next();
  });
}

export const mount = mountArcade(spec, setup);
