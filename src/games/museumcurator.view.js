// Game 18 — suffix categories follow actual inflected phrases in the existing Torah-reading lesson.
import { h, heSpan } from '../shell/ui.js';
import { createSession, shuffled, loadGameImages, imgOf, speak, resultsCard } from './engine.js';
import { sfx } from '../audio/sfx.js';
import { loadJson } from '../grammar/loader.js';
export const STORE_KEY='games.museumcurator.v1';
export function buildMuseumDeck(lesson) {
  const owners=['my','his','your'];
  return (lesson?.words||[]).filter(row=>row.he && row.en && row.source?.file==='composed')
    .map(row=>{
      const matches=owners.filter(owner=>new RegExp('\\b'+owner+'\\b','i').test(row.en));
      if(matches.length!==1)return null;
      return {id:row.he,he:row.he,en:row.en,owner:matches[0],img:null};
    }).filter(Boolean);
}
export function suffixShelf(item, shelf) { return !!item?.id && item.owner===shelf; }
export function mount(root,ctx){
  const leaveSfx = sfx.enter(ctx);
  let alive=true,deck=[],R=null,round=0,session=createSession({store:ctx?.store,storeKey:STORE_KEY,par:4});
  const status=h('p',{class:'game-status',role:'status','aria-live':'polite'},'Loading authentic possessive forms…');
  const board=h('div',{class:'game-board'});
  const article=h('article',{class:'card game-card game-museumcurator'},h('h1',{id:'view-title'},'The Museum Curator'),
    h('p',{},'Read the inflected Hebrew artifact inscription and sort it by the possessor suffix.'),
    h('p',{class:'muted'},'Source phrases are a draft lesson and require educator review; no unrelated artifact art is substituted.'),status,board);
  root.replaceChildren(article);
  function paint(){
    if(!alive||!article.isConnected)return;
    if(round>=deck.length){board.replaceChildren(resultsCard(h,heSpan,session,{title:'Museum exhibits sorted',onAgain:()=>{round=0;session=createSession({store:ctx?.store,storeKey:STORE_KEY,par:4});paint();}}));return;}
    const item=deck[round],pic=imgOf(R,'id',item.img);
    const artifact=h('div',{class:'game-museum-artifact'},heSpan(item.he,'he game-he'));
    if(pic)artifact.append(h('img',{src:pic.src,alt:pic.alt,width:pic.width,height:pic.height,'data-img-id':pic.id,class:'game-card-img'}));
    const shelves=['my','your','his'].map(shelf=>h('button',{type:'button',class:'btn secondary game-museum-shelf',onclick:()=>{
      const ok=suffixShelf(item,shelf);session.answer(ok); sfx.play(ok ? 'success' : 'miss');
      status.textContent=ok?'Inflected form placed on its correct shelf.':'Incorrect possessive suffix shelf.';
      if(ok){round++;void speak(ctx,item.he);}paint();
    }},shelf));
    board.replaceChildren(artifact,h('div',{class:'game-choices'},...shelves));
  }
  Promise.all([loadJson('data/curriculum/lessons-intermediate/I-27.json'),loadGameImages(ctx)]).then(([data,images])=>{
    if(!alive||!article.isConnected)return;deck=shuffled(buildMuseumDeck(data));R=images;
    if(deck.length<4){status.textContent='No adequate inflected possessive form set.';return;}paint();
  }).catch(()=>{if(alive)status.textContent='Museum morphology unavailable.';});
  return ()=>{alive=false; leaveSfx();};
}
