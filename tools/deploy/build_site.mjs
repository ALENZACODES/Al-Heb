#!/usr/bin/env node
import { pathToFileURL } from 'node:url';
// Cloudflare Pages build command: node tools/deploy/build_site.mjs [--out dist] [--with-img]
// Copies exactly the runtime files into dist/ (see make-dist.mjs for the list and the exclusions), prints a size report, then
// verifies that every URL in dist/precache-manifest.js exists in dist/ (one missing file makes the service worker install fail).
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import { makeDist, LIMITS } from './make-dist.mjs';

const mib = (b) => (b / 1048576).toFixed(2) + ' MiB';
export function missingPrecache(dist) {
  const self = {};
  vm.runInNewContext(readFileSync(join(dist, 'precache-manifest.js'), 'utf8'), { self });
  const list = self.ALEF_PRECACHE ?? [];
  return { list, missing: list.filter((u) => !existsSync(join(dist, u))) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const out = args.includes('--out') ? args[args.indexOf('--out') + 1] : 'dist';
  const r = makeDist({ out, img: args.includes('--with-img') });
  console.log(`dist ready: ${r.dist}`);
  console.log(`files ${r.files} (no host file-count cap; Render); total ${mib(r.bytes)}; precache ${r.precacheFiles} files, ${mib(r.precacheBytes)} (version ${r.version})`);
  for (const [g, v] of r.groups) console.log(`  ${g.padEnd(28)} ${String(v.files).padStart(5)} files ${mib(v.bytes).padStart(11)}`);
  console.log('largest: ' + r.largest.map((l) => `${l.rel} ${mib(l.bytes)}`).join('; '));
  const { list, missing } = missingPrecache(r.dist);
  if (missing.length) { console.error(`MISSING from dist (${missing.length} of ${list.length} precache URLs): ${missing.slice(0, 10).join(', ')}`); process.exit(1); }
  console.log(`precache check: all ${list.length} URLs exist in dist`);
  if (r.largest[0].bytes > LIMITS.maxFileBytes) { console.error('OVER THE 25 MiB PER-FILE LIMIT'); process.exit(1); }
}
