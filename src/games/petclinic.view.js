// Game 14 — symptom phrases are matched only to source-provided language exercises.
import { h, heSpan } from '../shell/ui.js';
import { createSession, shuffled, speak, resultsCard, loadGameImages, envNode, GAME_ENV } from './engine.js';
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
export function mount(root,ctx) {
  const leaveSfx = sfx.enter(ctx);
  let alive=true,deck=[],round=0,session=createSession({store:ctx?.store,storeKey:STORE_KEY,par:3});
  const status=h('p',{class:'game-status',role:'status','aria-live':'polite'},'Loading symptom-language case records…');
  const board=h('div',{class:'game-board'});
  const article=h('article',{class:'card game-card game-petclinic'},h('h1',{id:'view-title'},'Pet Clinic Helper'),
    h('p',{},'Language role-play only: match a Hebrew symptom to its exact source exercise phrase. Not veterinary advice.'),
    status,board);
  root.replaceChildren(article);
  // The clinic-room backdrop made for this game (approved art, decorative only —
  // never a word cue). A missing picture leaves the page as it was.
  loadGameImages(ctx).then((R) => {
    if (!alive) return;
    const env = envNode(h, R, GAME_ENV.petclinic);
    if (env) article.insertBefore(env, status);
  }).catch(() => {});
  function paint(feedback){
    if(!alive||!article.isConnected)return;
    if(round>=deck.length){
      status.textContent='Clinic language practice complete.';
      board.replaceChildren(resultsCard(h,heSpan,session,{title:'Clinic language practice complete',onAgain:()=>{round=0;session=createSession({store:ctx?.store,storeKey:STORE_KEY,par:3});paint();}}));
      return;
    }
    const caseItem=deck[round];
    status.textContent=feedback||`Case ${round+1} of ${deck.length}: match the phrase for ${caseItem.en}.`;
    const options=shuffled(deck.map(x=>x.tool)).map(phrase=>h('button',{type:'button',class:'btn secondary game-choice',onclick:()=>{
      const ok=clinicMatches(caseItem,phrase);session.answer(ok); sfx.play(ok ? 'success' : 'miss');
      if(ok){round++;void speak(ctx,caseItem.symptom);paint();}
      else paint('That phrase refers to a different symptom.');
    }},heSpan(phrase,'he game-he-sm')));
    board.replaceChildren(h('p',{class:'game-clinic-cue'},'Match the Hebrew phrase for: '+caseItem.en),
      h('div',{class:'game-choices game-rtl-grid'},...options));
  }
  loadJson('data/curriculum/lessons-intermediate/I-14.json').then((data)=>{
    if(!alive||!article.isConnected)return;deck=shuffled(buildClinicDeck(data));
    if(deck.length<3){status.textContent='Missing exact symptom/phrase pairs; no cases generated.';return;}paint();
  }).catch(()=>{if(alive)status.textContent='Symptom phrases unavailable.';});
  return ()=>{alive=false; leaveSfx();};
}
