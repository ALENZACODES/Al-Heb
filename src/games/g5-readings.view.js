// Holiday Readings: the Torah is open at a verse from a holiday's reading. Which holiday is it read on? The verse is
// quoted from the app's Torah text (divine name as ה׳); the readings are the ones the app's calendar pages name.
// Level 4 turns it around: the holiday is given and you pick its verse.
import { mountG5, host, track, grade, draftNote, numberKeys, card, heText, button, lock } from './g5-ui.js';
import { loadData, loadVerse, excerpt, tokens, refText, g5Data, shuffle, shortEn } from './g5-core.js';

export const STORE_KEY = 'games.g5-readings.v1';
const WORDS = 8;

const spec = {
  id: 'g5-readings', title: 'Holiday Readings', titleHe: 'תּוֹרָה',
  blurb: 'Every holiday has its own Torah reading: the binding of Isaac on Rosh Hashanah, the Ten Commandments on Shavuot. Read the verse and name the holiday.',
  howTo: ['Read the verse on the reading table.', 'Tap the holiday it is read on (or press its number).', 'Level 4 turns it around: pick the verse for the holiday.', 'Level 5 mixes both, with more choices.'],
  levels: [
    { name: 'With the English', n: 6, k: 3, english: true, reverse: 0 },
    { name: 'Four holidays', n: 7, k: 4, english: true, reverse: 0 },
    { name: 'Hebrew only', n: 8, k: 4, english: false, reverse: 0 },
    { name: 'Which verse?', n: 8, k: 4, english: false, reverse: 1 },
    { name: 'Both ways, five choices', n: 9, k: 5, english: false, reverse: 0.5 },
  ],
  par: (l, cfg) => cfg.n * 10,
  seconds: (l, cfg) => 30 + cfg.n * 18,
};

/** The opening words shown for a verse (the whole verse when it is short). */
export const opening = (he) => excerpt(he, 0, Math.min(WORDS, tokens(he).length));

function setup(A) {
  const T = track(A), cfg = A.cfg, rnd = A.rnd, ctx = A.ctx;
  const desk = A.h('div', { class: 'card g5-card', 'aria-live': 'polite' });
  const prompt = A.h('p', { class: 'arc-prompt' });
  const opts = A.h('div', { class: 'g5-grid', role: 'group', 'aria-label': 'Choices' });
  const after = A.h('p', { class: 'muted', 'aria-live': 'polite' });
  A.board.replaceChildren(host(A, 'ari', 'Which day is this read on?'), desk, prompt, opts, after,
    draftNote(A, 'Readings as the app\'s calendar pages give them (Reform practice where communities differ). Verses from the app\'s Torah text.'));
  numberKeys(A, () => opts);
  loadData(ctx, g5Data('readings')).then(async (d) => {
    if (!T.live()) return;
    const verses = await Promise.all(d.items.map((x) => loadVerse(ctx, x.ref)));
    if (!T.live()) return;
    const items = d.items.map((x, i) => ({ ...x, v: verses[i], he: opening(verses[i].he) }));
    const order = [];
    while (order.length < cfg.n) order.push(...shuffle(items, rnd));
    let q = 0;
    const done = (it) => { after.textContent = `${shortEn(it.name.en)}: ${it.reading}. ${refText(it.ref)}: ${it.v.en}`; lock(opts); T.later(1300, ask); };
    const ask = () => {
      if (q >= cfg.n) { T.end({ won: true }); return; }
      const it = order[q++];
      const reverse = rnd() < cfg.reverse;
      const others = shuffle(items.filter((x) => x !== it), rnd).slice(0, cfg.k - 1);
      const set = shuffle([it, ...others], rnd);
      after.textContent = '';
      if (!reverse) {
        desk.replaceChildren(heText(A, it.he, 'he g5-he'), A.h('small', { class: 'muted' }, cfg.english ? `${refText(it.ref)}: ${it.v.en}` : refText(it.ref)));
        prompt.textContent = `Verse ${q} of ${cfg.n}: which holiday is it read on?`;
        opts.replaceChildren(...set.map((x) => button(A, card(A, x.name.he, shortEn(x.name.en)), (b) => {
          const ok = x === it;
          grade(A, ok, { right: `Yes: ${shortEn(it.name.en)}.`, wrong: `Not ${shortEn(x.name.en)}.` });
          if (ok) done(it); else { b.disabled = true; b.append(A.h('span', { class: 'g5-tag' }, ' ✗ another day')); }
        })));
      } else {
        desk.replaceChildren(heText(A, it.name.he, 'he g5-he'), A.h('small', {}, shortEn(it.name.en)));
        prompt.textContent = `Holiday ${q} of ${cfg.n}: which verse is from its reading?`;
        opts.replaceChildren(...set.map((x) => button(A, card(A, x.he, refText(x.ref)), (b) => {
          const ok = x === it;
          grade(A, ok, { right: `Yes: ${refText(it.ref)}.`, wrong: `${refText(x.ref)} is read on ${shortEn(x.name.en)}.` });
          if (ok) done(it); else { b.disabled = true; b.append(A.h('span', { class: 'g5-tag' }, ' ✗ another day')); }
        })));
      }
    };
    ask();
  }).catch(() => A.announce('The scroll did not load. Check the connection and press Start again.'));
}

export const mount = mountG5(spec, setup);
