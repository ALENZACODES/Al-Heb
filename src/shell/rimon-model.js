export const SPRITE = 'assets/img/rimon/web/rimon-sprite.webp'; // light WebP; the original PNG stays at assets/img/rimon/rimon-sprite.png
export const FRAMES = Object.freeze(['open','half-closed','closed','wink-left','wink-right','yawn','stretch','laugh-one','laugh-two','bounce','sad','thinking','point','wave-in','wave-out','breathe']);
export const SEQUENCES = Object.freeze({
  wave: { frames:[13,14,13,14,13,0], hold:180 },
  correct: { frames:[7,8,7,9,7,9,0], hold:160 },
  wrong: { frames:[10,10,10,10,0], hold:180 },
  yawn: { frames:[1,5,5,5,1,0], hold:240 },
  lesson: { frames:[11,12,12,12,12,0], hold:240 },
  streak: { frames:[0,6,6,6,15,0], hold:220 },
  blink: { frames:[1,2,1,0], hold:90 },
  winkLeft: { frames:[3,3,0], hold:200 },
  winkRight: { frames:[4,4,0], hold:200 },
  thinking: { frames:[11,11,11,0], hold:240 },
});
export function spritePosition(frame) { return `${(frame % 4) * 100 / 3}% ${Math.floor(frame / 4) * 100 / 3}%`; }
export function createRimonClock({ now = 0, random = Math.random, reduced = false } = {}) {
  let active=null, started=now, lastActivity=now, yawned=false, queue=[];
  const blinkDelay=()=>3000+Math.max(0,Math.min(1,random()))*3000;
  let nextBlink=now+blinkDelay();
  function start(action,time){active=action;started=time;if(action==='blink')nextBlink=time+blinkDelay();}
  return {
    activity(time){lastActivity=time;yawned=false;},
    reduce(value,time){reduced=!!value;active=null;queue=[];lastActivity=time;nextBlink=time+blinkDelay();},
    trigger(action,time){
      if(reduced || !SEQUENCES[action])return false;
      lastActivity=time;yawned=false;
      if(active && active!=='blink') { if(queue.at(-1)!==action)queue.push(action);queue=queue.slice(-3); }
      else start(action,time);
      return true;
    },
    tick(time){
      if(reduced)return {frame:0,action:'still'};
      if(active && time-started>=SEQUENCES[active].frames.length*SEQUENCES[active].hold){
        if(active!=='blink')nextBlink=time+blinkDelay();active=null;
        if(queue.length)start(queue.shift(),time);
      }
      if(!active && !yawned && time-lastActivity>=60000){start('yawn',time);yawned=true;}
      if(!active && time>=nextBlink){start('blink',time);}
      if(!active)return {frame:0,action:'idle'};
      const index=Math.min(SEQUENCES[active].frames.length-1,Math.floor((time-started)/SEQUENCES[active].hold));
      return {frame:SEQUENCES[active].frames[index],action:active==='correct'?(index<3?'laugh':'bounce'):active==='wrong'?'sad':active==='lesson'?'point':active==='streak'?'stretch':active};
    },
  };
}
