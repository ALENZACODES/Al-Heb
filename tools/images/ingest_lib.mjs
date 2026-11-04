// Library for the generated-image ingest pipeline (dev tooling, never imported by the app).
// Pure helpers (CSV, name matching, aspect rules, manifest building) are exported for tests; the I/O wrappers use only node:*.
// Image decoding / resizing / OCR is delegated to tools/images/ingest_image.py (Pillow + tesseract CLI).

import { createHash, randomBytes } from 'node:crypto';
import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const HERE = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_ROOT = resolve(HERE, '../..');
export const PY_HELPER = join(HERE, 'ingest_image.py');
export const BLOCKS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
export const STEM_RE = /^[A-Za-z0-9_-]+$/;
/** Flags that stop `approve` unless --force (our rule: no text of any kind inside images). */
export const BLOCKING_FLAGS = ['contains_text'];
export const TOOL_DEFAULT = 'ChatGPT / OpenAI image generation (manual run, files uploaded by the author)';

export function makePaths(root = DEFAULT_ROOT, o = {}) {
  return {
    root,
    manifest: o.manifest ?? join(root, 'data/images/manifest.csv'),
    approvals: join(root, 'data/images/approvals.json'),
    provenance: join(root, 'data/images/provenance.json'),
    generated: join(root, 'data/images/generated-manifest.json'),
    report: join(root, 'data/images/ingest-report.json'),
    assignCsv: join(root, 'data/images/unmatched-assignment.csv'),
    sheets: join(root, 'data/images/sheets'),
    genDir: join(root, 'assets/img/gen'),
    // PNG originals (with their embedded metadata, e.g. C2PA) stay OUTSIDE the git tree by default.
    originals: o.originals ?? process.env.ALEF_IMAGE_ORIGINALS ?? join(dirname(root), 'alef-image-originals'),
  };
}

// ---------- CSV ----------
/** RFC-4180 parser (quoted fields, doubled quotes, newlines inside quotes). Returns array of arrays. */
export function parseCsv(text) {
  const rows = []; let row = []; let f = ''; let q = false;
  const s = text.replace(/^﻿/, '');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"') { if (s[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && s[i + 1] === '\n') i++; row.push(f); f = ''; if (row.length > 1 || row[0] !== '') rows.push(row); row = []; }
    else f += c;
  }
  if (f !== '' || row.length) { row.push(f); rows.push(row); }
  return rows;
}
export function csvCell(v) {
  const s = String(v ?? '');
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
export function toCsv(header, rows) {
  return [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n') + '\n';
}

// ---------- manifest ----------
export function loadManifest(path) {
  const [head, ...body] = parseCsv(readFileSync(path, 'utf8'));
  const rows = body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
  const out = [];
  const seen = new Set();
  for (const r of rows) {
    const stem = r.file.replace(/\.png$/i, '');
    if (!STEM_RE.test(stem)) throw new Error(`manifest: unsafe file name ${JSON.stringify(r.file)}`);
    if (seen.has(stem)) throw new Error(`manifest: duplicate stem ${stem}`);
    seen.add(stem);
    out.push({ stem, file: r.file, set: r.set, command: Number(r.command), block: r.block, width: Number(r.width), height: Number(r.height), prompt: r.prompt });
  }
  return out;
}

// ---------- name matching ----------
const IMG_EXT = /\.(png|jpe?g|webp)$/i;
export const isImageName = (n) => IMG_EXT.test(n);
export const stripExt = (n) => n.replace(IMG_EXT, '');

/** Browser/OS duplicate suffixes: "name (1)", "name(2)", "name copy", "name - Copy 2". Anything else is NOT treated as a duplicate. */
const DUP_SUFFIX = /(?:\s*\(\d{1,3}\)|\s*[-_ ]\s*copy(?:\s*\d{1,3})?)$/i;

/**
 * Classify one file name against the manifest.
 *  exact:   stem equals a manifest stem
 *  case:    equal ignoring case only (reported, accepted)
 *  variant: manifest stem + a duplicate suffix ("L05_dalet_quirky (1).png")
 *  none:    no confident match (e.g. "ChatGPT Image Nov 3, 2026, 10_32_11 AM.png"); never guessed
 */
export function classifyName(fileName, stems) {
  const raw = stripExt(fileName.replace(/^.*[\\/]/, ''));
  const set = stems instanceof Set ? stems : new Set(stems);
  if (set.has(raw)) return { kind: 'exact', stem: raw };
  const lower = new Map(); for (const s of set) lower.set(s.toLowerCase(), s);
  if (lower.has(raw.toLowerCase())) return { kind: 'case', stem: lower.get(raw.toLowerCase()) };
  const base = raw.replace(DUP_SUFFIX, '');
  if (base !== raw) {
    if (set.has(base)) return { kind: 'variant', stem: base };
    if (lower.has(base.toLowerCase())) return { kind: 'variant', stem: lower.get(base.toLowerCase()) };
  }
  return { kind: 'none', stem: null };
}

export function editDistance(a, b) {
  const m = a.length, n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}
/** Up to `k` manifest stems within edit distance <= 3 of the file's stem. SUGGESTIONS ONLY, written to the assignment CSV for a human. */
export function suggestStems(fileName, stems, k = 3) {
  const raw = stripExt(fileName.replace(/^.*[\\/]/, '')).replace(DUP_SUFFIX, '').replace(/[ \-]+/g, '_').toLowerCase();
  return [...stems].map((s) => [s, editDistance(raw, s.toLowerCase())]).filter(([, d]) => d <= 3).sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0])).slice(0, k).map(([s]) => s);
}

// ---------- aspect / size rules ----------
/** ChatGPT / the Images API only deliver 1:1, 3:2 and 2:3 (per tools/images/gen_via_api.mjs apiSize). */
export function nativeClass(w, h) { const r = w / h; return r > 1.2 ? 'landscape' : r < 0.85 ? 'portrait' : 'square'; }
const NATIVE_RATIO = { square: 1, landscape: 1.5, portrait: 2 / 3 };

/**
 * @returns {{ok:boolean, level:'exact'|'substituted'|'mismatch', note:string}}
 *  exact: same aspect within 1.5%.  substituted: the manifest asks for an odd size (1792x1024, 1024x1280) but the file has the
 *  nearest native ChatGPT aspect for that orientation (we never crop or stretch: the page layout absorbs it).  mismatch: anything else.
 */
export function checkAspect(imgW, imgH, rowW, rowH) {
  const ri = imgW / imgH, rr = rowW / rowH;
  const close = (a, b, t) => Math.abs(a / b - 1) <= t;
  if (close(ri, rr, 0.015)) return { ok: true, level: 'exact', note: '' };
  const cls = nativeClass(rowW, rowH);
  if (close(ri, NATIVE_RATIO[cls], 0.015)) return { ok: true, level: 'substituted', note: `manifest asks ${rowW}x${rowH}; got ${imgW}x${imgH} (native ${cls} aspect). Not cropped or stretched.` };
  return { ok: false, level: 'mismatch', note: `got ${imgW}x${imgH} (aspect ${ri.toFixed(3)}), manifest wants ${rowW}x${rowH} (aspect ${rr.toFixed(3)}) or the native ${cls} shape` };
}

/** Web sizes: long edges 800 and 1600, never upscaled; rows whose manifest long edge < 1024 (icons) are capped at 800. */
export function webCap(row) { return Math.max(row.width, row.height) >= 1024 ? 1600 : 800; }

// ---------- json state ----------
export function readJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, 'utf8'));
}
export function writeJsonAtomic(path, data) {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.${randomBytes(4).toString('hex')}.tmp`;
  writeFileSync(tmp, JSON.stringify(data, null, 1) + '\n');
  renameSync(tmp, path);
}
export function writeTextAtomic(path, text) {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.${randomBytes(4).toString('hex')}.tmp`;
  writeFileSync(tmp, text);
  renameSync(tmp, path);
}
export const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

export function loadApprovals(p) { const d = readJson(p.approvals, null); return d?.approvals ? d : { version: 1, note: 'Default for every image is UNAPPROVED (absent). Edit with: node tools/images/ingest.mjs approve|reject <id...>', approvals: {} }; }
export function loadProvenance(p) { const d = readJson(p.provenance, null); return d?.images ? d : { version: 1, note: 'One record per ingested image: tool, prompt snapshot, dates, hashes, checks. PNG originals are NOT in git (see originals path in docs/images/README.md).', images: {} }; }

/** generated-manifest.json: ONLY approved images, so a consumer can trust everything listed. */
export function buildGeneratedManifest(prov, approvals) {
  const images = {};
  for (const stem of Object.keys(prov.images).sort()) {
    const rec = prov.images[stem];
    if (approvals.approvals[stem]?.status !== 'approved') continue;
    images[stem] = { w: rec.width, h: rec.height, files: rec.variants.map((v) => ({ edge: v.edge, file: v.file, w: v.width, h: v.height })) };
  }
  return {
    version: 1,
    note: 'APPROVED AI-generated images only (AI-generated; see docs/images/RIGHTS.md). Files live in assets/img/gen/. Built by tools/images/ingest.mjs; do not edit by hand.',
    dir: 'gen',
    count: Object.keys(images).length,
    images,
  };
}

// ---------- python helper ----------
export function py(args, { timeout = 300000 } = {}) {
  return new Promise((res) => {
    execFile('python3', ['-I', PY_HELPER, ...args], { maxBuffer: 64 * 1024 * 1024, timeout }, (err, stdout, stderr) => {
      if (err && !stdout) return res({ ok: false, error: `python helper failed: ${err.message}${stderr ? ` | ${String(stderr).slice(0, 300)}` : ''}` });
      try { res(JSON.parse(stdout)); } catch { res({ ok: false, error: `python helper returned non-JSON: ${String(stdout).slice(0, 200)}` }); }
    });
  });
}

/** Run async `fn` over `items` with at most `n` in flight; results keep input order. */
export async function pool(items, n, fn) {
  const out = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: Math.max(1, Math.min(n, items.length)) }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); }
  }));
  return out;
}

export function globToRe(g) {
  return new RegExp('^' + g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
}
