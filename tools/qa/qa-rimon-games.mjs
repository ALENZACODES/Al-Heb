import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root=fileURLToPath(new URL('../../',import.meta.url));
const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE || undefined});
const errors=[],ends=[];
for(const width of [960,375]){
 const page=await browser.newPage({viewport:{width,height:812}});page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.RIMON_URL || 'http://127.0.0.1:8080/',{waitUntil:'networkidle'});
 if(await page.locator('#alef-prayer-noshow').isVisible())await page.locator('#alef-prayer-noshow').click();
 await page.evaluate(()=>location.hash='#/tugowar');await page.locator('.game-choice').first().waitFor();
 const answers=await page.evaluate(async()=>{window.tugRound=(await import('/src/games/tugowar.view.js')).buildRound;return Array.from({length:8},(_,i)=>(window.tugRound)(i+1).answer.he);});
 for(const answer of answers){await page.locator('.game-choice').filter({has:page.locator('.he',{hasText:answer})}).click();await page.waitForTimeout(500);}
 await page.locator('.game-results').waitFor();assert.ok(await page.locator('.rimon-dock').isVisible());ends.push({game:'tugowar',width});
 await page.evaluate(()=>location.hash='#/wordbuilder');await page.locator('.arc-start').click();await page.locator('.arc-prompt .he').waitFor();
 for(let n=0;n<8;n++){
  const glyphs=[...(await page.locator('.arc-prompt .he').innerText()).replace(/[\u0591-\u05BD\u05BF-\u05C7]/g,'')];
  for(const glyph of glyphs)await page.locator('.arc-choice:not([disabled])').filter({hasText:new RegExp('^'+glyph+'$')}).first().click();
 }
 await page.locator('.arc-results-card').waitFor();assert.ok(await page.locator('.rimon-dock').isVisible());ends.push({game:'wordbuilder',width});
 await page.evaluate(()=>location.hash='#/wordfinder');await page.locator('.wf-next').waitFor();
 for(let n=0;n<5;n++){
  await page.locator('.wf-next').click();await page.getByRole('button',{name:'Show me a hint',exact:true}).click();
  await page.locator('.wf-glow').click();await page.locator('.wf-next').click();
 }
 await page.locator('.wf-complete').waitFor();assert.ok(await page.locator('.rimon-dock').isVisible());ends.push({game:'wordfinder',width});
 await page.screenshot({path:root+'docs/qa/rimon-game-end-'+width+'.png'});await page.close();
}
assert.deepEqual(errors,[]);const p=root+'docs/qa/rimon-results.json',report=JSON.parse(fs.readFileSync(p));Object.assign(report,{gameEnds:ends,gameErrors:errors});fs.writeFileSync(p,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({ends,errors}));await browser.close();
