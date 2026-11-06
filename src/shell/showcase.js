// @ts-check
// The first-screen showcase: Tree of Knowledge hero + a tile for every major
// destination, shown on Welcome (first run) and Home. Pure presentation —
// every tile links to an existing route; counts are the app's real numbers.
import { h, heSpan } from './ui.js';

const TILES = [
  ['firstday', '#/firstday', 'Your First 10 Minutes', 'עֲשָׂרָה', 'Build your first word, letter by letter'],
  ['letters', '#/letters', 'Letters', 'אָלֶף־בֵּית', 'All 27 letters — sounded, traced, remembered'],
  ['books', '#/books', 'Little Books', 'סְפָרִים', '5 story books, 60 pages, every page voiced'],
  ['tugowar', '#/tugowar', 'Antonym Tug-of-War', 'מִשְׂחָק', 'Games — pull the rope with opposites'],
  ['vowelcatcher', '#/vowelcatcher', 'Vowel Catcher', 'מִשְׂחָק', 'Games — catch the falling vowel stars'],
  ['pinball', '#/pinball', 'Hebrew Pinball', 'מִשְׂחָק', 'Games — pinball with Hebrew letters'],
  ['prefixblast', '#/prefixblast', 'Bubble Pop Prefix Blast', 'מִשְׂחָק', 'Games — pop the right prefix bubbles'],
  ['memorypalace', '#/memorypalace', 'Memory Palace', 'מִשְׂחָק', 'Games — a courtyard that remembers words'],
  ['sprint', '#/sprint', 'Word Sprint', 'מִלִּים', 'Fast rounds with real words'],
  ['read', '#/read', 'Read the Prayers', 'תְּפִלָּה', 'The siddur line by line, at your pace'],
  ['vocab', '#/vocab', '5,000 Words', 'מִלּוֹן', 'The whole vocabulary, searchable'],
  ['speak', '#/speak', 'Speak & Listen', 'דַּבֵּר', 'Say it out loud and be understood'],
  ['traditions', '#/traditions', 'Three Traditions', 'מָסוֹרֶת', 'Israeli, Sephardi, Ashkenazi — hear the difference'],
  ['morning', '#/morning', 'Start with God', 'מוֹדֶה אֲנִי', 'Modeh Ani and a verse, every morning'],
  ['torahreader', '#/torahreader', 'Torah Reader', 'תּוֹרָה', 'Read the weekly portion aloud'],
];

export function showcaseNode(ctx) {
  const has = (name) => { if (name === 'books') return true; try { return ctx?.hasRoute ? !!ctx.hasRoute(name) : true; } catch { return true; } };
  const tiles = TILES.filter(([name]) => has(name)).map(([, href, title, he, hook]) =>
    h('li', {}, h('a', { class: 'show-tile', href },
      h('span', { class: 'show-tile-title' }, title, ' ', heSpan(he)),
      h('span', { class: 'show-tile-hook' }, hook))));
  return h('section', { class: 'showcase', 'aria-label': 'Explore ALEF' },
    h('div', { class: 'show-hero' },
      h('img', { class: 'show-hero-img', src: 'assets/books/book2/BOOK2_p01.jpg', alt: 'An ancient olive tree in a golden Jerusalem stone courtyard', loading: 'eager' }),
      h('div', { class: 'show-hero-shade' }),
      h('div', { class: 'show-hero-text' },
        h('p', { class: 'show-kicker' }, 'The Tree of Knowledge'),
        h('p', { class: 'show-title' }, 'Learn to read ', heSpan('עִבְרִית'), ' — Hebrew'),
        h('p', { class: 'show-sub' }, 'Prayers, Torah and everyday Israel. A few minutes a day, in your own tradition\u2019s voice.'),
        h('p', { class: 'show-cta' },
          h('a', { class: 'btn show-btn', href: '#/firstday' }, 'Start your first 10 minutes'),
          ' ',
          h('a', { class: 'btn secondary show-btn2', href: '#/books' }, 'Read a story book')))),
    h('p', { class: 'show-stats' }, '75 lessons \u00b7 5,000 words \u00b7 19,466 voice clips \u00b7 5 voiced story books \u00b7 3 traditions'),
    h('ul', { class: 'show-grid' }, ...tiles));
}
