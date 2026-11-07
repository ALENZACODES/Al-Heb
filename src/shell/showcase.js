// @ts-check
// The first-screen showcase: Tree of Knowledge hero + a tile for every major
// destination, shown on Welcome (first run) and Home. Pure presentation —
// every tile links to an existing route; counts are the app's real numbers.
import { h, heSpan } from './ui.js';
import { astralTreeNode } from './astral-tree.js';

const TILES = [
  ['firstday', '#/firstday', 'Your First 10 Minutes', 'עֲשָׂרָה', 'Build your first word, letter by letter'],
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
  ['vocab', '#/vocab', '5,000 Words', 'מִלּוֹן', 'The whole vocabulary, searchable'],
  ['speak', '#/speak', 'Speak & Listen', 'דַּבֵּר', 'Say it out loud and be understood'],
  ['traditions', '#/traditions', 'Three Traditions', 'מָסוֹרֶת', 'Israeli, Sephardi, Ashkenazi — hear the difference'],
  ['morning', '#/morning', 'Start with God', 'מוֹדֶה אֲנִי', 'Modeh Ani and a verse, every morning'],
  ['torahreader', '#/torahreader', 'Torah Reader', 'תּוֹרָה', 'Read the weekly portion aloud'],
];


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
  return h('section', { class: 'showcase', 'aria-label': 'Explore ALEF' },
    h('div', { class: 'show-hero' },
      astralTreeNode(),
      h('div', { class: 'show-hero-text' },
        h('p', { class: 'show-kicker' }, 'The Tree of Life'),
        h('p', { class: 'show-title' }, 'Learn to read ', heSpan('עִבְרִית'), ' — Hebrew'),
        h('p', { class: 'show-sub' }, 'Prayers, Torah and everyday Israel. A few minutes a day, in your own tradition\u2019s voice.'),
        h('p', { class: 'show-cta' },
          h('a', { class: 'btn show-btn', href: '#/firstday' }, 'Start your first 10 minutes'),
          ' ',
          h('a', { class: 'btn secondary show-btn2', href: '#/books' }, 'Read a story book')))),
    tryPanel(),
    h('p', { class: 'show-stats' }, '75 lessons \u00b7 5,000 words \u00b7 19,466 voice clips \u00b7 5 voiced story books \u00b7 3 traditions'),
    h('ul', { class: 'show-grid' }, ...tiles));
}
