import test from 'node:test';
import assert from 'node:assert/strict';
import { createRimonClock, FRAMES, SEQUENCES } from '../src/shell/rimon-model.js';
import { createSession } from '../src/games/engine.js';
import { completeLesson } from '../src/curriculum/actions.js';
import { lessons } from '../src/curriculum/lessons.js';
import { createStore,createMemoryStorage } from '../src/store.js';
test('idle blink starts at random boundaries of 3–6 seconds, with half and closed eyes',()=>{
  for(const [random,delay] of [[0,3000],[1,6000]]){
    const c=createRimonClock({random:()=>random});
    assert.equal(c.tick(delay-1).action,'idle');
    assert.equal(c.tick(delay).frame,1);assert.equal(c.tick(delay+90).frame,2);
    assert.equal(c.tick(delay+360).action,'idle');
    assert.equal(c.tick(delay*2).action,'blink');
  }
});
test('all reactions finish and return to idle; 16 distinct named poses',()=>{
  assert.equal(new Set(FRAMES).size,16);
  for(const [name,seq] of Object.entries(SEQUENCES)){
    const c=createRimonClock();assert.equal(c.trigger(name,0),true);
    for(let i=0;i<seq.frames.length;i++)assert.equal(c.tick(i*seq.hold).frame,seq.frames[i]);
    assert.equal(c.tick(seq.hold*seq.frames.length).action,'idle');
  }
});
test('yawn requires 60 seconds without interaction and does not repeat until activity',()=>{
  const c=createRimonClock();assert.equal(c.tick(60000).action,'yawn');
  c.tick(61440);assert.notEqual(c.tick(120000).action,'yawn');
  c.activity(120000);c.tick(120400);assert.equal(c.tick(180000).action,'yawn');
});
test('reduced motion cancels current and queued reactions, and stays static',()=>{
  const c=createRimonClock();c.trigger('correct',0);c.trigger('wrong',1);c.reduce(true,2);
  for(const t of [2,5000,60000])assert.deepEqual(c.tick(t),{frame:0,action:'still'});
  assert.equal(c.trigger('wave',60001),false);c.reduce(false,60002);assert.equal(c.tick(60002).action,'idle');
});
test('actual answer and saved lesson events fire; a failed save does not point onward',async()=>{
  const previous=globalThis.document,events=[];globalThis.document={dispatchEvent:e=>events.push(e.detail)};
  try{
    const game=createSession();game.answer(true);game.answer(false);
    assert.deepEqual(events.map(e=>e.action),['correct','wrong']);
    const store=createStore({storage:createMemoryStorage()});
    await completeLesson({store},lessons[0]);assert.equal(events.at(-1).action,'lesson');
    assert.match(events.at(-1).nextHref,/^#\/learn\?lesson=/);
    const count=events.length;
    await assert.rejects(()=>completeLesson({store:{get:()=>undefined,set:()=>{throw Error('save denied');}}},lessons[0]));
    assert.equal(events.length,count);
  }finally{globalThis.document=previous;}
});
