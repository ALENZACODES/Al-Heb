// Not-Word Gap: a line has lost its "not". Hebrew says lo (not) right before the word it cancels (I not know), and ein
// (there is no) at the front of the thing that is missing. Pick the not-word and tap the gap where it goes.
import { mountArcade, choiceRow } from './arcade.js';
import { loadG3, shuffle, wordsOf, negationGap } from './g3-core.js';
import { begin, grade, gapLine, numberKeys, heText } from './g3-ui.js';

export const STORE_KEY = 'games.g3-negate.v1';
const ROUNDS = 8;
const spec = {
  id: 'g3-negate', title: 'Not-Word Gap', titleHe: 'לֹא',
  blurb: 'Hebrew has two everyday not-words. Lo (not) goes straight before the verb or adjective it cancels: ani lo yode\'a, I don\'t know. Ein means "there is no" and starts the phrase: ein be\'aya, no problem; ein li, I don\'t have. Each line here has lost its not-word: put it back.',
  howTo: ['Levels 1 and 2 give you the word: tap the gap where it goes.', 'From level 3 pick the word first (key 1 or 2), then the gap.', 'A wrong gap greys out and costs points.', 'Level 4 hides the English until you finish the line.'],
  levels: [
    { name: 'Where does lo go?', only: 'לֹא', en: true },
    { name: 'Where does ein go?', only: 'אֵין', en: true },
    { name: 'Which not, and where?', en: true },
    { name: 'No English', en: false },
    { name: 'Quick nots', en: true, fast: true },
  ],
  par: () => ROUNDS * 20,
  seconds: (l) => (l === 5 ? 120 : 180),
  needsWords: false, needsLetters: false,
};
const NOTS = { 'לֹא': 'not', 'אֵין': 'there is no' };
/** Lines with one not-word from the sentences file and from both forms of the gendered lines. */
export function negLines(sent, gender) {
  const out = [...sent.negation.map((x) => ({ he: x.he, en: x.en, at: x.neg }))];
  for (const g of gender.items) for (const k of ['m', 'f']) {
    const ws = wordsOf(g[k]), at = ws.findIndex((w) => w.w in NOTS && !w.p);
    if (at >= 0 && ws.filter((w) => w.w in NOTS).length === 1) out.push({ he: g[k], en: g.en + (k === 'f' ? ' (a woman speaking or spoken to)' : ''), at });
  }
  const seen = new Set();
  return out.filter((x) => { const k = x.he.replace(/[?.!,]/g, ''); if (seen.has(k)) return false; seen.add(k); return true; });
}

function setup(A) {
  const { T, big, prompt, area } = begin(A, 'noa', 'Lo before the word it cancels; ein for "there is no".',
    'Lines from the lessons, units, phrasebook and gender pairs, as written there. Not reviewed by a teacher.');
  const cfg = A.cfg, rnd = A.rnd;
  numberKeys(A, () => area.querySelector('.arc-choices'));
  let lines = [], n = 0;
  const next = () => { if (n >= ROUNDS || !lines.length) { T.end({ won: true }); return; } n += 1; ask(lines[(n - 1) % lines.length]); };
  const ask = (line) => {
    const { word, gap, rest } = negationGap(line.he, line.at);
    big.replaceChildren(heText(A, rest.map((x) => x.w + x.p).join(' ')));
    prompt.textContent = `Line ${n} of ${ROUNDS}${cfg.en ? `: "${line.en}"` : ''}. ${cfg.only ? `Where does ${word} go?` : 'Which not-word is missing?'}`;
    const place = () => {
      const tried = new Set();
      const gl = gapLine(A, rest.map((x) => x.w), (i) => {
        if (tried.has(i) || !T.live()) return;
        if (i === gap) {
          grade(A, true, { right: `${line.he}${cfg.en ? '' : ` (${line.en})`}` });
          big.replaceChildren(heText(A, line.he));
          for (const b of gl.querySelectorAll('button')) b.disabled = true;
          T.later(cfg.fast ? 500 : 900, next);
        } else {
          tried.add(i); gl.querySelectorAll('button')[i].disabled = true;
          grade(A, false, { wrong: word === 'לֹא' ? 'Lo sits right before the word it cancels.' : 'Ein starts the "there is no" phrase.' });
        }
      });
      area.replaceChildren(A.h('p', {}, 'Tap the gap for ', heText(A, word), '.'), gl);
    };
    if (cfg.only) { place(); return; }
    area.replaceChildren(choiceRow(Object.keys(NOTS), (o) => `${o} (${NOTS[o]})`, (o) => {
      const ok = o === word;
      grade(A, ok, { right: `${o}: ${NOTS[o]}. Now where does it go?`, wrong: `${o} means "${NOTS[o]}". Think about what the line says.`, points: 5 });
      if (ok) T.later(300, place);
      return ok;
    }, { label: 'Not-words' }));
  };
  Promise.all([loadG3(A.ctx, 'sentences'), loadG3(A.ctx, 'gender')]).then(([s, g]) => {
    if (!T.live()) return;
    lines = shuffle(negLines(s, g).filter((x) => !cfg.only || wordsOf(x.he)[x.at].w === cfg.only), rnd);
    next();
  }).catch(() => A.announce('The lines did not load. Check the connection and press Start again.'));
}

export const mount = mountArcade(spec, setup);
