// Ending Detective: most feminine nouns end in -ah (kamatz and hei) or in tav; most others are masculine. Read the
// ending, use it to guess he or she, and catch the rule-breakers (hand, eye and city are feminine with no ending at all).
// Genders are the dictionary's tags in data/vocab/words.json; words that are used both ways are left out.
import { mountArcade } from './arcade.js';
import { endingOf, predictedGender, breaksRule, genderPool, shuffle } from './g2-core.js';
import { start, host, grade, numberKeys, draftNote, say, he } from './g2-ui.js';

export const STORE_KEY = 'games.g2-endings.v1';
const WORDS = 12;
const ENDING_NAME = { ah: 'ends in -ah (ָה)', t: 'ends in -t (ת)', none: 'neither ending' };
const GENDER_NAME = { m: 'masculine (he)', f: 'feminine (she)' };

const spec = {
  id: 'g2-endings', title: 'Ending Detective', titleHe: 'סוֹף',
  blurb: 'The end of a Hebrew noun is a strong clue to whether it is masculine or feminine. Learn the clue, use it, then hunt the words that break the rule.',
  howTo: ['Level 1: is the ending -ah, -t or neither?', 'Level 2: the ending first, then masculine or feminine.', 'Level 3: masculine or feminine, with the last letter marked. Level 5: the same, fast and unmarked.', 'Level 4: does the word follow the rule or break it?'],
  levels: [
    { name: 'Spot the ending', steps: ['ending'], breakers: 0.2 },
    { name: 'Ending, then gender', steps: ['ending', 'gender'], breakers: 0.25 },
    { name: 'Gender, with the clue', steps: ['gender'], mark: true, breakers: 0.25 },
    { name: 'Rule or rule-breaker?', steps: ['rule'], breakers: 0.5 },
    { name: 'Gender, fast', steps: ['gender'], breakers: 0.4 },
  ],
  par: (l, cfg) => WORDS * 10 * cfg.steps.length,
  seconds: (l) => (l === 5 ? 75 : 150),
  needsWords: false, needsLetters: false,
};

/** A deck with about the given share of rule-breakers. */
export function endingDeck(D, n, share, rnd = Math.random) {
  const pool = genderPool(D);
  const breakers = shuffle(pool.filter(breaksRule), rnd), regular = shuffle(pool.filter((w) => !breaksRule(w)), rnd);
  const k = Math.min(breakers.length, Math.round(n * share));
  return shuffle([...breakers.slice(0, k), ...regular.slice(0, n - k)], rnd);
}

function setup(A) {
  const cfg = A.cfg, rnd = A.rnd;
  const prompt = A.h('p', { class: 'arc-prompt' });
  const big = A.h('div', { class: 'g2-big', lang: 'he', dir: 'rtl' });
  const row = A.h('div', { class: 'g2-row', role: 'group', 'aria-label': 'Answers' });
  const after = A.h('p', { class: 'muted', 'aria-live': 'polite' });
  A.board.replaceChildren(host(A, 'noa', 'Look at the end of the word.'), prompt, big, row, after,
    draftNote(A, 'Genders are the dictionary\'s tags in the app\'s word list. A native reader has not checked them yet.'));
  numberKeys(A, () => row);
  start(A, (D, T) => {
    const words = endingDeck(D, WORDS, cfg.breakers, rnd);
    let n = 0;
    const why = (w) => `${w.he} (${w.en}) ${ENDING_NAME[endingOf(w.he)]} and is ${GENDER_NAME[w.g]}${breaksRule(w) ? ': a rule-breaker' : ', as the rule says'}.`;
    const ask = (w, step, rest) => {
      const choices = step === 'ending' ? ['ah', 't', 'none'] : step === 'gender' ? ['m', 'f'] : ['follows', 'breaks'];
      const answer = step === 'ending' ? endingOf(w.he) : step === 'gender' ? w.g : (breaksRule(w) ? 'breaks' : 'follows');
      const label = (c) => (step === 'ending' ? ENDING_NAME[c] : step === 'gender' ? GENDER_NAME[c] : c === 'follows' ? 'Follows the rule' : 'Breaks the rule');
      prompt.textContent = `Word ${n} of ${words.length}: ` + (step === 'ending' ? 'which ending?' : step === 'gender' ? 'masculine or feminine?' : `the rule says ${GENDER_NAME[predictedGender(w.he)]}. Is it?`);
      row.replaceChildren(...choices.map((c) => {
        const b = A.h('button', { type: 'button', class: 'arc-choice' }, label(c));
        b.addEventListener('click', () => {
          if (b.disabled) return;
          const ok = c === answer;
          grade(A, ok, { right: step === 'ending' ? `Yes: ${ENDING_NAME[answer]}.` : why(w), wrong: step === 'ending' ? `Look again at the last letter of ${w.he}.` : why(w) });
          if (!ok) { b.classList.add('is-bad'); b.disabled = true; return; }
          for (const x of row.querySelectorAll('button')) x.disabled = true;
          if (rest.length) { T.later(400, () => ask(w, rest[0], rest.slice(1))); return; }
          after.textContent = why(w); say(A, w);
          T.later(900, next);
        });
        return b;
      }));
    };
    const next = () => {
      if (n >= words.length) { T.end({ won: true }); return; }
      const w = words[n]; n += 1;
      if (cfg.mark) {
        const cut = [...w.he].findLastIndex((c) => c >= 'א' && c <= 'ת');
        big.replaceChildren(he(A, w.he.slice(0, cut)), A.h('mark', { lang: 'he', dir: 'rtl' }, w.he.slice(cut)));
      } else big.replaceChildren(he(A, w.he));
      ask(w, cfg.steps[0], cfg.steps.slice(1));
    };
    next();
  });
}

export const mount = mountArcade(spec, setup);
