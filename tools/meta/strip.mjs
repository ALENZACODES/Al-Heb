#!/usr/bin/env node
// Metadata strip (competitor-analysis section M.1-M.3). DRY-RUN by default: prints what would change and the equivalent commands.
//   node tools/meta/strip.mjs [paths...] [--apply (--out DIR | --in-place)] [--audio-mode copy|reencode] [--allow-incoming] [--allowlist FILE] [--no-tools]
// --out DIR writes stripped copies (only files that had findings) under DIR, mirroring relative paths; originals untouched.
// --in-place rewrites originals, each only after the stripped temp file re-scans clean. assets/images/incoming is refused unless --allow-incoming.
// JSON/CSV/HTML findings are never auto-edited (they need a human choice of replacement fields).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_ROOTS, COMMANDS, detectTools, loadAllowlist, scanTree, scanFile, stripper, walk, typeOf } from './lib.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const INCOMING = 'assets/images/incoming/';

export function parseArgs(argv) {
  const o = { paths: [], apply: false, out: null, inPlace: false, audioMode: 'copy', allowIncoming: false, noTools: false, allowlist: path.join(here, 'allowlist.json'), cwd: process.cwd() };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--apply') o.apply = true;
    else if (a === '--out') o.out = path.resolve(argv[++i]);
    else if (a === '--in-place') o.inPlace = true;
    else if (a === '--audio-mode') o.audioMode = argv[++i];
    else if (a === '--allow-incoming') o.allowIncoming = true;
    else if (a === '--no-tools') o.noTools = true;
    else if (a === '--allowlist') o.allowlist = path.resolve(argv[++i]);
    else if (a === '--cwd') o.cwd = path.resolve(argv[++i]);
    else if (a.startsWith('--')) throw new Error('unknown option ' + a);
    else o.paths.push(a);
  }
  if (!['copy', 'reencode'].includes(o.audioMode)) throw new Error('--audio-mode must be copy or reencode');
  if (o.apply && !o.out && !o.inPlace) throw new Error('--apply needs --out DIR or --in-place');
  if (o.out && o.inPlace) throw new Error('--out and --in-place are exclusive');
  return o;
}

export function runStrip(o, log = console.log) {
  const tools = detectTools(o.noTools);
  const allow = loadAllowlist(o.allowlist);
  const roots = o.paths.length ? o.paths : DEFAULT_ROOTS;
  const res = scanTree(roots, { tools, allow, cwd: o.cwd });
  const summary = { dryRun: !o.apply, changed: 0, manual: 0, failed: 0, refused: 0, skippedAllowlisted: 0, candidates: 0 };
  for (const f of res.files) {
    const bad = f.findings.filter((x) => !x.allowed);
    if (!bad.length) { if (f.findings.length) summary.skippedAllowlisted++; continue; }
    summary.candidates++;
    const abs = path.join(o.cwd, f.file);
    const s = stripper(f.type, tools, { audioMode: o.audioMode });
    const cmd = (COMMANDS[f.type] || (() => ''))(f.file, undefined, o.audioMode);
    const kinds = [...new Set(bad.map((x) => x.kind))].join(',');
    if (!s) { summary.manual++; log(`MANUAL  ${f.file} [${kinds}]  -> ${cmd}`); continue; }
    if (!o.apply) { log(`WOULD   ${f.file} [${kinds}] via ${s.how}\n          ${cmd}`); continue; }
    if (o.inPlace && f.file.startsWith(INCOMING) && !o.allowIncoming) { summary.refused++; log(`REFUSED ${f.file} (assets/images/incoming needs --allow-incoming; another process may own it)`); continue; }
    const tmp = path.join(path.dirname(abs), '.metastrip-' + process.pid + '-' + path.basename(abs));
    try {
      s.run(abs, tmp);
      const after = scanFile(tmp, tools).findings.filter((x) => !x.allowed);
      if (after.length) throw new Error('stripped copy still has: ' + after.map((x) => x.kind + ':' + x.field).join('; '));
      if (o.out) {
        const dst = path.join(o.out, f.file);
        fs.mkdirSync(path.dirname(dst), { recursive: true });
        fs.renameSync(tmp, dst);
        log(`WROTE   ${path.relative(o.cwd, dst)}`);
      } else { fs.renameSync(tmp, abs); log(`STRIPPED ${f.file}`); }
      summary.changed++;
    } catch (e) {
      summary.failed++;
      log(`FAILED  ${f.file}: ${e.message}`);
      try { fs.rmSync(tmp, { force: true }); } catch {}
    }
  }
  log(`${summary.dryRun ? 'dry-run' : 'applied'}: ${summary.candidates} file(s) with findings; ${summary.changed} written, ${summary.manual} manual, ${summary.failed} failed, ${summary.refused} refused, ${summary.skippedAllowlisted} allowlisted-only skipped`);
  return summary;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let o;
  try { o = parseArgs(process.argv.slice(2)); } catch (e) { console.error(e.message); process.exit(2); }
  const s = runStrip(o);
  process.exit(s.failed ? 1 : 0);
}
