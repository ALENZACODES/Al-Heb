#!/usr/bin/env node
// Build the single-file recorder page: inlines lib.mjs into template.html.
//   node tools/record-kit/build.mjs [--out tools/record-kit/recorder.html] [--script docs/voices/recording-script-sephardi.csv ...] [--tradition sephardi] [--limit N]
// With --script the item list is embedded as a built-in list (the volunteer does not need the file picker). The CSV is read with the repo's
// recording-script column names (id, pointed_hebrew, read_aloud, gloss). Without --script the page has only the file picker.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCsv, normalizeItems, traditionFromName } from './lib.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));

export function stripExports(src) { return src.replace(/^export /gm, ''); }
export function buildHtml({ bundle = null } = {}) {
  const tpl = fs.readFileSync(path.join(here, 'template.html'), 'utf8');
  const lib = stripExports(fs.readFileSync(path.join(here, 'lib.mjs'), 'utf8'));
  if (/<\/script/i.test(lib)) throw new Error('lib.mjs must not contain a closing script tag');
  const json = bundle ? JSON.stringify(bundle).replace(/</g, '\\u003c').replace(/[\u2028\u2029]/g, (c) => '\\u' + c.charCodeAt(0).toString(16)) : 'null';
  return tpl.replace('/*LIB*/', () => lib).replace('/*BUNDLE*/null', () => json);
}

export function main(argv = process.argv.slice(2)) {
  const o = { scripts: [], out: path.join(here, 'recorder.html'), limit: 0, tradition: '' };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--out') o.out = path.resolve(argv[++i]);
    else if (argv[i] === '--script') o.scripts.push(path.resolve(argv[++i]));
    else if (argv[i] === '--limit') o.limit = Number(argv[++i]);
    else if (argv[i] === '--tradition') o.tradition = argv[++i];
    else throw new Error('unknown option ' + argv[i]);
  }
  let bundle = null;
  if (o.scripts.length) {
    const items = [];
    for (const s of o.scripts) {
      const t = o.tradition || traditionFromName(path.basename(s));
      if (!t) throw new Error(`cannot tell the tradition of ${s}; pass --tradition`);
      items.push(...normalizeItems(parseCsv(fs.readFileSync(s, 'utf8')), { tradition: t, kind: 'word' }).map((x) => ({ ...x, tradition: t })));
    }
    bundle = { items: o.limit ? items.slice(0, o.limit) : items };
  }
  fs.writeFileSync(o.out, buildHtml({ bundle }));
  console.log(`wrote ${o.out} (${(fs.statSync(o.out).size / 1024).toFixed(0)} KiB${bundle ? `, ${bundle.items.length} built-in items` : ', file picker only'})`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) { try { main(); } catch (e) { console.error(e.message); process.exit(1); } }
