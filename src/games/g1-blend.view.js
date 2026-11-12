// Blend It: a word arrives in pieces, one syllable card at a time. Put the sounds together in your head and pick the
// whole word. From level 3 the cards flash and hide, so you blend from memory. Words and their syllables come from
// data/games/g1/words.json (the app's word list, split by the app's own syllable rules).
import { mountArcade } from './arcade.js';
import { shortEn, shuffle } from './g1-core.js';
import { host, track, draftNote, ensureStyle, he, series, choiceButtons, numberKeys, loadWords } from './g1-ui.js';

export const STORE_KEY = 'games.g1-blend.v1';

const spec = {
  id: 'g1-blend', title: 'Blend It', titleHe: 'עִרְבֵּב',
  blurb: 'A word comes in pieces: syllable cards, right to left. Say each piece, run them together, and pick the whole word. From level 3 the cards hide after a moment, so you blend from memory.',
  howTo: ['Read the cards from right to left.', 'Tap the whole word they make, or press its number key.', 'Hidden cards? Press Show Again (it costs a point).', 'In calm mode the cards never hide.'],
  levels: [
    { name: 'Two pieces', syl: [2, 2], choices: 3, hide: 0, count: 8 },
    { name: 'Two or three pieces', syl: [2, 3], choices: 4, hide: 0, count: 8 },
    { name: 'Cards hide', syl: [2, 3], choices: 4, hide: 2600, count: 8 },
    { name: 'Three pieces, look-alike words', syl: [3, 3], choices: 4, hide: 2400, count: 8, near: true },
    { name: 'Quick blend', syl: [2, 3], choices: 5, hide: 1500, count: 10, near: true },
  ],
  par: (l, cfg) => cfg.count * 10,
  seconds: (l, cfg) => 20 + cfg.count * 10,
  needsWords: false,
};

/** Other words for the choices: same number of syllables; with near, words that share a syllable come first. */
export function blendChoices(word, words, n, near, rnd = Math.random) {
  const same = words.filter((w) => w.id !== word.id && w.syl?.length === word.syl.length && w.he !== word.he);
  const close = near ? shuffle(same.filter((w) => w.syl.some((s) => word.syl.includes(s))), rnd) : [];
  const pick = [...close, ...shuffle(same, rnd)].filter((w, i, a) => a.findIndex((x) => x.he === w.he) === i).slice(0, n - 1);
  return shuffle([word, ...pick], rnd);
}

function setup(A) {
  ensureStyle();
  const T = track(A), cfg = A.cfg, rnd = A.rnd;
  const hide = A.untimed ? 0 : cfg.hide;
  const prompt = A.h('p', { class: 'arc-prompt' });
  const cards = A.h('div', { class: 'g1-row g1-rtl', 'aria-live': 'polite' });
  const area = A.h('div', {});
  const after = A.h('p', { class: 'muted' });
  A.board.replaceChildren(host(A, 'rimon', 'Piece by piece, then all together!'), prompt, cards, area, after,
    draftNote(A, 'Syllables are split by the app\'s rules; a teacher has not checked every split.'));
  numberKeys(A, () => area.querySelector('.arc-choices'));
  const run = (words) => series(A, T, Math.min(cfg.count, words.length), (i, done) => {
    const w = words[i - 1];
    let solved = false;
    const showCards = () => {
      cards.replaceChildren(...w.syl.map((s, k) => A.h('span', { class: 'g1-card', 'aria-label': `Piece ${k + 1}: ${s}` }, he(A, s))));
      if (hide) T.later(hide, () => { if (!solved) cards.replaceChildren(...w.syl.map((_, k) => A.h('span', { class: 'g1-card', 'aria-label': `Piece ${k + 1}, hidden` }, '?'))); });
    };
    prompt.textContent = `Word ${i} of ${Math.min(cfg.count, words.length)}: ${w.syl.length} pieces. Which word do they make?`;
    after.textContent = '';
    const again = hide ? A.h('button', { type: 'button', class: 'btn secondary', onclick: () => { A.addScore(-1); showCards(); } }, 'Show Again') : null;
    area.replaceChildren(choiceButtons(A, blendChoices(w, words, cfg.choices, cfg.near, rnd), {
      render: (o) => he(A, o.he), label: 'Whole words', isRight: (o) => o.id === w.id,
      say: (o, ok) => (ok ? `Yes: ${w.he}, ${w.translit}.` : `That one is ${o.translit}.`),
      onRight: () => { solved = true; if (again) again.disabled = true; cards.replaceChildren(...w.syl.map((s) => A.h('span', { class: 'g1-card is-good' }, he(A, s)))); after.textContent = `${w.translit}: “${shortEn(w.en)}”`; A.sayWord(w); done(); },
    }), again);
    showCards();
  }, 900);
  loadWords(A.ctx).then((all) => {
    if (!T.live()) return;
    const ws = all.filter((w) => w.syl && w.syl.length >= cfg.syl[0] && w.syl.length <= cfg.syl[1]);
    run(shuffle(ws, rnd))();
  }).catch(() => A.announce('The words did not load. Check the connection and press Start again.'));
}

export const mount = mountArcade(spec, setup);
