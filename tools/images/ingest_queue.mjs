#!/usr/bin/env node
// Ingest for the picture queue in docs/images/QUEUE-2026-11-07.md: arcade backdrops, calendar art, Rimon frames and
// book pages. Zero npm dependencies; uses python3 -I + Pillow when present, else ffprobe/ffmpeg.
//
//   node tools/images/ingest_queue.mjs <drop folder or file> [more...] [--map FILE.csv] [--dry-run] [--replace]
//                                      [--crop] [--engine auto|pil|ffmpeg] [--root DIR] [--report FILE.json] [--quiet]
//
// A file is written ONLY when it maps to a path listed in one of the order sheets (docs/games/arcade-images.csv,
// docs/images/calendar-art.csv, docs/images/rimon-frames.csv, docs/books/image-prompts-6-62.csv). Two ways to map:
//   1. by name: the file is named like the target's basename (BOOK17_p01.jpg, candles.png). When that basename is not
//      unique across the sheets (env.png, idle-01.png) prefix it with a folder of the target path and two underscores:
//      letterchomp__env.png, rimon__idle-01.png, markers__festival.png. Browser suffixes " (1)" / " - Copy" are ignored.
//   2. by CSV: --map FILE.csv with a header `file,path` (file = name or path of the dropped file, path = target path).
// Everything else is reported as UNMATCHED and never used. Two files for one target = CONFLICT, neither is written.
//
// Each matched file is checked (real image, aspect within 2% of the spec unless --crop centre-crops it), resized to
// the spec (1600x600 PNG backdrops, 256x256 PNG with transparency, 1659x948 JPEG q85 book pages), written without
// metadata, then re-scanned with tools/meta/lib.mjs; a copy that still carries metadata is stripped in place.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseCsv } from './ingest_lib.mjs';
import { scanFile, stripper, typeOf } from '../meta/lib.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(here, '..', '..');
const PY_HELPER = path.join(here, 'ingest_queue_image.py');
const IMAGE_EXT = /\.(png|jpe?g|webp)$/i;

export const SHEETS = [
  { csv: 'docs/games/arcade-images.csv', col: 'path', group: 'arcade' },
  { csv: 'docs/images/calendar-art.csv', col: 'path', group: 'calendar' },
  { csv: 'docs/images/rimon-frames.csv', col: 'path', group: 'rimon' },
  { csv: 'docs/books/image-prompts-6-62.csv', col: 'output_path', group: 'books' },
];

/** The spec a target path must be written to. Exported so the test can pin it. */
export function specFor(target) {
  if (/^assets\/books\/book\d+\/BOOK\d+_p\d\d\.jpg$/.test(target)) return { format: 'jpeg', width: 1659, height: 948, alpha: false, quality: 85, kind: 'book page' };
  if (/^assets\/games\/arcade\/[a-z0-9]+\/env\.png$/.test(target)) return { format: 'png', width: 1600, height: 600, alpha: false, kind: 'backdrop' };
  if (target === 'assets/img/calendar/header.png') return { format: 'png', width: 1600, height: 600, alpha: false, kind: 'backdrop' };
  if (/^assets\/games\/arcade\/(cast|letters)\/[a-z0-9-]+\.png$/.test(target)) return { format: 'png', width: 256, height: 256, alpha: true, kind: 'sprite' };
  if (/^assets\/img\/calendar\/markers\/[a-z0-9-]+\.png$/.test(target)) return { format: 'png', width: 256, height: 256, alpha: true, kind: 'sprite' };
  if (/^assets\/img\/rimon\/frames\/[a-z]+-\d\d\.png$/.test(target)) return { format: 'png', width: 256, height: 256, alpha: true, kind: 'sprite' };
  return null;
}

/** Read every order sheet: Map target path -> { group, sheet }. Paths without a spec are refused loudly. */
export function loadTargets(root = REPO, sheets = SHEETS) {
  const targets = new Map();
  for (const s of sheets) {
    const file = path.join(root, s.csv);
    if (!fs.existsSync(file)) continue;
    const [head, ...rows] = parseCsv(fs.readFileSync(file, 'utf8'));
    const ci = head.indexOf(s.col);
    if (ci < 0) throw new Error(`${s.csv}: no column ${s.col}`);
    for (const r of rows) {
      const p = (r[ci] || '').trim();
      if (!p) continue;
      if (p.includes('..') || p.startsWith('/') || !specFor(p)) throw new Error(`${s.csv}: path without a spec or unsafe: ${p}`);
      targets.set(p, { group: s.group, sheet: s.csv });
    }
  }
  if (!targets.size) throw new Error(`no order sheets found under ${root} (expected ${sheets.map((s) => s.csv).join(', ')})`);
  return targets;
}

/** Normalise a dropped file name: drop the extension, browser duplicate suffixes, case. */
export function normalName(name) {
  return path.basename(name).replace(IMAGE_EXT, '').replace(/\s*(\(\d+\)|-\s*copy(\s*\(\d+\))?|copy)\s*$/i, '').trim().toLowerCase();
}

/**
 * Match one dropped file name against the targets. Returns { path } or { error } or null (no match at all).
 * `name__base` means: base matches the target basename and every `name` part is a directory segment of the target.
 */
export function matchName(name, targets) {
  const norm = normalName(name);
  const parts = norm.split('__').filter(Boolean);
  const base = parts.pop();
  if (!base) return null;
  const hits = [];
  for (const t of targets.keys()) {
    const tb = path.basename(t).replace(IMAGE_EXT, '').toLowerCase();
    if (tb !== base) continue;
    const segs = path.dirname(t).split('/').map((x) => x.toLowerCase());
    if (parts.every((p) => segs.includes(p))) hits.push(t);
  }
  if (!hits.length) return null;
  if (hits.length > 1) return { error: `ambiguous: ${hits.length} targets share the name ${base} (prefix a folder: ${path.basename(path.dirname(hits[0]))}__${path.basename(hits[0])})`, candidates: hits };
  return { path: hits[0] };
}

function listInputs(inputs) {
  const files = [];
  const visit = (p, depth) => {
    const st = fs.lstatSync(p);
    if (st.isSymbolicLink()) return;
    if (st.isDirectory()) { if (depth > 6) return; for (const n of fs.readdirSync(p).sort()) if (!n.startsWith('.') && n !== '__MACOSX') visit(path.join(p, n), depth + 1); }
    else if (st.isFile() && IMAGE_EXT.test(p)) files.push(p);
  };
  for (const i of inputs) {
    const p = path.resolve(i);
    if (!fs.existsSync(p)) throw new Error(`input not found: ${i}`);
    visit(p, 0);
  }
  return files;
}

function readMap(file, inputFiles) {
  const [head, ...rows] = parseCsv(fs.readFileSync(file, 'utf8'));
  const fi = head.indexOf('file'), pi = head.indexOf('path');
  if (fi < 0 || pi < 0) throw new Error(`${file}: header must have columns file,path`);
  const byName = new Map(inputFiles.map((f) => [path.basename(f).toLowerCase(), f]));
  const map = new Map();
  for (const r of rows) {
    const f = (r[fi] || '').trim(), p = (r[pi] || '').trim();
    if (!f || !p) continue;
    const abs = fs.existsSync(path.resolve(f)) ? path.resolve(f) : byName.get(path.basename(f).toLowerCase());
    map.set(abs || f, p);
  }
  return map;
}

// ---------- engines ----------
function hasPil() {
  const r = spawnSync('python3', ['-I', '-c', 'import PIL'], { encoding: 'utf8' });
  return !r.error && r.status === 0;
}
function hasFf() {
  const a = spawnSync('ffprobe', ['-version'], { encoding: 'utf8' }), b = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' });
  return !a.error && a.status === 0 && !b.error && b.status === 0;
}
export function pickEngine(want = 'auto') {
  if (want === 'pil') { if (!hasPil()) throw new Error('--engine pil: python3 with Pillow not available'); return 'pil'; }
  if (want === 'ffmpeg') { if (!hasFf()) throw new Error('--engine ffmpeg: ffprobe/ffmpeg not available'); return 'ffmpeg'; }
  if (hasPil()) return 'pil';
  if (hasFf()) return 'ffmpeg';
  throw new Error('need python3 with Pillow, or ffprobe and ffmpeg, to read and resize pictures');
}

function pyJson(args) {
  const out = execFileSync('python3', ['-I', PY_HELPER, ...args], { encoding: 'utf8', maxBuffer: 1 << 24 });
  return JSON.parse(out);
}

export function probe(file, engine) {
  if (engine === 'pil') return pyJson(['probe', file]);
  const r = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,pix_fmt,codec_name', '-of', 'json', file], { encoding: 'utf8' });
  if (r.status !== 0) return { ok: false, error: `ffprobe: ${(r.stderr || '').trim().slice(0, 200) || 'not an image'}` };
  const s = JSON.parse(r.stdout).streams?.[0];
  if (!s) return { ok: false, error: 'ffprobe: no video stream' };
  const alpha = /a$|^ya|^pal8|argb|abgr/.test(s.pix_fmt || '');
  return { ok: true, format: s.codec_name, width: s.width, height: s.height, mode: s.pix_fmt, hasAlpha: alpha, alphaUsed: alpha ? null : false };
}

export function convert(src, dst, spec, engine, crop) {
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  if (engine === 'pil') return pyJson(['convert', src, dst, JSON.stringify({ ...spec, crop })]);
  const { width: w, height: h } = spec;
  const fit = crop ? `scale=${w}:${h}:force_original_aspect_ratio=increase:flags=lanczos,crop=${w}:${h}` : `scale=${w}:${h}:flags=lanczos`;
  const fmt = spec.alpha ? 'format=rgba' : 'format=rgb24';
  const args = ['-y', '-v', 'error', '-i', src, '-vf', `${fit},${fmt}`, '-map_metadata', '-1', '-frames:v', '1'];
  if (spec.format === 'jpeg') args.push('-q:v', '4', '-pix_fmt', 'yuvj420p', '-f', 'image2', '-c:v', 'mjpeg'); else args.push('-f', 'image2', '-c:v', 'png');
  args.push(dst);
  const r = spawnSync('ffmpeg', args, { encoding: 'utf8' });
  if (r.status !== 0) return { ok: false, error: `ffmpeg: ${(r.stderr || '').trim().slice(0, 300)}` };
  const p = probe(dst, 'ffmpeg');
  return p.ok ? { ok: true, width: p.width, height: p.height, bytes: fs.statSync(dst).size } : p;
}

/** Strip any metadata the writer left (belt and braces), re-scan, and refuse a copy that is still not clean. */
export function ensureClean(file) {
  const type = typeOf(file);
  const first = scanFile(file, {}).findings;
  if (first.length) {
    const s = stripper(type, {});
    const tmp = file + '.strip';
    s.run(file, tmp);
    fs.renameSync(tmp, file);
  }
  const after = scanFile(file, {}).findings;
  if (after.length) throw new Error('still has metadata: ' + after.map((x) => x.kind + ':' + x.field).join('; '));
  return first.length;
}

// ---------- main plan ----------
export function parseArgs(argv) {
  const o = { inputs: [], map: null, dryRun: false, replace: false, crop: false, engine: 'auto', root: REPO, report: null, quiet: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--map') o.map = path.resolve(argv[++i]);
    else if (a === '--dry-run') o.dryRun = true;
    else if (a === '--replace') o.replace = true;
    else if (a === '--crop') o.crop = true;
    else if (a === '--engine') o.engine = argv[++i];
    else if (a === '--root') o.root = path.resolve(argv[++i]);
    else if (a === '--report') o.report = path.resolve(argv[++i]);
    else if (a === '--quiet') o.quiet = true;
    else if (a.startsWith('--')) throw new Error('unknown option ' + a);
    else o.inputs.push(a);
  }
  if (!o.inputs.length) throw new Error('give at least one drop folder or file');
  return o;
}

/** Decide, for every dropped file, what would happen. Pure apart from reading the sheets and listing files. */
export function plan(o) {
  const targets = loadTargets(o.root);
  const files = listInputs(o.inputs);
  const map = o.map ? readMap(o.map, files) : new Map();
  const rows = [];
  const byTarget = new Map();
  for (const f of files) {
    const row = { file: f, name: path.basename(f) };
    const mapped = map.get(f) || map.get(path.basename(f));
    if (mapped) {
      if (!targets.has(mapped)) { row.status = 'UNMATCHED'; row.note = `--map names a path that is in no order sheet: ${mapped}`; rows.push(row); continue; }
      row.target = mapped; row.how = 'csv';
    } else {
      const m = matchName(f, targets);
      if (!m) { row.status = 'UNMATCHED'; row.note = 'name matches no order-sheet path'; rows.push(row); continue; }
      if (m.error) { row.status = 'UNMATCHED'; row.note = m.error; rows.push(row); continue; }
      row.target = m.path; row.how = 'name';
    }
    row.spec = specFor(row.target);
    row.group = targets.get(row.target).group;
    (byTarget.get(row.target) || byTarget.set(row.target, []).get(row.target)).push(row);
    rows.push(row);
  }
  for (const [t, list] of byTarget) if (list.length > 1) for (const r of list) { r.status = 'CONFLICT'; r.note = `${list.length} files map to ${t}`; }
  for (const r of rows) {
    if (r.status) continue;
    const dst = path.join(o.root, r.target);
    if (fs.existsSync(dst) && !o.replace) { r.status = 'EXISTS'; r.note = 'target already exists (use --replace)'; continue; }
    r.status = 'MATCHED';
  }
  const missing = [...targets.keys()].filter((t) => !fs.existsSync(path.join(o.root, t)));
  return { rows, targets, missing };
}

export async function run(o, log = console.log) {
  const engine = pickEngine(o.engine);
  const { rows, targets, missing } = plan(o);
  const summary = { engine, dryRun: o.dryRun, files: rows.length, written: 0, rejected: 0, unmatched: 0, conflict: 0, exists: 0, failed: 0, flags: 0 };
  for (const r of rows) {
    if (r.status !== 'MATCHED') { summary[r.status.toLowerCase()]++; continue; }
    const p = probe(r.file, engine);
    if (!p.ok) { r.status = 'REJECTED'; r.note = p.error; summary.rejected++; continue; }
    r.source = { width: p.width, height: p.height, format: p.format, hasAlpha: p.hasAlpha, alphaUsed: p.alphaUsed };
    const want = r.spec.width / r.spec.height, got = p.width / p.height;
    const aspectOff = Math.abs(got - want) / want;
    r.flags = [];
    if (aspectOff > 0.02 && !o.crop) { r.status = 'REJECTED'; r.note = `aspect ${p.width}x${p.height} is ${(aspectOff * 100).toFixed(1)}% off ${r.spec.width}x${r.spec.height} (use --crop to centre-crop)`; summary.rejected++; continue; }
    if (aspectOff > 0.02) r.flags.push('cropped');
    if (p.width < r.spec.width || p.height < r.spec.height) r.flags.push('upscaled');
    if (r.spec.alpha && (!p.hasAlpha || p.alphaUsed === false)) r.flags.push('not_transparent');
    if (!r.spec.alpha && p.hasAlpha && p.alphaUsed) r.flags.push('alpha_flattened');
    if (r.flags.length) summary.flags++;
    if (o.dryRun) { r.status = 'WOULD-WRITE'; continue; }
    const dst = path.join(o.root, r.target);
    const tmp = dst + '.ingest-tmp' + path.extname(dst);
    try {
      const c = convert(r.file, tmp, r.spec, engine, o.crop);
      if (!c.ok) throw new Error(c.error);
      if (c.width !== r.spec.width || c.height !== r.spec.height) throw new Error(`wrote ${c.width}x${c.height}, wanted ${r.spec.width}x${r.spec.height}`);
      r.strippedChunks = ensureClean(tmp);
      fs.renameSync(tmp, dst);
      r.status = 'WROTE'; r.bytes = fs.statSync(dst).size; summary.written++;
    } catch (e) {
      try { fs.rmSync(tmp, { force: true }); } catch {}
      r.status = 'FAILED'; r.note = e.message; summary.failed++;
    }
  }
  const stillMissing = missing.filter((t) => !rows.some((r) => r.target === t && r.status === 'WROTE'));
  const groups = {};
  for (const t of targets.keys()) { const g = targets.get(t).group; groups[g] ||= { total: 0, missing: 0 }; groups[g].total++; if (stillMissing.includes(t)) groups[g].missing++; }
  if (!o.quiet) {
    const show = (f) => { const rel = path.relative(process.cwd(), f); return rel.startsWith('..') ? f : rel; };
    for (const r of rows) log(`${r.status.padEnd(11)} ${show(r.file)}${r.target ? ` -> ${r.target}` : ''}${r.flags?.length ? ` [${r.flags.join(',')}]` : ''}${r.note ? `  (${r.note})` : ''}`);
    log(`${o.dryRun ? 'dry-run' : 'done'} (${engine}): ${rows.length} file(s); ${summary.written} written, ${summary.rejected} rejected, ${summary.unmatched} unmatched, ${summary.conflict} conflict, ${summary.exists} already present, ${summary.failed} failed, ${summary.flags} with flags`);
    log('still missing: ' + Object.entries(groups).map(([g, v]) => `${g} ${v.missing}/${v.total}`).join(', '));
  }
  const report = { summary, groups, rows: rows.map(({ file, name, target, how, status, note, flags, source, bytes }) => ({ file, name, target, how, status, note, flags, source, bytes })), stillMissing };
  if (o.report) { fs.mkdirSync(path.dirname(o.report), { recursive: true }); fs.writeFileSync(o.report, JSON.stringify(report, null, 1)); }
  return report;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let o;
  try { o = parseArgs(process.argv.slice(2)); } catch (e) { console.error(e.message); process.exit(2); }
  run(o).then((r) => process.exit(r.summary.failed ? 1 : 0), (e) => { console.error(e.message); process.exit(2); });
}
