// Game 4 — source glyph silhouette: exactly the same Hebrew glyph, CSS-filtered.
import { h, heSpan } from '../shell/ui.js';
import { createSession, shuffled, loadGameImages, imgOf, resultsCard } from './engine.js';
import { loadJson } from '../grammar/loader.js';
export const STORE_KEY = 'games.shadowcraft.v1';
export function buildShadowDeck(letters, families) {
  const pool = (Array.isArray(letters) ? letters : []).filter(x => x.id && x.he && x.name);
  const byGlyph = new Map(pool.map(x => [x.he, x]));
  const seen = new Set(), items = [];
  for (const family of families?.families || []) {
    const chars = String(family.root || '').split('־');
    if (chars.length !== 3 || chars.some(ch => !byGlyph.has(ch))) continue;
    for (const ch of chars) if (!seen.has(ch)) { seen.add(ch); items.push({ ...byGlyph.get(ch), root: family.root }); }
  }
  return items;
}
export function shadowMatches(target, chosen) { return target?.id && target.id === chosen?.id; }
export function mount(root,ctx) {
  let alive=true, deck=[], images=null, round=0, session=createSession({store:ctx?.store,storeKey:STORE_KEY,par:6});
  const status=h('p',{class:'game-status',role:'status','aria-live':'polite'},'Loading real root letters…');
  const board=h('div',{class:'game-board'});
  const article=h('article',{class:'card game-card game-shadowcraft'},h('h1',{id:'view-title'},'Shadow Craft'),
    h('p',{},'The shadow is the real Hebrew letter shape. Identify the hidden root letter.'),status,board);
  root.replaceChildren(article);
  function paint(){
    if(!alive||!article.isConnected)return;
    if(round>=8){board.replaceChildren(resultsCard(h,heSpan,session,{title:'Shadows resolved',onAgain:()=>{round=0;session=createSession({store:ctx?.store,storeKey:STORE_KEY,par:6});paint();}}));return;}
    const target=deck[round%deck.length],wrong=shuffled(deck.filter(r=>r.id!==target.id)).slice(0,3);
    const glyph=heSpan(target.he,'game-shadow-glyph');
    const picture=imgOf(images,'letter',target.id,{variant:'print',role:'silhouette'});
    const stage=h('div',{class:'game-shadow-stage'},glyph);
    if(picture) stage.append(h('img',{class:'game-shadow-reference',src:picture.src,alt:'',width:80,height:80,'data-img-id':picture.id}));
    const options=shuffled([target,...wrong]).map(x=>h('button',{type:'button',class:'btn secondary game-choice',onclick:()=>{
      const ok=shadowMatches(target,x);session.answer(ok);status.textContent=ok?'True root-letter shape recognized.':'That is a different letter shape.';if(ok)round++;paint();
    }},heSpan(x.he,'he game-he-sm'),h('span',{},x.name)));
    board.replaceChildren(stage,h('p',{},'Which letter casts this exact shadow?'),h('div',{class:'game-choices'},...options));
  }
  Promise.all([loadJson('data/letters/letters.json'),loadJson('data/roots/families.json'),loadGameImages(ctx)]).then(([letters,families,R])=>{
    if(!alive||!article.isConnected)return;deck=shuffled(buildShadowDeck(letters,families));images=R;
    if(deck.length<4){status.textContent='No complete real root-letter deck.';return;}paint();
  }).catch(()=>{if(alive)status.textContent='Root-letter data unavailable.';});
  return ()=>{alive=false;};
}
