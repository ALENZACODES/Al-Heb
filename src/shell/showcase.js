import { uiEnglish, MORNING_TITLE } from './names.js';
// @ts-check
// The first-screen showcase: Tree of Knowledge hero + a tile for every major
// destination, shown on Welcome (first run) and Home. Pure presentation —
// every tile links to an existing route; counts are the app's real numbers.
import { h, heSpan } from './ui.js';
import { astralTreeNode } from './astral-tree.js';
import { builderNode } from '../home/builder.js';

const TILES = [
  ['firstday', '#/firstday', 'Your First 10 Minutes', 'עֲשָׂרָה', 'Build your first word, letter by letter'],
  ['wordfinder', '#/wordfinder', 'Hebrew Word Finder · Level 1', 'מִלָּה', 'Hear, see and find your first real words — no Hebrew experience needed'],
  ['letters', '#/letters', 'Letters', 'אָלֶף־בֵּית', 'All 27 letters — sounded, traced, remembered'],
  ['books', '#/books', 'Little Books', 'סְפָרִים', '62 little books, 744 pages, every page voiced'],
  ['games', '#/games', 'All the Games', 'מִשְׂחָקִים', 'Every game in one place — letters, words, roots and rhymes'],
  ['tugowar', '#/tugowar', 'Antonym Tug-of-War', 'מִשְׂחָק', 'Games — pull the rope with opposites'],
  ['vowelcatcher', '#/vowelcatcher', 'Vowel Catcher', 'מִשְׂחָק', 'Games — catch the falling vowel stars'],
  ['pinball', '#/pinball', 'Hebrew Pinball', 'מִשְׂחָק', 'Games — pinball with Hebrew letters'],
  ['prefixblast', '#/prefixblast', 'Bubble Pop Prefix Blast', 'מִשְׂחָק', 'Games — pop the right prefix bubbles'],
  ['memorypalace', '#/memorypalace', 'Memory Palace', 'מִשְׂחָק', 'Games — a courtyard that remembers words'],
  ['sprint', '#/sprint', 'Word Sprint', 'מִלִּים', 'Fast rounds with real words'],
  ['read', '#/read', 'Read the Prayers', 'תְּפִלָּה', 'The siddur (the Jewish prayer book) line by line, at your pace'],
  ['vocab', '#/vocab', 'Dictionary — 5,000 Words', 'מִלּוֹן', 'The whole vocabulary, searchable'],
  ['speak', '#/speak', 'Speak & Listen', 'דַּבֵּר', 'Say it out loud and be understood'],
  ['traditions', '#/traditions', 'Three Traditions', 'מָסוֹרֶת', 'Israeli, Sephardi, Ashkenazi — hear the difference'],
  ['morning', '#/morning', MORNING_TITLE, 'מוֹדֶה אֲנִי', 'Modeh Ani and a verse, every morning'],
  ['torahreader', '#/torahreader', 'Torah Reader', 'תּוֹרָה', 'Read the weekly portion aloud'],
  ['listen-shelf', '#/listen/shelf', 'Sacred Listen', 'חַזָּנוּת', 'Cantorial treasures — historic cantors, cantillation and shofar'],
  ['calendar', '#/calendar', 'Hebrew Calendar', 'לוּחַ', 'Shabbat, festivals and the weekly portion, day by day'],
];


// Five photographed entrances. The same cached harvest artwork supplies
// distinct, carefully chosen crops; no new requests, icon sprites or labels
// baked into images. The links and all words remain accessible DOM content.
const PORTALS = [
  ['wordfinder', '#/wordfinder', 'Start with words', 'Hear, find, understand — 240 gentle first words', 'clay'],
  ['books', '#/books', 'Open a little book', 'Read an illustrated story at your own pace', 'wood'],
  ['games', '#/games', 'Enter the games', 'Explore games across Levels 1–9', 'harvest'],
  ['read', '#/read', 'Read the prayers', 'Hebrew first, English beneath; go line by line', 'sky'],
  ['calendar', '#/calendar', 'See the Hebrew calendar', 'Shabbat times, festivals and the weekly portion', 'scroll'],
];

function portalsNode(has) {
  return h('section', { class: 'show-portals', 'aria-labelledby': 'show-portals-title' },
    h('p', { id: 'show-portals-title', class: 'show-section-title' }, 'Choose your first doorway'),
    h('p', { class: 'show-portals-intro' }, 'Begin anywhere. Every doorway is open, and you can always return.'),
    h('ul', { class: 'show-portal-grid' }, ...PORTALS.filter(([name]) => has(name)).map(([, href, title, summary, scene]) =>
      h('li', {},
        h('a', { class: 'show-portal show-portal--' + scene, href },
          h('span', { class: 'show-portal-art', 'aria-hidden': 'true' }),
          h('span', { class: 'show-portal-copy' },
            h('span', { class: 'show-portal-title' }, title),
            h('span', { class: 'show-portal-note' }, summary)))))));
}

export function showcaseNode(ctx) {
  const has = (name) => { if (name === 'books') return true; try { return ctx?.hasRoute ? !!ctx.hasRoute(name) : true; } catch { return true; } };
  const tiles = TILES.filter(([name]) => has(name)).map(([, href, title, he, hook]) =>
    h('li', {}, h('a', { class: 'show-tile', href },
      h('span', { class: 'show-tile-title' }, uiEnglish(ctx, title), ' ', heSpan(he)),
      h('span', { class: 'show-tile-hook' }, hook))));
  const mascotBox = h('div', { class: 'show-mascot-box' });
  const heroText = h('div', { class: 'show-hero-text' },
    h('div', { class: 'show-hero-copy' },
    h('p', { class: 'show-kicker' }, 'The Tree of Life'),
    h('p', { class: 'show-title' }, 'Learn to read ', heSpan('עִבְרִית'), ' — Hebrew'),
    h('p', { class: 'show-sub' }, 'Prayers, Torah and everyday Israel. A few minutes a day, in your own tradition\u2019s voice.'),
    h('p', { class: 'show-cta' },
      h('a', { class: 'btn show-btn', href: '#/firstday' }, 'Start your first 10 minutes'),
      ' ',
      h('a', { class: 'btn secondary show-btn2', href: '#/books' }, 'Read a story book'))),
    mascotBox);
  return h('section', { class: 'showcase', 'aria-label': 'Explore Aleph' },
    h('div', { class: 'show-hero' },
      astralTreeNode(),
      heroText),
    portalsNode(has),
    builderNode(ctx),
    h('p', { class: 'show-stats' }, 'Games across 9 levels · 240 first words · 62 story books · 3 Hebrew traditions'),
    h('details', { class: 'show-all-destinations' }, // closed: the full list is one tap away, so the page opens small (depth revealed, not dumped)
      h('summary', {}, 'Explore all Aleph destinations'),
      h('ul', { class: 'show-grid' }, ...tiles)));
}
