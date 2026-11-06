import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRushItems, correctCollect } from '../src/games/shabbatrush.view.js';
import { checkConveyor } from '../src/games/typewriter.view.js';
import { buildClinicDeck, clinicMatches } from '../src/games/petclinic.view.js';
import { buildSvoDeck, trainValid } from '../src/games/trainswitch.view.js';
import { buildWeatherDeck, weatherMatch } from '../src/games/weatherstudio.view.js';
import { buildRentalFields, listingMatches } from '../src/games/rentalagent.view.js';
import { contrastAllowed, echoMatch } from '../src/games/echochamber.view.js';
import { buildMuseumDeck, suffixShelf } from '../src/games/museumcurator.view.js';
import { buildCadenceDeck, cadenceIsComplete } from '../src/games/karaokebeat.view.js';
import { matchRoute, tierOf } from '../src/shell/router.js';

test('runner collects only the announced category', () => {
  const rows=buildRushItems({fields:['id','he','en','topic'],rows:[
    ['food','לֶחֶם','bread','food-drink'],['home','בַּיִת','house','home-things']]});
  assert.equal(rows.length,2);
  assert.equal(correctCollect({id:'food-drink'},rows[0]),true);
  assert.equal(correctCollect({id:'food-drink'},rows[1]),false);
});
test('conveyor reuses existing Hebrew typing checker, not Latin transliteration', () => {
  assert.equal(checkConveyor('שלום','שלום'),true);
  assert.equal(checkConveyor('shalom','שלום'),false);
});
test('pet clinic selects only the sourced symptom-to-phrase link', () => {
  const data={exercises:[
    {id:'I-14-e02',type:'match',pairs:[{he:'כְּאֵב רֹאשׁ',en:'headache'}]},
    {id:'I-14-e05',type:'produce',options:['מַשֶּׁהוּ נֶגֶד כְּאֵב רֹאשׁ','מַשֶּׁהוּ נֶגֶד חֹם']},
  ]};
  const deck=buildClinicDeck(data);
  assert.equal(deck.length,1);
  assert.equal(clinicMatches(deck[0],deck[0].tool),true);
  assert.equal(clinicMatches(deck[0],'מַשֶּׁהוּ נֶגֶד חֹם'),false);
});
test('train dispatch accepts only exact source-ordered carriages', () => {
  const p={id:'gpar-01',en:'I want water',parts:[
    {fixed:{he:'אֲנִי'}},{m:{he:'רוֹצֶה'},f:{he:'רוֹצָה'}},{fixed:{he:'מַיִם'}},
  ]};
  const rows=buildSvoDeck({paradigms:[p]});
  assert.equal(rows.length,2);
  assert.equal(trainValid(rows[0],rows[0].cars),true);
  assert.equal(trainValid(rows[0],[...rows[0].cars].reverse()),false);
});
test('weather studio does not compose a new Hebrew phrase', () => {
  const data={exercises:[{id:'I-24-e03',type:'produce',en:"it's hot today",
    options:['חַם הַיּוֹם','קַר הַיּוֹם','יוֹרֵד גֶּשֶׁם'],answer:0}]};
  const rows=buildWeatherDeck(data);
  assert.equal(rows.length,1);
  assert.equal(weatherMatch(rows[0],'חַם הַיּוֹם'),true);
  assert.equal(weatherMatch(rows[0],'קַר הַיּוֹם'),false);
});
test('rental fields come only from sourced vocabulary, not missing mazgan', () => {
  const fields=buildRentalFields({words:[
    {he:'דִּירָה',en:'apartment',source:{id:'a'}},
    {he:'קוֹמָה',en:'story, floor',source:{id:'b'}}]});
  assert.equal(fields.length,2);
  assert.equal(fields.some(x=>x.id==='mazgan'),false);
  assert.equal(listingMatches({features:[fields[0]]},fields[1]),false);
});
test('echo excludes Israeli merged minimal pairs and rejects wrong IDs', () => {
  assert.equal(contrastAllowed(0,'israeli','חַךְ'),false);
  assert.equal(contrastAllowed(0,'sephardi','חַךְ'),true);
  assert.equal(echoMatch({id:'a'},{id:'b'}),false);
});
test('museum suffix categories are drawn from actual phrase glosses', () => {
  const rows=buildMuseumDeck({words:[
    {he:'כְּבוֹדוֹ',en:'his glory',source:{file:'composed'}},
    {he:'צוּרִי',en:'my rock',source:{file:'composed'}},
  ]});
  assert.equal(rows.length,2);
  assert.equal(suffixShelf(rows[0],'his'),true);
  assert.equal(suffixShelf(rows[0],'my'),false);
});
test('manual rhythm phrases are non-sacred and count exact token beats', () => {
  const row={id:'directions-10',he:'פְּנֵה יָמִינָה בְּבַקָּשָׁה',
    en:'turn right please',situation:'directions'};
  const deck=buildCadenceDeck({entries:[row,
    {id:'prayer',he:'בָּרוּךְ אַתָּה יְיָ',en:'blessed',situation:'prayer'}]});
  assert.equal(deck.length,1);
  assert.equal(cadenceIsComplete(deck[0],3),true);
  assert.equal(cadenceIsComplete(deck[0],2),false);
});
test('every additional module is a preview route, not production', () => {
  for (const slug of ['shabbatrush','typewriter','petclinic','trainswitch',
    'weatherstudio','rentalagent','echochamber','museumcurator','karaokebeat']) {
    const route=matchRoute('#/'+slug).route;
    assert.equal(route?.name,slug);
    assert.equal(route?.owner,'games');
    assert.equal(tierOf(route),'preview');
    assert.equal(route?.module,'../games/'+slug+'.view.js');
  }
});
