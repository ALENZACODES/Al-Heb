// Day After Day: count round the calendar in Hebrew. The day after Tuesday, the month before March, two days after
// Friday, the season after summer. The week and the year go round, so the day after Shabbat is Sunday.
import { mountArcade, choiceRow } from './arcade.js';
import { cycle, stepIn, options } from './g2-core.js';
import { start, host, grade, numberKeys, draftNote, word, say } from './g2-ui.js';

export const STORE_KEY = 'games.g2-dayafter.v1';
const ROUNDS = 10;
const NOUN = { days: 'day', months: 'month', seasons: 'season', times: 'part of the day' };

const spec = {
  id: 'g2-dayafter', title: 'Day After Day', titleHe: 'מָחָר',
  blurb: 'If today is Tuesday, what is tomorrow? Practise the days, months and seasons by counting forwards and backwards round the calendar.',
  howTo: ['Read the question and the Hebrew word in it.', 'Tap the answer, or press its number.', 'The week and the year wrap round: the day after Shabbat is Sunday.', 'Later levels count two or three steps, and mix days, months and seasons.'],
  levels: [
    { name: 'The day after, with English', cycles: ['days'], steps: [1], en: true, tr: true },
    { name: 'Before and after', cycles: ['days'], steps: [1, -1], en: false, tr: true },
    { name: 'The months', cycles: ['months'], steps: [1, -1], en: false, tr: false },
    { name: 'Two steps', cycles: ['days', 'months'], steps: [2, -2], en: false, tr: false },
    { name: 'Everything, up to three steps', cycles: ['days', 'months', 'seasons', 'times'], steps: [1, -1, 2, -2, 3], en: false, tr: false },
  ],
  par: () => ROUNDS * 10,
  seconds: () => 150,
  needsWords: false, needsLetters: false,
};

/** A question: { cycle, from, k, answer }. */
export function dayQuestion(D, cycles, steps, rnd = Math.random) {
  const id = cycles[Math.floor(rnd() * cycles.length)];
  const list = cycle(D, id);
  const i = Math.floor(rnd() * list.length);
  const k = steps[Math.floor(rnd() * steps.length)];
  return { cycle: id, list, from: list[i], k, answer: stepIn(list, i, k) };
}
export const stepWords = (k, noun) => `${Math.abs(k) === 1 ? `the ${noun}` : `${Math.abs(k)} ${noun}s`} ${k > 0 ? 'after' : 'before'}`;

function setup(A) {
  const cfg = A.cfg, rnd = A.rnd;
  const prompt = A.h('p', { class: 'arc-prompt' });
  const big = A.h('div', { class: 'g2-big' });
  const area = A.h('div');
  const after = A.h('p', { class: 'muted', 'aria-live': 'polite' });
  A.board.replaceChildren(host(A, 'rimon', 'Round and round the calendar.'), prompt, big, area, after,
    draftNote(A, 'Day, month and season words come from the app\'s word lists (Friday from the reading books). A native reader has not checked them yet.'));
  numberKeys(A, () => area.querySelector('.arc-choices'));
  start(A, (D, T) => {
    let n = 0;
    const next = () => {
      if (n >= ROUNDS) { T.end({ won: true }); return; }
      n += 1;
      const q = dayQuestion(D, cfg.cycles, cfg.steps, rnd);
      prompt.textContent = `Question ${n} of ${ROUNDS}: what is ${stepWords(q.k, NOUN[q.cycle])}…`;
      big.replaceChildren(word(A, q.from, { en: cfg.en, tr: cfg.tr }));
      after.textContent = '';
      area.replaceChildren(choiceRow(options(q.answer, q.list, 4, rnd, (w) => w.he), (w) => word(A, w, { en: cfg.en, tr: cfg.tr }), (w) => {
        const ok = w.he === q.answer.he;
        grade(A, ok, { right: `${q.answer.he} (${q.answer.en}) is ${stepWords(q.k, NOUN[q.cycle])} ${q.from.en}.`, wrong: `${w.he} is ${w.en}.` });
        if (ok) { say(A, q.answer); after.textContent = `${q.from.he} = ${q.from.en} · ${q.answer.he} = ${q.answer.en}`; T.later(900, next); }
        return ok;
      }, { label: 'Answers' }));
    };
    next();
  });
}

export const mount = mountArcade(spec, setup);
