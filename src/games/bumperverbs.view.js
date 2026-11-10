// Game 9 — agreement bumper: only attested gender-paired verb forms are used.
import { h, heSpan } from '../shell/ui.js';
import { createSession, shuffled, loadGameImages, resultsCard, envNode, GAME_ENV, roundStatus, placeBoard } from './engine.js';
import { sfx } from '../audio/sfx.js';
import { loadJson } from '../grammar/loader.js';
export const STORE_KEY='games.bumperverbs.v1';
export function buildBumperDeck(data) {
  return (data?.pairs || []).filter(r => /present-verb|you-pronoun-verb/.test(r.grammarTag || '') &&
    r.forms?.m?.he && r.forms?.f?.he && r.forms.m.he !== r.forms.f.he)
    .map(r => ({ id:r.id, en:r.en, masculine:r.forms.m.he, feminine:r.forms.f.he, who:r.who }));
}
export function agrees(row, driver, phrase) { return driver==='ari' ? row?.masculine===phrase : driver==='noa' && row?.feminine===phrase; }
export function mount(root,ctx){
  const leaveSfx = sfx.enter(ctx);
  let alive=true,deck=[],R=null,round=0,session=createSession({store:ctx?.store,storeKey:STORE_KEY,par:6});
  const status=h('p',{role:'status',class:'game-status','aria-live':'polite'},'Loading attested agreement forms…');
  const board=h('div',{class:'game-board'});
  const article=h('article',{class:'card game-card game-bumperverbs'},h('h1',{id:'view-title'},'Verb Bumper Cars'),
    h('p',{},'Drive toward the verb phrase whose agreement matches the active character.'),
    h('p',{class:'muted'},'Forms are source records awaiting native-speaker review.'),status,board);
  root.replaceChildren(article);
  function paint(feedback){
    if(!alive||!article.isConnected)return;
    if(round>=8){
      roundStatus(status,'','Agreement race complete.');
      board.replaceChildren(resultsCard(h,heSpan,session,{title:'Agreement race complete',onAgain:()=>{round=0;session=createSession({store:ctx?.store,storeKey:STORE_KEY,par:6});paint();}}));return;}
    const row=deck[round%deck.length],driver=round%2?'noa':'ari';
    roundStatus(status,feedback,`Bumper ${round+1} of 8: match ${driver==='ari'?'Ari':'Noa'}.`);
    const dashboard=h('div',{class:'game-bumper-dashboard'},h('strong',{},driver==='ari'?'Ari':'Noa'),h('span',{},row.en));
    const choices=shuffled([row.masculine,row.feminine]).map(phrase=>h('button',{type:'button',class:'btn secondary game-choice game-bumper-car',onclick:()=>{
      const ok=agrees(row,driver,phrase);session.answer(ok); sfx.play(ok ? 'success' : 'miss');
      if(ok){round++;paint();}
      else paint('Wrong conjugation: bumper bounces away.');
    }},heSpan(phrase,'he game-he-sm')));
    placeBoard(board,envNode(h,R,GAME_ENV.bumper),dashboard,h('div',{class:'game-choices game-rtl-grid'},...choices));
  }
  Promise.all([loadJson('data/curriculum/gender-pairs.json'),loadGameImages(ctx)]).then(([data,images])=>{
    if(!alive||!article.isConnected)return;deck=shuffled(buildBumperDeck(data));R=images;
    if(deck.length<4){status.textContent='No usable attested verb-agreement pairs.';return;}paint();
  }).catch(()=>{if(alive)status.textContent='Verb agreement data unavailable.';});
  return ()=>{alive=false; leaveSfx();};
}
