// Gap Train: a train of alphabet carriages runs right to left, but some carriages are empty. Fill the gaps in order from
// the engine back, choosing from a tray that also holds letters that do not belong. Later trains run backwards.
import { mountArcade } from './arcade.js';
import { trainCars, shuffle, ALPHABET_LETTERS } from './g1-core.js';
import { host, track, grade, draftNote, ensureStyle, he, series, numberKeys, markButton } from './g1-ui.js';

export const STORE_KEY = 'games.g1-gaptrain.v1';

const spec = {
  id: 'g1-gaptrain', title: 'Gap Train', titleHe: 'רַכֶּבֶת',
  blurb: 'The alphabet train has empty carriages. Fill them in order, from the engine back. The tray holds the missing letters and a few that do not belong. From level 4 some trains run backwards, from tav towards aleph.',
  howTo: ['The engine is on the right, as Hebrew reads. The outlined carriage is the next gap.', 'Tap the letter that belongs there, or press its number key.', 'A wrong letter costs a point.', 'After tav the train starts again at aleph.'],
  levels: [
    { name: 'One gap', len: 5, gaps: 1, decoys: 2, trains: 6, back: 0 },
    { name: 'Two gaps', len: 6, gaps: 2, decoys: 2, trains: 6, back: 0 },
    { name: 'Three gaps', len: 7, gaps: 3, decoys: 3, trains: 6, back: 0 },
    { name: 'Backwards trains', len: 6, gaps: 2, decoys: 3, trains: 6, back: 1 },
    { name: 'Long trains, both ways', len: 8, gaps: 4, decoys: 3, trains: 6, back: 0.5 },
  ],
  par: (l, cfg) => cfg.trains * cfg.gaps * 12,
  seconds: (l, cfg) => 30 + cfg.trains * cfg.gaps * 10,
  needsWords: false,
};

function setup(A) {
  ensureStyle();
  const T = track(A), cfg = A.cfg, rnd = A.rnd;
  const nameOf = (c) => A.letters.find((l) => l.he === c)?.name || c;
  const prompt = A.h('p', { class: 'arc-prompt' });
  const trainEl = A.h('div', { class: 'g1-train', role: 'list', 'aria-label': 'The train, engine first' });
  const tray = A.h('div', {});
  A.board.replaceChildren(host(A, 'rimon', 'All aboard! Some carriages lost their letters.'), prompt, trainEl, tray,
    draftNote(A, 'The order is the alphabet of 22 letters. Final forms are not separate carriages.'));
  numberKeys(A, () => tray.querySelector('.arc-choices'));
  series(A, T, cfg.trains, (i, done) => {
    const dir = rnd() < cfg.back ? -1 : 1;
    const cars = trainCars(Math.floor(rnd() * ALPHABET_LETTERS.length), cfg.len, cfg.gaps, rnd, dir);
    const gaps = cars.filter((c) => c.gap);
    let at = 0;
    const draw = () => {
      trainEl.replaceChildren(A.h('span', { class: 'g1-car', role: 'listitem', 'aria-label': 'Engine' }, '🚂'), ...cars.map((c, k) => {
        const open = c.gap && !c.filled, isNext = open && c === gaps[at];
        return A.h('span', { class: `g1-car${open ? ' is-gap' : ''}${isNext ? ' is-next' : ''}`, role: 'listitem', 'aria-label': open ? (isNext ? `Carriage ${k + 1}: empty, next` : `Carriage ${k + 1}: empty`) : `Carriage ${k + 1}: ${nameOf(c.he)}` }, open ? (isNext ? '?' : '') : he(A, c.he));
      }));
    };
    prompt.textContent = `Train ${i} of ${cfg.trains}${dir < 0 ? ', running backwards' : ''}: ${gaps.length} empty carriage${gaps.length > 1 ? 's' : ''}.`;
    const decoys = shuffle(ALPHABET_LETTERS.filter((c) => !cars.some((x) => x.he === c)), rnd).slice(0, cfg.decoys);
    const opts = shuffle([...gaps.map((g) => g.he), ...decoys], rnd);
    tray.replaceChildren(A.h('div', { class: 'arc-choices g1-rtl', role: 'group', 'aria-label': 'Letters for the gaps' }, ...opts.map((c) => {
      const b = A.h('button', { type: 'button', class: 'arc-choice', 'aria-label': nameOf(c) }, he(A, c));
      b.addEventListener('click', () => {
        if (b.disabled) return;
        const want = gaps[at];
        if (want && c === want.he) {
          want.filled = true; at += 1; b.disabled = true; markButton(A, b, true);
          grade(A, true, { right: `${nameOf(c)} is back in its carriage.` });
          draw();
          if (at === gaps.length) { A.addScore(5); A.announce(`Train ${i} is complete.`); for (const x of tray.querySelectorAll('button')) x.disabled = true; done(); }
        } else grade(A, false, { wrong: `${nameOf(c)} does not go in this carriage.` });
      });
      return b;
    })));
    draw();
  })();
}

export const mount = mountArcade(spec, setup);
