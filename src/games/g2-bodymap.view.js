// Body Map: read a body word and touch that part on the figure (or on the face). The spots carry their English names
// for screen readers; sighted players see the names only on the early levels. Level 5 turns it round: a spot is marked,
// pick its Hebrew word.
import { mountArcade, choiceRow } from './arcade.js';
import { shuffle, options } from './g2-core.js';
import { start, host, grade, numberKeys, draftNote, word, say, he } from './g2-ui.js';

export const STORE_KEY = 'games.g2-bodymap.v1';
const ROUNDS = 10;

const spec = {
  id: 'g2-bodymap', title: 'Body Map', titleHe: 'גּוּף',
  blurb: 'Head, hand, knee, ear: read the Hebrew and touch that part of the body. The face has its own map for the eyes, nose, mouth and more.',
  howTo: ['Read the word at the top, then tap that spot on the figure or the face.', 'Levels 1 and 2 show the names on the spots; from level 3 the spots are blank.', 'Screen readers hear each spot\'s name at every level.', 'Level 5: a spot is marked; pick its Hebrew word.'],
  levels: [
    { name: 'The body, labelled', maps: ['figure'], labels: true, tr: true },
    { name: 'Body and face, labelled', maps: ['figure', 'face'], labels: true, tr: false },
    { name: 'Blank spots', maps: ['figure', 'face'], labels: false, tr: true },
    { name: 'Blank spots, Hebrew only', maps: ['figure', 'face'], labels: false, tr: false },
    { name: 'Name the marked spot', maps: ['figure', 'face'], labels: false, tr: false, reverse: true },
  ],
  par: () => ROUNDS * 10,
  seconds: () => 150,
  needsWords: false, needsLetters: false,
};

function setup(A) {
  const cfg = A.cfg, rnd = A.rnd;
  const prompt = A.h('p', { class: 'arc-prompt' });
  const big = A.h('div', { class: 'g2-big' });
  const maps = A.h('div', { class: 'g2-row' });
  const area = A.h('div');
  const after = A.h('p', { class: 'muted', 'aria-live': 'polite' });
  A.board.replaceChildren(host(A, 'noa', 'Touch the part of the body.'), prompt, big, area, maps, after,
    draftNote(A, 'Words come from the app\'s word lists; a native reader has not checked them yet.'));
  numberKeys(A, () => area.querySelector('.arc-choices'));
  start(A, (D, T) => {
    const parts = cfg.maps.flatMap((m) => (D.sets.body?.[m] || []).map((p) => ({ ...p, map: m, w: D.word(p.he) })));
    const order = shuffle(parts, rnd).slice(0, ROUNDS);
    let n = 0, cur = null;
    const dots = new Map();
    maps.replaceChildren(...cfg.maps.map((m) => {
      const box = A.h('div', { class: m === 'face' ? 'g2-face' : 'g2-figure', role: 'group', 'aria-label': m === 'face' ? 'Face' : 'Body' });
      for (const p of parts.filter((x) => x.map === m)) {
        const b = A.h('button', { type: 'button', class: 'g2-dot', style: `left:${p.x}%;top:${p.y}%` },
          cfg.labels ? p.w.en : A.h('span', {}, A.h('span', { 'aria-hidden': 'true' }, '+'), A.h('span', { class: 'visually-hidden' }, p.w.en)));
        if (cfg.reverse) b.disabled = true; // level 5 answers with the word buttons; the spots only show which part is marked
        b.addEventListener('click', () => tapDot(p, b));
        dots.set(p.he, b); box.append(b);
      }
      return box;
    }));
    const done = (p) => {
      say(A, p.w);
      after.textContent = `${p.w.he}${p.w.tr ? ` (${p.w.tr})` : ''} = ${p.w.en}`;
      T.later(900, ask);
    };
    const tapDot = (p, b) => {
      if (!cur || cfg.reverse) return;
      const ok = p.he === cur.he;
      grade(A, ok, { right: `Yes, ${cur.w.he} is the ${cur.w.en}.`, wrong: `That is the ${p.w.en}. Find ${cur.w.he}.` });
      if (!ok) { b.classList.add('is-bad'); return; }
      cur = null; done(p);
    };
    const ask = () => {
      for (const b of dots.values()) b.classList.remove('is-bad', 'is-mark', 'is-path');
      if (n >= order.length) { T.end({ won: true }); return; }
      cur = order[n]; n += 1;
      if (!cfg.reverse) {
        prompt.textContent = `Part ${n} of ${order.length}: touch`;
        big.replaceChildren(word(A, cur.w, { tr: cfg.tr }));
        area.replaceChildren();
        return;
      }
      const mark = dots.get(cur.he);
      mark.classList.add('is-mark');
      prompt.textContent = `Part ${n} of ${order.length}: the marked spot (${cur.w.en}) is called…`;
      big.replaceChildren(A.h('span', { 'aria-hidden': 'true' }, '★'));
      const target = cur;
      area.replaceChildren(choiceRow(options(target.w, parts.map((p) => p.w), 4, rnd, (w) => w.he), (w) => he(A, w.he), (w) => {
        const ok = w.he === target.he;
        grade(A, ok, { right: `${target.w.he} = ${target.w.en}.`, wrong: `${w.he} means "${w.en}".` });
        if (ok) { cur = null; done(target); }
        return ok;
      }, { label: 'Words' }));
    };
    ask();
  });
}

export const mount = mountArcade(spec, setup);
