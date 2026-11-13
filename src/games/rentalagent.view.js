// Game 15 — structured rental listings from existing Hebrew property word records.
import { h, heSpan } from '../shell/ui.js';
import { createSession, shuffled, loadGameImages, envNode, GAME_ENV, imgOf, resultsCard } from './engine.js';
import { castEnvNode } from './cast-env.js';
import { sfx } from '../audio/sfx.js';
import { loadJson } from '../grammar/loader.js';
export const STORE_KEY='games.rentalagent.v1';
export function buildRentalFields(lesson) {
  const terms = ['apartment','room','floor','balcony','parking','mazgan'];
  return terms.map(term => {
    const word=(lesson?.words || []).find(w=>w.he && w.en && (
      term==='room'? /^room$/i.test(w.en) :
      term==='floor'? /^story, floor$/i.test(w.en) :
      term==='apartment'? /^apartment$/i.test(w.en) :
      term==='balcony'? /^balcony$/i.test(w.en) :
      term==='parking'? /^parking$/i.test(w.en) :
      /^mazgan|air conditioner/i.test(w.en)));
    return word ? { id:term,he:word.he,en:word.en,wordId:word.source?.id || null } : null;
  }).filter(Boolean);
}
export function listingMatches(listing,requirement){return !!listing?.features?.some(f=>f.id===requirement?.id);}
const ART=Object.freeze({balcony:'CTX_house_02',floor:'CTX_house_03'});
export function mount(root,ctx) {
  const leaveSfx = sfx.enter(ctx);
  let alive=true,features=[],R=null,round=0,session=createSession({store:ctx?.store,storeKey:STORE_KEY,par:5});
  const status=h('p',{class:'game-status',role:'status','aria-live':'polite'},'Loading rental vocabulary…');
  const board=h('div',{class:'game-board'});
  const article=h('article',{class:'card game-card game-rentalagent'},h('h1',{id:'view-title'},'Apartment Rental Agent'),
    h('p',{},'Inspect property features in Hebrew; select the listing that meets the requested feature.'),
    status,board);
  root.replaceChildren(article);
  // The apartment backdrop made for this game (approved art, decorative only —
  // never a word cue). A missing picture leaves the page as it was.
  loadGameImages(ctx).then((R) => {
    if (!alive) return;
    const env = castEnvNode(h, R, 'rentalagent', GAME_ENV.rentalagent);
    if (env) article.insertBefore(env, status);
  }).catch(() => {});
  function paint(feedback){
    if(!alive||!article.isConnected)return;
    if(round>=8){
      status.textContent='Listing search finished.';
      board.replaceChildren(resultsCard(h,heSpan,session,{title:'Listing search finished',onAgain:()=>{round=0;session=createSession({store:ctx?.store,storeKey:STORE_KEY,par:5});paint();}}));
      return;
    }
    const pool=features.filter(f=>['floor','balcony','parking','room'].includes(f.id)),target=pool[round%pool.length];
    const others=shuffled(pool.filter(f=>f.id!==target.id)).slice(0,2);
    if(others.length<2){status.textContent='Insufficient real rental feature alternatives.';return;}
    status.textContent=feedback||`Listing ${round+1} of 8: find ${target.en}.`;
    const listings=shuffled([target,...others]).map((feature,i)=>({id:'listing-'+i,features:[feature]}));
    const choices=listings.map(listing=>{
      const feature=listing.features[0],picture=imgOf(R,'id',ART[feature.id]);
      const button=h('button',{type:'button',class:'btn secondary game-rental-listing',onclick:()=>{
        const ok=listingMatches(listing,target);session.answer(ok); sfx.play(ok ? 'success' : 'miss');
        if(ok){round++;paint();}
        else paint('Listing lacks that Hebrew feature.');
      }},heSpan(feature.he,'he game-he-sm'));
      if(picture)button.append(h('img',{class:'game-card-img',src:picture.src,alt:picture.alt,
        width:picture.width,height:picture.height,'data-img-id':picture.id}));
      return button;
    });
    board.replaceChildren(h('div',{class:'game-rental-requirement'},'Find: '+target.en),
      h('div',{class:'game-choices'},...choices));
  }
  Promise.all([loadJson('data/curriculum/lessons-intermediate/I-17.json'),loadGameImages(ctx)]).then(([data,images])=>{
    if(!alive||!article.isConnected)return;features=buildRentalFields(data);R=images;
    if(features.length<4){status.textContent='Insufficient source features.';return;}paint();
  }).catch(()=>{if(alive)status.textContent='Rental vocabulary unavailable.';});
  return ()=>{alive=false; leaveSfx();};
}
