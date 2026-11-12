// Pattern Clues: every Hebrew verb is cast in one of a few patterns (binyanim). Each pattern leaves marks on the verb's
// forms: a nun in front, a he and a yod, a mem in the present, a hit- in front. Reveal clues one at a time and name the
// pattern; the fewer clues you need, the more points.
import { mountArcade } from './arcade.js';
import { loadG3, shuffle, BINYANIM, clueOrder, cluePoints } from './g3-core.js';
import { begin, grade, roundKeys, heText } from './g3-ui.js';

export const STORE_KEY = 'games.g3-clues.v1';
const ROUNDS = 8;
const spec = {
  id: 'g3-clues', title: 'Pattern Clues', titleHe: 'בִּנְיָן',
  blurb: 'Hebrew verbs come in patterns called binyanim. Pa\'al is the plain one; Nif\'al often starts with nun; Pi\'el has a mem in its present; Hif\'il starts with he and often has a yod before its last letter; Hitpa\'el starts with hit-. Open clues one at a time and name the pattern. The fewer clues you open, the more points you keep.',
  howTo: ['A clue card shows one form of a mystery verb. Press a pattern, or keys 1 to 5.', 'Press "Next clue" (or Space) to see another form. Each clue lowers the points.', 'A wrong pattern greys out; try another.', 'Level 5 starts from the meaning alone.'],
  levels: [
    { name: 'Plain or with he?', patterns: ["pa'al", "hif'il"], start: 1 },
    { name: 'Three patterns', patterns: ["pa'al", "pi'el", "hif'il"], start: 1 },
    { name: 'Four patterns', patterns: ["pa'al", "pi'el", "hif'il", "hitpa'el"], start: 1 },
    { name: 'All five', patterns: ["pa'al", "nif'al", "pi'el", "hif'il", "hitpa'el"], start: 1 },
    { name: 'Start from the meaning', patterns: ["pa'al", "nif'al", "pi'el", "hif'il", "hitpa'el"], start: 0 },
  ],
  par: () => ROUNDS * 16,
  seconds: () => 210,
  needsWords: false, needsLetters: false,
};

function setup(A) {
  const { T, big, prompt, area } = begin(A, 'noa', 'Look for the marks the pattern leaves.',
    'Verbs and their pattern labels come from the app\'s verb list (from its dictionary source; not checked by a teacher). The pattern hints are the usual textbook summaries.');
  big.textContent = '';
  const cfg = A.cfg, rnd = A.rnd, pats = BINYANIM.filter((b) => cfg.patterns.includes(b.key));
  let deck = [], n = 0, v = null, shown = 0, wrong = new Set();
  const cards = A.h('div', { class: 'g3-scene', 'aria-live': 'polite' });
  const more = A.h('button', { type: 'button', class: 'btn secondary', onclick: () => reveal() }, 'Next clue');
  const row = A.h('div', { class: 'arc-choices', role: 'group', 'aria-label': 'Patterns' },
    ...pats.map((p, i) => A.h('button', { type: 'button', class: 'arc-choice', 'data-key': p.key, onclick: () => pick(p) }, `${i + 1}. ${p.name}`, A.h('small', { style: 'display:block;font-size:.75rem' }, p.gist))));
  area.replaceChildren(cards, A.h('p', {}, more), row);
  const clue = (c) => A.h('div', { class: 'g3-tag' }, A.h('small', {}, c.label + ': '), c.he ? heText(A, c.he) : c.text);
  const draw = () => {
    const cs = clueOrder(v).slice(cfg.start ? 1 : 0);
    cards.replaceChildren(...cs.slice(0, shown).map(clue));
    more.disabled = shown >= cs.length;
    for (const b of row.querySelectorAll('button')) b.disabled = wrong.has(b.getAttribute('data-key'));
    prompt.textContent = `Verb ${n} of ${ROUNDS}: ${shown} clue${shown === 1 ? '' : 's'} open. Worth ${cluePoints(shown)} points.`;
  };
  const reveal = () => { if (!more.disabled && T.live()) { shown += 1; A.sfx('drop'); draw(); } };
  const next = () => { if (n >= ROUNDS || !deck.length) { T.end({ won: true }); return; } v = deck[n]; n += 1; shown = 1; wrong = new Set(); draw(); };
  const pick = (p) => {
    if (!v || !T.live() || wrong.has(p.key)) return;
    const own = pats.find((x) => x.key === v.binyan);
    if (p.key === v.binyan) {
      grade(A, true, { right: `${v.he}: ${own.name}. Sign: ${own.sign}.`, points: cluePoints(shown) });
      for (const b of row.querySelectorAll('button')) b.disabled = true;
      more.disabled = true; v = null;
      T.later(900, next);
    } else { wrong.add(p.key); grade(A, false, { wrong: `Not ${p.name}. ${p.name}: ${p.sign}.` }); draw(); }
  };
  roundKeys(A, (k) => {
    if (k === 'space') { reveal(); return true; }
    const b = row.querySelectorAll('button')[Number(k) - 1];
    if (b && !b.disabled) { b.click(); return true; }
    return false;
  });
  loadG3(A.ctx, 'verbs').then((d) => {
    if (!T.live()) return;
    // the same number of verbs from each pattern, so guessing the commonest pattern does not pay
    const per = Math.ceil(ROUNDS / pats.length);
    deck = shuffle(pats.flatMap((p) => shuffle(d.verbs.filter((x) => x.binyan === p.key && x.level !== 'B1'), rnd).slice(0, per)), rnd).slice(0, ROUNDS);
    next();
  }).catch(() => A.announce('The verbs did not load. Check the connection and press Start again.'));
}

export const mount = mountArcade(spec, setup);
