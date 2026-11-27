import { uiEnglish, MORNING_TITLE } from './names.js';
// @ts-check
// The first-screen showcase: Tree of Knowledge hero + a tile for every major
// destination, shown on Welcome (first run) and Home. Pure presentation —
// every tile links to an existing route; counts are the app's real numbers.
import { h, heSpan, destIcon } from './ui.js';
import { astralTreeNode } from './astral-tree.js';
import { builderNode } from '../home/builder.js';
import { BOOKS, BOOK_PICTURED_PAGES, FIRST_WORDS, GAMES_ALL, fmt, dictionaryTitle } from '../lib/counts.js';

export const TILES = [
  ['firstday', '#/firstday', 'Your First 10 Minutes', 'עֲשָׂרָה', 'Build your first word, letter by letter'],
  ['wordfinder', '#/wordfinder', 'Hebrew Word Finder · Level 1', 'מִלָּה', 'Hear, see and find your first real words. No Hebrew experience needed'],
  ['letters', '#/letters', 'Letters', 'אָלֶף־בֵּית', 'All 27 letters — sounded, traced, remembered'],
  ['books', '#/books', 'Little Books', 'סְפָרִים', `${BOOKS} little books, ${fmt(BOOK_PICTURED_PAGES)} pictured pages`],
  ['games', '#/games', 'All the Games', 'מִשְׂחָקִים', 'Every game in one place — letters, words, roots and rhymes'],
  ['tugowar', '#/tugowar', 'Antonym Tug-of-War', 'מִשְׂחָק', 'Games — pull the rope with opposites'],
  ['vowelcatcher', '#/vowelcatcher', 'Vowel Catcher', 'מִשְׂחָק', 'Games — catch the falling vowel stars'],
  ['pinball', '#/pinball', 'Hebrew Pinball', 'מִשְׂחָק', 'Games — pinball with Hebrew letters'],
  ['prefixblast', '#/prefixblast', 'Prefix Blast', 'מִשְׂחָק', 'Games — pop the right prefix bubbles'],
  ['memorypalace', '#/memorypalace', 'Memory Palace', 'מִשְׂחָק', 'Games — a courtyard that remembers words'],
  ['sprint', '#/sprint', 'Word Sprint', 'מִלִּים', 'Fast rounds with real words'],
  ['read', '#/read', 'Read the Prayers', 'תְּפִלָּה', 'The siddur (the Jewish prayer book) line by line, at your pace'],
  ['vocab', '#/vocab', dictionaryTitle(), 'מִלּוֹן', 'The whole vocabulary, searchable'],
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
  ['wordfinder', '#/wordfinder', 'Start with words', `Hear, find, understand — ${FIRST_WORDS} gentle first words`, 'clay'],
  ['books', '#/books', 'Open a little book', 'Read an illustrated story at your own pace', 'wood'],
  ['games', '#/games', 'Enter the games', 'Explore games across Levels 1–9', 'harvest'],
  ['read', '#/read', 'Read the prayers', 'Hebrew first, English beneath; go line by line', 'sky'],
  ['calendar', '#/calendar', 'See the Hebrew calendar', 'Shabbat times, festivals and the weekly portion', 'scroll'],
];

// The two things only Aleph does were reachable only through the Preview list in the More menu (27 Nov 2026 review). They
// now have their own doorways on Home. Both pages keep their own "not yet checked by a Hebrew teacher" labels: this makes
// them easy to find, it does not promote them to the reviewed set (docs/v0/SCOPE.md).
export const FLAGSHIPS = [
  ['prayer-practice', '#/prayer-practice', 'Prayer Practice', 'תְּפִלָּה', 'Your first service, line by line, in your own tradition, until you can follow it in synagogue.'],
  ['vocab', '#/vocab', dictionaryTitle(), 'מִלּוֹן', 'Look up any word: its meaning, its root, and how often the Torah uses it.'],
];
function flagshipsNode(has, ctx) {
  const rows = FLAGSHIPS.filter(([name]) => has(name));
  if (!rows.length) return null;
  return h('section', { class: 'show-flagships', 'aria-labelledby': 'show-flagships-title' },
    h('p', { id: 'show-flagships-title', class: 'show-section-title' }, 'Only in Aleph'),
    h('ul', { class: 'show-flagship-grid' }, ...rows.map(([name, href, title, he, hook]) =>
      h('li', {}, h('a', { class: 'show-flagship', href },
        destIcon(name === 'prayer-practice' ? 'read' : name, 56),
        h('span', { class: 'show-flagship-copy' },
          h('span', { class: 'show-flagship-title' }, uiEnglish(ctx, title), ' ', heSpan(he)),
          h('span', { class: 'show-flagship-hook' }, hook)))))));
}

function portalsNode(has) {
  return h('section', { class: 'show-portals', 'aria-labelledby': 'show-portals-title' },
    h('p', { id: 'show-portals-title', class: 'show-section-title' }, 'Or choose another doorway'),
    h('p', { class: 'show-portals-intro' }, 'Every doorway is open, and you can always return.'),
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
  const tiles = TILES.filter(([name]) => has(name)).map(([name, href, title, he, hook]) =>
    h('li', {}, h('a', { class: 'show-tile', href },
      destIcon(name, 56),
      h('span', { class: 'show-tile-title' }, uiEnglish(ctx, title), ' ', heSpan(he)),
      h('span', { class: 'show-tile-hook' }, hook))));
  const mascotBox = h('div', { class: 'show-mascot-box' });
  const heroText = h('div', { class: 'show-hero-text' },
    h('div', { class: 'show-hero-copy' },
    h('p', { class: 'show-kicker' }, 'The Tree of Life'),
    h('p', { class: 'show-title' }, 'Learn to read ', heSpan('עִבְרִית'), ' — Hebrew'),
    h('p', { class: 'show-sub' }, 'Prayers, Torah and everyday Israel. A few minutes a day, in your own tradition\u2019s voice.'),
    // One front door (27 Nov 2026 review: three competing starts). A first visit is told where to begin; the other two
    // buttons stay, as side doors. home.view.js hides the first button and this line once the first 10 minutes are done.
    h('p', { class: 'show-start-here' }, 'New to Hebrew? Start here:'),
    h('p', { class: 'show-cta' },
      h('a', { class: 'btn show-btn', href: '#/firstday' }, 'Start your first 10 minutes'),
      ' ',
      h('a', { class: 'btn secondary show-btn2', href: '#/books' }, 'Read a story book'),
      has('shabbat') ? h('a', { class: 'btn secondary show-btn3', href: '#/shabbat' }, 'Shabbat: find the Sh\'ma and follow the service') : null)), // lane 5: Shabbat Companion
    mascotBox);
  return h('section', { class: 'showcase', 'aria-label': 'Explore Aleph' },
    h('div', { class: 'show-hero' },
      astralTreeNode(),
      heroText),
    portalsNode(has),
    flagshipsNode(has, ctx),
    builderNode(ctx),
    h('p', { class: 'show-stats' }, `${GAMES_ALL.total ? fmt(GAMES_ALL.total) + ' games' : 'Games across 9 levels'} · ${fmt(FIRST_WORDS)} first words · ${fmt(BOOKS)} story books · 3 Hebrew traditions`), // src/lib/counts.js
    h('details', { class: 'show-all-destinations' }, // closed: the full list is one tap away, so the page opens small (depth revealed, not dumped)
      h('summary', {}, 'Explore all Aleph destinations'),
      h('ul', { class: 'show-grid' }, ...tiles)));
}
