// Line Them Up: put words in their natural order: the days of the week, the months, the seasons, morning to night,
// grandfather to grandson, a fly to an elephant. Tap them in order; the line fills from the right.
import { mountArcade } from './arcade.js';
import { shuffle, lineupItems, stepIn } from './g2-core.js';
import { start, host, grade, numberKeys, draftNote, word, orderBoard } from './g2-ui.js';

export const STORE_KEY = 'games.g2-lineup.v1';

const spec = {
  id: 'g2-lineup', title: 'Line Them Up', titleHe: 'שׁוּרָה',
  blurb: 'Some words come in an order everyone knows: days, months, seasons, the parts of the day, the generations of a family. Line them up.',
  howTo: ['Read what the line is (for example: the days of the week, from Sunday).', 'Tap the words in that order, or press their numbers.', 'Each word in its place scores; a word tapped too early is a miss, and the line keeps what you have.', 'Higher levels hide the English and start the months part-way through the year.'],
  levels: [
    { name: 'Short lines, with English', sets: ['generations', 'times', 'seasons'], en: true, tr: true },
    { name: 'Short lines', sets: ['growing', 'ordinals', 'vehicles', 'houses'], en: false, tr: true },
    { name: 'The week', sets: ['days', 'sizes', 'seasons'], en: false, tr: true },
    { name: 'Months from anywhere', sets: ['months-part', 'days-part', 'houses'], en: false, tr: false },
    { name: 'The whole year', sets: ['months', 'days'], en: false, tr: false },
  ],
  par: (l, cfg) => cfg.sets.length * 18,
  seconds: () => 150,
  needsWords: false, needsLetters: false,
};

/** One line to order: { prompt, items }. A "-part" set starts at a random place and wraps (the week and the year go round). */
export function lineFor(D, id, rnd = Math.random) {
  const base = id.replace(/-part$/, '');
  const lu = (D.sets.lineups || []).find((x) => x.id === base);
  const items = lineupItems(D, lu);
  if (!id.endsWith('-part')) return { prompt: lu.prompt, items };
  const at = Math.floor(rnd() * items.length), len = base === 'months' ? 6 : 5;
  return { prompt: `${base === 'months' ? 'Months' : 'Days'} in order, starting from ${items[at].en}`, items: Array.from({ length: len }, (_, k) => stepIn(items, at, k)) };
}

function setup(A) {
  const cfg = A.cfg, rnd = A.rnd;
  const prompt = A.h('p', { class: 'arc-prompt' });
  const area = A.h('div');
  const after = A.h('p', { class: 'muted', 'aria-live': 'polite' });
  A.board.replaceChildren(host(A, 'ari', 'Everything in its place.'), prompt, area, after,
    draftNote(A, 'Words come from the app\'s word lists (Friday from the reading books). A native reader has not checked them yet.'));
  numberKeys(A, () => area.querySelector('.tg-tray'));
  start(A, (D, T) => {
    const lines = shuffle(cfg.sets, rnd);
    let n = 0;
    const next = () => {
      if (n >= lines.length) { T.end({ won: true }); return; }
      const line = lineFor(D, lines[n], rnd); n += 1;
      prompt.textContent = `Line ${n} of ${lines.length}: ${line.prompt}.`;
      area.replaceChildren(orderBoard(A, line.items, {
        rnd, shuffleFn: shuffle, label: 'Words to put in order',
        render: (w, placed) => word(A, w, { en: cfg.en || placed, tr: cfg.tr }),
        onRight: (w, k) => { A.addScore(2); after.textContent = `${k}. ${w.he} = ${w.en}`; },
        onWrong: (w, want) => grade(A, false, { wrong: `Not yet: ${w.he} (${w.en}) comes later.` }),
        onDone: () => { grade(A, true, { right: 'Line complete.' }); T.later(900, next); },
      }));
    };
    next();
  });
}

export const mount = mountArcade(spec, setup);
