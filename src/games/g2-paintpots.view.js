// Paint Pots: the colour words, then paint mixing. Name a colour, find its pot, mix two pots to make a third, say what
// two pots make, and finally name the colour of everyday things (a banana, snow, a carrot). Every swatch carries its name
// in words, so no answer depends on seeing colour.
import { mountArcade, choiceRow } from './arcade.js';
import { shuffle, options, mixOf } from './g2-core.js';
import { start, host, grade, numberKeys, draftNote, word, say, he } from './g2-ui.js';

export const STORE_KEY = 'games.g2-paintpots.v1';
const ROUNDS = 8;

const spec = {
  id: 'g2-paintpots', title: 'Paint Pots', titleHe: 'צֶבַע',
  blurb: 'Learn the colour words with a painter\'s table: name the colours, find the right pot, then mix two pots to make a new colour.',
  howTo: ['Level 1: read the Hebrew colour, tap its swatch (each swatch has its English name).', 'Level 2: read the English, tap the Hebrew pot.', 'Level 3: tap two pots that mix to the colour shown. Level 4: say what two pots make.', 'Level 5: what colour is it? A banana, snow, a carrot…'],
  levels: [
    { name: 'Name the colour', mode: 'name' },
    { name: 'Find the pot', mode: 'pot' },
    { name: 'Mix two pots', mode: 'mix' },
    { name: 'What do they make?', mode: 'make' },
    { name: 'The colour of things', mode: 'things' },
  ],
  par: () => ROUNDS * 10,
  seconds: () => 150,
  needsWords: false, needsLetters: false,
};

/** Swatch: a colour square plus the name in words. */
const swatch = (A, D, he, text) => A.h('span', {}, A.h('span', { class: 'g2-swatch', style: `background:${D.sets.swatch?.[he] || 'transparent'}`, 'aria-hidden': 'true' }), text);

function setup(A) {
  const cfg = A.cfg, rnd = A.rnd;
  const prompt = A.h('p', { class: 'arc-prompt' });
  const big = A.h('div', { class: 'g2-big' });
  const area = A.h('div');
  const after = A.h('p', { class: 'muted', 'aria-live': 'polite' });
  A.board.replaceChildren(host(A, 'rimon', 'Pots of paint, ready to go.'), prompt, big, area, after,
    draftNote(A, 'Colour words come from the app\'s word lists; the mixes are the usual paint-box ones. A native reader has not checked the words yet.'));
  numberKeys(A, () => area.querySelector('.arc-choices, .g2-row'));
  start(A, (D, T) => {
    const colours = D.items('colours');
    const C = (x) => D.word(x);
    let n = 0;
    const finishRound = (w) => { if (w) { say(A, w); after.textContent = `${w.he}${w.tr ? ` (${w.tr})` : ''} = ${w.en}`; } T.later(900, next); };
    const pick = (answer, pool, render, right, label) => area.replaceChildren(choiceRow(options(answer, pool, 4, rnd, (w) => w.he), render, (w) => {
      const ok = w.he === answer.he;
      grade(A, ok, { right: right(), wrong: `${w.he} means "${w.en}".` });
      if (ok) finishRound(answer);
      return ok;
    }, { label }));
    const rounds = {
      name() {
        const c = colours[Math.floor(rnd() * colours.length)];
        prompt.textContent = `Colour ${n} of ${ROUNDS}: tap this colour.`;
        big.replaceChildren(word(A, c, { tr: true }));
        pick(c, colours, (w) => swatch(A, D, w.he, w.en), () => `${c.he} is ${c.en}.`, 'Swatches');
      },
      pot() {
        const c = colours[Math.floor(rnd() * colours.length)];
        prompt.textContent = `Colour ${n} of ${ROUNDS}: find the pot for "${c.en}".`;
        big.replaceChildren(swatch(A, D, c.he, c.en));
        pick(c, colours, (w) => he(A, w.he), () => `${c.he} is ${c.en}.`, 'Pots');
      },
      mix() {
        const [a, b, out] = shuffle(D.sets.mixes || [], rnd)[0];
        const goal = C(out);
        prompt.textContent = `Mix ${n} of ${ROUNDS}: tap the two pots that make`;
        big.replaceChildren(swatch(A, D, goal.he, he(A, goal.he)), A.h('small', {}, ` (${goal.en})`));
        const pots = shuffle(colours.filter((w) => w.he !== out), rnd);
        const chosen = [];
        const row = A.h('div', { class: 'g2-row', role: 'group', 'aria-label': 'Pots' }, ...pots.map((w) => {
          const btn = A.h('button', { type: 'button', class: 'arc-choice', 'aria-pressed': false }, swatch(A, D, w.he, he(A, w.he)));
          btn.addEventListener('click', () => {
            if (btn.disabled) return;
            btn.disabled = true; btn.classList.add('is-on'); btn.setAttribute('aria-pressed', 'true');
            chosen.push(w.he);
            if (chosen.length < 2) { A.announce(`${w.he} (${w.en}) in the bowl. Pick one more.`); return; }
            const made = mixOf(D, chosen[0], chosen[1]);
            const ok = made === out;
            grade(A, ok, { right: `${C(a).he} and ${C(b).he} make ${goal.he} (${goal.en}).`, wrong: made ? `Those make ${C(made).he} (${C(made).en}). Try again.` : 'Those two do not make it. Try again.' });
            if (ok) { for (const x of row.querySelectorAll('button')) x.disabled = true; finishRound(goal); return; }
            chosen.length = 0;
            for (const x of row.querySelectorAll('button')) { x.disabled = false; x.classList.remove('is-on'); x.setAttribute('aria-pressed', 'false'); }
          });
          return btn;
        }));
        area.replaceChildren(row);
      },
      make() {
        const [a, b, out] = shuffle(D.sets.mixes || [], rnd)[0];
        prompt.textContent = `Mix ${n} of ${ROUNDS}: what do these two make?`;
        big.replaceChildren(he(A, C(a).he), ' + ', he(A, C(b).he));
        pick(C(out), colours.filter((w) => w.he !== a && w.he !== b), (w) => he(A, w.he), () => `${C(a).he} and ${C(b).he} make ${C(out).he}.`, 'Colours');
      },
      things() {
        const [thing, col] = shuffle(D.sets.colourOf || [], rnd)[0];
        const t = C(thing), c = C(col);
        prompt.textContent = `Thing ${n} of ${ROUNDS}: what colour is it?`;
        big.replaceChildren(word(A, t, { tr: true }));
        pick(c, colours, (w) => he(A, w.he), () => `${t.he} (${t.en}) is ${c.he}, ${c.en}.`, 'Colours');
      },
    };
    const next = () => {
      after.textContent = '';
      if (n >= ROUNDS) { T.end({ won: true }); return; }
      n += 1; rounds[cfg.mode]();
    };
    next();
  });
}

export const mount = mountArcade(spec, setup);
