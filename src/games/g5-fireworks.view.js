// Independence Fireworks: Yom HaAtzmaut words burst in the night sky and fade. Read the clue and tap the burst with the
// right word before it fades. More bursts and shorter fades as the levels go up; at the top level the clue is only
// how the word sounds.
import { mountG5, host, track, grade, draftNote, numberKeys, card, button, lock } from './g5-ui.js';
import { loadData, g5Data, shuffle, shortEn } from './g5-core.js';

export const STORE_KEY = 'games.g5-fireworks.v1';
const CELLS = 6;

const spec = {
  id: 'g5-fireworks', title: 'Independence Fireworks', titleHe: 'יוֹם הָעַצְמָאוּת',
  blurb: 'On Yom HaAtzmaut, Israel\'s Independence Day, the sky fills with fireworks. Each burst carries a word. Read the clue and tap the right burst before it fades.',
  howTo: ['Read the clue under the sky.', 'Tap the burst with the matching Hebrew word (or press its number) before it fades.', 'A wrong burst costs a few points; a faded one is a miss.', 'Level 5: the clue is how the word sounds, not what it means.'],
  levels: [
    { name: 'Three bursts, with how to say it', k: 3, life: 4500, n: 8, tr: true, clue: 'en' },
    { name: 'Four bursts', k: 4, life: 4000, n: 8, tr: false, clue: 'en' },
    { name: 'Five bursts', k: 5, life: 3400, n: 9, tr: false, clue: 'en' },
    { name: 'Six bursts, faster', k: 6, life: 2800, n: 10, tr: false, clue: 'en' },
    { name: 'Sound it out', k: 6, life: 3000, n: 10, tr: false, clue: 'tr' },
  ],
  par: (l, cfg) => cfg.n * 10,
  seconds: (l, cfg) => Math.ceil((cfg.n * cfg.life) / 1000) + 25,
};

/** The burst set for one clue: the target and k-1 other words, placed in random cells of the sky. */
export function bursts(target, pool, k, rnd = Math.random) {
  const others = shuffle(pool.filter((w) => w.he !== target.he && shortEn(w.en) !== shortEn(target.en)), rnd).slice(0, k - 1);
  const cells = shuffle([...Array(CELLS).keys()], rnd).slice(0, k);
  return shuffle([target, ...others], rnd).map((w, j) => ({ w, cell: cells[j], target: w === target }));
}

function setup(A) {
  const T = track(A), cfg = A.cfg, rnd = A.rnd;
  const sky = A.h('div', { class: 'g5-sky', role: 'group', 'aria-label': 'Fireworks' });
  const clue = A.h('p', { class: 'arc-prompt', 'aria-live': 'polite' });
  const after = A.h('p', { class: 'muted' });
  A.board.replaceChildren(host(A, 'ari', 'Quick, before it fades!'), sky, clue, after,
    draftNote(A, 'Words from the app\'s Yom HaAtzmaut page and its word list.'));
  numberKeys(A, () => sky);
  loadData(A.ctx, g5Data('fireworks')).then((d) => {
    if (!T.live()) return;
    const order = [];
    while (order.length < cfg.n) order.push(...shuffle(d.words, rnd));
    let q = 0;
    const ask = () => {
      if (q >= cfg.n) { T.end({ won: true }); return; }
      const target = order[q++];
      const set = bursts(target, d.words, cfg.k, rnd);
      let open = true;
      const done = (ok) => { open = false; lock(sky); after.textContent = `${target.he}: ${target.tr}, ${shortEn(target.en)}.`; T.later(ok ? 600 : 1200, ask); };
      const fade = () => {
        if (!open) return;
        if (A.paused) { T.later(300, fade); return; }
        grade(A, false, { wrong: `It faded: the word was ${target.tr}.` }); done(false);
      };
      clue.textContent = `Firework ${q} of ${cfg.n}: ${cfg.clue === 'tr' ? `the word that sounds like "${target.tr}"` : `"${shortEn(target.en)}"`}`;
      const cells = Array.from({ length: CELLS }, () => A.h('button', { type: 'button', class: 'g5-empty', disabled: true, 'aria-hidden': 'true', tabindex: '-1' }, ''));
      for (const b of set) {
        cells[b.cell] = button(A, card(A, b.w.he, cfg.tr ? b.w.tr : null), (el) => {
          if (!open) return;
          grade(A, b.target, { right: `Yes: ${b.w.tr}, ${shortEn(b.w.en)}.`, wrong: `That one is ${b.w.tr}.` });
          if (b.target) done(true); else { el.disabled = true; el.append(A.h('span', { class: 'g5-tag' }, ' ✗ not this')); }
        }, 'arc-choice');
      }
      sky.replaceChildren(...cells);
      T.later(cfg.life + Math.max(0, A.readyAt - Date.now()), fade);
    };
    ask();
  }).catch(() => A.announce('The fireworks did not load. Check the connection and press Start again.'));
}

export const mount = mountG5(spec, setup);
