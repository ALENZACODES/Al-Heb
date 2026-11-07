// Game 19 — SVO switchboard: only exact sourced paradigm word order reaches the station.
import { h, heSpan } from '../shell/ui.js';
import { createSession, shuffled, resultsCard, loadGameImages, envNode, GAME_ENV } from './engine.js';
import { sfx } from '../audio/sfx.js';
import { loadJson } from '../grammar/loader.js';
export const STORE_KEY='games.trainswitch.v1';
export function buildSvoDeck(data) {
  return (data?.paradigms || []).filter(p => ['gpar-01','gpar-03','gpar-05'].includes(p.id) &&
    p.parts?.length===3 && p.parts[0]?.fixed?.he && p.parts[1]?.m?.he &&
    p.parts[1]?.f?.he && (p.parts[2]?.fixed?.he || p.parts[2]?.m?.he))
    .flatMap(p => ['m','f'].map(gender=>({
      id:p.id+'-'+gender,gloss:p.en,
      cars:p.parts.map(part=>part.fixed?.he || part[gender]?.he)
    }))).filter(row=>row.cars.every(x=>typeof x==='string'&&x.length>0));
}
export function trainValid(row,sequence) {
  return !!row && Array.isArray(sequence)&&sequence.length===row.cars.length &&
    row.cars.every((word,i)=>sequence[i]===word);
}
export function mount(root,ctx){
  const leaveSfx = sfx.enter(ctx);
  let alive=true,deck=[],round=0,chosen=[],used=[];
  let session=createSession({store:ctx?.store,storeKey:STORE_KEY,par:5});
  const status=h('p',{class:'game-status',role:'status','aria-live':'polite'},'Loading attested sentence order…');
  const board=h('div',{class:'game-board'});
  const article=h('article',{class:'card game-card game-trainswitch'},h('h1',{id:'view-title'},'Train Track Switchboard'),
    h('p',{},'Route the subject, verb and object carriages into the documented Hebrew sentence order.'),
    h('p',{class:'muted'},'Sentences are real course records, but teaching review is pending.'),status,board);
  root.replaceChildren(article);
  // The railway-junction backdrop made for this game (approved art, decorative only —
  // never a word cue). A missing picture leaves the page as it was.
  loadGameImages(ctx).then((R) => {
    if (!alive) return;
    const env = envNode(h, R, GAME_ENV.trainswitch);
    if (env) article.insertBefore(env, status);
  }).catch(() => {});
  function paint(feedback){
    if(!alive||!article.isConnected)return;
    if(round>=deck.length){
      status.textContent='Trains reached station.';
      board.replaceChildren(resultsCard(h,heSpan,session,{title:'Trains reached station',onAgain:()=>{round=0;chosen=[];used=[];session=createSession({store:ctx?.store,storeKey:STORE_KEY,par:5});paint();}}));
      return;
    }
    const row=deck[round],cars=row.cars.map((he,i)=>({he,i}));
    status.textContent=feedback||(chosen.length?`Switchboard has ${chosen.length} carriage(s).`:`Train ${round+1} of ${deck.length}: place the carriages in documented order.`);
    const chosenCarriages=h('div',{class:'game-train-track',dir:'rtl'},...chosen.map(x=>heSpan(x.he,'he game-he-sm')));
    const buttons=shuffled(cars).map(car=>h('button',{type:'button',class:'btn secondary game-train-car',disabled:used.includes(car.i),onclick:()=>{
      if(used.includes(car.i))return;
      chosen.push(car);used.push(car.i);paint('Switchboard has '+chosen.length+' carriage(s).');
    }},heSpan(car.he,'he game-he-sm')));
    const dispatch=h('button',{type:'button',class:'btn',disabled:chosen.length!==row.cars.length,onclick:()=>{
      const ok=trainValid(row,chosen.map(x=>x.he));session.answer(ok); sfx.play(ok ? 'success' : 'miss');
      if(ok){round++;chosen=[];used=[];paint();}
      else paint('Wrong word order: train diverted.');
    }},'Send train');
    const reset=h('button',{type:'button',class:'btn secondary',onclick:()=>{chosen=[];used=[];paint();}},'Reset switches');
    // The gender paradigm has no linked lesson image ID: leave the station picture absent.
    const station=h('div',{class:'game-train-station'},h('p',{},row.gloss));
    board.replaceChildren(station,chosenCarriages,h('div',{class:'game-choices game-rtl-grid'},...buttons),dispatch,reset);
  }
  loadJson('data/curriculum/gender-pairs.json').then((data)=>{
    if(!alive||!article.isConnected)return;deck=shuffled(buildSvoDeck(data));
    if(deck.length<4){status.textContent='No source SVO paradigms with all grammatical roles.';return;}paint();
  }).catch(()=>{if(alive)status.textContent='Sentence order data unavailable.';});
  return ()=>{alive=false; leaveSfx();};
}
