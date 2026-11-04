// Build tool: split data/vocab/vocab5000.json into one file per tier band under data/vocab/packs/ (not precached; loaded on demand).
// Usage: node src/vocab/split-tiers.mjs          (writes)   |   node src/vocab/split-tiers.mjs --check  (exit 1 if packs are stale)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
const KEEP = ['id', 'rank', 'lemma', 'pointed', 'needsPointing', 'pos', 'topic', 'gloss', 'tier', 'proofread'];

export function buildPacks(data) {
  const out = {};
  for (const tier of [500, 1000, 2000, 5000]) {
    const entries = data.entries.filter((e) => e.tier === tier).map((e) => Object.fromEntries(KEEP.map((k) => [k, e[k]])));
    out[tier] = { schema: 'alef-vocab5k-tier/1', tier, count: entries.length, licence: data.licence, entries };
  }
  return out;
}
export const packPath = (tier) => `data/vocab/packs/vocab5k-tier-${tier}.json`;

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const data = JSON.parse(readFileSync(join(root, 'data/vocab/vocab5000.json'), 'utf8'));
  const packs = buildPacks(data); let stale = false;
  for (const [tier, pack] of Object.entries(packs)) {
    const text = JSON.stringify(pack) + '\n', file = join(root, packPath(tier));
    if (process.argv.includes('--check')) { if (!existsSync(file) || readFileSync(file, 'utf8') !== text) { stale = true; console.error('stale:', packPath(tier)); } }
    else { writeFileSync(file, text); console.log('wrote', packPath(tier), pack.count, 'entries', text.length, 'bytes'); }
  }
  if (stale) process.exit(1);
}
