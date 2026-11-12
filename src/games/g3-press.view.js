// Pattern Press: three family letters go into a verb pattern, and a verb comes out. Pick the verb the press makes. The
// choices share either the letters or the pattern with the right one, so you need both. The app lists these letters per
// verb from its dictionary source; a teacher has not yet confirmed them as roots, so the game calls them family letters.
import { mountArcade, choiceRow } from './arcade.js';
import { loadG3, shuffle, familyLetters, pressChoices, binyanOf, formOf, gloss } from './g3-core.js';
import { begin, grade, numberKeys } from './g3-ui.js';

export const STORE_KEY = 'games.g3-press.v1';
const ROUNDS = 8;
const spec = {
  id: 'g3-press', title: 'Pattern Press', titleHe: 'תַּבְנִית',
  blurb: 'Most Hebrew verbs are three family letters set into a pattern, like dough into a mould. The same letters in another pattern make a related verb; the same pattern with other letters gives the same shape. Three letters and a pattern go into the press: pick the verb that comes out.',
  howTo: ['Read the three letters (right to left) and the pattern. Pick the verb; keys 1 to 4.', 'Wrong choices share the letters or the pattern, so check both.', 'Level 2 hides the meaning. Levels 3 to 5 ask for the infinitive, the present, then the future.'],
  levels: [
    { name: 'With the meaning', form: 'past', en: true },
    { name: 'Letters and pattern only', form: 'past', en: false },
    { name: 'Press the "to …" form', form: 'infinitive', en: false },
    { name: 'Press the present', form: 'present', en: false },
    { name: 'Press the future', form: 'future', en: false },
  ],
  par: () => ROUNDS * 10,
  seconds: () => 180,
  needsWords: false, needsLetters: false,
};
const FORM_EN = { past: 'dictionary form (he did)', infinitive: 'to … form', present: 'present', future: 'future (he will)' };

function setup(A) {
  const { T, big, prompt, area } = begin(A, 'rimon', 'Letters in, pattern on, verb out.',
    'Verbs, their listed letters and pattern labels come from the app\'s verb list (dictionary source). A Hebrew reader has not yet confirmed which letters belong together. Not reviewed by a teacher.');
  const cfg = A.cfg, rnd = A.rnd;
  numberKeys(A, () => area.querySelector('.arc-choices'));
  let verbs = [], deck = [], n = 0;
  const next = () => { if (n >= ROUNDS || !deck.length) { T.end({ won: true }); return; } n += 1; ask(deck[n - 1]); };
  const ask = (v) => {
    const b = binyanOf(v.binyan), letters = familyLetters(v.root);
    big.replaceChildren(A.h('div', { class: 'g3-scene', dir: 'rtl', role: 'img', 'aria-label': `Letters ${letters.join(', ')} into ${b.name}` },
      ...letters.map((l) => A.h('span', { class: 'g3-tag', lang: 'he' }, l)), A.h('span', { 'aria-hidden': 'true' }, '←'), A.h('span', { class: 'g3-tag' }, b.name)));
    prompt.textContent = `Press ${n} of ${ROUNDS}: ${b.name} (${b.gist})${cfg.en ? `, "${gloss(v.en)}"` : ''}. Which ${FORM_EN[cfg.form]} comes out?`;
    const opts = pressChoices(v, verbs, 4, rnd);
    area.replaceChildren(choiceRow(opts, (o) => formOf(o, cfg.form), (o) => {
      const ok = o.id === v.id;
      const why = o.root === v.root ? `same letters, but ${binyanOf(o.binyan)?.name || o.binyan}` : o.binyan === v.binyan ? `same pattern, other letters (${o.root})` : 'other letters and another pattern';
      grade(A, ok, { right: `${formOf(v, cfg.form)}: ${gloss(v.en)}.`, wrong: `${formOf(o, cfg.form)}: ${why}.` });
      if (ok) T.later(800, next);
      return ok;
    }, { label: 'Verbs' }));
  };
  loadG3(A.ctx, 'verbs').then((d) => {
    if (!T.live()) return;
    verbs = d.verbs.filter((v) => v.root && familyLetters(v.root).length === 3 && binyanOf(v.binyan));
    deck = shuffle(verbs, rnd).slice(0, ROUNDS);
    next();
  }).catch(() => A.announce('The verbs did not load. Check the connection and press Start again.'));
}

export const mount = mountArcade(spec, setup);
