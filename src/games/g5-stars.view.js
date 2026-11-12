// Sundown to Stars: Shabbat from the Friday candles to Havdalah on Saturday night, in blessings. First sort each blessing
// into Friday evening or Saturday night, then put each evening's blessings in order, and at the top level the whole
// day from sundown to stars. Every line is quoted from the app's prayer texts, with the divine name shown as ה׳.
import { mountG5, host, track, grade, draftNote, numberKeys, card, heText, button, lock } from './g5-ui.js';
import { loadData, g5Data, shuffle } from './g5-core.js';

export const STORE_KEY = 'games.g5-stars.v1';

const spec = {
  id: 'g5-stars', title: 'Sundown to Stars', titleHe: 'הַבְדָּלָה',
  blurb: 'Shabbat opens on Friday evening with candles, Kiddush and bread, and closes on Saturday night with Havdalah: wine, spices and a braided flame. Sort the blessings and put them in order.',
  howTo: ['Sort: a blessing appears; tap Friday evening or Saturday night.', 'Order: tap the blessings in the order they are said (or press their numbers).', 'A wrong tap costs a few points; the card stays.', 'Level 5: the whole of Shabbat in one line, Hebrew only.'],
  levels: [
    { name: 'Friday or Saturday night?', parts: ['sort'], english: true },
    { name: 'Friday evening, in order', parts: ['evening'], english: true },
    { name: 'Havdalah, in order', parts: ['havdalah'], english: true },
    { name: 'Both evenings, in order', parts: ['evening', 'havdalah'], english: false, after: true },
    { name: 'Sundown to stars, Hebrew only', parts: ['all'], english: false, after: true },
  ],
  par: (l, cfg) => ({ sort: 90, evening: 70, havdalah: 60, all: 120 })[cfg.parts[0]] + (cfg.parts[1] ? 60 : 0),
  seconds: (l, cfg) => 40 + cfg.parts.length * 60,
};

/** Accept a tap when its Hebrew matches the next line (the wine blessing is said on both evenings). */
export const fitsNext = (line, next, card) => !!line[next] && line[next].he === card.he;

function setup(A) {
  const T = track(A), cfg = A.cfg, rnd = A.rnd;
  const prompt = A.h('p', { class: 'arc-prompt', 'aria-live': 'polite' });
  const line = A.h('ol', { class: 'tg-line', 'aria-label': 'Your order so far' });
  const area = A.h('div', { class: 'g5-grid', role: 'group', 'aria-label': 'Blessings' });
  const after = A.h('p', { class: 'muted', 'aria-live': 'polite' });
  A.board.replaceChildren(host(A, 'noa', 'From the candles to the braided flame.'), prompt, line, area, after,
    draftNote(A, 'Orders as the app\'s service guide gives them. Kabbalat Shabbat (with Lecha Dodi) is sung in the synagogue between candles and Kiddush.'));
  numberKeys(A, () => area);
  loadData(A.ctx, g5Data('prayers')).then((d) => {
    if (!T.live()) return;
    const parts = [...cfg.parts];
    const show = (c, placed) => card(A, c.he, cfg.english || placed ? c.label : null, placed && cfg.after ? c.when : null);
    const nextPart = () => {
      const p = parts.shift();
      if (!p) { T.end({ won: true }); return; }
      line.replaceChildren();
      if (p === 'sort') sort(); else order(p === 'all' ? [...d.evening, ...d.havdalah] : d[p], p);
    };
    const sort = () => {
      const cards = shuffle([...d.evening, ...d.havdalah].filter((c) => c.id !== 'kiddush-wine-1'), rnd);
      let i = 0;
      const one = () => {
        if (i >= cards.length) { nextPart(); return; }
        const c = cards[i++];
        prompt.replaceChildren(`${i} of ${cards.length}: when is this said? `, heText(A, c.he));
        area.replaceChildren(...['Friday evening', 'Saturday night'].map((when) => button(A, when, (b) => {
          const ok = c.when === when;
          grade(A, ok, { right: `${c.label}: ${c.when}.`, wrong: `Not then: ${c.label} is said on ${c.when}.` });
          if (ok) { after.textContent = `${c.label}: ${c.when}.`; lock(area); T.later(700, one); } else { b.disabled = true; b.append(A.h('span', { class: 'g5-tag' }, ' ✗')); }
        }, 'arc-choice')));
      };
      one();
    };
    const order = (items, p) => {
      let next = 0;
      const loose = shuffle(items, rnd);
      prompt.textContent = p === 'all' ? 'From Friday sundown to the stars on Saturday night: tap the blessings in order.' : `${p === 'evening' ? 'Friday evening' : 'Havdalah on Saturday night'}: tap the blessings in order.`;
      const draw = () => area.replaceChildren(...loose.map((c) => button(A, show(c, false), () => {
        const ok = fitsNext(items, next, c);
        grade(A, ok, { right: `${next + 1}: ${items[next].label}.`, wrong: 'Not yet: that one comes later.' });
        if (!ok) return;
        loose.splice(loose.indexOf(c), 1);
        line.append(A.h('li', {}, show(items[next], true)));
        next += 1;
        if (next === items.length) { A.addScore(10); after.textContent = items.map((x) => x.label).join(' → '); lock(area); T.later(1300, nextPart); return; }
        draw();
      })));
      draw();
    };
    nextPart();
  }).catch(() => A.announce('The blessings did not load. Check the connection and press Start again.'));
}

export const mount = mountG5(spec, setup);
