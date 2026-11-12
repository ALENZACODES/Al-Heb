// Story Order: moments from a Torah story, each quoted word for word from the app's Torah text, shuffled.
// Put them back in the order the Torah tells them. Creation first, then Eden, Noah, Abraham, Jacob, Joseph and the Exodus.
import { uiEnglish } from '../shell/names.js';
import { mountArcade } from './arcade.js';
import { loadData, loadVerse, excerpt, showName, refText, shuffle } from './tg-core.js';
import { host, track, grade, draftNote, ensureStyle, orderBoard, numberKeys } from './tg-ui.js';

export const STORE_KEY = 'games.tg-storyorder.v1';

const spec = {
  id: 'tg-storyorder', title: 'Story Order', titleHe: 'סֵדֶר הַסִּפּוּר',
  blurb: 'Each card is a few words quoted exactly from a verse of the Torah. Tap the cards in the order the story happens. The early levels give an English line with each card; the later ones ask you to read the Hebrew.',
  howTo: ['Tap the card that comes first, then the next. A wrong tap costs a few points; the card stays.', 'Level 1: the days of creation, English shown. Levels 2 and 3: other stories, English shown.', 'Levels 4 and 5: Hebrew only; the English and the verse appear once a card is placed.', 'Number keys 1 to 9 pick a card.'],
  levels: [
    { name: 'Creation, with English', story: 'creation', cards: 4, english: true, stories: 2 },
    { name: 'Four moments, with English', cards: 4, english: true, stories: 3 },
    { name: 'Five moments, with English', cards: 5, english: true, stories: 3 },
    { name: 'Five moments, Hebrew only', cards: 5, english: false, stories: 3 },
    { name: 'Six moments, Hebrew only', cards: 6, english: false, stories: 3 },
  ],
  par: (l, cfg) => cfg.stories * cfg.cards * 10,
  seconds: (l, cfg) => 60 + cfg.stories * cfg.cards * 12,
  needsWords: false, needsLetters: false,
};

/** n events from a story, kept in story order, chosen with the round's random source. */
export function pickEvents(story, n, rnd = Math.random) {
  const idx = shuffle(story.events.map((_, i) => i), rnd).slice(0, Math.min(n, story.events.length)).sort((a, b) => a - b);
  return idx.map((i) => story.events[i]);
}
/** The exact quote for an event, as the game shows it (the divine name as ה׳). */
export const quoteOf = (verse, ev) => showName(excerpt(verse.he, ev.from, ev.to));

function setup(A) {
  ensureStyle();
  const T = track(A), cfg = A.cfg, rnd = A.rnd, ctx = A.ctx;
  const prompt = A.h('p', { class: 'arc-prompt' });
  const area = A.h('div');
  const after = A.h('p', { class: 'muted', 'aria-live': 'polite' });
  A.board.replaceChildren(host(A, 'rimon', 'What happened first?'), prompt, area, after,
    draftNote(A, 'Quotes from the Torah text in this app (Leningrad Codex); English lines are short summaries. The divine name is shown as ה׳.'));
  numberKeys(A, () => area.querySelector('.tg-tray'));
  let stories = [], s = 0;
  const next = async () => {
    if (s >= cfg.stories || !stories.length) { T.end({ won: true }); return; }
    const story = stories[s++];
    const events = pickEvents(story, cfg.cards, rnd);
    const verses = await Promise.all(events.map((e) => loadVerse(ctx, e.ref)));
    if (!T.live()) return;
    const items = events.map((e, i) => ({ ...e, he: quoteOf(verses[i], e), verseEn: uiEnglish(ctx, showName(verses[i].en)) }));
    prompt.textContent = `${story.en} (${s} of ${cfg.stories}): tap the moments in order.`;
    after.textContent = '';
    area.replaceChildren(orderBoard(A, items, {
      rnd, shuffleFn: shuffle, label: 'Moments to place',
      render: (it, placed) => A.h('span', {}, A.h('span', { lang: 'he', dir: 'rtl', class: 'he', style: 'font-size:1.25rem' }, it.he),
        cfg.english || placed ? A.h('small', {}, it.en) : null, placed ? A.h('small', {}, refText(it.ref)) : null),
      onRight: (it, k) => { grade(A, true, { right: `${k}: ${it.en} (${refText(it.ref)}).` }); after.textContent = `${refText(it.ref)}: ${it.verseEn}`; },
      onWrong: (it, want) => grade(A, false, { wrong: `Not yet: "${it.en}" comes later. Look for what happens before it.` }),
      onDone: () => { A.addScore(10); A.announce(`${story.en}: in order.`); T.later(1400, () => { next().catch(fail); }); },
    }));
  };
  const fail = () => A.announce('The verses did not load. Check the connection and press Start again.');
  loadData(ctx, 'data/games/tg/stories.json').then((d) => {
    if (!T.live()) return;
    const all = d.stories || [];
    stories = cfg.story ? all.filter((x) => x.id === cfg.story).concat(shuffle(all.filter((x) => x.id !== cfg.story), rnd)) : shuffle(all, rnd);
    return next();
  }).catch(fail);
}

export const mount = mountArcade(spec, setup);
