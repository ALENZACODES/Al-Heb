// Holiday Sorter: words of the Jewish year (the app's calendar day pages) sorted into their holidays, then the
// holidays lined up in the order they come, from Rosh Hashanah to Tisha B'Av.
import { mountArcade } from './arcade.js';
import { loadData, shuffle } from './tg-core.js';
import { host, track, grade, draftNote, ensureStyle, orderBoard, numberKeys } from './tg-ui.js';

export const STORE_KEY = 'games.tg-holidays.v1';
const CARDS = 12;

const spec = {
  id: 'tg-holidays', title: 'Holiday Sorter', titleHe: 'חַגִּים',
  blurb: 'Shofar, lulav, matzah, dreidel: every holiday has its own words. Sort each word into its holiday, first with the English, then from the Hebrew alone. At the top level, put the holidays in the order they come through the Jewish year.',
  howTo: ['A word appears; tap its holiday (or press its number).', 'Level 1: two holidays. Level 2: three. Level 3: four.', 'Level 4: four holidays, Hebrew words only (the meaning shows after).', 'Level 5: tap the holidays in the order of the year, starting at Rosh Hashanah.'],
  levels: [
    { name: 'Two holidays', bins: 2, english: true, fixed: ['pesach', 'hanukkah'] },
    { name: 'Three holidays', bins: 3, english: true, fixed: ['rosh-hashanah', 'sukkot', 'purim'] },
    { name: 'Four holidays', bins: 4, english: true },
    { name: 'Four holidays, Hebrew only', bins: 4, english: false },
    { name: 'Through the year', mode: 'year', count: 8 },
  ],
  par: (l, cfg) => (cfg.mode === 'year' ? cfg.count * 10 + 10 : CARDS * 10),
  seconds: (l, cfg) => (cfg.mode === 'year' ? 90 : 150),
  needsWords: false, needsLetters: false,
};

/** Words that belong to exactly one of the given days: [{ he, en, tr, day }]. */
export function uniqueWords(days, ids) {
  const count = new Map();
  for (const id of ids) for (const w of days[id]?.words || []) count.set(w.he, (count.get(w.he) || 0) + 1);
  return ids.flatMap((id) => (days[id]?.words || []).filter((w) => count.get(w.he) === 1).map((w) => ({ ...w, day: id })));
}
const shortEn = (s) => String(s).replace(/\s*\(.*$/, '');

function setup(A) {
  ensureStyle();
  const T = track(A), cfg = A.cfg, rnd = A.rnd;
  const big = A.h('div', { class: 'arc-big', lang: 'he', dir: 'rtl' });
  const prompt = A.h('p', { class: 'arc-prompt' });
  const area = A.h('div');
  const after = A.h('p', { class: 'muted', 'aria-live': 'polite' });
  A.board.replaceChildren(host(A, 'rimon', 'Which holiday does this belong to?'), big, prompt, area, after,
    draftNote(A, 'Words and names from the app\'s calendar day pages. Customs vary between communities; your own community\'s practice comes first.'));
  numberKeys(A, () => area.querySelector('.tg-bins, .tg-tray'));
  let days = {}, plan = null, n = 0;
  const label = (id) => A.h('span', {}, A.h('span', { lang: 'he', dir: 'rtl', class: 'he' }, days[id].he), A.h('small', {}, shortEn(days[id].en)));
  const sort = (ids) => {
    const cards = shuffle(uniqueWords(days, ids), rnd).slice(0, CARDS);
    const bins = A.h('div', { class: 'tg-bins', role: 'group', 'aria-label': 'Holidays' });
    const ask = () => {
      if (n >= cards.length) { T.end({ won: true }); return; }
      const w = cards[n]; n += 1;
      big.textContent = w.he;
      prompt.textContent = `Word ${n} of ${cards.length}` + (cfg.english ? `: "${w.en}"` : '') + '. Which holiday?';
      bins.replaceChildren(...ids.map((id) => A.h('button', { type: 'button', class: 'arc-bin arc-choice', onclick: (e) => {
        const ok = id === w.day;
        grade(A, ok, { right: `${w.he} (${w.tr}): ${shortEn(days[w.day].en)}.`, wrong: `${w.he} is not a ${shortEn(days[id].en)} word.` });
        if (ok) { after.textContent = `${w.he}, ${w.tr}: ${w.en}.`; for (const b of bins.querySelectorAll('button')) b.disabled = true; T.later(900, ask); }
        else e?.currentTarget?.classList?.add('is-bad');
      } }, label(id))));
    };
    area.replaceChildren(bins);
    ask();
  };
  const year = () => {
    const keep = shuffle(plan.year, rnd).slice(0, cfg.count);
    const items = plan.year.filter((x) => keep.includes(x)).filter((x) => days[x.id]);
    big.textContent = ''; prompt.textContent = 'Tap the holidays in the order they come in the Jewish year, starting at Rosh Hashanah in the autumn.';
    area.replaceChildren(orderBoard(A, items, {
      rnd, shuffleFn: shuffle, label: 'Holidays to order',
      render: (x, placed) => A.h('span', {}, label(x.id), placed ? A.h('small', {}, x.date) : null),
      onRight: (x, k) => grade(A, true, { right: `${k}: ${shortEn(days[x.id].en)}, ${x.date}.` }),
      onWrong: (x) => grade(A, false, { wrong: `${shortEn(days[x.id].en)} comes later in the year.` }),
      onDone: () => { A.addScore(10); T.end({ won: true }); },
    }));
  };
  Promise.all([loadData(A.ctx, 'data/calendar/days.json'), loadData(A.ctx, 'data/games/tg/holidays.json')]).then(([d, h]) => {
    if (!T.live()) return;
    days = d.days || {}; plan = h;
    if (cfg.mode === 'year') { year(); return; }
    const ids = cfg.fixed || shuffle(h.sort.filter((id) => days[id]), rnd).slice(0, cfg.bins);
    sort(ids);
  }).catch(() => A.announce('The holidays did not load. Check the connection and press Start again.'));
}

export const mount = mountArcade(spec, setup);
