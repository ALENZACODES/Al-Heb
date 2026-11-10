#!/usr/bin/env node
// Batch image generation through the OpenAI Images API.
//   DEFAULT IS DRY RUN: no network, no key needed. Pass --live to actually call the API.
//
//   node tools/images/gen_via_api.mjs                      # dry run, all pending rows, prints plan
//   node tools/images/gen_via_api.mjs --block B --limit 5  # dry run for 5 rows of block B
//   OPENAI_API_KEY=... node tools/images/gen_via_api.mjs --live --command 11 --variants 3
//
// Options: --live | --dry-run  --variants N (1..3, default 1)  --block A-F  --command N  --match substr
//          --limit N  --resume (default on; --no-resume to redo)  --model NAME  --quality low|medium|high
//          --delay MS (default 1500)  --out DIR (default assets/img/generated)  --log FILE
// Outputs: <out>/<stem>__v<k>.png per variant + one JSON line per attempt in the log (default data/images/gen-log.jsonl).
// A human picks the winning variant and copies it to assets/img/<stem>.png (see docs/book/IMAGE-RUN.md).
//
// STATUS: the --live path has NEVER been run (no key, no network access to OpenAI in the build session).
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

export function parseArgs(argv) {
  const o = { live: false, variants: 1, resume: true, delay: 1500, model: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2', quality: 'medium', out: 'assets/img/generated', log: 'data/images/gen-log.jsonl', limit: Infinity };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i], nx = () => argv[++i];
    if (a === '--live') o.live = true;
    else if (a === '--dry-run') o.live = false;
    else if (a === '--no-resume') o.resume = false;
    else if (a === '--resume') o.resume = true;
    else if (a === '--variants') o.variants = Math.max(1, Math.min(3, +nx()));
    else if (a === '--block') o.block = nx().toUpperCase();
    else if (a === '--command') o.command = +nx();
    else if (a === '--match') o.match = nx();
    else if (a === '--limit') o.limit = +nx();
    else if (a === '--model') o.model = nx();
    else if (a === '--quality') o.quality = nx();
    else if (a === '--delay') o.delay = +nx();
    else if (a === '--out') o.out = nx();
    else if (a === '--log') o.log = nx();
    else if (a === '--help' || a === '-h') o.help = true;
    else throw new Error(`unknown option ${a}`);
  }
  return o;
}

/** Map a target size to the nearest size the API accepts (1024x1024, 1536x1024, 1024x1536). Resize afterwards. */
export function apiSize(w, h) {
  if (w === h) return '1024x1024';
  return w > h ? '1536x1024' : '1024x1536';
}

export function selectRows(data, o) {
  let rows = data.groups.flatMap((g) => g.rows);
  if (o.block) rows = rows.filter((r) => r.block === o.block);
  if (o.command) rows = rows.filter((r) => r.command === o.command);
  if (o.match) rows = rows.filter((r) => r.file.includes(o.match));
  return rows;
}

const stem = (f) => f.replace(/\.png$/, '');
export const variantPath = (o, row, k) => join(ROOT, o.out, `${stem(row.file)}__v${k}.png`);

export function loadDone(o) {
  const done = new Set();
  const lp = join(ROOT, o.log);
  if (existsSync(lp)) for (const line of readFileSync(lp, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try { const j = JSON.parse(line); if (j.ok) done.add(`${j.file}#${j.variant}`); } catch { /* ignore bad line */ }
  }
  return done;
}

async function callApi(o, row, size, refPaths) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('OPENAI_API_KEY not set');
  const headers = { Authorization: `Bearer ${key}` };
  let res;
  if (refPaths.length) {
    const fd = new FormData();
    fd.set('model', o.model); fd.set('prompt', row.prompt); fd.set('size', size); fd.set('quality', o.quality);
    for (const p of refPaths) fd.append('image[]', new Blob([readFileSync(p)], { type: 'image/png' }), p.split('/').pop());
    res = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers, body: fd });
  } else {
    res = await fetch('https://api.openai.com/v1/images/generations', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: o.model, prompt: row.prompt, size, quality: o.quality, n: 1 }) });
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const j = await res.json();
  const b64 = j.data?.[0]?.b64_json;
  if (!b64) throw new Error('no b64_json in response');
  return Buffer.from(b64, 'base64');
}

/** Resolve a row's reference files: approved finals in assets/img/, else skip (and note). */
export function resolveRefs(row) {
  const found = [], missing = [];
  for (const r of row.refs || []) {
    const p = join(ROOT, 'assets/img', r);
    (existsSync(p) ? found : missing).push(existsSync(p) ? p : r);
  }
  return { found, missing };
}

export async function main(argv) {
  const o = parseArgs(argv);
  if (o.help) { console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 14).join('\n')); return; }
  const data = JSON.parse(readFileSync(join(ROOT, 'data/images/prompt-groups.json'), 'utf8'));
  const rows = selectRows(data, o);
  const done = o.resume ? loadDone(o) : new Set();
  const log = (obj) => { const lp = join(ROOT, o.log); mkdirSync(dirname(lp), { recursive: true }); appendFileSync(lp, JSON.stringify({ t: new Date().toISOString(), ...obj }) + '\n'); };
  console.log(`[gen] mode=${o.live ? 'LIVE' : 'DRY-RUN'} model=${o.model} variants=${o.variants} rows=${rows.length} resume=${o.resume}`);
  let n = 0, calls = 0;
  for (const row of rows) {
    if (n >= o.limit) break;
    n++;
    const size = apiSize(row.width, row.height);
    const { found, missing } = resolveRefs(row);
    for (let k = 1; k <= o.variants; k++) {
      const out = variantPath(o, row, k);
      const key = `${row.file}#${k}`;
      if (o.resume && (done.has(key) || existsSync(out))) { console.log(`[skip] ${key} (resume)`); continue; }
      if (!o.live) {
        console.log(`[dry] ${key} -> ${out.replace(ROOT + '/', '')} size=${size} (target ${row.width}x${row.height}) refs=${found.length}${missing.length ? ` missing-refs=${missing.join('|')}` : ''}`);
        continue;
      }
      if (missing.length) console.warn(`[warn] ${key} missing reference images (approve them first): ${missing.join(', ')}`);
      try {
        const buf = await callApi(o, row, size, found);
        mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, buf);
        log({ file: row.file, variant: k, ok: true, model: o.model, size, out: out.replace(ROOT + '/', ''), prompt: row.prompt });
        console.log(`[ok] ${key}`);
      } catch (e) {
        log({ file: row.file, variant: k, ok: false, error: String(e.message || e) });
        console.error(`[fail] ${key}: ${e.message}`);
      }
      calls++;
      await new Promise((r) => setTimeout(r, o.delay));
    }
  }
  console.log(`[gen] done. rows visited=${n} api calls=${calls}${o.live ? '' : ' (dry run: nothing written, no network)'}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main(process.argv.slice(2)).catch((e) => { console.error(e.message); process.exit(1); });
