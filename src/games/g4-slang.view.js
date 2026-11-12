// Local Fillers: yalla, sababa, nu, achla. A real example line from the app's fillers file has a gap; pick the little
// word a local would put there. From level 4, also say how casual it is. Lines are read straight from data/israel/fillers.json.
import { mountArcade } from './arcade.js';
import { loadIsrael, options, sample, stripPoints } from './g4-core.js';
import { begin, withBank, host, heText, enText, grade, numberKeys, buttons, draftNote } from './g4-ui.js';

export const STORE_KEY = 'games.g4-slang.v1';
const ROUNDS = 10;
export const GAP = '___';
export const REGISTERS = Object.freeze({ neutral: 'Neutral: fine with anyone', casual: 'Casual: everyday, relaxed', slang: 'Slang: friends only' });

/** The example with the filler taken out (first time it appears), or null when it does not appear. */
export function gapped(f) {
  const ex = f?.example?.he || '';
  const i = ex.indexOf(f.he);
  return i < 0 ? null : ex.slice(0, i) + GAP + ex.slice(i + f.he.length);
}
/** Shape of a line with the gap, ignoring punctuation, so two fillers that fit the same frame never compete. */
const frame = (s) => String(s).replace(/[!?,.\s]+/g, ' ').trim();
/** Fillers that can be offered as wrong answers for f: a different word whose own example has a different frame. */
export const rivals = (f, all) => all.filter((x) => x.id !== f.id && x.he !== f.he && frame(gapped(x)) !== frame(gapped(f)) && !gapped(f).includes(x.he));

const spec = {
  id: 'g4-slang', title: 'Local Fillers', titleHe: 'סַבָּבָה',
  blurb: 'Small words make Hebrew sound lived-in: yalla to get going, sababa for fine, nu for "well?", tachles for "bottom line". Each line has a gap and its English; choose the filler a local would use. Later, say how casual it is.',
  howTo: ['Read the line and its English, then pick the missing word. Press 1 to 5 or tap.', 'Levels 1 and 2 show how each word sounds; level 1 shows what it means.', 'Level 4 adds a second question: is the word neutral, casual or slang?', 'Level 5: no vowel points and five choices.'],
  levels: [
    { name: 'Three words, with meanings', choices: 3, tr: true, en: true },
    { name: 'Four words', choices: 4, tr: true },
    { name: 'Hebrew only', choices: 4 },
    { name: 'And how casual?', choices: 4, register: true },
    { name: 'Bare text, five words', choices: 5, register: true, plain: true },
  ],
  par: (l) => ROUNDS * (l >= 4 ? 20 : 10),
  seconds: (l) => (l >= 4 ? 220 : 150),
  needsWords: false, needsLetters: false,
};

function setup(A) {
  const T = begin(A), cfg = A.cfg, rnd = A.rnd;
  const line = A.h('div', { class: 'g4-scene' }), area = A.h('div'), after = A.h('p', { class: 'muted', 'aria-live': 'polite' });
  A.board.replaceChildren(host(A, 'noa', 'Which little word goes here?'), line, area, after, draftNote(A, 'Lines from the app\'s fillers file, written for this course. Not yet checked by a native speaker.'));
  numberKeys(A, () => area.querySelector('.arc-choices'));
  withBank(A, T, (_B, data) => {
    const all = data.fillers.filter((f) => gapped(f));
    const deck = sample(all, ROUNDS, rnd);
    const txt = (s) => (cfg.plain ? stripPoints(s) : s);
    let n = 0;
    const next = () => {
      if (n >= deck.length) { T.end({ won: true }); return; }
      const f = deck[n]; n += 1;
      after.textContent = '';
      line.replaceChildren(A.h('p', { class: 'arc-prompt' }, `Line ${n} of ${deck.length}`), A.h('p', {}, heText(A, txt(gapped(f)), { cls: 'g4-he g4-big' })), A.h('p', {}, enText(A, `"${f.example.en}"`)));
      const opts = options(f, rivals(f, all), cfg.choices, rnd, (x) => x.id);
      const label = (x) => A.h('span', { class: 'g4-item' }, heText(A, txt(x.he)), cfg.tr ? A.h('small', { class: 'g4-tr', lang: 'en' }, x.translit) : null, cfg.en ? A.h('small', { class: 'g4-en', lang: 'en' }, x.en) : null);
      area.replaceChildren(buttons(A, opts, label, (x) => {
        const ok = grade(A, x.id === f.id, { right: `Yes: ${f.translit}, "${f.en}".`, wrong: `${x.translit} means "${x.en}".` });
        if (!ok) return false;
        after.textContent = f.usage || '';
        if (!cfg.register) { T.later(900, next); return true; }
        T.later(300, () => area.replaceChildren(A.h('p', {}, `How casual is ${f.translit}?`), buttons(A, Object.keys(REGISTERS), (r) => enText(A, REGISTERS[r]), (r) => {
          const good = grade(A, r === f.register, { right: `Right: ${REGISTERS[f.register].split(':')[0].toLowerCase()}.`, wrong: `Not quite: it is ${REGISTERS[f.register].split(':')[0].toLowerCase()}.` });
          if (good) T.later(800, next);
          return good;
        }, { label: 'How casual' })));
        return true;
      }, { label: 'Fillers' }));
    };
    next();
  }, (ctx) => loadIsrael(ctx, 'fillers'));
}

export const mount = mountArcade(spec, setup);
