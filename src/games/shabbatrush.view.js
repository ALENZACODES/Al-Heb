// Game 8 — real Friday sunset countdown, recorded category cues, and timed collections.
import { h, heSpan } from '../shell/ui.js';
import { createSession, shuffled, loadGameImages, imgOf, hasRecordedClip, playRecordedClip, resultsCard } from './engine.js';
import { sfx } from '../audio/sfx.js';
import { loadJson } from '../grammar/loader.js';
import { fridayOnOrAfter, sunset } from '../curriculum/calendar.js';
export const STORE_KEY='games.shabbatrush.v1';
const CATEGORIES=Object.freeze([
  { id:'food-drink',he:'אֹכֶל',clipId:'hf2a00590' },
  { id:'home-things',he:'בַּיִת',clipId:'h9c8ddecf' },
]);
export function nextShabbatSunset(now,location) {
  if(!(now instanceof Date) || !location || !Number.isFinite(location.lat) || !Number.isFinite(location.lon))return null;
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:location.tz,year:'numeric',month:'numeric',day:'numeric'}).formatToParts(now);
  const value=k=>Number(parts.find(p=>p.type===k)?.value);
  const day={y:value('year'),m:value('month'),d:value('day')};
  let friday=fridayOnOrAfter(day),end=sunset(friday,location.lat,location.lon);
  if(end && end<=now){const later=new Date(Date.UTC(friday.y,friday.m-1,friday.d+7));
    end=sunset({y:later.getUTCFullYear(),m:later.getUTCMonth()+1,d:later.getUTCDate()},location.lat,location.lon);}
  return end;
}
export function correctCollect(cue,item){return !!cue?.id && cue.id===item?.topic;}
export function buildRushItems(index) {
  const fields=index?.fields||[],rows=index?.rows||[];
  const id=fields.indexOf('id'),he=fields.indexOf('he'),en=fields.indexOf('en'),topic=fields.indexOf('topic');
  if(Math.min(id,he,en,topic)<0)return [];
  return rows.filter(r=>CATEGORIES.some(c=>c.id===r[topic]) && r[id] && r[he] && r[en])
    .map(r=>({id:r[id],he:r[he],en:r[en],topic:r[topic]}));
}
export function mount(root,ctx) {
  const leaveSfx = sfx.enter(ctx);
  let alive=true,deadline=null,clock=0,deck=[],R=null,cue=null,round=0,session=createSession({store:ctx?.store,storeKey:STORE_KEY,par:6});
  const status=h('p',{class:'game-status',role:'status','aria-live':'polite'},'Loading sunset and word clips…');
  const board=h('div',{class:'game-board'}),timer=h('p',{class:'game-rush-timer',role:'timer'});
  const article=h('article',{class:'card game-card game-shabbatrush'},h('h1',{id:'view-title'},'Endless Runner: Shabbat Rush'),
    h('p',{},'Hear a Hebrew category before collecting matching objects on the way to sunset.'),timer,status,board);
  root.replaceChildren(article);
  function stopClock(){if(clock){clearInterval(clock);clock=0;}}
  function paintTimer(){
    if(!alive||!deadline)return;
    const seconds=Math.max(0,Math.floor((deadline.getTime()-Date.now())/1000));
    const hours=Math.floor(seconds/3600),minutes=Math.floor((seconds%3600)/60);
    timer.textContent='Time until local Friday sunset: '+hours+'h '+minutes+'m';
    if(seconds===0){stopClock();status.textContent='Sunset reached. Run ended.';}
  }
  function paint(){
    if(!alive||!article.isConnected)return;
    if(round>=8){stopClock();board.replaceChildren(resultsCard(h,heSpan,session,{title:'Shabbat collection finished',onAgain:()=>{round=0;session=createSession({store:ctx?.store,storeKey:STORE_KEY,par:6});paint();}}));return;}
    cue=CATEGORIES[round%CATEGORIES.length];
    const correct=shuffled(deck.filter(w=>w.topic===cue.id))[0];
    const wrong=shuffled(deck.filter(w=>w.topic!==cue.id)).slice(0,2);
    if(!correct||wrong.length<2){status.textContent='Missing collectible categories.';return;}
    let heard=false;
    const cards=shuffled([correct,...wrong]).map(item=>{
      const picture=imgOf(R,'word',item.id);
      const button=h('button',{type:'button',class:'btn secondary game-rush-collectible',disabled:true,onclick:()=>{
        if(!heard || deadline.getTime()<=Date.now())return;
        const ok=correctCollect(cue,item);session.answer(ok); sfx.play(ok ? 'success' : 'miss');
        status.textContent=ok?'Correct collectible.':'Not in the announced category.';
        if(ok)round++;paint();
      }},heSpan(item.he,'he game-he-sm'));
      if(picture)button.append(h('img',{class:'game-card-img',src:picture.src,alt:picture.alt,
        width:picture.width,height:picture.height,'data-img-id':picture.id}));
      return button;
    });
    const hear=h('button',{type:'button',class:'btn',onclick:async()=>{
      const success=await playRecordedClip(ctx,'word',cue.clipId);
      if(!alive)return;
      heard=success;if(success){cards.forEach(c=>{c.disabled=false;});status.textContent='Collect only matching words.';}
      else status.textContent='Category recording unavailable; collection disabled.';
    }},'Hear Hebrew category');
    board.replaceChildren(hear,h('div',{class:'game-rush-lane'},...cards));
  }
  Promise.all([loadJson('data/vocab/index.json'),loadJson('data/calendar/locations.json'),loadGameImages(ctx)]).then(([index,places,images])=>{
    if(!alive||!article.isConnected)return;R=images;deck=buildRushItems(index);
    const location=places.presets?.find(p=>p.id==='toronto');
    deadline=nextShabbatSunset(new Date(),location);
    if(!deadline){status.textContent='Sunset calculation unavailable.';return;}
    if(!CATEGORIES.every(c=>hasRecordedClip(ctx,'word',c.clipId))){
      status.textContent='Recorded Hebrew category call-outs unavailable. No guessing rounds.';return;
    }
    if(!deck.some(r=>r.topic==='food-drink')||!deck.some(r=>r.topic==='home-things')){
      status.textContent='Collectible vocabulary missing.';return;
    }
    paintTimer();clock=setInterval(paintTimer,1000);paint();
  }).catch(()=>{if(alive)status.textContent='Shabbat data unavailable.';});
  return ()=>{alive=false; leaveSfx();stopClock();ctx?.audio?.stop?.();};
}
