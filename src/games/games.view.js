// Games hub (#/games): every game in one place. Until this page existed the
// home page linked only five of the twenty-five games and the rest were
// reachable solely by typing their address (owner report, Nov 7 2026).
import { h, heSpan, medal } from '../shell/ui.js';
import { LEVEL_DESCRIPTIONS } from './wordfinder.model.js';
import { loadGameImages, imgOf, GAME_ENV } from './engine.js';
import { ARCADE_GAMES } from './arcade.catalog.js';
import { gameOfTheDay, dayKey, ARCADE_KEY } from './arcade.model.js';

/** Hub id -> GAME_ENV key, for the games whose backdrop key differs from the route id. */
export const HUB_ENV_KEY = Object.freeze({
  archbuilder: 'arch', bumperverbs: 'bumper', lasermaze: 'laser', memorypalace: 'palace',
  shabbatrush: 'shabbat', shadowcraft: 'shadow', shuktaxi: 'taxi', submarinesonar: 'sonar',
  typewriter: 'typewriter', vowelcatcher: 'vowels', karaokebeat: 'karaoke',
});

export const GAMES = Object.freeze([
  ['tugowar', 'Antonym Tug-of-War', 'Pull the rope with opposites'],
  ['vowelcatcher', 'Vowel Catcher', 'Catch the falling vowel stars'],
  ['pinball', 'The Hebrew Pinball Bouncer', 'Pinball with Hebrew letters'],
  ['prefixblast', 'Bubble Pop Prefix Blast', 'Pop the right prefix bubbles'],
  ['memorypalace', 'The Memory Palace Courtyard', 'A courtyard that remembers words'],
  ['archbuilder', 'Hebrew Arch-Builder', 'Build each letter stroke by stroke'],
  ['lasermaze', 'Laser Mirror Maze', 'Bounce the beam to the target word'],
  ['letterbridge', 'Letter Bridge Builder', 'Bridge the gap letter by letter'],
  ['roottree', 'Hebrew Root Tree Cultivator', 'Grow words from their roots'],
  ['bumperverbs', 'Bumper Car Verb Conjugations', 'Bump the right verb form'],
  ['shabbatrush', 'Endless Runner: Shabbat Rush', 'Run the pre-Shabbat errands'],
  ['typewriter', 'Typewriter Conveyor Belt', 'Type the words before they pass'],
  ['petclinic', 'Pet Clinic Helper', 'Care for the animals, in Hebrew'],
  ['trainswitch', 'Train Track Switchboard', 'Switch the trains to the right words'],
  ['weatherstudio', 'Weather Presenter Studio', 'Present the forecast in Hebrew'],
  ['rentalagent', 'Apartment Rental Agent', 'Match renters to homes'],
  // Echo Chamber remains available by direct link, not in the catalogue until audible pairs pass review.
  ['museumcurator', 'The Museum Curator', 'Sort the artefacts by their words'],
  ['karaokebeat', 'The Karaoke Beat Matcher', 'Match the word to the beat'],
  ['shadowcraft', 'Shadow Craft', 'Match the word to its shadow'],
  ['ciphergrid', 'Cipher Decryption Grid', 'Crack the letter code'],
  ['shuktaxi', 'Shuk Taxi Driver', 'Drive the market run'],
  ['barter', 'The Israeli Flea Market Barter', 'Trade your way through the shuk'],
  ['submarinesonar', 'Submarine Sonar Vowels', 'Ping the vowels under the sea'],
  ['rhymelab', 'Hebrew Rhyme Laboratory', 'Find the words that rhyme'],
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
  const items = [{ id: 'wordfinder', title: 'Hebrew Word Finder', hook: 'No Hebrew experience needed: hear, look, find and learn 240 short words' }, ...original.values()];
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
        if (envId) thumbs.push({ a, envId });
        else if (ARCADE_GAMES.some((game) => game.id === id)) {
          a.prepend(medal('arcade', id, 96));
        }
        return h('li', {}, a);
      })));
  });
  const article = h('article', { class: 'card wf-games-hub' },
    h('h1', { id: 'view-title', tabindex: '-1' }, 'Hebrew Games ', heSpan('מִשְׂחָקִים')),
    h('p', {}, 'Completely new to Hebrew? Start at Level 1. Every level is open; you can play at your pace.'),
    h('p', { class: 'wf-lab-link' }, h('a', { class: 'btn', href: '#/lab' }, 'Brain Lab'), ' Three 45-second drills a day that get harder as you improve, with a score for each skill.'),
    arcadeCard(ctx),
    ...sections);
  root.replaceChildren(article);
  // Card thumbnails from each game's own backdrop art, plus Rimon the mascot
  // beside the title. Approved art only; a game with no approved scene keeps
  // its text-only card, exactly as before.
  loadGameImages({}).then((R) => {
    if (!R || !article.isConnected) return;
    for (const { a, envId } of thumbs) {
      const im = imgOf(R, 'id', envId);
      if (im?.src) a.prepend(h('img', { class: 'wf-game-thumb', src: im.src, alt: '', width: im.width, height: im.height, loading: 'lazy' }));
    }
    const mascot = imgOf(R, 'id', 'MASCOT_rimon');
    if (mascot?.src) article.insertBefore(
      h('img', { class: 'wf-hub-mascot', src: mascot.src, alt: mascot.alt, width: mascot.width, height: mascot.height }),
      article.children[1] || null);
  }).catch(() => {});
  return () => {};
}

/** The arcade strip: today's featured quick game, the learner's streak, and the count of arcade games. */
function arcadeCard(ctx) {
  const today = gameOfTheDay(ARCADE_GAMES.map((x) => x.id), dayKey());
  const game = ARCADE_GAMES.find((x) => x.id === today) || ARCADE_GAMES[0];
  let arc = null; try { arc = ctx?.store?.get?.(ARCADE_KEY) || null; } catch { arc = null; }
  const streak = arc?.streak || 0;
  return h('section', { class: 'card wf-arcade-card', 'aria-labelledby': 'wf-arcade-h' },
    h('h2', { id: 'wf-arcade-h' }, 'Arcade · today\'s game'),
    h('p', {}, h('a', { class: 'btn', href: '#/' + game.id + '?daily=1' }, game.title, h('span', { style: 'margin-inline-start:.45em' }, heSpan(game.titleHe))), ' ', h('span', { class: 'muted' }, game.tag + '. Same board for everyone today; play it as the daily challenge.')),
    h('p', { class: 'muted' }, streak ? `Your arcade streak: ${streak} day${streak === 1 ? '' : 's'}. Play any arcade game today to keep it.` : 'Play any arcade game today to start a streak. Thirty quick games, five levels each, badges for bests and perfect rounds.'));
}
