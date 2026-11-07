// Build data/vocab/clip-lookup.json from the production manifest. Does not render audio.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildClipLookup } from '../../src/vocab/clips.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

export function lookupFromDisk(rootDir = root) {
  const rows = ['data/audio/manifest.json', 'data/audio/manifest-kind-word.json'].flatMap((rel) => {
    const p = join(rootDir, rel);
    return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : [];
  });
  return buildClipLookup(rows, (p) => existsSync(join(rootDir, p)));
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const lookup = lookupFromDisk();
  const n = Object.values(lookup.clips).reduce((a, slots) => a + Object.keys(slots).length, 0);
  const text = JSON.stringify(lookup);
  writeFileSync(join(root, 'data/vocab/clip-lookup.json'), text + '\n');
  console.log(`clip-lookup texts ${Object.keys(lookup.clips).length} slots ${n} bytes ${text.length}`);
}
