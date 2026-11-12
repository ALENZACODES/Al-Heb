// Letter and Topic: "an animal that starts with כ". Only one of the words fits both: the others are the right topic with
// the wrong letter, or the right letter in the wrong topic. Level 4 asks for the last letter instead (final forms and all).
import { mountArcade, choiceRow } from './arcade.js';
import { letterQuestion } from './g2-core.js';
import { start, host, grade, numberKeys, draftNote, word, topicName, say, he } from './g2-ui.js';

export const STORE_KEY = 'games.g2-firstletter.v1';
const ROUNDS = 10;

const spec = {
  id: 'g2-firstletter', title: 'Letter and Topic', titleHe: 'אוֹת',
  blurb: 'Two clues at once: a topic and a letter. Find the one word that fits both, and skip the words that fit only one.',
  howTo: ['Read the topic and the letter.', 'Tap the word that is in that topic and starts with that letter (or press its number).', 'The other words fit one clue or none: a wrong pick is a miss.', 'Level 4 asks for the last letter; level 5 mixes first and last.'],
  levels: [
    { name: 'First letter, with English', n: 3, en: true, tr: true, where: ['start'] },
    { name: 'First letter', n: 3, en: false, tr: true, where: ['start'] },
    { name: 'Four words, Hebrew only', n: 4, en: false, tr: false, where: ['start'] },
    { name: 'Last letter', n: 4, en: false, tr: true, where: ['end'] },
    { name: 'First or last, five words', n: 5, en: false, tr: false, where: ['start', 'end'] },
  ],
  par: () => ROUNDS * 10,
  seconds: () => 150,
  needsWords: false, needsLetters: false,
};

function setup(A) {
  const cfg = A.cfg, rnd = A.rnd;
  const prompt = A.h('p', { class: 'arc-prompt' });
  const big = A.h('div', { class: 'g2-big' });
  const area = A.h('div');
  const after = A.h('p', { class: 'muted', 'aria-live': 'polite' });
  A.board.replaceChildren(host(A, 'noa', 'It has to fit both clues.'), prompt, big, area, after,
    draftNote(A, 'Words and topics come from the app\'s word lists. A native reader has not checked them yet.'));
  numberKeys(A, () => area.querySelector('.arc-choices'));
  start(A, (D, T) => {
    let n = 0;
    const next = () => {
      if (n >= ROUNDS) { T.end({ won: true }); return; }
      n += 1;
      const where = cfg.where[Math.floor(rnd() * cfg.where.length)];
      const q = letterQuestion(D, cfg.n, rnd, where);
      if (!q) { T.end({ won: true }); return; }
      prompt.textContent = `Word ${n} of ${ROUNDS}: a word in this topic that ${where === 'end' ? 'ends' : 'starts'} with the letter`;
      big.replaceChildren(topicName(A, D, q.topic), ' + ', he(A, q.shown, 'he g2-he'));
      after.textContent = '';
      area.replaceChildren(choiceRow(q.options, (w) => word(A, w, { en: cfg.en, tr: cfg.tr }), (w) => {
        const ok = w === q.answer;
        const inTopic = w.topic === q.topic;
        grade(A, ok, { right: `${w.he} (${w.en}) fits both.`, wrong: `${w.he} (${w.en}) ${inTopic ? 'is in the topic but has the wrong letter' : `is in ${D.topics[w.topic].title}, not ${D.topics[q.topic].title}`}.` });
        if (ok) { say(A, w); after.textContent = `${w.he}${w.tr ? ` (${w.tr})` : ''} = ${w.en}`; T.later(900, next); }
        return ok;
      }, { label: 'Words' }));
    };
    next();
  });
}

export const mount = mountArcade(spec, setup);
