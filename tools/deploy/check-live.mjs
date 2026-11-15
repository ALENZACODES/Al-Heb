#!/usr/bin/env node
// Live deploy check: is the live site the same build as this checkout, and does it send the headers render.yaml asks for?
// Usage: node tools/deploy/check-live.mjs [--base https://alef-review.onrender.com/] [--files N] [--json]
//   --files N   compare the bytes of N precached files (default: all of them; 0 skips the file compare)
// Exit 0 = same build and every header present, 1 = drift or a missing header, 2 = the site could not be reached.
// Read-only: it only sends GET requests. It never deploys or changes the Render service.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..');

/** ALEF_VERSION and the precache list from the text of precache-manifest.js. */
export function parseManifest(src) {
  const version = /self\.ALEF_VERSION\s*=\s*"([^"]+)"/.exec(src)?.[1] ?? '';
  const list = /self\.ALEF_PRECACHE\s*=\s*(\[[\s\S]*?\]);/.exec(src)?.[1];
  let files = [];
  try { files = list ? JSON.parse(list) : []; } catch { files = []; }
  return { version, files };
}

/** The headers render.yaml asks for, as [{ path, name, value }]. Reads only the `headers:` block of the first service. */
export function parseRenderHeaders(yaml) {
  const out = []; let cur = null; let inHeaders = false; let indent = -1;
  for (const line of yaml.split('\n')) {
    if (/^\s*#/.test(line) || !line.trim()) continue;
    const lead = line.length - line.trimStart().length;
    if (/^\s*headers:\s*$/.test(line)) { inHeaders = true; indent = lead; continue; }
    if (!inHeaders) continue;
    if (lead <= indent) break;
    const m = /^\s*(-\s*)?(path|name|value):\s*(.*)$/.exec(line);
    if (!m) continue;
    if (m[1]) { cur = {}; out.push(cur); }
    let v = m[3].trim();
    if (/^".*"$/.test(v) || /^'.*'$/.test(v)) v = v.slice(1, -1);
    if (cur) cur[m[2]] = v;
  }
  return out.filter((h) => h.path && h.name && h.value);
}

/** Which of the wanted headers apply to a URL path (render.yaml paths are exact, or end in `*`). */
export function headersFor(path, wanted) {
  return wanted.filter((h) => (h.path.endsWith('*') ? path.startsWith(h.path.slice(0, -1)) : path === h.path));
}

/** Compare wanted headers with a Headers-like object; returns [{ name, want, got }] for each mismatch. */
export function compareHeaders(wanted, got) {
  const bad = [];
  const seen = new Set();
  for (const h of wanted) {
    const key = h.name.toLowerCase();
    if (seen.has(key + '\0' + h.value)) continue; seen.add(key + '\0' + h.value);
    const have = got.get(key);
    const ok = key === 'cache-control' ? (have || '').toLowerCase().includes(h.value.toLowerCase()) : have === h.value;
    if (!ok) bad.push({ name: h.name, want: h.value, got: have ?? null });
  }
  return bad;
}

async function main(argv) {
  const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
  const base = new URL(arg('--base', 'https://alef-review.onrender.com/'));
  const nFiles = Number(arg('--files', 'Infinity'));
  const asJson = argv.includes('--json');
  const report = { base: base.href, checkedAt: new Date().toISOString(), version: {}, files: {}, headers: [] };
  const get = (p) => fetch(new URL(p, base), { redirect: 'follow', headers: { 'cache-control': 'no-cache' } });

  let liveManifest;
  try { const r = await get('precache-manifest.js'); if (!r.ok) throw new Error('HTTP ' + r.status); liveManifest = parseManifest(await r.text()); }
  catch (e) { console.error(`could not reach ${base.href}precache-manifest.js: ${e.message}`); return 2; }
  const local = parseManifest(readFileSync(join(root, 'precache-manifest.js'), 'utf8'));
  report.version = { live: liveManifest.version, here: local.version, same: liveManifest.version === local.version };

  // Byte compare of precached files (the manifest version alone misses a deploy that skipped the precache rebuild).
  const list = local.files.slice(0, Number.isFinite(nFiles) ? nFiles : undefined);
  const differ = [], missing = []; let i = 0;
  const sha = (b) => createHash('sha256').update(b).digest('hex');
  await Promise.all(Array.from({ length: 8 }, async () => {
    while (i < list.length) {
      const f = list[i++];
      let here; try { here = readFileSync(join(root, f)); } catch { continue; }
      try { const r = await get(f); if (!r.ok) { missing.push(`${f} (HTTP ${r.status})`); continue; } if (sha(Buffer.from(await r.arrayBuffer())) !== sha(here)) differ.push(f); }
      catch (e) { missing.push(`${f} (${e.message})`); }
    }
  }));
  report.files = { compared: list.length, differ, missing };

  const wanted = parseRenderHeaders(readFileSync(join(root, 'render.yaml'), 'utf8'));
  for (const p of ['/', '/index.html', '/sw.js', '/precache-manifest.js', '/manifest.webmanifest']) {
    const want = headersFor(p, wanted); if (!want.length) continue;
    let got; try { got = (await get(p.slice(1) || './')).headers; } catch (e) { report.headers.push({ path: p, error: e.message }); continue; }
    for (const b of compareHeaders(want, got)) report.headers.push({ path: p, ...b });
  }

  const bad = !report.version.same || differ.length || missing.length || report.headers.length;
  if (asJson) { console.log(JSON.stringify(report, null, 1)); return bad ? 1 : 0; }
  console.log(`live: ${base.href}`);
  console.log(`build: live ${report.version.live || '?'} / this checkout ${report.version.here || '?'} -> ${report.version.same ? 'same' : 'DIFFERENT'}`);
  console.log(`precached files: ${list.length} compared, ${differ.length} differ, ${missing.length} missing`);
  for (const f of differ.slice(0, 20)) console.log(`  differs: ${f}`);
  for (const f of missing.slice(0, 20)) console.log(`  missing: ${f}`);
  const byName = new Map();
  for (const h of report.headers) { const k = h.name ?? 'error'; if (!byName.has(k)) byName.set(k, []); byName.get(k).push(h); }
  console.log(`headers: ${report.headers.length ? `${byName.size} header(s) not as render.yaml asks` : 'all present'}`);
  for (const [name, hs] of byName) console.log(`  ${name}: ${hs[0].error ?? (hs[0].got === null ? 'not sent' : `sent "${hs[0].got}"`)} on ${hs.map((h) => h.path).join(', ')}`);
  if (report.headers.length) console.log('  Set these on the Render service (Settings > Headers); see docs/deploy/RENDER-HEADERS-2026-11-10.md.');
  return bad ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv.slice(2)).then((c) => process.exit(c));
