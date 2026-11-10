// Encouragement is independent of animation, including reduced-motion mode.
export const MESSAGES = Object.freeze({
  great: {he:'כָּל הַכָּבוֹד!', en:'GREAT JOB!'},
  keep: {he:'הַמְשִׁיכוּ כָּךְ!', en:'KEEP IT UP!'},
  awesome: {he:'אַתֶּם מַדְהִימִים!', en:'YOU ARE AWESOME!'},
  super: {he:'מַמָּשׁ מְעֻלֶּה!!', en:'SUPER DUPER!!'},
  practice: {he:'עוֹד קְצָת תִּרְגּוּל!', en:'TRAIN A LITTLE MORE!'},
  winner: {he:'אַלּוּפִים! אַלּוּפִים!', en:'WINNER WINNER!'},
  tired: {he:'עֲיֵפִים? חִזְרוּ מָחָר!', en:'TIRED? COME BACK TOMORROW!'},
  star: {he:'כּוֹכְבֵי־עַל!!', en:'SUPERSTAR!!'},
  again: {he:'נַסּוּ שׁוּב — אַתֶּם יְכוֹלִים!!', en:'TRY AGAIN — YOU GOT THIS!!'},
  fruit: {he:'אִכְלוּ רִמּוֹן וְחִזְרוּ!!', en:'HAVE A POMEGRANATE AND COME BACK!!'},
});
export const SHABBAT = Object.freeze({he:'שַׁבָּת שָׁלוֹם!',en:'SHABBAT SHALOM!'});
export const SHALOM = Object.freeze({he:'שָׁלוֹם!',en:'Hello!'});
/** First line of the visit from Rimon: by time of day, then a streak line when there is a streak to keep. */
export const GREETINGS = Object.freeze({
  morning: {he:'בֹּקֶר טוֹב!',en:'Good morning!'},
  day: SHALOM,
  evening: {he:'עֶרֶב טוֹב!',en:'Good evening!'},
  night: {he:'לַיְלָה טוֹב!',en:'Good night!'},
});
export function greetingFor(date){const h=date.getHours();return GREETINGS[h>=5&&h<11?'morning':h<17&&h>=11?'day':h>=17&&h<22?'evening':'night'];}
export function streakLine(count){return {he:'בּוֹאוּ נִלְמַד!',en:count===1?"LET'S MAKE IT 2 DAYS!":`KEEP YOUR ${count}-DAY STREAK GOING!`};}
export function doneLine(count){return {he:'כָּל הַכָּבוֹד!',en:count>1?`${count} DAYS IN A ROW!`:'DONE FOR TODAY!'};}
export const ENCOURAGEMENT_MS=5*60*1000, IDLE_BREAK_MS=15*60*1000, SESSION_BREAK_MS=60*60*1000;
export function createSpeechSchedule({greet=null,followUp=null}={}){
  let queued=null,started=null,lastActivity=0,next=0,count=0,breakCount=0,pending=null;
  const encouragement=['keep','great','awesome','super','star','practice','again','winner'];
  return {
    activity(time){lastActivity=time;},
    reaction(action){if(['bounce','laugh','highfive','sad','nervous','stretch'].includes(action))pending=action;},
    tick(time,visible=true){
      if(!visible)return null;
      if(started===null){started=time;lastActivity=time;next=time+ENCOURAGEMENT_MS;queued=followUp?.()||null;return greet?.(time)||SHALOM;}
      if(queued&&time>=started+7000){const q=queued;queued=null;return q;}
      if(time<next)return null;
      next=time+ENCOURAGEMENT_MS;
      if(time-lastActivity>=IDLE_BREAK_MS || time-started>=SESSION_BREAK_MS){pending=null;return MESSAGES[breakCount++%2?'fruit':'tired'];}
      const choices=SPEECH[pending];pending=null;
      return MESSAGES[choices?.[0] || encouragement[count++%encouragement.length]];
    }
  };
}
export const SPEECH = Object.freeze({
  wave:['keep','awesome'],wink:['awesome','super'],bounce:['great','super','awesome'],
  laugh:['super','great'],highfive:['winner','star'],nervous:['again','keep'],
  sad:['again','practice'],thinking:['practice','keep'],point:['keep','practice'],
  stretch:['star','winner'],yawn:['tired','fruit'],
});
export function isFriday(date=new Date()) {return date.getDay()===5;}
export function createSpeechPicker(){
  const counts=new Map();
  return action=>{const choices=SPEECH[action];if(!choices)return null;const n=counts.get(action)||0;counts.set(action,n+1);return MESSAGES[choices[n%choices.length]];};
}

export function mountSpeechBubble(host,{doc=document,now=()=>new Date(),streak=null}={}){
  const bubble=doc.createElement('div');bubble.className='rimon-bubble';bubble.hidden=true;
  bubble.setAttribute('role','status');bubble.setAttribute('aria-live','polite');bubble.setAttribute('aria-atomic','true');
  doc.body.append(bubble);
  const schedule=createSpeechSchedule({greet:(t)=>greetingFor(new Date(t)),followUp:()=>{const st=streak?.();if(!st||!st.count)return null;return st.activeToday?doneLine(st.count):streakLine(st.count);}});let message=null,expires=0,friday=isFriday(now()),key='';
  function pair(line,cls){
    const group=doc.createElement('span');group.className=cls;
    const he=doc.createElement('span');he.className='rimon-bubble-he';he.lang='he';he.dir='rtl';he.textContent=line.he;
    const en=doc.createElement('span');en.className='rimon-bubble-en';en.lang='en';en.dir='ltr';en.textContent=line.en;
    group.append(he,en);return group;
  }
  function position(){
    if(bubble.hidden)return;
    const rect=host.getBoundingClientRect(),width=bubble.offsetWidth,height=bubble.offsetHeight;
    bubble.style.left=Math.max(8,Math.min(innerWidth-width-8,rect.left-width-10))+'px';
    const safeBottom=innerWidth<=600?80:8;
    const top=Math.max(8,Math.min(innerHeight-height-safeBottom,rect.top+12));
    bubble.style.top=top+'px';
    bubble.style.setProperty('--rimon-tail-top',Math.max(18,Math.min(height-30,rect.top+rect.width*.45-top))+'px');
  }
  function render(){
    const time=now().getTime();friday=isFriday(now());if(message && time>=expires)message=null;
    const scheduled=schedule.tick(time,!host.hidden && !doc.hidden);
    if(scheduled){message=scheduled;expires=time+Math.max(6500,scheduled.en.length*160);}
    const nextKey=(friday?'friday':'')+'|'+(message?.en||'')+'|'+host.hidden;
    if(nextKey!==key){
      key=nextKey;bubble.replaceChildren();
      if(friday)bubble.append(pair(SHABBAT,'rimon-shabbat'));
      if(message)bubble.append(pair(message,'rimon-encouragement'));
      bubble.hidden=host.hidden || (!friday&&!message);
      if(!bubble.hidden){bubble.classList.remove('is-popping');void bubble.offsetWidth;bubble.classList.add('is-popping');}
    }
    position();
  }
  function say(action){
    schedule.reaction(action);
  }
  /** Say one line now (a still's line from src/shell/rimon-stage.js); it stays as long as a scheduled message. */
  function line(l){
    if(!l||!l.en)return;
    message=l;expires=now().getTime()+Math.max(6500,l.en.length*160);render();
  }
  // Any tap, key or scroll also clears a visible bubble, so it never sits on top of a button the learner wants.
  const activity=(e)=>{schedule.activity(now().getTime());if(message && e && e.type!=='pointermove'){message=null;render();}};
  const activityEvents=['pointerdown','pointermove','keydown','touchstart','scroll'];
  for(const event of activityEvents)doc.addEventListener(event,activity,{passive:true,capture:true});
  const interval=setInterval(render,1000);
  const visibility=()=>render();doc.addEventListener('visibilitychange',visibility);
  globalThis.addEventListener('resize',position);globalThis.addEventListener('scroll',position,{passive:true,capture:true});
  render();
  return {say,line,refresh:render,element:bubble,destroy(){clearInterval(interval);bubble.remove();for(const event of activityEvents)doc.removeEventListener(event,activity,true);doc.removeEventListener('visibilitychange',visibility);globalThis.removeEventListener('resize',position);globalThis.removeEventListener('scroll',position,true);}};
}
