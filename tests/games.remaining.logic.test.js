import test from 'node:test';
import assert from 'node:assert/strict';
import { buildArchDeck, acceptStroke } from '../src/games/archbuilder.view.js';
import { hebrewLetters, correctBeamPath } from '../src/games/lasermaze.view.js';
import { buildRootDeck, isRootLeaf } from '../src/games/roottree.view.js';
import { pluralSuffix, buildBridgeDeck, bridgeHolds } from '../src/games/letterbridge.view.js';
import { buildShadowDeck, shadowMatches } from '../src/games/shadowcraft.view.js';
import { buildCipherDeck, matchCipher } from '../src/games/ciphergrid.view.js';
import { buildTaxiDeck, isTaxiSign } from '../src/games/shuktaxi.view.js';
import { buildNumerals, validOffer } from '../src/games/barter.view.js';
import { buildSonarDeck, gateMatches } from '../src/games/submarinesonar.view.js';
import { rhymeKey, rhymes } from '../src/games/rhymelab.view.js';
import { buildBumperDeck, agrees } from '../src/games/bumperverbs.view.js';
import { matchRoute, tierOf } from '../src/shell/router.js';

test('arch locks only the exact sourced stroke at the current position', () => {
  const deck = buildArchDeck([{ id:'dalet', he:'ד', name:'Dalet',
    print:{strokes:[{path:'M1 2'},{path:'M3 4'}]} }]);
  assert.equal(deck.length,1);
  assert.equal(acceptStroke(deck[0],'dalet:0',0),true);
  assert.equal(acceptStroke(deck[0],'dalet:1',0),false);
  assert.equal(acceptStroke(deck[0],'dalet:0',1),false);
});
test('laser path follows source RTL letter order; mirror reversal fails', () => {
  assert.deepEqual(hebrewLetters('שָׁלוֹם'),['ש','ל','ו','ם']);
  assert.equal(correctBeamPath('שָׁלוֹם',['ש','ל','ו','ם']),true);
  assert.equal(correctBeamPath('שָׁלוֹם',['ם','ו','ל','ש']),false);
});
test('root tree accepts only literal source membership', () => {
  const f = {root:'כ־ת־ב',words:[
    {id:'a',he:'כָּתַב',pos:'verb',binyan:'paal',needsReview:false},
    {id:'b',he:'כּוֹתֵב',pos:'verb',binyan:'paal',needsReview:false}]};
  const deck = buildRootDeck({families:[f]});
  assert.equal(deck.length,1);
  assert.equal(isRootLeaf(deck[0],{id:'a'}),true);
  assert.equal(isRootLeaf(deck[0],{id:'forged'}),false);
});
test('bridge uses attested plural suffix and rejects a mismatched joint', () => {
  const deck = buildBridgeDeck({families:[{words:[{id:'n',pos:'noun',he:'סֵפֶר',
    en:'book',needsReview:false,forms:{plural:'סְפָרִים'}}]}]});
  assert.equal(pluralSuffix('סְפָרִים'),'im');
  assert.equal(bridgeHolds(deck[0],'im'),true);
  assert.equal(bridgeHolds(deck[0],'ot'),false);
});
test('shadow choices are the real selected letter IDs', () => {
  const letters=[{id:'kaf',he:'כ',name:'Kaf'},{id:'tav',he:'ת',name:'Tav'},{id:'bet',he:'ב',name:'Bet'}];
  const deck = buildShadowDeck(letters,{families:[{root:'כ־ת־ב'}]});
  assert.equal(deck.length,3);
  assert.equal(shadowMatches(deck[0],deck[0]),true);
  assert.equal(shadowMatches(deck[0],deck[1]),false);
});
test('cipher selects actual public-domain source records, not made-up text', () => {
  const deck=buildCipherDeck({entries:[{id:'shema',he:'שְׁמַע',status:'verified',license:'Public Domain'},
    {id:'bad',he:'שְׁמַע',status:'draft',license:'unknown'}]});
  assert.equal(deck.length,1);
  assert.equal(matchCipher(deck[0],'שְׁמַע'),true);
  assert.equal(matchCipher(deck[0],'שַׁמַע'),false);
});
test('taxi signs must match attested direction record ID', () => {
  const data={entries:[{id:'directions-05',he:'יָשָׁר',en:'straight ahead',situation:'directions'},
    {id:'directions-07',he:'יָמִינָה',en:'right',situation:'directions'}]};
  const deck=buildTaxiDeck(data);
  assert.equal(deck.length,2);
  assert.equal(isTaxiSign(deck[0],deck[1]),false);
});
test('barter price parsing and haggle arithmetic are exact', () => {
  const items=buildNumerals({entries:[
    {id:'numbers-01',he:'אֶחָד',en:'one (1)',situation:'numbers'},
    {id:'numbers-02',he:'שְׁנַיִם',en:'two (2)',situation:'numbers'}]});
  assert.deepEqual(items.map(x=>x.n),[1,2]);
  assert.equal(validOffer(20,10,10),true);
  assert.equal(validOffer(20,30,10),false);
  assert.equal(validOffer(20,11,10),false);
});
test('sonar gates distinguish pointed homographs by exact record', () => {
  const groups=buildSonarDeck({fields:['id','he','heUnpointed','en'],rows:[
    ['a','אֵת','את','direct object'],['b','אַתְּ','את','you']]});
  assert.equal(groups.length,1);
  assert.equal(gateMatches(groups[0][0],groups[0][1]),false);
});
test('rhyme keys derive only from attested transliteration strings', () => {
  assert.equal(rhymeKey('shalom'),'om');
  assert.equal(rhymeKey('yom'),'om');
  assert.equal(rhymes({id:'a',key:'om'},{id:'b',key:'om'}),true);
  assert.equal(rhymes({id:'a',key:'om'},{id:'b',key:'an'}),false);
});
test('bumper uses attested gender-labelled verb phrases', () => {
  const deck=buildBumperDeck({pairs:[{id:'gp-04',grammarTag:'present-verb',who:'speaker',
    forms:{m:{he:'אֲנִי רוֹצֶה'},f:{he:'אֲנִי רוֹצָה'}}}]});
  assert.equal(deck.length,1);
  assert.equal(agrees(deck[0],'ari','אֲנִי רוֹצֶה'),true);
  assert.equal(agrees(deck[0],'ari','אֲנִי רוֹצָה'),false);
});
test('new routes are preview-only and separate from Wave 1', () => {
  for (const slug of ['archbuilder','lasermaze','roottree','letterbridge','shadowcraft','ciphergrid','shuktaxi','barter','submarinesonar','rhymelab','bumperverbs']) {
    const r=matchRoute('#/'+slug);
    assert.equal(r.route?.owner,'games');
    assert.equal(tierOf(r.route),'preview');
    assert.equal(r.route?.module,'../games/'+slug+'.view.js');
  }
});
