// Odd One Out: a row of words, all from one topic but one. Tap the outsider. Later levels hide the English,
// add more words and borrow the outsider from a topic that is easy to confuse (a fork among the food, a sleeve among the body).
import { mountArcade } from './arcade.js';
import { oddSet } from './g2-core.js';
import { start, host, grade, numberKeys, draftNote, word, say } from './g2-ui.js';

export const STORE_KEY = 'games.g2-oddone.v1';
const ROUNDS = 10;

const spec = {
  id: 'g2-oddone', title: 'Odd One Out', titleHe: 'שׁוֹנֶה',
  blurb: 'Every row hides one word that does not belong. Spot it by what the words mean: three animals and a shirt, four foods and a fork.',
  howTo: ['Tap the word that belongs to a different topic, or press its number.', 'A wrong tap is a miss; keep looking.', 'Levels 1 and 2 show the English; then you read the Hebrew alone.', 'Levels 4 and 5 take the odd word from a look-alike topic.'],
  levels: [
    { name: 'Four words, with English', size: 4, en: true, tr: true },
    { name: 'Four words', size: 4, en: false, tr: true },
    { name: 'Five words, Hebrew only', size: 5, en: false, tr: false },
    { name: 'Look-alike topics', size: 5, en: false, tr: true, close: true },
    { name: 'Six words, look-alikes', size: 6, en: false, tr: false, close: true },
  ],
  par: () => ROUNDS * 10,
  seconds: () => 150,
  needsWords: false, needsLetters: false,
};

function setup(A) {
  const cfg = A.cfg, rnd = A.rnd;
  const prompt = A.h('p', { class: 'arc-prompt' });
  const row = A.h('div', { class: 'g2-row', role: 'group', 'aria-label': 'Words' });
  const after = A.h('p', { class: 'muted', 'aria-live': 'polite' });
  A.board.replaceChildren(host(A, 'noa', 'One of these is not like the others.'), prompt, row, after,
    draftNote(A, 'Words and topics come from the app\'s word lists. A native reader has not checked them yet.'));
  numberKeys(A, () => row);
  start(A, (D, T) => {
    let n = 0;
    const next = () => {
      if (n >= ROUNDS) { T.end({ won: true }); return; }
      n += 1;
      const set = oddSet(D, cfg.size, rnd, cfg.close);
      prompt.textContent = `Row ${n} of ${ROUNDS}: which word is the odd one out?`;
      after.textContent = '';
      row.replaceChildren(...set.words.map((w) => {
        const b = A.h('button', { type: 'button', class: 'arc-choice' }, word(A, w, { en: cfg.en, tr: cfg.tr }));
        b.addEventListener('click', () => {
          if (b.disabled) return;
          const ok = w === set.odd;
          grade(A, ok, {
            right: `Yes: ${w.he} (${w.en}) is in ${D.topics[w.topic].title}; the others are ${D.topics[set.main].title}.`,
            wrong: `${w.he} means "${w.en}"; it is in ${D.topics[w.topic].title} with the others.`,
          });
          if (!ok) { b.classList.add('is-bad'); b.disabled = true; return; }
          b.classList.add('is-on');
          for (const x of row.querySelectorAll('button')) x.disabled = true;
          after.textContent = set.words.map((x) => `${x.he} = ${x.en}`).join(' · ');
          say(A, w);
          T.later(1100, next);
        });
        return b;
      }));
    };
    next();
  });
}

export const mount = mountArcade(spec, setup);
