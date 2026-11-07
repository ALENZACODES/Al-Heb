// Game 13 — weather teleprompter uses existing authored course phrases, never composes Hebrew.
import { h, heSpan } from '../shell/ui.js';
import { createSession, shuffled, loadGameImages, imgOf, speak, resultsCard } from './engine.js';
import { sfx } from '../audio/sfx.js';
import { loadJson } from '../grammar/loader.js';
export const STORE_KEY='games.weatherstudio.v1';
export function buildWeatherDeck(lesson) {
  const art = { 'I-24-e03': 'PLACE_seasons_04', 'I-24-e04': 'PLACE_seasons_07',
    'I-24-e08': 'PLACE_seasons_04', 'I-24-e10': 'PLACE_seasons_07',
    'I-24-e12': 'PLACE_seasons_08', 'I-24-e14': 'PLACE_seasons_07' };
  return (lesson?.exercises||[]).filter(x => x.type==='produce' && x.en &&
    Array.isArray(x.options) && x.options.length>=3 && Number.isInteger(x.answer) &&
    x.options[x.answer] && art[x.id])
    .map(x=>({id:x.id,script:x.options[x.answer],en:x.en,
      options:x.options,correct:x.answer,img:{kind:'id',id:art[x.id]}}));
}
export function weatherMatch(row,choice){return !!row && row.script===choice;}
export function mount(root,ctx) {
  const leaveSfx = sfx.enter(ctx);
  let alive=true,deck=[],images=null,round=0,session=createSession({store:ctx?.store,storeKey:STORE_KEY,par:4});
  const status=h('p',{class:'game-status',role:'status','aria-live':'polite'},'Loading authentic course teleprompter phrases…');
  const board=h('div',{class:'game-board'});
  const article=h('article',{class:'card game-card game-weatherstudio'},h('h1',{id:'view-title'},'Weather Presenter Studio'),
    h('p',{},'Choose the Hebrew forecast phrase matching the presenter cue.'),
    h('p',{class:'muted'},'Phrase source: intermediate lesson I-24 (draft); corpus attestation/native review pending.'),status,board);
  root.replaceChildren(article);
  function paint(feedback) {
    if(!alive||!article.isConnected)return;
    if(round>=deck.length){
      status.textContent='Weather presentation complete.';
      board.replaceChildren(resultsCard(h,heSpan,session,{title:'Weather presentation complete',onAgain:()=>{round=0;session=createSession({store:ctx?.store,storeKey:STORE_KEY,par:4});paint();}}));
      return;
    }
    const row=deck[round],pic=imgOf(images,row.img.kind,row.img.id);
    status.textContent=feedback||`Forecast ${round+1} of ${deck.length}: choose the Hebrew line for this cue.`;
    const stage=h('div',{class:'game-weather-stage'},h('p',{},row.en));
    if(pic)stage.append(h('img',{src:pic.src,alt:pic.alt,width:pic.width,height:pic.height,class:'game-card-img','data-img-id':pic.id}));
    const options=shuffled(row.options).map(option=>h('button',{type:'button',class:'btn secondary game-choice',onclick:()=>{
      const ok=weatherMatch(row,option);session.answer(ok); sfx.play(ok ? 'success' : 'miss');
      if(ok){round++;void speak(ctx,option);paint();}
      else paint('That line describes another forecast.');
    }},heSpan(option,'he game-he-sm')));
    board.replaceChildren(stage,h('div',{class:'game-choices game-rtl-grid',dir:'rtl'},...options));
  }
  Promise.all([loadJson('data/curriculum/lessons-intermediate/I-24.json'),loadGameImages(ctx)]).then(([data,R])=>{
    if(!alive||!article.isConnected)return;deck=shuffled(buildWeatherDeck(data));images=R;
    if(deck.length<4){status.textContent='Not enough weather-language source exercises.';return;}paint();
  }).catch(()=>{if(alive)status.textContent='Weather phrases unavailable.';});
  return ()=>{alive=false; leaveSfx();};
}
