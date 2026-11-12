// Blessing Match: many blessings open the same way (Baruch atah...), and the words after the opening tell you what the
// blessing is for. Link each blessing's words (left) to its moment (right). Lines are quoted from the app's prayer texts
// with the divine name shown as ה׳; the moments are the app's own titles for each text.
import { mountG5, host, track, grade, draftNote, card, heText, button } from './g5-ui.js';
import { loadData, g5Data, shuffle, pairs } from './g5-core.js';

export const STORE_KEY = 'games.g5-bless.v1';

const spec = {
  id: 'g5-bless', title: 'Blessing Match', titleHe: 'בְּרָכָה',
  blurb: 'Bread, wine, candles, the Torah, a sukkah: each blessing names its moment in the words that follow the opening. Link the words to the moment.',
  howTo: ['Tap a blessing\'s words (the Hebrew cards), then tap its moment.', 'A right link locks both cards with the same pair number.', 'A wrong link costs a few points and clears your choice.', 'Higher levels bring look-alike blessings, and at level 5 the festival Kiddush lines.'],
  levels: [
    { name: 'Three pairs', k: 3, boards: 2, formula: true },
    { name: 'Four pairs', k: 4, boards: 2, formula: true },
    { name: 'Five pairs', k: 5, boards: 2, formula: false },
    { name: 'Look-alikes', k: 6, boards: 2, formula: false, alike: true },
    { name: 'With the festival Kiddush', k: 6, boards: 2, formula: false, inserts: true },
  ],
  par: (l, cfg) => cfg.k * cfg.boards * 10,
  seconds: (l, cfg) => 30 + cfg.k * cfg.boards * 12,
};
/** Blessings that open with the same next word (בּוֹרֵא..., אֲשֶׁר...), for the look-alike level. */
export function lookAlikes(list, rnd = Math.random) {
  const groups = new Map();
  for (const b of list) { const k = b.he.split(' ')[0]; groups.set(k, [...(groups.get(k) || []), b]); }
  const big = [...groups.values()].filter((g) => g.length >= 2).flat();
  return [...shuffle(big, rnd), ...shuffle(list.filter((b) => !big.includes(b)), rnd)];
}

const KEEP_ORDER = () => 0.999; // a shuffle with this source leaves the list as it is (look-alikes first)

function setup(A) {
  const T = track(A), cfg = A.cfg, rnd = A.rnd;
  const prompt = A.h('p', { class: 'arc-prompt', 'aria-live': 'polite' });
  const formula = A.h('p', { class: 'muted' });
  const links = A.h('div', { class: 'g5-links' });
  const after = A.h('p', { class: 'muted', 'aria-live': 'polite' });
  A.board.replaceChildren(host(A, 'ari', 'What is this blessing for?'), prompt, formula, links, after,
    draftNote(A, 'Words quoted from the app\'s prayer texts; the divine name is shown as ה׳ and never said aloud. Moments are the app\'s titles for each text.'));
  loadData(A.ctx, g5Data('siddur')).then((d) => {
    if (!T.live()) return;
    if (cfg.formula) formula.replaceChildren('Each one starts: ', heText(A, d.formula.he), ' ...');
    let n = 0;
    const board = () => {
      if (n >= cfg.boards) { T.end({ won: true }); return; }
      n += 1;
      const pool = cfg.inserts ? [...d.kiddushInserts, ...d.blessings] : d.blessings;
      const set = cfg.alike ? pairs(lookAlikes(pool, rnd), cfg.k, KEEP_ORDER) : cfg.inserts ? [...shuffle(d.kiddushInserts, rnd).slice(0, 2), ...pairs(d.blessings, cfg.k - 2, rnd)] : pairs(pool, cfg.k, rnd);
      let pick = null, done = 0;
      const left = A.h('div', { role: 'group', 'aria-label': 'Blessing words' });
      const right = A.h('div', { role: 'group', 'aria-label': 'Moments' });
      const lefts = new Map();
      left.append(...shuffle(set, rnd).map((x) => {
        const b = button(A, card(A, x.he), () => {
          pick = x; for (const y of left.querySelectorAll('button')) y.setAttribute('aria-pressed', 'false');
          b.setAttribute('aria-pressed', 'true'); A.sfx('select'); A.announce('Now tap its moment.');
        }, 'arc-choice g5-word', { 'aria-pressed': 'false' });
        lefts.set(x, b); return b;
      }));
      right.append(...shuffle(set, rnd).map((x) => {
        const b = button(A, card(A, null, x.title), () => {
          if (!pick) { A.announce('Tap a blessing\'s words first.'); return; }
          const ok = pick === x || pick.title === x.title;
          grade(A, ok, { right: `Pair: ${x.title}.`, wrong: 'Those two do not go together.' });
          const lb = lefts.get(pick);
          lb.setAttribute('aria-pressed', 'false');
          if (ok) {
            done += 1;
            for (const el of [lb, b]) { el.disabled = true; el.append(A.h('span', { class: 'g5-tag' }, ` ✓ pair ${done}`)); }
            after.replaceChildren(heText(A, pick.he), ` : ${x.title}`);
            if (done === set.length) { A.addScore(10); T.later(1200, board); }
          }
          pick = null;
        }, 'arc-choice');
        return b;
      }));
      prompt.textContent = `Board ${n} of ${cfg.boards}: link each blessing to its moment.`;
      links.replaceChildren(left, right);
    };
    board();
  }).catch(() => A.announce('The blessings did not load. Check the connection and press Start again.'));
}

export const mount = mountG5(spec, setup);
