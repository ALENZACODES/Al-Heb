import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ACTIONS,FRAME_COUNT,createAnimator,frameDuration,actionDuration} from '../src/shell/rimon.js';
import {createSession} from '../src/games/engine.js';
test('each action has a twelve-cell square-frame sheet and slower gestures have longer timing',()=>{
 assert.equal(FRAME_COUNT,12);
 for(const name of Object.keys(ACTIONS)){
  const bytes=fs.readFileSync(new URL('../assets/img/rimon/'+name+'.png',import.meta.url));
  assert.equal(bytes.readUInt32BE(16)/4,bytes.readUInt32BE(20)/3,name);
 }
 assert.ok(actionDuration('nervous')>actionDuration('bounce'));
 assert.ok(frameDuration('highfive',7)>frameDuration('highfive',6));
});
test('all twelve frames are visited and repeated scoring cannot restart the action',()=>{
 const a=createAnimator();let now=0;a.request('bounce',now);const frames=[a.frame];
 for(let i=0;i<12;i++){a.request('bounce',now);now+=frameDuration('bounce',i);a.tick(now);if(a.action!=='idle')frames.push(a.frame);}
 assert.deepEqual(frames,Array.from({length:12},(_,i)=>i));assert.equal(a.action,'idle');
});
test('one pending reaction preserves badge priority; reset clears pending work',()=>{
 const a=createAnimator();a.request('wave',0);a.request('stretch',1);a.request('bounce',2);assert.equal(a.pending,'stretch');
 let now=0;for(let i=0;i<12;i++){now+=frameDuration('wave',i);a.tick(now);}
 assert.equal(a.action,'stretch');a.reset();assert.equal(a.pending,null);assert.equal(a.action,'idle');assert.equal(a.request('unknown',0),false);
});
test('real scoring emits celebration, high-five at five correct, and encouragement on miss',()=>{
 const events=[],prior=globalThis.document;globalThis.document={dispatchEvent:e=>events.push(e.detail.action)};
 try{const s=createSession();for(let i=0;i<5;i++)s.answer(true);s.answer(false);assert.deepEqual(events,['bounce','bounce','wink','bounce','highfive','sad']);assert.equal(s.correct,5);}finally{globalThis.document=prior;}
});
