// Game 12 — shop arithmetic from numerals attested in the app's phrasebook.
import { h, heSpan } from '../shell/ui.js';
import { createSession, shuffled, loadGameImages, imgOf, speak, resultsCard } from './engine.js';
import { loadJson } from '../grammar/loader.js';
export const STORE_KEY = 'games.barter.v1';
export function buildNumerals(data) {
  return (data?.entries || []).filter(r => r.situation === 'numbers' && /^numbers-\d+$/.test(r.id) &&
    /^.+\((\d+)\)$/.test(r.en || '') && r.he).map(r => ({ ...r, n: Number(/\((\d+)\)$/.exec(r.en)[1]) }))
    .filter(r => r.n >= 1 && r.n <= 100 && Number.isInteger(r.n));
}
export function validOffer(asking, offer, budget) {
  return Number.isInteger(asking) && Number.isInteger(offer) && Number.isInteger(budget) &&
    offer < asking && offer > 0 && offer === budget;
}
export const GOODS = Object.freeze(['CTX_food_01','CTX_food_02','CTX_food_03','CTX_food_04']);
export function mount(root,ctx){
  let alive=true,deck=[],R=null,round=0,session=createSession({store:ctx?.store,storeKey:STORE_KEY,par:6});
  const status=h('p',{class:'game-status',role:'status','aria-live':'polite'},'Loading Hebrew numerals…');
  const board=h('div',{class:'game-board'});
  const article=h('article',{class:'card game-card game-barter'},h('h1',{id:'view-title'},'The Israeli Flea Market Barter'),
    h('p',{},'Read the Hebrew number. Make a counteroffer at your exact budget, below the asking price.'),status,board);
  root.replaceChildren(article);
  function paint(){
    if(!alive||!article.isConnected)return;
    if(round>=8){board.replaceChildren(resultsCard(h,heSpan,session,{title:'Market bargains finished',onAgain:()=>{round=0;session=createSession({store:ctx?.store,storeKey:STORE_KEY,par:6});paint();}}));return;}
    const ask=deck.filter(x=>x.n>=10)[round%deck.filter(x=>x.n>=10).length];
    const sorted=deck.filter(x=>x.n<ask.n).sort((a,b)=>a.n-b.n);
    const target=sorted[Math.max(0,sorted.length-2)],budget=target.n;
    const picture=imgOf(R,'id',GOODS[round%GOODS.length]);
    const stage=h('div',{class:'game-barter-stall'},picture?h('img',{src:picture.src,alt:picture.alt,class:'game-card-img',width:picture.width,height:picture.height,'data-img-id':picture.id}):null);
    const options=shuffled([target,ask,...sorted.filter(x=>x.n>target.n).slice(0,1)]);
    const buttons=options.map(x=>h('button',{type:'button',class:'btn secondary game-choice',onclick:()=>{
      const ok=validOffer(ask.n,x.n,budget);session.answer(ok);
      status.textContent=ok?'Discount is within budget. Deal accepted.':'Counteroffer must equal your budget and undercut the asking price.';
      if(ok){round++;void speak(ctx,x.he);}paint();
    }},heSpan(x.he,'he game-he-sm')));
    board.replaceChildren(stage,h('p',{},'Asking price: ',heSpan(ask.he), ' ('+ask.n+' ₪)'),
      h('p',{},'Your counteroffer budget: '+budget+' ₪'),h('div',{class:'game-choices'},...buttons));
  }
  Promise.all([loadJson('data/corpus/phrasebook.json'),loadGameImages(ctx)]).then(([data,images])=>{
    if(!alive||!article.isConnected)return;deck=buildNumerals(data);R=images;
    if(deck.length<8 || !deck.some(x=>x.n>=10)){status.textContent='Real numeral source is incomplete.';return;}paint();
  }).catch(()=>{if(alive)status.textContent='Number words unavailable.';});
  return ()=>{alive=false;};
}
