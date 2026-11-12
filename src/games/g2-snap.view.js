// Topic Snap: cards land in pairs (threes at level 4). Snap when two of them share a topic, let the rest go by.
// The cards change on their own after a few seconds; a pair that goes by without a snap is a miss.
import { mountArcade } from './arcade.js';
import { pickTopics, shuffle } from './g2-core.js';
import { start, host, grade, roundKeys, draftNote, word, say } from './g2-ui.js';

export const STORE_KEY = 'games.g2-snap.v1';
const DEALS = 16;

const spec = {
  id: 'g2-snap', title: 'Topic Snap', titleHe: 'יַחַד',
  blurb: 'Two cards land on the table. Same topic? Snap! Different topics? Let them go. The cards keep coming, faster as you climb.',
  howTo: ['Press Snap (or the space bar) when the cards share a topic.', 'Press Not a pair (or N) when they do not, or let the cards change by themselves.', 'A wrong snap is a miss, and so is a pair that goes by.', 'Level 4 deals three cards: snap if any two match.'],
  levels: [
    { name: 'With English', cards: 2, secs: 6, en: true, tr: true },
    { name: 'Transliteration', cards: 2, secs: 5, en: false, tr: true },
    { name: 'Hebrew only', cards: 2, secs: 4, en: false, tr: false },
    { name: 'Three cards', cards: 3, secs: 5, en: false, tr: false },
    { name: 'Look-alike topics', cards: 2, secs: 3.5, en: false, tr: false, close: true },
  ],
  par: () => DEALS * 10,
  seconds: () => 120,
  needsWords: false, needsLetters: false,
};

/** One deal of cards; about half the deals hold a pair from the same topic. */
export function deal(D, ids, cards, rnd = Math.random) {
  const pair = rnd() < 0.5;
  const t = shuffle(ids, rnd);
  const tops = pair ? [t[0], t[0], ...t.slice(1, cards - 1)] : t.slice(0, cards);
  const used = new Set();
  const out = tops.map((id) => { const w = shuffle(D.items(id), rnd).find((x) => !used.has(x.he)); used.add(w.he); return w; });
  return shuffle(out, rnd);
}
export const hasPair = (ws) => new Set(ws.map((w) => w.topic)).size < ws.length;

function setup(A) {
  const cfg = A.cfg, rnd = A.rnd;
  const prompt = A.h('p', { class: 'arc-prompt' });
  const table = A.h('div', { class: 'g2-row', role: 'group', 'aria-label': 'Cards on the table', 'aria-live': 'polite' });
  const snapBtn = A.h('button', { type: 'button', class: 'btn' }, 'Snap!');
  const passBtn = A.h('button', { type: 'button', class: 'btn secondary' }, 'Not a pair');
  const after = A.h('p', { class: 'muted', 'aria-live': 'polite' });
  A.board.replaceChildren(host(A, 'ari', 'Same topic? Snap!'), prompt, table, A.h('div', { class: 'g2-row' }, snapBtn, passBtn), after,
    draftNote(A, 'Words and topics come from the app\'s word lists. A native reader has not checked them yet.'));
  start(A, (D, T) => {
    const ids = pickTopics(D, cfg.close ? 3 : 5, rnd, cfg.close);
    let n = 0, cur = null, left = 0, busy = false;
    const show = () => {
      if (n >= DEALS) { T.end({ won: true }); return; }
      n += 1; busy = false; left = cfg.secs * 10;
      cur = deal(D, ids, cfg.cards, rnd);
      prompt.textContent = `Deal ${n} of ${DEALS}.`;
      table.replaceChildren(...cur.map((w) => A.h('div', { class: 'arc-choice g2-card' }, word(A, w, { en: cfg.en, tr: cfg.tr }))));
    };
    const explain = () => cur.map((w) => `${w.he} = ${w.en} (${D.topics[w.topic].title})`).join(' · ');
    const judge = (snapped) => {
      if (busy || !cur || !T.live()) return;
      busy = true;
      const pair = hasPair(cur);
      if (snapped === null) { if (pair) grade(A, false, { wrong: `That was a pair. ${explain()}` }); else A.announce('Gone by.'); }
      else grade(A, snapped === pair, { right: pair ? 'Snap! Same topic.' : 'Right, no pair.', wrong: pair ? 'That was a pair.' : 'No pair there.' });
      if (snapped === true && pair) say(A, cur[0]);
      after.textContent = explain();
      T.later(600, show);
    };
    snapBtn.addEventListener('click', () => judge(true));
    passBtn.addEventListener('click', () => judge(false));
    roundKeys(A, (k) => { if (k === 'space') { judge(true); return true; } if (k === 'n' || k === 'N') { judge(false); return true; } return false; });
    if (!A.untimed) A.loop(() => { if (!busy && cur && T.live() && --left <= 0) judge(null); }, 100);
    show();
  });
}

export const mount = mountArcade(spec, setup);
