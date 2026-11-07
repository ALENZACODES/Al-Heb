// Games hub (#/games): every game in one place. Until this page existed the
// home page linked only five of the twenty-five games and the rest were
// reachable solely by typing their address (owner report, Nov 7 2026).
import { h, heSpan } from '../shell/ui.js';
import { LEVEL_DESCRIPTIONS } from './wordfinder.model.js';

export const GAMES = Object.freeze([
  ['tugowar', 'Antonym Tug-of-War', 'Pull the rope with opposites'],
  ['vowelcatcher', 'Vowel Catcher', 'Catch the falling vowel stars'],
  ['pinball', 'The Hebrew Pinball Bouncer', 'Pinball with Hebrew letters'],
  ['prefixblast', 'Bubble Pop Prefix Blast', 'Pop the right prefix bubbles'],
  ['memorypalace', 'The Memory Palace Courtyard', 'A courtyard that remembers words'],
  ['archbuilder', 'Hebrew Arch-Builder', 'Build each letter stroke by stroke'],
  ['lasermaze', 'Laser Mirror Laser Maze', 'Bounce the beam to the target word'],
  ['letterbridge', 'Letter Bridge Builder', 'Bridge the gap letter by letter'],
  ['roottree', 'Hebrew Root Tree Cultivator', 'Grow words from their roots'],
  ['bumperverbs', 'Bumper Car Verb Conjugations', 'Bump the right verb form'],
  ['shabbatrush', 'Endless Runner: Shabbat Rush', 'Run the pre-Shabbat errands'],
  ['typewriter', 'Typewriter Conveyor Belt', 'Type the words before they pass'],
  ['petclinic', 'Pet Clinic Helper', 'Care for the animals, in Hebrew'],
  ['trainswitch', 'Train Track Switchboard', 'Switch the trains to the right words'],
  ['weatherstudio', 'Weather Presenter Studio', 'Present the forecast in Hebrew'],
  ['rentalagent', 'Apartment Rental Agent', 'Match renters to homes'],
  ['echochamber', 'Acoustic Echo Chamber', 'Hear it, echo it back'],
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
});

export function mount(root) {
  const original = new Map(GAMES.map(([id, title, hook]) => [id, { id, title, hook }]));
  const items = [{ id: 'wordfinder', title: 'Hebrew Word Finder', hook: 'No Hebrew experience needed: hear, look, find and learn 240 short words' }, ...original.values()];
  const sections = LEVEL_DESCRIPTIONS.map((intro, i) => {
    const level = i + 1;
    const games = items.filter((item) => LEVEL_BY_GAME[item.id] === level);
    return h('section', { class: 'wf-level-section', 'aria-labelledby': 'wf-level-' + level },
      h('h2', { id: 'wf-level-' + level }, 'Level ' + level + ' of 9', level === 1 ? ' · Start here' : ''),
      h('p', { class: 'muted' }, intro),
      h('ul', { class: 'show-grid wf-game-grid' }, ...games.map(({ id, title, hook }) =>
        h('li', {},
          h('a', { class: 'show-tile wf-level-tile' + (id === 'wordfinder' ? ' wf-featured-game' : ''), href: '#/' + id },
            h('span', { class: 'wf-game-level' }, 'LEVEL ' + level + ' / 9'),
            h('span', { class: 'show-tile-title' }, title, ' ', heSpan('מִשְׂחָק')),
            h('span', { class: 'show-tile-hook' }, hook),
            id === 'wordfinder' ? h('span', { class: 'wf-try-first' }, 'Start with five words →') : null)))));
  });
  root.replaceChildren(h('article', { class: 'card wf-games-hub' },
    h('h1', { id: 'view-title', tabindex: '-1' }, 'Hebrew Games ', heSpan('מִשְׂחָקִים')),
    h('p', {}, 'Completely new to Hebrew? Start at Level 1. Every level is open; you can play at your pace.'),
    h('p', { class: 'muted' }, 'These are suggested challenge levels, not placement tests or CEFR certifications. Games and vocabulary remain preview content, with native review pending.'),
    ...sections));
  return () => {};
}
