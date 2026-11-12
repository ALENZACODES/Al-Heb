// Family Tree: pick a family word from the basket, then tap the branch where it hangs. You sit in the middle of the tree.
// Early levels label the branches in English; later ones describe them as riddles ("your father's brother") and add words
// that do not belong on this tree.
import { mountArcade } from './arcade.js';
import { shuffle } from './g2-core.js';
import { start, host, grade, numberKeys, draftNote, word, say } from './g2-ui.js';

export const STORE_KEY = 'games.g2-familytree.v1';
const ALL = ['סַבָּא', 'סָבְתָא', 'דּוֹד', 'אַבָּא', 'אִמָּא', 'דּוֹדָה', 'אָח', 'אָחוֹת', 'בֵּן', 'בַּת', 'נֶכֶד'];
const DECOYS = ['חָתָן', 'כַּלָּה', 'חָבֵר'];

const spec = {
  id: 'g2-familytree', title: 'Family Tree', titleHe: 'עֵץ',
  blurb: 'Build a family tree around yourself: grandparents at the top, then parents, aunts and uncles, brothers and sisters, children and a grandchild.',
  howTo: ['Tap a word in the basket (or press its number), then tap the branch where it belongs.', 'A word on the wrong branch is a miss and goes back to the basket.', 'Levels 1 to 3 label the branches; levels 4 and 5 describe them as riddles.', 'At level 5 some words in the basket do not belong on the tree at all.'],
  levels: [
    { name: 'Parents and siblings', slots: ['אַבָּא', 'אִמָּא', 'אָח', 'אָחוֹת'], en: true, tr: true, riddle: false },
    { name: 'Add the grandparents', slots: ['סַבָּא', 'סָבְתָא', 'אַבָּא', 'אִמָּא', 'אָח', 'אָחוֹת'], en: false, tr: true, riddle: false },
    { name: 'Children too', slots: ['סַבָּא', 'סָבְתָא', 'אַבָּא', 'אִמָּא', 'אָח', 'אָחוֹת', 'בֵּן', 'בַּת', 'דּוֹד'], en: false, tr: false, riddle: false },
    { name: 'Riddles', slots: ALL, en: false, tr: true, riddle: true },
    { name: 'Riddles and strangers', slots: ALL, en: false, tr: false, riddle: true, decoys: 2 },
  ],
  par: (l, cfg) => cfg.slots.length * 10,
  seconds: () => 150,
  needsWords: false, needsLetters: false,
};

function setup(A) {
  const cfg = A.cfg, rnd = A.rnd;
  const prompt = A.h('p', { class: 'arc-prompt' });
  const tree = A.h('div', { class: 'g2-tree', role: 'group', 'aria-label': 'Family tree' });
  const basket = A.h('div', { class: 'g2-row', role: 'group', 'aria-label': 'Basket of words' });
  const after = A.h('p', { class: 'muted', 'aria-live': 'polite' });
  A.board.replaceChildren(host(A, 'ari', 'Who goes where on your family tree?'), prompt, tree, A.h('h3', {}, 'Basket'), basket, after,
    draftNote(A, 'Words come from the app\'s word lists; a native reader has not checked them yet. Families come in every shape; this tree is just one.'));
  numberKeys(A, () => basket);
  start(A, (D, T) => {
    const slots = (D.sets.family || []).filter((s) => cfg.slots.includes(s.he));
    const words = shuffle([...slots.map((s) => D.word(s.he)), ...shuffle(DECOYS, rnd).slice(0, cfg.decoys || 0).map((he) => D.word(he))].filter(Boolean), rnd);
    const placed = new Set();
    let picked = null;
    const drawBasket = () => basket.replaceChildren(...words.filter((w) => !placed.has(w.he)).map((w) => {
      const b = A.h('button', { type: 'button', class: 'arc-choice g2-chip' + (picked === w ? ' is-on' : ''), 'aria-pressed': picked === w }, word(A, w, { en: cfg.en, tr: cfg.tr }));
      b.addEventListener('click', () => { picked = picked === w ? null : w; drawBasket(); prompt.textContent = picked ? `Now tap the branch for ${picked.he}.` : 'Pick a word from the basket.'; });
      return b;
    }));
    const cellFor = (s) => {
      const done = placed.has(s.he);
      const text = done ? word(A, D.word(s.he), { en: true }) : A.h('span', {}, cfg.riddle ? s.rel : `Your ${s.label}`);
      const b = A.h('button', { type: 'button', class: 'arc-choice' + (done ? ' is-path' : ''), style: `grid-row:${s.row + 1};grid-column:${s.col + 1}` }, text);
      if (done) b.disabled = true;
      b.addEventListener('click', () => {
        if (b.disabled) return;
        if (!picked) { A.announce('Pick a word from the basket first.'); return; }
        const ok = picked.he === s.he;
        grade(A, ok, { right: `${picked.he} (${picked.en}) is ${cfg.riddle ? s.rel : `your ${s.label}`}.`, wrong: `${picked.he} means "${picked.en}"; it does not go there.` });
        if (ok) { placed.add(s.he); say(A, picked); after.textContent = `${picked.he}${picked.tr ? ` (${picked.tr})` : ''} = ${picked.en}`; }
        picked = null;
        drawTree(); drawBasket();
        if (placed.size === slots.length) { prompt.textContent = 'The tree is complete.'; T.later(700, () => T.end({ won: true })); }
        else prompt.textContent = 'Pick the next word from the basket.';
      });
      return b;
    };
    const drawTree = () => tree.replaceChildren(...slots.map(cellFor), A.h('div', { class: 'g2-you', style: 'grid-row:3;grid-column:2 / span 2' }, 'You'));
    prompt.textContent = 'Pick a word from the basket.';
    drawTree(); drawBasket();
  });
}

export const mount = mountArcade(spec, setup);
