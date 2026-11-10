// Game 21 — rhyme keys are computed from source transliteration, no fabricated phonology.
import { h, heSpan } from '../shell/ui.js';
import { createSession, shuffled, loadGameImages, envNode, GAME_ENV, imgOf, hasRecordedClip, playRecordedClip, resultsCard, roundStatus } from './engine.js';
import { sfx } from '../audio/sfx.js';
import { loadJson } from '../grammar/loader.js';
export const STORE_KEY = 'games.rhymelab.v1';
export function rhymeKey(text) {
  const t = String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/g, '');
  const matches = [...t.matchAll(/[aeiou]/g)];
  if (!matches.length) return '';
  return t.slice(matches[matches.length - 1].index);
}
export function buildRhymeDeck(index) {
  const fields = index?.fields || [], rows = index?.rows || [];
  const hi = fields.indexOf('he'), id = fields.indexOf('id'), en = fields.indexOf('en'), tr = fields.indexOf('translit');
  if (Math.min(hi, id, en, tr) < 0) return [];
  const deck = rows.map(r => ({ id:r[id], he:r[hi], en:r[en], translit:r[tr], key:rhymeKey(r[tr]) }))
    .filter(r=>r.id && r.he && r.key.length >= 2 && r.key.length <= 5);
  return deck.filter(w => deck.some(other=>other.id!==w.id && other.key===w.key));
}
export function rhymes(a,b) { return a?.id !== b?.id && !!a?.key && a.key === b?.key; }
export function mount(root,ctx) {
  const leaveSfx = sfx.enter(ctx);
  let alive=true,deck=[],images=null,round=0;
  let session=createSession({store:ctx?.store,storeKey:STORE_KEY,par:6});
  const status=h('p',{class:'game-status',role:'status','aria-live':'polite'},'Loading real rhyme recordings…');
  const board=h('div',{class:'game-board'});
  const article=h('article',{class:'card game-card game-rhymelab'},h('h1',{id:'view-title'},'Rhyme Lab'),
    h('p',{},'Hear a recorded word and find the real transliteration-ending match.'),status,board);
  root.replaceChildren(article);
  // The music-lab backdrop made for this game (approved art, decorative only —
  // never a word cue). A missing picture leaves the page as it was.
  loadGameImages(ctx).then((R) => {
    if (!alive) return;
    const env = envNode(h, R, GAME_ENV.rhymelab);
    if (env) article.insertBefore(env, status);
  }).catch(() => {});
  function paint(feedback){
    if(!alive||!article.isConnected)return;
    if(round>=8){
      roundStatus(status,'','Rhyme experiment complete.');
      board.replaceChildren(resultsCard(h,heSpan,session,{title:'Rhyme experiment complete',onAgain:()=>{round=0;session=createSession({store:ctx?.store,storeKey:STORE_KEY,par:6});paint();}}));return;}
    roundStatus(status,feedback,`Pair ${round+1} of 8: play the recorded word.`);
    const word=deck[round%deck.length];
    const match=shuffled(deck.filter(x=>rhymes(x,word)))[0];
    const misses=shuffled(deck.filter(x=>x.id!==word.id && x.key!==word.key)).slice(0,2);
    if(!match||misses.length<2){status.textContent='Rhyme pair data insufficient.';return;}
    let heard=false;
    const tubes=shuffled([match,...misses]).map(item=>{
      const pic=imgOf(images,'word',item.id);
      const b=h('button',{type:'button',class:'btn secondary game-rhyme-tube',disabled:true,onclick:()=>{
        if(!heard)return;
        const ok=rhymes(word,item);session.answer(ok); sfx.play(ok ? 'success' : 'miss');
        if(ok){round++;paint();}
        else paint('Different ending. Listen again.');
      }},heSpan(item.he,'he game-he-sm'));
      if(pic)b.append(h('img',{src:pic.src,alt:pic.alt,class:'game-card-img','data-img-id':pic.id,width:pic.width,height:pic.height}));
      return b;
    });
    const play=h('button',{type:'button',class:'btn',onclick:async()=>{
      const result=await playRecordedClip(ctx,'word',word.id);
      if(!alive)return;
      if(result){heard=true;tubes.forEach(b=>{b.disabled=false;});status.textContent='Choose the matching rhyme.';}
      else status.textContent='No recording played; guessing disabled.';
    }},'Hear source word');
    board.replaceChildren(h('div',{class:'game-rhyme-lab'},play,h('div',{class:'game-choices'},...tubes)));
  }
  Promise.all([loadJson('data/vocab/index.json'),loadGameImages(ctx)]).then(([index,R])=>{
    if(!alive||!article.isConnected)return;images=R;
    deck=shuffled(buildRhymeDeck(index).filter(w=>hasRecordedClip(ctx,'word',w.id)));
    if(deck.length<6){status.textContent='Not enough recorded word-rhyme pairs; listening rounds disabled.';return;}
    paint();
  }).catch(()=>{if(alive)status.textContent='Rhyme data unavailable.';});
  return ()=>{alive=false; leaveSfx();ctx?.audio?.stop?.();};
}
