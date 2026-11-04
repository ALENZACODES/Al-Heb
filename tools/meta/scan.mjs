#!/usr/bin/env node
// Metadata scan (competitor-analysis section M.3). Exit 0 = clean, 1 = findings, 2 = usage error.
// Usage: node tools/meta/scan.mjs [paths...] [--json] [--files] [--allowlist FILE] [--no-tools] [--cwd DIR]
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_ROOTS, detectTools, loadAllowlist, scanTree } from './lib.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
export function parseArgs(argv) {
  const o = { paths: [], json: false, files: false, noTools: false, allowlist: path.join(here, 'allowlist.json'), cwd: process.cwd(), help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') o.json = true;
    else if (a === '--files') o.files = true;
    else if (a === '--no-tools') o.noTools = true;
    else if (a === '--allowlist') o.allowlist = path.resolve(argv[++i]);
    else if (a === '--cwd') o.cwd = path.resolve(argv[++i]);
    else if (a === '-h' || a === '--help') o.help = true;
    else if (a.startsWith('--')) throw new Error('unknown option ' + a);
    else o.paths.push(a);
  }
  return o;
}

export function runScan(o) {
  const tools = detectTools(o.noTools);
  const allow = loadAllowlist(o.allowlist);
  const roots = o.paths.length ? o.paths : DEFAULT_ROOTS;
  const res = scanTree(roots, { tools, allow, cwd: o.cwd });
  const total = res.files.reduce((n, f) => n + f.findings.filter((x) => !x.allowed).length, 0);
  const allowed = res.files.reduce((n, f) => n + f.findings.filter((x) => x.allowed).length, 0);
  const dirty = res.files.filter((f) => f.findings.some((x) => !x.allowed)).length;
  return { res, tools, roots, total, allowed, dirty, allow };
}

export function format(r, o) {
  const L = [];
  const on = Object.entries(r.tools).filter(([, v]) => v).map(([k]) => k);
  const off = Object.entries(r.tools).filter(([, v]) => !v).map(([k]) => k);
  L.push(`roots: ${r.roots.join(', ')}`);
  L.push(`optional tools present: ${on.join(', ') || 'none'}; absent: ${off.join(', ') || 'none'} (pure-JS parsers always used for PNG/JPEG/WebP/SVG/JSON/CSV/ID3/RIFF)`);
  for (const f of r.res.files) {
    const bad = f.findings.filter((x) => !x.allowed);
    if (!bad.length && !o.files) continue;
    for (const x of f.findings) if (!x.allowed) L.push(`FINDING ${f.file} [${x.kind}] ${x.field}${x.detail ? ' = ' + x.detail : ''}`);
  }
  for (const f of r.res.files) for (const x of f.findings) if (x.allowed && o.files) L.push(`allowed ${f.file} [${x.kind}] ${x.field}`);
  L.push('');
  L.push('type      scanned  files-with-findings  findings  allowlisted');
  for (const [t, v] of Object.entries(r.res.byType).sort()) L.push(`${t.padEnd(9)} ${String(v.scanned).padStart(7)} ${String(v.withFindings).padStart(20)} ${String(v.findings).padStart(9)} ${String(v.allowedFindings).padStart(12)}`);
  const missing = r.allow.entries.filter((e) => !r.res.allowlistHits.has(e.path));
  if (missing.length) L.push('allowlist entries that matched nothing: ' + missing.map((e) => e.path).join(', '));
  L.push(r.total ? `FAIL: ${r.total} finding(s) in ${r.dirty} file(s); ${r.allowed} allowlisted` : `PASS: zero findings; ${r.allowed} allowlisted`);
  return L.join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let o;
  try { o = parseArgs(process.argv.slice(2)); } catch (e) { console.error(e.message); process.exit(2); }
  if (o.help) { console.log('node tools/meta/scan.mjs [paths...] [--json] [--files] [--allowlist FILE] [--no-tools] [--cwd DIR]'); process.exit(0); }
  const r = runScan(o);
  if (o.json) console.log(JSON.stringify({ roots: r.roots, tools: r.tools, total: r.total, allowlisted: r.allowed, byType: r.res.byType, files: r.res.files.filter((f) => f.findings.length) }, null, 1));
  else console.log(format(r, o));
  process.exit(r.total ? 1 : 0);
}
