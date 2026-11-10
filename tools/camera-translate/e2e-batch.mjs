// Measure the in-browser Camera Translator on a folder of labelled sign images, in one headless Chromium session.
// Usage: node tools/camera-translate/e2e-batch.mjs <folder with ground-truth.json> [--out results.json] [--mode binary|grey]
// ground-truth.json: {items:[{id, file, variant?, lines:[{he, en}]}]}  (tests/signs has one; make_signs.py --wear-dir writes one)
// Scores are the same as eval.py: character error rate on letters and digits, lines read exactly, lines translated end to end.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { openApp } from './e2e-camera.mjs';

const normHe = (s) => String(s || '').replace(/[֑-ׇ]/g, '').replace(/[^א-ת0-9]/g, '');
const normEn = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
function editDistance(a, b) {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) { const cur = [i]; for (let j = 1; j <= b.length; j++) cur.push(Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] !== b[j - 1] ? 1 : 0))); prev = cur; }
  return prev[b.length];
}

export async function runBatch(dir, { mode } = {}) {
  dir = resolve(dir);
  const gt = JSON.parse(readFileSync(join(dir, 'ground-truth.json'), 'utf8'));
  const { server, browser, page, base, errors, posts, reqs } = await openApp();
  await page.route('**/__signs__/*', (route) => route.fulfill({ path: join(dir, decodeURIComponent(new URL(route.request().url()).pathname.split('/').pop())) }));
  const by = {}; const rows = [];
  try {
    await page.goto(`${base}/#/camera`, { waitUntil: 'load' });
    await page.waitForSelector('.camera-tr[data-mode]');
    for (const it of gt.items) {
      const res = await page.evaluate(async ({ file, mode }) => {
        const m = await import('/src/camera/on-device.js'); const c = await import('/src/camera/camera-client.js'); const mod = await import('/src/camera/camera-model.js');
        const w = globalThis; w.__g ||= mod.createGlossary(await c.loadGlossaryData(), { phrasebook: await c.loadPhrasebook() });
        const blob = await (await fetch(`/__signs__/${encodeURIComponent(file)}`)).blob();
        const t0 = performance.now();
        const r = await m.translateOnDevice(blob, { glossary: w.__g, engine: w.__eng, readerMode: mode,
          dictionaryLoader: async () => (w.__d ||= mod.createDictionary(await c.loadDictionaryIndex())) });
        w.__eng = r.engine;
        return { ms: Math.round(performance.now() - t0), levelled: r.levelled, regions: r.regions.map((x) => ({ he: x.he, en: x.en, src: x.translationSource, drawn: x.drawn })) };
      }, { file: it.file, mode });
      const ref = it.lines.map((l) => normHe(l.he)).join(''); const hyp = res.regions.map((r) => normHe(r.he)).join('');
      const e = editDistance(hyp, ref);
      const hypLines = new Set(res.regions.map((r) => normHe(r.he))); const hypEn = new Set(res.regions.filter((r) => r.en).map((r) => normEn(r.en)));
      const b = (by[it.variant || 'all'] ||= { images: 0, edits: 0, ref: 0, lines: 0, read: 0, translated: 0, wrong: 0, ms: 0 });
      b.images++; b.edits += e; b.ref += ref.length; b.ms += res.ms;
      for (const l of it.lines) { b.lines++; if (hypLines.has(normHe(l.he))) b.read++; if (hypEn.has(normEn(l.en))) b.translated++; }
      const expected = new Set(it.lines.map((l) => normEn(l.en)));
      const wrong = res.regions.filter((r) => r.en && !expected.has(normEn(r.en)));
      b.wrong += wrong.length;
      rows.push({ id: it.id, variant: it.variant, cer: +(e / Math.max(1, ref.length)).toFixed(4), ms: res.ms, levelled: res.levelled.applied ? res.levelled.angle : 0,
        read: res.regions.map((r) => r.he), english: res.regions.map((r) => r.en), wrong: wrong.map((r) => `${r.he} -> ${r.en} (${r.src})`) });
    }
  } finally { await browser.close(); server.close(); }
  const total = { images: 0, edits: 0, ref: 0, lines: 0, read: 0, translated: 0, wrong: 0, ms: 0 };
  for (const b of Object.values(by)) { for (const k of Object.keys(total)) total[k] += b[k]; }
  const finish = (b) => ({ images: b.images, cerPooled: +(b.edits / Math.max(1, b.ref)).toFixed(4), lines: b.lines, linesReadExactly: b.read, linesTranslatedEndToEnd: b.translated, wrongEnglishDrawn: b.wrong, meanMs: Math.round(b.ms / Math.max(1, b.images)) });
  return { synthetic: true, note: 'Computer-made sign images, not photographs. Headless desktop Chromium, not a phone.', reader: `in-browser reader, mode ${mode || 'binary'}`,
    total: finish(total), byWear: Object.fromEntries(Object.entries(by).map(([k, b]) => [k, finish(b)])), rows,
    pageErrors: errors.filter((x) => !/Estimating resolution/.test(x)), nonGetRequests: posts,
    otherOrigins: [...new Set(reqs.map((u) => new URL(u).origin))].filter((o) => o !== base && !o.startsWith('blob:')) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2); const out = args.includes('--out') ? args[args.indexOf('--out') + 1] : null; const mode = args.includes('--mode') ? args[args.indexOf('--mode') + 1] : undefined;
  const r = await runBatch(args[0], { mode });
  if (out) writeFileSync(out, JSON.stringify(r, null, 1));
  console.log(JSON.stringify({ reader: r.reader, total: r.total, byWear: r.byWear, pageErrors: r.pageErrors, nonGetRequests: r.nonGetRequests, otherOrigins: r.otherOrigins }, null, 1));
  for (const row of r.rows) if (row.wrong.length) console.log('WRONG', row.id, row.variant, row.wrong.join('; '));
}
