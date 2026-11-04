// Reads the FULL audio manifest = data/audio/manifest.json (core) + data/audio/manifest-words-<tradition>.json (lazy shards).
// Tools and tests that need every entry use this; the app loads the core eagerly and a shard on demand.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const TRADITION_SHARDS = ['israeli', 'sephardi', 'ashkenazi'];
export function loadManifestFull(root = ROOT) {
  const rd = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
  const out = rd('data/audio/manifest.json');
  for (const t of TRADITION_SHARDS) {
    const rel = `data/audio/manifest-words-${t}.json`;
    if (fs.existsSync(path.join(root, rel))) out.push(...rd(rel));
  }
  return out;
}
