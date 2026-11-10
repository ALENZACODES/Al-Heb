const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { chromium } = require('playwright');
(async () => {
  const root = fs.mkdtempSync(path.join(require('os').tmpdir(), 'alef-update-'));
  fs.copyFileSync(path.resolve(__dirname,'../../sw.js'),path.join(root,'sw.js'));
  const write = v => {
    fs.writeFileSync(path.join(root,'precache-manifest.js'), `self.ALEF_VERSION='${v}';self.ALEF_PRECACHE=['index.html','version.js'];`);
    fs.writeFileSync(path.join(root,'index.html'), `<title>${v}</title><h1>${v}</h1>`);
    fs.writeFileSync(path.join(root,'version.js'),v);
  };
  write('v1');
  const { createAppServer } = await import(pathToFileURL(path.resolve(__dirname,'../serve.mjs')).href);
  const server=createAppServer({root}); await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({executablePath:process.env.QA_CHROME || undefined});
  try {
    const ctx=await browser.newContext(); const p=await ctx.newPage(); const url=`http://127.0.0.1:${server.address().port}/`;
    await p.goto(url);
    await p.evaluate(async()=>{await navigator.serviceWorker.register('sw.js');await navigator.serviceWorker.ready;});
    await p.reload();
    await p.waitForFunction(()=>!!navigator.serviceWorker.controller);
    write('v2');
    await p.evaluate(async()=>{await (await navigator.serviceWorker.getRegistration()).update();});
    await p.waitForFunction(async()=>!!(await navigator.serviceWorker.getRegistration()).waiting);
    const old=await p.evaluate(()=>fetch('version.js').then(r=>r.text()));
    if(old!=='v1')throw Error('Old controller served new module: '+old);
    const other=await ctx.newPage();await other.goto(url);
    const blocked=await p.evaluate(async()=>{
      return await new Promise(async resolve=>{
        navigator.serviceWorker.addEventListener('message',e=>resolve(e.data),{once:true});
        (await navigator.serviceWorker.getRegistration()).waiting.postMessage({type:'SKIP_WAITING'});
      });
    });
    if(blocked.type!=='UPDATE_BLOCKED')throw Error('No multiple-tab protection');
    await other.close();
    await p.evaluate(async()=>{
      await new Promise(async resolve=>{
        navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true});
        (await navigator.serviceWorker.getRegistration()).waiting.postMessage({type:'SKIP_WAITING'});
      });
    });
    await p.reload();
    if(await p.locator('h1').innerText()!=='v2')throw Error('New document not loaded');
    if(await p.evaluate(()=>fetch('version.js').then(r=>r.text()))!=='v2')throw Error('New module not loaded');
    console.log('PASS: immutable old modules; waiting update; two-tab block; explicit one-tab activation; coherent new document/modules.');
  } finally {await browser.close();server.close();fs.rmSync(root,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exit(1);});
