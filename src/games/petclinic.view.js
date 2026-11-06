// Game 14 — symptom phrases are matched only to source-provided language exercises.
import { h, heSpan } from '../shell/ui.js';
import { createSession, shuffled, loadGameImages, imgOf, speak, resultsCard } from './engine.js';
import { sfx } from '../audio/sfx.js';
import { loadJson } from '../grammar/loader.js';
export const STORE_KEY='games.petclinic.v1';
export function buildClinicDeck(lesson) {
  const symptoms = lesson?.exercises?.find(x => x.id === 'I-14-e02' && x.type === 'match')?.pairs || [];
  const options = lesson?.exercises?.find(x => x.id === 'I-14-e05' && x.type === 'produce')?.options || [];
  // Every answer phrase is copied verbatim from the source lesson. An option may
  // describe one symptom only; never construct medical claims or invented treatments.
  return symptoms.map(pair => {
    const matches = options.filter(option => typeof option === 'string' && option.includes(pair.he));
    return matches.length === 1 ? { id: pair.he, symptom: pair.he, en: pair.en, tool: matches[0] } : null;
  }).filter(Boolean);
}
export function clinicMatches(caseItem,toolPhrase) {
  return !!caseItem && caseItem.tool===toolPhrase && toolPhrase.includes(caseItem.symptom);
}
export const ANIMALS=Object.freeze(['STORY_noah_01','STORY_noah_02','STORY_noah_03']);
export function mount(root,ctx) {
  const leaveSfx = sfx.enter(ctx);
  let alive=true,deck=[],images=null,round=0,session=createSession({store:ctx?.store,storeKey:STORE_KEY,par:3});
  const status=h('p',{class:'game-status',role:'status','aria-live':'polite'},'Loading symptom-language case records…');
  const board=h('div',{class:'game-board'});
  const article=h('article',{class:'card game-card game-petclinic'},h('h1',{id:'view-title'},'Pet Clinic Helper'),
    h('p',{},'Language role-play only: match a Hebrew symptom to its exact source exercise phrase. Not veterinary advice.'),
    h('p',{class:'muted'},'Source lesson is an unreviewed teaching draft.'),status,board);
  root.replaceChildren(article);
  function paint(){
    if(!alive||!article.isConnected)return;
    if(round>=deck.length){board.replaceChildren(resultsCard(h,heSpan,session,{title:'Clinic language practice complete',onAgain:()=>{round=0;session=createSession({store:ctx?.store,storeKey:STORE_KEY,par:3});paint();}}));return;}
    const caseItem=deck[round],picture=imgOf(images,'id',ANIMALS[round%ANIMALS.length]);
    const scene=h('div',{class:'game-clinic-scene'},picture?h('img',{src:picture.src,alt:picture.alt,width:picture.width,height:picture.height,class:'game-card-img','data-img-id':picture.id}):null);
    const options=shuffled(deck.map(x=>x.tool)).map(phrase=>h('button',{type:'button',class:'btn secondary game-choice',onclick:()=>{
      const ok=clinicMatches(caseItem,phrase);session.answer(ok); sfx.play(ok ? 'success' : 'miss');
      status.textContent=ok?'Phrase matches the actual source symptom.':'That phrase refers to a different symptom.';
      if(ok){round++;void speak(ctx,caseItem.symptom);}paint();
    }},heSpan(phrase,'he game-he-sm')));
    board.replaceChildren(scene,h('p',{},'Match the Hebrew phrase for: '+caseItem.en),
      h('div',{class:'game-choices game-rtl-grid'},...options));
  }
  Promise.all([loadJson('data/curriculum/lessons-intermediate/I-14.json'),loadGameImages(ctx)]).then(([data,R])=>{
    if(!alive||!article.isConnected)return;deck=shuffled(buildClinicDeck(data));images=R;
    if(deck.length<3){status.textContent='Missing exact symptom/phrase pairs; no cases generated.';return;}paint();
  }).catch(()=>{if(alive)status.textContent='Symptom phrases unavailable.';});
  return ()=>{alive=false; leaveSfx();};
}
