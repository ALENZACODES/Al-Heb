// Build data/vocab/clip-lookup.json from the production manifest. Does not render audio.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildClipLookup, clipKey } from '../../src/vocab/clips.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

export function lookupFromDisk(rootDir = root) {
  const read = (rel) => { const p = join(rootDir, rel); return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : []; };
  const rows = ['data/audio/manifest.json', 'data/audio/manifest-kind-word.json'].flatMap(read);
  // The Israeli word shard (data/audio/manifest-words-israeli.json) holds many more word clips. The shell always loads it
  // (src/shell/audio-shards.js), so its rows are playable from the dictionary too. Only rows whose text is a dictionary
  // word are added, to keep this file small.
  const vocabTexts = new Set();
  for (const rel of ['data/vocab/vocab5000.json', 'data/vocab/words.json']) {
    const j = read(rel); const list = Array.isArray(j) ? j : (j.entries || j.words || []);
    for (const e of list) for (const t of [e.pointed, e.lemma, e.he]) if (t) vocabTexts.add(clipKey(t));
  }
  for (const r of read('data/audio/manifest-words-israeli.json')) if (r && r.tradition === 'israeli' && vocabTexts.has(clipKey(r.text))) rows.push(r);
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
