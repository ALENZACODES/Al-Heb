// Question Radar: learn the question words (who, what, where, when, why, how, how much, which, where to, where from),
// then put the missing one back into real questions from the lessons and the phrasebook.
import { mountArcade, choiceRow } from './arcade.js';
import { loadG3, shuffle, options, wordsOf } from './g3-core.js';
import { begin, grade, numberKeys, heText, sayEntry } from './g3-ui.js';

export const STORE_KEY = 'games.g3-questions.v1';
const ROUNDS = 10;
const FIRST_SIX = ['who', 'what', 'where', 'when', 'why', 'how'];
const spec = {
  id: 'g3-questions', title: 'Question Radar', titleHe: 'שְׁאֵלָה',
  blurb: 'A Hebrew question usually starts with its question word, and the rest of the line stays in the normal order. Learn the words first, then catch the one missing from a real question. A yes-or-no question can start with ha\'im, or just rise in the voice.',
  howTo: ['Levels 1 and 2: an English question word; pick the Hebrew. Keys 1 to 4 pick.', 'Level 3: a real question has a gap; the English shows what it asks. Pick the missing word.', 'Level 4: read a whole Hebrew question and pick what it means.', 'Level 5: gaps and meanings mixed, against the clock.'],
  levels: [
    { name: 'Six first words', mode: 'word', only: FIRST_SIX },
    { name: 'All the question words', mode: 'word' },
    { name: 'Fill the gap', mode: 'gap' },
    { name: 'What does it ask?', mode: 'meaning' },
    { name: 'Radar sweep', mode: 'mix' },
  ],
  par: () => ROUNDS * 10,
  seconds: (l) => (l === 5 ? 120 : 150),
  needsWords: false, needsLetters: false,
};

function setup(A) {
  const { T, big, prompt, area } = begin(A, 'ari', 'The question word leads. Find it.',
    'Question words from the word list (the phrasebook for three of them); questions from the lessons, units and phrasebook. Not reviewed by a teacher.');
  const cfg = A.cfg, rnd = A.rnd;
  numberKeys(A, () => area.querySelector('.arc-choices'));
  let qwords = [], questions = [], n = 0;
  const next = () => { if (n >= ROUNDS) { T.end({ won: true }); return; } n += 1; const m = cfg.mode === 'mix' ? (rnd() < 0.5 ? 'gap' : 'meaning') : cfg.mode; ({ word, gap, meaning })[m](); };
  const word = () => {
    const pool = cfg.only ? qwords.filter((q) => cfg.only.includes(q.en)) : qwords;
    const q = pool[(n - 1 + Math.floor(rnd() * pool.length)) % pool.length];
    big.textContent = q.en;
    prompt.textContent = `Question word ${n} of ${ROUNDS}: which is "${q.en}"?`;
    area.replaceChildren(choiceRow(options(q, pool, 4, rnd, (x) => x.he), (o) => o.he, (o) => {
      const ok = o.he === q.he;
      grade(A, ok, { right: `${q.he}: ${q.en}.`, wrong: `${o.he} is "${o.en}".` });
      if (ok) { sayEntry(A, q); T.later(600, next); }
      return ok;
    }, { label: 'Question words' }));
  };
  const gap = () => {
    const q = questions[(n - 1) % questions.length], ws = wordsOf(q.he), want = ws[q.q].w;
    const shown = ws.map((x, i) => (i === q.q ? '____' + x.p : x.w + x.p)).join(' ');
    big.replaceChildren(heText(A, shown));
    prompt.textContent = `"${q.en}" Which word fills the gap? (${n} of ${ROUNDS})`;
    const own = qwords.find((x) => x.he === want) || { he: want, en: '' };
    area.replaceChildren(choiceRow(options(own, qwords, 4, rnd, (x) => x.he), (o) => o.he, (o) => {
      const ok = o.he === want;
      grade(A, ok, { right: `${q.he} (${q.en})`, wrong: `${o.he} means "${o.en}". Read the English again.` });
      if (ok) { big.replaceChildren(heText(A, q.he)); T.later(900, next); }
      return ok;
    }, { label: 'Question words' }));
  };
  const meaning = () => {
    const q = questions[(n - 1) % questions.length];
    big.replaceChildren(heText(A, q.he));
    prompt.textContent = `Question ${n} of ${ROUNDS}: what does it ask?`;
    area.replaceChildren(choiceRow(options(q, questions, 4, rnd, (x) => x.en), (o) => o.en, (o) => {
      const ok = o.en === q.en;
      grade(A, ok, { right: `${q.he}: ${q.en}`, wrong: `That one is ${o.he}.` });
      if (ok) T.later(700, next);
      return ok;
    }, { label: 'Meanings' }));
    for (const b of area.querySelectorAll('button')) { b.setAttribute('lang', 'en'); b.setAttribute('dir', 'ltr'); }
  };
  loadG3(A.ctx, 'questions').then((d) => {
    if (!T.live()) return;
    qwords = d.words; questions = shuffle(d.questions, rnd);
    next();
  }).catch(() => A.announce('The questions did not load. Check the connection and press Start again.'));
}

export const mount = mountArcade(spec, setup);
