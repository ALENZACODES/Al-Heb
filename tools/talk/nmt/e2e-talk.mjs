// End-to-end check of the Talk language pack in headless Chromium, under the site's real Content-Security-Policy.
// Opens #/talk, checks that nothing of the pack is fetched before the learner asks, downloads one pack with progress,
// translates lines the stored lines do not hold, reloads and checks the pack is still on the device, then goes offline.
// Usage: node tools/talk/nmt/e2e-talk.mjs [he-en|en-he]
import { openApp } from '../../camera-translate/e2e-camera.mjs';

export async function runTalk({ direction = 'he-en', lines = null, timeout = 240000 } = {}) {
  const { server, browser, page, base, errors, reqs, posts } = await openApp();
  const say = lines || (direction === 'he-en' ? ['הכלב שלנו ברח אתמול.', 'איפה המעלית?'] : ['Our dog ran away yesterday.', 'Where is the elevator?']);
  const ask = async (text) => {
    await page.waitForFunction(() => !document.querySelector('.talk-pane-me')?.hasAttribute('aria-busy'));
    await page.evaluate(() => { document.querySelector('.talk-source').textContent = ''; });
    await page.fill('.talk-input textarea', text); await page.click('.talk-input .btn');
    await page.waitForFunction((t) => document.querySelector('.talk-source')?.textContent === t && !document.querySelector('.talk-pane-me')?.hasAttribute('aria-busy'), text, { timeout: 60000 });
    return page.evaluate(() => ({ translation: document.querySelector('.talk-translation')?.textContent || '', badge: document.querySelector('.talk-badge')?.hidden ? '' : document.querySelector('.talk-badge')?.textContent, note: document.querySelector('.talk-pane-me p.muted')?.hidden ? '' : document.querySelector('.talk-pane-me p.muted')?.textContent }));
  };
  try {
    await page.goto(`${base}/#/talk`, { waitUntil: 'load' });
    await page.waitForSelector(`.talk-pack [data-pack="${direction}"]`);
    await page.waitForFunction(() => /MB to download/.test(document.querySelector('.talk-pack')?.textContent || ''));
    const packText = await page.textContent('.talk-pack');
    const before = await ask(say[0]);
    const packRequestsBefore = reqs.filter((u) => /\/assets\/vendor\/_(nmt|ort)\//.test(u) && !u.endsWith('manifest.json')).length;
    const progress = [];
    await page.exposeFunction('__seen', (t) => { progress.push(t); });
    await page.evaluate(() => { const row = document.querySelector('.talk-pack'); new MutationObserver(() => { const p = row.querySelector('progress:not([hidden])'); if (p) window.__seen(p.value); }).observe(row, { subtree: true, childList: true, characterData: true, attributes: true }); });
    const t0 = Date.now();
    await page.click(`.talk-pack [data-pack="${direction}"]`);
    await page.waitForFunction(() => /is ready\. It works offline|could not start|download stopped/.test(document.querySelector('.talk-pack')?.textContent || ''), null, { timeout });
    const packNote = await page.textContent('.talk-pack [role=status]');
    const downloadMs = Date.now() - t0;
    const results = [];
    for (const l of say) { const t = Date.now(); results.push({ line: l, ...(await ask(l)), ms: Date.now() - t }); }
    const cache = await page.evaluate(async () => { const c = await caches.open('alef-talk-pack-v1'); const keys = await c.keys(); let bytes = 0; for (const k of keys) bytes += Number((await c.match(k)).headers.get('content-length') || 0); return { files: keys.length, bytes, names: await caches.keys() }; });
    // a new visit: the pack is already on the device and loads without a download
    const partsFetched = reqs.filter((u) => /\.p\d+\.bin/.test(u)).length;
    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction(() => /on this device and ready/.test(document.querySelector('.talk-pack')?.textContent || ''), null, { timeout: 120000 });
    const refetched = reqs.filter((u) => /\.p\d+\.bin/.test(u)).length - partsFetched;
    const again = await ask(say[0]);
    const origins = [...new Set(reqs.map((u) => new URL(u).origin))];
    return { packText, before, packRequestsBefore, progress, packNote, downloadMs, results, cache, refetched, again, errors, posts, externalOrigins: origins.filter((o) => o !== base && !o.startsWith('blob:') && o !== 'null') };
  } finally { await browser.close(); server.close(); }
}

if (process.argv[1] && process.argv[1].endsWith('e2e-talk.mjs')) {
  const r = await runTalk({ direction: process.argv[2] || 'he-en' });
  console.log(JSON.stringify({ ...r, progress: `${r.progress.length} updates, last ${r.progress[r.progress.length - 1]}` }, null, 1));
}
