import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { bare, trayFor, wordsFor, levelFor, tokensFor, clipFor, phonetics, recordWord } from '../src/home/builder-model.js';
import { createSession } from '../src/games/engine.js';
import { settleAwards } from '../src/awards/eligibility.js';
const read = p => JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const words=read('data/builder_words.json'), symbols=read('data/builder_symbols.json');
test('every word has complete learner fields, unique spelling and the correct letters',()=>{
  assert.ok(words.length>=100);
  assert.ok(words.filter(w=>w.letters.length===3).length>=40);
  assert.equal(new Set(words.map(w=>w.hebrew)).size,words.length);
  for(const w of words) {
    for(const field of ['hebrew','nikud','translit_israeli','translit_sephardi','translit_ashkenazi','meaning_en','audio_ari','audio_noa']) assert.ok(w[field],w.id+' '+field);
    assert.equal(bare(w.nikud),w.hebrew);
    assert.deepEqual(w.letters,[...w.hebrew]);
    assert.equal(w.level,levelFor(w.hebrew));
  }
});
test('progressive trays can build every offered word and all vowel marks',()=>{
  assert.equal(trayFor(1).length,8);
  assert.equal(new Set(trayFor(3)).size,27);
  assert.equal(symbols.letters.length,27);
  for(let level=1;level<=5;level++) for(const w of wordsFor(words,level)) {
    assert.ok(w.letters.every(c=>trayFor(level).includes(c)),w.hebrew);
    if(level===1) assert.ok(w.letters.length>=2 && w.letters.length<=3);
    for(const t of tokensFor(w,true)) assert.ok([...symbols.letters,...symbols.marks].some(s=>s.glyph===t),w.id+' '+t);
  }
});
test('phonetic preference never changes the chosen audio and normal voice mapping',()=>{
  const w=words.find(w=>w.hebrew==='שלום');
  assert.notEqual(phonetics(w,'israeli'),phonetics(w,'ashkenazi'));
  for(const t of ['israeli','sephardi','ashkenazi']) { phonetics(w,t);assert.equal(clipFor(w,'m'),w.audio_ari);assert.equal(clipFor(w,'f'),w.audio_noa); }
});
test('completed words count once and use the existing first-attempt award',()=>{
  const data=new Map(),store={get:k=>data.get(k),set:(k,v)=>data.set(k,v),persistent:true};
  const session=createSession({store,storeKey:'games.homebuilder.v1',par:1});session.answer(true);
  assert.equal(recordWord(store,words[0],session.score).fresh,true);
  session.saveBest();
  assert.ok(settleAwards(store,null,Date.now()).newly.includes('yolo'));
  assert.equal(recordWord(store,words[0],session.score).fresh,false);
  assert.equal(data.get('home.builder.v1').points,10);
});
test('a corrected answer does not earn a perfect first-attempt badge',()=>{
  const data=new Map(),store={get:k=>data.get(k),set:(k,v)=>data.set(k,v),persistent:true};
  const session=createSession({store,storeKey:'games.homebuilder.v1',par:2});session.answer(true);session.saveBest();
  assert.ok(!settleAwards(store,null,Date.now()).newly.includes('yolo'));
});
