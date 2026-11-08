import { h } from './ui.js';
import { createRimonClock, spritePosition } from './rimon-model.js';

export function rimonInline() {
  return h('div',{class:'rimon-inline'},h('span',{class:'rimon-sprite',role:'img','aria-label':'Rimon, your pomegranate learning companion','data-action':'idle'}));
}

export function mountRimon({ store, target = document.body } = {}) {
  const media=matchMedia('(prefers-reduced-motion: reduce)');
  const clock=createRimonClock({now:performance.now(),reduced:media.matches});
  const sprite=h('span',{class:'rimon-sprite',role:'img','aria-label':'Rimon, your pomegranate learning companion','data-action':'idle'});
  const message=h('span',{class:'visually-hidden',role:'status','aria-live':'polite'});
  const next=h('a',{class:'rimon-next',href:'#/learn',hidden:true},'Next lesson →');
  const restore=h('button',{type:'button',class:'rimon-restore',hidden:true,'aria-label':'Show Rimon'},'Rimon');
  const close=h('button',{type:'button',class:'rimon-close','aria-label':'Hide Rimon'},'×');
  const dock=h('aside',{class:'rimon-dock','aria-label':'Rimon companion'},close,sprite,next,message);
  target.append(dock,restore);
  let hidden=false,timer=null,previous='',destroyed=false,firstReady=true,inlineObserver;
  try { hidden=sessionStorage.getItem('alef.rimon.dismissed')==='1'; } catch {}
  const applyHidden=()=>{
    dock.hidden=hidden;restore.hidden=!hidden;document.body.classList.toggle('rimon-dismissed',hidden);
    try { sessionStorage.setItem('alef.rimon.dismissed',hidden?'1':'0'); } catch {}
  };
  applyHidden();
  function render(force=false){
    if(destroyed)return;
    const state=clock.tick(performance.now()),key=state.action+':'+state.frame;
    if(force || key!==previous){
      for(const node of document.querySelectorAll('.rimon-sprite')){
        node.style.backgroundPosition=spritePosition(state.frame);node.dataset.frame=String(state.frame);node.dataset.action=state.action;
      }
      document.body.classList.toggle('rimon-reacting', !['idle','blink','still'].includes(state.action) || !next.hidden);
      previous=key;
    }
  }
  function schedule(){
    clearInterval(timer);timer=null;render(true);
    if(!destroyed && !media.matches && !document.hidden && !hidden)timer=setInterval(render,60);
  }
  close.onclick=()=>{hidden=true;applyHidden();schedule();restore.focus();};
  restore.onclick=()=>{hidden=false;applyHidden();clock.trigger('wave',performance.now());schedule();close.focus();};
  const captions={wave:'Hello! Ready to learn?',correct:'Well done!',wrong:'Keep going — try once more.',yawn:'Ready when you are.',lesson:'Lesson complete. Try the next lesson.',streak:'You earned a streak badge!'};
  function onReaction(event){
    const {action,nextHref}=event.detail || {};
    if(hidden)return;
    clock.trigger(action,performance.now());
    if(captions[action])message.textContent=captions[action];
    if(action==='lesson' && /^#\/(learn|lesson|intermediate)(\/|\?|$)/.test(nextHref || '')){next.href=nextHref;next.hidden=false;}
    render(true);
  }
  const onActivity=()=>clock.activity(performance.now());
  const onMotion=()=>{clock.reduce(media.matches,performance.now());schedule();};
  const onVisibility=()=>{clock.activity(performance.now());schedule();};
  function onReady(){
    next.hidden=true;
    if(firstReady){firstReady=false;clock.trigger('wave',performance.now());}
    inlineObserver?.disconnect();
    document.body.classList.remove('rimon-inline-visible');
    const inline=document.querySelector('.rimon-inline');
    if(inline && typeof IntersectionObserver==='function'){
      inlineObserver=new IntersectionObserver(entries=>document.body.classList.toggle('rimon-inline-visible',entries[0].isIntersecting),{threshold:0.5});
      inlineObserver.observe(inline);
    }
    render(true);
  }
  let knownBadges=new Set(Object.keys(store?.get('awards.v1')?.awards || {}));
  const offStore=store?.subscribe?.((key,value)=>{
    if(key!=='awards.v1')return;
    const ids=Object.keys(value?.awards || {});
    if(ids.some(id=>id.startsWith('streak-')&&!knownBadges.has(id)))onReaction({detail:{action:'streak'}});
    knownBadges=new Set(ids);
  });
  document.addEventListener('alef:rimon',onReaction);
  document.addEventListener('alef:ready',onReady);
  document.addEventListener('visibilitychange',onVisibility);
  for(const type of ['pointerdown','pointermove','keydown'])document.addEventListener(type,onActivity,{passive:true});
  media.addEventListener('change',onMotion);
  schedule();
  return {element:dock,destroy(){
    destroyed=true;clearInterval(timer);offStore?.();inlineObserver?.disconnect();
    document.removeEventListener('alef:rimon',onReaction);document.removeEventListener('alef:ready',onReady);document.removeEventListener('visibilitychange',onVisibility);
    for(const type of ['pointerdown','pointermove','keydown'])document.removeEventListener(type,onActivity);
    media.removeEventListener('change',onMotion);dock.remove();restore.remove();document.body.classList.remove('rimon-dismissed','rimon-inline-visible','rimon-reacting');
  }};
}
