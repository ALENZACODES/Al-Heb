// Seven Species: fruit and grain roll past the basket. Keep the seven species of the Land of Israel
// (wheat, barley, grapes, figs, pomegranates, olives, dates), toss the rest. At the top levels, lay the seven out in
// the order Deuteronomy 8:8 names them, from the app's Torah text.
import { mountG5, host, track, grade, draftNote, numberKeys, roundKeys, orderBoard, card, button, lock } from './g5-ui.js';
import { loadData, loadVerse, g5Data, shuffle, deal, stripPrefix, refText } from './g5-core.js';

export const STORE_KEY = 'games.g5-harvest.v1';

const spec = {
  id: 'g5-harvest', title: 'Seven Species', titleHe: 'שִׁבְעַת הַמִּינִים',
  blurb: 'On Tu BiShvat many people eat the seven species, the foods the Torah names as the gifts of the Land of Israel. Keep them in the basket and toss everything else.',
  howTo: ['A fruit or grain comes up. Press Keep (or K) if it is one of the seven, Toss (or T) if not.', 'Every right call fills the basket; a wrong one costs a few points.', 'Levels 4 and 5: then tap the seven in the order Deuteronomy 8:8 names them.'],
  levels: [
    { name: 'Keep or toss, with English', n: 10, english: true, tr: true },
    { name: 'Hebrew and how to say it', n: 12, english: false, tr: true },
    { name: 'Hebrew only', n: 14, english: false, tr: false },
    { name: 'Harvest, then the verse order', n: 12, english: false, tr: false, order: 'name' },
    { name: 'The Torah\'s own words', n: 14, english: false, tr: false, order: 'verse' },
  ],
  par: (l, cfg) => cfg.n * 10 + (cfg.order ? 70 : 0),
  seconds: (l, cfg) => 30 + cfg.n * 6 + (cfg.order ? 45 : 0),
};

/** The name shown for a species: its word-list record, or the verse word without its leading "and". */
export const speciesName = (s) => (s.strip ? stripPrefix(s.he, s.strip) : s.he);

function setup(A) {
  const T = track(A), cfg = A.cfg, rnd = A.rnd, ctx = A.ctx;
  const item = A.h('div', { class: 'g5-big', 'aria-live': 'polite' });
  const prompt = A.h('p', { class: 'arc-prompt' });
  const area = A.h('div', { class: 'g5-row', role: 'group', 'aria-label': 'Keep or toss' });
  const basket = A.h('p', { class: 'muted', 'aria-live': 'polite' });
  A.board.replaceChildren(host(A, 'ari', 'Only the seven go in the basket.'), prompt, item, area, basket,
    draftNote(A, 'The seven species as the app\'s Tu BiShvat page lists them; the verse is Deuteronomy 8:8 from the app\'s Torah text.'));
  numberKeys(A, () => area);
  let press = null;
  roundKeys(A, (k) => { const key = String(k).toLowerCase(); if (press && (key === 'k' || key === 't')) { press(key === 'k'); return true; } return false; });
  const fail = () => A.announce('The harvest did not load. Check the connection and press Start again.');
  loadData(ctx, g5Data('sevenspecies')).then(async (d) => {
    if (!T.live()) return;
    const species = d.species.map((s) => ({ ...s, he: speciesName(s), verseHe: s.phrase?.he || s.he }));
    const cards = deal(species, d.decoys, cfg.n, 0.5, rnd);
    const got = new Set();
    let i = 0;
    const order = async () => {
      press = null;
      const v = await loadVerse(ctx, d.verse);
      if (!T.live()) return;
      prompt.textContent = `Now lay out the seven in the order of ${refText(d.verse)}.`;
      item.replaceChildren();
      basket.textContent = '';
      area.replaceChildren(orderBoard(A, species, {
        rnd, shuffleFn: shuffle, label: 'The seven species',
        render: (s, placedNow) => card(A, cfg.order === 'verse' ? s.verseHe : s.he, placedNow ? s.name : null),
        onRight: (s, k) => grade(A, true, { right: `${k}: ${s.name}.` }),
        onWrong: (s) => grade(A, false, { wrong: `Not yet: the verse names ${s.name} later.` }),
        onDone: () => { basket.textContent = `${refText(d.verse)}: ${v.en}`; A.addScore(10); T.later(1200, () => T.end({ won: true })); },
      }));
    };
    const next = () => {
      if (i >= cards.length) { if (cfg.order) order().catch(fail); else T.end({ won: true }); return; }
      const c = cards[i++];
      prompt.textContent = `${i} of ${cards.length}: one of the seven species?`;
      item.replaceChildren(card(A, c.he, cfg.english ? (c.name || c.en) : null, cfg.tr ? c.tr : null));
      press = (keep) => {
        press = null;
        const ok = keep === c.target;
        grade(A, ok, { right: c.target ? `Kept: ${c.name || c.en}.` : `Tossed: ${c.en} is not one of the seven.`, wrong: c.target ? `${c.name} is one of the seven: it belongs in the basket.` : `${c.en} is not one of the seven.` });
        if (c.target) got.add(c.id);
        basket.textContent = `In the basket: ${got.size} of 7 species.`;
        lock(area); T.later(ok ? 500 : 1100, next);
      };
      area.replaceChildren(button(A, 'Keep', () => press?.(true), 'arc-choice'), button(A, 'Toss', () => press?.(false), 'arc-choice'));
    };
    next();
  }).catch(fail);
}

export const mount = mountG5(spec, setup);
