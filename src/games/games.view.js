// Games hub (#/games): every game in one place. Until this page existed the
// home page linked only five of the twenty-five games and the rest were
// reachable solely by typing their address (owner report, Nov 7 2026).
import { h, heSpan, medal } from '../shell/ui.js';
import { LEVEL_DESCRIPTIONS } from './wordfinder.model.js';
import { loadGameImages, imgOf, GAME_ENV } from './engine.js';
import { ARCADE_GAMES } from './arcade.catalog.js';
import { rimonInline } from '../shell/rimon-inline.js';
import { gameOfTheDay, dayKey, ARCADE_KEY, LEVELS as ARCADE_STEPS } from './arcade.model.js';

/** Hub id -> GAME_ENV key, for the games whose backdrop key differs from the route id. */
export const HUB_ENV_KEY = Object.freeze({
  archbuilder: 'arch', bumperverbs: 'bumper', lasermaze: 'laser', memorypalace: 'palace',
  shabbatrush: 'shabbat', shadowcraft: 'shadow', shuktaxi: 'taxi', submarinesonar: 'sonar',
  typewriter: 'typewriter', vowelcatcher: 'vowels', karaokebeat: 'karaoke',
});

export const GAMES = Object.freeze([
  ['tugowar', 'Antonym Tug-of-War', 'Pull the rope with opposites'],
  ['vowelcatcher', 'Vowel Catcher', 'Catch the falling vowel stars'],
  ['pinball', 'Hebrew Pinball', 'Pinball with Hebrew letters'],
  ['prefixblast', 'Prefix Blast', 'Pop the right prefix bubbles'],
  ['memorypalace', 'Memory Palace', 'A courtyard that remembers words'],
  ['archbuilder', 'Hebrew Arch-Builder', 'Build each letter stroke by stroke'],
  ['lasermaze', 'Laser Mirror Maze', 'Bounce the beam to the target word'],
  ['letterbridge', 'Letter Bridge Builder', 'Bridge the gap letter by letter'],
  ['roottree', 'Root Tree', 'Grow words from their roots'],
  ['bumperverbs', 'Verb Bumper Cars', 'Bump the right verb form'],
  ['shabbatrush', 'Shabbat Rush', 'Run the pre-Shabbat errands'],
  ['typewriter', 'Typewriter Belt', 'Type the words before they pass'],
  ['petclinic', 'Pet Clinic Helper', 'Care for the animals, in Hebrew'],
  ['trainswitch', 'Train Track Switchboard', 'Switch the trains to the right words'],
  ['weatherstudio', 'Weather Presenter Studio', 'Present the forecast in Hebrew'],
  ['rentalagent', 'Apartment Rental Agent', 'Match renters to homes'],
  // Echo Chamber remains available by direct link, not in the catalogue until audible pairs pass review.
  ['museumcurator', 'The Museum Curator', 'Sort the artefacts by their words'],
  ['karaokebeat', 'Karaoke Beat', 'Match the word to the beat'],
  ['shadowcraft', 'Shadow Craft', 'Match the word to its shadow'],
  ['ciphergrid', 'Cipher Grid', 'Crack the letter code'],
  ['shuktaxi', 'Shuk Taxi Driver', 'Drive the market run'],
  ['barter', 'Shuk Barter', 'Trade your way through the shuk'],
  ['submarinesonar', 'Sonar Vowels', 'Ping the vowels under the sea'],
  ['rhymelab', 'Rhyme Lab', 'Find the words that rhyme'],
]);

/** Practical entry labels, not CEFR equivalences or claims of verified mastery. */
export const LEVEL_BY_GAME = Object.freeze({
  wordfinder: 1,
  archbuilder: 1,
  vowelcatcher: 2,
  pinball: 2,
  memorypalace: 2,
  letterbridge: 2,
  shadowcraft: 2,
  tugowar: 3,
  echochamber: 3,
  museumcurator: 3,
  petclinic: 3,
  submarinesonar: 3,
  prefixblast: 4,
  typewriter: 4,
  trainswitch: 4,
  shuktaxi: 5,
  rhymelab: 5,
  lasermaze: 6,
  shabbatrush: 6,
  weatherstudio: 7,
  rentalagent: 7,
  ciphergrid: 7,
  roottree: 8,
  barter: 8,
  karaokebeat: 8,
  bumperverbs: 9,
  ...Object.fromEntries(ARCADE_GAMES.map((x) => [x.id, x.level])),
});

export function mount(root, ctx) {
  const original = new Map([...GAMES, ...ARCADE_GAMES.map((x) => [x.id, x.title, x.tag])].map(([id, title, hook]) => [id, { id, title, hook }]));
  const items = [{ id: 'wordfinder', title: 'Hebrew Word Finder', hook: 'For people who do not know Hebrew yet. Hear a word, find it and learn it. There are 240 short words.' }, ...original.values()];
  const thumbs = [];
  const sections = LEVEL_DESCRIPTIONS.map((intro, i) => {
    const level = i + 1;
    const games = items.filter((item) => LEVEL_BY_GAME[item.id] === level);
    return h('section', { class: 'wf-level-section', 'aria-labelledby': 'wf-level-' + level },
      h('h2', { id: 'wf-level-' + level }, 'Level ' + level + ' of 9', level === 1 ? ' · Start here' : ''),
      h('p', { class: 'muted' }, intro),
      h('ul', { class: 'show-grid wf-game-grid' }, ...games.map(({ id, title, hook }) => {
        const envId = GAME_ENV[HUB_ENV_KEY[id] || id];
        const a = h('a', { class: 'show-tile wf-level-tile' + (id === 'wordfinder' ? ' wf-featured-game' : ''), href: '#/' + id },
          h('span', { class: 'wf-game-level' }, 'LEVEL ' + level + ' / 9'),
          h('span', { class: 'show-tile-title' }, title, ' ', heSpan('מִשְׂחָק')),
          h('span', { class: 'show-tile-hook' }, hook),
          id === 'wordfinder' ? h('span', { class: 'wf-try-first' }, 'Start with five words →') : null);
        if (envId) thumbs.push({ a, id, envId }); // the game's own scene is the card picture (owner, 2026-11-10: pictures over gold icons)
        else if (ARCADE_GAMES.some((game) => game.id === id)) {
          a.prepend(arcadeThumb(id, a));
        }
        return h('li', {}, a);
      })));
  });
  const article = h('article', { class: 'card wf-games-hub' },
    h('h1', { id: 'view-title', tabindex: '-1' }, 'Hebrew Games ', heSpan('מִשְׂחָקִים')),
    h('p', {}, `${hubSummary(items)} Completely new to Hebrew? Start at Level 1. Every level is open; you can play at your pace.`),
    h('p', { class: 'wf-lab-link' }, h('a', { class: 'btn', href: '#/lab' }, 'Brain Lab'), ' Three 45-second drills a day that get harder as you improve, with a score for each skill.'),
    arcadeCard(ctx, items.length),
    ...sections);
  root.replaceChildren(article);
  // Card thumbnails from each game's own backdrop art, plus Rimon the mascot
  // beside the title. Approved art only; a game with no approved scene keeps
  // its text-only card, exactly as before.
  loadGameImages({}).then((R) => {
    if (!R || !article.isConnected) return;
    for (const { a, id, envId } of thumbs) {
      const im = imgOf(R, 'id', envId);
      if (im?.src) a.prepend(h('img', { class: 'wf-game-thumb', src: im.src, alt: '', width: im.width, height: im.height, loading: 'lazy' }));
      else a.append(medal('word', id, 56)); // last resort only: no approved scene for this game
    }
    // the same animated Rimon as setup, Learn and the lesson summary (one Rimon system); the corner Rimon steps aside while he is here
    try { const r = rimonInline({ action: 'wave', size: 88, label: 'Rimon waving' }); r.el.classList?.add?.('wf-hub-mascot'); article.insertBefore(r.el, article.children[1] || null); r.play('wave'); } catch { /* the picture is optional */ }
  }).catch(() => {});
  return () => {};
}

/** Light WebP card picture from the arcade game's own scene (the main card image; no coin on game cards) (assets/img/arcade-thumbs, made from assets/games/arcade/<id>/env.png
 *  by tools/images/arcade-thumbs.py; 14-27 KB instead of ~850 KB, never precached). Lazy; removes itself if the file is missing. */
export function arcadeThumb(id, card) {
  const b = `assets/img/arcade-thumbs/${id}`;
  return h('img', { class: 'wf-game-thumb wf-arcade-thumb', src: b + '.480.webp', srcset: `${b}.480.webp 480w, ${b}.800.webp 800w`, sizes: '(max-width: 719px) 92vw, 320px', width: 480, height: 180, alt: '', loading: 'lazy', decoding: 'async',
    onerror: (e) => { e.target.remove(); card?.append?.(medal('arcade', id, 56)); } }); // a coin only if the scene is missing
}

const NUM_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const numWord = (n) => NUM_WORDS[n] || String(n);
/** "55 games across 9 levels." — counted from the catalogue, never typed (M-08: the old typed count went stale). */
export function hubSummary(items) {
  const shown = items.filter((x) => LEVEL_BY_GAME[x.id] >= 1 && LEVEL_BY_GAME[x.id] <= LEVEL_DESCRIPTIONS.length);
  const levels = new Set(shown.map((x) => LEVEL_BY_GAME[x.id])).size;
  return `${shown.length} games across ${levels} levels.`;
}
/** The arcade strip: today's featured quick game, the learner's streak, and the count of arcade games. */
function arcadeCard(ctx, total = 0) {
  const today = gameOfTheDay(ARCADE_GAMES.map((x) => x.id), dayKey());
  const game = ARCADE_GAMES.find((x) => x.id === today) || ARCADE_GAMES[0];
  let arc = null; try { arc = ctx?.store?.get?.(ARCADE_KEY) || null; } catch { arc = null; }
  const streak = arc?.streak || 0;
  return h('section', { class: 'card wf-arcade-card', 'aria-labelledby': 'wf-arcade-h' },
    h('h2', { id: 'wf-arcade-h' }, 'Arcade · today\'s game'),
    h('p', {}, h('a', { class: 'btn', href: '#/' + game.id + '?daily=1' }, game.title, h('span', { style: 'margin-inline-start:.45em' }, heSpan(game.titleHe))), ' ', h('span', { class: 'muted' }, game.tag + '. Same board for everyone today; play it as the daily challenge.')),
    h('p', { class: 'muted' }, streak ? `Your arcade streak: ${streak} day${streak === 1 ? '' : 's'}. Play any arcade game today to keep it.` : `Play any arcade game today to start a streak. ${ARCADE_GAMES.length}${total ? ` of the ${total}` : ''} games here are quick arcade games, each with ${numWord(ARCADE_STEPS.length)} rounds of difficulty, and badges for bests and perfect rounds.`));
}
