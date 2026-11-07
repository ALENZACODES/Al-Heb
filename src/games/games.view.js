// Games hub (#/games): every game in one place. Until this page existed the
// home page linked only five of the twenty-five games and the rest were
// reachable solely by typing their address (owner report, Nov 7 2026).
import { h, heSpan } from '../shell/ui.js';

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

export function mount(root) {
  const tiles = GAMES.map(([name, title, hook]) =>
    h('li', {}, h('a', { class: 'show-tile', href: `#/${name}` },
      h('span', { class: 'show-tile-title' }, title, ' ', heSpan('מִשְׂחָק')),
      h('span', { class: 'show-tile-hook' }, hook))));
  root.replaceChildren(h('article', { class: 'card' },
    h('h1', { id: 'view-title', tabindex: '-1' }, 'Games ', heSpan('מִשְׂחָקִים')),
    h('p', {}, `All ${GAMES.length} games in one place — letters, words, roots, rhymes and prefixes, played with real Hebrew.`),
    h('p', { class: 'muted' }, 'Preview: study aids from attested words and phrases; native review pending.'),
    h('ul', { class: 'show-grid' }, ...tiles)));
  return () => {};
}
