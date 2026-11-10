#!/usr/bin/env node
// Build reviewer packets (CSV sheet + printable HTML + PDF per area) from the repo's flagged data.
//
//   node tools/review/build_packet.mjs [--root DIR] [--out DIR] [--only a,b] [--no-pdf] [--date YYYY-MM-DD] [--quiet]
//
// Read-only with respect to data/ and docs/ (it only writes into --out, default docs/review/out).
import { mkdir, writeFile, readdir, unlink } from 'node:fs/promises';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { AREAS, COLUMNS, OVERHEAD, estimateSeconds, claimFor } from './config.mjs';
import { extractAll, auditScan, coveredFiles } from './lib/extract.mjs';
import { toCsv } from './lib/csv.mjs';
import { renderArea, renderIndex } from './lib/render.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = resolve(HERE, '../..');

export function itemToRow(it) {
  return {
    id: it.id, area: it.area, hebrew: it.he, transliteration: it.translit, english: it.en, what_to_check: it.check,
    status: '', corrected_text: '', reviewer_notes: '', reviewer: '', review_date: '', priority: it.priority, source: it.source,
  };
}

function loadPlaywright() {
  const require = createRequire(import.meta.url);
  for (const p of ['playwright', '/opt/npm-tools/node_modules/playwright', '/usr/lib/node_modules/playwright']) {
    try { return require(p); } catch { /* try next */ }
  }
  return null;
}

export async function buildPackets(opts = {}) {
  const root = resolve(opts.root || DEFAULT_ROOT);
  const out = resolve(opts.out || join(root, 'docs/review/out'));
  const date = opts.date || new Date().toISOString().slice(0, 10);
  const log = opts.quiet ? () => {} : (m) => console.log(m);
  await mkdir(out, { recursive: true });
  // remove stale packet files from earlier runs so the folder always matches the data
  for (const f of await readdir(out)) if (/^\d\d-.*\.(csv|html|pdf)$|^(index\.html|manifest\.json)$/.test(f)) await unlink(join(out, f));

  const { byArea } = await extractAll(root, opts.only);
  const fontAbs = join(root, 'assets/fonts/frankruhllibre-FrankRuhlLibre[wght].ttf');
  const fontHref = existsSync(fontAbs) ? relative(out, fontAbs).split('\\').join('/').replace(/\[/g, '%5B').replace(/\]/g, '%5D') : null;

  let pw = null, browser = null;
  if (!opts.noPdf) {
    pw = loadPlaywright();
    if (pw) { try { browser = await pw.chromium.launch(); } catch (e) { log(`! Playwright could not launch (${e.message.split('\n')[0]}); PDFs skipped`); } }
    else log('! Playwright not found; PDFs skipped');
  }

  const areas = [];
  for (const a of AREAS) {
    const items = byArea[a.slug];
    if (!items || !items.length) continue;
    const base = `${String(a.n).padStart(2, '0')}-${a.slug}`;
    const secs = items.reduce((s, it) => s + estimateSeconds(a.slug, it), 0);
    const hours = (secs * OVERHEAD) / 3600;
    const files = { csv: `${base}.csv` };
    await writeFile(join(out, files.csv), toCsv(COLUMNS, items.map(itemToRow)));
    if (!a.noPdf) {
      files.html = `${base}.html`;
      const html = renderArea(a, items, { hours, fontHref });
      await writeFile(join(out, files.html), html);
      if (browser) {
        const page = await browser.newPage();
        await page.goto(pathToFileURL(join(out, files.html)).href);
        await page.evaluate(() => document.fonts.ready);
        files.pdf = `${base}.pdf`;
        await page.pdf({
          path: join(out, files.pdf), format: 'Letter', printBackground: true, displayHeaderFooter: true,
          headerTemplate: '<div></div>',
          footerTemplate: `<div style="font-size:8px;width:100%;text-align:center;color:#555;font-family:sans-serif">${a.n}. ${a.slug} &middot; page <span class="pageNumber"></span> of <span class="totalPages"></span></div>`,
          margin: { top: '0.6in', bottom: '0.7in', left: '0.6in', right: '0.6in' },
        });
        await page.close();
      }
    }
    areas.push({
      slug: a.slug, n: a.n, title: a.title, priority: a.priority, group: a.group, reviewer: a.reviewer,
      items: items.length, hebrewWords: items.reduce((s, it) => s + (it.he ? it.he.split(/\s+/).filter(Boolean).length : 0), 0),
      hours, files,
    });
    log(`  ${String(a.n).padStart(2)} ${a.slug.padEnd(18)} ${String(items.length).padStart(5)} items  ${hours.toFixed(1).padStart(5)} h`);
  }
  if (browser) await browser.close();

  const audit = await auditScan(root);
  const covered = coveredFiles(byArea);
  const uncovered = audit.data.filter((d) => !covered.has(d.file) && !claimFor(d.file));
  const claimed = audit.data.filter((d) => !covered.has(d.file) && claimFor(d.file)).map((d) => ({ ...d, area: claimFor(d.file).area }));
  const total = areas.reduce((s, a) => s + a.items, 0);
  const manifest = {
    generated: date, root: root === DEFAULT_ROOT ? '.' : root, totalItems: total,
    totalHours: areas.reduce((s, a) => s + a.hours, 0),
    phaseOneHours: areas.filter((a) => a.priority <= 6).reduce((s, a) => s + a.hours, 0),
    overheadMultiplier: OVERHEAD, areas, audit: { dataFilesWithFlags: audit.data, docsWithMarkers: audit.docs, dataFilesNotCoveredByAnyArea: uncovered, dataFilesClaimedWithoutRows: claimed },
  };
  await writeFile(join(out, 'manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
  await writeFile(join(out, 'index.html'), renderIndex(manifest));
  log(`  total ${total} items, about ${manifest.totalHours.toFixed(1)} h (phase one ${manifest.phaseOneHours.toFixed(1)} h)`);
  if (uncovered.length) log(`! flagged data files with no packet area: ${uncovered.map((u) => u.file).join(', ')}`);
  return { manifest, out, byArea };
}

function parseArgs(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--root') o.root = argv[++i];
    else if (a === '--out') o.out = argv[++i];
    else if (a === '--only') o.only = argv[++i].split(',');
    else if (a === '--date') o.date = argv[++i];
    else if (a === '--no-pdf') o.noPdf = true;
    else if (a === '--quiet') o.quiet = true;
    else if (a === '-h' || a === '--help') o.help = true;
    else throw new Error(`unknown argument ${a}`);
  }
  return o;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const o = parseArgs(process.argv.slice(2));
  if (o.help) { console.log('usage: node tools/review/build_packet.mjs [--root DIR] [--out DIR] [--only a,b] [--no-pdf] [--date YYYY-MM-DD] [--quiet]'); process.exit(0); }
  buildPackets(o).catch((e) => { console.error(e.stack || e); process.exit(1); });
}
