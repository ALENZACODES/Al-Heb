// The Four Questions: the youngest at the seder asks why this night is different, in four questions. Each question has
// been torn in two. Find each question's ending, put the four in order, and match seder moments to the question they answer.
// The order is the one most Ashkenazi haggadot print; Sephardi haggadot order them differently.
import { mountG5, host, track, grade, draftNote, numberKeys, orderBoard, card, heText, button, lock } from './g5-ui.js';
import { loadData, g5Data, shuffle } from './g5-core.js';

export const STORE_KEY = 'games.g5-questions.v1';

const spec = {
  id: 'g5-questions', title: 'The Four Questions', titleHe: 'הַגָּדָה',
  blurb: 'Why is this night different from all other nights? Four questions answer it. They have been torn in half: mend them, put them in order, and match what happens at the seder to each one.',
  howTo: ['Mend: read the start of a question and tap its ending.', 'Order: tap the four questions in the order they are asked.', 'Clues: a moment of the seder appears; tap the question it answers.', 'Number keys pick a card.'],
  levels: [
    { name: 'Mend the questions', parts: ['mend'] },
    { name: 'Put them in order', parts: ['order'] },
    { name: 'Mend, then order', parts: ['mend', 'order'] },
    { name: 'Seder clues', parts: ['clues'] },
    { name: 'All three', parts: ['mend', 'order', 'clues'] },
  ],
  par: (l, cfg) => cfg.parts.length * 40 + (cfg.parts.includes('clues') ? 40 : 0),
  seconds: (l, cfg) => 30 + cfg.parts.length * 50,
};

function setup(A) {
  const T = track(A), cfg = A.cfg, rnd = A.rnd;
  const opening = A.h('p', { class: 'g5-big' });
  const prompt = A.h('p', { class: 'arc-prompt', 'aria-live': 'polite' });
  const area = A.h('div');
  const after = A.h('p', { class: 'muted', 'aria-live': 'polite' });
  A.board.replaceChildren(host(A, 'rimon', 'Why is this night different?'), opening, prompt, area, after,
    draftNote(A, 'English wording written for this game. The Hebrew line and the order await a teacher\'s check; Sephardi haggadot ask the dipping question first.'));
  numberKeys(A, () => area.querySelector('.g5-grid, .tg-tray'));
  loadData(A.ctx, g5Data('seder')).then((d) => {
    if (!T.live()) return;
    const Q = d.questions;
    opening.replaceChildren(heText(A, Q.opening.he), A.h('small', { class: 'muted' }, ` ${Q.opening.tr}: ${Q.opening.en}`));
    const parts = [...cfg.parts];
    const nextPart = () => {
      const part = parts.shift();
      if (!part) { T.end({ won: true }); return; }
      ({ mend, order, clues })[part]();
    };
    const mend = () => {
      const todo = shuffle(Q.items, rnd);
      let i = 0;
      const one = () => {
        if (i >= todo.length) { nextPart(); return; }
        const q = todo[i++];
        prompt.textContent = `Mend ${i} of ${todo.length}: "${q.other}..." How does it end?`;
        const grid = A.h('div', { class: 'g5-grid', role: 'group', 'aria-label': 'Endings' }, ...shuffle(Q.items, rnd).map((x) => button(A, card(A, null, x.tonight), (b) => {
          const ok = x === q;
          grade(A, ok, { right: `${q.other}; ${q.tonight}.`, wrong: 'That ending belongs to another question.' });
          if (ok) { after.textContent = `${q.other}; ${q.tonight}.`; lock(grid); T.later(900, one); } else { b.disabled = true; b.append(A.h('span', { class: 'g5-tag' }, ' ✗ another question')); }
        })));
        area.replaceChildren(grid);
      };
      one();
    };
    const order = () => {
      prompt.textContent = 'Tap the four questions in the order they are asked.';
      area.replaceChildren(orderBoard(A, Q.items, {
        rnd, shuffleFn: shuffle, label: 'The four questions',
        render: (q, placed) => card(A, null, placed ? `${q.other}; ${q.tonight}.` : `...${q.tonight}`),
        onRight: (q, k) => grade(A, true, { right: `${k}: ${q.tonight}.` }),
        onWrong: (q) => grade(A, false, { wrong: `"${q.tonight}" is asked later.` }),
        onDone: () => { A.addScore(10); after.textContent = 'All four, in order.'; T.later(1000, nextPart); },
      }));
    };
    const clues = () => {
      const list = shuffle(Q.clues, rnd);
      let i = 0;
      const one = () => {
        if (i >= list.length) { nextPart(); return; }
        const c = list[i++];
        prompt.textContent = `Clue ${i} of ${list.length}: ${c.en}. Which question does it answer?`;
        const grid = A.h('div', { class: 'g5-grid', role: 'group', 'aria-label': 'Questions' }, ...Q.items.map((x) => button(A, card(A, x.key?.he || null, x.tonight), (b) => {
          const ok = x.id === c.q;
          grade(A, ok, { right: `Yes: ${x.tonight}.`, wrong: 'Not that question.' });
          if (ok) { lock(grid); T.later(800, one); } else { b.disabled = true; b.append(A.h('span', { class: 'g5-tag' }, ' ✗ not this one')); }
        })));
        area.replaceChildren(grid);
      };
      one();
    };
    nextPart();
  }).catch(() => A.announce('The questions did not load. Check the connection and press Start again.'));
}

export const mount = mountG5(spec, setup);
