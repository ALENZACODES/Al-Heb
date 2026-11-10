import { fileURLToPath } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
import fs from 'node:fs';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../../',import.meta.url));
const words=JSON.parse(fs.readFileSync(root+'data/builder_words.json'));
const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE || undefined,args:['--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:1280,height:900}});
const errors=[],missing=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
page.on('response',r=>{if(r.status()>=400)missing.push({url:r.url(),status:r.status()});});
await page.addInitScript(()=>{
  window.playLog=[];
  const real=HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play=function(){window.playLog.push({src:this.src,rate:this.playbackRate});return real.call(this);};
});
await page.goto(process.env.BUILDER_URL || 'http://127.0.0.1:8080/',{waitUntil:'networkidle'});
await page.locator('.home-builder .builder-key').first().waitFor();
const skip=page.locator('#alef-prayer-skip');if(await skip.isVisible())await skip.click();
assert.equal(await page.locator('.home-builder > .builder-tray .builder-key').count(),8);
assert.equal(await page.getByLabel('Builder level',{exact:true}).inputValue(),'1');
await page.locator('.home-builder').scrollIntoViewIfNeeded();
fs.mkdirSync(root+'docs/qa',{recursive:true});
await page.screenshot({path:root+'docs/qa/builder-desktop.png'});
await page.getByLabel('Builder level',{exact:true}).selectOption('5');
assert.equal(await page.locator('.home-builder > .builder-tray .builder-key').count(),27);
const completion=await page.evaluate(words=>{
  const host=document.querySelector('.home-builder'),select=host.querySelector('[aria-label="Choose a word"]');
  let built=0;
  for(const w of words){
    select.value=w.id;select.dispatchEvent(new Event('change'));
    const before=window.playLog.length;
    for(const glyph of w.letters)host.querySelector(`.builder-tray .builder-key[data-glyph="${glyph}"]`).click();
    if(window.playLog.length!==before+1)throw new Error('Autoplay count '+w.id);
    if(window.playLog.at(-1).rate!==1)throw new Error('Non-normal autoplay '+w.id);
    if(!host.querySelector('.builder-status').textContent.startsWith('You built'))throw new Error('Not complete '+w.id);
    host.querySelector('.builder-tray .builder-key').click();
    if(window.playLog.length!==before+1)throw new Error('Repeated autoplay '+w.id);
    built++;
  }
  return {built,tally:host.querySelector('.builder-tally').textContent};
},words);
console.log('COMPLETION',JSON.stringify(completion));
await page.getByLabel('Builder voice',{exact:true}).selectOption('m');
await page.locator('.builder-target').getByRole('button',{name:/Play slowly/}).click();
assert.equal(await page.evaluate(()=>window.playLog.at(-1).rate),0.6);
await page.locator('.builder-target').getByRole('button',{name:/^Play /}).first().click();
assert.equal(await page.evaluate(()=>window.playLog.at(-1).rate),1);
assert.match(await page.evaluate(()=>window.playLog.at(-1).src),/_ari\.mp3$/);
const beforeTradition=await page.evaluate(()=>window.playLog.at(-1).src);
await page.getByLabel('Phonetic style',{exact:true}).selectOption('ashkenazi');
await page.locator('.builder-target').getByRole('button',{name:/^Play /}).first().click();
assert.equal(await page.evaluate(()=>window.playLog.at(-1).src),beforeTradition);
await page.getByLabel('Practise vowel marks',{exact:false}).check();
const pointed=words.find(w=>w.hebrew==='שלום');
await page.getByLabel('Choose a word',{exact:true}).selectOption(pointed.id);
await page.evaluate(word=>{
  const host=document.querySelector('.home-builder');
  for(const glyph of [...word.nikud.normalize('NFD')])host.querySelector(`.builder-key[data-glyph="${glyph}"]`).click();
  if(!host.querySelector('.builder-status').textContent.startsWith('You built'))throw new Error('Pointed build failed');
},pointed);
await page.getByLabel('Practise vowel marks',{exact:false}).uncheck();
await page.reload({waitUntil:'networkidle'});
assert.match(await page.locator('.builder-tally').innerText(),/162 different words built/);
assert.equal(await page.getByLabel('Builder voice',{exact:true}).inputValue(),'m');
assert.equal(await page.getByLabel('Phonetic style',{exact:true}).inputValue(),'ashkenazi');
await page.setViewportSize({width:375,height:812});
await page.locator('.home-builder').scrollIntoViewIfNeeded();
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
if(await page.locator('#alef-prayer-skip').isVisible())await page.locator('#alef-prayer-skip').click();
await page.locator('.home-builder').screenshot({path:root+'docs/qa/builder-phone.png'});
console.log('UI',JSON.stringify({errors,missing}));
assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
const manifest=JSON.parse(fs.readFileSync(root+'tools/audio/builder-manifest.json'));
assert.equal(manifest.clips.length,408);
const playback=await page.evaluate(async clips=>{
  const results=[];
  for(let offset=0;offset<clips.length;offset+=12){
    await Promise.all(clips.slice(offset,offset+12).map(c=>new Promise(resolve=>{
      const a=new Audio(c.path);a.muted=true;a.playbackRate=1;
      const timer=setTimeout(()=>finish('timeout'),20000);
      function finish(status){clearTimeout(timer);a.pause();a.removeAttribute('src');resolve(results.push({path:c.path,status}));}
      a.onended=()=>finish('ended');a.onerror=()=>finish('error');a.play().catch(()=>finish('rejected'));
    })));
  }
  return results;
},manifest.clips);
const failed=playback.filter(r=>r.status!=='ended');
console.log('PLAYBACK',JSON.stringify({total:playback.length,failed}));
fs.writeFileSync(root+'docs/qa/builder-results.json',JSON.stringify({words:words.length,threeLetter:words.filter(w=>w.letters.length===3).length,completion,playbackCount:playback.length,failed,errors,missing,viewportWidths:[1280,375]},null,2)+'\n');
await browser.close();
assert.deepEqual(failed,[]);
