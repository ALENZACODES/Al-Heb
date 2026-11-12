// Pop-Up Pantry: words pop out of the cupboard doors for a moment. Tap only the ones in the target topic.
// The board keeps a few words showing at a time; a tapped or expired word makes room for a new one somewhere else.
import { mountArcade } from './arcade.js';
import { pickTopics, shuffle } from './g2-core.js';
import { start, host, grade, draftNote, word, topicName, say } from './g2-ui.js';

export const STORE_KEY = 'games.g2-popup.v1';
const GOAL = 12;

const spec = {
  id: 'g2-popup', title: 'Pop-Up Pantry', titleHe: 'אֹכֶל',
  blurb: 'Words pop out of the pantry doors and duck back in. Tap only the words of the target topic before they hide.',
  howTo: ['The target topic is at the top.', 'Tap a word that belongs to it; a word from another topic is a miss.', 'Words hide again after a moment; there is no penalty for letting one go.', `Catch ${GOAL} to finish. At level 5 the target topic changes as you go.`],
  levels: [
    { name: 'Food, with English', target: 'food', size: 3, live: 3, ttl: 16, en: true, tr: true },
    { name: 'Animals', target: 'animals', size: 3, live: 3, ttl: 14, en: false, tr: true },
    { name: 'Any topic', size: 3, live: 4, ttl: 12, en: false, tr: false },
    { name: 'Bigger pantry', size: 4, live: 5, ttl: 10, en: false, tr: false },
    { name: 'Look-alikes, switching', size: 4, live: 5, ttl: 9, en: false, tr: false, close: true, switchEvery: 4 },
  ],
  par: () => GOAL * 10,
  seconds: () => 75,
  needsWords: false, needsLetters: false,
};

/** Pick the next word to show: about half of them from the target topic. */
export function popWord(D, target, others, rnd) {
  const from = rnd() < 0.5 ? target : others[Math.floor(rnd() * others.length)];
  const list = D.items(from);
  return list[Math.floor(rnd() * list.length)];
}

function setup(A) {
  const cfg = A.cfg, rnd = A.rnd;
  const head = A.h('p', { class: 'arc-prompt' });
  const grid = A.h('div', { class: 'g2-grid', role: 'group', 'aria-label': 'Pantry doors', style: `grid-template-columns:repeat(${cfg.size},auto)` });
  const after = A.h('p', { class: 'muted', 'aria-live': 'polite' });
  A.board.replaceChildren(host(A, 'rimon', 'Only the words of the target topic!'), head, grid, after,
    draftNote(A, 'Words and topics come from the app\'s word lists. A native reader has not checked them yet.'));
  start(A, (D, T) => {
    const ids = cfg.close ? pickTopics(D, 3, rnd, true) : cfg.target ? [cfg.target, ...pickTopics(D, 4, rnd).filter((x) => x !== cfg.target)].slice(0, 4) : pickTopics(D, 4, rnd);
    let target = ids[0], hits = 0;
    const others = () => ids.filter((x) => x !== target);
    const holes = Array.from({ length: cfg.size * cfg.size }, () => ({ w: null, age: 0 }));
    const buttons = holes.map((hole, i) => {
      const b = A.h('button', { type: 'button', class: 'arc-choice' });
      b.disabled = true;
      b.addEventListener('click', () => tap(i));
      return b;
    });
    grid.replaceChildren(...buttons);
    const showHead = () => head.replaceChildren(`Catch: `, topicName(A, D, target), ` · ${hits} of ${GOAL}`);
    const draw = (i) => {
      const b = buttons[i], w = holes[i].w;
      b.disabled = !w;
      b.replaceChildren(w ? word(A, w, { en: cfg.en, tr: cfg.tr }) : A.h('span', {}, A.h('span', { 'aria-hidden': 'true' }, '·'), A.h('span', { class: 'visually-hidden' }, 'Closed door')));
    };
    const spawn = () => {
      const free = shuffle(holes.map((h, i) => (h.w ? -1 : i)).filter((i) => i >= 0), rnd);
      const shown = new Set(holes.filter((h) => h.w).map((h) => h.w.he));
      for (const i of free) {
        if (holes.filter((h) => h.w).length >= cfg.live) break;
        let w = popWord(D, target, others(), rnd);
        for (let k = 0; k < 5 && shown.has(w.he); k++) w = popWord(D, target, others(), rnd);
        holes[i] = { w, age: 0 }; shown.add(w.he); draw(i);
      }
    };
    const clear = (i) => { holes[i] = { w: null, age: 0 }; draw(i); };
    const tap = (i) => {
      const w = holes[i].w;
      if (!w || !T.live()) return;
      const ok = w.topic === target;
      grade(A, ok, { right: `${w.he}: ${w.en}.`, wrong: `${w.he} (${w.en}) is not in ${D.topics[target].title}.` });
      clear(i);
      if (ok) {
        hits += 1; say(A, w);
        after.textContent = `${w.he}${w.tr ? ` (${w.tr})` : ''} = ${w.en}`;
        if (hits >= GOAL) { T.end({ won: true }); return; }
        if (cfg.switchEvery && hits % cfg.switchEvery === 0) {
          target = others()[Math.floor(rnd() * others().length)];
          A.announce(`New target: ${D.topics[target].title}.`);
        }
      }
      showHead(); spawn();
    };
    showHead(); spawn();
    // words hide again after a while (the arcade loop holds still during the count-in and while paused)
    A.loop(() => {
      if (!T.live()) return;
      holes.forEach((h, i) => { if (h.w && ++h.age >= cfg.ttl) clear(i); });
      spawn();
    }, 250);
  });
}

export const mount = mountArcade(spec, setup);
