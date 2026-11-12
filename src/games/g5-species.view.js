// Four Species: walk the garden and gather the four plants of Sukkot (Leviticus 23:40): etrog, lulav, myrtle and willow.
// The clue starts as the English name, then the Hebrew name, and at the top levels it is the Torah's own words for the
// plant, quoted from the app's Torah text. Other plants in the garden are decoys.
import { mountG5, host, track, grade, draftNote, numberKeys, card, heText, button, lock } from './g5-ui.js';
import { loadData, loadVerse, excerpt, refText, g5Data, shuffle, shortEn } from './g5-core.js';

export const STORE_KEY = 'games.g5-species.v1';

const spec = {
  id: 'g5-species', title: 'Four Species', titleHe: 'לוּלָב',
  blurb: 'On Sukkot the Torah asks for four plants, held together and waved: the etrog, the lulav, the myrtle and the willow. Find each one in the garden.',
  howTo: ['Read the clue and tap the plant it names (or press its number).', 'Gather all four to make a bundle.', 'Levels 4 and 5: the clue is the Torah\'s words from Leviticus 23:40.'],
  levels: [
    { name: 'English names', bundles: 2, clue: 'en', show: 'both', decoys: 2 },
    { name: 'How to say them', bundles: 2, clue: 'en', show: 'tr', decoys: 3 },
    { name: 'Hebrew names', bundles: 2, clue: 'he', show: 'en', decoys: 4 },
    { name: 'The Torah\'s words', bundles: 2, clue: 'verse', show: 'both', decoys: 4 },
    { name: 'The Torah\'s words, Hebrew only', bundles: 3, clue: 'verse', show: 'he', decoys: 5 },
  ],
  par: (l, cfg) => cfg.bundles * 40,
  seconds: (l, cfg) => 30 + cfg.bundles * 40,
};

function setup(A) {
  const T = track(A), cfg = A.cfg, rnd = A.rnd, ctx = A.ctx;
  const clue = A.h('div', { class: 'g5-big', 'aria-live': 'polite' });
  const prompt = A.h('p', { class: 'arc-prompt' });
  const garden = A.h('div', { class: 'g5-grid', role: 'group', 'aria-label': 'The garden' });
  const bundle = A.h('p', { 'aria-live': 'polite' });
  const after = A.h('p', { class: 'muted' });
  A.board.replaceChildren(host(A, 'noa', 'Four plants for the bundle.'), prompt, clue, garden, bundle, after,
    draftNote(A, 'Which words mean which plant is the traditional reading of Leviticus 23:40. Names from the app\'s Sukkot page and word lists.'));
  numberKeys(A, () => garden);
  loadData(ctx, g5Data('species')).then(async (d) => {
    if (!T.live()) return;
    const v = await loadVerse(ctx, d.species[0].phrase.ref);
    if (!T.live()) return;
    const quote = (s) => excerpt(v.he, s.phrase.from, s.phrase.to);
    let b = 0;
    const round = () => {
      if (b >= cfg.bundles) { T.end({ won: true }); return; }
      b += 1;
      const want = shuffle(d.species, rnd), got = [];
      const plants = shuffle([...d.species, ...shuffle(d.decoys, rnd).slice(0, cfg.decoys)], rnd);
      const label = (p) => card(A, cfg.show === 'en' ? null : p.he, cfg.show === 'both' || cfg.show === 'en' ? (p.name || shortEn(p.en)) : null, cfg.show === 'tr' ? p.tr : null);
      const ask = () => {
        bundle.textContent = got.length ? `Bundle ${b} of ${cfg.bundles}: ${got.map((s) => s.name).join(', ')}.` : `Bundle ${b} of ${cfg.bundles}: empty.`;
        if (got.length === want.length) { A.addScore(10); after.replaceChildren(heText(A, excerpt(v.he, Math.min(...d.species.map((x) => x.phrase.from)), Math.max(...d.species.map((x) => x.phrase.to)))), ` (${refText(d.species[0].phrase.ref)})`); T.later(1300, round); return; }
        const s = want[got.length];
        prompt.textContent = `Plant ${got.length + 1} of 4: find ${cfg.clue === 'en' ? 'this one' : 'the plant for these words'}.`;
        clue.replaceChildren(cfg.clue === 'en' ? A.h('span', {}, s.name) : cfg.clue === 'he' ? heText(A, s.he) : heText(A, quote(s)));
        if (cfg.clue === 'verse' && cfg.show !== 'he') clue.append(A.h('small', { class: 'muted' }, ` "${s.phrase.en}"`));
        garden.replaceChildren(...plants.filter((p) => !got.includes(p)).map((p) => button(A, label(p), (btn) => {
          const ok = p === s;
          grade(A, ok, { right: `Yes: ${s.name}.`, wrong: `That is ${p.name || shortEn(p.en)}.` });
          if (ok) { got.push(s); lock(garden); T.later(600, ask); } else { btn.disabled = true; btn.append(A.h('span', { class: 'g5-tag' }, ' ✗ not this one')); }
        })));
      };
      ask();
    };
    round();
  }).catch(() => A.announce('The garden did not load. Check the connection and press Start again.'));
}

export const mount = mountG5(spec, setup);
