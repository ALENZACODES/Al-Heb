// Final Switch: real words written with every letter in its everyday shape. Five letters (kaf, mem, nun, pe, tsadi)
// change shape at the end of a word. Tap each letter that should switch, then press Done. A letter of the five in the middle
// of a word keeps its shape, and some words need no switch at all. Later boards hold two to four words.
import { mountArcade } from './arcade.js';
import { plainSpelling, finalTargets, HAS_FINAL, shortEn, shuffle, letterClusters, toBase } from './g1-core.js';
import { host, track, grade, draftNote, ensureStyle, series, markButton, loadWords } from './g1-ui.js';

export const STORE_KEY = 'games.g1-finalswitch.v1';

const spec = {
  id: 'g1-finalswitch', title: 'Final Switch', titleHe: 'קָצֶה',
  blurb: 'Kaf, mem, nun, pe and tsadi wear a different shape at the end of a word: ך ם ן ף ץ. Here every letter is in its everyday shape. Tap each letter that should switch, then press Done. Careful: in the middle of a word they stay as they are.',
  howTo: ['Tap a letter that should take its final shape; a right one switches at once.', 'Press Done when the board is finished. If nothing needs switching, press Done straight away.', 'A wrong letter, or Done too early, costs a point.', 'Levels 3 to 5 put two, three or four words on the board.'],
  levels: [
    { name: 'One word, one switch', words: 1, mix: 0, boards: 6 },
    { name: 'Some need none', words: 1, mix: 0.35, boards: 8 },
    { name: 'Two words', words: 2, mix: 0.3, boards: 6 },
    { name: 'Three words', words: 3, mix: 0.3, boards: 6 },
    { name: 'Four words', words: 4, mix: 0.3, boards: 6 },
  ],
  par: (l, cfg) => cfg.boards * 14,
  seconds: (l, cfg) => 20 + cfg.boards * cfg.words * 12,
  needsWords: false,
};

/** Words that teach the rule: ones ending in a final form, and (mix) ones with one of the five letters only in the middle. */
export function finalPool(words) {
  const ends = words.filter((w) => finalTargets(w.he).length === 1);
  const middles = words.filter((w) => !finalTargets(w.he).length && letterClusters(w.he).some((c) => HAS_FINAL.includes(toBase(c.base))));
  return { ends, middles };
}

function setup(A) {
  ensureStyle();
  const T = track(A), cfg = A.cfg, rnd = A.rnd;
  const prompt = A.h('p', { class: 'arc-prompt' });
  const wordsEl = A.h('div', {});
  const actions = A.h('div', { class: 'row' });
  A.board.replaceChildren(host(A, 'noa', 'Five letters change coats at the end of a word.'), prompt, wordsEl, actions,
    draftNote(A, 'Words from the app\'s word list, shown with the everyday letter shapes on purpose.'));
  const show = (pool) => series(A, T, cfg.boards, (i, done) => {
    const ws = Array.from({ length: cfg.words }, () => { const p = rnd() < cfg.mix && pool.middles.length ? pool.middles : pool.ends; return p[Math.floor(rnd() * p.length)]; });
    const found = ws.map(() => new Set());
    const left = () => ws.reduce((s, w, wi) => s + finalTargets(w.he).filter((k) => !found[wi].has(k)).length, 0);
    prompt.textContent = `Board ${i} of ${cfg.boards}: tap each letter that takes a final shape, then press Done.`;
    const draw = () => wordsEl.replaceChildren(...ws.map((w, wi) => A.h('div', {},
      A.h('div', { class: 'g1-word', lang: 'he', dir: 'rtl', role: 'group', 'aria-label': `Word ${wi + 1}: ${shortEn(w.en)}` }, ...letterClusters(plainSpelling(w.he)).map((c, k) => {
        const real = letterClusters(w.he)[k], on = found[wi].has(k);
        const b = A.h('button', { type: 'button', class: on ? 'is-on' : '' }, on ? real.text : c.text);
        if (on) b.disabled = true;
        b.addEventListener('click', () => {
          if (b.disabled) return;
          if (finalTargets(w.he).includes(k)) { found[wi].add(k); grade(A, true, { right: `${c.base} at the end becomes ${real.base}.` }); draw(); }
          else grade(A, false, { wrong: HAS_FINAL.includes(toBase(c.base)) ? 'This one is not at the end, so it keeps its shape.' : 'This letter has no final shape.' });
        });
        return b;
      })),
      A.h('p', { class: 'muted' }, `“${shortEn(w.en)}”`))));
    draw();
    const check = A.h('button', { type: 'button', class: 'btn' }, 'Done');
    check.addEventListener('click', () => {
      if (check.disabled) return;
      const n = left();
      if (!n) {
        check.disabled = true; markButton(A, check, true);
        const all = ws.reduce((s, w) => s + finalTargets(w.he).length, 0);
        grade(A, true, { points: 4 + 2 * ws.length, right: all ? `Board done: ${all} letter${all > 1 ? 's' : ''} switched.` : 'Right: nothing on this board needed switching.' });
        for (const b of wordsEl.querySelectorAll('button')) b.disabled = true;
        ws.forEach((w) => A.sayWord(w)); done();
      } else grade(A, false, { wrong: `Not yet: ${n} letter${n > 1 ? 's' : ''} still need${n > 1 ? '' : 's'} a final shape.` });
    });
    actions.replaceChildren(check);
  });
  loadWords(A.ctx).then((words) => { if (T.live()) show(finalPool(shuffle(words, rnd)))(); })
    .catch(() => A.announce('The words did not load. Check the connection and press Start again.'));
}

export const mount = mountArcade(spec, setup);
