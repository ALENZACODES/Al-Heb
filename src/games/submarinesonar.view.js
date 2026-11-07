// Game 7 — audio to exact pointed reading; recorded clip is mandatory for scoring.
import { h, heSpan } from '../shell/ui.js';
import { createSession, shuffled, loadGameImages, imgOf, hasRecordedClip, playRecordedClip, resultsCard } from './engine.js';
import { sfx } from '../audio/sfx.js';
import { loadJson } from '../grammar/loader.js';
export const STORE_KEY = 'games.submarinesonar.v1';
export function buildSonarDeck(index) {
  const fields = index?.fields || [], rows = index?.rows || [];
  const hi = fields.indexOf('he'), ui = fields.indexOf('heUnpointed'), id = fields.indexOf('id'), en = fields.indexOf('en');
  if (Math.min(hi, ui, id, en) < 0) return [];
  const groups = new Map();
  for (const r of rows) {
    const key = r[ui];
    if (typeof r[hi] !== 'string' || !key || !r[id]) continue;
    if (!groups.has(key)) groups.set(key, []);
    if (!groups.get(key).some(x => x.he === r[hi]))
      groups.get(key).push({ id:r[id], he:r[hi], unpointed:key, en:r[en] });
  }
  return [...groups.values()].filter(group => group.length >= 2);
}
export function gateMatches(target, selected) {
  return !!target?.id && target.id === selected?.id && target.he === selected.he;
}
export function mount(root,ctx) {
  const leaveSfx = sfx.enter(ctx);
  let alive = true, groups = [], R = null, round = 0;
  let session = createSession({ store:ctx?.store,storeKey:STORE_KEY,par:6 });
  const status = h('p',{class:'game-status',role:'status','aria-live':'polite'},'Loading recorded sonar targets…');
  const board = h('div',{class:'game-board'});
  const article = h('article',{class:'card game-card game-submarinesonar'},h('h1',{id:'view-title'},'Submarine Sonar Vowels'),
    h('p',{},'Listen to an actual Hebrew word recording, then steer through its exact pointed spelling.'), status,board);
  root.replaceChildren(article);
  async function paint() {
    if(!alive||!article.isConnected)return;
    if(round>=8){board.replaceChildren(resultsCard(h,heSpan,session,{title:'Sonar course complete',onAgain:()=>{round=0;session=createSession({store:ctx?.store,storeKey:STORE_KEY,par:6});void paint();}}));return;}
    const group=groups[round%groups.length],target=group[round%group.length],choices=shuffled(group).slice(0,4);
    let heard = false;
    if(!choices.includes(target))choices[0]=target;
    const gateButtons=shuffled(choices).map(option=>{
      const pic=imgOf(R,'word',option.id);
      const b=h('button',{type:'button',class:'btn secondary game-choice game-sonar-gate',onclick:()=>{
        if(!alive || !heard)return;
        const ok=gateMatches(target,option);session.answer(ok); sfx.play(ok ? 'success' : 'miss');
        status.textContent=ok?'Sonar gate unlocked.':'Wrong vowel points: gate closed.';
        if(ok)round++;void paint();
      }},heSpan(option.he,'he game-he-sm'));
      b.disabled = true;
      if(pic)b.append(h('img',{src:pic.src,alt:pic.alt,width:pic.width,height:pic.height,class:'game-card-img','data-img-id':pic.id}));
      return b;
    });
    const listen=h('button',{type:'button',class:'btn',onclick:async()=>{
      status.textContent='Playing exact indexed recording…';
      heard=await playRecordedClip(ctx,'word',target.id);
      if(alive){status.textContent=heard?'Choose the spelling you heard.':'No recording available; scoring is disabled.'; if(heard) { gateButtons.forEach(b => b.disabled = false); } }
    }},'Play sonar word');
    board.replaceChildren(h('div',{class:'game-sonar-stage'},h('p',{},'Same unpointed spelling; choose by sound.'),
      heSpan(target.unpointed,'he game-he'),listen,h('div',{class:'game-choices game-rtl-grid'},...gateButtons)));
  }
  Promise.all([loadJson('data/vocab/index.json'),loadGameImages(ctx)]).then(([data,images])=>{
    if(!alive||!article.isConnected)return;R=images;
    groups=shuffled(buildSonarDeck(data).filter(g=>g.some(w=>hasRecordedClip(ctx,'word',w.id))))
      .map(g=>g.filter(w=>hasRecordedClip(ctx,'word',w.id))).filter(g=>g.length>=2);
    if(!groups.length){status.textContent='No exact pair of recorded pointed spellings. Sonar rounds are disabled.';return;}
    void paint();
  }).catch(()=>{if(alive)status.textContent='Sonar word data unavailable.';});
  return ()=>{alive=false; leaveSfx();ctx?.audio?.stop?.();};
}
