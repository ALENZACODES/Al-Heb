#!/usr/bin/env node
// Builds reviewer packs (CSV + print HTML), INSTRUCTIONS.md and STATUS.md from data/. Never writes to data/.
// Usage: node tools/review/build-packs.mjs [--root DIR] [--out DIR] [--dry]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAll, toCsv, toHtml, instructionsMd } from './packs-lib.mjs';
import { loadVerdicts, summarise, statusMd } from './verdicts-lib.mjs';

export function parseArgs(argv) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const o = { root: path.resolve(here, '..', '..'), out: null, dry: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--root') o.root = path.resolve(argv[++i]);
    else if (argv[i] === '--out') o.out = path.resolve(argv[++i]);
    else if (argv[i] === '--dry') o.dry = true;
    else throw new Error('unknown option ' + argv[i]);
  }
  o.out = o.out || path.join(o.root, 'docs', 'review');
  return o;
}

export function run(o) {
  const all = buildAll(o.root);
  const verdicts = loadVerdicts(path.join(o.root, 'data', 'review', 'verdicts.json'));
  const sum = summarise(all, verdicts);
  const files = {};
  for (const p of all) {
    files[`packs/${p.file}.csv`] = toCsv(p.rows);
    files[`packs/${p.file}.html`] = toHtml(p, p.rows);
  }
  files['INSTRUCTIONS.md'] = instructionsMd(all);
  files['STATUS.md'] = statusMd(all, sum);
  if (!o.dry) for (const [rel, txt] of Object.entries(files)) {
    const f = path.join(o.out, rel);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, txt);
  }
  return { all, sum, files };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const o = parseArgs(process.argv.slice(2));
  const r = run(o);
  for (const p of r.all) console.log(`${p.num.padEnd(4)} ${String(p.rows.length).padStart(5)} rows  ${p.file}`);
  console.log(`total rows ${r.sum.total}; reviewed ${r.sum.reviewed}${o.dry ? ' (dry run, nothing written)' : ' -> ' + o.out}`);
}
