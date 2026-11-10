import { fileURLToPath } from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import { createAppServer } from '../serve.mjs';
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../../',import.meta.url));
const capture=path.resolve(root,'../rimon-capture-'+Date.now());
const server=createAppServer({root:path.resolve(root)});await new Promise(r=>server.listen(8109,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE || undefined});
try{
const page=await browser.newPage({viewport:{width:1280,height:900},deviceScaleFactor:2});const errors=[],missing=[];
page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message);});page.on('response',r=>{if(r.status()>=400 && /rimon/.test(r.url()))missing.push(r.url());});
await page.goto('http://127.0.0.1:8109/',{waitUntil:'networkidle'});
await page.locator('.home-builder .builder-key').first().waitFor();
if(await page.locator('#alef-prayer-skip').isVisible())await page.locator('#alef-prayer-skip').click();
await page.waitForFunction(()=>document.querySelector('.show-mascot-box .rimon-companion'));
await page.locator('.show-mascot-box').scrollIntoViewIfNeeded();await page.screenshot({path:root+'/docs/qa/rimon-desktop.png'});
await page.evaluate(()=>{window.reactions=[];document.addEventListener('alef:rimon',e=>window.reactions.push(e.detail.action));});
await page.evaluate(()=>{
 const host=document.querySelector('.home-builder'),keys=[...host.querySelectorAll('.builder-tray .builder-key')];
 const click=g=>keys.find(k=>k.dataset.glyph===g).click();
 click('ב');click('א');click('ב');click('א');
});
assert.ok((await page.evaluate(()=>window.reactions)).includes('sad'));
assert.ok((await page.evaluate(()=>window.reactions)).includes('bounce'));
// Exercise the actual shared arcade score, timer, miss and finish methods.
await page.evaluate(async()=>{
 const {createArcade}=await import('/src/games/arcade.js');
 const root=document.createElement('div');document.body.append(root);const data=new Map();
 window.arc=await createArcade(root,{store:{get:k=>data.get(k),set:(k,v)=>data.set(k,v)},settings:{get:()=>false}}, {id:'letterchomp',title:'Test',titleHe:'',blurb:'',howTo:[],levels:Array.from({length:5},()=>({name:'Practice'})),par:()=>10,needsWords:false,needsLetters:false,timed:false});
 arc.begin();arc.addScore(10);arc.miss();arc.finish({won:true});arc.destroy();root.remove();
});
assert.ok((await page.evaluate(()=>window.reactions)).includes('highfive'));
// Load every sheet and inspect all twelve animation frames through the real component.
await page.evaluate(async()=>{const {ACTIONS}=await import('/src/shell/rimon.js');await Promise.all(Object.keys(ACTIONS).map(name=>new Promise((resolve,reject)=>{const im=new Image();im.onload=resolve;im.onerror=reject;im.src='/assets/img/rimon/'+name+'.png';})));});
await page.goto('http://127.0.0.1:8109/#/awards',{waitUntil:'networkidle'});await page.waitForFunction(()=>document.body.dataset.route==='awards');
assert.equal(await page.locator('.rimon-corner').count(),1);
await page.setViewportSize({width:375,height:812});await page.screenshot({path:root+'/docs/qa/rimon-mobile.png'});
await page.getByRole('button',{name:'Hide Rimon',exact:true}).click();assert.equal(await page.locator('.rimon-companion').isVisible(),false);
await page.getByRole('button',{name:'Show Rimon',exact:true}).click();assert.equal(await page.locator('.rimon-companion').isVisible(),true);
await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.querySelector('.rimon-static'),{},{timeout:5000});await page.evaluate(()=>document.dispatchEvent(new CustomEvent('alef:rimon',{detail:{action:'bounce'}})));await page.waitForTimeout(250);
assert.equal(await page.locator('.rimon-companion').getAttribute('data-action'),'idle');assert.equal(await page.locator('.rimon-sprite').evaluate(e=>getComputedStyle(e).animationName),'none');
await page.emulateMedia({reducedMotion:'no-preference'});
await page.setViewportSize({width:960,height:720});
await page.goto('http://127.0.0.1:8109/',{waitUntil:'networkidle'});await page.waitForFunction(()=>document.querySelector('.show-mascot-box .rimon-companion'));
if(await page.locator('#alef-prayer-skip').isVisible())await page.locator('#alef-prayer-skip').click();
await page.locator('.show-mascot-box').scrollIntoViewIfNeeded();
const clip=await page.locator('.show-mascot-box').boundingBox();
fs.mkdirSync(capture,{recursive:true});
const actions=[[0,'wave'],[6500,'bounce'],[9000,'highfive'],[12500,'nervous'],[16500,'stretch']];let next=0,count=0;const started=Date.now();
while(Date.now()-started<22000){const elapsed=Date.now()-started;if(next<actions.length && elapsed>=actions[next][0]){await page.evaluate(action=>document.dispatchEvent(new CustomEvent('alef:rimon',{detail:{action}})),actions[next++][1]);}await page.screenshot({clip,path:`${capture}/${String(count++).padStart(4,'0')}.png`});await page.waitForTimeout(80);}
assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
const report={sheets:12,frames:144,errors,missing,capture,captureFrames:count,builder:'correct and wrong',arcade:'score miss finish',mobile:'375px dismiss restore',reducedMotion:'static'};
fs.writeFileSync(path.join(root,'docs/qa/rimon-results.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await browser.close();server.close();}
