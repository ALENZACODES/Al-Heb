import test from 'node:test';
import assert from 'node:assert/strict';
import { matchRoute } from '../src/shell/router.js';

export const GAME_ROUTES = Object.freeze([
  ['shabbatrush', '/shabbatrush', 'Shabbat Rush'],
  ['typewriter', '/typewriter', 'Typewriter Belt'],
  ['petclinic', '/petclinic', 'Pet Clinic Helper'],
  ['trainswitch', '/trainswitch', 'Train Track Switchboard'],
  ['weatherstudio', '/weatherstudio', 'Weather Presenter Studio'],
  ['rentalagent', '/rentalagent', 'Apartment Rental Agent'],
  ['echochamber', '/echochamber', 'Acoustic Echo Chamber'],
  ['museumcurator', '/museumcurator', 'The Museum Curator'],
  ['karaokebeat', '/karaokebeat', 'Karaoke Beat'],
  ['archbuilder', '/archbuilder', 'Hebrew Arch-Builder'],
  ['lasermaze', '/lasermaze', 'Laser Mirror Maze'],
  ['roottree', '/roottree', 'Root Tree'],
  ['letterbridge', '/letterbridge', 'Letter Bridge Builder'],
  ['shadowcraft', '/shadowcraft', 'Shadow Craft'],
  ['ciphergrid', '/ciphergrid', 'Cipher Grid'],
  ['shuktaxi', '/shuktaxi', 'Shuk Taxi Driver'],
  ['barter', '/barter', 'Shuk Barter'],
  ['submarinesonar', '/submarinesonar', 'Sonar Vowels'],
  ['rhymelab', '/rhymelab', 'Rhyme Lab'],
  ['bumperverbs', '/bumperverbs', 'Verb Bumper Cars'],
  ['pinball', '/pinball', 'Hebrew Pinball'],
  ['memorypalace', '/memorypalace', 'Memory Palace'],
  ['prefixblast', '/prefixblast', 'Prefix Blast'],
  ['tugowar', '/tugowar', 'Antonym Tug-of-War'],
  ['vowelcatcher', '/vowelcatcher', 'Vowel Catcher'],
]);

test('all 25 game routes resolve and their modules import, including the audio policy', async () => {
  await import('../src/audio/policy.js');
  assert.equal(GAME_ROUTES.length, 25);
  for (const [name, pattern, title] of GAME_ROUTES) {
    const { route } = matchRoute('#' + pattern);
    assert.equal(route?.name, name, pattern);
    assert.equal(route.title, title);
    assert.equal(route.module, `../games/${name}.view.js`);
    const mod = await import(route.module.replace('../', '../src/'));
    assert.equal(typeof mod.mount, 'function', name);
  }
});
