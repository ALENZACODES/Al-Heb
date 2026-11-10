// Game 11 — Shuk Taxi: road signs use only attested Hebrew direction phrases.
import { h, heSpan } from '../shell/ui.js';
import { createSession, shuffled, loadGameImages, speak, resultsCard, envNode, GAME_ENV, roundStatus } from './engine.js';
import { sfx } from '../audio/sfx.js';
import { loadJson } from '../grammar/loader.js';
export const STORE_KEY = 'games.shuktaxi.v1';
export function buildTaxiDeck(data) {
  const ids = new Set(['directions-05','directions-06','directions-07','directions-08','directions-09','directions-10']);
  return (data?.entries || []).filter(r => ids.has(r.id) && r.he && r.en && r.situation === 'directions');
}
export function isTaxiSign(prompt, sign) { return prompt?.id === sign?.id; }
/** The street is the taxi environment picture. Place stills are not substituted for it. */
export function mount(root, ctx) {
  const leaveSfx = sfx.enter(ctx);
  let alive = true, deck = [], images = null, round = 0, session = createSession({ store:ctx?.store,storeKey:STORE_KEY,par:6 });
  const status = h('p',{class:'game-status',role:'status','aria-live':'polite'},'Loading direction signs…');
  const board=h('div',{class:'game-board'});
  const article=h('article',{class:'card game-card game-shuktaxi'},h('h1',{id:'view-title'},'Shuk Taxi Driver'),
    h('p',{},'Read the Hebrew direction on your journey. The street signs have no English overlay.'),status,board);
  root.replaceChildren(article);
  function paint(feedback){
    if(!alive||!article.isConnected)return;
    if(round>=8){
      roundStatus(status,'','Taxi arrived.');
      board.replaceChildren(resultsCard(h,heSpan,session,{title:'Taxi arrived',onAgain:()=>{round=0;session=createSession({store:ctx?.store,storeKey:STORE_KEY,par:6});paint();}}));return;}
    const wanted=deck[round%deck.length];
    roundStatus(status,feedback,`Junction ${round+1} of 8: follow the Hebrew sign.`);
    const stage=h('div',{class:'game-taxi-road'},envNode(h,images,GAME_ENV.taxi));
    const opts=shuffled([wanted,...shuffled(deck.filter(r=>r.id!==wanted.id)).slice(0,2)]);
    const buttons=opts.map(sign=>h('button',{type:'button',class:'btn secondary game-choice',onclick:()=>{
      if(!alive)return;const ok=isTaxiSign(wanted,sign);session.answer(ok); sfx.play(ok ? 'success' : 'miss');
      if(ok){round++;void speak(ctx,sign.he);paint();}
      else paint('Wrong sign: return to the junction.');
    }},heSpan(sign.he,'he game-he-sm')));
    board.replaceChildren(stage,h('div',{class:'game-taxi-dashboard'},h('span',{},'Follow this direction: '+wanted.en)),
      h('div',{class:'game-choices game-rtl-grid',dir:'rtl'},...buttons));
  }
  Promise.all([loadJson('data/corpus/phrasebook.json'),loadGameImages(ctx)]).then(([data,R])=>{
    if(!alive||!article.isConnected)return;deck=shuffled(buildTaxiDeck(data));images=R;
    if(deck.length<3){status.textContent='Insufficient real direction signs.';return;}paint();
  }).catch(()=>{if(alive)status.textContent='Directions unavailable.';});
  return ()=>{alive=false; leaveSfx();};
}
