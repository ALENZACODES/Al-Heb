// Count to Shavuot: the Torah counts seven full weeks from Pesach to Shavuot (Leviticus 23:15-16, from the app's
// Torah text). A day of the count appears; set the beads to how many whole weeks and days it is, then press Count.
// Level 4 turns it round, and level 5 mixes both with the Torah's words.
import { mountG5, host, track, grade, draftNote, numberKeys, heText, button, lock } from './g5-ui.js';
import { loadData, loadVerse, excerpt, refText, g5Data, shuffle, weeksDays, dayOf, countLine } from './g5-core.js';

export const STORE_KEY = 'games.g5-omer.v1';

const spec = {
  id: 'g5-omer', title: 'Count to Shavuot', titleHe: 'שָׁבוּעוֹת',
  blurb: 'From Pesach to Shavuot the days are counted, forty-nine of them: seven weeks of seven days. Turn each day into weeks and days, and back again.',
  howTo: ['Read the day of the count.', 'Use the + and − buttons to set whole weeks and extra days, then press Count.', 'Seven days make a week: day 9 is one week and two days.', 'Level 4: pick the day number for the weeks and days shown.'],
  levels: [
    { name: 'Days 1 to 13', max: 13, n: 6, mode: 'split' },
    { name: 'Up to day 27', max: 27, n: 7, mode: 'split' },
    { name: 'All forty-nine', max: 49, n: 8, mode: 'split' },
    { name: 'Turn it round', max: 49, n: 8, mode: 'join' },
    { name: 'Seven weeks, with the Torah\'s words', max: 49, n: 10, mode: 'mix', verse: true },
  ],
  par: (l, cfg) => cfg.n * 10,
  seconds: (l, cfg) => 30 + cfg.n * 15,
};

/** n different days of the count, from 1 to max, with at least one whole-week day when max allows. */
export function countDays(max, n, rnd = Math.random) {
  const days = shuffle(Array.from({ length: max }, (_, i) => i + 1), rnd).slice(0, n);
  if (max >= 7 && !days.some((x) => x % 7 === 0)) days[0] = 7 * (1 + Math.floor(rnd() * Math.floor(max / 7)));
  return [...new Set(days)];
}

function setup(A) {
  const T = track(A), cfg = A.cfg, rnd = A.rnd, ctx = A.ctx;
  const prompt = A.h('p', { class: 'arc-prompt', 'aria-live': 'polite' });
  const area = A.h('div');
  const after = A.h('p', { class: 'muted', 'aria-live': 'polite' });
  const torah = A.h('p', { class: 'muted' });
  A.board.replaceChildren(host(A, 'ari', 'Seven days make a week.'), prompt, area, after, torah,
    draftNote(A, 'The game counts days only. When and how to count is for your community.'));
  numberKeys(A, () => area.querySelector('.g5-grid'));
  loadData(ctx, g5Data('omer')).then(async (d) => {
    if (!T.live()) return;
    const week = d.words.find((w) => w.src.id === 'h92151b55');
    if (cfg.verse) {
      const vs = await Promise.all(d.verses.map((x) => loadVerse(ctx, x.ref)));
      if (!T.live()) return;
      torah.replaceChildren(...d.verses.flatMap((x, k) => [heText(A, excerpt(vs[k].he, x.from, x.to)), ` (${refText(x.ref)}): ${x.en}. `]));
    }
    const days = countDays(cfg.max, cfg.n, rnd);
    let q = 0;
    const ask = () => {
      if (q >= days.length) { T.end({ won: true }); return; }
      const n = days[q++];
      const mode = cfg.mode === 'mix' ? (rnd() < 0.5 ? 'split' : 'join') : cfg.mode;
      const want = weeksDays(n);
      if (mode === 'split') {
        prompt.textContent = `${q} of ${days.length}: day ${n} of the count. How many weeks and days?`;
        const val = { weeks: 0, days: 0 };
        const shows = { weeks: A.h('span', { class: 'g5-count' }, '0'), days: A.h('span', { class: 'g5-count' }, '0') };
        const step = (k, by, top) => () => { val[k] = Math.max(0, Math.min(top, val[k] + by)); shows[k].textContent = String(val[k]); A.sfx('click'); };
        const stepper = (k, label, top) => A.h('div', { class: 'g5-step', role: 'group', 'aria-label': label },
          A.h('span', {}, label + ': '), button(A, '−', step(k, -1, top), 'btn secondary', { 'aria-label': `One fewer ${k === 'weeks' ? 'week' : 'day'}` }), shows[k],
          button(A, '+', step(k, 1, top), 'btn secondary', { 'aria-label': `One more ${k === 'weeks' ? 'week' : 'day'}` }));
        const box = A.h('div', { class: 'g5-row' }, stepper('weeks', `Weeks (${week.he})`, 7), stepper('days', 'Days', 6), button(A, 'Count', () => {
          const ok = dayOf(val.weeks, val.days) === n && val.days < 7;
          grade(A, ok, { right: `Yes: ${countLine(n)}.`, wrong: `${val.weeks} weeks and ${val.days} days is day ${dayOf(val.weeks, val.days)}, not day ${n}.` });
          if (ok) { after.textContent = countLine(n) + '.'; lock(box); T.later(900, ask); }
        }, 'btn'));
        area.replaceChildren(box);
      } else {
        prompt.textContent = `${q} of ${days.length}: ${want.weeks} week${want.weeks === 1 ? '' : 's'} and ${want.days} day${want.days === 1 ? '' : 's'}. Which day of the count is it?`;
        const opts = shuffle([...new Set([n, n + 1, n - 1, n + 7, n - 7, want.weeks + want.days * 7].filter((x) => x >= 1 && x <= 49))], rnd).slice(0, 4);
        if (!opts.includes(n)) opts[0] = n;
        const grid = A.h('div', { class: 'g5-grid', role: 'group', 'aria-label': 'Days' }, ...shuffle(opts, rnd).map((x) => button(A, `Day ${x}`, (b) => {
          const ok = x === n;
          grade(A, ok, { right: `Yes: ${countLine(n)}.`, wrong: `Day ${x} is ${countLine(x).replace(/^\d+ days?, which is /, '')}.` });
          if (ok) { after.textContent = countLine(n) + '.'; lock(grid); T.later(900, ask); } else { b.disabled = true; b.append(A.h('span', { class: 'g5-tag' }, ' ✗')); }
        }, 'arc-choice')));
        area.replaceChildren(grid);
      }
    };
    ask();
  }).catch(() => A.announce('The count did not load. Check the connection and press Start again.'));
}

export const mount = mountG5(spec, setup);
