// Game 24 — exact one-consonant minimal-pair contrast, never random distractors.
import { h, heSpan } from '../shell/ui.js';
import { createSession, shuffled, loadGameImages, imgOf, hasRecordedClip, playRecordedClip, resultsCard } from './engine.js';
import { loadJson } from '../grammar/loader.js';
export const STORE_KEY='games.echochamber.v1';
const PAIRS=Object.freeze([['ח','כ','chet','kaf'],['ט','ת','tet','tav'],['ע','א','ayin','alef']]);
export function contrastAllowed(group,tradition,pointed) {
  // Israeli mergers are not advertised as audible discriminations.
  if(tradition==='israeli')return false;
  if(tradition==='sephardi')return group===0 || group===2;
  if(tradition==='ashkenazi')return group===1 && !/תּ/u.test(pointed);
  return false;
}
export function buildEchoDeck(index,tradition) {
  const fields=index?.fields||[],rows=index?.rows||[];
  const hi=fields.indexOf('he'),ui=fields.indexOf('heUnpointed'),id=fields.indexOf('id');
  if(Math.min(hi,ui,id)<0)return [];
  const seen=new Set(),out=[];
  const byUnpointed=new Map();
  for(const r of rows)if(typeof r[ui]==='string' && typeof r[hi]==='string' && r[id] &&
    /^[א-ת]{2,6}$/u.test(r[ui])) {
    if(!byUnpointed.has(r[ui]))byUnpointed.set(r[ui],[]);
    byUnpointed.get(r[ui]).push({id:r[id],he:r[hi],unpointed:r[ui]});
  }
  for(const [word,entries] of byUnpointed)for(const [group,[a,b,aid,bid]] of PAIRS.entries()){
    for(let pos=0;pos<word.length;pos++)if(word[pos]===a){
      const target=word.slice(0,pos)+b+word.slice(pos+1);
      const right=byUnpointed.get(target)||[];
      for(const first of entries)for(const second of right){
        if(!contrastAllowed(group,tradition,first.he+second.he))continue;
        // All vowel marks outside the contrast site must be identical.
        const clusters=s=>[...s.normalize('NFD').matchAll(/([א-ת])([\u0591-\u05C7]*)/gu)]
          .map(m=>({letter:m[1],vowels:m[2].replace(/[\u0591-\u05AF]/gu,'')}));
        const left=clusters(first.he),other=clusters(second.he);
        if(left.length!==other.length || left.some((c,i)=>i!==pos &&
          (c.letter!==other[i].letter || c.vowels!==other[i].vowels)))continue;
        if(left[pos]?.vowels.replace(/\u05BC/gu,'')!==other[pos]?.vowels.replace(/\u05BC/gu,''))continue;
        const key=[first.id,second.id].sort().join(':');if(seen.has(key))continue;
        seen.add(key);out.push({id:key,tradition,group,first,second,letters:[aid,bid]});
      }
    }
  }
  return out;
}
export function echoMatch(target,choice){return !!target?.id && target.id===choice?.id;}
export function mount(root,ctx){
  let alive=true,deck=[],R=null,round=0,session=createSession({store:ctx?.store,storeKey:STORE_KEY,par:5});
  const status=h('p',{class:'game-status',role:'status','aria-live':'polite'},'Checking actual minimal-pair recordings…');
  const board=h('div',{class:'game-board'});
  const article=h('article',{class:'card game-card game-echochamber'},h('h1',{id:'view-title'},'Acoustic Echo Chamber'),
    h('p',{},'Hear two real words differing in one consonant; choose the exact recorded word.'),status,board);
  root.replaceChildren(article);
  function paint(){
    if(!alive||!article.isConnected)return;
    if(round>=Math.min(8,deck.length)){board.replaceChildren(resultsCard(h,heSpan,session,{title:'Echo training complete',onAgain:()=>{round=0;session=createSession({store:ctx?.store,storeKey:STORE_KEY,par:5});paint();}}));return;}
    const pair=deck[round%deck.length],target=round%2?pair.first:pair.second;
    let played=false;
    const pics=pair.letters.map(id=>{
      const image=imgOf(R,'letter',id,{variant:'print',role:'mnemonic'});
      return image?h('img',{src:image.src,alt:image.alt,width:100,height:100,class:'game-card-img','data-img-id':image.id}):null;
    }).filter(Boolean);
    const buttons=shuffled([pair.first,pair.second]).map(word=>h('button',{type:'button',class:'btn secondary game-choice',disabled:true,onclick:()=>{
      if(!played)return;const ok=echoMatch(target,word);session.answer(ok);
      status.textContent=ok?'Recorded phoneme identified.':'Different sound: replay the clip.';
      if(ok)round++;paint();
    }},heSpan(word.he,'he game-he-sm')));
    const start=h('button',{type:'button',class:'btn',onclick:async()=>{
      const ok=await playRecordedClip(ctx,'word',target.id,{tradition:pair.tradition});
      if(!alive)return;
      played=ok;if(ok){buttons.forEach(b=>{b.disabled=false;});status.textContent='Choose the word you heard.';}
      else status.textContent='Clip missing for this tradition: no scoring.';
    }},'Hear exact word');
    board.replaceChildren(h('div',{class:'game-echo-letters'},...pics),start,
      h('div',{class:'game-choices game-rtl-grid'},...buttons));
  }
  Promise.all([loadJson('data/vocab/index.json'),loadGameImages(ctx)]).then(([data,images])=>{
    if(!alive||!article.isConnected)return;R=images;
    const tradition=ctx?.settings?.get?.('congregation')||'israeli';
    deck=shuffled(buildEchoDeck(data,tradition).filter(p=>
      [p.first,p.second].every(w=>hasRecordedClip(ctx,'word',w.id,{tradition}))));
    if(!deck.length){status.textContent='No audible, true minimal pair recorded for the selected tradition. No replacement accent or guessed rounds.';return;}
    paint();
  }).catch(()=>{if(alive)status.textContent='Minimal-pair data unavailable.';});
  return ()=>{alive=false;ctx?.audio?.stop?.();};
}
