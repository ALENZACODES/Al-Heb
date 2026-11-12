// Holiday Greetings: the calendar flips to a day of the Jewish year and a neighbour waves. Pick the greeting that fits
// the day. From level 4 it turns around: the neighbour greets you in Hebrew and you name the day.
import { mountG5, host, track, grade, draftNote, numberKeys, card, heText, button, lock } from './g5-ui.js';
import { loadData, g5Data, shuffle, shortEn } from './g5-core.js';

export const STORE_KEY = 'games.g5-greet.v1';

const spec = {
  id: 'g5-greet', title: 'Holiday Greetings', titleHe: 'חַג שָׂמֵחַ',
  blurb: 'Shabbat shalom on Friday, shanah tovah at the new year: every day has its greeting. The calendar flips to a day; greet your neighbour the right way.',
  howTo: ['Read the calendar page: the day and when it falls.', 'Tap the greeting that fits (or press its number).', 'Levels 4 and 5 turn it around: you hear a greeting and pick the day.'],
  levels: [
    { name: 'Three greetings, with English', n: 6, k: 3, english: true, tr: true, reverse: 0 },
    { name: 'Four greetings, how to say them', n: 7, k: 4, english: false, tr: true, reverse: 0 },
    { name: 'Hebrew only', n: 8, k: 4, english: false, tr: false, reverse: 0 },
    { name: 'Which day is it?', n: 8, k: 4, english: false, tr: false, reverse: 1 },
    { name: 'Both ways', n: 10, k: 5, english: false, tr: false, reverse: 0.5 },
  ],
  par: (l, cfg) => cfg.n * 10,
  seconds: (l, cfg) => 30 + cfg.n * 12,
};

/** Greeting options for a scene: the right one and k-1 different greetings. */
export function greetingOptions(scene, scenes, k, rnd = Math.random) {
  const seen = new Set([scene.greet.he]);
  const out = [scene.greet];
  for (const s of shuffle(scenes, rnd)) { if (out.length >= k) break; if (!seen.has(s.greet.he)) { seen.add(s.greet.he); out.push(s.greet); } }
  return shuffle(out, rnd);
}
/** Day options for a greeting: the scene plus k-1 days that do not share its greeting. */
export function dayOptions(scene, scenes, k, rnd = Math.random) {
  return shuffle([scene, ...shuffle(scenes.filter((s) => s.greet.he !== scene.greet.he), rnd).slice(0, k - 1)], rnd);
}

function setup(A) {
  const T = track(A), cfg = A.cfg, rnd = A.rnd;
  const page = A.h('div', { class: 'card g5-card', 'aria-live': 'polite' });
  const prompt = A.h('p', { class: 'arc-prompt' });
  const opts = A.h('div', { class: 'g5-grid', role: 'group', 'aria-label': 'Choices' });
  const after = A.h('p', { class: 'muted', 'aria-live': 'polite' });
  A.board.replaceChildren(host(A, 'ari', 'Your neighbour is waving!'), page, prompt, opts, after,
    draftNote(A, 'Greetings from the app\'s calendar pages, phrasebook and lessons. Dates are the usual Hebrew dates.'));
  numberKeys(A, () => opts);
  loadData(A.ctx, g5Data('greetings')).then((d) => {
    if (!T.live()) return;
    const order = [];
    while (order.length < cfg.n) order.push(...shuffle(d.scenes, rnd));
    let q = 0;
    const ask = () => {
      if (q >= cfg.n) { T.end({ won: true }); return; }
      const s = order[q++];
      const reverse = rnd() < cfg.reverse;
      after.textContent = '';
      const finish = (b) => { after.textContent = `${s.name.en}: ${s.greet.he} (${s.greet.tr}), ${shortEn(s.greet.en)}.`; lock(opts); T.later(1000, ask); };
      if (!reverse) {
        page.replaceChildren(A.h('strong', {}, shortEn(s.name.en)), heText(A, s.name.he, 'he g5-he'), A.h('small', {}, s.when));
        prompt.textContent = `Day ${q} of ${cfg.n}: what do you say?`;
        opts.replaceChildren(...greetingOptions(s, d.scenes, cfg.k, rnd).map((g) => button(A, card(A, g.he, cfg.english ? shortEn(g.en) : null, cfg.tr ? g.tr : null), (b) => {
          const ok = g.he === s.greet.he;
          grade(A, ok, { right: `Yes: ${g.tr}.`, wrong: `${g.tr} is for another day.` });
          if (ok) finish(b); else { b.disabled = true; b.append(A.h('span', { class: 'g5-tag' }, ' ✗ another day')); }
        })));
      } else {
        page.replaceChildren(A.h('strong', {}, 'Your neighbour says:'), heText(A, s.greet.he, 'he g5-big'));
        prompt.textContent = `Greeting ${q} of ${cfg.n}: which day is it?`;
        opts.replaceChildren(...dayOptions(s, d.scenes, cfg.k, rnd).map((o) => button(A, card(A, o.name.he, shortEn(o.name.en)), (b) => {
          const ok = o.greet.he === s.greet.he;
          grade(A, ok, { right: `Yes: ${shortEn(s.name.en)}.`, wrong: `On ${shortEn(o.name.en)} people say ${o.greet.tr}.` });
          if (ok) finish(b); else { b.disabled = true; b.append(A.h('span', { class: 'g5-tag' }, ' ✗ not this day')); }
        })));
      }
    };
    ask();
  }).catch(() => A.announce('The calendar did not load. Check the connection and press Start again.'));
}

export const mount = mountG5(spec, setup);
