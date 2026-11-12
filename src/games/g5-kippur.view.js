// Quiet Words: the words of Yom Kippur, learned slowly. One word at a time, pick its meaning; later levels turn it round.
// Out of respect for the day this game has no clock, no lives, no buzzer and no flashing: a wrong choice simply fades.
import { mountG5, host, track, draftNote, numberKeys, card, heText, button, lock } from './g5-ui.js';
import { loadData, g5Data, shuffle, shortEn } from './g5-core.js';

export const STORE_KEY = 'games.g5-kippur.v1';

const spec = {
  id: 'g5-kippur', title: 'Quiet Words', titleHe: 'יוֹם כִּפּוּר',
  blurb: 'Yom Kippur, the Day of Atonement, is the most solemn day of the year. Learn its words at your own pace: no clock, no buzzer, nothing to lose.',
  howTo: ['Read the word and choose what it means (or press its number).', 'There is no clock. A wrong choice fades and you try again.', 'Later levels show the English and ask for the Hebrew.'],
  timed: false,
  levels: [
    { name: 'Hebrew to English, with how to say it', n: 6, k: 3, tr: true, reverse: 0 },
    { name: 'Four choices', n: 8, k: 4, tr: false, reverse: 0 },
    { name: 'English to Hebrew', n: 8, k: 4, tr: false, reverse: 1 },
    { name: 'Both ways', n: 10, k: 5, tr: false, reverse: 0.5 },
    { name: 'Every word', n: 11, k: 5, tr: false, reverse: 0.5, all: true },
  ],
  par: (l, cfg) => cfg.n * 10,
};

function setup(A) {
  const T = track(A), cfg = A.cfg, rnd = A.rnd;
  const shown = A.h('div', { class: 'g5-big' });
  const prompt = A.h('p', { class: 'arc-prompt' });
  const opts = A.h('div', { class: 'g5-grid', role: 'group', 'aria-label': 'Meanings' });
  const after = A.h('p', { class: 'muted', 'aria-live': 'polite' });
  A.board.replaceChildren(host(A, 'noa', 'Take your time with each word.'), prompt, shown, opts, after,
    draftNote(A, 'Words from the app\'s Yom Kippur page and festival word pack.'));
  numberKeys(A, () => opts);
  loadData(A.ctx, g5Data('kippur')).then((d) => {
    if (!T.live()) return;
    const words = shuffle(d.words, rnd);
    const order = cfg.all ? words : words.slice(0, cfg.n);
    while (order.length < cfg.n) order.push(...shuffle(d.words, rnd));
    let q = 0;
    const ask = () => {
      if (q >= cfg.n) { T.end({ won: true }); return; }
      const w = order[q++];
      const reverse = rnd() < cfg.reverse;
      let tries = 0;
      after.textContent = '';
      prompt.textContent = `Word ${q} of ${cfg.n}: ${reverse ? 'which Hebrew word means this?' : 'what does it mean?'}`;
      shown.replaceChildren(reverse ? A.h('span', {}, shortEn(w.en)) : heText(A, w.he, 'he'));
      const others = shuffle(d.words.filter((x) => x.he !== w.he && shortEn(x.en) !== shortEn(w.en)), rnd).slice(0, cfg.k - 1);
      opts.replaceChildren(...shuffle([w, ...others], rnd).map((x) => button(A, reverse ? card(A, x.he) : card(A, null, shortEn(x.en)), (b) => {
        tries += 1;
        if (x === w) {
          A.addScore(tries === 1 ? 10 : 4); A.sfx('confirm');
          A.announce(`${w.tr}: ${shortEn(w.en)}.`);
          after.textContent = `${w.he}, ${w.tr}: ${w.en}.`;
          lock(opts); T.later(1400, ask);
        } else {
          b.disabled = true; b.append(A.h('span', { class: 'g5-tag' }, ' (not this one)')); A.slip(); // M-03
          A.announce('Not this one. Take another look.');
        }
      })));
      if (cfg.tr && !reverse) shown.append(A.h('small', { class: 'muted' }, ` ${w.tr}`));
    };
    ask();
  }).catch(() => A.announce('The words did not load. Check the connection and press Start again.'));
}

export const mount = mountG5(spec, setup);
