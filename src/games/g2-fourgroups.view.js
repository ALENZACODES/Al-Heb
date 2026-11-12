// Four Groups of Four: sixteen words from four topics, all mixed up. Pick four that belong together and check them.
// Four mistakes and the round is over. Higher levels put look-alike topics side by side.
import { mountArcade } from './arcade.js';
import { pickGroups, shuffle } from './g2-core.js';
import { start, host, grade, draftNote, word, topicName, say } from './g2-ui.js';

export const STORE_KEY = 'games.g2-fourgroups.v1';

const spec = {
  id: 'g2-fourgroups', title: 'Four Groups of Four', titleHe: 'אַרְבָּעָה',
  blurb: 'All the words on the table belong to a few topics. Find the groups: pick the words that go together and check them.',
  howTo: ['Tap words to pick them (tap again to put one back).', 'When you have a full group, press Check.', '"One away" means all but one of your picks share a topic.', 'Each wrong check costs a heart. Higher levels mix look-alike topics.'],
  levels: [
    { name: 'Three groups of three, with English', groups: 3, size: 3, en: true, tr: true, lives: 4 },
    { name: 'Three groups of four', groups: 3, size: 4, en: false, tr: true, lives: 4 },
    { name: 'Four groups of four', groups: 4, size: 4, en: false, tr: false, lives: 4 },
    { name: 'Look-alike topics', groups: 4, size: 4, en: false, tr: true, lives: 4, close: true },
    { name: 'Look-alikes, three hearts', groups: 4, size: 4, en: false, tr: false, lives: 3, close: true },
  ],
  par: (l, cfg) => cfg.groups * 10,
  seconds: () => 180,
  needsWords: false, needsLetters: false,
};

/** The verdict on a pick: 'right' (a whole group), 'one-away' or 'wrong'. */
export function judgePick(picked, size) {
  const count = new Map();
  for (const w of picked) count.set(w.topic, (count.get(w.topic) || 0) + 1);
  const most = Math.max(0, ...count.values());
  return most === size ? 'right' : most === size - 1 ? 'one-away' : 'wrong';
}

function setup(A) {
  const cfg = A.cfg, rnd = A.rnd;
  const prompt = A.h('p', { class: 'arc-prompt' });
  const solved = A.h('div', { 'aria-live': 'polite' });
  const grid = A.h('div', { class: 'g2-grid', role: 'group', 'aria-label': 'Words', style: `grid-template-columns:repeat(${cfg.size},auto)` });
  const check = A.h('button', { type: 'button', class: 'btn' }, 'Check');
  const clear = A.h('button', { type: 'button', class: 'btn secondary' }, 'Clear');
  const after = A.h('p', { class: 'muted', 'aria-live': 'polite' });
  A.board.replaceChildren(host(A, 'ari', 'Which words belong together?'), prompt, solved, grid, A.h('div', { class: 'g2-row' }, check, clear), after,
    draftNote(A, 'Words and topics come from the app\'s word lists. A native reader has not checked them yet.'));
  start(A, (D, T) => {
    A.setLives(cfg.lives);
    const groups = pickGroups(D, cfg.groups, cfg.size, rnd, cfg.close);
    let left = shuffle(groups.flatMap((g) => g.words), rnd), picked = [];
    const done = [];
    const draw = () => {
      prompt.textContent = `Pick ${cfg.size} words that share a topic. ${done.length} of ${groups.length} groups found.`;
      grid.replaceChildren(...left.map((w) => {
        const on = picked.includes(w);
        const b = A.h('button', { type: 'button', class: 'arc-choice' + (on ? ' is-on' : ''), 'aria-pressed': on }, word(A, w, { en: cfg.en, tr: cfg.tr }));
        b.addEventListener('click', () => {
          if (!T.live()) return;
          if (on) picked = picked.filter((x) => x !== w);
          else if (picked.length < cfg.size) picked.push(w);
          else { A.announce(`You already have ${cfg.size}. Check them, or tap one to put it back.`); return; }
          draw();
        });
        return b;
      }));
      check.disabled = picked.length !== cfg.size;
      clear.disabled = !picked.length;
    };
    clear.addEventListener('click', () => { picked = []; draw(); });
    check.addEventListener('click', () => {
      if (picked.length !== cfg.size || !T.live()) return;
      const v = judgePick(picked, cfg.size);
      if (v === 'right') {
        const topic = picked[0].topic;
        grade(A, true, { right: `A group: ${D.topics[topic].title}.` });
        done.push(topic); say(A, picked[0]);
        solved.append(A.h('div', { class: 'g2-solved' }, topicName(A, D, topic), ' ', picked.map((w) => `${w.he} (${w.en})`).join(' · ')));
        left = left.filter((w) => !picked.includes(w)); picked = [];
        if (done.length === groups.length) { draw(); T.later(800, () => T.end({ won: true })); return; }
      } else {
        grade(A, false, { wrong: v === 'one-away' ? 'One away!' : 'Not a group.' });
        if (!T.live()) return;
      }
      draw();
    });
    draw();
  });
}

export const mount = mountArcade(spec, setup);
