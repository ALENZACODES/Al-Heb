import test from 'node:test';
import assert from 'node:assert/strict';
import {MESSAGES,SHABBAT,SPEECH,createSpeechPicker,isFriday} from '../src/shell/rimon-speech.js';
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
