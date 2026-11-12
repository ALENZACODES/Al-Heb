// Roll the Scroll: on Simchat Torah the reading of Deuteronomy ends and the scroll is rolled all the way back to the
// start of Genesis. Roll by one chapter or ten at a time to reach each place you are asked for, in as few rolls as you
// can. On arrival the verse is shown from the app's Torah text (divine name as ה׳).
import { mountG5, host, track, draftNote, heText, button, lock } from './g5-ui.js';
import { loadData, loadVerse, excerpt, tokens, refText, g5Data, shuffle, BOOKS, CHAPTERS, chapterIndex, roll, fewestRolls } from './g5-core.js';
import { numeralWritten } from './tg-core.js';

export const STORE_KEY = 'games.g5-scroll.v1';
const ROLLS = [[-10, 'Back 10'], [-1, 'Back 1'], [1, 'On 1'], [10, 'On 10']];

const spec = {
  id: 'g5-scroll', title: 'Roll the Scroll', titleHe: 'שִׂמְחַת תּוֹרָה',
  blurb: 'On Simchat Torah the last words of Deuteronomy are read, and the scroll is rolled all the way back to "In the beginning". Roll to each place you are asked for, in as few rolls as you can.',
  howTo: ['Back rolls toward Genesis, On rolls toward Deuteronomy, by 1 or 10 chapters.', 'Reach the chapter you are asked for; the verse appears when you arrive.', 'Every roll that brings you closer scores a point; arriving in the fewest rolls scores the most. Far too many and the scroll rolls itself there.', 'Level 3 writes the chapter as a Hebrew letter number; levels 4 and 5 only describe the place.'],
  levels: [
    { name: 'Back to the beginning', n: 2, ask: 'ref', near: true },
    { name: 'Book and chapter', n: 3, ask: 'ref' },
    { name: 'Hebrew chapter numbers', n: 4, ask: 'numeral' },
    { name: 'Find the story', n: 4, ask: 'story' },
    { name: 'Find the words', n: 5, ask: 'words' },
  ],
  par: (l, cfg) => cfg.n * 20,
  seconds: (l, cfg) => 40 + cfg.n * 30,
};

/** Targets for a round: Genesis 1 first (the Simchat Torah roll), then others, never the same place twice in a row. */
export function plan(targets, n, near, rnd = Math.random) {
  const first = targets.find((t) => t.book === 'genesis' && t.chapter === 1);
  const rest = shuffle(targets.filter((t) => t !== first && (!near || ['genesis', 'exodus'].includes(t.book))), rnd);
  return [first, ...rest].slice(0, n);
}
/** Points for reaching a place: 10 in the fewest rolls, 6 within two more, 3 otherwise. */
export const rollPoints = (used, fewest) => (used <= fewest ? 10 : used <= fewest + 2 ? 6 : 3);

function setup(A) {
  const T = track(A), cfg = A.cfg, rnd = A.rnd, ctx = A.ctx;
  const prompt = A.h('p', { class: 'arc-prompt', 'aria-live': 'polite' });
  const target = A.h('div', { class: 'g5-big' });
  const strip = A.h('div', { class: 'g5-scroll', 'aria-hidden': 'true' });
  const here = A.h('p', { 'aria-live': 'polite' });
  const pad = A.h('div', { class: 'g5-row', role: 'group', 'aria-label': 'Roll the scroll' });
  const after = A.h('p', { class: 'muted' });
  A.board.replaceChildren(host(A, 'rimon', 'Roll it back to the beginning!'), prompt, target, strip, here, pad, after,
    draftNote(A, 'Places and verses from the app\'s Torah text; captions are short summaries.'));
  loadData(ctx, g5Data('scroll')).then((d) => {
    if (!T.live()) return;
    const list = plan(d.targets, cfg.n, cfg.near, rnd);
    let pos = chapterIndex(d.start.book, d.start.chapter), k = 0;
    const where = () => {
      const c = CHAPTERS[pos];
      strip.replaceChildren(...BOOKS.map((b) => A.h('span', { class: b.id === c.book ? 'is-here' : '' }, b.en)));
      here.textContent = `The scroll is open at ${refText({ ...c, verse: 1 }).replace(/:1$/, '')}.`;
    };
    const go = async () => {
      if (k >= list.length) { T.end({ won: true }); return; }
      const t = list[k++];
      const goal = chapterIndex(t.book, t.chapter), fewest = fewestRolls(pos, goal), cap = fewest * 3 + 6;
      let used = 0;
      const v = await loadVerse(ctx, t);
      if (!T.live()) return;
      const words = excerpt(v.he, 0, Math.min(6, tokens(v.he).length));
      const book = BOOKS.find((b) => b.id === t.book).en;
      prompt.textContent = `Place ${k} of ${list.length} (fewest rolls: ${fewest}):`;
      target.replaceChildren(cfg.ask === 'ref' ? `${book} ${t.chapter}` : cfg.ask === 'numeral' ? A.h('span', {}, `${book} `, t.chapter === 5 ? '5' : heText(A, numeralWritten(t.chapter))) : cfg.ask === 'story' ? t.en : heText(A, words));
      const arrive = (auto) => {
        lock(pad);
        after.replaceChildren(heText(A, words), ` (${refText(t)}): ${t.en}.`);
        if (auto) { A.miss(); A.announce(`The scroll rolls itself to ${refText(t)}.`); }
        else { A.addScore(rollPoints(used, fewest)); A.sfx('success'); A.announce(`Here: ${refText(t)}, in ${used} roll${used === 1 ? '' : 's'}.`); }
        T.later(1300, go);
      };
      pad.replaceChildren(...ROLLS.map(([step, label]) => button(A, label, () => {
        const was = fewestRolls(pos, goal);
        pos = roll(pos, step); used += 1; A.sfx('click'); where();
        if (pos !== goal && fewestRolls(pos, goal) < was) A.addScore(1); // closer: a point, and the learner knows it
        if (pos === goal) arrive(false);
        else if (used >= cap) { pos = goal; where(); arrive(true); }
      }, 'btn secondary', { 'aria-label': `${label} chapter${Math.abs(step) === 1 ? '' : 's'}` })));
      where();
      if (pos === goal) arrive(false);
    };
    go().catch(() => A.announce('The scroll did not load. Check the connection and press Start again.'));
  }).catch(() => A.announce('The scroll did not load. Check the connection and press Start again.'));
}

export const mount = mountG5(spec, setup);
