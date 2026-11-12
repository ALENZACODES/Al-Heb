// Sweet Year Table: Rosh Hashanah foods (simanim) and the wish each one carries. A wish is read out; tap the food on the table.
// The early levels show the English; later ones only the Hebrew, then foods of other holidays join the table as decoys.
import { mountG5, host, track, grade, draftNote, numberKeys, card, heText, mark, button, lock } from './g5-ui.js';
import { loadData, loadVerse, g5Data, shuffle, excerpt, refText } from './g5-core.js';

export const STORE_KEY = 'games.g5-simanim.v1';

const spec = {
  id: 'g5-simanim', title: 'Sweet Year Table', titleHe: 'שָׁנָה טוֹבָה',
  blurb: 'On Rosh Hashanah many families eat foods that carry a wish for the new year, starting with apples dipped in honey. Read the wish, then tap the food that carries it.',
  howTo: ['Read the wish at the top.', 'Tap the food on the table that carries it (or press its number).', 'A wrong tap costs a few points; the right food then shows its wish.', 'Higher levels hide the English, then add foods from other holidays.'],
  levels: [
    { name: 'Foods with English', n: 6, english: true, tr: true, decoys: 0 },
    { name: 'Hebrew and how to say it', n: 6, english: false, tr: true, decoys: 0 },
    { name: 'Hebrew only', n: 7, english: false, tr: false, decoys: 0 },
    { name: 'Other holidays at the table', n: 8, english: false, tr: false, decoys: 2 },
    { name: 'With the Torah\'s words', n: 8, english: false, tr: false, decoys: 4, verse: true },
  ],
  par: (l, cfg) => cfg.n * 10,
  seconds: (l, cfg) => 40 + cfg.n * 10,
};

function setup(A) {
  const T = track(A), cfg = A.cfg, rnd = A.rnd, ctx = A.ctx;
  const wish = A.h('p', { class: 'arc-prompt' });
  const quote = A.h('p', { class: 'g5-big' });
  const table = A.h('div', { class: 'g5-grid', role: 'group', 'aria-label': 'Foods on the table' });
  const after = A.h('p', { class: 'muted', 'aria-live': 'polite' });
  A.board.replaceChildren(host(A, 'noa', 'Which food carries this wish?'), wish, quote, table, after,
    draftNote(A, 'Apples in honey and the round challah are on the app\'s Rosh Hashanah page; the other foods are widely kept customs, and families differ.'));
  numberKeys(A, () => table);
  const fail = () => A.announce('The table did not load. Check the connection and press Start again.');
  loadData(ctx, g5Data('simanim')).then(async (d) => {
    if (!T.live()) return;
    const head = d.foods.find((f) => f.verse);
    const v = cfg.verse && head ? await loadVerse(ctx, head.verse.ref) : null;
    if (!T.live()) return;
    const onTable = shuffle([...d.foods, ...shuffle(d.decoys, rnd).slice(0, cfg.decoys)], rnd);
    const asks = [];
    while (asks.length < cfg.n) asks.push(...shuffle(d.foods, rnd));
    let i = 0;
    const ask = () => {
      if (i >= cfg.n) { T.end({ won: true }); return; }
      const want = asks[i++];
      wish.textContent = `Wish ${i} of ${cfg.n}: ${want.wish}.`;
      quote.replaceChildren();
      if (v && want === head) {
        quote.append(heText(A, excerpt(v.he, head.verse.from, head.verse.to)), A.h('small', { class: 'muted' }, ` (${refText(head.verse.ref)})`));
        wish.textContent = `Wish ${i} of ${cfg.n}: the Torah's words below.`;
      }
      table.replaceChildren(...onTable.map((f) => button(A, card(A, f.he, cfg.english ? f.en : null, cfg.tr ? f.tr : null), (b) => {
        const ok = f === want;
        grade(A, ok, { right: `Yes: ${f.tr}. ${want.wish}.`, wrong: `${f.tr} is not the one for this wish.` });
        mark(b, ok);
        if (ok) { after.textContent = `${f.tr}: ${f.en}. It carries the wish: ${f.wish}.`; lock(table); T.later(900, ask); }
      })));
    };
    ask();
  }).catch(fail);
}

export const mount = mountG5(spec, setup);
