// @ts-check
// The first-screen showcase: Tree of Knowledge hero + a tile for every major
// destination, shown on Welcome (first run) and Home. Pure presentation —
// every tile links to an existing route; counts are the app's real numbers.
import { h, heSpan } from './ui.js';
import { astralTreeNode } from './astral-tree.js';
import { loadGameImages, imgOf } from '../games/engine.js';

const TILES = [
  ['firstday', '#/firstday', 'Your First 10 Minutes', 'עֲשָׂרָה', 'Build your first word, letter by letter'],
  ['wordfinder', '#/wordfinder', 'Hebrew Word Finder · Level 1', 'מִלָּה', 'Hear, see and find your first real words — no Hebrew experience needed'],
  ['letters', '#/letters', 'Letters', 'אָלֶף־בֵּית', 'All 27 letters — sounded, traced, remembered'],
  ['books', '#/books', 'Little Books', 'סְפָרִים', '5 story books, 60 pages, every page voiced'],
  ['games', '#/games', 'All the Games', 'מִשְׂחָקִים', 'Every game in one place — letters, words, roots and rhymes'],
  ['tugowar', '#/tugowar', 'Antonym Tug-of-War', 'מִשְׂחָק', 'Games — pull the rope with opposites'],
  ['vowelcatcher', '#/vowelcatcher', 'Vowel Catcher', 'מִשְׂחָק', 'Games — catch the falling vowel stars'],
  ['pinball', '#/pinball', 'Hebrew Pinball', 'מִשְׂחָק', 'Games — pinball with Hebrew letters'],
  ['prefixblast', '#/prefixblast', 'Bubble Pop Prefix Blast', 'מִשְׂחָק', 'Games — pop the right prefix bubbles'],
  ['memorypalace', '#/memorypalace', 'Memory Palace', 'מִשְׂחָק', 'Games — a courtyard that remembers words'],
  ['sprint', '#/sprint', 'Word Sprint', 'מִלִּים', 'Fast rounds with real words'],
  ['read', '#/read', 'Read the Prayers', 'תְּפִלָּה', 'The siddur line by line, at your pace'],
  ['vocab', '#/vocab', 'Dictionary — 5,000 Words', 'מִלּוֹן', 'The whole vocabulary, searchable'],
  ['speak', '#/speak', 'Speak & Listen', 'דַּבֵּר', 'Say it out loud and be understood'],
  ['traditions', '#/traditions', 'Three Traditions', 'מָסוֹרֶת', 'Israeli, Sephardi, Ashkenazi — hear the difference'],
  ['morning', '#/morning', 'Start with God', 'מוֹדֶה אֲנִי', 'Modeh Ani and a verse, every morning'],
  ['torahreader', '#/torahreader', 'Torah Reader', 'תּוֹרָה', 'Read the weekly portion aloud'],
  ['listen-shelf', '#/listen/shelf', 'Sacred Listen', 'חַזָּנוּת', 'Cantorial treasures — historic cantors, cantillation and shofar'],
  ['calendar', '#/calendar', 'Hebrew Calendar', 'לוּחַ', 'Shabbat, festivals and the weekly portion, day by day'],
];


// Four photographed entrances. The same cached harvest artwork supplies four
// distinct, carefully chosen crops; no new requests, icon sprites or labels
// baked into images. The links and all words remain accessible DOM content.
const PORTALS = [
  ['wordfinder', '#/wordfinder', 'Start with words', 'Hear, find, understand — 240 gentle first words', 'clay'],
  ['books', '#/books', 'Open a little book', 'Read an illustrated story at your own pace', 'wood'],
  ['games', '#/games', 'Enter the games', 'Explore games across Levels 1–9', 'harvest'],
  ['read', '#/read', 'Read the prayers', 'Hebrew first, English beneath; go line by line', 'sky'],
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

const TRY_LETTERS = [
  ['\u05D0', 'alef', 'a'], ['\u05D1', 'bet', 'b'], ['\u05D2', 'gimel', 'g'],
  ['\u05D3', 'dalet', 'd'], ['\u05D4', 'he', 'h'], ['\u05D5', 'vav', 'v'],
];
const TRY_TARGET = ['alef', 'bet', 'alef'];

// Interactive first taste: tap the letters, hear the real letter sounds,
// and build a first word (abba, "father"). Sound is a bonus — if a clip
// cannot play, the panel still works silently.
function tryPanel() {
  let step = 0;
  let el = null;
  const playLetter = (name) => {
    try {
      if (!el) el = new Audio();
      el.onerror = () => { el.onerror = null; el.src = `audio/f/israeli/letter/${name}.mp3`; el.play().catch(() => {}); };
      el.src = `audio/f/israeli/letter/${name}-sound.mp3`;
      el.play().catch(() => {});
    } catch { /* silent */ }
  };
  const slots = TRY_TARGET.map(() => h('span', { class: 'show-slot' }, '\u00b7'));
  const status = h('p', { class: 'show-try-status', role: 'status', 'aria-live': 'polite' },
    'Tap alef, then bet, then alef — in the order Hebrew reads, right to left.');
  const again = h('button', { type: 'button', class: 'btn secondary show-again', hidden: true, onclick: () => reset() }, 'Build it again');
  function reset() {
    step = 0;
    slots.forEach((s) => { s.textContent = '\u00b7'; s.classList.remove('filled'); });
    again.hidden = true;
    status.textContent = 'Tap alef, then bet, then alef — in the order Hebrew reads, right to left.';
  }
  function tap(glyph, name) {
    playLetter(name);
    if (step >= TRY_TARGET.length) return;
    if (name === TRY_TARGET[step]) {
      slots[step].textContent = glyph;
      slots[step].classList.add('filled');
      step++;
      if (step === TRY_TARGET.length) {
        status.textContent = 'You built \u05D0\u05B7\u05D1\u05B8\u05BC\u05D0 — abba, "father." That is your first Hebrew word.';
        again.hidden = false;
      } else {
        status.textContent = `Yes — ${name}. ${TRY_TARGET.length - step} to go: find ${TRY_TARGET[step]}.`;
      }
    } else {
      status.textContent = `That is ${name} — hear how it sounds. For this word, find ${TRY_TARGET[step]} next.`;
    }
  }
  return h('div', { class: 'show-try' },
    h('p', { class: 'show-try-title' }, 'Try it now — build your first word'),
    h('p', { class: 'show-slots', dir: 'rtl', 'aria-hidden': 'true' }, ...slots),
    h('div', { class: 'show-letters' }, ...TRY_LETTERS.map(([glyph, name, sound]) =>
      h('button', { type: 'button', class: 'show-letter-btn', onclick: () => tap(glyph, name), 'aria-label': `Hear the letter ${name}` },
        heSpan(glyph, 'he show-letter-glyph'), h('span', { class: 'show-letter-name' }, `${name} · ${sound}`)))),
    status, again);
}

export function showcaseNode(ctx) {
  const has = (name) => { if (name === 'books') return true; try { return ctx?.hasRoute ? !!ctx.hasRoute(name) : true; } catch { return true; } };
  const tiles = TILES.filter(([name]) => has(name)).map(([, href, title, he, hook]) =>
    h('li', {}, h('a', { class: 'show-tile', href },
      h('span', { class: 'show-tile-title' }, title, ' ', heSpan(he)),
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
  // Rimon beside the hero copy. The image resolver loads lazily on first
  // paint, so a synchronous ctx.img read is empty on the first visit — fetch
  // the mascot when the resolver is ready and insert it then. A missing
  // picture leaves the hero exactly as it was.
  loadGameImages(ctx).then((R) => {
    const im = R ? imgOf(R, 'id', 'MASCOT_rimon') : null;
    if (im?.src && mascotBox.isConnected) mascotBox.appendChild(h('img', { class: 'show-mascot', src: im.src, alt: im.alt, width: im.width, height: im.height }));
  }).catch(() => {});
  return h('section', { class: 'showcase', 'aria-label': 'Explore ALEF' },
    h('div', { class: 'show-hero' },
      astralTreeNode(),
      heroText),
    portalsNode(has),
    tryPanel(),
    h('p', { class: 'show-stats' }, 'Games across 9 levels · 240 first words · 62 story books · 3 Hebrew traditions'),
    h('details', { class: 'show-all-destinations', ...(ctx?.routeName === 'home' ? { open: true } : {}) },
      h('summary', {}, 'Explore all ALEF destinations'),
      h('ul', { class: 'show-grid' }, ...tiles)));
}
