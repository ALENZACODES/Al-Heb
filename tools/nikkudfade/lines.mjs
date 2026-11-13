#!/usr/bin/env node
// English for the whole lines on the vowel-mark fade page: writes data/nikkudfade/lines-en.json.
//   node tools/nikkudfade/lines.mjs           rewrite the file
//   node tools/nikkudfade/lines.mjs --check   exit 1 if the file is out of date
// Each English line is copied from the lesson item that holds exactly the same Hebrew line. Nothing is translated here.
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { usableLines, LINE_UNIT } from '../../src/nikkudfade/lines.js';

const ROOT = new URL('../../', import.meta.url);
const OUT = 'data/nikkudfade/lines-en.json';
const UNIT = `assets/vendor/_alef-tools/nikud@0.1.0/nikud/${LINE_UNIT}.json`;
const rd = (rel) => JSON.parse(readFileSync(new URL(rel, ROOT), 'utf8'));

function files(dir) {
  const out = [];
  for (const name of readdirSync(new URL(dir, ROOT)).sort()) {
    const rel = dir + name;
    if (statSync(new URL(rel, ROOT)).isDirectory()) out.push(...files(rel + '/'));
    else if (name.endsWith('.json')) out.push(rel);
  }
  return out;
}

export function build() {
  const want = new Set(usableLines(rd(UNIT)).map((l) => l.he));
  const en = {};
  const walk = (o) => {
    if (Array.isArray(o)) { for (const x of o) walk(x); return; }
    if (!o || typeof o !== 'object') return;
    if (typeof o.he === 'string' && typeof o.en === 'string' && o.en.trim() && want.has(o.he) && !(o.he in en)) en[o.he] = o.en.trim();
    for (const v of Object.values(o)) walk(v);
  };
  for (const f of files('data/curriculum/')) walk(rd(f));
  const lines = Object.fromEntries(Object.keys(en).sort().map((k) => [k, en[k]]));
  return { schema: 'alef-nikkudfade-lines-en/1', note: 'Made by tools/nikkudfade/lines.mjs from the lesson data; do not edit by hand.', unit: LINE_UNIT, count: Object.keys(lines).length, of: want.size, lines };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const text = JSON.stringify(build(), null, 1) + '\n';
  const path = new URL(OUT, ROOT);
  if (process.argv.includes('--check')) { if (!existsSync(path) || readFileSync(path, 'utf8') !== text) { console.error(`${OUT} is out of date: run node tools/nikkudfade/lines.mjs`); process.exit(1); } console.log(`${OUT} is up to date`); }
  else { writeFileSync(path, text); const b = JSON.parse(text); console.log(`${OUT}: English for ${b.count} of ${b.of} lines, ${text.length} bytes`); }
}
