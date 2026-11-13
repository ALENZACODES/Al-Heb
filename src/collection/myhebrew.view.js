// S6 My Hebrew (#/my-hebrew): one page that adds up where the learner stands. Every number is counted from the records on this
// device at the moment the page opens; nothing is estimated, and the rule behind each line is stated beside it.
import { h } from '../shell/ui.js';
import { KEY, read, clean } from './model.js';
import { VISITS_KEY, profile, LEVELS } from './diary.js';
import { readSnapshot, streakInfo, lessonCounts, srsMaturity, vocabBands, tracedLetters, knowledge, weakSpots, activityDays, ALL_LETTERS } from '../progress/model.js';
import { tryJSON, LINKS } from './shared.js';

const pct = (x) => `${Math.round(x * 100)}%`;

export async function mount(root, ctx, env = {}) {
  const store = ctx?.store; const now = (env.now || (() => Date.now()))();
  const lessons = (await tryJSON('../../data/curriculum/lessons.json', env.loadJSON))?.lessons || [];
  let p = null;
  try {
    const s = readSnapshot(store);
    const books = Object.values((await read(store, 'books.v1', {})) || {});
    let letters = tracedLetters(s).size; try { letters = knowledge(s, lessons).letters.size ?? letters; } catch { /* traced letters only */ }
    p = profile({ lessons: lessonCounts(s, lessons), lettersKnown: Math.min(letters, ALL_LETTERS.length), lettersTotal: ALL_LETTERS.length, cards: srsMaturity({ ...s.cards, ...s.vocab }), vocabStarted: vocabBands(s.vocab).started,
      booksFinished: books.filter((b) => b && b.finishedAt).length, booksStarted: books.length, streak: streakInfo(s, now), weak: weakSpots(s, { has: ctx?.hasRoute || (() => true) }),
      collection: clean(await read(store, KEY)), visits: await read(store, VISITS_KEY), daysActive: activityDays(s).size });
  } catch { p = null; }
  const sec = h('section', { class: 'card', 'aria-labelledby': 'view-title' }, h('h1', { id: 'view-title', tabindex: '-1' }, 'My Hebrew'));
  root.append(sec);
  if (!p) { sec.append(h('p', {}, 'Your summary will show here once there is progress on this device.')); return () => {}; }
  const line = (label, value, why) => h('li', {}, h('strong', {}, `${label}: `), value, why ? h('span', { class: 'muted' }, ` ${why}`) : null);
  sec.append(...[
    h('p', {}, 'Where your Hebrew stands today. Every number is counted from your own records on this device.'),
    h('h2', {}, 'At a Glance'),
    h('ul', { 'data-role': 'glance' },
      line('Level', p.level, `(${pct(p.levelShare)} of the reading lessons finished)`),
      line('Words known', String(p.wordsKnown), `review cards that now last three weeks or more; ${p.wordsLearning} more are still being learned`),
      line('Dictionary words started', String(p.vocabStarted)),
      line('Little books finished', String(p.booksFinished), p.booksStarted > p.booksFinished ? `(${p.booksStarted - p.booksFinished} more in progress)` : ''),
      line('Streak', `${p.streak} day${p.streak === 1 ? '' : 's'}`, `(best ${p.bestStreak})`),
      line('Days with any study', String(p.daysActive)),
      line('Saved in My Collection', String(p.saved))),
    h('h2', {}, 'Strongest and Weakest Areas'),
    p.areas.length ? h('ul', { 'data-role': 'areas' }, ...p.areas.map((a) => h('li', {}, h('a', { href: a.href }, a.label), `: ${a.have} of ${a.of} (${pct(a.share)})`,
      p.strongest?.id === a.id ? h('strong', {}, ' — strongest') : p.weakest?.id === a.id ? h('strong', {}, ' — the one to work on') : null))) : h('p', {}, 'Nothing to compare yet.'),
    p.weak.length ? h('p', {}, 'Most missed: ', ...p.weak.flatMap((w, i) => [i ? '; ' : '', h('a', { href: w.href }, w.label), w.detail ? ` (${w.detail})` : ''])) : null,
    h('h2', {}, 'Favorite Content'),
    p.favorite.length ? h('ul', { 'data-role': 'favorite' }, ...p.favorite.map((f) => h('li', {}, h('a', { href: f.href }, f.title), ` opened ${f.n} times`))) : h('p', {}, 'The pages you come back to most will show here after a few days of use.'),
    p.hearts.length ? h('p', {}, 'Your newest favorites: ', ...p.hearts.flatMap((f, i) => [i ? ', ' : '', f.href ? h('a', { href: f.href }, f.title) : f.title])) : null,
    h('details', {}, h('summary', {}, 'How the level line is worked out'),
      h('p', {}, 'The level follows one thing only: the share of reading lessons you have finished.'),
      h('ul', {}, ...LEVELS.map(([min, label]) => h('li', {}, `${label}: from ${pct(min)}`)))),
    h('p', { class: 'muted' }, h('a', { href: '#/progress' }, 'Progress'), ' · ', h('a', { href: '#/mastery' }, 'Mastery Map'), ...LINKS.filter(([href]) => href !== '#/my-hebrew').flatMap(([href, label]) => [' · ', h('a', { href }, label)]))].filter(Boolean));
  return () => {};
}
