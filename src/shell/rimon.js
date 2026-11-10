import { mountSpeechBubble } from './rimon-speech.js';
import { projectStreak } from '../curriculum/streak.js';
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
  // A still (src/shell/rimon-stage.js) sits over the sprite: for a moment (a pose) or for the whole page (Rimon dressed for the screen).
  const still=doc.createElement('img');still.className='rimon-still';still.alt='';still.setAttribute('aria-hidden','true');still.decoding='async';still.hidden=true;
  host.append(sprite,still,caption,next,dismiss);doc.body.append(host,restore);
  const media=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
  const animator=createAnimator(),loaded=new Map(),sheetFile=new Map(),base=new URL('../../assets/img/rimon/web/',import.meta.url); // light WebP copies (about 100 KB a sheet, not 1 MB); originals stay in assets/img/rimon/
  let inlineVisible=true,observer;
  let alive=true,hidden=false,requestId=0,lastActivity=Date.now(),yawned=false,thought=false,nextBlink=Date.now()+4000,lastPaint='',idleSince=Date.now();
  try{hidden=store?.get('rimon.dismissed',false)===true;}catch{}
  host.hidden=hidden;restore.hidden=!hidden;
  const speech=mountSpeechBubble(host,{doc,streak:()=>{try{const r=store?.get?.('streak');return r?projectStreak(r,new Date()):null;}catch{return null;}}});
  function remember(){try{store?.set('rimon.dismissed',hidden);}catch{}}
  function load(name){
    // light WebP copy first; if it cannot load (an old cache, a missing file), the original PNG sheet next to it
    if(!loaded.has(name)) loaded.set(name,new Promise(resolve=>{const image=new Image();image.onload=()=>{sheetFile.set(name,new URL(name+'.webp',base).href);resolve(true);};image.onerror=()=>{image.onload=()=>{sheetFile.set(name,new URL('../'+name+'.png',base).href);resolve(true);};image.onerror=()=>resolve(false);image.src=new URL('../'+name+'.png',base).href;};image.src=new URL(name+'.webp',base).href;}));
    return loaded.get(name);
  }
  function paint(){
    const action=animator.action,frame=animator.frame,key=action+':'+frame;
    if(key===lastPaint) return;lastPaint=key;
    const sheet=action==='idle'?'blink':action;
    sprite.style.backgroundImage=`url("${sheetFile.get(sheet)||new URL(sheet+'.webp',base).href}")`;
    sprite.style.backgroundPosition=`${(frame%4)*100/3}% ${Math.floor(frame/4)*50}%`;
    if(host.dataset.action!==action) speech.say(action);
    host.dataset.action=action;host.dataset.frame=String(frame);sprite.dataset.action=action;sprite.dataset.frame=String(frame);
    caption.textContent=ACTIONS[action]?.label || 'Ready to learn';
    sprite.setAttribute('aria-label',`Rimon: ${caption.textContent}`);
  }
  let pageStill=null,posing=false,poseTimer=0,liftTimer=0;
  let pageId='';
  function applyStill(src,id=''){
    if(src){if(still.getAttribute('src')!==src)still.src=src;still.dataset.rimonId=id;still.hidden=false;host.classList.add('rimon-has-still');}
    else{still.hidden=true;still.dataset.rimonId='';host.classList.remove('rimon-has-still');}
  }
  /** Show a still: ms > 0 for a moment, then back to the page still (or the sprite); ms 0 sets the page still (null clears it). */
  function showStill(src,{ms=0,line=null,id=''}={}){
    if(!alive||hidden)return false;
    clearTimeout(liftTimer);
    if(ms>0){clearTimeout(poseTimer);posing=true;applyStill(src,id);if(src)peekSoon();poseTimer=setTimeout(()=>{posing=false;applyStill(pageStill,pageId);},ms);}
    else{pageStill=src||null;pageId=src?id:'';if(!posing)applyStill(pageStill,pageId);}
    if(line)speech.line(line);
    return true;
  }
  function clearPose(){if(!posing)return;clearTimeout(poseTimer);posing=false;applyStill(pageStill,pageId);}
  async function play(name){
    if(!ACTIONS[name] || hidden || !alive) return;
    if(name!=='blink'&&name!=='yawn'&&name!=='thinking'&&typeof peekSoon==='function')peekSoon();
    // Dressed for the page: step out of the still while a reaction plays, so the move is seen.
    if(pageStill&&!posing&&!media?.matches&&ACTIONS[name].priority>0){applyStill(null);clearTimeout(liftTimer);liftTimer=setTimeout(()=>{if(!posing)applyStill(pageStill,pageId);},actionDuration(name));}
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
  // Phones: after a line of speech, Rimon ducks behind the bottom bar (two seconds after a reaction, and at once on a new page) and peeks over it, so the companion never sits on a lesson.
  // A reaction (a right answer, a streak) brings Rimon back up; a tap on the crown does too.
  const phone=()=>{try{return !!doc.defaultView?.matchMedia?.('(max-width:600px)')?.matches;}catch{return false;}};
  let peekTimer=0;
  function peekSoon(ms=2000){clearTimeout(peekTimer);host.classList.remove('rimon-peek');if(phone())peekTimer=setTimeout(()=>{if(alive&&host.classList.contains('rimon-corner'))host.classList.add('rimon-peek');},ms);}
  // A new page starts with Rimon already peeking, so the top of the page is never covered.
  const onRoute=()=>{if(alive&&phone()&&host.classList.contains('rimon-corner')){clearTimeout(peekTimer);host.classList.add('rimon-peek');}};
  doc.defaultView?.addEventListener?.('hashchange',onRoute);
  host.addEventListener('click',e=>{if(host.classList.contains('rimon-peek')&&e.target!==dismiss){e.preventDefault();peekSoon();play('wave');}});
  const event=e=>{
    const {action,nextHref,say}=e.detail || {};
    if(say && say.en && say.he && !hidden){try{speech.sayLine(say);}catch{}} // a named moment brings its own line (src/retention/rimon.js)
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
    // a page greeting: Rimon waves from the current spot; when already peeking, Rimon stays down so the new page is clear
    const wasPeeking=host.classList.contains('rimon-peek');
    next.hidden=true;observer?.disconnect();inlineVisible=true;clearTimeout(poseTimer);clearTimeout(liftTimer);posing=false;pageStill=null;applyStill(null);place();reset();activity();play('wave');
    if(wasPeeking&&phone()&&host.classList.contains('rimon-corner')){clearTimeout(peekTimer);host.classList.add('rimon-peek');}
    const hero=doc.querySelector('.show-hero-text');
    if(hero && typeof IntersectionObserver==='function'){
      observer=new IntersectionObserver(entries=>{inlineVisible=entries[0].isIntersecting;place();},{threshold:0.1});observer.observe(hero);
    }
  };
  const reduce=()=>{reset();host.classList.toggle('rimon-static',!!media?.matches);};
  // One Rimon per screen: when the page draws its own Rimon (a lesson summary, the Learn card, a say-bubble) the corner one steps aside, without counting as dismissed.
  const OWN='.rimon-inline,.alef-continue-rimon,.alef-celebrate-rimon';
  let yielded=false;
  const yieldCheck=()=>{
    if(!alive)return;
    const own=!!doc.querySelector?.(OWN) && host.classList.contains('rimon-corner');
    if(own===yielded)return;
    yielded=own;host.classList.toggle('rimon-yield',own);host.hidden=hidden||own;speech.refresh();
  };
  const yieldTimer=setInterval(yieldCheck,700);
  // When he ducks behind the bottom bar his speech bubble goes with him, so it never floats over the page on its own.
  const syncPeek=()=>doc.body?.classList?.toggle('rimon-peeking',host.classList.contains('rimon-peek'));
  const peekWatch=typeof MutationObserver==='function'?new MutationObserver(syncPeek):null;peekWatch?.observe(host,{attributes:true,attributeFilter:['class']});
  const onReadyYield=()=>setTimeout(yieldCheck,0);doc.addEventListener('alef:ready',onReadyYield);
  dismiss.onclick=()=>{hidden=true;remember();reset();host.hidden=true;speech.refresh();restore.hidden=false;restore.focus();};
  restore.onclick=()=>{hidden=false;remember();host.hidden=yielded;speech.refresh();restore.hidden=true;reset();play('wave');dismiss.focus();};
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
  const readyPromise=load('blink').then(ok=>{if(!alive)return false;if(!ok){sprite.style.backgroundImage=`url("${new URL('../../assets/img/gen/MASCOT_rimon.800.webp',import.meta.url).href}")`;sprite.style.backgroundSize='contain';clearInterval(timer);return false;}reduce();place();const greet=()=>{if(alive&&!hidden)play('wave');};const win=doc.defaultView;if(win?.requestIdleCallback)win.requestIdleCallback(greet,{timeout:2000});else win?.setTimeout(greet,400);return true;});
  let stage=null;
  const api={element:host,play,showStill,clearPose,get pageStill(){return pageStill;},ready:readyPromise,destroy(){stage?.destroy?.();clearInterval(yieldTimer);peekWatch?.disconnect();doc.body?.classList?.remove('rimon-peeking');doc.removeEventListener('alef:ready',onReadyYield);speech.destroy();observer?.disconnect();offStore?.();alive=false;requestId++;clearInterval(timer);clearTimeout(peekTimer);clearTimeout(poseTimer);clearTimeout(liftTimer);doc.defaultView?.removeEventListener?.('hashchange',onRoute);host.remove();restore.remove();doc.removeEventListener('alef:rimon',event);doc.removeEventListener('alef:ready',ready);doc.removeEventListener('pointerdown',activity);doc.removeEventListener('keydown',activity);media?.removeEventListener('change',reduce);}};
  // Rimon's 200 stills (src/shell/rimon-stage.js) load after boot, on demand; until a picture exists nothing changes on screen.
  if(doc===globalThis.document)import('./rimon-stage.js').then(m=>{if(alive)stage=m.mountRimonStage({store,companion:api});}).catch(()=>{});
  return api;
}
