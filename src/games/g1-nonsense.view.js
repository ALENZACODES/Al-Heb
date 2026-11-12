// Nonsense Reader: made-up words built from the app's recorded syllables (data/lab/syllables.json). They mean nothing,
// so the only way in is to read the letters and the vowels: no guessing from a word you half know. Pick how it sounds.
// Wrong choices swap one vowel or letter, or read the word left to right.
import { mountArcade } from './arcade.js';
import { nonsense, nonsenseFoils, shuffle } from './g1-core.js';
import { host, track, draftNote, ensureStyle, he, series, choiceButtons, numberKeys, loadSyllables, saySyllable } from './g1-ui.js';

export const STORE_KEY = 'games.g1-nonsense.v1';

const spec = {
  id: 'g1-nonsense', title: 'Nonsense Reader', titleHe: 'קְרִיאָה',
  blurb: 'These words are made up on purpose. They mean nothing, so you cannot guess: you have to read every letter and every vowel. Pick the way the word sounds. Watch out for choices that read it backwards.',
  howTo: ['Read right to left, one syllable at a time.', 'Tap the sound that matches, or press its number key.', 'A wrong pick costs a point and shows the word split into its syllables.', 'Levels 3 and 5 close the word with a letter that has no vowel, as in many real words.'],
  levels: [
    { name: 'Two syllables', syl: 2, closed: 0, choices: 3, count: 10 },
    { name: 'Four choices', syl: 2, closed: 0, choices: 4, count: 10 },
    { name: 'Closed ends', syl: 2, closed: 1, choices: 4, count: 10 },
    { name: 'Three syllables', syl: 3, closed: 0, choices: 4, count: 10 },
    { name: 'Three syllables, closed', syl: 3, closed: 1, choices: 5, count: 12 },
  ],
  par: (l, cfg) => cfg.count * 10,
  seconds: (l, cfg) => 20 + cfg.count * 9,
  needsWords: false, needsLetters: false,
};

/** A question: a made-up word with distinct readings to choose from. */
export function question(syllables, cfg, rnd = Math.random) {
  for (let k = 0; k < 50; k++) {
    const w = nonsense(syllables, cfg.syl, rnd() < cfg.closed, rnd);
    const foils = nonsenseFoils(w, syllables, cfg.choices - 1, rnd);
    if (foils.length === cfg.choices - 1) return { word: w, options: shuffle([w.tr, ...foils], rnd) };
  }
  return null;
}

function setup(A) {
  ensureStyle();
  const T = track(A), cfg = A.cfg, rnd = A.rnd;
  const prompt = A.h('p', { class: 'arc-prompt' });
  const word = A.h('div', { class: 'g1-big', lang: 'he', dir: 'rtl' });
  const area = A.h('div', {});
  const split = A.h('p', { class: 'muted' });
  A.board.replaceChildren(host(A, 'noa', 'No meaning to lean on. Just read it.'), prompt, word, split, area,
    draftNote(A, 'Made-up words, joined from the app\'s syllable table; Israeli sounds. Some may happen to be real words.'));
  numberKeys(A, () => area.querySelector('.arc-choices'));
  loadSyllables(A.ctx).then((syllables) => {
    if (!T.live()) return;
    series(A, T, cfg.count, (i, done) => {
      const q = question(syllables, cfg, rnd);
      if (!q) { done(); return; }
      const w = q.word;
      prompt.textContent = `Word ${i} of ${cfg.count}: how does it sound?`;
      word.replaceChildren(he(A, w.he));
      split.textContent = '';
      area.replaceChildren(choiceButtons(A, q.options, {
        render: (t) => t, label: 'Readings', rtl: false, isRight: (t) => t === w.tr,
        say: (t, ok) => (ok ? `Yes, “${w.tr}”.` : `Not “${t}”. Take it one syllable at a time.`),
        onWrong: () => { split.replaceChildren(...w.parts.map((p) => he(A, p.he + ' · ')), w.close ? he(A, w.close[0]) : ''); },
        onRight: () => { split.replaceChildren(...w.parts.map((p) => he(A, p.he + ' · ')), w.close ? he(A, w.close[0]) : '', `  “${w.tr}”`); w.parts.forEach((p, k) => T.later(k * 450, () => saySyllable(A, syllables, p.he))); done(); },
      }));
    }, 900)();
  }).catch(() => A.announce('The syllables did not load. Check the connection and press Start again.'));
}

export const mount = mountArcade(spec, setup);
