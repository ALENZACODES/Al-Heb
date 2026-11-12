// Sort Rush: one word at a time, each with a short fuse. Drop it in its topic before the fuse burns out.
// More topics and shorter fuses as the levels climb; level 5 puts look-alike topics side by side (food and home, clothes and body).
import { mountArcade } from './arcade.js';
import { pickTopics, deck } from './g2-core.js';
import { start, host, grade, numberKeys, draftNote, word, topicName, say } from './g2-ui.js';

export const STORE_KEY = 'games.g2-sortrush.v1';
const CARDS = 14;

const spec = {
  id: 'g2-sortrush', title: 'Sort Rush', titleHe: 'מָהִיר',
  blurb: 'Words arrive one by one. Drop each into its topic before its fuse burns out: food, animals, clothes, the body and more.',
  howTo: ['A word appears with a fuse under it.', 'Tap its topic, or press the topic\'s number.', 'If the fuse burns out, the word counts as a miss.', 'Higher levels add topics, hide the English and shorten the fuse.'],
  levels: [
    { name: 'Two topics, with English', bins: 2, en: true, tr: true, fuse: 7 },
    { name: 'Three topics', bins: 3, en: true, tr: true, fuse: 6 },
    { name: 'Three topics, Hebrew only', bins: 3, en: false, tr: true, fuse: 5 },
    { name: 'Four topics', bins: 4, en: false, tr: false, fuse: 4.5 },
    { name: 'Look-alike topics', bins: 4, en: false, tr: false, fuse: 3.5, close: true },
  ],
  par: () => CARDS * 10,
  seconds: () => 120,
  needsWords: false, needsLetters: false,
};

function setup(A) {
  const cfg = A.cfg, rnd = A.rnd;
  const big = A.h('div', { class: 'g2-big' });
  const bar = A.h('span', { style: 'inline-size:100%' });
  const fuse = A.h('div', { class: 'g2-fuse', role: 'img', 'aria-label': 'Fuse' }, bar);
  const prompt = A.h('p', { class: 'arc-prompt' });
  const bins = A.h('div', { class: 'tg-bins', role: 'group', 'aria-label': 'Topics' });
  const after = A.h('p', { class: 'muted', 'aria-live': 'polite' });
  A.board.replaceChildren(host(A, 'rimon', 'Quick! Which topic does this word belong to?'), big, fuse, prompt, bins, after,
    draftNote(A, 'Words and topics come from the app\'s word lists. A native reader has not checked them yet.'));
  numberKeys(A, () => bins);
  start(A, (D, T) => {
    const ids = pickTopics(D, cfg.bins, rnd, cfg.close);
    const cards = deck(D, ids, CARDS, rnd);
    let n = 0, left = 0, cur = null, busy = false;
    const ask = () => {
      if (n >= cards.length) { T.end({ won: true }); return; }
      cur = cards[n]; n += 1; busy = false; left = cfg.fuse * 10;
      big.replaceChildren(word(A, cur, { en: cfg.en, tr: cfg.tr }));
      prompt.textContent = `Word ${n} of ${cards.length}. Which topic?`;
      bar.setAttribute('style', 'inline-size:100%');
      for (const b of bins.querySelectorAll('button')) { b.disabled = false; b.classList.remove('is-bad'); }
    };
    const answer = (id, b) => {
      if (busy || !cur) return;
      const ok = id === cur.topic;
      grade(A, ok, { right: `${cur.he}: ${cur.en}. ${D.topics[cur.topic].title}.`, wrong: `${cur.he} is not in ${D.topics[id].title}.` });
      if (!ok) { b?.classList.add('is-bad'); if (b) b.disabled = true; return; }
      busy = true; say(A, cur);
      after.textContent = `${cur.he}${cur.tr ? ` (${cur.tr})` : ''} means "${cur.en}".`;
      T.later(500, ask);
    };
    bins.replaceChildren(...ids.map((id) => {
      const b = A.h('button', { type: 'button', class: 'arc-bin arc-choice' }, topicName(A, D, id));
      b.addEventListener('click', () => answer(id, b));
      return b;
    }));
    // the fuse: holds still during the get-ready count and while paused (the arcade loop does that); off in calm mode
    if (!A.untimed) A.loop(() => {
      if (busy || !cur || !T.live()) return;
      left -= 1;
      bar.setAttribute('style', `inline-size:${Math.max(0, (left / (cfg.fuse * 10)) * 100)}%`);
      if (left <= 0) {
        busy = true;
        grade(A, false, { wrong: `Too slow: ${cur.he} (${cur.en}) goes in ${D.topics[cur.topic].title}.` });
        if (T.live()) T.later(700, ask);
      }
    }, 100);
    ask();
  });
}

export const mount = mountArcade(spec, setup);
