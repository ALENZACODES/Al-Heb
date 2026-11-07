import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Doc, El } from './wordtrace.fakedom.js';
import { buildClinicDeck, mount as mountPet } from '../src/games/petclinic.view.js';
import { buildCipherDeck, mount as mountCipher } from '../src/games/ciphergrid.view.js';
import { buildSvoDeck, mount as mountTrain } from '../src/games/trainswitch.view.js';
import { buildWeatherDeck, mount as mountWeather } from '../src/games/weatherstudio.view.js';
import { buildRentalFields, mount as mountRental } from '../src/games/rentalagent.view.js';
import { buildMuseumDeck, mount as mountMuseum } from '../src/games/museumcurator.view.js';
import { mount as mountArch } from '../src/games/archbuilder.view.js';

function environment() {
  const doc = new Doc();
  globalThis.document = doc;
  El.prototype.append = function (...nodes) { for (const n of nodes) this.appendChild(typeof n === 'object' ? n : doc.createTextNode(String(n))); };
  El.prototype.replaceChildren = function (...nodes) { this.textContent = ''; this.append(...nodes); };
  Object.defineProperty(El.prototype, 'isConnected', { configurable: true, get: () => true });
  globalThis.window = { addEventListener() {}, removeEventListener() {} };
  return doc.createElement('main');
}
const flush = async (f) => {
  for (let n = 0; n < 40 && !f(); n++) await new Promise((r) => setTimeout(r, 20));
  assert.ok(f(), 'view became ready');
};
const statusOf = (root) => root.querySelector('.game-status').textContent;
const json = (p) => JSON.parse(readFileSync(new URL('../' + p, import.meta.url), 'utf8'));

test('pet clinic drops the previous match line and does not use Noah art', async () => {
  const root = environment();
  const deck = buildClinicDeck(json('data/curriculum/lessons-intermediate/I-14.json'));
  const stop = mountPet(root, { images: { resolve: () => ({ src: 'assets/img/gen/STORY_noah_01.webp', alt: 'ark', id: 'STORY_noah_01' }) } });
  await flush(() => root.querySelector('.game-choice'));
  assert.equal(root.querySelectorAll('img').length, 0);
  assert.doesNotMatch(root.textContent, /STORY_noah|Noah/);
  const cue = () => root.querySelector('.game-clinic-cue').textContent.replace('Match the Hebrew phrase for: ', '');
  const first = deck.find((item) => item.en === cue());
  assert.match(statusOf(root), new RegExp(`Case 1 of ${deck.length}: match the phrase for ${first.en}`));
  assert.doesNotMatch(statusOf(root), /Loading|Phrase matches/);
  [...root.querySelectorAll('.game-choice')].find((b) => b.textContent !== first.tool).click();
  assert.equal(statusOf(root), 'That phrase refers to a different symptom.');
  assert.equal(cue(), first.en);
  [...root.querySelectorAll('.game-choice')].find((b) => b.textContent === first.tool).click();
  const next = cue();
  assert.notEqual(next, first.en);
  assert.match(statusOf(root), new RegExp(`Case 2 of ${deck.length}: match the phrase for ${next}`));
  assert.doesNotMatch(statusOf(root), /Phrase matches/);
  for (let n = 0; n < deck.length && !root.querySelector('.game-results'); n++) {
    const item = deck.find((row) => row.en === cue());
    [...root.querySelectorAll('.game-choice')].find((b) => b.textContent === item.tool).click();
  }
  assert.match(statusOf(root), /Clinic language practice complete/);
  [...root.querySelectorAll('button')].find((b) => b.textContent === 'Play again').click();
  assert.match(statusOf(root), /Case 1 of /);
  assert.doesNotMatch(statusOf(root), /Phrase matches|Loading|complete/);
  stop();
});

test('cipher replaces the loading line and does not keep the previous success', async () => {
  const root = environment();
  const deck = buildCipherDeck(json('data/corpus/registry.json'));
  const stop = mountCipher(root);
  await flush(() => root.querySelector('.game-choice'));
  assert.match(statusOf(root), /Line 1 of 8: choose the pointed source/);
  assert.doesNotMatch(statusOf(root), /Loading/);
  const shown = root.querySelector('.game-cipher-prompt').textContent;
  const choices = [...root.querySelectorAll('.game-choice')].map((b) => b.textContent);
  const row = deck.find((item) => item.unpointed === shown && choices.includes(item.he));
  assert.ok(row);
  [...root.querySelectorAll('.game-choice')].find((b) => b.textContent !== row.he).click();
  assert.equal(statusOf(root), 'Those points do not match this source line.');
  [...root.querySelectorAll('.game-choice')].find((b) => b.textContent === row.he).click();
  assert.match(statusOf(root), /Line 2 of 8/);
  assert.doesNotMatch(statusOf(root), /Exact pointed source restored|Loading/);
  [...root.querySelectorAll('button')].find((b) => b.textContent === 'Play again')?.click();
  stop();
});

test('train and weather replace the loading line and do not keep the previous success', async () => {
  const trainRoot = environment();
  const trains = buildSvoDeck(json('data/curriculum/gender-pairs.json'));
  const stopTrain = mountTrain(trainRoot);
  await flush(() => trainRoot.querySelector('.game-train-car'));
  assert.match(statusOf(trainRoot), /Train 1 of \d+: place the carriages/);
  assert.doesNotMatch(statusOf(trainRoot), /Loading/);
  const station = trainRoot.querySelector('.game-train-station');
  assert.ok(station);
  const gloss = station.textContent;
  const unused = () => [...trainRoot.querySelectorAll('.game-train-car')].filter((b) => b.getAttribute('disabled') == null);
  const shown = unused().map((b) => b.textContent);
  const row = trains.find((item) => item.gloss === gloss && item.cars.length === shown.length && item.cars.every((word) => shown.includes(word)));
  assert.ok(row, 'the train on screen is one of the sourced rows');
  for (const word of row.cars) unused().find((b) => b.textContent === word).click();
  [...trainRoot.querySelectorAll('button')].find((b) => b.textContent === 'Send train').click();
  assert.match(statusOf(trainRoot), /Train 2 of /);
  assert.doesNotMatch(statusOf(trainRoot), /Canonical SVO|Loading/);
  stopTrain();

  const weatherRoot = environment();
  const forecasts = buildWeatherDeck(json('data/curriculum/lessons-intermediate/I-24.json'));
  const stopWeather = mountWeather(weatherRoot, { images: { resolve: () => null } });
  await flush(() => weatherRoot.querySelector('.game-choice'));
  assert.match(statusOf(weatherRoot), /Forecast 1 of \d+: choose the Hebrew line/);
  assert.doesNotMatch(statusOf(weatherRoot), /Loading/);
  const en = weatherRoot.querySelector('.game-weather-stage').textContent;
  const forecast = forecasts.find((item) => item.en === en);
  [...weatherRoot.querySelectorAll('.game-choice')].find((b) => b.textContent !== forecast.script).click();
  assert.equal(statusOf(weatherRoot), 'That line describes another forecast.');
  [...weatherRoot.querySelectorAll('.game-choice')].find((b) => b.textContent === forecast.script).click();
  assert.match(statusOf(weatherRoot), /Forecast 2 of /);
  assert.doesNotMatch(statusOf(weatherRoot), /Correct source script|Loading/);
  stopWeather();
});

test('rental, museum, and arch clear the previous success when the next board appears', async () => {
  const rentalRoot = environment();
  const fields = buildRentalFields(json('data/curriculum/lessons-intermediate/I-17.json'));
  const stopRental = mountRental(rentalRoot, { images: { resolve: () => null } });
  await flush(() => rentalRoot.querySelector('.game-rental-listing'));
  const find = () => rentalRoot.querySelector('.game-rental-requirement').textContent.replace('Find: ', '');
  assert.match(statusOf(rentalRoot), new RegExp(`Listing 1 of 8: find ${find()}`));
  assert.doesNotMatch(statusOf(rentalRoot), /Loading|satisfies/);
  const feature = fields.find((row) => row.en === find());
  [...rentalRoot.querySelectorAll('.game-rental-listing')].find((b) => b.textContent !== feature.he).click();
  assert.equal(statusOf(rentalRoot), 'Listing lacks that Hebrew feature.');
  [...rentalRoot.querySelectorAll('.game-rental-listing')].find((b) => b.textContent === feature.he).click();
  assert.match(statusOf(rentalRoot), /Listing 2 of 8: find /);
  assert.doesNotMatch(statusOf(rentalRoot), /satisfies|Loading/);
  stopRental();

  const museumRoot = environment();
  const exhibits = buildMuseumDeck(json('data/curriculum/lessons-intermediate/I-27.json'));
  const stopMuseum = mountMuseum(museumRoot, { images: { resolve: () => null } });
  await flush(() => museumRoot.querySelector('.game-museum-shelf'));
  assert.match(statusOf(museumRoot), /Exhibit 1 of /);
  assert.equal(museumRoot.querySelectorAll('img').length, 0);
  const he = museumRoot.querySelector('.game-museum-artifact').textContent;
  const item = exhibits.find((row) => row.he === he);
  [...museumRoot.querySelectorAll('.game-museum-shelf')].find((b) => b.textContent !== item.owner).click();
  assert.equal(statusOf(museumRoot), 'Incorrect possessive suffix shelf.');
  [...museumRoot.querySelectorAll('.game-museum-shelf')].find((b) => b.textContent === item.owner).click();
  assert.match(statusOf(museumRoot), /Exhibit 2 of /);
  assert.doesNotMatch(statusOf(museumRoot), /correct shelf|Loading/);
  stopMuseum();

  const archRoot = environment();
  const stopArch = mountArch(archRoot, { images: { resolve: () => null } });
  await flush(() => archRoot.querySelector('.game-choice'));
  assert.match(statusOf(archRoot), /Letter 1 of 8, stroke 1 of /);
  assert.doesNotMatch(statusOf(archRoot), /Loading|Correct stroke/);
  let advanced = false;
  for (let n = 0; n < 8 && !advanced; n++) {
    const buttons = [...archRoot.querySelectorAll('.game-choice')];
    const before = archRoot.querySelector('p').textContent;
    buttons[n % buttons.length].click();
    const after = statusOf(archRoot);
    if (/Letter 1 of 8, stroke [2-9]/.test(after) || /Letter 2 of 8/.test(after)) {
      advanced = true;
      assert.doesNotMatch(after, /Correct stroke locked/);
      assert.notEqual(before, after);
    }
  }
  assert.equal(advanced, true);
  stopArch();
});
