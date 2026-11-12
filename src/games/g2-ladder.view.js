// Word Ladder: climb from the top word to the bottom word, changing exactly one letter at each rung. Every rung is a
// real word with its own meaning. Pick the next rung from the choices; only one of them changes a single letter.
// Letters count as written (the vowel points can change too); final forms count as their plain letter.
import { mountArcade } from './arcade.js';
import { ladderDistractors, changedAt, letterClusters, shuffle } from './g2-core.js';
import { start, host, grade, numberKeys, draftNote, word, say, he } from './g2-ui.js';

export const STORE_KEY = 'games.g2-ladder.v1';

const spec = {
  id: 'g2-ladder', title: 'Word Ladder', titleHe: 'מַדְרֵגָה',
  blurb: 'From salt to winter, one letter at a time: each step down the ladder changes a single letter and makes a new word.',
  howTo: ['The top word and the goal word are shown.', 'Pick the next rung: the word that changes exactly one letter of the last rung.', 'A wrong rung is a miss. The changed letter is underlined when you get it right.', 'Higher levels hide the English and add closer look-alikes.'],
  levels: [
    { name: 'Short ladders, with English', options: 3, en: true, tr: true, ladders: 3, maxLen: 5 },
    { name: 'Longer ladders', options: 3, en: false, tr: true, ladders: 3, maxLen: 6 },
    { name: 'Hebrew only', options: 4, en: false, tr: false, ladders: 3, maxLen: 6 },
    { name: 'Close look-alikes', options: 4, en: false, tr: true, ladders: 3, maxLen: 6, close: true },
    { name: 'The longest ladders', options: 5, en: false, tr: false, ladders: 2, maxLen: 7, close: true, long: true },
  ],
  par: (l, cfg) => cfg.ladders * (cfg.long ? 60 : 45),
  seconds: () => 200,
  needsWords: false, needsLetters: false,
};

/** A rung with the changed letter underlined (b). */
function rung(A, w, at) {
  if (at < 0) return he(A, w.he);
  const cl = letterClusters(w.he);
  return A.h('span', { lang: 'he', dir: 'rtl', class: 'he' }, ...cl.map((c, i) => (i === at ? A.h('b', {}, c.text) : c.text)));
}

function setup(A) {
  const cfg = A.cfg, rnd = A.rnd;
  const prompt = A.h('p', { class: 'arc-prompt' });
  const rungs = A.h('ol', { class: 'g2-rungs', 'aria-label': 'The ladder so far' });
  const area = A.h('div', { class: 'g2-row', role: 'group', 'aria-label': 'Next rung' });
  const after = A.h('p', { class: 'muted', 'aria-live': 'polite' });
  A.board.replaceChildren(host(A, 'ari', 'One letter at a time.'), prompt, rungs, area, after,
    draftNote(A, 'Ladder words are dictionary entries from the app\'s word lists; some are less common. A native reader has not checked them yet.'));
  numberKeys(A, () => area);
  start(A, (D, T) => {
    const all = [...(D.sets.ladders?.['3'] || []), ...(D.sets.ladders?.['4'] || [])];
    const words = all.flat();
    const pool = all.filter((l) => l.length <= cfg.maxLen);
    const plan = shuffle(cfg.long ? pool.filter((l) => l.length >= 6) : pool, rnd).slice(0, cfg.ladders);
    let li = 0, ladder = null, at = 0;
    const draw = () => {
      rungs.replaceChildren(...ladder.slice(0, at + 1).map((w, i) => A.h('li', {}, rung(A, w, i ? changedAt(ladder[i - 1].he, w.he) : -1), cfg.en || i === at ? A.h('small', { class: 'g2-en' }, ` ${w.en}`) : null)),
        at < ladder.length - 1 ? A.h('li', { class: 'is-target' }, A.h('small', {}, 'Goal: '), word(A, ladder[ladder.length - 1], { en: true })) : null);
    };
    const step = () => {
      const cur = ladder[at], nxt = ladder[at + 1];
      prompt.textContent = `Ladder ${li} of ${plan.length}, step ${at + 1} of ${ladder.length - 1}: which word changes one letter of ${cur.he}?`;
      const opts = shuffle([nxt, ...ladderDistractors(words, ladder, cur, cfg.options - 1, rnd, cfg.close)], rnd);
      area.replaceChildren(...opts.map((w) => {
        const b = A.h('button', { type: 'button', class: 'arc-choice' }, word(A, w, { en: cfg.en, tr: cfg.tr }));
        b.addEventListener('click', () => {
          if (b.disabled) return;
          const ok = w === nxt;
          grade(A, ok, { right: `${cur.he} → ${nxt.he} (${nxt.en}).`, wrong: `${w.he} changes more than one letter of ${cur.he}.` });
          if (!ok) { b.classList.add('is-bad'); b.disabled = true; return; }
          at += 1; say(A, nxt); draw();
          after.textContent = `${nxt.he}${nxt.tr ? ` (${nxt.tr})` : ''} = ${nxt.en}`;
          if (at >= ladder.length - 1) { A.addScore(10); for (const x of area.querySelectorAll('button')) x.disabled = true; T.later(900, climb); }
          else step();
        });
        return b;
      }));
    };
    const climb = () => {
      if (li >= plan.length) { T.end({ won: true }); return; }
      ladder = plan[li]; li += 1; at = 0;
      draw(); step();
    };
    climb();
  });
}

export const mount = mountArcade(spec, setup);
