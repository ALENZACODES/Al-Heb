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
  again: {he:'נַסּוּ שׁוּב, אֲנִי יוֹדֵעַ שֶׁאַתֶּם יְכוֹלִים!!', en:'TRY AGAIN, I KNOW YOU GOT THIS!!'},
  fruit: {he:'אִכְלוּ רִמּוֹן וְחִזְרוּ!!', en:'HAVE A POMEGRANATE AND COME BACK!!'},
});
export const SHABBAT = Object.freeze({he:'שַׁבָּת שָׁלוֹם!',en:'SHABBAT SHALOM!'});
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

export function mountSpeechBubble(host,{doc=document,now=()=>new Date()}={}){
  const bubble=doc.createElement('div');bubble.className='rimon-bubble';bubble.hidden=true;
  bubble.setAttribute('role','status');bubble.setAttribute('aria-live','polite');bubble.setAttribute('aria-atomic','true');
  doc.body.append(bubble);
  const pick=createSpeechPicker();let message=null,expires=0,friday=isFriday(now()),key='',lastAction='',lastSpoke=0;
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
    const time=now().getTime();if(host.hidden || (action===lastAction && time-lastSpoke<1800))return;
    const chosen=pick(action);if(!chosen)return;
    lastAction=action;lastSpoke=time;message=chosen;expires=time+Math.max(6500,chosen.en.length*160);render();
  }
  const interval=setInterval(render,1000);
  const visibility=()=>render();doc.addEventListener('visibilitychange',visibility);
  globalThis.addEventListener('resize',position);globalThis.addEventListener('scroll',position,{passive:true,capture:true});
  render();
  return {say,refresh:render,element:bubble,destroy(){clearInterval(interval);bubble.remove();doc.removeEventListener('visibilitychange',visibility);globalThis.removeEventListener('resize',position);globalThis.removeEventListener('scroll',position,true);}};
}
