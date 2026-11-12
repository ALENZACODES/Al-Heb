// Print and Script: handwritten (script) letters on the right, printed letters on the left. Tap a script letter, then its
// printed twin, to link them. The script shapes come from the app's letter data (data/letters/letters.json).
import { mountArcade } from './arcade.js';
import { strokeLetters, shuffle } from './g1-core.js';
import { host, track, grade, draftNote, ensureStyle, loadLetterStrokes, letterSvg, he, markButton } from './g1-ui.js';

export const STORE_KEY = 'games.g1-script.v1';

const spec = {
  id: 'g1-script', title: 'Print and Script', titleHe: 'כְּתָב',
  blurb: 'Most Hebrew handwriting uses script letters that look quite different from print. Link each script letter to its printed twin: tap one, then the other. Later boards mix in look-alikes and the final forms.',
  howTo: ['Tap a script letter (the drawn ones), then the printed letter it matches. Either order works.', 'A right link locks both cards. A wrong link costs a point.', 'Tab moves between cards; Enter or Space picks one.', 'Script letters are pictures, so this game needs sight; the screen reader names each card by its place.'],
  levels: [
    { name: 'Three links', pairs: 3, boards: 3, set: 'base' },
    { name: 'Four links', pairs: 4, boards: 3, set: 'base' },
    { name: 'Look-alikes together', pairs: 4, boards: 3, set: 'alike' },
    { name: 'Final forms', pairs: 5, boards: 3, set: 'all' },
    { name: 'Six links', pairs: 6, boards: 3, set: 'alike' },
  ],
  par: (l, cfg) => cfg.pairs * cfg.boards * 10,
  seconds: (l, cfg) => 30 + cfg.pairs * cfg.boards * 7,
  needsWords: false, needsLetters: false,
};

/** Letters for one board. 'alike' starts from a letter and pulls in its look-alikes, so twins share a board. */
export function boardLetters(letters, cfg, rnd = Math.random) {
  const pool = strokeLetters(letters, 'cursive', 1).filter((l) => cfg.set === 'all' || !/-final$/.test(l.id));
  if (cfg.set !== 'alike') return shuffle(pool, rnd).slice(0, cfg.pairs);
  const out = [];
  for (const l of shuffle(pool, rnd)) {
    if (out.length >= cfg.pairs) break;
    if (out.includes(l)) continue;
    out.push(l);
    for (const id of l.confusableWith || []) { const o = pool.find((x) => x.id === id); if (o && !out.includes(o) && out.length < cfg.pairs) out.push(o); }
  }
  return out;
}

function setup(A) {
  ensureStyle();
  const T = track(A), cfg = A.cfg, rnd = A.rnd;
  const prompt = A.h('p', { class: 'arc-prompt' });
  const area = A.h('div', {});
  A.board.replaceChildren(host(A, 'ari-side', 'Same letter, two outfits. Match them up.'), prompt, area,
    draftNote(A, 'Script shapes from the app\'s letter data; a teacher has not checked them yet. Handwriting varies from person to person.'));
  let letters = [], n = 0;
  const board = () => {
    if (!T.live()) return;
    if (n >= cfg.boards) { T.end({ won: true }); return; }
    n += 1;
    const set = boardLetters(letters, cfg, rnd);
    let picked = null, left = set.length;
    prompt.textContent = `Board ${n} of ${cfg.boards}: ${left} links to make.`;
    const card = (l, side, k) => {
      const b = A.h('button', { type: 'button', class: 'g1-card', 'data-id': l.id, 'data-side': side },
        side === 'script' ? letterSvg(l.cursive.strokes, { cls: 'g1-svg g1-mini' }) : he(A, l.he),
        side === 'script' ? A.h('span', { class: 'visually-hidden' }, `Script card ${k + 1}`) : null);
      b.addEventListener('click', () => {
        if (b.disabled) return;
        if (!picked || picked.side === side) { if (picked) picked.el.classList.remove('is-picked'); picked = { el: b, side, l }; b.classList.add('is-picked'); A.sfx('tick'); return; }
        const ok = picked.l.id === l.id;
        picked.el.classList.remove('is-picked');
        if (ok) {
          for (const x of [picked.el, b]) { x.disabled = true; markButton(A, x, true); }
          left -= 1;
          grade(A, true, { right: `${l.name}: linked. ${left} to go.` });
          prompt.textContent = `Board ${n} of ${cfg.boards}: ${left} links to make.`;
          if (!left) { A.addScore(10); T.later(700, board); }
        } else grade(A, false, { wrong: 'Those two are different letters.' });
        picked = null;
      });
      return b;
    };
    const scripts = shuffle(set, rnd), prints = shuffle(set, rnd);
    area.replaceChildren(A.h('div', { class: 'g1-cols g1-rtl' },
      A.h('div', { class: 'g1-col', role: 'group', 'aria-label': 'Script letters' }, A.h('h3', {}, 'Script'), ...scripts.map((l, k) => card(l, 'script', k))),
      A.h('div', { class: 'g1-col', role: 'group', 'aria-label': 'Printed letters' }, A.h('h3', {}, 'Print'), ...prints.map((l, k) => card(l, 'print', k)))));
  };
  A.announce('Getting the letters ready…');
  loadLetterStrokes(A.ctx).then((d) => { if (!T.live()) return; letters = d; board(); })
    .catch(() => A.announce('The letters did not load. Check the connection and press Start again.'));
}

export const mount = mountArcade(spec, setup);
