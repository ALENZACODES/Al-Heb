import test from 'node:test';
import assert from 'node:assert/strict';
import {MESSAGES,SHABBAT,SHALOM,SPEECH,createSpeechPicker,isFriday,createSpeechSchedule} from '../src/shell/rimon-speech.js';

test('first encounter says hello; encouragement waits five minutes and repeats every five minutes',()=>{
 const s=createSpeechSchedule();assert.equal(s.tick(0,false),null);assert.equal(s.tick(1000),SHALOM);
 s.reaction('highfive');assert.equal(s.tick(300999),null);assert.equal(s.tick(301000),MESSAGES.winner);
 assert.equal(s.tick(600999),null);s.activity(601000);assert.equal(s.tick(601000),MESSAGES.keep);
});
test('break messages require fifteen minutes idle or an hour in the session',()=>{
 const s=createSpeechSchedule();s.tick(0);s.reaction('yawn');assert.equal(s.tick(300000),MESSAGES.keep);
 assert.equal(s.tick(600000),MESSAGES.great);assert.equal(s.tick(900000),MESSAGES.tired);
 s.activity(1199999);assert.notEqual(s.tick(1200000),MESSAGES.fruit);
 const active=createSpeechSchedule();active.tick(0);
 for(let t=300000;t<3600000;t+=300000){active.activity(t);assert.ok(![MESSAGES.tired,MESSAGES.fruit].includes(active.tick(t)));}
 active.activity(3600000);assert.equal(active.tick(3600000),MESSAGES.tired);
 active.activity(3900000);assert.equal(active.tick(3900000),MESSAGES.fruit);
});
test('all ten requested messages have pointed Hebrew and exact English encouragement',()=>{
 assert.equal(Object.keys(MESSAGES).length,10);
 for(const m of Object.values(MESSAGES)){assert.match(m.he,/[א-ת]/);assert.match(m.he,/[\u05B0-\u05BC]/);assert.ok(m.en.length>5);}
 assert.equal(new Set(Object.values(SPEECH).flat()).size,10);
 assert.equal(SHABBAT.en,'SHABBAT SHALOM!');
});
test('Friday greeting uses the local calendar day, including both midnight boundaries',()=>{
 assert.equal(isFriday(new Date(2026,10,5,23,59)),false);
 assert.equal(isFriday(new Date(2026,10,6,0,0)),true);
 assert.equal(isFriday(new Date(2026,10,6,23,59)),true);
 assert.equal(isFriday(new Date(2026,10,7,0,0)),false);
});
test('speech rotates within the action without idle blinks resetting it',()=>{
 const pick=createSpeechPicker();assert.equal(pick('sad'),MESSAGES.again);assert.equal(pick('blink'),null);assert.equal(pick('idle'),null);assert.equal(pick('sad'),MESSAGES.practice);assert.equal(pick('sad'),MESSAGES.again);
 assert.equal(pick('yawn'),MESSAGES.tired);assert.equal(pick('yawn'),MESSAGES.fruit);
 for(const action of ['bounce','laugh','highfive','stretch'])assert.ok(SPEECH[action].every(id=>!['tired','again','practice'].includes(id)));
});
