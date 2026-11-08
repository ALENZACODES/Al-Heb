import { mountSpeechBubble } from './rimon-speech.js';
// Twelve drawings per action: start, ten in-betweens, finish.
export const ACTIONS = Object.freeze({
  blink:{ms:45,label:'Ready to learn',priority:0},
  wave:{ms:145,label:'Hello!',priority:1},
  wink:{ms:130,label:'You got it!',priority:1},
  bounce:{ms:95,label:'Great answer!',priority:2},
  laugh:{ms:140,label:'Well done!',priority:2},
  highfive:{ms:160,label:'High five!',priority:3},
  nervous:{ms:220,label:'You can do it!',priority:2},
  sad:{ms:170,label:'Keep going — you can do it',priority:2},
  thinking:{ms:230,label:'Take your time',priority:0},
  point:{ms:180,label:'Try your next lesson',priority:3},
  stretch:{ms:210,label:'A new badge!',priority:4},
  yawn:{ms:240,label:'Ready when you are',priority:0},
});
export const FRAME_COUNT=12;
export function frameDuration(action,index) {
  const base=ACTIONS[action]?.ms || 140;
  // Anticipation, a held gesture, and a relaxed finish give each move weight.
  return base * (index===0 || index===11 ? 1.6 : index===7 && action!=='blink' ? 2 : 1);
}
export function actionDuration(action) {return Array.from({length:FRAME_COUNT},(_,i)=>frameDuration(action,i)).reduce((a,b)=>a+b,0);}
export function createAnimator() {
  let action='idle',frame=0,deadline=0,pending=null;
  function begin(name,now){action=name;frame=0;deadline=now+frameDuration(name,0);}
  return {
    get action(){return action;},get frame(){return frame;},get pending(){return pending;},
    reset(){action='idle';frame=0;pending=null;deadline=0;},
    request(name,now){
      if(!ACTIONS[name]) return false;
      if(action==='idle' || ACTIONS[action]?.priority===0){begin(name,now);return true;}
      if(name===action) return false;
      if(!pending || ACTIONS[name].priority>=ACTIONS[pending].priority) pending=name;
      return true;
    },
    tick(now){
      if(action==='idle' || now<deadline) return;
      if(++frame<FRAME_COUNT){deadline=now+frameDuration(action,frame);return;}
      if(pending){const next=pending;pending=null;begin(next,now);} else {action='idle';frame=0;}
    },
  };
}

export function mountRimon({store,doc=document}={}) {
  const host=doc.createElement('aside');host.className='rimon-companion rimon-dock';host.setAttribute('aria-label','Rimon, your learning companion');
  const sprite=doc.createElement('span');sprite.className='rimon-sprite';sprite.setAttribute('role','img');
  const caption=doc.createElement('span');caption.className='rimon-caption';
  const next=doc.createElement('a');next.className='rimon-next';next.textContent='Next lesson →';next.hidden=true;
  const dismiss=doc.createElement('button');dismiss.type='button';dismiss.className='rimon-dismiss';dismiss.textContent='×';dismiss.setAttribute('aria-label','Hide Rimon');
  const restore=doc.createElement('button');restore.type='button';restore.className='rimon-restore';restore.textContent='Show Rimon';restore.hidden=true;
  host.append(sprite,caption,next,dismiss);doc.body.append(host,restore);
  const media=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
  const animator=createAnimator(),loaded=new Map(),base=new URL('../../assets/img/rimon/',import.meta.url);
  let inlineVisible=true,observer;
  let alive=true,hidden=false,requestId=0,lastActivity=Date.now(),yawned=false,thought=false,nextBlink=Date.now()+4000,lastPaint='',idleSince=Date.now();
  try{hidden=sessionStorage.getItem('alef.rimon.dismissed')==='1';}catch{}
  host.hidden=hidden;restore.hidden=!hidden;
  const speech=mountSpeechBubble(host,{doc});
  function remember(){try{sessionStorage.setItem('alef.rimon.dismissed',hidden?'1':'0');}catch{}}
  function load(name){
    if(!loaded.has(name)) loaded.set(name,new Promise(resolve=>{const image=new Image();image.onload=()=>resolve(true);image.onerror=()=>resolve(false);image.src=new URL(name+'.png',base).href;}));
    return loaded.get(name);
  }
  function paint(){
    const action=animator.action,frame=animator.frame,key=action+':'+frame;
    if(key===lastPaint) return;lastPaint=key;
    const sheet=action==='idle'?'blink':action;
    sprite.style.backgroundImage=`url("${new URL(sheet+'.png',base).href}")`;
    sprite.style.backgroundPosition=`${(frame%4)*100/3}% ${Math.floor(frame/4)*50}%`;
    if(host.dataset.action!==action) speech.say(action);
    host.dataset.action=action;host.dataset.frame=String(frame);sprite.dataset.action=action;sprite.dataset.frame=String(frame);
    caption.textContent=ACTIONS[action]?.label || 'Ready to learn';
    sprite.setAttribute('aria-label',`Rimon: ${caption.textContent}`);
  }
  async function play(name){
    if(!ACTIONS[name] || hidden || !alive) return;
    if(media?.matches){speech.say(name);return;}
    const id=requestId;
    if(await load(name) && alive && id===requestId && !hidden && !media?.matches){animator.request(name,Date.now());paint();}
  }
  function reset(){requestId++;animator.reset();lastPaint='';nextBlink=Date.now()+3000+Math.random()*3000;idleSince=Date.now();paint();}
  function place(){
    const anchor=inlineVisible ? doc.querySelector('.show-mascot-box') : null;
    const parent=anchor || doc.body;if(host.parentNode!==parent)parent.append(host);
    host.classList.toggle('rimon-corner',!anchor);speech.refresh();
  }
  const event=e=>{
    const {action,nextHref}=e.detail || {};
    if(action==='lesson' && /^#\/(learn|lesson|intermediate)(\/|\?|$)/.test(nextHref || '')){next.href=nextHref;next.hidden=false;}
    play(({correct:'bounce',wrong:'sad',lesson:'point',streak:'stretch',winkLeft:'wink',winkRight:'wink'})[action] || action);
  };
  let knownBadges=new Set(Object.keys(store?.get?.('awards.v1')?.awards || {}));
  const offStore=store?.subscribe?.((key,value)=>{
    if(key!=='awards.v1')return;
    const ids=Object.keys(value?.awards || {});
    if(ids.some(id=>id.startsWith('streak-')&&!knownBadges.has(id)))play('stretch');
    knownBadges=new Set(ids);
  });
  const activity=()=>{lastActivity=Date.now();yawned=false;thought=false;};
  const ready=()=>{
    next.hidden=true;observer?.disconnect();inlineVisible=true;place();reset();activity();play('wave');
    const hero=doc.querySelector('.show-hero-text');
    if(hero && typeof IntersectionObserver==='function'){
      observer=new IntersectionObserver(entries=>{inlineVisible=entries[0].isIntersecting;place();},{threshold:0.1});observer.observe(hero);
    }
  };
  const reduce=()=>{reset();host.classList.toggle('rimon-static',!!media?.matches);};
  dismiss.onclick=()=>{hidden=true;remember();reset();host.hidden=true;speech.refresh();restore.hidden=false;restore.focus();};
  restore.onclick=()=>{hidden=false;remember();host.hidden=false;speech.refresh();restore.hidden=true;reset();play('wave');dismiss.focus();};
  doc.addEventListener('alef:rimon',event);doc.addEventListener('alef:ready',ready);
  doc.addEventListener('pointerdown',activity,{passive:true});doc.addEventListener('keydown',activity);
  media?.addEventListener('change',reduce);
  const timer=setInterval(()=>{
    if(doc.hidden || hidden || media?.matches)return;
    const now=Date.now(),before=animator.action;animator.tick(now);
    if(before!=='idle' && animator.action==='idle'){idleSince=now;nextBlink=now+3000+Math.random()*3000;}
    paint();
    if(animator.action!=='idle' || now-idleSince<700)return;
    if(!yawned && now-lastActivity>=60000){yawned=true;play('yawn');}
    else if(!thought && now-lastActivity>=25000){thought=true;play('thinking');}
    else if(now>=nextBlink){nextBlink=now+6000;play('blink');}
  },32);
  const readyPromise=load('blink').then(ok=>{if(!alive)return false;if(!ok){sprite.style.backgroundImage=`url("${new URL('../../assets/img/gen/MASCOT_rimon.800.webp',import.meta.url).href}")`;sprite.style.backgroundSize='contain';clearInterval(timer);return false;}reduce();place();play('wave');return true;});
  return {element:host,play,ready:readyPromise,destroy(){speech.destroy();observer?.disconnect();offStore?.();alive=false;requestId++;clearInterval(timer);host.remove();restore.remove();doc.removeEventListener('alef:rimon',event);doc.removeEventListener('alef:ready',ready);doc.removeEventListener('pointerdown',activity);doc.removeEventListener('keydown',activity);media?.removeEventListener('change',reduce);}};
}
