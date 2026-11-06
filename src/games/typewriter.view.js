// Game 5 — conveyor typing reuses the app's SI-1452 keyboard deck builder and checker.
import { h, heSpan } from '../shell/ui.js';
import { createSession, shuffled, loadGameImages, imgOf, resultsCard } from './engine.js';
import { loadJson } from '../grammar/loader.js';
import { screenRows, buildRound, checkAnswer } from '../typing/typing.js';
export const STORE_KEY='games.typewriter.v1';
export function buildConveyorDeck(drills,layout) {
  return buildRound('words',drills,layout,{size:8}).filter(x=>x.id && x.prompt && x.answer);
}
export function checkConveyor(typed,answer) { return checkAnswer(typed,answer).ok; }
export function mount(root,ctx) {
  let alive=true,deck=[],R=null,round=0,layout=null;
  let session=createSession({store:ctx?.store,storeKey:STORE_KEY,par:6});
  const status=h('p',{class:'game-status',role:'status','aria-live':'polite'},'Loading shared Hebrew keyboard deck…');
  const board=h('div',{class:'game-board'});
  const article=h('article',{class:'card game-card game-typewriter'},h('h1',{id:'view-title'},'Typewriter Conveyor Belt'),
    h('p',{},'Type exactly the Hebrew letters shown on each moving word box.'),status,board);
  root.replaceChildren(article);
  function paint(){
    if(!alive||!article.isConnected)return;
    if(round>=deck.length){board.replaceChildren(resultsCard(h,heSpan,session,{title:'Conveyor cleared',onAgain:()=>{round=0;session=createSession({store:ctx?.store,storeKey:STORE_KEY,par:6});paint();}}));return;}
    const item=deck[round],picture=imgOf(R,'word',item.id);
    const box=h('div',{class:'game-conveyor-box'},heSpan(item.prompt,'he game-he'));
    if(picture)box.append(h('img',{src:picture.src,alt:picture.alt,width:picture.width,height:picture.height,class:'game-card-img','data-img-id':picture.id}));
    const input=h('input',{type:'text',lang:'he',dir:'rtl',autocomplete:'off',spellcheck:false,'aria-label':'Enter the Hebrew word'});
    const keyboard=h('div',{class:'game-typewriter-keyboard'},...screenRows(layout).map(row=>
      h('div',{class:'game-typewriter-row'},...row.map(key=>
        h('button',{type:'button',class:'game-typewriter-key',onclick:()=>{input.value+=key.char;input.focus();}},
          heSpan(key.char),h('small',{},key.qwerty))))));
    const submit=()=>{
      const ok=checkConveyor(input.value,item.answer);session.answer(ok);
      status.textContent=ok?'Correct Hebrew typed: box packed.':'Not the same Hebrew letters. Try again.';
      if(ok)round++;paint();
    };
    input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();submit();}});
    board.replaceChildren(h('div',{class:'game-conveyor-track'},box),input,
      h('button',{type:'button',class:'btn',onclick:submit},'Send box'),keyboard);
    status.textContent='Box '+(round+1)+' of '+deck.length+' · Score '+session.score;
  }
  Promise.all([loadJson('data/typing/drills.json'),loadJson('data/letters/keyboard-si1452.json'),loadGameImages(ctx)]).then(([drills,kb,images])=>{
    if(!alive||!article.isConnected)return;layout=kb;R=images;deck=buildConveyorDeck(drills,kb);
    if(deck.length<5||!screenRows(kb).flat().length){status.textContent='Shared SI-1452 keyboard data unavailable.';return;}
    paint();
  }).catch(()=>{if(alive)status.textContent='Typing deck unavailable.';});
  return ()=>{alive=false;};
}
